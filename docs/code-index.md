# MSH系统 - 代码索引文档

**目的**: 快速查找关键函数位置，避免重复实现已有功能  
**更新日期**: 2025-11-05  
**维护者**: 系统开发团队

---

## 📋 关键函数位置索引

### 主日跟踪相关（Sunday Tracking）

#### 核心计算函数
- **`calculateConsecutiveAbsences`**
  - 位置: `src/features/sunday-tracking-utils.js:222`
  - 功能: 计算成员的连续缺勤情况
  - 返回: `{ consecutiveAbsences, lastAttendanceDate, absenceEvents, ... }`
  - 调用: `generateTrackingList()` 内部调用

- **`identifyAbsenceEvents`**
  - 位置: `src/core/time-utils.js:270`
  - 功能: 识别所有独立的缺勤事件
  - 参数: `(sundayDates, memberRecords, memberUUID)`
  - 返回: `Array<AbsenceEvent>`
  - 调用: `calculateConsecutiveAbsences()` 内部调用

- **`generateTrackingList`**
  - 位置: `src/features/sunday-tracking-utils.js:648`
  - 功能: 生成完整的跟踪事件列表（包含所有成员的缺勤事件）
  - 返回: `Array<TrackingRecord>`
  - 调用: 主日跟踪页面初始化时调用
  - **重要**: 会自动调用 `calculateConsecutiveAbsences` 获取所有缺勤事件

#### 辅助函数
- **`isSundayAttendance`**
  - 位置: `src/features/sunday-tracking-utils.js`
  - 功能: 判断签到记录是否为主日签到
  - 规则: 包含上午签到和下午签到（11:00后）

- **`getSundayDatesFromStart`**
  - 位置: `src/features/sunday-tracking-utils.js`
  - 功能: 生成从指定日期到现在的所有主日日期列表

- **`getTrackingRecords`**
  - 位置: `src/features/sunday-tracking-utils.js:543`
  - 功能: 获取已存在的跟踪记录（从localStorage/Firebase）

#### 工具类
- **`SundayTrackingManager`**
  - 位置: `src/features/sunday-tracking-utils.js`
  - 主要方法:
    - `generateTrackingList()` - 生成跟踪列表
    - `calculateConsecutiveAbsences(memberUUID)` - 计算连续缺勤
    - `getTrackingRecords()` - 获取跟踪记录
    - `getMemberTrackingRecords(memberUUID)` - 获取成员跟踪记录
    - `getAllMembers()` - 获取所有成员

---

### 数据管理相关（Data Management）

#### 核心管理器
- **`NewDataManager`**
  - 位置: `src/new-data-manager.js:4`
  - 功能: 统一的数据管理器（本地存储 + Firebase同步）
  - 主要方法:
    - `loadAllDataFromFirebase()` - 从Firebase加载所有数据
    - `getAttendanceRecords()` - 获取签到记录
    - `checkExistingData()` - 检查现有数据
    - `syncToFirebase()` - 同步到Firebase

#### 数据获取函数
- **`getAttendanceRecords`**
  - 位置: `src/new-data-manager.js`
  - 功能: 获取签到记录（优先从全局变量，然后是localStorage）

---

### 工具函数相关（Utils）

#### 时间工具
- **`getLocalDateString`**
  - 位置: `src/core/time-utils.js`
  - 功能: 获取本地日期字符串（YYYY-MM-DD格式）

- **`getLocalDateFromISO`**
  - 位置: `src/core/time-utils.js`
  - 功能: 从ISO时间字符串转换为本地日期字符串

#### 工具函数库
- **`window.utils`**
  - 位置: `src/utils.js`
  - 功能: 全局工具函数集合
  - 包含: 时间处理、数据验证、格式转换等

---

## 🔗 函数调用关系图

### 主日跟踪数据流

```
generateUltraLightEventList()
    ↓
generateTrackingList() [SundayTrackingManager]
    ↓
forEach member:
    calculateConsecutiveAbsences(memberUUID)
        ↓
    identifyAbsenceEvents(sundayDates, memberRecords, memberUUID)
        ↓
    identifyConsecutiveAbsencePeriods()
        ↓
    返回: { absenceEvents, consecutiveAbsences, ... }
    ↓
    创建/更新 TrackingRecord
    ↓
返回: Array<TrackingRecord>
```

### 数据加载流

```
页面初始化
    ↓
NewDataManager.loadAllDataFromFirebase()
    ↓
window.attendanceRecords = [...]
window.groups = {...}
window.groupNames = {...}
    ↓
SundayTrackingManager.generateTrackingList()
    ↓
使用 window.attendanceRecords 计算缺勤
```

---

## 📝 使用示例

### 示例1: 生成主日跟踪列表

```javascript
// ✅ 正确方式：直接使用已有函数
const trackingList = window.utils.SundayTrackingManager.generateTrackingList();

// ❌ 错误方式：自己实现复杂的计算逻辑
// 不要重复实现 calculateConsecutiveAbsences 的功能
```

### 示例2: 计算成员连续缺勤

```javascript
// ✅ 正确方式：使用已有函数
const result = await window.utils.SundayTrackingManager
    .calculateConsecutiveAbsences(memberUUID);
// result = { consecutiveAbsences, lastAttendanceDate, absenceEvents, ... }

// ❌ 错误方式：自己实现计算逻辑
// 不要重新实现 identifyAbsenceEvents 的功能
```

---

## 🔍 快速查找指南

### 按功能查找

**查找"缺勤计算"相关函数**:
- `calculateConsecutiveAbsences` - 计算连续缺勤
- `identifyAbsenceEvents` - 识别缺勤事件
- `identifyConsecutiveAbsencePeriods` - 识别连续缺勤时间段

**查找"主日跟踪"相关函数**:
- `generateTrackingList` - 生成跟踪列表
- `getTrackingRecords` - 获取跟踪记录
- `generateUltraLightEventList` - 生成极简事件列表

**查找"数据管理"相关函数**:
- `NewDataManager` - 数据管理器
- `loadAllDataFromFirebase` - 加载Firebase数据
- `getAttendanceRecords` - 获取签到记录

### 按文件查找

**主日跟踪相关文件**:
- `src/features/sunday-tracking-utils.js` - 主日跟踪工具函数
- `src/core/time-utils.js` - 时间工具函数（包含缺勤事件识别）
- `src/sunday-tracking/event-manager.js` - 事件管理器

**数据管理相关文件**:
- `src/new-data-manager.js` - 新数据管理器
- `src/utils.js` - 工具函数库

---

## 📚 相关文档

- [修改工作流](../simple-memory-system/MODIFICATION-WORKFLOW.md)
- [代码修复检查清单](./CODE_FIX_CHECKLIST.md)
- [记忆系统规则生效性分析](./reports/MEMORY_SYSTEM_EFFECTIVENESS_ANALYSIS_2025-11-05.md)

---

**重要提醒**: 
- 在执行代码修复前，请先查阅此索引，确认是否有现成的函数可以使用
- 优先使用现有功能，避免重复实现
- 如果发现新的关键函数，请及时更新此文档


