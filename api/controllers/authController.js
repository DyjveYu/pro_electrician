const { User, Electrician } = require('../models');
const { CustomError, asyncHandler } = require('../middleware/errorHandler');
const { businessLogger } = require('../middleware/logger');
const { generateToken, isValidPhone } = require('../utils/helpers');
const { miniProgramLogin } = require('../utils/wechat');

/**
 * 微信小程序登录
 */
const wechatLogin = asyncHandler(async (req, res) => {
  const { code, userInfo } = req.body;
  
  if (!code) {
    throw new CustomError('缺少微信登录code', 400);
  }
  
  // 调用微信接口获取用户信息
  const wechatData = await miniProgramLogin(code);
  
  // 查找或创建用户
  let user = await User.findByOpenid(wechatData.openid);
  
  if (!user) {
    // 创建新用户
    user = await User.create({
      openid: wechatData.openid,
      unionid: wechatData.unionid,
      nickname: userInfo?.nickName,
      avatar: userInfo?.avatarUrl,
      gender: userInfo?.gender === 1 ? 'male' : userInfo?.gender === 2 ? 'female' : 'unknown',
      user_type: 'user',
      status: 'active'
    });
    
    businessLogger('user_register', {
      userId: user.id,
      method: 'wechat',
      userInfo: userInfo
    }, user.id);
  } else {
    // 更新用户信息
    if (userInfo) {
      await user.update({
        nickname: userInfo.nickName || user.nickname,
        avatar: userInfo.avatarUrl || user.avatar,
        gender: userInfo.gender === 1 ? 'male' : userInfo.gender === 2 ? 'female' : user.gender,
        last_login_at: new Date()
      });
    } else {
      await User.updateLastLogin(user.id);
    }
    
    businessLogger('user_login', {
      userId: user.id,
      method: 'wechat'
    }, user.id);
  }
  
  // 生成JWT令牌
  const token = generateToken({
    userId: user.id,
    openid: user.openid,
    userType: user.user_type
  });
  
  // 如果是电工，获取电工信息
  let electricianInfo = null;
  if (user.user_type === 'electrician') {
    electricianInfo = await Electrician.findOne({
      where: { user_id: user.id }
    });
  }
  
  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      refreshToken: token, // 暂时使用相同的token作为refreshToken
      user: user.toJSON(),
      electricianInfo: electricianInfo?.toJSON()
    }
  });
});

/**
 * 绑定手机号
 */
const bindPhone = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  const userId = req.user.id;
  
  if (!phone || !isValidPhone(phone)) {
    throw new CustomError('手机号格式不正确', 400);
  }
  
  if (!code) {
    throw new CustomError('缺少验证码', 400);
  }
  
  // TODO: 验证短信验证码
  // 这里应该验证短信验证码的有效性
  
  // 检查手机号是否已被其他用户绑定
  const existingUser = await User.findByPhone(phone);
  if (existingUser && existingUser.id !== userId) {
    throw new CustomError('该手机号已被其他用户绑定', 409);
  }
  
  // 更新用户手机号
  const user = await User.findByPk(userId);
  await user.update({ phone });
  
  businessLogger('phone_bind', {
    userId,
    phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }, userId);
  
  res.json({
    success: true,
    message: '手机号绑定成功',
    data: {
      user: user.toJSON()
    }
  });
});

/**
 * 手机号登录
 */
const phoneLogin = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  
  if (!phone || !isValidPhone(phone)) {
    throw new CustomError('手机号格式不正确', 400);
  }
  
  // 临时注释掉验证码验证，方便测试
  // if (!code) {
  //   throw new CustomError('缺少验证码', 400);
  // }
  
  // TODO: 验证短信验证码（暂时注释掉）
  
  // 查找用户
  const user = await User.findByPhone(phone);
  if (!user) {
    throw new CustomError('用户不存在', 404);
  }
  
  // 更新最后登录时间
  await User.updateLastLogin(user.id);
  
  // 生成JWT令牌
  const token = generateToken({
    userId: user.id,
    openid: user.openid,
    userType: user.user_type
  });
  
  // 如果是电工，获取电工信息
  let electricianInfo = null;
  if (user.user_type === 'electrician') {
    electricianInfo = await Electrician.findOne({
      where: { user_id: user.id }
    });
  }
  
  businessLogger('user_login', {
    userId: user.id,
    method: 'phone'
  }, user.id);
  
  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: user.toJSON(),
      electricianInfo: electricianInfo?.toJSON()
    }
  });
});

/**
 * 发送短信验证码
 */
const sendSmsCode = asyncHandler(async (req, res) => {
  const { phone, type = 'login' } = req.body;
  
  if (!phone || !isValidPhone(phone)) {
    throw new CustomError('手机号格式不正确', 400);
  }
  
  // TODO: 实现短信验证码发送逻辑（暂时注释掉）
  // 这里应该调用短信服务商API发送验证码
  
  // 生成6位数字验证码（暂时注释掉实际发送逻辑）
  // const code = Math.random().toString().slice(-6);
  
  // TODO: 将验证码存储到Redis或数据库，设置5分钟过期时间
  
  businessLogger('sms_send', {
    phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    type
  });
  
  res.json({
    success: true,
    message: '验证码发送成功（测试模式）',
    data: {
      // 测试模式直接返回成功，不实际发送验证码
      code: '123456'
    }
  });
});

/**
 * 获取当前用户信息
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new CustomError('用户不存在', 404);
  }
  
  // 如果是电工，获取电工信息
  let electricianInfo = null;
  if (user.user_type === 'electrician') {
    electricianInfo = await Electrician.findOne({
      where: { user_id: user.id }
    });
  }
  
  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      electricianInfo: electricianInfo?.toJSON()
    }
  });
});

/**
 * 更新用户信息
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, avatar, address, city, province } = req.body;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new CustomError('用户不存在', 404);
  }
  
  // 更新用户信息
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (province !== undefined) updateData.province = province;
  
  await user.update(updateData);
  
  businessLogger('profile_update', updateData, userId);
  
  res.json({
    success: true,
    message: '用户信息更新成功',
    data: {
      user: user.toJSON()
    }
  });
});

/**
 * 申请成为电工
 */
const applyElectrician = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    realName,
    idCard,
    phone,
    certificateNumber,
    startDate,
    endDate,
    serviceAreas,
    city,
    address
  } = req.body;
  
  // 验证必填字段
  if (!realName || !idCard || !phone || !certificateNumber || !startDate || !endDate) {
    throw new CustomError('请填写完整的申请信息', 400);
  }
  
  // 检查用户是否已经是电工
  const user = await User.findByPk(userId);
  if (user.user_type === 'electrician') {
    throw new CustomError('您已经是电工用户', 400);
  }
  
  // 检查电工证编号是否已存在
  const existingElectrician = await Electrician.findOne({
    where: { certificate_number: certificateNumber }
  });
  if (existingElectrician) {
    throw new CustomError('该电工证编号已被使用', 409);
  }
  
  // 更新用户基本信息
  await user.update({
    name: realName,
    id_card: idCard,
    phone,
    city,
    address,
    user_type: 'electrician'
  });
  
  // 创建电工信息
  const electricianInfo = await Electrician.create({
    user_id: userId,
    certificate_number: certificateNumber,
    certificate_type: 'low_voltage',
    certificate_start_date: startDate,
    certificate_expiry_date: endDate,
    service_areas: serviceAreas || [],
    verification_status: 'pending',
    work_status: 'offline'
  });
  
  businessLogger('electrician_apply', {
    userId,
    certificateNumber,
    startDate,
    endDate
  }, userId);
  
  res.json({
    success: true,
    message: '电工申请提交成功，请等待审核',
    data: {
      user: user.toJSON(),
      electricianInfo: electricianInfo.toJSON()
    }
  });
});

/**
 * 刷新令牌
 */
const refreshToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    throw new CustomError('用户不存在', 404);
  }
  
  // 生成新的JWT令牌
  const token = generateToken({
    userId: user.id,
    openid: user.openid,
    userType: user.user_type
  });
  
  res.json({
    success: true,
    message: '令牌刷新成功',
    data: {
      token
    }
  });
});

/**
 * 注销登录
 */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  businessLogger('user_logout', { userId }, userId);
  
  res.json({
    success: true,
    message: '注销成功'
  });
});

module.exports = {
  wechatLogin,
  bindPhone,
  phoneLogin,
  sendSmsCode,
  getCurrentUser,
  updateProfile,
  applyElectrician,
  refreshToken,
  logout
};