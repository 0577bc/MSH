// 统一错误处理系统
// 提供全局错误处理、用户友好的错误提示和错误追踪

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogEntries = 100;
    this.setupGlobalErrorHandlers();
  }

  // 设置全局错误处理器
  setupGlobalErrorHandlers() {
    // 捕获未处理的JavaScript错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'JavaScript Error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || 'Unknown promise rejection',
        error: event.reason
      });
    });

    // 捕获Firebase错误
    if (typeof window !== 'undefined' && window.firebase) {
      // Firebase错误处理将在Firebase初始化后设置
    }
  }

  // 处理错误
  handleError(errorInfo) {
    // 记录错误日志
    this.logError(errorInfo);

    // 显示用户友好的错误提示
    this.showUserFriendlyError(errorInfo);

    // 发送错误报告（如果配置了）
    this.reportError(errorInfo);
  }

  // 记录错误日志
  logError(errorInfo) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type: errorInfo.type || 'Unknown Error',
      message: errorInfo.message || 'Unknown error message',
      stack: errorInfo.error?.stack || '',
      url: window.location.href,
      userAgent: navigator.userAgent,
      details: errorInfo
    };

    this.errorLog.unshift(errorEntry);

    // 限制日志条目数量
    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(0, this.maxLogEntries);
    }

    // 保存到localStorage
    try {
      localStorage.setItem('msh_errorLog', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('无法保存错误日志到localStorage:', e);
    }

    // 输出到控制台
    console.error('错误已记录:', errorEntry);
  }

  // 显示用户友好的错误提示
  showUserFriendlyError(errorInfo) {
    let userMessage = '';

    // 根据错误类型提供用户友好的消息
    switch (errorInfo.type) {
      case 'Firebase Connection Error':
        userMessage = '网络连接失败，请检查网络连接后重试。';
        break;
      case 'Firebase Permission Error':
        userMessage = '权限不足，请重新登录。';
        break;
      case 'Data Validation Error':
        userMessage = '数据格式错误，请检查输入内容。';
        break;
      case 'Network Error':
        userMessage = '网络错误，请检查网络连接。';
        break;
      case 'JavaScript Error':
        userMessage = '系统出现错误，请刷新页面重试。';
        break;
      case 'Unhandled Promise Rejection':
        userMessage = '操作失败，请重试。';
        break;
      default:
        userMessage = '系统出现未知错误，请刷新页面重试。';
    }

    // 显示错误提示
    this.showErrorNotification(userMessage, errorInfo);
  }

  // 显示错误通知
  showErrorNotification(message, errorInfo) {
    // 创建错误通知元素
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // 添加样式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      border-radius: 5px;
      padding: 15px;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    `;

    // 添加动画样式
    if (!document.getElementById('error-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'error-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .error-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .error-icon {
          font-size: 20px;
        }
        .error-message {
          flex: 1;
          font-weight: 500;
        }
        .error-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #721c24;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .error-close:hover {
          background: rgba(114, 28, 36, 0.1);
          border-radius: 50%;
        }
      `;
      document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(notification);

    // 自动移除（5秒后）
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // 发送错误报告
  reportError(errorInfo) {
    // 这里可以集成第三方错误追踪服务
    // 例如：Sentry, Bugsnag, LogRocket等
    
    // 示例：发送到自定义错误收集端点
    if (window.errorReportingEndpoint) {
      fetch(window.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          error: errorInfo,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(e => {
        console.warn('发送错误报告失败:', e);
      });
    }
  }

  // 获取错误日志
  getErrorLog() {
    return this.errorLog;
  }

  // 清除错误日志
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('msh_errorLog');
  }

  // 导出错误日志
  exportErrorLog() {
    const logData = {
      exportTime: new Date().toISOString(),
      totalErrors: this.errorLog.length,
      errors: this.errorLog
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 包装异步函数以捕获错误
  async wrapAsync(fn, context = '') {
    try {
      return await fn();
    } catch (error) {
      this.handleError({
        type: 'Async Function Error',
        message: error.message,
        error: error,
        context: context
      });
      throw error;
    }
  }

  // 包装同步函数以捕获错误
  wrapSync(fn, context = '') {
    try {
      return fn();
    } catch (error) {
      this.handleError({
        type: 'Sync Function Error',
        message: error.message,
        error: error,
        context: context
      });
      throw error;
    }
  }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.errorHandler = errorHandler;
}

// 导出类（已通过window对象导出）
