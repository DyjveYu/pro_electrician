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
      experienceIndex: 0,
      workDescription: '',
      cityIndex: 0,
      address: '',
      idCardFront: '',
      idCardBack: '',
      certificates: [],
      workPhotos: [],
      agreeTerms: false
    },
    
    // 选项数据
    experienceOptions: [
      { value: '0-1', text: '1年以下' },
      { value: '1-3', text: '1-3年' },
      { value: '3-5', text: '3-5年' },
      { value: '5-10', text: '5-10年' },
      { value: '10+', text: '10年以上' }
    ],
    
    skillOptions: [
      { value: 'electrical_repair', text: '电路维修', selected: false },
      { value: 'appliance_repair', text: '家电维修', selected: false },
      { value: 'lighting_install', text: '灯具安装', selected: false },
      { value: 'switch_repair', text: '开关维修', selected: false },
      { value: 'wiring', text: '布线安装', selected: false },
      { value: 'panel_repair', text: '配电箱维修', selected: false },
      { value: 'motor_repair', text: '电机维修', selected: false },
      { value: 'other', text: '其他', selected: false }
    ],
    
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

  // 经验选择
  onExperienceChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      'formData.experienceIndex': index
    });
    
    this.validateForm();
  },

  // 技能切换
  onSkillToggle(e) {
    const index = e.currentTarget.dataset.index;
    const skillOptions = this.data.skillOptions;
    
    skillOptions[index].selected = !skillOptions[index].selected;
    
    this.setData({ skillOptions });
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

  // 选择身份证图片
  onChooseImage(e) {
    const field = e.currentTarget.dataset.field;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadImage(tempFilePath, field);
      }
    });
  },

  // 选择证书图片
  onChooseCertificate() {
    wx.chooseImage({
      count: 5 - this.data.formData.certificates.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        res.tempFilePaths.forEach(filePath => {
          this.uploadCertificate(filePath);
        });
      }
    });
  },

  // 选择工作照片
  onChooseWorkPhoto() {
    wx.chooseImage({
      count: 5 - this.data.formData.workPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        res.tempFilePaths.forEach(filePath => {
          this.uploadWorkPhoto(filePath);
        });
      }
    });
  },

  // 上传图片
  async uploadImage(filePath, field) {
    try {
      wx.showLoading({ title: '上传中...' });
      
      const res = await api.uploadFile({
        filePath,
        name: 'image',
        formData: {
          type: 'id_card'
        }
      });
      
      wx.hideLoading();
      
      if (res.success) {
        this.setData({
          [`formData.${field}`]: res.data.url
        });
        
        this.validateForm();
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('上传图片失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    }
  },

  // 上传证书
  async uploadCertificate(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });
      
      const res = await api.uploadFile({
        filePath,
        name: 'image',
        formData: {
          type: 'certificate'
        }
      });
      
      wx.hideLoading();
      
      if (res.success) {
        const certificates = [...this.data.formData.certificates, res.data.url];
        this.setData({
          'formData.certificates': certificates
        });
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('上传证书失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    }
  },

  // 上传工作照片
  async uploadWorkPhoto(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });
      
      const res = await api.uploadFile({
        filePath,
        name: 'image',
        formData: {
          type: 'work_photo'
        }
      });
      
      wx.hideLoading();
      
      if (res.success) {
        const workPhotos = [...this.data.formData.workPhotos, res.data.url];
        this.setData({
          'formData.workPhotos': workPhotos
        });
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('上传工作照片失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    }
  },

  // 删除图片
  onDeleteImage(e) {
    const field = e.currentTarget.dataset.field;
    
    wx.showModal({
      title: '删除图片',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            [`formData.${field}`]: ''
          });
          
          this.validateForm();
        }
      }
    });
  },

  // 删除证书
  onDeleteCertificate(e) {
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '删除证书',
      content: '确定要删除这张证书吗？',
      success: (res) => {
        if (res.confirm) {
          const certificates = this.data.formData.certificates;
          certificates.splice(index, 1);
          
          this.setData({
            'formData.certificates': certificates
          });
        }
      }
    });
  },

  // 删除工作照片
  onDeleteWorkPhoto(e) {
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const workPhotos = this.data.formData.workPhotos;
          workPhotos.splice(index, 1);
          
          this.setData({
            'formData.workPhotos': workPhotos
          });
        }
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

  // 表单验证
  validateForm() {
    const { formData, skillOptions, areaOptions } = this.data;
    
    // 基本信息验证
    const hasBasicInfo = formData.realName && 
                        formData.idCard && 
                        formData.phone;
    
    // 技能验证
    const hasSkills = skillOptions.some(skill => skill.selected);
    
    // 区域验证
    const hasAreas = areaOptions.some(area => area.selected);
    
    // 身份证验证
    const hasIdCard = formData.idCardFront && formData.idCardBack;
    
    // 协议验证
    const agreeTerms = formData.agreeTerms;
    
    const canSubmit = hasBasicInfo && hasSkills && hasAreas && hasIdCard && agreeTerms;
    
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
      
      const res = await api.submitElectricianApplication(formData);
      
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
    const { formData, skillOptions, areaOptions, experienceOptions, cityOptions } = this.data;
    
    // 获取选中的技能
    const selectedSkills = skillOptions
      .filter(skill => skill.selected)
      .map(skill => skill.value);
    
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
      experience: experienceOptions[formData.experienceIndex].value,
      skills: selectedSkills,
      workDescription: formData.workDescription,
      city: cityOptions[formData.cityIndex].value,
      serviceAreas: selectedAreas,
      address: formData.address,
      idCardFront: formData.idCardFront,
      idCardBack: formData.idCardBack,
      certificates: formData.certificates,
      workPhotos: formData.workPhotos
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