# MSH表单系统 - 数据库设计

## 📊 数据库概述

### 数据库信息
- **数据库名**: `msh_form_system`
- **数据库类型**: MySQL 8.0.36
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **存储引擎**: InnoDB

### 设计原则
- **规范化**: 遵循第三范式，减少数据冗余
- **性能优化**: 合理设计索引，提升查询性能
- **数据完整性**: 使用外键约束和检查约束
- **扩展性**: 预留扩展字段，支持未来功能

---

## 🗄️ 数据表设计

### 1. 用户表 (users)
```sql
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
```

### 2. 表单表 (forms)
```sql
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
```

### 3. 表单提交表 (form_submissions)
```sql
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
```

### 4. 跟踪事件表 (tracking_events)
```sql
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
```

### 5. 系统配置表 (system_configs)
```sql
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
```

### 6. 操作日志表 (operation_logs)
```sql
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
```

---

## 🔗 表关系图

```
users (用户表)
├── forms (表单表) [created_by]
├── form_submissions (表单提交表) [submitter_id, reviewed_by]
└── operation_logs (操作日志表) [user_id]

forms (表单表)
└── form_submissions (表单提交表) [form_id]

tracking_events (跟踪事件表)
└── form_submissions (表单提交表) [关联MSH系统事件]
```

---

## 📈 索引优化策略

### 主键索引
- 所有表使用自增主键，提升插入性能
- UUID字段创建唯一索引，支持快速查找

### 复合索引
```sql
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
```

### 查询优化索引
```sql
-- 支持常用查询的索引
CREATE INDEX idx_forms_public_active ON forms(is_public, status, start_date, end_date);
CREATE INDEX idx_submissions_recent ON form_submissions(submitted_at DESC, status);
CREATE INDEX idx_tracking_active ON tracking_events(status, start_date, group_name);
```

---

## 🔒 数据完整性约束

### 外键约束
- 所有外键关系都设置了适当的删除策略
- 使用 `ON DELETE CASCADE` 确保数据一致性
- 使用 `ON DELETE SET NULL` 保留历史记录

### 检查约束
```sql
-- 邮箱格式检查
ALTER TABLE users ADD CONSTRAINT chk_email_format 
CHECK (email IS NULL OR email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

-- 手机号格式检查
ALTER TABLE users ADD CONSTRAINT chk_phone_format 
CHECK (phone IS NULL OR phone REGEXP '^1[3-9][0-9]{9}$');

-- 日期范围检查
ALTER TABLE forms ADD CONSTRAINT chk_date_range 
CHECK (end_date IS NULL OR end_date > start_date);
```

---

## 📊 性能优化建议

### 查询优化
1. **分页查询**: 使用 `LIMIT` 和 `OFFSET` 进行分页
2. **索引覆盖**: 尽量使用覆盖索引减少回表
3. **查询缓存**: 启用MySQL查询缓存
4. **连接池**: 使用连接池管理数据库连接

### 存储优化
1. **分区表**: 对日志表按时间分区
2. **数据归档**: 定期归档历史数据
3. **压缩存储**: 对JSON字段使用压缩存储

### 监控指标
- 查询响应时间
- 索引使用率
- 连接数使用率
- 存储空间使用率

---

## 🚀 部署脚本

### 创建数据库
```sql
-- 创建数据库
CREATE DATABASE msh_form_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE msh_form_system;

-- 执行表创建脚本
-- (执行上面的所有CREATE TABLE语句)
```

### 初始化数据
```sql
-- 插入默认管理员用户
INSERT INTO users (uuid, username, password_hash, real_name, role, status) 
VALUES (
    UUID(), 
    'admin', 
    '$2b$10$example_hash', 
    '系统管理员', 
    'admin', 
    'active'
);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('system_name', 'MSH表单系统', 'string', '系统名称'),
('max_file_size', '10485760', 'number', '最大文件大小(字节)'),
('allow_registration', 'true', 'boolean', '是否允许用户注册'),
('session_timeout', '3600', 'number', '会话超时时间(秒)');
```

---

## 📋 维护计划

### 定期维护任务
1. **数据备份**: 每日自动备份
2. **索引优化**: 每周分析索引使用情况
3. **数据清理**: 每月清理过期数据
4. **性能监控**: 实时监控数据库性能

### 监控告警
- 数据库连接数超过80%
- 查询响应时间超过1秒
- 存储空间使用率超过90%
- 错误日志数量异常增长

---

**最后更新**: 2025-09-29  
**版本**: 1.0  
**维护者**: MSH开发团队
