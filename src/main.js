/**
 * 签到页面主文件 (main.js)
 * 功能：人员签到、新增成员、数据管理
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 浏览器扩展错误处理 ====================
// 处理浏览器扩展连接错误，避免控制台错误日志
window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('Could not establish connection')) {
    // 忽略浏览器扩展连接错误
    event.preventDefault();
    return false;
  }
});

// 处理未捕获的Promise错误
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message && event.reason.message.includes('Could not establish connection')) {
    // 忽略浏览器扩展连接错误
    event.preventDefault();
    return false;
  }
});

// ==================== 全局变量和初始化 ====================
let app, db;
// 使用NewDataManager设置的全局变量，如果没有则使用默认值
let groups = window.groups || {};
let groupNames = window.groupNames || {};
let attendanceRecords = window.attendanceRecords || [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let groupSelect, memberSelect, memberSearch, suggestions;
let signinButton, addNewcomerButton, dailyReportButton, adminButton;
let addMemberForm, newGroupSelect, newMemberName, newMemberPhone;
let saveNewMemberButton, cancelNewMemberButton;
let earlyList, onTimeList, lateList;

document.addEventListener('DOMContentLoaded', () => {
  // 初始化Firebase
  initializeFirebase();
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 加载数据
  loadData();
  
  // 初始化事件监听器
  initializeEventListeners();
});

// ==================== Firebase初始化 ====================
function initializeFirebase() {
  try {
    app = firebase.app();
    db = firebase.database();
    // 设置全局变量，供utils.js使用
    window.db = db;
  } catch (error) {
    if (window.firebaseConfig) {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      // 设置全局变量，供utils.js使用
      window.db = db;
    } else {
      console.error('Firebase配置未找到');
      alert('Firebase配置错误，请检查config.js文件');
    }
  }
}

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('main');
    console.log('主页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  groupSelect = document.getElementById('groupSelect');
  memberSelect = document.getElementById('memberSelect');
  memberSearch = document.getElementById('memberSearch');
  suggestions = document.getElementById('suggestions');
  signinButton = document.getElementById('signinButton');
  addNewcomerButton = document.getElementById('addNewcomerButton');
  dailyReportButton = document.getElementById('dailyReportButton');
  adminButton = document.getElementById('adminButton');
  addMemberForm = document.getElementById('addMemberForm');
  newGroupSelect = document.getElementById('newGroupSelect');
  newMemberName = document.getElementById('newMemberName');
  newMemberPhone = document.getElementById('newMemberPhone');
  saveNewMemberButton = document.getElementById('saveNewMemberButton');
  cancelNewMemberButton = document.getElementById('cancelNewMemberButton');
  earlyList = document.getElementById('earlyList');
  onTimeList = document.getElementById('onTimeList');
  lateList = document.getElementById('lateList');
}

// ==================== 数据加载和管理 ====================
async function loadData() {
  try {
    // 使用新数据管理器加载数据
    console.log("正在连接Firebase数据库...");
    if (window.newDataManager) {
      const success = await window.newDataManager.loadAllDataFromFirebase();
      if (success) {
        // 创建同步按钮
        window.newDataManager.createSyncButton();
        console.log("✅ 新数据管理器初始化完成");
        
        // 从新数据管理器获取数据
        groups = window.groups || {};
        groupNames = window.groupNames || {};
        attendanceRecords = window.attendanceRecords || [];
        
        // 调试：检查从NewDataManager获取的数据
        console.log('🔍 调试 - 从NewDataManager获取的数据:', {
          'window.groups': window.groups ? Object.keys(window.groups) : 'undefined',
          'window.groupNames': window.groupNames ? Object.keys(window.groupNames) : 'undefined',
          'window.attendanceRecords': window.attendanceRecords ? window.attendanceRecords.length : 'undefined'
        });
        
        console.log('📊 数据加载完成:', {
          groups: Object.keys(groups).length,
          groupNames: Object.keys(groupNames).length,
          attendanceRecords: attendanceRecords.length
        });
        
        // 调试：检查全局变量是否正确设置
        console.log('🔍 调试 - 全局变量状态:', {
          'window.groups': window.groups ? Object.keys(window.groups) : 'undefined',
          'window.groupNames': window.groupNames ? Object.keys(window.groupNames) : 'undefined',
          'window.attendanceRecords': window.attendanceRecords ? window.attendanceRecords.length : 'undefined'
        });
      } else {
        console.log("❌ 新数据管理器初始化失败，使用备用方案");
        await loadDataFromFirebase();
        return;
      }
    } else {
      console.log("❌ 新数据管理器未加载，使用备用方案");
      await loadDataFromFirebase();
      return;
    }

    // 确保未分组组别存在
    if (!groups['未分组']) {
      groups['未分组'] = [];
    }

    // 加载小组和成员
    loadGroupsAndMembers();
    loadMembers(groupSelect ? groupSelect.value : '');
    
    // 加载签到记录
    loadAttendanceRecords();
    
    // 初始化姓名检索控件
    initNameSearch();
    
  } catch (error) {
    console.error("数据加载失败:", error);
  }
}

/**
 * 初始化示例数据
 * 检查并初始化Firebase中的基础数据结构
 * 包括默认组别和组别名称映射
 */
async function initializeSampleData() {
    try {
      // 确保Firebase应用已初始化
      if (!firebase.apps.length) {
        console.log('Firebase应用未初始化，跳过示例数据初始化');
        return;
      }
      
      const groupsRef = firebase.database().ref('groups');
      const groupNamesRef = firebase.database().ref('groupNames');
      const groupsSnapshot = await groupsRef.once('value');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      
      let needsUpdate = false;
      
      // 检查是否需要初始化数据
      if (!groupsSnapshot.exists() || Object.keys(groupsSnapshot.val() || {}).length === 0) {
        console.log("初始化示例数据...");
        await window.utils.safeSyncToFirebase(window.sampleData.groups, 'groups');
        await window.utils.safeSyncToFirebase(window.sampleData.groupNames, 'groupNames');
        console.log("示例数据初始化完成！");
        needsUpdate = true;
      } else {
        // 检查是否需要添加缺失的组别（如未分组）
        const existingGroups = groupsSnapshot.val() || {};
        const existingGroupNames = groupNamesSnapshot.val() || {};
        
        if (!existingGroups['未分组'] || !existingGroupNames['未分组']) {
          console.log("添加缺失的组别...");
          
          // 添加未分组组别
          if (!existingGroups['未分组']) {
            await firebase.database().ref('groups').update({ '未分组': [] });
            console.log("已添加未分组组别");
          }
          
          // 添加未分组名称映射
          if (!existingGroupNames['未分组']) {
            await firebase.database().ref('groupNames').update({ '未分组': '未分组' });
            console.log("已添加未分组名称映射");
          }
          
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // 更新本地存储
        const updatedGroups = await window.dataManager.loadGroups();
        const updatedGroupNames = await window.dataManager.loadGroupNames();
        localStorage.setItem('msh_groups', JSON.stringify(updatedGroups));
        localStorage.setItem('msh_groupNames', JSON.stringify(updatedGroupNames));
      }
      
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      // 首先初始化示例数据（如果需要）
      await initializeSampleData();

      // 使用统一数据管理器加载数据
      groups = await window.dataManager.loadGroups();
      groupNames = await window.dataManager.loadGroupNames();
      attendanceRecords = await window.dataManager.loadAttendanceRecords();

      // 为所有人员添加UUID（如果还没有）
      if (window.utils && window.utils.addUUIDsToMembers) {
        const updatedGroups = window.utils.addUUIDsToMembers(groups);
        if (JSON.stringify(updatedGroups) !== JSON.stringify(groups)) {
          groups = updatedGroups;
          console.log('为现有人员添加了UUID');
          
          // 立即保存到本地存储和Firebase
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          try {
            await db.ref('groups').set(groups);
            console.log('UUID已同步到Firebase');
          } catch (error) {
            console.error('同步UUID到Firebase失败:', error);
          }
        }

        // 为签到记录添加人员UUID关联
        const updatedRecords = window.utils.addMemberUUIDsToAttendanceRecords(attendanceRecords, groups);
        if (JSON.stringify(updatedRecords) !== JSON.stringify(attendanceRecords)) {
          attendanceRecords = updatedRecords;
          console.log('为现有签到记录添加了人员UUID关联');
          
          // 立即保存到本地存储和Firebase
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          try {
            await db.ref('attendanceRecords').set(attendanceRecords);
            console.log('签到记录UUID已同步到Firebase');
          } catch (error) {
            console.error('同步签到记录UUID到Firebase失败:', error);
          }
        }
      } else {
        console.log('utils.js未加载，跳过UUID处理');
      }

      // 更新全局变量
      window.groups = groups;
      window.groupNames = groupNames;
      window.attendanceRecords = attendanceRecords;

      // 确保未分组组别存在
      let needsSync = false;
      if (!groups.hasOwnProperty('未分组')) {
        groups['未分组'] = [];
        needsSync = true;
      } else {
        console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
      }
      
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
        needsSync = true;
      }
      
      // 如果需要同步，立即同步到Firebase
      if (needsSync) {
        try {
          // 使用update方式，避免覆盖其他数据
          const db = firebase.database();
          await db.ref('groups').update({ '未分组': [] });
          await db.ref('groupNames').update({ '未分组': '未分组' });
          console.log("未分组组别已直接同步到Firebase");
        } catch (error) {
          console.error("同步未分组组别到Firebase失败:", error);
        }
      }

      // 确保所有成员都有nickname字段
      Object.keys(groups).forEach(group => {
        groups[group].forEach(member => {
          if (!member.hasOwnProperty('nickname')) {
            member.nickname = '';
          }
        });
      });


      // 保存到本地存储
      localStorage.setItem('msh_groups', JSON.stringify(groups));
      localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
      localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));

      loadGroupsAndMembers();
      loadMembers(groupSelect ? groupSelect.value : '');
      loadAttendanceRecords();
      initNameSearch(); // 初始化姓名检索控件
      
      // 启动数据同步监听
      initializeDataSync();
      
      console.log("Firebase数据加载成功");
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
      console.log("Firebase连接失败，使用本地存储作为备选方案");
      
      // 备选方案：使用本地存储
      loadFromLocalStorage();
    }
  }

  // 数据同步初始化（已禁用，使用NewDataManager）
  function initializeDataSync() {
    console.log("主页面正在连接Firebase数据库...");
    
    // 已禁用旧的数据同步监听器，使用NewDataManager
    if (false && window.utils && window.utils.dataSyncManager) {
      window.utils.dataSyncManager.startListening((dataType, data) => {
        console.log(`主页面收到${dataType}数据更新:`, data);
        
        // 使用页面同步管理器处理数据
        if (pageSyncManager) {
          const localData = getLocalData(dataType);
          const mergedData = pageSyncManager.syncData(localData, data, dataType);
          
          // 更新本地数据
          updateLocalData(dataType, mergedData);
        } else {
          // 降级到基础同步
          updateLocalData(dataType, data);
        }
      });
      
      console.log('主页面数据同步监听已启动');
    } else {
      console.log('数据同步管理器已禁用，使用NewDataManager');
    }
  }

  // 获取本地数据
  function getLocalData(dataType) {
    switch (dataType) {
      case 'attendanceRecords':
        return attendanceRecords;
      case 'groups':
        return groups;
      case 'groupNames':
        return groupNames;
      default:
        return null;
    }
  }

  // 更新本地数据
  function updateLocalData(dataType, data) {
    switch (dataType) {
      case 'attendanceRecords':
        if (data && Array.isArray(data)) {
          attendanceRecords = data;
          window.attendanceRecords = attendanceRecords;
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          loadAttendanceRecords(); // 重新加载签到记录显示
        }
        break;
        
      case 'groups':
        if (data && typeof data === 'object') {
          groups = data;
          window.groups = groups;
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          loadGroupsAndMembers(); // 重新加载小组和成员显示
          loadTodayNewcomers(); // 更新当日新朋友显示
        }
        break;
        
      case 'groupNames':
        if (data && typeof data === 'object') {
          groupNames = data;
          window.groupNames = groupNames;
          localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
          loadGroupsAndMembers(); // 重新加载小组显示
        }
        break;
    }
  }

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      // 从本地存储加载数据
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
        // 确保所有成员都有nickname字段
        Object.keys(groups).forEach(group => {
          groups[group].forEach(member => {
            if (!member.hasOwnProperty('nickname')) {
              member.nickname = '';
            }
          });
        });
      } else {
        // 如果没有本地数据，使用示例数据
        groups = window.sampleData.groups;
        localStorage.setItem('msh_groups', JSON.stringify(groups));
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
      } else {
        groupNames = window.sampleData.groupNames;
        localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
      }


      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
      }

      loadGroupsAndMembers();
      loadMembers(groupSelect ? groupSelect.value : '');
      loadAttendanceRecords();
      initNameSearch(); // 初始化姓名检索控件
      
      console.log("已切换到本地存储模式");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  // 安全同步数据到Firebase
  async function syncToFirebase() {
    try {
      const db = firebase.database();
      if (groups && Object.keys(groups).length > 0) {
        await db.ref('groups').set(groups);
        console.log("✅ groups数据已直接同步到Firebase");
      }
      if (groupNames && Object.keys(groupNames).length > 0) {
        await db.ref('groupNames').set(groupNames);
        console.log("✅ groupNames数据已直接同步到Firebase");
      }
      if (attendanceRecords && attendanceRecords.length > 0) {
        await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
      }
      console.log("数据已安全同步到Firebase");
    } catch (error) {
      console.error("安全同步到Firebase失败:", error);
    }
  }


  function loadGroupsAndMembers() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      
      // 调试：检查groups变量的实际内容
      console.log('🔍 调试 - loadGroupsAndMembers中的groups:', groups);
      console.log('🔍 调试 - loadGroupsAndMembers中的groupNames:', groupNames);
      console.log('🔍 调试 - window.groups:', window.groups);
      
      // 确保所有在groupNames中的小组都在groups中存在（但不要覆盖现有数据）
      Object.keys(groupNames).forEach(groupName => {
        if (!groups.hasOwnProperty(groupName)) {
          groups[groupName] = []; // 只创建不存在的小组
          console.log(`创建新的空小组: ${groupName}`);
        } else {
          console.log(`小组 ${groupName} 已存在，成员数量: ${groups[groupName].length}`);
        }
      });
      
      // 按字母顺序排序小组，"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        // 如果groupNames中没有对应的名称，使用group作为显示名称
        option.textContent = groupNames[group] || group;
        groupSelect.appendChild(option);
      });
    }
    if (newGroupSelect) {
      newGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      // 按字母顺序排序小组，"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        // 如果groupNames中没有对应的名称，使用group作为显示名称
        option.textContent = groupNames[group] || group;
        newGroupSelect.appendChild(option);
      });
    }
  }

  function loadMembers(group) {
    if (memberSelect) {
      memberSelect.innerHTML = '<option value="">--请选择成员--</option>';
      if (groups[group]) {
        // 按姓名字母顺序排序
        const sortedMembers = window.utils.sortMembersByName(groups[group]);
        sortedMembers.forEach(member => {
          const option = document.createElement('option');
          option.value = member.name;
          option.textContent = member.name;
          memberSelect.appendChild(option);
        });
      }
    }
  }

  function getAttendanceType(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // 早到：9:20之前 (0:00 - 9:20)
    if (timeInMinutes < 9 * 60 + 20) return 'early';
    
    // 准时：9:30之前 (9:20 - 9:30)
    if (timeInMinutes < 9 * 60 + 30) return 'onTime';
    
    // 迟到：10:40之前 (9:30 - 10:40)
    if (timeInMinutes < 10 * 60 + 40) return 'late';
    
    // 下午和晚上签到：10:40之后
    if (timeInMinutes >= 10 * 60 + 40) return 'afternoon';
    
    return 'invalid';
  }

  function loadAttendanceRecords() {
    const today = window.utils.getTodayString();
    console.log('📊 加载签到记录:', {
      today: today,
      totalRecords: attendanceRecords.length,
      records: attendanceRecords.slice(0, 3) // 显示前3条记录作为示例
    });
    
    // 显示所有签到记录（仅上午，过滤掉下午和晚上）
    const todayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.time).toLocaleDateString('zh-CN');
      const attendanceType = getAttendanceType(new Date(record.time));
      return recordDate === today && attendanceType !== 'afternoon';
    });
    
    console.log('📊 今日签到记录:', {
      todayRecords: todayRecords.length,
      records: todayRecords.slice(0, 3) // 显示前3条记录作为示例
    });
    
    // 获取表格容器
    const tablesContainer = document.querySelector('.tables-container');
    
    // 如果没有今天的签到记录，隐藏整个表格容器
    if (todayRecords.length === 0) {
      if (tablesContainer) {
        tablesContainer.style.display = 'none';
      }
      return;
    }
    
    // 显示表格容器，使用flex布局
    if (tablesContainer) {
      tablesContainer.style.display = 'flex';
    }
    
    // 按时间段分类记录并按时间排序
    const earlyRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'early')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    const onTimeRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'onTime')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    const lateRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'late')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // 显示早到签到名单 (9:20之前)
    const earlyTable = document.getElementById('earlyTable');
    if (earlyTable) {
      earlyTable.style.display = 'table'; // 始终显示表格
      earlyList.innerHTML = '';
      if (earlyRecords.length > 0) {
        earlyRecords.forEach(record => {
          const row = document.createElement('tr');
          // 使用快照数据，确保显示的是签到时的真实信息
          const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          const displayName = window.utils.getDisplayName(memberInfo);
          
          row.innerHTML = `
            <td>${displayGroup}</td>
            <td>${displayName}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          earlyList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">😴</span>
              <span class="empty-text">暂无早到记录</span>
            </div>
          </td>
        `;
        earlyList.appendChild(emptyRow);
      }
    }
    
    // 显示准时签到名单 (9:30之前)
    const onTimeTable = document.getElementById('onTimeTable');
    if (onTimeTable) {
      onTimeTable.style.display = 'table'; // 始终显示表格
      onTimeList.innerHTML = '';
      if (onTimeRecords.length > 0) {
        onTimeRecords.forEach(record => {
          const row = document.createElement('tr');
          // 使用快照数据，确保显示的是签到时的真实信息
          const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          const displayName = window.utils.getDisplayName(memberInfo);
          
          row.innerHTML = `
            <td>${displayGroup}</td>
            <td>${displayName}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          onTimeList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">⏰</span>
              <span class="empty-text">暂无准时记录</span>
            </div>
          </td>
        `;
        onTimeList.appendChild(emptyRow);
      }
    }
    
    // 显示迟到签到名单 (10:40之前)
    const lateTable = document.getElementById('lateTable');
    if (lateTable) {
      lateTable.style.display = 'table'; // 始终显示表格
      lateList.innerHTML = '';
      if (lateRecords.length > 0) {
        lateRecords.forEach(record => {
          const row = document.createElement('tr');
          // 使用快照数据，确保显示的是签到时的真实信息
          const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
          const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
          const displayName = window.utils.getDisplayName(memberInfo);
          
          row.innerHTML = `
            <td>${displayGroup}</td>
            <td>${displayName}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          lateList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">⏳</span>
              <span class="empty-text">暂无迟到记录</span>
            </div>
          </td>
        `;
        lateList.appendChild(emptyRow);
      }
    }
    
    
    // 加载当日新增人员
    loadTodayNewcomers();
    
    // 更新签到人数统计
    updateSigninCount();
  }

  // 加载当日新增人员
  function loadTodayNewcomers() {
    const newcomerList = document.getElementById('newcomerList');
    const newcomerSection = document.querySelector('.newcomer-section');
    if (!newcomerList || !newcomerSection) return;
    
    const today = window.utils.getTodayString();
    const todayNewcomers = [];
    
    // 查找当日新增的成员（只有通过"新朋友"按钮添加的人员）
    Object.keys(groups).forEach(group => {
      if (groups[group]) {
        groups[group].forEach(member => {
          if (member.joinDate) {
            // 只有通过"新朋友"按钮添加的人员才显示在当日新增人员表中
            if (window.utils.isTodayNewcomer(member)) {
              todayNewcomers.push({
                ...member,
                group: group
              });
            }
          }
        });
      }
    });
    
    // 如果没有新增人员，隐藏整个表格
    if (todayNewcomers.length === 0) {
      newcomerSection.style.display = 'none';
      return;
    }
    
    // 显示表格并填充数据
    newcomerSection.style.display = 'block';
    newcomerList.innerHTML = '';
    todayNewcomers.forEach(member => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[member.group] || member.group}</td>
        <td>${member.name}</td>
      `;
      newcomerList.appendChild(row);
    });
  }

  // 更新签到人数统计
  function updateSigninCount() {
    const signinCountElement = document.getElementById('signinCount');
    if (!signinCountElement) return;
    
    const today = window.utils.getTodayString();
    // 统计所有签到记录（仅上午，过滤掉下午和晚上）
    const todayRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.time).toLocaleDateString('zh-CN');
      const attendanceType = getAttendanceType(new Date(record.time));
      return recordDate === today && attendanceType !== 'afternoon';
    });
    
    signinCountElement.textContent = todayRecords.length;
  }

  // 初始化姓名检索控件
  function initNameSearch() {
    if (memberSearch && suggestions) {
      console.log('姓名检索控件已初始化');
      
      // 移除之前的事件监听器（如果存在）
      memberSearch.removeEventListener('input', handleNameSearch);
      
      // 添加新的事件监听器
      memberSearch.addEventListener('input', handleNameSearch);
    } else {
      console.error('姓名检索控件初始化失败:', { memberSearch, suggestions });
    }
  }
  
  // 姓名检索处理函数
  function handleNameSearch() {
    const query = memberSearch.value.toLowerCase();
    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
    if (query.length < 1) return;
    
    // 获取所有成员信息，包括组别
    const allMembers = [];
    Object.keys(groups).forEach(group => {
      groups[group].forEach(member => {
        allMembers.push({
          ...member,
          group: group
        });
      });
    });
    
    const matches = allMembers.filter(member => {
      // 支持多种可能的字段名
      const name = member.name || member.Name || member.姓名 || member.fullName;
      const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
      
      // 搜索姓名和花名
      const nameMatch = name && name.toLowerCase().includes(query);
      const nicknameMatch = nickname && nickname.trim() && nickname.toLowerCase().includes(query);
      
      return nameMatch || nicknameMatch;
    });
    
    if (matches.length > 0) {
      suggestions.style.display = 'block';
      matches.forEach(member => {
        const div = document.createElement('div');
        const name = member.name || member.Name || member.姓名 || member.fullName;
        const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
        
        div.innerHTML = `
          <span class="member-name">${name}${nickname ? ` (${nickname})` : ''}</span>
          <span class="member-group">(${groupNames[member.group] || member.group})</span>
        `;
        div.className = 'suggestion-item';
        div.addEventListener('click', () => {
          memberSearch.value = name;
          suggestions.style.display = 'none';
          
          // 自动填入小组和成员选择框
          if (groupSelect) {
            groupSelect.value = member.group;
            loadMembers(member.group);
          }
          if (memberSelect) {
            memberSelect.value = name;
          }
        });
        suggestions.appendChild(div);
      });
    }
  }

  if (groupSelect) {
    groupSelect.addEventListener('change', () => {
      loadMembers(groupSelect.value);
      if (memberSearch) memberSearch.value = '';
      if (suggestions) suggestions.style.display = 'none';
    });
  }

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 签到按钮事件
  if (signinButton) {
    signinButton.addEventListener('click', handleSignin);
  }

  // 小组选择事件
  if (groupSelect) {
    groupSelect.addEventListener('change', handleGroupChange);
  }

  // 成员选择事件
  if (memberSelect) {
    memberSelect.addEventListener('change', handleMemberChange);
  }

  // 姓名搜索事件
  if (memberSearch) {
    memberSearch.addEventListener('input', handleMemberSearch);
  }

  // 新增成员按钮事件
  if (addNewcomerButton) {
    addNewcomerButton.addEventListener('click', handleAddNewcomer);
  }

  // 保存新成员按钮事件
  if (saveNewMemberButton) {
    saveNewMemberButton.addEventListener('click', handleSaveNewMember);
  }

  // 取消新成员按钮事件
  if (cancelNewMemberButton) {
    cancelNewMemberButton.addEventListener('click', handleCancelNewMember);
  }

  // 日报表按钮事件
  if (dailyReportButton) {
    dailyReportButton.addEventListener('click', handleDailyReport);
  }

  // 管理页面按钮事件
  if (adminButton) {
    adminButton.addEventListener('click', handleAdminPage);
  }

  // 数据同步监听器（禁用，使用新数据管理器）
  // 注释掉旧的监听器，避免与新数据管理器冲突
  /*
  if (window.utils && window.utils.dataSyncManager) {
    window.utils.dataSyncManager.startListening((dataType, data) => {
      console.log(`收到${dataType}数据更新:`, data);
      
      switch (dataType) {
        case 'attendanceRecords':
          attendanceRecords = data;
          break;
        case 'groups':
          groups = data;
          loadGroupsAndMembers();
          break;
        case 'groupNames':
          groupNames = data;
          loadGroupsAndMembers();
          break;
      }
    });

    // 设置页面可见性监听
    window.utils.dataSyncManager.setupVisibilityListener(() => {
      console.log('页面重新可见，检查数据同步...');
      loadDataFromFirebase();
    });
  }
  */
}

// ==================== 其他事件处理函数 ====================
function handleGroupChange() {
  const selectedGroup = groupSelect.value;
  loadMembers(selectedGroup);
}

function handleMemberChange() {
  // 成员选择变化时的处理逻辑
  console.log('成员选择变化:', memberSelect.value);
}

function handleMemberSearch() {
  // 成员搜索处理逻辑
  const query = memberSearch.value.trim();
  if (query.length > 0) {
    showSuggestions(query);
  } else {
    hideSuggestions();
  }
}

// 显示建议列表
function showSuggestions(query) {
  if (!suggestions) return;
  
  const allMembers = [];
  Object.keys(groups).forEach(group => {
    groups[group].forEach(member => {
      allMembers.push({
        ...member,
        group: group
      });
    });
  });
  
  const matches = allMembers.filter(member => {
    const name = member.name || member.Name || member.姓名 || member.fullName;
    const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
    
    const nameMatch = name && name.toLowerCase().includes(query.toLowerCase());
    const nicknameMatch = nickname && nickname.trim() && nickname.toLowerCase().includes(query.toLowerCase());
    
    return nameMatch || nicknameMatch;
  });
  
  if (matches.length > 0) {
    suggestions.style.display = 'block';
    suggestions.innerHTML = '';
    matches.forEach(member => {
      const div = document.createElement('div');
      const name = member.name || member.Name || member.姓名 || member.fullName;
      const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
      
      div.innerHTML = `
        <span class="member-name">${name}${nickname ? ` (${nickname})` : ''}</span>
        <span class="member-group">(${groupNames[member.group] || member.group})</span>
      `;
      div.className = 'suggestion-item';
      div.addEventListener('click', () => {
        memberSearch.value = name;
        suggestions.style.display = 'none';
        
        // 自动填入小组和成员选择框
        if (groupSelect) {
          groupSelect.value = member.group;
          loadMembers(member.group);
        }
        if (memberSelect) {
          memberSelect.value = name;
        }
      });
      suggestions.appendChild(div);
    });
  } else {
    hideSuggestions();
  }
}

// 隐藏建议列表
function hideSuggestions() {
  if (suggestions) {
    suggestions.style.display = 'none';
    suggestions.innerHTML = '';
  }
}

function handleCancelNewMember() {
  // 取消新增成员
  if (addMemberForm) {
    addMemberForm.classList.add('hidden-form');
  }
  // 清空表单
  if (newMemberName) newMemberName.value = '';
  if (newMemberPhone) newMemberPhone.value = '';
  if (newGroupSelect) newGroupSelect.value = '';
}

function handleDailyReport() {
  // 跳转到日报表页面
  window.location.href = 'daily-report.html';
}

function handleAdminPage() {
  // 跳转到管理页面
  window.location.href = 'admin.html';
}

// ==================== 事件处理函数 ====================
async function handleSignin() {
  const group = groupSelect ? groupSelect.value : '';
  const member = memberSelect ? memberSelect.value : '';
  
  // 验证输入
  if (!group || !member) {
    alert('请选择小组和成员！');
    return;
  }

  const now = new Date();
  const timeSlot = getAttendanceType(now);
  const today = now.toLocaleDateString('zh-CN');
  
  // 检查签到时间有效性
  if (timeSlot === 'invalid') {
    alert('当前时间不允许签到！签到时间：上午9:20-10:40，下午和晚上10:40之后。');
    return;
  }
  
  // 检查重复签到
  if (isAlreadySignedIn(member, today, timeSlot)) {
    const timeSlotNames = {
      'early': '早到时段',
      'onTime': '准时时段', 
      'late': '迟到时段',
      'afternoon': '下午时段'
    };
    alert(`该成员在${timeSlotNames[timeSlot]}已签到，不能重复签到！`);
    return;
  }
  
  // 创建签到记录
  const record = createAttendanceRecord(group, member, now, timeSlot);
  
  // 保存记录
  await saveAttendanceRecord(record);
  
  // 更新界面
  loadAttendanceRecords();
  clearSelections();
  
  alert('签到成功！');
}

// 检查是否已签到（基于UUID的精确检查）
function isAlreadySignedIn(member, today, timeSlot) {
  // 首先尝试通过UUID检查
  const memberInfo = groups[groupSelect.value]?.find(m => m.name === member);
  if (memberInfo && memberInfo.uuid) {
    return attendanceRecords.some(record => {
      const recordUUID = record.memberUUID || record.name; // 兼容旧数据
      const recordDate = new Date(record.time).toLocaleDateString('zh-CN');
      const recordTimeSlot = getAttendanceType(new Date(record.time));
      
      return recordUUID === memberInfo.uuid && 
             recordDate === today && 
             recordTimeSlot === timeSlot;
    });
  }
  
  // 如果没有UUID，降级使用姓名检查
  return attendanceRecords.some(record => 
    record.name === member && 
    new Date(record.time).toLocaleDateString('zh-CN') === today &&
    getAttendanceType(new Date(record.time)) === timeSlot
  );
}

// 创建签到记录
function createAttendanceRecord(group, member, now, timeSlot) {
  const memberInfo = groups[group].find(m => m.name === member);
  
  // 确保人员有UUID
  if (memberInfo && !memberInfo.uuid) {
    memberInfo.uuid = window.utils.generateMemberUUID(memberInfo);
    console.log(`为人员 ${memberInfo.name} 生成UUID: ${memberInfo.uuid}`);
  }
  
  return {
    // 基本信息
    group,
    name: member,
    memberUUID: memberInfo?.uuid || '', // 添加人员UUID
    time: now.toLocaleString('zh-CN'),
    timeSlot,
    
    // 完整的人员信息快照（防止后续修改影响历史记录）
    memberSnapshot: {
      uuid: memberInfo?.uuid || '', // 添加UUID到快照
      id: memberInfo?.id || '',
      name: memberInfo?.name || member,
      nickname: memberInfo?.nickname || '',
      gender: memberInfo?.gender || '',
      phone: memberInfo?.phone || '',
      baptized: memberInfo?.baptized || '',
      age: memberInfo?.age || '',
      joinDate: memberInfo?.joinDate || ''
    },
    
    // 小组信息快照
    groupSnapshot: {
      groupId: group,
      groupName: groupNames[group] || group
    },
    
    // 记录创建时间戳
    createdAt: now.getTime(),
    
    // 记录ID（用于唯一标识）
    recordId: `att_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// 保存签到记录
async function saveAttendanceRecord(record) {
  // 添加到本地数组
  attendanceRecords.push(record);
  
  // 使用新数据管理器保存和标记变更
  if (window.newDataManager) {
    window.newDataManager.saveToLocalStorage('attendanceRecords', attendanceRecords);
    // 数据变更检测会自动检测到变更，无需手动标记
    console.log('✅ 签到记录已保存，数据变更检测将自动识别');
  } else {
    // 降级到本地存储
    localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
    console.log('✅ 签到记录已保存到本地存储');
  }
}

// 清空选择
function clearSelections() {
  if (groupSelect) groupSelect.value = '';
  if (memberSelect) memberSelect.value = '';
  if (memberSearch) memberSearch.value = '';
  if (suggestions) suggestions.style.display = 'none';
}

// 生成成员ID
function generateMemberId(group, name) {
  if (window.utils && window.utils.generateMemberId) {
    return window.utils.generateMemberId(group, name);
  } else {
    // 简单的ID生成逻辑
    const prefix = getGroupPrefix(group);
    const memberCount = groups[group] ? groups[group].length : 0;
    return prefix + String(memberCount + 1).padStart(3, '0');
  }
}

// 获取小组前缀
function getGroupPrefix(group) {
  const prefixMap = {
    '乐清1组': 'AB',
    '乐清2组': 'AC', 
    '乐清3组': 'AD',
    '美团组': 'AE',
    '木山后': 'AF',
    '七里港': 'AG',
    '琼娜组': 'AH',
    '陈薛尚': 'AI',
    '未分组': 'AJ',
    '培茹组': 'AK'
  };
  return prefixMap[group] || 'AX';
}

// 处理新增成员按钮点击
function handleAddNewcomer() {
  if (addMemberForm) {
    if (addMemberForm.classList.contains('hidden-form')) {
      addMemberForm.classList.remove('hidden-form');
    } else {
      addMemberForm.classList.add('hidden-form');
    }
  }
}

// 处理保存新成员
async function handleSaveNewMember() {
  const group = newGroupSelect.value;
  const name = newMemberName.value.trim();
  const phone = newMemberPhone.value.trim();
  const gender = document.getElementById('newMemberGender')?.value || '';
  const baptized = document.getElementById('newMemberBaptized')?.value || '';
  const age = document.getElementById('newMemberAge')?.value || '';
  
  // 验证输入数据
  const memberData = {
    name: name,
    phone: phone,
    gender: gender,
    baptized: baptized,
    age: age,
    nickname: ''
  };

  const validation = window.securityManager.validateMemberData(memberData);
  if (!validation.valid) {
    alert('数据验证失败：\n' + validation.errors.join('\n'));
    return;
  }

  const groupValidation = window.securityManager.validateGroupName(group);
  if (!groupValidation.valid) {
    alert('小组验证失败：' + groupValidation.error);
    return;
  }
  
  // 检查手机号码重复
  if (validation.cleanedMember.phone && window.utils.IdentifierManager.checkPhoneExists(validation.cleanedMember.phone, groups)) {
    alert('手机号码已存在！\n请使用不同的手机号码。');
    return;
  }
  
  const newMember = validation.cleanedMember;
  newMember.joinDate = new Date().toISOString();
  newMember.addedViaNewcomerButton = true;
  
  // 生成成员ID
  newMember.id = generateMemberId(group, newMember.name);
  
  // 生成UUID
  if (window.utils && window.utils.generateMemberUUID) {
    newMember.uuid = window.utils.generateMemberUUID(newMember);
    console.log(`为新朋友 ${newMember.name} 生成UUID: ${newMember.uuid}`);
  }
  
  // 添加到小组
  if (!groups.hasOwnProperty(group)) groups[group] = [];
  groups[group].push(newMember);
  
  // 使用新数据管理器保存和标记变更
  if (window.newDataManager) {
    // 更新全局变量
    window.groups = groups;
    
    window.newDataManager.saveToLocalStorage('groups', groups);
    window.newDataManager.markDataChange('groups', 'added', newMember.uuid);
    
    // 生成当日新增人员快照
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    window.newDataManager.addDailyNewcomer(today, newMember.name, now, expiresAt);
    
    console.log(`✅ 新朋友 ${newMember.name} 已添加到小组 ${group}，当前成员数: ${groups[group].length}`);
  } else {
    // 降级到本地存储
    localStorage.setItem('msh_groups', JSON.stringify(groups));
  }
  
  // 清空表单
  newGroupSelect.value = '';
  newMemberName.value = '';
  newMemberPhone.value = '';
  if (document.getElementById('newMemberGender')) document.getElementById('newMemberGender').value = '';
  if (document.getElementById('newMemberBaptized')) document.getElementById('newMemberBaptized').value = '';
  if (document.getElementById('newMemberAge')) document.getElementById('newMemberAge').value = '';
  if (addMemberForm) addMemberForm.classList.add('hidden-form');
  
  // 更新界面
  loadGroupsAndMembers();
  loadMembers(group);
  loadTodayNewcomers(); // 更新当日新朋友显示
  alert('新朋友已成功添加！请点击右上角同步按钮同步到云端。');
}

  // 新数据管理器初始化已移至loadData函数中

  // 数据同步逻辑已在initializeEventListeners中处理

  // 新数据管理器会自动处理页面关闭时的数据清理

    // 同步按钮由新数据管理器创建

    // 拦截页面跳转链接
    document.addEventListener('click', async (event) => {
      const link = event.target.closest('a');
      if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
        event.preventDefault();
        
        // 检查是否需要同步
        if (window.utils && window.utils.PageNavigationSync) {
          const syncSuccess = await window.utils.PageNavigationSync.syncBeforeNavigation(link.href);
          if (syncSuccess) {
            window.location.href = link.href;
          }
        } else {
          window.location.href = link.href;
        }
      }
    });