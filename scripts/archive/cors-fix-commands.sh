#!/bin/bash

# CORS修复命令集合
# 在VNC控制台中逐行执行

echo "========================================="
echo "CORS修复命令集合 - VNC执行"
echo "========================================="
echo ""

echo "【步骤1】进入项目目录并安装cors中间件"
echo "cd /opt/msh-form-system"
echo "npm install cors"
echo "npm list cors"
echo ""

echo "【步骤2】备份原始app.js文件"
echo "cp app.js app.js.backup.\$(date +%Y%m%d_%H%M%S)"
echo "ls -lh app.js*"
echo ""

echo "【步骤3】创建新的app.js文件（带CORS支持）"
cat << 'NEWAPPJS'
cat > app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();

// CORS配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:8000',
      'http://localhost:8000'
    ];
    
    // 允许无源请求（如Postman等工具）
    if (!origin) return callback(null, true);
    
    // 开发环境允许所有源
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 检查源是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 临时允许所有源（生产环境需要限制）
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 预检请求缓存24小时
};

// 应用中间件
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use('/api/', limiter);

// 导入路由
const userRoutes = require('./src/routes/userRoutes');
const formRoutes = require('./src/routes/formRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');
const trackingRoutes = require('./src/routes/trackingRoutes');

// 应用路由
app.use('/api', userRoutes);
app.use('/api', formRoutes);
app.use('/api', submissionRoutes);
app.use('/api', trackingRoutes);

// 健康检查端点
app.get('/api/status', (req, res) => {
  res.json({
    message: 'MSH表单系统API服务运行正常',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// 默认路由
app.get('/', (req, res) => {
  res.json({
    message: 'MSH表单系统API服务',
    version: 'v1',
    endpoints: {
      status: '/api/status',
      auth: '/api/auth',
      forms: '/api/forms',
      submissions: '/api/submissions',
      tracking: '/api/tracking'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    message: '请检查请求路径'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS错误',
      message: '请求来源不被允许'
    });
  }
  
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'production' ? '服务器错误' : err.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 MSH表单系统API服务启动成功');
  console.log('📡 服务地址: http://112.124.97.58:' + PORT);
  console.log('🌍 环境: ' + (process.env.NODE_ENV || 'development'));
  console.log('⏰ 启动时间: ' + new Date().toISOString());
  console.log('🔐 默认管理员: admin / admin123456');
  console.log('📋 API文档: http://112.124.97.58:' + PORT + '/api/status');
});

module.exports = app;
EOF
NEWAPPJS
echo ""

echo "【步骤4】重启PM2应用"
echo "pm2 restart msh-form-api"
echo "pm2 status"
echo "pm2 logs msh-form-api --lines 20"
echo ""

echo "【步骤5】测试CORS配置"
echo "curl -X OPTIONS http://112.124.97.58/api/auth/login \\"
echo "  -H \"Origin: http://127.0.0.1:5500\" \\"
echo "  -H \"Access-Control-Request-Method: POST\" \\"
echo "  -H \"Access-Control-Request-Headers: Content-Type,Authorization\" \\"
echo "  -v 2>&1 | grep -i \"access-control\""
echo ""

echo "【步骤6】测试实际POST请求"
echo "curl -X POST http://112.124.97.58/api/auth/login \\"
echo "  -H \"Origin: http://127.0.0.1:5500\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\": \"admin\", \"password\": \"admin123456\"}' \\"
echo "  -v 2>&1 | grep -i \"access-control\""
echo ""

echo "========================================="
echo "完成！现在可以在MSH系统中测试转发功能"
echo "========================================="
