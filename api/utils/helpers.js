const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * 生成随机字符串
 * @param {number} length 长度
 * @param {string} charset 字符集
 * @returns {string}
 */
const generateRandomString = (length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * 生成唯一ID
 * @param {string} prefix 前缀
 * @returns {string}
 */
const generateUniqueId = (prefix = '') => {
  const timestamp = Date.now().toString();
  const random = generateRandomString(6);
  return `${prefix}${timestamp}${random}`;
};

/**
 * MD5加密
 * @param {string} text 待加密文本
 * @returns {string}
 */
const md5 = (text) => {
  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * SHA256加密
 * @param {string} text 待加密文本
 * @returns {string}
 */
const sha256 = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * 生成JWT令牌
 * @param {object} payload 载荷数据
 * @param {string} expiresIn 过期时间
 * @returns {string}
 */
const generateToken = (payload, expiresIn = jwtConfig.expiresIn) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });
};

/**
 * 验证JWT令牌
 * @param {string} token 令牌
 * @returns {object|null}
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    return null;
  }
};

/**
 * 格式化手机号
 * @param {string} phone 手机号
 * @returns {string}
 */
const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
  }
  return phone;
};

/**
 * 验证手机号格式
 * @param {string} phone 手机号
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证身份证号格式
 * @param {string} idCard 身份证号
 * @returns {boolean}
 */
const isValidIdCard = (idCard) => {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardRegex.test(idCard);
};

/**
 * 计算两点间距离（公里）
 * @param {number} lat1 纬度1
 * @param {number} lng1 经度1
 * @param {number} lat2 纬度2
 * @param {number} lng2 经度2
 * @returns {number}
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * 格式化金额
 * @param {number} amount 金额
 * @param {number} decimals 小数位数
 * @returns {string}
 */
const formatAmount = (amount, decimals = 2) => {
  if (isNaN(amount)) return '0.00';
  return parseFloat(amount).toFixed(decimals);
};

/**
 * 分页参数处理
 * @param {object} query 查询参数
 * @returns {object}
 */
const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit: Math.min(limit, 100), // 限制最大每页数量
    offset
  };
};

/**
 * 格式化分页响应
 * @param {object} data 数据
 * @param {number} page 当前页
 * @param {number} limit 每页数量
 * @param {number} total 总数量
 * @returns {object}
 */
const formatPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      current_page: page,
      per_page: limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };
};

/**
 * 时间格式化
 * @param {Date|string} date 日期
 * @param {string} format 格式
 * @returns {string}
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 获取相对时间
 * @param {Date|string} date 日期
 * @returns {string}
 */
const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(date, 'MM-DD HH:mm');
};

/**
 * 深度克隆对象
 * @param {any} obj 对象
 * @returns {any}
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

/**
 * 防抖函数
 * @param {Function} func 函数
 * @param {number} wait 等待时间
 * @returns {Function}
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func 函数
 * @param {number} limit 限制时间
 * @returns {Function}
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 休眠函数
 * @param {number} ms 毫秒
 * @returns {Promise}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 重试函数
 * @param {Function} fn 函数
 * @param {number} retries 重试次数
 * @param {number} delay 延迟时间
 * @returns {Promise}
 */
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return retry(fn, retries - 1, delay);
    }
    throw error;
  }
};

module.exports = {
  generateRandomString,
  generateUniqueId,
  md5,
  sha256,
  generateToken,
  verifyToken,
  formatPhone,
  isValidPhone,
  isValidIdCard,
  calculateDistance,
  formatAmount,
  getPagination,
  formatPaginationResponse,
  formatDate,
  getRelativeTime,
  deepClone,
  debounce,
  throttle,
  sleep,
  retry
};