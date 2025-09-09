/**
 * SessionStorage管理器
 * 替代LocalStorage，提供会话级数据存储
 */

class SessionStorageManager {
  constructor() {
    this.prefix = 'msh_';
    this.isAvailable = this.checkAvailability();
    this.fallbackStorage = new Map(); // 内存回退存储
  }

  /**
   * 检查SessionStorage是否可用
   */
  checkAvailability() {
    try {
      const testKey = '__session_storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('SessionStorage不可用，使用内存存储回退');
      return false;
    }
  }

  /**
   * 设置数据
   */
  setItem(key, value) {
    const fullKey = this.prefix + key;
    const serializedValue = JSON.stringify(value);
    
    try {
      if (this.isAvailable) {
        sessionStorage.setItem(fullKey, serializedValue);
      } else {
        this.fallbackStorage.set(fullKey, serializedValue);
      }
      return true;
    } catch (error) {
      console.error('设置SessionStorage失败:', error);
      // 尝试清理空间后重试
      this.cleanup();
      try {
        if (this.isAvailable) {
          sessionStorage.setItem(fullKey, serializedValue);
        } else {
          this.fallbackStorage.set(fullKey, serializedValue);
        }
        return true;
      } catch (retryError) {
        console.error('重试设置SessionStorage失败:', retryError);
        return false;
      }
    }
  }

  /**
   * 获取数据
   */
  getItem(key) {
    const fullKey = this.prefix + key;
    
    try {
      let value;
      if (this.isAvailable) {
        value = sessionStorage.getItem(fullKey);
      } else {
        value = this.fallbackStorage.get(fullKey);
      }
      
      if (value === null || value === undefined) {
        return null;
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error('获取SessionStorage失败:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  removeItem(key) {
    const fullKey = this.prefix + key;
    
    try {
      if (this.isAvailable) {
        sessionStorage.removeItem(fullKey);
      } else {
        this.fallbackStorage.delete(fullKey);
      }
      return true;
    } catch (error) {
      console.error('删除SessionStorage失败:', error);
      return false;
    }
  }

  /**
   * 检查数据是否存在
   */
  hasItem(key) {
    const fullKey = this.prefix + key;
    
    if (this.isAvailable) {
      return sessionStorage.getItem(fullKey) !== null;
    } else {
      return this.fallbackStorage.has(fullKey);
    }
  }

  /**
   * 获取所有键
   */
  getAllKeys() {
    const keys = [];
    
    if (this.isAvailable) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    } else {
      for (const key of this.fallbackStorage.keys()) {
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    }
    
    return keys;
  }

  /**
   * 获取所有数据
   */
  getAllData() {
    const data = {};
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const value = this.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    });
    
    return data;
  }

  /**
   * 清空所有数据
   */
  clear() {
    try {
      if (this.isAvailable) {
        const keys = this.getAllKeys();
        keys.forEach(key => {
          sessionStorage.removeItem(this.prefix + key);
        });
      } else {
        this.fallbackStorage.clear();
      }
      return true;
    } catch (error) {
      console.error('清空SessionStorage失败:', error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo() {
    let used = 0;
    let total = 0;
    
    if (this.isAvailable) {
      // 计算已使用空间
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = sessionStorage.getItem(key);
          used += key.length + (value ? value.length : 0);
        }
      }
      
      // 估算总空间（通常为5-10MB）
      total = 5 * 1024 * 1024; // 5MB
    } else {
      // 内存存储统计
      for (const [key, value] of this.fallbackStorage) {
        used += key.length + value.length;
      }
      total = 50 * 1024 * 1024; // 50MB内存限制
    }
    
    return {
      used: used,
      total: total,
      percentage: total > 0 ? (used / total * 100).toFixed(2) : 0,
      isAvailable: this.isAvailable
    };
  }

  /**
   * 清理存储空间
   */
  cleanup() {
    try {
      const info = this.getStorageInfo();
      if (info.percentage > 80) { // 使用率超过80%时清理
        console.log('SessionStorage使用率过高，开始清理...');
        
        // 清理最旧的数据
        const keys = this.getAllKeys();
        const keyTimestamps = [];
        
        keys.forEach(key => {
          const data = this.getItem(key);
          if (data && data.timestamp) {
            keyTimestamps.push({ key, timestamp: data.timestamp });
          }
        });
        
        // 按时间戳排序，删除最旧的20%
        keyTimestamps.sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = Math.ceil(keyTimestamps.length * 0.2);
        
        for (let i = 0; i < toDelete; i++) {
          this.removeItem(keyTimestamps[i].key);
        }
        
        console.log(`清理了 ${toDelete} 个旧数据项`);
      }
    } catch (error) {
      console.error('清理SessionStorage失败:', error);
    }
  }

  /**
   * 导出数据
   */
  exportData() {
    const data = this.getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_storage_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 导入数据
   */
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          let imported = 0;
          
          for (const [key, value] of Object.entries(data)) {
            if (this.setItem(key, value)) {
              imported++;
            }
          }
          
          console.log(`成功导入 ${imported} 个数据项`);
          resolve(imported);
        } catch (error) {
          reject(new Error('导入文件格式错误'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }
}

// 创建全局实例
const sessionStorageManager = new SessionStorageManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.sessionStorageManager = sessionStorageManager;
}

// 兼容性：提供与localStorage相同的接口
if (typeof window !== 'undefined') {
  // 重定向localStorage调用到sessionStorage
  const originalLocalStorage = window.localStorage;
  
  window.localStorage = {
    getItem: (key) => {
      if (key && key.startsWith('msh_')) {
        return sessionStorageManager.getItem(key.substring(4));
      }
      return originalLocalStorage.getItem(key);
    },
    
    setItem: (key, value) => {
      if (key && key.startsWith('msh_')) {
        return sessionStorageManager.setItem(key.substring(4), value);
      }
      return originalLocalStorage.setItem(key, value);
    },
    
    removeItem: (key) => {
      if (key && key.startsWith('msh_')) {
        return sessionStorageManager.removeItem(key.substring(4));
      }
      return originalLocalStorage.removeItem(key);
    },
    
    clear: () => {
      sessionStorageManager.clear();
      return originalLocalStorage.clear();
    },
    
    get length() {
      return sessionStorageManager.getAllKeys().length + originalLocalStorage.length;
    },
    
    key: (index) => {
      const sessionKeys = sessionStorageManager.getAllKeys();
      if (index < sessionKeys.length) {
        return 'msh_' + sessionKeys[index];
      }
      return originalLocalStorage.key(index - sessionKeys.length);
    }
  };
}
