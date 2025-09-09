# Firebase安全规则设置指南

## 问题诊断

如果遇到"Firebase验证失败"错误，通常是由于Firebase数据库安全规则限制导致的。

## 解决方案

### 1. 检查Firebase控制台

1. 访问 [Firebase控制台](https://console.firebase.google.com/)
2. 选择您的项目：`yjys-4102e`
3. 进入 **Realtime Database** 页面
4. 点击 **规则** 标签

### 2. 当前安全规则

如果您的规则类似这样（过于严格）：
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### 3. 推荐的临时规则（用于测试）

将规则替换为：
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### 4. 生产环境推荐规则

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "groups": {
      ".read": true,
      ".write": true,
      ".validate": "newData.hasChildren()"
    },
    "groupNames": {
      ".read": true,
      ".write": true,
      ".validate": "newData.hasChildren()"
    },
    "attendanceRecords": {
      ".read": true,
      ".write": true,
      ".validate": "newData.hasChildren()"
    },
    "admins": {
      ".read": true,
      ".write": true
    }
  }
}
```

## 操作步骤

1. **复制规则**：复制上面的推荐规则
2. **粘贴规则**：在Firebase控制台的规则编辑器中粘贴
3. **发布规则**：点击"发布"按钮
4. **测试连接**：使用 `firebase-connection-test.html` 测试连接

## 注意事项

⚠️ **安全警告**：上述规则允许所有用户读写数据，仅适用于内部使用的签到系统。

## 测试工具

使用以下工具测试Firebase连接：
- `firebase-connection-test.html` - Firebase连接测试
- `fix-ungrouped-final.html` - 未分组组修复工具

## 常见错误

1. **权限被拒绝**：检查安全规则是否正确设置
2. **网络错误**：检查网络连接和Firebase配置
3. **配置错误**：检查 `config.js` 中的Firebase配置

## 联系支持

如果问题仍然存在，请检查：
1. Firebase项目状态是否正常
2. 数据库URL是否正确
3. API密钥是否有效