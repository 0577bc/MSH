/**
 * Firebase管理器模块 (firebase-manager.js)
 * 功能：管理Firebase相关操作，包括数据读取、写入和同步
 * 作者：MSH系统
 * 版本：1.0
 */

import { handleError } from '../common/error-handler.js';

// ==================== Firebase管理器类 ====================

class FirebaseManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * 初始化Firebase
   * @returns {Promise<Object>} - 初始化结果
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return { success: true, app: this.app, db: this.db };
      }

      // 检查Firebase配置
      if (!window.firebaseConfig) {
        throw new Error('Firebase配置未找到');
      }

      // 初始化Firebase应用
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(window.firebaseConfig);
        console.log('✅ 创建新的Firebase应用');
      } else {
        this.app = firebase.app();
        console.log('✅ 使用现有Firebase应用');
      }

      // 初始化数据库
      this.db = firebase.database();
      this.isInitialized = true;

      // 设置全局变量
      window.app = this.app;
      window.db = this.db;

      return {
        success: true,
        app: this.app,
        db: this.db
      };

    } catch (error) {
      const errorResult = handleError(error, 'Firebase初始化');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 获取签到记录
   * @param {string} date - 日期（YYYY-MM-DD格式）
   * @returns {Promise<Object>} - 获取结果
   */
  async getAttendanceRecords(date = null) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const targetDate = date || window.utils.getLocalDateString();
      const snapshot = await this.db.ref('attendanceRecords')
        .orderByChild('date')
        .equalTo(targetDate)
        .once('value');

      const records = snapshot.val() || {};
      const recordsArray = Object.values(records);

      console.log(`✅ 获取${targetDate}的签到记录: ${recordsArray.length}条`);
      
      return {
        success: true,
        records: recordsArray,
        count: recordsArray.length,
        date: targetDate
      };

    } catch (error) {
      const errorResult = handleError(error, '获取签到记录');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 保存签到记录
   * @param {Object} record - 签到记录对象
   * @returns {Promise<Object>} - 保存结果
   */
  async saveAttendanceRecord(record) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 验证记录格式
      if (!this.validateAttendanceRecord(record)) {
        throw new Error('签到记录格式不正确');
      }

      const newRecordRef = this.db.ref('attendanceRecords').push();
      await newRecordRef.set(record);

      console.log('✅ 签到记录保存成功');
      
      return {
        success: true,
        recordId: newRecordRef.key,
        record: record
      };

    } catch (error) {
      const errorResult = handleError(error, '保存签到记录');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 更新签到记录
   * @param {string} recordId - 记录ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} - 更新结果
   */
  async updateAttendanceRecord(recordId, updates) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.db.ref(`attendanceRecords/${recordId}`).update(updates);

      console.log(`✅ 签到记录更新成功: ${recordId}`);
      
      return {
        success: true,
        recordId: recordId,
        updates: updates
      };

    } catch (error) {
      const errorResult = handleError(error, '更新签到记录');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 删除签到记录
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteAttendanceRecord(recordId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.db.ref(`attendanceRecords/${recordId}`).remove();

      console.log(`✅ 签到记录删除成功: ${recordId}`);
      
      return {
        success: true,
        recordId: recordId
      };

    } catch (error) {
      const errorResult = handleError(error, '删除签到记录');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 获取组别数据
   * @returns {Promise<Object>} - 获取结果
   */
  async getGroups() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const snapshot = await this.db.ref('groups').once('value');
      const groups = snapshot.val() || {};

      console.log(`✅ 获取组别数据: ${Object.keys(groups).length}个组别`);
      
      return {
        success: true,
        groups: groups,
        count: Object.keys(groups).length
      };

    } catch (error) {
      const errorResult = handleError(error, '获取组别数据');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 获取组别名称
   * @returns {Promise<Object>} - 获取结果
   */
  async getGroupNames() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const snapshot = await this.db.ref('groupNames').once('value');
      const groupNames = snapshot.val() || {};

      console.log(`✅ 获取组别名称: ${Object.keys(groupNames).length}个名称`);
      
      return {
        success: true,
        groupNames: groupNames,
        count: Object.keys(groupNames).length
      };

    } catch (error) {
      const errorResult = handleError(error, '获取组别名称');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 获取排除成员数据
   * @returns {Promise<Object>} - 获取结果
   */
  async getExcludedMembers() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const snapshot = await this.db.ref('excludedMembers').once('value');
      const excludedMembers = snapshot.val() || {};

      console.log(`✅ 获取排除成员数据: ${Object.keys(excludedMembers).length}个成员`);
      
      return {
        success: true,
        excludedMembers: excludedMembers,
        count: Object.keys(excludedMembers).length
      };

    } catch (error) {
      const errorResult = handleError(error, '获取排除成员数据');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 添加新成员
   * @param {string} groupId - 组别ID
   * @param {Object} memberData - 成员数据
   * @returns {Promise<Object>} - 添加结果
   */
  async addMember(groupId, memberData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 验证成员数据
      if (!this.validateMemberData(memberData)) {
        throw new Error('成员数据格式不正确');
      }

      const memberId = window.utils.generateUUID();
      const memberWithId = {
        ...memberData,
        id: memberId,
        group: groupId,
        createdAt: new Date().toISOString()
      };

      // 添加到组别
      await this.db.ref(`groups/${groupId}`).push(memberWithId);

      console.log(`✅ 新成员添加成功: ${memberData.name} (${memberId})`);
      
      return {
        success: true,
        memberId: memberId,
        member: memberWithId
      };

    } catch (error) {
      const errorResult = handleError(error, '添加新成员');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 同步数据到Firebase
   * @param {Object} data - 要同步的数据
   * @returns {Promise<Object>} - 同步结果
   */
  async syncDataToFirebase(data) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const updates = {};
      
      if (data.groups) {
        updates.groups = data.groups;
      }
      
      if (data.groupNames) {
        updates.groupNames = data.groupNames;
      }
      
      if (data.excludedMembers) {
        updates.excludedMembers = data.excludedMembers;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('没有需要同步的数据');
      }

      await this.db.ref().update(updates);

      console.log('✅ 数据同步到Firebase成功');
      
      return {
        success: true,
        syncedData: updates
      };

    } catch (error) {
      const errorResult = handleError(error, '数据同步');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 验证签到记录格式
   * @param {Object} record - 签到记录
   * @returns {boolean} - 是否有效
   */
  validateAttendanceRecord(record) {
    const requiredFields = ['name', 'group', 'time', 'date'];
    
    for (const field of requiredFields) {
      if (!record[field]) {
        console.warn(`签到记录缺少必需字段: ${field}`);
        return false;
      }
    }

    // 验证时间格式
    if (!window.utils.isValidISOString(record.time)) {
      console.warn('签到记录时间格式不正确');
      return false;
    }

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      console.warn('签到记录日期格式不正确');
      return false;
    }

    return true;
  }

  /**
   * 验证成员数据格式
   * @param {Object} memberData - 成员数据
   * @returns {boolean} - 是否有效
   */
  validateMemberData(memberData) {
    const requiredFields = ['name'];
    
    for (const field of requiredFields) {
      if (!memberData[field]) {
        console.warn(`成员数据缺少必需字段: ${field}`);
        return false;
      }
    }

    // 验证姓名长度
    if (memberData.name.length < 2 || memberData.name.length > 20) {
      console.warn('成员姓名长度必须在2-20个字符之间');
      return false;
    }

    return true;
  }

  /**
   * 获取Firebase状态
   * @returns {Object} - 状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      app: this.app ? 'initialized' : 'not_initialized',
      db: this.db ? 'initialized' : 'not_initialized'
    };
  }

  /**
   * 重置Firebase管理器
   */
  reset() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    console.log('🔄 Firebase管理器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局Firebase管理器实例
const firebaseManager = new FirebaseManager();

/**
 * 便捷Firebase初始化函数
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializeFirebase() {
  return await firebaseManager.initialize();
}

/**
 * 便捷签到记录获取函数
 * @param {string} date - 日期
 * @returns {Promise<Object>} - 获取结果
 */
export async function getAttendanceRecords(date = null) {
  return await firebaseManager.getAttendanceRecords(date);
}

/**
 * 便捷签到记录保存函数
 * @param {Object} record - 签到记录
 * @returns {Promise<Object>} - 保存结果
 */
export async function saveAttendanceRecord(record) {
  return await firebaseManager.saveAttendanceRecord(record);
}

// ==================== 导出 ====================

export { FirebaseManager, firebaseManager };

// 将便捷函数添加到全局
window.MSHFirebaseManager = {
  initialize: initializeFirebase,
  getAttendanceRecords: getAttendanceRecords,
  saveAttendanceRecord: saveAttendanceRecord,
  getGroups: () => firebaseManager.getGroups(),
  getGroupNames: () => firebaseManager.getGroupNames(),
  getExcludedMembers: () => firebaseManager.getExcludedMembers(),
  addMember: (groupId, memberData) => firebaseManager.addMember(groupId, memberData),
  syncDataToFirebase: (data) => firebaseManager.syncDataToFirebase(data),
  getStatus: () => firebaseManager.getStatus(),
  reset: () => firebaseManager.reset()
};

console.log('✅ Firebase管理器模块已加载');
