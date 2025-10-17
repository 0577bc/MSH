/**
 * Firebase工具函数模块 (firebase-utils.js)
 * 功能：Firebase初始化和基础工具
 * 作者：MSH系统
 * 版本：2.0
 */

/**
 * 通用Firebase初始化函数
 * @returns {Object} {app, db, success} Firebase应用实例和数据库实例
 */
function initializeFirebase() {
  try {
    // 检查Firebase SDK是否已加载
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK未加载，请检查网络连接或CDN状态');
      return { app: null, db: null, success: false };
    }
    
    // 检查是否已经初始化
    if (firebase.apps.length > 0) {
      const app = firebase.app();
      const db = firebase.database();
      console.log('✅ 使用已存在的Firebase应用');
      return { app, db, success: true };
    }
    
    // 使用全局Firebase配置初始化
    if (window.firebaseConfig) {
      const app = firebase.initializeApp(window.firebaseConfig);
      const db = firebase.database();
      console.log('✅ 创建新的Firebase应用');
      return { app, db, success: true };
    } else {
      console.error('❌ Firebase配置未找到');
      return { app: null, db: null, success: false };
    }
  } catch (error) {
    console.error('❌ Firebase初始化失败:', error);
    return { app: null, db: null, success: false };
  }
}

// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
window.utils.initializeFirebase = initializeFirebase;

