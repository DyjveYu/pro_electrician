// utils/location.js

const config = require('./config');
const storage = require('./storage');
const { calculateDistance, formatDistance } = require('./utils');

/**
 * 位置管理类
 */
class LocationManager {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.isWatching = false;
    this.locationHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * 获取当前位置
   * @param {object} options 选项
   */
  getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      // 先检查缓存
      const cachedLocation = storage.getLocation();
      if (cachedLocation && !options.force) {
        this.currentLocation = cachedLocation;
        resolve(cachedLocation);
        return;
      }

      // 开发环境使用模拟数据
      if (config.DEV.DEBUG && config.DEV.ENABLE_MOCK) {
        const mockLocation = {
          latitude: 39.908823, // 北京天安门坐标
          longitude: 116.397470,
          accuracy: 20,
          altitude: 0,
          verticalAccuracy: 0,
          horizontalAccuracy: 20,
          speed: 0,
          timestamp: Date.now()
        };
        
        console.log('开发环境：使用模拟位置数据', mockLocation);
        this.currentLocation = mockLocation;
        storage.setLocation(mockLocation);
        this.notifyLocationHandlers(mockLocation);
        resolve(mockLocation);
        return;
      }

      const defaultOptions = {
        type: 'gcj02',
        altitude: false,
        isHighAccuracy: true,
        highAccuracyExpireTime: 4000,
        ...options
      };

      wx.getLocation({
        ...defaultOptions,
        success: (res) => {
          const location = {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            altitude: res.altitude,
            verticalAccuracy: res.verticalAccuracy,
            horizontalAccuracy: res.horizontalAccuracy,
            speed: res.speed,
            timestamp: Date.now()
          };

          this.currentLocation = location;
          storage.setLocation(location);
          this.notifyLocationHandlers(location);
          resolve(location);
        },
        fail: (error) => {
          console.error('获取位置失败:', error);
          // 在开发环境下，如果获取位置失败，使用模拟数据
          if (config.DEV.DEBUG) {
            const mockLocation = {
              latitude: 39.908823,
              longitude: 116.397470,
              accuracy: 20,
              altitude: 0,
              verticalAccuracy: 0,
              horizontalAccuracy: 20,
              speed: 0,
              timestamp: Date.now()
            };
            
            console.log('获取位置失败，使用模拟位置数据', mockLocation);
            this.currentLocation = mockLocation;
            storage.setLocation(mockLocation);
            this.notifyLocationHandlers(mockLocation);
            resolve(mockLocation);
          } else {
            this.notifyErrorHandlers(error);
            reject(error);
          }
        }
      });
    });
  }

  /**
   * 开始监听位置变化
   * @param {object} options 选项
   */
  startWatchLocation(options = {}) {
    if (this.isWatching) {
      console.log('已在监听位置变化');
      return;
    }

    const defaultOptions = {
      type: 'gcj02',
      ...options
    };

    this.watchId = wx.onLocationChange((res) => {
      const location = {
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: res.accuracy,
        altitude: res.altitude,
        verticalAccuracy: res.verticalAccuracy,
        horizontalAccuracy: res.horizontalAccuracy,
        speed: res.speed,
        timestamp: Date.now()
      };

      this.currentLocation = location;
      storage.setLocation(location);
      this.notifyLocationHandlers(location);
    });

    wx.startLocationUpdate(defaultOptions);
    this.isWatching = true;
    console.log('开始监听位置变化');
  }

  /**
   * 停止监听位置变化
   */
  stopWatchLocation() {
    if (!this.isWatching) {
      return;
    }

    if (this.watchId) {
      wx.offLocationChange(this.watchId);
      this.watchId = null;
    }

    wx.stopLocationUpdate();
    this.isWatching = false;
    console.log('停止监听位置变化');
  }

  /**
   * 获取地址信息
   * @param {number} latitude 纬度
   * @param {number} longitude 经度
   */
  getAddress(latitude, longitude) {
    return new Promise((resolve, reject) => {
      // 检查缓存
      const cacheKey = `address_${latitude}_${longitude}`;
      const cachedAddress = storage.getCache(cacheKey);
      if (cachedAddress) {
        resolve(cachedAddress);
        return;
      }

      // 使用腾讯地图逆地理编码
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${latitude},${longitude}`,
          key: config.MAP_KEY,
          get_poi: 1
        },
        success: (res) => {
          if (res.data.status === 0) {
            const result = res.data.result;
            const address = {
              formatted_address: result.formatted_addresses?.recommend || result.address,
              province: result.address_component.province,
              city: result.address_component.city,
              district: result.address_component.district,
              street: result.address_component.street,
              street_number: result.address_component.street_number,
              pois: result.pois || []
            };

            // 缓存地址信息
            storage.setCache(cacheKey, address, 60 * 60 * 1000); // 缓存1小时
            resolve(address);
          } else {
            reject(new Error(res.data.message || '获取地址失败'));
          }
        },
        fail: (error) => {
          console.error('获取地址失败:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * 搜索地点
   * @param {string} keyword 关键词
   * @param {object} options 选项
   */
  searchPlace(keyword, options = {}) {
    return new Promise((resolve, reject) => {
      const { latitude, longitude } = this.currentLocation || {};
      
      wx.request({
        url: 'https://apis.map.qq.com/ws/place/v1/search',
        data: {
          keyword,
          boundary: latitude && longitude ? 
            `nearby(${latitude},${longitude},${options.radius || 5000})` : '',
          page_size: options.pageSize || 20,
          page_index: options.pageIndex || 1,
          key: config.MAP_KEY
        },
        success: (res) => {
          if (res.data.status === 0) {
            const places = res.data.data.map(item => ({
              id: item.id,
              title: item.title,
              address: item.address,
              category: item.category,
              location: item.location,
              distance: latitude && longitude ? 
                calculateDistance(
                  latitude, longitude,
                  item.location.lat, item.location.lng
                ) : null
            }));
            resolve(places);
          } else {
            reject(new Error(res.data.message || '搜索失败'));
          }
        },
        fail: (error) => {
          console.error('搜索地点失败:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * 计算两点间距离
   * @param {object} point1 点1 {latitude, longitude}
   * @param {object} point2 点2 {latitude, longitude}
   */
  calculateDistance(point1, point2) {
    return calculateDistance(
      point1.latitude, point1.longitude,
      point2.latitude, point2.longitude
    );
  }

  /**
   * 格式化距离
   * @param {number} distance 距离（米）
   */
  formatDistance(distance) {
    return formatDistance(distance);
  }

  /**
   * 检查位置权限
   */
  checkLocationPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const authSetting = res.authSetting;
          if (authSetting['scope.userLocation'] === undefined) {
            resolve('not_determined');
          } else if (authSetting['scope.userLocation']) {
            resolve('authorized');
          } else {
            resolve('denied');
          }
        },
        fail: () => {
          resolve('unknown');
        }
      });
    });
  }

  /**
   * 请求位置权限
   */
  requestLocationPermission() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          resolve(true);
        },
        fail: () => {
          // 权限被拒绝，引导用户到设置页面
          wx.showModal({
            title: '位置权限',
            content: '需要获取您的位置信息，请在设置中开启位置权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      resolve(true);
                    } else {
                      reject(new Error('用户拒绝授权位置权限'));
                    }
                  },
                  fail: () => {
                    reject(new Error('打开设置页面失败'));
                  }
                });
              } else {
                reject(new Error('用户取消授权'));
              }
            }
          });
        }
      });
    });
  }

  /**
   * 打开地图选择位置
   * @param {object} options 选项
   */
  chooseLocation(options = {}) {
    return new Promise((resolve, reject) => {
      const { latitude, longitude } = this.currentLocation || {};
      
      wx.chooseLocation({
        latitude: options.latitude || latitude,
        longitude: options.longitude || longitude,
        success: (res) => {
          const location = {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          };
          resolve(location);
        },
        fail: (error) => {
          console.error('选择位置失败:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * 打开地图查看位置
   * @param {object} location 位置信息
   */
  openLocation(location) {
    return new Promise((resolve, reject) => {
      wx.openLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || '位置',
        address: location.address || '',
        scale: 18,
        success: () => {
          resolve();
        },
        fail: (error) => {
          console.error('打开地图失败:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * 获取附近的电工
   * @param {number} radius 搜索半径（米）
   */
  async getNearbyElectricians(radius = 5000) {
    try {
      const location = await this.getCurrentLocation();
      
      // 这里应该调用后端API获取附近的电工
      // 暂时返回模拟数据
      return [
        {
          id: 1,
          name: '张师傅',
          avatar: '',
          rating: 4.8,
          distance: 1200,
          location: {
            latitude: location.latitude + 0.01,
            longitude: location.longitude + 0.01
          }
        },
        {
          id: 2,
          name: '李师傅',
          avatar: '',
          rating: 4.9,
          distance: 800,
          location: {
            latitude: location.latitude - 0.005,
            longitude: location.longitude + 0.008
          }
        }
      ];
    } catch (error) {
      console.error('获取附近电工失败:', error);
      throw error;
    }
  }

  /**
   * 注册位置变化处理器
   */
  onLocationChange(handler) {
    this.locationHandlers.push(handler);
  }

  /**
   * 移除位置变化处理器
   */
  offLocationChange(handler) {
    const index = this.locationHandlers.indexOf(handler);
    if (index > -1) {
      this.locationHandlers.splice(index, 1);
    }
  }

  /**
   * 注册错误处理器
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * 移除错误处理器
   */
  offError(handler) {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 通知位置变化处理器
   */
  notifyLocationHandlers(location) {
    this.locationHandlers.forEach(handler => {
      try {
        handler(location);
      } catch (error) {
        console.error('位置变化处理器执行失败:', error);
      }
    });
  }

  /**
   * 通知错误处理器
   */
  notifyErrorHandlers(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (error) {
        console.error('错误处理器执行失败:', error);
      }
    });
  }

  /**
   * 获取当前位置信息
   */
  getCurrentLocationInfo() {
    return {
      location: this.currentLocation,
      isWatching: this.isWatching,
      watchId: this.watchId
    };
  }

  /**
   * 清除位置信息
   */
  clearLocation() {
    this.currentLocation = null;
    storage.removeLocation();
    storage.removeAddress();
  }
}

// 创建位置管理器实例
const locationManager = new LocationManager();

module.exports = locationManager;