const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// 导入配置和模块
const { sequelize, testConnection } = require('./config/database');
const authMiddleware = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./middleware/logger');

// 导入路由
const apiRoutes = require('./routes');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 将io实例添加到app中，供其他模块使用
app.set('io', io);

// 中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../uploads')));

// 日志中间件
app.use(logger);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api', apiRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use(errorHandler);

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('🔌 用户连接:', socket.id);
  
  // 用户认证
  socket.on('auth', (data) => {
    // 这里可以验证JWT token
    socket.userId = data.userId;
    socket.userType = data.userType;
    console.log(`👤 用户认证成功: ${data.userId} (${data.userType})`);
  });
  
  // 加入房间（按用户类型分组）
  socket.on('join-room', (roomName) => {
    socket.join(roomName);
    console.log(`🏠 用户 ${socket.userId} 加入房间: ${roomName}`);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('🔌 用户断开连接:', socket.id);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 同步数据库模型
    await sequelize.sync({ alter: true });
    console.log('📊 数据库模型同步完成');
    
    // 启动服务器
    server.listen(PORT, () => {
      console.log(`🚀 服务器启动成功`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Socket.IO 已启用`);
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('🛑 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    sequelize.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    sequelize.close();
    process.exit(0);
  });
});

// 启动应用
startServer();

module.exports = app;