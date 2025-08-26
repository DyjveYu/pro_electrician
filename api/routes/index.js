const express = require('express');
const router = express.Router();

// 导入路由模块
const authRoutes = require('./auth');
const electricianRoutes = require('./electricians');
const orderRoutes = require('./orders');

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由
router.use('/auth', authRoutes);
router.use('/electricians', electricianRoutes);
router.use('/orders', orderRoutes);

// 404处理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API接口不存在',
    path: req.originalUrl
  });
});

module.exports = router;