/**
 * 数据备份管理器 (data-backup-manager.js)
 * 功能：提供完整的数据备份和恢复功能
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 数据备份管理器 ====================

class DataBackupManager {
  constructor() {
    this.backupPrefix = 'msh_backup_';
    this.maxBackups = 10; // 最大备份数量
  }

  // 创建完整数据备份
  async createFullBackup(description = '') {
    try {
      console.log('🔄 开始创建完整数据备份...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `${this.backupPrefix}${timestamp}`;
      
      // 收集所有数据
      const backupData = {
        id: backupId,
        timestamp: new Date().toISOString(),
        description: description,
        version: '1.0',
        data: {
          // 核心数据
          groups: JSON.parse(localStorage.getItem('msh_groups') || '{}'),
          groupNames: JSON.parse(localStorage.getItem('msh_groupNames') || '{}'),
          attendanceRecords: JSON.parse(localStorage.getItem('msh_attendanceRecords') || '[]'),
          excludedMembers: JSON.parse(localStorage.getItem('msh_excludedMembers') || '[]'),
          
          // 跟踪数据
          trackingRecords: JSON.parse(localStorage.getItem('msh_trackingRecords') || '[]'),
          
          // 配置数据
          config: JSON.parse(localStorage.getItem('msh_config') || '{}'),
          
          // 系统状态
          systemState: {
            lastSync: localStorage.getItem('msh_lastSync'),
            version: localStorage.getItem('msh_version'),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      };
      
      // 保存到本地存储
      localStorage.setItem(backupId, JSON.stringify(backupData));
      
      // 同步到Firebase
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        await db.ref(`backups/${backupId}`).set(backupData);
        console.log('✅ 备份已同步到Firebase');
      }
      
      // 更新备份列表
      this.updateBackupList(backupId);
      
      console.log(`✅ 完整数据备份创建成功: ${backupId}`);
      return backupId;
      
    } catch (error) {
      console.error('❌ 创建数据备份失败:', error);
      throw error;
    }
  }

  // 恢复数据备份
  async restoreBackup(backupId) {
    try {
      console.log(`🔄 开始恢复数据备份: ${backupId}`);
      
      // 从本地存储获取备份数据
      const backupData = JSON.parse(localStorage.getItem(backupId) || '{}');
      
      if (!backupData.id) {
        throw new Error('备份数据不存在或已损坏');
      }
      
      // 验证备份数据完整性
      if (!this.validateBackupData(backupData)) {
        throw new Error('备份数据验证失败');
      }
      
      // 创建恢复前的备份
      await this.createFullBackup('恢复前备份');
      
      // 恢复核心数据
      if (backupData.data.groups) {
        localStorage.setItem('msh_groups', JSON.stringify(backupData.data.groups));
      }
      if (backupData.data.groupNames) {
        localStorage.setItem('msh_groupNames', JSON.stringify(backupData.data.groupNames));
      }
      if (backupData.data.attendanceRecords) {
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(backupData.data.attendanceRecords));
      }
      if (backupData.data.excludedMembers) {
        localStorage.setItem('msh_excludedMembers', JSON.stringify(backupData.data.excludedMembers));
      }
      if (backupData.data.trackingRecords) {
        localStorage.setItem('msh_trackingRecords', JSON.stringify(backupData.data.trackingRecords));
      }
      if (backupData.data.config) {
        localStorage.setItem('msh_config', JSON.stringify(backupData.data.config));
      }
      
      // 同步到Firebase
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        
        if (backupData.data.groups) {
          await db.ref('groups').set(backupData.data.groups);
        }
        if (backupData.data.groupNames) {
          await db.ref('groupNames').set(backupData.data.groupNames);
        }
        if (backupData.data.attendanceRecords) {
          // 🚨 备份恢复功能：需要用户确认，因为会覆盖全部数据
          const confirmMessage = `⚠️ 即将恢复签到记录数据！\n\n` +
                               `这将覆盖Firebase中的所有签到记录！\n` +
                               `备份记录数量：${backupData.data.attendanceRecords.length}条\n\n` +
                               `确定要继续吗？`;
          
          if (confirm(confirmMessage)) {
            await db.ref('attendanceRecords').set(backupData.data.attendanceRecords);
            console.log('✅ 签到记录已从备份恢复');
          } else {
            console.log('❌ 用户取消了签到记录恢复操作');
          }
        }
        if (backupData.data.excludedMembers) {
          await db.ref('excludedMembers').set(backupData.data.excludedMembers);
        }
        if (backupData.data.trackingRecords) {
          await db.ref('trackingRecords').set(backupData.data.trackingRecords);
        }
        
        console.log('✅ 数据已同步到Firebase');
      }
      
      // 更新全局变量
      if (window.groups) window.groups = backupData.data.groups;
      if (window.groupNames) window.groupNames = backupData.data.groupNames;
      if (window.attendanceRecords) window.attendanceRecords = backupData.data.attendanceRecords;
      if (window.excludedMembers) window.excludedMembers = backupData.data.excludedMembers;
      if (window.trackingRecords) window.trackingRecords = backupData.data.trackingRecords;
      
      console.log(`✅ 数据备份恢复成功: ${backupId}`);
      return true;
      
    } catch (error) {
      console.error('❌ 恢复数据备份失败:', error);
      throw error;
    }
  }

  // 获取备份列表
  getBackupList() {
    try {
      const backupList = JSON.parse(localStorage.getItem('msh_backup_list') || '[]');
      return backupList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  // 更新备份列表
  updateBackupList(backupId) {
    try {
      const backupList = this.getBackupList();
      
      // 添加新备份
      backupList.unshift({
        id: backupId,
        timestamp: new Date().toISOString(),
        description: '自动备份'
      });
      
      // 限制备份数量
      if (backupList.length > this.maxBackups) {
        const toRemove = backupList.slice(this.maxBackups);
        toRemove.forEach(backup => {
          localStorage.removeItem(backup.id);
        });
        backupList.splice(this.maxBackups);
      }
      
      localStorage.setItem('msh_backup_list', JSON.stringify(backupList));
      
    } catch (error) {
      console.error('更新备份列表失败:', error);
    }
  }

  // 删除备份
  async deleteBackup(backupId) {
    try {
      console.log(`🗑️ 删除备份: ${backupId}`);
      
      // 从本地存储删除
      localStorage.removeItem(backupId);
      
      // 从Firebase删除
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const db = firebase.database();
        await db.ref(`backups/${backupId}`).remove();
      }
      
      // 从备份列表删除
      const backupList = this.getBackupList();
      const updatedList = backupList.filter(backup => backup.id !== backupId);
      localStorage.setItem('msh_backup_list', JSON.stringify(updatedList));
      
      console.log(`✅ 备份已删除: ${backupId}`);
      return true;
      
    } catch (error) {
      console.error('❌ 删除备份失败:', error);
      throw error;
    }
  }

  // 验证备份数据
  validateBackupData(backupData) {
    try {
      if (!backupData.id || !backupData.timestamp || !backupData.data) {
        return false;
      }
      
      // 检查必要的数据字段
      const requiredFields = ['groups', 'groupNames', 'attendanceRecords'];
      for (const field of requiredFields) {
        if (!backupData.data[field]) {
          console.warn(`备份数据缺少必要字段: ${field}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('验证备份数据失败:', error);
      return false;
    }
  }

  // 导出备份数据
  exportBackup(backupId) {
    try {
      const backupData = JSON.parse(localStorage.getItem(backupId) || '{}');
      
      if (!backupData.id) {
        throw new Error('备份数据不存在');
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `msh-backup-${backupId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log(`✅ 备份数据已导出: ${backupId}`);
      return true;
      
    } catch (error) {
      console.error('❌ 导出备份数据失败:', error);
      throw error;
    }
  }

  // 导入备份数据
  async importBackup(file) {
    try {
      console.log('📥 开始导入备份数据...');
      
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!this.validateBackupData(backupData)) {
        throw new Error('备份数据验证失败');
      }
      
      // 生成新的备份ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newBackupId = `${this.backupPrefix}${timestamp}`;
      backupData.id = newBackupId;
      backupData.timestamp = new Date().toISOString();
      backupData.description = '导入的备份';
      
      // 保存到本地存储
      localStorage.setItem(newBackupId, JSON.stringify(backupData));
      
      // 更新备份列表
      this.updateBackupList(newBackupId);
      
      console.log(`✅ 备份数据导入成功: ${newBackupId}`);
      return newBackupId;
      
    } catch (error) {
      console.error('❌ 导入备份数据失败:', error);
      throw error;
    }
  }

  // 自动备份（定时任务）
  async autoBackup() {
    try {
      console.log('🔄 执行自动备份...');
      
      const backupId = await this.createFullBackup('自动备份');
      
      // 清理过期备份
      this.cleanupOldBackups();
      
      console.log(`✅ 自动备份完成: ${backupId}`);
      return backupId;
      
    } catch (error) {
      console.error('❌ 自动备份失败:', error);
      throw error;
    }
  }

  // 清理过期备份
  cleanupOldBackups() {
    try {
      const backupList = this.getBackupList();
      
      if (backupList.length > this.maxBackups) {
        const toRemove = backupList.slice(this.maxBackups);
        toRemove.forEach(backup => {
          localStorage.removeItem(backup.id);
        });
        
        const updatedList = backupList.slice(0, this.maxBackups);
        localStorage.setItem('msh_backup_list', JSON.stringify(updatedList));
        
        console.log(`🧹 已清理 ${toRemove.length} 个过期备份`);
      }
      
    } catch (error) {
      console.error('清理过期备份失败:', error);
    }
  }

  // 获取备份统计信息
  getBackupStats() {
    try {
      const backupList = this.getBackupList();
      const totalSize = this.calculateTotalBackupSize();
      
      return {
        totalBackups: backupList.length,
        totalSize: totalSize,
        oldestBackup: backupList.length > 0 ? backupList[backupList.length - 1].timestamp : null,
        newestBackup: backupList.length > 0 ? backupList[0].timestamp : null
      };
      
    } catch (error) {
      console.error('获取备份统计失败:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }
  }

  // 计算备份总大小
  calculateTotalBackupSize() {
    try {
      const backupList = this.getBackupList();
      let totalSize = 0;
      
      backupList.forEach(backup => {
        const backupData = localStorage.getItem(backup.id);
        if (backupData) {
          totalSize += new Blob([backupData]).size;
        }
      });
      
      return totalSize;
    } catch (error) {
      console.error('计算备份大小失败:', error);
      return 0;
    }
  }
}

// 创建全局实例
window.dataBackupManager = new DataBackupManager();

// 自动备份定时器（每小时执行一次）
setInterval(() => {
  if (window.dataBackupManager) {
    window.dataBackupManager.autoBackup().catch(error => {
      console.error('自动备份失败:', error);
    });
  }
}, 60 * 60 * 1000); // 1小时

console.log('✅ 数据备份管理器已初始化');


