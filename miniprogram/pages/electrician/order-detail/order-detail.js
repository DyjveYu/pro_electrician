// 电工端工单详情页面
const app = getApp();
const api = require('../../../utils/api');
const util = require('../../../utils/util');

Page({
  data: {
    orderId: '',
    loading: true,
    currentTab: 'order',
    
    // 工单信息
    orderInfo: {},
    
    // 客户历史订单
    customerOrders: [],
    
    // 维修进度
    repairProgress: [],
    
    // 用户位置
    userLocation: null
  },

  onLoad(options) {
    const orderId = options.id;
    if (!orderId) {
      wx.showToast({
        title: '工单ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ orderId });
    this.getUserLocation();
    this.loadOrderDetail();
  },

  onShow() {
    // 如果有状态变化，刷新详情
    if (this.data.needRefresh) {
      this.loadOrderDetail();
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.loadOrderDetail();
  },

  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: () => {
        console.log('获取位置失败');
      }
    });
  },

  // 加载工单详情
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });
      
      const res = await api.getOrderDetail({ orderId: this.data.orderId });
      
      if (res.success) {
        const orderInfo = this.formatOrderData(res.data.order);
        const customerOrders = res.data.customerOrders || [];
        const repairProgress = res.data.repairProgress || [];
        
        this.setData({
          orderInfo,
          customerOrders: customerOrders.map(order => this.formatCustomerOrder(order)),
          repairProgress: repairProgress.map(progress => this.formatProgress(progress)),
          loading: false
        });
        
        wx.stopPullDownRefresh();
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.error('加载工单详情失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 格式化工单数据
  formatOrderData(order) {
    const serviceTypes = {
      'electrical_repair': { name: '电路维修', icon: '⚡' },
      'appliance_repair': { name: '家电维修', icon: '🔧' },
      'lighting_install': { name: '灯具安装', icon: '💡' },
      'switch_repair': { name: '开关维修', icon: '🔌' },
      'other': { name: '其他服务', icon: '🛠' }
    };
    
    const statusMap = {
      'accepted': {
        text: '已接单',
        desc: '请及时联系客户确认服务时间',
        class: 'accepted',
        icon: 'icon-check',
        step: 1,
        progressPercent: 33
      },
      'in_progress': {
        text: '服务中',
        desc: '正在为客户提供服务',
        class: 'in_progress',
        icon: 'icon-tool',
        step: 2,
        progressPercent: 66
      },
      'completed': {
        text: '已完成',
        desc: '服务已完成，感谢您的辛苦工作',
        class: 'completed',
        icon: 'icon-success',
        step: 3,
        progressPercent: 100
      },
      'cancelled': {
        text: '已取消',
        desc: '工单已取消',
        class: 'cancelled',
        icon: 'icon-close',
        step: 0,
        progressPercent: 0
      }
    };
    
    const serviceType = serviceTypes[order.serviceType] || serviceTypes.other;
    const status = statusMap[order.status] || statusMap.accepted;
    
    return {
      ...order,
      serviceTypeName: serviceType.name,
      serviceTypeIcon: serviceType.icon,
      statusText: status.text,
      statusDesc: status.desc,
      statusClass: status.class,
      statusIcon: status.icon,
      step: status.step,
      progressPercent: status.progressPercent,
      showProgress: order.status !== 'cancelled',
      createTimeText: util.formatTime(order.createTime),
      appointmentTimeText: order.appointmentTime ? util.formatTime(order.appointmentTime) : '客户随时可接受服务',
      serviceStartTime: order.serviceStartTime ? util.formatTime(order.serviceStartTime) : '',
      serviceEndTime: order.serviceEndTime ? util.formatTime(order.serviceEndTime) : '',
      serviceDuration: this.calculateDuration(order.serviceStartTime, order.serviceEndTime),
      urgencyText: order.isUrgent ? '紧急' : '普通',
      distance: this.calculateDistance(order.latitude, order.longitude),
      customerRating: (order.customerRating || 5.0).toFixed(1),
      customerOrderCount: order.customerOrderCount || 0,
      hasElectricianRating: order.electricianRating ? true : false
    };
  },

  // 格式化客户历史订单
  formatCustomerOrder(order) {
    const serviceTypes = {
      'electrical_repair': { name: '电路维修' },
      'appliance_repair': { name: '家电维修' },
      'lighting_install': { name: '灯具安装' },
      'switch_repair': { name: '开关维修' },
      'other': { name: '其他服务' }
    };
    
    const serviceType = serviceTypes[order.serviceType] || serviceTypes.other;
    
    return {
      ...order,
      serviceTypeName: serviceType.name,
      createTimeText: util.formatTime(order.createTime),
      rating: (order.customerRating || 5.0).toFixed(1)
    };
  },

  // 格式化维修进度
  formatProgress(progress) {
    return {
      ...progress,
      timeText: util.formatTime(progress.createTime)
    };
  },

  // 计算距离
  calculateDistance(lat, lng) {
    if (!this.data.userLocation) return '未知距离';
    
    const distance = util.getDistance(
      this.data.userLocation.latitude,
      this.data.userLocation.longitude,
      lat,
      lng
    );
    
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  },

  // 计算服务时长
  calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end - start) / (1000 * 60)); // 分钟
    
    if (duration < 60) {
      return `${duration}分钟`;
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
    }
  },

  // Tab切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  // 查看位置
  onViewLocation() {
    const { latitude, longitude, address } = this.data.orderInfo;
    
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: '服务地址',
      address: address,
      fail: () => {
        wx.showToast({
          title: '打开地图失败',
          icon: 'none'
        });
      }
    });
  },

  // 预览图片
  onPreviewImage(e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;
    
    wx.previewImage({
      current,
      urls
    });
  },

  // 拨打客户电话
  onCallCustomer() {
    const phone = this.data.orderInfo.customerPhone;
    
    wx.showModal({
      title: '联系客户',
      content: `确定要拨打客户电话 ${phone} 吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: () => {
              wx.showToast({
                title: '拨打失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 发送消息给客户
  onChatCustomer() {
    const customerId = this.data.orderInfo.customerId;
    const orderId = this.data.orderId;
    
    wx.navigateTo({
      url: `/pages/common/chat/chat?userId=${customerId}&orderId=${orderId}&userType=electrician`
    });
  },

  // 开始服务
  async onStartService() {
    wx.showModal({
      title: '开始服务',
      content: '确定要开始为客户提供服务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            
            const result = await api.startService({ orderId: this.data.orderId });
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: '服务已开始',
                icon: 'success'
              });
              
              this.loadOrderDetail();
            } else {
              throw new Error(result.message);
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 更新进度
  onUpdateProgress() {
    wx.navigateTo({
      url: `/pages/electrician/update-progress/update-progress?orderId=${this.data.orderId}`
    });
  },

  // 完成服务
  onCompleteService() {
    wx.navigateTo({
      url: `/pages/electrician/complete-service/complete-service?orderId=${this.data.orderId}`
    });
  },

  // 评价客户
  onRateCustomer() {
    wx.navigateTo({
      url: `/pages/electrician/rate-customer/rate-customer?orderId=${this.data.orderId}`
    });
  },

  // 分享工单
  onShareAppMessage() {
    return {
      title: `工单详情 - ${this.data.orderInfo.serviceTypeName}`,
      path: `/pages/electrician/order-detail/order-detail?id=${this.data.orderId}`,
      imageUrl: '/images/share-order.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `工单详情 - ${this.data.orderInfo.serviceTypeName}`,
      query: `id=${this.data.orderId}`,
      imageUrl: '/images/share-order.png'
    };
  }
});