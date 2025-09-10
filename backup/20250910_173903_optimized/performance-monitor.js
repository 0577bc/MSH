/**
 * 性能监控系统 (performance-monitor.js)
 * 功能：收集性能指标、错误追踪和用户体验数据，提供系统性能分析
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - 实时性能指标收集
 * - 错误追踪和报告
 * - 用户行为分析
 * - 资源加载监控
 * - 内存使用监控
 * - 网络性能分析
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.errors = [];
    this.userActions = [];
    this.resourceTimings = [];
    this.navigationTimings = [];
    this.init();
  }

  /**
   * 初始化性能监控
   */
  init() {
    this.setupPerformanceObserver();
    this.setupErrorTracking();
    this.setupUserActionTracking();
    this.setupResourceTiming();
    this.setupNavigationTiming();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.startPeriodicReporting();
  }

  /**
   * 设置性能观察器
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // 观察导航时间
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordNavigationTiming(entry);
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // 观察资源时间
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordResourceTiming(entry);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // 观察绘制时间
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPaintTiming(entry);
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // 观察长任务
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  }

  /**
   * 设置错误追踪
   */
  setupErrorTracking() {
    // JavaScript错误
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        timestamp: Date.now()
      });
    });

    // Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason ? event.reason.toString() : 'Unhandled Promise Rejection',
        stack: event.reason ? event.reason.stack : null,
        timestamp: Date.now()
      });
    });

    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.recordError({
          type: 'resource',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          timestamp: Date.now()
        });
      }
    }, true);
  }

  /**
   * 设置用户行为追踪
   */
  setupUserActionTracking() {
    // 点击事件
    document.addEventListener('click', (event) => {
      this.recordUserAction({
        type: 'click',
        target: event.target.tagName,
        id: event.target.id,
        className: event.target.className,
        timestamp: Date.now()
      });
    });

    // 表单提交
    document.addEventListener('submit', (event) => {
      this.recordUserAction({
        type: 'submit',
        formId: event.target.id,
        timestamp: Date.now()
      });
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.recordUserAction({
        type: 'visibilitychange',
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.recordUserAction({
        type: 'beforeunload',
        timestamp: Date.now()
      });
    });
  }

  /**
   * 设置资源时间追踪
   */
  setupResourceTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource');
      resources.forEach(resource => {
        this.recordResourceTiming(resource);
      });
    }
  }

  /**
   * 设置导航时间追踪
   */
  setupNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.recordNavigationTiming(navigation);
      }
    }
  }

  /**
   * 设置内存监控
   */
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric('memory', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }, 30000); // 每30秒记录一次
    }
  }

  /**
   * 设置网络监控
   */
  setupNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.recordMetric('network', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now()
      });

      // 监听网络变化
      connection.addEventListener('change', () => {
        this.recordMetric('network', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        });
      });
    }
  }

  /**
   * 记录导航时间
   */
  recordNavigationTiming(entry) {
    const timing = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.navigationStart,
      timestamp: Date.now()
    };
    
    this.recordMetric('navigation', timing);
  }

  /**
   * 记录资源时间
   */
  recordResourceTiming(entry) {
    const timing = {
      name: entry.name,
      type: entry.initiatorType,
      duration: entry.duration,
      size: entry.transferSize,
      timestamp: Date.now()
    };
    
    this.recordMetric('resource', timing);
  }

  /**
   * 记录绘制时间
   */
  recordPaintTiming(entry) {
    this.recordMetric('paint', {
      name: entry.name,
      startTime: entry.startTime,
      timestamp: Date.now()
    });
  }

  /**
   * 记录长任务
   */
  recordLongTask(entry) {
    this.recordMetric('longtask', {
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now()
    });
  }

  /**
   * 记录错误
   */
  recordError(error) {
    this.errors.push(error);
    
    // 限制错误数量
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-50);
    }
    
    // 发送错误到服务器（如果配置了）
    this.sendErrorToServer(error);
  }

  /**
   * 记录用户行为
   */
  recordUserAction(action) {
    this.userActions.push(action);
    
    // 限制行为数量
    if (this.userActions.length > 200) {
      this.userActions = this.userActions.slice(-100);
    }
  }

  /**
   * 记录指标
   */
  recordMetric(type, data) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    const metrics = this.metrics.get(type);
    metrics.push(data);
    
    // 限制指标数量
    if (metrics.length > 50) {
      metrics.splice(0, metrics.length - 25);
    }
  }

  /**
   * 发送错误到服务器
   */
  sendErrorToServer(error) {
    // 这里可以集成错误报告服务，如Sentry
    console.error('Performance Monitor - Error:', error);
  }

  /**
   * 开始定期报告
   */
  startPeriodicReporting() {
    // 每5分钟发送一次性能报告
    setInterval(() => {
      this.sendPerformanceReport();
    }, 5 * 60 * 1000);
    
    // 页面卸载时发送报告
    window.addEventListener('beforeunload', () => {
      this.sendPerformanceReport();
    });
  }

  /**
   * 发送性能报告
   */
  sendPerformanceReport() {
    const report = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: Object.fromEntries(this.metrics),
      errors: this.errors,
      userActions: this.userActions,
      performance: this.getPerformanceSummary()
    };
    
    // 发送到服务器
    this.sendToServer(report);
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary() {
    const summary = {
      pageLoadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0
    };
    
    // 页面加载时间
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        summary.pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
        summary.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
      }
      
      // 绘制时间
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          summary.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          summary.firstContentfulPaint = entry.startTime;
        }
      });
    }
    
    return summary;
  }

  /**
   * 发送数据到服务器
   */
  sendToServer(data) {
    // 这里可以集成分析服务，如Google Analytics、Mixpanel等
    console.log('Performance Report:', data);
    
    // 示例：发送到自定义端点
    if (window.performanceEndpoint) {
      fetch(window.performanceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }).catch(error => {
        console.error('Failed to send performance report:', error);
      });
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * 获取错误列表
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 获取用户行为
   */
  getUserActions() {
    return this.userActions;
  }

  /**
   * 清除所有数据
   */
  clear() {
    this.metrics.clear();
    this.errors = [];
    this.userActions = [];
  }

  /**
   * 导出性能数据
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      errors: this.getErrors(),
      userActions: this.getUserActions(),
      performance: this.getPerformanceSummary(),
      timestamp: Date.now()
    };
  }

  /**
   * 创建性能报告
   */
  createReport() {
    const data = this.exportData();
    const report = {
      summary: {
        totalErrors: data.errors.length,
        totalUserActions: data.userActions.length,
        pageLoadTime: data.performance.pageLoadTime,
        firstContentfulPaint: data.performance.firstContentfulPaint
      },
      details: data
    };
    
    return report;
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}
