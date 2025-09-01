// utils/config.js

/**
 * 应用配置
 */
const config = {
  // API服务器地址
  API_BASE_URL: 'http://localhost:3000',
  
  // 请求超时时间（毫秒）
  REQUEST_TIMEOUT: 10000,
  
  // 微信小程序配置
  WECHAT: {
    APP_ID: '', // 微信小程序AppID
  },
  
  // 地图配置
  MAP: {
    // 腾讯地图key
    TENCENT_MAP_KEY: '',
    // 默认城市
    DEFAULT_CITY: '北京市'
  },
  
  // 文件上传配置
  UPLOAD: {
    // 最大文件大小（字节）
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    // 允许的文件类型
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif']
  },
  
  // 分页配置
  PAGINATION: {
    PAGE_SIZE: 20
  }
};

module.exports = config;