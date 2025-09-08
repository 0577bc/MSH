/**
 * UI模板系统
 * 提供常用的UI模板，简化组件创建
 */

class UITemplates {
  constructor() {
    this.templates = new Map();
    this.init();
  }

  /**
   * 初始化模板系统
   */
  init() {
    this.registerTemplates();
  }

  /**
   * 注册所有模板
   */
  registerTemplates() {
    // 登录表单模板
    this.registerTemplate('loginForm', this.createLoginFormTemplate);
    
    // 成员管理表单模板
    this.registerTemplate('memberForm', this.createMemberFormTemplate);
    
    // 小组管理表单模板
    this.registerTemplate('groupForm', this.createGroupFormTemplate);
    
    // 签到表格模板
    this.registerTemplate('attendanceTable', this.createAttendanceTableTemplate);
    
    // 成员表格模板
    this.registerTemplate('memberTable', this.createMemberTableTemplate);
    
    // 搜索表单模板
    this.registerTemplate('searchForm', this.createSearchFormTemplate);
    
    // 按钮组模板
    this.registerTemplate('buttonGroup', this.createButtonGroupTemplate);
    
    // 统计卡片模板
    this.registerTemplate('statCard', this.createStatCardTemplate);
  }

  /**
   * 注册模板
   */
  registerTemplate(name, factory) {
    this.templates.set(name, factory);
  }

  /**
   * 创建模板
   */
  create(name, options = {}) {
    const factory = this.templates.get(name);
    if (!factory) {
      throw new Error(`模板 "${name}" 未注册`);
    }
    return factory.call(this, options);
  }

  /**
   * 登录表单模板
   */
  createLoginFormTemplate(options = {}) {
    const form = window.uiComponents.create('form', {
      id: options.id || 'loginForm',
      className: 'login-form'
    });

    const title = document.createElement('h2');
    title.textContent = options.title || '管理员登录';
    form.appendChild(title);

    const message = document.createElement('p');
    message.textContent = options.message || '请使用管理员邮箱和密码登录：';
    form.appendChild(message);

    // 邮箱输入
    const emailInput = window.uiComponents.create('input', {
      label: '邮箱：',
      id: 'adminEmailInput',
      name: 'email',
      type: 'email',
      placeholder: '请输入管理员邮箱',
      required: true,
      autocomplete: 'email'
    });
    form.appendChild(emailInput);

    // 密码输入
    const passwordInput = window.uiComponents.create('input', {
      label: '密码：',
      id: 'adminPasswordInput',
      name: 'password',
      type: 'password',
      placeholder: '请输入密码',
      required: true,
      autocomplete: 'current-password'
    });
    form.appendChild(passwordInput);

    // 按钮组
    const buttonGroup = window.uiComponents.create('buttonGroup', {
      buttons: [
        {
          id: 'loginBtn',
          text: '登录',
          type: 'submit',
          className: 'primary-button'
        },
        {
          id: 'cancelLoginBtn',
          text: '取消',
          type: 'button',
          className: 'secondary-button'
        }
      ]
    });
    form.appendChild(buttonGroup);

    // 错误消息
    const errorDiv = document.createElement('div');
    errorDiv.id = 'loginError';
    errorDiv.className = 'error-message hidden-form';
    form.appendChild(errorDiv);

    return form;
  }

  /**
   * 成员管理表单模板
   */
  createMemberFormTemplate(options = {}) {
    const form = window.uiComponents.create('form', {
      id: options.id || 'memberForm',
      className: 'member-form'
    });

    // 小组选择
    const groupSelect = window.uiComponents.create('select', {
      label: '选择小组：',
      id: 'groupSelect',
      name: 'group',
      required: true,
      ariaLabel: '选择小组',
      options: [
        { value: '', text: '--请选择小组--' }
      ]
    });
    form.appendChild(groupSelect);

    // 成员表格
    const memberTable = window.uiComponents.create('memberTable', {
      id: 'memberTable',
      tbodyId: 'memberList'
    });
    form.appendChild(memberTable);

    // 按钮组
    const buttonGroup = window.uiComponents.create('buttonGroup', {
      buttons: [
        {
          id: 'saveButton',
          text: '确认修改',
          type: 'button',
          className: 'primary-button',
          ariaLabel: '确认修改成员信息'
        },
        {
          id: 'addMemberButton',
          text: '添加',
          type: 'button',
          className: 'secondary-button',
          ariaLabel: '添加成员'
        },
        {
          id: 'regenerateIdsButton',
          text: '重新生成序号',
          type: 'button',
          className: 'success-button',
          ariaLabel: '重新生成序号'
        }
      ]
    });
    form.appendChild(buttonGroup);

    return form;
  }

  /**
   * 小组管理表单模板
   */
  createGroupFormTemplate(options = {}) {
    const container = window.uiComponents.create('container', {
      id: options.id || 'groupForm',
      className: 'group-form'
    });

    // 添加小组按钮
    const addButton = window.uiComponents.create('button', {
      id: 'addGroupButton',
      text: '添加小组',
      type: 'button',
      className: 'primary-button',
      ariaLabel: '添加小组'
    });
    container.appendChild(addButton);

    // 添加小组表单
    const addForm = window.uiComponents.create('form', {
      id: 'addGroupForm',
      className: 'form-group hidden-form'
    });

    const addTitle = document.createElement('h3');
    addTitle.textContent = '添加小组';
    addForm.appendChild(addTitle);

    const nameInput = window.uiComponents.create('input', {
      label: '小组名称：',
      id: 'newGroupName',
      name: 'groupName',
      type: 'text',
      placeholder: '请输入小组名称',
      required: true
    });
    addForm.appendChild(nameInput);

    const addButtonGroup = window.uiComponents.create('buttonGroup', {
      buttons: [
        {
          id: 'saveGroupButton',
          text: '保存',
          type: 'button',
          className: 'primary-button'
        },
        {
          id: 'cancelGroupButton',
          text: '取消',
          type: 'button',
          className: 'secondary-button'
        }
      ]
    });
    addForm.appendChild(addButtonGroup);

    container.appendChild(addForm);

    return container;
  }

  /**
   * 签到表格模板
   */
  createAttendanceTableTemplate(options = {}) {
    const table = window.uiComponents.create('table', {
      id: options.id || 'attendanceTable',
      className: 'attendance-table',
      ariaLabel: options.ariaLabel || '签到表格',
      caption: options.caption || '签到表格',
      headers: options.headers || ['组别', '姓名', '签到时间'],
      tbodyId: options.tbodyId || 'attendanceList'
    });

    return table;
  }

  /**
   * 成员表格模板
   */
  createMemberTableTemplate(options = {}) {
    const table = window.uiComponents.create('table', {
      id: options.id || 'memberTable',
      className: 'member-table',
      ariaLabel: options.ariaLabel || '小组成员列表',
      caption: options.caption || '小组成员列表',
      headers: options.headers || ['序号', '姓名', '花名', '性别', '联系方式', '是否受洗', '年龄段', '操作'],
      tbodyId: options.tbodyId || 'memberList'
    });

    return table;
  }

  /**
   * 搜索表单模板
   */
  createSearchFormTemplate(options = {}) {
    const form = window.uiComponents.create('form', {
      id: options.id || 'searchForm',
      className: 'search-form'
    });

    const searchInput = window.uiComponents.create('input', {
      label: options.label || '姓名检索：',
      id: options.inputId || 'memberSearch',
      name: 'search',
      type: 'text',
      placeholder: options.placeholder || '请输入姓名或花名',
      autocomplete: 'off'
    });
    form.appendChild(searchInput);

    // 建议框
    const suggestionsBox = document.createElement('div');
    suggestionsBox.id = options.suggestionsId || 'suggestionsBox';
    suggestionsBox.className = 'suggestions-box hidden-form';
    form.appendChild(suggestionsBox);

    return form;
  }

  /**
   * 按钮组模板
   */
  createButtonGroupTemplate(options = {}) {
    const container = document.createElement('div');
    container.className = options.className || 'button-group';

    if (options.buttons) {
      options.buttons.forEach(buttonOptions => {
        const button = window.uiComponents.create('button', buttonOptions);
        container.appendChild(button);
      });
    }

    return container;
  }

  /**
   * 统计卡片模板
   */
  createStatCardTemplate(options = {}) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.id = options.id || '';

    const title = document.createElement('h3');
    title.textContent = options.title || '';
    card.appendChild(title);

    const value = document.createElement('div');
    value.className = 'stat-value';
    value.id = options.valueId || '';
    value.textContent = options.value || '0';
    card.appendChild(value);

    const description = document.createElement('p');
    description.textContent = options.description || '';
    card.appendChild(description);

    return card;
  }

  /**
   * 创建页面布局模板
   */
  createPageLayout(options = {}) {
    const page = document.createElement('div');
    page.className = 'page-layout';

    // 头部
    if (options.header) {
      const header = document.createElement('header');
      header.className = 'page-header';
      header.innerHTML = options.header;
      page.appendChild(header);
    }

    // 主内容
    const main = document.createElement('main');
    main.className = 'page-main';
    if (options.content) {
      if (typeof options.content === 'string') {
        main.innerHTML = options.content;
      } else {
        main.appendChild(options.content);
      }
    }
    page.appendChild(main);

    // 侧边栏
    if (options.sidebar) {
      const sidebar = document.createElement('aside');
      sidebar.className = 'page-sidebar';
      if (typeof options.sidebar === 'string') {
        sidebar.innerHTML = options.sidebar;
      } else {
        sidebar.appendChild(options.sidebar);
      }
      page.appendChild(sidebar);
    }

    // 底部
    if (options.footer) {
      const footer = document.createElement('footer');
      footer.className = 'page-footer';
      footer.innerHTML = options.footer;
      page.appendChild(footer);
    }

    return page;
  }

  /**
   * 创建导航模板
   */
  createNavigationTemplate(options = {}) {
    const nav = document.createElement('nav');
    nav.className = 'navigation';
    nav.id = options.id || '';

    const list = document.createElement('ul');
    list.className = 'nav-list';

    if (options.items) {
      options.items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';

        const link = document.createElement('a');
        link.href = item.href || '#';
        link.textContent = item.text || '';
        link.className = item.className || '';
        if (item.onclick) {
          link.onclick = item.onclick;
        }

        listItem.appendChild(link);
        list.appendChild(listItem);
      });
    }

    nav.appendChild(list);
    return nav;
  }
}

// 创建全局实例
const uiTemplates = new UITemplates();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.uiTemplates = uiTemplates;
}
