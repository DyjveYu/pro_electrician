// pages/auth/login/login.js

const app = getApp();
const auth = require('../../../utils/auth');
const storage = require('../../../utils/storage');
const { validatePhone } = require('../../../utils/utils');

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
      }
      
    } catch (error) {
      console.error('微信登录失败:', error);
      
      let errorMessage = '登录失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.errMsg) {
        if (error.errMsg.includes('cancel')) {
          errorMessage = '用户取消登录';
        } else if (error.errMsg.includes('fail')) {
          errorMessage = '登录失败，请重试';
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
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
      }
      
    } catch (error) {
      console.error('手机号登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
        duration: 2000
      });
      
    } finally {
      this.setData({ 
        phoneLoginLoading: false,
        showLoading: false
      });
    }
  },

  /**
   * 游客登录
   */
  onGuestLogin() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式下功能受限，建议注册登录以享受完整服务',
      confirmText: '继续体验',
      cancelText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 设置游客模式标识
          storage.set('guest_mode', true);
          this.redirectToHome();
        }
      }
    });
  },

  /**
   * 切换协议同意状态
   */
  toggleAgreement() {
    const agreedToTerms = !this.data.agreedToTerms;
    this.setData({ agreedToTerms });
    this.checkCanLogin();
  },

  /**
   * 显示用户协议
   */
  showUserAgreement() {
    this.setData({
      showAgreementModal: true,
      agreementTitle: '用户协议',
      agreementContent: this.getUserAgreementContent()
    });
  },

  /**
   * 显示隐私政策
   */
  showPrivacyPolicy() {
    this.setData({
      showAgreementModal: true,
      agreementTitle: '隐私政策',
      agreementContent: this.getPrivacyPolicyContent()
    });
  },

  /**
   * 隐藏协议弹窗
   */
  hideAgreementModal() {
    this.setData({
      showAgreementModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止事件冒泡
  },

  /**
   * 获取用户协议内容
   */
  getUserAgreementContent() {
    return `
欢迎使用电工维修平台！

1. 服务说明
本平台为用户提供电工维修服务的信息展示和预约功能。

2. 用户责任
- 提供真实、准确的个人信息
- 合理使用平台服务
- 遵守相关法律法规

3. 服务条款
- 平台有权对服务内容进行调整
- 用户应按约定支付服务费用
- 平台不承担因第三方原因造成的损失

4. 隐私保护
我们重视用户隐私，详见《隐私政策》。

5. 协议变更
平台有权根据需要修改本协议，修改后的协议将在平台公布。

如有疑问，请联系客服。
    `;
  },

  /**
   * 获取隐私政策内容
   */
  getPrivacyPolicyContent() {
    return `
电工维修平台隐私政策

我们非常重视用户的隐私保护，本政策说明我们如何收集、使用和保护您的个人信息。

1. 信息收集
我们可能收集以下信息：
- 基本信息：姓名、手机号、头像等
- 位置信息：用于提供就近服务
- 设备信息：用于优化服务体验

2. 信息使用
收集的信息用于：
- 提供电工维修服务
- 改善用户体验
- 发送服务通知

3. 信息保护
我们采取以下措施保护您的信息：
- 数据加密传输和存储
- 严格的访问权限控制
- 定期安全审计

4. 信息共享
除法律要求外，我们不会向第三方分享您的个人信息。

5. 用户权利
您有权：
- 查看和更新个人信息
- 删除账户和相关数据
- 拒绝特定信息收集

6. 联系我们
如有隐私相关问题，请联系客服。

本政策最后更新时间：2024年1月1日
    `;
  },

  /**
   * 跳转到首页
   */
  redirectToHome() {
    // 获取页面栈
    const pages = getCurrentPages();
    
    if (pages.length > 1) {
      // 如果有上一页，返回上一页
      wx.navigateBack();
    } else {
      // 否则跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 显示错误信息
   */
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  }
});