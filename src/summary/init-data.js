/**
 * 汇总页面 - 初始化和数据加载模块
 * 功能：Firebase初始化、DOM初始化、数据加载
 */

// ==================== Firebase初始化 ====================

/**
 * 初始化Firebase
 */
async function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    window.summaryPage.app = result.app;
    window.summaryPage.db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = result.db;
    console.log('✅ 汇总页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 汇总页面Firebase初始化失败');
    return false;
  }
}

// ==================== 页面同步管理器初始化 ====================

/**
 * 初始化页面同步管理器
 */
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    window.summaryPage.pageSyncManager = new window.utils.PageSyncManager('summary');
    console.log('汇总页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================

/**
 * 初始化DOM元素
 */
function initializeDOMElements() {
  const dom = window.summaryPage.dom;
  
  dom.backButton = document.getElementById('backButton');
  dom.backToSigninButton = document.getElementById('backToSigninButton');
  dom.exportButton = document.getElementById('exportButton');
  
  // 导航按钮
  dom.showDailyReport = document.getElementById('showDailyReport');
  dom.showSundayTracking = document.getElementById('showSundayTracking');
  dom.showQuarterlyReport = document.getElementById('showQuarterlyReport');
  dom.showYearlyReport = document.getElementById('showYearlyReport');
  
  // 日期选择器
  dom.dailyDateSelect = document.getElementById('dailyDateSelect');
  dom.quarterSelect = document.getElementById('quarterSelect');
  dom.yearSelect = document.getElementById('yearSelect');
  
  // 查看按钮
  dom.viewDailyReport = document.getElementById('viewDailyReport');
  dom.viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  dom.viewYearlyReport = document.getElementById('viewYearlyReport');
  
  // 报表section
  dom.dailyReportSection = document.getElementById('dailyReportSection');
  dom.quarterlyReportSection = document.getElementById('quarterlyReportSection');
  dom.yearlyReportSection = document.getElementById('yearlyReportSection');
  
  // 表格列表
  dom.dailyReportList = document.getElementById('dailyReportList');
  dom.quarterlyReportList = document.getElementById('quarterlyReportList');
  dom.yearlyReportList = document.getElementById('yearlyReportList');
}

// ==================== 基础数据加载（优化V2.0）====================

/**
 * 只加载基础数据：groups、groupNames、excludedMembers
 * 不加载attendanceRecords，减少90%数据传输量
 */
async function loadBasicDataOnly() {
  try {
    // 先初始化Firebase（如果还没有初始化）
    if (!firebase.apps.length && window.firebaseConfig) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase应用创建成功');
    }
    
    // 检查是否已有数据加载
    if (window.newDataManager?.isDataLoaded) {
      console.log("📋 从已加载的数据获取基础信息");
      window.summaryPage.groups = window.groups || {};
      window.summaryPage.groupNames = window.groupNames || {};
      // ⚠️ 强制从Firebase加载最新的excludedMembers数据
      await loadExcludedMembersFromFirebase();
      console.log("✅ 基础数据获取成功（不含签到记录）");
      return;
    }
    
    // 检查本地数据
    const hasLocalData = window.groups && Object.keys(window.groups).length > 0;
    if (hasLocalData) {
      console.log("📋 使用本地基础数据");
      window.summaryPage.groups = window.groups;
      window.summaryPage.groupNames = window.groupNames || {};
      // ⚠️ 强制从Firebase加载最新的excludedMembers数据
      await loadExcludedMembersFromFirebase();
      console.log("✅ 本地基础数据获取成功（不含签到记录）");
      return;
    }
    
    // 从Firebase只加载基础数据
    console.log("🔄 从Firebase加载基础数据（不含签到记录）...");
    const db = firebase.database();
    
    const [groupsSnap, groupNamesSnap] = await Promise.all([
      db.ref('groups').once('value'),
      db.ref('groupNames').once('value')
    ]);
    
    window.summaryPage.groups = groupsSnap.val() || {};
    window.summaryPage.groupNames = groupNamesSnap.val() || {};
    
    // 保存到全局变量
    window.groups = window.summaryPage.groups;
    window.groupNames = window.summaryPage.groupNames;
    
    // 保存到本地存储
    localStorage.setItem('msh_groups', JSON.stringify(window.summaryPage.groups));
    localStorage.setItem('msh_group_names', JSON.stringify(window.summaryPage.groupNames));
    
    // 统计排除人员（从groups中的excluded标记）
    let excludedCount = 0;
    Object.keys(window.summaryPage.groups).forEach(groupId => {
      const members = window.summaryPage.groups[groupId] || [];
      excludedCount += members.filter(m => m.excluded === true || m.excluded === 'true').length;
    });
    
    console.log("✅ 基础数据加载完成", {
      groups: Object.keys(window.summaryPage.groups).length,
      groupNames: Object.keys(window.summaryPage.groupNames).length,
      excludedMembers: excludedCount + '（从成员标记统计）',
      attendanceRecords: "未加载（按需加载）"
    });
    
  } catch (error) {
    console.error("❌ 基础数据加载失败:", error);
    alert('数据加载失败，请刷新页面重试');
  }
}

/**
 * 从Firebase强制加载最新的excludedMembers数据（已废弃）
 * @deprecated 现在排除信息在成员对象的 excluded 属性中，随 groups 一起加载
 */
async function loadExcludedMembersFromFirebase() {
  console.log("✅ 排除人员数据已集成到成员对象中，无需单独加载");
  // 不再需要单独加载 excludedMembers
}

// ==================== 按需加载签到数据（优化V2.0）====================

/**
 * 按日期加载签到数据
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @returns {Array} 签到记录数组
 */
async function loadAttendanceDataForDate(date) {
  console.log(`🔄 加载 ${date} 的签到数据...`);
  
  // 检查sessionStorage缓存
  const cacheKey = `attendance_${date}`;
  let cached = sessionStorage.getItem(cacheKey);
  
  // 验证缓存数据，如果缓存为空数组则重新加载
  if (cached) {
    try {
      const cachedData = JSON.parse(cached);
      if (Array.isArray(cachedData) && cachedData.length > 0) {
        console.log(`✅ 使用缓存数据 ${date}:`, cachedData.length, '条记录');
        return cachedData;
      } else {
        console.log(`⚠️ 缓存数据为空数组，将重新加载`);
        sessionStorage.removeItem(cacheKey);
      }
    } catch (e) {
      console.error('缓存数据解析失败:', e);
      sessionStorage.removeItem(cacheKey);
    }
  }
  
  // 从Firebase加载
  try {
    const db = firebase.database();
    const snapshot = await db.ref('attendanceRecords').once('value');
    const allRecords = snapshot.val() || [];
    
    // 按日期过滤
    const records = allRecords.filter(record => {
      const recordDate = record.date || window.utils.getLocalDateFromISO(record.time);
      return recordDate === date;
    });
    
    console.log(`✅ 从Firebase加载 ${date} 数据:`, records.length, '条记录');
    
    // 缓存到sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify(records));
    
    return records;
  } catch (error) {
    console.error('加载签到数据失败:', error);
    return [];
  }
}

/**
 * 按日期范围加载签到数据
 * @param {string} startDate - 开始日期 YYYY-MM-DD
 * @param {string} endDate - 结束日期 YYYY-MM-DD
 * @returns {Array} 签到记录数组
 */
async function loadAttendanceDataForDateRange(startDate, endDate) {
  console.log(`🔄 加载日期范围数据: ${startDate} 到 ${endDate}`);
  
  // 检查缓存
  const cacheKey = `attendance_range_${startDate}_${endDate}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log(`✅ 使用缓存数据 (${startDate} ~ ${endDate}):`, JSON.parse(cached).length, '条记录');
    return JSON.parse(cached);
  }
  
  // 从Firebase加载
  try {
    const db = firebase.database();
    const snapshot = await db.ref('attendanceRecords').once('value');
    const allRecords = snapshot.val() || [];
    
    // 按日期范围过滤
    const records = allRecords.filter(record => {
      const recordDate = record.date || window.utils.getLocalDateFromISO(record.time);
      return recordDate >= startDate && recordDate <= endDate;
    });
    
    console.log(`✅ 从Firebase加载范围数据 (${startDate} ~ ${endDate}):`, records.length, '条记录');
    
    // 缓存数据
    sessionStorage.setItem(cacheKey, JSON.stringify(records));
    
    return records;
  } catch (error) {
    console.error('加载日期范围数据失败:', error);
    return [];
  }
}

// ==================== 导出到 window ====================
window.summaryPage.initializeFirebase = initializeFirebase;
window.summaryPage.initializePageSyncManager = initializePageSyncManager;
window.summaryPage.initializeDOMElements = initializeDOMElements;
window.summaryPage.loadBasicDataOnly = loadBasicDataOnly;
window.summaryPage.loadAttendanceDataForDate = loadAttendanceDataForDate;
window.summaryPage.loadAttendanceDataForDateRange = loadAttendanceDataForDateRange;

console.log('✅ 汇总页面 - 初始化和数据加载模块已加载');










