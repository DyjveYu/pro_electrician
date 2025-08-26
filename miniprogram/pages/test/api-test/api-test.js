// pages/test/api-test/api-test.js
const api = require('../../../utils/api');
const config = require('../../../utils/config');

Page({
  data: {
    serverStatus: false,
    wsStatus: false,
    loading: false,
    loadingText: '测试中...',
    testPhone: '13800138000',
    testResults: []
  },

  onLoad() {
    console.log('API测试页面加载');
    this.refreshStatus();
  },

  onShow() {
    this.refreshStatus();
  },

  // 刷新连接状态
  async refreshStatus() {
    console.log('刷新连接状态');
    
    // 检查后端服务状态
    try {
      const result = await this.testHealthCheckSilent();
      this.setData({
        serverStatus: result.success
      });
    } catch (error) {
      this.setData({
        serverStatus: false
      });
    }

    // 检查WebSocket状态
    const app = getApp();
    this.setData({
      wsStatus: app.globalData.socketConnected
    });
  },

  // 静默健康检查（不显示结果）
  testHealthCheckSilent() {
    return new Promise((resolve) => {
      wx.request({
        url: config.API_BASE_URL + '/api/health',
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          resolve({ success: res.statusCode === 200 });
        },
        fail: () => {
          resolve({ success: false });
        }
      });
    });
  },

  // 健康检查测试
  async testHealthCheck() {
    this.setData({ loading: true, loadingText: '测试健康检查接口...' });
    
    try {
      const result = await api.get('/api/health', {}, { showLoading: false, showError: false });
      this.addTestResult({
        api: 'GET /api/health',
        success: true,
        message: '健康检查成功',
        data: JSON.stringify(result.data, null, 2)
      });
      
      this.setData({ serverStatus: true });
    } catch (error) {
      this.addTestResult({
        api: 'GET /api/health',
        success: false,
        message: error.message || '健康检查失败'
      });
      
      this.setData({ serverStatus: false });
    }
    
    this.setData({ loading: false });
  },

  // 获取电工列表测试
  async testElectricianList() {
    this.setData({ loading: true, loadingText: '测试电工列表接口...' });
    
    try {
      const result = await api.get('/api/electricians', {
        page: 1,
        limit: 5,
        latitude: 39.9042,
        longitude: 116.4074
      }, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'GET /api/electricians',
        success: true,
        message: `获取到 ${result.data.electricians.length} 个电工`,
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'GET /api/electricians',
        success: false,
        message: error.message || '获取电工列表失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 发送短信验证码测试
  async testSendSMS() {
    this.setData({ loading: true, loadingText: '测试发送验证码...' });
    
    try {
      const result = await api.post('/api/auth/send-sms', {
        phone: this.data.testPhone
      }, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'POST /api/auth/send-sms',
        success: true,
        message: '验证码发送成功',
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'POST /api/auth/send-sms',
        success: false,
        message: error.message || '发送验证码失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 模拟登录测试
  async testLogin() {
    this.setData({ loading: true, loadingText: '测试登录接口...' });
    
    try {
      const result = await api.post('/api/auth/login', {
        phone: this.data.testPhone,
        code: '123456', // 测试验证码
        userType: 'user'
      }, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'POST /api/auth/login',
        success: true,
        message: '登录测试成功',
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'POST /api/auth/login',
        success: false,
        message: error.message || '登录测试失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 检查登录状态测试
  async testCheckLogin() {
    this.setData({ loading: true, loadingText: '检查登录状态...' });
    
    try {
      const result = await api.get('/api/auth/check', {}, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'GET /api/auth/check',
        success: true,
        message: '登录状态检查成功',
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'GET /api/auth/check',
        success: false,
        message: error.message || '登录状态检查失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 创建测试工单
  async testCreateOrder() {
    this.setData({ loading: true, loadingText: '创建测试工单...' });
    
    try {
      const result = await api.post('/api/orders', {
        serviceType: 'lighting',
        description: 'API测试工单 - 照明故障',
        urgency: 'medium',
        address: '北京市朝阳区测试地址',
        latitude: 39.9042,
        longitude: 116.4074,
        contactName: '测试用户',
        contactPhone: this.data.testPhone,
        images: [],
        estimatedPrice: 100
      }, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'POST /api/orders',
        success: true,
        message: '测试工单创建成功',
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'POST /api/orders',
        success: false,
        message: error.message || '创建测试工单失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 获取工单列表测试
  async testGetOrders() {
    this.setData({ loading: true, loadingText: '获取工单列表...' });
    
    try {
      const result = await api.get('/api/orders', {
        page: 1,
        limit: 5
      }, { showLoading: false, showError: false });
      
      this.addTestResult({
        api: 'GET /api/orders',
        success: true,
        message: `获取到 ${result.data.orders.length} 个工单`,
        data: JSON.stringify(result.data, null, 2)
      });
    } catch (error) {
      this.addTestResult({
        api: 'GET /api/orders',
        success: false,
        message: error.message || '获取工单列表失败'
      });
    }
    
    this.setData({ loading: false });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      testPhone: e.detail.value
    });
  },

  // 添加测试结果
  addTestResult(result) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const testResults = this.data.testResults;
    testResults.unshift({
      ...result,
      time
    });
    
    // 只保留最近20条记录
    if (testResults.length > 20) {
      testResults.splice(20);
    }
    
    this.setData({ testResults });
    
    console.log('测试结果:', result);
  },

  // 清空测试结果
  clearResults() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有测试结果吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ testResults: [] });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: 'API接口测试页面',
      path: '/pages/test/api-test/api-test'
    };
  }
});