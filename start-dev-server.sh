#!/bin/bash

echo "🚀 启动MSH签到系统开发服务器"
echo

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3未安装"
    echo "请安装Python3: brew install python3"
    exit 1
fi

# 给脚本执行权限
chmod +x start-dev-server.py

# 启动服务器
echo "📁 当前目录: $(pwd)"
echo "🌐 访问地址: http://localhost:8000"
echo "🔧 解决Firebase CORS问题"
echo "⏹️  按 Ctrl+C 停止服务器"
echo "----------------------------------------"

python3 start-dev-server.py
