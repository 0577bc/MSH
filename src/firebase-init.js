// Firebase 初始化模块
// 统一管理 Firebase 的初始化和错误处理

let app, db;

/**
 * 初始化 Firebase 应用
 * @returns {Object} Firebase 应用和数据库实例
 */
function initializeFirebase() {
  try {
    // 检查是否已经初始化
    if (app && db) {
      return { app, db };
    }

    // 检查配置是否存在
    if (!window.firebaseConfig) {
      throw new Error('Firebase 配置未找到，请检查 config.js 文件');
    }

    // 初始化 Firebase
    app = firebase.app();
    db = firebase.database();
    
    console.log('Firebase 初始化成功');
    return { app, db };
  } catch (error) {
    console.error('Firebase 初始化失败:', error);
    
    // 尝试重新初始化
    try {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      console.log('Firebase 重新初始化成功');
      return { app, db };
    } catch (retryError) {
      console.error('Firebase 重新初始化也失败:', retryError);
      throw new Error('无法连接到数据库，请检查网络连接和配置');
    }
  }
}

/**
 * 安全地获取数据库引用
 * @param {string} path - 数据库路径
 * @returns {Object} 数据库引用
 */
function getDatabaseRef(path) {
  const { db } = initializeFirebase();
  return db.ref(path);
}

/**
 * 安全地读取数据
 * @param {string} path - 数据路径
 * @returns {Promise} 数据快照
 */
async function readData(path) {
  try {
    const ref = getDatabaseRef(path);
    return await ref.once('value');
  } catch (error) {
    console.error(`读取数据失败 (${path}):`, error);
    throw error;
  }
}

/**
 * 安全地写入数据
 * @param {string} path - 数据路径
 * @param {any} data - 要写入的数据
 * @returns {Promise} 写入结果
 */
async function writeData(path, data) {
  try {
    const ref = getDatabaseRef(path);
    return await ref.set(data);
  } catch (error) {
    console.error(`写入数据失败 (${path}):`, error);
    throw error;
  }
}

// 导出函数供其他模块使用
window.FirebaseUtils = {
  initializeFirebase,
  getDatabaseRef,
  readData,
  writeData
};
