/**
 * UI组件系统
 * 提供可重用的UI组件，减少代码重复
 */

class UIComponents {
  constructor() {
    this.components = new Map();
    this.init();
  }

  /**
   * 初始化组件系统
   */
  init() {
    this.registerComponents();
  }

  /**
   * 注册所有组件
   */
  registerComponents() {
    // 表单组件
    this.registerComponent('form', this.createFormComponent);
    this.registerComponent('input', this.createInputComponent);
    this.registerComponent('select', this.createSelectComponent);
    this.registerComponent('button', this.createButtonComponent);
    
    // 表格组件
    this.registerComponent('table', this.createTableComponent);
    this.registerComponent('tableRow', this.createTableRowComponent);
    
    // 模态框组件
    this.registerComponent('modal', this.createModalComponent);
    this.registerComponent('dialog', this.createDialogComponent);
    
    // 布局组件
    this.registerComponent('section', this.createSectionComponent);
    this.registerComponent('container', this.createContainerComponent);
    
    // 列表组件
    this.registerComponent('list', this.createListComponent);
    this.registerComponent('listItem', this.createListItemComponent);
  }

  /**
   * 注册组件
   */
  registerComponent(name, factory) {
    this.components.set(name, factory);
  }

  /**
   * 创建组件
   */
  create(name, options = {}) {
    const factory = this.components.get(name);
    if (!factory) {
      throw new Error(`组件 "${name}" 未注册`);
    }
    return factory.call(this, options);
  }

  /**
   * 表单组件
   */
  createFormComponent(options = {}) {
    const form = document.createElement('form');
    form.id = options.id || '';
    form.className = options.className || '';
    form.action = options.action || '#';
    form.method = options.method || 'POST';
    
    if (options.onsubmit) {
      form.onsubmit = options.onsubmit;
    }
    
    return form;
  }

  /**
   * 输入框组件
   */
  createInputComponent(options = {}) {
    const container = document.createElement('div');
    container.className = 'form-group';
    
    if (options.label) {
      const label = document.createElement('label');
      label.textContent = options.label;
      label.htmlFor = options.id || '';
      container.appendChild(label);
    }
    
    const input = document.createElement('input');
    input.type = options.type || 'text';
    input.id = options.id || '';
    input.name = options.name || '';
    input.placeholder = options.placeholder || '';
    input.value = options.value || '';
    input.className = options.className || '';
    input.required = options.required || false;
    input.autocomplete = options.autocomplete || 'off';
    
    if (options.onchange) {
      input.onchange = options.onchange;
    }
    
    if (options.oninput) {
      input.oninput = options.oninput;
    }
    
    container.appendChild(input);
    
    if (options.error) {
      const error = document.createElement('div');
      error.className = 'error-message';
      error.textContent = options.error;
      container.appendChild(error);
    }
    
    return container;
  }

  /**
   * 选择框组件
   */
  createSelectComponent(options = {}) {
    const container = document.createElement('div');
    container.className = 'form-group';
    
    if (options.label) {
      const label = document.createElement('label');
      label.textContent = options.label;
      label.htmlFor = options.id || '';
      container.appendChild(label);
    }
    
    const select = document.createElement('select');
    select.id = options.id || '';
    select.name = options.name || '';
    select.className = options.className || '';
    select.required = options.required || false;
    select.ariaLabel = options.ariaLabel || '';
    
    if (options.onchange) {
      select.onchange = options.onchange;
    }
    
    // 添加选项
    if (options.options) {
      options.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value || '';
        optionElement.textContent = option.text || '';
        optionElement.selected = option.selected || false;
        select.appendChild(optionElement);
      });
    }
    
    container.appendChild(select);
    
    if (options.error) {
      const error = document.createElement('div');
      error.className = 'error-message';
      error.textContent = options.error;
      container.appendChild(error);
    }
    
    return container;
  }

  /**
   * 按钮组件
   */
  createButtonComponent(options = {}) {
    const button = document.createElement('button');
    button.type = options.type || 'button';
    button.id = options.id || '';
    button.className = options.className || '';
    button.textContent = options.text || '';
    button.ariaLabel = options.ariaLabel || '';
    button.disabled = options.disabled || false;
    
    if (options.onclick) {
      button.onclick = options.onclick;
    }
    
    return button;
  }

  /**
   * 表格组件
   */
  createTableComponent(options = {}) {
    const table = document.createElement('table');
    table.id = options.id || '';
    table.className = options.className || '';
    table.ariaLabel = options.ariaLabel || '';
    
    if (options.caption) {
      const caption = document.createElement('caption');
      caption.textContent = options.caption;
      table.appendChild(caption);
    }
    
    // 表头
    if (options.headers) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      options.headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }
    
    // 表体
    const tbody = document.createElement('tbody');
    tbody.id = options.tbodyId || '';
    table.appendChild(tbody);
    
    return table;
  }

  /**
   * 表格行组件
   */
  createTableRowComponent(options = {}) {
    const row = document.createElement('tr');
    row.className = options.className || '';
    
    if (options.cells) {
      options.cells.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell.text || '';
        td.className = cell.className || '';
        if (cell.onclick) {
          td.onclick = cell.onclick;
        }
        row.appendChild(td);
      });
    }
    
    return row;
  }

  /**
   * 模态框组件
   */
  createModalComponent(options = {}) {
    const modal = document.createElement('div');
    modal.id = options.id || '';
    modal.className = 'modal';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    if (options.title) {
      const title = document.createElement('h2');
      title.textContent = options.title;
      content.appendChild(title);
    }
    
    if (options.body) {
      if (typeof options.body === 'string') {
        content.innerHTML += options.body;
      } else {
        content.appendChild(options.body);
      }
    }
    
    if (options.buttons) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'modal-buttons';
      
      options.buttons.forEach(button => {
        const btn = this.create('button', button);
        buttonContainer.appendChild(btn);
      });
      
      content.appendChild(buttonContainer);
    }
    
    modal.appendChild(content);
    
    // 点击背景关闭
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    };
    
    return modal;
  }

  /**
   * 对话框组件
   */
  createDialogComponent(options = {}) {
    const dialog = document.createElement('div');
    dialog.id = options.id || '';
    dialog.className = 'dialog';
    
    const content = document.createElement('div');
    content.className = 'dialog-content';
    
    if (options.title) {
      const title = document.createElement('h2');
      title.textContent = options.title;
      content.appendChild(title);
    }
    
    if (options.message) {
      const message = document.createElement('p');
      message.textContent = options.message;
      content.appendChild(message);
    }
    
    if (options.body) {
      if (typeof options.body === 'string') {
        content.innerHTML += options.body;
      } else {
        content.appendChild(options.body);
      }
    }
    
    if (options.buttons) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'dialog-buttons';
      
      options.buttons.forEach(button => {
        const btn = this.create('button', button);
        buttonContainer.appendChild(btn);
      });
      
      content.appendChild(buttonContainer);
    }
    
    dialog.appendChild(content);
    
    return dialog;
  }

  /**
   * 区域组件
   */
  createSectionComponent(options = {}) {
    const section = document.createElement('section');
    section.id = options.id || '';
    section.className = options.className || '';
    
    if (options.title) {
      const title = document.createElement('h2');
      title.textContent = options.title;
      section.appendChild(title);
    }
    
    if (options.content) {
      if (typeof options.content === 'string') {
        section.innerHTML += options.content;
      } else {
        section.appendChild(options.content);
      }
    }
    
    return section;
  }

  /**
   * 容器组件
   */
  createContainerComponent(options = {}) {
    const container = document.createElement('div');
    container.id = options.id || '';
    container.className = options.className || '';
    
    if (options.content) {
      if (typeof options.content === 'string') {
        container.innerHTML = options.content;
      } else {
        container.appendChild(options.content);
      }
    }
    
    return container;
  }

  /**
   * 列表组件
   */
  createListComponent(options = {}) {
    const list = document.createElement('ul');
    list.id = options.id || '';
    list.className = options.className || '';
    
    if (options.items) {
      options.items.forEach(item => {
        const listItem = this.create('listItem', item);
        list.appendChild(listItem);
      });
    }
    
    return list;
  }

  /**
   * 列表项组件
   */
  createListItemComponent(options = {}) {
    const item = document.createElement('li');
    item.className = options.className || '';
    item.textContent = options.text || '';
    
    if (options.onclick) {
      item.onclick = options.onclick;
    }
    
    return item;
  }

  /**
   * 显示模态框
   */
  showModal(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * 关闭模态框
   */
  closeModal(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * 显示对话框
   */
  showDialog(dialog) {
    if (typeof dialog === 'string') {
      dialog = document.getElementById(dialog);
    }
    
    if (dialog) {
      dialog.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * 关闭对话框
   */
  closeDialog(dialog) {
    if (typeof dialog === 'string') {
      dialog = document.getElementById(dialog);
    }
    
    if (dialog) {
      dialog.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * 创建确认对话框
   */
  createConfirmDialog(options = {}) {
    const dialog = this.create('dialog', {
      id: options.id || 'confirmDialog',
      title: options.title || '确认',
      message: options.message || '您确定要执行此操作吗？',
      buttons: [
        {
          text: options.confirmText || '确认',
          className: 'confirm-button',
          onclick: () => {
            if (options.onConfirm) {
              options.onConfirm();
            }
            this.closeDialog(dialog);
          }
        },
        {
          text: options.cancelText || '取消',
          className: 'cancel-button',
          onclick: () => {
            if (options.onCancel) {
              options.onCancel();
            }
            this.closeDialog(dialog);
          }
        }
      ]
    });
    
    return dialog;
  }

  /**
   * 创建加载指示器
   */
  createLoadingIndicator(options = {}) {
    const container = document.createElement('div');
    container.className = 'loading-indicator';
    container.id = options.id || '';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    container.appendChild(spinner);
    
    if (options.text) {
      const text = document.createElement('div');
      text.className = 'loading-text';
      text.textContent = options.text;
      container.appendChild(text);
    }
    
    return container;
  }

  /**
   * 创建通知组件
   */
  createNotification(options = {}) {
    const notification = document.createElement('div');
    notification.className = `notification ${options.type || 'info'}`;
    notification.id = options.id || '';
    
    const message = document.createElement('div');
    message.className = 'notification-message';
    message.textContent = options.message || '';
    notification.appendChild(message);
    
    if (options.closable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.textContent = '×';
      closeBtn.onclick = () => {
        notification.remove();
      };
      notification.appendChild(closeBtn);
    }
    
    // 自动关闭
    if (options.autoClose !== false) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, options.duration || 5000);
    }
    
    return notification;
  }

  /**
   * 显示通知
   */
  showNotification(options = {}) {
    const notification = this.createNotification(options);
    
    // 添加到页面
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    return notification;
  }
}

// 创建全局实例
const uiComponents = new UIComponents();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.uiComponents = uiComponents;
}
