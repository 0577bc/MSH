/**
 * 界面交互管理器模块 (ui-manager.js)
 * 功能：管理界面交互、事件监听、用户体验优化
 * 作者：MSH系统
 * 版本：1.0
 */

import { handleError } from '../common/error-handler.js';
import { domManager } from './dom-manager.js';
import { signinManager } from './signin-manager.js';
import { memberManager } from './member-manager.js';

// ==================== 界面交互管理器类 ====================

class UIManager {
  constructor() {
    this.isInitialized = false;
    this.eventListeners = new Map();
    this.searchTimeout = null;
    this.debounceDelay = 300;
  }

  /**
   * 初始化界面交互管理器
   * @returns {Object} - 初始化结果
   */
  initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ 界面交互管理器已初始化');
        return { success: true };
      }

      console.log('🔍 初始化界面交互管理器...');

      // 初始化事件监听器
      this.initializeEventListeners();

      // 初始化界面状态
      this.initializeUIState();

      // 初始化键盘快捷键
      this.initializeKeyboardShortcuts();

      this.isInitialized = true;

      console.log('✅ 界面交互管理器初始化完成');

      return {
        success: true,
        listenersCount: this.eventListeners.size
      };

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'high',
        context: { operation: 'ui_manager_init' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 初始化事件监听器
   */
  initializeEventListeners() {
    // 组别选择事件
    this.addEventListener('groupSelect', 'change', this.handleGroupSelectChange.bind(this));

    // 成员选择事件
    this.addEventListener('memberSelect', 'change', this.handleMemberSelectChange.bind(this));

    // 签到按钮事件
    this.addEventListener('signinButton', 'click', this.handleSigninButtonClick.bind(this));

    // 新增成员按钮事件
    this.addEventListener('addNewcomerButton', 'click', this.handleAddNewcomerButtonClick.bind(this));

    // 保存新成员按钮事件
    this.addEventListener('saveNewMemberButton', 'click', this.handleSaveNewMemberButtonClick.bind(this));

    // 取消新成员按钮事件
    this.addEventListener('cancelNewMemberButton', 'click', this.handleCancelNewMemberButtonClick.bind(this));

    // 姓名搜索事件
    this.addEventListener('memberSearch', 'input', this.handleMemberSearchInput.bind(this));

    // 导航按钮事件
    this.addEventListener('dailyReportButton', 'click', this.handleDailyReportButtonClick.bind(this));
    this.addEventListener('adminButton', 'click', this.handleAdminButtonClick.bind(this));

    // 表单提交事件
    this.addEventListener('selectionForm', 'submit', this.handleSelectionFormSubmit.bind(this));

    console.log(`✅ 事件监听器初始化完成: ${this.eventListeners.size}个监听器`);
  }

  /**
   * 添加事件监听器
   * @param {string} elementId - 元素ID
   * @param {string} eventType - 事件类型
   * @param {Function} handler - 事件处理函数
   */
  addEventListener(elementId, eventType, handler) {
    const element = domManager.getElement(elementId);
    if (!element) {
      console.warn(`元素不存在，无法添加事件监听器: ${elementId}`);
      return;
    }

    const listenerKey = `${elementId}_${eventType}`;
    
    // 移除已存在的监听器
    if (this.eventListeners.has(listenerKey)) {
      this.removeEventListener(elementId, eventType);
    }

    element.addEventListener(eventType, handler);
    this.eventListeners.set(listenerKey, { element, eventType, handler });

    console.log(`✅ 添加事件监听器: ${listenerKey}`);
  }

  /**
   * 移除事件监听器
   * @param {string} elementId - 元素ID
   * @param {string} eventType - 事件类型
   */
  removeEventListener(elementId, eventType) {
    const listenerKey = `${elementId}_${eventType}`;
    const listener = this.eventListeners.get(listenerKey);

    if (listener) {
      listener.element.removeEventListener(listener.eventType, listener.handler);
      this.eventListeners.delete(listenerKey);
      console.log(`✅ 移除事件监听器: ${listenerKey}`);
    }
  }

  /**
   * 初始化界面状态
   */
  initializeUIState() {
    // 隐藏新成员表单
    domManager.hideElement('addMemberForm');

    // 清空搜索建议
    domManager.clearContent('suggestions');

    // 设置默认状态
    domManager.setText('signinButton', '签到');
    domManager.setText('totalSigned', '0');

    console.log('✅ 界面初始状态设置完成');
  }

  /**
   * 初始化键盘快捷键
   */
  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl + Enter: 快速签到
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        this.handleSigninButtonClick();
      }

      // Escape: 取消新成员表单
      if (event.key === 'Escape') {
        const form = domManager.getElement('addMemberForm');
        if (form && domManager.isVisible('addMemberForm')) {
          this.handleCancelNewMemberButtonClick();
        }
      }

      // F1: 显示帮助
      if (event.key === 'F1') {
        event.preventDefault();
        this.showHelp();
      }
    });

    console.log('✅ 键盘快捷键初始化完成');
  }

  /**
   * 处理组别选择变化
   */
  handleGroupSelectChange() {
    const selectedGroup = domManager.getValue('groupSelect');
    
    if (selectedGroup) {
      memberManager.loadMembers(selectedGroup);
      console.log(`✅ 选择组别: ${selectedGroup}`);
    } else {
      domManager.clearContent('memberSelect');
      domManager.setValue('memberSelect', '');
    }

    // 更新签到按钮状态
    this.updateSigninButtonState();
  }

  /**
   * 处理成员选择变化
   */
  handleMemberSelectChange() {
    const selectedMember = domManager.getValue('memberSelect');
    
    if (selectedMember) {
      console.log(`✅ 选择成员: ${selectedMember}`);
    }

    // 更新签到按钮状态
    this.updateSigninButtonState();
  }

  /**
   * 处理签到按钮点击
   */
  async handleSigninButtonClick() {
    const selectedGroup = domManager.getValue('groupSelect');
    const selectedMember = domManager.getValue('memberSelect');

    if (!selectedGroup || !selectedMember) {
      this.showMessage('请先选择组别和成员', 'warning');
      return;
    }

    const memberData = {
      name: selectedMember,
      group: selectedGroup
    };

    const result = await signinManager.performSignin(memberData);

    if (result.success) {
      this.showMessage(result.message, 'success');
      this.clearSelection();
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理新增成员按钮点击
   */
  handleAddNewcomerButtonClick() {
    memberManager.showNewMemberForm();
    console.log('✅ 显示新成员表单');
  }

  /**
   * 处理保存新成员按钮点击
   */
  async handleSaveNewMemberButtonClick() {
    const memberName = domManager.getValue('newMemberName');
    const memberPhone = domManager.getValue('newMemberPhone');
    const memberGroup = domManager.getValue('newGroupSelect');

    if (!memberName || !memberGroup) {
      this.showMessage('请填写完整的成员信息', 'warning');
      return;
    }

    const memberData = {
      name: memberName,
      phone: memberPhone,
      group: memberGroup
    };

    const result = await memberManager.addNewMember(memberData);

    if (result.success) {
      this.showMessage(result.message, 'success');
      memberManager.hideNewMemberForm();
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  /**
   * 处理取消新成员按钮点击
   */
  handleCancelNewMemberButtonClick() {
    memberManager.hideNewMemberForm();
    console.log('✅ 取消新成员表单');
  }

  /**
   * 处理姓名搜索输入
   */
  handleMemberSearchInput() {
    // 防抖处理
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      const query = domManager.getValue('memberSearch');
      this.performMemberSearch(query);
    }, this.debounceDelay);
  }

  /**
   * 执行成员搜索
   * @param {string} query - 搜索关键词
   */
  performMemberSearch(query) {
    const suggestions = domManager.getElement('suggestions');
    if (!suggestions) return;

    if (!query || query.trim().length < 1) {
      domManager.clearContent('suggestions');
      domManager.hideElement('suggestions');
      return;
    }

    const results = memberManager.searchMembers(query);

    if (results.length === 0) {
      suggestions.innerHTML = '<div class="no-results">未找到匹配的成员</div>';
    } else {
      const html = results.map(result => `
        <div class="suggestion-item" data-name="${result.name}" data-group="${result.groupId}">
          <span class="name">${result.name}</span>
          <span class="group">${result.groupName}</span>
        </div>
      `).join('');
      
      suggestions.innerHTML = html;

      // 添加点击事件
      suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.dataset.name;
          const group = item.dataset.group;
          
          domManager.setValue('groupSelect', group);
          memberManager.loadMembers(group);
          domManager.setValue('memberSelect', name);
          domManager.setValue('memberSearch', name);
          domManager.hideElement('suggestions');
          
          this.updateSigninButtonState();
        });
      });
    }

    domManager.showElement('suggestions');
  }

  /**
   * 处理日报按钮点击
   */
  handleDailyReportButtonClick() {
    window.location.href = 'daily-report.html';
  }

  /**
   * 处理管理按钮点击
   */
  handleAdminButtonClick() {
    window.location.href = 'admin.html';
  }

  /**
   * 处理表单提交
   * @param {Event} event - 表单提交事件
   */
  handleSelectionFormSubmit(event) {
    event.preventDefault();
    this.handleSigninButtonClick();
  }

  /**
   * 更新签到按钮状态
   */
  updateSigninButtonState() {
    const selectedGroup = domManager.getValue('groupSelect');
    const selectedMember = domManager.getValue('memberSelect');

    if (!selectedGroup || !selectedMember) {
      domManager.setText('signinButton', '签到');
      domManager.removeClass('signinButton', 'signed-in');
      domManager.removeAttribute('signinButton', 'disabled');
      return;
    }

    const memberData = {
      name: selectedMember,
      group: selectedGroup
    };

    if (signinManager.hasAlreadySignedIn(memberData)) {
      domManager.setText('signinButton', '已签到');
      domManager.addClass('signinButton', 'signed-in');
      domManager.setValue('signinButton', 'disabled');
    } else {
      domManager.setText('signinButton', '签到');
      domManager.removeClass('signinButton', 'signed-in');
      domManager.removeAttribute('signinButton', 'disabled');
    }
  }

  /**
   * 清空选择
   */
  clearSelection() {
    domManager.setValue('groupSelect', '');
    domManager.setValue('memberSelect', '');
    domManager.setValue('memberSearch', '');
    domManager.clearContent('suggestions');
    domManager.hideElement('suggestions');
    
    this.updateSigninButtonState();
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  showMessage(message, type = 'info') {
    // 使用错误处理模块的Toast功能
    if (window.MSHErrorHandler) {
      window.MSHErrorHandler.handle(message, {
        type: 'user',
        level: 'low',
        showToUser: true,
        logToConsole: false
      });
    } else {
      // 降级处理
      alert(message);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    const helpText = `
MSH签到系统 - 快捷键帮助

Ctrl + Enter: 快速签到
Escape: 取消新成员表单
F1: 显示此帮助

使用说明：
1. 选择组别和成员
2. 点击签到按钮或按Ctrl+Enter
3. 可以搜索成员姓名快速定位
4. 支持添加新成员功能
    `;

    alert(helpText);
  }

  /**
   * 更新界面状态
   */
  updateUIState() {
    // 更新签到统计
    signinManager.updateSigninCount();

    // 更新签到按钮状态
    this.updateSigninButtonState();

    console.log('✅ 界面状态已更新');
  }

  /**
   * 获取界面管理器状态
   * @returns {Object} - 状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      listenersCount: this.eventListeners.size,
      currentSelection: {
        group: domManager.getValue('groupSelect'),
        member: domManager.getValue('memberSelect')
      }
    };
  }

  /**
   * 重置界面管理器
   */
  reset() {
    // 移除所有事件监听器
    this.eventListeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.eventType, listener.handler);
    });
    this.eventListeners.clear();

    // 清除搜索超时
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    this.isInitialized = false;
    console.log('🔄 界面交互管理器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局界面交互管理器实例
const uiManager = new UIManager();

/**
 * 便捷界面初始化函数
 * @returns {Object} - 初始化结果
 */
export function initializeUI() {
  return uiManager.initialize();
}

/**
 * 便捷界面状态更新函数
 */
export function updateUIState() {
  uiManager.updateUIState();
}

// ==================== 导出 ====================

export { UIManager, uiManager };

// 将便捷函数添加到全局
window.MSHUIManager = {
  initialize: initializeUI,
  updateState: updateUIState,
  showMessage: (message, type) => uiManager.showMessage(message, type),
  showHelp: () => uiManager.showHelp(),
  clearSelection: () => uiManager.clearSelection(),
  getStatus: () => uiManager.getStatus(),
  reset: () => uiManager.reset()
};

console.log('✅ 界面交互管理器模块已加载');
