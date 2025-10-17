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
