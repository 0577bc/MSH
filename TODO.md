# MSH系统 - 待办事项

> 创建日期：2025-10-09  
> 说明：记录需要处理但非紧急的优化项目

---

## 🟡 中优先级

### Firebase索引配置（性能优化）

**目标**：消除Firebase索引警告，提升查询性能

**警告信息**：
```
@firebase/database: FIREBASE WARNING: Using an unspecified index. 
Your data will be downloaded and filtered on the client. 
Consider adding ".indexOn": "date" at /attendanceRecords 
to your security rules for better performance.
```

**影响**：
- 当前影响：轻微（数据在客户端过滤）
- 性能影响：查询速度略慢（约1-2秒）
- 优先级：中（不影响功能，但可以提升体验）

**配置步骤**：

1. 登录Firebase Console
   - https://console.firebase.google.com/
   
2. 进入Realtime Database → Rules

3. 添加索引配置：
```json
{
  "rules": {
    "attendanceRecords": {
      ".indexOn": ["date", "time"],
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

4. 点击"Publish"发布

**详细文档**：`docs/FIREBASE_INDEX_CONFIG.md`

**预期效果**：
- 消除控制台警告
- 查询速度提升约50-70%
- 对用户透明（无需代码修改）

---

## 🟢 低优先级

### 性能监控API更新

**目标**：更新已废弃的性能监控API

**警告信息**：
```
performance-monitor.js:444 Deprecated API for given entry type.
performance-monitor.js:449 Deprecated API for given entry type.
```

**影响**：无（功能正常，只是API已废弃）

**优先级**：低（可以忽略）

---

## ✅ 已完成

### 数据同步bug修复（2025-10-09）
- ✅ 修复：误报"有未同步数据"
- ✅ 修复：签到记录无法同步到Firebase
- ✅ 优化：避免重复添加已存在的记录

### memberSnapshot精简（2025-10-09）
- ✅ 移除冗余字段：id, phone, gender, baptized, age, joinDate
- ✅ 保留必需字段：uuid, name, nickname
- ✅ 节省数据量约30%

---

**最后更新**：2025-10-09

