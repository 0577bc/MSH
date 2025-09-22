# MSH签到系统 - API文档

## 📋 API概述

**系统名称**：MSH签到系统  
**API版本**：2.0  
**文档版本**：1.0  
**最后更新**：2025-01-18  
**维护者**：MSH技术团队  

## 🎯 API设计原则

### **1. 统一性**
- 所有API使用统一的命名规范
- 统一的错误处理机制
- 统一的响应格式

### **2. 安全性**
- CSRF保护
- 输入数据验证
- 权限控制

### **3. 可靠性**
- 自动重试机制
- 错误恢复
- 数据完整性验证

## 🏗️ 核心API架构

### **1. NewDataManager API**

#### **1.1 数据管理核心类**
```javascript
class NewDataManager {
  constructor()
  async loadAllDataFromFirebase()
  async saveData(dataType, data)
  async performManualSync()
  markDataChange(dataType, changeType, details)
  getData(dataType)
  setData(dataType, data)
}
```

#### **1.2 数据同步API**
```javascript
// 自动同步
async performAutoSync()

// 手动同步
async performManualSync()

// 数据验证
async verifyDataSync(dataType, localData, remoteData)

// 冲突解决
async resolveDataConflict(dataType, localData, remoteData)
```

#### **1.3 数据备份API**
```javascript
// 备份到Firebase
async backupToFirebase(dataType, data)

// 备份到本地存储
backupToLocal(dataType, data)

// 从备份恢复
async restoreFromBackup(dataType, backupData)
```

### **2. 页面管理API**

#### **2.1 主页面API (main.js)**
```javascript
// Firebase初始化
function initializeFirebase()

// 数据加载
async function loadData()

// 成员签到
async function signInMember(memberId, groupName)

// 新成员添加
async function handleSaveNewMember(memberData)

// 小组和成员加载
function loadGroupsAndMembers()

// 签到记录加载
function loadAttendanceRecords()
```

#### **2.2 管理页面API (admin.js)**
```javascript
// 管理员登录
async function authenticateAdmin(password)

// 小组管理
async function createGroup(groupName, displayName)
async function updateGroup(groupName, newData)
async function deleteGroup(groupName)

// 成员管理
async function addMember(groupName, memberData)
async function updateMember(groupName, memberIndex, newData)
async function deleteMember(groupName, memberIndex)

// 数据导入导出
async function exportData(format)
async function importData(file)
```

#### **2.3 报表页面API (summary.js)**
```javascript
// 日报表生成
async function generateDailyReport(date)

// 季度报表生成
async function generateQuarterlyReport(quarter, year)

// 年度报表生成
async function generateYearlyReport(year)

// 数据导出
async function exportReport(reportType, format)
```

### **3. 工具函数API (utils.js)**

#### **3.1 数据工具**
```javascript
// UUID生成
function generateUUID()

// 数据验证
function validateData(data, schema)

// 数据转换
function convertDataFormat(data, fromFormat, toFormat)

// 数据清理
function cleanData(data)
```

#### **3.2 时间工具**
```javascript
// 时间格式化
function formatTime(timestamp, format)

// 日期计算
function calculateDateDifference(date1, date2)

// 时间验证
function validateTime(timeString)
```

#### **3.3 页面同步管理**
```javascript
class PageSyncManager {
  constructor(pageType)
  startListening()
  stopListening()
  syncData(dataType, data)
  handleDataChange(dataType, changeType, details)
}
```

## 📊 数据结构API

### **1. 核心数据结构**

#### **1.1 小组数据 (groups)**
```javascript
{
  "乐清1组": [
    {
      "name": "成员姓名",
      "phone": "联系电话",
      "gender": "性别",
      "baptized": "是否受洗",
      "age": "年龄段",
      "joinDate": "加入日期",
      "id": "唯一标识符"
    }
  ]
}
```

#### **1.2 小组名称映射 (groupNames)**
```javascript
{
  "乐清1组": "静静组",
  "乐清2组": "张亮组",
  "乐清3组": "晓杰组",
  "培茹组": "培茹组",
  "未分组": "未分组"
}
```

#### **1.3 签到记录 (attendanceRecords)**
```javascript
[
  {
    "name": "成员姓名",
    "group": "所属小组",
    "time": "签到时间",
    "date": "签到日期",
    "id": "记录唯一标识"
  }
]
```

#### **1.4 当日新增人员 (dailyNewcomers)**
```javascript
{
  "2025-01-11_成员姓名": {
    "name": "成员姓名",
    "group": "所属小组",
    "date": "添加日期",
    "timestamp": "添加时间戳"
  }
}
```

### **2. 数据操作API**

#### **2.1 数据读取**
```javascript
// 获取所有小组数据
const groups = await newDataManager.getData('groups')

// 获取特定小组数据
const groupData = groups['乐清1组']

// 获取签到记录
const attendanceRecords = await newDataManager.getData('attendanceRecords')

// 获取当日新增人员
const dailyNewcomers = await newDataManager.getDailyNewcomers()
```

#### **2.2 数据写入**
```javascript
// 保存小组数据
await newDataManager.saveData('groups', groups)

// 保存签到记录
await newDataManager.saveData('attendanceRecords', attendanceRecords)

// 添加当日新增人员
await newDataManager.addDailyNewcomer(name, group)
```

#### **2.3 数据更新**
```javascript
// 更新成员信息
const updatedMember = { ...member, name: '新姓名' }
groups['乐清1组'][memberIndex] = updatedMember
await newDataManager.saveData('groups', groups)

// 更新签到记录
const updatedRecord = { ...record, time: '新时间' }
attendanceRecords[recordIndex] = updatedRecord
await newDataManager.saveData('attendanceRecords', attendanceRecords)
```

#### **2.4 数据删除**
```javascript
// 删除成员
groups['乐清1组'].splice(memberIndex, 1)
await newDataManager.saveData('groups', groups)

// 删除签到记录
attendanceRecords.splice(recordIndex, 1)
await newDataManager.saveData('attendanceRecords', attendanceRecords)
```

## 🔄 数据同步API

### **1. 自动同步**
```javascript
// 启用自动同步
newDataManager.enableAutoSync()

// 禁用自动同步
newDataManager.disableAutoSync()

// 设置同步间隔
newDataManager.setSyncInterval(3000) // 3秒
```

### **2. 手动同步**
```javascript
// 执行手动同步
const syncResult = await newDataManager.performManualSync()

// 同步结果
{
  success: true,
  syncedData: ['groups', 'attendanceRecords', 'dailyNewcomers'],
  errors: [],
  timestamp: '2025-01-11T12:00:00Z'
}
```

### **3. 同步状态**
```javascript
// 获取同步状态
const syncStatus = newDataManager.getSyncStatus()

// 状态信息
{
  isSyncing: false,
  lastSyncTime: '2025-01-11T12:00:00Z',
  pendingChanges: ['groups'],
  syncErrors: []
}
```

## 🛡️ 安全API

### **1. CSRF保护**
```javascript
// 生成CSRF令牌
const token = csrfProtection.generateToken()

// 验证CSRF令牌
const isValid = csrfProtection.validateToken(token)

// 获取当前令牌
const currentToken = csrfProtection.getCurrentToken()
```

### **2. 数据验证**
```javascript
// 验证成员数据
const isValidMember = validateMemberData(memberData)

// 验证签到数据
const isValidAttendance = validateAttendanceData(attendanceData)

// 验证小组数据
const isValidGroup = validateGroupData(groupData)
```

### **3. 权限控制**
```javascript
// 检查管理员权限
const hasAdminAccess = await checkAdminPermission()

// 验证操作权限
const canPerformAction = await validateActionPermission(action, data)
```

## 📱 用户界面API

### **1. 模态框管理**
```javascript
// 显示模态框
function showModal(modalId, data)

// 隐藏模态框
function hideModal(modalId)

// 更新模态框内容
function updateModalContent(modalId, content)
```

### **2. 表格管理**
```javascript
// 渲染表格
function renderTable(tableId, data, columns)

// 更新表格行
function updateTableRow(tableId, rowIndex, data)

// 删除表格行
function deleteTableRow(tableId, rowIndex)
```

### **3. 表单管理**
```javascript
// 验证表单
function validateForm(formId)

// 提交表单
async function submitForm(formId, data)

// 重置表单
function resetForm(formId)
```

## 🔧 配置API

### **1. 系统配置**
```javascript
// 获取配置
const config = configManager.getConfig()

// 更新配置
configManager.updateConfig(newConfig)

// 重置配置
configManager.resetConfig()
```

### **2. Firebase配置**
```javascript
// 初始化Firebase
await initializeFirebase()

// 获取数据库引用
const db = firebase.database()

// 获取认证引用
const auth = firebase.auth()
```

## 🛠️ 工具函数API

### **1. 通用工具函数**
```javascript
// Firebase初始化
const { app, db, success } = window.utils.initializeFirebase()

// UUID生成
const uuid = window.utils.generateUUID()

// 日期格式化
const formattedDate = window.utils.formatDateForDisplay(dateInput)

// 状态文本获取
const statusText = window.utils.getStatusText(status)

// 页面同步管理器初始化
const pageSyncManager = window.utils.initializePageSyncManager(pageName)
```

### **2. 数据处理工具**
```javascript
// 排除成员管理
const excludedMembers = window.utils.loadExcludedMembers()
const isExcluded = window.utils.isMemberExcluded(member, group, excludedMembers)

// 小组排序
const sortedGroups = window.utils.sortGroups(groups, groupNames)
const sortedMembers = window.utils.sortMembersByName(members)

// 成员显示名称
const displayName = window.utils.getDisplayName(member)

// 出勤类型判断
const attendanceType = window.utils.getAttendanceType(date)
```

### **3. 数据验证工具**
```javascript
// 深度比较
const isEqual = window.utils.deepEqual(obj1, obj2)

// 数据验证
const isValid = window.utils.validateGroupsData(sentData, receivedData)

// 成员差异检查
const hasDifference = window.utils.hasSignificantMemberDifference(member1, member2)
```

### **4. 安全工具函数**
```javascript
// 防重复执行
const safeFunction = window.utils.preventDuplicateExecution(originalFunction, key)

// 安全保存函数
const safeSave = window.utils.createSafeSaveFunction(saveFunction, operationName)

// 安全同步函数
const safeSync = window.utils.createSafeSyncFunction(syncFunction, operationName)

// 安全删除函数
const safeDelete = window.utils.createSafeDeleteFunction(deleteFunction, operationName)
```

## 📊 监控API

### **1. 性能监控**
```javascript
// 开始性能监控
performanceMonitor.start()

// 记录性能指标
performanceMonitor.recordMetric(metricName, value)

// 获取性能报告
const report = performanceMonitor.getReport()
```

### **2. 错误监控**
```javascript
// 记录错误
errorMonitor.logError(error, context)

// 获取错误统计
const errorStats = errorMonitor.getErrorStats()

// 清除错误日志
errorMonitor.clearErrors()
```

## 🚨 错误处理API

### **1. 错误类型**
```javascript
// 数据错误
class DataError extends Error {
  constructor(message, dataType, operation)
}

// 同步错误
class SyncError extends Error {
  constructor(message, syncType, details)
}

// 验证错误
class ValidationError extends Error {
  constructor(message, field, value)
}
```

### **2. 错误处理**
```javascript
// 全局错误处理
window.addEventListener('error', handleGlobalError)

// 异步错误处理
window.addEventListener('unhandledrejection', handleAsyncError)

// 自定义错误处理
function handleCustomError(error, context)
```

## 📝 使用示例

### **1. 基本数据操作**
```javascript
// 初始化数据管理器
const dataManager = new NewDataManager()

// 加载数据
await dataManager.loadAllDataFromFirebase()

// 获取数据
const groups = dataManager.getData('groups')

// 修改数据
groups['新小组'] = []
dataManager.setData('groups', groups)

// 保存数据
await dataManager.saveData('groups', groups)
```

### **2. 数据同步**
```javascript
// 手动同步
const result = await dataManager.performManualSync()

if (result.success) {
  console.log('同步成功')
} else {
  console.error('同步失败:', result.errors)
}
```

### **3. 错误处理**
```javascript
try {
  await dataManager.saveData('groups', groups)
} catch (error) {
  if (error instanceof DataError) {
    console.error('数据错误:', error.message)
  } else if (error instanceof SyncError) {
    console.error('同步错误:', error.message)
  } else {
    console.error('未知错误:', error.message)
  }
}
```

## 📚 相关文档

### **问题分析报告**
- `docs/reports/UUID_MATCHING_FIX.md` - UUID匹配修复报告
- `docs/reports/SUNDAY_TRACKING_ANALYSIS.md` - 主日跟踪问题分析
- `docs/reports/CHANGELOG.md` - 系统变更日志
- `docs/reports/OPTIMIZATION_REPORT.md` - 性能优化报告
- `docs/reports/EXCLUDED_MEMBERS_ANALYSIS.md` - 未签到不统计人员问题分析
- `docs/reports/DATA_PERSISTENCE_FIX.md` - 数据持久化修复报告
- `docs/reports/FIREBASE_INIT_FIX.md` - Firebase初始化顺序修复报告
- `docs/reports/BUSINESS_LOGIC_FIX.md` - 业务逻辑修复报告

### **系统文档**
- `docs/requirements/SYSTEM_REQUIREMENTS.md` - 系统需求文档
- `docs/guides/DOCUMENTATION_GUIDE.md` - 文档维护指南
- `docs/troubleshooting/TROUBLESHOOTING.md` - 故障排除指南

## 📞 技术支持

### **API问题反馈**
- GitHub Issues
- 系统内置反馈功能
- 邮件技术支持

### **文档更新**
- 每次API变更时更新文档
- 版本控制管理
- 向后兼容性保证

---
*此API文档将根据系统更新持续维护*
