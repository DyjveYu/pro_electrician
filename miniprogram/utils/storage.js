// utils/storage.js

/**
 * 本地存储工具类
 */
class Storage {
  constructor() {
    this.prefix = 'electrician_';
  }

  /**
   * 生成存储key
   */
  getKey(key) {
    return this.prefix + key;
  }

  /**
   * 设置存储
   */
  set(key, value, expire = null) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expire: expire ? Date.now() + expire : null
      };
      
      wx.setStorageSync(this.getKey(key), JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('存储设置失败:', error);
      return false;
    }
  }

  /**
   * 获取存储
   */
  get(key, defaultValue = null) {
    try {
      const dataStr = wx.getStorageSync(this.getKey(key));
      if (!dataStr) {
        return defaultValue;
      }

      const data = JSON.parse(dataStr);
      
      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        this.remove(key);
        return defaultValue;
      }

      return data.value;
    } catch (error) {
      console.error('存储获取失败:', error);
      return defaultValue;
    }
  }

  /**
   * 移除存储
   */
  remove(key) {
    try {
      wx.removeStorageSync(this.getKey(key));
      return true;
    } catch (error) {
      console.error('存储移除失败:', error);
      return false;
    }
  }

  /**
   * 清空所有存储
   */
  clear() {
    try {
      const info = wx.getStorageInfoSync();
      const keys = info.keys.filter(key => key.startsWith(this.prefix));
      
      keys.forEach(key => {
        wx.removeStorageSync(key);
      });
      
      return true;
    } catch (error) {
      console.error('存储清空失败:', error);
      return false;
    }
  }

  /**
   * 检查存储是否存在
   */
  has(key) {
    try {
      const dataStr = wx.getStorageSync(this.getKey(key));
      if (!dataStr) {
        return false;
      }

      const data = JSON.parse(dataStr);
      
      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error('存储检查失败:', error);
      return false;
    }
  }

  /**
   * 获取存储大小信息
   */
  getInfo() {
    try {
      return wx.getStorageInfoSync();
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }

  // ==================== 认证相关存储 ====================

  /**
   * 设置认证token
   */
  setToken(token, expire = 7 * 24 * 60 * 60 * 1000) { // 默认7天
    return this.set('token', token, expire);
  }

  /**
   * 获取认证token
   */
  getToken() {
    return this.get('token');
  }

  /**
   * 移除认证token
   */
  removeToken() {
    return this.remove('token');
  }

  /**
   * 设置刷新token
   */
  setRefreshToken(refreshToken, expire = 30 * 24 * 60 * 60 * 1000) { // 默认30天
    return this.set('refresh_token', refreshToken, expire);
  }

  /**
   * 获取刷新token
   */
  getRefreshToken() {
    return this.get('refresh_token');
  }

  /**
   * 移除刷新token
   */
  removeRefreshToken() {
    return this.remove('refresh_token');
  }

  /**
   * 清除所有认证信息
   */
  clearAuth() {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUserInfo();
    this.removeUserType();
  }

  // ==================== 用户信息存储 ====================

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo, expire = 24 * 60 * 60 * 1000) { // 默认24小时
    return this.set('user_info', userInfo, expire);
  }

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return this.get('user_info');
  }

  /**
   * 移除用户信息
   */
  removeUserInfo() {
    return this.remove('user_info');
  }

  /**
   * 设置用户类型
   */
  setUserType(userType) {
    return this.set('user_type', userType);
  }

  /**
   * 获取用户类型
   */
  getUserType() {
    return this.get('user_type');
  }

  /**
   * 移除用户类型
   */
  removeUserType() {
    return this.remove('user_type');
  }

  // ==================== 位置信息存储 ====================

  /**
   * 设置当前位置
   */
  setLocation(location, expire = 10 * 60 * 1000) { // 默认10分钟
    return this.set('current_location', location, expire);
  }

  /**
   * 获取当前位置
   */
  getLocation() {
    return this.get('current_location');
  }

  /**
   * 移除当前位置
   */
  removeLocation() {
    return this.remove('current_location');
  }

  /**
   * 设置地址信息
   */
  setAddress(address, expire = 60 * 60 * 1000) { // 默认1小时
    return this.set('current_address', address, expire);
  }

  /**
   * 获取地址信息
   */
  getAddress() {
    return this.get('current_address');
  }

  /**
   * 移除地址信息
   */
  removeAddress() {
    return this.remove('current_address');
  }

  // ==================== 应用设置存储 ====================

  /**
   * 设置应用设置
   */
  setSettings(settings) {
    return this.set('app_settings', settings);
  }

  /**
   * 获取应用设置
   */
  getSettings() {
    return this.get('app_settings', {
      notifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
      autoLocation: true,
      theme: 'light'
    });
  }

  /**
   * 更新应用设置
   */
  updateSettings(newSettings) {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    return this.setSettings(updatedSettings);
  }

  // ==================== 搜索历史存储 ====================

  /**
   * 添加搜索历史
   */
  addSearchHistory(keyword, maxCount = 10) {
    const history = this.getSearchHistory();
    
    // 移除重复项
    const filteredHistory = history.filter(item => item !== keyword);
    
    // 添加到开头
    filteredHistory.unshift(keyword);
    
    // 限制数量
    const limitedHistory = filteredHistory.slice(0, maxCount);
    
    return this.set('search_history', limitedHistory);
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory() {
    return this.get('search_history', []);
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory() {
    return this.remove('search_history');
  }

  // ==================== 缓存管理 ====================

  /**
   * 设置缓存
   */
  setCache(key, data, expire = 30 * 60 * 1000) { // 默认30分钟
    return this.set(`cache_${key}`, data, expire);
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    return this.get(`cache_${key}`);
  }

  /**
   * 移除缓存
   */
  removeCache(key) {
    return this.remove(`cache_${key}`);
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    try {
      const info = wx.getStorageInfoSync();
      const cacheKeys = info.keys.filter(key => 
        key.startsWith(this.prefix + 'cache_')
      );
      
      cacheKeys.forEach(key => {
        wx.removeStorageSync(key);
      });
      
      return true;
    } catch (error) {
      console.error('清除缓存失败:', error);
      return false;
    }
  }

  // ==================== 草稿存储 ====================

  /**
   * 保存草稿
   */
  saveDraft(type, data) {
    return this.set(`draft_${type}`, data);
  }

  /**
   * 获取草稿
   */
  getDraft(type) {
    return this.get(`draft_${type}`);
  }

  /**
   * 移除草稿
   */
  removeDraft(type) {
    return this.remove(`draft_${type}`);
  }

  /**
   * 清除所有草稿
   */
  clearDrafts() {
    try {
      const info = wx.getStorageInfoSync();
      const draftKeys = info.keys.filter(key => 
        key.startsWith(this.prefix + 'draft_')
      );
      
      draftKeys.forEach(key => {
        wx.removeStorageSync(key);
      });
      
      return true;
    } catch (error) {
      console.error('清除草稿失败:', error);
      return false;
    }
  }
}

// 创建存储实例
const storage = new Storage();

module.exports = storage;