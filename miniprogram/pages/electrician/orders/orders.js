// 电工端工单列表页面
const app = getApp();
const api = require('../../../utils/api');
const util = require('../../../utils/util');

Page({
  data: {
    // 筛选状态
    currentFilter: 'all',
    filterText: '',
    emptyTip: '',
    
    // 工单列表
    orderList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 弹窗状态
    showProgressModal: false,
    showCompleteModal: false,
    
    // 更新进度
    currentOrderId: '',
    progressText: '',
    
    // 完成服务
    actualPrice: '',
    repairSummary: '',
    afterImages: [],
    
    // 用户位置
    userLocation: null
  },

  onLoad(options) {
    const filter = options.filter || 'all';
    this.setData({ currentFilter: filter });
    this.updateFilterText();
    this.getUserLocation();
    this.loadOrderList(true);
  },

  onShow() {
    // 如果有工单状态变化，刷新列表
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
        console.log('获取位置失败');
      }
    });
  },

  // 更新筛选文本
  updateFilterText() {
    const filterTexts = {
      'all': { text: '', tip: '暂无工单，去工单大厅接单吧' },
      'accepted': { text: '已接单', tip: '暂无已接单工单' },
      'in_progress': { text: '进行中', tip: '暂无进行中工单' },
      'completed': { text: '已完成', tip: '暂无已完成工单' },
      'cancelled': { text: '已取消', tip: '暂无已取消工单' }
    };
    
    const current = filterTexts[this.data.currentFilter];
    this.setData({
      filterText: current.text,
      emptyTip: current.tip
    });
  },

  // 筛选切换
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.currentFilter) return;
    
    this.setData({ currentFilter: filter });
    this.updateFilterText();
    this.loadOrderList(true);
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
        status: this.data.currentFilter === 'all' ? '' : this.data.currentFilter,
        userLocation: this.data.userLocation
      };
      
      const res = await api.getElectricianOrders(params);
      
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
      'accepted': { text: '已接单', class: 'accepted' },
      'in_progress': { text: '进行中', class: 'in_progress' },
      'completed': { text: '已完成', class: 'completed' },
      'cancelled': { text: '已取消', class: 'cancelled' }
    };
    
    const serviceType = serviceTypes[order.serviceType] || serviceTypes.other;
    const status = statusMap[order.status] || statusMap.accepted;
    
    return {
      ...order,
      serviceTypeName: serviceType.name,
      serviceTypeIcon: serviceType.icon,
      statusText: status.text,
      statusClass: status.class,
      createTimeText: util.formatTime(order.createTime),
      serviceTimeText: order.serviceTime ? util.formatTime(order.serviceTime) : '',
      distance: this.calculateDistance(order.latitude, order.longitude),
      isUrgent: order.isUrgent || false,
      hasRating: order.electricianRating ? true : false
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

  // 开始服务
  async onStartService(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '开始服务',
      content: '确定要开始为客户提供服务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            
            const result = await api.startService({ orderId });
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: '服务已开始',
                icon: 'success'
              });
              
              this.loadOrderList(true);
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
  onUpdateProgress(e) {
    const orderId = e.currentTarget.dataset.id;
    this.setData({
      currentOrderId: orderId,
      progressText: '',
      showProgressModal: true
    });
  },

  // 进度输入
  onProgressInput(e) {
    this.setData({ progressText: e.detail.value });
  },

  // 确认更新进度
  async onConfirmProgress() {
    if (!this.data.progressText.trim()) {
      wx.showToast({
        title: '请输入进度描述',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '更新中...' });
      
      const res = await api.updateRepairProgress({
        orderId: this.data.currentOrderId,
        progress: this.data.progressText.trim()
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '进度已更新',
          icon: 'success'
        });
        
        this.setData({ showProgressModal: false });
        this.loadOrderList(true);
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none'
      });
    }
  },

  // 完成服务
  onCompleteService(e) {
    const orderId = e.currentTarget.dataset.id;
    const order = this.data.orderList.find(item => item.id === orderId);
    
    this.setData({
      currentOrderId: orderId,
      actualPrice: order ? order.estimatedPrice.toString() : '',
      repairSummary: '',
      afterImages: [],
      showCompleteModal: true
    });
  },

  // 实际费用输入
  onActualPriceInput(e) {
    this.setData({ actualPrice: e.detail.value });
  },

  // 维修总结输入
  onRepairSummaryInput(e) {
    this.setData({ repairSummary: e.detail.value });
  },

  // 上传维修后照片
  onUploadAfterImage() {
    wx.chooseImage({
      count: 3 - this.data.afterImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        try {
          wx.showLoading({ title: '上传中...' });
          
          const uploadPromises = res.tempFilePaths.map(filePath => 
            api.uploadImage({ filePath, type: 'repair_after' })
          );
          
          const results = await Promise.all(uploadPromises);
          const newImages = results.map(result => result.data.url);
          
          this.setData({
            afterImages: [...this.data.afterImages, ...newImages]
          });
          
          wx.hideLoading();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 删除维修后照片
  onDeleteAfterImage(e) {
    const index = e.currentTarget.dataset.index;
    const afterImages = [...this.data.afterImages];
    afterImages.splice(index, 1);
    this.setData({ afterImages });
  },

  // 确认完成服务
  async onConfirmComplete() {
    if (!this.data.actualPrice) {
      wx.showToast({
        title: '请输入实际费用',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.repairSummary.trim()) {
      wx.showToast({
        title: '请输入维修总结',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '完成中...' });
      
      const res = await api.completeService({
        orderId: this.data.currentOrderId,
        actualPrice: parseFloat(this.data.actualPrice),
        repairSummary: this.data.repairSummary.trim(),
        afterImages: this.data.afterImages
      });
      
      wx.hideLoading();
      
      if (res.success) {
        wx.showToast({
          title: '服务已完成',
          icon: 'success'
        });
        
        this.setData({ showCompleteModal: false });
        this.loadOrderList(true);
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
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

  // 查看维修报告
  onViewReport(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/common/repair-report/repair-report?orderId=${orderId}`
    });
  },

  // 评价客户
  onRateCustomer(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/electrician/rate-customer/rate-customer?orderId=${orderId}`
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

  // 关闭弹窗
  onCloseProgressModal() {
    this.setData({ showProgressModal: false });
  },

  onCloseCompleteModal() {
    this.setData({ showCompleteModal: false });
  },

  // 刷新
  onRefresh() {
    this.loadOrderList(true);
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrderList();
    }
  },

  // 去工单大厅
  onGoToDashboard() {
    wx.navigateTo({
      url: '/pages/electrician/dashboard/dashboard'
    });
  }
});