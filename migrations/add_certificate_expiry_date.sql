-- 添加电工证有效期限字段
ALTER TABLE electricians 
ADD COLUMN certificate_expiry_date DATE COMMENT '电工证有效期限';

-- 更新现有记录的默认值（可选）
-- UPDATE electricians SET certificate_expiry_date = DATE_ADD(CURDATE(), INTERVAL 3 YEAR) WHERE certificate_expiry_date IS NULL;