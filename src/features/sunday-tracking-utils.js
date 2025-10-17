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
  
  // 生成数据哈希值，用于检测数据变化
  _generateDataHash: function() {
    const groupsStr = JSON.stringify(window.groups || {});
    const attendanceStr = JSON.stringify(window.attendanceRecords || []);
    const excludedStr = JSON.stringify(window.excludedMembers || {});
    
    // 包含跟踪记录，确保状态变化时缓存失效
    const trackingRecords = this.getTrackingRecords();
    const trackingStr = JSON.stringify(trackingRecords || []);
    
    // 使用encodeURIComponent处理中文字符，然后使用btoa
    const combinedStr = groupsStr + attendanceStr + excludedStr + trackingStr;
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
    
    // 检查Firebase同步状态
    if (this._cache.lastFirebaseSync && window.db) {
      // 如果Firebase同步时间早于缓存时间，可能需要更新
      if (this._cache.lastFirebaseSync < this._cache.lastUpdateTime) {
        console.log('📋 Firebase同步时间早于缓存时间，缓存可能过期');
        return false;
      }
    }
    
    // 检查是否有终止状态的记录，如果有则强制重新生成
    const trackingRecords = this.getTrackingRecords();
    const hasTerminatedRecords = trackingRecords.some(record => record.status === 'terminated');
    if (hasTerminatedRecords) {
      console.log('📋 检测到终止记录，强制重新生成跟踪列表');
      return false;
    }
    
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
      
      const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ...
      const hour = date.getHours();
      const minute = date.getMinutes();
      
      // 判断是否为周日
      if (dayOfWeek !== 0) return false;
      
      // 判断时间范围：9:00之前到10:40
      if (hour < 9) return true; // 9点之前可以签到
      if (hour === 9) return true; // 9点整可以签到
      if (hour === 10 && minute <= 40) return true; // 10:40之前可以签到
      
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
  
  // 判断两个日期是否为同一天
  isSameDate: function(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },
  
  // 计算连续缺勤情况（新版本 - 支持多事件管理和实时更新）
  calculateConsecutiveAbsences: function(memberUUID) {
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
      if (window.groups) {
        localStorage.setItem('msh_groups', JSON.stringify(window.groups));
        if (window.db) {
          window.db.ref('groups').set(window.groups).catch(error => {
            console.error('同步成员数据到Firebase失败:', error);
          });
        }
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
      
      // 同步到Firebase
      if (window.db) {
        window.db.ref('sundayTracking').set(records).catch(error => {
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
  
  // 生成跟踪列表
  generateTrackingList: function() {
    // 检查缓存是否有效
    if (this._isCacheValid()) {
      console.log('📦 使用缓存的跟踪列表，跳过重新计算');
      return this._cache.trackingList;
    }
    
    console.log('🔄 开始生成新的跟踪列表...');
    const startTime = performance.now();
    const trackingList = [];
    
    // 首先执行数据迁移，确保所有数据都有UUID
    this.migrateDataWithUUID();
    
    // 获取所有现有的事件记录
    const existingEvents = this.getTrackingRecords();
    console.log(`现有事件记录: ${existingEvents.length} 个`);
    
    // 获取所有人员（排除未签到不统计的人员）
    const allMembers = this.getAllMembers();
    
    console.log(`🔍 排除人员检查: 总人员${allMembers.length}个`);
    
    allMembers.forEach(member => {
      // 检查是否在排除列表中（新版本：直接检查成员标记）
      if (this.isMemberExcluded(member)) {
        console.log(`🚫 排除成员: ${member.name}(${member.group}) - 不生成跟踪事件`);
        return;
      }
      
      // 获取该成员的所有跟踪记录（用于后续更新）
      const memberTrackingRecords = this.getMemberTrackingRecords(member.uuid);
      
      // 注释：移除"已有进行中跟踪记录"的检查，允许系统重新计算缺勤情况
      // 这样符合"手动终止事件"的设计原则，用户可以手动终止事件
      // 系统会重新计算并更新跟踪记录
      
      // 计算连续缺勤情况
      const { consecutiveAbsences, lastAttendanceDate, checkStartDate, trackingStartDate, absenceEvents } = 
        this.calculateConsecutiveAbsences(member.uuid);
      
      // 调试信息
      console.log(`成员 ${member.name} (${member.uuid}): 识别到 ${absenceEvents.length} 个缺勤事件`);
      
      // 为每个缺勤事件创建跟踪记录
      absenceEvents.forEach((event, eventIndex) => {
        const eventConsecutiveAbsences = event.consecutiveAbsences;
        console.log(`成员 ${member.name} 事件${eventIndex + 1}: 连续缺勤 ${eventConsecutiveAbsences} 次`);
        
        // 生成事件唯一编码：{memberUUID}_{startDate}_{eventIndex}
        let startDate = event.startDate;
        if (startDate instanceof Date) {
          startDate = startDate.toISOString().split('T')[0];
        } else if (!startDate || startDate === 'undefined') {
          startDate = '2025-08-03'; // 默认值
        }
        const eventUniqueId = `${member.uuid}_${startDate}_${eventIndex + 1}`;
        
        // 检查是否已有该事件的跟踪记录
        const existingEventRecord = this.getTrackingRecord(eventUniqueId);
        
        // 调试：显示查找过程
        if (eventIndex === 0) { // 只对第一个事件显示详细调试
          console.log(`🔍 查找事件记录: ${eventUniqueId}`);
          const allRecords = this.getTrackingRecords();
          console.log(`📋 所有记录数量: ${allRecords.length}`);
          const matchingRecords = allRecords.filter(r => r.recordId === eventUniqueId);
          console.log(`🔍 匹配的记录数量: ${matchingRecords.length}`);
          if (matchingRecords.length > 0) {
            console.log(`🔍 匹配的记录状态: ${matchingRecords[0].status}`);
          }
        }
        
        // 如果已有记录，检查状态
        if (existingEventRecord) {
          console.log(`成员 ${member.name} 事件${eventIndex + 1}: 使用现有记录，状态: ${existingEventRecord.status}`);
          // 修复：保留所有现有记录（包括已终止事件），不重新生成
          trackingList.push(existingEventRecord);
          console.log(`成员 ${member.name} 事件${eventIndex + 1}: 保留现有记录，状态: ${existingEventRecord.status}`);
          return;
        }
        
        // 检查是否应该生成新事件（基于时间节点判断）
        const currentDate = new Date();
        if (!shouldGenerateEvent(event, currentDate, member.uuid, eventIndex)) {
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
        
        // 创建新的事件跟踪记录（优化版：包含完整快照信息）
        const newEventRecord = {
          memberUUID: member.uuid,
          recordId: eventUniqueId, // 使用唯一编码
          memberName: member.name,
          group: member.group,
          originalGroup: member.group,
          // 优化：快照时保存小组显示名称，使用groupNames映射
          groupDisplayName: (window.groupNames && window.groupNames[member.group]) ? window.groupNames[member.group] : member.group,
          consecutiveAbsences: eventConsecutiveAbsences,
          lastAttendanceDate: event.endDate || lastAttendanceDate,
          checkStartDate: checkStartDate,
          trackingStartDate: startDate,
          status: 'active', // 新事件默认为活跃状态
          eventType: eventType,
          eventDescription: eventDescription,
          eventIndex: eventIndex + 1,
          totalEvents: absenceEvents.length,
          // 优化：快照时保存成员完整信息，避免依赖基础数据
          memberSnapshot: {
            uuid: member.uuid,
            name: member.name,
            group: member.group,
            // 可以添加更多成员信息快照
          },
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
      });
    });
    
    // 保存修改后的数据（包含新生成的UUID和memberUUID）
    this.saveModifiedData();
    
    // 修复：保留所有事件（包括已终止事件），不进行过滤
    // 已终止事件应该被保留，不应该被覆盖或删除
    console.log(`📊 跟踪列表生成完成，保留所有事件: ${trackingList.length}个`);
    
    // 保存到缓存
    this._cache.trackingList = trackingList;
    this._cache.lastUpdateTime = Date.now();
    this._cache.dataHash = this._generateDataHash();
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    console.log(`✅ 跟踪列表生成完成，耗时: ${processingTime.toFixed(2)}ms，事件数量: ${trackingList.length} (保留所有事件，包括已终止事件)`);
    
    return trackingList;
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
      
      // 同步到Firebase
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        db.ref('groups').set(groups).then(() => {
          console.log('✅ 排除状态已同步到Firebase');
        }).catch(error => {
          console.error('❌ 同步到Firebase失败:', error);
        });
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
      
      // 同步到Firebase
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        db.ref('groups').set(groups).then(() => {
          console.log('✅ 排除人员标记已同步到Firebase');
        }).catch(error => {
          console.error('❌ 同步到Firebase失败:', error);
        });
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
      
      // 2. 同步到Firebase（使用与saveTrackingRecord一致的路径）
      if (window.db) {
        try {
          // 获取完整的跟踪记录数组并同步
          const allRecords = this.getTrackingRecords();
          await window.db.ref('sundayTracking').set(allRecords);
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
      
      // 2. 同步到Firebase
      if (window.db) {
        try {
          await window.db.ref(`trackingRecords/${recordId}`).set(trackingRecord);
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
      
      // 2. 同步到Firebase (数据持久化)
      if (window.db) {
        try {
          await window.db.ref(`personalTracking/${memberUUID}`).set(records);
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
      
      // 同步到Firebase
      if (window.db) {
        window.db.ref('sundayTracking').set(updatedRecords).catch(error => {
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
  }
};


// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
window.utils.SundayTrackingManager = SundayTrackingManager;
