#!/usr/bin/env python3
"""
开发服务器启动脚本
解决Firebase CORS和OAuth问题
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

def start_server(port=8000):
    """启动本地开发服务器"""
    
    # 切换到项目根目录
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    # 创建服务器
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"🚀 开发服务器已启动")
            print(f"📁 服务目录: {project_root}")
            print(f"🌐 访问地址: http://localhost:{port}")
            print(f"🔧 解决Firebase CORS问题")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 自动打开浏览器
            webbrowser.open(f'http://localhost:{port}')
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {port} 已被占用，尝试使用端口 {port + 1}")
            start_server(port + 1)
        else:
            print(f"❌ 启动服务器失败: {e}")
            sys.exit(1)

if __name__ == "__main__":
    # 检查Python版本
    if sys.version_info < (3, 0):
        print("❌ 需要Python 3.0或更高版本")
        sys.exit(1)
    
    # 启动服务器
    start_server()
