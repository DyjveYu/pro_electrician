const axios = require('axios');
const crypto = require('crypto');
const wechatConfig = require('../config/wechat');
const { CustomError } = require('../middleware/errorHandler');

/**
 * 微信小程序登录
 * @param {string} code 微信登录code
 * @returns {Promise<object>}
 */
const miniProgramLogin = async (code) => {
  try {
    const url = wechatConfig.miniprogram.apiUrls.code2Session;
    const params = {
      appid: wechatConfig.miniprogram.appId,
      secret: wechatConfig.miniprogram.secret,
      js_code: code,
      grant_type: 'authorization_code'
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.errcode) {
      throw new CustomError(`微信登录失败: ${data.errmsg}`, 400);
    }
    
    return {
      openid: data.openid,
      unionid: data.unionid,
      session_key: data.session_key
    };
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('微信登录服务异常', 500);
  }
};

/**
 * 获取微信访问令牌
 * @returns {Promise<string>}
 */
const getAccessToken = async () => {
  try {
    const url = wechatConfig.miniprogram.apiUrls.getAccessToken;
    const params = {
      grant_type: 'client_credential',
      appid: wechatConfig.miniprogram.appId,
      secret: wechatConfig.miniprogram.secret
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.errcode) {
      throw new CustomError(`获取访问令牌失败: ${data.errmsg}`, 400);
    }
    
    return data.access_token;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('获取微信访问令牌失败', 500);
  }
};

/**
 * 发送订阅消息
 * @param {string} openid 用户openid
 * @param {string} templateId 模板ID
 * @param {object} data 消息数据
 * @param {string} page 跳转页面
 * @returns {Promise<boolean>}
 */
const sendSubscribeMessage = async (openid, templateId, data, page = '') => {
  try {
    const accessToken = await getAccessToken();
    const url = `${wechatConfig.miniprogram.apiUrls.sendMessage}?access_token=${accessToken}`;
    
    const messageData = {
      touser: openid,
      template_id: templateId,
      page: page,
      data: data,
      miniprogram_state: process.env.NODE_ENV === 'production' ? 'formal' : 'trial'
    };
    
    const response = await axios.post(url, messageData);
    const result = response.data;
    
    if (result.errcode !== 0) {
      console.error('发送订阅消息失败:', result);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('发送订阅消息异常:', error);
    return false;
  }
};

/**
 * 发送工单状态通知
 * @param {string} openid 用户openid
 * @param {object} orderInfo 工单信息
 * @param {string} status 状态
 * @returns {Promise<boolean>}
 */
const sendOrderStatusNotification = async (openid, orderInfo, status) => {
  const templates = {
    accepted: {
      templateId: wechatConfig.templates.orderAccepted,
      data: {
        thing1: { value: orderInfo.title },
        thing2: { value: orderInfo.electricianName },
        phone_number3: { value: orderInfo.electricianPhone },
        time4: { value: orderInfo.acceptedTime }
      },
      page: `pages/order/detail?id=${orderInfo.id}`
    },
    confirmed: {
      templateId: wechatConfig.templates.electricianArrived,
      data: {
        thing1: { value: orderInfo.title },
        thing2: { value: orderInfo.electricianName },
        time3: { value: orderInfo.arrivedTime },
        thing4: { value: '电工已到达现场，请确认' }
      },
      page: `pages/order/detail?id=${orderInfo.id}`
    },
    quoted: {
      templateId: wechatConfig.templates.orderQuoted,
      data: {
        thing1: { value: orderInfo.title },
        amount2: { value: `¥${orderInfo.quotedAmount}` },
        thing3: { value: orderInfo.quoteNote || '详见工单详情' },
        time4: { value: orderInfo.quotedTime }
      },
      page: `pages/order/detail?id=${orderInfo.id}`
    },
    completed: {
      templateId: wechatConfig.templates.orderCompleted,
      data: {
        thing1: { value: orderInfo.title },
        amount2: { value: `¥${orderInfo.finalAmount}` },
        time3: { value: orderInfo.completedTime },
        thing4: { value: '请及时支付并评价' }
      },
      page: `pages/order/detail?id=${orderInfo.id}`
    }
  };
  
  const template = templates[status];
  if (!template) {
    console.warn(`未找到状态 ${status} 对应的消息模板`);
    return false;
  }
  
  return await sendSubscribeMessage(
    openid,
    template.templateId,
    template.data,
    template.page
  );
};

/**
 * 发送支付成功通知
 * @param {string} openid 用户openid
 * @param {object} paymentInfo 支付信息
 * @returns {Promise<boolean>}
 */
const sendPaymentSuccessNotification = async (openid, paymentInfo) => {
  const data = {
    character_string1: { value: paymentInfo.orderNo },
    amount2: { value: `¥${paymentInfo.amount}` },
    time3: { value: paymentInfo.paidTime },
    thing4: { value: '支付成功，感谢您的使用' }
  };
  
  return await sendSubscribeMessage(
    openid,
    wechatConfig.templates.paymentSuccess,
    data,
    `pages/order/detail?id=${paymentInfo.orderId}`
  );
};

/**
 * 微信支付统一下单
 * @param {object} orderData 订单数据
 * @returns {Promise<object>}
 */
const createWechatPayOrder = async (orderData) => {
  try {
    const {
      outTradeNo,
      totalFee,
      body,
      openid,
      notifyUrl
    } = orderData;
    
    // 构建请求参数
    const params = {
      appid: wechatConfig.appId,
      mch_id: wechatConfig.mchId,
      nonce_str: generateNonceStr(),
      body: body,
      out_trade_no: outTradeNo,
      total_fee: Math.round(totalFee * 100), // 转换为分
      spbill_create_ip: '127.0.0.1',
      notify_url: notifyUrl,
      trade_type: 'JSAPI',
      openid: openid
    };
    
    // 生成签名
    params.sign = generateWechatPaySign(params);
    
    // 构建XML请求体
    const xmlData = buildXmlData(params);
    
    // 发送请求
    const response = await axios.post(
      `${wechatConfig.payApiUrl}/pay/unifiedorder`,
      xmlData,
      {
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    );
    
    // 解析响应
    const result = parseXmlResponse(response.data);
    
    if (result.return_code !== 'SUCCESS') {
      throw new CustomError(`微信支付下单失败: ${result.return_msg}`, 400);
    }
    
    if (result.result_code !== 'SUCCESS') {
      throw new CustomError(`微信支付下单失败: ${result.err_code_des}`, 400);
    }
    
    // 生成小程序支付参数
    const paymentParams = generateMiniProgramPayParams(result.prepay_id);
    
    return {
      prepayId: result.prepay_id,
      paymentParams
    };
    
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('创建微信支付订单失败', 500);
  }
};

/**
 * 生成随机字符串
 * @param {number} length 长度
 * @returns {string}
 */
const generateNonceStr = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 生成微信支付签名
 * @param {object} params 参数
 * @returns {string}
 */
const generateWechatPaySign = (params) => {
  // 排序参数
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter(key => params[key] && key !== 'sign')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringSignTemp = `${stringA}&key=${wechatConfig.payKey}`;
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
};

/**
 * 构建XML数据
 * @param {object} params 参数
 * @returns {string}
 */
const buildXmlData = (params) => {
  let xml = '<xml>';
  Object.keys(params).forEach(key => {
    xml += `<${key}><![CDATA[${params[key]}]]></${key}>`;
  });
  xml += '</xml>';
  return xml;
};

/**
 * 解析XML响应
 * @param {string} xmlData XML数据
 * @returns {object}
 */
const parseXmlResponse = (xmlData) => {
  const result = {};
  const regex = /<(\w+)><\!\[CDATA\[([^\]]+)\]\]><\/\w+>/g;
  let match;
  
  while ((match = regex.exec(xmlData)) !== null) {
    result[match[1]] = match[2];
  }
  
  return result;
};

/**
 * 生成小程序支付参数
 * @param {string} prepayId 预支付ID
 * @returns {object}
 */
const generateMiniProgramPayParams = (prepayId) => {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;
  
  const params = {
    appId: wechatConfig.appId,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'MD5'
  };
  
  // 生成支付签名
  const paySign = generateWechatPaySign(params);
  
  return {
    ...params,
    paySign
  };
};

/**
 * 验证微信支付回调签名
 * @param {object} data 回调数据
 * @returns {boolean}
 */
const verifyWechatPayCallback = (data) => {
  const sign = data.sign;
  delete data.sign;
  
  const generatedSign = generateWechatPaySign(data);
  return sign === generatedSign;
};

module.exports = {
  miniProgramLogin,
  getAccessToken,
  sendSubscribeMessage,
  sendOrderStatusNotification,
  sendPaymentSuccessNotification,
  createWechatPayOrder,
  generateNonceStr,
  generateWechatPaySign,
  verifyWechatPayCallback
};