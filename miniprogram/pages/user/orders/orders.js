// pages/user/orders/orders.js
const app = getApp()
const api = require('../../../utils/api')
const util = require('../../../utils/utils')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 筛选相关
    currentFilter: 'all', // 当前筛选条件
    filterOptions: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待接单' },
      { key: 'accepted', name: '已接单' },
      { key: 'confirmed', name: '进行中' },
      { key: 'completed', name: '待支付' },
      { key: 'paid', name: '已完成' },
      { key: 'cancelled', name: '已取消' }
    ],
    
    // 工单列表
    orderList: [],
    
    // 分页相关
    page: 1,
    pageSize: 10,
    hasMore: true,
    
    // 状态相关
    loading: false,
    loadingMore: false,
    refreshing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从参数中获取筛选条件
    if (options.filter) {
      this.setData({
        currentFilter: options.filter
      })
    }
    
    // 初始化页面
    this.initPage()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新数据
    this.refreshOrderList()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshOrderList()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMoreOrders()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '我的工单',
      path: '/pages/user/orders/orders'
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
      
      // 加载工单列表
      await this.loadOrderList()
    } catch (error) {
      console.error('初始化页面失败:', error)
      this.showError('页面初始化失败')
    }
  },

  /**
   * 加载工单列表
   */
  async loadOrderList(isLoadMore = false) {
    if (this.data.loading || (isLoadMore && this.data.loadingMore)) {
      return
    }
    
    try {
      // 设置加载状态
      if (isLoadMore) {
        this.setData({ loadingMore: true })
      } else {
        this.setData({ loading: true, page: 1 })
      }
      
      // 构建请求参数
      const params = {
        page: isLoadMore ? this.data.page : 1,
        pageSize: this.data.pageSize,
        status: this.data.currentFilter === 'all' ? '' : this.data.currentFilter
      }
      
      // 调用API
      const response = await api.getOrders(params)
      
      if (response.success) {
        const newOrders = this.formatOrderList(response.data.orders || [])
        
        // 更新数据
        if (isLoadMore) {
          this.setData({
            orderList: [...this.data.orderList, ...newOrders],
            page: this.data.page + 1,
            hasMore: newOrders.length >= this.data.pageSize
          })
        } else {
          this.setData({
            orderList: newOrders,
            page: 2,
            hasMore: newOrders.length >= this.data.pageSize
          })
        }
      } else {
        this.showError(response.message || '获取工单列表失败')
      }
    } catch (error) {
      console.error('加载工单列表失败:', error)
      this.showError('网络错误，请稍后重试')
    } finally {
      // 清除加载状态
      this.setData({
        loading: false,
        loadingMore: false,
        refreshing: false
      })
      
      // 停止下拉刷新
      wx.stopPullDownRefresh()
    }
  },

  /**
   * 格式化工单列表数据
   */
  formatOrderList(orders) {
    return orders.map(order => {
      // 格式化时间
      const createTime = new Date(order.createTime)
      const createTimeText = util.formatTime(createTime)
      
      // 格式化状态文本
      const statusTextMap = {
        'pending': '待接单',
        'accepted': '已接单',
        'confirmed': '进行中',
        'completed': '待支付',
        'paid': '已完成',
        'cancelled': '已取消'
      }
      
      // 格式化服务类型名称
      const serviceTypeMap = {
        'repair': '电器维修',
        'installation': '电器安装',
        'maintenance': '电路维护',
        'emergency': '紧急抢修'
      }
      
      return {
        ...order,
        createTimeText,
        statusText: statusTextMap[order.status] || order.status,
        serviceTypeName: serviceTypeMap[order.serviceType] || '电工服务',
        images: order.images ? order.images.split(',').filter(img => img) : [],
        hasEvaluated: order.evaluation && order.evaluation.id
      }
    })
  },

  /**
   * 刷新工单列表
   */
  async refreshOrderList() {
    this.setData({ refreshing: true })
    await this.loadOrderList()
  },

  /**
   * 加载更多工单
   */
  async loadMoreOrders() {
    if (!this.data.hasMore) {
      return
    }
    await this.loadOrderList(true)
  },

  /**
   * 筛选条件点击事件
   */
  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.currentFilter) {
      return
    }
    
    this.setData({
      currentFilter: filter
    })
    
    // 重新加载数据
    this.loadOrderList()
  },

  /**
   * 工单点击事件
   */
  onOrderTap(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: `/pages/user/order-detail/order-detail?id=${order.id}`
    })
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
   * 联系电工
   */
  onContactElectrician(e) {
    const electrician = e.currentTarget.dataset.electrician
    if (!electrician) {
      this.showError('电工信息不存在')
      return
    }
    
    wx.navigateTo({
      url: `/pages/common/chat/chat?userId=${electrician.id}&userName=${electrician.name}`
    })
  },

  /**
   * 取消工单
   */
  async onCancelOrder(e) {
    const order = e.currentTarget.dataset.order
    
    const result = await this.showConfirm('确认取消工单？', '取消后将无法恢复')
    if (!result.confirm) {
      return
    }
    
    try {
      wx.showLoading({ title: '取消中...' })
      
      const response = await api.cancelOrder(order.id)
      
      if (response.success) {
        wx.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        // 刷新列表
        this.refreshOrderList()
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
  onViewRepairDetail(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: `/pages/user/order-detail/order-detail?id=${order.id}&tab=repair`
    })
  },

  /**
   * 支付工单
   */
  async onPayOrder(e) {
    const order = e.currentTarget.dataset.order
    
    try {
      wx.showLoading({ title: '发起支付...' })
      
      // 调用支付API
      const response = await api.payOrder(order.id)
      
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
            
            // 刷新列表
            this.refreshOrderList()
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
  onEvaluateOrder(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: `/pages/user/evaluate/evaluate?orderId=${order.id}`
    })
  },

  /**
   * 查看评价
   */
  onViewEvaluation(e) {
    const order = e.currentTarget.dataset.order
    wx.navigateTo({
      url: `/pages/user/order-detail/order-detail?id=${order.id}&tab=evaluation`
    })
  },

  /**
   * 创建工单
   */
  onCreateOrder() {
    wx.navigateTo({
      url: '/pages/user/create-order/create-order'
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