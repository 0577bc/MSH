/**
 * 公共工具函数模块 (utils.js)
 * 功能：提供通用工具函数，数据管理，系统辅助功能
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 防重复提交机制 ====================

/**
 * 防重复提交装饰器
 * @param {Function} fn 要包装的函数
 * @param {string} key 唯一标识符，用于区分不同的操作
 * @returns {Function} 包装后的函数
 */
function preventDuplicateExecution(fn, key) {
  return async function(...args) {
    const flagName = `isExecuting_${key}`;
    
    // 检查是否正在执行
    if (window[flagName]) {
      console.log(`⚠️ ${key} 正在执行中，请勿重复提交`);
      return;
    }
    
    // 设置执行标志
    window[flagName] = true;
    
    try {
      // 执行原函数
      const result = await fn.apply(this, args);
      return result;
    } catch (error) {
      console.error(`${key} 执行失败:`, error);
      throw error;
    } finally {
      // 清除执行标志
      window[flagName] = false;
    }
  };
}

/**
 * 防重复提交的保存操作
 * @param {Function} saveFunction 保存函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的保存函数
 */
function createSafeSaveFunction(saveFunction, operationName) {
  return preventDuplicateExecution(saveFunction, `save_${operationName}`);
}

/**
 * 防重复提交的同步操作
 * @param {Function} syncFunction 同步函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的同步函数
 */
function createSafeSyncFunction(syncFunction, operationName) {
  return preventDuplicateExecution(syncFunction, `sync_${operationName}`);
}

/**
 * 防重复提交的删除操作
 * @param {Function} deleteFunction 删除函数
 * @param {string} operationName 操作名称
 * @returns {Function} 防重复的删除函数
 */
function createSafeDeleteFunction(deleteFunction, operationName) {
  return preventDuplicateExecution(deleteFunction, `delete_${operationName}`);
}

// ==================== 数据加密管理器 ====================
const DataEncryption = {
  // 简单的Base64编码/解码（用于本地存储保护）
  // 注意：这不是真正的加密，只是简单的编码，防止明文存储
  
  // 生成简单的密钥（基于页面URL和用户代理）
  generateKey: function() {
    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 按天变化
    return btoa(pageUrl + userAgent + timestamp).substring(0, 16);
  },
  
  // 简单的XOR加密
  xorEncrypt: function(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  },
  
  // 加密数据
  encrypt: function(data) {
    try {
      const jsonString = JSON.stringify(data);
      const key = this.generateKey();
      const encrypted = this.xorEncrypt(jsonString, key);
      return btoa(encrypted);
    } catch (error) {
      console.error('数据加密失败:', error);
      return data; // 加密失败时返回原始数据
    }
  },
  
  // 解密数据
  decrypt: function(encryptedData) {
    try {
      const key = this.generateKey();
      const decrypted = this.xorEncrypt(atob(encryptedData), key);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('数据解密失败:', error);
      return null; // 解密失败时返回null
    }
  },
  
  // 检查数据是否已加密
  isEncrypted: function(data) {
    try {
      // 尝试解析为JSON，如果失败则可能是加密数据
      JSON.parse(data);
      return false;
    } catch {
      // 尝试Base64解码，如果成功则可能是加密数据
      try {
        atob(data);
        return true;
      } catch {
        return false;
      }
    }
  }
};

// ==================== 加密本地存储管理器 ====================
const EncryptedStorage = {
  // 加密存储数据
  setItem: function(key, data) {
    try {
      const encryptedData = DataEncryption.encrypt(data);
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      // 降级到普通存储
      localStorage.setItem(key, JSON.stringify(data));
    }
  },
  
  // 解密读取数据
  getItem: function(key) {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;
      
      // 检查是否是加密数据
      if (DataEncryption.isEncrypted(encryptedData)) {
        const decryptedData = DataEncryption.decrypt(encryptedData);
        if (decryptedData !== null) {
          return decryptedData;
        }
      }
      
      // 如果不是加密数据或解密失败，尝试直接解析JSON
      return JSON.parse(encryptedData);
    } catch (error) {
      return null;
    }
  },
  
  // 删除数据
  removeItem: function(key) {
    localStorage.removeItem(key);
  },
  
  /**
   * ⚠️ 危险操作：清空所有localStorage数据
   * 
   * 警告：此操作会删除所有MSH系统的本地数据！
   * 包括：签到记录、小组数据、成员信息、配置等
   * 
   * 使用场景：
   * - 系统完全重置
   * - 数据损坏需要重新加载
   * - 测试环境清理
   * 
   * 建议：
   * - 清空前确保已从Firebase加载完整数据
   * - 或者只删除特定数据而不是全部清空
   * - 考虑使用removeItem()删除特定项
   * 
   * @危险级别 🔴 高
   * @参考 2025-10-07数据覆盖事故教训
   */
  clear: function() {
    console.warn('⚠️ localStorage.clear()被调用，所有本地数据将被清空！');
    localStorage.clear();
  }
};


// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
Object.assign(window.utils, {
  preventDuplicateExecution,
  createSafeSaveFunction,
  createSafeSyncFunction,
  createSafeDeleteFunction,
  DataEncryption,
  EncryptedStorage
});
