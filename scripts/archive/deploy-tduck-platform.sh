#!/bin/bash

# tduck-platform Docker一键部署脚本
# 执行时间: 2025-09-29

echo "🚀 开始部署tduck-platform开源表单系统..."

# 1. 更新系统包
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 2. 安装Docker
echo "🐳 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 3. 安装Docker Compose
echo "🔧 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
else
    echo "✅ Docker Compose已安装"
fi

# 4. 验证安装
echo "🔍 验证安装..."
docker --version
docker-compose --version

# 5. 创建部署目录
echo "📁 创建部署目录..."
mkdir -p /opt/tduck-platform
cd /opt/tduck-platform

# 6. 克隆项目
echo "📥 克隆tduck-platform项目..."
if [ ! -d ".git" ]; then
    git clone https://gitee.com/canonical-entropy/tduck-platform.git .
    echo "✅ 项目克隆完成"
else
    echo "✅ 项目已存在，跳过克隆"
fi

# 7. 配置环境变量
echo "⚙️ 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ 环境变量文件已创建"
else
    echo "✅ 环境变量文件已存在"
fi

# 8. 创建自定义环境变量文件
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

# 域名配置
DOMAIN=112.124.97.58

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

# 9. 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p uploads logs backup
chmod 755 uploads logs backup

# 10. 启动服务
echo "🚀 启动tduck-platform服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 11. 等待服务启动
echo "⏳ 等待服务启动（约2-3分钟）..."
sleep 30

# 12. 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 13. 查看启动日志
echo "📋 查看启动日志..."
docker-compose logs --tail=20

# 14. 检查端口监听
echo "🔍 检查端口监听..."
netstat -tlnp | grep -E "(8080|3306|6379)" || echo "⚠️ 端口检查失败，请手动检查"

# 15. 测试Web访问
echo "🌐 测试Web访问..."
sleep 10
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
    echo "✅ Web服务启动成功"
else
    echo "⚠️ Web服务可能未完全启动，请稍等片刻"
fi

# 16. 配置Nginx反向代理
echo "🔧 配置Nginx反向代理..."
sudo tee /etc/nginx/sites-available/tduck-platform > /dev/null << 'EOF'
server {
    listen 80;
    server_name 112.124.97.58;
    
    # 主应用代理
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:8080;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 17. 启用Nginx配置
echo "🔗 启用Nginx配置..."
sudo ln -sf /etc/nginx/sites-available/tduck-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 18. 最终验证
echo "🧪 最终验证..."
echo "📋 服务状态:"
docker-compose ps

echo "🌐 Web访问测试:"
curl -I http://112.124.97.58 2>/dev/null | head -1 || echo "⚠️ 外部访问测试失败"

echo "🔍 端口监听状态:"
netstat -tlnp | grep -E "(8080|3306|6379)" || echo "⚠️ 端口监听检查失败"

# 19. 部署完成信息
echo ""
echo "🎉 tduck-platform部署完成！"
echo ""
echo "📋 访问信息:"
echo "  🌐 Web界面: http://112.124.97.58"
echo "  🔑 管理员账号: admin"
echo "  🔐 管理员密码: admin123456"
echo "  📊 管理后台: http://112.124.97.58/admin"
echo ""
echo "📋 服务管理命令:"
echo "  📊 查看状态: cd /opt/tduck-platform && docker-compose ps"
echo "  📋 查看日志: cd /opt/tduck-platform && docker-compose logs -f"
echo "  🔄 重启服务: cd /opt/tduck-platform && docker-compose restart"
echo "  🛑 停止服务: cd /opt/tduck-platform && docker-compose down"
echo ""
echo "🔧 下一步操作:"
echo "  1. 访问 http://112.124.97.58 验证部署"
echo "  2. 使用管理员账号登录"
echo "  3. 创建MSH跟踪表单"
echo "  4. 配置MSH系统集成"
echo ""
echo "✅ 部署完成时间: $(date)"
