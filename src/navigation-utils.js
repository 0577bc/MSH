// ==================== 统一导航工具 ====================
// 提供统一的页面导航和返回机制

/**
 * 统一的返回index页面机制
 * 包含数据同步检查和智能返回策略
 */
async function navigateBackToIndex() {
  try {
    console.log('🔄 开始返回导航流程');
    
    // 1. 检查是否有未同步的数据
    if (window.newDataManager && window.newDataManager.hasLocalChanges) {
      console.log('🔄 检测到未同步的数据，在返回前进行同步');
      
      // 显示同步提示
      const shouldSync = confirm('检测到未同步的数据！\n\n是否在返回前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接返回');
      
      if (shouldSync) {
        // 显示同步进度
        const syncButton = createSyncIndicator();
        document.body.appendChild(syncButton);
        
        try {
          // 执行同步
          const syncSuccess = await window.newDataManager.performManualSync();
          if (!syncSuccess) {
            console.warn('⚠️ 同步失败，但继续返回');
            alert('同步失败，但将继续返回。请稍后手动同步数据。');
          } else {
            console.log('✅ 数据同步完成');
          }
        } finally {
          // 移除同步指示器
          if (syncButton && syncButton.parentNode) {
            syncButton.parentNode.removeChild(syncButton);
          }
        }
      }
    }
    
    // 2. 直接跳转到index页面，不使用history.back()
    console.log('🔄 直接跳转到index页面');
    window.location.href = 'index.html';
    
  } catch (error) {
    console.error('❌ 返回导航失败:', error);
    // 出错时直接跳转
    window.location.href = 'index.html';
  }
}

/**
 * 创建同步指示器
 */
function createSyncIndicator() {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 10000;
    text-align: center;
  `;
  indicator.innerHTML = `
    <div style="margin-bottom: 10px;">🔄 正在同步数据...</div>
    <div style="font-size: 12px; opacity: 0.8;">请稍候，不要关闭页面</div>
  `;
  return indicator;
}

/**
 * 智能页面跳转
 * 包含数据同步检查和跳转前处理
 */
async function smartNavigateTo(targetUrl, options = {}) {
  try {
    const { 
      syncBeforeNavigate = true,
      showSyncPrompt = true,
      fallbackUrl = targetUrl
    } = options;
    
    console.log(`🔄 智能导航到: ${targetUrl}`);
    
    // 1. 检查是否需要同步
    if (syncBeforeNavigate && window.newDataManager && window.newDataManager.hasLocalChanges) {
      console.log('🔄 检测到未同步的数据，在跳转前进行同步');
      
      if (showSyncPrompt) {
        const shouldSync = confirm('检测到未同步的数据！\n\n是否在跳转前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接跳转');
        
        if (shouldSync) {
          const syncSuccess = await window.newDataManager.performManualSync();
          if (!syncSuccess) {
            console.warn('⚠️ 同步失败，但继续跳转');
          }
        }
      }
    }
    
    // 2. 执行跳转
    window.location.href = targetUrl;
    
  } catch (error) {
    console.error('❌ 智能导航失败:', error);
    // 出错时使用fallback URL
    window.location.href = fallbackUrl;
  }
}

/**
 * 检查页面是否需要数据更新
 * 基于数据新鲜度和变更情况
 */
async function shouldUpdatePageData() {
  try {
    if (!window.newDataManager) {
      return false;
    }
    
    // 检查数据新鲜度
    const lastUpdate = window.newDataManager.getLastLocalUpdateTime();
    const now = Date.now();
    const dataAge = now - lastUpdate;
    
    // 如果数据很新鲜（5分钟内），不需要更新
    const FRESH_DATA_THRESHOLD = 5 * 60 * 1000; // 5分钟
    if (dataAge < FRESH_DATA_THRESHOLD) {
      console.log(`📋 页面数据很新鲜 (${Math.round(dataAge / 1000)}秒前)，跳过更新`);
      return false;
    }
    
    // 检查是否有本地变更
    if (window.newDataManager.hasLocalChanges) {
      console.log('🔄 检测到本地变更，需要更新');
      return true;
    }
    
    // 检查Firebase更新
    const hasFirebaseUpdates = await window.newDataManager.checkFirebaseUpdates();
    if (hasFirebaseUpdates) {
      console.log('🔄 Firebase有更新，需要更新页面数据');
      return true;
    }
    
    console.log('📋 页面数据无需更新');
    return false;
    
  } catch (error) {
    console.error('❌ 检查页面数据更新状态失败:', error);
    return false;
  }
}

/**
 * 页面加载时的智能数据检查
 * 根据数据状态决定是否需要重新加载
 */
async function smartPageLoad() {
  try {
    console.log('🔄 页面加载，检查数据状态');
    
    // 如果NewDataManager已经加载了数据，检查是否需要更新
    if (window.newDataManager && window.newDataManager.isDataLoaded) {
      const needsUpdate = await shouldUpdatePageData();
      
      if (needsUpdate) {
        console.log('🔄 页面数据需要更新，执行智能拉取');
        await window.newDataManager.loadAllDataFromFirebase();
      } else {
        console.log('📋 页面数据无需更新，使用现有数据');
      }
    } else {
      console.log('🔄 首次加载页面数据');
      if (window.newDataManager) {
        await window.newDataManager.loadAllDataFromFirebase();
      }
    }
    
  } catch (error) {
    console.error('❌ 智能页面加载失败:', error);
  }
}

// 导出函数供其他页面使用
window.NavigationUtils = {
  navigateBackToIndex,
  smartNavigateTo,
  shouldUpdatePageData,
  smartPageLoad,
  createSyncIndicator
};

console.log('✅ 导航工具已加载');
