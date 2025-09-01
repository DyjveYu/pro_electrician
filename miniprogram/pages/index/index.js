// pages/index/index.js

const app = getApp();
const api = require('../../utils/api');
const auth = require('../../utils/auth');
const location = require('../../utils/location');
const storage = require('../../utils/storage');
const wsManager = require('../../utils/websocket');
const { formatTime, formatRelativeTime, formatDistance } = require('../../utils/utils');

Page({
  data: {
    // 用户信息
    userInfo: null,
    userType: 'user', // user | electrician
    
    // 位置信息
    currentLocation: null,
    currentAddress: '',
    
    // 开发者入口
    showDevEntry: true, // 开发阶段显示，生产环境可设为false
    
    // 服务分类
    serviceCategories: [
      { id: 1, name: '家电维修', icon: '🔌' },
      { id: 2, name: '线路检修', icon: '⚡' },
      { id: 3, name: '开关插座', icon: '🔘' },
      { id: 4, name: '灯具安装', icon: '💡' },
      { id: 5, name: '电路改造', icon: '🔧' },
      { id: 6, name: '故障排查', icon: '🔍' },
      { id: 7, name: '应急抢修', icon: '🚨' },
      { id: 8, name: '其他服务', icon: '⚙️' }
    ],
    
    // 附近电工
    nearbyElectricians: [],
    
    // 用户端工单
    myOrders: [],
    
    // 电工端数据
    isWorking: false,
    todayStats: {
      orders: 0,
      income: 0,
      rating: 0
    },
    availableOrders: [],
    myWorkOrders: [],
    
    // 加载状态
    loading: false,
    refreshing: false
  },

  onLoad(options) {
    console.log('首页加载', options);
    this.initPage();
  },

  onShow() {
    console.log('首页显示');
    this.refreshData();
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    console.log('触底加载');
    this.loadMoreData();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      this.setData({ loading: true });
      
      // 获取用户信息
      await this.getUserInfo();
      
      // 获取位置信息
      await this.getLocationInfo();
      
      // 加载数据
      await this.loadData();
      
      // 注册WebSocket消息处理
      this.registerWebSocketHandlers();
      
    } catch (error) {
      console.error('页面初始化失败:', error);
      this.showError('页面加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    const userInfo = auth.getUserInfo();
    const userType = auth.getUserType() || 'user';
    
    this.setData({
      userInfo,
      userType
    });
  },

  /**
   * 获取位置信息
   */
  async getLocationInfo() {
    try {
      // 检查位置权限
      const permission = await location.checkLocationPermission();
      if (permission !== 'authorized') {
        await location.requestLocationPermission();
      }
      
      // 获取当前位置
      const currentLocation = await location.getCurrentLocation();
      this.setData({ currentLocation });
      
      // 获取地址信息
      const address = await location.getAddress(
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      this.setData({
        currentAddress: address.formatted_address
      });
      
    } catch (error) {
      console.error('获取位置失败:', error);
      // 在开发环境下使用模拟数据
      if (this.data.userInfo) {
        this.setData({
          currentLocation: {
            latitude: 39.908823,
            longitude: 116.397470
          },
          currentAddress: '北京市东城区天安门广场'
        });
      } else {
        this.setData({
          currentAddress: '位置获取失败'
        });
      }
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    if (!auth.getLoginStatus()) {
      return;
    }
    
    const userType = this.data.userType;
    
    if (userType === 'user') {
      await this.loadUserData();
    } else if (userType === 'electrician') {
      await this.loadElectricianData();
    }
  },

  /**
   * 加载用户端数据
   */
  async loadUserData() {
    try {
      // 并行加载数据
      const [nearbyElectricians, myOrders] = await Promise.all([
        this.loadNearbyElectricians(),
        this.loadMyOrders()
      ]);
      
      this.setData({
        nearbyElectricians: this.formatElectricians(nearbyElectricians),
        myOrders: this.formatOrders(myOrders)
      });
      
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  },

  /**
   * 加载电工端数据
   */
  async loadElectricianData() {
    try {
      // 并行加载数据
      const [workStatus, todayStats, availableOrders, myWorkOrders] = await Promise.all([
        this.loadWorkStatus(),
        this.loadTodayStats(),
        this.loadAvailableOrders(),
        this.loadMyWorkOrders()
      ]);
      
      this.setData({
        isWorking: workStatus.isWorking,
        todayStats,
        availableOrders: this.formatOrders(availableOrders),
        myWorkOrders: this.formatOrders(myWorkOrders)
      });
      
    } catch (error) {
      console.error('加载电工数据失败:', error);
    }
  },

  /**
   * 加载附近电工
   */
  async loadNearbyElectricians() {
    try {
      const response = await api.searchNearbyElectricians({
        latitude: this.data.currentLocation?.latitude,
        longitude: this.data.currentLocation?.longitude,
        radius: 5000
      });
      
      return response.data || [];
    } catch (error) {
      console.error('加载附近电工失败:', error);
      // 在开发环境返回模拟数据
      return [
        {
          id: 1,
          name: '张师傅',
          avatar: '',
          rating: 4.8,
          distance: 1200,
          specialties: ['家电维修', '线路检修']
        },
        {
          id: 2,
          name: '李师傅',
          avatar: '',
          rating: 4.9,
          distance: 800,
          specialties: ['开关插座', '灯具安装']
        }
      ];
    }
  },

  /**
   * 加载我的工单
   */
  async loadMyOrders() {
    try {
      const response = await api.getOrders({
        page: 1,
        limit: 5
      });
      
      return response.data?.orders || [];
    } catch (error) {
      console.error('加载我的工单失败:', error);
      return [];
    }
  },

  /**
   * 加载工作状态
   */
  async loadWorkStatus() {
    try {
      const response = await api.getElectricianStats();
      return response.data || { isWorking: false };
    } catch (error) {
      console.error('加载工作状态失败:', error);
      return { isWorking: false };
    }
  },

  /**
   * 加载今日数据
   */
  async loadTodayStats() {
    try {
      const response = await api.getElectricianStats();
      return response.data || { orders: 0, income: 0, rating: 0 };
    } catch (error) {
      console.error('加载今日数据失败:', error);
      return { orders: 0, income: 0, rating: 0 };
    }
  },

  /**
   * 加载可接工单
   */
  async loadAvailableOrders() {
    try {
      const response = await api.getNearbyOrders({
        latitude: this.data.currentLocation?.latitude,
        longitude: this.data.currentLocation?.longitude,
        page: 1,
        limit: 10
      });
      
      return response.data?.orders || [];
    } catch (error) {
      console.error('加载可接工单失败:', error);
      return [];
    }
  },

  /**
   * 加载我的工作工单
   */
  async loadMyWorkOrders() {
    try {
      const response = await api.getOrders({
        page: 1,
        limit: 5
      });
      
      return response.data?.orders || [];
    } catch (error) {
      console.error('加载我的工作工单失败:', error);
      return [];
    }
  },

  /**
   * 格式化电工数据
   */
  formatElectricians(electricians) {
    return electricians.map(electrician => ({
      ...electrician,
      distanceText: electrician.distance ? formatDistance(electrician.distance) : ''
    }));
  },

  /**
   * 格式化工单数据
   */
  formatOrders(orders) {
    return orders.map(order => ({
      ...order,
      createTimeText: formatRelativeTime(order.createdAt),
      statusText: this.getOrderStatusText(order.status),
      distanceText: order.distance ? formatDistance(order.distance) : ''
    }));
  },

  /**
   * 获取工单状态文本
   */
  getOrderStatusText(status) {
    const statusMap = {
      pending: '待接单',
      accepted: '已接单',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      this.setData({ refreshing: true });
      
      // 重新获取用户信息
      await this.getUserInfo();
      
      // 重新加载数据
      await this.loadData();
      
    } catch (error) {
      console.error('刷新数据失败:', error);
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /**
   * 加载更多数据
   */
  async loadMoreData() {
    // 这里可以实现分页加载逻辑
    console.log('加载更多数据');
  },

  /**
   * 注册WebSocket消息处理
   */
  registerWebSocketHandlers() {
    // 监听工单状态变化
    wsManager.onMessage('order_status_changed', (data) => {
      this.handleOrderStatusChanged(data);
    });
    
    // 监听新工单
    wsManager.onMessage('new_order', (data) => {
      this.handleNewOrder(data);
    });
  },

  /**
   * 处理工单状态变化
   */
  handleOrderStatusChanged(data) {
    console.log('工单状态变化:', data);
    // 刷新相关数据
    this.refreshData();
  },

  /**
   * 处理新工单
   */
  handleNewOrder(data) {
    console.log('新工单:', data);
    // 如果是电工端，刷新可接工单
    if (this.data.userType === 'electrician') {
      this.loadAvailableOrders().then(orders => {
        this.setData({
          availableOrders: this.formatOrders(orders)
        });
      });
    }
  },

  /**
   * WebSocket消息处理
   */
  onWebSocketMessage(event, data) {
    console.log('收到WebSocket消息:', event, data);
    
    switch (event) {
      case 'orderStatusChanged':
        this.handleOrderStatusChanged(data);
        break;
      case 'newOrder':
        this.handleNewOrder(data);
        break;
    }
  },

  // ==================== 事件处理 ====================

  /**
   * 搜索点击
   */
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  /**
   * 位置点击
   */
  onLocationTap() {
    this.getLocationInfo();
  },

  /**
   * 切换到用户端
   */
  async switchToUser() {
    if (this.data.userType === 'user') return;
    
    try {
      await auth.switchUserType('user');
      this.setData({ userType: 'user' });
      await this.loadUserData();
    } catch (error) {
      console.error('切换用户类型失败:', error);
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      });
    }
  },

  /**
   * 切换到电工端
   */
  async switchToElectrician() {
    if (this.data.userType === 'electrician') return;
    
    try {
      await auth.switchUserType('electrician');
      this.setData({ userType: 'electrician' });
      await this.loadElectricianData();
    } catch (error) {
      console.error('切换用户类型失败:', error);
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      });
    }
  },

  /**
   * 服务分类点击
   */
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/order/create/create?category=${category.id}`
    });
  },

  /**
   * 快速下单点击
   */
  onQuickOrderTap() {
    if (!auth.requireLogin()) return;
    
    wx.navigateTo({
      url: '/pages/order/create/create?type=emergency'
    });
  },

  /**
   * 电工点击
   */
  onElectricianTap(e) {
    const electrician = e.currentTarget.dataset.electrician;
    wx.navigateTo({
      url: `/pages/electrician/detail/detail?id=${electrician.id}`
    });
  },

  /**
   * 更多电工点击
   */
  onMoreElectriciansTap() {
    wx.navigateTo({
      url: '/pages/electrician/list/list'
    });
  },

  /**
   * 工单点击
   */
  onOrderTap(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order/detail/detail?id=${order.id}`
    });
  },

  /**
   * 更多工单点击
   */
  onMoreOrdersTap() {
    wx.switchTab({
      url: '/pages/order/order'
    });
  },

  /**
   * 工作状态切换
   */
  async onWorkStatusChange(e) {
    const isWorking = e.detail.value;
    
    try {
      await api.electrician.updateWorkStatus({ isWorking });
      this.setData({ isWorking });
      
      wx.showToast({
        title: isWorking ? '已开始接单' : '已停止接单',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('更新工作状态失败:', error);
      // 恢复开关状态
      this.setData({ isWorking: !isWorking });
      wx.showToast({
        title: '状态更新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 可接工单点击
   */
  onAvailableOrderTap(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order/detail/detail?id=${order.id}&type=available`
    });
  },

  /**
   * 工作工单点击
   */
  onWorkOrderTap(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order/detail/detail?id=${order.id}&type=work`
    });
  },

  /**
   * 刷新工单点击
   */
  async onRefreshOrdersTap() {
    try {
      const orders = await this.loadAvailableOrders();
      this.setData({
        availableOrders: this.formatOrders(orders)
      });
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('刷新工单失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 更多工作工单点击
   */
  onMoreWorkOrdersTap() {
    wx.switchTab({
      url: '/pages/work/work'
    });
  },

  /**
   * 登录点击
   */
  onLoginTap() {
    wx.navigateTo({
      url: '/pages/auth/login/login'
    });
  },

  /**
   * 开发者测试入口
   */
  onDevTestTap() {
    wx.navigateTo({
      url: '/pages/test/api-test/api-test'
    });
  },

  /**
   * 显示错误信息
   */
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  }
});