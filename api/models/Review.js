const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联工单ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '评价用户ID'
  },
  electrician_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '被评价电工ID'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: '总体评分（1-5分）'
  },
  service_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: '服务态度评分'
  },
  skill_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: '技术水平评分'
  },
  punctuality_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: '准时性评分'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '评价内容'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '评价标签'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '评价图片'
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否匿名评价'
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否显示评价'
  },
  reply_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '电工回复内容'
  },
  replied_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '回复时间'
  },
  helpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '有用数量'
  },
  report_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '举报次数'
  },
  status: {
    type: DataTypes.ENUM('normal', 'hidden', 'deleted'),
    defaultValue: 'normal',
    comment: '评价状态'
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
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['order_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['electrician_id']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_visible']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeUpdate: (review) => {
      review.updated_at = new Date();
    }
  }
});

// 实例方法
Review.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间字段
  const timeFields = ['replied_at', 'created_at', 'updated_at'];
  timeFields.forEach(field => {
    if (values[field]) {
      values[field] = values[field].toISOString();
    }
  });
  
  return values;
};

// 添加回复
Review.prototype.addReply = function(replyContent) {
  return this.update({
    reply_content: replyContent,
    replied_at: new Date()
  });
};

// 增加有用数
Review.prototype.incrementHelpful = function() {
  return this.update({
    helpful_count: this.helpful_count + 1
  });
};

// 增加举报数
Review.prototype.incrementReport = function() {
  return this.update({
    report_count: this.report_count + 1
  });
};

// 隐藏评价
Review.prototype.hide = function() {
  return this.update({
    status: 'hidden',
    is_visible: false
  });
};

// 显示评价
Review.prototype.show = function() {
  return this.update({
    status: 'normal',
    is_visible: true
  });
};

// 类方法
Review.findByElectrician = function(electricianId, options = {}) {
  return this.findAll({
    where: {
      electrician_id: electricianId,
      status: 'normal',
      is_visible: true,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Review.findByUser = function(userId, options = {}) {
  return this.findAll({
    where: {
      user_id: userId,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Review.findByOrder = function(orderId) {
  return this.findOne({ where: { order_id: orderId } });
};

Review.getElectricianStats = async function(electricianId) {
  const stats = await this.findAll({
    where: {
      electrician_id: electricianId,
      status: 'normal',
      is_visible: true
    },
    attributes: [
      [sequelize.fn('COUNT', '*'), 'total_reviews'],
      [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
      [sequelize.fn('AVG', sequelize.col('service_rating')), 'avg_service_rating'],
      [sequelize.fn('AVG', sequelize.col('skill_rating')), 'avg_skill_rating'],
      [sequelize.fn('AVG', sequelize.col('punctuality_rating')), 'avg_punctuality_rating'],
      [sequelize.fn('SUM', sequelize.col('helpful_count')), 'total_helpful']
    ],
    raw: true
  });
  
  // 获取评分分布
  const ratingDistribution = await this.findAll({
    where: {
      electrician_id: electricianId,
      status: 'normal',
      is_visible: true
    },
    attributes: [
      'rating',
      [sequelize.fn('COUNT', '*'), 'count']
    ],
    group: ['rating'],
    order: [['rating', 'DESC']],
    raw: true
  });
  
  return {
    ...stats[0],
    rating_distribution: ratingDistribution
  };
};

Review.getTopElectricians = async function(limit = 10, minReviews = 5) {
  return this.findAll({
    where: {
      status: 'normal',
      is_visible: true
    },
    attributes: [
      'electrician_id',
      [sequelize.fn('COUNT', '*'), 'review_count'],
      [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']
    ],
    group: ['electrician_id'],
    having: sequelize.where(
      sequelize.fn('COUNT', '*'),
      '>=',
      minReviews
    ),
    order: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'DESC'],
      [sequelize.fn('COUNT', '*'), 'DESC']
    ],
    limit,
    raw: true
  });
};

Review.getRecentReviews = function(limit = 20, options = {}) {
  return this.findAll({
    where: {
      status: 'normal',
      is_visible: true,
      ...options.where
    },
    order: [['created_at', 'DESC']],
    limit,
    ...options
  });
};

Review.getTagStatistics = async function(electricianId = null) {
  const where = {
    status: 'normal',
    is_visible: true,
    tags: {
      [require('sequelize').Op.ne]: null
    }
  };
  
  if (electricianId) {
    where.electrician_id = electricianId;
  }
  
  const reviews = await this.findAll({
    where,
    attributes: ['tags'],
    raw: true
  });
  
  // 统计标签出现次数
  const tagCounts = {};
  reviews.forEach(review => {
    if (review.tags && Array.isArray(review.tags)) {
      review.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  // 转换为数组并排序
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

// 批量更新电工评分
Review.updateElectricianRating = async function(electricianId) {
  const stats = await this.getElectricianStats(electricianId);
  
  if (stats.total_reviews > 0) {
    const Electrician = require('./Electrician');
    await Electrician.update(
      { rating: parseFloat(stats.avg_rating).toFixed(2) },
      { where: { id: electricianId } }
    );
  }
  
  return stats;
};

module.exports = Review;