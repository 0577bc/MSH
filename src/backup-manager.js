/**
 * 自动备份管理器
 * 实现定期数据备份和恢复测试
 */

class BackupManager {
  constructor() {
    this.backupInterval = 24 * 60 * 60 * 1000; // 24小时
    this.maxBackups = 30; // 最多保留30个备份
    this.backupKey = 'msh_backups';
    this.init();
  }

  /**
   * 初始化备份管理器
   */
  init() {
    this.setupPeriodicBackup();
    this.setupPageUnloadBackup();
    this.setupDataChangeBackup();
  }

  /**
   * 设置定期备份
   */
  setupPeriodicBackup() {
    // 检查是否需要执行定期备份
    const lastBackup = localStorage.getItem('lastBackup');
    const now = Date.now();
    
    if (!lastBackup || (now - parseInt(lastBackup)) > this.backupInterval) {
      this.performBackup();
    }
    
    // 设置定时器
    setInterval(() => {
      this.performBackup();
    }, this.backupInterval);
  }

  /**
   * 设置页面卸载备份
   */
  setupPageUnloadBackup() {
    window.addEventListener('beforeunload', () => {
      this.performBackup();
    });
  }

  /**
   * 设置数据变化备份
   */
  setupDataChangeBackup() {
    // 监听Firebase数据变化
    if (window.dataManager) {
      const originalWriteData = window.dataManager.writeData.bind(window.dataManager);
      window.dataManager.writeData = async (path, data) => {
        const result = await originalWriteData(path, data);
        // 数据写入成功后触发备份
        setTimeout(() => this.performBackup(), 1000);
        return result;
      };
    }
  }

  /**
   * 执行备份
   */
  async performBackup() {
    try {
      console.log('开始执行数据备份...');
      
      const backupData = await this.collectBackupData();
      const backup = {
        id: this.generateBackupId(),
        timestamp: Date.now(),
        data: backupData,
        version: '1.0.0',
        checksum: this.calculateChecksum(backupData)
      };
      
      await this.saveBackup(backup);
      this.cleanupOldBackups();
      
      localStorage.setItem('lastBackup', backup.timestamp.toString());
      console.log('数据备份完成:', backup.id);
      
      return backup;
    } catch (error) {
      console.error('备份失败:', error);
      throw error;
    }
  }

  /**
   * 收集备份数据
   */
  async collectBackupData() {
    const backupData = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // 从Firebase收集数据
    if (window.dataManager) {
      try {
        backupData.groups = await window.dataManager.loadGroups();
        backupData.groupNames = await window.dataManager.loadGroupNames();
        backupData.attendanceRecords = await window.dataManager.loadAttendanceRecords();
        backupData.adminEmails = await window.dataManager.loadAdminEmails();
      } catch (error) {
        console.error('收集Firebase数据失败:', error);
        backupData.firebaseError = error.message;
      }
    }
    
    // 从localStorage收集数据
    backupData.localStorage = this.collectLocalStorageData();
    
    // 收集缓存数据
    if (window.cacheManager) {
      backupData.cacheStats = window.cacheManager.getStats();
    }
    
    // 收集性能数据
    if (window.performanceMonitor) {
      backupData.performance = window.performanceMonitor.getPerformanceSummary();
    }
    
    return backupData;
  }

  /**
   * 收集localStorage数据
   */
  collectLocalStorageData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('msh_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (error) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    return data;
  }

  /**
   * 生成备份ID
   */
  generateBackupId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `backup_${timestamp}_${random}`;
  }

  /**
   * 计算校验和
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 保存备份
   */
  async saveBackup(backup) {
    const backups = this.getBackups();
    backups.push(backup);
    
    // 限制备份数量
    if (backups.length > this.maxBackups) {
      backups.splice(0, backups.length - this.maxBackups);
    }
    
    localStorage.setItem(this.backupKey, JSON.stringify(backups));
    
    // 尝试上传到服务器（如果配置了）
    await this.uploadBackup(backup);
  }

  /**
   * 获取所有备份
   */
  getBackups() {
    try {
      const backups = localStorage.getItem(this.backupKey);
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 清理旧备份
   */
  cleanupOldBackups() {
    const backups = this.getBackups();
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    
    const validBackups = backups.filter(backup => {
      return (now - backup.timestamp) < maxAge;
    });
    
    if (validBackups.length !== backups.length) {
      localStorage.setItem(this.backupKey, JSON.stringify(validBackups));
      console.log(`清理了 ${backups.length - validBackups.length} 个过期备份`);
    }
  }

  /**
   * 上传备份到服务器
   */
  async uploadBackup(backup) {
    if (!window.backupEndpoint) {
      return; // 没有配置服务器端点
    }
    
    try {
      const response = await fetch(window.backupEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backup)
      });
      
      if (response.ok) {
        console.log('备份已上传到服务器:', backup.id);
      } else {
        console.error('上传备份失败:', response.statusText);
      }
    } catch (error) {
      console.error('上传备份失败:', error);
    }
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId) {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error('备份不存在');
      }
      
      // 验证备份完整性
      const currentChecksum = this.calculateChecksum(backup.data);
      if (currentChecksum !== backup.checksum) {
        throw new Error('备份数据已损坏');
      }
      
      console.log('开始恢复备份:', backupId);
      
      // 恢复Firebase数据
      if (window.dataManager && backup.data.groups) {
        await window.dataManager.writeData('groups', backup.data.groups);
        await window.dataManager.writeData('groupNames', backup.data.groupNames);
        await window.dataManager.writeData('attendanceRecords', backup.data.attendanceRecords);
        await window.dataManager.writeData('adminEmails', backup.data.adminEmails);
      }
      
      // 恢复localStorage数据
      if (backup.data.localStorage) {
        for (const [key, value] of Object.entries(backup.data.localStorage)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
      
      console.log('备份恢复完成:', backupId);
      return true;
    } catch (error) {
      console.error('恢复备份失败:', error);
      throw error;
    }
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId) {
    const backups = this.getBackups();
    const filteredBackups = backups.filter(b => b.id !== backupId);
    
    if (filteredBackups.length !== backups.length) {
      localStorage.setItem(this.backupKey, JSON.stringify(filteredBackups));
      console.log('备份已删除:', backupId);
      return true;
    }
    
    return false;
  }

  /**
   * 导出备份
   */
  exportBackup(backupId) {
    const backups = this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('备份不存在');
    }
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${backupId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 导入备份
   */
  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          
          // 验证备份格式
          if (!backup.id || !backup.timestamp || !backup.data) {
            throw new Error('无效的备份文件格式');
          }
          
          // 验证校验和
          const currentChecksum = this.calculateChecksum(backup.data);
          if (currentChecksum !== backup.checksum) {
            throw new Error('备份文件已损坏');
          }
          
          // 保存备份
          await this.saveBackup(backup);
          console.log('备份已导入:', backup.id);
          resolve(backup);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 获取备份统计信息
   */
  getBackupStats() {
    const backups = this.getBackups();
    const now = Date.now();
    
    const stats = {
      total: backups.length,
      totalSize: 0,
      oldest: null,
      newest: null,
      byDay: {}
    };
    
    backups.forEach(backup => {
      // 计算大小
      stats.totalSize += JSON.stringify(backup).length;
      
      // 最旧和最新
      if (!stats.oldest || backup.timestamp < stats.oldest.timestamp) {
        stats.oldest = backup;
      }
      if (!stats.newest || backup.timestamp > stats.newest.timestamp) {
        stats.newest = backup;
      }
      
      // 按天统计
      const day = new Date(backup.timestamp).toDateString();
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 测试备份完整性
   */
  testBackupIntegrity(backupId) {
    const backups = this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return { valid: false, error: '备份不存在' };
    }
    
    try {
      const currentChecksum = this.calculateChecksum(backup.data);
      const isValid = currentChecksum === backup.checksum;
      
      return {
        valid: isValid,
        error: isValid ? null : '校验和不匹配',
        checksum: backup.checksum,
        calculatedChecksum: currentChecksum
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * 清理所有备份
   */
  clearAllBackups() {
    localStorage.removeItem(this.backupKey);
    localStorage.removeItem('lastBackup');
    console.log('所有备份已清除');
  }
}

// 创建全局实例
const backupManager = new BackupManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.backupManager = backupManager;
}
