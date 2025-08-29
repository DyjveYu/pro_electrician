// pages/test/socketio-test.js
// Socket.IO连接测试页面

const socketIOClient = require('../../utils/socketio-client');
const storage = require('../../utils/storage');

Page({
  data: {
    connectionStatus: '未连接',
    messages: [],
    testResults: []
  },

  onLoad() {
    console.log('Socket.IO测试页面加载');
    this.initSocketIO();
  },

  onUnload() {
    // 页面卸载时断开连接
    socketIOClient.disconnect();
  },

  /**
   * 初始化Socket.IO
   */
  initSocketIO() {
    // 设置测试token
    storage.setToken('test-token-123');
    
    // 监听连接状态
    socketIOClient.onConnection((status) => {
      this.setData({
        connectionStatus: status === 'connected' ? '已连接' : '未连接'
      });
      
      this.addTestResult(`连接状态变更: ${status}`);
    });
    
    // 监听错误
    socketIOClient.onError((error) => {
      this.addTestResult(`连接错误: ${error.message || error}`);
    });
    
    // 监听服务器确认连接
    socketIOClient.on('connected', (data) => {
      this.addTestResult(`服务器确认连接: ${JSON.stringify(data)}`);
    });
    
    // 监听心跳响应
    socketIOClient.on('heartbeat_ack', (data) => {
      this.addTestResult(`心跳响应: ${JSON.stringify(data)}`);
    });
    
    // 监听测试消息
    socketIOClient.on('test_message', (data) => {
      this.addTestResult(`收到测试消息: ${JSON.stringify(data)}`);
    });
  },

  /**
   * 连接Socket.IO
   */
  connectSocketIO() {
    this.addTestResult('开始连接Socket.IO...');
    socketIOClient.connect();
  },

  /**
   * 断开Socket.IO连接
   */
  disconnectSocketIO() {
    this.addTestResult('断开Socket.IO连接...');
    socketIOClient.disconnect();
  },

  /**
   * 发送测试消息
   */
  sendTestMessage() {
    const message = {
      type: 'test',
      content: '这是一条测试消息',
      timestamp: Date.now()
    };
    
    this.addTestResult(`发送测试消息: ${JSON.stringify(message)}`);
    socketIOClient.emit('test_message', message);
  },

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    this.addTestResult('发送心跳...');
    socketIOClient.emit('heartbeat');
  },

  /**
   * 加入测试房间
   */
  joinTestRoom() {
    this.addTestResult('加入测试房间...');
    socketIOClient.emit('join-room', 'test-room');
  },

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    const status = socketIOClient.getConnectionStatus();
    this.addTestResult(`连接状态: ${JSON.stringify(status)}`);
  },

  /**
   * 清除测试结果
   */
  clearTestResults() {
    this.setData({
      testResults: []
    });
  },

  /**
   * 添加测试结果
   */
  addTestResult(message) {
    const timestamp = new Date().toLocaleTimeString();
    const result = `[${timestamp}] ${message}`;
    
    this.setData({
      testResults: [...this.data.testResults, result]
    });
    
    console.log(result);
  },

  /**
   * 复制测试结果
   */
  copyTestResults() {
    const results = this.data.testResults.join('\n');
    wx.setClipboardData({
      data: results,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  }
});