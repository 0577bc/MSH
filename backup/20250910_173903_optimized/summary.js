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

// DOM元素引用
let backButton, backToSigninButton, exportButton;
let showAttendanceData, showDailyReport, showQuarterlyReport, showYearlyReport;
let dateSelect, dailyDateSelect, quarterSelect, yearSelect;
let viewDateData, viewDailyReport, viewQuarterlyReport, viewYearlyReport;
let attendanceDataSection, dailyReportSection, quarterlyReportSection, yearlyReportSection;
let attendanceDataList, dailyReportList, quarterlyReportList, yearlyReportList;

// 性能优化相关
let virtualScrollManager = null;
let useVirtualScroll = true;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  try {
    app = firebase.app();
    db = firebase.database();
    console.log('✅ 使用已存在的Firebase应用');
    return true;
  } catch (error) {
    if (window.firebaseConfig) {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      console.log('✅ 创建新的Firebase应用');
      return true;
    } else {
      console.error('❌ Firebase配置未找到');
      return false;
    }
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backButton = document.getElementById('backButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  exportButton = document.getElementById('exportButton');
  
  // 导航按钮
  showAttendanceData = document.getElementById('showAttendanceData');
  showDailyReport = document.getElementById('showDailyReport');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  // 日期选择器
  dateSelect = document.getElementById('dateSelect');
  dailyDateSelect = document.getElementById('dailyDateSelect');
  quarterSelect = document.getElementById('quarterSelect');
  yearSelect = document.getElementById('yearSelect');
  
  // 查看按钮
  viewDateData = document.getElementById('viewDateData');
  viewDailyReport = document.getElementById('viewDailyReport');
  viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  viewYearlyReport = document.getElementById('viewYearlyReport');
  
  // 报表section
  attendanceDataSection = document.getElementById('attendanceDataSection');
  dailyReportSection = document.getElementById('dailyReportSection');
  quarterlyReportSection = document.getElementById('quarterlyReportSection');
  yearlyReportSection = document.getElementById('yearlyReportSection');
  
  // 表格列表
  attendanceDataList = document.getElementById('attendanceDataList');
  dailyReportList = document.getElementById('dailyReportList');
  quarterlyReportList = document.getElementById('quarterlyReportList');
  yearlyReportList = document.getElementById('yearlyReportList');
}

document.addEventListener('DOMContentLoaded', async () => {
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化Firebase并等待完成
  const firebaseInitialized = await initializeFirebase();
  
  if (firebaseInitialized) {
    // 加载数据
    await loadData();
    
    // 启动数据同步监听器
    initializeDataSync();
  } else {
    console.error('Firebase初始化失败，使用本地存储');
    // 即使Firebase初始化失败，也尝试加载本地数据
    await loadData();
  }
  
  console.log("汇总页面初始化完成");
});

// ==================== 数据加载和管理 ====================
async function loadData() {
  try {
    // 加载数据从Firebase
    await loadDataFromFirebase();
    
    console.log("✅ 汇总页面数据加载成功");
  } catch (error) {
    console.error("❌ 汇总页面数据加载失败:", error);
  }
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', () => window.location.href = 'admin.html');
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', () => window.location.href = 'index.html');
  }

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
        
        if (sectionId === 'attendanceDataSection') {
          dateSelect = document.getElementById('dateSelect');
          const selectedDate = dateSelect ? dateSelect.value : '';
          fileName = `MSH签到数据_${selectedDate || currentDate}`;
        } else if (sectionId === 'dailyReportSection') {
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
  if (showAttendanceData) {
    showAttendanceData.addEventListener('click', () => {
      showSection('attendanceData');
    });
  }

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

  // 日期选择事件
  if (dateSelect) {
    dateSelect.addEventListener('change', () => {
      const selectedDate = dateSelect.value;
      if (selectedDate) {
        loadAttendanceData(selectedDate);
      }
    });
  }

  if (viewDateData) {
    viewDateData.addEventListener('click', () => {
      const selectedDate = dateSelect ? dateSelect.value : '';
      if (selectedDate) {
        loadAttendanceData(selectedDate);
      } else {
        alert('请选择日期！');
      }
    });
  }

  if (dailyDateSelect) {
    dailyDateSelect.addEventListener('change', () => {
      const selectedDate = dailyDateSelect.value;
      if (selectedDate) {
        loadDailyReport(selectedDate);
      }
    });
  }

  if (viewDailyReport) {
    console.log('viewDailyReport按钮已找到，绑定事件监听器');
    viewDailyReport.addEventListener('click', () => {
      console.log('viewDailyReport按钮被点击');
      const selectedDate = dailyDateSelect ? dailyDateSelect.value : '';
      console.log('选择的日期:', selectedDate);
      if (selectedDate) {
        loadDailyReport(selectedDate);
      } else {
        alert('请选择日期！');
      }
    });
  } else {
    console.error('viewDailyReport按钮未找到！');
  }

  if (quarterSelect) {
    quarterSelect.addEventListener('change', () => {
      const selectedQuarter = quarterSelect.value;
      if (selectedQuarter) {
        loadQuarterlyReport(selectedQuarter);
      }
    });
  }

  if (viewQuarterlyReport) {
    viewQuarterlyReport.addEventListener('click', () => {
      const quarter = quarterSelect ? quarterSelect.value : '';
      if (quarter) {
        loadQuarterlyReport(quarter);
      } else {
        alert('请选择季度！');
      }
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      const selectedYear = yearSelect.value;
      if (selectedYear) {
        loadYearlyReport(selectedYear);
      }
    });
  }

  if (viewYearlyReport) {
    viewYearlyReport.addEventListener('click', () => {
      const year = yearSelect ? yearSelect.value : '';
      if (year) {
        loadYearlyReport(year);
      } else {
        alert('请选择年份！');
      }
    });
  }

  // 签到数据日期选择事件
  if (dateSelect) {
    dateSelect.addEventListener('change', () => {
      const selectedDate = dateSelect.value;
      loadAttendanceData(selectedDate);
    });
  }

  // 查看当日数据按钮事件
  if (viewDateData) {
    viewDateData.addEventListener('click', () => {
      const selectedDate = dateSelect ? dateSelect.value : null;
      loadAttendanceData(selectedDate);
    });
  }

  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据同步初始化 ====================
function initializeDataSync() {
  console.log("汇总页面正在连接Firebase数据库...");
  
  // 启动实时数据同步
  let isDeleting = false; // 标记是否正在删除操作
  let isEditing = false; // 标记是否正在编辑操作
  
  // 将编辑和删除状态暴露到全局，供相关函数使用
  window.summaryIsEditing = () => isEditing;
  window.setSummaryIsEditing = (value) => { isEditing = value; };
  window.summaryIsDeleting = () => isDeleting;
  window.setSummaryIsDeleting = (value) => { isDeleting = value; };
  
  if (window.utils && window.utils.dataSyncManager) {
    window.utils.dataSyncManager.startListening((dataType, data) => {
      console.log(`汇总页面收到${dataType}数据更新:`, data);
      
      // 如果正在删除或编辑操作，忽略同步更新
      if (window.summaryIsDeleting && window.summaryIsDeleting()) {
        console.log('正在删除操作中，忽略同步更新');
        return;
      }
      
      if (window.summaryIsEditing && window.summaryIsEditing()) {
        console.log('正在编辑操作中，忽略同步更新');
        return;
      }
      
      switch (dataType) {
        case 'attendanceRecords':
          attendanceRecords = data;
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          // 如果当前显示的是日报表，重新加载日报表
          if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
            const date = dailyDateSelect ? dailyDateSelect.value : new Date().toISOString().split('T')[0];
            loadDailyReport(date);
          }
          break;
        case 'groups':
          console.log('汇总页面 - 接收到的groups数据:', data);
          
          // 优先使用本地数据，避免数据丢失（包括花名等字段）
          const localGroups = localStorage.getItem('msh_groups');
          if (localGroups) {
            try {
              const localGroupsData = JSON.parse(localGroups);
              console.log('汇总页面 - 使用本地groups数据，确保数据不丢失（包括花名）');
              groups = localGroupsData;
              
              // 如果本地数据与远程数据不同，同步本地数据到Firebase
              if (JSON.stringify(groups) !== JSON.stringify(data)) {
                console.log('汇总页面 - 本地数据与远程数据不同，同步本地数据到Firebase');
                const db = firebase.database();
                db.ref('groups').set(groups).catch(error => {
                  console.error('汇总页面 - 同步本地groups数据失败:', error);
                });
              }
            } catch (error) {
              console.error('汇总页面 - 解析本地groups数据失败:', error);
              groups = data; // 如果本地数据解析失败，使用远程数据
            }
          } else {
            console.log('汇总页面 - 没有本地数据，使用远程groups数据');
            groups = data;
          }
          
          // 确保未分组组别存在
          if (!groups.hasOwnProperty('未分组')) {
            groups['未分组'] = [];
            console.log("汇总页面同步：已添加未分组组别");
            // 立即同步到Firebase
            const db = firebase.database();
            db.ref('groups').update({ '未分组': [] }).catch(error => {
              console.error("同步未分组组别到Firebase失败:", error);
            });
          } else {
            console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
          }
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          // 如果当前显示的是日报表，重新加载日报表
          if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
            const date = dailyDateSelect ? dailyDateSelect.value : new Date().toISOString().split('T')[0];
            loadDailyReport(date);
          }
          break;
        case 'groupNames':
          groupNames = data;
          console.log('汇总页面 - 接收到的groupNames数据:', groupNames);
          
          // 确保未分组名称映射存在
          if (!groupNames['未分组']) {
            groupNames['未分组'] = '未分组';
            console.log("汇总页面同步：已添加未分组名称映射");
            // 立即同步到Firebase
            const db = firebase.database();
            db.ref('groupNames').update({ '未分组': '未分组' }).catch(error => {
              console.error("同步未分组名称映射到Firebase失败:", error);
            });
          }
          
          // 检查并修复培茹组（在groupNames加载后检查）
          if (!groups['培茹组'] && groupNames['培茹组']) {
            console.log("汇总页面 - 检测到培茹组名称存在但成员数组丢失，正在修复...");
            groups['培茹组'] = []; // 重新创建空的培茹组
            const db = firebase.database();
            db.ref('groups').update({ '培茹组': [] }).catch(error => {
              console.error("汇总页面 - 修复培茹组失败:", error);
            });
            console.log("汇总页面 - 培茹组已修复");
            
            // 更新本地存储
            localStorage.setItem('msh_groups', JSON.stringify(groups));
          }
          
          localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
          // 如果当前显示的是日报表，重新加载日报表
          if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
            const date = dailyDateSelect ? dailyDateSelect.value : new Date().toISOString().split('T')[0];
            loadDailyReport(date);
          }
          break;
      }
    });

    // 设置页面可见性监听
    window.utils.dataSyncManager.setupVisibilityListener(() => {
      console.log('汇总页面重新可见，检查数据同步...');
      loadDataFromFirebase();
    });
  }

  // 页面卸载时确保数据同步
  window.addEventListener('beforeunload', async (event) => {
    console.log('页面即将关闭，确保数据同步');
    try {
      // 同步所有数据到Firebase
      if (db) {
        await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
        console.log('页面关闭前数据同步完成');
      }
    } catch (error) {
      console.error('页面关闭前数据同步失败:', error);
    }
  });
}

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
  
  // 渲染表格行
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
  
  // 获取单元格值
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
  showAttendanceData = document.getElementById('showAttendanceData');
  showDailyReport = document.getElementById('showDailyReport');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  // 签到数据相关
  attendanceDataSection = document.getElementById('attendanceDataSection');
  dateSelect = document.getElementById('dateSelect');
  viewDateData = document.getElementById('viewDateData');
  attendanceDataList = document.getElementById('attendanceDataList');
  
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

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      const attendanceRef = firebase.database().ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
        // 更新记录索引缓存
        if (window.utils && window.utils.UUIDIndex) {
          window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
        }
      }

      const groupsRef = firebase.database().ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
        // 更新成员索引缓存
        if (window.utils && window.utils.UUIDIndex) {
          window.utils.UUIDIndex.updateMemberIndex(groups);
        }
      }

      const groupNamesRef = firebase.database().ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
      }

      // 确保未分组组别和名称映射存在
      let needsSync = false;
      if (!groups.hasOwnProperty('未分组')) {
        groups['未分组'] = [];
        console.log("汇总页面：已添加未分组组别");
        needsSync = true;
      } else {
        console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
      }
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
        console.log("汇总页面：已添加未分组名称映射");
        needsSync = true;
      }
      
      // 如果需要同步，立即同步到Firebase
      if (needsSync) {
        try {
          const db = firebase.database();
          await db.ref('groups').update({ '未分组': [] });
          await db.ref('groupNames').update({ '未分组': '未分组' });
          console.log("未分组组别已同步到Firebase");
        } catch (error) {
          console.error("同步未分组组别到Firebase失败:", error);
        }
      }

      initializePage();
      console.log("Summary data loaded from Firebase");
    } catch (error) {
      console.error("Error loading summary data from Firebase:", error);
      console.log("Using local storage as fallback");
      loadFromLocalStorage();
    }
  }

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
      } else {
        groups = window.sampleData.groups;
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
      } else {
        groupNames = window.sampleData.groupNames;
      }

      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
      }

      initializePage();
      console.log("Summary data loaded from local storage");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  function initializePage() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    if (dateSelect) dateSelect.value = today;
    if (dailyDateSelect) dailyDateSelect.value = today;
    
    // 初始化季度和年份选项
    initializePeriodOptions();
    
    // 默认显示签到数据
    showSection('attendanceData');
    loadAttendanceData(today);
  }

  function initializePeriodOptions() {
    // 初始化季度选项
    if (quarterSelect) {
      quarterSelect.innerHTML = '<option value="">--请选择季度--</option>';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
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
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
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
    const sections = [attendanceDataSection, dailyReportSection, quarterlyReportSection, yearlyReportSection];
    sections.forEach(section => {
      if (section) {
        section.style.display = 'none';
        section.classList.add('hidden-form');
      }
    });

    // 移除所有导航按钮的active类
    const navButtons = [showAttendanceData, showDailyReport, showQuarterlyReport, showYearlyReport];
    navButtons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    // 显示选中的section
    switch (sectionName) {
      case 'attendanceData':
        if (attendanceDataSection) {
          attendanceDataSection.style.display = 'block';
          attendanceDataSection.classList.remove('hidden-form');
          // 加载签到数据
          const currentDate = dateSelect ? dateSelect.value : null;
          loadAttendanceData(currentDate);
        }
        if (showAttendanceData) showAttendanceData.classList.add('active');
        break;
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

  function loadAttendanceData(date) {
    if (!attendanceDataList) return;
    
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    const dayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );

    attendanceDataList.innerHTML = '';
    console.log('加载签到数据，记录数量:', dayRecords.length);
    console.log('attendanceDataList元素:', attendanceDataList);
    dayRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      // 使用快照数据，确保显示的是签到时的真实信息
      const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
      const displayName = record.memberSnapshot?.name || record.name;
      const displayNickname = record.memberSnapshot?.nickname || '';
      const fullName = displayNickname ? `${displayName} (${displayNickname})` : displayName;
      
      row.innerHTML = `
        <td>${displayGroup}</td>
        <td>${fullName}</td>
        <td class="time-cell">${record.time}</td>
        <td class="timeSlot-cell">${record.timeSlot || getAttendanceType(new Date(record.time))}</td>
        <td>
          <button class="edit-time-btn" data-index="${index}" data-record-id="${record.recordId || record.id || index}">编辑时间</button>
          <button class="delete-attendance-btn" data-index="${index}" data-record-id="${record.recordId || record.id || index}">删除</button>
        </td>
      `;
      attendanceDataList.appendChild(row);
      console.log('添加行:', record.name, '按钮数量:', row.querySelectorAll('button').length);
    });

    // 添加编辑时间按钮的事件监听器
    document.querySelectorAll('.edit-time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recordIndex = parseInt(e.target.dataset.index);
        const record = dayRecords[recordIndex];
        editAttendanceTime(record, recordIndex);
      });
    });

    // 添加删除按钮的事件监听器
    document.querySelectorAll('.delete-attendance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recordIndex = parseInt(e.target.dataset.index);
        const record = dayRecords[recordIndex];
        deleteAttendanceRecord(record, recordIndex);
      });
    });
  }

  async function deleteAttendanceRecord(record, recordIndex) {
    // 确认删除
    if (!confirm(`确定要删除 ${record.name} 的签到记录吗？\n时间: ${record.time}\n组别: ${groupNames[record.group] || record.group}`)) {
      return;
    }

    try {
      // 设置删除标记，防止实时同步干扰
      if (window.setSummaryIsDeleting) {
        window.setSummaryIsDeleting(true);
        console.log('已设置删除状态为true');
      }
      
      // 使用更可靠的查找方法：通过索引直接定位
      const targetDate = new Date(document.getElementById('dateSelect').value).toLocaleDateString('zh-CN');
      const dayRecords = attendanceRecords.filter(r => 
        new Date(r.time).toLocaleDateString('zh-CN') === targetDate
      );
      
      console.log('当日记录数量:', dayRecords.length);
      console.log('要删除的记录索引:', recordIndex);
      
      if (recordIndex >= 0 && recordIndex < dayRecords.length) {
        const dayRecord = dayRecords[recordIndex];
        console.log('当日记录:', dayRecord);
        
        // 在attendanceRecords中找到对应的记录（优先使用recordId进行精确匹配）
        let recordToDelete;
        if (dayRecord.recordId) {
          recordToDelete = attendanceRecords.find(r => r.recordId === dayRecord.recordId);
        } else {
          // 兼容旧记录，使用姓名、组别和时间匹配
          recordToDelete = attendanceRecords.find(r => 
            r.name === dayRecord.name && 
            r.group === dayRecord.group && 
            r.time === dayRecord.time
          );
        }
        
        if (recordToDelete) {
          // 直接从attendanceRecords数组中删除记录（优先使用recordId）
          let globalIndex;
          if (recordToDelete.recordId) {
            globalIndex = attendanceRecords.findIndex(r => r.recordId === recordToDelete.recordId);
          } else {
            // 兼容旧记录
            globalIndex = attendanceRecords.findIndex(r => 
              r.name === recordToDelete.name && 
              r.group === recordToDelete.group && 
              r.time === recordToDelete.time
            );
          }
          
          if (globalIndex !== -1) {
            attendanceRecords.splice(globalIndex, 1);
            console.log('已从attendanceRecords中删除记录，索引:', globalIndex);
            
            // 保存到本地存储
            localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
            
            // 同步到Firebase
            await window.utils.DataReferenceManager.directSyncToFirebase(attendanceRecords, 'attendanceRecords');
            
            // 重新加载数据
            currentDate = document.getElementById('dateSelect').value;
            loadAttendanceData(currentDate);
            
            alert('签到记录已删除！');
          } else {
            console.error('在attendanceRecords中未找到对应的记录');
            alert('未找到要删除的记录！');
          }
        } else {
          console.error('在attendanceRecords中未找到对应的记录');
          alert('未找到要删除的记录！');
        }
      } else {
        console.error('记录索引无效:', recordIndex);
        alert('记录索引无效！');
      }
    } catch (error) {
      console.error('删除签到记录失败:', error);
      alert('删除签到记录失败！');
    } finally {
      // 延迟重置删除标记，确保同步完成
      setTimeout(() => {
        if (window.setSummaryIsDeleting) {
          window.setSummaryIsDeleting(false);
          console.log('删除操作完成，恢复实时同步');
        }
      }, 3000); // 增加延迟时间
    }
  }

  function editAttendanceTime(record, recordIndex) {
    // 创建编辑对话框
    const dialog = document.createElement('div');
    dialog.className = 'edit-time-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>编辑签到时间</h3>
        <p><strong>姓名：</strong>${record.name}</p>
        <p><strong>组别：</strong>${groupNames[record.group] || record.group}</p>
        <p><strong>当前时间：</strong>${record.time}</p>
        <div class="form-group">
          <label for="newTime">新签到时间：</label>
          <input type="datetime-local" id="newTime" value="${formatDateTimeForInput(record.time)}" required>
          <div id="timeValidation" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
        </div>
        <div class="attendance-rules" style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 12px;">
          <strong>签到规则：</strong><br>
          • 早到：9:20之前<br>
          • 准时：9:20-9:30<br>
          • 迟到：9:30-10:40<br>
          • 下午签到：10:40之后<br>
        </div>
        <div class="dialog-buttons">
          <button id="saveTimeBtn" type="button">保存</button>
          <button id="cancelTimeBtn" type="button">取消</button>
        </div>
      </div>
    `;
    
    // 添加样式
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 400px;
      max-width: 500px;
    `;
    
    document.body.appendChild(dialog);
    
    // 事件监听器
    const saveBtn = dialog.querySelector('#saveTimeBtn');
    const cancelBtn = dialog.querySelector('#cancelTimeBtn');
    const newTimeInput = dialog.querySelector('#newTime');
    const timeValidation = dialog.querySelector('#timeValidation');
    
    // 实时验证时间选择
    newTimeInput.addEventListener('change', () => {
      const selectedTime = newTimeInput.value;
      if (selectedTime) {
        const selectedDateTime = new Date(selectedTime);
        const attendanceType = window.utils.getAttendanceType(selectedDateTime);
        
        let typeText = '';
        let typeColor = '#666';
        
        switch (attendanceType) {
          case 'early':
            typeText = '✅ 早到';
            typeColor = '#4CAF50';
            break;
          case 'onTime':
            typeText = '✅ 准时';
            typeColor = '#2196F3';
            break;
          case 'late':
            typeText = '⚠️ 迟到';
            typeColor = '#FF9800';
            break;
          case 'afternoon':
            typeText = '✅ 下午签到';
            typeColor = '#9C27B0';
            break;
          case 'invalid':
            typeText = '❌ 不允许签到';
            typeColor = '#F44336';
            break;
        }
        
        timeValidation.innerHTML = `<strong style="color: ${typeColor};">${typeText}</strong>`;
        
        // 如果是不允许的时间，禁用保存按钮
        if (attendanceType === 'invalid') {
          saveBtn.disabled = true;
          saveBtn.style.backgroundColor = '#ccc';
          saveBtn.style.cursor = 'not-allowed';
        } else {
          saveBtn.disabled = false;
          saveBtn.style.backgroundColor = '';
          saveBtn.style.cursor = '';
        }
      } else {
        timeValidation.innerHTML = '';
        saveBtn.disabled = false;
        saveBtn.style.backgroundColor = '';
        saveBtn.style.cursor = '';
      }
    });
    
    saveBtn.addEventListener('click', async () => {
      const newTime = newTimeInput.value;
      if (!newTime) {
        alert('请输入新的签到时间！');
        return;
      }
      
      // 验证签到时间是否符合规则
      const newDateTime = new Date(newTime);
      const attendanceType = window.utils.getAttendanceType(newDateTime);
      
      if (attendanceType === 'invalid') {
        alert('❌ 不能修改签到时间！\n\n请选择有效时间：\n• 早到：9:20之前\n• 准时：9:20-9:30\n• 迟到：9:30-10:40\n• 下午签到：10:40之后');
        return;
      }
      
      try {
        // 设置编辑标记，防止实时同步干扰
        if (window.setSummaryIsEditing) {
          window.setSummaryIsEditing(true);
          console.log('已设置编辑状态为true');
        }
        
        // 更新记录
        const newDateTime = new Date(newTime);
        const newTimeString = newDateTime.toLocaleString('zh-CN');
        const newTimeSlot = getAttendanceType(newDateTime);
        
        // 找到并更新attendanceRecords中的记录
        console.log('正在查找要更新的记录:', {
          name: record.name,
          group: record.group,
          time: record.time,
          recordIndex: recordIndex
        });
        
        // 使用更可靠的查找方法：通过索引直接定位
        const targetDate = new Date(document.getElementById('dateSelect').value).toLocaleDateString('zh-CN');
        const dayRecords = attendanceRecords.filter(r => 
          new Date(r.time).toLocaleDateString('zh-CN') === targetDate
        );
        
        console.log('当日记录数量:', dayRecords.length);
        console.log('要更新的记录索引:', recordIndex);
        
        if (recordIndex >= 0 && recordIndex < dayRecords.length) {
          const dayRecord = dayRecords[recordIndex];
          console.log('当日记录:', dayRecord);
          
          // 在attendanceRecords中找到对应的记录（优先使用recordId进行精确匹配）
          let recordToUpdate;
          if (dayRecord.recordId) {
            recordToUpdate = attendanceRecords.find(r => r.recordId === dayRecord.recordId);
          } else {
            // 兼容旧记录，使用姓名、组别和时间匹配
            recordToUpdate = attendanceRecords.find(r => 
              r.name === dayRecord.name && 
              r.group === dayRecord.group && 
              r.time === dayRecord.time
            );
          }
          
          if (recordToUpdate) {
            console.log('找到要更新的记录，更新前:', recordToUpdate);
            
            // 直接更新记录的时间信息
            const originalTime = recordToUpdate.time;
            recordToUpdate.time = newTimeString;
            recordToUpdate.timeSlot = newTimeSlot;
            
            console.log('记录已更新，更新后:', recordToUpdate);
            console.log('原始时间:', originalTime, '-> 新时间:', newTimeString);
            
            // 保存到本地存储
            localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
            
            // 直接同步到Firebase，确保编辑操作生效
            await directSyncToFirebase();
            
            // 等待一小段时间确保Firebase更新完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 重新加载数据
            currentDate = document.getElementById('dateSelect').value;
            loadAttendanceData(currentDate);
            
            // 如果当前显示的是日报表，也重新加载日报表
            if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
              loadDailyReport(currentDate);
            }
            
            // 关闭对话框
            document.body.removeChild(dialog);
            
            alert('签到时间已更新！所有相关统计已重新计算。');
          } else {
            console.error('在attendanceRecords中未找到对应的记录');
            alert('未找到要更新的记录！');
          }
        } else {
          console.error('记录索引无效:', recordIndex);
          alert('记录索引无效！');
        }
      } catch (error) {
        console.error('编辑时间时出错:', error);
        alert('编辑时间时出错，请重试！');
      } finally {
        // 延迟重置编辑标记，确保同步完成
        setTimeout(() => {
          if (window.setSummaryIsEditing) {
            window.setSummaryIsEditing(false);
            console.log('编辑操作完成，恢复实时同步');
          }
        }, 3000);
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // 点击背景关闭对话框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  function formatDateTimeForInput(dateTimeString) {
    // 将中文日期时间格式转换为datetime-local输入格式
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  // 直接同步到Firebase，覆盖远程数据（用于删除操作）
  async function directSyncToFirebase() {
    try {
      if (db) {
        const attendanceRef = db.ref('attendanceRecords');
        await attendanceRef.set(attendanceRecords);
        console.log('签到记录已直接同步到Firebase（覆盖模式）');
      }
    } catch (error) {
      console.error('直接同步到Firebase失败:', error);
      throw error;
    }
  }

  function loadDailyReport(date) {
    if (!dailyReportList) return;
    
    console.log('日报表 - 开始加载，日期:', date);
    console.log('日报表 - groups数据:', groups);
    console.log('日报表 - 未分组是否存在:', groups['未分组']);
    console.log('日报表 - 未分组成员数量:', groups['未分组'] ? groups['未分组'].length : '不存在');
    
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    const dayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );

    // 统计各时段人数
    let earlyCountNum = 0, onTimeCountNum = 0, lateCountNum = 0;
    const signedNames = new Set();
    
    dayRecords.forEach(record => {
      signedNames.add(record.name);
      const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
      if (timeSlot === 'early') earlyCountNum++;
      else if (timeSlot === 'onTime') onTimeCountNum++;
      else if (timeSlot === 'late') lateCountNum++;
    });

    // 统计未签到人数（排除不统计的人员）
    const excludedMembers = window.utils.loadExcludedMembers();
    const allMembers = Object.keys(groups).flatMap(group => 
      groups[group].map(member => ({ group, name: member.name }))
    ).filter(member => 
      !excludedMembers.some(excluded => 
        excluded.name === member.name && excluded.group === member.group
      )
    );
    const unsignedCountNum = allMembers.length - signedNames.size;

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

    // 计算签到总人数
    const signedCountNum = earlyCountNum + onTimeCountNum + lateCountNum;

    // 更新汇总数据
    if (earlyCount) earlyCount.textContent = earlyCountNum;
    if (onTimeCount) onTimeCount.textContent = onTimeCountNum;
    if (lateCount) lateCount.textContent = lateCountNum;
    if (signedCount) signedCount.textContent = signedCountNum;
    if (unsignedCount) unsignedCount.textContent = unsignedCountNum;
    if (newcomerCount) newcomerCount.textContent = newcomerCountNum;
    
    const totalMembers = allMembers.length;
    const attendanceRateNum = totalMembers > 0 ? Math.round((signedNames.size / totalMembers) * 100) : 0;
    if (attendanceRate) attendanceRate.textContent = attendanceRateNum + '%';

    // 生成详细的日报表内容
    dailyReportList.innerHTML = '';
    
    // 按组别显示签到情况（按字母顺序排序），"未分组"永远排在最后
    const sortedGroups = window.utils.sortGroups(groups, groupNames);
    console.log('日报表 - 所有组别:', sortedGroups);
    console.log('日报表 - groups数据:', groups);
    sortedGroups.forEach(group => {
      const groupMembers = groups[group] || [];
      const groupName = groupNames[group] || group;
      console.log(`日报表 - 处理组别: ${group}, 成员数量: ${groupMembers.length}`);
      
      // 统计该组的签到情况
      const groupRecords = dayRecords.filter(record => record.group === group);
      const signedMembers = groupRecords.map(record => record.name);
      
      // 过滤掉不统计的人员
      const unsignedMembers = window.utils.filterExcludedMembers(
        groupMembers.filter(member => !signedMembers.includes(member.name)),
        group,
        excludedMembers
      );
      
      // 按时间段分类签到记录，并过滤掉不统计的人员
      const earlyRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
        return timeSlot === 'early' && !isExcluded;
      });
      
      const onTimeRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
        return timeSlot === 'onTime' && !isExcluded;
      });
      
      const lateRecords = groupRecords.filter(record => {
        const timeSlot = window.utils.getAttendanceType(new Date(record.time));
        const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
        return timeSlot === 'late' && !isExcluded;
      });
      
      const row = document.createElement('tr');
      const unsignedNames = unsignedMembers.map(member => member.name).join(', ');
      
      // 计算上午签到人数（早到+准时+迟到）
      const morningSignedCount = earlyRecords.length + onTimeRecords.length + lateRecords.length;
      
      // 计算应到人数（排除不统计人员）
      const validGroupMembers = window.utils.filterExcludedMembers(groupMembers, group, excludedMembers);
      const totalGroupMembers = validGroupMembers.length;
      
      // 计算签到率（上午签到人数/应到人数）
      const attendanceRate = totalGroupMembers > 0 ? Math.round((morningSignedCount / totalGroupMembers) * 100) : 0;
      
      row.innerHTML = `
        <td>${groupName}</td>
        <td>${earlyRecords.map(record => record.name).join(', ')}</td>
        <td>${onTimeRecords.map(record => record.name).join(', ')}</td>
        <td>${lateRecords.map(record => record.name).join(', ')}</td>
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
      const signedNames = groupSigned.map(record => record.name);
      // 获取不统计人员列表
      const excludedMembers = window.utils.loadExcludedMembers();
      
      // 过滤掉不统计的人员
      const unsignedMembers = groupMembers.filter(member => 
        !signedNames.includes(member.name) &&
        !excludedMembers.some(excluded => 
          excluded.name === member.name && excluded.group === group
        )
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
      const groupRate = groupMembers.length > 0 ? Math.round((groupSigned.length / groupMembers.length) * 100) : 0;
      
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

  function loadQuarterlyReport(quarter) {
    if (!quarterlyReportList) return;
    
    const [year, q] = quarter.split('-Q');
    const startMonth = (parseInt(q) - 1) * 3;
    const startDate = new Date(parseInt(year), startMonth, 1);
    const endDate = new Date(parseInt(year), startMonth + 3, 0);
    
    const quarterRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 获取不统计人员列表
    const excludedMembers = window.utils.loadExcludedMembers();
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    quarterRecords.forEach(record => {
      // 检查是否在不统计列表中（使用UUID匹配）
      const isExcluded = window.utils.isMemberExcluded(record, excludedMembers);
      
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

  function loadYearlyReport(year) {
    if (!yearlyReportList) return;
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    
    const yearRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 获取不统计人员列表
    const excludedMembers = window.utils.loadExcludedMembers();
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    yearRecords.forEach(record => {
      // 检查是否在不统计列表中（使用UUID匹配）
      const isExcluded = window.utils.isMemberExcluded(record, excludedMembers);
      
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

  // 加载签到数据
  function loadAttendanceData(date) {
    if (!attendanceDataList) return;
    
    console.log('加载签到数据，日期:', date);
    
    let filteredRecords = attendanceRecords;
    if (date) {
      const targetDate = new Date(date).toLocaleDateString('zh-CN');
      filteredRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString('zh-CN') === targetDate
      );
    }
    
    console.log('加载签到数据，记录数量:', filteredRecords.length);
    console.log('attendanceDataList元素:', attendanceDataList);
    
    attendanceDataList.innerHTML = '';
    
    if (filteredRecords.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="5" class="empty-state">
          <div class="empty-message">
            <span class="empty-icon">📝</span>
            <span class="empty-text">暂无签到数据</span>
          </div>
        </td>
      `;
      attendanceDataList.appendChild(emptyRow);
      return;
    }
    
    // 按时间排序
    filteredRecords.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    filteredRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      row.className = index % 2 === 0 ? 'even' : 'odd';
      
      // 使用快照数据，确保显示的是签到时的真实信息
      const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
      const displayName = record.memberSnapshot?.name || record.name;
      const displayNickname = record.memberSnapshot?.nickname || '';
      const fullName = displayNickname ? `${displayName} (${displayNickname})` : displayName;
      
      // 格式化时间
      const timeStr = new Date(record.time).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // 获取签到时段
      const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
      const timeSlotText = {
        'early': '早到',
        'onTime': '准时',
        'late': '迟到',
        'afternoon': '下午',
        'evening': '晚上'
      }[timeSlot] || timeSlot;
      
      // 生成唯一标识符用于定位记录
      const recordKey = `${record.name}_${record.time}_${record.group}`;
      
      row.innerHTML = `
        <td>${displayGroup}</td>
        <td>${fullName}</td>
        <td>${timeStr}</td>
        <td>${timeSlotText}</td>
        <td>
          <button class="edit-btn" data-record-key="${recordKey}">编辑</button>
          <button class="delete-btn" data-record-key="${recordKey}">删除</button>
        </td>
      `;
      
      attendanceDataList.appendChild(row);
    });
    
    // 添加事件监听器
    addEditEventListeners();
  }
  
  // 添加编辑事件监听器
  function addEditEventListeners() {
    // 编辑按钮事件
    const editButtons = attendanceDataList.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const recordKey = e.target.dataset.recordKey;
        const record = findRecordByKey(recordKey);
        if (record) {
          const index = attendanceRecords.indexOf(record);
          showEditDialog(record, index);
        }
      });
    });
    
    // 删除按钮事件
    const deleteButtons = attendanceDataList.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const recordKey = e.target.dataset.recordKey;
        const record = findRecordByKey(recordKey);
        if (record && confirm(`确定要删除 ${record.name} 的签到记录吗？`)) {
          const index = attendanceRecords.indexOf(record);
          deleteAttendanceRecord(index);
        }
      });
    });
  }
  
  // 根据记录键查找记录（使用索引缓存优化）
  function findRecordByKey(recordKey) {
    // 优先使用索引缓存
    if (window.utils && window.utils.UUIDIndex) {
      return window.utils.UUIDIndex.findRecordByKey(recordKey);
    }
    
    // 降级到原始查找方法
    return attendanceRecords.find(record => {
      const key = `${record.name}_${record.time}_${record.group}`;
      return key === recordKey;
    });
  }
  
  // 显示编辑对话框
  function showEditDialog(record, index) {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>编辑签到记录</h3>
        <div class="form-group">
          <label for="editGroup">组别：</label>
          <select id="editGroup">
            ${Object.keys(groupNames).map(groupId => 
              `<option value="${groupId}" ${groupId === record.group ? 'selected' : ''}>${groupNames[groupId] || groupId}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="editTime">时间：</label>
          <input type="datetime-local" id="editTime" value="${formatDateTimeForInput(record.time)}">
        </div>
        <div class="dialog-buttons">
          <button id="saveEdit" class="save-btn">保存</button>
          <button id="cancelEdit" class="cancel-btn">取消</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 事件监听器
    document.getElementById('saveEdit').addEventListener('click', () => {
      saveEdit(record, index);
      document.body.removeChild(dialog);
    });
    
    document.getElementById('cancelEdit').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // 点击背景关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }
  
  // 格式化日期时间用于输入框
  function formatDateTimeForInput(dateTimeStr) {
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  // 保存编辑
  function saveEdit(record, index) {
    const newGroup = document.getElementById('editGroup').value;
    const newTime = document.getElementById('editTime').value;
    
    if (!newGroup || !newTime) {
      alert('请填写完整信息！');
      return;
    }
    
    // 更新记录
    const updatedRecord = {
      ...record,
      group: newGroup,
      time: new Date(newTime).toLocaleString('zh-CN'),
      timeSlot: window.utils.getAttendanceType(new Date(newTime))
    };
    
    // 更新数组
    attendanceRecords[index] = updatedRecord;
    
    // 同步到Firebase
    directSyncToFirebase().then(() => {
      // 重新加载数据
      const currentDate = dateSelect ? dateSelect.value : null;
      loadAttendanceData(currentDate);
      alert('编辑成功！');
    }).catch(error => {
      console.error('保存编辑失败:', error);
      alert('保存失败，请重试！');
    });
  }
  
  // 删除签到记录
  function deleteAttendanceRecord(index) {
    attendanceRecords.splice(index, 1);
    
    // 同步到Firebase
    directSyncToFirebase().then(() => {
      // 重新加载数据
      const currentDate = dateSelect ? dateSelect.value : null;
      loadAttendanceData(currentDate);
      alert('删除成功！');
    }).catch(error => {
      console.error('删除失败:', error);
      alert('删除失败，请重试！');
    });
  }


