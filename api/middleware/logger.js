const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 请求日志中间件
 */
const logger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // 记录请求信息
  const requestInfo = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  };

  // 控制台输出（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`📝 ${requestInfo.method} ${requestInfo.url} - ${requestInfo.ip}`);
  }

  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    // 控制台输出响应信息
    const statusEmoji = getStatusEmoji(res.statusCode);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${statusEmoji} ${responseInfo.method} ${responseInfo.url} ` +
        `${responseInfo.statusCode} - ${responseInfo.duration}`
      );
    }

    // 写入日志文件
    writeLogFile(responseInfo);
  });

  next();
};

/**
 * 根据状态码获取表情符号
 */
function getStatusEmoji(statusCode) {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '🔄';
  if (statusCode >= 400 && statusCode < 500) return '⚠️';
  if (statusCode >= 500) return '❌';
  return '📝';
}

/**
 * 写入日志文件
 */
function writeLogFile(logData) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logFileName = `access-${date}.log`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logLine = JSON.stringify(logData) + '\n';
    
    fs.appendFileSync(logFilePath, logLine);
  } catch (error) {
    console.error('写入日志文件失败:', error);
  }
}

/**
 * 错误日志记录器
 */
const errorLogger = (error, req = null) => {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    const logFileName = `error-${date}.log`;
    const logFilePath = path.join(logDir, logFileName);
    
    const errorData = {
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      } : null
    };
    
    const logLine = JSON.stringify(errorData) + '\n';
    fs.appendFileSync(logFilePath, logLine);
  } catch (logError) {
    console.error('写入错误日志失败:', logError);
  }
};

/**
 * 业务日志记录器
 */
const businessLogger = (action, data, userId = null) => {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    const logFileName = `business-${date}.log`;
    const logFilePath = path.join(logDir, logFileName);
    
    const logData = {
      timestamp,
      action,
      userId,
      data
    };
    
    const logLine = JSON.stringify(logData) + '\n';
    fs.appendFileSync(logFilePath, logLine);
    
    // 开发环境控制台输出
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 业务日志: ${action}`, data);
    }
  } catch (error) {
    console.error('写入业务日志失败:', error);
  }
};

/**
 * 清理旧日志文件（保留30天）
 */
const cleanOldLogs = () => {
  try {
    const files = fs.readdirSync(logDir);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 删除旧日志文件: ${file}`);
      }
    });
  } catch (error) {
    console.error('清理旧日志文件失败:', error);
  }
};

// 每天清理一次旧日志
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
  logger,
  errorLogger,
  businessLogger,
  cleanOldLogs
};