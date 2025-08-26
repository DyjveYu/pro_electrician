const express = require('express');
const router = express.Router();
const {
  getElectricians,
  getElectricianDetail,
  updateElectricianInfo,
  updateLocation,
  updateWorkStatus,
  getElectricianStats,
  searchNearbyElectricians
} = require('../controllers/electricianController');
const { authMiddleware, requireElectrician } = require('../middleware/auth');
const { uploadCertificate, uploadWorkImages } = require('../middleware/upload');

/**
 * @route GET /api/electricians
 * @desc 获取电工列表
 * @access Public
 */
router.get('/', getElectricians);

/**
 * @route GET /api/electricians/search
 * @desc 搜索附近电工
 * @access Public
 */
router.get('/search', searchNearbyElectricians);

/**
 * @route GET /api/electricians/:id
 * @desc 获取电工详情
 * @access Public
 */
router.get('/:id', getElectricianDetail);

/**
 * @route PUT /api/electricians/profile
 * @desc 更新电工信息
 * @access Private (电工)
 */
router.put('/profile', requireElectrician, updateElectricianInfo);

/**
 * @route POST /api/electricians/location
 * @desc 更新电工位置
 * @access Private (电工)
 */
router.post('/location', requireElectrician, updateLocation);

/**
 * @route PUT /api/electricians/work-status
 * @desc 更新工作状态
 * @access Private (电工)
 */
router.put('/work-status', requireElectrician, updateWorkStatus);

/**
 * @route GET /api/electricians/me/stats
 * @desc 获取电工统计信息
 * @access Private (电工)
 */
router.get('/me/stats', requireElectrician, getElectricianStats);

/**
 * @route POST /api/electricians/upload-certificate
 * @desc 上传电工证照片
 * @access Private (电工)
 */
router.post('/upload-certificate', requireElectrician, uploadCertificate, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择证书照片'
      });
    }

    const { Electrician } = require('../models');
    const electrician = await Electrician.findOne({
      where: { user_id: req.user.id }
    });
    
    if (!electrician) {
      return res.status(404).json({
        success: false,
        message: '电工信息不存在'
      });
    }

    // 获取上传的文件路径
    const certificatePhotos = req.files.map(file => file.savedPath);
    
    // 更新电工证照片
    await electrician.update({ 
      certificate_photos: certificatePhotos,
      verification_status: 'pending' // 重新提交审核
    });

    const { businessLogger } = require('../middleware/logger');
    businessLogger('certificate_upload', {
      electricianId: electrician.id,
      photoCount: certificatePhotos.length
    }, req.user.id);

    res.json({
      success: true,
      message: '证书照片上传成功',
      data: {
        certificatePhotos
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '证书照片上传失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/electricians/upload-work-images
 * @desc 上传工作照片
 * @access Private (电工)
 */
router.post('/upload-work-images', requireElectrician, uploadWorkImages, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择工作照片'
      });
    }

    const { Electrician } = require('../models');
    const electrician = await Electrician.findOne({
      where: { user_id: req.user.id }
    });
    
    if (!electrician) {
      return res.status(404).json({
        success: false,
        message: '电工信息不存在'
      });
    }

    // 获取上传的文件路径
    const workImages = req.files.map(file => file.savedPath);
    
    // 合并现有的工作照片
    const existingImages = electrician.work_images || [];
    const updatedImages = [...existingImages, ...workImages];
    
    // 限制最多20张照片
    if (updatedImages.length > 20) {
      return res.status(400).json({
        success: false,
        message: '工作照片最多20张'
      });
    }
    
    // 更新工作照片
    await electrician.update({ work_images: updatedImages });

    const { businessLogger } = require('../middleware/logger');
    businessLogger('work_images_upload', {
      electricianId: electrician.id,
      newImageCount: workImages.length,
      totalImageCount: updatedImages.length
    }, req.user.id);

    res.json({
      success: true,
      message: '工作照片上传成功',
      data: {
        workImages: updatedImages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '工作照片上传失败',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/electricians/work-images
 * @desc 删除工作照片
 * @access Private (电工)
 */
router.delete('/work-images', requireElectrician, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的图片URL'
      });
    }

    const { Electrician } = require('../models');
    const electrician = await Electrician.findOne({
      where: { user_id: req.user.id }
    });
    
    if (!electrician) {
      return res.status(404).json({
        success: false,
        message: '电工信息不存在'
      });
    }

    // 从工作照片数组中移除指定图片
    const workImages = electrician.work_images || [];
    const updatedImages = workImages.filter(img => img !== imageUrl);
    
    await electrician.update({ work_images: updatedImages });

    // 删除文件
    const { deleteFile } = require('../middleware/upload');
    try {
      await deleteFile(imageUrl);
    } catch (deleteError) {
      console.error('删除文件失败:', deleteError);
    }

    const { businessLogger } = require('../middleware/logger');
    businessLogger('work_image_delete', {
      electricianId: electrician.id,
      deletedImage: imageUrl
    }, req.user.id);

    res.json({
      success: true,
      message: '工作照片删除成功',
      data: {
        workImages: updatedImages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '工作照片删除失败',
      error: error.message
    });
  }
});

module.exports = router;