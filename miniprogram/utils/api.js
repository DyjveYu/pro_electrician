// utils/api.js
const config = require('./config');
const storage = require('./storage');

/**
 * 网络请求封装
 */
class API {
  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.timeout = 10000;
  }

  /**
   * 发起请求
   */
  request(options) {
    return new Promise((resolve, reject) => {
      const {
        url,
        method = 'GET',
        data = {},
        header = {},
        showLoading = true,
        loadingText = '加载中...',
        showError = true
      } = options;

      // 显示加载提示
      if (showLoading) {
        wx.showLoading({
          title: loadingText,
          mask: true
        });
      }

      // 构建请求头
      const requestHeader = {
        'Content-Type': 'application/json',
        ...header
      };

      // 添加认证token
      const token = storage.getToken();
      if (token) {
        requestHeader['Authorization'] = `Bearer ${token}`;
      }

      // 发起请求
      wx.request({
        url: this.baseURL + url,
        method,
        data,
        header: requestHeader,
        timeout: this.timeout,
        success: (res) => {
          if (showLoading) {
            wx.hideLoading();
          }

          const { statusCode, data: responseData } = res;

          // 处理HTTP状态码
          if (statusCode === 200) {
            // 处理业务状态码
            if (responseData.success) {
              resolve(responseData);
            } else {
              // 业务错误
              if (showError) {
                wx.showToast({
                  title: responseData.message || '请求失败',
                  icon: 'none'
                });
              }
              reject(new Error(responseData.message || '请求失败'));
            }
          } else if (statusCode === 401) {
            // 未授权，清除token并跳转登录
            storage.clearAuth();
            wx.reLaunch({
              url: '/pages/login/login'
            });
            reject(new Error('登录已过期，请重新登录'));
          } else {
            // 其他HTTP错误
            const errorMsg = this.getErrorMessage(statusCode);
            if (showError) {
              wx.showToast({
                title: errorMsg,
                icon: 'none'
              });
            }
            reject(new Error(errorMsg));
          }
        },
        fail: (error) => {
          if (showLoading) {
            wx.hideLoading();
          }

          console.error('请求失败:', error);
          const errorMsg = '网络连接失败，请检查网络设置';
          
          if (showError) {
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
          }
          reject(new Error(errorMsg));
        }
      });
    });
  }

  /**
   * GET请求
   */
  get(url, params = {}, options = {}) {
    const queryString = this.buildQueryString(params);
    const requestUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.request({
      url: requestUrl,
      method: 'GET',
      ...options
    });
  }

  /**
   * POST请求
   */
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    });
  }

  /**
   * PUT请求
   */
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    });
  }

  /**
   * DELETE请求
   */
  delete(url, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      ...options
    });
  }

  /**
   * 文件上传
   */
  upload(url, filePath, formData = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        showLoading = true,
        loadingText = '上传中...',
        showError = true
      } = options;

      if (showLoading) {
        wx.showLoading({
          title: loadingText,
          mask: true
        });
      }

      // 构建请求头
      const header = {};
      const token = storage.getToken();
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      }

      wx.uploadFile({
        url: this.baseURL + url,
        filePath,
        name: 'file',
        formData,
        header,
        success: (res) => {
          if (showLoading) {
            wx.hideLoading();
          }

          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data);
            } else {
              if (showError) {
                wx.showToast({
                  title: data.message || '上传失败',
                  icon: 'none'
                });
              }
              reject(new Error(data.message || '上传失败'));
            }
          } catch (error) {
            if (showError) {
              wx.showToast({
                title: '上传失败',
                icon: 'none'
              });
            }
            reject(error);
          }
        },
        fail: (error) => {
          if (showLoading) {
            wx.hideLoading();
          }

          console.error('上传失败:', error);
          if (showError) {
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          }
          reject(error);
        }
      });
    });
  }

  /**
   * 构建查询字符串
   */
  buildQueryString(params) {
    const queryArray = [];
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
      }
    }
    return queryArray.join('&');
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(statusCode) {
    const errorMessages = {
      400: '请求参数错误',
      401: '未授权访问',
      403: '禁止访问',
      404: '请求的资源不存在',
      405: '请求方法不允许',
      408: '请求超时',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
      504: '网关超时'
    };
    return errorMessages[statusCode] || '网络请求失败';
  }

  // ==================== 认证相关API ====================

  /**
   * 微信登录
   */
  wxLogin(code) {
    return this.post('/api/auth/wechat-login', { code });
    // AI 代码错误，原代码是：/api/auth/wx-login 
  }

  /**
   * 手机号登录
   */
  phoneLogin(phone, code) {
    return this.post('/api/auth/phone-login', { phone, code });
  }

  /**
   * 发送短信验证码
   */
  sendSmsCode(phone) {
    return this.post('/api/auth/send-sms', { phone });
  }

  /**
   * 绑定手机号
   */
  bindPhone(phone, code) {
    return this.post('/api/auth/bind-phone', { phone, code });
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return this.get('/api/auth/me');
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(data) {
    return this.put('/api/auth/profile', data);
  }

  /**
   * 上传头像
   */
  uploadAvatar(filePath) {
    return this.upload('/api/auth/upload-avatar', filePath);
  }

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    return this.get('/api/auth/check');
  }

  /**
   * 刷新token
   */
  refreshToken() {
    return this.post('/api/auth/refresh-token');
  }

  /**
   * 退出登录
   */
  logout() {
    return this.post('/api/auth/logout');
  }

  // ==================== 工单相关API ====================

  /**
   * 创建工单
   */
  createOrder(data) {
    return this.post('/api/orders', data);
  }

  /**
   * 获取工单列表
   */
  getOrders(params = {}) {
    return this.get('/api/orders', params);
  }

  /**
   * 获取工单详情
   */
  getOrderDetail(id) {
    return this.get(`/api/orders/${id}`);
  }

  /**
   * 获取附近工单（电工端）
   */
  getNearbyOrders(params = {}) {
    return this.get('/api/orders/nearby', params);
  }

  /**
   * 电工接单
   */
  acceptOrder(id) {
    return this.post(`/api/orders/${id}/accept`);
  }

  /**
   * 用户确认工单
   */
  confirmOrder(id) {
    return this.post(`/api/orders/${id}/confirm`);
  }

  /**
   * 电工提交报价
   */
  submitQuote(id, data) {
    return this.post(`/api/orders/${id}/quote`, data);
  }

  /**
   * 用户确认报价
   */
  confirmQuote(id) {
    return this.post(`/api/orders/${id}/confirm-quote`);
  }

  /**
   * 开始维修
   */
  startWork(id) {
    return this.post(`/api/orders/${id}/start-work`);
  }

  /**
   * 完成维修
   */
  completeWork(id, data) {
    return this.post(`/api/orders/${id}/complete`, data);
  }

  /**
   * 取消工单
   */
  cancelOrder(id, reason) {
    return this.post(`/api/orders/${id}/cancel`, { reason });
  }

  /**
   * 上传工单图片
   */
  uploadOrderImages(id, filePaths) {
    const uploadPromises = filePaths.map(filePath => 
      this.upload(`/api/orders/${id}/upload-images`, filePath)
    );
    return Promise.all(uploadPromises);
  }

  /**
   * 上传维修图片
   */
  uploadWorkImages(id, filePaths) {
    const uploadPromises = filePaths.map(filePath => 
      this.upload(`/api/orders/${id}/upload-work-images`, filePath)
    );
    return Promise.all(uploadPromises);
  }

  // ==================== 电工相关API ====================

  /**
   * 获取电工列表
   */
  getElectricians(params = {}) {
    return this.get('/api/electricians', params);
  }

  /**
   * 获取电工详情
   */
  getElectricianDetail(id) {
    return this.get(`/api/electricians/${id}`);
  }

  /**
   * 搜索附近电工
   */
  searchNearbyElectricians(params = {}) {
    return this.get('/api/electricians/nearby', params);
  }

  /**
   * 更新电工信息
   */
  updateElectricianInfo(data) {
    return this.put('/api/electricians/profile', data);
  }

  /**
   * 更新电工位置
   */
  updateElectricianLocation(latitude, longitude) {
    return this.put('/api/electricians/location', { latitude, longitude });
  }

  /**
   * 更新工作状态
   */
  updateWorkStatus(status) {
    return this.put('/api/electricians/work-status', { status });
  }

  /**
   * 获取电工统计信息
   */
  getElectricianStats() {
    return this.get('/api/electricians/stats');
  }

  /**
   * 申请成为电工
   */
  applyElectrician(data) {
    return this.post('/api/auth/apply-electrician', data);
  }

  /**
   * 上传电工证照片
   */
  uploadCertificate(filePath) {
    return this.upload('/api/electricians/upload-certificate', filePath);
  }

  /**
   * 上传工作照片
   */
  uploadWorkPhotos(filePaths) {
    const uploadPromises = filePaths.map(filePath => 
      this.upload('/api/electricians/upload-work-images', filePath)
    );
    return Promise.all(uploadPromises);
  }
}

// 创建API实例
const api = new API();

module.exports = api;