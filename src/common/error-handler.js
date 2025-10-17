/**
 * 统一错误处理模块 (error-handler.js)
 * 功能：统一错误处理逻辑，提供用户友好的错误提示和日志记录
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 错误类型定义 ====================

export const ERROR_TYPES = {
  NETWORK: 'network',
  FIREBASE: 'firebase',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  SYSTEM: 'system',
  USER: 'user'
};

export const ERROR_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// ==================== 错误处理类 ====================

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或错误消息
   * @param {Object} options - 错误处理选项
   * @returns {Object} - 错误处理结果
   */
  handle(error, options = {}) {
    const {
      type = ERROR_TYPES.SYSTEM,
      level = ERROR_LEVELS.MEDIUM,
      showToUser = true,
      logToConsole = true,
      context = {},
      recoverable = true
    } = options;

    // 创建错误对象
    const errorObj = this.createErrorObject(error, type, level, context);
    
    // 记录错误
    this.logError(errorObj);
    
    // 控制台输出
    if (logToConsole) {
      this.logToConsole(errorObj);
    }
    
    // 用户提示
    if (showToUser) {
      this.showUserMessage(errorObj, recoverable);
    }
    
    // 返回处理结果
    return {
      success: false,
      error: errorObj,
      recoverable: recoverable,
      message: this.getUserFriendlyMessage(errorObj)
    };
  }

  /**
   * 创建标准错误对象
   * @param {Error|string} error - 原始错误
   * @param {string} type - 错误类型
   * @param {string} level - 错误级别
   * @param {Object} context - 错误上下文
   * @returns {Object} - 标准错误对象
   */
  createErrorObject(error, type, level, context) {
    const timestamp = new Date().toISOString();
    const id = this.generateErrorId();
    
    return {
      id,
      timestamp,
      type,
      level,
      message: typeof error === 'string' ? error : error.message,
      stack: error.stack || null,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      recoverable: this.isRecoverableError(type, level)
    };
  }

  /**
   * 记录错误到内存
   * @param {Object} errorObj - 错误对象
   */
  logError(errorObj) {
    this.errorLog.unshift(errorObj);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
    
    // 保存到localStorage（仅关键错误）
    if (errorObj.level === ERROR_LEVELS.HIGH || errorObj.level === ERROR_LEVELS.CRITICAL) {
      this.saveToLocalStorage(errorObj);
    }
  }

  /**
   * 控制台输出
   * @param {Object} errorObj - 错误对象
   */
  logToConsole(errorObj) {
    const prefix = `[${errorObj.type.toUpperCase()}]`;
    const message = `${prefix} ${errorObj.message}`;
    
    switch (errorObj.level) {
      case ERROR_LEVELS.LOW:
        console.info(message, errorObj.context);
        break;
      case ERROR_LEVELS.MEDIUM:
        console.warn(message, errorObj.context);
        break;
      case ERROR_LEVELS.HIGH:
      case ERROR_LEVELS.CRITICAL:
        console.error(message, errorObj.context);
        if (this.isDevelopment && errorObj.stack) {
          console.error('Stack trace:', errorObj.stack);
        }
        break;
    }
  }

  /**
   * 显示用户友好的错误消息
   * @param {Object} errorObj - 错误对象
   * @param {boolean} recoverable - 是否可恢复
   */
  showUserMessage(errorObj, recoverable) {
    const message = this.getUserFriendlyMessage(errorObj);
    
    // 根据错误级别选择显示方式
    switch (errorObj.level) {
      case ERROR_LEVELS.LOW:
        this.showToast(message, 'info');
        break;
      case ERROR_LEVELS.MEDIUM:
        this.showToast(message, 'warning');
        break;
      case ERROR_LEVELS.HIGH:
        this.showAlert(message, 'warning');
        break;
      case ERROR_LEVELS.CRITICAL:
        this.showAlert(message, 'error');
        break;
    }
  }

  /**
   * 获取用户友好的错误消息
   * @param {Object} errorObj - 错误对象
   * @returns {string} - 用户友好的错误消息
   */
  getUserFriendlyMessage(errorObj) {
    const { type, message, level } = errorObj;
    
    // 根据错误类型提供用户友好的消息
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return '网络连接出现问题，请检查网络连接后重试。';
      case ERROR_TYPES.FIREBASE:
        return '数据同步出现问题，请稍后重试。如果问题持续，请联系管理员。';
      case ERROR_TYPES.VALIDATION:
        return message || '输入的数据格式不正确，请检查后重试。';
      case ERROR_TYPES.PERMISSION:
        return '您没有执行此操作的权限，请联系管理员。';
      case ERROR_TYPES.SYSTEM:
        return level === ERROR_LEVELS.CRITICAL 
          ? '系统出现严重错误，请联系管理员。'
          : '系统出现问题，请稍后重试。';
      case ERROR_TYPES.USER:
        return message || '操作失败，请重试。';
      default:
        return message || '出现未知错误，请重试。';
    }
  }

  /**
   * 显示Toast提示
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '14px',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    
    // 设置背景色
    const colors = {
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
      success: '#4CAF50'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.style.opacity = '1', 100);
    
    // 自动移除
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  /**
   * 显示Alert对话框
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  showAlert(message, type = 'warning') {
    // 创建自定义Alert样式
    const alertType = type === 'error' ? '错误' : '警告';
    alert(`[${alertType}] ${message}`);
  }

  /**
   * 检查错误是否可恢复
   * @param {string} type - 错误类型
   * @param {string} level - 错误级别
   * @returns {boolean} - 是否可恢复
   */
  isRecoverableError(type, level) {
    if (level === ERROR_LEVELS.CRITICAL) return false;
    if (type === ERROR_TYPES.PERMISSION) return false;
    return true;
  }

  /**
   * 生成错误ID
   * @returns {string} - 错误ID
   */
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存错误到localStorage
   * @param {Object} errorObj - 错误对象
   */
  saveToLocalStorage(errorObj) {
    try {
      const key = 'msh_error_log';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(errorObj);
      
      // 限制localStorage中的错误日志数量
      const maxStored = 20;
      if (existing.length > maxStored) {
        existing.splice(maxStored);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.warn('Failed to save error to localStorage:', error);
    }
  }

  /**
   * 获取错误日志
   * @param {number} limit - 限制数量
   * @returns {Array} - 错误日志数组
   */
  getErrorLog(limit = 10) {
    return this.errorLog.slice(0, limit);
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('msh_error_log');
  }

  /**
   * 获取错误统计
   * @returns {Object} - 错误统计信息
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      byLevel: {},
      recent: this.errorLog.slice(0, 5)
    };

    this.errorLog.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
    });

    return stats;
  }
}

// ==================== 便捷函数 ====================

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

/**
 * 便捷错误处理函数
 * @param {Error|string} error - 错误对象或消息
 * @param {Object} options - 错误处理选项
 * @returns {Object} - 错误处理结果
 */
export function handleError(error, options = {}) {
  return errorHandler.handle(error, options);
}

/**
 * Firebase错误处理
 * @param {Error} error - Firebase错误
 * @param {string} operation - 操作名称
 * @returns {Object} - 错误处理结果
 */
export function handleFirebaseError(error, operation = 'Firebase操作') {
  return errorHandler.handle(error, {
    type: ERROR_TYPES.FIREBASE,
    level: ERROR_LEVELS.HIGH,
    context: { operation },
    recoverable: true
  });
}

/**
 * 网络错误处理
 * @param {Error} error - 网络错误
 * @param {string} operation - 操作名称
 * @returns {Object} - 错误处理结果
 */
export function handleNetworkError(error, operation = '网络操作') {
  return errorHandler.handle(error, {
    type: ERROR_TYPES.NETWORK,
    level: ERROR_LEVELS.MEDIUM,
    context: { operation },
    recoverable: true
  });
}

/**
 * 验证错误处理
 * @param {string} message - 验证错误消息
 * @param {Object} data - 验证的数据
 * @returns {Object} - 错误处理结果
 */
export function handleValidationError(message, data = {}) {
  return errorHandler.handle(message, {
    type: ERROR_TYPES.VALIDATION,
    level: ERROR_LEVELS.LOW,
    context: { validationData: data },
    recoverable: true
  });
}

// ==================== 全局错误监听 ====================

// 监听未捕获的错误
window.addEventListener('error', (event) => {
  // 忽略浏览器扩展错误
  if (event.message && event.message.includes('Could not establish connection')) {
    event.preventDefault();
    return false;
  }
  
  errorHandler.handle(event.error || event.message, {
    type: ERROR_TYPES.SYSTEM,
    level: ERROR_LEVELS.HIGH,
    context: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  });
});

// 监听未处理的Promise错误
window.addEventListener('unhandledrejection', (event) => {
  // 忽略浏览器扩展错误
  if (event.reason && event.reason.message && event.reason.message.includes('Could not establish connection')) {
    event.preventDefault();
    return false;
  }
  
  errorHandler.handle(event.reason, {
    type: ERROR_TYPES.SYSTEM,
    level: ERROR_LEVELS.HIGH,
    context: {
      type: 'unhandledrejection'
    }
  });
});

// ==================== 导出 ====================

export { ErrorHandler, errorHandler };

// 将便捷函数添加到全局
window.MSHErrorHandler = {
  handle: handleError,
  firebase: handleFirebaseError,
  network: handleNetworkError,
  validation: handleValidationError,
  getStats: () => errorHandler.getErrorStats(),
  getLog: (limit) => errorHandler.getErrorLog(limit),
  clear: () => errorHandler.clearErrorLog()
};

console.log('✅ 统一错误处理模块已加载');
