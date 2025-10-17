/**
 * 签到管理器模块 (signin-manager.js)
 * 功能：管理签到相关操作，包括签到记录、状态管理、数据同步
 * 作者：MSH系统
 * 版本：1.0
 */

import { handleError, handleValidationError } from '../common/error-handler.js';
import { firebaseManager } from './firebase-manager.js';
import { domManager } from './dom-manager.js';

// ==================== 签到管理器类 ====================

class SigninManager {
  constructor() {
    this.currentAttendanceRecords = [];
    this.isSigningIn = false;
    this.lastSigninTime = null;
  }

  /**
   * 初始化签到管理器
   * @returns {Object} - 初始化结果
   */
  initialize() {
    try {
      console.log('🔍 初始化签到管理器...');

      // 加载今天的签到记录
      this.loadTodayAttendanceRecords();

      // 初始化签到状态显示
      this.updateSigninStatusDisplay();

      console.log('✅ 签到管理器初始化完成');

      return {
        success: true,
        recordsCount: this.currentAttendanceRecords.length
      };

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'high',
        context: { operation: 'signin_manager_init' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 执行签到操作
   * @param {Object} memberData - 成员数据
   * @returns {Promise<Object>} - 签到结果
   */
  async performSignin(memberData) {
    try {
      if (this.isSigningIn) {
        throw new Error('正在签到中，请稍候...');
      }

      // 验证成员数据
      if (!this.validateMemberData(memberData)) {
        throw new Error('成员数据不完整');
      }

      // 检查是否已经签到
      if (this.hasAlreadySignedIn(memberData)) {
        throw new Error('该成员今天已经签到过了');
      }

      this.isSigningIn = true;
      domManager.setText('signinButton', '签到中...');
      domManager.setValue('signinButton', 'disabled');

      // 创建签到记录
      const signinRecord = this.createSigninRecord(memberData);

      // 保存到Firebase
      const saveResult = await firebaseManager.saveAttendanceRecord(signinRecord);

      if (!saveResult.success) {
        throw new Error(saveResult.message || '签到记录保存失败');
      }

      // 更新本地记录
      this.currentAttendanceRecords.push({
        ...signinRecord,
        id: saveResult.recordId
      });

      // 更新UI显示
      this.updateSigninStatusDisplay();
      this.updateSigninCount();

      // 记录签到时间
      this.lastSigninTime = new Date();

      console.log(`✅ 签到成功: ${memberData.name} (${memberData.group})`);

      return {
        success: true,
        record: signinRecord,
        recordId: saveResult.recordId,
        message: `签到成功：${memberData.name}`
      };

    } catch (error) {
      const errorResult = handleValidationError(error.message, memberData);
      
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };

    } finally {
      this.isSigningIn = false;
      domManager.setText('signinButton', '签到');
      domManager.removeAttribute('signinButton', 'disabled');
    }
  }

  /**
   * 加载今天的签到记录
   * @returns {Promise<Object>} - 加载结果
   */
  async loadTodayAttendanceRecords() {
    try {
      const today = window.utils.getLocalDateString();
      const result = await firebaseManager.getAttendanceRecords(today);

      if (result.success) {
        this.currentAttendanceRecords = result.records;
        console.log(`✅ 加载今天签到记录: ${result.count}条`);
        return { success: true, records: result.records, count: result.count };
      } else {
        throw new Error(result.message || '加载签到记录失败');
      }

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'medium',
        context: { operation: 'load_attendance_records' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 更新签到状态显示
   */
  updateSigninStatusDisplay() {
    try {
      // 清空现有显示
      domManager.clearContent('earlyList');
      domManager.clearContent('onTimeList');
      domManager.clearContent('lateList');

      // 按签到类型分组显示
      const earlyRecords = [];
      const onTimeRecords = [];
      const lateRecords = [];

      this.currentAttendanceRecords.forEach(record => {
        const signinType = window.utils.getAttendanceType(record.time);
        
        switch (signinType) {
          case 'early':
            earlyRecords.push(record);
            break;
          case 'onTime':
            onTimeRecords.push(record);
            break;
          case 'late':
            lateRecords.push(record);
            break;
        }
      });

      // 显示早到人员
      this.displaySigninRecords('earlyList', earlyRecords, '早到');
      
      // 显示准时人员
      this.displaySigninRecords('onTimeList', onTimeRecords, '准时');
      
      // 显示迟到人员
      this.displaySigninRecords('lateList', lateRecords, '迟到');

      // 更新总人数
      this.updateSigninCount();

    } catch (error) {
      console.warn('更新签到状态显示失败:', error);
    }
  }

  /**
   * 显示签到记录列表
   * @param {string} containerId - 容器ID
   * @param {Array} records - 记录数组
   * @param {string} typeLabel - 类型标签
   */
  displaySigninRecords(containerId, records, typeLabel) {
    const container = domManager.getElement(containerId);
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = `<li class="no-data">暂无${typeLabel}人员</li>`;
      return;
    }

    const html = records.map(record => {
      const signinTime = window.utils.formatTime(record.time);
      const groupName = window.groupNames[record.group] || record.group;
      
      return `
        <li class="signin-record">
          <span class="name">${record.name}</span>
          <span class="group">${groupName}</span>
          <span class="time">${signinTime}</span>
        </li>
      `;
    }).join('');

    container.innerHTML = html;
  }

  /**
   * 更新签到人数统计
   */
  updateSigninCount() {
    const totalCount = this.currentAttendanceRecords.length;
    domManager.setText('totalSigned', totalCount);

    // 更新签到按钮状态
    const selectedGroup = domManager.getValue('groupSelect');
    const selectedMember = domManager.getValue('memberSelect');

    if (selectedGroup && selectedMember) {
      const memberData = {
        name: selectedMember,
        group: selectedGroup
      };

      if (this.hasAlreadySignedIn(memberData)) {
        domManager.setText('signinButton', '已签到');
        domManager.addClass('signinButton', 'signed-in');
        domManager.setValue('signinButton', 'disabled');
      } else {
        domManager.setText('signinButton', '签到');
        domManager.removeClass('signinButton', 'signed-in');
        domManager.removeAttribute('signinButton', 'disabled');
      }
    }
  }

  /**
   * 创建签到记录
   * @param {Object} memberData - 成员数据
   * @returns {Object} - 签到记录
   */
  createSigninRecord(memberData) {
    const now = new Date();
    const today = window.utils.getLocalDateString();

    return {
      name: memberData.name,
      group: memberData.group,
      time: now.toISOString(),
      date: today,
      attendanceType: window.utils.getAttendanceType(now),
      deviceInfo: this.getDeviceInfo(),
      ipAddress: this.getClientIP() || 'unknown'
    };
  }

  /**
   * 验证成员数据
   * @param {Object} memberData - 成员数据
   * @returns {boolean} - 是否有效
   */
  validateMemberData(memberData) {
    if (!memberData || typeof memberData !== 'object') {
      return false;
    }

    const requiredFields = ['name', 'group'];
    for (const field of requiredFields) {
      if (!memberData[field] || memberData[field].trim() === '') {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查成员是否已经签到
   * @param {Object} memberData - 成员数据
   * @returns {boolean} - 是否已签到
   */
  hasAlreadySignedIn(memberData) {
    return this.currentAttendanceRecords.some(record => 
      record.name === memberData.name && record.group === memberData.group
    );
  }

  /**
   * 获取设备信息
   * @returns {Object} - 设备信息
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * 获取客户端IP（简化版）
   * @returns {string|null} - IP地址
   */
  getClientIP() {
    // 这里可以集成真实的IP获取服务
    // 目前返回null，实际部署时可以集成
    return null;
  }

  /**
   * 获取签到统计信息
   * @returns {Object} - 统计信息
   */
  getSigninStats() {
    const stats = {
      total: this.currentAttendanceRecords.length,
      byType: {
        early: 0,
        onTime: 0,
        late: 0
      },
      byGroup: {},
      recent: this.currentAttendanceRecords.slice(-5)
    };

    this.currentAttendanceRecords.forEach(record => {
      const signinType = window.utils.getAttendanceType(record.time);
      stats.byType[signinType]++;

      const groupName = window.groupNames[record.group] || record.group;
      stats.byGroup[groupName] = (stats.byGroup[groupName] || 0) + 1;
    });

    return stats;
  }

  /**
   * 导出签到数据
   * @param {string} format - 导出格式（json, csv）
   * @returns {string} - 导出的数据
   */
  exportSigninData(format = 'json') {
    try {
      if (format === 'json') {
        return JSON.stringify(this.currentAttendanceRecords, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(this.currentAttendanceRecords);
      } else {
        throw new Error('不支持的导出格式');
      }
    } catch (error) {
      console.error('导出签到数据失败:', error);
      return null;
    }
  }

  /**
   * 转换为CSV格式
   * @param {Array} records - 记录数组
   * @returns {string} - CSV字符串
   */
  convertToCSV(records) {
    if (!records.length) return '';

    const headers = ['姓名', '组别', '签到时间', '签到类型'];
    const csvRows = [headers.join(',')];

    records.forEach(record => {
      const groupName = window.groupNames[record.group] || record.group;
      const signinTime = window.utils.formatTime(record.time);
      const signinType = window.utils.getAttendanceType(record.time);
      
      const row = [
        record.name,
        groupName,
        signinTime,
        signinType
      ].map(field => `"${field}"`).join(',');
      
      csvRows.push(row);
    });

    return csvRows.join('\n');
  }

  /**
   * 清除签到记录（仅用于测试）
   * @returns {Object} - 清除结果
   */
  clearSigninRecords() {
    this.currentAttendanceRecords = [];
    this.updateSigninStatusDisplay();
    
    console.log('🔄 签到记录已清除');
    
    return {
      success: true,
      message: '签到记录已清除'
    };
  }

  /**
   * 获取签到管理器状态
   * @returns {Object} - 状态信息
   */
  getStatus() {
    return {
      isSigningIn: this.isSigningIn,
      recordsCount: this.currentAttendanceRecords.length,
      lastSigninTime: this.lastSigninTime,
      stats: this.getSigninStats()
    };
  }

  /**
   * 重置签到管理器
   */
  reset() {
    this.currentAttendanceRecords = [];
    this.isSigningIn = false;
    this.lastSigninTime = null;
    console.log('🔄 签到管理器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局签到管理器实例
const signinManager = new SigninManager();

/**
 * 便捷签到初始化函数
 * @returns {Object} - 初始化结果
 */
export function initializeSignin() {
  return signinManager.initialize();
}

/**
 * 便捷签到函数
 * @param {Object} memberData - 成员数据
 * @returns {Promise<Object>} - 签到结果
 */
export async function performSignin(memberData) {
  return await signinManager.performSignin(memberData);
}

/**
 * 便捷加载签到记录函数
 * @returns {Promise<Object>} - 加载结果
 */
export async function loadTodayAttendanceRecords() {
  return await signinManager.loadTodayAttendanceRecords();
}

// ==================== 导出 ====================

export { SigninManager, signinManager };

// 将便捷函数添加到全局
window.MSHSigninManager = {
  initialize: initializeSignin,
  signin: performSignin,
  loadRecords: loadTodayAttendanceRecords,
  updateDisplay: () => signinManager.updateSigninStatusDisplay(),
  updateCount: () => signinManager.updateSigninCount(),
  getStats: () => signinManager.getSigninStats(),
  exportData: (format) => signinManager.exportSigninData(format),
  clearRecords: () => signinManager.clearSigninRecords(),
  getStatus: () => signinManager.getStatus(),
  reset: () => signinManager.reset()
};

console.log('✅ 签到管理器模块已加载');
