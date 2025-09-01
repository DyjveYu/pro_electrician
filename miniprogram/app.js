// app.js
const api = require('./utils/api');
const auth = require('./utils/auth');
const storage = require('./utils/storage');

App({
  globalData: {
    userInfo: null,
    userType: null, // 'user' | 'electrician'
    isLogin: false,
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    socketConnected: false,
    currentLocation: null
  },

  onLaunch() {
    console.log('小程序启动');
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取位置权限
    this.getLocationPermission();
  },

  onShow() {
    console.log('小程序显示');
    
    // 连接WebSocket (如果启用)
    if (this.globalData.isLogin) {
      this.connectSocket();
    }
  },

  onHide() {
    console.log('小程序隐藏');
    
    // 断开WebSocket连接
    this.disconnectSocket();
  },

  onError(error) {
    console.error('小程序错误:', error);
    
    // 错误上报
    wx.reportAnalytics('app_error', {
      error: error.toString(),
      timestamp: new Date().toISOString()
    });
  },

  // 获取系统信息
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 计算导航栏高度
    const { statusBarHeight, platform } = systemInfo;
    this.globalData.statusBarHeight = statusBarHeight;
    
    // iOS和Android导航栏高度不同
    if (platform === 'ios') {
      this.globalData.navBarHeight = 44;
    } else {
      this.globalData.navBarHeight = 48;
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const token = storage.getToken();
      if (!token) {
        return;
      }

      // 验证token有效性
      const result = await api.checkLoginStatus();
      if (result.success) {
        this.globalData.userInfo = result.data.user;
        this.globalData.userType = result.data.userType;
        this.globalData.isLogin = true;
        
        console.log('用户已登录:', this.globalData.userInfo);
      } else {
        // token无效，清除本地存储
        storage.clearAuth();
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      storage.clearAuth();
    }
  },

  // 获取位置权限
  getLocationPermission() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          // 已授权，获取当前位置
          this.getCurrentLocation();
        } else {
          // 未授权，引导用户授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.getCurrentLocation();
            },
            fail: () => {
              console.log('用户拒绝位置授权');
            }
          });
        }
      }
    });
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.currentLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        console.log('当前位置:', this.globalData.currentLocation);
      },
      fail: (error) => {
        console.error('获取位置失败:', error);
      }
    });
  },

  // 连接WebSocket
  connectSocket() {
    // 检查WebSocket是否启用
    const config = require('./utils/config');
    if (!config.WEBSOCKET.ENABLED) {
      console.log('WebSocket功能已禁用，跳过连接');
      return;
    }
    
    if (this.globalData.socketConnected) {
      return;
    }

    const token = storage.getToken();
    if (!token) {
      return;
    }

    wx.connectSocket({
      url: `ws://localhost:3000?token=${token}`,
      success: () => {
        console.log('WebSocket连接成功');
      },
      fail: (error) => {
        console.error('WebSocket连接失败:', error);
      }
    });

    wx.onSocketOpen(() => {
      this.globalData.socketConnected = true;
      
      // 发送认证信息
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: 'auth',
          userId: this.globalData.userInfo.id,
          userType: this.globalData.userType
        })
      });
    });

    wx.onSocketMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        this.handleSocketMessage(data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    });

    wx.onSocketClose(() => {
      this.globalData.socketConnected = false;
      console.log('WebSocket连接关闭');
      
      // 重连机制
      setTimeout(() => {
        if (this.globalData.isLogin) {
          this.connectSocket();
        }
      }, 5000);
    });

    wx.onSocketError((error) => {
      console.error('WebSocket错误:', error);
      this.globalData.socketConnected = false;
    });
  },

  // 断开WebSocket连接
  disconnectSocket() {
    if (this.globalData.socketConnected) {
      wx.closeSocket();
      this.globalData.socketConnected = false;
    }
  },

  // 处理WebSocket消息
  handleSocketMessage(data) {
    console.log('收到WebSocket消息:', data);
    
    switch (data.type) {
      case 'order_update':
        // 工单状态更新
        this.handleOrderUpdate(data.payload);
        break;
      case 'new_order':
        // 新工单通知（电工端）
        this.handleNewOrder(data.payload);
        break;
      case 'message':
        // 聊天消息
        this.handleMessage(data.payload);
        break;
      default:
        console.log('未知消息类型:', data.type);
    }
  },

  // 处理工单更新
  handleOrderUpdate(payload) {
    // 发送页面事件
    wx.eventBus = wx.eventBus || {};
    if (wx.eventBus.emit) {
      wx.eventBus.emit('orderUpdate', payload);
    }
    
    // 显示通知
    wx.showToast({
      title: payload.message || '工单状态已更新',
      icon: 'none'
    });
  },

  // 处理新工单通知
  handleNewOrder(payload) {
    if (this.globalData.userType === 'electrician') {
      wx.showModal({
        title: '新工单通知',
        content: `附近有新的维修工单，是否查看？`,
        confirmText: '查看',
        cancelText: '忽略',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/electrician/order-detail/order-detail?id=${payload.orderId}`
            });
          }
        }
      });
    }
  },

  // 处理聊天消息
  handleMessage(payload) {
    // 发送页面事件
    if (wx.eventBus && wx.eventBus.emit) {
      wx.eventBus.emit('newMessage', payload);
    }
    
    // 显示消息通知
    wx.showToast({
      title: '收到新消息',
      icon: 'none'
    });
  },

  // 用户登录
  login(userInfo, userType) {
    this.globalData.userInfo = userInfo;
    this.globalData.userType = userType;
    this.globalData.isLogin = true;
    
    // 连接WebSocket
    this.connectSocket();
  },

  // 用户登出
  logout() {
    this.globalData.userInfo = null;
    this.globalData.userType = null;
    this.globalData.isLogin = false;
    
    // 断开WebSocket连接
    this.disconnectSocket();
    
    // 清除本地存储
    storage.clearAuth();
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  }
});