const { sequelize } = require('../config/database');

// 导入所有模型
const User = require('./User');
const Electrician = require('./Electrician');
const Order = require('./Order');
const Payment = require('./Payment');
const Review = require('./Review');

// 建立模型关联关系

// 用户与电工信息的关联（一对一）
User.hasOne(Electrician, {
  foreignKey: 'user_id',
  as: 'electricianInfo',
  onDelete: 'CASCADE'
});
Electrician.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});

// 用户与工单的关联（一对多）
User.hasMany(Order, {
  foreignKey: 'user_id',
  as: 'orders',
  onDelete: 'CASCADE'
});
Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});

// 电工与工单的关联（一对多）
Electrician.hasMany(Order, {
  foreignKey: 'electrician_id',
  as: 'orders',
  onDelete: 'SET NULL'
});
Order.belongsTo(Electrician, {
  foreignKey: 'electrician_id',
  as: 'electrician',
  onDelete: 'SET NULL'
});

// 工单与支付的关联（一对一）
Order.hasOne(Payment, {
  foreignKey: 'order_id',
  as: 'payment',
  onDelete: 'CASCADE'
});
Payment.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'CASCADE'
});

// 用户与支付的关联（一对多）
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments',
  onDelete: 'CASCADE'
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});

// 电工与支付的关联（一对多）
Electrician.hasMany(Payment, {
  foreignKey: 'electrician_id',
  as: 'payments',
  onDelete: 'SET NULL'
});
Payment.belongsTo(Electrician, {
  foreignKey: 'electrician_id',
  as: 'electrician',
  onDelete: 'SET NULL'
});

// 工单与评价的关联（一对一）
Order.hasOne(Review, {
  foreignKey: 'order_id',
  as: 'review',
  onDelete: 'CASCADE'
});
Review.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'CASCADE'
});

// 用户与评价的关联（一对多）
User.hasMany(Review, {
  foreignKey: 'user_id',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});

// 电工与评价的关联（一对多）
Electrician.hasMany(Review, {
  foreignKey: 'electrician_id',
  as: 'reviews',
  onDelete: 'CASCADE'
});
Review.belongsTo(Electrician, {
  foreignKey: 'electrician_id',
  as: 'electrician',
  onDelete: 'CASCADE'
});

// 数据库同步函数
const syncDatabase = async (force = false) => {
  try {
    console.log('🔄 开始同步数据库模型...');
    
    // 按依赖顺序同步表
    await User.sync({ force });
    console.log('✅ User 表同步完成');
    
    await Electrician.sync({ force });
    console.log('✅ Electrician 表同步完成');
    
    await Order.sync({ force });
    console.log('✅ Order 表同步完成');
    
    await Payment.sync({ force });
    console.log('✅ Payment 表同步完成');
    
    await Review.sync({ force });
    console.log('✅ Review 表同步完成');
    
    console.log('🎉 数据库模型同步完成！');
    
    // 如果是强制同步，创建一些初始数据
    if (force) {
      await createInitialData();
    }
    
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

// 创建初始数据
const createInitialData = async () => {
  try {
    console.log('🔄 创建初始数据...');
    
    // 创建管理员用户
    const adminUser = await User.findOrCreate({
      where: { openid: 'admin_openid' },
      defaults: {
        openid: 'admin_openid',
        phone: '13800138000',
        name: '系统管理员',
        nickname: '管理员',
        user_type: 'admin',
        status: 'active'
      }
    });
    
    if (adminUser[1]) {
      console.log('✅ 管理员用户创建完成');
    }
    
    // 创建测试用户
    const testUser = await User.findOrCreate({
      where: { openid: 'test_user_openid' },
      defaults: {
        openid: 'test_user_openid',
        phone: '13800138001',
        name: '测试用户',
        nickname: '测试用户',
        user_type: 'user',
        status: 'active',
        city: '北京市',
        province: '北京市'
      }
    });
    
    if (testUser[1]) {
      console.log('✅ 测试用户创建完成');
    }
    
    // 创建测试电工
    const testElectrician = await User.findOrCreate({
      where: { openid: 'test_electrician_openid' },
      defaults: {
        openid: 'test_electrician_openid',
        phone: '13800138002',
        name: '张师傅',
        nickname: '张师傅',
        user_type: 'electrician',
        status: 'active',
        city: '北京市',
        province: '北京市'
      }
    });
    
    if (testElectrician[1]) {
      // 创建电工信息
      await Electrician.findOrCreate({
        where: { user_id: testElectrician[0].id },
        defaults: {
          user_id: testElectrician[0].id,
          certificate_number: 'DG202400001',
          certificate_type: 'low_voltage',
          experience_years: 5,
          specialties: ['家庭电路维修', '照明安装', '开关插座'],
          service_areas: ['朝阳区', '海淀区', '东城区'],
          work_status: 'available',
          verification_status: 'approved',
          rating: 4.8,
          emergency_available: true,
          min_order_amount: 50.00,
          introduction: '专业电工，5年经验，服务态度好，技术过硬。'
        }
      });
      
      console.log('✅ 测试电工创建完成');
    }
    
    console.log('🎉 初始数据创建完成！');
    
  } catch (error) {
    console.error('❌ 创建初始数据失败:', error);
  }
};

// 检查数据库连接
const checkConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
};

// 关闭数据库连接
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
  }
};

// 获取数据库状态
const getDatabaseStatus = async () => {
  try {
    const result = await sequelize.query('SELECT 1 as status');
    return {
      connected: true,
      version: await sequelize.databaseVersion(),
      dialect: sequelize.getDialect(),
      models: Object.keys(sequelize.models)
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = {
  sequelize,
  User,
  Electrician,
  Order,
  Payment,
  Review,
  syncDatabase,
  createInitialData,
  checkConnection,
  closeConnection,
  getDatabaseStatus
};