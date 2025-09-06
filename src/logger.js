// 日志管理模块
// 用于记录系统操作和数据变更

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // 最大日志条数
    this.init();
  }

  init() {
    // 从localStorage加载日志
    this.loadLogs();
  }

  // 记录日志
  log(type, message, details = null) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: type, // 'info', 'success', 'warning', 'error'
      message: message,
      details: details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logs.unshift(logEntry); // 添加到开头

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 保存到localStorage
    this.saveLogs();

    // 输出到控制台
    console.log(`[${type.toUpperCase()}] ${message}`, details || '');
  }

  // 信息日志
  info(message, details = null) {
    this.log('info', message, details);
  }

  // 成功日志
  success(message, details = null) {
    this.log('success', message, details);
  }

  // 警告日志
  warning(message, details = null) {
    this.log('warning', message, details);
  }

  // 错误日志
  error(message, details = null) {
    this.log('error', message, details);
  }

  // 保存日志到localStorage
  saveLogs() {
    try {
      localStorage.setItem('systemLogs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }

  // 从localStorage加载日志
  loadLogs() {
    try {
      const savedLogs = localStorage.getItem('systemLogs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
      this.logs = [];
    }
  }

  // 获取所有日志
  getAllLogs() {
    return this.logs;
  }

  // 获取指定类型的日志
  getLogsByType(type) {
    return this.logs.filter(log => log.type === type);
  }

  // 获取指定时间范围的日志
  getLogsByDateRange(startDate, endDate) {
    return this.logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  // 清空日志
  clearLogs() {
    this.logs = [];
    this.saveLogs();
    this.info('系统日志已清空');
  }

  // 导出日志
  exportLogs(format = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `system-logs-${timestamp}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(this.logs, null, 2);
      this.downloadFile(dataStr, `${filename}.json`, 'application/json');
    } else if (format === 'txt') {
      const textContent = this.logs.map(log => {
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        return `[${time}] [${log.type.toUpperCase()}] ${log.message}${log.details ? ' - ' + JSON.stringify(log.details) : ''}`;
      }).join('\n');
      this.downloadFile(textContent, `${filename}.txt`, 'text/plain');
    }
  }

  // 下载文件
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 搜索日志
  searchLogs(keyword) {
    if (!keyword) return this.logs;
    
    const lowerKeyword = keyword.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerKeyword) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(lowerKeyword))
    );
  }
}

// 创建全局日志实例
window.systemLogger = new Logger();

// 记录系统启动
window.systemLogger.info('系统启动', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href
});

// 导出Logger类供其他模块使用
window.Logger = Logger;
