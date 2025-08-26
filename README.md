# 电工维修平台微信小程序

一个基于微信小程序的O2O电工维修服务平台，连接有维修需求的用户和专业电工。

## 项目特性

- 🔧 **双角色设计**: 用户端和电工端统一在同一小程序内
- 📱 **微信小程序**: 原生开发，流畅体验
- 🚀 **实时通信**: WebSocket + 微信订阅消息
- 💰 **在线支付**: 微信支付集成
- 🎨 **现代UI**: 蓝色主题，符合小程序设计规范
- 🔐 **安全认证**: JWT + 微信授权登录

## 技术栈

### 前端
- 微信小程序原生开发
- WeUI组件库
- WebSocket客户端

### 后端
- Node.js + Express.js
- MySQL 8.0 数据库
- Sequelize ORM
- Socket.io WebSocket服务
- JWT身份认证
- 微信支付API

## 项目结构

```
pro_electrician/
├── api/                    # 后端服务
│   ├── app.js             # 应用入口
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── models/           # 数据模型
│   ├── routes/           # 路由定义
│   ├── middleware/       # 中间件
│   ├── services/         # 业务服务
│   └── utils/            # 工具函数
├── miniprogram/          # 微信小程序前端
│   ├── app.js            # 小程序入口
│   ├── app.json          # 小程序配置
│   ├── pages/            # 页面文件
│   ├── components/       # 组件文件
│   ├── utils/            # 工具函数
│   └── styles/           # 样式文件
├── uploads/              # 文件上传目录
├── logs/                 # 日志文件
└── docs/                 # 文档
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- 微信开发者工具

### 安装依赖

```bash
npm install
```

### 配置环境变量

1. 复制环境变量模板文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入实际配置信息

### 数据库初始化

1. 创建数据库：
```sql
CREATE DATABASE pro_electrician CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 运行数据库迁移（启动服务时自动创建表结构）

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 微信小程序开发

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 配置小程序AppID
3. 编译运行

## 核心功能

### 用户端功能
- 微信授权登录
- 创建维修工单
- 查看工单状态
- 在线支付
- 评价电工服务

### 电工端功能
- 实名认证注册
- 查看可接工单
- 抢单接单
- 录入维修内容和金额
- 完成工单

### 管理后台
- 用户管理
- 电工认证审核
- 工单监控
- 数据统计

## API文档

### 认证接口
- `POST /api/auth/wechat-login` - 微信登录
- `POST /api/auth/bind-phone` - 绑定手机号

### 工单接口
- `POST /api/orders` - 创建工单
- `GET /api/orders` - 获取工单列表
- `POST /api/orders/:id/grab` - 电工抢单

### 支付接口
- `POST /api/payments` - 创建支付订单
- `POST /api/payments/notify` - 支付回调

## 部署说明

### 服务器部署

1. 安装PM2进程管理器：
```bash
npm install -g pm2
```

2. 启动应用：
```bash
pm2 start api/app.js --name pro-electrician
```

### 微信小程序发布

1. 在微信开发者工具中点击"上传"
2. 在微信公众平台提交审核
3. 审核通过后发布

## 许可证

MIT License

## 联系我们

如有问题或建议，请联系开发团队。