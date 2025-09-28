# MSH表单系统 - 远程部署指南

## 🚀 远程部署方案

### 方案A：SSH密钥认证部署
**优势**: 安全性高，无需密码
**要求**: 需要配置SSH密钥对

### 方案B：密码认证部署
**优势**: 简单直接，无需额外配置
**要求**: 需要ECS实例root密码

### 方案C：阿里云控制台部署
**优势**: 图形界面操作，直观易懂
**要求**: 需要阿里云控制台访问权限

---

## 🔑 推荐方案：密码认证部署

### 1. 获取ECS实例密码
```bash
# 通过阿里云控制台重置root密码
# 1. 登录阿里云控制台
# 2. 进入ECS实例详情页
# 3. 点击"更多" -> "密码/密钥" -> "重置实例密码"
# 4. 设置新密码并重启实例
```

### 2. 测试SSH连接
```bash
# 测试SSH连接
ssh root@112.124.97.58

# 如果连接成功，输入密码
# 如果连接失败，检查安全组规则
```

### 3. 手动部署步骤
```bash
# 1. 连接到ECS服务器
ssh root@112.124.97.58

# 2. 创建项目目录
mkdir -p /opt/msh-form-system
cd /opt/msh-form-system

# 3. 初始化Node.js项目
npm init -y

# 4. 安装依赖包
npm install express sequelize mysql2
npm install jsonwebtoken bcryptjs joi
npm install cors helmet morgan compression
npm install dotenv express-rate-limit
npm install uuid winston

# 5. 创建环境配置文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_HOST=rm-bp1863f84204h1973.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=msh_form_system
DB_USER=msh_admin
DB_PASSWORD=your_password_here
JWT_SECRET=msh_form_system_jwt_secret_2025_production
JWT_EXPIRES_IN=24h
EOF

# 6. 创建项目结构
mkdir -p src/{controllers,models,routes,middleware,services,utils,config}
mkdir -p tests docs logs uploads
mkdir -p public/{css,js,images}

# 7. 设置目录权限
chmod 755 /opt/msh-form-system
chmod 755 /opt/msh-form-system/logs
chmod 755 /opt/msh-form-system/uploads
```

---

## 📋 详细部署步骤

### 步骤1：环境准备
```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查PM2版本
pm2 --version

# 检查MySQL客户端
mysql --version
```

### 步骤2：项目初始化
```bash
# 创建项目目录
mkdir -p /opt/msh-form-system
cd /opt/msh-form-system

# 初始化package.json
npm init -y

# 安装生产依赖
npm install express sequelize mysql2
npm install jsonwebtoken bcryptjs joi
npm install cors helmet morgan compression
npm install dotenv express-rate-limit
npm install uuid winston

# 安装开发依赖
npm install -D nodemon jest supertest
npm install -D eslint prettier
```

### 步骤3：创建环境配置
```bash
# 创建.env文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_HOST=rm-bp1863f84204h1973.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=msh_form_system
DB_USER=msh_admin
DB_PASSWORD=your_password_here
JWT_SECRET=msh_form_system_jwt_secret_2025_production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/opt/msh-form-system/uploads
LOG_LEVEL=info
LOG_FILE=/opt/msh-form-system/logs/app.log
EOF

# 设置文件权限
chmod 600 .env
```

### 步骤4：创建项目结构
```bash
# 创建目录结构
mkdir -p src/{controllers,models,routes,middleware,services,utils,config}
mkdir -p tests docs logs uploads
mkdir -p public/{css,js,images}

# 设置目录权限
chmod 755 /opt/msh-form-system
chmod 755 /opt/msh-form-system/logs
chmod 755 /opt/msh-form-system/uploads
```

### 步骤5：创建数据库配置
```bash
# 创建数据库连接配置
cat > src/config/database.js << 'EOF'
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'mysql',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
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
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

module.exports = sequelize;
EOF
```

### 步骤6：创建用户模型
```bash
# 创建用户模型
cat > src/models/User.js << 'EOF'
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^1[3-9][0-9]{9}$/
    }
  },
  realName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'real_name'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  groupName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'group_name'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'guest'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 密码加密钩子
User.beforeCreate(async (user) => {
  if (user.passwordHash) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
  }
});

// 密码验证方法
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// 生成JWT令牌
User.prototype.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this.id, uuid: this.uuid, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

module.exports = User;
EOF
```

### 步骤7：创建主应用文件
```bash
# 创建主应用文件
cat > src/app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8000'],
  credentials: true
}));

// 压缩响应
app.use(compression());

// 请求日志
app.use(morgan('combined'));

// 限流配置
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('应用错误:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message
  });
});

module.exports = app;
EOF
```

### 步骤8：创建服务器启动文件
```bash
# 创建服务器启动文件
cat > src/server.js << 'EOF'
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 数据库连接测试
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 同步数据库模型
    await sequelize.sync({ alter: true });
    console.log('✅ 数据库模型同步完成');

    // 启动服务器
    app.listen(PORT, HOST, () => {
      console.log(`🚀 服务器启动成功`);
      console.log(`📍 地址: http://${HOST}:${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('🔄 正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

startServer();
EOF
```

### 步骤9：创建PM2配置
```bash
# 创建PM2配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'msh-form-system',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/opt/msh-form-system/logs/combined.log',
    out_file: '/opt/msh-form-system/logs/out.log',
    error_file: '/opt/msh-form-system/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
```

### 步骤10：测试数据库连接
```bash
# 创建数据库测试文件
cat > test-db.js << 'EOF'
const sequelize = require('./src/config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const [results] = await sequelize.query('SELECT 1 as test');
    console.log('✅ 数据库查询测试成功:', results);
    
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

testConnection();
EOF

# 运行数据库测试
node test-db.js
```

### 步骤11：启动应用
```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 检查应用状态
pm2 status

# 等待应用启动
sleep 5

# 测试健康检查接口
curl http://localhost:3000/health
```

### 步骤12：验证部署结果
```bash
# 检查PM2状态
pm2 status

# 查看应用日志
pm2 logs msh-form-system

# 测试健康检查接口
curl http://localhost:3000/health

# 检查端口监听
netstat -tlnp | grep 3000
```

---

## 📊 部署验证清单

### 环境检查
- [ ] Node.js环境正常
- [ ] npm包管理器正常
- [ ] PM2进程管理器正常
- [ ] MySQL客户端正常

### 项目部署
- [ ] 项目目录创建完成
- [ ] 依赖包安装完成
- [ ] 环境配置完成
- [ ] 数据库连接正常

### 应用启动
- [ ] 应用启动成功
- [ ] 健康检查正常
- [ ] PM2进程管理正常
- [ ] 日志记录正常

### 功能验证
- [ ] 数据库连接测试
- [ ] 用户模型创建
- [ ] 表单模型创建
- [ ] 认证系统正常

---

## 🎯 下一步行动

### 立即执行
1. **获取ECS密码**: 通过阿里云控制台重置root密码
2. **SSH连接测试**: 验证SSH连接是否正常
3. **执行部署步骤**: 按照上述步骤逐一执行
4. **验证部署结果**: 检查应用是否正常运行

### 预期结果
- ✅ 完整的Node.js API项目
- ✅ 数据库连接和模型同步
- ✅ 用户认证系统
- ✅ 基础API接口
- ✅ 生产环境配置

---

**总结**: 🎯 **远程部署方案完成！** 提供了详细的部署步骤，包含环境准备、项目初始化、数据库配置、模型创建、应用启动等所有步骤。预计执行时间约30分钟。
