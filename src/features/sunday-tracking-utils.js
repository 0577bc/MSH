/**
 * SundayTrackingManager（简化版）
 * 2025-11-12
 *
 * 说明：
 * - 缺勤事件的计算与写入已经迁移到独立的“缺勤计算工具”（absence-calculator）
 * - 此管理器专注于：读取/写入缺勤事件、回访记录及常用日期工具函数
 * - 旧的自动生成、增量计算逻辑全部移除，保留同名方法仅输出弃用警告
 */

const SundayTrackingManager = {
  _cache: {
    records: null,
    lastLoaded: 0,
    ttl: 60 * 1000, // 1分钟缓存
    lastFirebaseSync: 0
  },

  _listenerInitialized: false,

  /**
   * 清空跟踪记录缓存
   */
  _clearCache: function() {
    this._cache.records = null;
    this._cache.lastLoaded = 0;
    this._cache.lastFirebaseSync = 0;
    console.log('🧹 SundayTrackingManager: 缓存已清除');
  },

  /**
   * 清空考勤缓存（保持兼容，等同于 _clearCache）
   */
  _clearAttendanceCache: function() {
    this._clearCache();
  },

  /**
   * 读取 localStorage 中的跟踪记录
   */
  _loadFromStorage: function() {
    try {
      const stored = localStorage.getItem('msh_sunday_tracking');
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ SundayTrackingManager: 本地跟踪记录格式异常，已忽略', parsed);
        return [];
      }
      const deduped = [];
      const seen = new Set();
      parsed.forEach((item) => {
        if (item && typeof item === 'object' && item.recordId) {
          if (!seen.has(item.recordId)) {
            seen.add(item.recordId);
            deduped.push(item);
          }
        }
      });
      return deduped;
    } catch (error) {
      console.error('❌ SundayTrackingManager: 读取本地跟踪记录失败', error);
      return [];
    }
  },

  /**
   * 写入 localStorage
   */
  _writeToStorage: function(records) {
    try {
      if (!Array.isArray(records)) {
        throw new Error('records 必须为数组');
      }
      localStorage.setItem('msh_sunday_tracking', JSON.stringify(records));
      window.trackingRecords = records;
      return true;
    } catch (error) {
      console.error('❌ SundayTrackingManager: 写入本地跟踪记录失败', error);
      return false;
    }
  },

  /**
   * 同步单条记录到 Firebase
   */
  _syncRecordToFirebase: function(record) {
    if (!window.db || !record || !record.recordId) {
      return;
    }
    try {
      window.db
        .ref(`trackingRecords/${record.recordId}`)
        .update(record);
      this._cache.lastFirebaseSync = Date.now();
    } catch (error) {
      console.error('❌ SundayTrackingManager: 同步跟踪记录到Firebase失败', error);
    }
  },

  /**
   * 获取全部缺勤事件
   */
  getTrackingRecords: function(options = {}) {
    const force = options.force === true;
    const now = Date.now();
    if (!force && Array.isArray(this._cache.records) && (now - this._cache.lastLoaded) < this._cache.ttl) {
      return [...this._cache.records];
    }
    const records = this._loadFromStorage();
    this._cache.records = records;
    this._cache.lastLoaded = now;
    window.trackingRecords = records;
    return [...records];
  },

  /**
   * 获取单条缺勤事件
   */
  getTrackingRecord: function(recordId) {
    if (!recordId) {
      console.warn('⚠️ SundayTrackingManager.getTrackingRecord 调用缺少 recordId');
      return null;
    }
    const records = this.getTrackingRecords();
    const match = records.find((item) => item && item.recordId === recordId) || null;
    if (!match) {
      console.warn(`⚠️ SundayTrackingManager: 未找到事件 ${recordId}`);
    }
    return match;
  },

  /**
   * 获取成员的全部缺勤事件
   */
  getMemberTrackingRecords: function(memberUUID) {
    if (!memberUUID) {
      return [];
    }
    return this.getTrackingRecords().filter((record) => record && record.memberUUID === memberUUID);
  },

  /**
   * 保存单条缺勤事件
   */
  saveTrackingRecord: function(record) {
    try {
      if (!record || typeof record !== 'object') {
        throw new Error('record 必须为对象');
      }
      if (!record.recordId) {
        throw new Error('record 缺少 recordId');
      }

      const now = new Date().toISOString();
      const normalized = {
        status: 'active',
        ...record,
        updatedAt: record.updatedAt || now
      };

      const records = this.getTrackingRecords({ force: true });
      const index = records.findIndex((item) => item.recordId === normalized.recordId);
      if (index >= 0) {
        records[index] = { ...records[index], ...normalized };
      } else {
        records.push(normalized);
      }

      if (!this._writeToStorage(records)) {
        return false;
      }

      this._cache.records = records;
      this._cache.lastLoaded = Date.now();

      const syncedRecord = index >= 0 ? records[index] : records[records.length - 1];
      this._syncRecordToFirebase(syncedRecord);
      return true;
    } catch (error) {
      console.error('❌ SundayTrackingManager.saveTrackingRecord 失败', error);
      return false;
    }
  },

  /**
   * 更新事件的最新回访记录
   */
  updateLatestFollowUp: function(recordId, followUpData = {}) {
    try {
      if (!recordId) {
        console.warn('⚠️ updateLatestFollowUp 调用缺少 recordId');
        return { success: false, reason: 'missing_record_id' };
      }
      const trackingRecord = this.getTrackingRecord(recordId);
      if (!trackingRecord) {
        return { success: false, reason: 'record_not_found' };
      }

      const sanitizedContent = (followUpData.content || '').trim();
      if (!sanitizedContent) {
        console.warn('⚠️ updateLatestFollowUp 缺少回访内容，已忽略');
        return { success: false, reason: 'missing_content' };
      }

      const now = new Date().toISOString();
      const submittedAt = followUpData.submittedAt || now;
      const createdAt = followUpData.createdAt || submittedAt;

      const newFollowUp = {
        recordId,
        memberUUID: followUpData.memberUUID || trackingRecord.memberUUID,
        content: sanitizedContent,
        source: followUpData.source || 'manual',
        submittedAt,
        createdAt,
        updatedAt: now
      };

      const existingFollowUp = trackingRecord.latestFollowUp;
      if (existingFollowUp && existingFollowUp.submittedAt) {
        try {
          const existingTime = new Date(existingFollowUp.submittedAt).getTime();
          const newTime = new Date(newFollowUp.submittedAt).getTime();
          if (!Number.isNaN(existingTime) && !Number.isNaN(newTime) && existingTime > newTime) {
            console.warn('⚠️ 新回访记录早于现有记录，已跳过更新');
            return { success: false, reason: 'older_than_existing' };
          }
        } catch (timeError) {
          console.warn('⚠️ 回访时间比较失败，继续执行更新', timeError);
        }
      }

      const updatedRecord = {
        ...trackingRecord,
        latestFollowUp: {
          ...existingFollowUp,
          ...newFollowUp
        },
        updatedAt: now
      };

      const saveResult = this.saveTrackingRecord(updatedRecord);
      if (!saveResult) {
        return { success: false, reason: 'save_failed' };
      }

      console.log(`✅ 事件 ${recordId} 最新回访记录已更新`);
      return { success: true };
    } catch (error) {
      console.error('❌ 更新最新回访记录失败:', error);
      return { success: false, reason: 'exception' };
    }
  },

  /**
   * 获取所有成员（排除 excluded 列表）
   */
  getAllMembers: function() {
    const groups = window.groups || {};
    const excluded = window.excludedMembers || {};
    const excludedIds = new Set(
      Array.isArray(excluded)
        ? excluded
        : Object.keys(excluded || {})
    );

    const members = [];
    Object.entries(groups).forEach(([groupKey, groupMembers]) => {
      if (!Array.isArray(groupMembers)) {
        return;
      }
      groupMembers.forEach((member) => {
        if (!member) {
          return;
        }
        const uuid = member.uuid || member.memberUUID || member.id || null;
        if (uuid && excludedIds.has(uuid)) {
          return;
        }
        members.push({
          uuid,
          name: member.name || member.memberName || '未知成员',
          group: groupKey,
          groupName: (window.groupNames && window.groupNames[groupKey]) || groupKey
        });
      });
    });
    return members;
  },

  /**
   * 判断是否为主日签到记录
   */
  isSundayAttendance: function(record) {
    if (!record || !record.time) {
      return false;
    }
    try {
      const date = new Date(record.time);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const minute = date.getMinutes();
      if (dayOfWeek !== 0) {
        return false;
      }
      if (hour < 9) return true;
      if (hour === 9) return true;
      if (hour === 10 && minute <= 40) return true;
      if (hour >= 11) return true;
      return false;
    } catch (error) {
      console.warn('⚠️ isSundayAttendance 解析记录失败', error);
      return false;
    }
  },

  /**
   * 日期工具函数
   */
  getNextSunday: function(currentDate) {
    const base = new Date(currentDate);
    const daysUntilSunday = (7 - base.getDay()) % 7;
    base.setDate(base.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    return base;
  },

  getPreviousSunday: function(currentDate) {
    const base = new Date(currentDate);
    const daysFromSunday = base.getDay();
    base.setDate(base.getDate() - (daysFromSunday === 0 ? 7 : daysFromSunday));
    return base;
  },

  getDateString: function(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  getLatestSundayDate: function() {
    const today = new Date();
    const latestSunday = this.getPreviousSunday(today);
    if (today.getDay() === 0) {
      latestSunday.setDate(latestSunday.getDate() - 7);
    }
    return this.getDateString(latestSunday);
  },

  getSundayDatesBetween: function(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sundays = [];
    let current = new Date(start);
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
    }
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (current <= end) {
      const currentDateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      if (currentDateOnly < todayDateOnly) {
        sundays.push(this.getDateString(current));
      }
      current.setDate(current.getDate() + 7);
    }
    return sundays;
  },

  getSundayDatesFromStart: function(startDate, endDate) {
    const sundayDates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
    }
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (current <= end) {
      const currentDateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      if (currentDateOnly < todayDateOnly) {
        sundayDates.push(new Date(current));
      }
      current.setDate(current.getDate() + 7);
    }
    return sundayDates;
  },

  /**
   * 监听跨标签页的 localStorage 变化
   */
  _initDataChangeListener: function() {
    if (this._listenerInitialized) {
      return;
    }
    window.addEventListener('storage', (event) => {
      if (!event || !event.key) {
        return;
      }
      if (event.key === 'msh_sunday_tracking' || event.key === 'msh_excludedMembers') {
        console.log(`📦 SundayTrackingManager: 检测到 ${event.key} 变更，清除缓存`);
        this._clearCache();
      }
    });
    this._listenerInitialized = true;
  },

  /**
   * 弃用方法统一输出提醒
   */
  _logDeprecated: function(methodName) {
    console.warn(`⚠️ SundayTrackingManager.${methodName} 已弃用，请使用缺勤计算工具生成事件。`);
  },

  // ===== 🧹 以下方法为兼容保留，仅输出弃用提示 =====
  generateTrackingList: async function() {
    this._logDeprecated('generateTrackingList');
    return this.getTrackingRecords();
  },

  generateTrackingListFromWeeklyCalculations: async function() {
    this._logDeprecated('generateTrackingListFromWeeklyCalculations');
    return this.getTrackingRecords();
  },

  calculateFirstWeek: async function() {
    this._logDeprecated('calculateFirstWeek');
    return [];
  },

  calculateIncrementalWeek: async function() {
    this._logDeprecated('calculateIncrementalWeek');
    return [];
  },

  cleanupOldWeeklyCalculations: async function() {
    this._logDeprecated('cleanupOldWeeklyCalculations');
  },

  initializeHistoricalDataAsyncIfNeeded: function() {
    this._logDeprecated('initializeHistoricalDataAsyncIfNeeded');
  },

  migrateDataWithUUID: function() {
    this._logDeprecated('migrateDataWithUUID');
  },

  saveModifiedData: function() {
    this._logDeprecated('saveModifiedData');
  },

  loadWeeklyCalculations: async function() {
    this._logDeprecated('loadWeeklyCalculations');
    return null;
  },

  saveWeeklyCalculations: async function() {
    this._logDeprecated('saveWeeklyCalculations');
    return false;
  },

  hasHistoricalCalculations: async function() {
    this._logDeprecated('hasHistoricalCalculations');
    return false;
  },

  findLatestCalculatedSunday: async function() {
    this._logDeprecated('findLatestCalculatedSunday');
    return null;
  }
};

if (typeof window.utils === 'undefined') {
  window.utils = {};
}

window.utils.SundayTrackingManager = SundayTrackingManager;
SundayTrackingManager._initDataChangeListener();

console.log('✅ SundayTrackingManager 已加载（缺勤计算改为工具驱动）');

