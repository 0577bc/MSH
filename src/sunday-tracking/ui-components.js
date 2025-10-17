    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * 显示加载状态
 * 功能：显示页面加载状态
 * 作者：MSH系统
 * 版本：2.0
 */
function showLoadingState(message = '正在加载...') {
  // 创建加载指示器
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loadingIndicator';
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.innerHTML = `
    <div class="spinner"></div>
    <p>${message}</p>
  `;
  
  // 添加到页面
  document.body.appendChild(loadingIndicator);
}

/**
 * 隐藏加载状态
 * 功能：隐藏页面加载状态
 * 作者：MSH系统
 * 版本：2.0
 */
function hideLoadingState() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator && loadingIndicator.parentNode) {
    loadingIndicator.parentNode.removeChild(loadingIndicator);
  }
}

// 计算缺勤周数范围显示
function getAbsenceWeekRange(startDate, consecutiveAbsences) {
  if (!startDate || !consecutiveAbsences) return '';
  
  try {
    const start = new Date(startDate);
    const startMonth = start.getMonth() + 1; // 月份从0开始，需要+1
    const startWeek = Math.ceil(start.getDate() / 7); // 计算是第几周
    
    // 如果只有1周缺勤，只显示开始周
    if (consecutiveAbsences === 1) {
      return `${startMonth}月${startWeek}周`;
    }
    
    // 计算结束周
    const endWeek = startWeek + consecutiveAbsences - 1;
    
    // 如果结束周超过4，需要处理跨月情况
    if (endWeek > 4) {
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + (consecutiveAbsences - 1) * 7);
      const endMonth = endDate.getMonth() + 1;
      const actualEndWeek = Math.ceil(endDate.getDate() / 7);
      
      if (startMonth === endMonth) {
        // 同一个月内
        return `${startMonth}月${startWeek}周-${actualEndWeek}周`;
      } else {
        // 跨月
        return `${startMonth}月${startWeek}周-${endMonth}月${actualEndWeek}周`;
      }
    } else {
      // 同一个月内
      return `${startMonth}月${startWeek}周-${endWeek}周`;
    }
  } catch (error) {
    console.error('计算缺勤周数范围时出错:', error);
    return '';
  }
}

// 格式化日期显示
// formatDateForDisplay函数已移至utils.js，使用window.utils.formatDateForDisplay()

// 获取状态文本
// getStatusText函数已移至utils.js，使用window.utils.getStatusText()




// 查看个人页面
function viewPersonalPage(memberUUID) {
  window.location.href = `personal-page.html?uuid=${memberUUID}`;
}

// 将函数暴露到全局作用域
window.viewPersonalPage = viewPersonalPage;

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('主日跟踪页面加载中...');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 初始化Firebase
  const firebaseInitialized = await initializeFirebase();
  if (!firebaseInitialized) {
    console.error('Firebase初始化失败');
    return;
  }
  
  // 加载数据
  await loadData();
  
  // 启动数据同步
  startListening();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化数据变化监听器
  if (window.utils && window.utils.SundayTrackingManager) {
    window.utils.SundayTrackingManager._initDataChangeListener();
  }
  
  // 自动加载跟踪数据
  loadSundayTracking();
  
  console.log('主日跟踪页面初始化完成');
  
  // 添加全局性能检查命令
  window.checkPagePerformance = function() {
    if (window.pageLoadPerformance) {
      console.log('📊 页面加载性能数据:');
      console.log(`  总加载时间: ${window.pageLoadPerformance.totalLoadTime.toFixed(2)}ms`);
      console.log(`  事件生成时间: ${window.pageLoadPerformance.eventListGeneration.toFixed(2)}ms`);
      console.log(`  事件数量: ${window.pageLoadPerformance.eventCount}`);
      console.log(`  加载方式: ${window.pageLoadPerformance.loadType}`);
      console.log(`  时间戳: ${window.pageLoadPerformance.timestamp}`);
      return window.pageLoadPerformance;
    } else {
      console.log('❌ 性能数据未找到');
      return null;
    }
  };
  
  // 添加已终止事件管理功能
  window.showTerminatedEvents = function() {
    console.log('📋 显示已终止事件');
    const allEvents = window.utils.SundayTrackingManager.getTrackingRecords();
    const terminatedEvents = allEvents.filter(event => event.status === 'terminated');
    
    if (terminatedEvents.length === 0) {
      alert('暂无已终止的事件');
      return;
    }
    
    // 显示已终止事件列表
    displayEventList(terminatedEvents.map(event => ({
      eventId: event.recordId,
      memberUUID: event.memberUUID,
      memberName: event.memberName,
      group: event.group,
      eventType: event.eventType,
      status: event.status,
      consecutiveAbsences: event.consecutiveAbsences,
      lastAttendanceDate: event.lastAttendanceDate,
      trackingStartDate: event.trackingStartDate,
      lastUpdateTime: event.updatedAt || event.createdAt
    })));
  };
  
  window.showAllEvents = function() {
    console.log('📊 显示所有事件');
    loadSundayTracking(true, false, true); // 强制刷新
  };
  
  window.restartTerminatedEvent = function(eventId) {
    if (confirm('确定要重新启动这个已终止的事件吗？')) {
      console.log(`🔄 重新启动事件: ${eventId}`);
      // 这里可以添加重新启动事件的逻辑
      alert('事件重新启动功能开发中...');
    }
  };
  
  // 添加转发历史记录查看功能
  window.showForwardHistory = function() {
    console.log('📋 显示转发历史记录');
    const allEvents = window.utils.SundayTrackingManager.getTrackingRecords();
    const forwardedEvents = allEvents.filter(event => event.forwarded === true);
    
    if (forwardedEvents.length === 0) {
      alert('暂无转发记录');
      return;
    }
    
    // 生成转发历史记录内容
    let historyContent = `转发历史记录 (共${forwardedEvents.length}条)\n\n`;
    
    forwardedEvents.forEach((event, index) => {
      const forwardDate = event.forwardDate ? new Date(event.forwardDate).toLocaleString('zh-CN') : '未知时间';
      const forwardStatus = event.forwardStatus || '未知状态';
      historyContent += `${index + 1}. ${event.memberName} (${event.group})\n`;
      historyContent += `   转发时间: ${forwardDate}\n`;
      historyContent += `   转发状态: ${forwardStatus}\n`;
      historyContent += `   事件ID: ${event.recordId || event.memberUUID}\n\n`;
    });
    
    // 显示转发历史记录
    alert(historyContent);
  };
});

// 显示加载状态
function showLoadingState() {
  const trackingSection = document.getElementById('sundayTrackingSection');
  if (trackingSection) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p>正在加载跟踪数据...</p>
    `;
    trackingSection.appendChild(loadingDiv);
  }
}

// 隐藏加载状态
function hideLoadingState() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// 延迟加载数据
async function loadDataWithDelay() {
  // 先显示基本页面结构
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 然后加载数据
  await loadData();
  
  // 再延迟一点显示结果，让用户感觉更流畅
  await new Promise(resolve => setTimeout(resolve, 200));
}

// ==================== 事件控制功能 ====================

/**
 * 终止事件
 * 功能：终止指定的跟踪事件
 * 作者：MSH系统
 * 版本：2.0
 */
async function terminateEvent(eventId, memberName) {
  try {
    console.log(`🛑 开始终止事件: ${eventId}, 成员: ${memberName}`);
    
    // 显示确认对话框
    const confirmTerminate = confirm(`确定要终止 ${memberName} 的跟踪事件吗？\n\n此操作将停止对该成员的跟踪，但可以稍后重启。`);
    if (!confirmTerminate) {
      console.log('用户取消了事件终止操作');
      return;
    }
    
    // 显示加载状态
    showLoadingState('正在终止事件...');
    
    // 获取事件记录
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
    // 创建终止记录
    const terminationRecord = {
      terminatedBy: 'system',
      terminatedAt: new Date().toISOString(),
      reason: '手动终止',
      notes: `由系统管理员手动终止事件`
    };
    
    // 调用终止功能
    const success = await window.utils.SundayTrackingManager.terminateTracking(eventId, terminationRecord);
    
    if (success) {
      showNotification(`事件已成功终止！`, 'success');
      console.log('✅ 事件终止成功');
      
      // 刷新页面显示
      setTimeout(() => {
        loadSundayTracking();
      }, 1000);
    } else {
      throw new Error('事件终止失败');
    }
    
  } catch (error) {
    console.error('❌ 终止事件失败:', error);
    showNotification('终止事件失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

/**
 * 重启事件
 * 功能：重启已终止的跟踪事件
 * 作者：MSH系统
 * 版本：2.0
 */
async function restartEvent(eventId) {
  try {
    console.log(`🔄 开始重启事件: ${eventId}`);
    
    // 显示确认对话框
    const confirmRestart = confirm(`确定要重启这个已终止的事件吗？\n\n重启后将继续跟踪该成员的缺勤情况。`);
    if (!confirmRestart) {
      console.log('用户取消了事件重启操作');
      return;
    }
    
    // 显示加载状态
    showLoadingState('正在重启事件...');
    
    // 获取事件记录
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
    // 创建重启记录
    const restartRecord = {
      restartedBy: 'system',
      restartDate: new Date().toISOString().split('T')[0],
      reason: '手动重启',
      notes: `由系统管理员手动重启事件`
    };
    
    // 调用重启功能
    const success = await window.utils.SundayTrackingManager.restartEvent(eventId, restartRecord);
    
    if (success) {
      showNotification(`事件已成功重启！`, 'success');
      console.log('✅ 事件重启成功');
      
      // 刷新页面显示
      setTimeout(() => {
        loadSundayTracking();
      }, 1000);
    } else {
      throw new Error('事件重启失败');
    }
    
  } catch (error) {
    console.error('❌ 重启事件失败:', error);
    showNotification('重启事件失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

// ==================== 防重复转发机制 ====================

/**
 * 防重复的转发函数
 * 使用防重复执行装饰器包装转发函数
 */
const forwardToExternalForm = window.utils ? 
  window.utils.preventDuplicateExecution(forwardToExternalFormInternal, 'forwardToExternalForm') :
  forwardToExternalFormInternal;

// ==================== 全局函数暴露 ====================
// 将外部表单集成函数暴露到全局作用域
window.forwardToExternalForm = forwardToExternalForm;
window.fetchExternalFormData = fetchExternalFormData;
window.processExternalFormData = processExternalFormData;
window.updateEventStatus = updateEventStatus;
window.showNotification = showNotification;
window.showLoadingState = showLoadingState;
window.hideLoadingState = hideLoadingState;

// 将事件控制函数暴露到全局作用域
window.terminateEvent = terminateEvent;
window.restartEvent = restartEvent;
