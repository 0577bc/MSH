        }
      });
      console.log('数据同步监听已启动');
    }
  } catch (error) {
    console.error('启动数据同步监听失败:', error);
  }
}

// ==================== 主日跟踪功能 ====================

// 加载主日跟踪数据（优化版）
function loadSundayTracking(preserveFilters = false, skipFullReload = false, forceRefresh = false) {
  const pageLoadStartTime = performance.now();
  console.log('🚀 开始加载主日跟踪页面（优化版）');
  
  try {
    // 如果强制刷新，清除缓存
    if (forceRefresh) {
      console.log('🔄 强制刷新，清除缓存');
      if (window.unifiedCacheManager) {
        window.unifiedCacheManager.clearAll();
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
        return;
      }
    }
    
    // 优化：检查是否有跟踪记录数据，如果有则直接生成事件列表
    const existingTrackingRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
    if (existingTrackingRecords && existingTrackingRecords.length > 0) {
      console.log('🔧 检测到跟踪记录数据，直接生成事件列表');
      console.log(`📊 跟踪记录数量: ${existingTrackingRecords.length}个`);
      
      // 直接生成事件列表，不依赖基础数据
      const eventList = generateUltraLightEventList();
      
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
      
      return;
    }
    
    // 检查基础数据是否已加载
    if (!window.groups || !window.attendanceRecords) {
      console.log('⏳ 等待基础数据加载完成...');
      // 等待基础数据加载
      const checkDataLoaded = setInterval(() => {
        if (window.groups && window.attendanceRecords) {
          clearInterval(checkDataLoaded);
          console.log('✅ 基础数据加载完成，继续加载事件列表');
          loadSundayTracking(preserveFilters, skipFullReload, forceRefresh);
        }
      }, 100);
      return;
    }
    
    // 优化：检查是否只需要跟踪记录数据
    if (!window.utils || !window.utils.SundayTrackingManager) {
      console.log('⏳ 等待SundayTrackingManager加载完成...');
      const checkManagerLoaded = setInterval(() => {
        if (window.utils && window.utils.SundayTrackingManager) {
          clearInterval(checkManagerLoaded);
          console.log('✅ SundayTrackingManager加载完成，继续加载事件列表');
          loadSundayTracking(preserveFilters, skipFullReload, forceRefresh);
        }
      }, 100);
      return;
    }
    
    // 显示加载指示器
    showLoadingIndicator();
    
    // 异步生成极简事件列表（避免阻塞UI）
    setTimeout(() => {
      try {
        const eventList = generateUltraLightEventList();
        
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
    }, 10); // 10ms延迟，让UI先渲染
    
  } catch (error) {
    console.error('❌ 加载主日跟踪页面失败:', error);
    alert('加载跟踪数据失败，请重试！');
  }
}

// 生成极简事件列表（真正的极简版本 - 只拉取数据，不计算）
function generateUltraLightEventList() {
  console.log('🔍 生成极简事件列表（只拉取数据）');
  const startTime = performance.now();
  
  // 只获取已存在的事件记录，不进行任何计算
  if (!window.utils || !window.utils.SundayTrackingManager) {
    console.error('❌ SundayTrackingManager未找到');
    return [];
  }
  
  // 直接获取已存在的事件记录，不调用generateTrackingList（避免计算）
  const existingEvents = window.utils.SundayTrackingManager.getTrackingRecords();
  console.log(`📊 获取已存在事件数量: ${existingEvents.length}`);
  
  // 只过滤已终止的事件（排除人员事件应该在生成阶段直接跳过，不生成）
  const filteredEvents = existingEvents.filter(event => {
    // 过滤已终止的事件
    if (event.status === 'terminated') {
      console.log(`🚫 过滤已终止事件: ${event.memberName}(${event.group}) - 不显示`);
      return false;
    }
    
    return true;
  });
  
  console.log(`📊 过滤后事件数量: ${filteredEvents.length}个 (过滤掉${existingEvents.length - filteredEvents.length}个)`);
  
  // 转换为极简事件列表格式（优化版：使用快照信息）
  const eventList = filteredEvents.map((item, index) => ({
    eventId: item.recordId || `event_${item.memberUUID}_${index}`,
    memberUUID: item.memberUUID,
    memberName: item.memberName,
    group: item.group,
    // 优化：使用快照中的显示名称，如果没有则使用group
    groupDisplayName: item.groupDisplayName || item.group,
    eventType: item.eventType || 'extended_absence',
    status: item.status || 'active',
    consecutiveAbsences: item.consecutiveAbsences,
    lastAttendanceDate: item.lastAttendanceDate,
    trackingStartDate: item.trackingStartDate,
    // 优化：使用快照中的成员信息
    memberSnapshot: item.memberSnapshot || {
      uuid: item.memberUUID,
      name: item.memberName,
      group: item.group
    },
    lastUpdateTime: new Date().toISOString()
  }));
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  console.log(`✅ 极简事件列表生成完成，耗时: ${processingTime.toFixed(2)}ms，事件数量: ${eventList.length}`);
  
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
function displayEventList(eventList) {
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
      <td>${item.lastAttendanceDate || '无'}</td>
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
function loadSundayTrackingLegacy(preserveFilters = false, skipFullReload = false, forceRefresh = false) {
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
      const trackingList = trackingManager.generateTrackingList();
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
    const trackingList = trackingManager.generateTrackingList();
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
function filterTrackingList() {
  if (!groupFilter) return;
  
  const selectedGroup = groupFilter.value;
  const allRows = sundayTrackingList.querySelectorAll('tr');
  
  console.log(`🔍 筛选小组: ${selectedGroup}`);
  
  allRows.forEach(row => {
    if (row.querySelector('td')) {
      const groupCell = row.querySelector('td:nth-child(2)');
      if (groupCell) {
        const groupName = groupCell.textContent.trim();
        // 优化：直接比较小组名称，不依赖groupNames映射
        const shouldShow = !selectedGroup || groupName === selectedGroup;
        row.style.display = shouldShow ? '' : 'none';
        console.log(`  ${groupName}: ${shouldShow ? '显示' : '隐藏'}`);
      }
    }
  });
  
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

  // 显示跟踪列表
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
