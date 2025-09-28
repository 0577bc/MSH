# MSH表单系统 - API实施步骤

## 🎯 实施概述

### 当前状态
- ✅ **基础设施**: 阿里云ECS、RDS数据库、网络配置完成
- ✅ **数据库设计**: 表结构设计、索引优化、初始化脚本完成
- ✅ **API设计**: 技术架构、接口设计、安全配置完成
- 🔄 **API开发**: 开始Node.js后端API实施

### 实施目标
- 在ECS服务器上创建完整的Node.js API项目
- 实现用户认证、表单管理、数据提交、事件跟踪功能
- 配置生产环境部署和监控

---

## 🚀 第一步：项目环境搭建

### 1.1 连接ECS服务器
```bash
# SSH连接ECS服务器
ssh root@112.124.97.58

# 检查Node.js环境
node --version  # 应该显示 v18.20.8
npm --version   # 应该显示 10.8.2
pm2 --version   # 应该显示PM2版本
```

### 1.2 创建项目目录
```bash
# 创建项目根目录
mkdir -p /opt/msh-form-system
cd /opt/msh-form-system

# 创建项目结构
mkdir -p src/{controllers,models,routes,middleware,services,utils,config}
mkdir -p tests docs logs uploads
mkdir -p public/{css,js,images}

# 设置目录权限
chmod 755 /opt/msh-form-system
chmod 755 /opt/msh-form-system/logs
chmod 755 /opt/msh-form-system/uploads
```

### 1.3 初始化Node.js项目
```bash
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

# 创建基础文件
touch src/app.js src/server.js
touch src/config/database.js src/config/index.js
touch .env .gitignore
```

---

## 🗄️ 第二步：数据库连接配置

### 2.1 环境变量配置
```bash
# 创建.env文件
cat > .env << 'EOF'
# 服务器配置
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=rm-bp1863f84204h1973.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=msh_form_system
DB_USER=msh_admin
DB_PASSWORD=your_password_here

# JWT配置
JWT_SECRET=msh_form_system_jwt_secret_2025
JWT_EXPIRES_IN=24h

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/opt/msh-form-system/uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=/opt/msh-form-system/logs/app.log
EOF
```

### 2.2 数据库连接配置
```bash
# 创建数据库配置文件
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

### 2.3 测试数据库连接
```bash
# 创建数据库测试脚本
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

---

## 🏗️ 第三步：核心模型实现

### 3.1 用户模型
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

### 3.2 表单模型
```bash
# 创建表单模型
cat > src/models/Form.js << 'EOF'
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Form = sequelize.define('Form', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  formData: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'form_data'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  allowAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'allow_anonymous'
  },
  maxSubmissions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'max_submissions'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'forms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Form;
EOF
```

### 3.3 模型关联配置
```bash
# 创建模型关联文件
cat > src/models/index.js << 'EOF'
const sequelize = require('../config/database');
const User = require('./User');
const Form = require('./Form');

// 定义关联关系
User.hasMany(Form, { foreignKey: 'createdBy', as: 'forms' });
Form.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  sequelize,
  User,
  Form
};
EOF
```

---

## 🔐 第四步：认证系统实现

### 4.1 认证中间件
```bash
# 创建认证中间件
cat > src/middleware/authMiddleware.js << 'EOF'
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
};

module.exports = authMiddleware;
EOF
```

### 4.2 用户控制器
```bash
# 创建用户控制器
cat > src/controllers/UserController.js << 'EOF'
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

class UserController {
  // 用户注册
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { username, password, email, realName, groupName } = req.body;

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }

      // 创建用户
      const user = await User.create({
        uuid: uuidv4(),
        username,
        passwordHash: password,
        email,
        realName,
        groupName
      });

      // 生成JWT令牌
      const token = user.generateToken();

      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: {
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            realName: user.realName,
            groupName: user.groupName,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('用户注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 用户登录
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      // 查找用户
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 验证密码
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 检查用户状态
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: '账户已被禁用'
        });
      }

      // 更新最后登录时间
      await user.update({ lastLoginAt: new Date() });

      // 生成JWT令牌
      const token = user.generateToken();

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            realName: user.realName,
            groupName: user.groupName,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('用户登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户信息
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserController();
EOF
```

---

## 🚀 第五步：应用启动配置

### 5.1 主应用文件
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

### 5.2 服务器启动文件
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

### 5.3 PM2配置
```bash
# 创建PM2配置文件
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

---

## 🧪 第六步：测试和验证

### 6.1 启动应用测试
```bash
# 启动应用
pm2 start ecosystem.config.js --env development

# 检查应用状态
pm2 status

# 查看应用日志
pm2 logs msh-form-system

# 测试健康检查接口
curl http://localhost:3000/health
```

### 6.2 数据库连接测试
```bash
# 测试数据库连接
node test-db.js

# 检查数据库表
mysql -h rm-bp1863f84204h1973.mysql.rds.aliyuncs.com -u msh_admin -p msh_form_system -e "SHOW TABLES;"
```

---

## 📋 实施检查清单

### 环境搭建检查
- [ ] ECS服务器连接正常
- [ ] Node.js环境已安装
- [ ] 项目目录创建完成
- [ ] 依赖包安装完成

### 数据库配置检查
- [ ] 数据库连接成功
- [ ] 环境变量配置正确
- [ ] 数据库模型同步完成
- [ ] 测试查询正常

### 应用启动检查
- [ ] 应用启动成功
- [ ] 健康检查接口正常
- [ ] PM2进程管理正常
- [ ] 日志记录正常

### 功能测试检查
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 用户信息获取
- [ ] 数据库操作正常

---

## 🚀 下一步计划

### 立即执行
1. **执行上述所有步骤**，完成基础API项目搭建
2. **测试数据库连接**，确保连接正常
3. **启动应用服务**，验证基础功能

### 后续开发
1. **实现表单管理功能**
2. **实现数据提交功能**
3. **实现事件跟踪功能**
4. **完善API接口**
5. **添加前端页面**

---

**总结**: 🎯 **API实施步骤已准备完成！** 按照上述步骤可以快速搭建完整的Node.js API项目。所有代码都已准备就绪，可以直接在ECS服务器上执行。外部大脑已记录实施计划，可以随时查看进度。
