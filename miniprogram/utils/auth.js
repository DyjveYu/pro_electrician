// utils/auth.js

const api = require('./api');
const storage = require('./storage');
const config = require('./config');
const wsManager = require('./websocket');

/**
 * 认证管理类
 */
class AuthManager {
  constructor() {
    this.isLoggedIn = false;
    this.userInfo = null;
    this.userType = null;
    this.loginHandlers = [];
    this.logoutHandlers = [];
    this.init();
  }

  /**
   * 初始化
   */
  init() {
    // 检查本地存储的认证信息
    const token = storage.getToken();
    const userInfo = storage.getUserInfo();
    const userType = storage.getUserType();

    if (token && userInfo) {
      this.isLoggedIn = true;
      this.userInfo = userInfo;
      this.userType = userType;
    }
  }

  /**
   * 微信登录
   */
  async wxLogin() {
    try {
      // 获取微信登录code
      const loginRes = await this.getWxLoginCode();
      
      // 调用后端登录接口
      // 修改这里：直接传递code值，而不是对象 update by DyjveYu 2025.8.17
      const response = await api.wxLogin(loginRes.code);

      if (response.success) {
        const { token, refreshToken, user } = response.data;
        
        // 保存认证信息
        this.saveAuthInfo(token, refreshToken, user);
        
        // 连接WebSocket 
        wsManager.connect();
        
        // 通知登录成功
        this.notifyLoginHandlers(user);
        
        return { success: true, user };
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }

  /**
   * 手机号登录
   */
  async phoneLogin(phone, code) {
    try {
      const response = await api.auth.phoneLogin({
        phone,
        code
      });

      if (response.success) {
        const { token, refreshToken, user } = response.data;
        
        // 保存认证信息
        this.saveAuthInfo(token, refreshToken, user);
        
        // 连接WebSocket
        wsManager.connect();
        
        // 通知登录成功
        this.notifyLoginHandlers(user);
        
        return { success: true, user };
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('手机号登录失败:', error);
      throw error;
    }
  }

  /**
   * 绑定手机号
   */
  async bindPhone(phone, code) {
    try {
      const response = await api.auth.bindPhone({
        phone,
        code
      });

      if (response.success) {
        const { user } = response.data;
        
        // 更新用户信息
        this.userInfo = user;
        storage.setUserInfo(user);
        
        return { success: true, user };
      } else {
        throw new Error(response.message || '绑定失败');
      }
    } catch (error) {
      console.error('绑定手机号失败:', error);
      throw error;
    }
  }

  /**
   * 发送验证码
   */
  async sendSmsCode(phone, type = 'login') {
    try {
      const response = await api.auth.sendSmsCode({
        phone,
        type
      });

      if (response.success) {
        return { success: true };
      } else {
        throw new Error(response.message || '发送失败');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      throw error;
    }
  }

  /**
   * 获取微信登录code
   */
  getWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res);
          } else {
            reject(new Error('获取微信登录code失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * 获取微信用户信息
   */
  getWxUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * 获取微信手机号
   */
  getWxPhoneNumber(e) {
    return new Promise((resolve, reject) => {
      if (e.detail.errMsg === 'getPhoneNumber:ok') {
        // 将加密数据发送到后端解密
        api.auth.decryptPhone({
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv
        }).then(response => {
          if (response.success) {
            resolve(response.data.phoneNumber);
          } else {
            reject(new Error(response.message || '获取手机号失败'));
          }
        }).catch(reject);
      } else {
        reject(new Error('用户拒绝授权手机号'));
      }
    });
  }

  /**
   * 刷新token
   */
  async refreshToken() {
    try {
      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('没有刷新token');
      }

      const response = await api.auth.refreshToken({
        refreshToken
      });

      if (response.success) {
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // 更新token
        storage.setToken(token);
        if (newRefreshToken) {
          storage.setRefreshToken(newRefreshToken);
        }
        
        return { success: true, token };
      } else {
        throw new Error(response.message || '刷新token失败');
      }
    } catch (error) {
      console.error('刷新token失败:', error);
      // 刷新失败，清除认证信息
      this.logout();
      throw error;
    }
  }

  /**
   * 登出
   */
  async logout() {
    try {
      // 调用后端登出接口
      await api.auth.logout();
    } catch (error) {
      console.error('登出接口调用失败:', error);
    }

    // 清除本地认证信息
    this.clearAuthInfo();
    
    // 断开WebSocket连接
    wsManager.disconnect();
    
    // 通知登出
    this.notifyLogoutHandlers();
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userInfo) {
    try {
      const response = await api.auth.updateProfile(userInfo);

      if (response.success) {
        const { user } = response.data;
        
        // 更新本地用户信息
        this.userInfo = user;
        storage.setUserInfo(user);
        
        return { success: true, user };
      } else {
        throw new Error(response.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 切换用户类型
   */
  async switchUserType(userType) {
    try {
      const response = await api.auth.switchUserType({
        userType
      });

      if (response.success) {
        // 更新用户类型
        this.userType = userType;
        storage.setUserType(userType);
        
        return { success: true };
      } else {
        throw new Error(response.message || '切换失败');
      }
    } catch (error) {
      console.error('切换用户类型失败:', error);
      throw error;
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    if (!this.isLoggedIn) {
      return false;
    }

    try {
      // 验证token有效性
      const response = await api.auth.verifyToken();
      
      if (response.success) {
        return true;
      } else {
        // token无效，尝试刷新
        await this.refreshToken();
        return true;
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  /**
   * 保存认证信息
   */
  saveAuthInfo(token, refreshToken, user) {
    this.isLoggedIn = true;
    this.userInfo = user;
    this.userType = user.userType;
    
    storage.setToken(token);
    storage.setRefreshToken(refreshToken);
    storage.setUserInfo(user);
    storage.setUserType(user.userType);
  }

  /**
   * 清除认证信息
   */
  clearAuthInfo() {
    this.isLoggedIn = false;
    this.userInfo = null;
    this.userType = null;
    
    storage.clearAuth();
  }

  /**
   * 检查是否需要登录
   */
  requireLogin() {
    if (!this.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/login/login'
            });
          }
        }
      });
      return false;
    }
    return true;
  }

  /**
   * 检查用户类型权限
   */
  checkUserTypePermission(requiredType) {
    if (!this.isLoggedIn) {
      return false;
    }

    if (this.userType !== requiredType) {
      wx.showModal({
        title: '提示',
        content: `此功能需要${requiredType === 'electrician' ? '电工' : '用户'}身份`,
        showCancel: false
      });
      return false;
    }

    return true;
  }

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return this.userInfo;
  }

  /**
   * 获取用户类型
   */
  getUserType() {
    return this.userType;
  }

  /**
   * 获取登录状态
   */
  getLoginStatus() {
    return this.isLoggedIn;
  }

  /**
   * 获取认证token
   */
  getToken() {
    return storage.getToken();
  }

  /**
   * 是否为电工
   */
  isElectrician() {
    return this.userType === 'electrician';
  }

  /**
   * 是否为用户
   */
  isUser() {
    return this.userType === 'user';
  }

  /**
   * 注册登录处理器
   */
  onLogin(handler) {
    this.loginHandlers.push(handler);
  }

  /**
   * 移除登录处理器
   */
  offLogin(handler) {
    const index = this.loginHandlers.indexOf(handler);
    if (index > -1) {
      this.loginHandlers.splice(index, 1);
    }
  }

  /**
   * 注册登出处理器
   */
  onLogout(handler) {
    this.logoutHandlers.push(handler);
  }

  /**
   * 移除登出处理器
   */
  offLogout(handler) {
    const index = this.logoutHandlers.indexOf(handler);
    if (index > -1) {
      this.logoutHandlers.splice(index, 1);
    }
  }

  /**
   * 通知登录处理器
   */
  notifyLoginHandlers(user) {
    this.loginHandlers.forEach(handler => {
      try {
        handler(user);
      } catch (error) {
        console.error('登录处理器执行失败:', error);
      }
    });
  }

  /**
   * 通知登出处理器
   */
  notifyLogoutHandlers() {
    this.logoutHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('登出处理器执行失败:', error);
      }
    });
  }
}

// 创建认证管理器实例
const authManager = new AuthManager();

module.exports = authManager;