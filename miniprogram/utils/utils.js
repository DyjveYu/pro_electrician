// utils/utils.js

/**
 * 通用工具函数
 */

/**
 * 格式化时间
 * @param {Date|string|number} date 时间
 * @param {string} format 格式 YYYY-MM-DD HH:mm:ss
 */
function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化相对时间
 * @param {Date|string|number} date 时间
 */
function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前';
  } else if (diff < year) {
    return Math.floor(diff / month) + '个月前';
  } else {
    return Math.floor(diff / year) + '年前';
  }
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间
 */
function debounce(func, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 延迟时间
 */
function throttle(func, delay = 300) {
  let timer = null;
  return function(...args) {
    if (!timer) {
      timer = setTimeout(() => {
        func.apply(this, args);
        timer = null;
      }, delay);
    }
  };
}

/**
 * 深拷贝
 * @param {any} obj 要拷贝的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 验证手机号
 * @param {string} phone 手机号
 */
function validatePhone(phone) {
  const phoneReg = /^1[3-9]\d{9}$/;
  return phoneReg.test(phone);
}

/**
 * 验证身份证号
 * @param {string} idCard 身份证号
 */
function validateIdCard(idCard) {
  const idCardReg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardReg.test(idCard);
}

/**
 * 验证邮箱
 * @param {string} email 邮箱
 */
function validateEmail(email) {
  const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailReg.test(email);
}

/**
 * 格式化金额
 * @param {number} amount 金额
 * @param {number} decimals 小数位数
 */
function formatMoney(amount, decimals = 2) {
  if (isNaN(amount)) return '0.00';
  
  const num = Number(amount);
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 * @param {string} filename 文件名
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * 判断是否为图片文件
 * @param {string} filename 文件名
 */
function isImageFile(filename) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const extension = getFileExtension(filename);
  return imageExtensions.includes(extension);
}

/**
 * 计算两点间距离（米）
 * @param {number} lat1 纬度1
 * @param {number} lng1 经度1
 * @param {number} lat2 纬度2
 * @param {number} lng2 经度2
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 格式化距离
 * @param {number} distance 距离（米）
 */
function formatDistance(distance) {
  if (distance < 1000) {
    return Math.round(distance) + 'm';
  } else {
    return (distance / 1000).toFixed(1) + 'km';
  }
}

/**
 * 获取星期几
 * @param {Date|string|number} date 日期
 */
function getWeekday(date) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(date);
  return '星期' + weekdays[d.getDay()];
}

/**
 * 判断是否为今天
 * @param {Date|string|number} date 日期
 */
function isToday(date) {
  const today = new Date();
  const d = new Date(date);
  return today.toDateString() === d.toDateString();
}

/**
 * 判断是否为昨天
 * @param {Date|string|number} date 日期
 */
function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);
  return yesterday.toDateString() === d.toDateString();
}

/**
 * 获取URL参数
 * @param {string} url URL地址
 */
function getUrlParams(url) {
  const params = {};
  const urlObj = new URL(url);
  for (let [key, value] of urlObj.searchParams) {
    params[key] = value;
  }
  return params;
}

/**
 * 构建URL参数
 * @param {object} params 参数对象
 */
function buildUrlParams(params) {
  const searchParams = new URLSearchParams();
  for (let key in params) {
    if (params[key] !== null && params[key] !== undefined) {
      searchParams.append(key, params[key]);
    }
  }
  return searchParams.toString();
}

/**
 * 隐藏手机号中间4位
 * @param {string} phone 手机号
 */
function hidePhoneNumber(phone) {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 隐藏身份证号中间部分
 * @param {string} idCard 身份证号
 */
function hideIdCard(idCard) {
  if (!idCard) return idCard;
  if (idCard.length === 15) {
    return idCard.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
  } else if (idCard.length === 18) {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
  return idCard;
}

/**
 * 获取随机颜色
 */
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 获取头像背景色
 * @param {string} name 姓名
 */
function getAvatarBgColor(name) {
  if (!name) return '#ccc';
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * 获取姓名首字母
 * @param {string} name 姓名
 */
function getNameInitial(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase();
}

/**
 * 数组去重
 * @param {Array} arr 数组
 * @param {string} key 去重字段
 */
function uniqueArray(arr, key) {
  if (!Array.isArray(arr)) return [];
  
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  } else {
    return [...new Set(arr)];
  }
}

/**
 * 数组分组
 * @param {Array} arr 数组
 * @param {string|Function} key 分组字段或函数
 */
function groupArray(arr, key) {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * 数组排序
 * @param {Array} arr 数组
 * @param {string} key 排序字段
 * @param {string} order 排序方向 asc|desc
 */
function sortArray(arr, key, order = 'asc') {
  if (!Array.isArray(arr)) return [];
  
  return arr.sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];
    
    if (order === 'desc') {
      return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
    } else {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    }
  });
}

/**
 * 检查对象是否为空
 * @param {object} obj 对象
 */
function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 安全的JSON解析
 * @param {string} str JSON字符串
 * @param {any} defaultValue 默认值
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 安全的JSON字符串化
 * @param {any} obj 对象
 * @param {string} defaultValue 默认值
 */
function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON字符串化失败:', error);
    return defaultValue;
  }
}

/**
 * 睡眠函数
 * @param {number} ms 毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn 要重试的函数
 * @param {number} times 重试次数
 * @param {number} delay 重试间隔
 */
async function retry(fn, times = 3, delay = 1000) {
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === times - 1) throw error;
      await sleep(delay);
    }
  }
}

module.exports = {
  formatTime,
  formatRelativeTime,
  debounce,
  throttle,
  deepClone,
  generateId,
  validatePhone,
  validateIdCard,
  validateEmail,
  formatMoney,
  formatFileSize,
  getFileExtension,
  isImageFile,
  calculateDistance,
  formatDistance,
  getWeekday,
  isToday,
  isYesterday,
  getUrlParams,
  buildUrlParams,
  hidePhoneNumber,
  hideIdCard,
  getRandomColor,
  getAvatarBgColor,
  getNameInitial,
  uniqueArray,
  groupArray,
  sortArray,
  isEmpty,
  safeJsonParse,
  safeJsonStringify,
  sleep,
  retry
};