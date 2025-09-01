-- 添加电工证日期字段
ALTER TABLE electricians 
ADD COLUMN certificate_start_date DATE COMMENT '电工证开始日期',
ADD COLUMN certificate_expiry_date DATE COMMENT '电工证截止日期';

-- 更新现有记录的默认值（可选）
-- UPDATE electricians SET certificate_start_date = CURDATE(), certificate_expiry_date = DATE_ADD(CURDATE(), INTERVAL 3 YEAR) WHERE certificate_start_date IS NULL;