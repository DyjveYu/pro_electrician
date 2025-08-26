const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { User } = require('../models');

/**
 * JWT认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 验证token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // 查找用户
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      openid: user.openid,
      phone: user.phone,
      name: user.name,
      userType: user.user_type,
      avatar: user.avatar
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }

    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证验证失败'
    });
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    const user = await User.findByPk(decoded.userId);
    if (user) {
      req.user = {
        id: user.id,
        openid: user.openid,
        phone: user.phone,
        name: user.name,
        userType: user.user_type,
        avatar: user.avatar
      };
    }

    next();
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    next();
  }
};

/**
 * 角色验证中间件
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 电工认证中间件
 */
const requireElectrician = requireRole(['electrician']);

/**
 * 用户认证中间件
 */
const requireUser = requireRole(['user']);

/**
 * 管理员认证中间件
 */
const requireAdmin = requireRole(['admin']);

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requireElectrician,
  requireUser,
  requireAdmin
};