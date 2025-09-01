// pages/user/edit-profile/edit-profile.js
const app = getApp()
const api = require('../../../utils/api')
const util = require('../../../utils/utils')
const storage = require('../../../utils/storage')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    userInfo: {},
    
    // 表单数据
    formData: {
      name: '',
      phone: '',
      email: '',
      gender: 0, // 0: 未知, 1: 男, 2: 女
      birthday: '',
      address: ''
    },
    
    // 性别选项
    genderOptions: [
      { value: 0, label: '保密' },
      { value: 1, label: '男' },
      { value: 2, label: '女' }
    ],
    
    // 状态
    loading: false,
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage()
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
          wx.navigateBack()
        }, 1500)
        return
      }
      
      // 设置用户信息和表单数据
      this.setData({
        userInfo,
        formData: {
          name: userInfo.name || '',
          phone: userInfo.phone || '',
          email: userInfo.email || '',
          gender: userInfo.gender || 0,
          birthday: userInfo.birthday || '',
          address: userInfo.address || ''
        }
      })
    } catch (error) {
      console.error('初始化页面失败:', error)
      this.showError('页面初始化失败')
    }
  },

  /**
   * 输入框变化事件
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  /**
   * 性别选择事件
   */
  onGenderChange(e) {
    const { value } = e.detail
    this.setData({
      'formData.gender': parseInt(value)
    })
  },

  /**
   * 生日选择事件
   */
  onBirthdayChange(e) {
    const { value } = e.detail
    this.setData({
      'formData.birthday': value
    })
  },

  /**
   * 保存个人信息
   */
  async onSave() {
    if (this.data.submitting) {
      return
    }
    
    try {
      // 验证表单
      if (!this.validateForm()) {
        return
      }
      
      this.setData({ submitting: true })
      wx.showLoading({ title: '保存中...' })
      
      // 调用API更新用户信息
      const response = await api.updateUserInfo(this.data.formData)
      
      if (response.success) {
        // 更新全局用户信息和本地存储
        const updatedUserInfo = { ...this.data.userInfo, ...this.data.formData }
        app.globalData.userInfo = updatedUserInfo
        storage.setUserInfo(updatedUserInfo)
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        this.showError(response.message || '保存失败')
      }
    } catch (error) {
      console.error('保存个人信息失败:', error)
      this.showError('保存失败，请稍后重试')
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { name, phone } = this.data.formData
    
    if (!name || name.trim().length === 0) {
      this.showError('请输入姓名')
      return false
    }
    
    if (name.trim().length > 20) {
      this.showError('姓名不能超过20个字符')
      return false
    }
    
    if (!phone || phone.trim().length === 0) {
      this.showError('请输入手机号')
      return false
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.showError('请输入正确的手机号')
      return false
    }
    
    return true
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