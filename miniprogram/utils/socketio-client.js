// utils/socketio-client.js
// Socket.IO客户端实现，兼容微信小程序

const config = require('./config');
const storage = require('./storage');

/**
 * Socket.IO客户端管理类
 * 实现Socket.IO协议的握手、心跳和消息格式
 */
class SocketIOClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.sessionId = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.heartbeatTimer = null;
    this.heartbeatInterval = 25000; // Socket.IO默认25秒
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.errorHandlers = [];
    this.messageId = 0;
    this.ackCallbacks = new Map();
  }

  /**
   * 连接Socket.IO服务器
   */
  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket.IO已连接');
      return;
    }

    const token = storage.getToken();
    if (!token) {
      console.warn('未找到认证token，无法连接Socket.IO');
      return;
    }

    // Socket.IO连接URL格式 - 使用HTTP端口，Socket.IO会自动处理协议升级
    const url = `ws://localhost:3000/socket.io/?EIO=4&transport=websocket&token=${token}`;
    
    console.log('正在连接Socket.IO:', url);

    this.socket = wx.connectSocket({
      url,
      protocols: ['websocket']
    });

    this.socket.onOpen(() => {
      console.log('Socket.IO WebSocket连接成功，开始握手');
      this.performHandshake();
    });

    this.socket.onMessage((res) => {
      this.handleRawMessage(res.data);
    });

    this.socket.onClose((res) => {
      console.log('Socket.IO连接关闭:', res);
      this.isConnected = false;
      this.sessionId = null;
      this.stopHeartbeat();
      this.notifyConnectionHandlers('disconnected');
      
      // 非主动关闭时尝试重连
      if (res.code !== 1000) {
        this.scheduleReconnect();
      }
    });

    this.socket.onError((error) => {
      console.error('Socket.IO连接错误:', error);
      this.isConnected = false;
      this.notifyErrorHandlers(error);
      this.scheduleReconnect();
    });
  }

  /**
   * 执行Socket.IO握手
   */
  performHandshake() {
    // Socket.IO握手：发送连接请求
    this.sendRaw('40'); // Engine.IO MESSAGE(4) + Socket.IO CONNECT(0)
  }

  /**
   * 处理原始消息
   */
  handleRawMessage(data) {
    if (typeof data !== 'string') {
      return;
    }

    console.log('收到Socket.IO原始消息:', data);

    // Engine.IO消息类型
    const engineType = parseInt(data.charAt(0));
    const payload = data.slice(1);

    switch (engineType) {
      case 0: // OPEN
        this.handleOpen(payload);
        break;
      case 1: // CLOSE
        this.handleClose();
        break;
      case 2: // PING
        this.handlePing();
        break;
      case 3: // PONG
        this.handlePong();
        break;
      case 4: // MESSAGE
        this.handleSocketIOMessage(payload);
        break;
      default:
        console.log('未知的Engine.IO消息类型:', engineType);
    }
  }

  /**
   * 处理OPEN消息
   */
  handleOpen(payload) {
    try {
      const data = JSON.parse(payload);
      this.sessionId = data.sid;
      this.heartbeatInterval = data.pingInterval || 25000;
      
      console.log('Socket.IO握手成功, sessionId:', this.sessionId);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // 发送认证信息
      this.emit('auth', { token: storage.getToken() });
      
      this.notifyConnectionHandlers('connected');
    } catch (error) {
      console.error('解析OPEN消息失败:', error);
    }
  }

  /**
   * 处理Socket.IO消息
   */
  handleSocketIOMessage(payload) {
    if (!payload) return;

    const socketType = parseInt(payload.charAt(0));
    const messageData = payload.slice(1);

    switch (socketType) {
      case 0: // CONNECT
        console.log('Socket.IO连接确认');
        break;
      case 1: // DISCONNECT
        console.log('Socket.IO断开连接');
        break;
      case 2: // EVENT
        this.handleEvent(messageData);
        break;
      case 3: // ACK
        this.handleAck(messageData);
        break;
      case 4: // CONNECT_ERROR
        console.error('Socket.IO连接错误:', messageData);
        break;
      default:
        console.log('未知的Socket.IO消息类型:', socketType);
    }
  }

  /**
   * 处理事件消息
   */
  handleEvent(data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const eventName = parsed[0];
        const eventData = parsed[1];
        
        console.log('收到Socket.IO事件:', eventName, eventData);
        
        // 调用注册的消息处理器
        if (this.messageHandlers.has(eventName)) {
          const handlers = this.messageHandlers.get(eventName);
          handlers.forEach(handler => {
            try {
              handler(eventData);
            } catch (error) {
              console.error('事件处理器执行失败:', error);
            }
          });
        }
        
        // 处理通用事件
        this.handleCommonEvent(eventName, eventData);
      }
    } catch (error) {
      console.error('解析事件消息失败:', error);
    }
  }

  /**
   * 处理ACK消息
   */
  handleAck(data) {
    try {
      // 解析ACK消息ID和数据
      const match = data.match(/^(\d+)(.*)$/);
      if (match) {
        const messageId = parseInt(match[1]);
        const ackData = match[2] ? JSON.parse(match[2]) : null;
        
        if (this.ackCallbacks.has(messageId)) {
          const callback = this.ackCallbacks.get(messageId);
          this.ackCallbacks.delete(messageId);
          callback(ackData);
        }
      }
    } catch (error) {
      console.error('处理ACK消息失败:', error);
    }
  }

  /**
   * 处理通用事件
   */
  handleCommonEvent(eventName, data) {
    switch (eventName) {
      case 'connected':
        console.log('服务器确认连接:', data);
        break;
      case 'order_status_changed':
        this.handleOrderStatusChanged(data);
        break;
      case 'new_order':
        this.handleNewOrder(data);
        break;
      case 'new_message':
        this.handleNewMessage(data);
        break;
      case 'electrician_location':
        this.handleElectricianLocation(data);
        break;
      case 'system_notification':
        this.handleSystemNotification(data);
        break;
      default:
        console.log('未处理的事件类型:', eventName);
    }
  }

  /**
   * 处理PING
   */
  handlePing() {
    // 响应PONG
    this.sendRaw('3');
  }

  /**
   * 处理PONG
   */
  handlePong() {
    // 心跳响应
  }

  /**
   * 处理CLOSE
   */
  handleClose() {
    console.log('收到服务器关闭消息');
    this.disconnect();
  }

  /**
   * 发送原始消息
   */
  sendRaw(data) {
    if (!this.socket) {
      console.warn('Socket未连接，无法发送原始消息');
      return false;
    }

    try {
      this.socket.send({ data });
      return true;
    } catch (error) {
      console.error('发送原始消息失败:', error);
      return false;
    }
  }

  /**
   * 发送Socket.IO事件
   */
  emit(eventName, data, callback) {
    if (!this.isConnected) {
      console.warn('Socket.IO未连接，无法发送事件');
      return false;
    }

    try {
      let message;
      if (callback) {
        // 带回调的消息
        const messageId = ++this.messageId;
        this.ackCallbacks.set(messageId, callback);
        message = `42${messageId}${JSON.stringify([eventName, data])}`;
      } else {
        // 普通事件消息
        message = `42${JSON.stringify([eventName, data])}`;
      }
      
      return this.sendRaw(message);
    } catch (error) {
      console.error('发送事件失败:', error);
      return false;
    }
  }

  /**
   * 监听事件
   */
  on(eventName, handler) {
    if (!this.messageHandlers.has(eventName)) {
      this.messageHandlers.set(eventName, []);
    }
    this.messageHandlers.get(eventName).push(handler);
  }

  /**
   * 移除事件监听
   */
  off(eventName, handler) {
    if (this.messageHandlers.has(eventName)) {
      const handlers = this.messageHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      // 发送断开连接消息
      this.sendRaw('41');
      
      this.socket.close({
        code: 1000,
        reason: '主动断开连接'
      });
      this.socket = null;
    }
    
    this.isConnected = false;
    this.sessionId = null;
    this.stopHeartbeat();
    this.clearReconnectTimer();
  }

  /**
   * 开始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        // 发送PING
        this.sendRaw('2');
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
      console.error('达到最大重连次数，停止重连');
      return;
    }

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      console.log(`尝试重连 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
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
   * 添加连接状态监听器
   */
  onConnection(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * 添加错误监听器
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * 通知连接状态监听器
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
   * 通知错误监听器
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

  // 以下是业务相关的事件处理方法
  
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
      icon: 'none',
      duration: 2000
    });

    // 触发页面刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.onOrderStatusChanged === 'function') {
      currentPage.onOrderStatusChanged(payload);
    }
  }

  /**
   * 处理新工单
   */
  handleNewOrder(payload) {
    const { orderId, orderInfo } = payload;
    
    // 显示通知
    wx.showToast({
      title: '收到新工单',
      icon: 'success',
      duration: 2000
    });

    // 触发页面刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.onNewOrder === 'function') {
      currentPage.onNewOrder(payload);
    }
  }

  /**
   * 处理新消息
   */
  handleNewMessage(payload) {
    const { from, content, type } = payload;
    
    // 显示通知
    wx.showToast({
      title: '收到新消息',
      icon: 'none',
      duration: 1500
    });

    // 触发页面刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.onNewMessage === 'function') {
      currentPage.onNewMessage(payload);
    }
  }

  /**
   * 处理电工位置更新
   */
  handleElectricianLocation(payload) {
    const { electricianId, latitude, longitude } = payload;
    
    // 触发页面刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof currentPage.onElectricianLocationUpdate === 'function') {
      currentPage.onElectricianLocationUpdate(payload);
    }
  }

  /**
   * 处理系统通知
   */
  handleSystemNotification(payload) {
    const { title, content, type } = payload;
    
    // 显示系统通知
    wx.showModal({
      title: title || '系统通知',
      content: content,
      showCancel: false
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // 兼容原有API的方法
  
  /**
   * 发送消息 (兼容原有API)
   */
  send(data) {
    if (typeof data === 'object' && data.type) {
      return this.emit(data.type, data.payload || data.data);
    } else {
      return this.emit('message', data);
    }
  }

  /**
   * 注册消息处理器 (兼容原有API)
   */
  addMessageHandler(type, handler) {
    this.on(type, handler);
  }

  /**
   * 移除消息处理器 (兼容原有API)
   */
  removeMessageHandler(type, handler) {
    this.off(type, handler);
  }

  /**
   * 加入房间
   */
  joinRoom(roomName) {
    this.emit('join-room', roomName);
  }

  /**
   * 离开房间
   */
  leaveRoom(roomName) {
    this.emit('leave-room', roomName);
  }

  /**
   * 更新位置 (电工)
   */
  updateLocation(latitude, longitude) {
    this.emit('update_location', { latitude, longitude });
  }

  /**
   * 发送心跳 (兼容原有API)
   */
  sendHeartbeat() {
    this.emit('heartbeat');
  }
}

// 创建全局实例
const socketIOClient = new SocketIOClient();

module.exports = socketIOClient;