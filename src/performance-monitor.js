/**
 * 性能监控器 (performance-monitor.js)
 * 功能：监控系统性能指标，提供性能分析和优化建议
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 性能监控器 ====================

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: [],
      dataLoad: [],
      firebaseSync: [],
      memoryUsage: [],
      userInteractions: []
    };
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  // 开始性能监控
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('性能监控已在运行');
      return;
    }

    console.log('🚀 开始性能监控...');
    this.isMonitoring = true;

    // 监控页面加载性能
    this.monitorPageLoad();
    
    // 监控数据加载性能
    this.monitorDataLoad();
    
    // 监控Firebase同步性能
    this.monitorFirebaseSync();
    
    // 监控内存使用
    this.monitorMemoryUsage();
    
    // 监控用户交互
    this.monitorUserInteractions();
    
    // 定期收集性能数据
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceData();
    }, 30000); // 每30秒收集一次

    console.log('✅ 性能监控已启动');
  }

  // 停止性能监控
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('性能监控未运行');
      return;
    }

    console.log('🛑 停止性能监控...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ 性能监控已停止');
  }

  // 监控页面加载性能
  monitorPageLoad() {
    window.addEventListener('load', async () => {
      const loadTime = performance.now();
      const navigation = performance.getEntriesByType('navigation')[0];
      
      // 异步获取现代性能指标
      const [largestContentfulPaint, cumulativeLayoutShift] = await Promise.all([
        this.getLargestContentfulPaint(),
        this.getCumulativeLayoutShift()
      ]);
      
      const metrics = {
        timestamp: new Date().toISOString(),
        loadTime: loadTime,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
        largestContentfulPaint: largestContentfulPaint,
        cumulativeLayoutShift: cumulativeLayoutShift
      };

      this.metrics.pageLoad.push(metrics);
      console.log('📊 页面加载性能:', metrics);
    });
  }

  // 监控数据加载性能
  monitorDataLoad() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function(...args) {
      const startTime = performance.now();
      
      return originalFetch.apply(this, args).then(response => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        const metrics = {
          timestamp: new Date().toISOString(),
          url: args[0],
          loadTime: loadTime,
          status: response.status,
          size: response.headers.get('content-length') || 0
        };

        self.metrics.dataLoad.push(metrics);
        console.log('📊 数据加载性能:', metrics);
        
        return response;
      });
    };
  }

  // 监控Firebase同步性能
  monitorFirebaseSync() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase未加载，跳过Firebase同步监控');
      return;
    }

    // 【修复】检查Firebase App是否已初始化
    if (!firebase.apps || firebase.apps.length === 0) {
      console.warn('Firebase App未初始化，跳过Firebase同步监控');
      return;
    }

    // 监控Firebase数据库操作
    const originalRef = firebase.database().ref;
    const self = this;

    firebase.database().ref = function(path) {
      const startTime = performance.now();
      const ref = originalRef.call(this, path);
      
      // 监控读取操作
      const originalOnce = ref.once;
      ref.once = function(eventType, callback) {
        const startTime = performance.now();
        
        return originalOnce.call(this, eventType, (snapshot) => {
          const endTime = performance.now();
          const loadTime = endTime - startTime;
          
          const metrics = {
            timestamp: new Date().toISOString(),
            operation: 'read',
            path: path,
            loadTime: loadTime,
            dataSize: JSON.stringify(snapshot.val()).length
          };

          self.metrics.firebaseSync.push(metrics);
          console.log('📊 Firebase读取性能:', metrics);
          
          if (callback) callback(snapshot);
        });
      };
      
      // 监控写入操作
      const originalSet = ref.set;
      ref.set = function(value, callback) {
        const startTime = performance.now();
        
        return originalSet.call(this, value, (error) => {
          const endTime = performance.now();
          const loadTime = endTime - startTime;
          
          const metrics = {
            timestamp: new Date().toISOString(),
            operation: 'write',
            path: path,
            loadTime: loadTime,
            dataSize: JSON.stringify(value).length,
            success: !error
          };

          self.metrics.firebaseSync.push(metrics);
          console.log('📊 Firebase写入性能:', metrics);
          
          if (callback) callback(error);
        });
      };
      
      return ref;
    };
  }

  // 监控内存使用
  monitorMemoryUsage() {
    if (!performance.memory) {
      console.warn('浏览器不支持内存监控');
      return;
    }

    const collectMemoryData = () => {
      const memory = performance.memory;
      const metrics = {
        timestamp: new Date().toISOString(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      this.metrics.memoryUsage.push(metrics);
      console.log('📊 内存使用情况:', metrics);
    };

    // 立即收集一次
    collectMemoryData();
    
    // 每30秒收集一次
    setInterval(collectMemoryData, 30000);
  }

  // 监控用户交互
  monitorUserInteractions() {
    const interactionTypes = ['click', 'keydown', 'scroll', 'resize'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const metrics = {
          timestamp: new Date().toISOString(),
          type: type,
          target: event.target.tagName,
          x: event.clientX || 0,
          y: event.clientY || 0
        };

        this.metrics.userInteractions.push(metrics);
        
        // 限制交互记录数量
        if (this.metrics.userInteractions.length > 1000) {
          this.metrics.userInteractions = this.metrics.userInteractions.slice(-500);
        }
      });
    });
  }

  // 收集性能数据
  collectPerformanceData() {
    const data = {
      timestamp: new Date().toISOString(),
      pageLoad: this.metrics.pageLoad.slice(-10), // 最近10次
      dataLoad: this.metrics.dataLoad.slice(-20), // 最近20次
      firebaseSync: this.metrics.firebaseSync.slice(-20), // 最近20次
      memoryUsage: this.metrics.memoryUsage.slice(-10), // 最近10次
      userInteractions: this.metrics.userInteractions.slice(-50) // 最近50次
    };

    // 保存到本地存储
    localStorage.setItem('msh_performance_data', JSON.stringify(data));
    
    console.log('📊 性能数据已收集');
  }

  // 获取性能报告
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary(),
      recommendations: this.getPerformanceRecommendations(),
      metrics: {
        pageLoad: this.getPageLoadMetrics(),
        dataLoad: this.getDataLoadMetrics(),
        firebaseSync: this.getFirebaseSyncMetrics(),
        memoryUsage: this.getMemoryUsageMetrics(),
        userInteractions: this.getUserInteractionMetrics()
      }
    };

    return report;
  }

  // 获取性能摘要
  getPerformanceSummary() {
    const summary = {
      totalPageLoads: this.metrics.pageLoad.length,
      totalDataLoads: this.metrics.dataLoad.length,
      totalFirebaseSyncs: this.metrics.firebaseSync.length,
      totalUserInteractions: this.metrics.userInteractions.length,
      averagePageLoadTime: this.getAveragePageLoadTime(),
      averageDataLoadTime: this.getAverageDataLoadTime(),
      averageFirebaseSyncTime: this.getAverageFirebaseSyncTime(),
      currentMemoryUsage: this.getCurrentMemoryUsage()
    };

    return summary;
  }

  // 获取页面加载指标
  getPageLoadMetrics() {
    if (this.metrics.pageLoad.length === 0) {
      return { message: '暂无页面加载数据' };
    }

    const latest = this.metrics.pageLoad[this.metrics.pageLoad.length - 1];
    const average = this.getAveragePageLoadTime();
    
    return {
      latest: latest,
      average: average,
      trend: this.getPageLoadTrend(),
      recommendations: this.getPageLoadRecommendations(latest)
    };
  }

  // 获取数据加载指标
  getDataLoadMetrics() {
    if (this.metrics.dataLoad.length === 0) {
      return { message: '暂无数据加载数据' };
    }

    const average = this.getAverageDataLoadTime();
    const slowest = this.getSlowestDataLoad();
    
    return {
      average: average,
      slowest: slowest,
      trend: this.getDataLoadTrend(),
      recommendations: this.getDataLoadRecommendations()
    };
  }

  // 获取Firebase同步指标
  getFirebaseSyncMetrics() {
    if (this.metrics.firebaseSync.length === 0) {
      return { message: '暂无Firebase同步数据' };
    }

    const average = this.getAverageFirebaseSyncTime();
    const successRate = this.getFirebaseSyncSuccessRate();
    
    return {
      average: average,
      successRate: successRate,
      trend: this.getFirebaseSyncTrend(),
      recommendations: this.getFirebaseSyncRecommendations()
    };
  }

  // 获取内存使用指标
  getMemoryUsageMetrics() {
    if (this.metrics.memoryUsage.length === 0) {
      return { message: '暂无内存使用数据' };
    }

    const current = this.getCurrentMemoryUsage();
    const peak = this.getPeakMemoryUsage();
    
    return {
      current: current,
      peak: peak,
      trend: this.getMemoryUsageTrend(),
      recommendations: this.getMemoryUsageRecommendations(current)
    };
  }

  // 获取用户交互指标
  getUserInteractionMetrics() {
    if (this.metrics.userInteractions.length === 0) {
      return { message: '暂无用户交互数据' };
    }

    const interactions = this.metrics.userInteractions;
    const types = {};
    
    interactions.forEach(interaction => {
      types[interaction.type] = (types[interaction.type] || 0) + 1;
    });
    
    return {
      total: interactions.length,
      types: types,
      recent: interactions.slice(-10),
      recommendations: this.getUserInteractionRecommendations()
    };
  }

  // 获取性能建议
  getPerformanceRecommendations() {
    const recommendations = [];
    
    // 页面加载建议
    const pageLoadTime = this.getAveragePageLoadTime();
    if (pageLoadTime > 3000) {
      recommendations.push({
        type: 'pageLoad',
        priority: 'high',
        message: '页面加载时间过长，建议优化资源加载',
        suggestion: '考虑使用CDN、压缩资源、延迟加载等优化策略'
      });
    }
    
    // 数据加载建议
    const dataLoadTime = this.getAverageDataLoadTime();
    if (dataLoadTime > 1000) {
      recommendations.push({
        type: 'dataLoad',
        priority: 'medium',
        message: '数据加载时间较长，建议优化数据获取策略',
        suggestion: '考虑使用缓存、分页加载、数据预取等优化策略'
      });
    }
    
    // 内存使用建议
    const memoryUsage = this.getCurrentMemoryUsage();
    if (memoryUsage > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: '内存使用率过高，建议优化内存管理',
        suggestion: '检查内存泄漏、清理无用数据、优化数据结构'
      });
    }
    
    return recommendations;
  }

  // 辅助方法
  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  getFirstContentfulPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  getLargestContentfulPaint() {
    // 使用现代PerformanceObserver API替代deprecated的getEntriesByType
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            observer.disconnect(); // 断开观察器
            resolve(lastEntry ? lastEntry.startTime : 0);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // 设置超时，避免长时间等待
          setTimeout(() => {
            observer.disconnect();
            resolve(0);
          }, 5000);
        } catch (error) {
          console.warn('LCP监控初始化失败:', error);
          resolve(0);
        }
      } else {
        resolve(0); // 降级处理：不支持PerformanceObserver
      }
    });
  }

  getCumulativeLayoutShift() {
    // 使用现代PerformanceObserver API替代deprecated的getEntriesByType
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        try {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // 只计算非用户输入的布局偏移
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          // 设置超时，收集一段时间后返回结果
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 5000);
        } catch (error) {
          console.warn('CLS监控初始化失败:', error);
          resolve(0);
        }
      } else {
        resolve(0); // 降级处理：不支持PerformanceObserver
      }
    });
  }

  getAveragePageLoadTime() {
    if (this.metrics.pageLoad.length === 0) return 0;
    const total = this.metrics.pageLoad.reduce((sum, metric) => sum + metric.loadTime, 0);
    return total / this.metrics.pageLoad.length;
  }

  getAverageDataLoadTime() {
    if (this.metrics.dataLoad.length === 0) return 0;
    const total = this.metrics.dataLoad.reduce((sum, metric) => sum + metric.loadTime, 0);
    return total / this.metrics.dataLoad.length;
  }

  getAverageFirebaseSyncTime() {
    if (this.metrics.firebaseSync.length === 0) return 0;
    const total = this.metrics.firebaseSync.reduce((sum, metric) => sum + metric.loadTime, 0);
    return total / this.metrics.firebaseSync.length;
  }

  getCurrentMemoryUsage() {
    if (!performance.memory) return 0;
    return (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
  }

  getPeakMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return 0;
    return Math.max(...this.metrics.memoryUsage.map(metric => metric.memoryUsage));
  }

  getSlowestDataLoad() {
    if (this.metrics.dataLoad.length === 0) return null;
    return this.metrics.dataLoad.reduce((slowest, current) => 
      current.loadTime > slowest.loadTime ? current : slowest
    );
  }

  getFirebaseSyncSuccessRate() {
    if (this.metrics.firebaseSync.length === 0) return 0;
    const successful = this.metrics.firebaseSync.filter(metric => metric.success !== false).length;
    return (successful / this.metrics.firebaseSync.length) * 100;
  }

  getPageLoadTrend() {
    if (this.metrics.pageLoad.length < 2) return 'stable';
    const recent = this.metrics.pageLoad.slice(-5);
    const older = this.metrics.pageLoad.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, metric) => sum + metric.loadTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, metric) => sum + metric.loadTime, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    if (recentAvg < olderAvg * 0.9) return 'improving';
    return 'stable';
  }

  getDataLoadTrend() {
    if (this.metrics.dataLoad.length < 2) return 'stable';
    const recent = this.metrics.dataLoad.slice(-5);
    const older = this.metrics.dataLoad.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, metric) => sum + metric.loadTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, metric) => sum + metric.loadTime, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    if (recentAvg < olderAvg * 0.9) return 'improving';
    return 'stable';
  }

  getFirebaseSyncTrend() {
    if (this.metrics.firebaseSync.length < 2) return 'stable';
    const recent = this.metrics.firebaseSync.slice(-5);
    const older = this.metrics.firebaseSync.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, metric) => sum + metric.loadTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, metric) => sum + metric.loadTime, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    if (recentAvg < olderAvg * 0.9) return 'improving';
    return 'stable';
  }

  getMemoryUsageTrend() {
    if (this.metrics.memoryUsage.length < 2) return 'stable';
    const recent = this.metrics.memoryUsage.slice(-5);
    const older = this.metrics.memoryUsage.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, metric) => sum + metric.memoryUsage, 0) / recent.length;
    const olderAvg = older.reduce((sum, metric) => sum + metric.memoryUsage, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  getPageLoadRecommendations(latest) {
    const recommendations = [];
    
    if (latest.loadTime > 3000) {
      recommendations.push('页面加载时间过长，建议优化资源加载');
    }
    
    if (latest.firstPaint > 1000) {
      recommendations.push('首次绘制时间过长，建议优化关键资源');
    }
    
    if (latest.largestContentfulPaint > 2500) {
      recommendations.push('最大内容绘制时间过长，建议优化主要内容');
    }
    
    return recommendations;
  }

  getDataLoadRecommendations() {
    const recommendations = [];
    
    if (this.getAverageDataLoadTime() > 1000) {
      recommendations.push('数据加载时间过长，建议优化数据获取策略');
    }
    
    return recommendations;
  }

  getFirebaseSyncRecommendations() {
    const recommendations = [];
    
    if (this.getAverageFirebaseSyncTime() > 500) {
      recommendations.push('Firebase同步时间过长，建议优化数据结构');
    }
    
    if (this.getFirebaseSyncSuccessRate() < 95) {
      recommendations.push('Firebase同步成功率较低，建议检查网络连接');
    }
    
    return recommendations;
  }

  getMemoryUsageRecommendations(current) {
    const recommendations = [];
    
    if (current > 80) {
      recommendations.push('内存使用率过高，建议优化内存管理');
    }
    
    return recommendations;
  }

  getUserInteractionRecommendations() {
    const recommendations = [];
    
    if (this.metrics.userInteractions.length > 500) {
      recommendations.push('用户交互频繁，建议优化交互响应');
    }
    
    return recommendations;
  }
}

// 创建全局实例
window.performanceMonitor = new PerformanceMonitor();

// 自动启动性能监控
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.performanceMonitor.startMonitoring();
  });
} else {
  window.performanceMonitor.startMonitoring();
}

console.log('✅ 性能监控器已初始化');