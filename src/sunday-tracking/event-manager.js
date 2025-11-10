// ==================== 主日跟踪功能 ====================

// 加载主日跟踪数据（优化版）
// 互斥锁：防止并发调用 loadSundayTracking
window._loadSundayTrackingLock = false;
window._loadSundayTrackingPromise = null;

window.loadSundayTracking = async function loadSundayTracking(preserveFilters = false, skipFullReload = false, forceRefresh = false, showAll = false) {
  // 防止并发调用：如果正在加载，等待正在进行的加载完成
  if (window._loadSundayTrackingLock && window._loadSundayTrackingPromise) {
    console.log('⏳ 检测到正在加载中，等待完成...');
    return await window._loadSundayTrackingPromise;
  }
  
  // 设置互斥锁
  window._loadSundayTrackingLock = true;
  window._loadSundayTrackingPromise = (async () => {
    try {
      const pageLoadStartTime = performance.now();
      console.log('🚀 开始加载主日跟踪页面（优化版）');
      
      // 如果强制刷新，清除缓存
      if (forceRefresh) {
        console.log('🔄 强制刷新，清除缓存');
        if (window.unifiedCacheManager) {
          window.unifiedCacheManager.clearAll();
        }
        // 清除 SundayTrackingManager 的缓存
        if (window.utils?.SundayTrackingManager?._clearCache) {
          window.utils.SundayTrackingManager._clearCache();
        }
      }
    
    // 检查缓存
    if (window.unifiedCacheManager) {
      const cachedEventList = window.unifiedCacheManager.get('eventList', 'all');
      if (cachedEventList) {
        const cacheLoadTime = performance.now() - pageLoadStartTime;
        console.log(`📦 使用缓存的事件列表，耗时: ${cacheLoadTime.toFixed(2)}ms`);
        
        // 记录缓存加载性能
        window.pageLoadPerformance = {
          totalLoadTime: cacheLoadTime,
          eventListGeneration: 0,
          eventCount: cachedEventList.length,
          loadType: 'cache',
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ 主日跟踪页面加载完成，总耗时: ${cacheLoadTime.toFixed(2)}ms`);
        displayEventList(cachedEventList);
        // 释放互斥锁
        window._loadSundayTrackingLock = false;
        window._loadSundayTrackingPromise = null;
        return;
      }
    }
    
    // 优化：检查是否有跟踪记录数据，如果有则直接生成事件列表
    const existingTrackingRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
    if (existingTrackingRecords && existingTrackingRecords.length > 0) {
      console.log('🔧 检测到跟踪记录数据，直接生成事件列表');
      console.log(`📊 跟踪记录数量: ${existingTrackingRecords.length}个`);
      
      // 直接生成事件列表，不依赖基础数据
      const eventList = await generateUltraLightEventList(showAll);
      
      // 保存到缓存
      if (window.unifiedCacheManager) {
        window.unifiedCacheManager.set('eventList', 'all', eventList);
      }
      
      // 显示事件列表
      displayEventList(eventList);
      
      // 计算总加载时间
      const totalLoadTime = performance.now() - pageLoadStartTime;
      console.log(`✅ 主日跟踪页面加载完成，总耗时: ${totalLoadTime.toFixed(2)}ms`);
      
      // 更新性能监控数据
      if (window.pageLoadPerformance) {
        window.pageLoadPerformance.totalLoadTime = totalLoadTime;
        window.pageLoadPerformance.loadType = 'tracking_records';
      }
      
      // 释放互斥锁
      window._loadSundayTrackingLock = false;
      window._loadSundayTrackingPromise = null;
      return;
    }
    
    // 检查基础数据是否已加载（新方案只需要groups，不需要attendanceRecords）
    if (!window.groups) {
      console.log('⏳ 等待基础数据加载完成...');
      // 等待基础数据加载（最多等待10秒），使用Promise避免递归调用
      await new Promise((resolve) => {
        let waitCount = 0;
        const maxWaitCount = 100; // 10秒 (100 * 100ms)
        const checkDataLoaded = setInterval(() => {
          waitCount++;
          if (window.groups) {
            clearInterval(checkDataLoaded);
            console.log('✅ 基础数据加载完成，继续加载事件列表');
            resolve();
          } else if (waitCount >= maxWaitCount) {
            clearInterval(checkDataLoaded);
            console.error('❌ 基础数据加载超时，尝试继续加载...');
            resolve(); // 超时后也继续，不阻塞
          }
        }, 100);
      });
      // 继续执行，不返回
    }
    
    // 优化：检查是否只需要跟踪记录数据
    if (!window.utils || !window.utils.SundayTrackingManager) {
      console.log('⏳ 等待SundayTrackingManager加载完成...');
      // 等待SundayTrackingManager加载，使用Promise避免递归调用
      await new Promise((resolve) => {
        let waitCount = 0;
        const maxWaitCount = 100; // 10秒
        const checkManagerLoaded = setInterval(() => {
          waitCount++;
          if (window.utils && window.utils.SundayTrackingManager) {
            clearInterval(checkManagerLoaded);
            console.log('✅ SundayTrackingManager加载完成，继续加载事件列表');
            resolve();
          } else if (waitCount >= maxWaitCount) {
            clearInterval(checkManagerLoaded);
            console.error('❌ SundayTrackingManager加载超时，尝试继续加载...');
            resolve(); // 超时后也继续，不阻塞
          }
        }, 100);
      });
      // 继续执行，不返回
    }
    
    // 显示加载指示器
    showLoadingIndicator();
    
    // 直接异步生成极简事件列表（避免阻塞UI，但保持在同一Promise链中）
    try {
      // 使用微任务延迟，让UI先渲染
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const eventList = await generateUltraLightEventList(showAll);
      
      // 保存到缓存
      if (window.unifiedCacheManager) {
        window.unifiedCacheManager.set('eventList', 'all', eventList);
      }
      
      // 显示事件列表
      displayEventList(eventList);
      hideLoadingIndicator();
      
      // 计算总加载时间
      const totalLoadTime = performance.now() - pageLoadStartTime;
      console.log(`✅ 主日跟踪页面加载完成，总耗时: ${totalLoadTime.toFixed(2)}ms`);
      
      // 更新性能监控数据
      if (window.pageLoadPerformance) {
        window.pageLoadPerformance.totalLoadTime = totalLoadTime;
        window.pageLoadPerformance.loadType = 'generated';
      }
    } catch (error) {
      console.error('❌ 异步生成事件列表失败:', error);
      hideLoadingIndicator();
      showErrorMessage('生成事件列表失败，请重试！');
    }
    
    } catch (error) {
      console.error('❌ 加载主日跟踪页面失败:', error);
      alert('加载跟踪数据失败，请重试！');
      // 释放互斥锁
      window._loadSundayTrackingLock = false;
      window._loadSundayTrackingPromise = null;
    }
  })();
  
  return await window._loadSundayTrackingPromise;
}

// 全局变量：控制是否显示所有事件（包括已终止的）
window.sundayTrackingShowAllEvents = false;

// 生成极简事件列表（真正的极简版本 - 只拉取数据，不计算）
// 缓存 generateUltraLightEventList 的结果
window._generateUltraLightEventListCache = null;
window._generateUltraLightEventListCacheTime = 0;
const GENERATE_EVENT_LIST_CACHE_DURATION = 30 * 1000; // 30秒缓存

async function generateUltraLightEventList(showAll = false) {
  console.log('🔍 生成极简事件列表（使用已有计算逻辑）');
  const startTime = performance.now();
  
  // 检查缓存（如果参数相同且缓存未过期）
  if (window._generateUltraLightEventListCache && 
      window._generateUltraLightEventListCache.showAll === showAll &&
      Date.now() - window._generateUltraLightEventListCacheTime < GENERATE_EVENT_LIST_CACHE_DURATION) {
    const cacheLoadTime = performance.now() - startTime;
    console.log(`📦 使用缓存的事件列表，耗时: ${cacheLoadTime.toFixed(2)}ms`);
    return window._generateUltraLightEventListCache.eventList;
  }
  
  // 更新全局变量
  window.sundayTrackingShowAllEvents = showAll;
  
  // 检查SundayTrackingManager是否可用
  if (!window.utils || !window.utils.SundayTrackingManager) {
    console.error('❌ SundayTrackingManager未找到');
    return [];
  }
  
  // 🔧 简化方案：直接使用已有的 generateTrackingList() 函数
  // 它会自动：
  // 1. 遍历所有成员
  // 2. 调用 calculateConsecutiveAbsences 获取所有缺勤事件（>=2次）
  // 3. 自动处理多个独立缺勤事件
  // 4. 合并现有记录和新事件
  console.log('🔄 调用 generateTrackingList() 生成所有事件...');
  const trackingList = await window.utils.SundayTrackingManager.generateTrackingList();
  console.log(`✅ 生成事件完成，共 ${trackingList.length} 个事件`);
  
  // 根据showAll参数决定是否过滤已终止的事件
  const filteredList = showAll 
    ? trackingList 
    : trackingList.filter(item => item.status !== 'terminated');
  
  console.log(`📊 过滤后事件数量: ${filteredList.length}个 (过滤掉${trackingList.length - filteredList.length}个已终止事件)`);
  
  // 转换为极简格式（如果需要保持一致的数据结构）
  const eventList = filteredList.map(item => ({
    eventId: item.recordId || `event_${item.memberUUID}_${Date.now()}`,
    memberUUID: item.memberUUID,
    memberName: item.memberName,
    group: item.group,
    groupDisplayName: item.groupDisplayName || item.group,
    eventType: item.eventType || 'extended_absence',
    status: item.status || 'active',
    consecutiveAbsences: item.consecutiveAbsences,
    lastAttendanceDate: item.lastAttendanceDate,
    trackingStartDate: item.trackingStartDate,
    memberSnapshot: item.memberSnapshot || {
      uuid: item.memberUUID,
      name: item.memberName,
      group: item.group
    },
    lastUpdateTime: item.updatedAt || item.createdAt || new Date().toISOString()
  }));
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  console.log(`✅ 极简事件列表生成完成，耗时: ${processingTime.toFixed(2)}ms，事件数量: ${eventList.length}`);
  
  // 保存到缓存
  window._generateUltraLightEventListCache = {
    eventList: eventList,
    showAll: showAll
  };
  window._generateUltraLightEventListCacheTime = Date.now();
  
  // 性能监控：记录到全局变量供页面显示
  window.pageLoadPerformance = {
    eventListGeneration: processingTime,
    eventCount: eventList.length,
    timestamp: new Date().toISOString()
  };
  
  return eventList;
}

// 专门为主日跟踪页面优化的数据加载策略
async function loadSundayTrackingDataOnly() {
  console.log('🔍 主日跟踪页面专用数据加载策略');
  const startTime = performance.now();
  
  try {
    // 1. 检查是否已有跟踪记录数据
    const existingTrackingRecords = window.utils.SundayTrackingManager.getTrackingRecords();
    if (existingTrackingRecords.length > 0) {
      console.log(`📦 使用现有跟踪记录: ${existingTrackingRecords.length}个`);
      return existingTrackingRecords;
    }
    
    // 2. 如果本地没有跟踪记录，只拉取必要的Firebase数据
    console.log('🔄 从Firebase拉取跟踪记录数据...');
    
    if (!firebase.apps.length) {
      console.error('Firebase未初始化');
      return [];
    }
    
    const db = firebase.database();
    
    // 只拉取跟踪记录相关的数据，不拉取所有数据
    const trackingSnapshot = await db.ref('sundayTracking').once('value');
    const trackingData = trackingSnapshot.val() || {};
    
    // 保存到localStorage
    localStorage.setItem('msh_sunday_tracking', JSON.stringify(trackingData));
    
    const endTime = performance.now();
    console.log(`✅ 跟踪记录数据加载完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    return Object.values(trackingData);
    
  } catch (error) {
    console.error('❌ 加载跟踪记录数据失败:', error);
    return [];
  }
}

// 显示加载指示器
function showLoadingIndicator() {
  if (sundayTrackingList) {
    sundayTrackingList.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px;">
          <div class="loading-indicator">
            <div class="spinner"></div>
            <div>正在生成事件列表，请稍候...</div>
          </div>
        </td>
      </tr>
    `;
  }
}

// 隐藏加载指示器
function hideLoadingIndicator() {
  // 加载指示器会在displayEventList中被替换
}

// 显示错误信息
function showErrorMessage(message) {
  if (sundayTrackingList) {
    sundayTrackingList.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #e74c3c; padding: 20px;">
          <div>❌ ${message}</div>
          <button onclick="loadSundayTracking()" class="main-button primary-button" style="margin-top: 10px;">
            重试
          </button>
        </td>
      </tr>
    `;
  }
}

// 极简缺勤事件检查
function hasAbsenceEvent(memberUUID) {
  // 最简单的检查：最近4周是否有签到记录
  const recentRecords = getRecentAttendanceRecords(memberUUID, 4);
  return recentRecords.length === 0;
}

// 获取最近签到记录（优化版）
function getRecentAttendanceRecords(memberUUID, weeks) {
  if (!window.attendanceRecords) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
  
  return window.attendanceRecords.filter(record => {
    return record.memberUUID === memberUUID && 
           new Date(record.time) >= cutoffDate;
  });
}

// 显示事件列表
window.displayEventList = function displayEventList(eventList) {
  if (!sundayTrackingList) {
    console.error('主日跟踪列表元素未找到');
    return;
  }
  
  sundayTrackingList.innerHTML = '';
  
  if (eventList.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" style="text-align: center; color: #666;">暂无跟踪记录</td>';
    sundayTrackingList.appendChild(row);
    updateTrackingCount(0);
    return;
  }
  
  // 性能信息已移除，不再显示给用户
  
  // 已终止事件查看按钮已移至页面顶部，此处不再重复显示
  
  // 排序：第一关键词组别，第二关键词连续缺勤次数（降序），第三关键词姓名
  const sortedList = eventList.sort((a, b) => {
    // 第一关键词：组别
    if (a.group !== b.group) {
        // 确保"group0"排在第一
        if (a.group === 'group0') return -1;
        if (b.group === 'group0') return 1;
      return a.group.localeCompare(b.group);
    }
    
    // 第二关键词：连续缺勤次数（降序）
    if (a.consecutiveAbsences !== b.consecutiveAbsences) {
      return b.consecutiveAbsences - a.consecutiveAbsences;
    }
    
    // 第三关键词：姓名
    return a.memberName.localeCompare(b.memberName);
  });
  
  sortedList.forEach((item, index) => {
    const row = document.createElement('tr');
    
    // 根据事件类型设置样式
    let rowClass = '';
    if (item.eventType === 'extended_absence') {
      rowClass = 'extended-absence-row';
    } else if (item.eventType === 'severe_absence') {
      rowClass = 'severe-absence-row';
    } else {
      rowClass = 'normal-absence-row';
    }
    
    row.className = rowClass;
    // 获取正确的组别显示名称
    const groupDisplayName = window.groupNames && window.groupNames[item.group] 
      ? window.groupNames[item.group] 
      : (item.groupDisplayName || item.group);
    
    // 检查转发状态
    const isForwarded = item.forwarded === true;
    const forwardDate = item.forwardDate ? new Date(item.forwardDate).toLocaleString('zh-CN') : '';
    const forwardButtonText = isForwarded ? '已转发' : '转发';
    const forwardButtonClass = isForwarded ? 'forward-btn forwarded' : 'forward-btn';
    const forwardButtonTitle = isForwarded ? `已于 ${forwardDate} 转发到外部表单` : '转发到外部表单';
    
    // 检查事件状态，决定显示哪些按钮
    const isTerminated = item.status === 'terminated';
    const eventId = item.eventId || item.memberUUID;
    
    let actionButtons = `
      <button class="detail-btn" onclick="navigateToEventDetail('${item.memberUUID}', '${item.eventId}')" title="查看详情">查看详情</button>
      <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')" title="个人页面">个人页面</button>
      <button class="${forwardButtonClass}" onclick="forwardToExternalForm('${eventId}')" title="${forwardButtonTitle}">${forwardButtonText}</button>
      <button class="fetch-btn" onclick="fetchExternalFormData('${eventId}')" title="抓取外部数据">抓取</button>
    `;
    
    // 根据事件状态添加相应的控制按钮
    if (isTerminated) {
      // 已终止事件显示重启按钮
      actionButtons += `<button class="restart-btn" onclick="restartEvent('${eventId}')" title="重启事件">重启</button>`;
    } else {
      // 活跃事件显示终止按钮
      actionButtons += `<button class="terminate-btn" onclick="terminateEvent('${eventId}', '${item.memberName}')" title="终止事件">终止</button>`;
    }
    
    row.innerHTML = `
      <td>${item.memberName}</td>
      <td>${groupDisplayName}</td>
      <td>${item.consecutiveAbsences || 0}次</td>
      <td>${item.lastAttendanceDate ? (window.utils && window.utils.formatDateForDisplay ? window.utils.formatDateForDisplay(item.lastAttendanceDate) : new Date(item.lastAttendanceDate).toLocaleDateString('zh-CN')) : '无'}</td>
      <td class="action-buttons">
        ${actionButtons}
      </td>
    `;
    sundayTrackingList.appendChild(row);
  });
  
  // 更新事件数量
  updateTrackingCount(eventList.length);
  
  // 更新筛选选项
  updateGroupFilterOptions(eventList);
}

// 跳转到事件详情页面
function navigateToEventDetail(memberUUID, eventId) {
  window.location.href = `tracking-event-detail.html?uuid=${memberUUID}&eventId=${eventId}`;
}

// 查看个人页面
function viewPersonalPage(memberUUID) {
  window.location.href = `personal-page.html?uuid=${memberUUID}`;
}

// 兼容旧版本的加载函数
async function loadSundayTrackingLegacy(preserveFilters = false, skipFullReload = false, forceRefresh = false) {
  if (!window.utils || !window.utils.SundayTrackingManager) {
    console.error('主日跟踪管理器未加载');
    alert('主日跟踪功能暂不可用，请刷新页面重试！');
    return;
  }

  try {
    const trackingManager = window.utils.SundayTrackingManager;
    
    // 如果强制刷新，清除缓存
    if (forceRefresh) {
      console.log('🔄 强制刷新，清除缓存');
      trackingManager._clearCache();
    }
    
    // 如果跳过完整重新加载，只更新统计信息和列表显示
    if (skipFullReload) {
      console.log('跳过完整重新加载，只更新统计信息和列表显示');
      const trackingList = await trackingManager.generateTrackingList();
      updateTrackingSummary(trackingList);
      
      // 重新显示跟踪列表（不重新加载数据）
      displayTrackingList(trackingList);
      return;
    }

    // 保存当前筛选状态
    let currentFilters = null;
    if (preserveFilters) {
      currentFilters = {
        groupFilter: document.getElementById('groupFilter')?.value || '',
        statusFilter: document.getElementById('statusFilter')?.value || '',
        searchTerm: document.getElementById('searchInput')?.value || ''
      };
      console.log('保存当前筛选状态:', currentFilters);
    }
    
    // 调试信息
    console.log('=== 主日跟踪调试信息 ===');
    console.log('全局签到记录数量:', window.attendanceRecords ? window.attendanceRecords.length : 0);
    console.log('全局小组数据:', window.groups ? Object.keys(window.groups).length : 0);
    console.log('全局小组数据详情:', window.groups);
    
    // 检查所有人员数据
    const allMembers = trackingManager.getAllMembers();
    console.log('所有人员数量:', allMembers.length);
    console.log('所有人员详情:', allMembers);
    
    // 检查排除人员
    console.log('🔍 检查window.excludedMembers:', window.excludedMembers);
    const excludedMembers = trackingManager.getExcludedMembers();
    console.log('排除人员数量:', excludedMembers.length);
    console.log('排除人员详情:', excludedMembers);
    
    // 生成跟踪列表
    const trackingList = await trackingManager.generateTrackingList();
    console.log('生成的跟踪列表:', trackingList);
    
    // 更新统计信息
    updateTrackingSummary(trackingList);
    
    // 显示跟踪列表
    displayTrackingList(trackingList);
    
    // 恢复筛选状态
    if (preserveFilters && currentFilters) {
      setTimeout(() => {
        if (currentFilters.groupFilter && document.getElementById('groupFilter')) {
          document.getElementById('groupFilter').value = currentFilters.groupFilter;
        }
        if (currentFilters.statusFilter && document.getElementById('statusFilter')) {
          document.getElementById('statusFilter').value = currentFilters.statusFilter;
        }
        if (currentFilters.searchTerm && document.getElementById('searchInput')) {
          document.getElementById('searchInput').value = currentFilters.searchTerm;
        }
        
        // 重新应用筛选
        filterTrackingList();
        console.log('已恢复筛选状态:', currentFilters);
      }, 100);
    }
    
    
  } catch (error) {
    console.error('加载主日跟踪数据失败:', error);
    alert('加载跟踪数据失败，请重试！');
  }
}

// 更新跟踪统计信息
function updateTrackingSummary(trackingList) {
  const trackingCount = trackingList.length;
  
  // 更新统计显示
  const trackingCountEl = document.getElementById('trackingCount');
  if (trackingCountEl) trackingCountEl.textContent = trackingCount;
  
  // 显示缓存状态
  const trackingManager = window.utils.SundayTrackingManager;
  if (trackingManager && trackingManager._cache && trackingManager._cache.lastUpdateTime) {
    const cacheAge = Math.round((Date.now() - trackingManager._cache.lastUpdateTime) / 1000);
    console.log(`📦 使用缓存数据，缓存年龄: ${cacheAge}秒`);
  } else {
    console.log(`🔄 使用新生成的数据，无缓存`);
  }
  
  // 更新小组筛选选项
  updateGroupFilterOptions(trackingList);
}

// 更新小组筛选选项（优化版：从事件数据直接获取，不依赖基础数据）
function updateGroupFilterOptions(trackingList) {
  if (!groupFilter) return;
  
  console.log('🔧 优化版小组筛选：从事件数据直接获取选项');
  
  // 获取所有小组（从事件数据中直接提取）
  const allGroups = new Set();
  trackingList.forEach(item => {
    if (item.group) {
      allGroups.add(item.group);
    }
  });
  
  // 清空现有选项（保留"全部小组"选项）
  groupFilter.innerHTML = '<option value="">--全部小组--</option>';
  
  // 添加小组选项，确保"group999"排在最后
  const sortedGroups = Array.from(allGroups).sort((a, b) => {
    if (a === 'group999') return 1;
    if (b === 'group999') return -1;
    return a.localeCompare(b);
  });
  
  sortedGroups.forEach(group => {
    const option = document.createElement('option');
    // 修复：使用显示名称作为value，确保筛选逻辑一致
    const displayName = window.groupNames && window.groupNames[group] ? window.groupNames[group] : group;
    option.value = displayName;
    option.textContent = displayName;
    groupFilter.appendChild(option);
  });
  
  console.log(`✅ 小组筛选选项已更新，共${sortedGroups.length}个小组`);
}

// 筛选跟踪列表（优化版：不依赖groupNames映射）
window.filterTrackingList = function filterTrackingList() {
  if (!groupFilter) return;
  
  const selectedGroup = groupFilter.value;
  const allRows = sundayTrackingList.querySelectorAll('tr');
  
  let visibleCount = 0;
  let hiddenCount = 0;
  
  allRows.forEach(row => {
    if (row.querySelector('td')) {
      const groupCell = row.querySelector('td:nth-child(2)');
      if (groupCell) {
        const groupName = groupCell.textContent.trim();
        // 优化：直接比较小组名称，不依赖groupNames映射
        const shouldShow = !selectedGroup || groupName === selectedGroup;
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) {
          visibleCount++;
        } else {
          hiddenCount++;
        }
      }
    }
  });
  
  console.log(`🔍 筛选小组: ${selectedGroup || '全部'}, 显示: ${visibleCount}个, 隐藏: ${hiddenCount}个`);
  
  // 更新统计信息
  updateFilteredCount();
}

// 更新事件数量显示
function updateTrackingCount(count) {
  const trackingCountEl = document.getElementById('trackingCount');
  if (trackingCountEl) {
    trackingCountEl.textContent = count;
    console.log(`📊 事件数量更新: ${count}`);
  } else {
    console.error('❌ 事件数量控件未找到');
  }
}

// 更新筛选后的统计信息
function updateFilteredCount() {
  const visibleRows = sundayTrackingList.querySelectorAll('tr:not([style*="display: none"])');
  const visibleCount = Array.from(visibleRows).filter(row => row.querySelector('td')).length;
  
  const trackingCountEl = document.getElementById('trackingCount');
  if (trackingCountEl) {
    const selectedGroup = groupFilter ? groupFilter.value : '';
    if (selectedGroup) {
      trackingCountEl.textContent = `${visibleCount} (${groupNames[selectedGroup] || selectedGroup})`;
    } else {
      trackingCountEl.textContent = visibleCount;
    }
  }
}

// 获取当前显示的跟踪列表
function getCurrentTrackingList() {
  const allRows = sundayTrackingList.querySelectorAll('tr');
  const currentList = [];
  
  allRows.forEach(row => {
    if (row.querySelector('td') && row.style.display !== 'none') {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        currentList.push({
          memberName: cells[0].textContent.trim(),
          group: cells[1].textContent.trim(),
          consecutiveAbsences: cells[2].textContent.trim(),
          lastAttendanceDate: cells[3].textContent.trim()
        });
      }
    }
  });
  
  return currentList;
}

// 按小组分组跟踪数据
function groupTrackingByGroup(trackingList) {
  const grouped = {};
  
  trackingList.forEach(item => {
    const group = item.group;
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(item);
  });
  
  return grouped;
}

// 生成导出内容
function generateExportContent(groupedData) {
  let content = `主日跟踪记录导出\n`;
  content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += `总事件数：${Object.values(groupedData).reduce((sum, group) => sum + group.length, 0)}\n\n`;
  
  Object.keys(groupedData).sort().forEach(group => {
    const groupData = groupedData[group];
    content += `=== ${group} ===\n`;
    content += `事件数量：${groupData.length}\n\n`;
    
    groupData.forEach((item, index) => {
      content += `${index + 1}. 姓名：${item.memberName}\n`;
      content += `   连续缺勤：${item.consecutiveAbsences}\n`;
      content += `   最后签到：${item.lastAttendanceDate}\n\n`;
    });
    
    content += '\n';
  });
  
  return content;
}

// 显示跟踪列表（内部函数，供其他函数调用）
function displayTrackingList(trackingList) {
    if (!sundayTrackingList) {
      console.error('主日跟踪列表元素未找到');
      return;
    }
    
    sundayTrackingList.innerHTML = '';
    
    if (trackingList.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="5" style="text-align: center; color: #666;">暂无跟踪记录</td>';
      sundayTrackingList.appendChild(row);
      return;
    }
    
    // 排序：第一关键词组别，第二关键词连续缺勤次数（降序），第三关键词姓名
    const sortedList = trackingList.sort((a, b) => {
      // 第一关键词：组别
      if (a.group !== b.group) {
        // 确保"group0"排在第一
        if (a.group === 'group0') return -1;
        if (b.group === 'group0') return 1;
        return a.group.localeCompare(b.group);
      }
      
      // 第二关键词：连续缺勤次数（降序）
      if (a.consecutiveAbsences !== b.consecutiveAbsences) {
        return b.consecutiveAbsences - a.consecutiveAbsences;
      }
      
      // 第三关键词：姓名
      return a.memberName.localeCompare(b.memberName);
    });
    
    sortedList.forEach((item, index) => {
      const row = document.createElement('tr');
      
      // 根据事件类型和状态设置不同的样式
      let rowClass = '';
      let statusText = '';
      let buttonHtml = '';
      
      if (item.eventType === 'extended_absence') {
        rowClass = 'extended-absence-row';
      } else if (item.eventType === 'severe_absence') {
        rowClass = 'severe-absence-row';
      } else {
        rowClass = 'normal-absence-row';
      }
      
      // 根据事件状态设置样式和按钮
      if (item.status === 'terminated') {
        rowClass += ' terminated-event';
        statusText = ' (已终止)';
        buttonHtml = `
          <button class="detail-btn" onclick="viewEventDetail('${item.recordId || item.memberUUID}')" title="查看详情">查看详情</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')" title="个人页面">个人页面</button>
          <button class="forward-btn" onclick="forwardToExternalForm('${item.recordId || item.memberUUID}')" title="转发到外部表单">转发</button>
          <button class="fetch-btn" onclick="fetchExternalFormData('${item.recordId || item.memberUUID}')" title="抓取外部数据">抓取</button>
        `;
      } else {
        buttonHtml = `
          <button class="detail-btn" onclick="viewEventDetail('${item.recordId || item.memberUUID}')" title="查看详情">查看详情</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')" title="个人页面">个人页面</button>
          <button class="forward-btn" onclick="forwardToExternalForm('${item.recordId || item.memberUUID}')" title="转发到外部表单">转发</button>
          <button class="fetch-btn" onclick="fetchExternalFormData('${item.recordId || item.memberUUID}')" title="抓取外部数据">抓取</button>
        `;
      }
      
      // 计算缺勤周数范围显示
      const weekRange = getAbsenceWeekRange(item.trackingStartDate, item.consecutiveAbsences);
      const absenceDisplay = weekRange ? `(${weekRange})` : '';
      
      row.className = rowClass;
      row.innerHTML = `
        <td>${item.memberName}${statusText}</td>
        <td>${groupNames[item.originalGroup || item.group] || (item.originalGroup || item.group)}</td>
        <td>${item.consecutiveAbsences}次 <span class="event-type">${absenceDisplay}</span></td>
        <td>${item.lastAttendanceDate ? window.utils.formatDateForDisplay(item.lastAttendanceDate) : '无'}</td>
        <td class="action-buttons">
          ${buttonHtml}
        </td>
      `;
      
      sundayTrackingList.appendChild(row);
    });
  }
