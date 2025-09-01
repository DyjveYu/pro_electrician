const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { User } = require('../models');
const { businessLogger } = require('../middleware/logger');

// 存储用户连接信息
const userConnections = new Map();
const electricianConnections = new Map();

/**
 * 初始化Socket.IO服务
 * @param {object} io Socket.IO实例
 */
const initializeSocketService = (io) => {
  // 认证中间件
  io.use(async (socket, next) => {
    try {
      console.log('Socket.IO连接握手:', {
        headers: socket.handshake.headers,
        query: socket.handshake.query,
        auth: socket.handshake.auth
      });
      
      // 支持从auth或查询参数中获取token
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        console.error('Socket.IO认证失败: 未提供认证令牌');
        return next(new Error('未提供认证令牌'));
      }

      // 验证JWT令牌
      const decoded = jwt.verify(token, jwtConfig.secret);
      console.log('Socket.IO令牌解析成功:', { userId: decoded.userId });
      
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        console.error('Socket.IO认证失败: 用户不存在', { userId: decoded.userId });
        return next(new Error('用户不存在'));
      }

      // 将用户信息附加到socket
      socket.userId = user.id;
      socket.userType = user.user_type;
      socket.openid = user.openid;
      
      console.log('Socket.IO认证成功:', { userId: user.id, userType: user.user_type });
      next();
    } catch (error) {
      console.error('Socket.IO认证失败:', error);
      next(new Error('认证失败: ' + error.message));
    }
  });

  // 连接处理
  io.on('connection', (socket) => {
    console.log(`🔗 用户连接: ${socket.userId} (${socket.userType})`, {
      socketId: socket.id,
      transport: socket.conn.transport.name,
      remoteAddress: socket.handshake.address
    });
    
    // 记录连接信息
    const connectionInfo = {
      socketId: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      connectedAt: new Date(),
      lastActivity: new Date()
    };
    
    // 根据用户类型存储连接
    if (socket.userType === 'electrician') {
      electricianConnections.set(socket.userId, connectionInfo);
    } else {
      userConnections.set(socket.userId, connectionInfo);
    }
    
    // 记录业务日志
    businessLogger('socket_connect', {
      userId: socket.userId,
      userType: socket.userType,
      socketId: socket.id
    }, socket.userId);

    // 加入用户房间
    socket.join(`user_${socket.userId}`);
    
    // 如果是电工，加入电工房间
    if (socket.userType === 'electrician') {
      socket.join('electricians');
    }

    // 处理位置更新（电工）
    socket.on('update_location', (data) => {
      if (socket.userType === 'electrician') {
        handleLocationUpdate(socket, data);
      }
    });

    // 处理工单相关事件
    socket.on('join_order_room', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`📋 用户 ${socket.userId} 加入工单房间: ${orderId}`);
    });

    socket.on('leave_order_room', (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`📋 用户 ${socket.userId} 离开工单房间: ${orderId}`);
    });

    // 处理消息发送
    socket.on('send_message', (data) => {
      handleSendMessage(socket, data);
    });

    // 处理认证事件
    socket.on('auth', (data) => {
      console.log(`🔑 用户认证事件: ${socket.userId}`);
      // 认证已在中间件中完成，这里只需确认认证成功
      socket.emit('auth_success', { userId: socket.userId, userType: socket.userType });
    });
    
    // 处理心跳
    socket.on('heartbeat', () => {
      updateLastActivity(socket.userId, socket.userType);
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      console.log(`❌ 用户断开连接: ${socket.userId} (${reason})`);
      
      // 移除连接信息
      if (socket.userType === 'electrician') {
        electricianConnections.delete(socket.userId);
      } else {
        userConnections.delete(socket.userId);
      }
      
      // 记录业务日志
      businessLogger('socket_disconnect', {
        userId: socket.userId,
        userType: socket.userType,
        reason: reason
      }, socket.userId);
    });

    // 发送连接成功消息
    socket.emit('connected', {
      message: '连接成功',
      userId: socket.userId,
      userType: socket.userType,
      timestamp: Date.now()
    });
  });

  // 定期清理无效连接
  setInterval(() => {
    cleanupInactiveConnections();
  }, 5 * 60 * 1000); // 每5分钟清理一次
};

/**
 * 处理位置更新
 * @param {object} socket Socket实例
 * @param {object} data 位置数据
 */
const handleLocationUpdate = async (socket, data) => {
  try {
    const { latitude, longitude } = data;
    
    if (!latitude || !longitude) {
      socket.emit('error', { message: '位置信息不完整' });
      return;
    }

    // 更新数据库中的位置信息
    const { Electrician } = require('../models');
    await Electrician.update(
      {
        current_latitude: latitude,
        current_longitude: longitude,
        location_updated_at: new Date()
      },
      { where: { user_id: socket.userId } }
    );

    // 更新连接信息中的位置
    const connection = electricianConnections.get(socket.userId);
    if (connection) {
      connection.latitude = latitude;
      connection.longitude = longitude;
      connection.lastActivity = new Date();
    }

    socket.emit('location_updated', { success: true });
    
    businessLogger('location_update', {
      latitude,
      longitude
    }, socket.userId);
    
  } catch (error) {
    console.error('位置更新失败:', error);
    socket.emit('error', { message: '位置更新失败' });
  }
};

/**
 * 处理消息发送
 * @param {object} socket Socket实例
 * @param {object} data 消息数据
 */
const handleSendMessage = (socket, data) => {
  const { type, target, content, orderId } = data;
  
  const message = {
    from: socket.userId,
    fromType: socket.userType,
    content,
    timestamp: Date.now(),
    type
  };

  switch (type) {
    case 'order_message':
      if (orderId) {
        socket.to(`order_${orderId}`).emit('new_message', message);
        businessLogger('order_message', { orderId, content }, socket.userId);
      }
      break;
      
    case 'private_message':
      if (target) {
        socket.to(`user_${target}`).emit('new_message', message);
        businessLogger('private_message', { target, content }, socket.userId);
      }
      break;
      
    default:
      socket.emit('error', { message: '不支持的消息类型' });
  }
};

/**
 * 更新最后活动时间
 * @param {number} userId 用户ID
 * @param {string} userType 用户类型
 */
const updateLastActivity = (userId, userType) => {
  const connections = userType === 'electrician' ? electricianConnections : userConnections;
  const connection = connections.get(userId);
  
  if (connection) {
    connection.lastActivity = new Date();
  }
};

/**
 * 清理无效连接
 */
const cleanupInactiveConnections = () => {
  const now = new Date();
  const timeout = 10 * 60 * 1000; // 10分钟超时
  
  // 清理用户连接
  for (const [userId, connection] of userConnections.entries()) {
    if (now - connection.lastActivity > timeout) {
      userConnections.delete(userId);
      console.log(`🧹 清理无效用户连接: ${userId}`);
    }
  }
  
  // 清理电工连接
  for (const [userId, connection] of electricianConnections.entries()) {
    if (now - connection.lastActivity > timeout) {
      electricianConnections.delete(userId);
      console.log(`🧹 清理无效电工连接: ${userId}`);
    }
  }
};

/**
 * 向指定用户发送消息
 * @param {object} io Socket.IO实例
 * @param {number} userId 用户ID
 * @param {string} event 事件名
 * @param {object} data 数据
 */
const sendToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

/**
 * 向所有电工发送消息
 * @param {object} io Socket.IO实例
 * @param {string} event 事件名
 * @param {object} data 数据
 */
const sendToAllElectricians = (io, event, data) => {
  io.to('electricians').emit(event, data);
};

/**
 * 向工单相关用户发送消息
 * @param {object} io Socket.IO实例
 * @param {number} orderId 工单ID
 * @param {string} event 事件名
 * @param {object} data 数据
 */
const sendToOrderRoom = (io, orderId, event, data) => {
  io.to(`order_${orderId}`).emit(event, data);
};

/**
 * 发送工单状态更新
 * @param {object} io Socket.IO实例
 * @param {object} order 工单信息
 * @param {string} status 新状态
 */
const sendOrderStatusUpdate = (io, order, status) => {
  const data = {
    orderId: order.id,
    orderNo: order.order_no,
    status: status,
    timestamp: Date.now(),
    order: order
  };
  
  // 发送给用户
  sendToUser(io, order.user_id, 'order_status_update', data);
  
  // 发送给电工（如果已分配）
  if (order.electrician_id) {
    sendToUser(io, order.electrician_id, 'order_status_update', data);
  }
  
  // 发送给工单房间
  sendToOrderRoom(io, order.id, 'order_status_update', data);
};

/**
 * 发送新工单通知给附近电工
 * @param {object} io Socket.IO实例
 * @param {object} order 工单信息
 * @param {Array} electricianIds 电工ID列表
 */
const sendNewOrderToElectricians = (io, order, electricianIds) => {
  const data = {
    orderId: order.id,
    orderNo: order.order_no,
    title: order.title,
    category: order.category,
    priority: order.priority,
    address: order.address,
    estimatedAmount: order.estimated_amount,
    timestamp: Date.now()
  };
  
  // 发送给指定电工
  electricianIds.forEach(electricianId => {
    sendToUser(io, electricianId, 'new_order_available', data);
  });
};

/**
 * 获取在线用户统计
 * @returns {object}
 */
const getOnlineStats = () => {
  return {
    totalUsers: userConnections.size,
    totalElectricians: electricianConnections.size,
    users: Array.from(userConnections.keys()),
    electricians: Array.from(electricianConnections.keys())
  };
};

/**
 * 检查用户是否在线
 * @param {number} userId 用户ID
 * @param {string} userType 用户类型
 * @returns {boolean}
 */
const isUserOnline = (userId, userType = 'user') => {
  const connections = userType === 'electrician' ? electricianConnections : userConnections;
  return connections.has(userId);
};

module.exports = {
  initializeSocketService,
  sendToUser,
  sendToAllElectricians,
  sendToOrderRoom,
  sendOrderStatusUpdate,
  sendNewOrderToElectricians,
  getOnlineStats,
  isUserOnline
};