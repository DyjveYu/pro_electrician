-- 电工维修平台数据库迁移脚本
-- 基于实际Sequelize模型生成
-- 适用于MySQL 8.0+

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `pro_electrician` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `pro_electrician`;

-- ============================================
-- 1. 用户表 (users)
-- ============================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '微信openid',
  `unionid` varchar(100) DEFAULT NULL COMMENT '微信unionid',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号码',
  `name` varchar(50) DEFAULT NULL COMMENT '真实姓名',
  `nickname` varchar(50) DEFAULT NULL COMMENT '微信昵称',
  `avatar` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `gender` enum('male','female','unknown') DEFAULT 'unknown' COMMENT '性别',
  `user_type` enum('user','electrician','admin') DEFAULT 'user' COMMENT '用户类型：普通用户、电工、管理员',
  `status` enum('active','inactive','banned') DEFAULT 'active' COMMENT '账户状态',
  `id_card` varchar(20) DEFAULT NULL COMMENT '身份证号码',
  `address` varchar(200) DEFAULT NULL COMMENT '地址',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `last_login_at` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_user_type` (`user_type`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 电工表 (electricians)
-- ============================================
DROP TABLE IF EXISTS `electricians`;
CREATE TABLE `electricians` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '电工ID',
  `user_id` int NOT NULL COMMENT '关联用户ID',
  `certificate_number` varchar(50) NOT NULL COMMENT '电工证编号',
  `certificate_type` enum('low_voltage','high_voltage','special') NOT NULL COMMENT '电工证类型：低压、高压、特种作业',
  `certificate_images` json DEFAULT NULL COMMENT '电工证照片URLs',
  `experience_years` int NOT NULL DEFAULT '0' COMMENT '从业年限',
  `specialties` json DEFAULT NULL COMMENT '专业技能领域',
  `service_areas` json DEFAULT NULL COMMENT '服务区域',
  `work_status` enum('available','busy','offline') DEFAULT 'offline' COMMENT '工作状态：可接单、忙碌中、离线',
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT '认证状态：待审核、已通过、已拒绝',
  `verification_note` text COMMENT '审核备注',
  `rating` decimal(3,2) DEFAULT '5.00' COMMENT '评分（1-5分）',
  `total_orders` int DEFAULT '0' COMMENT '总接单数',
  `completed_orders` int DEFAULT '0' COMMENT '完成订单数',
  `total_earnings` decimal(10,2) DEFAULT '0.00' COMMENT '总收入',
  `current_latitude` decimal(10,8) DEFAULT NULL COMMENT '当前纬度',
  `current_longitude` decimal(11,8) DEFAULT NULL COMMENT '当前经度',
  `location_updated_at` datetime DEFAULT NULL COMMENT '位置更新时间',
  `emergency_available` tinyint(1) DEFAULT '0' COMMENT '是否接受紧急工单',
  `min_order_amount` decimal(8,2) DEFAULT '50.00' COMMENT '最低接单金额',
  `introduction` text COMMENT '个人介绍',
  `work_images` json DEFAULT NULL COMMENT '工作照片展示',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `certificate_number` (`certificate_number`),
  KEY `idx_electricians_verification_status` (`verification_status`),
  KEY `idx_electricians_work_status` (`work_status`),
  KEY `idx_electricians_rating` (`rating` DESC),
  KEY `idx_electricians_location` (`current_latitude`,`current_longitude`),
  KEY `idx_electricians_emergency_available` (`emergency_available`),
  CONSTRAINT `electricians_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='电工表';

-- ============================================
-- 3. 工单表 (orders)
-- ============================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '工单ID',
  `order_no` varchar(32) NOT NULL COMMENT '工单编号',
  `user_id` int NOT NULL COMMENT '用户ID',
  `electrician_id` int DEFAULT NULL COMMENT '电工ID',
  `title` varchar(100) NOT NULL COMMENT '工单标题',
  `description` text NOT NULL COMMENT '问题描述',
  `category` enum('lighting','socket','switch','circuit','appliance','other') NOT NULL COMMENT '故障类型：照明、插座、开关、线路、电器、其他',
  `priority` enum('normal','urgent','emergency') DEFAULT 'normal' COMMENT '优先级：普通、紧急、特急',
  `status` enum('pending','accepted','confirmed','quoted','quote_confirmed','in_progress','completed','paid','rated','cancelled') DEFAULT 'pending' COMMENT '工单状态',
  `contact_name` varchar(50) NOT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `address` varchar(200) NOT NULL COMMENT '服务地址',
  `latitude` decimal(10,8) DEFAULT NULL COMMENT '纬度',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT '经度',
  `images` json DEFAULT NULL COMMENT '问题图片',
  `estimated_amount` decimal(8,2) DEFAULT NULL COMMENT '预估金额',
  `quoted_amount` decimal(8,2) DEFAULT NULL COMMENT '报价金额',
  `final_amount` decimal(8,2) DEFAULT NULL COMMENT '最终金额',
  `quote_note` text COMMENT '报价说明',
  `work_content` text COMMENT '维修内容',
  `work_images` json DEFAULT NULL COMMENT '维修过程图片',
  `completion_images` json DEFAULT NULL COMMENT '完工图片',
  `scheduled_time` datetime DEFAULT NULL COMMENT '预约时间',
  `accepted_at` datetime DEFAULT NULL COMMENT '接单时间',
  `arrived_at` datetime DEFAULT NULL COMMENT '到场时间',
  `quoted_at` datetime DEFAULT NULL COMMENT '报价时间',
  `started_at` datetime DEFAULT NULL COMMENT '开始维修时间',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `cancelled_at` datetime DEFAULT NULL COMMENT '取消时间',
  `cancel_reason` varchar(200) DEFAULT NULL COMMENT '取消原因',
  `cancel_by` enum('user','electrician','system') DEFAULT NULL COMMENT '取消方',
  `rating` int DEFAULT NULL COMMENT '用户评分（1-5）',
  `rating_comment` text COMMENT '评价内容',
  `rated_at` datetime DEFAULT NULL COMMENT '评价时间',
  `payment_status` enum('pending','paid','refunded','failed') DEFAULT 'pending' COMMENT '支付状态',
  `payment_method` enum('wechat','alipay','cash') DEFAULT NULL COMMENT '支付方式',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT '支付交易号',
  `paid_at` datetime DEFAULT NULL COMMENT '支付时间',
  `notes` text COMMENT '备注信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_electrician_id` (`electrician_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_priority` (`priority`),
  KEY `idx_orders_category` (`category`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_location` (`latitude`,`longitude`),
  KEY `idx_orders_created_at` (`created_at` DESC),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`electrician_id`) REFERENCES `electricians` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单表';

-- ============================================
-- 4. 支付表 (payments)
-- ============================================
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '支付ID',
  `payment_no` varchar(32) NOT NULL COMMENT '支付单号',
  `order_id` int NOT NULL COMMENT '关联工单ID',
  `user_id` int NOT NULL COMMENT '支付用户ID',
  `electrician_id` int NOT NULL COMMENT '收款电工ID',
  `amount` decimal(10,2) NOT NULL COMMENT '支付金额',
  `platform_fee` decimal(8,2) DEFAULT '0.00' COMMENT '平台手续费',
  `electrician_amount` decimal(10,2) NOT NULL COMMENT '电工实收金额',
  `payment_method` enum('wechat','alipay','balance') NOT NULL COMMENT '支付方式',
  `payment_channel` varchar(50) DEFAULT NULL COMMENT '支付渠道',
  `status` enum('pending','processing','success','failed','cancelled','refunded','partial_refunded') DEFAULT 'pending' COMMENT '支付状态',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT '第三方交易号',
  `prepay_id` varchar(100) DEFAULT NULL COMMENT '微信预支付ID',
  `out_trade_no` varchar(100) DEFAULT NULL COMMENT '商户订单号',
  `trade_type` varchar(20) DEFAULT NULL COMMENT '交易类型',
  `openid` varchar(100) DEFAULT NULL COMMENT '用户openid',
  `bank_type` varchar(50) DEFAULT NULL COMMENT '银行类型',
  `settlement_status` enum('pending','settled','failed') DEFAULT 'pending' COMMENT '结算状态',
  `settled_at` datetime DEFAULT NULL COMMENT '结算时间',
  `refund_amount` decimal(10,2) DEFAULT '0.00' COMMENT '退款金额',
  `refund_reason` varchar(200) DEFAULT NULL COMMENT '退款原因',
  `refunded_at` datetime DEFAULT NULL COMMENT '退款时间',
  `callback_data` json DEFAULT NULL COMMENT '支付回调数据',
  `notify_url` varchar(500) DEFAULT NULL COMMENT '支付通知URL',
  `return_url` varchar(500) DEFAULT NULL COMMENT '支付返回URL',
  `expire_time` datetime DEFAULT NULL COMMENT '支付过期时间',
  `paid_at` datetime DEFAULT NULL COMMENT '支付完成时间',
  `failed_reason` varchar(200) DEFAULT NULL COMMENT '支付失败原因',
  `retry_count` int DEFAULT '0' COMMENT '重试次数',
  `notes` text COMMENT '备注信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_no` (`payment_no`),
  KEY `idx_payments_order_id` (`order_id`),
  KEY `idx_payments_user_id` (`user_id`),
  KEY `idx_payments_electrician_id` (`electrician_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_payment_method` (`payment_method`),
  KEY `idx_payments_transaction_id` (`transaction_id`),
  KEY `idx_payments_settlement_status` (`settlement_status`),
  KEY `idx_payments_created_at` (`created_at` DESC),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`electrician_id`) REFERENCES `electricians` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付表';

-- ============================================
-- 5. 评价表 (reviews)
-- ============================================
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '评价ID',
  `order_id` int NOT NULL COMMENT '关联工单ID',
  `user_id` int NOT NULL COMMENT '评价用户ID',
  `electrician_id` int NOT NULL COMMENT '被评价电工ID',
  `rating` int NOT NULL COMMENT '总体评分（1-5分）',
  `service_rating` int DEFAULT NULL COMMENT '服务态度评分',
  `skill_rating` int DEFAULT NULL COMMENT '技术水平评分',
  `punctuality_rating` int DEFAULT NULL COMMENT '准时性评分',
  `comment` text COMMENT '评价内容',
  `tags` json DEFAULT NULL COMMENT '评价标签',
  `images` json DEFAULT NULL COMMENT '评价图片',
  `is_anonymous` tinyint(1) DEFAULT '0' COMMENT '是否匿名评价',
  `is_visible` tinyint(1) DEFAULT '1' COMMENT '是否显示评价',
  `reply_content` text COMMENT '电工回复内容',
  `replied_at` datetime DEFAULT NULL COMMENT '回复时间',
  `helpful_count` int DEFAULT '0' COMMENT '有用数量',
  `report_count` int DEFAULT '0' COMMENT '举报次数',
  `status` enum('normal','hidden','deleted') DEFAULT 'normal' COMMENT '评价状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `idx_reviews_user_id` (`user_id`),
  KEY `idx_reviews_electrician_id` (`electrician_id`),
  KEY `idx_reviews_rating` (`rating`),
  KEY `idx_reviews_status` (`status`),
  KEY `idx_reviews_is_visible` (`is_visible`),
  KEY `idx_reviews_created_at` (`created_at` DESC),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`electrician_id`) REFERENCES `electricians` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rating` CHECK ((`rating` >= 1) and (`rating` <= 5)),
  CONSTRAINT `chk_service_rating` CHECK ((`service_rating` >= 1) and (`service_rating` <= 5)),
  CONSTRAINT `chk_skill_rating` CHECK ((`skill_rating` >= 1) and (`skill_rating` <= 5)),
  CONSTRAINT `chk_punctuality_rating` CHECK ((`punctuality_rating` >= 1) and (`punctuality_rating` <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- ============================================
-- 6. 插入初始数据
-- ============================================

-- 插入测试管理员用户
INSERT INTO `users` (`openid`, `nickname`, `user_type`, `status`) VALUES 
('test_admin_openid', '系统管理员', 'admin', 'active'),
('test_user_openid', '测试用户', 'user', 'active'),
('test_electrician_openid', '测试电工', 'electrician', 'active');

-- 插入测试电工数据
INSERT INTO `electricians` (`user_id`, `certificate_number`, `certificate_type`, `experience_years`, `verification_status`, `work_status`) VALUES 
(3, 'DG202301001', 'low_voltage', 5, 'approved', 'available');

-- ============================================
-- 7. 恢复外键检查
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

-- 迁移完成提示
SELECT 'Database migration completed successfully!' as message;