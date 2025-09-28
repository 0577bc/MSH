# 阿里云配置详细指南 - MSH表单系统集成

## 📋 项目概述

**项目名称**: MSH表单系统集成  
**技术栈**: Node.js + Express + MySQL + 阿里云  
**目标**: 创建自建表单系统，支持数据转发和回填  
**成本预算**: 960元/年  

## 🎯 配置目标

### 核心组件
- **ECS实例**: 运行Node.js应用
- **RDS实例**: MySQL数据库
- **VPC网络**: 专有网络隔离
- **安全组**: 网络安全控制
- **资源组**: 资源管理

## 🖥️ ECS实例配置

### 实例规格
```
实例名称: msh-form-system
实例ID: i-bp1grusqte145vdchert
实例规格: ecs.t6-c1m2.large
CPU: 2核
内存: 4GB
操作系统: Ubuntu 20.04 64位
系统盘: 40GB ESSD云盘
状态: 运行中 ✅
开发环境: Node.js 18.20.8, npm 10.8.2, PM2 ✅
Web服务器: Nginx 1.18.0 ✅
```

### 网络配置
```
公网IP: 112.124.97.58 ✅ 可访问
私网IP: 172.16.1.168 ✅ 已配置
VPC ID: vpc-bp1tty2xcj8g5jnmwm1kc ✅ 已创建
交换机ID: vsw-bp1wpsoxuw3pd968k2uov ✅ 已创建
带宽: 5Mbps ✅ 已配置
计费方式: 按使用流量 ✅ 已配置
安全组: sg-bp1fe8fw27x52320n0qy ✅ 已关联
网络连通性: ping、SSH、HTTP测试通过 ✅
```

### 创建步骤
1. **进入ECS控制台**
2. **点击"创建实例"**
3. **选择配置**:
   - 付费模式: 包年包月
   - 地域: 华东1（杭州）
   - 实例规格: ecs.t6-c1m2.large
   - 镜像: Ubuntu 20.04 64位
   - 系统盘: 40GB ESSD云盘
4. **网络配置**:
   - 专有网络: msh-form-system-vpc
   - 交换机: msh-form-system-switch
   - 公网IP: 分配公网IP
   - 带宽: 5Mbps
5. **安全组**: 创建新安全组
6. **登录凭证**: 设置root密码
7. **确认订单**: 完成支付

## 🌐 VPC网络配置

### VPC基础配置
```
VPC名称: msh-form-system-vpc
VPC ID: vpc-bp1tty2xcj8g5jnmwm1kc
IPv4网段: 172.16.0.0/16
地域: 华东1（杭州）
状态: 可用
公网访问: 已启用
```

### 交换机配置
```
交换机名称: msh-form-system-switch
交换机ID: vsw-bp1pa74chgg1wb6h06tr3
IPv4网段: 172.16.1.0/24
可用区: 杭州可用区B
可用IP数: 252个
状态: 可用
```

### 路由表配置
```
默认路由: 0.0.0.0/0 → NAT网关
内网路由: 172.16.0.0/16 → 本地
DNS服务器: 100.100.2.136, 100.100.2.138
```

### 创建步骤
1. **进入VPC控制台**
2. **创建专有网络**:
   - 名称: msh-form-system-vpc
   - IPv4网段: 172.16.0.0/16
   - 地域: 华东1（杭州）
3. **创建交换机**:
   - 名称: msh-form-system-switch
   - IPv4网段: 172.16.1.0/24
   - 可用区: 杭州可用区B
4. **配置路由表**:
   - 默认路由: 0.0.0.0/0 → NAT网关
   - 内网路由: 172.16.0.0/16 → 本地

## 🔒 安全组配置

### 安全组基础配置
```
安全组名称: msh-form-system-sg
描述: MSH表单系统专用安全组
网络类型: 专有网络VPC
地域: 华东1（杭州）
```

### 入方向规则
```
规则1: SSH访问
- 协议类型: SSH
- 端口范围: 22/22
- 授权对象: 0.0.0.0/0
- 描述: SSH远程管理
- 优先级: 1

规则2: HTTP访问
- 协议类型: HTTP
- 端口范围: 80/80
- 授权对象: 0.0.0.0/0
- 描述: HTTP Web访问
- 优先级: 1

规则3: HTTPS访问
- 协议类型: HTTPS
- 端口范围: 443/443
- 授权对象: 0.0.0.0/0
- 描述: HTTPS安全Web访问
- 优先级: 1

规则4: Node.js应用
- 协议类型: 自定义TCP
- 端口范围: 3000/3000
- 授权对象: 0.0.0.0/0
- 描述: Node.js应用服务
- 优先级: 1

规则5: MySQL数据库
- 协议类型: MySQL
- 端口范围: 3306/3306
- 授权对象: 172.16.0.0/16
- 描述: MySQL数据库内网访问
- 优先级: 1
```

### 出方向规则
```
规则1: 全部出站
- 协议类型: 全部
- 端口范围: -1/-1
- 授权对象: 0.0.0.0/0
- 描述: 允许所有出站流量
- 优先级: 1
```

### 创建步骤
1. **进入ECS控制台**
2. **点击"网络和安全组" → "安全组"**
3. **点击"创建安全组"**
4. **填写基础配置**:
   - 名称: msh-form-system-sg
   - 描述: MSH表单系统专用安全组
   - 网络类型: 专有网络VPC
   - 地域: 华东1（杭州）
5. **配置入方向规则**: 按上述规则添加
6. **配置出方向规则**: 允许全部
7. **点击"确定"创建**
8. **关联到ECS实例**:
   - 选择ECS实例
   - 点击"更多" → "网络和安全组" → "更换安全组"
   - 选择新创建的安全组

## 🗄️ RDS MySQL实例配置

### 实例规格
```
数据库类型: MySQL ✅
版本: MySQL 8.0.36 ✅
实例规格: rds.mysql.s2.large ✅
实例ID: rm-bp1863f84204h1973 ✅
CPU: 1核 ✅
内存: 2GB ✅
存储: 20GB 高性能云盘 ✅
网络类型: 专有网络VPC ✅
状态: 运行中 ✅
```

### 网络配置
```
VPC: msh-form-system-vpc (vpc-bp1tty2xcj8g5jnmwm1kc) ✅
交换机: msh-form-system-switch (vsw-bp1wpsoxuw3pd968k2uov) ✅
内网地址: rm-bp1863f84204h1973.mysql.rds.aliyuncs.com ✅
端口: 3306 ✅
白名单: 172.16.0.0/16 ✅ 已配置
连接状态: 正常 ✅ 已连接
```

### 数据库配置
```
数据库名: msh_form_system ✅ 已创建
用户名: msh_admin ✅ 已配置
密码: 已设置强密码 ✅ 已配置
字符集: utf8mb4 ✅ 已配置
排序规则: utf8mb4_unicode_ci ✅ 已配置
连接状态: 正常 ✅ 已连接
```

### 创建步骤
1. **进入RDS控制台**
2. **点击"创建实例"**
3. **选择配置**:
   - 付费模式: 包年包月
   - 地域: 华东1（杭州）
   - 数据库类型: MySQL
   - 版本: MySQL 8.0
   - 实例规格: rds.mysql.s2.large
   - 存储: 20GB SSD
4. **网络配置**:
   - 网络类型: 专有网络VPC
   - VPC: msh-form-system-vpc
   - 交换机: msh-form-system-switch
5. **数据库配置**:
   - 数据库名: msh_form_system
   - 用户名: msh_admin
   - 密码: 设置强密码
6. **确认订单**: 完成支付

## 📦 资源组配置

### 资源组基础配置
```
资源组名称: msh-form-system-rg
显示名称: MSH表单系统资源组
描述: MSH表单系统项目资源组
```

### 标签配置
```
标签1: Project=MSH-Form-System
标签2: Environment=Production
标签3: Department=IT
```

### 资源分配
```
ECS实例: msh-form-system (i-bp1grusqte145vdchert)
RDS实例: rm-bp1863f84204h1973 ✅ 已创建
VPC: msh-form-system-vpc (vpc-bp1tty2xcj8g5jnmwm1kc)
安全组: msh-form-system-sg (sg-bp1fe8fw27x52320n0qy)
```

### 创建步骤
1. **进入资源组控制台**
2. **点击"创建资源组"**
3. **填写基础配置**:
   - 名称: msh-form-system-rg
   - 显示名称: MSH表单系统资源组
   - 描述: MSH表单系统项目资源组
4. **配置标签**:
   - Project: MSH-Form-System
   - Environment: Production
   - Department: IT
5. **分配资源**:
   - ECS实例: 移动到资源组
   - RDS实例: 创建后移动到资源组
   - VPC: 移动到资源组
   - 安全组: 移动到资源组

## 🔧 服务器环境配置

### 系统更新
```bash
# 更新包列表
sudo apt update

# 升级系统包
sudo apt upgrade -y

# 安装必要工具
sudo apt install curl wget git vim htop -y
```

### 时区配置
```bash
# 设置时区为上海
sudo timedatectl set-timezone Asia/Shanghai

# 验证时区设置
timedatectl
```

### 防火墙配置
```bash
# 安装UFW防火墙
sudo apt install ufw -y

# 允许SSH
sudo ufw allow 22

# 允许HTTP
sudo ufw allow 80

# 允许HTTPS
sudo ufw allow 443

# 允许Node.js应用
sudo ufw allow 3000

# 启用防火墙
sudo ufw enable

# 检查防火墙状态
sudo ufw status
```

### Node.js安装
```bash
# 下载Node.js安装脚本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装Node.js
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### PM2安装
```bash
# 全局安装PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 设置PM2开机自启
pm2 startup
```

### Nginx安装
```bash
# 安装Nginx
sudo apt install nginx -y

# 启动Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

### Nginx配置
```bash
# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/msh-form-system

# 添加以下配置
server {
    listen 80;
    server_name 112.124.97.58;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 创建软链接
sudo ln -s /etc/nginx/sites-available/msh-form-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

## 📋 配置检查清单

### ECS实例检查 ✅ 已完成
- [x] 实例名称: msh-form-system
- [x] 实例规格: ecs.t6-c1m2.large
- [x] 操作系统: Ubuntu 20.04 64位
- [x] 系统盘: 40GB ESSD云盘
- [x] 公网IP: 112.124.97.58
- [x] 私网IP: 172.16.1.168
- [x] 带宽: 5Mbps
- [x] 状态: 运行中
- [x] 开发环境: Node.js 18.20.8, npm 10.8.2, PM2
- [x] Web服务器: Nginx 1.18.0

### VPC网络检查 ✅ 已完成
- [x] VPC名称: msh-form-system-vpc
- [x] VPC ID: vpc-bp1tty2xcj8g5jnmwm1kc
- [x] IPv4网段: 172.16.0.0/16
- [x] 交换机名称: msh-form-system-switch
- [x] 交换机ID: vsw-bp1pa74chgg1wb6h06tr3
- [x] 交换机网段: 172.16.1.0/24
- [x] 可用区: 杭州可用区B
- [x] 状态: 可用

### 安全组检查 ✅ 已完成
- [x] 安全组名称: msh-form-system-sg
- [x] 网络类型: 专有网络VPC
- [x] SSH规则: 22端口，0.0.0.0/0
- [x] HTTP规则: 80端口，0.0.0.0/0
- [x] HTTPS规则: 443端口，0.0.0.0/0
- [x] Node.js规则: 3000端口，0.0.0.0/0
- [x] MySQL规则: 3306端口，172.16.0.0/16
- [x] 出方向规则: 全部允许
- [x] 关联ECS实例: 已关联

### RDS实例检查 ✅ 已完成
- [x] 数据库类型: MySQL
- [x] 版本: MySQL 8.0.36
- [x] 实例规格: rds.mysql.s2.large
- [x] 实例ID: rm-bp1863f84204h1973
- [x] 存储: 20GB 高性能云盘
- [x] 网络类型: 专有网络VPC
- [x] VPC: msh-form-system-vpc
- [x] 交换机: msh-form-system-switch
- [x] 数据库名: msh_form_system
- [x] 用户名: msh_admin
- [x] 状态: 运行中
- [x] 连接状态: 正常

### 资源组检查 ✅ 已完成
- [x] 资源组名称: msh-form-system-rg
- [x] 显示名称: MSH表单系统资源组
- [x] 项目标签: Project=MSH-Form-System
- [x] 环境标签: Environment=Production
- [x] 部门标签: Department=IT
- [x] ECS实例: 已分配
- [x] RDS实例: 已分配
- [x] VPC: 已分配
- [x] 安全组: 已分配

### 服务器环境检查 ✅ 已完成
- [x] 系统更新: 完成
- [x] 时区配置: Asia/Shanghai
- [x] 防火墙: 已配置
- [x] Node.js: 18.20.8 已安装
- [x] npm: 10.8.2 已安装
- [x] PM2: 已安装并配置开机自启
- [x] Nginx: 1.18.0 已安装并运行
- [x] MySQL客户端: 已安装
- [x] 配置文件: 已配置

## 🔍 配置验证详细步骤

### 1. 实例状态验证
```bash
# 通过阿里云控制台验证
# 1. 登录阿里云控制台
# 2. 进入ECS实例管理页面
# 3. 查看实例状态：应为"运行中"
# 4. 记录实例ID: i-bp1grusqte145vdchert
# 5. 记录公网IP: 112.124.97.58
# 6. 记录私网IP: 172.16.1.168
```

### 2. 网络连通性测试
```bash
# 测试公网连通性
ping 112.124.97.58

# 测试DNS解析
nslookup www.baidu.com

# 测试端口连通性
telnet 112.124.97.58 22
telnet 112.124.97.58 80
telnet 112.124.97.58 443
```

### 3. SSH连接测试
```bash
# 测试SSH连接
ssh root@112.124.97.58

# 如果连接成功，执行以下命令验证系统
uname -a
cat /etc/os-release
df -h
free -h
```

### 4. 安全组规则验证
```bash
# 通过阿里云控制台验证安全组规则
# 1. 进入ECS控制台
# 2. 选择实例 msh-form-system
# 3. 点击"更多" → "网络和安全组" → "安全组"
# 4. 检查安全组 sg-bp1fe8fw27x52320n0qy 的规则
# 5. 验证以下端口是否开放：
#    - SSH (22端口): 0.0.0.0/0
#    - HTTP (80端口): 0.0.0.0/0
#    - HTTPS (443端口): 0.0.0.0/0
#    - Node.js (3000端口): 0.0.0.0/0
#    - MySQL (3306端口): 172.16.0.0/16
```

### 5. VPC网络验证
```bash
# 通过阿里云控制台验证VPC配置
# 1. 进入VPC控制台
# 2. 查看VPC: msh-form-system-vpc (vpc-bp1tty2xcj8g5jnmwm1kc)
# 3. 查看交换机: msh-form-system-switch (vsw-bp1wpsoxuw3pd968k2uov)
# 4. 验证网段配置: 172.16.1.0/24
# 5. 验证ECS实例私网IP: 172.16.1.168
```

### 6. 系统环境验证
```bash
# SSH连接到ECS实例后执行
# 检查系统信息
cat /etc/os-release
uname -a

# 检查网络配置
ip addr show
ip route show

# 检查防火墙状态
sudo ufw status

# 检查系统资源
df -h
free -h
top -n 1
```

### 7. 应用端口测试
```bash
# 测试HTTP端口
curl -I http://112.124.97.58

# 测试HTTPS端口
curl -I https://112.124.97.58

# 测试自定义端口（如果应用已部署）
curl -I http://112.124.97.58:3000
```

### 8. 内网连通性测试
```bash
# 在ECS实例上测试内网连通性
# 测试VPC网关
ping 172.16.1.1

# 测试内网DNS
nslookup aliyun.com

# 测试内网其他实例（如果有）
ping 172.16.1.2
```

## 🔍 网络连通性测试

### 内网连通性测试
```bash
# 测试VPC内网连通性
ping 172.16.1.1

# 测试ECS到RDS连通性
telnet 172.16.1.20 3306

# 测试内网DNS解析
nslookup aliyun.com
```

### 公网连通性测试
```bash
# 测试公网访问
curl http://www.baidu.com

# 测试DNS解析
nslookup www.baidu.com

# 测试端口连通性
telnet www.baidu.com 80
```

### 应用连通性测试
```bash
# 测试SSH连接
ssh root@112.124.97.58

# 测试HTTP访问
curl http://112.124.97.58

# 测试HTTPS访问
curl https://112.124.97.58

# 测试Node.js应用
curl http://112.124.97.58:3000
```

## 💰 成本分析

### 月度成本
- **ECS实例**: 约45元/月
- **RDS实例**: 约25元/月
- **带宽**: 约25元/月
- **总计**: 约95元/月

### 年度成本
- **ECS实例**: 约540元/年
- **RDS实例**: 约300元/年
- **带宽**: 约300元/年
- **总计**: 约1140元/年

### 成本优化建议
1. **按需使用**: 根据实际使用量调整配置
2. **监控成本**: 定期检查费用使用情况
3. **资源优化**: 合理配置实例规格
4. **带宽优化**: 根据访问量调整带宽

## ⚠️ 注意事项

### 安全注意事项
1. **密码安全**: 使用强密码
2. **访问控制**: 限制不必要的访问
3. **定期更新**: 保持系统和软件最新
4. **监控日志**: 定期检查访问日志

### 性能注意事项
1. **资源监控**: 监控CPU和内存使用率
2. **网络监控**: 监控网络流量
3. **存储监控**: 监控磁盘使用率
4. **应用监控**: 监控应用性能

### 备份注意事项
1. **数据备份**: 定期备份重要数据
2. **配置备份**: 备份系统配置
3. **代码备份**: 备份应用代码
4. **恢复测试**: 定期测试恢复流程

## 🎯 下一步操作

### 1. 立即操作
- **调整ECS实例网络配置**
- **创建RDS实例**
- **配置安全组**
- **部署应用**

### 2. 验证配置
- **测试网络连通性**
- **检查应用访问**
- **验证数据库连接**
- **测试完整功能**

### 3. 优化配置
- **性能优化**
- **安全加固**
- **监控配置**
- **备份策略**

---

**创建时间**: 2025-09-28  
**版本**: 1.0  
**维护者**: MSH开发团队  
**状态**: 配置完成，准备部署
