// pages/auth/login.js

const app = getApp();
const auth = require('../../utils/auth');
const storage = require('../../utils/storage');
const { validatePhone } = require('../../utils/utils');

Page({
  data: {
    // 登录方式
    loginType: 'wx', // wx | phone
    
    // 手机号登录
    phoneNumber: '',
    verifyCode: '',
    canSendCode: false,
    canLogin: false,
    codeButtonText: '获取验证码',
    countdown: 0,
    countdownTimer: null,
    
    // 加载状态
    wxLoginLoading: false,
    phoneLoginLoading: false,
    showLoading: false,
    loadingText: '登录中...',
    
    // 用户协议
    agreedToTerms: false,
    showAgreementModal: false,
    agreementTitle: '',
    agreementContent: ''
  },

  onLoad(options) {
    console.log('登录页面加载', options);
    this.initPage();
  },

  onUnload() {
    // 清理定时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    // 检查是否已登录
    /* 测试暂不检查 
    if (auth.getLoginStatus()) {
      this.redirectToHome();
      return;
    }
    */
    
    // 默认同意用户协议
    this.setData({
      agreedToTerms: true
    });
  },

  /**
   * 切换登录方式
   */
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type
    });
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    const phoneNumber = e.detail.value;
    this.setData({
      phoneNumber,
      canSendCode: validatePhone(phoneNumber)
    });
    
    this.checkCanLogin();
  },

  /**
   * 验证码输入
   */
  onCodeInput(e) {
    const verifyCode = e.detail.value;
    this.setData({
      verifyCode
    });
    
    this.checkCanLogin();
  },

  /**
   * 检查是否可以登录
   */
  checkCanLogin() {
    const { phoneNumber, verifyCode, agreedToTerms } = this.data;
    const canLogin = validatePhone(phoneNumber) && 
                    verifyCode.length === 6 && 
                    agreedToTerms;
    
    this.setData({ canLogin });
  },

  /**
   * 发送验证码
   */
  async sendVerifyCode() {
    if (!this.data.canSendCode) return;
    
    const { phoneNumber } = this.data;
    
    try {
      await auth.sendSmsCode(phoneNumber, 'login');
      
      // 开始倒计时
      this.startCountdown();
      
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: error.message || '发送失败',
        icon: 'none'
      });
    }
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    let countdown = 60;
    this.setData({
      countdown,
      canSendCode: false,
      codeButtonText: `${countdown}s后重发`
    });
    
    const timer = setInterval(() => {
      countdown--;
      
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({
          countdown: 0,
          canSendCode: validatePhone(this.data.phoneNumber),
          codeButtonText: '获取验证码',
          countdownTimer: null
        });
      } else {
        this.setData({
          countdown,
          codeButtonText: `${countdown}s后重发`
        });
      }
    }, 1000);
    
    this.setData({ countdownTimer: timer });
  },

  /**
   * 微信登录
   */
  async onWxLogin() {
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ 
        wxLoginLoading: true,
        showLoading: true,
        loadingText: '微信登录中...'
      });
      
      const result = await auth.wxLogin();
      
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this.redirectToHome();
        }, 1500);
      } else {
        throw new Error(result.message || '登录失败');
      }
      
    } catch (error) {
      console.error('微信登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        wxLoginLoading: false,
        showLoading: false
      });
    }
  },

  /**
   * 手机号登录
   */
  async onPhoneLogin() {
    if (!this.data.canLogin) return;
    
    const { phoneNumber, verifyCode } = this.data;
    
    try {
      this.setData({ 
        phoneLoginLoading: true,
        showLoading: true,
        loadingText: '登录中...'
      });
      
      const result = await auth.phoneLogin(phoneNumber, verifyCode);
      
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          this.redirectToHome();
        }, 1500);
      } else {
        throw new Error(result.message || '登录失败');
      }
      
    } catch (error) {
      console.error('手机号登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        phoneLoginLoading: false,
        showLoading: false
      });
    }
  },

  /**
   * 切换用户协议同意状态
   */
  toggleAgreement() {
    this.setData({
      agreedToTerms: !this.data.agreedToTerms
    });
    
    this.checkCanLogin();
  },

  /**
   * 显示用户协议
   */
  showUserAgreement() {
    this.setData({
      showAgreementModal: true,
      agreementTitle: '用户协议',
      agreementContent: '这是用户协议内容...'
    });
  },

  /**
   * 显示隐私政策
   */
  showPrivacyPolicy() {
    this.setData({
      showAgreementModal: true,
      agreementTitle: '隐私政策',
      agreementContent: '这是隐私政策内容...'
    });
  },

  /**
   * 关闭协议弹窗
   */
  closeAgreementModal() {
    this.setData({
      showAgreementModal: false
    });
  },

  /**
   * 跳转到首页
   */
  redirectToHome() {
    const userType = auth.getUserType();
    
    if (userType === 'user') {
      wx.switchTab({
        url: '/pages/index/index'
      });
    } else if (userType === 'electrician') {
      wx.switchTab({
        url: '/pages/electrician/index/index'
      });
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  }
})