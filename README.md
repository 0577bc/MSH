# MSH签到管理系统

一个基于Firebase的现代化签到管理系统，支持多组管理、实时同步和数据统计。

## 🚀 功能特性

- **多组管理**：支持多个小组的成员管理
- **实时签到**：支持早到、准时、迟到三种签到状态
- **数据同步**：Firebase实时数据库同步
- **统计分析**：日报、季报、年报统计
- **管理后台**：完整的后台管理功能
- **响应式设计**：支持移动端和桌面端

## 📁 项目结构

```
MSH/
├── index.html              # 主签到页面
├── admin.html              # 管理后台
├── daily-report.html       # 日报页面
├── summary.html            # 统计汇总页面
├── config.js               # Firebase配置
├── src/                    # 源代码目录
│   ├── main.js            # 主页面逻辑
│   ├── admin.js           # 管理后台逻辑
│   ├── style.css          # 样式文件
│   ├── firebase-auth.js   # 认证模块
│   ├── data-manager.js    # 数据管理
│   └── ...                # 其他模块
└── debug-group-names.html # 调试工具
```

## 🛠️ 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **后端**：Firebase Realtime Database
- **认证**：Firebase Authentication (简化版)
- **部署**：GitHub Pages

## 🚀 快速开始

### 本地开发

1. **启动开发服务器**：
   ```bash
   python3 start-dev-server.py
   ```

2. **访问应用**：
   - 主页面：http://localhost:8001/
   - 管理后台：http://localhost:8001/admin.html
   - 日报页面：http://localhost:8001/daily-report.html

### 生产部署

1. **配置Firebase**：
   - 更新 `config.js` 中的Firebase配置
   - 设置Firebase数据库规则

2. **部署到GitHub Pages**：
   - 推送代码到GitHub仓库
   - 启用GitHub Pages功能

## 🔧 配置说明

### Firebase配置

在 `config.js` 中配置您的Firebase项目：

```javascript
window.firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 管理员密码

在 `src/firebase-auth.js` 中设置管理员密码：

```javascript
const ADMIN_PASSWORD = 'your-admin-password';
```

## 📊 数据管理

### 小组管理

- 支持添加、编辑、删除小组
- 支持成员管理
- 支持花名功能

### 签到记录

- 自动记录签到时间
- 支持早到、准时、迟到状态
- 支持删除错误记录

### 数据同步

- 实时同步到Firebase
- 本地缓存支持
- 冲突检测和解决

## 🐛 调试工具

### 小组名称调试

访问 `debug-group-names.html` 进行小组名称问题诊断：

- 检查Firebase数据
- 检查本地存储
- 修复数据不一致问题

### 高级修复工具

访问 `fix-ungrouped-advanced.html` 进行深度修复：

- 完整数据诊断
- 强制修复功能
- 数据重置功能

## 🔒 安全特性

- 管理员密码保护
- CSRF保护
- 输入验证和清理
- Firebase安全规则

## 📱 移动端支持

- 响应式设计
- 触摸友好的界面
- 移动端优化的交互

## 🚨 已知问题

1. **"未分组"组显示问题**：
   - 问题：可能显示为"group9"而不是"未分组"
   - 解决：使用调试工具修复数据不一致

2. **Firebase权限问题**：
   - 问题：某些操作可能因权限限制失败
   - 解决：检查Firebase控制台权限设置

## 📝 更新日志

### v1.0.0 (2025-01-09)
- 初始版本发布
- 基础签到功能
- 管理后台
- 数据统计
- 实时同步

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目。

## 📄 许可证

MIT License

## 📞 支持

如有问题，请通过以下方式联系：

- 提交GitHub Issue
- 查看调试工具页面
- 检查Firebase控制台日志

---

**注意**：这是一个内部使用的签到管理系统，请确保在生产环境中正确配置安全设置。