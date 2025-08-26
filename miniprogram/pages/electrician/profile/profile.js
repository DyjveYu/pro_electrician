// 电工端个人中心页面
const app = getApp();
const api = require('../../../utils/api');
const util = require('../../../utils/util');

Page({
  data: {
    loading: true,
    showAvatarModal: false,
    
    // 电工信息
    electricianInfo: {
      id: '',
      name: '',
      phone: '',
      avatar: '',
      status: 'active', // active, busy, offline
      statusText: '在线接单',
      level: 1,
      levelText: '初级电工',
      rating: 5.0,
      serviceArea: '',
      idVerified: false,
      skillVerified: false
    },
    
    // 电工统计
    electricianStats: {
      totalOrders: 0,
      completedOrders: 0,
      totalEarnings: '0.00',
      monthEarnings: '0.00',
      acceptedOrders: 0,
      inProgressOrders: 0
    }
  },

  onLoad() {
    this.loadElectricianInfo();
    this.loadElectricianStats();
  },

  onShow() {
    // 如果有数据更新，刷新页面
    if (this.data.needRefresh) {
      this.loadElectricianInfo();
      this.loadElectricianStats();
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.loadElectricianInfo();
    this.loadElectricianStats();
  },

  // 加载电工信息
  async loadElectricianInfo() {
    try {
      const res = await api.getElectricianProfile();
      
      if (res.success) {
        const electricianInfo = this.formatElectricianInfo(res.data);
        this.setData({ electricianInfo });
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.error('加载电工信息失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 加载电工统计
  async loadElectricianStats() {
    try {
      const res = await api.getElectricianStats();
      
      if (res.success) {
        const electricianStats = this.formatElectricianStats(res.data);
        this.setData({ electricianStats });
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 格式化电工信息
  formatElectricianInfo(data) {
    const statusMap = {
      'active': '在线接单',
      'busy': '忙碌中',
      'offline': '离线'
    };
    
    const levelMap = {
      1: '初级电工',
      2: '中级电工',
      3: '高级电工',
      4: '专家电工',
      5: '金牌电工'
    };
    
    return {
      ...data,
      statusText: statusMap[data.status] || '未知状态',
      levelText: levelMap[data.level] || '初级电工',
      rating: (data.rating || 5.0).toFixed(1)
    };
  },

  // 格式化统计数据
  formatElectricianStats(data) {
    return {
      totalOrders: data.totalOrders || 0,
      completedOrders: data.completedOrders || 0,
      totalEarnings: (data.totalEarnings || 0).toFixed(2),
      monthEarnings: (data.monthEarnings || 0).toFixed(2),
      acceptedOrders: data.acceptedOrders || 0,
      inProgressOrders: data.inProgressOrders || 0
    };
  },

  // 选择头像
  onChooseAvatar() {
    this.setData({ showAvatarModal: true });
  },

  // 关闭头像选择弹窗
  onCloseAvatarModal() {
    this.setData({ showAvatarModal: false });
  },

  // 从相册选择头像
  onChooseFromAlbum() {
    this.chooseImage('album');
  },

  // 拍照选择头像
  onTakePhoto() {
    this.chooseImage('camera');
  },

  // 选择图片
  chooseImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadAvatar(tempFilePath);
      },
      complete: () => {
        this.setData({ showAvatarModal: false });
      }
    });
  },

  // 上传头像
  async uploadAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });
      
      const uploadRes = await api.uploadFile({
        filePath,
        name: 'avatar',
        formData: {
          type: 'avatar'
        }
      });
      
      if (uploadRes.success) {
        const updateRes = await api.updateElectricianProfile({
          avatar: uploadRes.data.url
        });
        
        if (updateRes.success) {
          this.setData({
            'electricianInfo.avatar': uploadRes.data.url
          });
          
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
        } else {
          throw new Error(updateRes.message);
        }
      } else {
        throw new Error(uploadRes.message);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 查看工单
  onViewOrders(e) {
    const status = e.currentTarget.dataset.status || 'all';
    wx.navigateTo({
      url: `/pages/electrician/orders/orders?status=${status}`
    });
  },

  // 查看收益统计
  onViewEarnings() {
    wx.navigateTo({
      url: '/pages/electrician/earnings/earnings'
    });
  },

  // 查看工单大厅
  onViewDashboard() {
    wx.switchTab({
      url: '/pages/electrician/dashboard/dashboard'
    });
  },

  // 客户管理
  onViewCustomers() {
    wx.navigateTo({
      url: '/pages/electrician/customers/customers'
    });
  },

  // 服务日程
  onViewSchedule() {
    wx.navigateTo({
      url: '/pages/electrician/schedule/schedule'
    });
  },

  // 管理服务项目
  onManageServices() {
    wx.navigateTo({
      url: '/pages/electrician/services/services'
    });
  },

  // 管理服务区域
  onManageArea() {
    wx.navigateTo({
      url: '/pages/electrician/service-area/service-area'
    });
  },

  // 价格设置
  onManagePrice() {
    wx.navigateTo({
      url: '/pages/electrician/pricing/pricing'
    });
  },

  // 查看客户评价
  onViewReviews() {
    wx.navigateTo({
      url: '/pages/electrician/reviews/reviews'
    });
  },

  // 认证中心
  onViewCertification() {
    wx.navigateTo({
      url: '/pages/electrician/certification/certification'
    });
  },

  // 联系客服
  onContactSupport() {
    wx.navigateTo({
      url: '/pages/common/customer-service/customer-service?userType=electrician'
    });
  },

  // 帮助中心
  onViewHelp() {
    wx.navigateTo({
      url: '/pages/common/help/help?userType=electrician'
    });
  },

  // 服务协议
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/common/agreement/agreement?type=electrician'
    });
  },

  // 账户设置
  onAccountSettings() {
    wx.navigateTo({
      url: '/pages/electrician/account-settings/account-settings'
    });
  },

  // 消息通知设置
  onNotificationSettings() {
    wx.navigateTo({
      url: '/pages/common/notification-settings/notification-settings'
    });
  },

  // 隐私设置
  onPrivacySettings() {
    wx.navigateTo({
      url: '/pages/common/privacy-settings/privacy-settings'
    });
  },

  // 关于我们
  onAbout() {
    wx.navigateTo({
      url: '/pages/common/about/about'
    });
  },

  // 切换到用户端
  onSwitchToUser() {
    wx.showModal({
      title: '切换角色',
      content: '确定要切换到用户端吗？',
      success: (res) => {
        if (res.confirm) {
          // 切换到用户端首页
          wx.reLaunch({
            url: '/pages/user/index/index'
          });
        }
      }
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '退出中...' });
            
            await api.logout();
            
            // 清除本地存储
            wx.clearStorageSync();
            
            wx.hideLoading();
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            });
            
            // 跳转到登录页
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/auth/login/login'
              });
            }, 1500);
          } catch (error) {
            wx.hideLoading();
            console.error('退出登录失败:', error);
            wx.showToast({
              title: '退出失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '专业电工服务，快速上门维修',
      path: '/pages/user/index/index',
      imageUrl: '/images/share-electrician.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '专业电工服务，快速上门维修',
      imageUrl: '/images/share-electrician.png'
    };
  }
});