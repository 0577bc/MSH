/**
 * 可访问性管理器
 * 提供ARIA标签、键盘导航和其他可访问性功能
 */

class AccessibilityManager {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.skipLinks = [];
    this.landmarks = [];
    this.init();
  }

  /**
   * 初始化可访问性功能
   */
  init() {
    this.setupKeyboardNavigation();
    this.setupSkipLinks();
    this.setupLandmarks();
    this.setupARIALabels();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
  }

  /**
   * 设置键盘导航
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Tab键导航
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
      
      // Enter键激活
      if (e.key === 'Enter' || e.key === ' ') {
        this.handleEnterActivation(e);
      }
      
      // Escape键关闭模态框
      if (e.key === 'Escape') {
        this.handleEscapeKey(e);
      }
      
      // 箭头键导航
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
    });
  }

  /**
   * 处理Tab键导航
   */
  handleTabNavigation(e) {
    const focusableElements = this.getFocusableElements();
    
    if (focusableElements.length === 0) return;
    
    if (e.shiftKey) {
      // Shift + Tab: 向前导航
      this.currentFocusIndex = this.currentFocusIndex <= 0 
        ? focusableElements.length - 1 
        : this.currentFocusIndex - 1;
    } else {
      // Tab: 向后导航
      this.currentFocusIndex = this.currentFocusIndex >= focusableElements.length - 1 
        ? 0 
        : this.currentFocusIndex + 1;
    }
    
    focusableElements[this.currentFocusIndex].focus();
    e.preventDefault();
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
      if (modal.style.display === 'block') {
        this.closeModal(modal);
      }
    });
    
    // 关闭下拉菜单
    const dropdowns = document.querySelectorAll('.dropdown.open');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  }

  /**
   * 处理箭头键导航
   */
  handleArrowNavigation(e) {
    const target = e.target;
    
    // 在表格中导航
    if (target.closest('table')) {
      this.handleTableNavigation(e, target);
    }
    
    // 在列表中导航
    if (target.closest('ul, ol')) {
      this.handleListNavigation(e, target);
    }
  }

  /**
   * 处理表格导航
   */
  handleTableNavigation(e, currentCell) {
    const table = currentCell.closest('table');
    const cells = Array.from(table.querySelectorAll('td, th'));
    const currentIndex = cells.indexOf(currentCell);
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - this.getTableColumns(table));
        break;
      case 'ArrowDown':
        nextIndex = Math.min(cells.length - 1, currentIndex + this.getTableColumns(table));
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        nextIndex = Math.min(cells.length - 1, currentIndex + 1);
        break;
    }
    
    if (nextIndex !== currentIndex) {
      cells[nextIndex].focus();
      e.preventDefault();
    }
  }

  /**
   * 处理列表导航
   */
  handleListNavigation(e, currentItem) {
    const list = currentItem.closest('ul, ol');
    const items = Array.from(list.querySelectorAll('li'));
    const currentIndex = items.indexOf(currentItem);
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(items.length - 1, currentIndex + 1);
        break;
    }
    
    if (nextIndex !== currentIndex) {
      items[nextIndex].focus();
      e.preventDefault();
    }
  }

  /**
   * 获取可聚焦元素
   */
  getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ];
    
    return Array.from(document.querySelectorAll(selectors.join(', ')))
      .filter(element => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  /**
   * 获取表格列数
   */
  getTableColumns(table) {
    const firstRow = table.querySelector('tr');
    return firstRow ? firstRow.children.length : 0;
  }

  /**
   * 设置跳过链接
   */
  setupSkipLinks() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupSkipLinks());
      return;
    }
    
    // 检查document.body是否存在
    if (!document.body) {
      console.warn('document.body not available, skipping skip links setup');
      return;
    }
    
    // 创建跳过链接
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = '跳转到主要内容';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * 设置地标
   */
  setupLandmarks() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupLandmarks());
      return;
    }
    
    // 为主要区域添加地标
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
      main.id = 'main-content';
    }
    
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }
    
    const nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
      nav.setAttribute('role', 'navigation');
    }
    
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
    
    const aside = document.querySelector('aside');
    if (aside && !aside.getAttribute('role')) {
      aside.setAttribute('role', 'complementary');
    }
  }

  /**
   * 设置ARIA标签
   */
  setupARIALabels() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupARIALabels());
      return;
    }
    
    // 为表单元素添加ARIA标签
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          input.setAttribute('aria-labelledby', label.id || `label-${input.id}`);
          if (!label.id) {
            label.id = `label-${input.id}`;
          }
        }
      }
    });
    
    // 为按钮添加ARIA标签
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
        button.setAttribute('aria-label', '按钮');
      }
    });
    
    // 为表格添加ARIA标签
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.getAttribute('aria-label') && !table.getAttribute('aria-labelledby')) {
        const caption = table.querySelector('caption');
        if (caption) {
          table.setAttribute('aria-labelledby', caption.id || `caption-${Date.now()}`);
          if (!caption.id) {
            caption.id = `caption-${Date.now()}`;
          }
        }
      }
    });
  }

  /**
   * 设置焦点管理
   */
  setupFocusManagement() {
    // 模态框焦点管理
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-trigger')) {
        this.trapFocus(e.target.closest('.modal'));
      }
    });
    
    // 页面可见性变化时恢复焦点
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
    });
  }

  /**
   * 设置屏幕阅读器支持
   */
  setupScreenReaderSupport() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupScreenReaderSupport());
      return;
    }
    
    // 检查document.body是否存在
    if (!document.body) {
      console.warn('document.body not available, skipping screen reader support setup');
      return;
    }
    
    // 创建屏幕阅读器专用区域
    const srOnly = document.createElement('div');
    srOnly.id = 'screen-reader-only';
    srOnly.className = 'sr-only';
    srOnly.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(srOnly);
    
    // 为动态内容添加屏幕阅读器通知
    this.setupLiveRegion();
  }

  /**
   * 设置实时区域
   */
  setupLiveRegion() {
    // 检查document.body是否存在
    if (!document.body) {
      console.warn('document.body not available, skipping live region setup');
      return;
    }
    
    const liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }

  /**
   * 焦点陷阱
   */
  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
    
    firstElement.focus();
  }

  /**
   * 关闭模态框
   */
  closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 恢复焦点到触发元素
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * 宣布消息给屏幕阅读器
   */
  announce(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * 设置高对比度模式
   */
  setHighContrastMode(enabled) {
    document.body.classList.toggle('high-contrast', enabled);
    localStorage.setItem('highContrastMode', enabled);
  }

  /**
   * 设置大字体模式
   */
  setLargeTextMode(enabled) {
    document.body.classList.toggle('large-text', enabled);
    localStorage.setItem('largeTextMode', enabled);
  }

  /**
   * 设置减少动画模式
   */
  setReducedMotionMode(enabled) {
    document.body.classList.toggle('reduced-motion', enabled);
    localStorage.setItem('reducedMotionMode', enabled);
  }

  /**
   * 初始化用户偏好设置
   */
  initUserPreferences() {
    const highContrast = localStorage.getItem('highContrastMode') === 'true';
    const largeText = localStorage.getItem('largeTextMode') === 'true';
    const reducedMotion = localStorage.getItem('reducedMotionMode') === 'true';
    
    this.setHighContrastMode(highContrast);
    this.setLargeTextMode(largeText);
    this.setReducedMotionMode(reducedMotion);
  }

  /**
   * 创建可访问性工具栏
   */
  createAccessibilityToolbar() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createAccessibilityToolbar());
      return;
    }
    
    // 检查document.body是否存在
    if (!document.body) {
      console.warn('document.body not available, skipping accessibility toolbar creation');
      return;
    }
    
    const toolbar = document.createElement('div');
    toolbar.id = 'accessibility-toolbar';
    toolbar.className = 'accessibility-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    const buttons = [
      {
        text: '高对比度',
        onclick: () => {
          const enabled = document.body.classList.toggle('high-contrast');
          this.setHighContrastMode(enabled);
          this.announce(enabled ? '高对比度模式已启用' : '高对比度模式已禁用');
        }
      },
      {
        text: '大字体',
        onclick: () => {
          const enabled = document.body.classList.toggle('large-text');
          this.setLargeTextMode(enabled);
          this.announce(enabled ? '大字体模式已启用' : '大字体模式已禁用');
        }
      },
      {
        text: '减少动画',
        onclick: () => {
          const enabled = document.body.classList.toggle('reduced-motion');
          this.setReducedMotionMode(enabled);
          this.announce(enabled ? '减少动画模式已启用' : '减少动画模式已禁用');
        }
      }
    ];
    
    buttons.forEach(buttonData => {
      const button = document.createElement('button');
      button.textContent = buttonData.text;
      button.onclick = buttonData.onclick;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 5px 0;
        padding: 5px 10px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        cursor: pointer;
      `;
      toolbar.appendChild(button);
    });
    
    document.body.appendChild(toolbar);
  }
}

// 创建全局实例
const accessibilityManager = new AccessibilityManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.accessibilityManager = accessibilityManager;
}

// 在页面加载时初始化
if (typeof window !== 'undefined') {
  // 如果DOM已经加载完成，立即初始化
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      accessibilityManager.initUserPreferences();
      accessibilityManager.createAccessibilityToolbar();
    });
  } else {
    // DOM已经加载完成，立即初始化
    accessibilityManager.initUserPreferences();
    accessibilityManager.createAccessibilityToolbar();
  }
}
