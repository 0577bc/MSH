# 主日跟踪"没有一个事件发生"判断逻辑详细说明

## 📋 概述

主日跟踪系统中的"没有一个事件发生"是指系统没有检测到任何需要跟踪的缺勤事件。这个判断涉及多个层面的逻辑检查，本文将详细说明整个判断流程。

## 🔍 核心判断逻辑

### 1. 事件生成流程

主日跟踪的事件生成遵循以下流程：

```
数据加载 → 成员筛选 → 缺勤计算 → 事件识别 → 跟踪记录生成
```

### 2. 关键判断条件

#### 2.1 成员筛选条件
```javascript
// 在 generateTrackingList() 函数中
allMembers.forEach(member => {
  // 条件1: 检查是否在排除列表中
  if (this.isMemberExcluded(member, excludedMembers)) {
    return; // 跳过排除的成员
  }
  
  // 条件2: 检查是否已有进行中的跟踪记录
  const hasActiveTracking = memberTrackingRecords.some(record => record.status === 'tracking');
  if (hasActiveTracking) {
    console.log(`跳过成员 ${member.name}: 已有进行中的跟踪记录`);
    return; // 跳过已有跟踪记录的成员
  }
  
  // 条件3: 计算连续缺勤情况
  const { absenceEvents } = this.calculateConsecutiveAbsences(member.uuid);
  
  // 条件4: 检查是否有缺勤事件
  if (absenceEvents.length === 0) {
    return; // 跳过没有缺勤事件的成员
  }
});
```

#### 2.2 缺勤事件识别条件
```javascript
// 在 calculateConsecutiveAbsences() 函数中
// 条件1: 检查起点确定
let checkStartDate = null;
if (latestResolvedRecord && latestResolvedRecord.nextCheckDate) {
  checkStartDate = new Date(latestResolvedRecord.nextCheckDate);
} else {
  checkStartDate = new Date('2025-08-04'); // 默认从2025年8月开始
}

// 条件2: 主日日期范围
const sundayDates = this.getSundayDatesFromStart(checkStartDate, currentDate);

// 条件3: 签到记录检查
const memberRecords = this.getMemberAttendanceRecords(memberUUID, checkStartDate);

// 条件4: 缺勤事件判断
if (totalAbsences >= 2) {
  absenceEvents.push({
    startDate: eventStartDate,
    endDate: null,
    consecutiveAbsences: totalAbsences,
    lastAttendanceDate: lastAttendanceDate,
    endedBy: null,
    endReason: null
  });
}
```

## 📊 详细判断步骤

### 步骤1: 数据准备
1. **数据迁移**: 确保所有数据都有UUID
2. **成员获取**: 获取所有成员列表
3. **排除列表**: 获取未签到不统计的成员列表

### 步骤2: 成员筛选
对每个成员进行以下检查：

#### 2.1 排除检查
```javascript
function isMemberExcluded(member, excludedMembers) {
  return excludedMembers.some(excluded => 
    excluded.name === member.name || 
    excluded.uuid === member.uuid
  );
}
```

#### 2.2 活跃跟踪检查
```javascript
const hasActiveTracking = memberTrackingRecords.some(record => record.status === 'tracking');
```

### 步骤3: 缺勤计算
对通过筛选的成员进行缺勤计算：

#### 3.1 检查起点确定
```javascript
// 查找最新的已解决或已终止的记录
const latestResolvedRecord = memberTrackingRecords
  .filter(record => record.status === 'resolved' || record.status === 'terminated')
  .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];

if (latestResolvedRecord && latestResolvedRecord.nextCheckDate) {
  checkStartDate = new Date(latestResolvedRecord.nextCheckDate);
} else {
  checkStartDate = new Date('2025-08-04'); // 默认起点
}
```

#### 3.2 主日日期生成
```javascript
function getSundayDatesFromStart(startDate, endDate) {
  const sundays = [];
  const current = new Date(startDate);
  
  // 找到第一个主日
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }
  
  // 生成所有主日日期
  while (current <= endDate) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  
  return sundays;
}
```

#### 3.3 签到记录匹配
```javascript
function getMemberAttendanceRecords(memberUUID, fromDate) {
  // 首先尝试通过 memberUUID 匹配
  let filteredRecords = window.attendanceRecords.filter(record => 
    record.memberUUID === memberUUID
  );
  
  // 如果没有找到，尝试通过 name 匹配
  if (filteredRecords.length === 0) {
    const member = window.utils.UUIDIndex.findMemberByUUID(memberUUID);
    if (member && member.name) {
      filteredRecords = window.attendanceRecords.filter(record => 
        record.name === member.name
      );
    }
  }
  
  // 过滤指定日期之后的记录
  if (fromDate) {
    filteredRecords = filteredRecords.filter(record => 
      new Date(record.time) >= fromDate
    );
  }
  
  return filteredRecords;
}
```

#### 3.4 缺勤事件识别
```javascript
// 从检查起点开始，按时间顺序检查每个主日
for (let i = 0; i < sundayDates.length; i++) {
  const sundayDate = sundayDates[i];
  const hasAttendance = memberRecords.some(record => {
    const isSunday = this.isSundayAttendance(record);
    const isSameDay = this.isSameDate(record.time, sundayDate);
    return isSunday && isSameDay;
  });
  
  if (hasAttendance) {
    // 有签到记录 - 记录最后签到日期
    lastAttendanceDate = sundayDate;
  } else {
    // 没有签到记录
    if (!hasStartedAbsence) {
      // 开始缺勤事件
      eventStartDate = sundayDate;
      hasStartedAbsence = true;
    }
    totalAbsences++;
  }
}

// 检查是否有缺勤事件（需要手动终止）
if (totalAbsences >= 2) {
  absenceEvents.push({
    startDate: eventStartDate,
    endDate: null,
    consecutiveAbsences: totalAbsences,
    lastAttendanceDate: lastAttendanceDate,
    endedBy: null,
    endReason: null
  });
}
```

### 步骤4: 事件类型分类
```javascript
// 确定事件类型和描述
let eventType = 'tracking';
let eventDescription = `连续缺勤 ${eventConsecutiveAbsences} 次`;

if (eventConsecutiveAbsences >= 4) {
  eventType = 'extended_absence';
  eventDescription = `连续缺勤 ${eventConsecutiveAbsences} 次（4周以上）`;
} else if (eventConsecutiveAbsences >= 3) {
  eventType = 'severe_absence';
  eventDescription = `连续缺勤 ${eventConsecutiveAbsences} 次（3周以上）`;
}
```

### 步骤5: 跟踪记录生成
```javascript
// 为每个缺勤事件创建唯一的记录ID
const eventRecordId = `${member.uuid}_event_${eventIndex + 1}`;

// 检查是否已有该事件的跟踪记录
const existingEventRecord = this.getTrackingRecord(eventRecordId);

if (existingEventRecord) {
  // 更新现有记录
  trackingList.push({
    ...existingEventRecord,
    memberName: member.name,
    group: member.group,
    consecutiveAbsences: eventConsecutiveAbsences,
    // ... 其他字段
  });
} else {
  // 创建新的事件跟踪记录
  const newEventRecord = {
    memberUUID: member.uuid,
    recordId: eventRecordId,
    memberName: member.name,
    group: member.group,
    consecutiveAbsences: eventConsecutiveAbsences,
    status: 'tracking',
    eventType: eventType,
    eventDescription: eventDescription,
    createdAt: new Date().toISOString()
  };
  
  this.saveTrackingRecord(newEventRecord);
  trackingList.push(newEventRecord);
}
```

## 🎯 "没有一个事件发生"的具体情况

### 情况1: 所有成员都被排除
```javascript
// 如果所有成员都在排除列表中
if (allMembers.every(member => this.isMemberExcluded(member, excludedMembers))) {
  // 结果: trackingList.length === 0
  // 显示: "暂无跟踪记录"
}
```

### 情况2: 所有成员都有活跃跟踪记录
```javascript
// 如果所有成员都已有进行中的跟踪记录
if (allMembers.every(member => {
  const memberTrackingRecords = this.getMemberTrackingRecords(member.uuid);
  return memberTrackingRecords.some(record => record.status === 'tracking');
})) {
  // 结果: trackingList.length === 0
  // 显示: "暂无跟踪记录"
}
```

### 情况3: 所有成员都没有缺勤事件
```javascript
// 如果所有成员的缺勤计算都没有产生事件
if (allMembers.every(member => {
  const { absenceEvents } = this.calculateConsecutiveAbsences(member.uuid);
  return absenceEvents.length === 0;
})) {
  // 结果: trackingList.length === 0
  // 显示: "暂无跟踪记录"
}
```

### 情况4: 缺勤次数不足
```javascript
// 如果所有成员的连续缺勤次数都小于2
if (allMembers.every(member => {
  const { absenceEvents } = this.calculateConsecutiveAbsences(member.uuid);
  return absenceEvents.every(event => event.consecutiveAbsences < 2);
})) {
  // 结果: trackingList.length === 0
  // 显示: "暂无跟踪记录"
}
```

## 🔧 关键判断条件总结

### 必要条件（所有条件都必须满足）
1. **成员不在排除列表中**
2. **成员没有进行中的跟踪记录**
3. **成员有连续缺勤事件**
4. **连续缺勤次数 ≥ 2**

### 缺勤事件判断条件
1. **检查起点**: 从上次解决后的下一个主日开始，或从2025年8月开始
2. **主日范围**: 从检查起点到当前日期的所有主日
3. **签到匹配**: 通过UUID或姓名匹配签到记录
4. **缺勤计算**: 连续未签到的主日数量
5. **事件阈值**: 连续缺勤次数 ≥ 2 才创建事件

### 事件类型分类
- **normal_absence**: 2周缺勤
- **severe_absence**: 3周以上缺勤
- **extended_absence**: 4周以上缺勤

## 📝 调试信息

系统会输出详细的调试信息来帮助理解判断过程：

```javascript
console.log(`成员 ${member.name} (${member.uuid}): 识别到 ${absenceEvents.length} 个缺勤事件`);
console.log(`成员 ${member.name} 事件${eventIndex + 1}: 连续缺勤 ${eventConsecutiveAbsences} 次`);
console.log(`跳过成员 ${member.name}: 已有进行中的跟踪记录`);
console.log(`从跟踪记录获取检查起点: ${checkStartDate.toISOString().split('T')[0]}`);
console.log(`主日日期数量: ${sundayDates.length}`);
console.log(`签到记录数量: ${memberRecords.length}`);
```

## 🎉 总结

"没有一个事件发生"的判断是一个复杂的多层级检查过程，涉及：

1. **数据完整性检查**: 确保所有必要数据都存在
2. **成员筛选**: 排除不需要跟踪的成员
3. **缺勤计算**: 精确计算每个成员的缺勤情况
4. **事件识别**: 识别需要跟踪的缺勤事件
5. **记录生成**: 为每个事件创建跟踪记录

只有当所有成员都通过筛选且没有产生任何缺勤事件时，系统才会显示"暂无跟踪记录"。

---

**文档创建时间**: 2025-01-18  
**文档版本**: 1.0  
**适用系统**: MSH签到系统主日跟踪模块
