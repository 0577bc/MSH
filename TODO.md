# MSH系统 - 待办事项

> 创建日期：2025-10-09  
> 最后更新：2025-10-10  
> 说明：记录需要处理但非紧急的优化项目

---

## 🔴 高优先级

（目前无紧急事项）

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

### 历史数据时区扫描（2025-10-10）✅
- ✅ 使用增强的时间格式修复工具扫描
- ✅ 扫描结果：446条记录，0条问题记录
- ✅ 结论：所有历史数据的date字段都正确，无需修复
- ✅ 原因：之前的UTC时区修复已解决新记录问题，历史数据本身没有问题

### 文档整理和归档（2025-10-10）✅
- ✅ 删除4个重复/过时文档（减少1048行）
- ✅ 归档16个历史文档到docs/archive/2025-10/
- ✅ 文档总数：123 → 86（减少30%）
- ✅ 主文档区域更清晰

### 日报表和签到页面数据显示修复（2025-10-10）
- ✅ 修复summary.js初始化问题（initializePage未调用）
- ✅ 修复main.js数据显示问题（变量引用和日期格式）
- ✅ 增强时间格式修复工具（添加Date字段时区修复功能）
- ✅ 强化数据修复工具安全性（数据量验证+详细日志+三次确认）
- ✅ 记忆系统优化（P1级规则强化、工具创建规则）

### Vercel部署环境完全修复（2025-10-09）
- ✅ 智能配置加载器：自动环境检测和配置文件选择
- ✅ Firebase初始化：同步加载机制，支持本地和Vercel环境
- ✅ 数据同步：修复验证逻辑，解决手动同步失败问题
- ✅ 工具页面：支持子目录页面，动态路径计算
- ✅ 成员管理：修复JavaScript错误，添加缺失函数
- ✅ 数据管理器：添加window.dataManager实例和方法

### 数据同步bug修复（2025-10-09）
- ✅ 修复：误报"有未同步数据"
- ✅ 修复：签到记录无法同步到Firebase
- ✅ 优化：避免重复添加已存在的记录
- ✅ 修复：数据验证逻辑错误，解决手动同步失败

### memberSnapshot精简（2025-10-09）
- ✅ 移除冗余字段：id, phone, gender, baptized, age, joinDate
- ✅ 保留必需字段：uuid, name, nickname
- ✅ 节省数据量约30%

### 系统稳定性提升（2025-10-09）
- ✅ 错误处理：完善降级机制和错误恢复
- ✅ 性能监控：内存使用和加载性能监控
- ✅ 实时更新：事件状态更新和页面同步
- ✅ 缓存优化：统一缓存管理器

---

**最后更新**：2025-10-10

