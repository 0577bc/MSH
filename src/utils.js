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

// ==================== 通用Firebase初始化 ====================

/**
 * 通用Firebase初始化函数
 * @returns {Object} {app, db, success} Firebase应用实例和数据库实例
 */
function initializeFirebase() {
  try {
    // 检查Firebase SDK是否已加载
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK未加载，请检查网络连接或CDN状态');
      return { app: null, db: null, success: false };
    }
    
    // 检查是否已经初始化
    if (firebase.apps.length > 0) {
      const app = firebase.app();
      const db = firebase.database();
      console.log('✅ 使用已存在的Firebase应用');
      return { app, db, success: true };
    }
    
    // 使用全局Firebase配置初始化
    if (window.firebaseConfig) {
      const app = firebase.initializeApp(window.firebaseConfig);
      const db = firebase.database();
      console.log('✅ 创建新的Firebase应用');
      return { app, db, success: true };
    } else {
      console.error('❌ Firebase配置未找到');
      return { app: null, db: null, success: false };
    }
  } catch (error) {
    console.error('❌ Firebase初始化失败:', error);
    return { app: null, db: null, success: false };
  }
}

// ==================== 防重复提交机制 ====================

/**
 * 防重复提交装饰器
 * @param {Function} fn 要包装的函数
 * @param {string} key 唯一标识符，用于区分不同的操作
 * @returns {Function} 包装后的函数
 */
function preventDuplicateExecution(fn, key) {
  return async function(...args) {
    const flagName = `isExecuting_${key}`;
    
    // 检查是否正在执行
    if (window[flagName]) {
      console.log(`⚠️ ${key} 正在执行中，请勿重复提交`);
      return;
    }
    
    // 设置执行标志
    window[flagName] = true;
    
    try {
      // 执行原函数
      const result = await fn.apply(this, args);
      return result;
    } catch (error) {
      console.error(`${key} 执行失败:`, error);
      throw error;
    } finally {
      // 清除执行标志
      window[flagName] = false;
    }
  };
}

/**
 * 防重复提交的保存操作
 * @param {Function} saveFunction 保存函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的保存函数
 */
function createSafeSaveFunction(saveFunction, operationName) {
  return preventDuplicateExecution(saveFunction, `save_${operationName}`);
}

/**
 * 防重复提交的同步操作
 * @param {Function} syncFunction 同步函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的同步函数
 */
function createSafeSyncFunction(syncFunction, operationName) {
  return preventDuplicateExecution(syncFunction, `sync_${operationName}`);
}

/**
 * 防重复提交的删除操作
 * @param {Function} deleteFunction 删除函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的删除函数
 */
function createSafeDeleteFunction(deleteFunction, operationName) {
  return preventDuplicateExecution(deleteFunction, `delete_${operationName}`);
}

// ==================== 数据加密管理器 ====================
const DataEncryption = {
  // 简单的Base64编码/解码（用于本地存储保护）
  // 注意：这不是真正的加密，只是简单的编码，防止明文存储
  
  // 生成简单的密钥（基于页面URL和用户代理）
  generateKey: function() {
    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 按天变化
    return btoa(pageUrl + userAgent + timestamp).substring(0, 16);
  },
  
  // 简单的XOR加密
  xorEncrypt: function(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  },
  
  // 加密数据
  encrypt: function(data) {
    try {
      const jsonString = JSON.stringify(data);
      const key = this.generateKey();
      const encrypted = this.xorEncrypt(jsonString, key);
      return btoa(encrypted);
    } catch (error) {
      console.error('数据加密失败:', error);
      return data; // 加密失败时返回原始数据
    }
  },
  
  // 解密数据
  decrypt: function(encryptedData) {
    try {
      const key = this.generateKey();
      const decrypted = this.xorEncrypt(atob(encryptedData), key);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('数据解密失败:', error);
      return null; // 解密失败时返回null
    }
  },
  
  // 检查数据是否已加密
  isEncrypted: function(data) {
    try {
      // 尝试解析为JSON，如果失败则可能是加密数据
      JSON.parse(data);
      return false;
    } catch {
      // 尝试Base64解码，如果成功则可能是加密数据
      try {
        atob(data);
        return true;
      } catch {
        return false;
      }
    }
  }
};

// ==================== 加密本地存储管理器 ====================
const EncryptedStorage = {
  // 加密存储数据
  setItem: function(key, data) {
    try {
      const encryptedData = DataEncryption.encrypt(data);
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      // 降级到普通存储
      localStorage.setItem(key, JSON.stringify(data));
    }
  },
  
  // 解密读取数据
  getItem: function(key) {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;
      
      // 检查是否是加密数据
      if (DataEncryption.isEncrypted(encryptedData)) {
        const decryptedData = DataEncryption.decrypt(encryptedData);
        if (decryptedData !== null) {
          return decryptedData;
        }
      }
      
      // 如果不是加密数据或解密失败，尝试直接解析JSON
      return JSON.parse(encryptedData);
    } catch (error) {
      return null;
    }
  },
  
  // 删除数据
  removeItem: function(key) {
    localStorage.removeItem(key);
  },
  
  // 清空所有数据
  clear: function() {
    localStorage.clear();
  }
};

// ==================== 日志管理器 ====================
const Logger = {
  // 生产环境日志控制
  DEBUG_MODE: false, // 设置为true启用调试日志
  
  debug: (msg) => { if (Logger.DEBUG_MODE) console.log(msg); },
  info: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg)
};

// ==================== UUID索引缓存 ====================
const UUIDIndex = {
  // UUID到成员的映射缓存
  memberIndex: new Map(),
  // 记录键到记录的映射缓存
  recordIndex: new Map(),
  
  // 更新成员索引
  updateMemberIndex: function(groups) {
    this.memberIndex.clear();
    let totalMembers = 0;
    let membersWithUUID = 0;
    
    console.log('🔍 UUIDIndex.updateMemberIndex 开始更新:', {
      groupsCount: Object.keys(groups).length,
      groupNamesLoaded: !!window.groupNames,
      groupNamesKeys: window.groupNames ? Object.keys(window.groupNames) : 'undefined'
    });
    
    Object.entries(groups).forEach(([groupName, members]) => {
      members.forEach(member => {
        totalMembers++;
        if (member.uuid) {
          // 确保成员有group字段
          if (!member.group) {
            member.group = groupName;
            console.log(`🔧 为成员 ${member.name} 补充group字段: ${groupName}`);
          }
          
          // 应用groupNames映射，确保存储的成员信息包含正确的显示名称
          const mappedMember = {
            ...member,
            group: member.group || groupName, // 确保group字段存在
            groupDisplayName: (window.groupNames && window.groupNames[member.group]) ? window.groupNames[member.group] : (member.group || groupName)
          };
          
          this.memberIndex.set(member.uuid, mappedMember);
          membersWithUUID++;
          
          // 调试：显示前几个成员的映射结果
          if (membersWithUUID <= 3) {
            console.log(`🔍 成员映射示例 ${membersWithUUID}:`, {
              name: member.name,
              group: member.group,
              groupDisplayName: mappedMember.groupDisplayName,
              uuid: member.uuid
            });
          }
        } else {
          // 调试：显示没有UUID的成员（只显示前3个）
          if (totalMembers <= 3) {
            console.log('成员缺少UUID:', member.name, JSON.stringify(member, null, 2));
          }
        }
      });
    });
    
    console.log(`✅ UUIDIndex更新完成: 总成员数 ${totalMembers}, 有UUID的成员数 ${membersWithUUID}`);
    
    // 显示一个示例成员的结构
    if (totalMembers > 0) {
      const firstGroup = Object.values(groups)[0];
      if (firstGroup && firstGroup.length > 0) {
        console.log('示例成员结构:', JSON.stringify(firstGroup[0], null, 2));
      }
    }
  },
  
  // 更新记录索引
  updateRecordIndex: function(attendanceRecords) {
    this.recordIndex.clear();
    attendanceRecords.forEach(record => {
      const key = `${record.name}_${record.time}_${record.group}`;
      this.recordIndex.set(key, record);
    });
  },
  
  // 根据UUID查找成员
  findMemberByUUID: function(uuid) {
    return this.memberIndex.get(uuid);
  },
  
  // 根据记录键查找记录
  findRecordByKey: function(recordKey) {
    return this.recordIndex.get(recordKey);
  }
};

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

// ==================== 数据处理工具函数 ====================

/**
 * 生成UUID v4
 * @returns {string} 生成的UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 为人员生成唯一ID
 * @param {Object} member 人员对象
 * @returns {string} 人员唯一ID
 */
function generateMemberUUID(member) {
  // 如果已有UUID，直接返回
  if (member.uuid) {
    return member.uuid;
  }
  
  // 生成新的UUID
  return generateUUID();
}

/**
 * 为所有人员添加UUID
 * @param {Object} groups 组别数据
 * @returns {Object} 更新后的组别数据
 */
function addUUIDsToMembers(groups) {
  const updatedGroups = {};
  
  for (const groupName in groups) {
    updatedGroups[groupName] = groups[groupName].map(member => {
      if (!member.uuid) {
        member.uuid = generateUUID();
        console.log(`为人员 ${member.name} 生成UUID: ${member.uuid}`);
      }
      return member;
    });
  }
  
  return updatedGroups;
}

/**
 * 为签到记录添加人员UUID关联
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Object} groups 组别数据
 * @returns {Array} 更新后的签到记录数组
 */
function addMemberUUIDsToAttendanceRecords(attendanceRecords, groups) {
  // 创建人员UUID映射表
  const memberUUIDMap = {};
  for (const groupName in groups) {
    groups[groupName].forEach(member => {
      memberUUIDMap[member.name] = member.uuid;
    });
  }
  
  return attendanceRecords.map(record => {
    if (!record.memberUUID && record.memberName) {
      record.memberUUID = memberUUIDMap[record.memberName];
      if (record.memberUUID) {
        console.log(`为签到记录 ${record.memberName} 关联UUID: ${record.memberUUID}`);
      }
    }
    return record;
  });
}

/**
 * 根据人员UUID获取签到统计
 * @param {string} memberUUID 人员UUID
 * @param {Array} attendanceRecords 签到记录数组
 * @param {string} startDate 开始日期 (YYYY-MM-DD)
 * @param {string} endDate 结束日期 (YYYY-MM-DD)
 * @returns {Object} 签到统计信息
 */
function getMemberAttendanceStatsByUUID(memberUUID, attendanceRecords, startDate, endDate) {
  const memberRecords = attendanceRecords.filter(record => {
    if (record.memberUUID !== memberUUID) return false;
    
    if (startDate && endDate) {
      const recordDate = new Date(record.time).toISOString().split('T')[0];
      return recordDate >= startDate && recordDate <= endDate;
    }
    
    return true;
  });
  
  const stats = {
    totalSignIns: memberRecords.length,
    morningSignIns: memberRecords.filter(r => r.timeSlot === 'morning' || r.timeSlot === 'early' || r.timeSlot === 'onTime' || r.timeSlot === 'late').length,
    afternoonSignIns: memberRecords.filter(r => r.timeSlot === 'afternoon').length,
    eveningSignIns: memberRecords.filter(r => r.timeSlot === 'evening').length,
    earlySignIns: memberRecords.filter(r => r.timeSlot === 'early').length,
    onTimeSignIns: memberRecords.filter(r => r.timeSlot === 'onTime').length,
    lateSignIns: memberRecords.filter(r => r.timeSlot === 'late').length,
    records: memberRecords
  };
  
  return stats;
}

/**
 * 根据组别获取签到统计（考虑人员可能换组）
 * @param {string} groupName 组别名称
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Object} groups 当前组别数据
 * @param {string} date 日期 (YYYY-MM-DD)
 * @returns {Object} 组别签到统计
 */
function getGroupAttendanceStatsByUUID(groupName, attendanceRecords, groups, date) {
  // 获取当前组别的所有人员UUID
  const currentMemberUUIDs = groups[groupName] ? groups[groupName].map(member => member.uuid) : [];
  
  // 统计这些人员的签到记录
  const groupRecords = attendanceRecords.filter(record => {
    if (!currentMemberUUIDs.includes(record.memberUUID)) return false;
    
    if (date) {
      const recordDate = new Date(record.time).toISOString().split('T')[0];
      return recordDate === date;
    }
    
    return true;
  });
  
  const stats = {
    totalMembers: currentMemberUUIDs.length,
    signedInMembers: new Set(groupRecords.map(r => r.memberUUID)).size,
    totalSignIns: groupRecords.length,
    morningSignIns: groupRecords.filter(r => r.timeSlot === 'morning' || r.timeSlot === 'early' || r.timeSlot === 'onTime' || r.timeSlot === 'late').length,
    afternoonSignIns: groupRecords.filter(r => r.timeSlot === 'afternoon').length,
    eveningSignIns: groupRecords.filter(r => r.timeSlot === 'evening').length,
    attendanceRate: currentMemberUUIDs.length > 0 ? Math.round((new Set(groupRecords.map(r => r.memberUUID)).size / currentMemberUUIDs.length) * 100) : 0,
    records: groupRecords
  };
  
  return stats;
}

/**
 * 获取人员的完整签到历史（跨组别）
 * @param {string} memberUUID 人员UUID
 * @param {Array} attendanceRecords 签到记录数组
 * @returns {Array} 按时间排序的签到记录
 */
function getMemberFullAttendanceHistory(memberUUID, attendanceRecords) {
  return attendanceRecords
    .filter(record => record.memberUUID === memberUUID)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * 创建人员UUID索引，提高查询性能
 * @param {Object} groups 组别数据
 * @returns {Object} UUID索引对象
 */
function createMemberUUIDIndex(groups) {
  const index = {};
  for (const groupName in groups) {
    groups[groupName].forEach(member => {
      if (member.uuid) {
        index[member.uuid] = {
          name: member.name,
          group: groupName,
          member: member
        };
      }
    });
  }
  return index;
}

/**
 * 批量处理签到记录，提高性能
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Function} processor 处理函数
 * @param {number} batchSize 批处理大小
 * @returns {Array} 处理后的记录数组
 */
function batchProcessAttendanceRecords(attendanceRecords, processor, batchSize = 100) {
  const results = [];
  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize);
    const processedBatch = batch.map(processor);
    results.push(...processedBatch);
  }
  return results;
}

/**
 * 优化数据同步，减少不必要的更新
 * @param {Object} localData 本地数据
 * @param {Object} remoteData 远程数据
 * @returns {Object} 需要同步的数据
 */
function optimizeDataSync(localData, remoteData) {
  const changes = {};
  
  // 比较数据并只返回有变化的部分
  for (const key in localData) {
    if (JSON.stringify(localData[key]) !== JSON.stringify(remoteData[key])) {
      changes[key] = localData[key];
    }
  }
  
  return changes;
}

/**
 * 加载不统计人员列表（已废弃 - 保留用于兼容）
 * @deprecated 现在使用成员对象的 excluded 属性
 * @returns {Array} 不统计人员列表
 */
function loadExcludedMembers() {
  // 已废弃：请使用 member.excluded 属性（警告已移除以减少控制台噪音）
  
  // 为了兼容，从groups中提取excluded=true的成员
  if (window.groups) {
    const excludedList = [];
    Object.keys(window.groups).forEach(groupId => {
      const members = window.groups[groupId] || [];
      members.forEach(member => {
        if (member.excluded === true) {
          excludedList.push({
            ...member,
            group: groupId
          });
        }
      });
    });
    console.log('✅ 从成员标记中提取排除人员:', excludedList.length, '个');
    return excludedList;
  }
  
  return [];
}

/**
 * 检查人员是否在不统计列表中（支持UUID和姓名匹配）
 * @param {Object} record 签到记录
 * @param {Array} excludedMembers 不统计人员列表
 * @returns {boolean} 是否被排除
 */
function isMemberExcluded(record, excludedMembers) {
  // 首先尝试通过UUID匹配（更准确）
  if (record.memberUUID) {
    return excludedMembers.some(excluded => 
      excluded.uuid === record.memberUUID
    );
  }
  
  // 如果没有UUID，使用姓名和组别匹配（向后兼容）
  return excludedMembers.some(excluded => 
    excluded.name === record.name && excluded.group === record.group
  );
}

/**
 * 升级不统计人员列表，添加UUID支持
 * @param {Array} excludedMembers 原始不统计人员列表
 * @param {Object} groups 组别数据
 * @returns {Array} 升级后的不统计人员列表
 */
function upgradeExcludedMembersWithUUID(excludedMembers, groups) {
  return excludedMembers.map(excluded => {
    // 如果已经有UUID，直接返回
    if (excluded.uuid) {
      return excluded;
    }
    
    // 查找对应人员的UUID（支持姓名和花名匹配）
    for (const groupName in groups) {
      const member = groups[groupName].find(m => {
        // 直接姓名匹配
        if (m.name === excluded.name && groupName === excluded.group) {
          return true;
        }
        
        // 花名匹配
        const memberNickname = m.nickname || m.Nickname || m.花名 || m.alias || '';
        if (memberNickname && memberNickname === excluded.name && groupName === excluded.group) {
          return true;
        }
        
        // 反向匹配：排除人员的花名 vs 成员的姓名
        const excludedNickname = excluded.nickname || excluded.Nickname || excluded.花名 || excluded.alias || '';
        if (excludedNickname && excludedNickname === m.name && groupName === excluded.group) {
          return true;
        }
        
        return false;
      });
      
      if (member && member.uuid) {
        return {
          ...excluded,
          uuid: member.uuid
        };
      }
    }
    
    // 如果找不到对应人员，保持原样
    return excluded;
  });
}

/**
 * 小组排序函数
 * @param {Object} groups 小组数据
 * @param {Object} groupNames 小组名称映射
 * @returns {Array} 排序后的小组键数组
 * @note "未分组"永远排在第一
 */
function sortGroups(groups, groupNames) {
  return Object.keys(groups).sort((a, b) => {
    const nameA = groupNames[a] || a;
    const nameB = groupNames[b] || b;
    
    // "group0"永远排在第一（未分组）
    if (a === "group0") return -1;
    if (b === "group0") return 1;
    
    return nameA.localeCompare(nameB, 'zh-CN');
  });
}

/**
 * 成员按姓名排序
 * @param {Array} members 成员数组
 * @returns {Array} 排序后的成员数组
 */
function sortMembersByName(members) {
  return members.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

/**
 * 检查成员是否在不统计列表中
 * @param {Object} member 成员对象
 * @param {string} group 小组名称
 * @param {Array} excludedMembers 不统计人员列表
 * @returns {boolean} 是否在不统计列表中
 */
function isMemberExcluded(member, group, excludedMembers) {
  if (!member) {
    return false;
  }
  
  // 新逻辑：直接检查成员的 excluded 属性
  return member.excluded === true || member.excluded === 'true';
}

/**
 * 过滤不统计的人员（简化版 - 使用成员标记）
 * @param {Array} members 成员数组
 * @param {string} group 小组名称（保留参数用于兼容）
 * @param {Array} excludedMembers 不统计人员列表（保留参数用于兼容）
 * @returns {Array} 过滤后的成员数组
 */
function filterExcludedMembers(members, group, excludedMembers) {
  // 新逻辑：直接过滤 excluded 属性
  return members.filter(member => !(member.excluded === true || member.excluded === 'true'));
}

/**
 * 获取成员的显示名称（优先显示花名，没有花名显示姓名）
 * @param {Object} member 成员对象
 * @returns {string} 显示名称
 */
function getDisplayName(member) {
  if (!member) return '';
  
  // 优先显示花名，如果没有花名则显示姓名
  const nickname = member.nickname || member.Nickname || member.花名 || member.alias || '';
  const name = member.name || member.Name || member.姓名 || member.fullName || '';
  
  return nickname.trim() ? nickname : name;
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

// ==================== 页面同步配置 ====================
const SYNC_CONFIG = {
  admin: {
    autoSync: true,
    conflictResolution: 'local',
    syncDelay: 500,
    description: '管理页面 - 优先本地数据，自动同步'
  },
  main: {
    autoSync: true,
    conflictResolution: 'local',
    syncDelay: 1000,
    description: '主页面 - 优先本地数据，延迟同步'
  },
  summary: {
    autoSync: false,
    conflictResolution: 'remote',
    syncDelay: 0,
    description: '汇总页面 - 优先远程数据，手动同步'
  },
  dailyReport: {
    autoSync: false,
    conflictResolution: 'remote',
    syncDelay: 0,
    description: '日报页面 - 优先远程数据，手动同步'
  },
  sundayTracking: {
    autoSync: false,
    conflictResolution: 'remote',
    syncDelay: 0,
    description: '主日跟踪页面 - 优先远程数据，手动同步'
  }
};

// ==================== 统一页面同步管理器 ====================
/**
 * 页面同步管理器
 * 为不同页面提供统一的数据同步管理功能
 * 支持自动同步和手动同步两种模式
 */
class PageSyncManager {
  /**
   * 构造函数
   * @param {string} pageType - 页面类型 ('main', 'admin', 'daily-report', 'summary', 'sundayTracking')
   */
  constructor(pageType) {
    this.pageType = pageType;
    this.config = SYNC_CONFIG[pageType] || SYNC_CONFIG.admin;
    this.smartSync = new SmartDataSyncManager();
    console.log(`页面同步管理器初始化: ${this.config.description}`);
  }
  
  /**
   * 统一的同步方法
   * @param {*} localData - 本地数据
   * @param {*} remoteData - 远程数据
   * @param {string} dataType - 数据类型
   * @returns {Promise} 同步结果
   */
  syncData(localData, remoteData, dataType) {
    console.log(`${this.pageType}页面 - 开始数据同步: ${dataType}`);
    
    // 根据页面配置调整同步行为
    if (this.config.autoSync) {
      return this.autoSync(localData, remoteData, dataType);
    } else {
      return this.manualSync(localData, remoteData, dataType);
    }
  }
  
  // 自动同步
  autoSync(localData, remoteData, dataType) {
    const result = this.smartSync.smartMergeData(localData, remoteData, dataType);
    
    // 不自动同步到远程，避免无限循环
    // 同步操作应该由用户操作触发，而不是数据更新时自动触发
    console.log(`${this.pageType}页面 - 自动同步完成，不推送到远程`);
    
    return result;
  }
  
  // 手动同步
  manualSync(localData, remoteData, dataType) {
    // 手动同步模式下，优先使用远程数据
    if (this.config.conflictResolution === 'remote') {
      return this.smartSync.mergeLocalFields(remoteData, localData, dataType);
    } else {
      return this.smartSync.smartMergeData(localData, remoteData, dataType);
    }
  }
  
  // 强制同步到远程
  async forceSyncToRemote(data, dataType) {
    console.log(`${this.pageType}页面 - 强制同步到远程: ${dataType}`);
    return await this.smartSync.forceSyncToRemote(data, dataType);
  }
}

// ==================== 智能数据同步管理器 ====================
class SmartDataSyncManager {
  constructor() {
    this.dataTimestamps = {
      groups: { local: 0, remote: 0 },
      attendanceRecords: { local: 0, remote: 0 },
      groupNames: { local: 0, remote: 0 }
    };
    this.syncInProgress = {
      groups: false,
      attendanceRecords: false,
      groupNames: false
    };
  }

  // 获取数据时间戳
  getDataTimestamp(data, source = 'local') {
    if (!data) return 0;
    
    // 如果是数组（attendanceRecords），取最新记录的时间
    if (Array.isArray(data)) {
      const latestRecord = data.reduce((latest, record) => {
        const recordTime = new Date(record.timestamp || (record.time ? new Date(record.time).toISOString().split('T')[0] : '') || 0).getTime();
        const latestTime = new Date(latest.timestamp || (latest.time ? new Date(latest.time).toISOString().split('T')[0] : '') || 0).getTime();
        return recordTime > latestTime ? record : latest;
      }, { timestamp: 0, date: 0 });
      return new Date(latestRecord.timestamp || (latestRecord.time ? new Date(latestRecord.time).toISOString().split('T')[0] : '') || 0).getTime();
    }
    
    // 如果是对象（groups, groupNames），取最新修改时间
    if (typeof data === 'object') {
      let maxTime = 0;
      Object.values(data).forEach(group => {
        if (Array.isArray(group)) {
          group.forEach(member => {
            const memberTime = new Date(member.lastModified || member.joinDate || 0).getTime();
            maxTime = Math.max(maxTime, memberTime);
          });
        }
      });
      return maxTime;
    }
    
    return Date.now();
  }

  // 比较数据新旧程度
  compareDataFreshness(localData, remoteData, dataType) {
    const localTime = this.getDataTimestamp(localData, 'local');
    const remoteTime = this.getDataTimestamp(remoteData, 'remote');
    
    console.log(`${dataType} 数据时间比较: 本地=${new Date(localTime).toLocaleString()}, 远程=${new Date(remoteTime).toLocaleString()}`);
    
    // 时间差小于5秒认为是同时修改，优先使用本地数据（用户正在操作）
    const timeDiff = Math.abs(localTime - remoteTime);
    if (timeDiff < 5000) {
      console.log(`${dataType}数据时间相近（${timeDiff}ms），优先使用本地数据`);
      return 'local';
    }
    
    if (remoteTime > localTime) {
      console.log(`使用远程${dataType}数据 (更新)`);
      return 'remote';
    } else if (localTime > remoteTime) {
      console.log(`使用本地${dataType}数据 (更新)`);
      return 'local';
    } else {
      // 时间相同时，检查是否有本地修改
      const hasLocalChanges = this.hasLocalChanges(localData, remoteData, dataType);
      if (hasLocalChanges) {
        console.log(`${dataType}数据时间相同，但检测到本地修改，使用本地数据`);
        return 'local';
      } else {
        console.log(`${dataType}数据时间相同且无本地修改，使用远程数据`);
        return 'remote';
      }
    }
  }

  // 检查是否有本地修改
  hasLocalChanges(localData, remoteData, dataType) {
    if (dataType === 'groups' && localData && remoteData) {
      return this.detectGroupChanges(localData, remoteData);
    } else if (dataType === 'attendanceRecords' && localData && remoteData) {
      return this.detectAttendanceChanges(localData, remoteData);
    } else if (dataType === 'groupNames' && localData && remoteData) {
      return this.detectGroupNameChanges(localData, remoteData);
    }
    
    return false;
  }

  // 检测组数据变化
  detectGroupChanges(localData, remoteData) {
    // 检查成员数量是否不同
    const localMemberCount = this.getTotalMemberCount(localData);
    const remoteMemberCount = this.getTotalMemberCount(remoteData);
    
    if (localMemberCount !== remoteMemberCount) {
      console.log(`检测到成员数量变化: 本地=${localMemberCount}, 远程=${remoteMemberCount}`);
      return true;
    }
    
    // 检查是否有新组
    for (const groupKey in localData) {
      if (localData[groupKey] && !remoteData[groupKey]) {
        console.log(`检测到新组: ${groupKey}`);
        return true;
      }
    }
    
    // 检查是否有新成员或成员移动
    for (const groupKey in localData) {
      if (localData[groupKey] && remoteData[groupKey]) {
        const localMembers = localData[groupKey];
        const remoteMembers = remoteData[groupKey];
        
        // 检查每个本地成员
        for (const localMember of localMembers) {
          const remoteMember = remoteMembers.find(rm => rm.name === localMember.name);
          if (!remoteMember) {
            // 检查该成员是否在其他组中（成员移动）
            let foundInOtherGroup = false;
            for (const otherGroupKey in remoteData) {
              if (otherGroupKey !== groupKey && remoteData[otherGroupKey]) {
                const otherGroupMembers = remoteData[otherGroupKey];
                if (otherGroupMembers.find(rm => rm.name === localMember.name)) {
                  foundInOtherGroup = true;
                  console.log(`检测到成员移动: ${localMember.name} 从 ${otherGroupKey} 移动到 ${groupKey}`);
                  return true;
                }
              }
            }
            if (!foundInOtherGroup) {
              console.log(`检测到新成员: ${localMember.name}`);
              return true;
            }
          } else {
            // 检查成员属性变化（如UUID、花名等）
            if (localMember.uuid !== remoteMember.uuid || 
                localMember.nickname !== remoteMember.nickname) {
              console.log(`检测到成员属性变化: ${localMember.name}`);
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  // 检测考勤记录变化
  detectAttendanceChanges(localData, remoteData) {
    if (!Array.isArray(localData) || !Array.isArray(remoteData)) {
      return false;
    }
    
    // 检查记录数量变化
    if (localData.length !== remoteData.length) {
      console.log(`检测到考勤记录数量变化: 本地=${localData.length}, 远程=${remoteData.length}`);
      return true;
    }
    
    // 检查记录内容变化
    for (let i = 0; i < localData.length; i++) {
      const localRecord = localData[i];
      const remoteRecord = remoteData[i];
      
      if (!remoteRecord || 
          localRecord.memberName !== remoteRecord.memberName ||
          (localRecord.date || (localRecord.time ? new Date(localRecord.time).toISOString().split('T')[0] : '')) !== (remoteRecord.date || (remoteRecord.time ? new Date(remoteRecord.time).toISOString().split('T')[0] : '')) ||
          localRecord.group !== remoteRecord.group) {
        console.log(`检测到考勤记录变化: ${localRecord.memberName} - ${localRecord.date || (localRecord.time ? new Date(localRecord.time).toISOString().split('T')[0] : '')}`);
        return true;
      }
    }
    
    return false;
  }

  // 检测组名变化
  detectGroupNameChanges(localData, remoteData) {
    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    
    // 检查组名数量变化
    if (localKeys.length !== remoteKeys.length) {
      console.log(`检测到组名数量变化: 本地=${localKeys.length}, 远程=${remoteKeys.length}`);
      return true;
    }
    
    // 检查组名内容变化
    for (const key of localKeys) {
      if (localData[key] !== remoteData[key]) {
        console.log(`检测到组名变化: ${key} - ${localData[key]} -> ${remoteData[key]}`);
        return true;
      }
    }
    
    return false;
  }

  // 获取总成员数量
  getTotalMemberCount(groupsData) {
    if (!groupsData) return 0;
    let total = 0;
    for (const groupKey in groupsData) {
      if (Array.isArray(groupsData[groupKey])) {
        total += groupsData[groupKey].length;
      }
    }
    return total;
  }

  // 智能合并数据
  smartMergeData(localData, remoteData, dataType) {
    const winner = this.compareDataFreshness(localData, remoteData, dataType);
    
    if (winner === 'remote') {
      // 使用远程数据，但保留本地的UUID等关键字段
      return this.mergeLocalFields(remoteData, localData, dataType);
    } else {
      // 使用本地数据，但不自动同步到远程（避免无限循环）
      // 同步操作应该由页面级别的操作触发，而不是数据合并时自动触发
      console.log(`${dataType}数据使用本地版本，不自动同步到远程`);
      return localData;
    }
  }

  // 合并本地字段到远程数据
  mergeLocalFields(remoteData, localData, dataType) {
    if (dataType === 'groups' && remoteData && localData) {
      const merged = { ...remoteData };
      
      Object.keys(localData).forEach(groupKey => {
        if (merged[groupKey] && localData[groupKey]) {
          merged[groupKey] = merged[groupKey].map(remoteMember => {
            const localMember = localData[groupKey].find(lm => lm.name === remoteMember.name);
            if (localMember) {
              // 保留本地的UUID和花名
              return {
                ...remoteMember,
                uuid: localMember.uuid || remoteMember.uuid,
                nickname: localMember.nickname || remoteMember.nickname
              };
            }
            return remoteMember;
          });
        }
      });
      
      return merged;
    }
    
    return remoteData;
  }

  // 同步数据到远程
  async syncToRemote(data, dataType, force = false) {
    // 防止重复同步，但允许强制同步
    if (!force && this.syncInProgress[dataType]) {
      console.log(`${dataType}数据同步正在进行中，跳过此次同步`);
      return;
    }
    
    this.syncInProgress[dataType] = true;
    
    // 设置全局同步标志，防止监听器触发
    window.isSyncingToFirebase = true;
    
    try {
      const db = firebase.database();
      const ref = db.ref(dataType);
      await ref.set(data);
      console.log(`${dataType}数据已同步到远程${force ? '(强制同步)' : ''}`);
      
      // 更新本地时间戳
      this.dataTimestamps[dataType].local = Date.now();
    } catch (error) {
      console.error(`同步${dataType}数据到远程失败:`, error);
      throw error; // 重新抛出错误，让调用者处理
    } finally {
      // 延迟重置同步状态和全局标志，避免立即触发新的同步
      setTimeout(() => {
        this.syncInProgress[dataType] = false;
        window.isSyncingToFirebase = false;
        console.log(`${dataType}数据同步完成，重置同步标志`);
      }, 1000); // 给监听器足够时间检测到标志
    }
  }
  
  // 强制同步数据到远程（绕过重复检查）
  async forceSyncToRemote(data, dataType) {
    return await this.syncToRemote(data, dataType, true);
  }

  // 同步所有本地数据到远程
  async syncAllLocalDataToRemote() {
    try {
      console.log('开始同步所有本地数据到远程...');
      
      // 同步groups数据
      const localGroups = localStorage.getItem('msh_groups');
      if (localGroups) {
        const groupsData = JSON.parse(localGroups);
        await this.syncToRemote(groupsData, 'groups');
      }
      
      // 同步attendanceRecords数据
      const localAttendance = localStorage.getItem('msh_attendanceRecords');
      if (localAttendance) {
        const attendanceData = JSON.parse(localAttendance);
        await this.syncToRemote(attendanceData, 'attendanceRecords');
      }
      
      // 同步groupNames数据
      const localGroupNames = localStorage.getItem('msh_groupNames');
      if (localGroupNames) {
        const groupNamesData = JSON.parse(localGroupNames);
        await this.syncToRemote(groupNamesData, 'groupNames');
      }
      
      console.log('所有本地数据已同步到远程');
      return true;
    } catch (error) {
      console.error('同步所有本地数据到远程失败:', error);
      return false;
    }
  }
}

// 实时数据同步管理
class DataSyncManager {
  constructor() {
    this.listeners = new Map();
    this.isListening = false;
    this.lastSyncTime = 0;
    this.workerManager = null;
    this.syncQueue = [];
    this.isProcessingSync = false;
    this.smartSync = new SmartDataSyncManager();
  }

  // 初始化Worker管理器
  initWorkerManager() {
    if (window.workerManager && !this.workerManager) {
      this.workerManager = window.workerManager;
    }
  }

  // 异步数据同步
  async syncDataAsync(localData, remoteData, conflictResolution = 'newest') {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程同步');
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'SYNC_DATA',
        data: {
          localData,
          remoteData,
          conflictResolution
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步同步失败:', error);
      // 回退到主线程同步
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }
  }

  // 主线程数据同步（回退方案）
  syncDataMainThread(localData, remoteData, conflictResolution) {
    const startTime = performance.now();
    
    try {
      const conflicts = this.findConflicts(localData, remoteData);
      const mergedData = this.mergeData(localData, remoteData, conflictResolution);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return {
        mergedData,
        conflicts,
        processingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('主线程同步失败:', error);
      throw error;
    }
  }

  // 开始监听Firebase数据变化
  startListening(callback) {
    try {
      const db = firebase.database();
      
      // 如果没有提供callback，使用默认处理
      const defaultCallback = callback || function(dataType, data) {
        console.log(`数据同步: ${dataType}`, data);
      };
      
      // 如果已经有监听器在运行，直接调用回调函数
      if (this.isListening) {
        if (callback) {
          // 立即调用回调函数处理当前数据
          this.callCallback(callback, 'groups', this.lastGroupsData);
          this.callCallback(callback, 'attendanceRecords', this.lastAttendanceData);
          this.callCallback(callback, 'groupNames', this.lastGroupNamesData);
        }
        return;
      }
      
      // 监听签到记录变化
      const attendanceRef = db.ref('attendanceRecords');
      attendanceRef.on('value', (snapshot) => {
        // 检查是否正在进行同步操作，如果是则忽略
        if (window.isSyncingToFirebase) {
          console.log('正在同步到Firebase，忽略attendanceRecords监听器触发');
          return;
        }
        
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
          this.lastSyncTime = Date.now();
          this.lastAttendanceData = data;
          defaultCallback('attendanceRecords', data);
        }
      });

      // 监听小组数据变化
      const groupsRef = db.ref('groups');
      groupsRef.on('value', (snapshot) => {
        // 检查是否正在进行同步操作，如果是则忽略
        if (window.isSyncingToFirebase) {
          console.log('正在同步到Firebase，忽略groups监听器触发');
          return;
        }
        
        const data = snapshot.val();
        if (data) {
          this.lastSyncTime = Date.now();
          this.lastGroupsData = data;
          defaultCallback('groups', data);
        }
      });

      // 监听小组名称变化
      const groupNamesRef = db.ref('groupNames');
      groupNamesRef.on('value', (snapshot) => {
        // 检查是否正在进行同步操作，如果是则忽略
        if (window.isSyncingToFirebase) {
          console.log('正在同步到Firebase，忽略groupNames监听器触发');
          return;
        }
        
        const data = snapshot.val();
        if (data) {
          this.lastSyncTime = Date.now();
          this.lastGroupNamesData = data;
          defaultCallback('groupNames', data);
        }
      });

      this.isListening = true;
      console.log('数据同步监听已启动');
    } catch (error) {
      console.error('启动数据同步监听失败:', error);
    }
  }

  // 调用回调函数
  callCallback(callback, dataType, data) {
    if (callback && data) {
      try {
        callback(dataType, data);
      } catch (error) {
        console.error(`回调函数执行失败 (${dataType}):`, error);
      }
    }
  }

  // 停止监听
  stopListening() {
    if (!this.isListening) return;
    
    try {
      const db = firebase.database();
      db.ref('attendanceRecords').off();
      db.ref('groups').off();
      db.ref('groupNames').off();
      
      this.isListening = false;
      console.log('数据同步监听已停止');
    } catch (error) {
      console.error('停止数据同步监听失败:', error);
    }
  }

  // 检查页面可见性
  setupVisibilityListener(callback) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 页面重新可见时，检查是否需要同步数据
        const now = Date.now();
        if (now - this.lastSyncTime > 30000) { // 30秒内没有同步
          callback();
        }
      }
    });
  }
}

// 创建全局数据同步管理器实例
const dataSyncManager = new DataSyncManager();

// 数据冲突解决管理器
const DataConflictResolver = {
  // 检测数据冲突
  detectConflicts(localData, remoteData, dataType) {
    const conflicts = [];
    
    // 如果本地数据为空或远程数据为空，不认为是冲突
    if (!localData || !remoteData) {
      return conflicts;
    }
    
    if (dataType === 'attendanceRecords') {
      // 检查签到记录冲突
      const localRecords = Array.isArray(localData) ? localData : [];
      const remoteRecords = Array.isArray(remoteData) ? remoteData : [];
      
      // 检查是否有相同的签到记录但内容不同
      localRecords.forEach((localRecord, localIndex) => {
        const remoteIndex = remoteRecords.findIndex(remoteRecord => {
          // 只有当ID相同，或者（姓名相同且日期相同且时间相同）时才认为是同一条记录
          if (remoteRecord.id && localRecord.id && remoteRecord.id === localRecord.id) {
            return true;
          }
          
          // 如果没有ID，则通过姓名、日期和时间来匹配
          if (!remoteRecord.id && !localRecord.id) {
            return remoteRecord.name === localRecord.name && 
                   (remoteRecord.date || (remoteRecord.time ? new Date(remoteRecord.time).toISOString().split('T')[0] : '')) === (localRecord.date || (localRecord.time ? new Date(localRecord.time).toISOString().split('T')[0] : '')) && 
                   remoteRecord.time === localRecord.time;
          }
          
          return false;
        });
        
        if (remoteIndex !== -1) {
          const remoteRecord = remoteRecords[remoteIndex];
          // 忽略memberUUID字段的差异
          const localRecordWithoutUUID = { ...localRecord };
          const remoteRecordWithoutUUID = { ...remoteRecord };
          delete localRecordWithoutUUID.memberUUID;
          delete remoteRecordWithoutUUID.memberUUID;
          
          if (JSON.stringify(localRecordWithoutUUID) !== JSON.stringify(remoteRecordWithoutUUID)) {
            conflicts.push({
              type: 'attendanceRecord',
              localIndex,
              remoteIndex,
              localRecord,
              remoteRecord,
              conflict: '签到记录内容不一致'
            });
          }
        }
      });
    } else if (dataType === 'groups') {
      // 检查小组数据冲突
      const localGroups = localData || {};
      const remoteGroups = remoteData || {};
      
      Object.keys(localGroups).forEach(groupName => {
        if (remoteGroups[groupName]) {
          const localMembers = localGroups[groupName];
          const remoteMembers = remoteGroups[groupName];
          
          // 如果本地成员数量更多，可能是新添加的成员，不认为是冲突
          if (localMembers.length > remoteMembers.length) {
            // 检查是否只是新增了成员
            const isOnlyNewMembers = remoteMembers.every(remoteMember => 
              localMembers.some(localMember => localMember.name === remoteMember.name)
            );
            if (isOnlyNewMembers) {
              return; // 只是新增成员，不认为是冲突
            }
          }
          
          // 检查成员数据是否一致（忽略UUID字段的差异）
          const localMembersWithoutUUID = localMembers.map(member => {
            const { uuid, ...memberWithoutUUID } = member;
            return memberWithoutUUID;
          });
          const remoteMembersWithoutUUID = remoteMembers.map(member => {
            const { uuid, ...memberWithoutUUID } = member;
            return memberWithoutUUID;
          });
          
          if (JSON.stringify(localMembersWithoutUUID) !== JSON.stringify(remoteMembersWithoutUUID)) {
            conflicts.push({
              type: 'group',
              groupName,
              localMembers,
              remoteMembers,
              conflict: '小组成员数据不一致'
            });
          }
        }
      });
    }
    
    return conflicts;
  },
  
  // 显示冲突解决对话框
  async resolveConflicts(conflicts, dataType) {
    if (conflicts.length === 0) {
      return null; // 无冲突
    }
    
    // 创建冲突解决对话框
    const modal = document.createElement('div');
    modal.id = 'conflictModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 20px; border-radius: 10px;
      max-width: 80%; max-height: 80%; overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    let conflictHtml = `
      <h3>⚠️ 数据冲突检测</h3>
      <p>发现 ${conflicts.length} 个数据冲突，请选择解决方案：</p>
    `;
    
    conflicts.forEach((conflict, index) => {
      conflictHtml += `
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
          <h4>冲突 ${index + 1}: ${conflict.conflict}</h4>
          <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
              <h5>本地数据:</h5>
              <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; font-size: 12px; max-height: 200px; overflow-y: auto;">
${JSON.stringify(conflict.localRecord || conflict.localMembers, null, 2)}
              </pre>
            </div>
            <div style="flex: 1;">
              <h5>远程数据:</h5>
              <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; font-size: 12px; max-height: 200px; overflow-y: auto;">
${JSON.stringify(conflict.remoteRecord || conflict.remoteMembers, null, 2)}
              </pre>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <label>
              <input type="radio" name="conflict_${index}" value="local" checked> 使用本地数据
            </label>
            <label style="margin-left: 20px;">
              <input type="radio" name="conflict_${index}" value="remote"> 使用远程数据
            </label>
            <label style="margin-left: 20px;">
              <input type="radio" name="conflict_${index}" value="merge"> 智能合并
            </label>
          </div>
        </div>
      `;
    });
    
    conflictHtml += `
      <div style="text-align: center; margin-top: 20px;">
        <button id="resolveConflicts" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">解决冲突</button>
        <button id="cancelConflicts" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">取消</button>
      </div>
    `;
    
    content.innerHTML = conflictHtml;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 返回Promise等待用户选择
    return new Promise((resolve) => {
      document.getElementById('resolveConflicts').addEventListener('click', () => {
        const resolutions = [];
        conflicts.forEach((conflict, index) => {
          const selected = document.querySelector(`input[name="conflict_${index}"]:checked`);
          resolutions.push({
            conflict,
            resolution: selected.value
          });
        });
        
        document.body.removeChild(modal);
        resolve(resolutions);
      });
      
      document.getElementById('cancelConflicts').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
    });
  },
  
  // 应用冲突解决方案
  applyResolutions(localData, remoteData, resolutions, dataType) {
    if (!resolutions) {
      return localData; // 用户取消，使用本地数据
    }
    
    let resolvedData = JSON.parse(JSON.stringify(localData)); // 深拷贝
    
    resolutions.forEach(({ conflict, resolution }) => {
      if (dataType === 'attendanceRecords') {
        if (resolution === 'remote') {
          // 使用远程数据替换本地数据
          resolvedData[conflict.localIndex] = conflict.remoteRecord;
        } else if (resolution === 'merge') {
          // 智能合并：保留最新的时间戳
          const localTime = new Date(conflict.localRecord.timestamp || 0);
          const remoteTime = new Date(conflict.remoteRecord.timestamp || 0);
          resolvedData[conflict.localIndex] = localTime > remoteTime ? conflict.localRecord : conflict.remoteRecord;
        }
        // 'local' 选项不需要修改，保持本地数据
      } else if (dataType === 'groups') {
        if (resolution === 'remote') {
          resolvedData[conflict.groupName] = conflict.remoteMembers;
        } else if (resolution === 'merge') {
          // 智能合并：合并成员列表，去重
          const localMembers = conflict.localMembers || [];
          const remoteMembers = conflict.remoteMembers || [];
          const mergedMembers = [...localMembers];
          
          remoteMembers.forEach(remoteMember => {
            const exists = mergedMembers.some(localMember => 
              localMember.id === remoteMember.id || 
              (localMember.name === remoteMember.name && localMember.phone === remoteMember.phone)
            );
            if (!exists) {
              mergedMembers.push(remoteMember);
            }
          });
          
          resolvedData[conflict.groupName] = mergedMembers;
        }
      }
    });
    
    return resolvedData;
  }
};

// 数据合并策略
const DataMergeStrategy = {
  // 合并签到记录
  mergeAttendanceRecords(localRecords, remoteRecords) {
    const merged = [...(Array.isArray(remoteRecords) ? remoteRecords : [])];
    
    (Array.isArray(localRecords) ? localRecords : []).forEach(localRecord => {
      // 查找是否已存在相同的记录
      const existingIndex = merged.findIndex(remoteRecord => {
        // 通过ID匹配
        if (remoteRecord.id && localRecord.id && remoteRecord.id === localRecord.id) {
          return true;
        }
        // 通过姓名、组别匹配（签到记录没有date字段，时间可能被编辑）
        if (!remoteRecord.id && !localRecord.id) {
          // 首先检查姓名和组别是否匹配
          if (remoteRecord.name === localRecord.name && remoteRecord.group === localRecord.group) {
            // 如果时间也匹配，肯定是同一条记录
            if (remoteRecord.time === localRecord.time) {
              return true;
            }
            // 如果时间不匹配，检查是否是同一天的记录（可能是编辑时间）
            const remoteDate = new Date(remoteRecord.time).toDateString();
            const localDate = new Date(localRecord.time).toDateString();
            if (remoteDate === localDate) {
              // 同一天，可能是编辑时间，认为是同一条记录
              console.log('检测到可能的编辑时间记录:', {
                name: localRecord.name,
                group: localRecord.group,
                originalTime: remoteRecord.time,
                newTime: localRecord.time
              });
              return true;
            }
          }
          return false;
        }
        return false;
      });
      
      if (existingIndex !== -1) {
        // 记录已存在，检查是否需要更新
        const existingRecord = merged[existingIndex];
        if (JSON.stringify(localRecord) !== JSON.stringify(existingRecord)) {
          // 记录内容不同，标记为冲突
          console.log('发现签到记录冲突:', localRecord, existingRecord);
        }
        // 使用本地数据（本地数据优先）
        merged[existingIndex] = localRecord;
      } else {
        // 新记录，直接添加
        merged.push(localRecord);
      }
    });
    
    return merged;
  },
  
  // 合并小组数据
  mergeGroups(localGroups, remoteGroups) {
    const merged = { ...(typeof remoteGroups === 'object' && remoteGroups !== null ? remoteGroups : {}) };
    
    Object.keys(typeof localGroups === 'object' && localGroups !== null ? localGroups : {}).forEach(groupName => {
      if (!merged[groupName]) {
        // 新小组，直接添加
        merged[groupName] = [...(localGroups[groupName] || [])];
      } else {
        // 小组已存在，合并成员
        const localMembers = localGroups[groupName] || [];
        const remoteMembers = merged[groupName] || [];
        const mergedMembers = [...remoteMembers];
        
        localMembers.forEach(localMember => {
          const existingIndex = mergedMembers.findIndex(remoteMember => 
            remoteMember.id === localMember.id || 
            (remoteMember.name === localMember.name && remoteMember.phone === localMember.phone)
          );
          
          if (existingIndex !== -1) {
            // 成员已存在，检查是否需要更新
            const existingMember = mergedMembers[existingIndex];
            // 暂时禁用冲突检测，直接使用本地数据
            // 使用本地数据（本地数据优先）
            mergedMembers[existingIndex] = localMember;
          } else {
            // 新成员，直接添加
            mergedMembers.push(localMember);
          }
        });
        
        merged[groupName] = mergedMembers;
      }
    });
    
    return merged;
  },
  
  // 合并小组名称
  mergeGroupNames(localNames, remoteNames) {
    // 处理对象类型的小组名称数据
    let localArray = [];
    let remoteArray = [];
    
    // 如果是对象，提取键名作为数组
    if (typeof localNames === 'object' && localNames !== null && !Array.isArray(localNames)) {
      localArray = Object.keys(localNames);
    } else if (Array.isArray(localNames)) {
      localArray = localNames;
    }
    
    if (typeof remoteNames === 'object' && remoteNames !== null && !Array.isArray(remoteNames)) {
      remoteArray = Object.keys(remoteNames);
    } else if (Array.isArray(remoteNames)) {
      remoteArray = remoteNames;
    }
    
    const merged = [...remoteArray];
    
    localArray.forEach(localName => {
      if (!merged.includes(localName)) {
        merged.push(localName);
      }
    });
    
    return merged.sort();
  }
};

// 安全的数据同步函数 - 带真正的数据合并和冲突检测
async function safeSyncToFirebase(localData, dataType) {
  try {
    const db = firebase.database();
    const remoteRef = db.ref(dataType);
    
    // 获取远程数据
    const remoteSnapshot = await remoteRef.once('value');
    let remoteData = remoteSnapshot.val();
    
    // 确保远程数据格式正确
    if (dataType === 'attendanceRecords') {
      // 签到记录应该是数组
      if (!remoteData) {
        remoteData = [];
      } else if (typeof remoteData === 'object' && !Array.isArray(remoteData)) {
        // 如果是对象，转换为数组
        remoteData = Object.values(remoteData);
      }
    } else if (dataType === 'groups' || dataType === 'groupNames') {
      // 组数据应该是对象
      if (!remoteData) {
        remoteData = {};
      }
    }
    
    // 检测数据冲突
    const conflicts = DataConflictResolver.detectConflicts(localData, remoteData, dataType);
    
    let finalData;
    
    // 如果有冲突，显示解决对话框
    if (conflicts.length > 0) {
      console.log(`发现 ${conflicts.length} 个数据冲突，等待用户解决...`);
      const resolutions = await DataConflictResolver.resolveConflicts(conflicts, dataType);
      finalData = DataConflictResolver.applyResolutions(localData, remoteData, resolutions, dataType);
    } else {
      // 没有冲突，进行数据合并
      switch (dataType) {
        case 'attendanceRecords':
          finalData = DataMergeStrategy.mergeAttendanceRecords(localData, remoteData);
          break;
        case 'groups':
          finalData = DataMergeStrategy.mergeGroups(localData, remoteData);
          break;
        case 'groupNames':
          finalData = DataMergeStrategy.mergeGroupNames(localData, remoteData);
          break;
        default:
          finalData = localData;
      }
    }
    
    // 保存最终数据
    await remoteRef.set(finalData);
    
    // 验证同步是否成功
    const verifySnapshot = await remoteRef.once('value');
    const verifyData = verifySnapshot.val();
    
    // 比较数据是否一致（使用多种方法验证）
    let isSyncSuccess = false;
    
    // 首先尝试深度比较
    try {
      isSyncSuccess = deepEqual(finalData, verifyData);
    } catch (error) {
      console.log('深度比较失败，使用备用验证方法:', error);
      // 备用验证：检查数据大小和基本结构
      if (dataType === 'attendanceRecords') {
        isSyncSuccess = Array.isArray(finalData) && Array.isArray(verifyData) && 
                       finalData.length === verifyData.length;
      } else if (dataType === 'groups' || dataType === 'groupNames') {
        isSyncSuccess = typeof finalData === 'object' && typeof verifyData === 'object' &&
                       Object.keys(finalData).length === Object.keys(verifyData).length;
      }
    }
    
    if (isSyncSuccess) {
      console.log(`✅ ${dataType}数据已成功同步到Firebase`);
      // 更新同步状态到本地存储
      localStorage.setItem(`msh_${dataType}_sync_status`, JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        dataHash: JSON.stringify(finalData).length,
        syncSuccess: true,
        conflictsResolved: conflicts.length
      }));
      return finalData;
    } else {
      // 添加调试信息
      console.error(`❌ ${dataType}数据同步验证失败`);
      console.log('发送的数据:', finalData);
      console.log('验证的数据:', verifyData);
      console.log('数据类型:', typeof finalData, typeof verifyData);
      
      // 对于groups数据，使用更宽松的验证
      if (dataType === 'groups') {
        console.log('使用宽松验证groups数据...');
        const isGroupsValid = validateGroupsData(finalData, verifyData);
        if (isGroupsValid) {
          console.log(`✅ ${dataType}数据通过宽松验证`);
          localStorage.setItem(`msh_${dataType}_sync_status`, JSON.stringify({
            lastSyncTime: new Date().toISOString(),
            dataHash: JSON.stringify(finalData).length,
            syncSuccess: true,
            conflictsResolved: conflicts.length
          }));
          return finalData;
        }
      }
      
      throw new Error(`${dataType}数据同步验证失败`);
    }
    
  } catch (error) {
    console.error(`安全同步${dataType}到Firebase失败:`, error);
    // 记录同步失败状态
    localStorage.setItem(`msh_${dataType}_sync_status`, JSON.stringify({
      lastSyncTime: new Date().toISOString(),
      syncSuccess: false,
      error: error.message
    }));
    throw error;
  }
}

// 页面跳转同步管理
const PageNavigationSync = {
  // 检查是否正在同步
  isSyncing: false,
  
  // 页面跳转前同步
  async syncBeforeNavigation(targetUrl) {
    if (this.isSyncing) {
      console.log('正在同步中，等待完成...');
      return false;
    }
    
    this.isSyncing = true;
    
    try {
      // 显示同步提示
      const syncModal = this.showSyncModal('正在同步数据，请稍候...');
      
      // 同步所有数据
      const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
      const syncResults = [];
      
      for (const dataType of dataTypes) {
        const localData = JSON.parse(localStorage.getItem(`msh_${dataType}`) || '[]');
        if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
          try {
            // 对于groups和groupNames使用直接覆盖方式，避免验证问题
            if (dataType === 'groups' || dataType === 'groupNames') {
              const db = firebase.database();
              await db.ref(dataType).set(localData);
              console.log(`✅ ${dataType}数据已直接同步到Firebase`);
            } else {
              await safeSyncToFirebase(localData, dataType);
            }
            syncResults.push({ dataType, success: true });
          } catch (error) {
            syncResults.push({ dataType, success: false, error: error.message });
          }
        }
      }
      
      // 检查同步结果
      const failedSyncs = syncResults.filter(result => !result.success);
      
      if (failedSyncs.length > 0) {
        this.hideSyncModal(syncModal);
        const errorMessage = '同步失败的数据类型：\n' + 
          failedSyncs.map(f => `${f.dataType}: ${f.error}`).join('\n') + 
          '\n\n是否仍要继续跳转？';
        
        if (!confirm(errorMessage)) {
          this.isSyncing = false;
          return false;
        }
      }
      
      this.hideSyncModal(syncModal);
      this.isSyncing = false;
      return true;
      
    } catch (error) {
      this.hideSyncModal(syncModal);
      this.isSyncing = false;
      console.error('页面跳转同步失败:', error);
      return false;
    }
  },
  
  // 显示同步模态框
  showSyncModal(message) {
    const modal = document.createElement('div');
    modal.id = 'syncModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 30px; border-radius: 10px;
      text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 20px;">${message}</div>
      <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    return modal;
  },
  
  // 隐藏同步模态框
  hideSyncModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  },
  
  // 页面关闭前同步确认
  async syncBeforeClose(event) {
    // 检查是否有未同步的数据
    if (window.utils && window.utils.SyncStatusManager) {
      const hasUnsynced = window.utils.SyncStatusManager.hasUnsyncedData();
      
      if (hasUnsynced) {
        // 阻止默认关闭行为
        event.preventDefault();
        event.returnValue = '';
        
        // 显示同步确认对话框
        const shouldSync = confirm('检测到未同步的数据！\n\n是否在关闭页面前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接关闭');
        
        if (shouldSync) {
          const syncSuccess = await this.syncBeforeNavigation(null);
          if (syncSuccess) {
            // 同步成功，允许关闭
            window.removeEventListener('beforeunload', this.syncBeforeClose);
            window.close();
          } else {
            // 同步失败，继续阻止关闭
            return '';
          }
        } else {
          // 用户选择不同步，显示警告
          const forceClose = confirm('⚠️ 警告：未同步的数据可能会丢失！\n\n确定要直接关闭页面吗？');
          if (forceClose) {
            window.removeEventListener('beforeunload', this.syncBeforeClose);
            window.close();
          } else {
            return '';
          }
        }
      }
    }
    
    return '';
  }
};

// 同步状态管理
const SyncStatusManager = {
  // 检查数据同步状态
  checkSyncStatus: function(dataType) {
    const statusKey = `msh_${dataType}_sync_status`;
    const status = localStorage.getItem(statusKey);
    
    if (!status) {
      return {
        hasSyncStatus: false,
        message: '未找到同步状态记录'
      };
    }
    
    try {
      const syncStatus = JSON.parse(status);
      const lastSyncTime = new Date(syncStatus.lastSyncTime);
      const now = new Date();
      const timeDiff = now - lastSyncTime;
      
      if (syncStatus.syncSuccess) {
        return {
          hasSyncStatus: true,
          isSuccess: true,
          lastSyncTime: syncStatus.lastSyncTime,
          timeDiff: timeDiff,
          message: `最后同步成功: ${lastSyncTime.toLocaleString()}`
        };
      } else {
        return {
          hasSyncStatus: true,
          isSuccess: false,
          lastSyncTime: syncStatus.lastSyncTime,
          error: syncStatus.error,
          message: `最后同步失败: ${lastSyncTime.toLocaleString()} - ${syncStatus.error}`
        };
      }
    } catch (error) {
      return {
        hasSyncStatus: false,
        message: '同步状态数据格式错误'
      };
    }
  },
  
  // 获取所有数据类型的同步状态
  getAllSyncStatus: function() {
    const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
    const statuses = {};
    
    dataTypes.forEach(dataType => {
      statuses[dataType] = this.checkSyncStatus(dataType);
    });
    
    return statuses;
  },
  
  // 检查是否有未同步的数据
  hasUnsyncedData: function() {
    const statuses = this.getAllSyncStatus();
    
    for (const dataType in statuses) {
      const status = statuses[dataType];
      if (!status.hasSyncStatus || !status.isSuccess) {
        return true;
      }
    }
    
    return false;
  },
  
  // 显示同步状态警告
  showSyncWarning: function() {
    const statuses = this.getAllSyncStatus();
    const warnings = [];
    
    for (const dataType in statuses) {
      const status = statuses[dataType];
      if (!status.hasSyncStatus || !status.isSuccess) {
        warnings.push(`${dataType}: ${status.message}`);
      }
    }
    
    if (warnings.length > 0) {
      const message = '⚠️ 数据同步警告:\n\n' + warnings.join('\n') + '\n\n建议在清理缓存前确保数据已同步到Firebase。';
      alert(message);
      return true;
    }
    
    return false;
  }
};

// 主动同步按钮管理
const SyncButtonManager = {
  button: null,
  hasLocalChanges: false,
  
  // 创建同步按钮
  createSyncButton() {
    const button = document.createElement('button');
    button.id = 'syncButton';
    button.innerHTML = '✅ 已同步';
    button.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      padding: 10px 15px; border: none; border-radius: 5px;
      background: #28a745; color: white; cursor: pointer;
      font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease; display: none;
    `;
    
    // 5秒后显示按钮
    setTimeout(() => {
      button.style.display = 'block';
      this.updateButtonStatus();
    }, 5000);
    
    // 点击事件
    button.addEventListener('click', async () => {
      await this.performSync(button);
    });
    
    document.body.appendChild(button);
    this.button = button;
    return button;
  },
  
  // 标记本地数据有更改
  markLocalChanges() {
    this.hasLocalChanges = true;
    this.updateButtonStatus();
  },
  
  // 更新按钮状态
  updateButtonStatus() {
    if (!this.button) return;
    
    if (this.hasLocalChanges) {
      this.button.innerHTML = '🔄 同步';
      this.button.style.background = '#6c757d';
    } else {
      this.button.innerHTML = '✅ 已同步';
      this.button.style.background = '#28a745';
    }
  },
  
  // 执行同步
  async performSync(button) {
    if (PageNavigationSync.isSyncing) {
      alert('正在同步中，请稍候...');
      return;
    }
    
    PageNavigationSync.isSyncing = true;
    
    try {
      // 更新按钮状态
      button.innerHTML = '🔄 同步中...';
      button.style.background = '#ffc107';
      button.disabled = true;
      
      // 同步所有数据
      const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
      const syncResults = [];
      
      for (const dataType of dataTypes) {
        const localData = JSON.parse(localStorage.getItem(`msh_${dataType}`) || '[]');
        if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
          try {
            // 对于groups和groupNames使用直接覆盖方式，避免验证问题
            if (dataType === 'groups' || dataType === 'groupNames') {
              const db = firebase.database();
              await db.ref(dataType).set(localData);
              console.log(`✅ ${dataType}数据已直接同步到Firebase`);
            } else {
              await safeSyncToFirebase(localData, dataType);
            }
            syncResults.push({ dataType, success: true });
          } catch (error) {
            syncResults.push({ dataType, success: false, error: error.message });
          }
        }
      }
      
      // 检查同步结果
      const failedSyncs = syncResults.filter(result => !result.success);
      
      if (failedSyncs.length === 0) {
        // 全部成功
        this.hasLocalChanges = false;
        button.innerHTML = '✅ 同步成功';
        button.style.background = '#28a745';
        setTimeout(() => {
          this.updateButtonStatus();
        }, 3000);
      } else {
        // 部分失败
        button.innerHTML = '❌ 同步失败';
        button.style.background = '#dc3545';
        setTimeout(() => {
          this.updateButtonStatus();
        }, 3000);
        
        // 显示错误详情
        const errorMessage = '同步失败的数据类型：\n' + 
          failedSyncs.map(f => `${f.dataType}: ${f.error}`).join('\n');
        alert(errorMessage);
      }
      
    } catch (error) {
      button.innerHTML = '❌ 同步失败';
      button.style.background = '#dc3545';
      setTimeout(() => {
        this.updateButtonStatus();
      }, 3000);
      
      alert('同步失败: ' + error.message);
    } finally {
      PageNavigationSync.isSyncing = false;
      button.disabled = false;
    }
  }
};

// 唯一标识符管理
const IdentifierManager = {
  // 验证手机号码格式
  validatePhoneNumber: function(phone) {
    if (!phone) return false;
    // 中国大陆手机号码正则表达式
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 检查手机号码是否已存在
  checkPhoneExists: function(phone, groups, excludeMember = null) {
    if (!phone) return false;
    
    for (const groupId in groups) {
      if (groups[groupId]) {
        for (const member of groups[groupId]) {
          if (member.phone === phone) {
            // 如果是同一个成员（编辑时），不算重复
            if (excludeMember && member === excludeMember) {
              continue;
            }
            return true;
          }
        }
      }
    }
    return false;
  },

  // 生成唯一ID（如果不存在）
  ensureUniqueId: function(member, groupId) {
    if (!member.id) {
      // 如果没有ID，生成一个
      const prefix = getGroupPrefix(groupId);
      const existingIds = this.getAllExistingIds();
      let newId;
      let counter = 1;
      
      do {
        newId = prefix + String(counter).padStart(3, '0');
        counter++;
      } while (existingIds.has(newId));
      
      member.id = newId;
    }
    return member.id;
  },

  // 获取所有现有ID
  getAllExistingIds: function() {
    const ids = new Set();
    // 这里需要访问全局groups变量，在实际使用时传入
    return ids;
  },

  // 验证成员标识符
  validateMemberIdentifiers: function(member, groups, excludeMember = null) {
    const errors = [];
    
    // 验证手机号码
    if (member.phone && !this.validatePhoneNumber(member.phone)) {
      errors.push('手机号码格式不正确');
    }
    
    // 检查手机号码重复
    if (member.phone && this.checkPhoneExists(member.phone, groups, excludeMember)) {
      errors.push('手机号码已存在');
    }
    
    return errors;
  }
};

// 获取小组前缀（从admin.js复制）
function getGroupPrefix(groupId) {
  const groupPrefixes = {
    '陈薛尚': 'AA', '乐清1组': 'AB', '乐清2组': 'AC', '乐清3组': 'AD',
    '乐清4组': 'AE', '乐清5组': 'AF', '乐清6组': 'AG', '乐清7组': 'AH',
    '乐清8组': 'AI', '乐清9组': 'AJ', '乐清10组': 'AK', '美团组': 'AL',
        'group0': 'AM'
  };
  if (groupPrefixes[groupId]) return groupPrefixes[groupId];
  const usedPrefixes = new Set(Object.values(groupPrefixes));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const prefix = letters[i] + letters[j];
      if (!usedPrefixes.has(prefix)) return prefix;
    }
  }
  return 'ZZ'; // Fallback
}

// 异步数据同步增强
class AsyncDataSync {
  constructor() {
    this.workerManager = null;
    this.syncQueue = [];
    this.isProcessing = false;
  }

  // 初始化Worker管理器
  initWorkerManager() {
    if (window.workerManager && !this.workerManager) {
      this.workerManager = window.workerManager;
    }
  }

  // 异步数据同步
  async syncDataAsync(localData, remoteData, conflictResolution = 'newest') {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程同步');
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'SYNC_DATA',
        data: {
          localData,
          remoteData,
          conflictResolution
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步同步失败:', error);
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }
  }

  // 主线程数据同步（回退方案）
  syncDataMainThread(localData, remoteData, conflictResolution) {
    const startTime = performance.now();
    
    try {
      const conflicts = DataConflictResolver.detectConflicts(localData, remoteData, 'attendanceRecords');
      const mergedData = DataMergeStrategy.mergeData(localData, remoteData, conflictResolution);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return {
        mergedData,
        conflicts,
        processingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('主线程同步失败:', error);
      throw error;
    }
  }

  // 异步大数据集处理
  async processLargeDatasetAsync(dataset, operation, options) {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程处理');
      return this.processLargeDatasetMainThread(dataset, operation, options);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'PROCESS_LARGE_DATASET',
        data: {
          dataset,
          operation,
          options
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步处理失败:', error);
      return this.processLargeDatasetMainThread(dataset, operation, options);
    }
  }

  // 主线程大数据集处理（回退方案）
  processLargeDatasetMainThread(dataset, operation, options) {
    const startTime = performance.now();
    
    let result;
    switch (operation) {
      case 'SORT':
        result = dataset.sort((a, b) => {
          const aVal = a[options.key];
          const bVal = b[options.key];
          return options.order === 'desc' ? bVal > aVal : aVal > bVal;
        });
        break;
      case 'FILTER':
        result = dataset.filter(item => {
          switch (options.filter) {
            case 'equals':
              return item[options.field] === options.value;
            case 'contains':
              return item[options.field] && item[options.field].includes(options.value);
            default:
              return true;
          }
        });
        break;
      case 'SEARCH':
        result = dataset.filter(item => 
          options.fields.some(field => 
            item[field] && item[field].toLowerCase().includes(options.query.toLowerCase())
          )
        );
        break;
      default:
        result = dataset;
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      result,
      operation,
      processingTime,
      timestamp: Date.now()
    };
  }
}

// 创建全局异步同步实例
const asyncDataSync = new AsyncDataSync();

// 统一的数据保存函数
function saveDataToLocalStorage(dataType, data) {
  try {
    localStorage.setItem(`msh_${dataType}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`保存${dataType}到本地存储失败:`, error);
    return false;
  }
}

// 简化的数据引用管理器
const DataReferenceManager = {
  // 直接同步到Firebase（简化版本）
  async directSyncToFirebase(data, dataType) {
    try {
      // 设置全局同步标志，防止监听器触发
      window.isSyncingToFirebase = true;
      
      const db = firebase.database();
      await db.ref(dataType).set(data);
      console.log(`✅ ${dataType}数据已直接同步到Firebase`);
      
      // 延迟重置同步标志
      setTimeout(() => {
        window.isSyncingToFirebase = false;
        console.log(`${dataType}数据直接同步完成，重置同步标志`);
      }, 1000);
      
      return true;
    } catch (error) {
      console.error(`❌ ${dataType}数据同步到Firebase失败:`, error);
      // 确保在错误情况下也重置标志
      window.isSyncingToFirebase = false;
      return false;
    }
  },

  // 批量直接同步
  async batchDirectSync(dataMap) {
    const results = {};
    for (const [dataType, data] of Object.entries(dataMap)) {
      results[dataType] = await this.directSyncToFirebase(data, dataType);
    }
    return results;
  },

  // 签到记录管理（基于引用）
  attendanceRecords: {
    add(record) {
      // 直接添加到全局数组
      if (typeof window !== 'undefined' && window.attendanceRecords) {
        window.attendanceRecords.push(record);
        // 立即同步到Firebase
        this.directSyncToFirebase(window.attendanceRecords, 'attendanceRecords');
        return true;
      }
      return false;
    },

    remove(recordToRemove) {
      if (typeof window !== 'undefined' && window.attendanceRecords) {
        const index = window.attendanceRecords.findIndex(record => 
          record.name === recordToRemove.name && 
          record.time === recordToRemove.time &&
          record.group === recordToRemove.group
        );
        if (index !== -1) {
          window.attendanceRecords.splice(index, 1);
          // 立即同步到Firebase
          this.directSyncToFirebase(window.attendanceRecords, 'attendanceRecords');
          return true;
        }
      }
      return false;
    },

    update(oldRecord, newRecord) {
      if (typeof window !== 'undefined' && window.attendanceRecords) {
        const index = window.attendanceRecords.findIndex(record => 
          record.name === oldRecord.name && 
          record.time === oldRecord.time &&
          record.group === oldRecord.group
        );
        if (index !== -1) {
          window.attendanceRecords[index] = newRecord;
          // 立即同步到Firebase
          this.directSyncToFirebase(window.attendanceRecords, 'attendanceRecords');
          return true;
        }
      }
      return false;
    }
  },

  // 小组数据管理（基于引用）
  groups: {
    addMember(groupId, member) {
      if (typeof window !== 'undefined' && window.groups) {
        if (!window.groups.hasOwnProperty(groupId)) {
          window.groups[groupId] = [];
        }
        window.groups[groupId].push(member);
        // 立即同步到Firebase
        this.directSyncToFirebase(window.groups, 'groups');
        return true;
      }
      return false;
    },

    removeMember(groupId, memberIndex) {
      if (typeof window !== 'undefined' && window.groups && window.groups[groupId]) {
        window.groups[groupId].splice(memberIndex, 1);
        // 立即同步到Firebase
        this.directSyncToFirebase(window.groups, 'groups');
        return true;
      }
      return false;
    },

    moveMember(fromGroup, toGroup, memberIndex) {
      if (typeof window !== 'undefined' && window.groups) {
        const member = window.groups[fromGroup][memberIndex];
        if (member) {
          window.groups[fromGroup].splice(memberIndex, 1);
          if (!window.groups.hasOwnProperty(toGroup)) {
            window.groups[toGroup] = [];
          }
          window.groups[toGroup].push(member);
          // 立即同步到Firebase
          this.directSyncToFirebase(window.groups, 'groups');
          return true;
        }
      }
      return false;
    }
  }
};

// 导出函数到全局作用域
if (typeof window !== 'undefined') {
  window.utils = {
    // 日期时间工具
    getLocalDateString,
    getLocalDateFromISO,
    // Firebase初始化
    initializeFirebase,
    // 防重复提交机制
    preventDuplicateExecution,
    createSafeSaveFunction,
    createSafeSyncFunction,
    createSafeDeleteFunction,
    // 其他工具函数
    loadExcludedMembers,
    sortGroups,
    sortMembersByName,
    isMemberExcluded,
    filterExcludedMembers,
    getDisplayName,
    getAttendanceType,
    formatDateToChinese,
    getTodayString,
    formatDateForDisplay,
    getStatusText,
    initializePageSyncManager,
    isTodayNewcomer,
    deepEqual,
    hasSignificantMemberDifference,
    validateGroupsData,
    dataSyncManager,
    safeSyncToFirebase,
    SyncStatusManager,
    PageNavigationSync,
    SyncButtonManager,
    DataConflictResolver,
    DataMergeStrategy,
    IdentifierManager,
    AsyncDataSync,
    asyncDataSync,
    DataReferenceManager,
    saveDataToLocalStorage,
    UUIDIndex,
    Logger,
    SundayTrackingManager,
    generateMemberUUID,
    generateUUID,
    addUUIDsToMembers,
    addMemberUUIDsToAttendanceRecords,
    // 新增的缺勤事件管理函数
    identifyAbsenceEvents,
    updateExistingEvents,
    getLastAttendanceDate,
    shouldGenerateEvent,
    isAfterSundayCutoff,
    // 新增的统一同步管理器
    PageSyncManager,
    SmartDataSyncManager,
    SYNC_CONFIG,
    // 数据加密管理器
    DataEncryption,
    EncryptedStorage
  };

}
