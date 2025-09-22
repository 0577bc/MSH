/**
 * MSH主日跟踪页面脚本 (sunday-tracking.js)
 * 功能：主日跟踪功能实现
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 全局变量 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let backToSummaryButton, backToSigninButton, exportButton;
let sundayTrackingSection, sundayTrackingList, groupFilter;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  try {
    app = firebase.app();
    db = firebase.database();
    // 设置全局变量，供utils.js使用
    window.db = db;
    console.log('✅ 使用已存在的Firebase应用');
    return true;
  } catch (error) {
    if (window.firebaseConfig) {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      // 设置全局变量，供utils.js使用
      window.db = db;
      console.log('✅ 创建新的Firebase应用');
      return true;
    } else {
      console.error('❌ Firebase配置未找到');
      return false;
    }
  }
}

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('sundayTracking');
    console.log('主日跟踪页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backToSummaryButton = document.getElementById('backToSummaryButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  exportButton = document.getElementById('exportButton');
  
  sundayTrackingSection = document.getElementById('sundayTrackingSection');
  sundayTrackingList = document.getElementById('sundayTrackingList');
  groupFilter = document.getElementById('groupFilter');
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backToSummaryButton) {
    backToSummaryButton.addEventListener('click', () => window.location.href = 'summary.html');
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', async () => {
      // 检查是否有未同步的数据
      if (window.newDataManager && window.newDataManager.hasLocalChanges) {
        const shouldSync = confirm('检测到未同步的数据！\n\n是否在返回前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接返回');
        if (shouldSync) {
          const syncSuccess = await window.newDataManager.performManualSync();
          if (!syncSuccess) {
            alert('同步失败，但将继续返回。请稍后手动同步数据。');
          }
        }
      }
      // 直接跳转到index页面，不使用history.back()
      window.location.href = 'index.html';
    });
  }


  // 导出按钮事件
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        // 获取当前显示的跟踪列表
        const currentTrackingList = getCurrentTrackingList();
        
        if (currentTrackingList.length === 0) {
          alert('没有跟踪记录可以导出！');
          return;
        }

        // 按小组分组
        const groupedData = groupTrackingByGroup(currentTrackingList);
        
        // 生成导出内容
        const exportContent = generateExportContent(groupedData);
        
        // 创建并下载文件
        const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `主日跟踪记录-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();

        alert('导出成功！');
      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请重试！');
      }
    });
  }
  
  // 小组筛选事件
  if (groupFilter) {
    groupFilter.addEventListener('change', () => {
      filterTrackingList();
    });
  }
  
  // 添加刷新按钮事件监听器
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      console.log('🔄 用户点击刷新按钮');
      loadSundayTracking(false, false, true); // 强制刷新
    });
  }

}

// ==================== 数据加载 ====================
async function loadData() {
  try {
    console.log('主日跟踪页面开始数据加载...');
    
    // 等待new-data-manager初始化完成
    if (window.newDataManager && !window.newDataManager.isDataLoaded) {
      console.log('等待new-data-manager初始化完成...');
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.newDataManager.isDataLoaded) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    // 确保excludedMembers被正确设置
    if (!window.excludedMembers) {
      console.log('🔧 window.excludedMembers未设置，尝试从localStorage加载...');
      try {
        const stored = localStorage.getItem('msh_excludedMembers');
        if (stored) {
          const data = JSON.parse(stored);
          window.excludedMembers = data;
          console.log('✅ 从localStorage加载excludedMembers:', data);
        } else {
          window.excludedMembers = {};
          console.log('✅ 设置excludedMembers为空对象');
        }
      } catch (error) {
        console.error('❌ 加载excludedMembers失败:', error);
        window.excludedMembers = {};
      }
    }
    
    // 优先使用全局缓存数据
    if (window.groups && window.attendanceRecords && window.groupNames) {
      console.log('✅ 使用全局缓存数据，跳过Firebase加载');
      groups = window.groups;
      attendanceRecords = window.attendanceRecords;
      groupNames = window.groupNames;
      
      // 更新UUID索引
      if (window.utils && window.utils.UUIDIndex) {
        window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
        window.utils.UUIDIndex.updateMemberIndex(groups);
      }
      
      console.log('主日跟踪页面数据从全局缓存加载成功');
      return;
    }
    
    // 如果全局数据不完整，尝试从Firebase加载
    console.log('全局缓存数据不完整，从Firebase加载...');
    await loadDataFromFirebase();
    
    // 从Firebase加载跟踪记录数据
    await loadTrackingRecordsFromFirebase();
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    console.log('Using local storage as fallback');
    loadDataFromLocalStorage();
  }
}

// 从Firebase加载跟踪记录数据
async function loadTrackingRecordsFromFirebase() {
  if (!db) {
    console.log('⚠️ Firebase未初始化，跳过跟踪记录加载');
    return;
  }
  
  try {
    console.log('🔄 开始从Firebase加载跟踪记录数据...');
    
    // 加载所有跟踪记录
    const trackingSnapshot = await db.ref('trackingRecords').once('value');
    if (trackingSnapshot.exists()) {
      const trackingRecords = trackingSnapshot.val() || {};
      // 保存到localStorage
      localStorage.setItem('msh_tracking_records', JSON.stringify(trackingRecords));
      console.log('✅ 跟踪记录已从Firebase加载并保存到localStorage');
    } else {
      console.log('📋 Firebase中没有跟踪记录数据');
    }
    
    // 加载个人跟踪记录
    const personalTrackingSnapshot = await db.ref('personalTracking').once('value');
    if (personalTrackingSnapshot.exists()) {
      const personalTracking = personalTrackingSnapshot.val() || {};
      // 保存到localStorage
      localStorage.setItem('msh_personal_tracking', JSON.stringify(personalTracking));
      console.log('✅ 个人跟踪记录已从Firebase加载并保存到localStorage');
    } else {
      console.log('📋 Firebase中没有个人跟踪记录数据');
    }
    
    console.log('✅ 跟踪记录数据加载完成');
  } catch (error) {
    console.error('❌ 从Firebase加载跟踪记录失败:', error);
  }
}

async function loadDataFromFirebase() {
  if (!db) {
    throw new Error('Firebase数据库未初始化');
  }

  try {
    // 加载签到记录
    const attendanceSnapshot = await db.ref('attendanceRecords').once('value');
    if (attendanceSnapshot.exists()) {
      attendanceRecords = attendanceSnapshot.val() || [];
      window.attendanceRecords = attendanceRecords; // 设置到全局变量
      console.log(`签到记录已加载: ${attendanceRecords.length} 条`);
    }

    // 加载小组数据
    const groupsSnapshot = await db.ref('groups').once('value');
    if (groupsSnapshot.exists()) {
      groups = groupsSnapshot.val() || {};
      window.groups = groups; // 设置到全局变量
      console.log('小组数据已加载');
    }

    // 加载小组名称映射
    const groupNamesSnapshot = await db.ref('groupNames').once('value');
    if (groupNamesSnapshot.exists()) {
      groupNames = groupNamesSnapshot.val() || {};
      window.groupNames = groupNames; // 设置到全局变量
      console.log('小组名称映射已加载');
    }

    // 更新UUID索引
    if (window.utils && window.utils.UUIDIndex) {
      window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
      window.utils.UUIDIndex.updateMemberIndex(groups);
    }

    console.log('主日跟踪页面数据加载成功');
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    throw error;
  }
}

function loadDataFromLocalStorage() {
  try {
    // 从本地存储加载数据
    const storedAttendance = localStorage.getItem('msh_attendance_records');
    if (storedAttendance) {
      attendanceRecords = JSON.parse(storedAttendance);
      window.attendanceRecords = attendanceRecords; // 设置到全局变量
    }

    const storedGroups = localStorage.getItem('msh_groups');
    if (storedGroups) {
      groups = JSON.parse(storedGroups);
      window.groups = groups; // 设置到全局变量
    }

    const storedGroupNames = localStorage.getItem('msh_group_names');
    if (storedGroupNames) {
      groupNames = JSON.parse(storedGroupNames);
      window.groupNames = groupNames; // 设置到全局变量
    }

    // 更新UUID索引
    if (window.utils && window.utils.UUIDIndex) {
      window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
      window.utils.UUIDIndex.updateMemberIndex(groups);
    }

    console.log('主日跟踪页面数据从本地存储加载成功');
  } catch (error) {
    console.error('从本地存储加载数据失败:', error);
  }
}

// ==================== 数据同步 ====================
function startListening() {
  if (!db) {
    console.error('Firebase数据库未初始化，无法启动数据同步');
    return;
  }

  try {
    if (window.utils && window.utils.dataSyncManager) {
      window.utils.dataSyncManager.startListening((dataType, data) => {
        console.log(`数据同步: ${dataType}`, data);
        
        // 获取本地数据
        let localData;
        switch (dataType) {
          case 'attendanceRecords':
            localData = attendanceRecords;
            break;
          case 'groups':
            localData = groups;
            break;
          case 'groupNames':
            localData = groupNames;
            break;
          default:
            return;
        }
        
        // 使用页面同步管理器处理数据
        if (pageSyncManager) {
          const mergedData = pageSyncManager.syncData(localData, data, dataType);
          
          // 更新本地数据
          switch (dataType) {
            case 'attendanceRecords':
              attendanceRecords = mergedData;
              window.attendanceRecords = attendanceRecords;
              if (window.utils && window.utils.UUIDIndex) {
                window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
              }
              loadSundayTracking();
              break;
            case 'groups':
              groups = mergedData;
              loadSundayTracking();
              break;
            case 'groupNames':
              groupNames = mergedData;
              loadSundayTracking();
              break;
          }
        } else {
          // 降级到简单更新
          switch (dataType) {
            case 'attendanceRecords':
              attendanceRecords = data || [];
              window.attendanceRecords = attendanceRecords;
              if (window.utils && window.utils.UUIDIndex) {
                window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
              }
              loadSundayTracking();
              break;
            case 'groups':
              groups = data || {};
              loadSundayTracking();
              break;
            case 'groupNames':
              groupNames = data || {};
              loadSundayTracking();
              break;
          }
        }
      });
      console.log('数据同步监听已启动');
    }
  } catch (error) {
    console.error('启动数据同步监听失败:', error);
  }
}

// ==================== 主日跟踪功能 ====================

// 加载主日跟踪数据
function loadSundayTracking(preserveFilters = false, skipFullReload = false, forceRefresh = false) {
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
    
    // 检查数据保留期限 - 已禁用自动清理功能
    // trackingManager.checkDataRetention();
    
    // 初始化数据保留管理 - 已禁用自动清理功能
    // if (!window.sundayTrackingInitialized) {
    //   trackingManager.initializeDataRetention();
    //   window.sundayTrackingInitialized = true;
    // }
    
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

// 更新小组筛选选项
function updateGroupFilterOptions(trackingList) {
  if (!groupFilter) return;
  
  // 获取所有小组
  const allGroups = new Set();
  trackingList.forEach(item => {
    if (item.group) {
      allGroups.add(item.group);
    }
  });
  
  // 清空现有选项（保留"全部小组"选项）
  groupFilter.innerHTML = '<option value="">--全部小组--</option>';
  
  // 添加小组选项，确保"未分组"排在最后
  const sortedGroups = Array.from(allGroups).sort((a, b) => {
    if (a === '未分组') return 1;
    if (b === '未分组') return -1;
    return a.localeCompare(b);
  });
  
  sortedGroups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = groupNames[group] || group;
    groupFilter.appendChild(option);
  });
}

// 筛选跟踪列表
function filterTrackingList() {
  if (!groupFilter) return;
  
  const selectedGroup = groupFilter.value;
  const allRows = sundayTrackingList.querySelectorAll('tr');
  
  allRows.forEach(row => {
    if (row.querySelector('td')) {
      const groupCell = row.querySelector('td:nth-child(2)');
      if (groupCell) {
        const groupName = groupCell.textContent.trim();
        const shouldShow = !selectedGroup || groupName === (groupNames[selectedGroup] || selectedGroup);
        row.style.display = shouldShow ? '' : 'none';
      }
    }
  });
  
  // 更新统计信息
  updateFilteredCount();
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
    const sortedList = trackingList.sort((a, b) => {
      // 第一关键词：组别
      if (a.group !== b.group) {
        // 确保"未分组"排在最后
        if (a.group === '未分组') return 1;
        if (b.group === '未分组') return -1;
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
          <button class="restart-btn" onclick="(async () => await restartEvent('${item.recordId || item.memberUUID}', '${item.memberName}'))()">重启事件</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')">个人页面</button>
        `;
      } else {
        buttonHtml = `
          <button class="resolve-btn" onclick="resolveTracking('${item.recordId || item.memberUUID}', '${item.memberName}')">跟踪</button>
          <button class="ignore-btn" onclick="(async () => await ignoreTracking('${item.recordId || item.memberUUID}', '${item.memberName}'))()">事件终止</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')">个人页面</button>
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
        <td>
          ${buttonHtml}
        </td>
      `;
      sundayTrackingList.appendChild(row);
    });
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

// 跟踪
function resolveTracking(recordId, memberName) {
  // 显示跟踪对话框
  const dialog = document.getElementById('resolveTrackingDialog');
  if (!dialog) {
    console.error('跟踪对话框未找到');
    return;
  }
  
  // 清空表单并设置默认日期
  document.getElementById('trackingDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('trackingContent').value = '';
  document.getElementById('trackingCategory').value = '';
  document.getElementById('trackingPerson').value = '';
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmResolve');
  const cancelBtn = document.getElementById('cancelResolve');
  
  const handleConfirm = () => {
    const date = document.getElementById('trackingDate').value;
    const content = document.getElementById('trackingContent').value.trim();
    const category = document.getElementById('trackingCategory').value;
    const person = document.getElementById('trackingPerson').value.trim();
    
    if (!date || !content || !category || !person) {
      alert('请填写所有必填字段！');
      return;
    }
    
    // 调用跟踪功能
    if (window.utils && window.utils.SundayTrackingManager) {
      // 获取记录ID对应的成员UUID
      const trackingRecord = window.utils.SundayTrackingManager.getTrackingRecord(recordId);
      const memberUUID = trackingRecord ? trackingRecord.memberUUID : recordId;
      
      const trackingData = {
        date: date,
        content: content,
        category: category,
        person: person,
        memberUUID: memberUUID,
        memberName: memberName,
        createdAt: new Date().toISOString()
      };
      
      const success = window.utils.SundayTrackingManager.addTrackingRecord(memberUUID, trackingData);
      
      if (success) {
        alert(`已记录 ${memberName} 的跟踪情况！`);
        dialog.classList.add('hidden-dialog');
        
        // 重新加载跟踪数据，保持筛选状态，跳过完整重新加载
        loadSundayTracking(true, true);
      } else {
        alert('记录跟踪情况失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
    
    // 移除事件监听器
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  const handleCancel = () => {
    dialog.classList.add('hidden-dialog');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

// 忽略跟踪
async function ignoreTracking(recordId, memberName) {
  console.log(`🔍 ignoreTracking被调用，记录ID: ${recordId}, 成员名称: ${memberName}`);
  
  // 显示忽略对话框
  const dialog = document.getElementById('ignoreTrackingDialog');
  if (!dialog) {
    console.error('忽略跟踪对话框未找到');
    return;
  }
  
  // 清空表单并设置默认日期
  document.getElementById('ignoreReason').value = '';
  document.getElementById('ignoreDate').value = new Date().toISOString().split('T')[0];
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmIgnore');
  const cancelBtn = document.getElementById('cancelIgnore');
  
  const handleConfirm = async () => {
    console.log(`🔍 确认终止按钮被点击`);
    
    const reason = document.getElementById('ignoreReason').value.trim();
    const date = document.getElementById('ignoreDate').value;
    
    console.log(`🔍 终止原因: ${reason}, 终止日期: ${date}`);
    
    if (!reason || !date) {
      alert('请填写终止原因和日期！');
      return;
    }
    
    // 调用忽略跟踪功能
    if (window.utils && window.utils.SundayTrackingManager) {
      // 获取记录ID对应的成员UUID
      const trackingRecord = window.utils.SundayTrackingManager.getTrackingRecord(recordId);
      const memberUUID = trackingRecord ? trackingRecord.memberUUID : recordId;
      
      console.log(`开始终止跟踪: ${memberName} (${memberUUID})`);
      
      const terminationRecord = {
        memberUUID: memberUUID,
        memberName: memberName,
        reason: reason,
        terminationDate: date,
        createdAt: new Date().toISOString()
      };
      
      console.log(`🔍 准备调用terminateTracking，记录ID: ${recordId}`);
      console.log(`🔍 终止记录详情:`, terminationRecord);
      
      const success = await window.utils.SundayTrackingManager.terminateTracking(recordId, terminationRecord);
      console.log(`🔍 终止跟踪结果: ${success}`);
      
      if (success) {
        alert(`已终止 ${memberName} 的跟踪事件！`);
        dialog.classList.add('hidden-dialog');
        
        // 重新加载跟踪数据，保持筛选状态，跳过完整重新加载
        loadSundayTracking(true, true);
      } else {
        alert('终止跟踪失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
    
    // 移除事件监听器
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  const handleCancel = () => {
    dialog.classList.add('hidden-dialog');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

// 重启事件
async function restartEvent(recordId, memberName) {
  console.log(`🔍 restartEvent被调用，记录ID: ${recordId}, 成员名称: ${memberName}`);
  
  if (confirm(`确定要重启 ${memberName} 的跟踪事件吗？`)) {
    if (window.utils && window.utils.SundayTrackingManager) {
      console.log(`开始重启事件: ${memberName} (${recordId})`);
      
      // 创建重启记录
      const restartRecord = {
        memberName: memberName,
        restartDate: new Date().toISOString().split('T')[0],
        reason: '手动重启',
        createdAt: new Date().toISOString()
      };
      
      const success = await window.utils.SundayTrackingManager.restartEvent(recordId, restartRecord);
      console.log(`🔍 重启事件结果: ${success}`);
      
      if (success) {
        alert(`已重启 ${memberName} 的跟踪事件！`);
        
        // 重新加载跟踪数据，保持筛选状态，跳过完整重新加载
        loadSundayTracking(true, true);
      } else {
        alert('重启事件失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
  }
}

// 查看个人页面
function viewPersonalPage(memberUUID) {
  window.location.href = `personal-page.html?uuid=${memberUUID}`;
}

// 将函数暴露到全局作用域
window.resolveTracking = resolveTracking;
window.ignoreTracking = ignoreTracking;
window.restartEvent = restartEvent;
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
