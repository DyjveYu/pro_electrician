const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  openid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '微信openid'
  },
  unionid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '微信unionid'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: '手机号码'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '真实姓名'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '微信昵称'
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '头像URL'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'unknown'),
    defaultValue: 'unknown',
    comment: '性别'
  },
  user_type: {
    type: DataTypes.ENUM('user', 'electrician', 'admin'),
    defaultValue: 'user',
    comment: '用户类型：普通用户、电工、管理员'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
    comment: '账户状态'
  },
  id_card: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '身份证号码'
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '地址'
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '城市'
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '省份'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['openid']
    },
    {
      unique: true,
      fields: ['phone'],
      where: {
        phone: {
          [require('sequelize').Op.ne]: null
        }
      }
    },
    {
      fields: ['user_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['city']
    }
  ],
  hooks: {
    beforeUpdate: (user) => {
      user.updated_at = new Date();
    }
  }
});

// 实例方法
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 隐藏敏感信息
  delete values.openid;
  delete values.unionid;
  
  // 格式化时间
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }
  if (values.last_login_at) {
    values.last_login_at = values.last_login_at.toISOString();
  }
  
  return values;
};

// 类方法
User.findByOpenid = function(openid) {
  return this.findOne({ where: { openid } });
};

User.findByPhone = function(phone) {
  return this.findOne({ where: { phone } });
};

User.findElectricians = function(options = {}) {
  return this.findAll({
    where: {
      user_type: 'electrician',
      status: 'active',
      ...options.where
    },
    ...options
  });
};

User.updateLastLogin = async function(userId) {
  return this.update(
    { last_login_at: new Date() },
    { where: { id: userId } }
  );
};

module.exports = User;