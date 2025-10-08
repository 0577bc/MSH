/**
 * MSH系统数据同步助手
 * 用于修复工具触发MSH系统的数据同步
 */

class MSHDataSyncHelper {
  constructor() {
    this.isMSHContext = typeof window !== 'undefined' && window.firebaseConfig;
  }

  /**
   * 同步修复后的数据到MSH系统
   * @param {Array} updatedRecords - 修复后的签到记录数组
   * @returns {Promise<boolean>} - 同步是否成功
   */
  async syncToMSHSystem(updatedRecords) {
    if (!this.isMSHContext) {
      console.warn('⚠️ 不在MSH系统上下文中，无法进行数据同步');
      return false;
    }

    try {
      console.log('🔄 开始同步数据到MSH系统...');

      // 1. 更新全局变量
      if (window.attendanceRecords) {
        window.attendanceRecords = updatedRecords;
        console.log('✅ 已更新全局attendanceRecords变量');
      }

      // 2. 更新本地存储
      localStorage.setItem('msh_attendanceRecords', JSON.stringify(updatedRecords));
      console.log('✅ 已更新本地存储');

      // 3. 触发数据变更标记
      if (window.newDataManager) {
        window.newDataManager.markDataChanged('attendanceRecords');
        console.log('✅ 已标记数据变更');
      }

      // 4. 触发实时更新事件
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('attendanceRecordsUpdated', {
          detail: { 
            records: updatedRecords,
            source: 'fix-tool',
            timestamp: Date.now()
          }
        }));
        console.log('✅ 已触发实时更新事件');
      }

      // 5. 更新UUID索引（如果存在）
      if (window.utils && window.utils.UUIDIndex) {
        window.utils.UUIDIndex.updateRecordIndex(updatedRecords);
        console.log('✅ 已更新UUID索引');
      }

      // 6. 触发主日跟踪数据重新加载（如果存在）
      if (window.loadSundayTracking && typeof window.loadSundayTracking === 'function') {
        window.loadSundayTracking();
        console.log('✅ 已触发主日跟踪数据重新加载');
      }

      console.log('🎉 MSH系统数据同步完成！');
      return true;

    } catch (error) {
      console.error('❌ MSH系统数据同步失败:', error);
      return false;
    }
  }

  /**
   * 检查MSH系统是否可用
   * @returns {boolean}
   */
  isMSHAvailable() {
    return this.isMSHContext && 
           typeof window.attendanceRecords !== 'undefined' &&
           typeof localStorage !== 'undefined';
  }

  /**
   * 获取当前MSH系统的签到记录
   * @returns {Array}
   */
  getCurrentMSHRecords() {
    if (!this.isMSHAvailable()) {
      return [];
    }
    return window.attendanceRecords || [];
  }

  /**
   * 强制刷新MSH系统数据
   * @returns {Promise<boolean>}
   */
  async forceRefreshMSHData() {
    if (!this.isMSHAvailable()) {
      return false;
    }

    try {
      // 触发页面刷新事件
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('forceDataRefresh', {
          detail: { 
            source: 'fix-tool',
            timestamp: Date.now()
          }
        }));
      }

      // 如果存在数据管理器，触发重新加载
      if (window.newDataManager && typeof window.newDataManager.reloadData === 'function') {
        await window.newDataManager.reloadData();
      }

      return true;
    } catch (error) {
      console.error('❌ 强制刷新MSH数据失败:', error);
      return false;
    }
  }
}

// 创建全局实例
window.MSHDataSyncHelper = new MSHDataSyncHelper();


