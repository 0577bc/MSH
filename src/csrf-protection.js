/**
 * CSRF保护模块 (csrf-protection.js)
 * 功能：防止跨站请求伪造攻击，提供安全令牌管理
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - 自动令牌生成和刷新
 * - 表单和AJAX请求保护
 * - 令牌验证和过期管理
 * - 安全随机数生成
 */

class CSRFProtection {
  constructor() {
    this.tokenName = 'csrf-token';
    this.tokenValue = null;
    this.tokenExpiry = 30 * 60 * 1000; // 30分钟
    this.init();
  }

  /**
   * 初始化CSRF保护
   */
  init() {
    this.generateToken();
    this.setupTokenRefresh();
    this.setupFormProtection();
    this.setupAjaxProtection();
  }

  /**
   * 生成CSRF令牌
   */
  generateToken() {
    // 使用crypto API生成安全令牌
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      this.tokenValue = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // 降级方案：使用时间戳和随机数
      this.tokenValue = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 设置令牌过期时间
    this.tokenExpiry = Date.now() + this.tokenExpiry;

    // 存储到localStorage
    localStorage.setItem(this.tokenName, JSON.stringify({
      value: this.tokenValue,
      expiry: this.tokenExpiry
    }));

    // 设置到meta标签
    this.setMetaToken();

    console.log('CSRF令牌已生成');
  }

  /**
   * 设置meta标签中的CSRF令牌
   */
  setMetaToken() {
    let metaTag = document.querySelector(`meta[name="${this.tokenName}"]`);
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = this.tokenName;
      document.head.appendChild(metaTag);
    }
    metaTag.content = this.tokenValue;
  }

  /**
   * 获取当前CSRF令牌
   */
  getToken() {
    // 检查令牌是否过期
    if (this.isTokenExpired()) {
      this.generateToken();
    }
    return this.tokenValue;
  }

  /**
   * 检查令牌是否过期
   */
  isTokenExpired() {
    return Date.now() > this.tokenExpiry;
  }

  /**
   * 验证CSRF令牌
   */
  validateToken(token) {
    if (!token || !this.tokenValue) {
      return false;
    }
    return token === this.tokenValue && !this.isTokenExpired();
  }

  /**
   * 设置令牌自动刷新
   */
  setupTokenRefresh() {
    // 每15分钟检查一次令牌
    setInterval(() => {
      if (this.isTokenExpired()) {
        this.generateToken();
        console.log('CSRF令牌已自动刷新');
      }
    }, 15 * 60 * 1000);
  }

  /**
   * 保护所有表单
   */
  setupFormProtection() {
    // 监听表单提交
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.tagName === 'FORM') {
        this.protectForm(form);
      }
    });

    // 保护页面加载时已存在的表单
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => this.protectForm(form));
    });
  }

  /**
   * 保护单个表单
   */
  protectForm(form) {
    // 检查是否已经有CSRF令牌字段
    let tokenField = form.querySelector(`input[name="${this.tokenName}"]`);
    if (!tokenField) {
      // 创建隐藏的CSRF令牌字段
      tokenField = document.createElement('input');
      tokenField.type = 'hidden';
      tokenField.name = this.tokenName;
      form.appendChild(tokenField);
    }
    tokenField.value = this.getToken();
  }

  /**
   * 保护Ajax请求
   */
  setupAjaxProtection() {
    // 重写fetch方法
    const originalFetch = window.fetch;
    window.fetch = (url, options = {}) => {
      // 添加CSRF令牌到请求头
      if (this.shouldProtectRequest(url, options)) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-Token'] = this.getToken();
      }
      return originalFetch(url, options);
    };

    // 重写XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
      // 添加CSRF令牌到请求头
      if (window.csrfProtection && window.csrfProtection.shouldProtectRequest(this._url, { method: this._method })) {
        this.setRequestHeader('X-CSRF-Token', window.csrfProtection.getToken());
      }
      return originalXHRSend.apply(this, [data]);
    };
  }

  /**
   * 判断请求是否需要CSRF保护
   */
  shouldProtectRequest(url, options = {}) {
    // 只保护POST、PUT、DELETE、PATCH请求
    const method = (options.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return false;
    }

    // 排除某些不需要保护的请求
    const excludePatterns = [
      /^https?:\/\/www\.gstatic\.com/, // Google静态资源
      /^https?:\/\/cdnjs\.cloudflare\.com/, // CDN资源
      /\.(css|js|png|jpg|jpeg|gif|svg|ico)$/i, // 静态资源
      /^https?:\/\/112\.124\.97\.58/, // 外部表单系统API
      /^http:\/\/112\.124\.97\.58/ // 外部表单系统API (HTTP)
    ];

    return !excludePatterns.some(pattern => pattern.test(url));
  }

  /**
   * 验证请求中的CSRF令牌
   */
  validateRequest(request) {
    const token = request.headers['X-CSRF-Token'] || request.headers['x-csrf-token'];
    return this.validateToken(token);
  }

  /**
   * 生成CSRF令牌HTML
   */
  generateTokenHTML() {
    return `<input type="hidden" name="${this.tokenName}" value="${this.getToken()}">`;
  }

  /**
   * 生成CSRF令牌meta标签
   */
  generateMetaHTML() {
    return `<meta name="${this.tokenName}" content="${this.getToken()}">`;
  }

  /**
   * 清理过期的令牌
   */
  cleanup() {
    localStorage.removeItem(this.tokenName);
    this.tokenValue = null;
    this.tokenExpiry = 0;
  }
}

// 创建全局实例
const csrfProtection = new CSRFProtection();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.csrfProtection = csrfProtection;
}

// 在页面加载时初始化
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // 确保所有表单都受到保护
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      csrfProtection.protectForm(form);
    });
  });
}
