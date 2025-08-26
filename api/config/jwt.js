require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // JWT选项
  options: {
    issuer: 'pro-electrician',
    audience: 'pro-electrician-users',
    algorithm: 'HS256'
  },
  
  // 刷新令牌配置
  refreshToken: {
    expiresIn: '30d',
    secret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key_here'
  }
};