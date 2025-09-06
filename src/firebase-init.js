// Firebase 初始化模块
// 统一管理 Firebase 的初始化和错误处理

let app, db;
let isInitialized = false;

/**
 * 初始化 Firebase 应用
 * @returns {Object} Firebase 应用和数据库实例
 */
function initializeFirebase() {
  try {
    // 检查是否已经初始化
    if (isInitialized && app && db) {
      return { app, db };
    }

    // 检查配置是否存在
    if (!window.firebaseConfig) {
      console.warn('Firebase 配置未找到，使用演示模式');
      // 提供默认配置
      window.firebaseConfig = {
        apiKey: "demo-api-key",
        authDomain: "demo-project.firebaseapp.com",
        databaseURL: "https://demo-project-default-rtdb.firebaseio.com/",
        projectId: "demo-project",
        storageBucket: "demo-project.firebasestorage.app",
        messagingSenderId: "123456789",
        appId: "demo-app-id"
      };
    }

    // 检查是否已经有默认应用
    try {
      app = firebase.app();
      db = firebase.database();
      console.log('使用已存在的Firebase应用');
    } catch (error) {
      // 如果没有默认应用，则创建新的
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      console.log('创建新的Firebase应用');
    }
    
    isInitialized = true;
    return { app, db };
  } catch (error) {
    console.error('Firebase 初始化失败:', error);
    // 返回模拟对象，避免应用崩溃
    return { 
      app: null, 
      db: null,
      isDemo: true 
    };
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
