// pages/user/order-detail/order-detail.js
const app = getApp()
const api = require('../../../utils/api')
const util = require('../../../utils/util')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 工单详情
    orderDetail: {},
    
    // 当前Tab
    currentTab: 'info',
    
    // 状态配置
    statusConfig: {
      'pending': {
        title: '等待接单',
        desc: '工单已发布，等待电工接单',
        emoji: '⏳'
      },
      'accepted': {
        title: '已接单',
        desc: '电工已接单，准备上门服务',
        emoji: '✅'
      },
      'confirmed': {
        title: '服务中',
        desc: '电工正在为您提供服务',
        emoji: '🔧'
      },
      'completed': {
        title: '待支付',
        desc: '服务已完成，请确认并支付',
        emoji: '💰'
      },
      'paid': {
        title: '已完成',
        desc: '服务已完成，感谢您的使用',
        emoji: '🎉'
      },
      'cancelled': {
        title: '已取消',
        desc: '工单已取消',
        emoji: '❌'
      }
    },
    
    // 进度步骤
    progressSteps: [
      { label: '下单', active: false, completed: false },
      { label: '接单', active: false, completed: false },
      { label: '服务', active: false, completed: false },
      { label: '完成', active: false, completed: false }
    ],
    
    // 操作按钮
    actionButtons: [],
    
    // 状态
    loading: false,
    orderId: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      
      // 设置默认Tab
      if (options.tab) {
        this.setData({ currentTab: options.tab })
      }
      
      // 初始化页面
      this.initPage()
    } else {
      this.showError('工单ID不存在')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新数据
    if (this.data.orderId) {
      this.loadOrderDetail()
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadOrderDetail()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: `工单详情 - ${this.data.orderDetail.serviceTypeName || '电工服务'}`,
      path: `/pages/user/order-detail/order-detail?id=${this.data.orderId}`
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
      
      // 加载工单详情
      await this.loadOrderDetail()
    } catch (error) {
      console.error('初始化页面失败:', error)
      this.showError('页面初始化失败')
    }
  },

  /**
   * 加载工单详情
   */
  async loadOrderDetail() {
    if (this.data.loading) {
      return
    }
    
    try {
      this.setData({ loading: true })
      
      const response = await api.getOrderDetail(this.data.orderId)
      
      if (response.success) {
        const orderDetail = this.formatOrderDetail(response.data)
        
        this.setData({
          orderDetail,
          progressSteps: this.getProgressSteps(orderDetail.status),
          actionButtons: this.getActionButtons(orderDetail)
        })
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: `工单详情 - ${orderDetail.orderNo}`
        })
      } else {
        this.showError(response.message || '获取工单详情失败')
      }
    } catch (error) {
      console.error('加载工单详情失败:', error)
      this.showError('网络错误，请稍后重试')
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  /**
   * 格式化工单详情数据
   */
  formatOrderDetail(order) {
    // 格式化时间
    const createTime = new Date(order.createTime)
    const createTimeText = util.formatTime(createTime)
    
    let acceptTimeText = ''
    let confirmTimeText = ''
    let completeTimeText = ''
    
    if (order.acceptTime) {
      acceptTimeText = util.formatTime(new Date(order.acceptTime))
    }
    if (order.confirmTime) {
      confirmTimeText = util.formatTime(new Date(order.confirmTime))
    }
    if (order.completeTime) {
      completeTimeText = util.formatTime(new Date(order.completeTime))
    }
    
    // 格式化服务类型名称
    const serviceTypeMap = {
      'repair': '电器维修',
      'installation': '电器安装',
      'maintenance': '电路维护',
      'emergency': '紧急抢修'
    }
    
    // 格式化图片
    const images = order.images ? order.images.split(',').filter(img => img) : []
    
    // 格式化故障标签
    const faultTags = order.faultTags ? order.faultTags.split(',').filter(tag => tag) : []
    
    // 格式化维修详情
    let repairDetail = null
    if (order.repairDetail) {
      repairDetail = {
        ...order.repairDetail,
        beforeImages: order.repairDetail.beforeImages ? order.repairDetail.beforeImages.split(',').filter(img => img) : [],
        afterImages: order.repairDetail.afterImages ? order.repairDetail.afterImages.split(',').filter(img => img) : []
      }
    }
    
    // 格式化评价
    let evaluation = null
    if (order.evaluation) {
      evaluation = {
        ...order.evaluation,
        createTimeText: util.formatTime(new Date(order.evaluation.createTime))
      }
    }
    
    // 格式化电工技能
    if (order.electrician && order.electrician.skills) {
      order.electrician.skills = order.electrician.skills.split(',').filter(skill => skill)
    }
    
    return {
      ...order,
      createTimeText,
      acceptTimeText,
      confirmTimeText,
      completeTimeText,
      serviceTypeName: serviceTypeMap[order.serviceType] || '电工服务',
      images,
      faultTags,
      repairDetail,
      evaluation
    }
  },

  /**
   * 获取进度步骤
   */
  getProgressSteps(status) {
    const steps = [
      { label: '下单', active: false, completed: false },
      { label: '接单', active: false, completed: false },
      { label: '服务', active: false, completed: false },
      { label: '完成', active: false, completed: false }
    ]
    
    switch (status) {
      case 'pending':
        steps[0].completed = true
        steps[1].active = true
        break
      case 'accepted':
        steps[0].completed = true
        steps[1].completed = true
        steps[2].active = true
        break
      case 'confirmed':
        steps[0].completed = true
        steps[1].completed = true
        steps[2].completed = true
        steps[3].active = true
        break
      case 'completed':
      case 'paid':
        steps.forEach(step => {
          step.completed = true
          step.active = false
        })
        break
    }
    
    return steps
  },

  /**
   * 获取操作按钮
   */
  getActionButtons(order) {
    const buttons = []
    
    switch (order.status) {
      case 'pending':
        buttons.push({
          text: '取消工单',
          type: 'danger',
          action: 'onCancelOrder'
        })
        break
        
      case 'accepted':
        buttons.push({
          text: '联系电工',
          type: 'success',
          action: 'onContactElectrician'
        })
        break
        
      case 'confirmed':
        buttons.push({
          text: '联系电工',
          type: 'success',
          action: 'onContactElectrician'
        })
        break
        
      case 'completed':
        buttons.push({
          text: '查看详情',
          type: 'secondary',
          action: 'onViewRepairDetail'
        })
        buttons.push({
          text: '立即支付',
          type: 'primary',
          action: 'onPayOrder'
        })
        break
        
      case 'paid':
        if (!order.evaluation) {
          buttons.push({
            text: '评价服务',
            type: 'primary',
            action: 'onEvaluateOrder'
          })
        }
        buttons.push({
          text: '再次下单',
          type: 'secondary',
          action: 'onCreateSimilarOrder'
        })
        break
    }
    
    return buttons
  },

  /**
   * Tab切换
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  /**
   * 图片点击事件
   */
  onImageTap(e) {
    const { images, current } = e.currentTarget.dataset
    wx.previewImage({
      urls: images,
      current: current
    })
  },

  /**
   * 查看位置
   */
  onViewLocation() {
    const { latitude, longitude, address } = this.data.orderDetail
    if (latitude && longitude) {
      wx.openLocation({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: '服务地址',
        address: address
      })
    } else {
      this.showError('位置信息不完整')
    }
  },

  /**
   * 拨打电话
   */
  onCallContact() {
    const phone = this.data.orderDetail.contactPhone
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      })
    } else {
      this.showError('联系电话不存在')
    }
  },

  /**
   * 联系电工
   */
  onContactElectrician() {
    const electrician = this.data.orderDetail.electrician
    if (!electrician) {
      this.showError('电工信息不存在')
      return
    }
    
    wx.navigateTo({
      url: `/pages/common/chat/chat?userId=${electrician.id}&userName=${electrician.name}&orderId=${this.data.orderId}`
    })
  },

  /**
   * 取消工单
   */
  async onCancelOrder() {
    const result = await this.showConfirm('确认取消工单？', '取消后将无法恢复')
    if (!result.confirm) {
      return
    }
    
    try {
      wx.showLoading({ title: '取消中...' })
      
      const response = await api.cancelOrder(this.data.orderId)
      
      if (response.success) {
        wx.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        // 刷新页面
        this.loadOrderDetail()
      } else {
        this.showError(response.message || '取消失败')
      }
    } catch (error) {
      console.error('取消工单失败:', error)
      this.showError('网络错误，请稍后重试')
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 查看维修详情
   */
  onViewRepairDetail() {
    this.setData({ currentTab: 'repair' })
  },

  /**
   * 支付工单
   */
  async onPayOrder() {
    try {
      wx.showLoading({ title: '发起支付...' })
      
      // 调用支付API
      const response = await api.payOrder(this.data.orderId)
      
      if (response.success) {
        const paymentData = response.data
        
        // 调用微信支付
        wx.requestPayment({
          timeStamp: paymentData.timeStamp,
          nonceStr: paymentData.nonceStr,
          package: paymentData.package,
          signType: paymentData.signType,
          paySign: paymentData.paySign,
          success: () => {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            })
            
            // 刷新页面
            this.loadOrderDetail()
          },
          fail: (error) => {
            console.error('支付失败:', error)
            if (error.errMsg !== 'requestPayment:fail cancel') {
              this.showError('支付失败，请稍后重试')
            }
          }
        })
      } else {
        this.showError(response.message || '发起支付失败')
      }
    } catch (error) {
      console.error('支付工单失败:', error)
      this.showError('网络错误，请稍后重试')
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 评价服务
   */
  onEvaluateOrder() {
    wx.navigateTo({
      url: `/pages/user/evaluate/evaluate?orderId=${this.data.orderId}`
    })
  },

  /**
   * 创建相似工单
   */
  onCreateSimilarOrder() {
    const order = this.data.orderDetail
    const params = {
      serviceType: order.serviceType,
      address: order.address,
      latitude: order.latitude,
      longitude: order.longitude,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      description: order.description
    }
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key] || '')}`)
      .join('&')
    
    wx.navigateTo({
      url: `/pages/user/create-order/create-order?${queryString}`
    })
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