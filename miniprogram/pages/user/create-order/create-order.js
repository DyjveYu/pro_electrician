// pages/user/create-order/create-order.js

const app = getApp();
const api = require('../../../utils/api');
const auth = require('../../../utils/auth');
const location = require('../../../utils/location');
const { validatePhone, formatFileSize, generateId } = require('../../../utils/utils');

Page({
  data: {
    // 当前步骤
    currentStep: 1,
    
    // 服务类型
    serviceTypes: [
      {
        id: 'electrical_repair',
        name: '电路维修',
        description: '开关插座、线路故障等',
        icon: '/images/service-icons/electrical-repair.svg',
        basePrice: 50
      },
      {
        id: 'appliance_repair',
        name: '电器维修',
        description: '家电故障、安装调试等',
        icon: '/images/service-icons/appliance-repair.svg',
        basePrice: 80
      },
      {
        id: 'lighting_install',
        name: '灯具安装',
        description: '吊灯、射灯、LED灯安装',
        icon: '/images/service-icons/lighting-install.svg',
        basePrice: 60
      },
      {
        id: 'emergency_repair',
        name: '紧急维修',
        description: '停电、短路等紧急情况',
        icon: '/images/service-icons/emergency-repair.svg',
        basePrice: 120
      }
    ],
    
    // 故障类型
    faultTypes: [
      { id: 'no_power', name: '没电' },
      { id: 'short_circuit', name: '短路' },
      { id: 'switch_broken', name: '开关坏了' },
      { id: 'socket_broken', name: '插座坏了' },
      { id: 'light_broken', name: '灯不亮' },
      { id: 'appliance_issue', name: '电器故障' },
      { id: 'wiring_issue', name: '线路问题' },
      { id: 'other', name: '其他' }
    ],
    
    // 选择的服务和故障
    selectedService: '',
    selectedFaults: [],
    
    // 工单信息
    orderInfo: {
      contactName: '',
      contactPhone: '',
      address: '',
      addressDetail: '',
      description: '',
      urgentType: 'normal',
      images: []
    },
    
    // 预约时间
    appointmentTime: '',
    appointmentDate: '',
    timeSlots: [
      { id: 'morning', name: '上午 (9:00-12:00)', available: true },
      { id: 'afternoon', name: '下午 (13:00-17:00)', available: true },
      { id: 'evening', name: '晚上 (18:00-21:00)', available: true },
      { id: 'urgent', name: '立即上门 (加急)', available: true, extra: 30 }
    ],
    selectedTimeSlot: '',
    
    // 上传图片
    uploadedImages: [],
    maxImages: 6,
    
    // 表单验证
    formValid: false,
    
    // 加载状态
    submitting: false,
    
    // 位置信息
    currentLocation: null,
    
    // 费用预估
    estimatedCost: {
      baseCost: 0,
      urgentFee: 0,
      totalCost: 0
    }
  },

  onLoad(options) {
    console.log('创建工单页面加载', options);
    this.initPage();
  },

  onShow() {
    // 检查登录状态
    if (!auth.getLoginStatus()) {
      wx.showModal({
        title: '请先登录',
        content: '需要登录后才能下单',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/login/login'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    this.loadUserInfo();
  },

  /**
   * 初始化页面
   */
  initPage() {
    // 获取当前位置
    this.getCurrentLocation();
    
    // 初始化日期选择器
    this.initDatePicker();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = auth.getUserInfo();
    if (userInfo) {
      this.setData({
        'orderInfo.contactName': userInfo.name || '',
        'orderInfo.contactPhone': userInfo.phone || ''
      });
    }
  },

  /**
   * 获取当前位置
   */
  async getCurrentLocation() {
    try {
      const location = await location.getCurrentLocation();
      this.setData({
        currentLocation: location
      });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  },

  /**
   * 初始化日期选择器
   */
  initDatePicker() {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    this.setData({
      appointmentDate: this.formatDate(tomorrow)
    });
  },

  /**
   * 选择服务类型
   */
  selectService(e) {
    const serviceId = e.currentTarget.dataset.id;
    const service = this.data.serviceTypes.find(s => s.id === serviceId);
    
    this.setData({
      selectedService: serviceId
    });
    
    this.updateEstimatedCost();
  },

  /**
   * 切换故障类型
   */
  toggleFault(e) {
    const faultId = e.currentTarget.dataset.id;
    let selectedFaults = [...this.data.selectedFaults];
    
    const index = selectedFaults.indexOf(faultId);
    if (index > -1) {
      selectedFaults.splice(index, 1);
    } else {
      selectedFaults.push(faultId);
    }
    
    this.setData({
      selectedFaults
    });
  },

  /**
   * 下一步
   */
  nextStep() {
    const { currentStep, selectedService } = this.data;
    
    if (currentStep === 1) {
      if (!selectedService) {
        wx.showToast({
          title: '请选择服务类型',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        currentStep: 2
      });
    } else if (currentStep === 2) {
      if (!this.validateStep2()) {
        return;
      }
      
      this.setData({
        currentStep: 3
      });
      
      this.updateEstimatedCost();
    }
  },

  /**
   * 上一步
   */
  prevStep() {
    const { currentStep } = this.data;
    
    if (currentStep > 1) {
      this.setData({
        currentStep: currentStep - 1
      });
    }
  },

  /**
   * 验证第二步表单
   */
  validateStep2() {
    const { orderInfo } = this.data;
    
    if (!orderInfo.contactName.trim()) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return false;
    }
    
    if (!validatePhone(orderInfo.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }
    
    if (!orderInfo.address.trim()) {
      wx.showToast({
        title: '请选择服务地址',
        icon: 'none'
      });
      return false;
    }
    
    if (!orderInfo.description.trim()) {
      wx.showToast({
        title: '请描述故障情况',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 联系人姓名输入
   */
  onContactNameInput(e) {
    this.setData({
      'orderInfo.contactName': e.detail.value
    });
  },

  /**
   * 联系电话输入
   */
  onContactPhoneInput(e) {
    this.setData({
      'orderInfo.contactPhone': e.detail.value
    });
  },

  /**
   * 详细地址输入
   */
  onAddressDetailInput(e) {
    this.setData({
      'orderInfo.addressDetail': e.detail.value
    });
  },

  /**
   * 故障描述输入
   */
  onDescriptionInput(e) {
    this.setData({
      'orderInfo.description': e.detail.value
    });
  },

  /**
   * 选择地址
   */
  selectAddress() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          'orderInfo.address': res.address
        });
      },
      fail: (error) => {
        console.error('选择地址失败:', error);
        if (error.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  /**
   * 选择预约日期
   */
  onDateChange(e) {
    this.setData({
      appointmentDate: e.detail.value
    });
  },

  /**
   * 选择时间段
   */
  selectTimeSlot(e) {
    const slotId = e.currentTarget.dataset.id;
    this.setData({
      selectedTimeSlot: slotId
    });
    
    this.updateEstimatedCost();
  },

  /**
   * 切换紧急程度
   */
  toggleUrgent(e) {
    const urgent = e.detail.value;
    this.setData({
      'orderInfo.urgentType': urgent ? 'urgent' : 'normal'
    });
    
    this.updateEstimatedCost();
  },

  /**
   * 选择图片
   */
  chooseImage() {
    const { uploadedImages, maxImages } = this.data;
    
    if (uploadedImages.length >= maxImages) {
      wx.showToast({
        title: `最多上传${maxImages}张图片`,
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: maxImages - uploadedImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths);
      }
    });
  },

  /**
   * 上传图片
   */
  async uploadImages(filePaths) {
    wx.showLoading({
      title: '上传中...'
    });
    
    try {
      const uploadPromises = filePaths.map(filePath => {
        return api.uploadFile(filePath, 'work-images');
      });
      
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map(result => result.url);
      
      this.setData({
        uploadedImages: [...this.data.uploadedImages, ...imageUrls],
        'orderInfo.images': [...this.data.orderInfo.images, ...imageUrls]
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('上传图片失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除图片
   */
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    let uploadedImages = [...this.data.uploadedImages];
    let orderImages = [...this.data.orderInfo.images];
    
    uploadedImages.splice(index, 1);
    orderImages.splice(index, 1);
    
    this.setData({
      uploadedImages,
      'orderInfo.images': orderImages
    });
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const { uploadedImages } = this.data;
    
    wx.previewImage({
      current: uploadedImages[index],
      urls: uploadedImages
    });
  },

  /**
   * 更新费用预估
   */
  updateEstimatedCost() {
    const { selectedService, selectedTimeSlot, orderInfo } = this.data;
    
    if (!selectedService) {
      return;
    }
    
    const service = this.data.serviceTypes.find(s => s.id === selectedService);
    let baseCost = service ? service.basePrice : 0;
    
    // 紧急费用
    let urgentFee = 0;
    if (orderInfo.urgentType === 'urgent') {
      urgentFee = 30;
    }
    
    // 时间段加急费
    const timeSlot = this.data.timeSlots.find(t => t.id === selectedTimeSlot);
    if (timeSlot && timeSlot.extra) {
      urgentFee += timeSlot.extra;
    }
    
    const totalCost = baseCost + urgentFee;
    
    this.setData({
      estimatedCost: {
        baseCost,
        urgentFee,
        totalCost
      }
    });
  },

  /**
   * 提交工单
   */
  async submitOrder() {
    if (this.data.submitting) {
      return;
    }
    
    // 最终验证
    if (!this.validateOrder()) {
      return;
    }
    
    this.setData({
      submitting: true
    });
    
    wx.showLoading({
      title: '提交中...'
    });
    
    try {
      const orderData = this.buildOrderData();
      const result = await api.createOrder(orderData);
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        });
        
        // 跳转到工单详情页
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/user/order-detail/order-detail?id=${result.data.id}`
          });
        }, 1500);
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('提交工单失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        submitting: false
      });
    }
  },

  /**
   * 验证工单信息
   */
  validateOrder() {
    const { selectedService, orderInfo, selectedTimeSlot } = this.data;
    
    if (!selectedService) {
      wx.showToast({
        title: '请选择服务类型',
        icon: 'none'
      });
      return false;
    }
    
    if (!orderInfo.contactName.trim()) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return false;
    }
    
    if (!validatePhone(orderInfo.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }
    
    if (!orderInfo.address.trim()) {
      wx.showToast({
        title: '请选择服务地址',
        icon: 'none'
      });
      return false;
    }
    
    if (!orderInfo.description.trim()) {
      wx.showToast({
        title: '请描述故障情况',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 构建工单数据
   */
  buildOrderData() {
    const { selectedService, selectedFaults, orderInfo, appointmentDate, selectedTimeSlot, estimatedCost } = this.data;
    
    const service = this.data.serviceTypes.find(s => s.id === selectedService);
    const faultNames = selectedFaults.map(faultId => {
      const fault = this.data.faultTypes.find(f => f.id === faultId);
      return fault ? fault.name : '';
    }).filter(name => name);
    
    // 组合完整地址
    const fullAddress = orderInfo.addressDetail ? 
      `${orderInfo.address} ${orderInfo.addressDetail}` : 
      orderInfo.address;
    
    // 组合描述信息
    let description = orderInfo.description;
    if (faultNames.length > 0) {
      description = `故障类型：${faultNames.join('、')}\n${description}`;
    }
    
    return {
      serviceType: selectedService,
      serviceName: service ? service.name : '',
      contactName: orderInfo.contactName.trim(),
      contactPhone: orderInfo.contactPhone.trim(),
      address: fullAddress,
      description: description,
      urgentType: orderInfo.urgentType,
      images: orderInfo.images,
      appointmentDate: appointmentDate,
      appointmentTime: selectedTimeSlot,
      estimatedAmount: estimatedCost.totalCost,
      faultTypes: selectedFaults
    };
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 获取服务类型名称
   */
  getServiceTypeName(serviceId) {
    const service = this.data.serviceTypes.find(s => s.id === serviceId);
    return service ? service.name : '';
  },

  /**
   * 获取故障类型名称
   */
  getFaultTypeName(faultId) {
    const fault = this.data.faultTypes.find(f => f.id === faultId);
    return fault ? fault.name : '';
  },

  /**
   * 获取时间段名称
   */
  getTimeSlotName(timeSlotId) {
    const timeSlot = this.data.timeSlots.find(t => t.id === timeSlotId);
    return timeSlot ? timeSlot.name : '';
  }
});