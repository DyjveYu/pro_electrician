const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  payment_no: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '支付单号'
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联工单ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '支付用户ID'
  },
  electrician_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '收款电工ID'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '支付金额'
  },
  platform_fee: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00,
    comment: '平台手续费'
  },
  electrician_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '电工实收金额'
  },
  payment_method: {
    type: DataTypes.ENUM('wechat', 'alipay', 'balance'),
    allowNull: false,
    comment: '支付方式'
  },
  payment_channel: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '支付渠道'
  },
  status: {
    type: DataTypes.ENUM(
      'pending',    // 待支付
      'processing', // 处理中
      'success',    // 支付成功
      'failed',     // 支付失败
      'cancelled',  // 已取消
      'refunded',   // 已退款
      'partial_refunded' // 部分退款
    ),
    defaultValue: 'pending',
    comment: '支付状态'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '第三方交易号'
  },
  prepay_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '微信预支付ID'
  },
  out_trade_no: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '商户订单号'
  },
  trade_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '交易类型'
  },
  openid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '用户openid'
  },
  bank_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '银行类型'
  },
  settlement_status: {
    type: DataTypes.ENUM('pending', 'settled', 'failed'),
    defaultValue: 'pending',
    comment: '结算状态'
  },
  settled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '结算时间'
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: '退款金额'
  },
  refund_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '退款原因'
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '退款时间'
  },
  callback_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '支付回调数据'
  },
  notify_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '支付通知URL'
  },
  return_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '支付返回URL'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付过期时间'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付完成时间'
  },
  failed_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '支付失败原因'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '重试次数'
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
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['payment_no']
    },
    {
      fields: ['order_id']
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
      fields: ['payment_method']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['out_trade_no']
    },
    {
      fields: ['settlement_status']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeCreate: (payment) => {
      // 生成支付单号
      if (!payment.payment_no) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        payment.payment_no = `PAY${timestamp}${random}`;
      }
      
      // 生成商户订单号
      if (!payment.out_trade_no) {
        payment.out_trade_no = payment.payment_no;
      }
      
      // 设置过期时间（默认30分钟）
      if (!payment.expire_time) {
        payment.expire_time = new Date(Date.now() + 30 * 60 * 1000);
      }
    },
    beforeUpdate: (payment) => {
      payment.updated_at = new Date();
    }
  }
});

// 实例方法
Payment.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 隐藏敏感信息
  delete values.callback_data;
  
  // 格式化时间字段
  const timeFields = [
    'expire_time', 'paid_at', 'settled_at', 'refunded_at',
    'created_at', 'updated_at'
  ];
  
  timeFields.forEach(field => {
    if (values[field]) {
      values[field] = values[field].toISOString();
    }
  });
  
  return values;
};

// 更新支付状态
Payment.prototype.updateStatus = function(status, additionalData = {}) {
  const updates = { status, ...additionalData };
  
  // 根据状态自动设置时间戳
  switch (status) {
    case 'success':
      updates.paid_at = new Date();
      break;
    case 'refunded':
    case 'partial_refunded':
      if (!this.refunded_at) {
        updates.refunded_at = new Date();
      }
      break;
  }
  
  return this.update(updates);
};

// 检查是否过期
Payment.prototype.isExpired = function() {
  return this.expire_time && new Date() > this.expire_time;
};

// 计算平台手续费
Payment.prototype.calculatePlatformFee = function(feeRate = 0.006) {
  return Math.round(this.amount * feeRate * 100) / 100;
};

// 处理退款
Payment.prototype.processRefund = function(refundAmount, reason) {
  const updates = {
    refund_amount: (parseFloat(this.refund_amount) || 0) + parseFloat(refundAmount),
    refund_reason: reason,
    refunded_at: new Date()
  };
  
  // 判断是全额退款还是部分退款
  if (updates.refund_amount >= this.amount) {
    updates.status = 'refunded';
  } else {
    updates.status = 'partial_refunded';
  }
  
  return this.update(updates);
};

// 类方法
Payment.findByOrderId = function(orderId) {
  return this.findOne({ where: { order_id: orderId } });
};

Payment.findByTransactionId = function(transactionId) {
  return this.findOne({ where: { transaction_id: transactionId } });
};

Payment.findByOutTradeNo = function(outTradeNo) {
  return this.findOne({ where: { out_trade_no: outTradeNo } });
};

Payment.findPendingPayments = function(options = {}) {
  return this.findAll({
    where: {
      status: 'pending',
      expire_time: {
        [require('sequelize').Op.gt]: new Date()
      },
      ...options.where
    },
    order: [['created_at', 'ASC']],
    ...options
  });
};

Payment.findExpiredPayments = function(options = {}) {
  return this.findAll({
    where: {
      status: 'pending',
      expire_time: {
        [require('sequelize').Op.lt]: new Date()
      },
      ...options.where
    },
    ...options
  });
};

Payment.getStatistics = async function(startDate = null, endDate = null, electricianId = null) {
  const where = {
    status: 'success'
  };
  
  if (startDate && endDate) {
    where.paid_at = {
      [require('sequelize').Op.between]: [startDate, endDate]
    };
  }
  
  if (electricianId) {
    where.electrician_id = electricianId;
  }
  
  const stats = await this.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', '*'), 'total_count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('SUM', sequelize.col('platform_fee')), 'total_platform_fee'],
      [sequelize.fn('SUM', sequelize.col('electrician_amount')), 'total_electrician_amount'],
      [sequelize.fn('AVG', sequelize.col('amount')), 'avg_amount']
    ],
    raw: true
  });
  
  return stats[0];
};

// 自动取消过期支付
Payment.cancelExpiredPayments = async function() {
  const expiredPayments = await this.findExpiredPayments();
  
  for (const payment of expiredPayments) {
    await payment.updateStatus('cancelled', {
      failed_reason: '支付超时自动取消'
    });
  }
  
  return expiredPayments.length;
};

module.exports = Payment;