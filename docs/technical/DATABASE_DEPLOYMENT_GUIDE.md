# MSH表单系统 - 数据库部署指南

## 📋 部署概述

### 部署环境
- **服务器**: 阿里云ECS (112.124.97.58)
- **数据库**: 阿里云RDS MySQL (rm-bp1863f84204h1973.mysql.rds.aliyuncs.com)
- **数据库名**: msh_form_system
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci

### 部署文件
- **数据库设计文档**: `DATABASE_DESIGN.md`
- **初始化脚本**: `DATABASE_SETUP.sql`
- **部署指南**: `DATABASE_DEPLOYMENT_GUIDE.md`

---

## 🚀 部署步骤

### 1. 准备部署环境

#### 1.1 连接ECS服务器
```bash
# SSH连接ECS服务器
ssh root@112.124.97.58

# 检查MySQL客户端是否已安装
mysql --version

# 如果没有安装，执行以下命令
sudo apt update
sudo apt install mysql-client -y
```

#### 1.2 测试数据库连接
```bash
# 测试RDS连接
mysql -h rm-bp1863f84204h1973.mysql.rds.aliyuncs.com -u msh_admin -p

# 连接成功后执行
USE msh_form_system;
SHOW TABLES;
```

### 2. 上传部署文件

#### 2.1 上传SQL脚本
```bash
# 在本地执行（需要SSH密码）
scp docs/technical/DATABASE_SETUP.sql root@112.124.97.58:/tmp/

# 或者通过其他方式上传文件到服务器
# 例如：使用阿里云控制台的文件上传功能
```

#### 2.2 验证文件上传
```bash
# 在ECS服务器上检查文件
ls -la /tmp/DATABASE_SETUP.sql
cat /tmp/DATABASE_SETUP.sql | head -20
```

### 3. 执行数据库初始化

#### 3.1 执行初始化脚本
```bash
# 连接数据库并执行脚本
mysql -h rm-bp1863f84204h1973.mysql.rds.aliyuncs.com -u msh_admin -p < /tmp/DATABASE_SETUP.sql

# 或者分步执行
mysql -h rm-bp1863f84204h1973.mysql.rds.aliyuncs.com -u msh_admin -p
```

#### 3.2 验证部署结果
```sql
-- 检查数据库
SHOW DATABASES;
USE msh_form_system;

-- 检查表结构
SHOW TABLES;
DESCRIBE users;
DESCRIBE forms;
DESCRIBE form_submissions;

-- 检查索引
SHOW INDEX FROM users;
SHOW INDEX FROM forms;

-- 检查初始数据
SELECT * FROM users;
SELECT * FROM system_configs;
```

### 4. 配置应用连接

#### 4.1 创建应用配置文件
```bash
# 在ECS服务器上创建配置文件
mkdir -p /opt/msh-form-system/config
cat > /opt/msh-form-system/config/database.js << 'EOF'
module.exports = {
  host: 'rm-bp1863f84204h1973.mysql.rds.aliyuncs.com',
  port: 3306,
  database: 'msh_form_system',
  username: 'msh_admin',
  password: 'your_password_here',
  charset: 'utf8mb4',
  timezone: '+08:00',
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  logging: false
};
EOF
```

#### 4.2 设置文件权限
```bash
# 设置配置文件权限
chmod 600 /opt/msh-form-system/config/database.js
chown root:root /opt/msh-form-system/config/database.js
```

---

## 🔧 数据库配置优化

### 1. 性能优化配置

#### 1.1 连接池配置
```sql
-- 设置连接池参数
SET GLOBAL max_connections = 200;
SET GLOBAL wait_timeout = 28800;
SET GLOBAL interactive_timeout = 28800;
```

#### 1.2 查询缓存配置
```sql
-- 启用查询缓存
SET GLOBAL query_cache_type = 1;
SET GLOBAL query_cache_size = 64M;
```

#### 1.3 索引优化
```sql
-- 分析表统计信息
ANALYZE TABLE users;
ANALYZE TABLE forms;
ANALYZE TABLE form_submissions;
ANALYZE TABLE tracking_events;

-- 优化表
OPTIMIZE TABLE users;
OPTIMIZE TABLE forms;
OPTIMIZE TABLE form_submissions;
```

### 2. 安全配置

#### 2.1 用户权限配置
```sql
-- 创建应用用户
CREATE USER 'msh_app'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON msh_form_system.* TO 'msh_app'@'%';

-- 创建只读用户
CREATE USER 'msh_readonly'@'%' IDENTIFIED BY 'readonly_password_here';
GRANT SELECT ON msh_form_system.* TO 'msh_readonly'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

#### 2.2 网络安全配置
```sql
-- 检查用户权限
SELECT user, host, authentication_string FROM mysql.user WHERE user LIKE 'msh_%';

-- 检查数据库权限
SHOW GRANTS FOR 'msh_app'@'%';
SHOW GRANTS FOR 'msh_readonly'@'%';
```

---

## 📊 监控和维护

### 1. 性能监控

#### 1.1 查询性能监控
```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 查看连接数
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- 查看查询缓存状态
SHOW STATUS LIKE 'Qcache%';
```

#### 1.2 存储监控
```sql
-- 查看数据库大小
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'msh_form_system'
GROUP BY table_schema;

-- 查看表大小
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'msh_form_system'
ORDER BY (data_length + index_length) DESC;
```

### 2. 数据备份

#### 2.1 自动备份脚本
```bash
#!/bin/bash
# 数据库备份脚本
BACKUP_DIR="/opt/msh-form-system/backups"
DB_NAME="msh_form_system"
DB_HOST="rm-bp1863f84204h1973.mysql.rds.aliyuncs.com"
DB_USER="msh_admin"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mysqldump -h $DB_HOST -u $DB_USER -p $DB_NAME > $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 压缩备份文件
gzip $BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "备份完成: ${DB_NAME}_${DATE}.sql.gz"
```

#### 2.2 设置定时备份
```bash
# 添加到crontab
crontab -e

# 添加以下行（每天凌晨2点备份）
0 2 * * * /opt/msh-form-system/scripts/backup.sh
```

---

## 🚨 故障排除

### 1. 常见问题

#### 1.1 连接问题
```bash
# 检查网络连接
ping rm-bp1863f84204h1973.mysql.rds.aliyuncs.com

# 检查端口连接
telnet rm-bp1863f84204h1973.mysql.rds.aliyuncs.com 3306

# 检查防火墙
sudo ufw status
```

#### 1.2 权限问题
```sql
-- 检查用户权限
SHOW GRANTS FOR 'msh_admin'@'%';

-- 检查数据库权限
SELECT * FROM information_schema.user_privileges WHERE grantee LIKE '%msh_admin%';
```

#### 1.3 性能问题
```sql
-- 查看慢查询日志
SHOW VARIABLES LIKE 'slow_query_log_file';
SHOW VARIABLES LIKE 'long_query_time';

-- 查看当前连接
SHOW PROCESSLIST;

-- 查看锁等待
SHOW ENGINE INNODB STATUS;
```

### 2. 恢复操作

#### 2.1 数据恢复
```bash
# 恢复数据库
mysql -h rm-bp1863f84204h1973.mysql.rds.aliyuncs.com -u msh_admin -p msh_form_system < backup_file.sql
```

#### 2.2 表结构恢复
```sql
-- 重新创建表
SOURCE /tmp/DATABASE_SETUP.sql;
```

---

## 📋 部署检查清单

### 部署前检查
- [ ] ECS服务器连接正常
- [ ] RDS数据库连接正常
- [ ] MySQL客户端已安装
- [ ] 部署文件已上传

### 部署中检查
- [ ] 数据库初始化脚本执行成功
- [ ] 所有表创建成功
- [ ] 索引创建成功
- [ ] 初始数据插入成功

### 部署后检查
- [ ] 应用连接配置正确
- [ ] 用户权限设置正确
- [ ] 性能监控配置完成
- [ ] 备份脚本配置完成

### 功能验证
- [ ] 用户表查询正常
- [ ] 表单表查询正常
- [ ] 提交表查询正常
- [ ] 跟踪事件表查询正常
- [ ] 系统配置表查询正常
- [ ] 操作日志表查询正常

---

## 📞 技术支持

### 联系方式
- **阿里云技术支持**: 400-801-3260
- **RDS技术支持**: 通过阿里云控制台提交工单
- **项目开发团队**: 通过项目文档联系

### 相关文档
- [阿里云RDS使用指南](https://help.aliyun.com/product/26090.html)
- [MySQL 8.0官方文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [MSH项目技术文档](../README.md)

---

**最后更新**: 2025-09-29  
**版本**: 1.0  
**维护者**: MSH开发团队
