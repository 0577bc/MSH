# MSH表单系统 - API开发指南

## 📋 API开发概述

### 技术栈
- **后端框架**: Node.js + Express.js
- **数据库**: MySQL 8.0 (阿里云RDS)
- **ORM**: Sequelize.js
- **认证**: JWT (JSON Web Token)
- **验证**: Joi
- **文档**: Swagger/OpenAPI

### 项目结构
```
msh-form-system/
├── src/
│   ├── controllers/     # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由
│   ├── middleware/     # 中间件
│   ├── services/       # 业务逻辑
│   ├── utils/          # 工具函数
│   └── config/         # 配置文件
├── tests/              # 测试文件
├── docs/               # API文档
└── package.json        # 依赖配置
```

---

## 🚀 快速开始

### 1. 项目初始化

#### 1.1 创建项目目录
```bash
# 在ECS服务器上创建项目目录
mkdir -p /opt/msh-form-system
cd /opt/msh-form-system

# 初始化Node.js项目
npm init -y
```

#### 1.2 安装依赖
```bash
# 安装核心依赖
npm install express sequelize mysql2
npm install jsonwebtoken bcryptjs joi
npm install cors helmet morgan compression
npm install dotenv express-rate-limit

# 安装开发依赖
npm install -D nodemon jest supertest
npm install -D eslint prettier
```

#### 1.3 创建基础文件结构
```bash
# 创建目录结构
mkdir -p src/{controllers,models,routes,middleware,services,utils,config}
mkdir -p tests docs

# 创建基础文件
touch src/app.js src/server.js
touch src/config/database.js src/config/index.js
touch .env .gitignore
```

### 2. 环境配置

#### 2.1 环境变量配置
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
JWT_SECRET=your_jwt_secret_here
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

#### 2.2 数据库配置
```javascript
// src/config/database.js
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
```

---

## 🏗️ 核心模块开发

### 1. 数据模型 (Models)

#### 1.1 用户模型
```javascript
// src/models/User.js
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
```

#### 1.2 表单模型
```javascript
// src/models/Form.js
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

// 关联关系
Form.associate = (models) => {
  Form.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  Form.hasMany(models.FormSubmission, { foreignKey: 'formId', as: 'submissions' });
};

module.exports = Form;
```

### 2. 控制器 (Controllers)

#### 2.1 用户控制器
```javascript
// src/controllers/UserController.js
const User = require('../models/User');
const { validationResult } = require('express-validator');

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
        uuid: require('uuid').v4(),
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

  // 更新用户信息
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { email, realName, nickname, groupName } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 更新用户信息
      await user.update({
        email,
        realName,
        nickname,
        groupName
      });

      res.json({
        success: true,
        message: '用户信息更新成功',
        data: {
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            realName: user.realName,
            nickname: user.nickname,
            groupName: user.groupName,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('更新用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserController();
```

### 3. 路由 (Routes)

#### 3.1 用户路由
```javascript
// src/routes/userRoutes.js
const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 用户注册
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),
  body('realName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('真实姓名长度不能超过50个字符'),
  body('groupName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('组别名称长度不能超过50个字符')
], UserController.register);

// 用户登录
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
], UserController.login);

// 获取用户信息
router.get('/profile', authMiddleware, UserController.getProfile);

// 更新用户信息
router.put('/profile', [
  authMiddleware,
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),
  body('realName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('真实姓名长度不能超过50个字符'),
  body('nickname')
    .optional()
    .isLength({ max: 50 })
    .withMessage('花名长度不能超过50个字符'),
  body('groupName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('组别名称长度不能超过50个字符')
], UserController.updateProfile);

module.exports = router;
```

### 4. 中间件 (Middleware)

#### 4.1 认证中间件
```javascript
// src/middleware/authMiddleware.js
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
```

#### 4.2 权限中间件
```javascript
// src/middleware/roleMiddleware.js
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证用户'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
```

---

## 🔧 应用配置

### 1. 主应用文件
```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 导入路由
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

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

// 路由配置
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/submissions', submissionRoutes);

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
```

### 2. 服务器启动文件
```javascript
// src/server.js
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
```

---

## 📦 部署配置

### 1. PM2配置
```javascript
// ecosystem.config.js
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
```

### 2. 启动脚本
```bash
#!/bin/bash
# start.sh - 启动脚本

echo "🚀 启动MSH表单系统..."

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 启动应用
echo "🔄 启动应用..."
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup

echo "✅ 启动完成！"
echo "📍 应用地址: http://112.124.97.58:3000"
echo "🔍 查看状态: pm2 status"
echo "📋 查看日志: pm2 logs msh-form-system"
```

---

## 🧪 测试配置

### 1. 单元测试
```javascript
// tests/user.test.js
const request = require('supertest');
const app = require('../src/app');

describe('用户API测试', () => {
  test('用户注册', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        realName: '测试用户'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('用户登录', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

### 2. 集成测试
```javascript
// tests/integration.test.js
const request = require('supertest');
const app = require('../src/app');

describe('集成测试', () => {
  let authToken;

  beforeAll(async () => {
    // 登录获取令牌
    const response = await request(app)
      .post('/api/users/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    authToken = response.body.data.token;
  });

  test('创建表单', async () => {
    const response = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: '测试表单',
        description: '这是一个测试表单',
        formData: { fields: [] }
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📊 监控和日志

### 1. 日志配置
```javascript
// src/utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE || 'logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE || 'logs/combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 2. 性能监控
```javascript
// src/middleware/performanceMiddleware.js
const logger = require('../utils/logger');

const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('请求性能', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

module.exports = performanceMiddleware;
```

---

## 🔒 安全配置

### 1. 输入验证
```javascript
// src/middleware/validationMiddleware.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

module.exports = validateRequest;
```

### 2. SQL注入防护
```javascript
// src/middleware/sqlInjectionMiddleware.js
const sqlInjectionMiddleware = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\b.*\b(OR|AND)\b)/i,
    /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i,
    /(\b(OR|AND)\b.*'.*'.*\b(OR|AND)\b)/i
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const bodyValues = Object.values(req.body);
  const queryValues = Object.values(req.query);
  const paramsValues = Object.values(req.params);

  const allValues = [...bodyValues, ...queryValues, ...paramsValues];
  
  if (allValues.some(checkValue)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的安全威胁'
    });
  }

  next();
};

module.exports = sqlInjectionMiddleware;
```

---

## 📋 部署检查清单

### 部署前检查
- [ ] Node.js环境已安装
- [ ] 数据库连接正常
- [ ] 环境变量配置正确
- [ ] 依赖包安装完成

### 部署中检查
- [ ] 应用启动成功
- [ ] 数据库模型同步完成
- [ ] API接口响应正常
- [ ] 日志记录正常

### 部署后检查
- [ ] 健康检查接口正常
- [ ] 用户注册登录功能正常
- [ ] 表单创建功能正常
- [ ] 数据提交功能正常

---

**最后更新**: 2025-09-29  
**版本**: 1.0  
**维护者**: MSH开发团队
