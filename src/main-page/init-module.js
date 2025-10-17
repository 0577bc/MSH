/**
 * 主签到页面 - 初始化模块
 * 功能：Firebase初始化、DOM初始化、页面同步管理器
 */

// ==================== Firebase初始化 ====================

/**
 * 初始化Firebase
 */
function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    window.mainPage.app = result.app;
    window.mainPage.db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = result.db;
    console.log('✅ 主页面Firebase初始化成功');
  } else {
    console.error('❌ 主页面Firebase初始化失败');
    alert('Firebase配置错误，请检查config.js文件');
  }
}

// ==================== 页面同步管理器初始化 ====================

/**
 * 初始化页面同步管理器
 */
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    window.mainPage.pageSyncManager = new window.utils.PageSyncManager('main');
    console.log('主页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================

/**
 * 初始化DOM元素
 */
function initializeDOMElements() {
  const dom = window.mainPage.dom;
  
  dom.groupSelect = document.getElementById('groupSelect');
  dom.memberSelect = document.getElementById('memberSelect');
  dom.memberSearch = document.getElementById('memberSearch');
  dom.suggestions = document.getElementById('suggestions');
  dom.signinButton = document.getElementById('signinButton');
  dom.addNewcomerButton = document.getElementById('addNewcomerButton');
  dom.dailyReportButton = document.getElementById('dailyReportButton');
  dom.adminButton = document.getElementById('adminButton');
  dom.addMemberForm = document.getElementById('addMemberForm');
  dom.newGroupSelect = document.getElementById('newGroupSelect');
  dom.newMemberName = document.getElementById('newMemberName');
  dom.newMemberPhone = document.getElementById('newMemberPhone');
  dom.saveNewMemberButton = document.getElementById('saveNewMemberButton');
  dom.cancelNewMemberButton = document.getElementById('cancelNewMemberButton');
  dom.earlyList = document.getElementById('earlyList');
  dom.onTimeList = document.getElementById('onTimeList');
  dom.lateList = document.getElementById('lateList');
}

// ==================== 导出到 window ====================
window.mainPage.initializeFirebase = initializeFirebase;
window.mainPage.initializePageSyncManager = initializePageSyncManager;
window.mainPage.initializeDOMElements = initializeDOMElements;

console.log('✅ 主签到页面 - 初始化模块已加载');


