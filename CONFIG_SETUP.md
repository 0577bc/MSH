# MSH系统配置指南

## 🚨 首次使用必读

### 步骤1: 创建配置文件

```bash
# 复制配置模板
cp config.example.js config.js
```

### 步骤2: 配置Firebase

1. 登录 [Firebase Console](https://console.firebase.google.com/)
2. 选择您的项目（或创建新项目）
3. 进入项目设置 → 常规 → 您的应用 → Web应用
4. 复制Firebase配置信息

### 步骤3: 修改config.js

打开 `config.js`，替换以下配置：

```javascript
window.firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",              // ← 替换为您的API密钥
  authDomain: "your-project.firebaseapp.com",   // ← 替换为您的项目域名
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",  // ← 替换为数据库URL
  projectId: "your-project-id",                 // ← 替换为项目ID
  storageBucket: "your-project.firebasestorage.app",  // ← 替换为存储桶
  messagingSenderId: "YOUR_SENDER_ID",          // ← 替换为发送者ID
  appId: "YOUR_APP_ID"                          // ← 替换为应用ID
};
```

### 步骤4: 配置外部表单系统（可选）

如果需要使用外部表单系统功能，修改：

```javascript
window.externalFormConfig = {
  apiBaseUrl: 'http://your-server-ip/api',     // ← 替换为您的服务器地址
  auth: {
    username: 'your-username',                  // ← 替换为用户名
    password: 'your-password',                  // ← 替换为密码
    token: null
  },
  // ...
};
```

## ⚠️ 安全注意事项

### 🔴 绝对禁止

- ❌ **不要**将 `config.js` 上传到GitHub
- ❌ **不要**分享包含真实密钥的配置文件
- ❌ **不要**在公开场合展示配置文件内容

### ✅ 安全实践

- ✅ `config.js` 已在 `.gitignore` 中
- ✅ 只上传 `config.example.js` 模板
- ✅ 真实配置只保存在本地
- ✅ 定期更新Firebase安全规则

## 📋 检查清单

配置完成后，请确认：

- [ ] 已创建 `config.js` 文件
- [ ] 已填写正确的Firebase配置
- [ ] Firebase项目可以正常访问
- [ ] `config.js` 不在git追踪中
- [ ] 系统可以正常运行

## 🔧 故障排除

### 问题1: 无法连接Firebase

**症状**: 控制台显示 "Firebase connection failed"

**解决**:
1. 检查 `config.js` 中的配置是否正确
2. 确认Firebase项目是否已启用
3. 检查网络连接

### 问题2: config.js不存在

**症状**: 控制台显示 "config.js:1 Failed to load resource: the server responded with a status of 404"

**解决**:
```bash
# 方法1: 从模板复制
cp config.example.js config.js
# 然后编辑 config.js 填写真实配置

# 方法2: 如果有SECRETS_VALUES.txt备份
# 使用备份文件中的真实配置创建 config.js
```

**重要说明**:
- ✅ `config.js` 会被 `.gitignore` 自动忽略
- ✅ 不会被上传到GitHub，隐私受保护
- ✅ `config.example.js` 和 `config.js` 两个文件都必须存在

### 问题3: 语法错误

**症状**: 控制台显示 "Uncaught SyntaxError: Unexpected token"

**原因**: 配置文件中存在语法错误（如多余的等号、逗号等）

**解决**:
1. 打开 `config.js` 检查错误行号
2. 常见错误：
   - `name:="value"` → 应该是 `name: "value"`
   - 对象最后一项多了逗号
   - 引号不匹配
3. 使用代码编辑器的语法检查功能
4. 参考 `config.example.js` 的正确格式

### 问题4: 权限被拒绝

**症状**: 数据库操作失败

**解决**:
1. 检查Firebase数据库规则
2. 确认认证配置正确
3. 查看Firebase控制台中的日志

## 📚 相关文档

- [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) - 项目概述
- [README.md](./README.md) - 项目说明
- [MANDATORY_RULES.md](./MANDATORY_RULES.md) - 强制规则

---

**创建日期**: 2025-10-08  
**最后更新**: 2025-10-09
