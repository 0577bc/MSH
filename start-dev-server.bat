@echo off
echo 🚀 启动MSH签到系统开发服务器
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    echo 请安装Python: https://python.org
    pause
    exit /b 1
)

REM 启动服务器
echo 📁 当前目录: %CD%
echo 🌐 访问地址: http://localhost:8000
echo 🔧 解决Firebase CORS问题
echo ⏹️  按 Ctrl+C 停止服务器
echo ----------------------------------------

python start-dev-server.py

pause
