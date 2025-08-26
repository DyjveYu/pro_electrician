const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderDetail,
  acceptOrder,
  confirmOrder,
  submitQuote,
  confirmQuote,
  startWork,
  completeWork,
  cancelOrder,
  getNearbyOrders
} = require('../controllers/orderController');
const { authMiddleware, requireUser, requireElectrician } = require('../middleware/auth');
const { uploadOrderImages, uploadWorkImages, deleteFile } = require('../middleware/upload');

/**
 * @route POST /api/orders
 * @desc 创建工单
 * @access Private (用户)
 */
router.post('/', requireUser, createOrder);

/**
 * @route GET /api/orders
 * @desc 获取工单列表
 * @access Private
 */
router.get('/', authMiddleware, getOrders);

/**
 * @route GET /api/orders/nearby
 * @desc 获取附近工单（电工端）
 * @access Private (电工)
 */
router.get('/nearby', requireElectrician, getNearbyOrders);

/**
 * @route GET /api/orders/:id
 * @desc 获取工单详情
 * @access Private
 */
router.get('/:id', authMiddleware, getOrderDetail);

/**
 * @route POST /api/orders/:id/accept
 * @desc 电工接单
 * @access Private (电工)
 */
router.post('/:id/accept', requireElectrician, acceptOrder);

/**
 * @route POST /api/orders/:id/confirm
 * @desc 用户确认工单
 * @access Private (用户)
 */
router.post('/:id/confirm', requireUser, confirmOrder);

/**
 * @route POST /api/orders/:id/quote
 * @desc 电工报价
 * @access Private (电工)
 */
router.post('/:id/quote', requireElectrician, submitQuote);

/**
 * @route POST /api/orders/:id/confirm-quote
 * @desc 用户确认报价
 * @access Private (用户)
 */
router.post('/:id/confirm-quote', requireUser, confirmQuote);

/**
 * @route POST /api/orders/:id/start-work
 * @desc 开始维修
 * @access Private (电工)
 */
router.post('/:id/start-work', requireElectrician, startWork);

/**
 * @route POST /api/orders/:id/complete
 * @desc 完成维修
 * @access Private (电工)
 */
router.post('/:id/complete', requireElectrician, completeWork);

/**
 * @route POST /api/orders/:id/cancel
 * @desc 取消工单
 * @access Private
 */
router.post('/:id/cancel', authMiddleware, cancelOrder);

/**
 * @route POST /api/orders/:id/upload-images
 * @desc 上传工单图片
 * @access Private (用户)
 */
router.post('/:id/upload-images', requireUser, uploadOrderImages, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择图片文件'
      });
    }

    const { Order } = require('../models');
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    // 检查权限
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此工单'
      });
    }

    // 获取上传的文件路径
    const newImages = req.files.map(file => file.savedPath);
    
    // 合并现有图片
    const existingImages = order.images || [];
    const updatedImages = [...existingImages, ...newImages];
    
    // 限制最多10张图片
    if (updatedImages.length > 10) {
      return res.status(400).json({
        success: false,
        message: '工单图片最多10张'
      });
    }
    
    // 更新工单图片
    await order.update({ images: updatedImages });

    const { businessLogger } = require('../middleware/logger');
    businessLogger('order_images_upload', {
      orderId: order.id,
      newImageCount: newImages.length,
      totalImageCount: updatedImages.length
    }, req.user.id);

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        images: updatedImages
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
 * @route POST /api/orders/:id/upload-work-images
 * @desc 上传维修图片
 * @access Private (电工)
 */
router.post('/:id/upload-work-images', requireElectrician, uploadWorkImages, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择图片文件'
      });
    }

    const { Order, Electrician } = require('../models');
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    // 获取电工信息
    const electrician = await Electrician.findOne({
      where: { user_id: req.user.id }
    });
    
    if (!electrician || order.electrician_id !== electrician.id) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此工单'
      });
    }

    // 获取上传的文件路径
    const newImages = req.files.map(file => file.savedPath);
    
    // 合并现有维修图片
    const existingImages = order.work_images || [];
    const updatedImages = [...existingImages, ...newImages];
    
    // 限制最多15张图片
    if (updatedImages.length > 15) {
      return res.status(400).json({
        success: false,
        message: '维修图片最多15张'
      });
    }
    
    // 更新维修图片
    await order.update({ work_images: updatedImages });

    const { businessLogger } = require('../middleware/logger');
    businessLogger('work_images_upload', {
      orderId: order.id,
      electricianId: electrician.id,
      newImageCount: newImages.length,
      totalImageCount: updatedImages.length
    }, req.user.id);

    res.json({
      success: true,
      message: '维修图片上传成功',
      data: {
        workImages: updatedImages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '维修图片上传失败',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/orders/:id/images
 * @desc 删除工单图片
 * @access Private (用户)
 */
router.delete('/:id/images', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片URL'
      });
    }

    const { Order } = require('../models');
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    // 检查权限
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限操作此工单'
      });
    }

    // 从图片数组中移除指定图片
    const images = order.images || [];
    const updatedImages = images.filter(img => img !== imageUrl);
    
    await order.update({ images: updatedImages });

    // 删除文件
    try {
      deleteFile(imageUrl);
    } catch (deleteError) {
      console.error('删除文件失败:', deleteError);
    }

    const { businessLogger } = require('../middleware/logger');
    businessLogger('order_image_delete', {
      orderId: order.id,
      deletedImage: imageUrl
    }, req.user.id);

    res.json({
      success: true,
      message: '图片删除成功',
      data: {
        images: updatedImages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '图片删除失败',
      error: error.message
    });
  }
});

module.exports = router;