// 地图选择页面
const app = getApp();
const util = require('../../../utils/util');

Page({
  data: {
    // 地图相关
    longitude: 116.397428, // 默认北京坐标
    latitude: 39.90923,
    scale: 16,
    markers: [],
    
    // 搜索相关
    searchKeyword: '',
    searchFocus: false,
    searchSuggestions: [],
    
    // 地址信息
    selectedAddress: {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0
    },
    
    // 附近地点
    nearbyPlaces: [],
    
    // 状态
    loading: false,
    loadingText: '定位中...',
    showError: false,
    errorMessage: '',
    
    // 页面参数
    returnPage: '',
    returnKey: 'address'
  },

  onLoad(options) {
    // 获取页面参数
    this.setData({
      returnPage: options.returnPage || '',
      returnKey: options.returnKey || 'address'
    });
    
    // 如果有传入的坐标，使用传入的坐标
    if (options.latitude && options.longitude) {
      const latitude = parseFloat(options.latitude);
      const longitude = parseFloat(options.longitude);
      
      this.setData({
        latitude,
        longitude
      });
      
      this.reverseGeocode(latitude, longitude);
    } else {
      // 否则获取当前位置
      this.getCurrentLocation();
    }
    
    // 创建地图上下文
    this.mapCtx = wx.createMapContext('map');
  },

  onReady() {
    // 页面渲染完成后的操作
  },

  // 获取当前位置
  getCurrentLocation() {
    this.setData({ 
      loading: true, 
      loadingText: '正在定位...' 
    });
    
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        
        this.setData({
          latitude,
          longitude,
          loading: false
        });
        
        // 逆地理编码获取地址
        this.reverseGeocode(latitude, longitude);
      },
      fail: (error) => {
        console.error('获取位置失败:', error);
        this.setData({ loading: false });
        this.showError('定位失败，请检查位置权限');
      }
    });
  },

  // 定位按钮点击
  onGetLocation() {
    this.getCurrentLocation();
  },

  // 地图区域变化
  onRegionChange(e) {
    if (e.type === 'end') {
      const { latitude, longitude } = e.detail.centerLocation;
      
      this.setData({
        latitude,
        longitude
      });
      
      // 防抖处理
      clearTimeout(this.regionChangeTimer);
      this.regionChangeTimer = setTimeout(() => {
        this.reverseGeocode(latitude, longitude);
      }, 500);
    }
  },

  // 地图点击
  onMapTap(e) {
    const { latitude, longitude } = e.detail;
    
    this.setData({
      latitude,
      longitude
    });
    
    this.reverseGeocode(latitude, longitude);
  },

  // 标记点击
  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.markers.find(m => m.id === markerId);
    
    if (marker) {
      this.setData({
        latitude: marker.latitude,
        longitude: marker.longitude
      });
      
      this.reverseGeocode(marker.latitude, marker.longitude);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    if (keyword.trim()) {
      // 防抖搜索
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.searchLocation(keyword);
      }, 300);
    } else {
      this.setData({ searchSuggestions: [] });
    }
  },

  // 搜索确认
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    if (keyword.trim()) {
      this.searchLocation(keyword);
    }
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      searchSuggestions: []
    });
  },

  // 选择搜索建议
  onSelectSuggestion(e) {
    const item = e.currentTarget.dataset.item;
    
    this.setData({
      latitude: item.location.lat,
      longitude: item.location.lng,
      searchKeyword: item.title,
      searchSuggestions: [],
      searchFocus: false
    });
    
    this.reverseGeocode(item.location.lat, item.location.lng);
  },

  // 选择附近地点
  onSelectNearbyPlace(e) {
    const item = e.currentTarget.dataset.item;
    
    // 更新选中状态
    const nearbyPlaces = this.data.nearbyPlaces.map(place => ({
      ...place,
      selected: place.id === item.id
    }));
    
    this.setData({
      nearbyPlaces,
      latitude: item.location.lat,
      longitude: item.location.lng
    });
    
    this.reverseGeocode(item.location.lat, item.location.lng);
  },

  // 搜索地点
  async searchLocation(keyword) {
    try {
      // 这里应该调用地图API进行搜索
      // 由于微信小程序限制，这里使用模拟数据
      const suggestions = this.mockSearchResults(keyword);
      
      this.setData({ searchSuggestions: suggestions });
    } catch (error) {
      console.error('搜索失败:', error);
      this.showError('搜索失败，请重试');
    }
  },

  // 模拟搜索结果
  mockSearchResults(keyword) {
    const mockData = [
      {
        id: '1',
        title: `${keyword}商场`,
        address: '北京市朝阳区某某街道123号',
        location: {
          lat: this.data.latitude + 0.001,
          lng: this.data.longitude + 0.001
        }
      },
      {
        id: '2',
        title: `${keyword}大厦`,
        address: '北京市朝阳区某某街道456号',
        location: {
          lat: this.data.latitude - 0.001,
          lng: this.data.longitude + 0.001
        }
      },
      {
        id: '3',
        title: `${keyword}小区`,
        address: '北京市朝阳区某某街道789号',
        location: {
          lat: this.data.latitude + 0.001,
          lng: this.data.longitude - 0.001
        }
      }
    ];
    
    return mockData.slice(0, 5); // 最多返回5个结果
  },

  // 逆地理编码
  async reverseGeocode(latitude, longitude) {
    try {
      this.setData({ 
        loading: true, 
        loadingText: '获取地址中...' 
      });
      
      // 这里应该调用地图API进行逆地理编码
      // 由于微信小程序限制，这里使用模拟数据
      const addressInfo = await this.mockReverseGeocode(latitude, longitude);
      
      this.setData({
        selectedAddress: {
          name: addressInfo.name,
          address: addressInfo.address,
          latitude,
          longitude
        },
        loading: false
      });
      
      // 获取附近地点
      this.getNearbyPlaces(latitude, longitude);
      
    } catch (error) {
      console.error('逆地理编码失败:', error);
      this.setData({ loading: false });
      this.showError('获取地址失败');
    }
  },

  // 模拟逆地理编码
  async mockReverseGeocode(latitude, longitude) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      name: '选中位置',
      address: `北京市朝阳区某某街道某某号 (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
    };
  },

  // 获取附近地点
  async getNearbyPlaces(latitude, longitude) {
    try {
      // 这里应该调用地图API获取附近地点
      // 使用模拟数据
      const places = [
        {
          id: '1',
          name: '星巴克',
          icon: '☕',
          location: { lat: latitude + 0.0005, lng: longitude + 0.0005 },
          selected: false
        },
        {
          id: '2',
          name: '麦当劳',
          icon: '🍔',
          location: { lat: latitude - 0.0005, lng: longitude + 0.0005 },
          selected: false
        },
        {
          id: '3',
          name: '银行',
          icon: '🏦',
          location: { lat: latitude + 0.0005, lng: longitude - 0.0005 },
          selected: false
        },
        {
          id: '4',
          name: '超市',
          icon: '🛒',
          location: { lat: latitude - 0.0005, lng: longitude - 0.0005 },
          selected: false
        }
      ];
      
      this.setData({ nearbyPlaces: places });
      
    } catch (error) {
      console.error('获取附近地点失败:', error);
    }
  },

  // 显示错误信息
  showError(message) {
    this.setData({
      showError: true,
      errorMessage: message
    });
    
    setTimeout(() => {
      this.setData({ showError: false });
    }, 3000);
  },

  // 取消选择
  onCancel() {
    wx.navigateBack();
  },

  // 确认选择
  onConfirm() {
    const { selectedAddress, returnPage, returnKey } = this.data;
    
    if (!selectedAddress.address) {
      this.showError('请选择一个位置');
      return;
    }
    
    // 如果有返回页面，则传递数据
    if (returnPage) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        prevPage.setData({
          [returnKey]: selectedAddress
        });
        
        // 如果有回调函数，则调用
        if (prevPage.onAddressSelected) {
          prevPage.onAddressSelected(selectedAddress);
        }
      }
    }
    
    wx.navigateBack();
  },

  // 页面卸载
  onUnload() {
    // 清除定时器
    if (this.regionChangeTimer) {
      clearTimeout(this.regionChangeTimer);
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '位置分享',
      path: `/pages/common/map/map?latitude=${this.data.latitude}&longitude=${this.data.longitude}`,
      imageUrl: '/images/share-location.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '位置分享',
      query: `latitude=${this.data.latitude}&longitude=${this.data.longitude}`,
      imageUrl: '/images/share-location.png'
    };
  }
});