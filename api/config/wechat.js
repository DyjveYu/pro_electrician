require('dotenv').config();

module.exports = {
  // 微信小程序配置
  miniprogram: {
    appId: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
    
    // 微信API地址
    apiUrls: {
      code2Session: 'https://api.weixin.qq.com/sns/jscode2session',
      getAccessToken: 'https://api.weixin.qq.com/cgi-bin/token',
      sendMessage: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send'
    }
  },
  
  // 微信支付配置
  pay: {
    mchId: process.env.WECHAT_PAY_MCHID || '',
    key: process.env.WECHAT_PAY_KEY || '',
    certPath: process.env.WECHAT_PAY_CERT_PATH || '',
    keyPath: process.env.WECHAT_PAY_KEY_PATH || '',
    
    // 支付API地址
    apiUrls: {
      unifiedOrder: 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi',
      queryOrder: 'https://api.mch.weixin.qq.com/v3/pay/transactions/id',
      closeOrder: 'https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no',
      refund: 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds'
    },
    
    // 回调地址
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'https://your-domain.com/api/payments/notify'
  },
  
  // 订阅消息模板ID
  subscribeMessages: {
    orderStatusUpdate: process.env.WECHAT_ORDER_STATUS_TEMPLATE || '',
    paymentSuccess: process.env.WECHAT_PAYMENT_SUCCESS_TEMPLATE || '',
    electricianAssigned: process.env.WECHAT_ELECTRICIAN_ASSIGNED_TEMPLATE || ''
  }
};