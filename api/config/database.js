const { Sequelize } = require('sequelize');
require('dotenv').config();

// 数据库配置
const config = {
  development: {
    storage: './database.sqlite',
    dialect: 'sqlite',
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'mysql',
    timezone: '+08:00',
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// 创建Sequelize实例
const sequelize = new Sequelize({
  ...dbConfig
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection
};