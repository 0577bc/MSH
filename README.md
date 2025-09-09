# MSH 签到系统

一个基于Web的签到管理系统，支持多小组管理、实时数据同步和自动备份。

## 🚀 快速开始

### 本地开发
```bash
# 使用Python启动本地服务器
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000
```

访问 `http://localhost:8000` 开始使用。

## 📁 项目结构

```
MSH/
├── index.html                    # 主页面
├── admin.html                    # 管理页面
├── summary.html                  # 签到汇总页面
├── daily-report.html             # 日报页面
├── config.js                     # 系统配置
├── manifest.json                 # PWA配置
├── favicon.ico                   # 网站图标
├── src/                          # 源代码目录
│   ├── main.js                   # 主逻辑
│   ├── admin.js                  # 管理逻辑
│   ├── summary.js                # 汇总逻辑
│   ├── daily-report.js           # 日报逻辑
│   ├── utils.js                  # 工具函数
│   ├── data-manager.js           # 数据管理
│   ├── session-storage-manager.js # SessionStorage管理
│   ├── independent-backup-manager.js # 独立备份管理
│   ├── style.css                 # 主样式
│   ├── virtual-scroll.css        # 虚拟滚动样式
│   ├── virtual-scroll.js         # 虚拟滚动功能
│   ├── security.js               # 安全模块
│   ├── performance-monitor.js    # 性能监控
│   ├── csrf-protection.js        # CSRF保护
│   ├── cache-manager.js          # 缓存管理
│   ├── accessibility-simple.js   # 简化可访问性
│   ├── config-manager.js         # 配置管理
│   └── service-worker.js         # 服务工作者
```

## 🔧 核心功能

### 数据存储架构
- **SessionStorage**: 会话级本地存储，浏览器关闭后自动清除
- **Firebase**: 云端实时数据库，永久保存和同步
- **独立备份**: 24小时自动备份，保留10天，与操作数据完全隔离

### 主要功能
- ✅ 多小组签到管理
- ✅ 实时数据同步
- ✅ 自动备份系统
- ✅ 签到汇总统计
- ✅ 日报生成
- ✅ 管理员权限控制
- ✅ 数据导入导出
- ✅ 离线支持

## 🛠️ 管理工具

### 存储备份管理

## ⚙️ 配置

### Firebase配置
在 `config.js` 中配置Firebase连接信息：
```javascript
window.firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 系统配置
在 `config.js` 中配置系统参数：
- 小组名称和成员
- 管理员设置
- 系统选项

## 🔒 安全特性

- **CSRF保护**: 防止跨站请求伪造
- **输入验证**: 所有用户输入都经过验证
- **权限控制**: 基于Firebase安全规则
- **数据加密**: 敏感数据加密存储
- **备份隔离**: 备份系统与操作数据完全独立

## 📊 性能优化

- **智能缓存**: 5分钟缓存减少网络请求
- **虚拟滚动**: 大数据量高效渲染
- **异步处理**: 非阻塞数据操作
- **压缩存储**: 自动数据压缩
- **性能监控**: 实时性能统计

## 🚀 部署

### GitHub Pages
1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择部署分支
4. 访问生成的URL

### 其他静态托管
- Netlify
- Vercel
- Firebase Hosting
- 任何支持静态文件的服务器

## 📝 使用说明

### 管理员登录
- 访问 `admin.html`
- 输入管理员密码
- 进行系统管理操作

### 签到操作
- 访问主页面
- 选择小组
- 点击成员进行签到

### 查看汇总
- 访问 `summary.html`
- 选择日期查看签到统计
- 导出数据或生成报告

## 🔧 故障排除

### 常见问题
1. **Firebase连接失败**: 检查网络连接和配置
2. **数据同步问题**: 使用管理工具检查状态
3. **备份恢复失败**: 验证备份文件完整性
4. **性能问题**: 检查缓存和网络状态

### 技术支持
- 使用内置的诊断工具
- 查看浏览器控制台错误
- 检查网络连接状态
- 验证Firebase配置

## 📄 许可证

本项目采用MIT许可证。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目。

---

**注意**: 请确保在生产环境中正确配置Firebase安全规则和API密钥。
