const { User, Electrician, Order, Payment } = require('../models');
const { CustomError, asyncHandler } = require('../middleware/errorHandler');
const { businessLogger } = require('../middleware/logger');
const { generateUniqueId, calculateDistance, formatPagination, formatPaginationResponse } = require('../utils/helpers');
const { sendOrderNotification } = require('../services/socketService');
const { Op } = require('sequelize');

/**
 * 创建工单
 */
const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    title,
    description,
    faultType,
    priority = 'normal',
    contactName,
    contactPhone,
    serviceAddress,
    latitude,
    longitude,
    images = [],
    estimatedAmount,
    appointmentTime
  } = req.body;
  
  // 验证必填字段
  if (!title || !description || !contactName || !contactPhone || !serviceAddress) {
    throw new CustomError('请填写完整的工单信息', 400);
  }
  
  if (!latitude || !longitude) {
    throw new CustomError('请提供服务地址的位置信息', 400);
  }
  
  // 生成工单编号
  const orderNumber = generateUniqueId('ORD');
  
  // 创建工单
  const order = await Order.create({
    order_number: orderNumber,
    user_id: userId,
    title,
    description,
    fault_type: faultType,
    priority,
    status: 'pending',
    contact_name: contactName,
    contact_phone: contactPhone,
    service_address: serviceAddress,
    latitude,
    longitude,
    images,
    estimated_amount: estimatedAmount,
    appointment_time: appointmentTime
  });
  
  businessLogger('order_create', {
    orderId: order.id,
    orderNumber,
    faultType,
    priority
  }, userId);
  
  // 发送新工单通知给附近的电工
  try {
    await sendOrderNotification(order.toJSON());
  } catch (error) {
    console.error('发送工单通知失败:', error);
  }
  
  res.status(201).json({
    success: true,
    message: '工单创建成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 获取工单列表
 */
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    faultType,
    priority,
    userId: queryUserId,
    electricianId,
    startDate,
    endDate
  } = req.query;
  
  const { offset, pageLimit } = formatPagination(page, limit);
  
  // 构建查询条件
  const whereConditions = {};
  
  if (status) {
    whereConditions.status = status;
  }
  
  if (faultType) {
    whereConditions.fault_type = faultType;
  }
  
  if (priority) {
    whereConditions.priority = priority;
  }
  
  if (queryUserId) {
    whereConditions.user_id = queryUserId;
  }
  
  if (electricianId) {
    whereConditions.electrician_id = electricianId;
  }
  
  if (startDate && endDate) {
    whereConditions.created_at = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }
  
  const { count, rows: orders } = await Order.findAndCountAll({
    where: whereConditions,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'nickname', 'avatar', 'phone']
      },
      {
        model: Electrician,
        as: 'electrician',
        required: false,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'phone']
        }]
      }
    ],
    order: [['created_at', 'DESC']],
    offset,
    limit: pageLimit
  });
  
  res.json({
    success: true,
    data: formatPaginationResponse(orders.map(order => order.toJSON()), count, page, pageLimit)
  });
});

/**
 * 获取工单详情
 */
const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const order = await Order.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'nickname', 'avatar', 'phone']
      },
      {
        model: Electrician,
        as: 'electrician',
        required: false,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar', 'phone']
        }]
      },
      {
        model: Payment,
        as: 'payments',
        required: false
      }
    ]
  });
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  res.json({
    success: true,
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 电工接单
 */
const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // 获取电工信息
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  if (electrician.verification_status !== 'approved') {
    throw new CustomError('电工认证未通过，无法接单', 403);
  }
  
  if (electrician.work_status !== 'available') {
    throw new CustomError('当前状态无法接单', 400);
  }
  
  // 获取工单
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.status !== 'pending') {
    throw new CustomError('工单状态不允许接单', 400);
  }
  
  // 更新工单状态
  await order.updateStatus('accepted', {
    electrician_id: electrician.id,
    accepted_at: new Date()
  });
  
  // 更新电工状态为忙碌
  await electrician.updateWorkStatus('busy');
  
  businessLogger('order_accept', {
    orderId: order.id,
    electricianId: electrician.id
  }, userId);
  
  // 发送接单通知
  try {
    await sendOrderNotification({
      ...order.toJSON(),
      electrician_id: electrician.id,
      status: 'accepted'
    });
  } catch (error) {
    console.error('发送接单通知失败:', error);
  }
  
  res.json({
    success: true,
    message: '接单成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 确认工单（用户确认电工）
 */
const confirmOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.user_id !== userId) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  if (order.status !== 'accepted') {
    throw new CustomError('工单状态不允许确认', 400);
  }
  
  // 更新工单状态
  await order.updateStatus('confirmed', {
    confirmed_at: new Date()
  });
  
  businessLogger('order_confirm', {
    orderId: order.id
  }, userId);
  
  res.json({
    success: true,
    message: '工单确认成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 电工报价
 */
const submitQuote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { quotedAmount, quoteDescription } = req.body;
  
  if (!quotedAmount || quotedAmount <= 0) {
    throw new CustomError('请输入有效的报价金额', 400);
  }
  
  // 获取电工信息
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.electrician_id !== electrician.id) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  if (!['confirmed', 'quoted'].includes(order.status)) {
    throw new CustomError('工单状态不允许报价', 400);
  }
  
  // 更新工单报价信息
  await order.updateStatus('quoted', {
    quoted_amount: quotedAmount,
    quote_description: quoteDescription,
    quoted_at: new Date()
  });
  
  businessLogger('order_quote', {
    orderId: order.id,
    quotedAmount,
    quoteDescription
  }, userId);
  
  res.json({
    success: true,
    message: '报价提交成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 用户确认报价
 */
const confirmQuote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.user_id !== userId) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  if (order.status !== 'quoted') {
    throw new CustomError('工单状态不允许确认报价', 400);
  }
  
  // 更新工单状态
  await order.updateStatus('quote_confirmed', {
    quote_confirmed_at: new Date()
  });
  
  businessLogger('quote_confirm', {
    orderId: order.id
  }, userId);
  
  res.json({
    success: true,
    message: '报价确认成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 开始维修
 */
const startWork = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // 获取电工信息
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.electrician_id !== electrician.id) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  if (order.status !== 'quote_confirmed') {
    throw new CustomError('工单状态不允许开始维修', 400);
  }
  
  // 更新工单状态
  await order.updateStatus('in_progress', {
    work_started_at: new Date()
  });
  
  businessLogger('work_start', {
    orderId: order.id
  }, userId);
  
  res.json({
    success: true,
    message: '开始维修',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 完成维修
 */
const completeWork = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { workDescription, workImages = [], finalAmount } = req.body;
  
  if (!workDescription) {
    throw new CustomError('请填写维修内容描述', 400);
  }
  
  // 获取电工信息
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  if (order.electrician_id !== electrician.id) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  if (order.status !== 'in_progress') {
    throw new CustomError('工单状态不允许完成维修', 400);
  }
  
  // 更新工单状态
  await order.updateStatus('completed', {
    work_description: workDescription,
    work_images: workImages,
    final_amount: finalAmount || order.quoted_amount,
    completed_at: new Date()
  });
  
  // 更新电工统计
  await electrician.incrementOrderStats(finalAmount || order.quoted_amount);
  
  // 更新电工状态为可用
  await electrician.updateWorkStatus('available');
  
  businessLogger('work_complete', {
    orderId: order.id,
    finalAmount: finalAmount || order.quoted_amount
  }, userId);
  
  res.json({
    success: true,
    message: '维修完成',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 取消工单
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;
  
  if (!reason) {
    throw new CustomError('请填写取消原因', 400);
  }
  
  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new CustomError('工单不存在', 404);
  }
  
  // 检查权限
  const isUser = order.user_id === userId;
  const electrician = await Electrician.findOne({ where: { user_id: userId } });
  const isElectrician = electrician && order.electrician_id === electrician.id;
  
  if (!isUser && !isElectrician) {
    throw new CustomError('无权限操作此工单', 403);
  }
  
  // 检查工单状态
  if (['completed', 'paid', 'reviewed', 'cancelled'].includes(order.status)) {
    throw new CustomError('工单状态不允许取消', 400);
  }
  
  // 确定取消方
  const cancelledBy = isUser ? 'user' : 'electrician';
  
  // 更新工单状态
  await order.updateStatus('cancelled', {
    cancel_reason: reason,
    cancelled_by: cancelledBy,
    cancelled_at: new Date()
  });
  
  // 如果电工取消，恢复电工状态
  if (isElectrician && electrician) {
    await electrician.updateWorkStatus('available');
  }
  
  businessLogger('order_cancel', {
    orderId: order.id,
    reason,
    cancelledBy
  }, userId);
  
  res.json({
    success: true,
    message: '工单取消成功',
    data: {
      order: order.toJSON()
    }
  });
});

/**
 * 获取附近工单（电工端）
 */
const getNearbyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    latitude,
    longitude,
    radius = 10, // 默认10公里
    faultType,
    priority
  } = req.query;
  
  if (!latitude || !longitude) {
    throw new CustomError('缺少位置信息', 400);
  }
  
  // 获取电工信息
  const electrician = await Electrician.findOne({
    where: { user_id: userId }
  });
  
  if (!electrician) {
    throw new CustomError('电工信息不存在', 404);
  }
  
  // 构建查询条件
  const whereConditions = {
    status: 'pending',
    latitude: { [Op.not]: null },
    longitude: { [Op.not]: null }
  };
  
  if (faultType) {
    whereConditions.fault_type = faultType;
  }
  
  if (priority) {
    whereConditions.priority = priority;
  }
  
  // 如果电工设置了最低接单金额
  if (electrician.min_order_amount > 0) {
    whereConditions.estimated_amount = {
      [Op.gte]: electrician.min_order_amount
    };
  }
  
  const orders = await Order.findAll({
    where: whereConditions,
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'nickname', 'avatar']
    }],
    order: [['created_at', 'DESC']]
  });
  
  // 计算距离并过滤
  const nearbyOrders = orders
    .map(order => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        order.latitude,
        order.longitude
      );
      
      return {
        ...order.toJSON(),
        distance
      };
    })
    .filter(order => order.distance <= parseFloat(radius))
    .sort((a, b) => a.distance - b.distance);
  
  res.json({
    success: true,
    data: nearbyOrders
  });
});

module.exports = {
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
};