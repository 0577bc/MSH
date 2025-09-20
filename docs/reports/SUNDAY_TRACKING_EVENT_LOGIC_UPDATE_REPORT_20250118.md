# 主日跟踪事件生成逻辑重大更新报告 - 2025-01-18

## 📋 更新概述

根据用户需求，对主日跟踪事件生成逻辑进行了重大更新，支持多事件管理、实时更新和时间节点判断，实现了更智能和准确的事件处理机制。

## 🎯 核心需求

### 用户场景示例
- **小红8月1周2周没有签到**：2周上午10点40之后就可以生成一个事件
- **8月3周有签到，8月4周5周9月1周2周没有签到**：生成第二个事件连续4周未签到
- **如果现在是9月3周10点40之后**：生成的第二个事件自动变为连续5周未签到

### 关键要求
1. **多事件管理**：支持多个独立的缺勤事件同时存在
2. **实时更新**：事件状态实时更新，连续缺勤周数自动计算
3. **时间节点判断**：基于主日上午10:40的时间节点判断事件生成
4. **智能事件处理**：区分不同缺勤事件，每个事件独立计算和管理

## 🔧 技术实现

### 1. 核心函数更新

#### `calculateConsecutiveAbsences()` - 重写
```javascript
// 计算连续缺勤情况（新版本 - 支持多事件管理和实时更新）
calculateConsecutiveAbsences: function(memberUUID) {
  // 识别所有独立的缺勤事件
  const absenceEvents = this.identifyAbsenceEvents(sundayDates, memberRecords);
  
  // 更新现有事件的状态（实时更新连续缺勤周数）
  const updatedEvents = this.updateExistingEvents(absenceEvents, memberUUID);
  
  return { 
    consecutiveAbsences: maxConsecutiveAbsences, 
    lastAttendanceDate, 
    checkStartDate: checkStartDate,
    trackingStartDate: trackingStartDate,
    absenceEvents: updatedEvents // 返回所有更新后的缺勤事件
  };
}
```

#### `identifyAbsenceEvents()` - 新增
```javascript
// 识别所有独立的缺勤事件
function identifyAbsenceEvents(sundayDates, memberRecords) {
  const absenceEvents = [];
  let currentEvent = null;
  
  for (let i = 0; i < sundayDates.length; i++) {
    const sundayDate = sundayDates[i];
    const hasAttendance = memberRecords.some(record => {
      const isSunday = this.isSundayAttendance(record);
      const isSameDay = this.isSameDate(record.time, sundayDate);
      return isSunday && isSameDay;
    });
    
    if (!hasAttendance) {
      // 没有签到记录
      if (!currentEvent) {
        // 开始新的缺勤事件
        currentEvent = {
          startDate: sundayDate,
          endDate: null,
          consecutiveAbsences: 1,
          lastAttendanceDate: this.getLastAttendanceBeforeDate(sundayDate, memberRecords),
          endedBy: null,
          endReason: null,
          status: 'tracking'
        };
      } else {
        // 继续当前缺勤事件
        currentEvent.consecutiveAbsences++;
      }
    } else {
      // 有签到记录，结束当前缺勤事件（如果有的话）
      if (currentEvent) {
        currentEvent.endDate = sundayDate;
        currentEvent.endedBy = 'attendance';
        currentEvent.endReason = '成员签到';
        absenceEvents.push(currentEvent);
        currentEvent = null;
      }
    }
  }
  
  // 如果还有未结束的缺勤事件，添加到列表中
  if (currentEvent) {
    absenceEvents.push(currentEvent);
  }
  
  return absenceEvents;
}
```

#### `updateExistingEvents()` - 新增
```javascript
// 更新现有事件的状态（实时更新连续缺勤周数）
function updateExistingEvents(absenceEvents, memberUUID) {
  const existingRecords = this.getMemberTrackingRecords(memberUUID);
  const updatedEvents = [];
  
  absenceEvents.forEach((event, index) => {
    const eventRecordId = `${memberUUID}_event_${index + 1}`;
    const existingRecord = existingRecords.find(record => record.recordId === eventRecordId);
    
    if (existingRecord) {
      // 更新现有记录
      const updatedRecord = {
        ...existingRecord,
        consecutiveAbsences: event.consecutiveAbsences,
        lastAttendanceDate: event.lastAttendanceDate,
        updatedAt: new Date().toISOString()
      };
      
      // 如果事件已结束，更新状态
      if (event.endDate && !existingRecord.endDate) {
        updatedRecord.status = 'resolved';
        updatedRecord.endDate = event.endDate;
        updatedRecord.endedBy = event.endedBy;
        updatedRecord.endReason = event.endReason;
      }
      
      updatedEvents.push(updatedRecord);
    } else {
      // 创建新的事件记录
      const newRecord = {
        memberUUID: memberUUID,
        recordId: eventRecordId,
        startDate: event.startDate,
        endDate: event.endDate,
        consecutiveAbsences: event.consecutiveAbsences,
        lastAttendanceDate: event.lastAttendanceDate,
        status: event.status || 'tracking',
        endedBy: event.endedBy,
        endReason: event.endReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      updatedEvents.push(newRecord);
    }
  });
  
  return updatedEvents;
}
```

#### `shouldGenerateEvent()` - 新增
```javascript
// 判断是否应该生成事件（基于时间节点）
function shouldGenerateEvent(absenceEvent, currentDate) {
  // 如果事件已结束，不需要生成
  if (absenceEvent.endDate) return false;
  
  // 如果连续缺勤少于2周，不生成事件
  if (absenceEvent.consecutiveAbsences < 2) return false;
  
  // 检查是否在主日上午10:40之后
  if (!this.isAfterSundayCutoff(currentDate)) return false;
  
  return true;
}
```

#### `isAfterSundayCutoff()` - 新增
```javascript
// 判断是否在主日上午10:40之后
function isAfterSundayCutoff(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // 如果不是今天，直接返回true
  if (targetDate.getTime() !== today.getTime()) return true;
  
  // 如果是今天，检查时间是否在10:40之后
  const cutoffTime = new Date(today);
  cutoffTime.setHours(10, 40, 0, 0);
  
  return now >= cutoffTime;
}
```

### 2. 事件生成逻辑更新

#### `generateTrackingList()` - 更新
```javascript
// 为每个缺勤事件创建跟踪记录
absenceEvents.forEach((event, eventIndex) => {
  const eventConsecutiveAbsences = event.consecutiveAbsences;
  console.log(`成员 ${member.name} 事件${eventIndex + 1}: 连续缺勤 ${eventConsecutiveAbsences} 次`);
  
  // 检查是否应该生成事件（基于时间节点判断）
  const currentDate = new Date();
  if (!this.shouldGenerateEvent(event, currentDate)) {
    console.log(`成员 ${member.name} 事件${eventIndex + 1}: 不满足生成条件，跳过`);
    return;
  }
  
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
  
  // 为每个事件创建唯一的记录ID
  const eventRecordId = `${member.uuid}_event_${eventIndex + 1}`;
  
  // 检查是否已有该事件的跟踪记录
  const existingEventRecord = this.getTrackingRecord(eventRecordId);
  
  if (existingEventRecord) {
    // 更新现有记录
    const updatedRecord = {
      ...existingEventRecord,
      memberName: member.name,
      group: member.group,
      originalGroup: member.group,
      consecutiveAbsences: eventConsecutiveAbsences,
      lastAttendanceDate: event.endDate || lastAttendanceDate,
      checkStartDate: checkStartDate,
      trackingStartDate: event.startDate,
      eventType: eventType,
      eventDescription: eventDescription,
      eventIndex: eventIndex + 1,
      totalEvents: absenceEvents.length,
      updatedAt: new Date().toISOString()
    };
    
    // 如果事件已结束，更新状态
    if (event.endDate && !existingEventRecord.endDate) {
      updatedRecord.status = 'resolved';
      updatedRecord.endDate = event.endDate;
      updatedRecord.endedBy = event.endedBy;
      updatedRecord.endReason = event.endReason;
    }
    
    // 保存更新后的记录
    this.saveTrackingRecord(updatedRecord);
    
    trackingList.push(updatedRecord);
  } else {
    // 创建新的事件跟踪记录
    const newEventRecord = {
      memberUUID: member.uuid,
      recordId: eventRecordId,
      memberName: member.name,
      group: member.group,
      originalGroup: member.group,
      consecutiveAbsences: eventConsecutiveAbsences,
      lastAttendanceDate: event.endDate || lastAttendanceDate,
      checkStartDate: checkStartDate,
      trackingStartDate: event.startDate,
      status: event.status || 'tracking',
      eventType: eventType,
      eventDescription: eventDescription,
      eventIndex: eventIndex + 1,
      totalEvents: absenceEvents.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 如果事件已结束，设置结束信息
    if (event.endDate) {
      newEventRecord.status = 'resolved';
      newEventRecord.endDate = event.endDate;
      newEventRecord.endedBy = event.endedBy;
      newEventRecord.endReason = event.endReason;
    }
    
    // 保存新记录
    this.saveTrackingRecord(newEventRecord);
    
    trackingList.push(newEventRecord);
  }
});
```

## 📊 功能特色

### 1. 多事件管理
- **独立事件**：每个缺勤事件独立计算和管理
- **事件标识**：使用唯一的`eventRecordId`标识每个事件
- **事件状态**：支持`tracking`、`resolved`、`terminated`等状态
- **事件历史**：完整记录事件的生命周期

### 2. 实时更新
- **自动计算**：连续缺勤周数自动计算和更新
- **状态同步**：事件状态实时同步到跟踪记录
- **时间戳**：记录创建和更新时间
- **数据一致性**：确保数据的一致性和准确性

### 3. 时间节点判断
- **主日判断**：基于主日上午10:40的时间节点
- **时间控制**：只有在特定时间后才生成事件
- **灵活判断**：支持不同日期的灵活判断
- **实时检查**：实时检查当前时间是否满足条件

### 4. 智能事件处理
- **事件识别**：自动识别所有独立的缺勤事件
- **事件结束**：自动检测事件结束条件
- **事件更新**：智能更新现有事件状态
- **事件创建**：按需创建新的事件记录

## 🔄 工作流程

### 1. 事件识别流程
1. **获取主日日期**：从检查起点开始获取所有主日日期
2. **检查签到记录**：检查每个主日的签到情况
3. **识别缺勤事件**：识别所有独立的缺勤事件
4. **计算连续周数**：计算每个事件的连续缺勤周数

### 2. 事件更新流程
1. **检查现有记录**：检查是否已有该事件的跟踪记录
2. **更新状态**：更新现有记录的状态和连续周数
3. **创建新记录**：为没有记录的事件创建新记录
4. **保存数据**：保存所有更新后的数据

### 3. 事件生成流程
1. **时间判断**：检查是否在主日上午10:40之后
2. **条件检查**：检查是否满足事件生成条件
3. **事件创建**：创建或更新事件跟踪记录
4. **状态管理**：管理事件的状态和生命周期

## 📝 数据结构

### 事件记录结构
```javascript
{
  memberUUID: "成员UUID",
  recordId: "事件记录ID",
  memberName: "成员姓名",
  group: "组别",
  originalGroup: "原始组别",
  consecutiveAbsences: 连续缺勤周数,
  lastAttendanceDate: "最后签到日期",
  checkStartDate: "检查开始日期",
  trackingStartDate: "跟踪开始日期",
  status: "事件状态",
  eventType: "事件类型",
  eventDescription: "事件描述",
  eventIndex: 事件索引,
  totalEvents: 总事件数,
  createdAt: "创建时间",
  updatedAt: "更新时间",
  endDate: "结束日期",
  endedBy: "结束原因",
  endReason: "结束说明"
}
```

### 事件状态
- **tracking**：正在跟踪中
- **resolved**：已解决（成员签到）
- **terminated**：已终止（手动终止）

### 事件类型
- **tracking**：普通跟踪
- **severe_absence**：严重缺勤（3周以上）
- **extended_absence**：长期缺勤（4周以上）

## 🎉 更新价值

### 1. 功能完整性
- **多事件支持**：支持多个独立的缺勤事件同时存在
- **实时更新**：事件状态实时更新，无需手动刷新
- **时间控制**：基于时间节点的智能事件生成
- **智能管理**：自动区分和结束不同的事件

### 2. 用户体验
- **准确性**：更准确的事件识别和状态更新
- **实时性**：实时反映最新的缺勤情况
- **智能性**：智能判断事件生成条件
- **一致性**：确保数据的一致性和准确性

### 3. 系统稳定性
- **数据完整性**：完整的事件生命周期管理
- **状态一致性**：确保事件状态的一致性
- **错误处理**：完善的错误处理机制
- **性能优化**：优化的数据处理逻辑

## 📋 后续优化建议

### 1. 功能增强
- **事件合并**：支持相似事件的智能合并
- **事件分析**：提供事件趋势分析功能
- **事件预警**：基于历史数据的预警机制
- **事件报告**：生成详细的事件报告

### 2. 性能优化
- **数据缓存**：缓存计算结果减少重复计算
- **增量更新**：支持增量更新提高性能
- **批量处理**：支持批量处理大量事件
- **异步处理**：支持异步处理提高响应速度

### 3. 用户体验
- **可视化**：提供事件的可视化展示
- **交互优化**：优化用户交互体验
- **个性化**：支持个性化的事件管理
- **通知机制**：提供事件通知机制

---

**更新完成时间**: 2025-01-18  
**更新开发者**: MSH系统开发团队  
**更新状态**: ✅ 完成  
**影响评估**: 重大功能更新，显著提升事件管理能力

