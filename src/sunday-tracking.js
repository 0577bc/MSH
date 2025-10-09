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
let backToSummaryButton, exportButton;
let sundayTrackingSection, sundayTrackingList, groupFilter;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  // 检查Firebase SDK是否已加载，如果没有则等待
  if (typeof firebase === 'undefined') {
    console.log('⏳ 等待Firebase SDK加载...');
    await waitForFirebase();
  }
  
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = db;
    console.log('✅ 主日跟踪页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 主日跟踪页面Firebase初始化失败');
    return false;
  }
}

// 等待Firebase SDK加载
async function waitForFirebase(maxAttempts = 10, delay = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof firebase !== 'undefined') {
      console.log('✅ Firebase SDK已加载');
      return true;
    }
    console.log(`⏳ 等待Firebase SDK加载... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.error('❌ Firebase SDK加载超时');
  return false;
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
      console.log('🔍 小组筛选变更:', groupFilter.value);
      filterTrackingList();
    });
    console.log('✅ 小组筛选事件监听器已绑定');
  } else {
    console.error('❌ 小组筛选控件未找到');
  }
  
  // 添加刷新按钮事件监听器
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      console.log('🔄 用户点击刷新按钮');
      loadSundayTracking(false, false, true); // 强制刷新
    });
  }

  // 添加查看已终止事件按钮事件监听器
  const showTerminatedButton = document.getElementById('showTerminatedButton');
  if (showTerminatedButton) {
    showTerminatedButton.addEventListener('click', () => {
      console.log('📋 用户点击查看已终止事件按钮');
      showTerminatedEvents();
    });
    console.log('✅ 查看已终止事件按钮事件监听器已绑定');
  } else {
    console.error('❌ 查看已终止事件按钮未找到');
  }

  // 添加显示所有事件按钮事件监听器
  const showAllButton = document.getElementById('showAllButton');
  if (showAllButton) {
    showAllButton.addEventListener('click', () => {
      console.log('📊 用户点击显示所有事件按钮');
      showAllEvents();
    });
    console.log('✅ 显示所有事件按钮事件监听器已绑定');
  } else {
    console.error('❌ 显示所有事件按钮未找到');
  }

  // 添加转发历史按钮事件监听器
  const showForwardHistoryButton = document.getElementById('showForwardHistoryButton');
  if (showForwardHistoryButton) {
    showForwardHistoryButton.addEventListener('click', () => {
      console.log('📤 用户点击转发历史按钮');
      showForwardHistory();
    });
    console.log('✅ 转发历史按钮事件监听器已绑定');
  } else {
    console.error('❌ 转发历史按钮未找到');
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
    
    // excludedMembers 已迁移到成员标记，不再需要单独加载
    console.log('✅ 排除人员使用成员标记模式（member.excluded）');
    
    // 优化：检查是否只需要跟踪记录数据（不依赖基础数据）
    console.log('🔧 优化版数据加载：检查跟踪记录数据');
    
    // 检查是否有跟踪记录数据
    const existingTrackingRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
    if (existingTrackingRecords && existingTrackingRecords.length > 0) {
      console.log('✅ 使用现有跟踪记录数据，跳过基础数据加载');
      console.log(`📊 现有跟踪记录: ${existingTrackingRecords.length}个`);
      // 修复：确保groupNames已加载，然后继续执行后续流程
      console.log('🔧 确保groupNames已加载，继续执行事件列表生成流程');
      
      // 确保groupNames已加载
      if (!window.groupNames) {
        console.log('🔧 加载groupNames数据...');
        try {
          const groupNamesSnapshot = await db.ref('groupNames').once('value');
          if (groupNamesSnapshot.exists()) {
            window.groupNames = groupNamesSnapshot.val() || {};
            console.log('✅ groupNames已加载');
          } else {
            console.log('⚠️ Firebase中没有groupNames数据');
            window.groupNames = {};
          }
        } catch (error) {
          console.error('❌ 加载groupNames失败:', error);
          window.groupNames = {};
        }
      }
      
      // 继续执行事件列表生成
      await loadSundayTracking();
      return;
    }
    
    // 如果全局缓存数据完整，使用缓存（保持兼容性）
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
    
    // 优化：优先加载跟踪记录数据，基础数据按需加载
    console.log('🔧 优化版：优先加载跟踪记录数据');
    
    // 从Firebase加载跟踪记录数据
    await loadTrackingRecordsFromFirebase();
    
    // 检查是否还需要基础数据（仅在必要时加载）
    const trackingRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
    if (!trackingRecords || trackingRecords.length === 0) {
      console.log('⚠️ 无跟踪记录数据，需要加载基础数据生成事件');
      await loadDataFromFirebase();
    } else {
      console.log('✅ 有跟踪记录数据，跳过基础数据加载');
    }
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    console.log('Using local storage as fallback');
    loadDataFromLocalStorage();
  }
}

// 从Firebase加载跟踪记录数据
// 优化版：懒加载跟踪记录，只在需要时加载
async function loadTrackingRecordsFromFirebase() {
  if (!db) {
    console.log('⚠️ Firebase未初始化，跳过跟踪记录加载');
    return;
  }
  
  try {
    console.log('🔧 优化版：懒加载跟踪记录数据...');
    
    // 检查是否已有跟踪记录数据
    const existingRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
    if (existingRecords && existingRecords.length > 0) {
      console.log('✅ 已有跟踪记录数据，但为了确保同步，仍从Firebase加载最新数据');
      // 不直接返回，继续从Firebase加载以确保数据同步
    }
    
    // 只加载主跟踪记录，个人跟踪记录按需加载
    console.log('🔄 从Firebase加载主跟踪记录数据...');
    
    // 修复：从正确的路径加载数据（sundayTracking）
    const trackingSnapshot = await db.ref('sundayTracking').once('value');
    if (trackingSnapshot.exists()) {
      const trackingRecords = trackingSnapshot.val() || [];
      
      // 确保是数组格式
      const trackingRecordsArray = Array.isArray(trackingRecords) ? trackingRecords : Object.values(trackingRecords);
      console.log(`📊 从Firebase加载跟踪记录: ${trackingRecordsArray.length}个`);
      
      // 保存到localStorage（使用正确的键名）
      localStorage.setItem('msh_sunday_tracking', JSON.stringify(trackingRecordsArray));
      console.log('✅ 主跟踪记录已从Firebase加载并保存到localStorage');
    } else {
      console.log('📋 Firebase中没有主跟踪记录数据');
    }
    
    // 个人跟踪记录改为懒加载，不在此处加载
    console.log('🔧 个人跟踪记录将按需懒加载');
    
    console.log('✅ 跟踪记录数据加载完成');
  } catch (error) {
    console.error('❌ 从Firebase加载跟踪记录失败:', error);
  }
}

// 新增：懒加载个人跟踪记录
async function loadPersonalTrackingFromFirebase(memberUUID) {
  if (!db) {
    console.log('⚠️ Firebase未初始化，跳过个人跟踪记录加载');
    return null;
  }
  
  try {
    console.log(`🔧 懒加载个人跟踪记录: ${memberUUID}`);
    
    // 检查缓存
    const cacheKey = `msh_personal_tracking_${memberUUID}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ 使用缓存的个人跟踪记录');
      return JSON.parse(cached);
    }
    
    // 从Firebase加载
    const personalTrackingSnapshot = await db.ref(`personalTracking/${memberUUID}`).once('value');
    if (personalTrackingSnapshot.exists()) {
      const personalTracking = personalTrackingSnapshot.val() || {};
      // 保存到localStorage缓存
      localStorage.setItem(cacheKey, JSON.stringify(personalTracking));
      console.log('✅ 个人跟踪记录已从Firebase加载并缓存');
      return personalTracking;
    } else {
      console.log('📋 Firebase中没有该成员的个人跟踪记录');
      return null;
    }
  } catch (error) {
    console.error('❌ 加载个人跟踪记录失败:', error);
    return null;
  }
}

async function loadDataFromFirebase() {
  if (!db) {
    throw new Error('Firebase数据库未初始化');
  }

  try {
    // 🚨 修复：Sunday跟踪只加载当天签到记录，不拉取全部历史数据
    const today = new Date().toISOString().split('T')[0];
    const attendanceSnapshot = await db.ref('attendanceRecords')
      .orderByChild('date')
      .equalTo(today)
      .once('value');
    if (attendanceSnapshot.exists()) {
      const todayData = attendanceSnapshot.val();
      attendanceRecords = todayData ? Object.values(todayData) : [];
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

// ==================== 事件详情功能 ====================

/**
 * 查看事件详情
 * 功能：跳转到事件详情页面
 * 作者：MSH系统
 * 版本：2.0
 */
function viewEventDetail(eventId) {
  try {
    console.log(`🔍 查看事件详情: ${eventId}`);
    
    // 构建详情页面URL
    const detailUrl = `tracking-event-detail.html?eventId=${eventId}`;
    
    // 跳转到详情页面
    window.location.href = detailUrl;
    
  } catch (error) {
    console.error('❌ 查看事件详情失败:', error);
    alert('查看详情失败：' + error.message);
  }
}

// ==================== 外部表单集成功能 ====================

/**
 * 获取外部表单认证token
 * 功能：获取外部表单系统的JWT认证token
 * 作者：MSH系统
 * 版本：2.0
 */
async function getExternalFormToken() {
  try {
    // 检查是否已有有效token
    if (window.externalFormConfig && window.externalFormConfig.auth.token) {
      // 简单检查token是否过期（这里可以添加更复杂的token验证）
      return window.externalFormConfig.auth.token;
    }
    
    // 登录获取新token
    const response = await fetch(`${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.login}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: window.externalFormConfig.auth.username,
        password: window.externalFormConfig.auth.password
      })
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.token) {
      // 缓存token
      window.externalFormConfig.auth.token = result.token;
      console.log('✅ 外部表单认证成功');
      return result.token;
    } else {
      throw new Error('登录响应中未包含token');
    }
    
  } catch (error) {
    console.error('❌ 获取外部表单token失败:', error);
    throw error;
  }
}

/**
 * 转发到外部表单
 * 功能：将事件信息转发到外部表单系统
 * 作者：MSH系统
 * 版本：2.0
 */
async function forwardToExternalFormInternal(eventId) {
  try {
    console.log(`🔄 开始转发事件到外部表单: ${eventId}`);
    showLoadingState('正在转发到外部表单...');
    
    // 检查外部表单功能是否启用
    if (!window.externalFormConfig || !window.externalFormConfig.features.enableForwarding) {
      throw new Error('外部表单转发功能未启用');
    }
    
    // 获取事件详情
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
    // 检查是否已经转发过
    if (eventRecord.forwarded === true) {
      const forwardDate = eventRecord.forwardDate ? new Date(eventRecord.forwardDate).toLocaleString('zh-CN') : '未知时间';
      const confirmResend = confirm(`该事件已于 ${forwardDate} 转发过！\n\n是否要重新转发？\n\n点击"确定"重新转发\n点击"取消"取消操作`);
      if (!confirmResend) {
        showNotification('已取消转发操作', 'info');
        return;
      }
    }
    
    // 获取认证token
    const token = await getExternalFormToken();
    if (!token) {
      throw new Error('无法获取外部表单认证token');
    }
    
    // 构建提交数据（符合后端API格式）
    const eventData = {
      formId: 'f4b20710-fed9-489f-955f-f9cbea48caac', // 使用第一个测试表单
      submissionData: {
        eventId: eventId,
        memberName: eventRecord.memberName || '未知成员',
        memberUUID: eventRecord.memberUUID || eventId,
        group: eventRecord.groupDisplayName || eventRecord.group || eventRecord.originalGroup || '未知组别',
        startDate: eventRecord.startDate || new Date().toISOString().split('T')[0],
        consecutiveAbsences: eventRecord.consecutiveAbsences || 0,
        source: 'msh-tracking',
        timestamp: new Date().toISOString(),
        // 添加UUID匹配验证标记
        uuidValidation: 'required',
        status: 'pending' // 初始状态为待接收
      }
    };
    
    // 发送事件到外部表单API（使用submissions端点）
    const response = await fetch(`${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.submissions}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📤 转发API响应:', result);
    
    if (result.message && result.message.includes('成功')) {
      // 更新事件记录的转发状态
      eventRecord.forwarded = true;
      eventRecord.forwardDate = new Date().toISOString();
      eventRecord.forwardStatus = 'success';
      eventRecord.forwardResponse = result;
      eventRecord.forwardStatus = 'pending'; // 标记为待接收状态
      eventRecord.uuidMatchRequired = true; // 标记需要UUID匹配
      
      // 保存更新后的事件记录
      const saveSuccess = window.utils.SundayTrackingManager.saveTrackingRecord(eventRecord);
      if (saveSuccess) {
        console.log('✅ 事件转发状态已更新');
      }
      
      showNotification('事件已转发到外部表单，等待UUID匹配确认！', 'success');
      console.log('✅ 转发到外部表单成功，状态：待接收');
      
      // 刷新页面显示，更新按钮状态
      setTimeout(() => {
        loadSundayTracking();
      }, 1000);
    } else {
      throw new Error(result.message || '转发失败');
    }
    
  } catch (error) {
    console.error('❌ 转发到外部表单失败:', error);
    showNotification('转发失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

/**
 * 抓取外部表单数据
 * 功能：从外部表单系统获取已填写的表单数据
 * 作者：MSH系统
 * 版本：2.0
 */
async function fetchExternalFormData(eventId) {
  try {
    console.log(`🔄 开始抓取外部表单数据: ${eventId}`);
    
    // 检查外部表单功能是否启用
    if (!window.externalFormConfig || !window.externalFormConfig.features.enableFetching) {
      throw new Error('外部表单抓取功能未启用');
    }
    
    // 显示加载状态
    showLoadingState('正在抓取外部表单数据...');
    
    // 获取认证token
    const token = await getExternalFormToken();
    if (!token) {
      throw new Error('无法获取外部表单认证token');
    }
    
    // 获取事件信息，确保只抓取对应事件的数据
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error(`事件记录未找到: ${eventId}`);
    }
    
    const memberUUID = eventRecord.memberUUID;
    console.log(`📋 抓取事件 ${eventId} 的外部表单数据，成员UUID: ${memberUUID}`);
    
    // 构建API请求 - 添加更多过滤参数确保只获取相关数据
    const apiUrl = `${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.submissions}?eventId=${eventId}&memberUUID=${memberUUID}&source=external-form`;
    console.log(`🌐 API请求URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📥 API响应:', result);
    
    // 处理返回的数据（可能是数组或对象）
    const submissions = result.submissions || result;
    
    if (submissions && submissions.length > 0) {
      // 处理抓取到的数据
      console.log(`📊 找到${submissions.length}条外部表单数据`);
      await processExternalFormData(eventId, submissions);
      showNotification(`外部表单数据抓取成功！共${submissions.length}条记录`, 'success');
    } else {
      showNotification('未找到相关的外部表单数据', 'warning');
    }
    
  } catch (error) {
    console.error('❌ 抓取外部表单数据失败:', error);
    showNotification('抓取失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

/**
 * 处理外部表单数据
 * 功能：将抓取到的外部表单数据保存到系统
 * 作者：MSH系统
 * 版本：2.0
 */
async function processExternalFormData(eventId, submissions) {
  try {
    console.log('🔄 处理外部表单数据:', submissions);
    
    // 如果是数组，处理每个提交
    if (!Array.isArray(submissions)) {
      submissions = [submissions];
    }
    
    // 获取事件信息
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error(`事件记录未找到: ${eventId}`);
    }
    
    const memberUUID = eventRecord.memberUUID;
    console.log(`📋 处理事件 ${eventId} 的跟踪记录，成员UUID: ${memberUUID}`);
    
    // 获取现有的个人跟踪记录，用于重复检测
    const existingRecords = await getExistingPersonalTrackingRecords(memberUUID);
    console.log(`📊 现有跟踪记录数量: ${existingRecords.length}`);
    
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const submission of submissions) {
      const data = submission.submissionData || submission;
      
      // 更宽松的数据验证 - 检查是否有任何有效内容
      const hasContent = data.trackingContent || data.content || data.notes || data.description || data.message;
      if (!hasContent) {
        console.warn('⚠️ 跳过无内容的数据:', submission);
        skippedCount++;
        continue;
      }
      
      // 检查是否已存在相同的记录（基于提交ID和内容）
      const isDuplicate = checkForDuplicateRecord(existingRecords, submission, data);
      if (isDuplicate) {
        console.log('🔄 跳过重复记录:', submission.id || 'unknown');
        skippedCount++;
        continue;
      }
      
      // 创建跟踪记录
      const trackingRecord = {
        eventId: eventId,
        memberUUID: memberUUID,
        trackingDate: data.trackingDate || new Date().toISOString().split('T')[0],
        content: data.trackingContent || data.content || data.notes || data.description || data.message || '',
        category: '外部表单',
        person: data.submitterName || data.personName || '外部填报',
        source: 'external-form',
        notes: `提交ID: ${submission.id || 'unknown'}\n状态: ${getTrackingStatusText(data.trackingStatus || 'pending')}\n原始数据: ${JSON.stringify(data)}`,
        externalSubmissionId: submission.id,
        createdAt: submission.createdAt || new Date().toISOString(),
        // 添加更多元数据
        originalData: data,
        submissionTime: submission.submittedAt || submission.createdAt || new Date().toISOString()
      };
      
      // 保存到Firebase
      try {
        if (!window.db) {
          console.warn('⚠️ Firebase数据库未初始化，跳过Firebase保存');
          savedCount++;
          continue;
        }
        
        // 保存到跟踪记录（与详情页面兼容的路径）
        const trackingRef = window.db.ref(`trackingRecords/${memberUUID}`);
        const newRecordRef = trackingRef.push();
        await newRecordRef.set(trackingRecord);
        
        // 同时保存到个人跟踪记录（用于个人页面）
        const personalTrackingRef = window.db.ref(`personalTracking/${memberUUID}`);
        const personalRecordRef = personalTrackingRef.push();
        await personalRecordRef.set(trackingRecord);
        
        console.log('✅ 跟踪记录已保存到Firebase:', trackingRecord);
        savedCount++;
        
        // 更新现有记录列表，避免重复检测
        existingRecords.push({
          key: newRecordRef.key,
          ...trackingRecord
        });
        
      } catch (error) {
        console.error('❌ 保存到Firebase失败:', error);
        throw error;
      }
    }
    
    if (savedCount > 0) {
      showNotification(`成功同步${savedCount}条记录到MSH系统！${skippedCount > 0 ? ` (跳过${skippedCount}条重复记录)` : ''}`, 'success');
      
      // 刷新页面显示
      await loadSundayTracking();
      
      console.log(`✅ 外部表单数据处理完成，共保存${savedCount}条记录，跳过${skippedCount}条重复记录`);
    } else {
      showNotification(`没有可同步的数据${skippedCount > 0 ? ` (${skippedCount}条重复记录已跳过)` : ''}`, 'warning');
    }
    
  } catch (error) {
    console.error('❌ 处理外部表单数据失败:', error);
    throw error;
  }
}

/**
 * 获取现有的个人跟踪记录
 * 功能：从Firebase获取指定成员的个人跟踪记录
 */
async function getExistingPersonalTrackingRecords(memberUUID) {
  try {
    if (!window.db) {
      console.warn('⚠️ Firebase数据库未初始化，返回空记录列表');
      return [];
    }
    
    // 从跟踪记录路径获取数据（与详情页面一致）
    const trackingRef = window.db.ref(`trackingRecords/${memberUUID}`);
    const snapshot = await trackingRef.once('value');
    const records = snapshot.val() || {};
    
    // 转换为数组格式
    const recordArray = Object.keys(records).map(key => ({
      key: key,
      ...records[key]
    }));
    
    console.log(`📊 获取到 ${recordArray.length} 条现有个人跟踪记录`);
    return recordArray;
    
  } catch (error) {
    console.error('❌ 获取现有个人跟踪记录失败:', error);
    return [];
  }
}

/**
 * 检查重复记录
 * 功能：检查新记录是否与现有记录重复
 */
function checkForDuplicateRecord(existingRecords, submission, data) {
  const submissionId = submission.id;
  const content = data.trackingContent || data.content || data.notes || data.description || data.message || '';
  
  // 检查是否有相同的外部提交ID
  if (submissionId) {
    const hasSameSubmissionId = existingRecords.some(record => 
      record.externalSubmissionId === submissionId
    );
    if (hasSameSubmissionId) {
      console.log(`🔄 发现相同提交ID的记录: ${submissionId}`);
      return true;
    }
  }
  
  // 检查是否有相同的内容（内容相似度检查）
  const hasSimilarContent = existingRecords.some(record => {
    const existingContent = record.content || '';
    // 简单的内容相似度检查（可以进一步优化）
    const similarity = calculateContentSimilarity(content, existingContent);
    return similarity > 0.8; // 80%以上相似度认为是重复
  });
  
  if (hasSimilarContent) {
    console.log(`🔄 发现相似内容的记录`);
    return true;
  }
  
  return false;
}

/**
 * 计算内容相似度
 * 功能：计算两个文本内容的相似度
 */
function calculateContentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  // 简单的相似度计算（基于共同字符）
  const set1 = new Set(text1.toLowerCase().split(''));
  const set2 = new Set(text2.toLowerCase().split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * 获取跟踪状态文本
 */
function getTrackingStatusText(status) {
  const statusMap = {
    'pending': '待处理',
    'contacted': '已联系',
    'followed': '持续跟进',
    'resolved': '已解决'
  };
  return statusMap[status] || status;
}

/**
 * 更新事件状态
 * 功能：更新事件的跟踪状态
 * 作者：MSH系统
 * 版本：2.0
 */
async function updateEventStatus(eventId, status) {
  try {
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到');
    }
    
    // 更新状态
    eventRecord.status = status;
    eventRecord.updatedAt = new Date().toISOString();
    
    // 保存更新
    const success = window.utils.SundayTrackingManager.saveTrackingRecord(eventRecord);
    if (!success) {
      throw new Error('更新事件状态失败');
    }
    
    console.log(`✅ 事件状态已更新为: ${status}`);
    
  } catch (error) {
    console.error('❌ 更新事件状态失败:', error);
    throw error;
  }
}

/**
 * 显示通知
 * 功能：显示操作结果通知
 * 作者：MSH系统
 * 版本：2.0
 */
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加样式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
  `;
  
  // 设置背景色
  const colors = {
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
