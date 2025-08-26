// 电工端工单大厅页面
const app = getApp();
const api = require('../../../utils/api');
const util = require('../../../utils/util');

Page({
  data: {
    // 统计数据
    stats: {
      todayOrders: 0,
      monthIncome: '0',
      completedOrders: 0,
      rating: '5.0'
    },
    
    // 筛选和排序
    currentFilter: 'all',
    sortType: 'time', // time, distance, price
    sortText: '按时间排序',
    locationRange: 'all', // all, 1km, 3km, 5km
    locationText: '不限距离',
    
    // 工单列表
    orderList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 弹窗状态
    showSortModal: false,
    showLocationModal: false,
    
    // 用户位置
    userLocation: null
  },

  onLoad(options) {
    this.loadUserStats();
    this.getUserLocation();
    this.loadOrderList(true);
  },

  onShow() {
    // 刷新统计数据
    this.loadUserStats();
    // 如果有新的工单状态变化，刷新列表
    if (this.data.needRefresh) {
      this.loadOrderList(true);
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.onRefresh();
  },

  onReachBottom() {
    this.onLoadMore();
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
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载用户统计数据
  async loadUserStats() {
    try {
      const res = await api.getElectricianStats();
      if (res.success) {
        this.setData({
          stats: {
            todayOrders: res.data.todayOrders || 0,
            monthIncome: util.formatPrice(res.data.monthIncome || 0),
            completedOrders: res.data.completedOrders || 0,
            rating: (res.data.rating || 5.0).toFixed(1)
          }
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 加载工单列表
  async loadOrderList(reset = false) {
    if (this.data.loading) return;
    
    const page = reset ? 1 : this.data.page;
    
    this.setData({ loading: true });
    
    try {
      const params = {
        page,
        pageSize: this.data.pageSize,
        filter: this.data.currentFilter,
        sortType: this.data.sortType,
        locationRange: this.data.locationRange,
        userLocation: this.data.userLocation
      };
      
      const res = await api.getAvailableOrders(params);
      
      if (res.success) {
        const newOrders = res.data.orders.map(order => this.formatOrderData(order));
        
        this.setData({
          orderList: reset ? newOrders : [...this.data.orderList, ...newOrders],
          hasMore: res.data.hasMore,
          page: page + 1,
          loading: false
        });
        
        if (reset) {
          wx.stopPullDownRefresh();
        }
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.error('加载工单列表失败:', error);
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
      'pending': { text: '待接单', class: 'pending' },
      'urgent': { text: '紧急工单', class: 'urgent' }
    };
    
    const serviceType = serviceTypes[order.serviceType] || serviceTypes.other;
    const status = statusMap[order.status] || statusMap.pending;
    
    return {
      ...order,
      serviceTypeName: serviceType.name,
      serviceTypeIcon: serviceType.icon,
      statusText: status.text,
      statusClass: status.class,
      createTimeText: util.formatTime(order.createTime),
      distance: this.calculateDistance(order.latitude, order.longitude),
      isUrgent: order.isUrgent || false,
      canAccept: order.status === 'pending',
      canContact: order.allowContact || false,
      estimatedPrice: order.estimatedPrice || 0,
      customerRating: (order.customerRating || 5.0).toFixed(1)
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

  // 筛选切换
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.currentFilter) return;
    
    this.setData({ currentFilter: filter });
    this.loadOrderList(true);
  },

  // 排序切换
  onSortChange() {
    this.setData({ showSortModal: true });
  },

  // 位置筛选
  onLocationFilter() {
    this.setData({ showLocationModal: true });
  },

  // 选择排序方式
  onSelectSort(e) {
    const sortType = e.currentTarget.dataset.type;
    const sortTexts = {
      'time': '按时间排序',
      'distance': '按距离排序',
      'price': '按价格排序'
    };
    
    this.setData({
      sortType,
      sortText: sortTexts[sortType],
      showSortModal: false
    });
    
    this.loadOrderList(true);
  },

  // 选择位置范围
  onSelectLocation(e) {
    const locationRange = e.currentTarget.dataset.range;
    const locationTexts = {
      'all': '不限距离',
      '1km': '1公里内',
      '3km': '3公里内',
      '5km': '5公里内'
    };
    
    this.setData({
      locationRange,
      locationText: locationTexts[locationRange],
      showLocationModal: false
    });
    
    this.loadOrderList(true);
  },

  // 关闭弹窗
  onCloseSortModal() {
    this.setData({ showSortModal: false });
  },

  onCloseLocationModal() {
    this.setData({ showLocationModal: false });
  },

  // 接单
  async onAcceptOrder(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认接单',
      content: '确定要接受这个工单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '接单中...' });
            
            const result = await api.acceptOrder({ orderId });
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: '接单成功',
                icon: 'success'
              });
              
              // 刷新列表
              this.loadOrderList(true);
              
              // 跳转到工单详情
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/electrician/order-detail/order-detail?id=${orderId}`
                });
              }, 1500);
            } else {
              throw new Error(result.message);
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '接单失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 联系客户
  onContactCustomer(e) {
    const phone = e.currentTarget.dataset.phone;
    
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

  // 查看工单详情
  onOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/electrician/order-detail/order-detail?id=${orderId}`
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

  // 刷新
  onRefresh() {
    this.loadUserStats();
    this.loadOrderList(true);
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrderList();
    }
  },

  // 我的工单
  onMyOrders() {
    wx.navigateTo({
      url: '/pages/electrician/orders/orders'
    });
  },

  // 收益统计
  onEarnings() {
    wx.navigateTo({
      url: '/pages/electrician/earnings/earnings'
    });
  },

  // 个人中心
  onProfile() {
    wx.navigateTo({
      url: '/pages/electrician/profile/profile'
    });
  }
});