/**
 * 主签到页面 - 共享状态模块
 * 功能：全局变量、DOM元素引用、错误处理
 */

// 初始化命名空间
if (!window.mainPage) {
  window.mainPage = {};
}

// ==================== 浏览器扩展错误处理 ====================
// 处理浏览器扩展连接错误，避免控制台错误日志
window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('Could not establish connection')) {
    // 忽略浏览器扩展连接错误
    event.preventDefault();
    return false;
  }
});

// 处理未捕获的Promise错误
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message && event.reason.message.includes('Could not establish connection')) {
    // 忽略浏览器扩展连接错误
    event.preventDefault();
    return false;
  }
});

// ==================== 全局变量 ====================
window.mainPage.app = null;
window.mainPage.db = null;
window.mainPage.groups = {};
window.mainPage.groupNames = {};
window.mainPage.attendanceRecords = [];
window.mainPage.pageSyncManager = null;

// ==================== DOM元素引用 ====================
window.mainPage.dom = {
  // 表单元素
  groupSelect: null,
  memberSelect: null,
  memberSearch: null,
  suggestions: null,
  
  // 按钮元素
  signinButton: null,
  addNewcomerButton: null,
  dailyReportButton: null,
  adminButton: null,
  
  // 新增成员表单
  addMemberForm: null,
  newGroupSelect: null,
  newMemberName: null,
  newMemberPhone: null,
  saveNewMemberButton: null,
  cancelNewMemberButton: null,
  
  // 签到名单
  earlyList: null,
  onTimeList: null,
  lateList: null
};

// ==================== 导出 ====================
console.log('✅ 主签到页面 - 共享状态模块已加载');


