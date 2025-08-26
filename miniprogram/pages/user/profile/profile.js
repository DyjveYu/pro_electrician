// pages/user/profile/profile.js
const app = getApp()
const api = require('../../../utils/api')
const util = require('../../../utils/utils')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    userInfo: {},
    
    // 用户统计
    userStats: {
      totalOrders: 0,
      completedOrders: 0,
      availableCoupons: 0,
      points: 0
    },
    
    // 状态
    loading: false,
    showAvatarModal: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserData()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadUserData()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '电工上门服务',
      path: '/pages/index/index'
    }
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 检查登录状态
      const userInfo = app.globalData.userInfo
      if (!userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/auth/login/login'
          })
        }, 1500)
        return
      }
      
      // 设置用户信息
      this.setData({ userInfo })
      
      // 加载用户数据
      await this.loadUserData()
    } catch (error) {
      console.error('初始化页面失败:', error)
      this.showError('页面初始化失败')
    }
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    if (this.data.loading) {
      return
    }
    
    try {
      this.setData({ loading: true })
      
      // 并行加载用户信息和统计数据
      const [userResponse, statsResponse] = await Promise.all([
        api.getCurrentUser(),
        api.checkLoginStatus()
        // yutao update 2025-8-22
      ])
      
      // 更新用户信息
      if (userResponse.success) {
        const userInfo = userResponse.data
        this.setData({ userInfo })
        
        // 更新全局用户信息
        app.globalData.userInfo = userInfo
      }
      
      // 更新统计数据
      if (statsResponse.success) {
        this.setData({
          userStats: statsResponse.data
        })
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      this.showError('加载数据失败')
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  /**
   * 修改头像
   */
  onChangeAvatar() {
    this.setData({ showAvatarModal: true })
  },

  /**
   * 关闭头像选择弹窗
   */
  onCloseAvatarModal() {
    this.setData({ showAvatarModal: false })
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡
  },

  /**
   * 从相册选择头像
   */
  onChooseFromAlbum() {
    this.chooseImage('album')
  },

  /**
   * 拍照选择头像
   */
  onTakePhoto() {
    this.chooseImage('camera')
  },

  /**
   * 选择图片
   */
  chooseImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadAvatar(tempFilePath)
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        this.showError('选择图片失败')
      },
      complete: () => {
        this.onCloseAvatarModal()
      }
    })
  },

  /**
   * 上传头像
   */
  async uploadAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传中...' })
      
      const response = await api.uploadAvatar(filePath)
      
      if (response.success) {
        // 更新头像
        const userInfo = { ...this.data.userInfo }
        userInfo.avatar = response.data.url
        
        this.setData({ userInfo })
        app.globalData.userInfo = userInfo
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      } else {
        this.showError(response.message || '上传失败')
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      this.showError('上传失败，请稍后重试')
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/user/edit-profile/edit-profile'
    })
  },

  /**
   * 查看工单
   */
  onViewOrders(e) {
    const filter = e.currentTarget.dataset.filter || 'all'
    wx.navigateTo({
      url: `/pages/user/orders/orders?filter=${filter}`
    })
  },

  /**
   * 查看优惠券
   */
  onViewCoupons() {
    wx.navigateTo({
      url: '/pages/user/coupons/coupons'
    })
  },

  /**
   * 查看积分
   */
  onViewPoints() {
    wx.navigateTo({
      url: '/pages/user/points/points'
    })
  },

  /**
   * 立即下单
   */
  onCreateOrder() {
    wx.navigateTo({
      url: '/pages/user/create-order/create-order'
    })
  },

  /**
   * 地址管理
   */
  onViewAddresses() {
    wx.navigateTo({
      url: '/pages/user/addresses/addresses'
    })
  },

  /**
   * 收藏的电工
   */
  onViewFavorites() {
    wx.navigateTo({
      url: '/pages/user/favorites/favorites'
    })
  },

  /**
   * 我的评价
   */
  onViewEvaluations() {
    wx.navigateTo({
      url: '/pages/user/evaluations/evaluations'
    })
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.navigateTo({
      url: '/pages/common/service/service'
    })
  },

  /**
   * 帮助中心
   */
  onViewHelp() {
    wx.navigateTo({
      url: '/pages/common/help/help'
    })
  },

  /**
   * 账户设置
   */
  onViewSettings() {
    wx.navigateTo({
      url: '/pages/user/settings/settings'
    })
  },

  /**
   * 消息通知
   */
  onViewNotifications() {
    wx.navigateTo({
      url: '/pages/user/notifications/notifications'
    })
  },

  /**
   * 关于我们
   */
  onViewAbout() {
    wx.navigateTo({
      url: '/pages/common/about/about'
    })
  },

  /**
   * 申请成为电工
   */
  onApplyElectrician() {
    wx.navigateTo({
      url: '/pages/electrician/apply/apply'
    })
  },

  /**
   * 退出登录
   */
  async onLogout() {
    const result = await this.showConfirm('确认退出登录？', '退出后需要重新登录')
    if (!result.confirm) {
      return
    }
    
    try {
      wx.showLoading({ title: '退出中...' })
      
      // 调用退出登录API
      await api.logout()
      
      // 清除本地数据
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      
      // 清除全局数据
      app.globalData.userInfo = null
      app.globalData.token = ''
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      })
      
      // 跳转到登录页面
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/auth/login/login'
        })
      }, 1500)
    } catch (error) {
      console.error('退出登录失败:', error)
      
      // 即使API调用失败，也清除本地数据
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      app.globalData.userInfo = null
      app.globalData.token = ''
      
      wx.reLaunch({
        url: '/pages/auth/login/login'
      })
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 显示确认对话框
   */
  showConfirm(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmColor: '#1976d2',
        success: resolve,
        fail: () => resolve({ confirm: false })
      })
    })
  },

  /**
   * 显示错误信息
   */
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }
})