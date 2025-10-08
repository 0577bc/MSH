#!/bin/bash

# CORS修复脚本 - ECS部署
# 执行时间: 2025-09-29

echo "🔧 开始修复CORS跨域问题..."

# 1. 进入项目目录
cd /opt/msh-form-system

echo "📁 当前目录: $(pwd)"

# 2. 安装cors中间件
echo "📦 安装cors中间件..."
npm install cors

# 3. 验证安装
echo "✅ 验证cors安装..."
npm list cors

# 4. 备份原始app.js
echo "💾 备份原始app.js..."
cp app.js app.js.backup.$(date +%Y%m%d_%H%M%S)

# 5. 修改app.js添加CORS支持
echo "🔧 修改app.js添加CORS支持..."

# 创建新的app.js文件
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
      'https://yourdomain.com'
    ];
    
    // 允许无源请求（如移动应用）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
  console.log(`🚀 MSH表单系统API服务启动成功`);
  console.log(`📡 服务地址: http://112.124.97.58:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
  console.log(`🔐 默认管理员: admin / admin123456`);
  console.log(`📋 API文档: http://112.124.97.58:${PORT}/api/status`);
});

module.exports = app;
EOF

echo "✅ app.js文件已更新，添加了CORS支持"

# 6. 重启PM2应用
echo "🔄 重启PM2应用..."
pm2 restart msh-form-api

# 7. 检查应用状态
echo "📊 检查应用状态..."
pm2 status

# 8. 查看应用日志
echo "📋 查看应用日志..."
pm2 logs msh-form-api --lines 10

# 9. 测试CORS配置
echo "🧪 测试CORS配置..."
curl -X OPTIONS http://112.124.97.58/api/auth/login \
  -H "Origin: http://127.0.0.1:5500" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

echo "✅ CORS修复完成！"
echo "📋 请检查上述输出，确认CORS头信息是否正确返回"
echo "🌐 现在可以在MSH系统中测试转发功能"
