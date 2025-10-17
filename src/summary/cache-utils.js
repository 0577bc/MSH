/**
 * 汇总页面 - 缓存管理模块
 * 功能：缓存管理、数据刷新
 */

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
  const dom = window.summaryPage.dom;
  
  // 判断当前显示的是哪个模块
  if (dom.dailyReportSection && !dom.dailyReportSection.classList.contains('hidden-form')) {
    // 日报表
    const date = dom.dailyDateSelect?.value || window.utils.getLocalDateString();
    console.log('🔄 重新加载日报表:', date);
    const records = await window.summaryPage.loadAttendanceDataForDate(date);
    // 调用渲染函数（在 main-logic.js 中定义）
    if (window.summaryPage.loadDailyReport) {
      window.summaryPage.loadDailyReport(date, records);
    }
  } else if (dom.quarterlyReportSection && !dom.quarterlyReportSection.classList.contains('hidden-form')) {
    // 季度报表
    const quarter = dom.quarterSelect?.value;
    if (quarter && window.summaryPage.loadQuarterlyReportData) {
      console.log('🔄 重新加载季度报表:', quarter);
      await window.summaryPage.loadQuarterlyReportData(quarter);
    }
  } else if (dom.yearlyReportSection && !dom.yearlyReportSection.classList.contains('hidden-form')) {
    // 年度报表
    const year = dom.yearSelect?.value;
    if (year && window.summaryPage.loadYearlyReportData) {
      console.log('🔄 重新加载年度报表:', year);
      await window.summaryPage.loadYearlyReportData(year);
    }
  }
}

// ==================== 导出到 window ====================
window.summaryPage.clearCache = clearCache;
window.summaryPage.clearAllAttendanceCache = clearAllAttendanceCache;
window.summaryPage.reloadCurrentSection = reloadCurrentSection;

console.log('✅ 汇总页面 - 缓存管理模块已加载');


