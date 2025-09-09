/**
 * 独立备份管理器
 * 与操作数据完全隔离的备份系统
 * 24小时备份一次，保留10天
 */

class IndependentBackupManager {
  constructor() {
    this.backupInterval = 24 * 60 * 60 * 1000; // 24小时
    this.maxBackups = 10; // 最多保留10个备份
    this.maxAge = 10 * 24 * 60 * 60 * 1000; // 10天
    this.backupKey = 'msh_independent_backups';
    this.lastBackupKey = 'msh_last_backup_time';
    this.isBackupInProgress = false;
    this.init();
  }

  /**
   * 初始化备份管理器
   */
  init() {
    console.log('独立备份管理器初始化');
    this.setupPeriodicBackup();
    this.setupPageUnloadBackup();
  }

  /**
   * 设置定期备份
   */
  setupPeriodicBackup() {
    // 检查是否需要执行定期备份
    const lastBackup = localStorage.getItem(this.lastBackupKey);
    const now = Date.now();
    
    if (!lastBackup || (now - parseInt(lastBackup)) > this.backupInterval) {
      console.log('执行初始备份检查');
      this.performScheduledBackup();
    }
    
    // 设置定时器，每24小时检查一次
    setInterval(() => {
      this.performScheduledBackup();
    }, this.backupInterval);
  }

  /**
   * 设置页面卸载备份
   */
  setupPageUnloadBackup() {
    window.addEventListener('beforeunload', () => {
      if (!this.isBackupInProgress) {
        this.performScheduledBackup();
      }
    });
  }

  /**
   * 执行计划备份（只在需要时执行）
   */
  async performScheduledBackup() {
    if (this.isBackupInProgress) {
      console.log('备份正在进行中，跳过');
      return;
    }

    const lastBackup = localStorage.getItem(this.lastBackupKey);
    const now = Date.now();
    
    // 检查是否需要备份
    if (lastBackup && (now - parseInt(lastBackup)) < this.backupInterval) {
      console.log('距离上次备份时间不足24小时，跳过');
      return;
    }

    try {
      this.isBackupInProgress = true;
      console.log('开始执行计划备份...');
      
      const backup = await this.createBackup();
      await this.saveBackup(backup);
      this.cleanupOldBackups();
      
      localStorage.setItem(this.lastBackupKey, now.toString());
      console.log('计划备份完成:', backup.id);
      
    } catch (error) {
      console.error('计划备份失败:', error);
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * 创建备份
   */
  async createBackup() {
    const backupData = await this.collectBackupData();
    const backup = {
      id: this.generateBackupId(),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      data: backupData,
      version: '2.0.0',
      checksum: this.calculateChecksum(backupData),
      type: 'scheduled'
    };
    
    return backup;
  }

  /**
   * 收集备份数据
   */
  async collectBackupData() {
    const backupData = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      source: 'independent_backup'
    };
    
    // 从Firebase收集数据
    if (window.dataManager) {
      try {
        backupData.groups = await window.dataManager.loadGroups();
        backupData.groupNames = await window.dataManager.loadGroupNames();
        backupData.attendanceRecords = await window.dataManager.loadAttendanceRecords();
        backupData.adminEmails = await window.dataManager.loadAdminEmails();
        console.log('Firebase数据收集完成');
      } catch (error) {
        console.error('收集Firebase数据失败:', error);
        backupData.firebaseError = error.message;
      }
    }
    
    // 从SessionStorage收集数据
    if (window.sessionStorageManager) {
      backupData.sessionStorage = window.sessionStorageManager.getAllData();
      console.log('SessionStorage数据收集完成');
    }
    
    // 收集系统状态
    backupData.systemStatus = {
      isOnline: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    };
    
    return backupData;
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
    console.log(`备份已保存: ${backup.id}`);
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
    
    const validBackups = backups.filter(backup => {
      return (now - backup.timestamp) < this.maxAge;
    });
    
    if (validBackups.length !== backups.length) {
      localStorage.setItem(this.backupKey, JSON.stringify(validBackups));
      console.log(`清理了 ${backups.length - validBackups.length} 个过期备份`);
    }
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
      
      // 恢复SessionStorage数据
      if (window.sessionStorageManager && backup.data.sessionStorage) {
        for (const [key, value] of Object.entries(backup.data.sessionStorage)) {
          window.sessionStorageManager.setItem(key, value);
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
    a.download = `independent_backup_${backupId}.json`;
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
      byDay: {},
      nextBackup: null
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
    
    // 计算下次备份时间
    const lastBackup = localStorage.getItem(this.lastBackupKey);
    if (lastBackup) {
      stats.nextBackup = parseInt(lastBackup) + this.backupInterval;
    }
    
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
    localStorage.removeItem(this.lastBackupKey);
    console.log('所有独立备份已清除');
  }

  /**
   * 手动触发备份
   */
  async manualBackup() {
    if (this.isBackupInProgress) {
      throw new Error('备份正在进行中，请稍后再试');
    }

    try {
      this.isBackupInProgress = true;
      console.log('开始手动备份...');
      
      const backup = await this.createBackup();
      backup.type = 'manual';
      await this.saveBackup(backup);
      
      console.log('手动备份完成:', backup.id);
      return backup;
    } catch (error) {
      console.error('手动备份失败:', error);
      throw error;
    } finally {
      this.isBackupInProgress = false;
    }
  }
}

// 创建全局实例
const independentBackupManager = new IndependentBackupManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.independentBackupManager = independentBackupManager;
}
