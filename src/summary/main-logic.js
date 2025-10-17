/**
 * 汇总页面 - 主逻辑模块
 * 功能：事件监听、页面初始化、表格渲染
 * 
 * 注意：此文件包含 DOMContentLoaded 的核心逻辑
 * 由于涉及大量内部函数和闭包，保持为一个模块以确保功能完整性
 */

// ==================== 主初始化函数 ====================

/**
 * 初始化汇总页面（主入口）
 */
async function initializeSummaryPage() {
  console.log('🚀 开始初始化汇总页面...');
  
  // 初始化DOM元素
  window.summaryPage.initializeDOMElements();
  
  // 初始化页面同步管理器
  window.summaryPage.initializePageSyncManager();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 【优化V2.0】只加载基础数据，不加载签到记录
  await window.summaryPage.loadBasicDataOnly();
  
  // 🔧 修复：初始化页面状态（设置默认日期、显示section、加载今天的数据）
  await initializePage();
  
  // 🔔 监听数据更新事件，自动刷新页面数据
  window.addEventListener('attendanceRecordsUpdated', (event) => {
    console.log('🔔 汇总页面检测到签到记录更新事件:', event.detail);
    
    // 清除所有sessionStorage中的签到记录缓存
    window.summaryPage.clearAllAttendanceCache();
    
    // 重新加载当前section的数据
    window.summaryPage.reloadCurrentSection();
  });
  
  console.log("✅ 汇总页面初始化完成（精简加载模式）");
  console.log('✅ 数据更新事件监听器已注册');
}

// ==================== 内部函数：页面初始化 ====================

/**
 * 初始化页面状态
 */
async function initializePage() {
  const dom = window.summaryPage.dom;
  
  // 设置默认日期为今天
  const today = window.utils.getLocalDateString();
  if (dom.dailyDateSelect) dom.dailyDateSelect.value = today;
  
  // 初始化季度和年份选项
  initializePeriodOptions();
  
  // 默认显示日报表
  showSection('dailyReport');
  
  // 🔧 修复：自动加载今天的日报表数据
  console.log('🔄 自动加载今天的日报表数据...');
  const todayRecords = await window.summaryPage.loadAttendanceDataForDate(today);
  loadDailyReport(today, todayRecords);
}

/**
 * 初始化时期选项
 */
function initializePeriodOptions() {
  const dom = window.summaryPage.dom;
  
  // 🔧 修复：由于优化V2.0不再预加载attendanceRecords，改为生成当前年份和过去2年的选项
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  
  // 初始化年份选择器
  if (dom.yearSelect) {
    dom.yearSelect.innerHTML = '';
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year}年`;
      dom.yearSelect.appendChild(option);
    });
  }
  
  // 季度选项保持不变
  if (dom.quarterSelect) {
    dom.quarterSelect.innerHTML = `
      <option value="Q1">第一季度 (1-3月)</option>
      <option value="Q2">第二季度 (4-6月)</option>
      <option value="Q3">第三季度 (7-9月)</option>
      <option value="Q4">第四季度 (10-12月)</option>
    `;
  }
}

/**
 * 显示指定section
 */
function showSection(sectionName) {
  const dom = window.summaryPage.dom;
  
  // 隐藏所有section
  if (dom.dailyReportSection) dom.dailyReportSection.classList.add('hidden-form');
  if (dom.quarterlyReportSection) dom.quarterlyReportSection.classList.add('hidden-form');
  if (dom.yearlyReportSection) dom.yearlyReportSection.classList.add('hidden-form');
  
  // 显示指定section
  if (sectionName === 'dailyReport' && dom.dailyReportSection) {
    dom.dailyReportSection.classList.remove('hidden-form');
  } else if (sectionName === 'quarterlyReport' && dom.quarterlyReportSection) {
    dom.quarterlyReportSection.classList.remove('hidden-form');
  } else if (sectionName === 'yearlyReport' && dom.yearlyReportSection) {
    dom.yearlyReportSection.classList.remove('hidden-form');
  }
}

// ==================== 事件监听器初始化 ====================

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
  const dom = window.summaryPage.dom;
  
  // 返回按钮事件
  if (dom.backButton) {
    dom.backButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.smartNavigateTo('admin.html');
      } else {
        window.location.href = 'admin.html';
      }
    });
  }

  if (dom.backToSigninButton) {
    dom.backToSigninButton.addEventListener('click', async () => {
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
      // 直接跳转到index页面
      window.location.href = 'index.html';
    });
  }

  // 刷新数据按钮事件
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', async () => {
      try {
        // 清除所有缓存
        refreshDataBtn.disabled = true;
        refreshDataBtn.textContent = '⏳ 刷新中...';
        
        const clearedCount = window.summaryPage.clearAllAttendanceCache();
        console.log(`🗑️ 已清除 ${clearedCount} 个缓存项`);
        
        // 重新加载当前section
        await window.summaryPage.reloadCurrentSection();
        
        // 恢复按钮状态
        refreshDataBtn.disabled = false;
        refreshDataBtn.textContent = '🔄 刷新数据';
        
        alert(`✅ 数据刷新完成！\n清除了 ${clearedCount} 个缓存项，已重新加载最新数据。`);
      } catch (error) {
        console.error('刷新数据失败:', error);
        refreshDataBtn.disabled = false;
        refreshDataBtn.textContent = '🔄 刷新数据';
        alert('刷新数据失败，请重试！');
      }
    });
  }

  // 报表切换按钮
  if (dom.showDailyReport) {
    dom.showDailyReport.addEventListener('click', () => showSection('dailyReport'));
  }
  
  if (dom.showSundayTracking) {
    dom.showSundayTracking.addEventListener('click', () => {
      window.location.href = 'sunday-tracking.html';
    });
  }
  
  if (dom.showQuarterlyReport) {
    dom.showQuarterlyReport.addEventListener('click', () => showSection('quarterlyReport'));
  }
  
  if (dom.showYearlyReport) {
    dom.showYearlyReport.addEventListener('click', () => showSection('yearlyReport'));
  }

  // 查看按钮事件
  if (dom.viewDailyReport) {
    dom.viewDailyReport.addEventListener('click', async () => {
      const date = dom.dailyDateSelect?.value;
      if (date) {
        const records = await window.summaryPage.loadAttendanceDataForDate(date);
        loadDailyReport(date, records);
      }
    });
  }

  if (dom.viewQuarterlyReport) {
    dom.viewQuarterlyReport.addEventListener('click', async () => {
      const quarter = dom.quarterSelect?.value;
      if (quarter) {
        await loadQuarterlyReportData(quarter);
      }
    });
  }

  if (dom.yearlyReport) {
    dom.yearlyReport.addEventListener('click', async () => {
      const year = dom.yearSelect?.value;
      if (year) {
        await loadYearlyReportData(year);
      }
    });
  }
}

// ==================== 导出到 window ====================
window.summaryPage.initializeSummaryPage = initializeSummaryPage;
window.summaryPage.initializePage = initializePage;
window.summaryPage.showSection = showSection;

console.log('✅ 汇总页面 - 主逻辑模块已加载');


