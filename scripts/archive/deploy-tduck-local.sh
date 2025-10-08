#!/bin/bash

# 本地tduck-platform部署脚本
# 执行时间: 2025-09-29

echo "🚀 开始本地部署tduck-platform..."

# 1. 检查Docker环境
echo "🔍 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    echo "执行: brew install docker docker-compose"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    echo "执行: brew install docker-compose"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 2. 创建部署目录
echo "📁 创建部署目录..."
mkdir -p ~/tduck-platform
cd ~/tduck-platform

# 3. 克隆项目
echo "📥 克隆tduck-platform项目..."
if [ ! -d ".git" ]; then
    git clone https://gitee.com/canonical-entropy/tduck-platform.git .
    echo "✅ 项目克隆完成"
else
    echo "✅ 项目已存在，跳过克隆"
fi

# 4. 配置环境变量
echo "⚙️ 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ 环境变量文件已创建"
else
    echo "✅ 环境变量文件已存在"
fi

# 5. 创建自定义环境变量配置
echo "🔧 创建自定义环境变量配置..."
cat > .env << 'EOF'
# 数据库配置
MYSQL_ROOT_PASSWORD=tduck123456
MYSQL_DATABASE=tduck
MYSQL_USER=tduck
MYSQL_PASSWORD=tduck123456

# Redis配置
REDIS_PASSWORD=tduck123456

# 应用配置
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
ADMIN_EMAIL=admin@tduck.com

# 域名配置（本地）
DOMAIN=localhost

# JWT配置
JWT_SECRET=tduck-jwt-secret-key-2025
JWT_EXPIRATION=86400

# 文件上传配置
UPLOAD_PATH=/opt/tduck-platform/uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=INFO
LOG_PATH=/opt/tduck-platform/logs
EOF

echo "✅ 环境变量配置完成"

# 6. 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p uploads logs backup
chmod 755 uploads logs backup

# 7. 启动服务
echo "🚀 启动tduck-platform服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 8. 等待服务启动
echo "⏳ 等待服务启动（约2-3分钟）..."
sleep 30

# 9. 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 10. 查看启动日志
echo "📋 查看启动日志..."
docker-compose logs --tail=20

# 11. 检查端口监听
echo "🔍 检查端口监听..."
lsof -i :8080 || echo "⚠️ 端口8080检查失败"

# 12. 测试本地访问
echo "🌐 测试本地访问..."
sleep 10
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
    echo "✅ 本地服务启动成功"
else
    echo "⚠️ 本地服务可能未完全启动，请稍等片刻"
fi

# 13. 安装ngrok（用于公网访问）
echo "🌐 安装ngrok用于公网访问..."
if ! command -v ngrok &> /dev/null; then
    echo "📦 安装ngrok..."
    brew install ngrok
    echo "✅ ngrok安装完成"
else
    echo "✅ ngrok已安装"
fi

# 14. 部署完成信息
echo ""
echo "🎉 tduck-platform本地部署完成！"
echo ""
echo "📋 本地访问信息:"
echo "  🌐 本地地址: http://localhost:8080"
echo "  🔑 管理员账号: admin"
echo "  🔐 管理员密码: admin123456"
echo "  📊 管理后台: http://localhost:8080/admin"
echo ""
echo "🌐 公网访问配置:"
echo "  1. 打开新终端窗口"
echo "  2. 执行: ngrok http 8080"
echo "  3. 复制ngrok提供的公网URL"
echo "  4. 更新MSH系统配置中的apiBaseUrl"
echo ""
echo "📋 服务管理命令:"
echo "  📊 查看状态: cd ~/tduck-platform && docker-compose ps"
echo "  📋 查看日志: cd ~/tduck-platform && docker-compose logs -f"
echo "  🔄 重启服务: cd ~/tduck-platform && docker-compose restart"
echo "  🛑 停止服务: cd ~/tduck-platform && docker-compose down"
echo ""
echo "🔧 下一步操作:"
echo "  1. 访问 http://localhost:8080 验证部署"
echo "  2. 使用管理员账号登录"
echo "  3. 创建MSH跟踪表单"
echo "  4. 配置ngrok公网访问"
echo "  5. 更新MSH系统集成配置"
echo ""
echo "✅ 部署完成时间: $(date)"
