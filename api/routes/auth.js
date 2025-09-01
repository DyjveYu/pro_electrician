const express = require('express');
const router = express.Router();
const {
  wechatLogin,
  bindPhone,
  phoneLogin,
  sendSmsCode,
  getCurrentUser,
  updateProfile,
  applyElectrician,
  refreshToken,
  logout
} = require('../controllers/authController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, upload } = require('../middleware/upload');

/**
 * @route POST /api/auth/wx-login
 * @desc 微信小程序登录
 * @access Public
 */
router.post('/wx-login', wechatLogin);

/**
 * @route POST /api/auth/phone-login
 * @desc 手机号登录
 * @access Public
 */
router.post('/phone-login', phoneLogin);

/**
 * @route POST /api/auth/send-sms
 * @desc 发送短信验证码
 * @access Public
 */
router.post('/send-sms', sendSmsCode);

/**
 * @route POST /api/auth/bind-phone
 * @desc 绑定手机号
 * @access Private
 */
router.post('/bind-phone', authMiddleware, bindPhone);

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', authMiddleware, getCurrentUser);

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户信息
 * @access Private
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @route POST /api/auth/upload-avatar
 * @desc 上传头像
 * @access Private
 */
router.post('/upload-avatar', authMiddleware, uploadAvatar, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择头像文件'
      });
    }

    const { User } = require('../models');
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新用户头像
    await user.update({ avatar: req.file.savedPath });

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: req.file.savedPath
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '头像上传失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/auth/upload-image
 * @desc 通用图片上传
 * @access Private
 */
router.post('/upload-image', authMiddleware, upload.array('images', 9), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择图片文件'
      });
    }

    // 获取上传的文件路径
    const imageUrls = req.files.map(file => file.savedPath);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        urls: imageUrls
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片上传失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/auth/apply-electrician
 * @desc 申请成为电工
 * @access Private
 */
router.post('/apply-electrician', authMiddleware, applyElectrician);

/**
 * @route POST /api/auth/refresh-token
 * @desc 刷新令牌
 * @access Private
 */
router.post('/refresh-token', authMiddleware, refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc 注销登录
 * @access Private
 */
router.post('/logout', authMiddleware, logout);

/**
 * @route GET /api/auth/check
 * @desc 检查登录状态
 * @access Public (可选认证)
 */
router.get('/check', optionalAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      isAuthenticated: !!req.user,
      user: req.user || null
    }
  });
});

module.exports = router;