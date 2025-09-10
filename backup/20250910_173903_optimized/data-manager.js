/**
 * 统一数据管理模块 (data-manager.js)
 * 功能：整合所有数据操作逻辑，消除代码重复，提供统一的数据访问接口
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - Firebase数据统一管理
 * - 智能缓存机制
 * - 数据同步和冲突解决
 * - 错误处理和重试机制
 */

class DataManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
    this.useSmartCache = true; // 启用智能缓存
  }

  // 初始化Firebase连接
  async initialize() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    try {
      // 检查Firebase是否已加载
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK未加载');
      }

      // 检查是否已经有默认应用
      try {
        this.db = firebase.database();
        console.log('使用已存在的Firebase应用');
      } catch (error) {
        // 如果没有默认应用，则创建新的
        if (window.firebaseConfig) {
          firebase.initializeApp(window.firebaseConfig);
          this.db = firebase.database();
          console.log('创建新的Firebase应用');
        } else {
          throw new Error('Firebase配置未找到');
        }
      }

      this.isInitialized = true;
      console.log('Firebase数据管理器初始化成功');
      return this.db;
    } catch (error) {
      console.error('Firebase初始化失败:', error);
      throw error;
    }
  }

  // 获取数据库引用
  getRef(path) {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db.ref(path);
  }

  // 带缓存的数据读取
  async readData(path, useCache = true) {
    try {
      await this.initialize();

      // 使用智能缓存（如果可用）
      if (useCache && this.useSmartCache && window.cacheManager) {
        const cachedData = window.cacheManager.get(path);
        if (cachedData !== null) {
          console.log(`从智能缓存读取数据: ${path}`);
          return cachedData;
        }
      }

      // 使用传统缓存
      if (useCache && !this.useSmartCache && this.cache.has(path)) {
        const expiry = this.cacheExpiry.get(path);
        if (Date.now() < expiry) {
          console.log(`从传统缓存读取数据: ${path}`);
          return this.cache.get(path);
        }
      }

      // 从Firebase读取
      const ref = this.getRef(path);
      const snapshot = await ref.once('value');
      const data = snapshot.val();

      // 更新缓存
      if (useCache) {
        if (this.useSmartCache && window.cacheManager) {
          window.cacheManager.set(path, data, this.CACHE_DURATION);
        } else {
          this.cache.set(path, data);
          this.cacheExpiry.set(path, Date.now() + this.CACHE_DURATION);
        }
      }

      return data;
    } catch (error) {
      console.error(`读取数据失败 (${path}):`, error);
      throw error;
    }
  }

  // 写入数据
  async writeData(path, data) {
    try {
      await this.initialize();

      // 验证CSRF令牌（如果可用）
      if (window.csrfProtection) {
        const token = window.csrfProtection.getToken();
        if (!token) {
          throw new Error('CSRF令牌不可用');
        }
      }

      const ref = this.getRef(path);
      await ref.set(data);

      // 清除相关缓存
      this.clearCache(path);

      console.log(`数据写入成功: ${path}`);
      return true;
    } catch (error) {
      console.error(`写入数据失败 (${path}):`, error);
      throw error;
    }
  }

  // 更新数据
  async updateData(path, updates) {
    try {
      await this.initialize();

      // 验证CSRF令牌（如果可用）
      if (window.csrfProtection) {
        const token = window.csrfProtection.getToken();
        if (!token) {
          throw new Error('CSRF令牌不可用');
        }
      }

      const ref = this.getRef(path);
      await ref.update(updates);

      // 清除相关缓存
      this.clearCache(path);

      console.log(`数据更新成功: ${path}`);
      return true;
    } catch (error) {
      console.error(`更新数据失败 (${path}):`, error);
      throw error;
    }
  }

  // 删除数据
  async deleteData(path) {
    try {
      await this.initialize();

      // 验证CSRF令牌（如果可用）
      if (window.csrfProtection) {
        const token = window.csrfProtection.getToken();
        if (!token) {
          throw new Error('CSRF令牌不可用');
        }
      }

      const ref = this.getRef(path);
      await ref.remove();

      // 清除相关缓存
      this.clearCache(path);

      console.log(`数据删除成功: ${path}`);
      return true;
    } catch (error) {
      console.error(`删除数据失败 (${path}):`, error);
      throw error;
    }
  }

  // 清除缓存
  clearCache(path = null) {
    if (this.useSmartCache && window.cacheManager) {
      if (path) {
        window.cacheManager.delete(path);
      } else {
        window.cacheManager.clear();
      }
    } else {
      if (path) {
        this.cache.delete(path);
        this.cacheExpiry.delete(path);
      } else {
        this.cache.clear();
        this.cacheExpiry.clear();
      }
    }
  }

  // 加载小组数据
  async loadGroups() {
    try {
      const groups = await this.readData('groups');
      return groups || {};
    } catch (error) {
      console.error('加载小组数据失败:', error);
      return {};
    }
  }

  // 加载小组名称
  async loadGroupNames() {
    try {
      const groupNames = await this.readData('groupNames');
      return groupNames || {};
    } catch (error) {
      console.error('加载小组名称失败:', error);
      return {};
    }
  }

  // 加载签到记录
  async loadAttendanceRecords() {
    try {
      const records = await this.readData('attendanceRecords');
      return Array.isArray(records) ? records : Object.values(records || {});
    } catch (error) {
      console.error('加载签到记录失败:', error);
      return [];
    }
  }

  // 加载管理员邮箱
  async loadAdminEmails() {
    try {
      const adminEmails = await this.readData('adminEmails');
      if (adminEmails) {
        return Object.keys(adminEmails).filter(email => adminEmails[email] === true);
      }
      return [];
    } catch (error) {
      console.error('加载管理员邮箱失败:', error);
      return [];
    }
  }

  // 加载不统计人员
  async loadExcludedMembers() {
    try {
      const excluded = await this.readData('excludedMembers');
      return Array.isArray(excluded) ? excluded : [];
    } catch (error) {
      console.error('加载不统计人员失败:', error);
      return [];
    }
  }

  // 保存小组数据
  async saveGroups(groups) {
    return await this.writeData('groups', groups);
  }

  // 保存小组名称
  async saveGroupNames(groupNames) {
    return await this.writeData('groupNames', groupNames);
  }

  // 保存签到记录
  async saveAttendanceRecords(records) {
    return await this.writeData('attendanceRecords', records);
  }

  // 保存管理员邮箱
  async saveAdminEmails(adminEmails) {
    const adminEmailsObj = {};
    adminEmails.forEach(email => {
      adminEmailsObj[email] = true;
    });
    return await this.writeData('adminEmails', adminEmailsObj);
  }

  // 保存不统计人员
  async saveExcludedMembers(excludedMembers) {
    return await this.writeData('excludedMembers', excludedMembers);
  }

  // 添加管理员
  async addAdmin(email) {
    try {
      const ref = this.getRef(`adminEmails/${email}`);
      await ref.set(true);
      this.clearCache('adminEmails');
      return true;
    } catch (error) {
      console.error('添加管理员失败:', error);
      throw error;
    }
  }

  // 移除管理员
  async removeAdmin(email) {
    try {
      const ref = this.getRef(`adminEmails/${email}`);
      await ref.remove();
      this.clearCache('adminEmails');
      return true;
    } catch (error) {
      console.error('移除管理员失败:', error);
      throw error;
    }
  }

  // 初始化示例数据
  async initializeSampleData() {
    try {
      const groups = await this.loadGroups();
      
      // 如果没有数据，则初始化示例数据
      if (!groups || Object.keys(groups).length === 0) {
        console.log("初始化示例数据...");
        
        if (window.sampleData) {
          await this.saveGroups(window.sampleData.groups);
          await this.saveGroupNames(window.sampleData.groupNames);
          console.log("示例数据初始化完成！");
        }
      }
    } catch (error) {
      console.error("初始化示例数据失败:", error);
      throw error;
    }
  }

  // 设置实时监听器
  setupRealtimeListener(path, callback) {
    try {
      const ref = this.getRef(path);
      ref.on('value', (snapshot) => {
        const data = snapshot.val();
        callback(data);
      });
    } catch (error) {
      console.error(`设置实时监听器失败 (${path}):`, error);
    }
  }

  // 移除实时监听器
  removeRealtimeListener(path) {
    try {
      const ref = this.getRef(path);
      ref.off('value');
    } catch (error) {
      console.error(`移除实时监听器失败 (${path}):`, error);
    }
  }
}

// 创建全局数据管理器实例
const dataManager = new DataManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.dataManager = dataManager;
}

// 导出类（已通过window对象导出）
