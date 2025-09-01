// 电工申请页面
const app = getApp();
const api = require('../../../utils/api');
const util = require('../../../utils/utils');

Page({
  data: {
    loading: false,
    currentStep: 1,
    
    // 表单数据
    formData: {
      realName: '',
      idCard: '',
      phone: '',
      age: '',
      gender: 'male',
      cityIndex: 0,
      address: '',
      certificateNumber: '',
      startDate: '',
      endDate: '',
      agreeTerms: false
    },
    
    // 选项数据
    
    cityOptions: [
      { value: 'beijing', text: '北京市' },
      { value: 'shanghai', text: '上海市' },
      { value: 'guangzhou', text: '广州市' },
      { value: 'shenzhen', text: '深圳市' },
      { value: 'hangzhou', text: '杭州市' },
      { value: 'nanjing', text: '南京市' },
      { value: 'wuhan', text: '武汉市' },
      { value: 'chengdu', text: '成都市' }
    ],
    
    areaOptions: [],
    
    // 计算属性
    canSubmit: false
  },

  onLoad() {
    this.initAreaOptions();
    this.loadUserInfo();
  },

  // 初始化区域选项
  initAreaOptions() {
    const areas = [
      { value: 'area1', text: '市中心', selected: false },
      { value: 'area2', text: '东城区', selected: false },
      { value: 'area3', text: '西城区', selected: false },
      { value: 'area4', text: '南城区', selected: false },
      { value: 'area5', text: '北城区', selected: false },
      { value: 'area6', text: '开发区', selected: false }
    ];
    
    this.setData({ areaOptions: areas });
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const res = await api.getUserProfile();
      
      if (res.success && res.data) {
        this.setData({
          'formData.phone': res.data.phone || '',
          'formData.realName': res.data.realName || ''
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
    
    this.validateForm();
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      'formData.gender': e.detail.value
    });
  },

  // 证书开始日期选择
  onStartDateChange(e) {
    this.setData({
      'formData.startDate': e.detail.value
    });
    
    this.validateForm();
  },

  // 证书截止日期选择
  onEndDateChange(e) {
    this.setData({
      'formData.endDate': e.detail.value
    });
    
    this.validateForm();
  },

  // 城市选择
  onCityChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      'formData.cityIndex': index
    });
    
    this.validateForm();
  },

  // 区域切换
  onAreaToggle(e) {
    const index = e.currentTarget.dataset.index;
    const areaOptions = this.data.areaOptions;
    
    areaOptions[index].selected = !areaOptions[index].selected;
    
    this.setData({ areaOptions });
    this.validateForm();
  },

  // 协议切换
  onAgreementToggle() {
    this.setData({
      'formData.agreeTerms': !this.data.formData.agreeTerms
    });
    
    this.validateForm();
  },

  // 查看协议
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/common/agreement/agreement?type=electrician'
    });
  },















  // 表单验证
  validateForm() {
    const { formData, areaOptions } = this.data;
    
    // 基本信息验证
    const hasBasicInfo = formData.realName && 
                        formData.idCard && 
                        formData.phone;
    
    // 区域验证
    const hasAreas = areaOptions.some(area => area.selected);
    
    // 证书信息验证
    const hasCertificate = formData.certificateNumber && formData.startDate && formData.endDate;
    
    // 协议验证
    const agreeTerms = formData.agreeTerms;
    
    const canSubmit = hasBasicInfo && hasAreas && hasCertificate && agreeTerms;
    
    this.setData({ canSubmit });
  },

  // 提交申请
  async onSubmitApplication(e) {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请完善必填信息',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ loading: true });
      
      const formData = this.formatFormData();
      
      const res = await api.applyElectrician(formData);
      
      if (res.success) {
        wx.showToast({
          title: '申请提交成功',
          icon: 'success'
        });
        
        // 跳转到申请状态页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/electrician/application-status/application-status'
          });
        }, 1500);
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.error('提交申请失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 格式化表单数据
  formatFormData() {
    const { formData, areaOptions, cityOptions } = this.data;
    
    // 获取选中的区域
    const selectedAreas = areaOptions
      .filter(area => area.selected)
      .map(area => area.value);
    
    return {
      realName: formData.realName,
      idCard: formData.idCard,
      phone: formData.phone,
      age: parseInt(formData.age) || null,
      gender: formData.gender,
      city: cityOptions[formData.cityIndex].value,
      serviceAreas: selectedAreas,
      address: formData.address,
      certificateNumber: formData.certificateNumber,
      startDate: formData.startDate,
      endDate: formData.endDate
    };
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '成为专业电工，开启接单赚钱之路',
      path: '/pages/electrician/apply/apply',
      imageUrl: '/images/share-apply.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '成为专业电工，开启接单赚钱之路',
      imageUrl: '/images/share-apply.png'
    };
  }
});