# 部署指南

## 快速部署

### 1. 准备工作
1. 确保您有Firebase项目
2. 复制 `config.example.js` 为 `config.js`
3. 在 `config.js` 中填入您的Firebase配置

### 2. 部署到GitHub Pages
1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择主分支作为源
4. 访问 `https://yourusername.github.io/your-repo-name`

### 3. 部署到其他静态托管服务

#### Netlify
1. 连接GitHub仓库
2. 设置构建命令为空（静态文件）
3. 设置发布目录为根目录
4. 部署

#### Vercel
1. 导入GitHub仓库
2. 选择静态文件项目
3. 部署

#### Firebase Hosting
```bash
# 安装Firebase CLI
npm install -g firebase-tools

# 登录Firebase
firebase login

# 初始化项目
firebase init hosting

# 部署
firebase deploy
```

## 安全配置

### 1. Firebase数据库规则
生产环境建议使用以下规则：

```json
{
  "rules": {
    "groups": {
      ".read": true,
      ".write": "auth != null"
    },
    "groupNames": {
      ".read": true,
      ".write": "auth != null"
    },
    "attendanceRecords": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 2. HTTPS配置
- 确保所有部署都使用HTTPS
- 配置适当的CSP头
- 设置HSTS头

### 3. 环境变量
考虑使用环境变量来管理敏感配置：

```javascript
// 使用环境变量
window.firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  // ...
};
```

## 监控和维护

### 1. 数据备份
- 定期导出Firebase数据
- 设置自动备份脚本
- 监控数据库使用量

### 2. 性能监控
- 使用Firebase Analytics
- 监控页面加载时间
- 设置错误报告

### 3. 安全监控
- 监控异常访问
- 定期检查日志
- 更新依赖包

## 故障排除

### 常见问题

1. **Firebase连接失败**
   - 检查网络连接
   - 验证Firebase配置
   - 检查数据库规则

2. **数据不同步**
   - 检查Firebase配额
   - 验证数据库权限
   - 查看浏览器控制台错误

3. **页面加载缓慢**
   - 优化图片大小
   - 启用CDN
   - 压缩静态资源

### 联系支持
如遇到问题，请：
1. 查看浏览器控制台错误
2. 检查Firebase控制台日志
3. 提交Issue到GitHub仓库
