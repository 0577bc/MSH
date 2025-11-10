/**
 * 汇总页面 - 共享状态模块
 * 功能：全局变量、DOM元素引用、状态管理
 */

// 初始化命名空间
if (!window.summaryPage) {
  window.summaryPage = {};
}

// ==================== 全局变量 ====================
window.summaryPage.app = null;
window.summaryPage.db = null;
window.summaryPage.groups = {};
window.summaryPage.groupNames = {};
window.summaryPage.attendanceRecords = [];
window.summaryPage.pageSyncManager = null;

// 历史组别名称映射（用于兼容旧数据）
// 格式：{ "旧名称": "组别ID" }
// 通过UUID匹配验证，确保100%准确
window.summaryPage.HISTORICAL_GROUP_NAMES = {
  '乐清1组': 'group3',  // 现在是"花园小家" (匹配度: 2/2人)
  '乐清2组': 'group4',  // 现在是"时代小家" (匹配度: 8/8人)
  '乐清3组': 'group5',  // 现在是"以勒小家" (匹配度: 5/5人)
  '七里港': 'group1',   // 现在是"阿茜组" (匹配度: 5/5人)
};

// ==================== DOM元素引用 ====================
window.summaryPage.dom = {
  // 导航按钮
  backButton: null,
  backToSigninButton: null,
  exportButton: null,
  
  // 报表切换按钮
  showDailyReport: null,
  showSundayTracking: null,
  showQuarterlyReport: null,
  showYearlyReport: null,
  
  // 日期选择器
  dailyDateSelect: null,
  quarterSelect: null,
  yearSelect: null,
  
  // 查看按钮
  viewDailyReport: null,
  viewQuarterlyReport: null,
  viewYearlyReport: null,
  
  // 报表section
  dailyReportSection: null,
  quarterlyReportSection: null,
  yearlyReportSection: null,
  
  // 表格列表
  dailyReportList: null,
  quarterlyReportList: null,
  yearlyReportList: null
};

// ==================== 性能优化相关 ====================
window.summaryPage.virtualScrollManager = null;
window.summaryPage.useVirtualScroll = true;

// ==================== 导出 ====================
console.log('✅ 汇总页面 - 共享状态模块已加载');










