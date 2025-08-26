/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('🚨 服务器错误:', err);

  // 默认错误信息
  let error = {
    success: false,
    message: '服务器内部错误',
    statusCode: 500
  };

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    error.message = '数据验证失败';
    error.statusCode = 400;
    error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Sequelize 唯一约束错误
  else if (err.name === 'SequelizeUniqueConstraintError') {
    error.message = '数据已存在';
    error.statusCode = 409;
    error.details = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} 已存在`
    }));
  }

  // Sequelize 外键约束错误
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    error.message = '关联数据不存在';
    error.statusCode = 400;
  }

  // Sequelize 数据库连接错误
  else if (err.name === 'SequelizeConnectionError') {
    error.message = '数据库连接失败';
    error.statusCode = 503;
  }

  // JWT 错误
  else if (err.name === 'JsonWebTokenError') {
    error.message = '无效的认证令牌';
    error.statusCode = 401;
  }

  // JWT 过期错误
  else if (err.name === 'TokenExpiredError') {
    error.message = '认证令牌已过期';
    error.statusCode = 401;
  }

  // 文件上传错误
  else if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = '文件大小超出限制';
    error.statusCode = 413;
  }

  // 文件类型错误
  else if (err.code === 'INVALID_FILE_TYPE') {
    error.message = '不支持的文件类型';
    error.statusCode = 400;
  }

  // 自定义业务错误
  else if (err.statusCode) {
    error.message = err.message;
    error.statusCode = err.statusCode;
    if (err.details) {
      error.details = err.details;
    }
  }

  // 语法错误
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error.message = '请求数据格式错误';
    error.statusCode = 400;
  }

  // 开发环境显示详细错误信息
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.originalError = err.message;
  }

  // 记录错误日志
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  };

  // 根据错误级别记录日志
  if (error.statusCode >= 500) {
    console.error('💥 服务器错误:', logData);
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ 客户端错误:', logData);
  }

  // 返回错误响应
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

/**
 * 创建自定义错误
 */
class CustomError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'CustomError';
  }
}

/**
 * 异步错误包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  CustomError,
  asyncHandler
};