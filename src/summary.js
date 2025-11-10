/**
 * 汇总页面主文件 (summary.js)
 * 功能：数据汇总、报表展示、数据导出
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 全局变量和初始化 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let pageSyncManager; // 页面同步管理器

// 历史组别名称映射（用于兼容旧数据）
// 格式：{ "旧名称": "组别ID" }
// 通过UUID匹配验证，确保100%准确
const HISTORICAL_GROUP_NAMES = {
  '乐清1组': 'group3',  // 现在是"花园小家" (匹配度: 2/2人)
  '乐清2组': 'group4',  // 现在是"时代小家" (匹配度: 8/8人)
  '乐清3组': 'group5',  // 现在是"以勒小家" (匹配度: 5/5人)
  '七里港': 'group1',   // 现在是"阿茜组" (匹配度: 5/5人)
};

// DOM元素引用
let backButton, backToSigninButton, exportButton;
let showDailyReport, showSundayTracking, showQuarterlyReport, showYearlyReport;
let dailyDateSelect, quarterSelect, yearSelect;
let viewDailyReport, viewQuarterlyReport, viewYearlyReport;
let dailyReportSection, quarterlyReportSection, yearlyReportSection;
let dailyReportList, quarterlyReportList, yearlyReportList;

// 性能优化相关
let virtualScrollManager = null;
let useVirtualScroll = true;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = db;
    console.log('✅ 汇总页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 汇总页面Firebase初始化失败');
    return false;
  }
}

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('summary');
    console.log('汇总页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backButton = document.getElementById('backButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  exportButton = document.getElementById('exportButton');
  
  // 导航按钮
  showDailyReport = document.getElementById('showDailyReport');
  showSundayTracking = document.getElementById('showSundayTracking');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  // 日期选择器
  dailyDateSelect = document.getElementById('dailyDateSelect');
  quarterSelect = document.getElementById('quarterSelect');
  yearSelect = document.getElementById('yearSelect');
  
  // 查看按钮
  viewDailyReport = document.getElementById('viewDailyReport');
  viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  viewYearlyReport = document.getElementById('viewYearlyReport');
  
  // 报表section
  dailyReportSection = document.getElementById('dailyReportSection');
  quarterlyReportSection = document.getElementById('quarterlyReportSection');
  yearlyReportSection = document.getElementById('yearlyReportSection');
  
  // 表格列表
  dailyReportList = document.getElementById('dailyReportList');
  quarterlyReportList = document.getElementById('quarterlyReportList');
  yearlyReportList = document.getElementById('yearlyReportList');
}

document.addEventListener('DOMContentLoaded', async () => {
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 【优化V2.0】只加载基础数据，不加载签到记录
  await loadBasicDataOnly();
  
  // 🔧 修复：初始化页面状态（设置默认日期、显示section、加载今天的数据）
  await initializePage();
  
  // 🔔 监听数据更新事件，自动刷新页面数据
  window.addEventListener('attendanceRecordsUpdated', (event) => {
    console.log('🔔 汇总页面检测到签到记录更新事件:', event.detail);
    
    // 清除所有sessionStorage中的签到记录缓存
    clearAllAttendanceCache();
    
    // 根据当前显示的页面类型重新加载数据
    const currentSection = document.querySelector('section[style*="display: block"]');
    if (currentSection) {
      const sectionId = currentSection.id;
      console.log('🔄 重新加载当前页面数据:', sectionId);
      
      if (sectionId === 'dailyReportSection' && dailyReportDateInput && dailyReportDateInput.value) {
        loadDailyReportData(dailyReportDateInput.value);
      } else if (sectionId === 'quarterlyReportSection' && quarterSelect && quarterSelect.value) {
        loadQuarterlyReportData(quarterSelect.value);
      } else if (sectionId === 'yearlyReportSection' && yearSelect && yearSelect.value) {
        loadYearlyReportData(yearSelect.value);
      }
    }
  });
  
  console.log("✅ 汇总页面初始化完成（精简加载模式）");
  console.log('✅ 数据更新事件监听器已注册');
});

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
      groups = window.groups || {};
      groupNames = window.groupNames || {};
      // ⚠️ 强制从Firebase加载最新的excludedMembers数据
      await loadExcludedMembersFromFirebase();
      console.log("✅ 基础数据获取成功（不含签到记录）");
      return;
    }
    
    // 检查本地数据
    const hasLocalData = window.groups && Object.keys(window.groups).length > 0;
    if (hasLocalData) {
      console.log("📋 使用本地基础数据");
      groups = window.groups;
      groupNames = window.groupNames || {};
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
    
    groups = groupsSnap.val() || {};
    groupNames = groupNamesSnap.val() || {};
    
    // 保存到全局变量
    window.groups = groups;
    window.groupNames = groupNames;
    
    // 保存到本地存储
    localStorage.setItem('msh_groups', JSON.stringify(groups));
    localStorage.setItem('msh_group_names', JSON.stringify(groupNames));
    
    // 统计排除人员（从groups中的excluded标记）
    let excludedCount = 0;
    Object.keys(groups).forEach(groupId => {
      const members = groups[groupId] || [];
      excludedCount += members.filter(m => m.excluded === true || m.excluded === 'true').length;
    });
    
    console.log("✅ 基础数据加载完成", {
      groups: Object.keys(groups).length,
      groupNames: Object.keys(groupNames).length,
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
    const cachedData = JSON.parse(cached);
    if (cachedData && cachedData.length > 0) {
      console.log(`✅ 从缓存获取 ${date} 数据: ${cachedData.length} 条`);
      return cachedData;
    } else {
      console.log(`⚠️ 缓存数据为空，重新从Firebase加载`);
      sessionStorage.removeItem(cacheKey); // 清除空缓存
    }
  }
  
  // 从Firebase按日期查询
  try {
    const db = firebase.database();
    // 🔧 修复：构建本地时区的ISO字符串范围
    // date参数是本地日期（YYYY-MM-DD），需要转换为本地时间的ISO范围
    const localDateStart = new Date(`${date}T00:00:00`); // 本地时间00:00:00
    const localDateEnd = new Date(`${date}T23:59:59.999`); // 本地时间23:59:59.999
    const dateStart = localDateStart.toISOString();
    const dateEnd = localDateEnd.toISOString();
    
    console.log(`🔍 Firebase查询范围 (本地时间 ${date}): ${dateStart} - ${dateEnd}`);
    
    const snapshot = await db.ref('attendanceRecords')
      .orderByChild('time')
      .startAt(dateStart)
      .endAt(dateEnd)
      .once('value');
    
    const records = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    // 缓存到sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify(records));
    
    console.log(`✅ 加载了 ${records.length} 条 ${date} 的签到记录`);
    return records;
    
  } catch (error) {
    console.error(`❌ 加载 ${date} 签到数据失败:`, error);
    return [];
  }
}

/**
 * 按日期范围加载签到数据（用于季度/年度报表）
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期  
 * @returns {Array} 签到记录数组
 */
async function loadAttendanceDataForDateRange(startDate, endDate) {
  console.log(`🔄 加载日期范围 ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} 的签到数据...`);
  
  // 检查缓存
  const cacheKey = `attendance_range_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
  let cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    console.log(`✅ 从缓存获取范围数据`);
    return JSON.parse(cached);
  }
  
  try {
    const db = firebase.database();
    const dateStart = startDate.setHours(0, 0, 0, 0);
    const dateEnd = endDate.setHours(23, 59, 59, 999);
    
    const snapshot = await db.ref('attendanceRecords')
      .orderByChild('time')
      .startAt(new Date(dateStart).toISOString())
      .endAt(new Date(dateEnd).toISOString())
      .once('value');
    
    const records = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    // 缓存到sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify(records));
    
    console.log(`✅ 加载了 ${records.length} 条范围内的签到记录`);
    return records;
    
  } catch (error) {
    console.error(`❌ 加载范围签到数据失败:`, error);
    return [];
  }
}

// ==================== 数据加载和管理 ====================
// 旧的loadData函数已移除，现在使用NewDataManager

// ==================== 缓存管理函数 ====================
/**
 * 清除指定的缓存
 * @param {string} cacheKey - 缓存键名
 */
function clearCache(cacheKey) {
  sessionStorage.removeItem(cacheKey);
  console.log('✅ 已清除缓存:', cacheKey);
}

/**
 * 清除所有签到相关的缓存
 * 用于强制重新从Firebase加载最新数据
 */
function clearAllAttendanceCache() {
  // 清除所有以 'attendance_' 开头的缓存
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('attendance_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  console.log(`✅ 已清除 ${keysToRemove.length} 个签到缓存`);
  return keysToRemove.length;
}

/**
 * 重新加载当前显示的报表模块
 */
async function reloadCurrentSection() {
  // 判断当前显示的是哪个模块
  if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
    // 日报表
    const date = dailyDateSelect?.value || window.utils.getLocalDateString();
    console.log('🔄 重新加载日报表:', date);
    const records = await loadAttendanceDataForDate(date);
    loadDailyReport(date, records);
  } else if (quarterlyReportSection && !quarterlyReportSection.classList.contains('hidden-form')) {
    // 季度报表
    const quarter = quarterSelect?.value;
    if (quarter) {
      console.log('🔄 重新加载季度报表:', quarter);
      await loadQuarterlyReportData(quarter);
    }
  } else if (yearlyReportSection && !yearlyReportSection.classList.contains('hidden-form')) {
    // 年度报表
    const year = yearSelect?.value;
    if (year) {
      console.log('🔄 重新加载年度报表:', year);
      await loadYearlyReportData(year);
    }
  }
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.smartNavigateTo('admin.html');
      } else {
        window.location.href = 'admin.html';
      }
    });
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', async () => {
      // 检查是否有未同步的数据
      if (window.newDataManager && window.newDataManager.hasLocalChanges) {
        const shouldSync = confirm('检测到未同步的数据！\n\n是否在返回前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接返回');
        if (shouldSync) {
          const syncSuccess = await window.newDataManager.performManualSync();
          if (!syncSuccess) {
            alert('同步失败，但将继续返回。请稍后手动同步数据。');
          }
        }
      }
      // 直接跳转到index页面，不使用history.back()
      window.location.href = 'index.html';
    });
  }

  // 刷新数据按钮已移除（2025-11-04）
  // 原因：功能与自动刷新机制重复，已有完善的自动刷新机制（attendanceRecordsUpdated事件监听）
  // 如果需要刷新数据，请使用浏览器刷新功能（F5）或等待自动刷新

  // 导出按钮事件
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        // 获取当前显示的报表section
        const activeSection = document.querySelector('.report-section:not(.hidden-form)');
        if (!activeSection) {
          alert('请先选择一个报表页面！');
          return;
        }

        // 动态加载html2canvas库
        if (!window.html2canvas) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          document.head.appendChild(script);
          
          // 等待库加载完成
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        // 生成图片
        const canvas = await html2canvas(activeSection, {
          backgroundColor: '#ffffff',
          scale: 1, // 降低图片质量，减少文件大小
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          width: activeSection.scrollWidth,
          height: activeSection.scrollHeight
        });

        // 根据当前报表类型生成文件名
        let fileName = 'MSH报表';
        const sectionId = activeSection.id;
        const currentDate = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        
        if (sectionId === 'dailyReportSection') {
          dailyDateSelect = document.getElementById('dailyDateSelect');
          const selectedDate = dailyDateSelect ? dailyDateSelect.value : '';
          fileName = `MSH日报表_${selectedDate || currentDate}`;
        } else if (sectionId === 'quarterlyReportSection') {
          quarterSelect = document.getElementById('quarterSelect');
          const selectedQuarter = quarterSelect ? quarterSelect.value : '';
          fileName = `MSH季度报表_${selectedQuarter || '当前季度'}`;
        } else if (sectionId === 'yearlyReportSection') {
          yearSelect = document.getElementById('yearSelect');
          const selectedYear = yearSelect ? yearSelect.value : '';
          fileName = `MSH年度报表_${selectedYear || new Date().getFullYear()}`;
        } else {
          fileName = `MSH报表_${currentDate}`;
        }

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('报表图片已导出！');
      } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败，请重试！');
      }
    });
  }

  // 导航按钮事件

  if (showDailyReport) {
    console.log('showDailyReport按钮已找到，绑定事件监听器');
    showDailyReport.addEventListener('click', () => {
      console.log('showDailyReport按钮被点击，切换到日报表');
      showSection('dailyReport');
    });
  } else {
    console.error('showDailyReport按钮未找到！');
  }


  if (showQuarterlyReport) {
    showQuarterlyReport.addEventListener('click', () => {
      showSection('quarterlyReport');
    });
  }

  if (showYearlyReport) {
    showYearlyReport.addEventListener('click', () => {
      showSection('yearlyReport');
    });
  }


  if (dailyDateSelect) {
    dailyDateSelect.addEventListener('change', async () => {
      const selectedDate = dailyDateSelect.value;
      if (selectedDate) {
        // 【优化V2.0】按需加载该日期的签到数据
        const dateRecords = await loadAttendanceDataForDate(selectedDate);
        loadDailyReport(selectedDate, dateRecords);
      }
    });
  }

  if (viewDailyReport) {
    console.log('viewDailyReport按钮已找到，绑定事件监听器');
    viewDailyReport.addEventListener('click', async () => {
      console.log('viewDailyReport按钮被点击');
      const selectedDate = dailyDateSelect ? dailyDateSelect.value : '';
      console.log('选择的日期:', selectedDate);
      if (selectedDate) {
        // 【优化V2.0】按需加载该日期的签到数据
        const dateRecords = await loadAttendanceDataForDate(selectedDate);
        console.log('🔍 准备加载日报表，记录数:', dateRecords ? dateRecords.length : 0);
        if (dateRecords && dateRecords.length > 0) {
          console.log('🔍 第一条记录:', dateRecords[0]);
          console.log('🔍 所有唯一的group:', [...new Set(dateRecords.map(r => r.group))]);
        }
        loadDailyReport(selectedDate, dateRecords);
      } else {
        alert('请选择日期！');
      }
    });
  } else {
    console.error('viewDailyReport按钮未找到！');
  }


  if (quarterSelect) {
    quarterSelect.addEventListener('change', async () => {
      const selectedQuarter = quarterSelect.value;
      if (selectedQuarter) {
        // 【优化V2.0】加载季度数据
        await loadQuarterlyReportData(selectedQuarter);
      }
    });
  }

  if (viewQuarterlyReport) {
    viewQuarterlyReport.addEventListener('click', async () => {
      const quarter = quarterSelect ? quarterSelect.value : '';
      if (quarter) {
        // 【优化V2.0】加载季度数据
        await loadQuarterlyReportData(quarter);
      } else {
        alert('请选择季度！');
      }
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', async () => {
      const selectedYear = yearSelect.value;
      if (selectedYear) {
        // 【优化V2.0】加载年度数据
        await loadYearlyReportData(selectedYear);
      }
    });
  }

  if (viewYearlyReport) {
    viewYearlyReport.addEventListener('click', async () => {
      const year = yearSelect ? yearSelect.value : '';
      if (year) {
        // 【优化V2.0】加载年度数据
        await loadYearlyReportData(year);
      } else {
        alert('请选择年份！');
      }
    });
  }


  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据同步初始化 ====================
// 旧的数据同步代码已移除，现在使用NewDataManager统一管理数据

// ==================== 事件处理函数 ====================

// ==================== 表格渲染优化函数 ====================
  
  // 优化表格渲染函数
  function renderOptimizedTable(container, data, columns, options = {}) {
    if (!container || !data) return;
    
    const { useVirtualScroll: useVirtual = useVirtualScroll, pageSize = 50 } = options;
    
    // 如果数据量小，直接渲染
    if (data.length <= 100) {
      renderTableDirectly(container, data, columns);
      return;
    }
    
    if (useVirtual && window.VirtualScrollManager) {
      // 使用虚拟滚动
      if (virtualScrollManager) {
        virtualScrollManager.destroy();
      }
      
      virtualScrollManager = new VirtualScrollManager({
        container: container,
        data: data,
        itemHeight: 40,
        visibleCount: Math.ceil(container.clientHeight / 40) || 20,
        renderItem: (item, index) => renderTableRow(item, index, columns)
      });
    } else if (window.PaginationManager) {
      // 使用分页
      if (virtualScrollManager) {
        virtualScrollManager.destroy();
      }
      
      virtualScrollManager = new PaginationManager({
        container: container,
        data: data,
        pageSize: pageSize,
        renderItem: (item, index) => renderTableRow(item, index, columns)
      });
    } else {
      // 回退到直接渲染
      renderTableDirectly(container, data, columns);
    }
  }
  
  // 直接渲染表格
  function renderTableDirectly(container, data, columns) {
    container.innerHTML = '';
    
    data.forEach((item, index) => {
      const row = renderTableRow(item, index, columns);
      container.appendChild(row);
    });
  }
  
  /**
   * 渲染表格行
   * @param {Object} item - 数据项
   * @param {number} index - 行索引
   * @param {Array} columns - 列配置数组
   * @returns {HTMLTableRowElement} 渲染后的表格行元素
   */
  function renderTableRow(item, index, columns) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'even' : 'odd';
    
    columns.forEach(column => {
      const cell = document.createElement('td');
      const value = getCellValue(item, column);
      cell.textContent = value;
      cell.className = column.className || '';
      row.appendChild(cell);
    });
    
    return row;
  }
  
  /**
   * 获取单元格值
   * @param {Object} item - 数据项
   * @param {Object} column - 列配置对象
   * @returns {string} 单元格显示值
   */
  function getCellValue(item, column) {
    if (typeof column.dataKey === 'function') {
      return column.dataKey(item);
    } else if (typeof column.dataKey === 'string') {
      return item[column.dataKey] || '';
    } else {
      return '';
    }
  }
  
  // 导航按钮
  showDailyReport = document.getElementById('showDailyReport');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  
  // 日报表相关
  dailyReportSection = document.getElementById('dailyReportSection');
  dailyDateSelect = document.getElementById('dailyDateSelect');
  viewDailyReport = document.getElementById('viewDailyReport');
  dailyReportList = document.getElementById('dailyReportList');
  earlyCount = document.getElementById('earlyCount');
  onTimeCount = document.getElementById('onTimeCount');
  lateCount = document.getElementById('lateCount');
  signedCount = document.getElementById('signedCount');
  unsignedCount = document.getElementById('unsignedCount');
  newcomerCount = document.getElementById('newcomerCount');
  attendanceRate = document.getElementById('attendanceRate');
  
  // 季度报表相关
  quarterlyReportSection = document.getElementById('quarterlyReportSection');
  quarterSelect = document.getElementById('quarterSelect');
  viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  quarterlyReportList = document.getElementById('quarterlyReportList');
  
  // 年度报表相关
  yearlyReportSection = document.getElementById('yearlyReportSection');
  yearSelect = document.getElementById('yearSelect');
  viewYearlyReport = document.getElementById('viewYearlyReport');
  yearlyReportList = document.getElementById('yearlyReportList');

  // 旧的数据加载函数已移除，现在使用NewDataManager

  async function initializePage() {
    // 设置默认日期为今天
    const today = window.utils.getLocalDateString();
    if (dailyDateSelect) dailyDateSelect.value = today;
    
    // 初始化季度和年份选项
    initializePeriodOptions();
    
    // 默认显示日报表
    showSection('dailyReport');
    
    // 🔧 修复：自动加载今天的日报表数据
    console.log('🔄 自动加载今天的日报表数据...');
    const todayRecords = await loadAttendanceDataForDate(today);
    loadDailyReport(today, todayRecords);
  }

  function initializePeriodOptions() {
    // 🔧 修复：由于优化V2.0不再预加载attendanceRecords，改为生成当前年份和过去2年的选项
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    
    // 初始化季度选项
    if (quarterSelect) {
      quarterSelect.innerHTML = '<option value="">--请选择季度--</option>';
      years.forEach(year => {
        for (let q = 1; q <= 4; q++) {
          const option = document.createElement('option');
          option.value = `${year}-Q${q}`;
          option.textContent = `${year}年第${q}季度`;
          quarterSelect.appendChild(option);
        }
      });
    }

    // 初始化年份选项
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="">--请选择年份--</option>';
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
      });
    }
  }

  function showSection(sectionName) {
    console.log('showSection被调用，sectionName:', sectionName);
    // 隐藏所有section
    const sections = [dailyReportSection, quarterlyReportSection, yearlyReportSection];
    sections.forEach(section => {
      if (section) {
        section.style.display = 'none';
        section.classList.add('hidden-form');
      }
    });

    // 移除所有导航按钮的active类
    const navButtons = [showDailyReport, showSundayTracking, showQuarterlyReport, showYearlyReport];
    navButtons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    // 显示选中的section
    switch (sectionName) {
      case 'dailyReport':
        console.log('显示日报表section');
        if (dailyReportSection) {
          console.log('dailyReportSection元素存在，设置显示');
          dailyReportSection.style.display = 'block';
          dailyReportSection.classList.remove('hidden-form');
          console.log('dailyReportSection display:', dailyReportSection.style.display);
          console.log('dailyReportSection classList:', dailyReportSection.classList.toString());
        } else {
          console.error('dailyReportSection元素不存在！');
        }
        if (showDailyReport) showDailyReport.classList.add('active');
        break;
      case 'quarterlyReport':
        if (quarterlyReportSection) {
          quarterlyReportSection.style.display = 'block';
          quarterlyReportSection.classList.remove('hidden-form');
        }
        if (showQuarterlyReport) showQuarterlyReport.classList.add('active');
        break;
      case 'yearlyReport':
        if (yearlyReportSection) {
          yearlyReportSection.style.display = 'block';
          yearlyReportSection.classList.remove('hidden-form');
        }
        if (showYearlyReport) showYearlyReport.classList.add('active');
        break;
    }
  }

  // 获取签到时间段类型的中文显示
  function getAttendanceTypeChinese(date) {
    const type = window.utils.getAttendanceType(date);
    switch (type) {
      case 'early': return '早到';
      case 'onTime': return '准时';
      case 'late': return '迟到';
      case 'afternoon': return '下午';
      case 'invalid': return '无效';
      default: return '未知';
    }
  }




  async function syncToFirebase() {
    try {
      if (db) {
        await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
        console.log('签到记录已安全同步到Firebase');
      }
    } catch (error) {
      console.error('安全同步到Firebase失败:', error);
    }
  }

  // 🚨 已废弃：直接同步到Firebase（危险操作，已禁用）
  async function directSyncToFirebase() {
    console.error('⚠️ 警告：directSyncToFirebase已废弃，不再执行覆盖操作');
    console.error('💡 Summary页面不应全量同步attendanceRecords');
    alert('⚠️ 该功能已禁用\n\nSummary页面只加载基础数据，不应同步签到记录。\n请使用attendance-records.html进行记录编辑。');
    return false;
    
    // 原代码已禁用，防止数据覆盖
    /*
    try {
      localStorage.setItem('msh_attendance_records', JSON.stringify(attendanceRecords));
      if (db) {
        await db.ref('attendanceRecords').set(attendanceRecords); // 危险！
      }
      window.attendanceRecords = attendanceRecords;
    } catch (error) {
      console.error('直接同步到Firebase失败:', error);
      throw error;
    }
    */
  }

  function loadDailyReport(date, dateRecords) {
    if (!dailyReportList) return;
    
    console.log('日报表 - 开始加载，日期:', date);
    console.log('日报表 - 接收到的签到记录数:', dateRecords ? dateRecords.length : 0);
    console.log('日报表 - 签到记录示例:', dateRecords && dateRecords.length > 0 ? dateRecords[0] : '无数据');
    
    // 🔍 调试：检查签到记录中的group字段
    if (dateRecords && dateRecords.length > 0) {
      const uniqueGroups = [...new Set(dateRecords.map(r => r.group))];
      console.log('🔍 签到记录中的所有组别:', uniqueGroups);
      console.log('🔍 前5条签到记录的group字段:', dateRecords.slice(0, 5).map(r => ({name: r.name, group: r.group})));
    }
    
    console.log('日报表 - groups数据:', groups);
    console.log('日报表 - group0是否存在:', groups['group0']);
    console.log('日报表 - group0成员数量:', groups['group0'] ? groups['group0'].length : '不存在');
    
    // 【优化V2.0】使用传入的dateRecords，而不是全局attendanceRecords
    const dayRecords = dateRecords;

    // 统计各时段人数
    let earlyCountNum = 0, onTimeCountNum = 0, lateCountNum = 0;
    const signedUUIDs = new Set();
    
    dayRecords.forEach(record => {
      // 使用UUID进行统计匹配，避免姓名变更导致的重复统计
      const identifier = record.memberUUID || record.name;
      signedUUIDs.add(identifier);
      const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
      if (timeSlot === 'early') earlyCountNum++;
      else if (timeSlot === 'onTime') onTimeCountNum++;
      else if (timeSlot === 'late') lateCountNum++;
    });

    // 统计未签到人数（排除未签到的不统计人员）
    const allMembers = Object.keys(groups).flatMap(group => 
      groups[group]
        .filter(member => member.excluded !== true && member.excluded !== 'true') // 过滤排除人员
        .map(member => ({ 
          group, 
          name: member.name,
          uuid: member.uuid || member.name
        }))
    );
    
    // 计算未签到人员：所有人员 - 已签到人员（排除人员已在上面过滤）
    const unsignedMembers = allMembers.filter(member => 
      !signedUUIDs.has(member.uuid) // 没有签到（使用UUID匹配）
    );
    const unsignedCountNum = unsignedMembers.length;
    
    // 🆕 保存主日数据到 Firebase（用于缺勤计算优化）
    saveDailyReportToFirebaseIfSunday(date, dateRecords, signedUUIDs, unsignedMembers, allMembers).catch(err => {
      console.error('保存主日数据到Firebase失败:', err);
    });

    // 统计新人（只有通过"新朋友"按钮添加的人员，且是选择日期当天新增的）
    let newcomerCountNum = 0;
    const selectedDate = new Date(date).toLocaleDateString('zh-CN');
    Object.keys(groups).forEach(group => {
      groups[group].forEach(member => {
        if (member.joinDate && member.addedViaNewcomerButton) {
          const memberJoinDate = new Date(member.joinDate).toLocaleDateString('zh-CN');
          if (memberJoinDate === selectedDate) {
          newcomerCountNum++;
          }
        }
      });
    });

    // 计算签到总人数（基于memberUUID去重统计）
    const signedCountNum = earlyCountNum + onTimeCountNum + lateCountNum;
    const uniqueSignedCount = signedUUIDs.size; // 基于memberUUID的去重统计

    // 更新汇总数据
    if (earlyCount) earlyCount.textContent = earlyCountNum;
    if (onTimeCount) onTimeCount.textContent = onTimeCountNum;
    if (lateCount) lateCount.textContent = lateCountNum;
    if (signedCount) signedCount.textContent = uniqueSignedCount; // 使用去重后的实际签到人数
    if (unsignedCount) unsignedCount.textContent = unsignedCountNum;
    if (newcomerCount) newcomerCount.textContent = newcomerCountNum;
    
        // 计算总体签到率（排除美团组和group0）
        const excludedGroups = ['美团组', 'group0'];
    const validMembers = allMembers.filter(member => !excludedGroups.includes(member.group));
    const totalMembers = validMembers.length;
    const validSignedUUIDs = new Set();
    
    // 只统计有效组的签到人员（使用UUID匹配）
    dayRecords.forEach(record => {
      if (!excludedGroups.includes(record.group)) {
        const identifier = record.memberUUID || record.name;
        validSignedUUIDs.add(identifier);
      }
    });
    
    const attendanceRateNum = totalMembers > 0 ? Math.round((validSignedUUIDs.size / totalMembers) * 100) : 0;
    if (attendanceRate) attendanceRate.textContent = attendanceRateNum + '%';

    // 生成详细的日报表内容
    dailyReportList.innerHTML = '';
    
        // 按组别显示签到情况（按字母顺序排序），"group0"永远排在第一
    const sortedGroups = window.utils.sortGroups(groups, groupNames);
    console.log('日报表 - 所有组别:', sortedGroups);
    console.log('日报表 - groups数据:', groups);
    sortedGroups.forEach(group => {
      const groupMembers = groups[group] || [];
      const groupName = groupNames[group] || group;
      console.log(`日报表 - 处理组别: ${group}, 成员数量: ${groupMembers.length}`);
      
      // 统计该组的签到情况
      // 🔧 修复：使用组别名称匹配，因为签到记录中的group字段存储的是中文名称
      // 同时支持历史组别名称（用于兼容旧数据）
      const groupRecords = dayRecords.filter(record => {
        // 1. 匹配当前组别名称
        if (record.group === groupName || record.group === group) {
          return true;
        }
        // 2. 匹配历史组别名称
        const historicalGroupId = HISTORICAL_GROUP_NAMES[record.group];
        if (historicalGroupId === group) {
          return true;
        }
        return false;
      });
      console.log(`🔍 组别 ${group} (${groupName}) 签到记录数: ${groupRecords.length}`);
      if (groupRecords.length > 0) {
        console.log(`🔍 组别 ${group} 签到记录示例:`, groupRecords[0]);
      }
      // 使用UUID进行统计匹配，避免姓名变更导致的重复统计
      const signedUUIDs = groupRecords.map(record => record.memberUUID || record.name);
      
      // 🔧 过滤掉不统计的人员（使用member.excluded属性）
      const unsignedMembers = groupMembers.filter(member => 
        !signedUUIDs.includes(member.uuid || member.name) && // 没有签到
        !member.excluded // 且不是不统计人员
      );
      
      // 按时间段分类签到记录（显示所有签到记录，包括未签到不统计人员）
      const earlyRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'early';
      });
      
      const onTimeRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'onTime';
      });
      
      const lateRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'late';
      });
      
      // 🔍 调试：检查签到记录的数据结构
      if (groupRecords.length > 0) {
        console.log(`🔍 组别 ${group} 签到记录示例:`, groupRecords[0]);
        console.log(`🔍 组别 ${group} - 早到记录数: ${earlyRecords.length}, 准时记录数: ${onTimeRecords.length}, 迟到记录数: ${lateRecords.length}`);
      }
      
      const row = document.createElement('tr');
      const unsignedNames = unsignedMembers.map(member => window.utils.getDisplayName(member)).join(', ');
      
      // 计算上午签到人数（早到+准时+迟到）
      const morningSignedCount = earlyRecords.length + onTimeRecords.length + lateRecords.length;
      
      // 计算应到人数（包含所有人员，包括未签到不统计人员）
      const totalGroupMembers = groupMembers.length;
      
      // 计算签到率（美团组和group999不计算签到率）
      const excludedGroups = ['美团组', 'group999'];
      const attendanceRate = excludedGroups.includes(group) ? 0 : 
        (totalGroupMembers > 0 ? Math.round((morningSignedCount / totalGroupMembers) * 100) : 0);
      
      row.innerHTML = `
        <td>${groupName}</td>
        <td>${earlyRecords.map(record => {
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          return window.utils.getDisplayName(memberInfo);
        }).join(', ')}</td>
        <td>${onTimeRecords.map(record => {
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          return window.utils.getDisplayName(memberInfo);
        }).join(', ')}</td>
        <td>${lateRecords.map(record => {
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          return window.utils.getDisplayName(memberInfo);
        }).join(', ')}</td>
        <td>${unsignedNames || '无'}</td>
        <td>${attendanceRate}%</td>
      `;
      dailyReportList.appendChild(row);
    });

    // 按组统计
    const groupStats = {};
    Object.keys(groups).forEach(group => {
      const groupMembers = groups[group];
      const groupSigned = dayRecords.filter(record => record.group === group);
      const signedUUIDs = groupSigned.map(record => record.memberUUID || record.name);
      // 🔧 使用member.excluded属性，不再调用废弃的loadExcludedMembers()
      // 过滤掉未签到的不统计人员（已签到的不统计人员仍然统计）
      const unsignedMembers = groupMembers.filter(member => 
        !signedUUIDs.includes(member.uuid || member.name) && // 没有签到（使用UUID匹配）
        !member.excluded // 且不是不统计人员（使用member.excluded属性）
      );
      
      const groupEarly = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'early';
      }).length;
      const groupOnTime = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'onTime';
      }).length;
      const groupLate = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'late';
      }).length;
      const groupUnsigned = groupMembers.length - groupSigned.length;
      // 美团组和group999不计算签到率
      const excludedGroups = ['美团组', 'group999'];
      const groupRate = excludedGroups.includes(group) ? 0 : 
        (groupMembers.length > 0 ? Math.round((groupSigned.length / groupMembers.length) * 100) : 0);
      
      groupStats[group] = {
        early: groupEarly,
        onTime: groupOnTime,
        late: groupLate,
        unsigned: groupUnsigned,
        unsignedNames: unsignedMembers.map(member => member.name).join(', '),
        rate: groupRate
      };
    });

    // 注意：这里不应该清空表格，因为上面已经生成了详细的签到情况
    // 如果需要显示汇总统计，应该使用单独的表格或区域
  }

  // 【优化V2.0】加载季度报表数据
  async function loadQuarterlyReportData(quarter) {
    if (!quarterlyReportList) return;
    
    const [year, q] = quarter.split('-Q');
    const startMonth = (parseInt(q) - 1) * 3;
    const startDate = new Date(parseInt(year), startMonth, 1);
    const endDate = new Date(parseInt(year), startMonth + 3, 0);
    
    // 加载季度范围内的数据（简化版：加载整个季度）
    const quarterRecords = await loadAttendanceDataForDateRange(startDate, endDate);
    
    // 只保留周日的记录
    const sundayRecords = quarterRecords.filter(record => {
      const date = new Date(record.time);
      return date.getDay() === 0;
    });
    
    loadQuarterlyReport(quarter, sundayRecords);
  }

  // 辅助函数：根据签到记录找到对应成员
  function findMemberByRecord(record) {
    if (!record || !record.group) return null;
    const groupMembers = groups[record.group] || [];
    return groupMembers.find(m => 
      (m.uuid && record.memberUUID && m.uuid === record.memberUUID) ||
      (m.name === record.name)
    );
  }

  function loadQuarterlyReport(quarter, quarterRecords) {
    if (!quarterlyReportList) return;
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    quarterRecords.forEach(record => {
      // 检查签到记录对应的成员是否被排除
      const member = findMemberByRecord(record);
      const isExcluded = member ? (member.excluded === true || member.excluded === 'true') : false;
      
      if (!isExcluded) {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            morning: 0, 
            afternoon: 0, 
            evening: 0 
          };
        }
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        if (timeSlot === '上午') memberStats[key].morning++;
        else if (timeSlot === '下午') memberStats[key].afternoon++;
        else if (timeSlot === '晚上') memberStats[key].evening++;
      }
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    quarterlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      quarterlyReportList.appendChild(row);
    });
  }

  // 【优化V2.0】加载年度报表数据  
  async function loadYearlyReportData(year) {
    if (!yearlyReportList) return;
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    
    // 加载年度范围内的数据
    const yearRecords = await loadAttendanceDataForDateRange(startDate, endDate);
    
    // 只保留周日的记录
    const sundayRecords = yearRecords.filter(record => {
      const date = new Date(record.time);
      return date.getDay() === 0;
    });
    
    loadYearlyReport(year, sundayRecords);
  }

  function loadYearlyReport(year, yearRecords) {
    if (!yearlyReportList) return;
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    yearRecords.forEach(record => {
      // 检查签到记录对应的成员是否被排除
      const member = findMemberByRecord(record);
      const isExcluded = member ? (member.excluded === true || member.excluded === 'true') : false;
      
      if (!isExcluded) {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            morning: 0, 
            afternoon: 0, 
            evening: 0 
          };
        }
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        if (timeSlot === '上午') memberStats[key].morning++;
        else if (timeSlot === '下午') memberStats[key].afternoon++;
        else if (timeSlot === '晚上') memberStats[key].evening++;
      }
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    yearlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      yearlyReportList.appendChild(row);
    });
  }

  function countSundays(start, end) {
    let sundays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) sundays++;
    }
    return sundays;
  }

// ==================== 保存主日数据到 Firebase（用于缺勤计算优化）====================
/**
 * 如果是主日，保存日报表数据到 Firebase
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @param {Array} dateRecords - 签到记录数组
 * @param {Set} signedUUIDs - 已签到成员的UUID集合
 * @param {Array} unsignedMembers - 未签到成员数组
 * @param {Array} allMembers - 所有成员数组
 */
async function saveDailyReportToFirebaseIfSunday(date, dateRecords, signedUUIDs, unsignedMembers, allMembers) {
  try {
    // 检查是否是主日
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    if (dayOfWeek !== 0) {
      // 不是主日，不保存
      return;
    }
    
    console.log(`📅 检测到主日 (${date})，准备保存日报表数据到Firebase`);
    
    // 🔧 修复：确保 Firebase 已初始化
    let firebaseDb = db || window.db;
    if (!firebaseDb) {
      // 尝试初始化 Firebase
      const result = window.utils.initializeFirebase();
      if (result.success && result.db) {
        firebaseDb = result.db;
        db = firebaseDb;
        window.db = firebaseDb;
        console.log('✅ Firebase已初始化，可以保存数据');
      } else {
        console.warn('⚠️ Firebase未初始化，跳过保存主日数据');
        return;
      }
    }
    
    // 构建已签到成员列表
    const signedMembers = [];
    const signedUUIDArray = Array.from(signedUUIDs);
    
    dateRecords.forEach(record => {
      const identifier = record.memberUUID || record.name;
      if (signedUUIDArray.includes(identifier)) {
        // 检查是否已添加（去重）
        if (!signedMembers.find(m => (m.uuid || m.name) === identifier)) {
          signedMembers.push({
            uuid: record.memberUUID || record.name,
            name: record.name,
            group: record.group,
            time: record.time,
            memberSnapshot: record.memberSnapshot,
            groupSnapshot: record.groupSnapshot
          });
        }
      }
    });
    
    // 构建未签到成员列表
    const unsignedMembersList = unsignedMembers.map(member => ({
      uuid: member.uuid,
      name: member.name,
      group: member.group
    }));
    
    // 构建日报表数据
    const dailyReportData = {
      date: date,
      signedMembers: signedMembers,
      unsignedMembers: unsignedMembersList,
      totalSigned: signedMembers.length,
      totalUnsigned: unsignedMembersList.length,
      totalMembers: allMembers.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存到 Firebase（使用update()增量更新，符合数据安全规则）
    const dateKey = date; // 使用 YYYY-MM-DD 格式作为key
    // 直接在指定路径使用update()，只更新/创建该日期的数据，不影响其他日期
    try {
      await firebaseDb.ref(`dailyReports/${dateKey}`).update(dailyReportData);
      console.log(`✅ 已保存主日数据到 Firebase: dailyReports/${dateKey}`, {
        signed: signedMembers.length,
        unsigned: unsignedMembersList.length,
        total: allMembers.length
      });
    } catch (firebaseError) {
      // Firebase权限错误处理
      if (firebaseError.code === 'PERMISSION_DENIED' || firebaseError.message.includes('permission_denied')) {
        console.warn('⚠️ Firebase权限不足，无法保存到 dailyReports 路径');
        console.warn('💡 提示：请在Firebase控制台的Realtime Database安全规则中添加以下规则：');
        console.warn('   "dailyReports": { ".read": true, ".write": true }');
        console.warn('   或者使用更严格的规则，例如：');
        console.warn('   "dailyReports": { ".read": "auth != null", ".write": "auth != null" }');
        
        // 作为临时方案，保存到本地存储
        try {
          const localKey = `msh_dailyReport_${dateKey}`;
          localStorage.setItem(localKey, JSON.stringify(dailyReportData));
          console.log(`✅ 已保存主日数据到本地存储: ${localKey}`);
        } catch (localError) {
          console.error('❌ 保存到本地存储也失败:', localError);
        }
      } else {
        throw firebaseError; // 重新抛出其他错误
      }
    }
    
  } catch (error) {
    console.error('❌ 保存主日数据失败:', error);
    // 不抛出错误，避免影响日报表显示
  }
}
  
  


