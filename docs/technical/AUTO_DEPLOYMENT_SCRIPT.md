# MSH表单系统 - 自动化部署脚本

## 🚀 自动化部署脚本

### 主部署脚本
```bash
#!/bin/bash
# MSH表单系统自动化部署脚本
# 版本: 1.0
# 创建时间: 2025-09-29

set -e  # 遇到错误立即退出

echo "🚀 开始MSH表单系统自动化部署..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "📋 检查环境配置..."
    
    # 检查Node.js版本
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js版本: $NODE_VERSION"
    else
        log_error "Node.js未安装"
        exit 1
    fi
    
    # 检查npm版本
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm版本: $NPM_VERSION"
    else
        log_error "npm未安装"
        exit 1
    fi
    
    # 检查PM2版本
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2版本: $PM2_VERSION"
    else
        log_error "PM2未安装"
        exit 1
    fi
    
    # 检查MySQL客户端
    if command -v mysql &> /dev/null; then
        MYSQL_VERSION=$(mysql --version)
        log_success "MySQL客户端: $MYSQL_VERSION"
    else
        log_error "MySQL客户端未安装"
        exit 1
    fi
    
    log_success "环境检查完成"
}

# 创建项目目录
create_project_structure() {
    log_info "📁 创建项目目录结构..."
    
    # 创建项目根目录
    mkdir -p /opt/msh-form-system
    cd /opt/msh-form-system
    
    # 创建目录结构
    mkdir -p src/{controllers,models,routes,middleware,services,utils,config}
    mkdir -p tests docs logs uploads
    mkdir -p public/{css,js,images}
    
    # 设置目录权限
    chmod 755 /opt/msh-form-system
    chmod 755 /opt/msh-form-system/logs
    chmod 755 /opt/msh-form-system/uploads
    
    log_success "项目目录结构创建完成"
}

# 初始化Node.js项目
init_nodejs_project() {
    log_info "📦 初始化Node.js项目..."
    
    cd /opt/msh-form-system
    
    # 初始化package.json
    npm init -y
    
    # 安装生产依赖
    log_info "安装生产依赖..."
    npm install express sequelize mysql2
    npm install jsonwebtoken bcryptjs joi
    npm install cors helmet morgan compression
    npm install dotenv express-rate-limit
    npm install uuid winston
    
    # 安装开发依赖
    log_info "安装开发依赖..."
    npm install -D nodemon jest supertest
    npm install -D eslint prettier
    
    log_success "Node.js项目初始化完成"
}

# 创建环境配置文件
create_env_config() {
    log_info "⚙️ 创建环境配置文件..."
    
    cat > .env << 'EOF'
# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=rm-bp1863f84204h1973.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=msh_form_system
DB_USER=msh_admin
DB_PASSWORD=your_password_here

# JWT配置
JWT_SECRET=msh_form_system_jwt_secret_2025_production
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
    
    # 设置文件权限
    chmod 600 .env
    
    log_success "环境配置文件创建完成"
}

# 创建数据库连接配置
create_database_config() {
    log_info "🗄️ 创建数据库连接配置..."
    
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
    
    log_success "数据库连接配置创建完成"
}

# 创建用户模型
create_user_model() {
    log_info "👤 创建用户模型..."
    
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
    
    log_success "用户模型创建完成"
}

# 创建表单模型
create_form_model() {
    log_info "📝 创建表单模型..."
    
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
    
    log_success "表单模型创建完成"
}

# 创建模型关联配置
create_model_associations() {
    log_info "🔗 创建模型关联配置..."
    
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
    
    log_success "模型关联配置创建完成"
}

# 创建认证中间件
create_auth_middleware() {
    log_info "🔐 创建认证中间件..."
    
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
    
    log_success "认证中间件创建完成"
}

# 创建用户控制器
create_user_controller() {
    log_info "👤 创建用户控制器..."
    
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
    
    log_success "用户控制器创建完成"
}

# 创建主应用文件
create_app_file() {
    log_info "🚀 创建主应用文件..."
    
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
    
    log_success "主应用文件创建完成"
}

# 创建服务器启动文件
create_server_file() {
    log_info "🚀 创建服务器启动文件..."
    
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
    
    log_success "服务器启动文件创建完成"
}

# 创建PM2配置
create_pm2_config() {
    log_info "⚙️ 创建PM2配置..."
    
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
    
    log_success "PM2配置创建完成"
}

# 测试数据库连接
test_database_connection() {
    log_info "🗄️ 测试数据库连接..."
    
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
    if node test-db.js; then
        log_success "数据库连接测试成功"
    else
        log_error "数据库连接测试失败"
        exit 1
    fi
}

# 启动应用
start_application() {
    log_info "🚀 启动应用..."
    
    # 启动应用
    pm2 start ecosystem.config.js --env production
    
    # 检查应用状态
    pm2 status
    
    # 等待应用启动
    sleep 5
    
    # 测试健康检查接口
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "应用启动成功"
    else
        log_error "应用启动失败"
        exit 1
    fi
}

# 生成部署报告
generate_deployment_report() {
    log_info "📊 生成部署报告..."
    
    cat > deployment-report.md << 'EOF'
# MSH表单系统部署报告

## 部署信息
- **部署时间**: $(date)
- **部署环境**: 生产环境
- **服务器**: 阿里云ECS (112.124.97.58)
- **数据库**: 阿里云RDS MySQL

## 部署状态
- ✅ 环境检查: 完成
- ✅ 项目初始化: 完成
- ✅ 数据库配置: 完成
- ✅ 模型创建: 完成
- ✅ 认证系统: 完成
- ✅ 应用启动: 完成

## 服务信息
- **应用地址**: http://112.124.97.58:3000
- **健康检查**: http://112.124.97.58:3000/health
- **PM2状态**: 运行中

## 下一步
1. 配置Nginx反向代理
2. 实现表单管理功能
3. 实现数据提交功能
4. 实现事件跟踪功能
5. 添加前端页面

## 联系方式
- **技术支持**: MSH开发团队
- **文档**: /opt/msh-form-system/docs
- **日志**: /opt/msh-form-system/logs
EOF
    
    log_success "部署报告生成完成"
}

# 主函数
main() {
    echo "🚀 开始MSH表单系统自动化部署..."
    echo "=================================="
    
    # 执行部署步骤
    check_environment
    create_project_structure
    init_nodejs_project
    create_env_config
    create_database_config
    create_user_model
    create_form_model
    create_model_associations
    create_auth_middleware
    create_user_controller
    create_app_file
    create_server_file
    create_pm2_config
    test_database_connection
    start_application
    generate_deployment_report
    
    echo "=================================="
    log_success "🎉 MSH表单系统部署完成！"
    echo "📍 应用地址: http://112.124.97.58:3000"
    echo "🔍 健康检查: http://112.124.97.58:3000/health"
    echo "📊 部署报告: /opt/msh-form-system/deployment-report.md"
    echo "📋 PM2状态: pm2 status"
    echo "📝 查看日志: pm2 logs msh-form-system"
}

# 执行主函数
main "$@"
```

## 🚀 执行部署脚本

### 1. 上传脚本到ECS服务器
```bash
# 将脚本保存到本地
# 然后上传到ECS服务器
scp auto-deploy.sh root@112.124.97.58:/tmp/
```

### 2. 在ECS服务器上执行
```bash
# SSH连接到ECS服务器
ssh root@112.124.97.58

# 进入脚本目录
cd /tmp

# 设置执行权限
chmod +x auto-deploy.sh

# 执行部署脚本
./auto-deploy.sh
```

### 3. 验证部署结果
```bash
# 检查应用状态
pm2 status

# 测试健康检查接口
curl http://localhost:3000/health

# 查看应用日志
pm2 logs msh-form-system
```

---

## 📋 部署检查清单

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

**总结**: 🎯 **自动化部署脚本完成！** 包含完整的部署流程，可以一键完成所有部署工作。脚本包含环境检查、项目初始化、数据库配置、模型创建、认证系统、应用启动等所有步骤。预计执行时间约30分钟。
