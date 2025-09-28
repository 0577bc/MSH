-- MSH表单系统数据库初始化脚本
-- 数据库: msh_form_system
-- 版本: 1.0
-- 创建时间: 2025-09-29

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS msh_form_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE msh_form_system;

-- ==================== 用户表 ====================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT '用户UUID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) UNIQUE COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    real_name VARCHAR(50) COMMENT '真实姓名',
    nickname VARCHAR(50) COMMENT '花名',
    group_name VARCHAR(50) COMMENT '组别',
    role ENUM('admin', 'user', 'guest') DEFAULT 'user' COMMENT '角色',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    INDEX idx_uuid (uuid),
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_group (group_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ==================== 表单表 ====================
CREATE TABLE forms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT '表单UUID',
    title VARCHAR(200) NOT NULL COMMENT '表单标题',
    description TEXT COMMENT '表单描述',
    form_data JSON NOT NULL COMMENT '表单结构数据',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    allow_anonymous BOOLEAN DEFAULT FALSE COMMENT '允许匿名提交',
    max_submissions INT DEFAULT 0 COMMENT '最大提交次数(0=无限制)',
    start_date TIMESTAMP NULL COMMENT '开始时间',
    end_date TIMESTAMP NULL COMMENT '结束时间',
    created_by INT NOT NULL COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_uuid (uuid),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单表';

-- ==================== 表单提交表 ====================
CREATE TABLE form_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT '提交UUID',
    form_id INT NOT NULL COMMENT '表单ID',
    submitter_id INT NULL COMMENT '提交者ID(匿名提交为NULL)',
    submitter_name VARCHAR(100) COMMENT '提交者姓名',
    submitter_email VARCHAR(100) COMMENT '提交者邮箱',
    submitter_phone VARCHAR(20) COMMENT '提交者手机',
    submission_data JSON NOT NULL COMMENT '提交数据',
    status ENUM('pending', 'approved', 'rejected', 'archived') DEFAULT 'pending' COMMENT '状态',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    reviewed_at TIMESTAMP NULL COMMENT '审核时间',
    reviewed_by INT NULL COMMENT '审核者ID',
    review_notes TEXT COMMENT '审核备注',
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_uuid (uuid),
    INDEX idx_form_id (form_id),
    INDEX idx_submitter_id (submitter_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at),
    INDEX idx_reviewed_at (reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单提交表';

-- ==================== 跟踪事件表 ====================
CREATE TABLE tracking_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT '事件UUID',
    event_id VARCHAR(100) NOT NULL COMMENT '事件ID',
    member_uuid VARCHAR(36) NOT NULL COMMENT '成员UUID',
    member_name VARCHAR(100) NOT NULL COMMENT '成员姓名',
    group_name VARCHAR(50) NOT NULL COMMENT '组别',
    start_date DATE NOT NULL COMMENT '开始日期',
    consecutive_absences INT DEFAULT 0 COMMENT '连续缺勤次数',
    status ENUM('active', 'terminated', 'resolved') DEFAULT 'active' COMMENT '状态',
    termination_reason TEXT COMMENT '终止原因',
    termination_date TIMESTAMP NULL COMMENT '终止时间',
    resolution_date TIMESTAMP NULL COMMENT '解决时间',
    resolution_notes TEXT COMMENT '解决备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_uuid (uuid),
    INDEX idx_event_id (event_id),
    INDEX idx_member_uuid (member_uuid),
    INDEX idx_group_name (group_name),
    INDEX idx_start_date (start_date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跟踪事件表';

-- ==================== 系统配置表 ====================
CREATE TABLE system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description TEXT COMMENT '配置描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_config_key (config_key),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ==================== 操作日志表 ====================
CREATE TABLE operation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL COMMENT '操作用户ID',
    operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
    operation_description TEXT COMMENT '操作描述',
    target_type VARCHAR(50) COMMENT '目标类型',
    target_id VARCHAR(100) COMMENT '目标ID',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    request_data JSON COMMENT '请求数据',
    response_data JSON COMMENT '响应数据',
    status ENUM('success', 'failure', 'error') DEFAULT 'success' COMMENT '状态',
    error_message TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_target_type (target_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ==================== 复合索引 ====================
-- 用户表复合索引
CREATE INDEX idx_user_group_status ON users(group_name, status);
CREATE INDEX idx_user_created_at ON users(created_at, status);

-- 表单表复合索引
CREATE INDEX idx_form_status_created ON forms(status, created_at);
CREATE INDEX idx_form_public_status ON forms(is_public, status);

-- 提交表复合索引
CREATE INDEX idx_submission_form_status ON form_submissions(form_id, status);
CREATE INDEX idx_submission_date_status ON form_submissions(submitted_at, status);

-- 跟踪事件表复合索引
CREATE INDEX idx_tracking_group_status ON tracking_events(group_name, status);
CREATE INDEX idx_tracking_date_status ON tracking_events(start_date, status);

-- 查询优化索引
CREATE INDEX idx_forms_public_active ON forms(is_public, status, start_date, end_date);
CREATE INDEX idx_submissions_recent ON form_submissions(submitted_at DESC, status);
CREATE INDEX idx_tracking_active ON tracking_events(status, start_date, group_name);

-- ==================== 数据完整性约束 ====================
-- 邮箱格式检查
ALTER TABLE users ADD CONSTRAINT chk_email_format 
CHECK (email IS NULL OR email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

-- 手机号格式检查
ALTER TABLE users ADD CONSTRAINT chk_phone_format 
CHECK (phone IS NULL OR phone REGEXP '^1[3-9][0-9]{9}$');

-- 日期范围检查
ALTER TABLE forms ADD CONSTRAINT chk_date_range 
CHECK (end_date IS NULL OR end_date > start_date);

-- ==================== 初始化数据 ====================
-- 插入默认管理员用户
INSERT INTO users (uuid, username, password_hash, real_name, role, status) 
VALUES (
    UUID(), 
    'admin', 
    '$2b$10$example_hash_placeholder', 
    '系统管理员', 
    'admin', 
    'active'
);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_public) VALUES
('system_name', 'MSH表单系统', 'string', '系统名称', TRUE),
('max_file_size', '10485760', 'number', '最大文件大小(字节)', FALSE),
('allow_registration', 'true', 'boolean', '是否允许用户注册', TRUE),
('session_timeout', '3600', 'number', '会话超时时间(秒)', FALSE),
('max_submissions_per_user', '10', 'number', '每用户最大提交次数', FALSE),
('form_auto_approve', 'false', 'boolean', '表单自动审核', FALSE),
('notification_email', '', 'string', '通知邮箱', FALSE),
('backup_retention_days', '30', 'number', '备份保留天数', FALSE);

-- 插入示例表单
INSERT INTO forms (uuid, title, description, form_data, status, is_public, allow_anonymous, created_by) 
VALUES (
    UUID(),
    '主日跟踪事件处理表单',
    '用于处理MSH系统主日跟踪事件的表单',
    '{"fields":[{"type":"text","name":"member_name","label":"成员姓名","required":true},{"type":"text","name":"group_name","label":"组别","required":true},{"type":"date","name":"start_date","label":"开始日期","required":true},{"type":"number","name":"consecutive_absences","label":"连续缺勤次数","required":true},{"type":"textarea","name":"notes","label":"备注","required":false}]}',
    'published',
    TRUE,
    FALSE,
    1
);

-- ==================== 恢复外键检查 ====================
SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 创建视图 ====================
-- 用户统计视图
CREATE VIEW user_stats AS
SELECT 
    group_name,
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
FROM users 
GROUP BY group_name;

-- 表单统计视图
CREATE VIEW form_stats AS
SELECT 
    f.id,
    f.title,
    f.status,
    COUNT(s.id) as submission_count,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count
FROM forms f
LEFT JOIN form_submissions s ON f.id = s.form_id
GROUP BY f.id, f.title, f.status;

-- ==================== 创建存储过程 ====================
DELIMITER //

-- 清理过期日志的存储过程
CREATE PROCEDURE CleanupOldLogs(IN days_to_keep INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    DELETE FROM operation_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    COMMIT;
END //

-- 获取用户统计信息的存储过程
CREATE PROCEDURE GetUserStatistics()
BEGIN
    SELECT 
        'total_users' as metric,
        COUNT(*) as value
    FROM users
    UNION ALL
    SELECT 
        'active_users' as metric,
        COUNT(*) as value
    FROM users WHERE status = 'active'
    UNION ALL
    SELECT 
        'admin_users' as metric,
        COUNT(*) as value
    FROM users WHERE role = 'admin';
END //

DELIMITER ;

-- ==================== 创建触发器 ====================
-- 用户更新时记录操作日志
DELIMITER //
CREATE TRIGGER user_update_log
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO operation_logs (
        user_id, 
        operation_type, 
        operation_description, 
        target_type, 
        target_id,
        request_data
    ) VALUES (
        NEW.id,
        'user_update',
        CONCAT('用户信息更新: ', OLD.username, ' -> ', NEW.username),
        'user',
        NEW.uuid,
        JSON_OBJECT('old_data', JSON_OBJECT('username', OLD.username, 'status', OLD.status), 'new_data', JSON_OBJECT('username', NEW.username, 'status', NEW.status))
    );
END //
DELIMITER ;

-- ==================== 权限设置 ====================
-- 创建应用用户（如果不存在）
CREATE USER IF NOT EXISTS 'msh_app'@'%' IDENTIFIED BY 'msh_app_password_2025';
GRANT SELECT, INSERT, UPDATE, DELETE ON msh_form_system.* TO 'msh_app'@'%';

-- 创建只读用户（用于报表）
CREATE USER IF NOT EXISTS 'msh_readonly'@'%' IDENTIFIED BY 'msh_readonly_password_2025';
GRANT SELECT ON msh_form_system.* TO 'msh_readonly'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- ==================== 完成信息 ====================
SELECT 'MSH表单系统数据库初始化完成！' as message;
SELECT '数据库名: msh_form_system' as database_name;
SELECT '表数量: 6' as table_count;
SELECT '索引数量: 25+' as index_count;
SELECT '初始用户: admin' as admin_user;
SELECT '配置项: 8' as config_count;
