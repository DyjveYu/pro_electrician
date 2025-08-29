// test-socketio.js
// 测试Socket.IO连接的脚本

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// 模拟JWT配置
const jwtConfig = {
  secret: 'your-secret-key', // 应该与后端配置一致
  expiresIn: '24h'
};

// 生成测试token
const testToken = jwt.sign(
  {
    userId: 'test-user-123',
    userType: 'user'
  },
  jwtConfig.secret,
  { expiresIn: jwtConfig.expiresIn }
);

console.log('生成的测试token:', testToken);

// 连接Socket.IO服务器
const socket = io('http://localhost:3000', {
  auth: {
    token: testToken
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Socket.IO连接成功, ID:', socket.id);
  
  // 发送认证信息
  socket.emit('auth', {
    token: testToken
  });
  
  // 测试加入房间
  socket.emit('join-room', 'test-room');
  
  // 测试发送消息
  socket.emit('send_message', {
    type: 'text',
    content: '这是一条测试消息',
    target: 'test-target'
  });
  
  // 测试心跳
  socket.emit('heartbeat');
});

socket.on('connected', (data) => {
  console.log('🎉 服务器确认连接:', data);
});

socket.on('heartbeat_ack', (data) => {
  console.log('💓 心跳响应:', data);
});

socket.on('error', (error) => {
  console.error('❌ Socket.IO错误:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 连接断开:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ 连接错误:', error.message);
});

// 监听所有事件
socket.onAny((eventName, ...args) => {
  console.log('📨 收到事件:', eventName, args);
});

// 5秒后断开连接
setTimeout(() => {
  console.log('🛑 主动断开连接');
  socket.disconnect();
  process.exit(0);
}, 5000);

console.log('🚀 开始测试Socket.IO连接...');