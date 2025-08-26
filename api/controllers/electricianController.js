const { User, Electrician, Order, Review } = require('../models');
const { CustomError, asyncHandler } = require('../middleware/errorHandler');
const { businessLogger } = require('../middleware/logger');
const { calculateDistance, getPagination, formatPaginationResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

/**
 * 获取电工列表
 */
const getElectricians = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    city,
    specialties,
    minRating,
    maxDistance,
    latitude,
    longitude,
    sortBy = 'rating',
    sortOrder = 'DESC'
  } = req.query;
  
  const { offset, limit: pageLimit } = getPagination({ page, limit });
  
  // 构建查询条件
  const whereConditions = {
    verification_status: 'approved',
    work_status: { [Op.in]: ['available', 'busy'] }
  };
  
  const userWhereConditions = {
    user_type: 'electrician',
    status: 'active'
  };
  
  if (city) {
    userWhereConditions.city = city;
  }
  
  if (specialties) {
    const specialtyArray = Array.isArray(specialties) ? specialties : [specialties];
    whereConditions.specialties = {
      [Op.overlap]: specialtyArray
    };
  }
  
  if (minRating) {
    whereConditions.rating = {
      [Op.gte]: parseFloat(minRating)
    };
  }
  
  // 排序选项
  let order = [];
  switch (sortBy) {
    case 'rating':
      order = [['rating', sortOrder]];
      break;
    case 'orders':
      order = [['completed_orders', sortOrder]];
      break;
    case 'experience':
      order = [['experience_years', sortOrder]];
      break;
    case 'distance':
      if (latitude && longitude) {
        // 如果有位置信息，按距离排序会在后面处理
        order = [['updated_at', 'DESC']];
      } else {
        order = [['updated_at', 'DESC']];
      }
      break;
    default:
      order = [['updated_at', 'DESC']];
  }
  
  const { count, rows: electricians } = await Electrician.findAndCountAll({
    where: whereConditions,
    include: [{
      model: User,
      as: 'user',
      where: userWhereConditions,
      attributes: ['id', 'name', 'avatar', 'city', 'province']
    }],
    order,
    offset,
    limit: pageLimit
  });
  
  // 如果提供了位置信息，计算距离并过滤
  let filteredElectricians = electricians;
  if (latitude && longitude) {
    filteredElectricians = electricians.map(electrician => {
      const distance = electrician.current_latitude && electrician.current_longitude
        ? calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            electrician.current_latitude,
            electrician.current_longitude
          )
        : null;
      
      return {
        ...electrician.toJSON(),
        distance
      };
    });
    
    // 按距离过滤
    if (maxDistance) {
      filteredElectricians = filteredElectricians.filter(
        electrician => electrician.distance !== null && electrician.distance <= parseFloat(maxDistance)
      );
    }
    
    // 按距离排序
    if (sortBy === 'distance') {
      filteredElectricians.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return sortOrder === 'ASC' ? a.distance - b.distance : b.distance - a.distance;
      });
    }
  }
  
  res.json({
    success: true,
    data: formatPaginationResponse(filteredElectricians, page, pageLimit, count)
  });
});

/**
 * 获取电工详情
 */
const getElectricianDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const electrician = await Electrician.findByPk(id, {
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'avatar', 'city', 'province', 'created_at']
    }]
  });
  
  if (!electrician) {
    throw new CustomError('电工不存在', 404);
  }
  
  // 获取电工的评价统计
  const reviewStats = await Review.findOne({
    where: { electrician_id: id },
    attributes: [
      [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'total_reviews'],
      [Review.sequelize.fn('AVG', Review.sequelize.col('overall_rating')), 'avg_rating'],
      [Review.sequelize.fn('AVG', Review.sequelize.col('service_attitude')), 'avg_service'],
      [Review.sequelize.fn('AVG', Review.sequelize.col('technical_level')), 'avg_technical'],
      [Review.sequelize.fn('AVG', Review.sequelize.col('punctuality')), 'avg_punctuality']
    ],
    raw: true
  });
  
  // 获取最近的评价
  const recentReviews = await Review.findAll({
    where: {
      electrician_id: id,
      is_visible: true
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['nickname', 'avatar']
    }],
    order: [['created_at', 'DESC']],
    limit: 5
  });
  
  res.json({
    success: true,
    data: {
      electrician: electrician.toJSON(),
      reviewStats,
      recentReviews: recentReviews.map(review => review.toJSON())
    }
  });
});

/**
 * 更新电工信息
 */
const updateElectricianInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    specialties,
    serviceAreas,
    introduction,
    minOrderAmount,
    acceptEmergency
  } = req.body;
  
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  // 更新电工信息
  const updateData = {};
  if (specialties !== undefined) updateData.specialties = specialties;
  if (serviceAreas !== undefined) updateData.service_areas = serviceAreas;
  if (introduction !== undefined) updateData.introduction = introduction;
  if (minOrderAmount !== undefined) updateData.min_order_amount = minOrderAmount;
  if (acceptEmergency !== undefined) updateData.accept_emergency = acceptEmergency;
  
  await electrician.update(updateData);
  
  businessLogger('electrician_update', updateData, userId);
  
  res.json({
    success: true,
    message: '电工信息更新成功',
    data: {
      electrician: electrician.toJSON()
    }
  });
});

/**
 * 更新电工位置
 */
const updateLocation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    throw new CustomError('缺少位置信息', 400);
  }
  
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  await electrician.updateLocation(latitude, longitude);
  
  res.json({
    success: true,
    message: '位置更新成功'
  });
});

/**
 * 更新工作状态
 */
const updateWorkStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status } = req.body;
  
  if (!['available', 'busy', 'offline'].includes(status)) {
    throw new CustomError('无效的工作状态', 400);
  }
  
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  await electrician.updateWorkStatus(status);
  
  businessLogger('work_status_update', { status }, userId);
  
  res.json({
    success: true,
    message: '工作状态更新成功',
    data: {
      workStatus: status
    }
  });
});

/**
 * 获取电工统计信息
 */
const getElectricianStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  // 获取本月订单统计
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const monthlyStats = await Order.findOne({
    where: {
      electrician_id: electrician.id,
      created_at: {
        [Op.gte]: currentMonth
      }
    },
    attributes: [
      [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'monthly_orders'],
      [Order.sequelize.fn('SUM', Order.sequelize.col('final_amount')), 'monthly_income']
    ],
    raw: true
  });
  
  // 获取今日订单统计
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyStats = await Order.findOne({
    where: {
      electrician_id: electrician.id,
      created_at: {
        [Op.gte]: today
      }
    },
    attributes: [
      [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'daily_orders']
    ],
    raw: true
  });
  
  res.json({
    success: true,
    data: {
      totalOrders: electrician.total_orders,
      completedOrders: electrician.completed_orders,
      totalIncome: electrician.total_income,
      rating: electrician.rating,
      monthlyOrders: monthlyStats.monthly_orders || 0,
      monthlyIncome: monthlyStats.monthly_income || 0,
      dailyOrders: dailyStats.daily_orders || 0
    }
  });
});

/**
 * 搜索附近电工
 */
const searchNearbyElectricians = asyncHandler(async (req, res) => {
  const {
    latitude,
    longitude,
    radius = 10, // 默认10公里
    specialties,
    emergency = false
  } = req.query;
  
  if (!latitude || !longitude) {
    throw new CustomError('缺少位置信息', 400);
  }
  
  // 构建查询条件
  const whereConditions = {
    verification_status: 'approved',
    work_status: 'available',
    current_latitude: { [Op.not]: null },
    current_longitude: { [Op.not]: null }
  };
  
  if (emergency) {
    whereConditions.accept_emergency = true;
  }
  
  if (specialties) {
    const specialtyArray = Array.isArray(specialties) ? specialties : [specialties];
    whereConditions.specialties = {
      [Op.overlap]: specialtyArray
    };
  }
  
  const electricians = await Electrician.findAll({
    where: whereConditions,
    include: [{
      model: User,
      as: 'user',
      where: {
        user_type: 'electrician',
        status: 'active'
      },
      attributes: ['id', 'name', 'avatar', 'city']
    }]
  });
  
  // 计算距离并过滤
  const nearbyElectricians = electricians
    .map(electrician => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        electrician.current_latitude,
        electrician.current_longitude
      );
      
      return {
        ...electrician.toJSON(),
        distance
      };
    })
    .filter(electrician => electrician.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  
  res.json({
    success: true,
    data: nearbyElectricians
  });
});

module.exports = {
  getElectricians,
  getElectricianDetail,
  updateElectricianInfo,
  updateLocation,
  updateWorkStatus,
  getElectricianStats,
  searchNearbyElectricians
};