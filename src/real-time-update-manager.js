/**
 * 实时更新管理器 (real-time-update-manager.js)
 * 功能：签到时立即更新事件状态
 * 作者：MSH系统
 * 版本：2.0
 */

const realTimeUpdateManager = {
  // 签到时更新事件状态（优化版：不进行复杂计算）
  onSigninComplete: async function(memberUUID, signinData) {
    console.log(`🔄 签到时更新事件状态 - UUID: ${memberUUID}`);
    
    try {
      // 1. 只清除相关缓存，不进行复杂计算
      this.updateEventListCache(memberUUID);
      
      // 2. 触发页面更新（如果相关页面打开）
      this.notifyPageUpdate(memberUUID);
      
      // 3. 标记数据需要重新计算（延迟计算）
      this.markDataForRecalculation(memberUUID);
      
      console.log(`✅ 事件状态更新完成 - UUID: ${memberUUID}`);
    } catch (error) {
      console.error('❌ 事件状态更新失败:', error);
    }
  },
  
  // 解决缺勤事件
  resolveAbsenceEvent: async function(memberUUID) {
    console.log(`✅ 解决缺勤事件 - UUID: ${memberUUID}`);
    
    try {
      // 更新事件状态为已解决
      const resolveRecord = {
        memberUUID: memberUUID,
        resolveDate: new Date().toISOString().split('T')[0],
        reason: '签到中断缺勤事件',
        createdAt: new Date().toISOString()
      };
      
      // 保存到Firebase
      if (window.db) {
        await window.db.ref(`trackingRecords/${memberUUID}`).push(resolveRecord);
      }
      
      // 更新本地缓存
      this.updateLocalCache(memberUUID, 'resolved');
      
      console.log(`✅ 缺勤事件已解决 - UUID: ${memberUUID}`);
    } catch (error) {
      console.error('❌ 解决缺勤事件失败:', error);
    }
  },
  
  // 更新事件列表缓存
  updateEventListCache: function(memberUUID) {
    console.log(`🔄 更新事件列表缓存 - UUID: ${memberUUID}`);
    
    // 清除相关缓存
    if (window.unifiedCacheManager) {
      window.unifiedCacheManager.clearMemberCache(memberUUID);
    }
    
    // 清除成员计算缓存
    if (window.utils && window.utils.SundayTrackingManager) {
      window.utils.SundayTrackingManager._cache.memberCalculations.delete(memberUUID);
    }
  },
  
  // 更新本地缓存
  updateLocalCache: function(memberUUID, status) {
    console.log(`🔄 更新本地缓存 - UUID: ${memberUUID}, 状态: ${status}`);
    
    // 更新localStorage中的跟踪记录
    try {
      const existingRecords = JSON.parse(localStorage.getItem(`msh_tracking_records_${memberUUID}`) || '[]');
      const newRecord = {
        memberUUID: memberUUID,
        status: status,
        updateDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      existingRecords.push(newRecord);
      localStorage.setItem(`msh_tracking_records_${memberUUID}`, JSON.stringify(existingRecords));
      
      console.log(`✅ 本地缓存已更新 - UUID: ${memberUUID}`);
    } catch (error) {
      console.error('❌ 更新本地缓存失败:', error);
    }
  },
  
  // 通知页面更新
  notifyPageUpdate: function(memberUUID) {
    console.log(`📢 通知页面更新 - UUID: ${memberUUID}`);
    
    // 如果主日跟踪页面打开，刷新列表
    if (window.sundayTrackingPageOpen) {
      console.log('📢 通知主日跟踪页面更新');
      if (typeof loadSundayTracking === 'function') {
        loadSundayTracking(true, true); // 保持筛选状态，跳过完整重新加载
      }
    }
    
    // 如果跟踪事件详情页面打开，刷新详情
    if (window.trackingEventDetailPage && 
        window.trackingEventDetailPage.memberUUID === memberUUID) {
      console.log('📢 通知跟踪事件详情页面更新');
      if (typeof window.trackingEventDetailPage.refreshDetails === 'function') {
        window.trackingEventDetailPage.refreshDetails();
      }
    }
    
    // 如果个人页面打开，刷新个人数据
    if (window.personalPageOpen && 
        window.personalPageOpen.memberUUID === memberUUID) {
      console.log('📢 通知个人页面更新');
      if (typeof window.personalPageOpen.refreshData === 'function') {
        window.personalPageOpen.refreshData();
      }
    }
  },
  
  // 初始化实时更新监听
  initialize: function() {
    console.log('🔄 初始化实时更新管理器');
    
    // 监听签到成功事件
    window.addEventListener('signinSuccess', (event) => {
      const { memberUUID, signinData } = event.detail;
      this.onSigninComplete(memberUUID, signinData);
    });
    
    // 监听数据变化事件
    window.addEventListener('dataChanged', (event) => {
      const { dataType, memberUUID } = event.detail;
      if (dataType === 'attendanceRecords' && memberUUID) {
        this.updateEventListCache(memberUUID);
        this.notifyPageUpdate(memberUUID);
      }
    });
    
    console.log('✅ 实时更新管理器初始化完成');
  },
  
  // 标记数据需要重新计算（延迟计算策略）
  markDataForRecalculation: function(memberUUID) {
    console.log(`⏰ 标记数据需要重新计算 - UUID: ${memberUUID}`);
    
    // 设置延迟计算标志
    const recalculationFlags = JSON.parse(localStorage.getItem('msh_recalculation_flags') || '{}');
    recalculationFlags[memberUUID] = {
      needsRecalculation: true,
      lastSignin: new Date().toISOString(),
      reason: 'signin'
    };
    localStorage.setItem('msh_recalculation_flags', JSON.stringify(recalculationFlags));
    
    console.log(`✅ 数据重新计算标志已设置 - UUID: ${memberUUID}`);
  },
  
  // 检查是否需要重新计算
  needsRecalculation: function(memberUUID) {
    const recalculationFlags = JSON.parse(localStorage.getItem('msh_recalculation_flags') || '{}');
    return recalculationFlags[memberUUID]?.needsRecalculation || false;
  },
  
  // 清除重新计算标志
  clearRecalculationFlag: function(memberUUID) {
    const recalculationFlags = JSON.parse(localStorage.getItem('msh_recalculation_flags') || '{}');
    delete recalculationFlags[memberUUID];
    localStorage.setItem('msh_recalculation_flags', JSON.stringify(recalculationFlags));
    console.log(`✅ 重新计算标志已清除 - UUID: ${memberUUID}`);
  }
};

// 将实时更新管理器暴露到全局
window.realTimeUpdateManager = realTimeUpdateManager;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  if (window.realTimeUpdateManager) {
    window.realTimeUpdateManager.initialize();
  }
});

console.log('✅ 实时更新管理器已加载');
