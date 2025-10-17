/**
 * 公共工具函数模块 (utils.js)
 * 功能：提供通用工具函数，数据管理，系统辅助功能
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 日期时间工具函数 ====================
/**
 * 获取本地日期字符串（YYYY-MM-DD格式）
 * 🔧 修复：避免UTC时区导致的日期错误
 * @param {Date} date 日期对象，默认为当前时间
 * @returns {string} 本地日期字符串（YYYY-MM-DD格式）
 */
function getLocalDateString(date = new Date()) {
  // 方法1：使用时区偏移量转换
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
}

/**
 * 从ISO时间字符串获取本地日期字符串
 * @param {string} isoString ISO格式的时间字符串
 * @returns {string} 本地日期字符串（YYYY-MM-DD格式）
 */
function getLocalDateFromISO(isoString) {
  return getLocalDateString(new Date(isoString));
}
// ==================== 时间处理工具函数 ====================

/**
 * 获取签到时间段类型
 * @param {Date} date 日期对象
 * @returns {string} 时间段类型 ('early', 'onTime', 'late', 'afternoon', 'invalid')
 */
function getAttendanceType(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 早到：9:20之前 (0:00 - 9:20)
  if (timeInMinutes < 9 * 60 + 20) return 'early';
  
  // 准时：9:30之前 (9:20 - 9:30)
  if (timeInMinutes < 9 * 60 + 30) return 'onTime';
  
  // 迟到：10:40之前 (9:30 - 10:40)
  if (timeInMinutes < 10 * 60 + 40) return 'late';
  
  // 10:40-11:30之间不允许签到
  if (timeInMinutes < 11 * 60 + 30) return 'invalid';
  
  // 下午和晚上签到：11:30之后
  if (timeInMinutes >= 11 * 60 + 30) return 'afternoon';
  
  return 'invalid';
}

// 格式化日期为中文格式
function formatDateToChinese(date) {
  return date.toLocaleDateString('zh-CN');
}

// 获取今天的日期字符串
function getTodayString() {
  return formatDateToChinese(new Date());
}

/**
 * 格式化日期用于显示
 * @param {Date|string} dateInput 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDateForDisplay(dateInput) {
  if (!dateInput) return '无';
  
  try {
    // 处理 Date 对象或日期字符串
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) return '无';
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return dateInput;
  }
}

/**
 * 获取状态文本
 * @param {string} status 状态值
 * @returns {string} 状态的中文描述
 */
function getStatusText(status) {
  const statusMap = {
    'tracking': '跟踪中',
    'terminated': '已终止',
    'resolved': '已解决',
    'removed': '已移除'
  };
  return statusMap[status] || status || '未知';
}

/**
 * 初始化页面同步管理器
 * @param {string} pageName 页面名称
 * @returns {Object|null} 页面同步管理器实例
 */
function initializePageSyncManager(pageName) {
  if (window.utils && window.utils.PageSyncManager) {
    const pageSyncManager = new window.utils.PageSyncManager(pageName);
    console.log(`${pageName}页面同步管理器初始化完成`);
    return pageSyncManager;
  } else {
    console.error('页面同步管理器未找到');
    return null;
  }
}

// 深度比较两个对象是否相等（忽略属性顺序）
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

// 检查成员数据是否有有意义的差异
function hasSignificantMemberDifference(member1, member2) {
  // 只检查最关键的字段差异
  const criticalFields = ['name', 'phone'];
  
  for (let field of criticalFields) {
    const val1 = member1[field];
    const val2 = member2[field];
    
    // 忽略空值差异（null, undefined, 空字符串）
    const isEmpty1 = val1 == null || val1 === '';
    const isEmpty2 = val2 == null || val2 === '';
    
    if (isEmpty1 && isEmpty2) continue;
    if (isEmpty1 || isEmpty2) return true;
    if (val1 !== val2) return true;
  }
  
  // 检查其他字段，但更宽松
  const otherFields = ['nickname', 'gender', 'baptized', 'age'];
  for (let field of otherFields) {
    const val1 = member1[field];
    const val2 = member2[field];
    
    // 对于非关键字段，忽略空值差异
    const isEmpty1 = val1 == null || val1 === '';
    const isEmpty2 = val2 == null || val2 === '';
    
    if (isEmpty1 && isEmpty2) continue;
    if (isEmpty1 || isEmpty2) continue; // 忽略空值差异
    
    // 只有非空值且不同时才认为有差异
    if (val1 !== val2) return true;
  }
  
  return false;
}

// 验证groups数据（宽松验证）
function validateGroupsData(sentData, receivedData) {
  try {
    // 检查基本结构
    if (typeof sentData !== 'object' || typeof receivedData !== 'object') {
      return false;
    }
    
    if (sentData === null || receivedData === null) {
      return sentData === receivedData;
    }
    
    // 检查小组数量
    const sentGroups = Object.keys(sentData);
    const receivedGroups = Object.keys(receivedData);
    
    if (sentGroups.length !== receivedGroups.length) {
      console.log('小组数量不匹配:', sentGroups.length, 'vs', receivedGroups.length);
      console.log('发送的小组:', sentGroups);
      console.log('接收的小组:', receivedGroups);
      
      // 小组数量不匹配，验证失败
      console.log('小组数量不匹配，验证失败');
      return false;
    }
    
    // 检查每个小组
    for (let groupName of sentGroups) {
      if (!receivedData[groupName]) {
        console.log('缺少小组:', groupName);
        return false;
      }
      
      const sentMembers = sentData[groupName];
      const receivedMembers = receivedData[groupName];
      
      if (!Array.isArray(sentMembers) || !Array.isArray(receivedMembers)) {
        console.log('成员数据不是数组:', groupName);
        return false;
      }
      
      if (sentMembers.length !== receivedMembers.length) {
        console.log('成员数量不匹配:', groupName, sentMembers.length, 'vs', receivedMembers.length);
        return false;
      }
      
      // 检查每个成员的基本信息
      for (let i = 0; i < sentMembers.length; i++) {
        const sentMember = sentMembers[i];
        const receivedMember = receivedMembers[i];
        
        if (sentMember.name !== receivedMember.name) {
          console.log('成员姓名不匹配:', groupName, sentMember.name, 'vs', receivedMember.name);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('验证groups数据时出错:', error);
    return false;
  }
}

// 检查是否为当日新增人员（通过新朋友按钮添加）
function isTodayNewcomer(member) {
  if (!member.joinDate || !member.addedViaNewcomerButton) return false;
  return formatDateToChinese(new Date(member.joinDate)) === getTodayString();
}

// ==================== 新增的缺勤事件管理函数 ====================

// 识别所有独立的缺勤事件 (修正版 - 基于连续缺勤时间段)
function identifyAbsenceEvents(sundayDates, memberRecords, memberUUID = null) {
  console.log(`🔄 开始计算缺勤事件，总周日数: ${sundayDates.length}`);
  const startTime = performance.now();
  
  // 第一步: 构建已签到时间集合
  const signedDateSet = new Set();
  memberRecords.forEach(record => {
    if (window.utils.SundayTrackingManager.isSundayAttendance(record)) {
      const dateStr = new Date(record.time).toISOString().split('T')[0];
      signedDateSet.add(dateStr);
    }
  });
  
  // 第二步: 构建已终止事件时间集合 (只排除已终止事件)
  const eventCoveredDateSet = new Set();
  if (memberUUID) {
    const allEvents = window.utils.SundayTrackingManager.getMemberTrackingRecords(memberUUID);
    allEvents.forEach(event => {
      if (event.status === 'terminated') {
        const eventSundays = getEventCoveredSundays(event);
        eventSundays.forEach(dateStr => {
          eventCoveredDateSet.add(dateStr);
        });
      }
    });
  }
  
  // 第三步: 识别连续的缺勤时间段
  const absenceEvents = identifyConsecutiveAbsencePeriods(sundayDates, signedDateSet, eventCoveredDateSet, memberRecords);
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  console.log(`✅ 缺勤事件计算完成，耗时: ${processingTime.toFixed(2)}ms，生成${absenceEvents.length}个事件`);
  
  return absenceEvents;
}

// 识别连续的缺勤时间段
function identifyConsecutiveAbsencePeriods(sundayDates, signedDateSet, eventCoveredDateSet, memberRecords) {
  const absenceEvents = [];
  let currentPeriod = null;
  
  for (let i = 0; i < sundayDates.length; i++) {
    const sundayDate = sundayDates[i];
    const dateStr = sundayDate.toISOString().split('T')[0];
    
    // 检查这个周日是否缺勤（未签到且未被已终止事件覆盖）
    const isAbsent = !signedDateSet.has(dateStr) && !eventCoveredDateSet.has(dateStr);
    
    if (isAbsent) {
      if (!currentPeriod) {
        // 开始新的缺勤时间段
        currentPeriod = {
          startDate: dateStr,
          endDate: null,
          consecutiveAbsences: 1,
          lastAttendanceDate: getLastAttendanceBeforeDate(sundayDate, memberRecords),
          endedBy: null,
          endReason: null,
          status: 'tracking'
        };
        console.log(`开始新缺勤时间段: ${dateStr}`);
      } else {
        // 继续当前缺勤时间段
        currentPeriod.consecutiveAbsences++;
        console.log(`继续缺勤时间段: ${dateStr}, 累计: ${currentPeriod.consecutiveAbsences}周`);
      }
    } else {
      // 如果当前有缺勤时间段，结束它
      if (currentPeriod) {
        absenceEvents.push(currentPeriod);
        console.log(`结束缺勤时间段: ${currentPeriod.startDate}, 持续: ${currentPeriod.consecutiveAbsences}周`);
        currentPeriod = null;
      }
    }
  }
  
  // 如果最后还有未结束的缺勤时间段，也加入列表
  if (currentPeriod) {
    absenceEvents.push(currentPeriod);
    console.log(`未结束的缺勤时间段: ${currentPeriod.startDate}, 持续: ${currentPeriod.consecutiveAbsences}周`);
  }
  
  return absenceEvents;
}

// 处理缺勤事件的辅助函数
function processAbsenceEvents(availableSundays, memberRecords) {
  const absenceEvents = [];
  let currentEvent = null;
  
  for (let i = 0; i < availableSundays.length; i++) {
    const sundayDate = availableSundays[i];
    
    if (!currentEvent) {
      // 开始新的缺勤事件
      currentEvent = {
        startDate: sundayDate ? sundayDate.toISOString().split('T')[0] : '2025-08-03',
        endDate: null,
        consecutiveAbsences: 1,
        lastAttendanceDate: getLastAttendanceBeforeDate(sundayDate, memberRecords),
        endedBy: null,
        endReason: null,
        status: 'tracking'
      };
      console.log(`开始新缺勤事件: ${sundayDate.toISOString().split('T')[0]}`);
    } else {
      // 继续当前缺勤事件（签到记录不会中断事件，只能通过手动终止）
      currentEvent.consecutiveAbsences++;
      console.log(`继续缺勤事件: ${sundayDate.toISOString().split('T')[0]}, 累计: ${currentEvent.consecutiveAbsences}周`);
    }
  }
  
  // 如果最后还有未结束的缺勤事件，也加入列表
  if (currentEvent) {
    absenceEvents.push(currentEvent);
    console.log(`未结束的缺勤事件: ${currentEvent.startDate}, 持续: ${currentEvent.consecutiveAbsences}周`);
  }
  
  return absenceEvents;
}


// 获取事件覆盖的周日
function getEventCoveredSundays(event) {
  const coveredSundays = [];
  const startDate = new Date(event.startDate);
  
  // 修复：已终止事件必须计算覆盖时间，即使没有endDate
  if (event.status === 'terminated') {
    // 使用endDate或terminatedAt作为结束时间
    let endDate;
    if (event.endDate) {
      endDate = new Date(event.endDate);
    } else if (event.terminatedAt) {
      endDate = new Date(event.terminatedAt);
    } else {
      // 如果没有明确的结束时间，使用当前时间
      endDate = new Date();
    }
    
    // 确保不早于2025年8月3日
    const minDate = new Date('2025-08-03');
    const actualStartDate = startDate < minDate ? minDate : startDate;
    
    // 计算已终止事件覆盖的所有周日
    let currentDate = new Date(actualStartDate);
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 0) { // 周日
        coveredSundays.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`已终止事件 ${event.recordId} 覆盖周日: ${coveredSundays.length}个 (结束时间: ${endDate.toISOString().split('T')[0]})`);
  } else {
    // 未结束事件不排除任何时间，让签到记录和事件分割逻辑来处理
    console.log(`活跃事件 ${event.recordId} 不排除时间，让事件分割逻辑处理`);
  }
  
  return coveredSundays;
}

// 更新现有事件的状态（实时更新连续缺勤周数）
function updateExistingEvents(absenceEvents, memberUUID) {
  const existingRecords = window.utils.SundayTrackingManager.getMemberTrackingRecords(memberUUID);
  const updatedEvents = [];
  
  // 按开始日期排序现有记录，确保事件顺序正确
  const sortedExistingRecords = existingRecords.sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  );
  
  absenceEvents.forEach((event, index) => {
    // 查找对应的现有记录（通过开始日期匹配）
    let eventStartDate = event.startDate;
    if (eventStartDate instanceof Date) {
      eventStartDate = eventStartDate.toISOString().split('T')[0];
    } else if (!eventStartDate || eventStartDate === 'undefined') {
      eventStartDate = '2025-08-03';
    }
    
    const existingRecord = sortedExistingRecords.find(record => 
      record.startDate === eventStartDate
      // 修复：匹配所有事件，包括已终止事件，避免重复创建
    );
    
    if (existingRecord) {
      // 修复：如果事件已终止，不更新，直接保留原状态
      if (existingRecord.status === 'terminated') {
        console.log(`事件 ${existingRecord.recordId} 已终止，保留原状态，不更新`);
        updatedEvents.push(existingRecord);
        return;
      }
      
      // 更新现有记录（只更新缺勤次数，不自动终止）
      const updatedRecord = {
        ...existingRecord,
        consecutiveAbsences: event.consecutiveAbsences,
        lastAttendanceDate: event.lastAttendanceDate,
        updatedAt: new Date().toISOString()
        // 注意：不自动设置endDate、endedBy、endReason
        // 事件只能通过手动点击"事件终止"按钮来终止
      };
      
      updatedEvents.push(updatedRecord);
      console.log(`更新现有事件: ${existingRecord.recordId}, 连续缺勤: ${event.consecutiveAbsences}周`);
    } else {
      // 创建新的事件记录
      let startDate = event.startDate;
      if (startDate instanceof Date) {
        startDate = startDate.toISOString().split('T')[0];
      } else if (!startDate || startDate === 'undefined') {
        startDate = '2025-08-03'; // 默认值
      }
      const eventRecordId = `${memberUUID}_${startDate}_${index + 1}`;
      
      // 检查是否已存在相同ID的记录（包括已终止的记录）
      const existingRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventRecordId);
      if (existingRecord) {
        console.log(`事件 ${eventRecordId} 已存在，状态: ${existingRecord.status}，跳过创建`);
        updatedEvents.push(existingRecord);
        return;
      }
      
      const newRecord = {
        memberUUID: memberUUID,
        recordId: eventRecordId,
        startDate: eventStartDate,
        endDate: null, // 新事件默认未结束
        consecutiveAbsences: event.consecutiveAbsences,
        lastAttendanceDate: event.lastAttendanceDate,
        status: 'tracking', // 新事件默认为跟踪状态
        endedBy: null,
        endReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      updatedEvents.push(newRecord);
      console.log(`创建新事件: ${eventRecordId}, 连续缺勤: ${event.consecutiveAbsences}周`);
    }
  });
  
  // 保留已终止的事件记录
  const terminatedRecords = existingRecords.filter(record => record.status === 'terminated');
  updatedEvents.push(...terminatedRecords);
  
  return updatedEvents;
}

// 获取最后签到日期
function getLastAttendanceDate(memberRecords) {
  if (!memberRecords || memberRecords.length === 0) return null;
  
  const sortedRecords = memberRecords
    .filter(record => record.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  
  return sortedRecords.length > 0 ? new Date(sortedRecords[0].time) : null;
}

// 获取指定日期之前的最后签到日期
function getLastAttendanceBeforeDate(beforeDate, memberRecords) {
  if (!memberRecords || memberRecords.length === 0) return null;
  
  const beforeDateTime = new Date(beforeDate);
  const sortedRecords = memberRecords
    .filter(record => record.time && new Date(record.time) < beforeDateTime)
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  
  return sortedRecords.length > 0 ? new Date(sortedRecords[0].time) : null;
}

// 判断是否应该生成事件（基于时间节点和现有记录状态）
function shouldGenerateEvent(absenceEvent, currentDate, memberUUID, eventIndex) {
  // 如果事件已结束，不需要生成
  if (absenceEvent.endDate) return false;
  
  // 如果连续缺勤少于2周，不生成事件
  if (absenceEvent.consecutiveAbsences < 2) return false;
  
  // 检查是否在主日上午10:40之后
  if (!isAfterSundayCutoff(currentDate)) return false;
  
  // 检查是否已有已终止的事件记录
  if (memberUUID && eventIndex !== undefined) {
    // 使用与generateTrackingList相同的事件ID格式
    let startDate = absenceEvent.startDate; // 修复：使用正确的参数名
    if (startDate instanceof Date) {
      startDate = startDate.toISOString().split('T')[0];
    } else if (!startDate || startDate === 'undefined') {
      startDate = '2025-08-03'; // 默认值
    }
    const eventRecordId = `${memberUUID}_${startDate}_${eventIndex + 1}`;
    const existingRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventRecordId);
    
    // 如果现有记录已被终止，不生成新事件
    if (existingRecord && existingRecord.status === 'terminated') {
      console.log(`事件 ${eventRecordId} 已被终止，跳过生成`);
      return false;
    }
  }
  
  return true;
}

// 判断是否在主日上午10:40之后
function isAfterSundayCutoff(date) {
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  // 如果不是今天，直接返回true
  if (targetDate.getTime() !== currentDateOnly.getTime()) return true;
  
  // 如果是今天，检查是否是主日（星期日）
  const currentDayOfWeek = date.getDay(); // 0=星期日, 1=星期一, ..., 6=星期六
  
  // 如果不是主日（星期日），直接返回true，允许生成事件
  if (currentDayOfWeek !== 0) return true;
  
  // 如果是主日，检查时间是否在10:40之后
  const cutoffTime = new Date(currentDateOnly);
  cutoffTime.setHours(10, 40, 0, 0);
  
  return date >= cutoffTime;
}



// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
Object.assign(window.utils, {
  getLocalDateString,
  getLocalDateFromISO,
  getAttendanceType,
  formatDateToChinese,
  getTodayString,
  formatDateForDisplay,
  getStatusText,
  initializePageSyncManager,
  deepEqual,
  hasSignificantMemberDifference,
  validateGroupsData,
  isTodayNewcomer,
  identifyAbsenceEvents,
  identifyConsecutiveAbsencePeriods,
  processAbsenceEvents,
  getEventCoveredSundays,
  updateExistingEvents,
  getLastAttendanceDate,
  getLastAttendanceBeforeDate,
  shouldGenerateEvent,
  isAfterSundayCutoff
});
