/**
 * 公共工具函数模块 (utils.js)
 * 功能：提供通用工具函数，数据管理，系统辅助功能
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 主日跟踪管理器 ====================
const SundayTrackingManager = {
  // 缓存管理 (优化版本)
  _cache: {
    trackingList: null,
    lastUpdateTime: 0,
    dataHash: null,
    memberCalculations: new Map(), // 成员计算缓存
    cacheExpiry: 30 * 60 * 1000, // 30分钟缓存有效期
    lastFirebaseSync: null // 记录最后Firebase同步时间
  },
  
  // 互斥锁：防止并发调用
  _generating: false,
  _generatingPromise: null,
  
  // 生成数据哈希值，用于检测数据变化
  // 注意：只检查会影响计算结果的数据（排除人员、成员），不检查签到记录和跟踪记录
  // 因为签到记录的变化只会影响增量计算，跟踪记录的变化是计算结果的一部分
  _generateDataHash: function() {
    const groupsStr = JSON.stringify(window.groups || {});
    const excludedStr = JSON.stringify(window.excludedMembers || {});
    
    // 使用encodeURIComponent处理中文字符，然后使用btoa
    const combinedStr = groupsStr + excludedStr;
    const encodedStr = encodeURIComponent(combinedStr);
    return btoa(encodedStr).slice(0, 16);
  },
  
  // 检查缓存是否有效 (优化版本)
  _isCacheValid: function() {
    // 如果缓存被清除，直接返回false
    if (!this._cache || !this._cache.trackingList || this._cache.lastUpdateTime === 0) {
      console.log('📋 缓存无效：缓存未设置或跟踪列表为空');
      return false;
    }
    
    const currentHash = this._generateDataHash();
    if (this._cache.dataHash !== currentHash) {
      console.log('📋 数据变化，缓存失效');
      return false;
    }
    
    const cacheAge = Date.now() - this._cache.lastUpdateTime;
    const maxCacheAge = this._cache.cacheExpiry || 30 * 60 * 1000; // 30分钟缓存有效期
    
    if (cacheAge >= maxCacheAge) {
      console.log('📋 缓存超时，需要重新生成');
      return false;
    }
    
    // 检查Firebase同步状态（可选，如果Firebase未初始化则跳过）
    if (this._cache.lastFirebaseSync && window.db) {
      // 如果Firebase同步时间早于缓存时间，可能需要更新
      if (this._cache.lastFirebaseSync < this._cache.lastUpdateTime) {
        console.log('📋 Firebase同步时间早于缓存时间，缓存可能过期');
        return false;
      }
    }
    
    // 优化：移除终止记录检查，因为终止记录不会影响活跃事件列表的生成
    // 如果需要显示终止记录，应该通过其他方式处理，而不是在这里强制重新生成
    // 这样可以避免每次缓存检查都读取localStorage
    
    console.log('✅ 缓存有效，使用缓存数据');
    return true;
  },
  
  // 清除缓存 (优化版本)
  _clearCache: function() {
    this._cache = {
      trackingList: null,
      lastUpdateTime: 0,
      dataHash: null,
      memberCalculations: new Map(),
      cacheExpiry: 30 * 60 * 1000, // 30分钟缓存有效期
      lastFirebaseSync: null
    };
    console.log('🧹 主日跟踪缓存已清除');
  },
  
  // 初始化数据变化监听
  _initDataChangeListener: function() {
    // 监听localStorage变化
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.includes('msh_') || e.key.includes('groups') || e.key.includes('attendance'))) {
        console.log('📦 检测到数据变化，清除缓存');
        this._clearCache();
      }
    });
    
    // 监听全局数据变化 - 选择性清除缓存
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      // 如果是排除人员数据变化，清除缓存
      if (key === 'msh_excludedMembers') {
        console.log('📦 检测到排除人员数据变化，清除缓存');
        if (window.utils && window.utils.SundayTrackingManager) {
          window.utils.SundayTrackingManager._clearCache();
        }
        return;
      }
      
      // 其他数据变化暂时跳过缓存清除，避免事件终止后状态丢失
      console.log('📦 检测到localStorage写入，但跳过缓存清除以避免事件终止问题');
      return;
    };
    
    console.log('📦 数据变化监听器已初始化');
  },
  // 判断是否为周日上午签到（9:00之前到10:40）
  isSundayAttendance: function(record) {
    // 如果记录没有time字段，直接判定为未签到
    if (!record.time) {
      console.log(`⚠️ 记录缺少time字段，判定为未签到:`, record);
      return false;
    }

    try {
      const date = new Date(record.time);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.log(`⚠️ 记录time字段无效，判定为未签到:`, record);
        return false;
      }
      
      // 🔧 修复：使用本地时间的日期信息，确保时区转换正确
      const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ... (本地时间的星期几)
      const hour = date.getHours(); // 本地时间的小时
      const minute = date.getMinutes(); // 本地时间的分钟
      
      // 判断是否为周日（本地时间）
      if (dayOfWeek !== 0) {
        // 调试：记录非周日的记录
        const dateStr = window.utils ? (window.utils.getLocalDateString || ((d) => {
          const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
          return localDate.toISOString().split('T')[0];
        }))(date) : date.toISOString().split('T')[0];
        console.log(`📅 非周日签到记录: ${dateStr} (星期${dayOfWeek})`, record);
        return false;
      }
      
      // 判断时间范围：主日签到时间范围（0:00-10:40，或下午签到11:00后）
      // 注意：主日签到可能在主日上午（0:00-10:40）或下午（11:00后）
      if (hour < 9) return true; // 9点之前可以签到（早到）
      if (hour === 9) return true; // 9点整可以签到
      if (hour === 10 && minute <= 40) return true; // 10:40之前可以签到
      if (hour >= 11) return true; // 11点后可以签到（下午签到也算主日签到）
      
      // 10:40-11:00之间禁止签到，不算主日签到
      return false;
    } catch (error) {
      console.log(`⚠️ 解析记录time字段出错，判定为未签到:`, record, error);
      return false;
    }
  },
  
  // 从指定日期开始生成主日日期列表
  getSundayDatesFromStart: function(startDate, endDate) {
    const sundayDates = [];
    
    // 确保startDate是有效的日期
    if (!startDate || isNaN(new Date(startDate).getTime())) {
      console.log('⚠️ startDate无效，使用默认值: 2025-08-03');
      startDate = new Date('2025-08-03');
    }
    
    const current = new Date(startDate);
    
    // 确保从周日开始
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
    }
    
    // 只包含已经过去的主日，不包含未来的主日
    while (current <= endDate) {
      // 检查这个主日是否已经过去（不包括今天）
      const today = new Date();
      const currentDateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (currentDateOnly < todayDateOnly) {
        sundayDates.push(new Date(current));
      }
      current.setDate(current.getDate() + 7); // 下一周
    }
    
    return sundayDates;
  },
  
  // 获取下一个主日日期
  getNextSunday: function(currentDate) {
    const next = new Date(currentDate);
    const daysUntilSunday = (7 - next.getDay()) % 7;
    next.setDate(next.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    return next;
  },
  
  // 获取上一个主日日期
  getPreviousSunday: function(currentDate) {
    const prev = new Date(currentDate);
    const daysFromSunday = prev.getDay();
    // 如果当前是周日，返回上一周；否则返回本周的周日
    prev.setDate(prev.getDate() - (daysFromSunday === 0 ? 7 : daysFromSunday));
    return prev;
  },
  
  // 获取日期字符串（YYYY-MM-DD格式）
  getDateString: function(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },
  
  // 获取最新的主日日期（不包括今天）
  getLatestSundayDate: function() {
    const today = new Date();
    const latestSunday = this.getPreviousSunday(today);
    // 如果今天是周日，返回上一周
    if (today.getDay() === 0) {
      latestSunday.setDate(latestSunday.getDate() - 7);
    }
    return this.getDateString(latestSunday);
  },
  
  // 获取两个日期之间的所有主日日期
  getSundayDatesBetween: function(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sundayDates = [];
    
    // 确保从周日开始
    let current = new Date(start);
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
    }
    
    // 收集所有周日（不包括今天）
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    while (current <= end) {
      const currentDateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      if (currentDateOnly < todayDateOnly) {
        sundayDates.push(this.getDateString(current));
      }
      current.setDate(current.getDate() + 7);
    }
    
    return sundayDates;
  },
  
  // 判断两个日期是否为同一天
  isSameDate: function(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },
  
  // 计算连续缺勤情况（优化版 - 优先使用周级计算结果）
  calculateConsecutiveAbsences: async function(memberUUID) {
    // 检查成员计算缓存
    const cacheKey = memberUUID;
    if (this._cache.memberCalculations.has(cacheKey)) {
      const cachedResult = this._cache.memberCalculations.get(cacheKey);
      const cacheAge = Date.now() - cachedResult.timestamp;
      const maxMemberCacheAge = 2 * 60 * 1000; // 2分钟成员缓存有效期
      
      if (cacheAge < maxMemberCacheAge) {
        console.log(`📦 使用缓存的成员计算结果 - UUID: ${memberUUID}`);
        return cachedResult.data;
      }
    }
    
    console.log(`计算连续缺勤 - UUID: ${memberUUID}`);
    const startTime = performance.now();
    
    // 🆕 优先从周级计算结果获取（最快）
    try {
      const latestSundayDate = this.getLatestSundayDate();
      const weeklyCalculations = await this.loadWeeklyCalculations(latestSundayDate);
      
      if (weeklyCalculations && weeklyCalculations[memberUUID]) {
        const calculation = weeklyCalculations[memberUUID];
        console.log(`✅ 从周级计算结果获取缺勤数据 - UUID: ${memberUUID}`);
        
        // 查找缺勤开始日期
        const startDate = await this.findAbsenceStartDateFromWeekly(memberUUID, latestSundayDate);
        
        // 构建返回结果（兼容现有格式）
        const result = {
          consecutiveAbsences: calculation.consecutiveAbsences || 0,
          lastAttendanceDate: calculation.status === 'present' ? latestSundayDate : null,
          checkStartDate: new Date('2025-08-03'),
          trackingStartDate: calculation.status === 'absent' && calculation.consecutiveAbsences >= 2 ? startDate : null,
          absenceEvents: calculation.status === 'absent' && calculation.consecutiveAbsences >= 2 ? [{
            startDate: startDate,
            consecutiveAbsences: calculation.consecutiveAbsences,
            endDate: null
          }] : []
        };
        
        // 保存到缓存
        this._cache.memberCalculations.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        const endTime = performance.now();
        console.log(`从周级计算结果获取耗时: ${(endTime - startTime).toFixed(2)}ms`);
        return result;
      }
    } catch (error) {
      console.warn('从周级计算结果获取失败，回退到 daily-reports 计算:', error);
    }
    
    // 🆕 回退到 daily-reports 计算
    try {
      const dailyReportResult = await this.calculateAbsenceFromDailyReports(memberUUID);
      if (dailyReportResult) {
        console.log(`✅ 从 daily-reports 获取缺勤数据 - UUID: ${memberUUID}`);
        const endTime = performance.now();
        console.log(`从 daily-reports 计算耗时: ${(endTime - startTime).toFixed(2)}ms`);
        return dailyReportResult;
      }
    } catch (error) {
      console.warn('从 daily-reports 计算失败，回退到实时计算:', error);
    }
    
    // 最后回退到实时计算（从 attendanceRecords 计算）
    console.log(`🔄 使用实时计算获取缺勤数据 - UUID: ${memberUUID}`);
    
    // 获取该人员的所有跟踪记录，确定上次解决后的检查起点
    const memberTrackingRecords = this.getMemberTrackingRecords(memberUUID);
    let checkStartDate = null;
    
    // 查找最新的已解决或已终止的记录
    const latestResolvedRecord = memberTrackingRecords
      .filter(record => record.status === 'resolved' || record.status === 'terminated')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
    
    if (latestResolvedRecord && latestResolvedRecord.nextCheckDate) {
      // 从上次解决后的下一个主日开始检查
      checkStartDate = new Date(latestResolvedRecord.nextCheckDate);
      console.log(`从跟踪记录获取检查起点: ${checkStartDate.toISOString().split('T')[0]}`);
    } else {
      // 第一次检查，从2025年8月开始
      checkStartDate = new Date('2025-08-03'); // 2025年8月第一周（星期日）
      console.log(`首次检查，从2025年8月开始`);
    }
    
    // 确保checkStartDate是有效的日期
    if (!checkStartDate || isNaN(checkStartDate.getTime())) {
      checkStartDate = new Date('2025-08-03');
      console.log(`检查起点无效，使用默认值: ${checkStartDate.toISOString().split('T')[0]}`);
    }
    
    // 获取该成员的所有活跃事件，用于跳过已覆盖的时间段
    const activeEvents = memberTrackingRecords.filter(record => record.status === 'active');
    console.log(`该成员活跃事件数量: ${activeEvents.length}`);
    
    // 获取主日日期列表（从检查起点开始到当前日期）
    const currentDate = new Date();
    const sundayDates = this.getSundayDatesFromStart(checkStartDate, currentDate);
    console.log(`主日日期数量: ${sundayDates.length}`);
    
    // 获取该成员的签到记录（只获取检查起点之后的记录）
    const memberRecords = this.getMemberAttendanceRecords(memberUUID, checkStartDate);
    console.log(`签到记录数量: ${memberRecords.length}`);
    
    if (memberRecords.length > 0) {
      console.log('签到记录示例:', memberRecords[0]);
    }
    
    // 识别所有独立的缺勤事件 (传递memberUUID用于优化)
    const absenceEvents = identifyAbsenceEvents(sundayDates, memberRecords, memberUUID);
    
    // 更新现有事件的状态（实时更新连续缺勤周数）
    const updatedEvents = updateExistingEvents(absenceEvents, memberUUID);
    
    // 返回最新的缺勤事件信息（用于显示）
    const latestEvent = updatedEvents.length > 0 ? updatedEvents[updatedEvents.length - 1] : null;
    const maxConsecutiveAbsences = latestEvent ? latestEvent.consecutiveAbsences : 0;
    const trackingStartDate = latestEvent ? latestEvent.startDate : null;
    const lastAttendanceDate = getLastAttendanceDate(memberRecords);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    const result = { 
      consecutiveAbsences: maxConsecutiveAbsences, 
      lastAttendanceDate, 
      checkStartDate: checkStartDate,
      trackingStartDate: trackingStartDate,
      absenceEvents: updatedEvents // 返回所有更新后的缺勤事件
    };
    
    // 保存到成员计算缓存
    this._cache.memberCalculations.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    console.log(`成员 ${memberUUID}: 识别到 ${updatedEvents.length} 个缺勤事件，耗时: ${processingTime.toFixed(2)}ms`);
    console.log(`最新事件连续缺勤 ${maxConsecutiveAbsences} 次`);
    console.log(`最后签到日期:`, lastAttendanceDate ? lastAttendanceDate.toISOString().split('T')[0] : '无');
    console.log(`跟踪开始日期:`, trackingStartDate ? (typeof trackingStartDate === 'string' ? trackingStartDate : trackingStartDate.toISOString().split('T')[0]) : '无');
    
    return result;
  },
  
  // 获取人员的签到记录（优化版本，支持从指定日期开始）
  getMemberAttendanceRecords: function(memberUUID, fromDate = null) {
    if (!window.attendanceRecords) return [];
    
    // 调试信息：检查签到记录结构
    if (window.attendanceRecords.length > 0) {
      const sampleRecord = window.attendanceRecords[0];
      console.log('签到记录示例结构:', {
        name: sampleRecord.name,
        memberUUID: sampleRecord.memberUUID,
        time: sampleRecord.time,
        group: sampleRecord.group,
        allKeys: Object.keys(sampleRecord)
      });
      console.log('完整签到记录示例:', JSON.stringify(sampleRecord, null, 2));
    }
    
    // 首先尝试通过 memberUUID 匹配
    let filteredRecords = window.attendanceRecords.filter(record => 
      record.memberUUID === memberUUID
    );
    
    console.log(`通过UUID ${memberUUID} 匹配到的记录:`, filteredRecords.length, '条');
    
    // 如果没有找到，尝试通过 name 匹配
    if (filteredRecords.length === 0) {
      // 通过成员名称匹配
      const member = window.utils.UUIDIndex.findMemberByUUID(memberUUID);
      if (member && member.name) {
        console.log(`尝试通过名称 "${member.name}" 匹配签到记录`);
        filteredRecords = window.attendanceRecords.filter(record => 
          record.name === member.name
        );
        console.log(`通过名称匹配找到 ${member.name} 的签到记录:`, filteredRecords.length, '条');
        
        // 为匹配到的记录添加memberUUID字段
        filteredRecords.forEach(record => {
          if (!record.memberUUID) {
            record.memberUUID = memberUUID;
            console.log(`为签到记录 ${record.name} 添加memberUUID: ${memberUUID}`);
          }
        });
      } else {
        console.log(`无法找到UUID ${memberUUID} 对应的成员信息`);
      }
    }
    
    // 如果指定了开始日期，只返回该日期之后的记录
    if (fromDate && filteredRecords.length > 0) {
      const fromDateStr = fromDate.toISOString().split('T')[0];
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.time);
        const recordDateStr = recordDate.toISOString().split('T')[0];
        return recordDateStr >= fromDateStr;
      });
      console.log(`从 ${fromDateStr} 开始筛选后的签到记录:`, filteredRecords.length, '条');
    }
    
    // 调试信息
    console.log(`获取成员 ${memberUUID} 的签到记录:`, filteredRecords.length, '条');
    if (filteredRecords.length > 0) {
      console.log('签到记录示例:', filteredRecords[0]);
    }
    
    return filteredRecords;
  },
  
  // 数据迁移：为所有现有数据添加UUID
  migrateDataWithUUID: function() {
    try {
      console.log('开始数据迁移：为所有数据添加UUID...');
      
      let migrationCount = 0;
      let hasChanges = false;
      
      // 1. 为所有成员添加UUID
      if (window.groups) {
        Object.keys(window.groups).forEach(groupKey => {
          const members = window.groups[groupKey];
          members.forEach(member => {
            if (!member.uuid) {
              member.uuid = window.utils.generateMemberUUID(member);
              migrationCount++;
              hasChanges = true;
              console.log(`为成员 ${member.name} 添加UUID: ${member.uuid}`);
            }
          });
        });
      }
      
      // 2. 为所有签到记录添加memberUUID
      if (window.attendanceRecords) {
        window.attendanceRecords.forEach(record => {
          if (!record.memberUUID && record.name) {
            // 通过姓名找到对应的成员UUID
            const member = this.findMemberByName(record.name);
            if (member && member.uuid) {
              record.memberUUID = member.uuid;
              migrationCount++;
              hasChanges = true;
              console.log(`为签到记录 ${record.name} 添加memberUUID: ${member.uuid}`);
            }
          }
        });
      }
      
      console.log(`数据迁移完成，共处理 ${migrationCount} 条记录`);
      
      // 3. 只有在有变化时才保存数据
      if (hasChanges) {
        this.saveModifiedData();
        console.log('数据迁移已保存到本地存储和Firebase');
      } else {
        console.log('数据已是最新状态，无需保存');
      }
      
      return true;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return false;
    }
  },
  
  // 通过姓名查找成员
  findMemberByName: function(name) {
    if (!window.groups) return null;
    
    for (const groupKey of Object.keys(window.groups)) {
      const members = window.groups[groupKey];
      const member = members.find(m => m.name === name);
      if (member) {
        return member;
      }
    }
    return null;
  },
  
  // 保存修改后的数据到Firebase和本地存储
  saveModifiedData: function() {
    try {
      // 保存成员数据（包含新生成的UUID）
      // 注意：UUID迁移时，如果groups没有变化，不需要同步到Firebase
      // 这里只更新localStorage，不进行Firebase同步，避免覆盖
      if (window.groups) {
        localStorage.setItem('msh_groups', JSON.stringify(window.groups));
        // UUID迁移不触发Firebase同步，避免覆盖数据
        // 如果需要同步，应该使用专门的同步机制
        console.log('✅ UUID迁移完成，数据已保存到localStorage');
      }
      
      // 保存签到记录数据（包含新添加的memberUUID）
      if (window.attendanceRecords) {
        localStorage.setItem('msh_attendance_records', JSON.stringify(window.attendanceRecords));
        
        // 🚨 紧急修复：添加数据量检查，防止覆盖历史数据
        if (window.db) {
          if (window.attendanceRecords.length < 50) {
            console.warn(`⚠️ 警告：签到记录数量较少(${window.attendanceRecords.length}条)，UUID迁移同步已禁用`);
            console.warn('💡 请确保已加载完整数据后再执行UUID迁移');
          } else {
            // 🚨 修复：UUID迁移不应覆盖全部数据
            console.log('⚠️ UUID迁移已完成，但不应对签到记录进行全量覆盖操作');
            console.log('💡 如需同步签到记录，请使用专门的签到记录管理工具');
          }
        }
      }
      
      console.log('数据修改已保存');
      return true;
    } catch (error) {
      console.error('保存修改后的数据失败:', error);
      return false;
    }
  },
  
  // 获取跟踪记录（支持多事件系统）
  getTrackingRecord: function(recordId) {
    const trackingRecords = this.getTrackingRecords();
    
    // 调试：显示查找过程
    console.log(`🔍 getTrackingRecord查找: ${recordId}`);
    
    // 调试：显示所有终止的记录
    const terminatedRecords = trackingRecords.filter(record => record.status === 'terminated');
    if (terminatedRecords.length > 0) {
      console.log(`🛑 发现${terminatedRecords.length}个已终止记录:`);
      terminatedRecords.forEach((record, index) => {
        console.log(`  终止记录${index + 1}: ID=${record.recordId}, 成员=${record.memberUUID}`);
      });
    }
    
    // 检查是否有重复记录
    const allMatches = trackingRecords.filter(record => record.recordId === recordId);
    if (allMatches.length > 1) {
      console.log(`⚠️ 发现重复记录: ${recordId}, 共${allMatches.length}个`);
      allMatches.forEach((match, index) => {
        console.log(`  记录${index + 1}: 状态=${match.status}, 创建时间=${match.createdAt}`);
      });
    }
    
    // 优先精确匹配recordId
    const exactMatch = trackingRecords.find(record => record.recordId === recordId);
    if (exactMatch) {
      console.log(`✅ 精确匹配找到: ${exactMatch.recordId}, 状态: ${exactMatch.status}`);
      return exactMatch;
    }
    
    // 如果没有找到，再尝试匹配memberUUID（向后兼容）
    const uuidMatch = trackingRecords.find(record => record.memberUUID === recordId);
    if (uuidMatch) {
      console.log(`⚠️ UUID匹配找到: ${uuidMatch.recordId}, 状态: ${uuidMatch.status}`);
      return uuidMatch;
    }
    
    console.log(`❌ 未找到匹配记录: ${recordId}`);
    return null;
  },
  
  // 获取成员的所有跟踪记录
  getMemberTrackingRecords: function(memberUUID) {
    const trackingRecords = this.getTrackingRecords();
    return trackingRecords.filter(record => record.memberUUID === memberUUID);
  },
  
  // 获取所有跟踪记录
  getTrackingRecords: function() {
    try {
      const stored = localStorage.getItem('msh_sunday_tracking');
      const records = stored ? JSON.parse(stored) : [];
      
      // 清理重复记录（保留最新的）
      const uniqueRecords = [];
      const seenRecordIds = new Set();
      
      // 按更新时间排序，确保最新的记录在前面
      const sortedRecords = records.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || '2025-01-01').getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || '2025-01-01').getTime();
        return timeB - timeA; // 改为降序排序，最新的记录在前面
      });
      
      // 调试：显示排序后的记录
      console.log('🔍 重复记录清理前的记录状态（按更新时间降序排列）:');
      sortedRecords.forEach((record, index) => {
        console.log(`  记录${index + 1}: ID=${record.recordId}, 状态=${record.status}, 更新时间=${record.updatedAt || record.createdAt}`);
      });
      
      for (const record of sortedRecords) {
        if (record.recordId && !seenRecordIds.has(record.recordId)) {
          seenRecordIds.add(record.recordId);
          uniqueRecords.push(record);
          console.log(`✅ 保留记录: ID=${record.recordId}, 状态=${record.status}`);
        } else if (record.recordId && seenRecordIds.has(record.recordId)) {
          console.log(`❌ 丢弃重复记录: ID=${record.recordId}, 状态=${record.status}`);
        } else if (!record.recordId && record.memberUUID) {
          // 对于没有recordId的旧记录，也保留
          uniqueRecords.push(record);
        }
      }
      
      // 如果有重复记录被清理，保存清理后的数据
      if (uniqueRecords.length !== records.length) {
        console.log(`🧹 清理重复记录: ${records.length} -> ${uniqueRecords.length}`);
        localStorage.setItem('msh_sunday_tracking', JSON.stringify(uniqueRecords));
      }
      
      // 调试：显示记录状态
      if (uniqueRecords.length > 0) {
        const terminatedCount = uniqueRecords.filter(r => r.status === 'terminated').length;
        const activeCount = uniqueRecords.filter(r => r.status === 'active').length;
        console.log(`📋 getTrackingRecords: 总记录${uniqueRecords.length}个, 活跃${activeCount}个, 已终止${terminatedCount}个`);
      }
      
      return uniqueRecords;
    } catch (error) {
      console.error('获取跟踪记录失败:', error);
      return [];
    }
  },
  
  // 保存跟踪记录（支持多事件系统）
  saveTrackingRecord: function(record) {
    try {
      console.log(`💾 开始保存跟踪记录: ${record.recordId}`);
      const records = this.getTrackingRecords();
      const recordId = record.recordId;
      
      console.log(`📋 保存前记录数量: ${records.length}`);
      console.log(`🔍 查找记录ID: ${recordId}`);
      
      // 优先精确匹配recordId，如果没有找到，再尝试匹配memberUUID（向后兼容）
      let existingIndex = records.findIndex(r => r.recordId === recordId);
      console.log(`🔍 精确匹配结果: ${existingIndex}`);
      
      if (existingIndex === -1 && record.memberUUID) {
        existingIndex = records.findIndex(r => r.memberUUID === record.memberUUID && !r.recordId);
        console.log(`🔍 UUID匹配结果: ${existingIndex}`);
      }
      
      if (existingIndex >= 0) {
        console.log(`🔄 更新现有记录，索引: ${existingIndex}`);
        console.log(`🔄 更新前状态: ${records[existingIndex].status}`);
        records[existingIndex] = record;
        console.log(`🔄 更新后状态: ${records[existingIndex].status}`);
        console.log(`✅ 更新现有跟踪记录: ${recordId}`);
      } else {
        records.push(record);
        console.log(`➕ 添加新跟踪记录: ${recordId}`);
      }
      
      console.log(`💾 保存到localStorage，记录数量: ${records.length}`);
      localStorage.setItem('msh_sunday_tracking', JSON.stringify(records));
      
      // 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (window.db) {
        // 将数组转换为对象格式，使用recordId作为key
        const recordsObj = {};
        records.forEach(record => {
          if (record.recordId) {
            recordsObj[record.recordId] = record;
          }
        });
        
        window.db.ref('trackingRecords').update(recordsObj).catch(error => {
          console.error('同步跟踪记录到Firebase失败:', error);
        });
        console.log(`☁️ 已同步到Firebase`);
      }
      
      console.log('✅ 跟踪记录已保存:', record);
      return true;
    } catch (error) {
      console.error('❌ 保存跟踪记录失败:', error);
      return false;
    }
  },
  
  // 生成跟踪列表（使用周级增量计算）
  generateTrackingList: async function() {
    // 检查缓存是否有效
    if (this._isCacheValid()) {
      console.log('📦 使用缓存的跟踪列表，跳过重新计算');
      return this._cache.trackingList;
    }
    
    // 防止并发调用：如果正在生成，等待正在进行的生成完成
    if (this._generating && this._generatingPromise) {
      console.log('⏳ 检测到正在生成中，等待完成...');
      return await this._generatingPromise;
    }
    
    // 设置互斥锁
    this._generating = true;
    this._generatingPromise = (async () => {
      try {
        console.log('🔄 开始生成新的跟踪列表（使用周级增量计算）...');
    const startTime = performance.now();
    
    // 首先执行数据迁移，确保所有数据都有UUID
    this.migrateDataWithUUID();
    
        // 使用周级增量计算生成事件列表
        const trackingList = await this.generateTrackingListFromWeeklyCalculations();
        
        // 保存修改后的数据（包含新生成的UUID和memberUUID）
        this.saveModifiedData();
        
        // 保存到缓存
        this._cache.trackingList = trackingList;
        this._cache.lastUpdateTime = Date.now();
        this._cache.dataHash = this._generateDataHash();
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        console.log(`✅ 跟踪列表生成完成（周级增量计算），耗时: ${processingTime.toFixed(2)}ms，事件数量: ${trackingList.length}`);
        
        // 后台异步初始化历史数据（如果还没有初始化）
        this.initializeHistoricalDataAsyncIfNeeded();
        
        return trackingList;
      } finally {
        // 释放互斥锁
        this._generating = false;
        this._generatingPromise = null;
      }
    })();
    
    return await this._generatingPromise;
  },
  
  // 后台异步初始化历史数据（如果需要）
  initializeHistoricalDataAsyncIfNeeded: function() {
    // 检查是否正在初始化
    if (this._historicalDataInitializing) {
      console.log('⏳ 历史数据正在初始化中，跳过');
          return;
        }
        
    // 检查是否已经初始化过
    const lastInitTime = localStorage.getItem('msh_weekly_calc_last_init');
    const now = Date.now();
    if (lastInitTime && (now - parseInt(lastInitTime)) < 24 * 60 * 60 * 1000) {
      // 24小时内已经初始化过，跳过
      console.log('⏭️ 历史数据已在24小时内初始化过，跳过');
          return;
        }
        
    // 开始异步初始化
    this._historicalDataInitializing = true;
    console.log('🔄 开始后台异步初始化历史数据...');
    
    // 从2025-08-03开始到当前日期
    const startDate = '2025-08-03';
    const endDate = this.getLatestSundayDate();
    
    this.initializeHistoricalDataAsync(startDate, endDate, (progress) => {
      if (progress.current === progress.total) {
        // 初始化完成
        this._historicalDataInitializing = false;
        localStorage.setItem('msh_weekly_calc_last_init', now.toString());
        console.log(`✅ 历史数据初始化完成: ${progress.completed}/${progress.total}`);
      }
    }).catch(error => {
      console.error('❌ 历史数据初始化失败:', error);
      this._historicalDataInitializing = false;
    });
  },
  
  // 获取所有人员
  getAllMembers: function() {
    if (!window.groups) return [];
    
    const allMembers = [];
    Object.entries(window.groups).forEach(([groupKey, members]) => {
      // 为每个成员添加组别信息和UUID
      members.forEach(member => {
        // 确保每个成员都有UUID
        if (!member.uuid) {
          member.uuid = window.utils.generateMemberUUID(member);
          console.log(`为成员 ${member.name} 生成UUID: ${member.uuid}`);
        }
        
        allMembers.push({
          ...member,
          group: groupKey // 确保每个成员都有组别信息
        });
      });
    });
    
    console.log('获取所有人员:', allMembers.length, '人');
    console.log('第一个成员示例:', allMembers[0]);
    
    return allMembers;
  },
  
  // 获取排除的人员列表（新版本：从成员标记中获取）
  getExcludedMembers: function() {
    try {
      console.log(`🔍 getExcludedMembers: 从成员标记中获取排除人员`);
      
      // 获取所有成员数据
      const allMembers = this.getAllMembers();
      console.log(`🔍 getExcludedMembers: 总成员数: ${allMembers.length}`);
      
      // 筛选出标记为排除的成员
      const excludedMembers = allMembers.filter(member => {
        return member.excluded === true || member.excluded === 'true';
      });
      
      console.log(`🔍 getExcludedMembers: 排除人员数: ${excludedMembers.length}`);
      console.log(`🔍 getExcludedMembers: 排除人员详情:`, excludedMembers.map(m => `${m.name}(${m.group})`));
      
      return excludedMembers;
    } catch (error) {
      console.error('获取排除人员列表失败:', error);
      return [];
    }
  },
  
  // 设置成员排除状态（新版本：直接在成员数据中标记）
  setMemberExcluded: function(memberUUID, excluded = true, reason = '') {
    try {
      console.log(`🔍 setMemberExcluded: 设置成员 ${memberUUID} 排除状态为 ${excluded}`);
      
      // 获取所有小组数据
      const groups = JSON.parse(localStorage.getItem('msh_groups') || '{}');
      let memberFound = false;
      
      // 遍历所有小组查找成员
      for (const groupKey in groups) {
        if (groups[groupKey] && Array.isArray(groups[groupKey])) {
          const memberIndex = groups[groupKey].findIndex(member => member.uuid === memberUUID);
          if (memberIndex !== -1) {
            // 更新成员排除状态
            groups[groupKey][memberIndex] = {
              ...groups[groupKey][memberIndex],
              excluded: excluded,
              excludedAt: excluded ? new Date().toISOString() : null,
              excludedReason: excluded ? reason : null
            };
            
            memberFound = true;
            console.log(`✅ 成员 ${memberUUID} 排除状态已更新`);
            break;
          }
        }
      }
      
      if (!memberFound) {
        console.warn(`⚠️ 未找到成员 ${memberUUID}`);
        return false;
      }
      
      // 保存更新后的数据
      localStorage.setItem('msh_groups', JSON.stringify(groups));
      
      // 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        // 只更新变化的小组，不覆盖整个groups对象
        const groupKey = Object.keys(groups).find(key => {
          const member = groups[key]?.find(m => m.uuid === memberUUID);
          return member !== undefined;
        });
        if (groupKey) {
          const updateData = {};
          updateData[groupKey] = groups[groupKey];
          db.ref('groups').update(updateData).then(() => {
            console.log(`✅ 排除状态已同步到Firebase: ${groupKey}`);
        }).catch(error => {
          console.error('❌ 同步到Firebase失败:', error);
        });
        }
      }
      
      // 更新全局变量
      if (window.groups) {
        window.groups = groups;
      }
      
      return true;
    } catch (error) {
      console.error('设置成员排除状态失败:', error);
      return false;
    }
  },
  
  // 检查成员是否被排除（新版本：直接检查成员标记）
  isMemberExcluded: function(member) {
    try {
      // 检查成员是否有排除标记
      return member.excluded === true || member.excluded === 'true';
    } catch (error) {
      console.error('检查成员排除状态失败:', error);
      return false;
    }
  },
  
  // 迁移排除人员数据（从独立数组到成员标记）
  migrateExcludedMembers: function() {
    try {
      console.log('🔄 开始迁移排除人员数据...');
      
      // 获取现有的排除人员数组
      const oldExcludedMembers = JSON.parse(localStorage.getItem('msh_excludedMembers') || '[]');
      console.log(`📊 发现 ${oldExcludedMembers.length} 个排除人员需要迁移`);
      
      if (oldExcludedMembers.length === 0) {
        console.log('✅ 没有排除人员需要迁移');
        return true;
      }
      
      // 获取所有小组数据
      const groups = JSON.parse(localStorage.getItem('msh_groups') || '{}');
      let migratedCount = 0;
      
      // 遍历排除人员，在成员数据中添加标记
      oldExcludedMembers.forEach(excludedMember => {
        let memberFound = false;
        
        // 遍历所有小组查找成员
        for (const groupKey in groups) {
          if (groups[groupKey] && Array.isArray(groups[groupKey])) {
            const memberIndex = groups[groupKey].findIndex(member => 
              (member.uuid && member.uuid === excludedMember.uuid) ||
              (member.name === excludedMember.name && member.group === excludedMember.group)
            );
            
            if (memberIndex !== -1) {
              // 添加排除标记
              groups[groupKey][memberIndex] = {
                ...groups[groupKey][memberIndex],
                excluded: true,
                excludedAt: new Date().toISOString(),
                excludedReason: '数据迁移'
              };
              
              memberFound = true;
              migratedCount++;
              console.log(`✅ 已迁移排除人员: ${excludedMember.name} (${excludedMember.group})`);
              break;
            }
          }
        }
        
        if (!memberFound) {
          console.warn(`⚠️ 未找到排除人员: ${excludedMember.name} (${excludedMember.group})`);
        }
      });
      
      // 保存更新后的数据
      localStorage.setItem('msh_groups', JSON.stringify(groups));
      
      // 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        // 只更新变化的小组，不覆盖整个groups对象
        const updatedGroups = {};
        Object.keys(groups).forEach(groupKey => {
          const hasUpdatedMember = groups[groupKey].some(member => 
            member.excludedAt && new Date(member.excludedAt) > new Date(Date.now() - 1000) // 最近1秒内更新的
          );
          if (hasUpdatedMember) {
            updatedGroups[groupKey] = groups[groupKey];
          }
        });
        if (Object.keys(updatedGroups).length > 0) {
          db.ref('groups').update(updatedGroups).then(() => {
            console.log(`✅ 排除人员标记已同步到Firebase: ${Object.keys(updatedGroups).join(', ')}`);
        }).catch(error => {
          console.error('❌ 同步到Firebase失败:', error);
        });
        }
      }
      
      // 备份旧的排除人员数据
      const backupData = {
        migratedAt: new Date().toISOString(),
        originalData: oldExcludedMembers,
        migratedCount: migratedCount
      };
      localStorage.setItem('msh_excludedMembers_backup', JSON.stringify(backupData));
      
      // 清空旧的排除人员数据
      localStorage.removeItem('msh_excludedMembers');
      
      console.log(`✅ 排除人员迁移完成: ${migratedCount}/${oldExcludedMembers.length} 个成功迁移`);
      
      return true;
    } catch (error) {
      console.error('❌ 排除人员迁移失败:', error);
      return false;
    }
  },
  
  // 解决跟踪
  resolveTracking: function(memberUUID, reason, resolvedBy) {
    console.log(`解决跟踪 - 成员UUID: ${memberUUID}, 原因: ${reason}, 解决人: ${resolvedBy}`);
    
    const trackingRecord = this.getTrackingRecord(memberUUID);
    console.log('现有跟踪记录:', trackingRecord);
    
    const currentDate = new Date();
    
    // 计算下一个主日作为下次检查的起点
    const nextSunday = this.getNextSunday(currentDate);
    
    // 更新跟踪记录
    const updatedRecord = {
      ...trackingRecord,
      status: 'resolved',
      resolvedDate: currentDate.toISOString(),
      resolvedBy: resolvedBy,
      resolvedReason: reason,
      nextCheckDate: nextSunday.toISOString(),
      updatedAt: currentDate.toISOString()
    };
    
    console.log('更新后的跟踪记录:', updatedRecord);
    
    // 保存更新后的记录
    const result = this.saveTrackingRecord(updatedRecord);
    console.log('保存结果:', result);
    
    return result;
  },
  
  // 忽略跟踪
  ignoreTracking: function(memberUUID, reason) {
    console.log(`忽略跟踪 - 成员UUID: ${memberUUID}, 原因: ${reason}`);
    
    const trackingRecord = this.getTrackingRecord(memberUUID);
    console.log('现有跟踪记录:', trackingRecord);
    
    const currentDate = new Date();
    
    // 计算下一个主日作为下次检查的起点
    const nextSunday = this.getNextSunday(currentDate);
    
    // 更新跟踪记录
    const updatedRecord = {
      ...trackingRecord,
      status: 'ignored',
      ignoredDate: currentDate.toISOString(),
      ignoredReason: reason,
      nextCheckDate: nextSunday.toISOString(),
      updatedAt: currentDate.toISOString()
    };
    
    console.log('更新后的跟踪记录:', updatedRecord);
    
    // 保存更新后的记录
    const result = this.saveTrackingRecord(updatedRecord);
    console.log('保存结果:', result);
    
    return result;
  },

  // 添加跟踪记录
  addTrackingRecord: function(memberUUID, trackingRecord) {
    try {
      // 获取或创建个人跟踪记录
      let personalRecords = this.getPersonalTrackingRecords(memberUUID);
      if (!personalRecords) {
        personalRecords = [];
      }
      
      // 添加新的跟踪记录
      personalRecords.push(trackingRecord);
      
      // 按日期排序
      personalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 保存个人跟踪记录
      this.savePersonalTrackingRecords(memberUUID, personalRecords);
      
      console.log(`已添加跟踪记录: ${memberUUID}`);
      return true;
    } catch (error) {
      console.error('添加跟踪记录失败:', error);
      return false;
    }
  },

  // 终止跟踪事件 (同时保存到localStorage和Firebase)
  terminateTracking: async function(recordId, terminationRecord) {
    try {
      console.log(`🔍 尝试终止跟踪记录: ${recordId}`);
      
      // 获取跟踪记录
      const trackingRecord = this.getTrackingRecord(recordId);
      if (!trackingRecord) {
        console.error(`❌ 跟踪记录未找到: ${recordId}`);
        return false;
      }
      
      console.log(`✅ 找到跟踪记录:`, trackingRecord);
      
      // 更新跟踪记录状态
      trackingRecord.status = 'terminated';
      trackingRecord.terminationRecord = terminationRecord;
      trackingRecord.terminatedAt = new Date().toISOString();
      trackingRecord.updatedAt = new Date().toISOString();
      
      // 设置下次检查日期为终止日期
      trackingRecord.nextCheckDate = terminationRecord.terminationDate;
      
      console.log(`🔄 更新后的记录状态:`, trackingRecord);
      
      // 1. 保存到localStorage
      const saveResult = this.saveTrackingRecord(trackingRecord);
      console.log(`💾 localStorage保存结果: ${saveResult}`);
      
      if (!saveResult) {
        console.error('❌ localStorage保存失败');
        return false;
      }
      
      // 2. 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (window.db) {
        try {
          // 使用update()只更新该记录，不覆盖全部数据
          const recordObj = {};
          recordObj[recordId] = record;
          await window.db.ref('trackingRecords').update(recordObj);
          console.log(`✅ 事件终止已同步到Firebase: ${recordId}`);
          // 记录Firebase同步时间
          this._cache.lastFirebaseSync = Date.now();
        } catch (firebaseError) {
          console.error('❌ Firebase同步失败:', firebaseError);
          // Firebase同步失败不影响本地保存
        }
      }
      
      // 3. 清除缓存，确保下次生成跟踪列表时使用最新数据
      this._clearCache();
      console.log(`🧹 已清除缓存，确保下次生成最新跟踪列表`);
      
      console.log(`✅ 已终止跟踪: ${recordId}`);
      return true;
    } catch (error) {
      console.error('❌ 终止跟踪失败:', error);
      return false;
    }
  },

  // 重启跟踪事件 (同时保存到localStorage和Firebase)
  restartEvent: async function(recordId, restartRecord) {
    try {
      console.log(`🔄 开始重启事件: ${recordId}`);
      console.log(`🔄 重启记录:`, restartRecord);
      
      // 获取跟踪记录
      const trackingRecord = this.getTrackingRecord(recordId);
      if (!trackingRecord) {
        console.error('❌ 跟踪记录未找到:', recordId);
        return false;
      }
      
      console.log(`🔄 找到跟踪记录:`, trackingRecord);
      console.log(`🔄 原状态: ${trackingRecord.status}`);
      
      // 更新跟踪记录状态
      trackingRecord.status = 'active';
      trackingRecord.restartRecord = restartRecord;
      trackingRecord.restartedAt = new Date().toISOString();
      trackingRecord.updatedAt = new Date().toISOString(); // 添加更新时间，确保排序正确
      
      // 清除终止记录
      delete trackingRecord.terminationRecord;
      delete trackingRecord.terminatedAt;
      
      // 设置下次检查日期为重启日期
      trackingRecord.nextCheckDate = restartRecord.restartDate;
      
      // 重置连续缺勤次数
      trackingRecord.consecutiveAbsences = 0;
      
      // 更新开始日期为重启日期
      trackingRecord.startDate = restartRecord.restartDate;
      
      console.log(`🔄 更新后的记录:`, trackingRecord);
      
      // 1. 保存到localStorage
      const saveResult = this.saveTrackingRecord(trackingRecord);
      console.log(`💾 localStorage保存结果: ${saveResult}`);
      
      if (!saveResult) {
        console.error('❌ localStorage保存失败');
        return false;
      }
      
      // 2. 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (window.db) {
        try {
          // 使用update()只更新该记录，不覆盖全部数据
          const recordObj = {};
          recordObj[recordId] = trackingRecord;
          await window.db.ref('trackingRecords').update(recordObj);
          console.log(`✅ 事件重启已同步到Firebase: ${recordId}`);
          // 记录Firebase同步时间
          this._cache.lastFirebaseSync = Date.now();
        } catch (firebaseError) {
          console.error('❌ Firebase同步失败:', firebaseError);
          // Firebase同步失败不影响本地保存
        }
      }
      
      // 3. 清除缓存，确保下次生成跟踪列表时使用最新数据
      this._clearCache();
      console.log(`🧹 已清除缓存，确保下次生成最新跟踪列表`);
      
      console.log(`✅ 已重启跟踪事件: ${recordId}`);
      return true;
    } catch (error) {
      console.error('❌ 重启事件失败:', error);
      return false;
    }
  },

  // 获取所有跟踪记录
  getAllTrackingRecords: function() {
    try {
      const allRecords = [];
      
      // 遍历所有人员
      const allMembers = this.getAllMembers();
      allMembers.forEach(member => {
        const memberRecords = this.getMemberTrackingRecords(member.uuid);
        memberRecords.forEach(record => {
          // 添加成员信息到记录中
          allRecords.push({
            ...record,
            memberName: member.name,
            group: member.group || 'group0'
          });
        });
      });
      
      return allRecords;
    } catch (error) {
      console.error('获取所有跟踪记录失败:', error);
      return [];
    }
  },

  // 获取个人跟踪记录
  getPersonalTrackingRecords: function(memberUUID) {
    try {
      const key = `msh_personal_tracking_${memberUUID}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取个人跟踪记录失败:', error);
      return null;
    }
  },

  // 保存个人跟踪记录 (同时保存到localStorage和Firebase)
  savePersonalTrackingRecords: async function(memberUUID, records) {
    try {
      // 1. 保存到localStorage (快速响应)
      const key = `msh_personal_tracking_${memberUUID}`;
      localStorage.setItem(key, JSON.stringify(records));
      console.log(`✅ 个人跟踪记录已保存到localStorage: ${memberUUID}`);
      
      // 2. 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (window.db) {
        try {
          // 使用update()只更新该成员的数据
          const updateData = {};
          updateData[memberUUID] = records;
          await window.db.ref('personalTracking').update(updateData);
          console.log(`✅ 个人跟踪记录已同步到Firebase: ${memberUUID}`);
          // 记录Firebase同步时间
          this._cache.lastFirebaseSync = Date.now();
        } catch (firebaseError) {
          console.error('❌ Firebase同步失败:', firebaseError);
          // Firebase同步失败不影响本地保存
        }
      }
      
      // 3. 清除缓存，确保下次使用最新数据
      this._clearCache();
      
      return true;
    } catch (error) {
      console.error('❌ 保存个人跟踪记录失败:', error);
      return false;
    }
  },
  
  // 重置所有跟踪记录状态
  resetAllTrackingRecords: function() {
    console.log('重置所有跟踪记录状态');
    
    try {
      const records = this.getTrackingRecords();
      const updatedRecords = records.map(record => ({
        ...record,
        status: 'tracking',
        updatedAt: new Date().toISOString()
      }));
      
      localStorage.setItem('msh_sunday_tracking', JSON.stringify(updatedRecords));
      
      // 同步到Firebase（使用update()增量更新，符合数据安全规则）
      if (window.db) {
        // 将数组转换为对象格式，使用recordId作为key
        const recordsObj = {};
        updatedRecords.forEach(record => {
          if (record.recordId) {
            recordsObj[record.recordId] = record;
          }
        });
        
        window.db.ref('trackingRecords').update(recordsObj).catch(error => {
          console.error('同步跟踪记录到Firebase失败:', error);
        });
      }
      
      console.log(`已重置 ${updatedRecords.length} 条跟踪记录`);
      return true;
    } catch (error) {
      console.error('重置跟踪记录失败:', error);
      return false;
    }
  },
  
  // 检查数据保留期限
  checkDataRetention: function() {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const records = this.getTrackingRecords();
    const oldRecords = records.filter(record => 
      new Date(record.createdAt) < threeYearsAgo
    );
    
    if (oldRecords.length > 0) {
      this.showExportReminder(oldRecords);
      return oldRecords;
    }
    
    return [];
  },
  
  // 显示导出提醒
  showExportReminder: function(oldRecords) {
    const message = `发现 ${oldRecords.length} 条超过3年的跟踪记录，建议导出保存。`;
    if (confirm(message + '\n\n是否现在导出？')) {
      this.exportOldRecords(oldRecords);
    }
  },
  
  // 导出旧记录
  exportOldRecords: function(records) {
    const dataStr = "data:text/json;charset=utf-8," + 
      encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sunday-tracking-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    document.body.removeChild(downloadAnchorNode);
  },
  
  // 自动删除功能已移除，防止误删重要数据
  autoDeleteOldRecords: function() {
    return true;
  },
  
  // 初始化数据保留检查（在页面加载时调用）
  initializeDataRetention: function() {
    // 检查并处理数据保留
    this.checkDataRetention();
    
    // 设置定期检查（每天检查一次）
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.autoDeleteOldRecords();
      // 设置24小时后的下一次检查
      setInterval(() => {
        this.autoDeleteOldRecords();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilTomorrow);
  },
  
  // ==================== 周级增量计算功能 ====================
  
  // 加载周级计算结果
  loadWeeklyCalculations: async function(sundayDate) {
    if (!window.db) {
      console.warn('Firebase未初始化，无法加载周级计算结果');
      return null;
    }
    
    try {
      const snapshot = await window.db.ref(`sundayTrackingWeekly/${sundayDate}`).once('value');
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error(`加载周级计算结果失败 - ${sundayDate}:`, error);
      return null;
    }
  },
  
  // 保存周级计算结果
  saveWeeklyCalculations: async function(sundayDate, calculations, skipCleanup = false) {
    if (!window.db) {
      console.warn('Firebase未初始化，无法保存周级计算结果');
      return false;
    }
    
    try {
      // 1. 保存当前周的计算结果
      await window.db.ref(`sundayTrackingWeekly/${sundayDate}`).update(calculations);
      console.log(`✅ 已保存周级计算结果 - ${sundayDate}`);
      
      // 2. 清理旧数据（只保留最新10周，仅在数据量超过10周时执行）
      // 注意：skipCleanup=true时跳过清理（用于批量计算），清理应在批量计算完成后统一执行
      if (!skipCleanup) {
        const snapshot = await window.db.ref('sundayTrackingWeekly').once('value');
        if (snapshot.exists()) {
          const allCalculations = snapshot.val();
          const sundayDates = Object.keys(allCalculations);
          if (sundayDates.length > 10) {
            await this.cleanupOldWeeklyCalculations(10);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`保存周级计算结果失败 - ${sundayDate}:`, error);
      return false;
    }
  },
  
  // 清理旧的周级计算结果（只保留最新N周）
  cleanupOldWeeklyCalculations: async function(keepWeeks = 10) {
    if (!window.db) {
      console.warn('Firebase未初始化，无法清理旧数据');
      return;
    }
    
    try {
      // 1. 获取所有周级计算结果
      const snapshot = await window.db.ref('sundayTrackingWeekly').once('value');
      if (!snapshot.exists()) {
        console.log('📋 没有周级计算结果，无需清理');
        return;
      }
      
      const allCalculations = snapshot.val();
      const sundayDates = Object.keys(allCalculations);
      
      if (sundayDates.length <= keepWeeks) {
        console.log(`📋 当前有 ${sundayDates.length} 周数据，不超过 ${keepWeeks} 周，无需清理`);
        return;
      }
      
      // 2. 按日期排序（从新到旧）
      sundayDates.sort((a, b) => b.localeCompare(a));
      
      // 3. 获取需要保留的日期（最新的N周）
      const keepDates = sundayDates.slice(0, keepWeeks);
      const deleteDates = sundayDates.slice(keepWeeks);
      
      console.log(`🧹 清理旧数据：保留 ${keepDates.length} 周，删除 ${deleteDates.length} 周`);
      
      // 4. 删除旧数据
      const updates = {};
      deleteDates.forEach(date => {
        updates[`sundayTrackingWeekly/${date}`] = null;
      });
      
      if (Object.keys(updates).length > 0) {
        await window.db.ref().update(updates);
        console.log(`✅ 已删除 ${deleteDates.length} 周的旧数据`);
      }
    } catch (error) {
      console.error('❌ 清理旧数据失败:', error);
    }
  },
  
  // 查找最新的已计算周（从最新一周向前查找）
  findLatestCalculatedSunday: async function(startDate, maxWeeks = 52) {
    // 从指定日期向前查找，最多查找52周（1年）
    let currentDate = new Date(startDate);
    let checkedWeeks = 0;
    
    while (checkedWeeks < maxWeeks) {
      const sundayDate = this.getDateString(currentDate);
      const calculations = await this.loadWeeklyCalculations(sundayDate);
      
      if (calculations) {
        console.log(`✅ 找到已计算的周: ${sundayDate}`);
        return sundayDate;
      }
      
      // 向前查找上一周
      currentDate = this.getPreviousSunday(currentDate);
      checkedWeeks++;
    }
    
    console.log(`📋 未找到已计算的周（已检查 ${checkedWeeks} 周）`);
    return null;
  },
  
  // 检查是否有任何历史计算结果
  hasHistoricalCalculations: async function() {
    // 从最新一周向前查找，如果找到任何计算结果，说明有历史数据
    const latestSundayDate = this.getLatestSundayDate();
    const latestCalculated = await this.findLatestCalculatedSunday(latestSundayDate, 52);
    return latestCalculated !== null;
  },
  
  // 获取dailyReport数据
  getDailyReport: async function(sundayDate) {
    if (!window.db) {
      console.warn('Firebase未初始化，无法获取dailyReport');
      return null;
    }
    
    try {
      const snapshot = await window.db.ref(`dailyReports/${sundayDate}`).once('value');
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error(`获取dailyReport失败 - ${sundayDate}:`, error);
      return null;
    }
  },
  
  // 首次计算（全量计算）
  calculateFirstWeek: async function(sundayDate, skipCleanup = false) {
    console.log(`🔄 首次计算 - ${sundayDate}`);
    
    // 1. 获取该周的dailyReports数据
    const dailyReport = await this.getDailyReport(sundayDate);
    
    // 2. 如果没有dailyReport，跳过计算（需要在工具页面生成）
    if (!dailyReport) {
      console.warn(`⚠️ ${sundayDate} 没有dailyReport数据，跳过计算。请使用工具页面生成dailyReport后再计算`);
      return null;
    }
    
    // 3. 获取所有成员（排除排除人员）
    const allMembers = this.getAllMembers();
    console.log(`📋 总成员数: ${allMembers.length}`);
    
    // 3. 提取已签到的成员UUID列表
    const signedUUIDs = new Set();
    if (dailyReport.signedMembers && Array.isArray(dailyReport.signedMembers)) {
      dailyReport.signedMembers.forEach(member => {
        const uuid = member.uuid || member.name;
        if (uuid) signedUUIDs.add(uuid);
      });
    }
    
    // 4. 计算每个成员的缺勤情况
    const calculations = {};
    
    for (const member of allMembers) {
      // 排除的人员跳过
      if (this.isMemberExcluded(member)) {
        continue;
      }
      
      const memberUUID = member.uuid || member.name;
      if (signedUUIDs.has(memberUUID)) {
        // 有签到 → 缺勤次数为0
        calculations[memberUUID] = {
          consecutiveAbsences: 0,
          status: 'present',
          calculatedAt: new Date().toISOString()
        };
      } else {
        // 缺勤 → 缺勤次数为1
        calculations[memberUUID] = {
          consecutiveAbsences: 1,
          status: 'absent',
          calculatedAt: new Date().toISOString()
        };
      }
    }
    
    // 5. 保存到Firebase（skipCleanup用于批量计算时跳过清理）
    await this.saveWeeklyCalculations(sundayDate, calculations, skipCleanup);
    
    console.log(`✅ 首次计算完成 - ${sundayDate}，计算了 ${Object.keys(calculations).length} 个成员`);
    return calculations;
  },
  
  // 增量计算（基于上一周）
  calculateIncrementalWeek: async function(currentSundayDate, skipCleanup = false) {
    console.log(`🔄 增量计算 - ${currentSundayDate}`);
    
    // 1. 获取上一周的日期
    const previousSundayDate = this.getDateString(
      this.getPreviousSunday(new Date(currentSundayDate))
    );
    
    // 2. 加载上一周的计算结果
    const previousCalculations = await this.loadWeeklyCalculations(previousSundayDate);
    if (!previousCalculations) {
      // 如果上一周没有数据，执行首次计算
      console.warn(`⚠️ 上一周（${previousSundayDate}）没有数据，执行首次计算`);
      return await this.calculateFirstWeek(currentSundayDate, skipCleanup);
    }
    
    // 3. 获取当前周的dailyReports数据
    const currentDailyReport = await this.getDailyReport(currentSundayDate);
    
    // 如果没有dailyReport，跳过计算（需要在工具页面生成）
    if (!currentDailyReport) {
      console.warn(`⚠️ ${currentSundayDate} 没有dailyReport数据，跳过计算。请使用工具页面生成dailyReport后再计算`);
      return null;
    }
    
    // 4. 提取已签到的成员UUID列表
    const signedUUIDs = new Set();
    if (currentDailyReport.signedMembers && Array.isArray(currentDailyReport.signedMembers)) {
      currentDailyReport.signedMembers.forEach(member => {
        const uuid = member.uuid || member.name;
        if (uuid) signedUUIDs.add(uuid);
      });
    }
    
    // 5. 获取所有成员（排除排除人员）
    const allMembers = this.getAllMembers();
    
    // 6. 计算当前周的缺勤情况
    const currentCalculations = {};
    
    for (const member of allMembers) {
      // 排除的人员跳过
      if (this.isMemberExcluded(member)) {
        continue;
      }
      
      const memberUUID = member.uuid || member.name;
      
      // 获取上一周的缺勤次数
      const previousResult = previousCalculations[memberUUID];
      const previousAbsences = previousResult ? previousResult.consecutiveAbsences : 0;
      
      if (signedUUIDs.has(memberUUID)) {
        // 当前周有签到 → 缺勤次数重置为0
        currentCalculations[memberUUID] = {
          consecutiveAbsences: 0,
          status: 'present',
          calculatedAt: new Date().toISOString(),
          previousWeek: previousSundayDate
        };
      } else {
        // 当前周缺勤 → 缺勤次数 = 上一周 + 1
        currentCalculations[memberUUID] = {
          consecutiveAbsences: previousAbsences + 1,
          status: 'absent',
          calculatedAt: new Date().toISOString(),
          previousWeek: previousSundayDate
        };
      }
    }
    
    // 7. 保存到Firebase（skipCleanup用于批量计算时跳过清理）
    await this.saveWeeklyCalculations(currentSundayDate, currentCalculations, skipCleanup);
    
    console.log(`✅ 增量计算完成 - ${currentSundayDate}，计算了 ${Object.keys(currentCalculations).length} 个成员`);
    return currentCalculations;
  },
  
  // 数据校验
  validateWeeklyCalculations: async function(sundayDate) {
    const calculation = await this.loadWeeklyCalculations(sundayDate);
    if (!calculation) {
      return { valid: false, reason: '计算结果不存在' };
    }
    
    const previousSundayDate = this.getDateString(
      this.getPreviousSunday(new Date(sundayDate))
    );
    const previousCalculation = await this.loadWeeklyCalculations(previousSundayDate);
    
    // 如果上一周有数据，检查连续性
    if (previousCalculation) {
      for (const [memberUUID, currentResult] of Object.entries(calculation)) {
        const previousResult = previousCalculation[memberUUID];
        if (previousResult) {
          const previousAbsences = previousResult.consecutiveAbsences;
          const currentAbsences = currentResult.consecutiveAbsences;
          
          // 如果当前周有签到，缺勤次数应该为0
          if (currentResult.status === 'present') {
            if (currentAbsences !== 0) {
              return {
                valid: false,
                reason: `${memberUUID} 有签到但缺勤次数不为0`,
                memberUUID,
                currentAbsences,
                expected: 0
              };
            }
          } else if (currentResult.status === 'absent') {
            // 如果当前周缺勤，缺勤次数应该为 previousAbsences + 1
            if (currentAbsences !== previousAbsences + 1) {
              return {
                valid: false,
                reason: `${memberUUID} 缺勤次数不正确`,
                memberUUID,
                currentAbsences,
                expected: previousAbsences + 1,
                previousAbsences
              };
            }
          }
        }
      }
    }
    
    return { valid: true };
  },
  
  // 修复数据
  repairWeeklyCalculations: async function(sundayDate) {
    console.log(`🔧 开始修复数据 - ${sundayDate}`);
    
    // 先校验数据
    const validation = await this.validateWeeklyCalculations(sundayDate);
    if (validation.valid) {
      console.log(`✅ 数据校验通过，无需修复`);
      return true;
    }
    
    console.log(`⚠️ 数据校验失败: ${validation.reason}，开始修复...`);
    
    // 重新计算该周的数据
    const previousSundayDate = this.getDateString(
      this.getPreviousSunday(new Date(sundayDate))
    );
    const previousCalculation = await this.loadWeeklyCalculations(previousSundayDate);
    
    if (!previousCalculation) {
      // 如果上一周没有数据，执行首次计算
      await this.calculateFirstWeek(sundayDate);
    } else {
      // 如果上一周有数据，执行增量计算
      await this.calculateIncrementalWeek(sundayDate);
    }
    
    // 再次校验
    const revalidation = await this.validateWeeklyCalculations(sundayDate);
    if (revalidation.valid) {
      console.log(`✅ 数据修复成功`);
      return true;
    } else {
      console.error(`❌ 数据修复失败: ${revalidation.reason}`);
      return false;
    }
  },
  
  // 从周级计算结果查找缺勤事件开始日期（使用缓存优化版本）
  findAbsenceStartDateFromWeeklyWithCache: async function(memberUUID, currentSundayDate, weeklyCalculationsCache) {
    // 从当前周向前追溯，找到缺勤开始的那一周
    let currentDate = new Date(currentSundayDate);
    let consecutiveAbsences = 0;
    
    // 从缓存获取当前周的缺勤次数
    const currentCalculation = weeklyCalculationsCache.get(currentSundayDate);
    if (currentCalculation && currentCalculation[memberUUID]) {
      consecutiveAbsences = currentCalculation[memberUUID].consecutiveAbsences;
    } else {
      return currentSundayDate; // 如果没有数据，返回当前日期
    }
    
    // 如果缺勤次数为0或1，返回当前日期
    if (consecutiveAbsences <= 1) {
      return currentSundayDate;
    }
    
    // 向前追溯，直到找到缺勤次数为1的那一周（缺勤开始）
    let targetDate = currentDate;
    for (let i = 0; i < consecutiveAbsences - 1; i++) {
      const previousDate = this.getDateString(this.getPreviousSunday(targetDate));
      
      // 优先从缓存获取，如果缓存中没有，再从Firebase加载
      let previousCalculation = weeklyCalculationsCache.get(previousDate);
      if (!previousCalculation) {
        previousCalculation = await this.loadWeeklyCalculations(previousDate);
        if (previousCalculation) {
          weeklyCalculationsCache.set(previousDate, previousCalculation);
        }
      }
      
      if (previousCalculation && previousCalculation[memberUUID]) {
        const previousAbsences = previousCalculation[memberUUID].consecutiveAbsences;
        if (previousAbsences === 1) {
          // 找到了缺勤开始的那一周
          return previousDate;
        }
        targetDate = new Date(previousDate);
      } else {
        // 没有历史数据，使用当前日期减去缺勤周数
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - (consecutiveAbsences - 1) * 7);
        return this.getDateString(startDate);
      }
    }
    
    // 如果找不到，使用当前日期减去缺勤周数
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - (consecutiveAbsences - 1) * 7);
    return this.getDateString(startDate);
  },
  
  // 从周级计算结果查找缺勤事件开始日期（原版本，保留作为回退）
  findAbsenceStartDateFromWeekly: async function(memberUUID, currentSundayDate) {
    // 从当前周向前追溯，找到缺勤开始的那一周
    let currentDate = new Date(currentSundayDate);
    let consecutiveAbsences = 0;
    
    // 获取当前周的缺勤次数
    const currentCalculation = await this.loadWeeklyCalculations(currentSundayDate);
    if (currentCalculation && currentCalculation[memberUUID]) {
      consecutiveAbsences = currentCalculation[memberUUID].consecutiveAbsences;
    } else {
      return currentSundayDate; // 如果没有数据，返回当前日期
    }
    
    // 如果缺勤次数为0或1，返回当前日期
    if (consecutiveAbsences <= 1) {
      return currentSundayDate;
    }
    
    // 向前追溯，直到找到缺勤次数为1的那一周（缺勤开始）
    let targetDate = currentDate;
    for (let i = 0; i < consecutiveAbsences - 1; i++) {
      const previousDate = this.getDateString(this.getPreviousSunday(targetDate));
      const previousCalculation = await this.loadWeeklyCalculations(previousDate);
      
      if (previousCalculation && previousCalculation[memberUUID]) {
        const previousAbsences = previousCalculation[memberUUID].consecutiveAbsences;
        if (previousAbsences === 1) {
          // 找到了缺勤开始的那一周
          return previousDate;
        }
        targetDate = new Date(previousDate);
      } else {
        // 没有历史数据，使用当前日期减去缺勤周数
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - (consecutiveAbsences - 1) * 7);
        return this.getDateString(startDate);
      }
    }
    
    // 如果找不到，使用当前日期减去缺勤周数
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - (consecutiveAbsences - 1) * 7);
    return this.getDateString(startDate);
  },
  
  // 从周级计算结果生成事件列表
  generateTrackingListFromWeeklyCalculations: async function() {
    console.log('🔄 从周级计算结果生成事件列表...');
    
    // 0. 首先检查缓存（避免重复计算）
    if (this._isCacheValid()) {
      console.log('📦 缓存有效，直接使用缓存的跟踪列表');
      return this._cache.trackingList;
    }
    
    // 1. 获取最新一周的日期
    const latestSundayDate = this.getLatestSundayDate();
    console.log(`📅 最新主日日期: ${latestSundayDate}`);
    
    // 2. 检查最新一周是否已有计算结果
    let latestCalculations = await this.loadWeeklyCalculations(latestSundayDate);
    
    // 3. 初始化重新计算标志
    let needsRecalculation = false;
    
    // 4. 如果最新周已有计算结果，检查数据是否有变化
    if (latestCalculations) {
      console.log(`✅ 最新一周（${latestSundayDate}）已有计算结果`);
      
      // 检查数据是否有变化（排除人员、成员变动）
      const lastCalcInfo = localStorage.getItem('msh_last_weekly_calc_info');
      
      if (lastCalcInfo) {
        try {
          const calcInfo = JSON.parse(lastCalcInfo);
          const lastSundayDate = calcInfo.latestSundayDate;
          const lastDataHash = calcInfo.dataHash;
          
          // 检查是否跨周
          if (lastSundayDate !== latestSundayDate) {
            console.log(`📅 检测到跨周：上次计算周=${lastSundayDate}，当前最新周=${latestSundayDate}，需要增量计算`);
            needsRecalculation = true;
          } else {
            // 检查数据是否有变化
            const currentDataHash = this._generateDataHash();
            if (lastDataHash !== currentDataHash) {
              console.log(`📋 检测到数据变化（排除人员或成员变动），需要重新计算`);
              needsRecalculation = true;
            } else {
              // 数据无变化，直接使用现有事件列表
              console.log(`✅ 数据无变化，直接使用现有事件列表`);
              const existingEvents = this.getTrackingRecords();
              // 只返回活跃状态的事件
              const activeEvents = existingEvents.filter(e => e.status === 'active');
              console.log(`📦 直接返回现有事件列表，共 ${activeEvents.length} 个活跃事件`);
              return activeEvents;
            }
          }
        } catch (error) {
          console.warn('⚠️ 解析上次计算信息失败，执行重新计算:', error);
          needsRecalculation = true;
        }
      } else {
        // 没有上次计算信息，检查现有事件列表是否可用
        console.log(`📋 没有缓存信息，检查现有事件列表...`);
        const existingEvents = this.getTrackingRecords();
        const activeEvents = existingEvents.filter(e => e.status === 'active');
        
        // 如果已有活跃事件，且最新周的计算结果存在，说明数据完整，可以直接使用
        if (activeEvents.length > 0) {
          console.log(`✅ 发现现有事件列表（${activeEvents.length}个活跃事件），且最新周计算结果存在，直接使用`);
          // 保存计算信息，用于下次检查
          const calcInfo = {
            latestSundayDate: latestSundayDate,
            dataHash: this._generateDataHash(),
            timestamp: Date.now()
          };
          localStorage.setItem('msh_last_weekly_calc_info', JSON.stringify(calcInfo));
          return activeEvents;
        } else {
          // 没有活跃事件，需要生成事件列表
          console.log(`📋 没有活跃事件，需要生成事件列表`);
          needsRecalculation = true;
        }
      }
      
      // 如果不需要重新计算，直接返回现有事件列表
      if (!needsRecalculation) {
        const existingEvents = this.getTrackingRecords();
        const activeEvents = existingEvents.filter(e => e.status === 'active');
        console.log(`📦 直接返回现有事件列表，共 ${activeEvents.length} 个活跃事件`);
        return activeEvents;
      }
    }
    
    // 5. 如果没有最新周的计算结果或需要重新计算，执行计算
    if (!latestCalculations || needsRecalculation) {
      if (!latestCalculations) {
        console.log(`⚠️ 最新一周（${latestSundayDate}）没有数据，开始计算...`);
      } else {
        console.log(`🔄 需要重新计算最新一周（${latestSundayDate}）...`);
      }
      
      // 检查是否有任何历史计算结果
      const hasHistoricalData = await this.hasHistoricalCalculations();
      
      if (hasHistoricalData && !latestCalculations) {
        // 如果有历史数据，说明不是首次，应该基于最新已计算的周进行增量计算
        console.log(`📋 检测到历史计算结果，执行增量计算...`);
        const latestCalculatedSunday = await this.findLatestCalculatedSunday(latestSundayDate, 52);
        
        if (latestCalculatedSunday) {
          // 如果最新已计算的周就是最新一周，说明已经计算过了，直接使用
          if (latestCalculatedSunday === latestSundayDate) {
            console.log(`✅ 最新一周（${latestSundayDate}）已计算，直接使用`);
            latestCalculations = await this.loadWeeklyCalculations(latestSundayDate);
          } else {
            // 从最新已计算的周的下一周开始，逐周计算到最新一周
            let currentDate = new Date(latestCalculatedSunday);
            let nextSundayDate = this.getDateString(
              this.getNextSunday(currentDate)
            );
            
            // 逐周计算，直到达到最新一周
            while (nextSundayDate <= latestSundayDate) {
              console.log(`🔄 计算周: ${nextSundayDate}（基于上一周 ${this.getDateString(currentDate)}）`);
              const result = await this.calculateIncrementalWeek(nextSundayDate);
              if (!result) {
                console.warn(`⚠️ 计算周 ${nextSundayDate} 失败，跳过后续计算`);
                break;
              }
              
              // 移动到下一周
              currentDate = new Date(nextSundayDate);
              nextSundayDate = this.getDateString(
                this.getNextSunday(currentDate)
              );
            }
            
            // 重新加载最新一周的计算结果
            latestCalculations = await this.loadWeeklyCalculations(latestSundayDate);
          }
        } else {
          // 虽然hasHistoricalData为true，但找不到已计算的周，可能是数据异常
          console.warn('⚠️ 检测到历史数据标志，但找不到已计算的周，执行首次计算');
          latestCalculations = await this.calculateFirstWeek(latestSundayDate);
        }
      } else {
        // 如果没有历史数据或需要重新计算，执行首次计算
        if (needsRecalculation && latestCalculations) {
          // 如果已有计算结果但需要重新计算（数据变更），执行首次计算
          console.log(`📋 数据有变更，重新计算最新一周（${latestSundayDate}）...`);
        } else {
          console.log(`📋 首次计算（没有历史计算结果）`);
        }
        latestCalculations = await this.calculateFirstWeek(latestSundayDate);
      }
      
      if (!latestCalculations) {
        console.error('❌ 无法计算最新一周的数据');
        return [];
      }
      
      // 更新计算信息（保存到localStorage，用于下次检查）
      const calcInfo = {
        latestSundayDate: latestSundayDate,
        dataHash: this._generateDataHash(),
        timestamp: Date.now()
      };
      localStorage.setItem('msh_last_weekly_calc_info', JSON.stringify(calcInfo));
    }
    
    // 6. 数据校验（可选，如果校验失败会自动修复）
    // 注意：如果是首次计算（没有上一周数据），跳过校验
    const previousSundayDate = this.getDateString(
      this.getPreviousSunday(new Date(latestSundayDate))
    );
    const hasPreviousWeek = await this.loadWeeklyCalculations(previousSundayDate);
    
    if (hasPreviousWeek) {
      // 只有在上周有数据时才进行校验
      const validation = await this.validateWeeklyCalculations(latestSundayDate);
      if (!validation.valid) {
        console.warn(`⚠️ 数据校验失败: ${validation.reason}，开始修复...`);
        await this.repairWeeklyCalculations(latestSundayDate);
        // 重新加载修复后的数据
        latestCalculations = await this.loadWeeklyCalculations(latestSundayDate);
      }
    } else {
      console.log(`📋 首次计算，跳过数据校验`);
    }
    
    // 7. 获取所有现有的事件记录
    const existingEvents = this.getTrackingRecords();
    console.log(`📋 现有事件记录: ${existingEvents.length} 个`);
    
    // 8. 批量预加载周级计算结果（优化性能：避免在循环中多次查询Firebase）
    // 预加载最近10周的数据（足够覆盖大部分缺勤事件）
    const weeklyCalculationsCache = new Map();
    weeklyCalculationsCache.set(latestSundayDate, latestCalculations);
    
    // 预加载最近10周的数据
    let preloadDate = new Date(latestSundayDate);
    for (let i = 0; i < 10; i++) {
      preloadDate = this.getPreviousSunday(preloadDate);
      const dateStr = this.getDateString(preloadDate);
      const calc = await this.loadWeeklyCalculations(dateStr);
      if (calc) {
        weeklyCalculationsCache.set(dateStr, calc);
      }
    }
    console.log(`📦 预加载了 ${weeklyCalculationsCache.size} 周的周级计算结果`);
    
    // 5. 生成事件列表（只包含缺勤次数 >= 2 的成员）
    const trackingList = [];
    const allMembers = this.getAllMembers();
    
    for (const member of allMembers) {
      // 排除的人员跳过
      if (this.isMemberExcluded(member)) {
        continue;
      }
      
      const memberUUID = member.uuid || member.name;
      const calculation = latestCalculations[memberUUID];
      
      if (!calculation) {
        continue;
      }
      
      // 检查缺勤次数并更新事件状态
      if (calculation.status === 'absent' && calculation.consecutiveAbsences >= 2) {
        // 需要生成事件
        // 查找缺勤事件开始日期（使用缓存的周级计算结果）
        const startDate = await this.findAbsenceStartDateFromWeeklyWithCache(memberUUID, latestSundayDate, weeklyCalculationsCache);
        
        // 生成事件唯一编码
        const eventUniqueId = `${memberUUID}_${startDate}_1`;
        
        // 检查是否已有该事件的跟踪记录
        const existingEventRecord = this.getTrackingRecord(eventUniqueId);
        
        if (existingEventRecord) {
          // 已有记录，检查是否需要更新
          let needsUpdate = false;
          
          if (existingEventRecord.status === 'active') {
            // 检查缺勤次数是否有变化
            if (existingEventRecord.consecutiveAbsences !== calculation.consecutiveAbsences) {
              needsUpdate = true;
              existingEventRecord.consecutiveAbsences = calculation.consecutiveAbsences;
              
              // 更新事件类型和描述
              if (calculation.consecutiveAbsences >= 4) {
                existingEventRecord.eventType = 'extended_absence';
                existingEventRecord.eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次（4周以上）`;
              } else if (calculation.consecutiveAbsences >= 3) {
                existingEventRecord.eventType = 'severe_absence';
                existingEventRecord.eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次（3周以上）`;
              } else {
                existingEventRecord.eventType = 'tracking';
                existingEventRecord.eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次`;
              }
              
              existingEventRecord.updatedAt = new Date().toISOString();
            }
          } else if (existingEventRecord.status === 'resolved' || existingEventRecord.status === 'terminated') {
            // 如果事件已解决或终止，但缺勤次数又增加了，重新激活事件
            if (calculation.consecutiveAbsences >= 2) {
              needsUpdate = true;
              existingEventRecord.status = 'active';
              existingEventRecord.consecutiveAbsences = calculation.consecutiveAbsences;
              existingEventRecord.updatedAt = new Date().toISOString();
              // 清除结束信息
              delete existingEventRecord.endDate;
              delete existingEventRecord.endedBy;
              delete existingEventRecord.endReason;
            }
          }
          
          // 只在有变化时保存（避免不必要的写入）
          if (needsUpdate) {
            this.saveTrackingRecord(existingEventRecord);
          }
          
          trackingList.push(existingEventRecord);
        } else {
          // 没有记录，创建新事件
          // 检查是否应该生成新事件
          const currentDate = new Date();
          const event = {
            startDate: startDate,
            consecutiveAbsences: calculation.consecutiveAbsences,
            endDate: null
          };
          
          if (!shouldGenerateEvent(event, currentDate, memberUUID, 0)) {
            console.log(`成员 ${member.name} 事件: 不满足生成条件，跳过`);
            continue;
          }
          
          // 确定事件类型和描述
          let eventType = 'tracking';
          let eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次`;
          
          if (calculation.consecutiveAbsences >= 4) {
            eventType = 'extended_absence';
            eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次（4周以上）`;
          } else if (calculation.consecutiveAbsences >= 3) {
            eventType = 'severe_absence';
            eventDescription = `连续缺勤 ${calculation.consecutiveAbsences} 次（3周以上）`;
          }
          
          // 创建新的事件跟踪记录
          const newEventRecord = {
            memberUUID: memberUUID,
            recordId: eventUniqueId,
            memberName: member.name,
            group: member.group,
            originalGroup: member.group,
            groupDisplayName: (window.groupNames && window.groupNames[member.group]) ? window.groupNames[member.group] : member.group,
            consecutiveAbsences: calculation.consecutiveAbsences,
            trackingStartDate: startDate,
            status: 'active',
            eventType: eventType,
            eventDescription: eventDescription,
            eventIndex: 1,
            totalEvents: 1,
            memberSnapshot: {
              uuid: memberUUID,
              name: member.name,
              group: member.group
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // 保存新记录
          this.saveTrackingRecord(newEventRecord);
          trackingList.push(newEventRecord);
        }
      } else {
        // 缺勤次数 < 2 或已签到，检查是否有已存在的事件需要标记为resolved
        const existingEvent = existingEvents.find(e => 
          e.memberUUID === memberUUID && 
          (e.status === 'active' || e.status === 'resolved')
        );
        
        if (existingEvent && existingEvent.status === 'active') {
          // 事件已解决（缺勤次数 < 2 或已签到）
          existingEvent.status = 'resolved';
          existingEvent.resolvedAt = new Date().toISOString();
          existingEvent.updatedAt = new Date().toISOString();
          
          // 如果已签到，设置结束日期为最新主日
          if (calculation.status === 'present') {
            existingEvent.endDate = latestSundayDate;
            existingEvent.endedBy = 'system';
            existingEvent.endReason = '成员已恢复签到';
          }
          
          // 保存更新
          this.saveTrackingRecord(existingEvent);
          trackingList.push(existingEvent);
        }
      }
    }
    
    console.log(`✅ 从周级计算结果生成事件列表完成，共 ${trackingList.length} 个事件`);
    
    // 保存本次计算信息，用于下次检查是否需要重新计算
    const calcInfo = {
      latestSundayDate: latestSundayDate,
      dataHash: this._generateDataHash(),
      timestamp: Date.now()
    };
    localStorage.setItem('msh_last_weekly_calc_info', JSON.stringify(calcInfo));
    console.log(`💾 已保存计算信息: 最新周=${latestSundayDate}`);
    
    return trackingList;
  },
  
  // 后台异步初始化历史数据
  initializeHistoricalDataAsync: async function(startDate, endDate, onProgress) {
    console.log(`🔄 开始后台异步初始化历史数据: ${startDate} 到 ${endDate}`);
    
    // 获取所有主日日期
    const sundayDates = this.getSundayDatesBetween(startDate, endDate);
    console.log(`📋 需要计算 ${sundayDates.length} 周的数据`);
    
    let completed = 0;
    let failed = 0;
    
    for (let i = 0; i < sundayDates.length; i++) {
      const sundayDate = sundayDates[i];
      
      try {
        // 检查是否已经计算过
        const existing = await this.loadWeeklyCalculations(sundayDate);
        if (existing) {
          console.log(`⏭️ ${sundayDate} 已存在，跳过`);
          completed++;
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: sundayDates.length,
              completed,
              failed,
              currentDate: sundayDate,
              status: 'skipped'
            });
          }
          continue;
        }
        
        if (i === 0) {
          // 第一周：全量计算（批量计算时跳过清理）
          await this.calculateFirstWeek(sundayDate, true);
        } else {
          // 后续周：增量计算（批量计算时跳过清理）
          await this.calculateIncrementalWeek(sundayDate, true);
        }
        
        completed++;
        console.log(`✅ ${sundayDate} 计算完成 (${i + 1}/${sundayDates.length})`);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: sundayDates.length,
            completed,
            failed,
            currentDate: sundayDate,
            status: 'completed'
          });
        }
        
        // 添加小延迟，避免对Firebase造成过大压力
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ ${sundayDate} 计算失败:`, error);
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: sundayDates.length,
            completed,
            failed,
            currentDate: sundayDate,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    // 批量计算完成后，统一执行清理（只保留最新10周）
    console.log(`🧹 批量计算完成，执行清理操作...`);
    await this.cleanupOldWeeklyCalculations(10);
    
    console.log(`✅ 历史数据初始化完成: 成功 ${completed} 周，失败 ${failed} 周`);
    return { completed, failed, total: sundayDates.length };
  },
  
  // 🆕 从 daily-reports 计算缺勤事件（优化版）
  calculateAbsenceFromDailyReports: async function(memberUUID) {
    try {
      console.log(`🔄 从 daily-reports 计算缺勤 - UUID: ${memberUUID}`);
      
      if (!window.db) {
        console.warn('Firebase未初始化，无法从 daily-reports 计算');
        return null;
      }
      
      // 获取检查起点
      const memberTrackingRecords = this.getMemberTrackingRecords(memberUUID);
      let checkStartDate = null;
      
      const latestResolvedRecord = memberTrackingRecords
        .filter(record => record.status === 'resolved' || record.status === 'terminated')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
      
      if (latestResolvedRecord && latestResolvedRecord.nextCheckDate) {
        checkStartDate = new Date(latestResolvedRecord.nextCheckDate);
      } else {
        checkStartDate = new Date('2025-08-03');
      }
      
      // 获取主日日期列表
      const currentDate = new Date();
      const sundayDates = this.getSundayDatesFromStart(checkStartDate, currentDate);
      
      if (sundayDates.length === 0) {
        console.log('没有主日日期，无法计算');
        return null;
      }
      
      // 批量获取 daily-reports
      const reportPromises = sundayDates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        return window.db.ref(`dailyReports/${dateStr}`).once('value');
      });
      
      const reportSnapshots = await Promise.all(reportPromises);
      
      // 提取该成员的缺勤日期
      const absenceDates = [];
      const signedDates = [];
      
      reportSnapshots.forEach((snapshot, index) => {
        if (snapshot.exists()) {
          const report = snapshot.val();
          const dateStr = sundayDates[index].toISOString().split('T')[0];
          
          // 检查是否在未签到名单中
          const isAbsent = report.unsignedMembers?.some(m => (m.uuid || m.name) === memberUUID);
          const isSigned = report.signedMembers?.some(m => (m.uuid || m.name) === memberUUID);
          
          if (isAbsent) {
            absenceDates.push(new Date(sundayDates[index]));
          } else if (isSigned) {
            signedDates.push(new Date(sundayDates[index]));
          }
        }
      });
      
      if (absenceDates.length === 0) {
        console.log('没有缺勤记录');
        const lastAttendanceDate = signedDates.length > 0 ? signedDates[signedDates.length - 1] : null;
        return {
          consecutiveAbsences: 0,
          lastAttendanceDate,
          checkStartDate,
          trackingStartDate: null,
          absenceEvents: []
        };
      }
      
      // 识别连续缺勤事件
      const absenceEvents = [];
      let currentEvent = null;
      
      absenceDates.forEach((date, index) => {
        if (index === 0 || date.getTime() - absenceDates[index - 1].getTime() > 7 * 24 * 60 * 60 * 1000) {
          // 新的缺勤事件开始
          if (currentEvent && currentEvent.consecutiveAbsences >= 2) {
            absenceEvents.push(currentEvent);
          }
          currentEvent = {
            startDate: date,
            consecutiveAbsences: 1,
            endDate: date
          };
        } else {
          // 连续缺勤
          currentEvent.consecutiveAbsences++;
          currentEvent.endDate = date;
        }
      });
      
      // 添加最后一个事件
      if (currentEvent && currentEvent.consecutiveAbsences >= 2) {
        absenceEvents.push(currentEvent);
      }
      
      // 获取最新事件
      const latestEvent = absenceEvents.length > 0 ? absenceEvents[absenceEvents.length - 1] : null;
      const lastAttendanceDate = signedDates.length > 0 ? signedDates[signedDates.length - 1] : null;
      
      // 🔧 修复：对于最后一个缺勤事件，如果最后缺勤日期是最近的（最近2周内），不设置endDate
      // 表示事件还在进行中，可以生成新的跟踪记录
      if (latestEvent && latestEvent.endDate) {
        const lastAbsenceDate = new Date(latestEvent.endDate);
        const currentDate = new Date();
        const daysDiff = (currentDate - lastAbsenceDate) / (1000 * 60 * 60 * 24);
        
        // 如果最后缺勤日期在最近2周内，且后续没有签到，说明事件还在进行中
        if (daysDiff <= 14 && (!lastAttendanceDate || new Date(lastAttendanceDate) < lastAbsenceDate)) {
          latestEvent.endDate = null; // 移除endDate，表示事件还在进行中
          console.log(`📅 事件还在进行中，移除endDate - 最后缺勤: ${lastAbsenceDate.toISOString().split('T')[0]}`);
        }
      }
      
      const result = {
        consecutiveAbsences: latestEvent ? latestEvent.consecutiveAbsences : 0,
        lastAttendanceDate,
        checkStartDate,
        trackingStartDate: latestEvent ? latestEvent.startDate : null,
        absenceEvents: absenceEvents.map(event => {
          // 如果是最后一个事件且已移除endDate，映射时也要移除
          if (event === latestEvent && latestEvent.endDate === null) {
            return {
              startDate: event.startDate,
              consecutiveAbsences: event.consecutiveAbsences,
              endDate: null
            };
          }
          return {
            startDate: event.startDate,
            consecutiveAbsences: event.consecutiveAbsences,
            endDate: event.endDate
          };
        })
      };
      
      console.log(`✅ 从 daily-reports 计算完成:`, {
        absenceEvents: absenceEvents.length,
        consecutiveAbsences: result.consecutiveAbsences
      });
      
      return result;
      
    } catch (error) {
      console.error('从 daily-reports 计算缺勤失败:', error);
      return null;
    }
  }
};


// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
window.utils.SundayTrackingManager = SundayTrackingManager;
