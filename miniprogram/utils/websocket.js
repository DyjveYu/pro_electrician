// utils/websocket.js

const config = require('./config');
const storage = require('./storage');

/**
 * WebSocket管理类
 */
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.heartbeatTimer = null;
    this.heartbeatInterval = 30000;
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * 连接WebSocket
   */
  connect() {
    if (this.socket && this.isConnected) {
      console.log('WebSocket已连接');
      return;
    }

    const token = storage.getToken();
    if (!token) {
      console.warn('未找到认证token，无法连接WebSocket');
      return;
    }

    const url = `${config.WEBSOCKET_URL}?token=${token}`;
    
    console.log('正在连接WebSocket:', url);

    this.socket = wx.connectSocket({
      url,
      protocols: ['websocket']
    });

    this.socket.onOpen(() => {
      console.log('WebSocket连接成功');
         this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyConnectionHandlers('connected');
    });

    this.socket.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析失败:', error);
      }
    });

    this.socket.onClose((res) => {
      console.log('WebSocket连接关闭:', res);
      this.isConnected = false;
      this.stopHeartbeat();
      this.notifyConnectionHandlers('disconnected');
      
      // 非主动关闭时尝试重连
      if (res.code !== 1000) {
        this.scheduleReconnect();
      }
    });

    this.socket.onError((error) => {
      console.error('WebSocket连接错误:', error);
      this.isConnected = false;
      this.notifyErrorHandlers(error);
      this.scheduleReconnect();
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.close({
        code: 1000,
        reason: '主动断开连接'
      });
      this.socket = null;
    }
    
    this.isConnected = false;
    this.stopHeartbeat();
    this.clearReconnectTimer();
  }

  /**
   * 发送消息
   */
  send(data) {
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send({
        data: message
      });
      return true;
    } catch (error) {
      console.error('WebSocket发送消息失败:', error);
      return false;
    }
  }

  /**
   * 处理接收到的消息
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
   * 开始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }

    this.clearReconnectTimer();
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`第${this.reconnectAttempts}次重连WebSocket`);
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * 清除重连定时器
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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