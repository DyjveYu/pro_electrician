// utils/websocket.js
// WebSocket管理类 - 现在使用Socket.IO客户端

const socketIOClient = require('./socketio-client');

/**
 * WebSocket管理类 (兼容层)
 * 保持原有API，内部使用Socket.IO客户端
 */
class WebSocketManager {
  constructor() {
    // 使用Socket.IO客户端作为底层实现
    this.client = socketIOClient;
    
    // 保持兼容性的属性
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.errorHandlers = [];
  }

  // 兼容性属性getter
  get socket() {
    return this.client.socket;
  }

  get isConnected() {
    return this.client.isConnected;
  }

  get reconnectAttempts() {
    return this.client.reconnectAttempts;
  }

  /**
   * 连接WebSocket (代理到Socket.IO客户端)
   */
  connect() {
    // 设置连接状态监听器
    this.client.onConnection((status) => {
      this.notifyConnectionHandlers(status);
    });
    
    // 设置错误监听器
    this.client.onError((error) => {
      this.notifyErrorHandlers(error);
    });
    
    // 代理到Socket.IO客户端
    return this.client.connect();
  }

  /**
   * 断开WebSocket连接 (代理到Socket.IO客户端)
   */
  disconnect() {
    return this.client.disconnect();
  }

  /**
   * 发送消息 (代理到Socket.IO客户端)
   */
  send(data) {
    return this.client.send(data);
  }

  /**
   * 发送Socket.IO事件
   */
  emit(eventName, data, callback) {
    return this.client.emit(eventName, data, callback);
  }

  /**
   * 监听Socket.IO事件
   */
  on(eventName, handler) {
    return this.client.on(eventName, handler);
  }

  /**
   * 移除Socket.IO事件监听
   */
  off(eventName, handler) {
    return this.client.off(eventName, handler);
  }

  /**
   * 处理接收到的消息 (兼容性方法)
   */
  handleMessage(data) {
    console.log('收到WebSocket消息:', data);

    const { type, payload } = data;

    // 处理心跳响应
    if (type === 'pong') {
      return;
    }

    // 调用注册的消息处理器
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error('消息处理器执行失败:', error);
        }
      });
    }

    // 处理通用消息类型
    this.handleCommonMessage(type, payload);
  }

  /**
   * 添加消息处理器 (兼容性方法)
   */
  addMessageHandler(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    
    // 同时注册到Socket.IO客户端
    this.client.on(type, handler);
  }

  /**
   * 移除消息处理器 (兼容性方法)
   */
  removeMessageHandler(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    
    // 同时从Socket.IO客户端移除
    this.client.off(type, handler);
  }

  /**
   * 处理通用消息类型
   */
  handleCommonMessage(type, payload) {
    switch (type) {
      case 'order_status_changed':
        this.handleOrderStatusChanged(payload);
        break;
      case 'new_order':
        this.handleNewOrder(payload);
        break;
      case 'order_accepted':
        this.handleOrderAccepted(payload);
        break;
      case 'order_completed':
        this.handleOrderCompleted(payload);
        break;
      case 'new_message':
        this.handleNewMessage(payload);
        break;
      case 'electrician_location':
        this.handleElectricianLocation(payload);
        break;
      case 'system_notification':
        this.handleSystemNotification(payload);
        break;
      default:
        console.log('未处理的消息类型:', type);
    }
  }

  /**
   * 处理工单状态变更
   */
  handleOrderStatusChanged(payload) {
    const { orderId, status, message } = payload;
    
    // 更新本地缓存
    const cacheKey = `order_${orderId}`;
    const cachedOrder = storage.getCache(cacheKey);
    if (cachedOrder) {
      cachedOrder.status = status;
      storage.setCache(cacheKey, cachedOrder);
    }

    // 显示通知
    wx.showToast({
      title: message || '工单状态已更新',
      icon: 'none'
    });

    // 触发页面更新
    this.triggerPageUpdate('orderStatusChanged', { orderId, status });
  }

  /**
   * 处理新工单
   */
  handleNewOrder(payload) {
    const { order } = payload;
    
    // 显示通知
    wx.showToast({
      title: '有新的工单',
      icon: 'none'
    });

    // 触发页面更新
    this.triggerPageUpdate('newOrder', order);
  }

  /**
   * 处理工单被接受
   */
  handleOrderAccepted(payload) {
    const { orderId, electrician } = payload;
    
    // 显示通知
    wx.showToast({
      title: `电工${electrician.name}已接受您的工单`,
      icon: 'none'
    });

    // 触发页面更新
    this.triggerPageUpdate('orderAccepted', { orderId, electrician });
  }

  /**
   * 处理工单完成
   */
  handleOrderCompleted(payload) {
    const { orderId } = payload;
    
    // 显示通知
    wx.showToast({
      title: '工单已完成，请确认并评价',
      icon: 'none'
    });

    // 触发页面更新
    this.triggerPageUpdate('orderCompleted', { orderId });
  }

  /**
   * 处理新消息
   */
  handleNewMessage(payload) {
    const { message } = payload;
    
    // 触发页面更新
    this.triggerPageUpdate('newMessage', message);
  }

  /**
   * 处理电工位置更新
   */
  handleElectricianLocation(payload) {
    const { electricianId, location } = payload;
    
    // 触发页面更新
    this.triggerPageUpdate('electricianLocation', { electricianId, location });
  }

  /**
   * 处理系统通知
   */
  handleSystemNotification(payload) {
    const { title, content, type } = payload;
    
    // 显示通知
    wx.showModal({
      title: title || '系统通知',
      content,
      showCancel: false
    });

    // 触发页面更新
    this.triggerPageUpdate('systemNotification', { title, content, type });
  }

  /**
   * 触发页面更新
   */
  triggerPageUpdate(event, data) {
    // 获取当前页面栈
    const pages = getCurrentPages();
    if (pages.length === 0) return;

    // 通知当前页面
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.onWebSocketMessage === 'function') {
      currentPage.onWebSocketMessage(event, data);
    }

    // 通知所有页面
    pages.forEach(page => {
      if (page && typeof page.onWebSocketMessage === 'function') {
        page.onWebSocketMessage(event, data);
      }
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return this.client.getConnectionStatus();
  }

  /**
   * 加入房间
   */
  joinRoom(roomName) {
    return this.client.joinRoom(roomName);
  }

  /**
   * 离开房间
   */
  leaveRoom(roomName) {
    return this.client.leaveRoom(roomName);
  }

  /**
   * 更新位置 (电工)
   */
  updateLocation(latitude, longitude) {
    return this.client.updateLocation(latitude, longitude);
  }

  /**
   * 发送心跳 (兼容性方法)
   */
  sendHeartbeat() {
    return this.client.sendHeartbeat();
  }

  /**
   * 注册消息处理器
   */
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  /**
   * 移除消息处理器
   */
  offMessage(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 注册连接状态处理器
   */
  onConnection(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * 移除连接状态处理器
   */
  offConnection(handler) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * 注册错误处理器
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * 移除错误处理器
   */
  offError(handler) {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 通知连接状态处理器
   */
  notifyConnectionHandlers(status) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('连接状态处理器执行失败:', error);
      }
    });
  }

  /**
   * 通知错误处理器
   */
  notifyErrorHandlers(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (error) {
        console.error('错误处理器执行失败:', error);
      }
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * 重置重连计数
   */
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }

  /**
   * 设置重连参数
   */
  setReconnectConfig(maxAttempts, interval) {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectInterval = interval;
  }

  /**
   * 设置心跳间隔
   */
  setHeartbeatInterval(interval) {
    this.heartbeatInterval = interval;
    if (this.isConnected) {
      this.startHeartbeat();
    }
  }
}

// 创建WebSocket管理器实例
const wsManager = new WebSocketManager();

module.exports = wsManager;