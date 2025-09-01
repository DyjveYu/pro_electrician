# WebSocket连接问题诊断和修复指南

## 问题描述

小程序端WebSocket连接出现以下问题：
1. 连接成功后立即关闭
2. 错误代码：1005 ("no status rcvd")
3. 服务端显示：transport error

## 问题分析

### 1. 错误代码1005分析
- **含义**：WebSocket连接关闭时没有收到状态码
- **常见原因**：
  - 服务端主动关闭连接但未发送关闭状态码
  - 网络中断或代理服务器问题
  - 协议不匹配或握手失败

### 2. Transport Error分析
- **含义**：Socket.IO传输层错误
- **可能原因**：
  - WebSocket协议升级失败
  - CORS配置问题
  - 认证失败导致连接被拒绝
  - 小程序WebSocket实现与Socket.IO不兼容

## 已实施的修复措施

### 1. 服务端配置优化

```javascript
// api/app.js - Socket.IO配置优化
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // 支持多种传输方式
  allowEIO3: true,                      // 兼容Engine.IO v3
  pingTimeout: 60000,                   // 增加ping超时时间
  pingInterval: 25000,                  // 心跳间隔
  upgradeTimeout: 30000,                // 协议升级超时
  maxHttpBufferSize: 1e6               // 最大缓冲区大小
});
```

### 2. 客户端连接URL修正

```javascript
// miniprogram/utils/socketio-client.js
// 修正前：
// const url = `ws://localhost:3000/socket.io/?EIO=4&transport=websocket&token=${token}`;

// 修正后：
const baseUrl = config.API_BASE_URL.replace('http://', '').replace('https://', '');
const url = `ws://${baseUrl}/socket.io/?EIO=4&transport=websocket&token=${encodeURIComponent(token)}`;
```

### 3. 临时禁用WebSocket功能

为确保登录等核心功能正常工作，已添加WebSocket开关：

```javascript
// miniprogram/utils/config.js
WEBSOCKET: {
  ENABLED: false, // 临时禁用
  CONNECT_TIMEOUT: 10000,
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5
}
```

## 进一步诊断步骤

### 1. 检查网络连接

```javascript
// 在小程序中测试基础网络连接
wx.request({
  url: 'http://localhost:3000/health',
  method: 'GET',
  success: (res) => {
    console.log('HTTP连接正常:', res);
  },
  fail: (err) => {
    console.error('HTTP连接失败:', err);
  }
});
```

### 2. 验证认证Token

```javascript
// 检查token是否有效
const token = storage.getToken();
if (token) {
  // 解码JWT token检查是否过期
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.error('Token已过期');
    }
  } catch (error) {
    console.error('Token格式错误:', error);
  }
}
```

### 3. 测试Socket.IO握手

```javascript
// 手动测试Socket.IO握手过程
const testSocketIO = () => {
  const socket = wx.connectSocket({
    url: 'ws://localhost:3000/socket.io/?EIO=4&transport=polling',
    protocols: ['websocket']
  });
  
  socket.onOpen(() => {
    console.log('WebSocket连接成功');
    // 发送Engine.IO握手
    socket.send('2probe'); // PING
  });
  
  socket.onMessage((res) => {
    console.log('收到消息:', res.data);
  });
  
  socket.onError((error) => {
    console.error('连接错误:', error);
  });
  
  socket.onClose((res) => {
    console.log('连接关闭:', res);
  });
};
```

## 替代解决方案

### 1. 使用HTTP轮询替代WebSocket

```javascript
// 实现HTTP轮询获取实时数据
class PollingService {
  constructor() {
    this.interval = null;
    this.pollingInterval = 5000; // 5秒轮询一次
  }
  
  start() {
    this.interval = setInterval(() => {
      this.pollForUpdates();
    }, this.pollingInterval);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  async pollForUpdates() {
    try {
      const response = await api.get('/api/updates');
      // 处理更新数据
      this.handleUpdates(response.data);
    } catch (error) {
      console.error('轮询失败:', error);
    }
  }
}
```

### 2. 使用小程序原生WebSocket

```javascript
// 简化的WebSocket实现
class SimpleWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }
  
  connect() {
    const token = storage.getToken();
    
    this.socket = wx.connectSocket({
      url: `ws://localhost:3000/ws?token=${token}`,
      protocols: ['websocket']
    });
    
    this.socket.onOpen(() => {
      this.isConnected = true;
      console.log('WebSocket连接成功');
    });
    
    this.socket.onMessage((res) => {
      this.handleMessage(JSON.parse(res.data));
    });
    
    this.socket.onClose(() => {
      this.isConnected = false;
      console.log('WebSocket连接关闭');
    });
    
    this.socket.onError((error) => {
      console.error('WebSocket错误:', error);
    });
  }
  
  send(data) {
    if (this.isConnected) {
      this.socket.send(JSON.stringify(data));
    }
  }
}
```

## 服务端WebSocket路由

如果使用原生WebSocket，需要在服务端添加WebSocket路由：

```javascript
// api/routes/websocket.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: async (info) => {
      try {
        const url = new URL(info.req.url, 'http://localhost');
        const token = url.searchParams.get('token');
        
        if (!token) return false;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user) return false;
        
        info.req.user = user;
        return true;
      } catch (error) {
        return false;
      }
    }
  });
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket连接成功:', req.user.id);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleWebSocketMessage(ws, message, req.user);
      } catch (error) {
        console.error('消息解析失败:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket连接关闭:', req.user.id);
    });
  });
};
```

## 启用WebSocket的步骤

当问题解决后，按以下步骤重新启用WebSocket：

1. **修改配置**：
   ```javascript
   // miniprogram/utils/config.js
   WEBSOCKET: {
     ENABLED: true, // 启用WebSocket
     // ... 其他配置
   }
   ```

2. **测试连接**：
   - 先在开发工具中测试
   - 确认连接稳定后再发布

3. **监控日志**：
   - 观察服务端日志
   - 检查客户端连接状态

4. **渐进式启用**：
   - 可以添加用户级别的开关
   - 逐步为用户启用WebSocket功能

## 监控和日志

### 服务端监控

```javascript
// 添加WebSocket连接监控
const monitorWebSocket = (io) => {
  let connectionCount = 0;
  
  io.on('connection', (socket) => {
    connectionCount++;
    console.log(`WebSocket连接数: ${connectionCount}`);
    
    socket.on('disconnect', () => {
      connectionCount--;
      console.log(`WebSocket连接数: ${connectionCount}`);
    });
  });
  
  // 定期报告连接状态
  setInterval(() => {
    console.log(`当前WebSocket连接数: ${connectionCount}`);
  }, 60000);
};
```

### 客户端监控

```javascript
// 添加连接状态监控
const monitorConnection = () => {
  const startTime = Date.now();
  
  return {
    onConnect: () => {
      const duration = Date.now() - startTime;
      console.log(`WebSocket连接耗时: ${duration}ms`);
    },
    
    onDisconnect: (reason) => {
      const duration = Date.now() - startTime;
      console.log(`WebSocket连接持续时间: ${duration}ms, 断开原因: ${reason}`);
    }
  };
};
```

## 总结

当前已实施的措施：
1. ✅ 优化服务端Socket.IO配置
2. ✅ 修正客户端连接URL
3. ✅ 临时禁用WebSocket功能
4. ✅ 添加配置开关和错误处理

建议的后续步骤：
1. 🔄 使用HTTP轮询作为临时替代方案
2. 🔄 逐步测试和修复WebSocket连接问题
3. 🔄 考虑使用原生WebSocket替代Socket.IO
4. 🔄 添加完善的监控和日志系统

通过这些措施，确保了应用的核心功能（登录、工单管理等）不受WebSocket问题影响，同时为后续的WebSocket修复提供了基础。