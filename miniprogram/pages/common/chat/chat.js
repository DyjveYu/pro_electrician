// 聊天页面
const app = getApp();
const util = require('../../../utils/util');
const api = require('../../../utils/api');

Page({
  data: {
    // 聊天信息
    chatId: '',
    targetUserId: '',
    targetUserInfo: {},
    userInfo: {},
    
    // 消息列表
    messages: [],
    
    // 输入相关
    inputType: 'text', // text | voice
    inputText: '',
    showToolbar: false,
    
    // 语音录制
    isRecording: false,
    recordStartTime: 0,
    
    // 状态
    loading: false,
    loadingText: '加载中...',
    isTyping: false,
    showError: false,
    errorMessage: '',
    
    // 滚动相关
    scrollTop: 0,
    scrollIntoView: ''
  },

  onLoad(options) {
    // 获取聊天参数
    const { chatId, targetUserId, orderId } = options;
    
    this.setData({
      chatId: chatId || '',
      targetUserId: targetUserId || '',
      orderId: orderId || ''
    });
    
    // 初始化页面
    this.initPage();
  },

  onShow() {
    // 标记消息为已读
    this.markMessagesAsRead();
  },

  onHide() {
    // 停止语音播放
    this.stopAllVoice();
  },

  onUnload() {
    // 清理资源
    this.cleanup();
  },

  // 初始化页面
  async initPage() {
    try {
      this.setData({ loading: true, loadingText: '加载聊天记录...' });
      
      // 获取用户信息
      const userInfo = app.globalData.userInfo || {};
      this.setData({ userInfo });
      
      // 获取目标用户信息
      await this.getTargetUserInfo();
      
      // 加载聊天记录
      await this.loadChatHistory();
      
      // 滚动到底部
      this.scrollToBottom();
      
      this.setData({ loading: false });
      
    } catch (error) {
      console.error('初始化聊天页面失败:', error);
      this.setData({ loading: false });
      this.showError('加载聊天记录失败');
    }
  },

  // 获取目标用户信息
  async getTargetUserInfo() {
    try {
      const response = await api.getUserInfo(this.data.targetUserId);
      
      if (response.success) {
        this.setData({ targetUserInfo: response.data });
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: response.data.nickname || '聊天'
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  // 加载聊天记录
  async loadChatHistory() {
    try {
      const response = await api.getChatHistory({
        chatId: this.data.chatId,
        targetUserId: this.data.targetUserId,
        page: 1,
        limit: 50
      });
      
      if (response.success) {
        const messages = this.formatMessages(response.data.messages || []);
        this.setData({ messages });
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      throw error;
    }
  },

  // 格式化消息
  formatMessages(messages) {
    return messages.map((message, index) => {
      const prevMessage = messages[index - 1];
      const showTime = this.shouldShowTime(message, prevMessage);
      
      return {
        ...message,
        type: message.senderId === this.data.userInfo.id ? 'sent' : 'received',
        showTime,
        timeText: showTime ? util.formatMessageTime(message.createdAt) : '',
        playing: false
      };
    });
  },

  // 判断是否显示时间
  shouldShowTime(current, previous) {
    if (!previous) return true;
    
    const currentTime = new Date(current.createdAt).getTime();
    const previousTime = new Date(previous.createdAt).getTime();
    
    // 超过5分钟显示时间
    return currentTime - previousTime > 5 * 60 * 1000;
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
    
    // 发送正在输入状态
    this.sendTypingStatus();
  },

  // 发送正在输入状态
  sendTypingStatus() {
    // 防抖处理
    clearTimeout(this.typingTimer);
    
    // 发送正在输入状态给对方
    this.typingTimer = setTimeout(() => {
      // 这里可以通过WebSocket发送正在输入状态
    }, 1000);
  },

  // 切换输入类型
  onToggleInputType() {
    const inputType = this.data.inputType === 'text' ? 'voice' : 'text';
    this.setData({ 
      inputType,
      showToolbar: false
    });
  },

  // 切换工具栏
  onToggleToolbar() {
    this.setData({ 
      showToolbar: !this.data.showToolbar
    });
  },

  // 发送文本消息
  async onSendText() {
    const text = this.data.inputText.trim();
    
    if (!text) {
      return;
    }
    
    // 清空输入框
    this.setData({ inputText: '' });
    
    // 创建消息对象
    const message = {
      id: Date.now().toString(),
      messageType: 'text',
      content: text,
      senderId: this.data.userInfo.id,
      receiverId: this.data.targetUserId,
      type: 'sent',
      status: 'sending',
      createdAt: new Date().toISOString(),
      showTime: false
    };
    
    // 添加到消息列表
    this.addMessage(message);
    
    try {
      // 发送消息
      const response = await api.sendMessage({
        chatId: this.data.chatId,
        targetUserId: this.data.targetUserId,
        messageType: 'text',
        content: text
      });
      
      if (response.success) {
        // 更新消息状态
        this.updateMessageStatus(message.id, 'sent');
      } else {
        this.updateMessageStatus(message.id, 'failed');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      this.updateMessageStatus(message.id, 'failed');
    }
  },

  // 开始录音
  onStartRecord() {
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.startRecording();
            },
            fail: () => {
              this.showError('需要录音权限才能发送语音消息');
            }
          });
        } else {
          this.startRecording();
        }
      }
    });
  },

  // 开始录音
  startRecording() {
    this.setData({ 
      isRecording: true,
      recordStartTime: Date.now()
    });
    
    // 开始录音
    this.recorderManager = wx.getRecorderManager();
    
    this.recorderManager.onStart(() => {
      console.log('开始录音');
    });
    
    this.recorderManager.onStop((res) => {
      console.log('录音结束:', res);
      this.handleRecordResult(res);
    });
    
    this.recorderManager.onError((error) => {
      console.error('录音错误:', error);
      this.setData({ isRecording: false });
      this.showError('录音失败，请重试');
    });
    
    this.recorderManager.start({
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });
  },

  // 结束录音
  onEndRecord() {
    if (!this.data.isRecording) return;
    
    const duration = Date.now() - this.data.recordStartTime;
    
    this.setData({ isRecording: false });
    
    // 录音时间太短
    if (duration < 1000) {
      this.recorderManager.stop();
      this.showError('录音时间太短');
      return;
    }
    
    this.recorderManager.stop();
  },

  // 取消录音
  onCancelRecord() {
    if (!this.data.isRecording) return;
    
    this.setData({ isRecording: false });
    this.recorderManager.stop();
  },

  // 处理录音结果
  async handleRecordResult(result) {
    try {
      const duration = Math.floor(result.duration / 1000);
      
      // 上传语音文件
      const uploadResult = await this.uploadVoiceFile(result.tempFilePath);
      
      if (uploadResult.success) {
        // 发送语音消息
        const message = {
          id: Date.now().toString(),
          messageType: 'voice',
          content: uploadResult.data.url,
          duration: duration,
          senderId: this.data.userInfo.id,
          receiverId: this.data.targetUserId,
          type: 'sent',
          status: 'sending',
          createdAt: new Date().toISOString(),
          showTime: false
        };
        
        this.addMessage(message);
        
        // 发送到服务器
        const response = await api.sendMessage({
          chatId: this.data.chatId,
          targetUserId: this.data.targetUserId,
          messageType: 'voice',
          content: uploadResult.data.url,
          duration: duration
        });
        
        if (response.success) {
          this.updateMessageStatus(message.id, 'sent');
        } else {
          this.updateMessageStatus(message.id, 'failed');
        }
      }
    } catch (error) {
      console.error('发送语音消息失败:', error);
      this.showError('发送语音消息失败');
    }
  },

  // 上传语音文件
  async uploadVoiceFile(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBase}/upload/voice`,
        filePath: filePath,
        name: 'voice',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject
      });
    });
  },

  // 播放语音
  onPlayVoice(e) {
    const message = e.currentTarget.dataset.message;
    
    // 停止其他语音播放
    this.stopAllVoice();
    
    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext();
    
    audioContext.src = message.content;
    
    audioContext.onPlay(() => {
      this.updateMessagePlaying(message.id, true);
    });
    
    audioContext.onEnded(() => {
      this.updateMessagePlaying(message.id, false);
    });
    
    audioContext.onError((error) => {
      console.error('语音播放失败:', error);
      this.updateMessagePlaying(message.id, false);
      this.showError('语音播放失败');
    });
    
    audioContext.play();
    
    this.currentAudio = audioContext;
  },

  // 停止所有语音播放
  stopAllVoice() {
    if (this.currentAudio) {
      this.currentAudio.stop();
      this.currentAudio.destroy();
      this.currentAudio = null;
    }
    
    // 重置所有消息的播放状态
    const messages = this.data.messages.map(msg => ({
      ...msg,
      playing: false
    }));
    
    this.setData({ messages });
  },

  // 更新消息播放状态
  updateMessagePlaying(messageId, playing) {
    const messages = this.data.messages.map(msg => ({
      ...msg,
      playing: msg.id === messageId ? playing : false
    }));
    
    this.setData({ messages });
  },

  // 选择图片
  onSelectImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.sendImageMessage(tempFilePath);
      },
      fail: (error) => {
        console.error('选择图片失败:', error);
      }
    });
    
    this.setData({ showToolbar: false });
  },

  // 发送图片消息
  async sendImageMessage(filePath) {
    try {
      // 创建消息对象
      const message = {
        id: Date.now().toString(),
        messageType: 'image',
        content: filePath, // 临时路径
        senderId: this.data.userInfo.id,
        receiverId: this.data.targetUserId,
        type: 'sent',
        status: 'sending',
        createdAt: new Date().toISOString(),
        showTime: false
      };
      
      this.addMessage(message);
      
      // 上传图片
      const uploadResult = await this.uploadImageFile(filePath);
      
      if (uploadResult.success) {
        // 更新消息内容为服务器URL
        this.updateMessageContent(message.id, uploadResult.data.url);
        
        // 发送到服务器
        const response = await api.sendMessage({
          chatId: this.data.chatId,
          targetUserId: this.data.targetUserId,
          messageType: 'image',
          content: uploadResult.data.url
        });
        
        if (response.success) {
          this.updateMessageStatus(message.id, 'sent');
        } else {
          this.updateMessageStatus(message.id, 'failed');
        }
      } else {
        this.updateMessageStatus(message.id, 'failed');
      }
    } catch (error) {
      console.error('发送图片消息失败:', error);
      this.showError('发送图片失败');
    }
  },

  // 上传图片文件
  async uploadImageFile(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBase}/upload/image`,
        filePath: filePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject
      });
    });
  },

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    
    // 收集所有图片URL
    const imageUrls = this.data.messages
      .filter(msg => msg.messageType === 'image')
      .map(msg => msg.content);
    
    wx.previewImage({
      current: url,
      urls: imageUrls
    });
  },

  // 分享位置
  onShareLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.sendLocationMessage(res);
      },
      fail: (error) => {
        console.error('选择位置失败:', error);
      }
    });
    
    this.setData({ showToolbar: false });
  },

  // 发送位置消息
  async sendLocationMessage(location) {
    try {
      const message = {
        id: Date.now().toString(),
        messageType: 'location',
        content: JSON.stringify(location),
        locationName: location.name,
        locationAddress: location.address,
        senderId: this.data.userInfo.id,
        receiverId: this.data.targetUserId,
        type: 'sent',
        status: 'sending',
        createdAt: new Date().toISOString(),
        showTime: false
      };
      
      this.addMessage(message);
      
      // 发送到服务器
      const response = await api.sendMessage({
        chatId: this.data.chatId,
        targetUserId: this.data.targetUserId,
        messageType: 'location',
        content: JSON.stringify(location)
      });
      
      if (response.success) {
        this.updateMessageStatus(message.id, 'sent');
      } else {
        this.updateMessageStatus(message.id, 'failed');
      }
    } catch (error) {
      console.error('发送位置消息失败:', error);
      this.showError('发送位置失败');
    }
  },

  // 查看位置
  onViewLocation(e) {
    const message = e.currentTarget.dataset.message;
    
    try {
      const location = JSON.parse(message.content);
      
      wx.openLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address
      });
    } catch (error) {
      console.error('查看位置失败:', error);
      this.showError('查看位置失败');
    }
  },

  // 语音通话
  onVoiceCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.targetUserInfo.phone || '',
      fail: (error) => {
        console.error('拨打电话失败:', error);
        this.showError('拨打电话失败');
      }
    });
    
    this.setData({ showToolbar: false });
  },

  // 重发消息
  onResendMessage(e) {
    const message = e.currentTarget.dataset.message;
    
    wx.showModal({
      title: '重发消息',
      content: '确定要重新发送这条消息吗？',
      success: (res) => {
        if (res.confirm) {
          this.resendMessage(message);
        }
      }
    });
  },

  // 重发消息
  async resendMessage(message) {
    try {
      // 更新消息状态
      this.updateMessageStatus(message.id, 'sending');
      
      // 重新发送
      const response = await api.sendMessage({
        chatId: this.data.chatId,
        targetUserId: this.data.targetUserId,
        messageType: message.messageType,
        content: message.content,
        duration: message.duration
      });
      
      if (response.success) {
        this.updateMessageStatus(message.id, 'sent');
      } else {
        this.updateMessageStatus(message.id, 'failed');
      }
    } catch (error) {
      console.error('重发消息失败:', error);
      this.updateMessageStatus(message.id, 'failed');
    }
  },

  // 添加消息
  addMessage(message) {
    const messages = [...this.data.messages, message];
    this.setData({ messages });
    this.scrollToBottom();
  },

  // 更新消息状态
  updateMessageStatus(messageId, status) {
    const messages = this.data.messages.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    );
    this.setData({ messages });
  },

  // 更新消息内容
  updateMessageContent(messageId, content) {
    const messages = this.data.messages.map(msg => 
      msg.id === messageId ? { ...msg, content } : msg
    );
    this.setData({ messages });
  },

  // 标记消息为已读
  async markMessagesAsRead() {
    try {
      await api.markMessagesAsRead({
        chatId: this.data.chatId,
        targetUserId: this.data.targetUserId
      });
    } catch (error) {
      console.error('标记消息已读失败:', error);
    }
  },

  // 滚动到底部
  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      this.setData({ 
        scrollIntoView: `message-${lastMessage.id}`
      });
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

  // 清理资源
  cleanup() {
    // 停止语音播放
    this.stopAllVoice();
    
    // 清除定时器
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    
    // 停止录音
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: `与${this.data.targetUserInfo.nickname || '用户'}的聊天`,
      path: `/pages/common/chat/chat?targetUserId=${this.data.targetUserId}`,
      imageUrl: '/images/share-chat.png'
    };
  }
});