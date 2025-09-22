# 外部系统对接方案设计

## 📋 需求分析

### 当前主日跟踪系统特点
1. **基于UUID的事件跟踪**：所有跟踪记录都使用 `memberUUID` 作为唯一标识
2. **本地存储**：跟踪记录存储在 `localStorage` 的 `msh_sunday_tracking` 键中
3. **Firebase同步**：支持同步到Firebase数据库
4. **数据格式**：JSON格式，包含成员信息、跟踪状态、时间等

### 外部系统对接需求
- 在其他软件中填入对应UUID的跟踪信息
- 与现有系统进行数据匹配和对接
- 支持批量导入和实时同步

## 🔧 对接方案设计

### 方案一：CSV/Excel导入方案

#### 数据格式设计
```csv
memberUUID,memberName,group,status,reason,resolvedBy,createdAt,updatedAt,nextCheckDate
M_张三_2024,张三,琼娜组,resolved,已联系确认,管理员,2025-01-15T10:00:00Z,2025-01-15T10:30:00Z,2025-01-22T00:00:00Z
M_李四_2024,李四,培茹组,tracking,,,2025-01-15T10:00:00Z,2025-01-15T10:00:00Z,
```

#### 字段说明
- `memberUUID`: 成员唯一标识符（必需）
- `memberName`: 成员姓名（用于验证）
- `group`: 所属组别（用于验证）
- `status`: 跟踪状态（tracking/resolved/ignored）
- `reason`: 解决原因或备注
- `resolvedBy`: 解决人
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `nextCheckDate`: 下次检查日期

#### 导入流程
1. 用户准备CSV文件
2. 系统验证数据格式和UUID匹配
3. 合并或更新现有跟踪记录
4. 同步到Firebase

### 方案二：API接口方案

#### RESTful API设计
```javascript
// 获取所有跟踪记录
GET /api/sunday-tracking
Response: {
  "success": true,
  "data": [
    {
      "memberUUID": "M_张三_2024",
      "memberName": "张三",
      "group": "琼娜组",
      "status": "tracking",
      "consecutiveAbsences": 3,
      "lastAttendanceDate": "2025-01-08T09:00:00Z",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}

// 更新跟踪记录
PUT /api/sunday-tracking/{memberUUID}
Request: {
  "status": "resolved",
  "reason": "已联系确认",
  "resolvedBy": "管理员"
}
Response: {
  "success": true,
  "message": "跟踪记录已更新"
}

// 批量导入跟踪记录
POST /api/sunday-tracking/batch
Request: {
  "records": [
    {
      "memberUUID": "M_张三_2024",
      "status": "resolved",
      "reason": "已联系确认",
      "resolvedBy": "管理员"
    }
  ]
}
```

### 方案三：Webhook实时同步方案

#### Webhook配置
```javascript
// 配置Webhook URL
const webhookConfig = {
  url: "https://external-system.com/webhook/sunday-tracking",
  events: ["tracking_created", "tracking_updated", "tracking_resolved"],
  secret: "your-webhook-secret"
};

// 发送Webhook事件
function sendWebhookEvent(eventType, data) {
  fetch(webhookConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': webhookConfig.secret,
      'X-Event-Type': eventType
    },
    body: JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: data
    })
  });
}
```

## 🔄 数据匹配策略

### UUID匹配优先级
1. **精确匹配**：`memberUUID` 完全匹配
2. **姓名+组别匹配**：当UUID不存在时，使用姓名和组别组合匹配
3. **模糊匹配**：支持姓名相似度匹配（用于处理姓名变更）

### 数据合并规则
```javascript
const mergeRules = {
  // 状态优先级：resolved > ignored > tracking
  statusPriority: ['resolved', 'ignored', 'tracking'],
  
  // 时间优先级：较新的记录优先
  timePriority: 'newer',
  
  // 冲突解决：外部数据优先
  conflictResolution: 'external'
};
```

## 🛠️ 实现方案

### 方案一实现（推荐）
```javascript
// 导入CSV数据
async function importTrackingData(csvData) {
  const records = parseCSV(csvData);
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const record of records) {
    try {
      // 验证UUID是否存在
      const member = await validateMemberUUID(record.memberUUID);
      if (!member) {
        results.failed++;
        results.errors.push(`UUID ${record.memberUUID} 不存在`);
        continue;
      }
      
      // 更新或创建跟踪记录
      await updateTrackingRecord(record);
      results.success++;
      
    } catch (error) {
      results.failed++;
      results.errors.push(`处理记录失败: ${error.message}`);
    }
  }
  
  return results;
}

// 验证成员UUID
async function validateMemberUUID(memberUUID) {
  // 从现有数据中查找匹配的成员
  const allMembers = Object.values(window.groups).flat();
  return allMembers.find(member => member.uuid === memberUUID);
}

// 更新跟踪记录
async function updateTrackingRecord(record) {
  const existingRecord = window.utils.SundayTrackingManager.getTrackingRecord(record.memberUUID);
  
  const updatedRecord = {
    ...existingRecord,
    ...record,
    updatedAt: new Date().toISOString()
  };
  
  await window.utils.SundayTrackingManager.saveTrackingRecord(updatedRecord);
  
  // 同步到Firebase
  if (window.newDataManager) {
    window.newDataManager.markDataChange('sundayTracking', 'modified', record.memberUUID);
  }
}
```

### 导入界面设计
```html
<!-- 导入界面 -->
<div class="import-section">
  <h3>📥 导入跟踪数据</h3>
  <input type="file" id="csvFile" accept=".csv,.xlsx" />
  <button onclick="importCSV()">导入数据</button>
  
  <div id="importResults" style="display: none;">
    <h4>导入结果</h4>
    <p>成功: <span id="successCount">0</span></p>
    <p>失败: <span id="failedCount">0</span></p>
    <div id="errorList"></div>
  </div>
</div>
```

## 📊 数据验证和错误处理

### 验证规则
1. **UUID格式验证**：确保UUID格式正确
2. **成员存在性验证**：确保UUID对应的成员存在
3. **状态值验证**：确保状态值在允许范围内
4. **时间格式验证**：确保时间格式正确

### 错误处理
```javascript
const validationRules = {
  memberUUID: {
    required: true,
    pattern: /^M_[^_]+_\d{4}$/,
    message: "UUID格式应为 M_姓名_年份"
  },
  status: {
    required: true,
    enum: ['tracking', 'resolved', 'ignored'],
    message: "状态值应为 tracking、resolved 或 ignored"
  },
  createdAt: {
    required: true,
    format: 'ISO8601',
    message: "时间格式应为 ISO8601 格式"
  }
};
```

## 🔐 安全考虑

### 数据安全
1. **输入验证**：严格验证所有输入数据
2. **权限控制**：只有管理员可以导入数据
3. **数据备份**：导入前自动备份现有数据
4. **审计日志**：记录所有导入操作

### 实现示例
```javascript
// 权限检查
function checkImportPermission() {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'admin';
}

// 数据备份
async function backupBeforeImport() {
  const backupData = {
    timestamp: new Date().toISOString(),
    trackingRecords: window.utils.SundayTrackingManager.getTrackingRecords(),
    groups: window.groups,
    attendanceRecords: window.attendanceRecords
  };
  
  localStorage.setItem('backup_before_import', JSON.stringify(backupData));
}
```

## 📈 监控和报告

### 导入统计
- 成功导入记录数
- 失败记录数及原因
- 数据冲突处理情况
- 导入时间统计

### 数据质量报告
- UUID覆盖率
- 数据完整性检查
- 重复记录检测
- 异常数据识别

## 🚀 部署建议

### 分阶段实施
1. **第一阶段**：实现CSV导入功能
2. **第二阶段**：添加数据验证和错误处理
3. **第三阶段**：实现API接口
4. **第四阶段**：添加Webhook实时同步

### 测试策略
1. **单元测试**：测试各个功能模块
2. **集成测试**：测试与现有系统的集成
3. **用户测试**：让用户测试导入功能
4. **性能测试**：测试大数据量导入性能

---

**推荐使用方案一（CSV导入）作为初始实现，简单易用，风险较低。**
