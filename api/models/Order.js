const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_no: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '工单编号'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  electrician_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '电工ID'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '工单标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '问题描述'
  },
  category: {
    type: DataTypes.ENUM('lighting', 'socket', 'switch', 'circuit', 'appliance', 'other'),
    allowNull: false,
    comment: '故障类型：照明、插座、开关、线路、电器、其他'
  },
  priority: {
    type: DataTypes.ENUM('normal', 'urgent', 'emergency'),
    defaultValue: 'normal',
    comment: '优先级：普通、紧急、特急'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',      // 待接单
      'accepted',     // 已接单
      'confirmed',    // 已确认（电工到场）
      'quoted',       // 已报价
      'quote_confirmed', // 报价已确认
      'in_progress',  // 进行中
      'completed',    // 已完成
      'paid',         // 已支付
      'rated',        // 已评价
      'cancelled'     // 已取消
    ),
    defaultValue: 'pending',
    comment: '工单状态'
  },
  contact_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '联系人姓名'
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '联系电话'
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '服务地址'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: '纬度'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: '经度'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '问题图片'
  },
  estimated_amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: '预估金额'
  },
  quoted_amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: '报价金额'
  },
  final_amount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: '最终金额'
  },
  quote_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '报价说明'
  },
  work_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '维修内容'
  },
  work_images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '维修过程图片'
  },
  completion_images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '完工图片'
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '预约时间'
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '接单时间'
  },
  arrived_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '到场时间'
  },
  quoted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '报价时间'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始维修时间'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancel_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '取消原因'
  },
  cancel_by: {
    type: DataTypes.ENUM('user', 'electrician', 'system'),
    allowNull: true,
    comment: '取消方'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '用户评分（1-5）'
  },
  rating_comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '评价内容'
  },
  rated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '评价时间'
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed'),
    defaultValue: 'pending',
    comment: '支付状态'
  },
  payment_method: {
    type: DataTypes.ENUM('wechat', 'alipay', 'cash'),
    allowNull: true,
    comment: '支付方式'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '支付交易号'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['order_no']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['electrician_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['category']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['latitude', 'longitude']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeCreate: (order) => {
      // 生成工单编号
      if (!order.order_no) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        order.order_no = `WO${timestamp}${random}`;
      }
    },
    beforeUpdate: (order) => {
      order.updated_at = new Date();
    }
  }
});

// 实例方法
Order.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间字段
  const timeFields = [
    'scheduled_time', 'accepted_at', 'arrived_at', 'quoted_at',
    'started_at', 'completed_at', 'cancelled_at', 'rated_at',
    'paid_at', 'created_at', 'updated_at'
  ];
  
  timeFields.forEach(field => {
    if (values[field]) {
      values[field] = values[field].toISOString();
    }
  });
  
  return values;
};

// 更新状态
Order.prototype.updateStatus = function(status, additionalData = {}) {
  const updates = { status, ...additionalData };
  
  // 根据状态自动设置时间戳
  switch (status) {
    case 'accepted':
      updates.accepted_at = new Date();
      break;
    case 'confirmed':
      updates.arrived_at = new Date();
      break;
    case 'quoted':
      updates.quoted_at = new Date();
      break;
    case 'in_progress':
      updates.started_at = new Date();
      break;
    case 'completed':
      updates.completed_at = new Date();
      break;
    case 'cancelled':
      updates.cancelled_at = new Date();
      break;
    case 'rated':
      updates.rated_at = new Date();
      break;
    case 'paid':
      updates.paid_at = new Date();
      break;
  }
  
  return this.update(updates);
};

// 计算距离
Order.prototype.calculateDistance = function(electricianLat, electricianLng) {
  if (!this.latitude || !this.longitude) return null;
  
  const R = 6371; // 地球半径（公里）
  const dLat = (electricianLat - this.latitude) * Math.PI / 180;
  const dLon = (electricianLng - this.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.latitude * Math.PI / 180) * Math.cos(electricianLat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 类方法
Order.findPending = function(options = {}) {
  return this.findAll({
    where: {
      status: 'pending',
      ...options.where
    },
    order: [['priority', 'DESC'], ['created_at', 'ASC']],
    ...options
  });
};

Order.findByElectrician = function(electricianId, options = {}) {
  return this.findAll({
    where: {
      electrician_id: electricianId,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Order.findByUser = function(userId, options = {}) {
  return this.findAll({
    where: {
      user_id: userId,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Order.findNearby = function(latitude, longitude, radius = 10, options = {}) {
  const sql = `
    SELECT *, (
      6371 * acos(
        cos(radians(?)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      )
    ) AS distance
    FROM orders
    WHERE status = 'pending'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    HAVING distance <= ?
    ORDER BY priority DESC, distance ASC
  `;
  
  return sequelize.query(sql, {
    replacements: [latitude, longitude, latitude, radius],
    model: this,
    mapToModel: true
  });
};

Order.getStatistics = async function(electricianId = null, startDate = null, endDate = null) {
  const where = {};
  if (electricianId) where.electrician_id = electricianId;
  if (startDate && endDate) {
    where.created_at = {
      [require('sequelize').Op.between]: [startDate, endDate]
    };
  }
  
  const stats = await this.findAll({
    where,
    attributes: [
      'status',
      [sequelize.fn('COUNT', '*'), 'count'],
      [sequelize.fn('SUM', sequelize.col('final_amount')), 'total_amount']
    ],
    group: ['status'],
    raw: true
  });
  
  return stats;
};

module.exports = Order;