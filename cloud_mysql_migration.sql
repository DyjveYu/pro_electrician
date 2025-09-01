-- 云MySQL数据库迁移脚本
-- 适用于阿里云RDS MySQL、腾讯云MySQL等云数据库
-- 创建时间: 2024-01-20
-- 说明: 生产环境数据库迁移脚本，不包含测试数据

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果需要）
-- CREATE DATABASE IF NOT EXISTS `electrician_platform` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `electrician_platform`;

-- 删除已存在的表（按依赖关系倒序）
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `electricians`;
DROP TABLE IF EXISTS `users`;

-- ==========================================
-- 创建用户表
-- ==========================================
CREATE TABLE `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    `openid` VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
    `unionid` VARCHAR(100) COMMENT '微信unionid',
    `phone` VARCHAR(20) UNIQUE COMMENT '手机号码',
    `name` VARCHAR(50) COMMENT '真实姓名',
    `nickname` VARCHAR(50) COMMENT '微信昵称',
    `avatar` VARCHAR(500) COMMENT '头像URL',
    `gender` ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
    `user_type` ENUM('user', 'electrician', 'admin') DEFAULT 'user' COMMENT '用户类型',
    `status` ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '账户状态',
    `id_card` VARCHAR(20) COMMENT '身份证号码',
    `address` VARCHAR(200) COMMENT '地址',
    `city` VARCHAR(50) COMMENT '城市',
    `province` VARCHAR(50) COMMENT '省份',
    `last_login_at` DATETIME COMMENT '最后登录时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建用户表索引
CREATE INDEX `idx_users_openid` ON `users`(`openid`);
CREATE INDEX `idx_users_phone` ON `users`(`phone`);
CREATE INDEX `idx_users_user_type` ON `users`(`user_type`);
CREATE INDEX `idx_users_status` ON `users`(`status`);
CREATE INDEX `idx_users_city` ON `users`(`city`);

-- ==========================================
-- 创建电工表
-- ==========================================
CREATE TABLE `electricians` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '电工ID',
    `user_id` INT NOT NULL UNIQUE COMMENT '关联用户ID',
    `certificate_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '电工证编号',
    `certificate_type` ENUM('low_voltage', 'high_voltage', 'special') NOT NULL COMMENT '电工证类型',
    `certificate_images` JSON COMMENT '电工证照片URLs',
    `experience_years` INT NOT NULL DEFAULT 0 COMMENT '从业年限',
    `specialties` JSON COMMENT '专业技能领域',
    `service_areas` JSON COMMENT '服务区域',
    `work_status` ENUM('available', 'busy', 'offline') DEFAULT 'offline' COMMENT '工作状态',
    `verification_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '认证状态',
    `verification_note` TEXT COMMENT '审核备注',
    `rating` DECIMAL(3,2) DEFAULT 5.00 COMMENT '评分（1-5分）',
    `total_orders` INT DEFAULT 0 COMMENT '总接单数',
    `completed_orders` INT DEFAULT 0 COMMENT '完成订单数',
    `total_earnings` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总收入',
    `current_latitude` DECIMAL(10,8) COMMENT '当前纬度',
    `current_longitude` DECIMAL(11,8) COMMENT '当前经度',
    `location_updated_at` DATETIME COMMENT '位置更新时间',
    `emergency_available` BOOLEAN DEFAULT FALSE COMMENT '是否接受紧急工单',
    `min_order_amount` DECIMAL(8,2) DEFAULT 50.00 COMMENT '最低接单金额',
    `introduction` TEXT COMMENT '个人介绍',
    `work_images` JSON COMMENT '工作照片展示',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT `fk_electricians_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='电工表';

-- 创建电工表索引
CREATE INDEX `idx_electricians_user_id` ON `electricians`(`user_id`);
CREATE INDEX `idx_electricians_certificate_number` ON `electricians`(`certificate_number`);
CREATE INDEX `idx_electricians_verification_status` ON `electricians`(`verification_status`);
CREATE INDEX `idx_electricians_work_status` ON `electricians`(`work_status`);
CREATE INDEX `idx_electricians_rating` ON `electricians`(`rating` DESC);
CREATE INDEX `idx_electricians_location` ON `electricians`(`current_latitude`, `current_longitude`);
CREATE INDEX `idx_electricians_emergency_available` ON `electricians`(`emergency_available`);

-- ==========================================
-- 创建工单表
-- ==========================================
CREATE TABLE `orders` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '工单ID',
    `order_no` VARCHAR(20) UNIQUE NOT NULL COMMENT '工单编号',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `electrician_id` INT COMMENT '电工ID',
    `title` VARCHAR(100) NOT NULL COMMENT '工单标题',
    `description` TEXT NOT NULL COMMENT '故障描述',
    `fault_type` ENUM('circuit', 'appliance', 'lighting', 'installation', 'maintenance', 'emergency', 'other') NOT NULL COMMENT '故障类型',
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
    `status` ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired') DEFAULT 'pending' COMMENT '工单状态',
    `contact_phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
    `contact_name` VARCHAR(50) COMMENT '联系人姓名',
    `address` VARCHAR(200) NOT NULL COMMENT '服务地址',
    `latitude` DECIMAL(10,8) COMMENT '纬度',
    `longitude` DECIMAL(11,8) COMMENT '经度',
    `images` JSON COMMENT '故障图片URLs',
    `estimated_amount` DECIMAL(8,2) COMMENT '预估金额',
    `quoted_amount` DECIMAL(8,2) COMMENT '报价金额',
    `actual_amount` DECIMAL(8,2) COMMENT '实际金额',
    `repair_content` TEXT COMMENT '维修内容描述',
    `repair_images` JSON COMMENT '维修完成图片URLs',
    `scheduled_at` DATETIME COMMENT '预约服务时间',
    `accepted_at` DATETIME COMMENT '接单时间',
    `started_at` DATETIME COMMENT '开始服务时间',
    `completed_at` DATETIME COMMENT '完成时间',
    `cancelled_at` DATETIME COMMENT '取消时间',
    `cancel_reason` TEXT COMMENT '取消原因',
    `cancel_by` ENUM('user', 'electrician', 'system') COMMENT '取消方',
    `rating` INT COMMENT '用户评分（1-5分）',
    `payment_status` ENUM('unpaid', 'paid', 'refunded', 'partial_refund') DEFAULT 'unpaid' COMMENT '支付状态',
    `payment_method` ENUM('wechat', 'alipay', 'cash', 'bank_transfer') COMMENT '支付方式',
    `transaction_id` VARCHAR(100) COMMENT '支付交易号',
    `paid_at` DATETIME COMMENT '支付时间',
    `notes` TEXT COMMENT '备注信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_orders_electrician_id` FOREIGN KEY (`electrician_id`) REFERENCES `electricians`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单表';

-- 创建工单表索引
CREATE UNIQUE INDEX `idx_orders_order_no` ON `orders`(`order_no`);
CREATE INDEX `idx_orders_user_id` ON `orders`(`user_id`);
CREATE INDEX `idx_orders_electrician_id` ON `orders`(`electrician_id`);
CREATE INDEX `idx_orders_status` ON `orders`(`status`);
CREATE INDEX `idx_orders_fault_type` ON `orders`(`fault_type`);
CREATE INDEX `idx_orders_priority` ON `orders`(`priority`);
CREATE INDEX `idx_orders_payment_status` ON `orders`(`payment_status`);
CREATE INDEX `idx_orders_created_at` ON `orders`(`created_at` DESC);
CREATE INDEX `idx_orders_location` ON `orders`(`latitude`, `longitude`);
CREATE INDEX `idx_orders_scheduled_at` ON `orders`(`scheduled_at`);

-- ==========================================
-- 创建支付表
-- ==========================================
CREATE TABLE `payments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '支付ID',
    `payment_number` VARCHAR(32) UNIQUE NOT NULL COMMENT '支付单号',
    `order_id` INT NOT NULL COMMENT '关联工单ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `electrician_id` INT COMMENT '电工ID',
    `amount` DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    `payment_method` ENUM('wechat', 'alipay', 'cash', 'bank_transfer') NOT NULL COMMENT '支付方式',
    `status` ENUM('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partial_refund') DEFAULT 'pending' COMMENT '支付状态',
    `transaction_id` VARCHAR(100) COMMENT '第三方交易号',
    `prepay_id` VARCHAR(100) COMMENT '预支付交易会话标识',
    `paid_at` DATETIME COMMENT '支付完成时间',
    `refund_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '退款金额',
    `refund_reason` TEXT COMMENT '退款原因',
    `refund_transaction_id` VARCHAR(100) COMMENT '退款交易号',
    `refunded_at` DATETIME COMMENT '退款时间',
    `platform_fee` DECIMAL(10,2) DEFAULT 0.00 COMMENT '平台手续费',
    `electrician_amount` DECIMAL(10,2) COMMENT '电工实收金额',
    `notes` TEXT COMMENT '支付备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT `fk_payments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_payments_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_payments_electrician_id` FOREIGN KEY (`electrician_id`) REFERENCES `electricians`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付表';

-- 创建支付表索引
CREATE UNIQUE INDEX `idx_payments_payment_number` ON `payments`(`payment_number`);
CREATE INDEX `idx_payments_order_id` ON `payments`(`order_id`);
CREATE INDEX `idx_payments_user_id` ON `payments`(`user_id`);
CREATE INDEX `idx_payments_electrician_id` ON `payments`(`electrician_id`);
CREATE INDEX `idx_payments_status` ON `payments`(`status`);
CREATE INDEX `idx_payments_payment_method` ON `payments`(`payment_method`);
CREATE INDEX `idx_payments_transaction_id` ON `payments`(`transaction_id`);
CREATE INDEX `idx_payments_created_at` ON `payments`(`created_at` DESC);
CREATE INDEX `idx_payments_paid_at` ON `payments`(`paid_at`);

-- ==========================================
-- 创建评价表
-- ==========================================
CREATE TABLE `reviews` (
    `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '评价ID',
    `order_id` INT NOT NULL UNIQUE COMMENT '关联工单ID',
    `user_id` INT NOT NULL COMMENT '用户ID',
    `electrician_id` INT NOT NULL COMMENT '电工ID',
    `service_rating` INT NOT NULL COMMENT '服务态度评分（1-5分）',
    `quality_rating` INT NOT NULL COMMENT '服务质量评分（1-5分）',
    `speed_rating` INT NOT NULL COMMENT '响应速度评分（1-5分）',
    `overall_rating` DECIMAL(3,2) NOT NULL COMMENT '综合评分（1-5分）',
    `content` TEXT COMMENT '评价内容',
    `tags` JSON COMMENT '评价标签',
    `images` JSON COMMENT '评价图片URLs',
    `is_anonymous` BOOLEAN DEFAULT FALSE COMMENT '是否匿名评价',
    `reply_content` TEXT COMMENT '电工回复内容',
    `reply_at` DATETIME COMMENT '回复时间',
    `helpful_count` INT DEFAULT 0 COMMENT '有用数',
    `report_count` INT DEFAULT 0 COMMENT '举报数',
    `status` ENUM('normal', 'hidden', 'deleted') DEFAULT 'normal' COMMENT '评价状态',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT `fk_reviews_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reviews_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reviews_electrician_id` FOREIGN KEY (`electrician_id`) REFERENCES `electricians`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- 创建评价表索引
CREATE UNIQUE INDEX `idx_reviews_order_id` ON `reviews`(`order_id`);
CREATE INDEX `idx_reviews_user_id` ON `reviews`(`user_id`);
CREATE INDEX `idx_reviews_electrician_id` ON `reviews`(`electrician_id`);
CREATE INDEX `idx_reviews_overall_rating` ON `reviews`(`overall_rating` DESC);
CREATE INDEX `idx_reviews_status` ON `reviews`(`status`);
CREATE INDEX `idx_reviews_created_at` ON `reviews`(`created_at` DESC);
CREATE INDEX `idx_reviews_is_anonymous` ON `reviews`(`is_anonymous`);

-- ==========================================
-- 创建管理员用户（生产环境必需）
-- ==========================================
INSERT INTO `users` (`openid`, `phone`, `name`, `nickname`, `user_type`, `status`, `city`, `province`) VALUES
('admin_openid_001', '13800000000', '系统管理员', '管理员', 'admin', 'active', '北京市', '北京市');

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 显示创建结果
SELECT 'Cloud MySQL migration completed successfully!' as message;
SELECT 'Tables created:' as info;
SHOW TABLES;

-- 显示表结构验证
SELECT 'Verifying table structures...' as verification;
SELECT 
    TABLE_NAME as '表名',
    TABLE_COMMENT as '表注释',
    TABLE_ROWS as '行数',
    DATA_LENGTH as '数据大小',
    INDEX_LENGTH as '索引大小'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;