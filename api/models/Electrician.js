const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Electrician = sequelize.define('Electrician', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联用户ID'
  },
  certificate_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '电工证编号'
  },
  certificate_type: {
    type: DataTypes.ENUM('low_voltage', 'high_voltage', 'special'),
    allowNull: false,
    comment: '电工证类型：低压、高压、特种作业'
  },
  certificate_images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '电工证照片URLs'
  },
  experience_years: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '从业年限'
  },
  specialties: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '专业技能领域'
  },
  service_areas: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '服务区域'
  },
  work_status: {
    type: DataTypes.ENUM('available', 'busy', 'offline'),
    defaultValue: 'offline',
    comment: '工作状态：可接单、忙碌中、离线'
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: '认证状态：待审核、已通过、已拒绝'
  },
  verification_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '审核备注'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 5.00,
    comment: '评分（1-5分）'
  },
  total_orders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总接单数'
  },
  completed_orders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '完成订单数'
  },
  total_earnings: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: '总收入'
  },
  current_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: '当前纬度'
  },
  current_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: '当前经度'
  },
  location_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '位置更新时间'
  },
  emergency_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否接受紧急工单'
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 50.00,
    comment: '最低接单金额'
  },
  introduction: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '个人介绍'
  },
  work_images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '工作照片展示'
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
  tableName: 'electricians',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    },
    {
      unique: true,
      fields: ['certificate_number']
    },
    {
      fields: ['verification_status']
    },
    {
      fields: ['work_status']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['current_latitude', 'current_longitude']
    },
    {
      fields: ['emergency_available']
    }
  ],
  hooks: {
    beforeUpdate: (electrician) => {
      electrician.updated_at = new Date();
    }
  }
});

// 实例方法
Electrician.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }
  if (values.location_updated_at) {
    values.location_updated_at = values.location_updated_at.toISOString();
  }
  
  return values;
};

// 更新位置
Electrician.prototype.updateLocation = function(latitude, longitude) {
  return this.update({
    current_latitude: latitude,
    current_longitude: longitude,
    location_updated_at: new Date()
  });
};

// 更新工作状态
Electrician.prototype.updateWorkStatus = function(status) {
  return this.update({ work_status: status });
};

// 增加订单统计
Electrician.prototype.incrementOrderStats = function(isCompleted = false, earnings = 0) {
  const updates = {
    total_orders: this.total_orders + 1
  };
  
  if (isCompleted) {
    updates.completed_orders = this.completed_orders + 1;
    updates.total_earnings = parseFloat(this.total_earnings) + parseFloat(earnings);
  }
  
  return this.update(updates);
};

// 类方法
Electrician.findAvailable = function(options = {}) {
  return this.findAll({
    where: {
      work_status: 'available',
      verification_status: 'approved',
      ...options.where
    },
    ...options
  });
};

Electrician.findByLocation = function(latitude, longitude, radius = 10, options = {}) {
  // 使用 Haversine 公式计算距离
  const sql = `
    SELECT *, (
      6371 * acos(
        cos(radians(?)) * cos(radians(current_latitude)) *
        cos(radians(current_longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(current_latitude))
      )
    ) AS distance
    FROM electricians
    WHERE verification_status = 'approved'
    AND work_status = 'available'
    AND current_latitude IS NOT NULL
    AND current_longitude IS NOT NULL
    HAVING distance <= ?
    ORDER BY distance ASC
  `;
  
  return sequelize.query(sql, {
    replacements: [latitude, longitude, latitude, radius],
    model: this,
    mapToModel: true
  });
};

Electrician.findForEmergency = function(latitude, longitude, radius = 20) {
  return this.findByLocation(latitude, longitude, radius, {
    where: {
      emergency_available: true
    }
  });
};

Electrician.updateRating = async function(electricianId, newRating) {
  const electrician = await this.findByPk(electricianId);
  if (!electrician) return null;
  
  // 这里可以实现更复杂的评分计算逻辑
  return electrician.update({ rating: newRating });
};

module.exports = Electrician;