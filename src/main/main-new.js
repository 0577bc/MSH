/**
 * 主签到页面入口文件 (main-new.js)
 * 功能：简化的主入口文件，使用模块化架构
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 模块导入 ====================

// 导入公共模块
import { initializePage } from '../common/page-initializer.js';
import { handleError } from '../common/error-handler.js';

// 导入主页面模块
import { firebaseManager } from './firebase-manager.js';
import { domManager } from './dom-manager.js';
import { signinManager } from './signin-manager.js';
import { memberManager } from './member-manager.js';
import { uiManager } from './ui-manager.js';

// ==================== 全局变量 ====================

// 页面状态
let pageInitialized = false;

// ==================== 页面初始化 ====================

/**
 * 初始化主页面
 */
async function initializeMainPage() {
  try {
    console.log('🚀 开始初始化主签到页面...');

    // 1. 初始化DOM管理器
    const domResult = domManager.initialize();
    if (!domResult.success) {
      throw new Error('DOM管理器初始化失败');
    }

    // 2. 初始化Firebase管理器
    const firebaseResult = await firebaseManager.initialize();
    if (!firebaseResult.success) {
      throw new Error('Firebase管理器初始化失败');
    }

    // 3. 初始化成员管理器
    const memberResult = memberManager.initialize();
    if (!memberResult.success) {
      throw new Error('成员管理器初始化失败');
    }

    // 4. 初始化签到管理器
    const signinResult = signinManager.initialize();
    if (!signinResult.success) {
      throw new Error('签到管理器初始化失败');
    }

    // 5. 初始化界面交互管理器
    const uiResult = uiManager.initialize();
    if (!uiResult.success) {
      throw new Error('界面交互管理器初始化失败');
    }

    // 6. 初始化页面同步管理器
    if (window.utils && window.utils.PageSyncManager) {
      const pageSyncManager = new window.utils.PageSyncManager('main');
      window.pageSyncManager = pageSyncManager;
      console.log('✅ 页面同步管理器初始化完成');
    }

    pageInitialized = true;

    console.log('✅ 主签到页面初始化完成');
    console.log(`📊 初始化统计: DOM元素${domResult.count}个, 组别${memberResult.groupsCount}个, 成员${memberResult.membersCount}个`);

    return {
      success: true,
      stats: {
        domElements: domResult.count,
        groups: memberResult.groupsCount,
        members: memberResult.membersCount
      }
    };

  } catch (error) {
    const errorResult = handleError(error, {
      type: 'system',
      level: 'critical',
      context: { operation: 'main_page_initialization' }
    });

    console.error('❌ 主页面初始化失败:', errorResult.message);

    return {
      success: false,
      error: errorResult.error,
      message: errorResult.message
    };
  }
}

// ==================== 页面生命周期管理 ====================

/**
 * 页面加载完成事件
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM内容加载完成，开始初始化页面...');
  
  const result = await initializeMainPage();
  
  if (result.success) {
    console.log('🎉 主页面初始化成功，系统就绪');
    
    // 显示就绪状态
    if (window.performanceMonitor) {
      window.performanceMonitor.collectPerformanceData();
    }
  } else {
    console.error('💥 主页面初始化失败:', result.message);
    
    // 显示错误状态
    const errorMessage = `页面初始化失败: ${result.message}`;
    alert(errorMessage);
  }
});

/**
 * 页面卸载事件
 */
window.addEventListener('beforeunload', () => {
  if (pageInitialized) {
    console.log('🔄 页面即将卸载，清理资源...');
    
    // 清理资源
    if (window.pageSyncManager) {
      // 页面同步管理器清理
      console.log('🧹 清理页面同步管理器');
    }
    
    console.log('✅ 资源清理完成');
  }
});

// ==================== 全局错误处理 ====================

/**
 * 全局未捕获错误处理
 */
window.addEventListener('error', (event) => {
  // 忽略浏览器扩展错误
  if (event.message && event.message.includes('Could not establish connection')) {
    event.preventDefault();
    return false;
  }
  
  handleError(event.error || event.message, {
    type: 'system',
    level: 'high',
    context: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  });
});

/**
 * 全局未处理的Promise错误
 */
window.addEventListener('unhandledrejection', (event) => {
  // 忽略浏览器扩展错误
  if (event.reason && event.reason.message && event.reason.message.includes('Could not establish connection')) {
    event.preventDefault();
    return false;
  }
  
  handleError(event.reason, {
    type: 'system',
    level: 'high',
    context: {
      type: 'unhandledrejection'
    }
  });
});

// ==================== 全局工具函数 ====================

/**
 * 获取页面状态
 * @returns {Object} - 页面状态信息
 */
window.getPageStatus = function() {
  return {
    initialized: pageInitialized,
    firebase: firebaseManager.getStatus(),
    dom: domManager.getStatus(),
    signin: signinManager.getStatus(),
    member: memberManager.getStatus(),
    ui: uiManager.getStatus()
  };
};

/**
 * 重新初始化页面
 * @returns {Promise<Object>} - 重新初始化结果
 */
window.reinitializePage = async function() {
  console.log('🔄 重新初始化页面...');
  
  // 重置所有管理器
  firebaseManager.reset();
  domManager.reset();
  signinManager.reset();
  memberManager.reset();
  uiManager.reset();
  
  pageInitialized = false;
  
  // 重新初始化
  return await initializeMainPage();
};

/**
 * 导出页面数据
 * @returns {Object} - 页面数据
 */
window.exportPageData = function() {
  return {
    timestamp: new Date().toISOString(),
    signinStats: signinManager.getSigninStats(),
    memberStats: memberManager.getMemberStats(),
    pageStatus: window.getPageStatus()
  };
};

// ==================== 开发调试工具 ====================

/**
 * 开发模式调试工具
 */
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // 添加调试快捷键
  document.addEventListener('keydown', (event) => {
    // Ctrl + Shift + D: 显示调试信息
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      console.log('🔍 页面调试信息:', window.getPageStatus());
      console.log('📊 签到统计:', signinManager.getSigninStats());
      console.log('👥 成员统计:', memberManager.getMemberStats());
    }
    
    // Ctrl + Shift + R: 重新初始化
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      window.reinitializePage();
    }
  });
  
  console.log('🛠️ 开发调试模式已启用');
  console.log('快捷键: Ctrl+Shift+D (调试信息), Ctrl+Shift+R (重新初始化)');
}

// ==================== 模块导出 ====================

// 导出主要功能供其他模块使用
export {
  initializeMainPage,
  firebaseManager,
  domManager,
  signinManager,
  memberManager,
  uiManager
};

console.log('✅ 主签到页面入口文件已加载');
