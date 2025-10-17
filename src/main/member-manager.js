/**
 * 成员管理器模块 (member-manager.js)
 * 功能：管理成员相关操作，包括成员添加、查询、管理
 * 作者：MSH系统
 * 版本：1.0
 */

import { handleError, handleValidationError } from '../common/error-handler.js';
import { firebaseManager } from './firebase-manager.js';
import { domManager } from './dom-manager.js';

// ==================== 成员管理器类 ====================

class MemberManager {
  constructor() {
    this.currentGroups = {};
    this.currentGroupNames = {};
    this.currentMembers = {};
    this.isAddingMember = false;
  }

  /**
   * 初始化成员管理器
   * @returns {Object} - 初始化结果
   */
  initialize() {
    try {
      console.log('🔍 初始化成员管理器...');

      // 加载组别和成员数据
      this.loadGroupsAndMembers();

      console.log('✅ 成员管理器初始化完成');

      return {
        success: true,
        groupsCount: Object.keys(this.currentGroups).length,
        membersCount: Object.keys(this.currentMembers).length
      };

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'high',
        context: { operation: 'member_manager_init' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 加载组别和成员数据
   * @returns {Promise<Object>} - 加载结果
   */
  async loadGroupsAndMembers() {
    try {
      // 并行加载组别数据和组别名称
      const [groupsResult, groupNamesResult] = await Promise.all([
        firebaseManager.getGroups(),
        firebaseManager.getGroupNames()
      ]);

      if (groupsResult.success) {
        this.currentGroups = groupsResult.groups;
        this.processMembersData();
      }

      if (groupNamesResult.success) {
        this.currentGroupNames = groupNamesResult.groupNames;
      }

      // 更新UI显示
      this.updateGroupSelect();
      this.updateNewGroupSelect();

      console.log(`✅ 加载组别和成员数据完成: ${Object.keys(this.currentGroups).length}个组别`);

      return {
        success: true,
        groups: this.currentGroups,
        groupNames: this.currentGroupNames
      };

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'medium',
        context: { operation: 'load_groups_and_members' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 处理成员数据
   */
  processMembersData() {
    this.currentMembers = {};

    Object.entries(this.currentGroups).forEach(([groupId, groupMembers]) => {
      if (Array.isArray(groupMembers)) {
        groupMembers.forEach(member => {
          if (member && member.id) {
            this.currentMembers[member.id] = {
              ...member,
              groupId: groupId,
              groupName: this.currentGroupNames[groupId] || groupId
            };
          }
        });
      }
    });

    console.log(`📊 处理成员数据完成: ${Object.keys(this.currentMembers).length}个成员`);
  }

  /**
   * 更新组别选择框
   */
  updateGroupSelect() {
    const groupSelect = domManager.getElement('groupSelect');
    if (!groupSelect) return;

    // 保存当前选择
    const currentValue = groupSelect.value;

    // 清空现有选项
    groupSelect.innerHTML = '<option value="">--请选择小组--</option>';

    // 按组别名称排序
    const sortedGroups = Object.entries(this.currentGroupNames)
      .filter(([groupId, groupName]) => groupName !== '未分组')
      .sort((a, b) => a[1].localeCompare(b[1]));

    // 添加组别选项
    sortedGroups.forEach(([groupId, groupName]) => {
      const option = document.createElement('option');
      option.value = groupId;
      option.textContent = groupName;
      groupSelect.appendChild(option);
    });

    // 恢复选择
    if (currentValue && this.currentGroupNames[currentValue]) {
      groupSelect.value = currentValue;
    }

    console.log(`✅ 组别选择框已更新: ${sortedGroups.length}个组别`);
  }

  /**
   * 更新新成员组别选择框
   */
  updateNewGroupSelect() {
    const newGroupSelect = domManager.getElement('newGroupSelect');
    if (!newGroupSelect) return;

    // 清空现有选项
    newGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';

    // 添加组别选项
    Object.entries(this.currentGroupNames).forEach(([groupId, groupName]) => {
      const option = document.createElement('option');
      option.value = groupId;
      option.textContent = groupName;
      newGroupSelect.appendChild(option);
    });

    console.log('✅ 新成员组别选择框已更新');
  }

  /**
   * 加载指定组别的成员
   * @param {string} groupId - 组别ID
   */
  loadMembers(groupId) {
    const memberSelect = domManager.getElement('memberSelect');
    if (!memberSelect) return;

    // 清空现有选项
    memberSelect.innerHTML = '<option value="">--请选择成员--</option>';

    if (!groupId || !this.currentGroups[groupId]) {
      console.log('🔍 未选择小组，清空成员列表');
      return;
    }

    const groupMembers = this.currentGroups[groupId];
    if (!Array.isArray(groupMembers)) {
      console.warn(`组别${groupId}的成员数据格式不正确`);
      return;
    }

    // 按姓名排序
    const sortedMembers = groupMembers
      .filter(member => member && member.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    // 添加成员选项
    sortedMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member.name;
      option.textContent = member.name;
      if (member.phone) {
        option.setAttribute('data-phone', member.phone);
      }
      memberSelect.appendChild(option);
    });

    console.log(`✅ 加载组别${groupId}的成员: ${sortedMembers.length}人`);
  }

  /**
   * 添加新成员
   * @param {Object} memberData - 成员数据
   * @returns {Promise<Object>} - 添加结果
   */
  async addNewMember(memberData) {
    try {
      if (this.isAddingMember) {
        throw new Error('正在添加成员中，请稍候...');
      }

      // 验证成员数据
      if (!this.validateNewMemberData(memberData)) {
        throw new Error('成员数据不完整或格式不正确');
      }

      this.isAddingMember = true;
      domManager.setText('saveNewMemberButton', '添加中...');
      domManager.setValue('saveNewMemberButton', 'disabled');

      // 检查成员是否已存在
      if (this.memberExists(memberData.name, memberData.group)) {
        throw new Error('该成员在此组别中已存在');
      }

      // 添加到Firebase
      const addResult = await firebaseManager.addMember(memberData.group, {
        name: memberData.name.trim(),
        phone: memberData.phone ? memberData.phone.trim() : '',
        addedAt: new Date().toISOString()
      });

      if (!addResult.success) {
        throw new Error(addResult.message || '添加成员失败');
      }

      // 更新本地数据
      await this.loadGroupsAndMembers();

      // 清空表单
      this.clearNewMemberForm();

      // 自动选择新添加的成员
      domManager.setValue('groupSelect', memberData.group);
      this.loadMembers(memberData.group);
      domManager.setValue('memberSelect', memberData.name);

      console.log(`✅ 新成员添加成功: ${memberData.name} (${memberData.group})`);

      return {
        success: true,
        member: addResult.member,
        memberId: addResult.memberId,
        message: `成员添加成功：${memberData.name}`
      };

    } catch (error) {
      const errorResult = handleValidationError(error.message, memberData);
      
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };

    } finally {
      this.isAddingMember = false;
      domManager.setText('saveNewMemberButton', '保存');
      domManager.removeAttribute('saveNewMemberButton', 'disabled');
    }
  }

  /**
   * 验证新成员数据
   * @param {Object} memberData - 成员数据
   * @returns {boolean} - 是否有效
   */
  validateNewMemberData(memberData) {
    if (!memberData || typeof memberData !== 'object') {
      return false;
    }

    // 验证姓名
    if (!memberData.name || memberData.name.trim().length < 2) {
      return false;
    }

    // 验证组别
    if (!memberData.group || !this.currentGroupNames[memberData.group]) {
      return false;
    }

    // 验证手机号（可选）
    if (memberData.phone && !this.isValidPhone(memberData.phone)) {
      return false;
    }

    return true;
  }

  /**
   * 验证手机号格式
   * @param {string} phone - 手机号
   * @returns {boolean} - 是否有效
   */
  isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * 检查成员是否已存在
   * @param {string} memberName - 成员姓名
   * @param {string} groupId - 组别ID
   * @returns {boolean} - 是否已存在
   */
  memberExists(memberName, groupId) {
    const groupMembers = this.currentGroups[groupId];
    if (!Array.isArray(groupMembers)) {
      return false;
    }

    return groupMembers.some(member => 
      member && member.name && member.name.trim() === memberName.trim()
    );
  }

  /**
   * 清空新成员表单
   */
  clearNewMemberForm() {
    domManager.setValue('newMemberName', '');
    domManager.setValue('newMemberPhone', '');
    domManager.setValue('newGroupSelect', '');
    
    // 隐藏表单
    domManager.hideElement('addMemberForm');
  }

  /**
   * 显示新成员表单
   */
  showNewMemberForm() {
    domManager.showElement('addMemberForm');
    domManager.focus('newMemberName');
  }

  /**
   * 隐藏新成员表单
   */
  hideNewMemberForm() {
    this.clearNewMemberForm();
  }

  /**
   * 搜索成员
   * @param {string} query - 搜索关键词
   * @returns {Array} - 搜索结果
   */
  searchMembers(query) {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    const results = [];

    Object.values(this.currentMembers).forEach(member => {
      if (member.name && member.name.toLowerCase().includes(searchTerm)) {
        results.push({
          name: member.name,
          groupId: member.groupId,
          groupName: member.groupName,
          phone: member.phone || ''
        });
      }
    });

    // 按姓名排序
    results.sort((a, b) => a.name.localeCompare(b.name));

    return results;
  }

  /**
   * 获取成员统计信息
   * @returns {Object} - 统计信息
   */
  getMemberStats() {
    const stats = {
      totalMembers: Object.keys(this.currentMembers).length,
      totalGroups: Object.keys(this.currentGroups).length,
      byGroup: {},
      recentAdded: []
    };

    // 按组别统计
    Object.entries(this.currentGroups).forEach(([groupId, groupMembers]) => {
      const groupName = this.currentGroupNames[groupId] || groupId;
      stats.byGroup[groupName] = Array.isArray(groupMembers) ? groupMembers.length : 0;
    });

    // 最近添加的成员（简化版）
    Object.values(this.currentMembers).forEach(member => {
      if (member.addedAt) {
        stats.recentAdded.push({
          name: member.name,
          group: member.groupName,
          addedAt: member.addedAt
        });
      }
    });

    // 按添加时间排序，取最近5个
    stats.recentAdded.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    stats.recentAdded = stats.recentAdded.slice(0, 5);

    return stats;
  }

  /**
   * 获取成员管理器状态
   * @returns {Object} - 状态信息
   */
  getStatus() {
    return {
      isAddingMember: this.isAddingMember,
      groupsCount: Object.keys(this.currentGroups).length,
      membersCount: Object.keys(this.currentMembers).length,
      stats: this.getMemberStats()
    };
  }

  /**
   * 重置成员管理器
   */
  reset() {
    this.currentGroups = {};
    this.currentGroupNames = {};
    this.currentMembers = {};
    this.isAddingMember = false;
    console.log('🔄 成员管理器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局成员管理器实例
const memberManager = new MemberManager();

/**
 * 便捷成员管理器初始化函数
 * @returns {Object} - 初始化结果
 */
export function initializeMember() {
  return memberManager.initialize();
}

/**
 * 便捷加载成员函数
 * @param {string} groupId - 组别ID
 */
export function loadMembers(groupId) {
  memberManager.loadMembers(groupId);
}

/**
 * 便捷添加成员函数
 * @param {Object} memberData - 成员数据
 * @returns {Promise<Object>} - 添加结果
 */
export async function addNewMember(memberData) {
  return await memberManager.addNewMember(memberData);
}

// ==================== 导出 ====================

export { MemberManager, memberManager };

// 将便捷函数添加到全局
window.MSHMemberManager = {
  initialize: initializeMember,
  loadMembers: loadMembers,
  addMember: addNewMember,
  searchMembers: (query) => memberManager.searchMembers(query),
  showForm: () => memberManager.showNewMemberForm(),
  hideForm: () => memberManager.hideNewMemberForm(),
  clearForm: () => memberManager.clearNewMemberForm(),
  getStats: () => memberManager.getMemberStats(),
  getStatus: () => memberManager.getStatus(),
  reset: () => memberManager.reset()
};

console.log('✅ 成员管理器模块已加载');
