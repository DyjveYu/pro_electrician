// utils/config.js

/**
 * 应用配置
 */
const config = {
  // API基础地址
  API_BASE_URL: 'http://localhost:3000',
  
  // WebSocket地址
  WS_BASE_URL: 'ws://localhost:3000',
  
  // 微信小程序配置
  WX_APP_ID: 'wx5aa758717e06fc40',
  
  // 地图配置
  MAP_KEY: 'your-map-key',
  
  // 文件上传配置
  UPLOAD: {
    // 最大文件大小（字节）
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    // 支持的图片格式
    ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'webp'],
    // 最大图片数量
    MAX_IMAGE_COUNT: 9
  },
  
  // 分页配置
  PAGINATION: {
    PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50
  },
  
  // 缓存配置
  CACHE: {
    // 缓存过期时间（毫秒）
    EXPIRE_TIME: 30 * 60 * 1000, // 30分钟
    // 用户信息缓存时间
    USER_INFO_EXPIRE: 24 * 60 * 60 * 1000, // 24小时
    // 位置信息缓存时间
    LOCATION_EXPIRE: 10 * 60 * 1000 // 10分钟
  },
  
  // 地理位置配置
  LOCATION: {
    // 默认搜索半径（米）
    DEFAULT_RADIUS: 5000,
    // 最大搜索半径（米）
    MAX_RADIUS: 50000,
    // 位置更新间隔（毫秒）
    UPDATE_INTERVAL: 60000 // 1分钟
  },
  
  // 工单配置
  ORDER: {
    // 工单状态
    STATUS: {
      PENDING: 'pending',           // 待接单
      ACCEPTED: 'accepted',         // 已接单
      CONFIRMED: 'confirmed',       // 已确认
      QUOTED: 'quoted',            // 已报价
      QUOTE_CONFIRMED: 'quote_confirmed', // 报价已确认
      IN_PROGRESS: 'in_progress',   // 进行中
      COMPLETED: 'completed',       // 已完成
      CANCELLED: 'cancelled'        // 已取消
    },
    // 故障类型
    FAULT_TYPES: [
      { value: 'lighting', label: '照明故障' },
      { value: 'socket', label: '插座故障' },
      { value: 'switch', label: '开关故障' },
      { value: 'circuit', label: '电路故障' },
      { value: 'appliance', label: '电器故障' },
      { value: 'wiring', label: '线路故障' },
      { value: 'other', label: '其他故障' }
    ],
    // 紧急程度
    URGENCY_LEVELS: [
      { value: 'low', label: '不紧急', color: '#10b981' },
      { value: 'medium', label: '一般', color: '#f59e0b' },
      { value: 'high', label: '紧急', color: '#ef4444' },
      { value: 'critical', label: '非常紧急', color: '#dc2626' }
    ]
  },
  
  // 电工配置
  ELECTRICIAN: {
    // 工作状态
    WORK_STATUS: {
      ONLINE: 'online',     // 在线
      OFFLINE: 'offline',   // 离线
      BUSY: 'busy'         // 忙碌
    },
    // 专业领域
    SPECIALTIES: [
      { value: 'residential', label: '家庭电工' },
      { value: 'commercial', label: '商业电工' },
      { value: 'industrial', label: '工业电工' },
      { value: 'maintenance', label: '维修电工' },
      { value: 'installation', label: '安装电工' },
      { value: 'emergency', label: '应急电工' }
    ],
    // 认证状态
    CERT_STATUS: {
      PENDING: 'pending',     // 待审核
      APPROVED: 'approved',   // 已通过
      REJECTED: 'rejected'    // 已拒绝
    }
  },
  
  // 用户类型
  USER_TYPES: {
    USER: 'user',           // 普通用户
    ELECTRICIAN: 'electrician' // 电工
  },
  
  // 评价配置
  REVIEW: {
    // 评价标签
    TAGS: [
      '服务态度好',
      '技术专业',
      '价格合理',
      '响应及时',
      '工作认真',
      '解决问题快',
      '收费透明',
      '准时到达'
    ],
    // 评分维度
    RATING_DIMENSIONS: [
      { key: 'service_rating', label: '服务态度' },
      { key: 'skill_rating', label: '技术水平' },
      { key: 'punctuality_rating', label: '准时性' }
    ]
  },
  
  // 支付配置
  PAYMENT: {
    // 支付方式
    METHODS: {
      WECHAT: 'wechat',     // 微信支付
      ALIPAY: 'alipay',     // 支付宝
      CASH: 'cash'          // 现金
    },
    // 支付状态
    STATUS: {
      PENDING: 'pending',   // 待支付
      PAID: 'paid',        // 已支付
      REFUNDED: 'refunded', // 已退款
      FAILED: 'failed'      // 支付失败
    }
  },
  
  // 消息类型
  MESSAGE_TYPES: {
    TEXT: 'text',         // 文本消息
    IMAGE: 'image',       // 图片消息
    LOCATION: 'location', // 位置消息
    SYSTEM: 'system'      // 系统消息
  },
  
  // 通知类型
  NOTIFICATION_TYPES: {
    ORDER_UPDATE: 'order_update',     // 工单更新
    NEW_ORDER: 'new_order',          // 新工单
    MESSAGE: 'message',              // 新消息
    PAYMENT: 'payment',              // 支付通知
    REVIEW: 'review'                 // 评价通知
  },
  
  // 错误码
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTH_FAILED: 'AUTH_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
  },
  
  // 开发环境配置
  DEV: {
    // 是否启用调试模式
    DEBUG: true,
    // 是否显示日志
    SHOW_LOG: true,
    // 是否启用mock数据
    ENABLE_MOCK: false
  }
};

// 根据环境切换配置
if (typeof wx !== 'undefined') {
  // 获取小程序账号信息
  const accountInfo = wx.getAccountInfoSync();
  const env = accountInfo.miniProgram.envVersion;
  
  if (env === 'develop') {
    // 开发版
    config.API_BASE_URL = 'http://localhost:3000';
    config.WS_BASE_URL = 'ws://localhost:3000';
    config.DEV.DEBUG = true;
  } else if (env === 'trial') {
    // 体验版
    config.API_BASE_URL = 'https://test-api.example.com';
    config.WS_BASE_URL = 'wss://test-api.example.com';
    config.DEV.DEBUG = true;
  } else if (env === 'release') {
    // 正式版
    config.API_BASE_URL = 'https://api.example.com';
    config.WS_BASE_URL = 'wss://api.example.com';
    config.DEV.DEBUG = false;
  }
}

module.exports = config;