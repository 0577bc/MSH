/**
 * 简化版可访问性管理器
 * 只保留必要的可访问性功能，不影响界面美观
 */

class SimpleAccessibilityManager {
  constructor() {
    this.init();
  }

  /**
   * 初始化可访问性功能
   */
  init() {
    this.setupBasicKeyboardSupport();
    this.setupARIALabels();
    this.setupFocusManagement();
  }

  /**
   * 设置基础键盘支持
   */
  setupBasicKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
      // Enter键激活按钮
      if (e.key === 'Enter' || e.key === ' ') {
        this.handleEnterActivation(e);
      }
      
      // Escape键关闭模态框
      if (e.key === 'Escape') {
        this.handleEscapeKey(e);
      }
    });
  }

  /**
   * 处理Enter键激活
   */
  handleEnterActivation(e) {
    const target = e.target;
    
    // 按钮和链接
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
      if (target.onclick) {
        target.onclick();
      } else if (target.href && target.tagName === 'A') {
        window.location.href = target.href;
      }
    }
    
    // 可点击的div
    if (target.getAttribute('role') === 'button' || target.classList.contains('clickable')) {
      if (target.onclick) {
        target.onclick();
      }
    }
  }

  /**
   * 处理Escape键
   */
  handleEscapeKey(e) {
    // 关闭模态框
    const modals = document.querySelectorAll('.modal, .dialog');
    modals.forEach(modal => {
      if (modal.style.display !== 'none') {
        modal.style.display = 'none';
      }
    });

    // 关闭下拉菜单
    const dropdowns = document.querySelectorAll('.dropdown, .suggestions-box');
    dropdowns.forEach(dropdown => {
      if (dropdown.style.display !== 'none') {
        dropdown.style.display = 'none';
      }
    });
  }

  /**
   * 设置ARIA标签
   */
  setupARIALabels() {
    // 为表单元素添加ARIA标签
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          input.setAttribute('aria-label', label.textContent.replace('：', '').replace(':', ''));
        }
      }
    });

    // 为按钮添加ARIA标签
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (!button.getAttribute('aria-label') && button.textContent.trim()) {
        button.setAttribute('aria-label', button.textContent.trim());
      }
    });
  }

  /**
   * 设置焦点管理
   */
  setupFocusManagement() {
    // 确保焦点可见
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: 2px solid #007cba;
        outline-offset: 2px;
      }
      
      button:focus,
      input:focus,
      select:focus,
      textarea:focus {
        box-shadow: 0 0 0 2px #007cba;
      }
    `;
    document.head.appendChild(style);
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.simpleAccessibilityManager = new SimpleAccessibilityManager();
}
