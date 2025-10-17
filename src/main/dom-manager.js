/**
 * DOM管理器模块 (dom-manager.js)
 * 功能：管理DOM元素引用和操作，优化DOM查询性能
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== DOM管理器类 ====================

class DOMManager {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
  }

  /**
   * 初始化DOM元素引用
   * @returns {Object} - 初始化结果
   */
  initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ DOM管理器已初始化，复用现有引用');
        return { success: true, elements: this.elements };
      }

      console.log('🔍 初始化DOM元素引用...');

      // 主要表单元素
      this.elements.groupSelect = document.getElementById('groupSelect');
      this.elements.memberSelect = document.getElementById('memberSelect');
      this.elements.memberSearch = document.getElementById('memberSearch');
      this.elements.suggestions = document.getElementById('suggestions');

      // 主要按钮
      this.elements.signinButton = document.getElementById('signinButton');
      this.elements.addNewcomerButton = document.getElementById('addNewcomerButton');
      this.elements.dailyReportButton = document.getElementById('dailyReportButton');
      this.elements.adminButton = document.getElementById('adminButton');

      // 新增成员表单元素
      this.elements.addMemberForm = document.getElementById('addMemberForm');
      this.elements.newGroupSelect = document.getElementById('newGroupSelect');
      this.elements.newMemberName = document.getElementById('newMemberName');
      this.elements.newMemberPhone = document.getElementById('newMemberPhone');
      this.elements.saveNewMemberButton = document.getElementById('saveNewMemberButton');
      this.elements.cancelNewMemberButton = document.getElementById('cancelNewMemberButton');

      // 签到状态列表
      this.elements.earlyList = document.getElementById('earlyList');
      this.elements.onTimeList = document.getElementById('onTimeList');
      this.elements.lateList = document.getElementById('lateList');

      // 统计显示元素
      this.elements.totalSigned = document.getElementById('totalSigned');
      this.elements.totalNewcomers = document.getElementById('totalNewcomers');

      // 验证关键元素是否存在
      const criticalElements = [
        'groupSelect', 'memberSelect', 'signinButton',
        'addNewcomerButton', 'dailyReportButton', 'adminButton'
      ];

      const missingElements = criticalElements.filter(id => !this.elements[id]);
      
      if (missingElements.length > 0) {
        console.warn(`⚠️ 部分关键DOM元素缺失: ${missingElements.join(', ')}`);
        console.warn('这可能是因为在测试环境中运行，或页面尚未完全加载');
        // 在测试环境中不抛出错误，只是警告
      }

      this.isInitialized = true;
      
      console.log('✅ DOM元素引用初始化完成');
      console.log(`📊 已缓存 ${Object.keys(this.elements).length} 个DOM元素`);

      return {
        success: true,
        elements: this.elements,
        count: Object.keys(this.elements).length
      };

    } catch (error) {
      console.error('❌ DOM管理器初始化失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取DOM元素
   * @param {string} elementId - 元素ID
   * @returns {Element|null} - DOM元素
   */
  getElement(elementId) {
    if (!this.isInitialized) {
      console.warn('DOM管理器未初始化，尝试直接获取元素');
      return document.getElementById(elementId);
    }

    return this.elements[elementId] || null;
  }

  /**
   * 批量获取DOM元素
   * @param {string[]} elementIds - 元素ID数组
   * @returns {Object} - 元素对象
   */
  getElements(elementIds) {
    const result = {};
    
    for (const id of elementIds) {
      result[id] = this.getElement(id);
    }
    
    return result;
  }

  /**
   * 更新DOM元素引用
   * @param {string} elementId - 元素ID
   * @returns {boolean} - 更新是否成功
   */
  updateElement(elementId) {
    try {
      const element = document.getElementById(elementId);
      if (element) {
        this.elements[elementId] = element;
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`更新DOM元素失败: ${elementId}`, error);
      return false;
    }
  }

  /**
   * 显示元素
   * @param {string} elementId - 元素ID
   * @param {string} displayType - 显示类型（block, flex, inline等）
   */
  showElement(elementId, displayType = 'block') {
    const element = this.getElement(elementId);
    if (element) {
      element.style.display = displayType;
    }
  }

  /**
   * 隐藏元素
   * @param {string} elementId - 元素ID
   */
  hideElement(elementId) {
    const element = this.getElement(elementId);
    if (element) {
      element.style.display = 'none';
    }
  }

  /**
   * 切换元素显示状态
   * @param {string} elementId - 元素ID
   * @param {string} displayType - 显示类型
   */
  toggleElement(elementId, displayType = 'block') {
    const element = this.getElement(elementId);
    if (element) {
      element.style.display = element.style.display === 'none' ? displayType : 'none';
    }
  }

  /**
   * 设置元素文本内容
   * @param {string} elementId - 元素ID
   * @param {string} text - 文本内容
   */
  setText(elementId, text) {
    const element = this.getElement(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * 设置元素HTML内容
   * @param {string} elementId - 元素ID
   * @param {string} html - HTML内容
   */
  setHTML(elementId, html) {
    const element = this.getElement(elementId);
    if (element) {
      element.innerHTML = html;
    }
  }

  /**
   * 设置元素值
   * @param {string} elementId - 元素ID
   * @param {string} value - 值
   */
  setValue(elementId, value) {
    const element = this.getElement(elementId);
    if (element) {
      element.value = value;
    }
  }

  /**
   * 获取元素值
   * @param {string} elementId - 元素ID
   * @returns {string} - 元素值
   */
  getValue(elementId) {
    const element = this.getElement(elementId);
    return element ? element.value : '';
  }

  /**
   * 添加CSS类
   * @param {string} elementId - 元素ID
   * @param {string} className - CSS类名
   */
  addClass(elementId, className) {
    const element = this.getElement(elementId);
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * 移除CSS类
   * @param {string} elementId - 元素ID
   * @param {string} className - CSS类名
   */
  removeClass(elementId, className) {
    const element = this.getElement(elementId);
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
   * 切换CSS类
   * @param {string} elementId - 元素ID
   * @param {string} className - CSS类名
   */
  toggleClass(elementId, className) {
    const element = this.getElement(elementId);
    if (element) {
      element.classList.toggle(className);
    }
  }

  /**
   * 检查元素是否有CSS类
   * @param {string} elementId - 元素ID
   * @param {string} className - CSS类名
   * @returns {boolean} - 是否有该类
   */
  hasClass(elementId, className) {
    const element = this.getElement(elementId);
    return element ? element.classList.contains(className) : false;
  }

  /**
   * 设置元素属性
   * @param {string} elementId - 元素ID
   * @param {string} attribute - 属性名
   * @param {string} value - 属性值
   */
  setAttribute(elementId, attribute, value) {
    const element = this.getElement(elementId);
    if (element) {
      element.setAttribute(attribute, value);
    }
  }

  /**
   * 获取元素属性
   * @param {string} elementId - 元素ID
   * @param {string} attribute - 属性名
   * @returns {string|null} - 属性值
   */
  getAttribute(elementId, attribute) {
    const element = this.getElement(elementId);
    return element ? element.getAttribute(attribute) : null;
  }

  /**
   * 移除元素属性
   * @param {string} elementId - 元素ID
   * @param {string} attribute - 属性名
   */
  removeAttribute(elementId, attribute) {
    const element = this.getElement(elementId);
    if (element) {
      element.removeAttribute(attribute);
    }
  }

  /**
   * 清空元素内容
   * @param {string} elementId - 元素ID
   */
  clearContent(elementId) {
    const element = this.getElement(elementId);
    if (element) {
      element.innerHTML = '';
    }
  }

  /**
   * 检查元素是否存在
   * @param {string} elementId - 元素ID
   * @returns {boolean} - 是否存在
   */
  exists(elementId) {
    return this.getElement(elementId) !== null;
  }

  /**
   * 检查元素是否可见
   * @param {string} elementId - 元素ID
   * @returns {boolean} - 是否可见
   */
  isVisible(elementId) {
    const element = this.getElement(elementId);
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  /**
   * 聚焦到元素
   * @param {string} elementId - 元素ID
   */
  focus(elementId) {
    const element = this.getElement(elementId);
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  /**
   * 滚动到元素
   * @param {string} elementId - 元素ID
   * @param {Object} options - 滚动选项
   */
  scrollTo(elementId, options = {}) {
    const element = this.getElement(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        ...options
      });
    }
  }

  /**
   * 获取DOM管理器状态
   * @returns {Object} - 状态信息
   */
  getStatus() {
    const validElements = Object.values(this.elements).filter(el => el !== null);
    
    return {
      isInitialized: this.isInitialized,
      totalElements: Object.keys(this.elements).length,
      validElements: validElements.length,
      missingElements: Object.keys(this.elements).length - validElements.length
    };
  }

  /**
   * 重置DOM管理器
   */
  reset() {
    this.elements = {};
    this.isInitialized = false;
    console.log('🔄 DOM管理器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局DOM管理器实例
const domManager = new DOMManager();

/**
 * 便捷DOM初始化函数
 * @returns {Object} - 初始化结果
 */
export function initializeDOM() {
  return domManager.initialize();
}

/**
 * 便捷元素获取函数
 * @param {string} elementId - 元素ID
 * @returns {Element|null} - DOM元素
 */
export function getElement(elementId) {
  return domManager.getElement(elementId);
}

/**
 * 便捷元素显示函数
 * @param {string} elementId - 元素ID
 * @param {string} displayType - 显示类型
 */
export function showElement(elementId, displayType = 'block') {
  domManager.showElement(elementId, displayType);
}

/**
 * 便捷元素隐藏函数
 * @param {string} elementId - 元素ID
 */
export function hideElement(elementId) {
  domManager.hideElement(elementId);
}

// ==================== 导出 ====================

export { DOMManager, domManager };

// 将便捷函数添加到全局
window.MSHDOMManager = {
  initialize: initializeDOM,
  get: getElement,
  show: showElement,
  hide: hideElement,
  toggle: (id, type) => domManager.toggleElement(id, type),
  setText: (id, text) => domManager.setText(id, text),
  setHTML: (id, html) => domManager.setHTML(id, html),
  setValue: (id, value) => domManager.setValue(id, value),
  getValue: (id) => domManager.getValue(id),
  addClass: (id, className) => domManager.addClass(id, className),
  removeClass: (id, className) => domManager.removeClass(id, className),
  toggleClass: (id, className) => domManager.toggleClass(id, className),
  hasClass: (id, className) => domManager.hasClass(id, className),
  exists: (id) => domManager.exists(id),
  isVisible: (id) => domManager.isVisible(id),
  focus: (id) => domManager.focus(id),
  scrollTo: (id, options) => domManager.scrollTo(id, options),
  getStatus: () => domManager.getStatus(),
  reset: () => domManager.reset()
};

console.log('✅ DOM管理器模块已加载');
