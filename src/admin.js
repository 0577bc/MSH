/**
 * 管理页面主文件 (admin.js)
 * 功能：小组管理、成员管理、数据导入导出
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 全局变量和初始化 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let backButton, summaryButton;

// 页面状态管理
let currentPageState = {
  selectedGroup: '',
  isGroupValid: false
};

// ==================== Firebase初始化 ====================
function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = db;
    console.log('✅ 管理页面Firebase初始化成功');
  } else {
    console.error('❌ 管理页面Firebase初始化失败');
    alert('Firebase配置错误，请检查config.js文件');
  }
}

// ==================== 页面同步管理器初始化 ====================
// initializePageSyncManager函数已移至utils.js，使用window.utils.initializePageSyncManager('admin')

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  groupSelect = document.getElementById('groupSelect');
  memberList = document.getElementById('memberList');
  addMemberButton = document.getElementById('addMemberButton');
  backButton = document.getElementById('backButton');
  summaryButton = document.getElementById('summaryButton');
  addGroupButton = document.getElementById('addGroupButton');
  addGroupForm = document.getElementById('addGroupForm');
  newGroupName = document.getElementById('newGroupName');
  saveGroupButton = document.getElementById('saveGroupButton');
  cancelGroupButton = document.getElementById('cancelGroupButton');
  deleteGroupButton = document.getElementById('deleteGroupButton');
  editGroupNameButton = document.getElementById('editGroupNameButton');
  editGroupForm = document.getElementById('editGroupForm');
  editGroupName = document.getElementById('editGroupName');
  saveEditGroupButton = document.getElementById('saveEditGroupButton');
  cancelEditGroupButton = document.getElementById('cancelEditGroupButton');
}

document.addEventListener('DOMContentLoaded', async () => {
  // 初始化Firebase
  initializeFirebase();
  
  // 初始化页面同步管理器
  pageSyncManager = window.utils.initializePageSyncManager('admin');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 使用新数据管理器加载数据
  // 等待NewDataManager初始化完成
  const initializeWithNewDataManager = async () => {
    try {
      // 先初始化Firebase（如果还没有初始化）
      if (!firebase.apps.length && window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('✅ 管理页面Firebase应用创建成功');
      }
      
      // 等待NewDataManager完全初始化
      let retryCount = 0;
      const maxRetries = 10;
      while (!window.newDataManager && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }
      
      if (!window.newDataManager) {
        throw new Error('NewDataManager初始化超时');
      }
      
      console.log('✅ 管理页面NewDataManager已就绪');
      
      // 等待NewDataManager完成数据加载
      let dataRetryCount = 0;
      const maxDataRetries = 20;
      while ((!window.groups || Object.keys(window.groups).length === 0) && dataRetryCount < maxDataRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        dataRetryCount++;
        console.log(`⏳ 等待NewDataManager数据加载完成... (${dataRetryCount}/${maxDataRetries})`);
      }
      
      // 从全局变量获取数据（NewDataManager设置的）
      groups = window.groups || {};
      groupNames = window.groupNames || {};
      attendanceRecords = window.attendanceRecords || [];
      // 确保excludedMembers是数组形式
      const excludedMembersData = window.excludedMembers || [];
      excludedMembers = Array.isArray(excludedMembersData) ? excludedMembersData : Object.values(excludedMembersData);
      
      console.log('🔍 管理页面数据检查:', {
        'groups': groups ? Object.keys(groups) : 'undefined',
        'groupNames': groupNames ? Object.keys(groupNames) : 'undefined',
        'attendanceRecords': attendanceRecords ? attendanceRecords.length : 'undefined',
        'excludedMembers': excludedMembers ? excludedMembers.length : 'undefined'
      });
      
      if (groups && Object.keys(groups).length > 0) {
        console.log(`✅ 管理页面从NewDataManager获取数据成功: groups=${Object.keys(groups).length}个小组, 总成员数=${Object.values(groups).reduce((sum, members) => sum + members.length, 0)}`);
        
        // 加载小组和成员
        loadGroups();
        loadMembers(groupSelect ? groupSelect.value : '');
        
        console.log("✅ 管理页面数据加载成功");
      } else {
        console.log('⚠️ NewDataManager数据未就绪，降级到旧的数据加载方式');
        throw new Error('NewDataManager设置的全局数据无效');
      }
    } catch (error) {
      console.error("❌ 管理页面NewDataManager数据加载失败:", error);
      // 降级到旧的数据加载方式
      loadData();
    }
  };
  
  // 检查NewDataManager是否已存在
  if (window.newDataManager) {
    initializeWithNewDataManager();
  } else {
    // 等待NewDataManager初始化
    console.log('⏳ 等待NewDataManager初始化...');
    const checkNewDataManager = setInterval(() => {
      if (window.newDataManager) {
        clearInterval(checkNewDataManager);
        initializeWithNewDataManager();
      }
    }, 100);
    
    // 5秒后超时，使用旧方式
    setTimeout(() => {
      if (!window.newDataManager) {
        clearInterval(checkNewDataManager);
        console.error("❌ NewDataManager初始化超时，使用旧的数据加载方式");
        loadData();
      }
    }, 5000);
  }
  
  // 初始化数据同步监听器（已移除，使用文件末尾的统一监听器）
  
  // 延迟初始化事件监听器，确保DOM完全加载
  setTimeout(() => {
    initializeEventListeners();
  }, 100);
  
  // 页面关闭前数据同步
  window.addEventListener('beforeunload', (event) => {
    if (window.utils && window.utils.dataSyncManager && window.utils.dataSyncManager.smartSync) {
      console.log('页面即将关闭，开始同步数据...');
      
      // 使用同步方式同步数据
      try {
        const db = firebase.database();
        
        // 同步groups数据
        const localGroups = localStorage.getItem('msh_groups');
        if (localGroups) {
          const groupsData = JSON.parse(localGroups);
          db.ref('groups').set(groupsData);
          console.log('groups数据已同步到远程');
        }
        
        // 同步attendanceRecords数据
        const localAttendance = localStorage.getItem('msh_attendanceRecords');
        if (localAttendance) {
          const attendanceData = JSON.parse(localAttendance);
          db.ref('attendanceRecords').set(attendanceData);
          console.log('attendanceRecords数据已同步到远程');
        }
        
        // 同步groupNames数据
        const localGroupNames = localStorage.getItem('msh_groupNames');
        if (localGroupNames) {
          const groupNamesData = JSON.parse(localGroupNames);
          db.ref('groupNames').set(groupNamesData);
          console.log('groupNames数据已同步到远程');
        }
        
        console.log('所有本地数据已同步到远程');
      } catch (error) {
        console.error('同步数据到远程失败:', error);
        event.preventDefault();
        event.returnValue = '数据同步失败，确定要离开吗？';
        return event.returnValue;
      }
    }
  });
});

// ==================== 数据加载和管理 ====================
function loadData() {
  try {
    // 确保Firebase已初始化
    if (!db) {
      console.log("Firebase未初始化，尝试重新初始化...");
      initializeFirebase();
    }
    
    // 加载数据
    loadDataFromFirebase();
  } catch (error) {
    console.error("❌ 管理页面数据加载失败:", error);
  }
}

// ==================== 返回导航机制 ====================
// 使用统一的导航工具

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 小组选择事件
  if (groupSelect) {
    groupSelect.addEventListener('change', handleGroupChange);
  }

  // 按钮事件
  // addMemberButton事件在initializeEventListeners中定义

  if (backButton) {
    backButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  if (summaryButton) {
    summaryButton.addEventListener('click', () => window.location.href = 'summary.html');
  }


  // 成员管理按钮事件
  const groupManagementButton = document.getElementById('groupManagementButton');
  if (groupManagementButton) {
    groupManagementButton.addEventListener('click', () => {
      window.location.href = 'group-management.html';
    });
  }


  // 删除管理按钮事件
  const deleteManagementButton = document.getElementById('deleteManagementButton');
  if (deleteManagementButton) {
    deleteManagementButton.addEventListener('click', () => {
      // 确认访问权限
      const confirmAccess = confirm('⚠️ 数据删除管理是危险操作！\n\n只有管理员才能访问此功能。\n确定要继续吗？');
      if (confirmAccess) {
        window.location.href = 'delete-management.html';
      }
    });
  }

  // 小组管理按钮事件
  if (addGroupButton) {
    addGroupButton.addEventListener('click', handleAddGroup);
  }

  if (saveGroupButton) {
    saveGroupButton.addEventListener('click', handleSaveGroup);
  }

  if (cancelGroupButton) {
    cancelGroupButton.addEventListener('click', handleCancelGroup);
  }

  // deleteGroupButton事件监听器在下面定义

  // editGroupNameButton事件监听器在下面定义

  // saveEditGroupButton事件监听器在下面定义

  // cancelEditGroupButton事件监听器在下面定义


  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 页面状态管理 ====================
  function updatePageState() {
    if (groupSelect) {
      currentPageState.selectedGroup = groupSelect.value;
      currentPageState.isGroupValid = currentPageState.selectedGroup && groups[currentPageState.selectedGroup];
    }
  }

// ==================== 事件处理函数 ====================
function handleGroupChange() {
  const selectedGroup = groupSelect.value;
  updatePageState();
  loadMembers(selectedGroup);
}

// handleAddMember函数已移动到initializeEventListeners中

function handleAddGroup() {
  if (addGroupForm) {
    addGroupForm.style.display = 'block';
  }
}

function handleSaveGroup() {
  // 保存新小组逻辑
}

function handleCancelGroup() {
  if (addGroupForm) {
    addGroupForm.style.display = 'none';
  }
  if (newGroupName) {
    newGroupName.value = '';
  }
}

// 已删除未使用的空函数：handleDeleteGroup, handleEditGroupName, handleSaveEditGroup, 
// handleCancelEditGroup, handleExport, handleImport

  // 恢复页面状态
  function restorePageState() {
    if (currentPageState.isGroupValid && groups[currentPageState.selectedGroup]) {
      // 如果之前选择的小组仍然存在，恢复到该小组
      if (groupSelect) {
        groupSelect.value = currentPageState.selectedGroup;
      }
      loadMembers(currentPageState.selectedGroup);
    } else {
      // 如果之前选择的小组不存在，重新加载小组列表
      loadGroups();
      if (groupSelect) {
        groupSelect.value = '';
      }
      if (memberList) {
        memberList.innerHTML = '';
      }
    }
  }

  // 为每个小组分配唯一的字母前缀
  function getGroupPrefix(groupId) {
    // 预定义的小组前缀映射，确保每个小组都有唯一的字母前缀
    const groupPrefixes = {
      '陈薛尚': 'AA',
      '乐清1组': 'AB', 
      '乐清2组': 'AC',
      '乐清3组': 'AD',
      '乐清4组': 'AE',
      '乐清5组': 'AF',
      '乐清6组': 'AG',
      '乐清7组': 'AH',
      '乐清8组': 'AI',
      '乐清9组': 'AJ',
      '乐清10组': 'AK',
      '美团组': 'AL',
      '未分组': 'AM'
    };
    
    // 如果小组名在预定义列表中，使用预定义前缀
    if (groupPrefixes[groupId]) {
      return groupPrefixes[groupId];
    }
    
    // 对于新小组，动态生成唯一前缀
    const usedPrefixes = new Set(Object.values(groupPrefixes));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // 找到第一个未使用的前缀
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const prefix = letters[i] + letters[j];
        if (!usedPrefixes.has(prefix)) {
          return prefix;
        }
      }
    }
    
    // 如果所有前缀都用完了，使用数字后缀
    return 'ZZ';
  }

  // 处理字段修改
  function handleFieldChange(input, group, memberIndex) {
    const field = input.dataset.field;
    const originalValue = input.dataset.original;
    const newValue = input.value;
    
    // 如果值没有变化，不需要处理
    if (newValue === originalValue) {
      return;
    }
    
    // 获取成员信息用于显示
    const member = groups[group][memberIndex];
    const memberName = member.name;
    const fieldNames = {
      'name': '姓名',
      'nickname': '花名',
      'gender': '性别',
      'phone': '联系方式',
      'baptized': '是否受洗',
      'age': '年龄段'
    };
    const fieldName = fieldNames[field] || field;
    
    // 验证手机号码
    if (field === 'phone' && newValue) {
      if (!window.utils.IdentifierManager.validatePhoneNumber(newValue)) {
        alert(`手机号码格式不正确！\n请输入正确的11位手机号码。`);
        input.value = originalValue; // 恢复原值
        return;
      }
      
      // 检查手机号码重复
      if (window.utils.IdentifierManager.checkPhoneExists(newValue, groups, member)) {
        alert(`手机号码已存在！\n请使用不同的手机号码。`);
        input.value = originalValue; // 恢复原值
        return;
      }
    }
    
    // 弹出确认对话框
    const confirmMessage = `确定要修改 ${memberName} 的${fieldName}吗？\n\n原值：${originalValue}\n新值：${newValue}`;
    
    if (confirm(confirmMessage)) {
      // 确认修改
      groups[group][memberIndex][field] = newValue;
      input.dataset.original = newValue; // 更新原始值
      
      // 保存数据
      saveData();
      
      // 记录日志
      if (window.systemLogger) {
        window.systemLogger.info(`修改成员信息: ${memberName} - ${fieldName}`, {
          group: group,
          member: memberName,
          field: fieldName,
          oldValue: originalValue,
          newValue: newValue
        });
      }
      
      console.log(`已修改 ${memberName} 的${fieldName}: ${originalValue} -> ${newValue}`);
    } else {
      // 取消修改，恢复原值
      input.value = originalValue;
    }
  }

  // 重新生成所有成员的序号（按姓名排序）
  function regenerateAllMemberIds() {
    const allGroups = Object.keys(groups);
    
    allGroups.forEach(groupId => {
      if (groups[groupId] && groups[groupId].length > 0) {
        const prefix = getGroupPrefix(groupId);
        
        // 按姓名排序
        const sortedMembers = window.utils.sortMembersByName([...groups[groupId]]);
        
        // 重新分配序号
        sortedMembers.forEach((member, index) => {
          const newId = prefix + String(index + 1).padStart(3, '0');
          member.id = newId;
        });
        
        // 更新原始数组顺序
        groups[groupId] = sortedMembers;
      }
    });
  }

  // 为单个成员生成序号（在添加新成员时使用）
  function generateMemberId(groupId, memberName) {
    const prefix = getGroupPrefix(groupId);
    const groupMembers = groups[groupId] || [];
    
    // 创建包含新成员的临时数组
    const tempMembers = [...groupMembers];
    if (memberName) {
      tempMembers.push({ name: memberName });
    }
    
    // 按姓名排序
    const sortedMembers = window.utils.sortMembersByName(tempMembers);
    
    // 找到新成员在排序后的位置
    const memberIndex = sortedMembers.findIndex(member => member.name === memberName);
    
    return prefix + String(memberIndex + 1).padStart(3, '0');
  }

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      if (!db) {
        console.log("Firebase数据库未初始化，尝试重新初始化...");
        initializeFirebase();
        if (!db) {
          throw new Error('Firebase数据库初始化失败');
        }
      }
      // 加载 groups
      const groupsRef = db.ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
      }

      // 加载 groupNames
      const groupNamesRef = db.ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
        // 清理无效的数字键
        cleanGroupNames();
      }

      // 确保未分组组别存在
      if (!groups.hasOwnProperty('未分组')) {
        groups['未分组'] = [];
        await db.ref('groups').update({ '未分组': [] });
        console.log("管理页面：已添加未分组组别");
      } else {
        console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
      }
      
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
        await db.ref('groupNames').update({ '未分组': '未分组' });
        console.log("管理页面：已添加未分组名称映射");
      }


      // 加载 attendanceRecords
      const attendanceRef = db.ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      // 为所有人员添加UUID（如果还没有）
      if (window.utils && window.utils.addUUIDsToMembers) {
        const updatedGroups = window.utils.addUUIDsToMembers(groups);
        if (JSON.stringify(updatedGroups) !== JSON.stringify(groups)) {
          groups = updatedGroups;
          console.log('管理页面：为现有人员添加了UUID');
        }

        // 为签到记录添加人员UUID关联
        const updatedRecords = window.utils.addMemberUUIDsToAttendanceRecords(attendanceRecords, groups);
        if (JSON.stringify(updatedRecords) !== JSON.stringify(attendanceRecords)) {
          attendanceRecords = updatedRecords;
          console.log('管理页面：为现有签到记录添加了人员UUID关联');
        }
      } else {
        console.log('管理页面：utils.js未加载，跳过UUID处理');
      }

      // 更新全局变量
      window.groups = groups;
      window.groupNames = groupNames;
      window.attendanceRecords = attendanceRecords;

      // 重新生成所有成员的序号（按姓名排序）
      regenerateAllMemberIds();
      
      loadGroups();
      loadMembers(groupSelect ? groupSelect.value : '');
      
      // 启动数据同步监听（已移除，使用文件末尾的统一监听器）
      
      console.log("Admin data loaded from Firebase");
    } catch (error) {
      console.error("Error loading admin data from Firebase:", error);
      console.log("Using local storage as fallback");
      loadFromLocalStorage();
    }
  }

  // 数据同步初始化（已移除，使用文件末尾的统一监听器）
  // initializeDataSync_DELETED函数已删除，现在使用NewDataManager

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
      } else {
        groups = window.sampleData.groups;
        localStorage.setItem('msh_groups', JSON.stringify(groups));
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
        // 清理无效的数字键
        cleanGroupNames();
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

      loadGroups();
      loadMembers(groupSelect ? groupSelect.value : '');
      console.log("Admin data loaded from local storage");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  // 安全同步数据到Firebase
  async function syncToFirebase() {
    try {
      if (!db) {
        throw new Error('Firebase数据库未初始化');
      }
      
      // 使用页面同步管理器进行智能同步
      if (pageSyncManager) {
        if (groups && Object.keys(groups).length > 0) {
          await pageSyncManager.forceSyncToRemote(groups, 'groups');
          console.log("✅ groups数据已通过PageSyncManager同步到Firebase");
        }
        if (groupNames && Object.keys(groupNames).length > 0) {
          await pageSyncManager.forceSyncToRemote(groupNames, 'groupNames');
          console.log("✅ groupNames数据已通过PageSyncManager同步到Firebase");
        }
        if (attendanceRecords && attendanceRecords.length > 0) {
          await pageSyncManager.forceSyncToRemote(attendanceRecords, 'attendanceRecords');
          console.log("✅ attendanceRecords数据已通过PageSyncManager同步到Firebase");
        }
      } else {
        // 降级到直接同步
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
      }
      console.log("Admin data safely synced to Firebase");
    } catch (error) {
      console.error("Safe sync to Firebase failed:", error);
    }
  }

  function loadGroups() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      
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
      console.log('loadGroups - 排序后的小组:', sortedGroups);
      console.log('loadGroups - groupNames:', groupNames);
      
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        // 如果groupNames中没有对应的名称，使用group作为显示名称
        const displayName = groupNames[group] || group;
        option.textContent = displayName;
        console.log('loadGroups - 添加选项:', group, '->', displayName);
        groupSelect.appendChild(option);
      });
    }
  }

  function loadMembers(group) {
    if (memberList) {
    memberList.innerHTML = '';
      if (groups[group]) {
        
        // 强制初始化所有成员的nickname字段
        groups[group].forEach((member, index) => {
          if (!member.hasOwnProperty('nickname')) {
            member.nickname = '';
          }
        });
        // 按姓名字母顺序排序，但保持原始索引
        const membersWithIndex = groups[group].map((member, originalIndex) => ({
          ...member,
          originalIndex
        }));
        const sortedMembers = window.utils.sortMembersByName(membersWithIndex);
        sortedMembers.forEach((member) => {
          // 确保成员有nickname字段（同时更新原始数据）
          if (!member.hasOwnProperty('nickname')) {
            member.nickname = '';
            // 同时更新原始数据中的成员
            if (groups[group] && groups[group][member.originalIndex]) {
              groups[group][member.originalIndex].nickname = '';
            }
          }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.id || getGroupPrefix(group) + '000'}</td>
            <td><input type="text" value="${member.name}" data-field="name" data-index="${member.originalIndex}" data-original="${member.name}"></td>
            <td><input type="text" value="${member.nickname || ''}" data-field="nickname" data-index="${member.originalIndex}" data-original="${member.nickname || ''}" placeholder="花名"></td>
          <td>
              <select data-field="gender" data-index="${member.originalIndex}" data-original="${member.gender}">
              <option value="男" ${member.gender === '男' ? 'selected' : ''}>男</option>
              <option value="女" ${member.gender === '女' ? 'selected' : ''}>女</option>
            </select>
          </td>
            <td><input type="text" value="${member.phone}" data-field="phone" data-index="${member.originalIndex}" data-original="${member.phone}"></td>
          <td>
              <select data-field="baptized" data-index="${member.originalIndex}" data-original="${member.baptized}">
              <option value="是" ${member.baptized === '是' ? 'selected' : ''}>是</option>
              <option value="否" ${member.baptized === '否' ? 'selected' : ''}>否</option>
            </select>
          </td>
          <td>
              <select data-field="age" data-index="${member.originalIndex}" data-original="${member.age}">
                <option value="10后" ${member.age === '10后' ? 'selected' : ''}>10后</option>
                <option value="05后" ${member.age === '05后' ? 'selected' : ''}>05后</option>
                <option value="00后" ${member.age === '00后' ? 'selected' : ''}>00后</option>
                <option value="95后" ${member.age === '95后' ? 'selected' : ''}>95后</option>
                <option value="90后" ${member.age === '90后' ? 'selected' : ''}>90后</option>
                <option value="85后" ${member.age === '85后' ? 'selected' : ''}>85后</option>
                <option value="80后" ${member.age === '80后' ? 'selected' : ''}>80后</option>
                <option value="70后" ${member.age === '70后' ? 'selected' : ''}>70后</option>
                <option value="60后" ${member.age === '60后' ? 'selected' : ''}>60后</option>
                <option value="50后" ${member.age === '50后' ? 'selected' : ''}>50后</option>
            </select>
          </td>
            <td>
              <button class="move-member-btn" data-group="${group}" data-index="${member.originalIndex}">移动</button>
              <button class="delete-member-btn" data-group="${group}" data-index="${member.originalIndex}">删除</button>
            </td>
        `;
        
        // 为所有输入框和选择框添加change事件监听器
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.addEventListener('change', (e) => {
            handleFieldChange(e.target, group, member.originalIndex);
          });
        });
        
        memberList.appendChild(row);
      });
      
      // 为移动和删除按钮添加事件监听器
      const moveButtons = memberList.querySelectorAll('.move-member-btn');
      const deleteButtons = memberList.querySelectorAll('.delete-member-btn');
      
      moveButtons.forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const group = e.target.dataset.group;
          const index = parseInt(e.target.dataset.index);
          moveMember(group, index);
        });
      });
      
      deleteButtons.forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          const group = e.target.dataset.group;
          const index = parseInt(e.target.dataset.index);
          deleteMember(group, index);
        });
      });
    } else {
    }
  }
  }

  // 全局函数供HTML调用
  window.deleteMember = async function(group, index) {
    if (confirm('确定删除这个成员吗？')) {
      // 保存当前页面状态
      updatePageState();
      
      const memberToDelete = groups[group][index];
      if (!memberToDelete) {
        alert('找不到要删除的成员！');
        return;
      }
      
      // 从未签到不统计列表中移除该成员（使用数据引用管理器）
        ExcludedMembersManager.removeMember(memberToDelete.name, group);
      
      // 直接从数组中删除成员
      groups[group].splice(index, 1);
      
      // 使用NewDataManager保存和标记变更
      if (window.newDataManager) {
        // 更新全局变量
        window.groups = groups;
        
        window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'deleted', memberToDelete.uuid);
        
        console.log(`✅ 成员 ${memberToDelete.name} 已从小组 ${group} 删除，当前成员数: ${groups[group].length}`);
      } else {
        // 降级到本地存储
      localStorage.setItem('msh_groups', JSON.stringify(groups));
      localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
        localStorage.setItem('msh_groups_timestamp', Date.now().toString());
        localStorage.setItem('msh_groupNames_timestamp', Date.now().toString());
      
      // 同步到Firebase
      try {
        await window.utils.DataReferenceManager.directSyncToFirebase(groups, 'groups');
      } catch (error) {
        console.error('同步到Firebase失败:', error);
        }
      }
      
      // 恢复页面状态
      restorePageState();
      
      alert('成员已删除！');
    }
  };

  // 移动成员到其他小组
  window.moveMember = function(currentGroup, memberIndex) {
    // 防止重复调用
    if (window.moveMemberInProgress) {
      return;
    }
    window.moveMemberInProgress = true;
    
    const member = groups[currentGroup][memberIndex];
    if (!member) {
      alert('找不到要移动的成员！');
      window.moveMemberInProgress = false;
      return;
    }

    // 获取所有可用的小组（排除当前小组）
    const availableGroups = Object.keys(groups).filter(group => group !== currentGroup);
    
    if (availableGroups.length === 0) {
      alert('没有其他小组可以移动！');
      return;
    }

    // 创建小组选择对话框
    let groupOptions = '';
    availableGroups.forEach(group => {
      const groupDisplayName = groupNames[group] || group;
      groupOptions += `<option value="${group}">${groupDisplayName}</option>`;
    });

    const dialogHTML = `
      <div id="moveMemberDialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
          <h3>移动成员</h3>
          <p><strong>成员：</strong>${member.name}</p>
          <p><strong>当前小组：</strong>${groupNames[currentGroup] || currentGroup}</p>
          <p><strong>目标小组：</strong></p>
          <select id="targetGroupSelect" style="width: 100%; padding: 8px; margin: 10px 0;">
            ${groupOptions}
          </select>
          <div style="text-align: right; margin-top: 20px;">
            <button id="cancelMove" style="margin-right: 10px; padding: 8px 16px;">取消</button>
            <button id="confirmMove" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px;">确认移动</button>
          </div>
        </div>
      </div>
    `;

    // 添加对话框到页面
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    const dialog = document.getElementById('moveMemberDialog');
    const targetGroupSelect = document.getElementById('targetGroupSelect');
    const cancelBtn = document.getElementById('cancelMove');
    const confirmBtn = document.getElementById('confirmMove');

    // 取消按钮事件
    cancelBtn.addEventListener('click', () => {
      if (dialog && dialog.parentNode) {
      document.body.removeChild(dialog);
      }
      window.moveMemberInProgress = false; // 重置标志
    });

    // 确认按钮事件
    confirmBtn.addEventListener('click', () => {
      const targetGroup = targetGroupSelect.value;
      if (!targetGroup) {
        alert('请选择目标小组！');
        return;
      }

      // 确认移动操作
      const confirmMessage = `确定要将 ${member.name} 从"${groupNames[currentGroup] || currentGroup}"移动到"${groupNames[targetGroup] || targetGroup}"吗？`;
      
      if (confirm(confirmMessage)) {
        // 执行移动操作
        performMemberMove(currentGroup, memberIndex, targetGroup);
        if (dialog && dialog.parentNode) {
        document.body.removeChild(dialog);
        }
        window.moveMemberInProgress = false; // 重置标志
      }
    });

    // 点击背景关闭对话框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        if (dialog && dialog.parentNode) {
        document.body.removeChild(dialog);
        }
        window.moveMemberInProgress = false; // 重置标志
      }
    });
  };

  // 执行成员移动操作
  async function performMemberMove(currentGroup, memberIndex, targetGroup) {
    const member = groups[currentGroup][memberIndex];
    
    // 设置移动操作标志，防止数据同步冲突
    window.memberMoveInProgress = true;
    
    try {
    // 保存当前页面状态
    updatePageState();
    
    // 直接从数组中移动成员
    groups[currentGroup].splice(memberIndex, 1);
    
    // 添加到目标小组
      if (!groups.hasOwnProperty(targetGroup)) {
      groups[targetGroup] = [];
    }
    groups[targetGroup].push(member);
    
      // 注意：不修改历史签到记录，保持历史数据完整性
      // 历史签到记录应该保持原来的小组信息，反映当时的真实情况
      console.log(`ℹ️ 成员 ${member.name} 已移动，但历史签到记录保持原样以维护数据完整性`);
    
    // 更新未签到不统计列表中的成员信息（使用数据引用管理器）
    ExcludedMembersManager.updateMemberGroup(member.name, currentGroup, targetGroup);
    
    // 重新生成所有成员的ID（因为移动后需要重新排序）
    regenerateAllMemberIds();
    
      // 保存到本地存储（使用更高的时间戳确保优先级）
      const moveTimestamp = Date.now() + 1000; // 增加1秒确保时间戳更新
    localStorage.setItem('msh_groups', JSON.stringify(groups));
    localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
      localStorage.setItem('msh_groups_timestamp', moveTimestamp.toString());
      localStorage.setItem('msh_groupNames_timestamp', moveTimestamp.toString());
      localStorage.setItem('msh_member_move_flag', 'true'); // 设置移动标志
      
      console.log(`✅ 成员移动完成: ${member.name} 从 ${currentGroup} 到 ${targetGroup}`);
    
    // 同步到Firebase
    try {
      await window.utils.DataReferenceManager.directSyncToFirebase(groups, 'groups');
        console.log('✅ 成员移动数据已同步到Firebase');
    } catch (error) {
        console.error('❌ 同步到Firebase失败:', error);
    }
    
    // 记录日志
    if (window.systemLogger) {
      window.systemLogger.info(`移动成员: ${member.name}`, {
        fromGroup: currentGroup,
        toGroup: targetGroup,
        memberName: member.name
      });
    }
    
      // 直接重新加载当前小组的成员列表，而不是使用restorePageState
      if (groupSelect && groupSelect.value === currentGroup) {
        loadMembers(currentGroup);
      } else if (groupSelect && groupSelect.value === targetGroup) {
        loadMembers(targetGroup);
      } else {
        // 如果当前没有选择小组，则恢复页面状态
        restorePageState();
      }
      
      alert(`成员 ${member.name} 已成功移动到"${groupNames[targetGroup] || targetGroup}"！\n\n注意：历史签到记录保持原样，反映当时的真实情况。`);
      
    } finally {
      // 延迟清除移动标志，确保数据同步完成
      setTimeout(() => {
        window.memberMoveInProgress = false;
        localStorage.removeItem('msh_member_move_flag');
        console.log('✅ 成员移动操作完成，清除移动标志');
      }, 2000);
    }
  }

  // 更新移动成员的签到记录（已禁用 - 保持历史数据完整性）
  // 注意：此函数已被禁用，因为修改历史签到记录会破坏数据的完整性
  // 历史签到记录应该反映当时的真实情况，不应该因为后续的成员移动而改变
  function updateAttendanceRecordsForMovedMember(member, oldGroup, newGroup) {
    console.log(`⚠️ 已禁用历史签到记录修改功能，保持数据完整性`);
    console.log(`ℹ️ 成员 ${member.name} 从 ${oldGroup} 移动到 ${newGroup}，但历史签到记录保持不变`);
    
    // 原代码已注释，保持历史数据完整性
    // attendanceRecords.forEach(record => {
    //   if (record.name === member.name && record.group === oldGroup) {
    //     record.group = newGroup;
    //   }
    // });
  }

  // 从未签到不统计列表中移除成员（基于数据引用）
  function removeMemberFromExcludedList(memberName, group) {
    if (typeof excludedMembers !== 'undefined') {
      const initialLength = excludedMembers.length;
      excludedMembers = excludedMembers.filter(excluded => 
        !(excluded.name === memberName && excluded.group === group)
      );
      
      if (excludedMembers.length < initialLength) {
        saveExcludedMembers();
        console.log(`已从未签到不统计列表中移除: ${memberName} (${group})`);
      }
    }
  }

  // 更新未签到不统计列表中的成员信息（基于数据引用）
  function updateMemberInExcludedList(memberName, oldGroup, newGroup) {
    if (typeof excludedMembers !== 'undefined') {
      let updated = false;
      excludedMembers.forEach(excluded => {
        if (excluded.name === memberName && excluded.group === oldGroup) {
          excluded.group = newGroup;
          // 更新groupName引用
          excluded.groupName = groupNames[newGroup] || newGroup;
          updated = true;
        }
      });
      
      if (updated) {
        saveExcludedMembers();
        console.log(`已更新未签到不统计列表中的成员: ${memberName} (${oldGroup} -> ${newGroup})`);
      }
    }
  }

  // 获取当前小组的不统计人员（基于数据引用）
  function getCurrentGroupExcludedMembers() {
    const currentGroup = groupSelect ? groupSelect.value : '';
    if (!currentGroup) return [];
    
    return excludedMembers.filter(member => member.group === currentGroup);
  }

  // 检查成员是否在不统计列表中（基于数据引用）
  function isMemberExcluded(memberName, group) {
    return excludedMembers.some(excluded => 
      excluded.name === memberName && excluded.group === group
    );
  }

  // 基于数据引用的不统计人员管理
  const ExcludedMembersManager = {
    // 获取所有不统计人员（基于当前小组数据）
    getAllExcludedMembers() {
      const currentGroup = groupSelect ? groupSelect.value : '';
      if (!currentGroup) return [];
      
      // 直接从当前小组数据中获取不统计人员
      const currentGroupMembers = groups[currentGroup] || [];
      return currentGroupMembers.filter(member => 
        this.isMemberExcluded(member.name, currentGroup)
      );
    },

    // 检查成员是否在不统计列表中
    isMemberExcluded(memberName, group) {
      return excludedMembers.some(excluded => 
        excluded.name === memberName && excluded.group === group
      );
    },

    // 添加成员到不统计列表
    addMember(memberName, group) {
      if (this.isMemberExcluded(memberName, group)) {
        return false; // 已存在
      }

      const member = groups[group]?.find(m => m.name === memberName);
      if (!member) {
        return false; // 成员不存在
      }

      const newExcludedMember = {
        name: memberName,
        group: group,
        groupName: groupNames[group] || group,
        memberId: member.id,
        addedAt: new Date().toISOString()
      };
      
      excludedMembers.push(newExcludedMember);

      saveExcludedMembers();
      return true;
    },

    // 从列表中移除成员
    removeMember(memberName, group) {
      const initialLength = excludedMembers.length;
      excludedMembers = excludedMembers.filter(excluded => 
        !(excluded.name === memberName && excluded.group === group)
      );
      
      if (excludedMembers.length < initialLength) {
        saveExcludedMembers();
        return true;
      }
      return false;
    },

    // 更新成员信息（当成员移动时）
    updateMemberGroup(memberName, oldGroup, newGroup) {
      const member = excludedMembers.find(excluded => 
        excluded.name === memberName && excluded.group === oldGroup
      );
      
      if (member) {
        member.group = newGroup;
        member.groupName = groupNames[newGroup] || newGroup;
        saveExcludedMembers();
        return true;
      }
      return false;
    }
  };

  // 清理groupNames中的无效数字键
  function cleanGroupNames() {
    const cleanedGroupNames = {};
    Object.keys(groupNames).forEach(key => {
      // 只保留非数字键（即实际的小组名称）
      // 检查key是否为纯数字字符串（如"0", "1", "2"等）
      if (!/^\d+$/.test(key)) {
        cleanedGroupNames[key] = groupNames[key];
      }
    });
    groupNames = cleanedGroupNames;
  }

  function saveData() {
    // 清理无效的数字键
    cleanGroupNames();
    
    // 先保存到本地存储
    localStorage.setItem('msh_groups', JSON.stringify(groups));
    localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
    localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
    localStorage.setItem('msh_groups_timestamp', Date.now().toString());
    localStorage.setItem('msh_groupNames_timestamp', Date.now().toString());
    localStorage.setItem('msh_attendanceRecords_timestamp', Date.now().toString());
    
    // 然后安全同步到Firebase
    syncToFirebase();
  }

  if (groupSelect) {
  groupSelect.addEventListener('change', () => {
      updatePageState();
      loadMembers(groupSelect.value);
      // 当小组改变时，刷新未签到不统计人员列表
      if (excludeStatsView && !excludeStatsView.classList.contains('hidden-form')) {
        loadExcludedMembers();
      }
    });
  }

  // 添加成员功能
  // 重新查找按钮元素，确保能找到
  const addMemberBtn = document.getElementById('addMemberButton');
  
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', () => {
      const selectedGroup = groupSelect.value;
      if (!selectedGroup) {
        alert('请先选择小组！');
        return;
      }
      
      // 创建添加成员对话框
      const dialog = document.createElement('div');
      dialog.className = 'add-member-dialog';
      dialog.innerHTML = `
        <div class="dialog-content">
          <h3>添加成员</h3>
          <div class="form-group">
            <label for="addMemberName">姓名：</label>
            <input type="text" id="addMemberName" placeholder="请输入成员姓名" required>
          </div>
          <div class="form-group">
            <label for="addMemberPhone">联系方式：</label>
            <input type="text" id="addMemberPhone" placeholder="请输入联系方式">
          </div>
          <div class="form-group">
            <label for="addMemberGender">性别：</label>
            <select id="addMemberGender" required>
              <option value="">--请选择性别--</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-group">
            <label for="addMemberBaptized">是否受洗：</label>
            <select id="addMemberBaptized" required>
              <option value="">--请选择--</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div class="form-group">
            <label for="addMemberAge">年龄段：</label>
            <select id="addMemberAge" required>
              <option value="">--请选择年龄段--</option>
              <option value="10后">10后</option>
              <option value="05后">05后</option>
              <option value="00后">00后</option>
              <option value="95后">95后</option>
              <option value="90后">90后</option>
              <option value="85后">85后</option>
              <option value="80后">80后</option>
              <option value="70后">70后</option>
              <option value="60后">60后</option>
              <option value="50后">50后</option>
            </select>
          </div>
          <div class="dialog-buttons">
            <button id="saveAddMemberBtn" type="button">保存</button>
            <button id="cancelAddMemberBtn" type="button">取消</button>
          </div>
        </div>
      `;
      
      // 添加样式
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;
      
      const content = dialog.querySelector('.dialog-content');
      content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 400px;
        max-width: 500px;
      `;
      
      document.body.appendChild(dialog);
      
      // 事件监听器
      const saveBtn = dialog.querySelector('#saveAddMemberBtn');
      const cancelBtn = dialog.querySelector('#cancelAddMemberBtn');
      
      saveBtn.addEventListener('click', () => {
        const name = dialog.querySelector('#addMemberName').value.trim();
        const phone = dialog.querySelector('#addMemberPhone').value.trim();
        const gender = dialog.querySelector('#addMemberGender').value;
        const baptized = dialog.querySelector('#addMemberBaptized').value;
        const age = dialog.querySelector('#addMemberAge').value;
        
        if (!name) {
          alert('请输入成员姓名！');
          return;
        }
        
        if (!gender || !baptized || !age) {
          alert('请填写完整信息！');
          return;
        }
        
        const newMember = {
          id: generateMemberId(selectedGroup, name),
          uuid: window.utils.generateUUID(), // 添加UUID
          name,
          phone,
          gender,
          baptized,
          age,
          joinDate: new Date().toISOString()
        };
        
        // 保存当前页面状态
        updatePageState();
        
        if (!groups.hasOwnProperty(selectedGroup)) {
          groups[selectedGroup] = [];
        }
        groups[selectedGroup].push(newMember);
        
        // 重新排序并重新分配序号
        regenerateAllMemberIds();
        
        saveData();
        
        // 恢复页面状态
        restorePageState();
        
        // 刷新成员列表显示
        loadMembers(selectedGroup);
        
        document.body.removeChild(dialog);
        if (window.systemLogger) {
        window.systemLogger.success('新成员已添加', { 
          group: selectedGroup, 
          memberName: memberName, 
          memberPhone: memberPhone,
          memberGender: memberGender,
          memberBaptized: memberBaptized,
          memberAge: memberAge
        });
        }
        alert('成员添加成功！');
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      // 点击背景关闭对话框
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
        }
      });
    });
  }

  // 重新生成序号按钮
  const regenerateIdsButton = document.getElementById('regenerateIdsButton');
  if (regenerateIdsButton) {
    regenerateIdsButton.addEventListener('click', () => {
      if (confirm('确定要重新生成所有成员的序号吗？这将按姓名重新排序并分配新的序号。')) {
        // 保存当前页面状态
        updatePageState();
        
        regenerateAllMemberIds();
        saveData();
        
        // 恢复页面状态
        restorePageState();
        
        alert('序号重新生成完成！');
        
        // 记录日志
        if (window.systemLogger) {
          window.systemLogger.info('重新生成所有成员序号');
        }
      }
    });
  }


  // backButton事件已在initializeEventListeners中处理，避免重复绑定

  if (summaryButton) {
  summaryButton.addEventListener('click', () => {
    window.location.href = "summary.html";
  });
  }



  // 小组管理功能
  if (addGroupButton) {
    addGroupButton.addEventListener('click', () => {
      if (addGroupForm) {
        if (addGroupForm.classList.contains('hidden-form')) {
          addGroupForm.classList.remove('hidden-form');
    } else {
          addGroupForm.classList.add('hidden-form');
        }
      }
    });
  }

  if (saveGroupButton) {
    saveGroupButton.addEventListener('click', () => {
      const groupName = newGroupName ? newGroupName.value.trim() : '';
      
      if (!groupName) {
        alert('请输入小组名称！');
        return;
      }

      // 保存当前页面状态
      updatePageState();
      
      // 检查小组名称是否已存在
      if (groups[groupName]) {
        alert('小组名称已存在，请使用其他名称！');
        return;
      }
      
      // 使用组名作为ID，确保唯一性
      const groupId = groupName;
      groups[groupId] = []; // 创建空的小组
      groupNames[groupId] = groupName;
      
      console.log('创建新小组:', groupName);
      console.log('创建后的 groups:', groups);
      console.log('创建后的 groupNames:', groupNames);

      saveData();
      
      // 恢复页面状态
      restorePageState();
      
      if (window.systemLogger) {
      window.systemLogger.success('新小组已创建', { groupName: groupName });
      }
      alert('小组添加成功！');
      
      if (addGroupForm) {
        addGroupForm.classList.add('hidden-form');
      }
      
      // 清空表单
      if (newGroupName) newGroupName.value = '';
    });
  }

  // 修改小组名称功能
  if (editGroupNameButton) {
    editGroupNameButton.addEventListener('click', () => {
      const selectedGroup = groupSelect.value;
      if (!selectedGroup) {
        alert('请先选择要修改的小组！');
        return;
      }
      
      const currentGroupName = groupNames[selectedGroup] || selectedGroup;
      const newName = prompt(`当前小组名称：${currentGroupName}\n请输入新的小组名称：`, currentGroupName);
      
      if (newName && newName.trim() !== '' && newName.trim() !== currentGroupName) {
        groupNames[selectedGroup] = newName.trim();
        saveData();
        loadGroups();
        alert('小组名称修改成功！');
      }
    });
  }

  if (cancelGroupButton) {
    cancelGroupButton.addEventListener('click', () => {
      if (addGroupForm) {
        addGroupForm.classList.add('hidden-form');
      }
      if (newGroupName) newGroupName.value = '';
    });
  }

  if (deleteGroupButton) {
    deleteGroupButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      if (!group) {
        alert('请选择要删除的小组！');
        return;
      }

      if (confirm(`确定删除小组"${groupNames[group]}"吗？这将删除该小组的所有成员！`)) {
        // 保存当前页面状态
        updatePageState();
        
        const groupName = groupNames[group];
        const memberCount = groups[group] ? groups[group].length : 0;
        delete groups[group];
        delete groupNames[group];
        saveData();
        
        // 恢复页面状态
        restorePageState();
        if (window.systemLogger) {
        window.systemLogger.warning('小组已删除', { 
          groupName: groupName, 
          memberCount: memberCount 
        });
        }
        alert('小组删除成功！');
      }
    });
  }


  if (saveEditGroupButton) {
    saveEditGroupButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      const newName = editGroupName ? editGroupName.value.trim() : '';
      
      if (!group) {
        alert('请选择要修改的小组！');
        return;
      }

      if (!newName) {
        alert('请输入新的小组名称！');
        return;
      }

      // 保存当前页面状态
      updatePageState();
      
      groupNames[group] = newName;
      saveData();
      
      // 恢复页面状态
      restorePageState();
      
      alert('小组名称修改成功！');
      
      if (editGroupForm) {
        editGroupForm.classList.add('hidden-form');
      }
    });
  }

  if (cancelEditGroupButton) {
    cancelEditGroupButton.addEventListener('click', () => {
      if (editGroupForm) {
        editGroupForm.classList.add('hidden-form');
      }
    });
  }


  
  // 未签到不统计相关元素
  const excludeStatsButton = document.getElementById('excludeStatsButton');
  const excludeStatsView = document.getElementById('excludeStatsView');
  
  const excludeSearchInput = document.getElementById('excludeSearchInput');
  const excludeSuggestions = document.getElementById('excludeSuggestions');
  const addToExcludeButton = document.getElementById('addToExcludeButton');
  const removeFromExcludeButton = document.getElementById('removeFromExcludeButton');
  const excludeList = document.getElementById('excludeList');
  const closeExcludeButton = document.getElementById('closeExcludeButton');


  // 未签到不统计功能
  let excludedMembers = []; // 存储不统计的人员列表
  let selectedMember = null; // 当前选中的成员

  // 显示未签到不统计界面
  excludeStatsButton.addEventListener('click', () => {
    excludeStatsView.classList.remove('hidden-form');
    loadExcludedMembers();
  });


  // 关闭未签到不统计界面
  closeExcludeButton.addEventListener('click', () => {
    excludeStatsView.classList.add('hidden-form');
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;
  });

  // 搜索人员功能（与签到页面完全一致）
  excludeSearchInput.addEventListener('input', () => {
    const query = excludeSearchInput.value.toLowerCase();
    excludeSuggestions.innerHTML = '';
    excludeSuggestions.style.display = 'none';
    if (query.length < 1) {
      selectedMember = null;
      return;
    }
    
    // 获取所有成员信息，包括组别（与签到页面一致）
    const allMembers = [];
    Object.keys(groups).forEach(group => {
      if (groups[group]) {
        groups[group].forEach(member => {
          allMembers.push({
            ...member,
            group: group
          });
        });
      }
    });

    // 过滤匹配的人员（与签到页面保持一致的搜索逻辑）
    const matches = allMembers.filter(member => {
      // 支持多种可能的字段名（与签到页面一致）
      const name = member.name || member.Name || member.姓名 || member.fullName;
      const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
      
      // 搜索姓名和花名
      const nameMatch = name && name.toLowerCase().includes(query);
      const nicknameMatch = nickname && nickname.trim() && nickname.toLowerCase().includes(query);
      
      // 排除已在不统计列表中的人员
      const isExcluded = excludedMembers.some(excluded => 
        excluded.name === member.name && excluded.group === member.group
      );
      
      return (nameMatch || nicknameMatch) && !isExcluded;
    });
    
    if (matches.length > 0) {
      excludeSuggestions.style.display = 'block';
      matches.forEach(member => {
        const div = document.createElement('div');
        // 使用与签到页面一致的字段名处理
        const name = member.name || member.Name || member.姓名 || member.fullName;
        const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
        
        div.innerHTML = `
          <span class="member-name">${name}${nickname ? ` (${nickname})` : ''}</span>
          <span class="member-group">(${groupNames[member.group] || member.group})</span>
        `;
        div.className = 'suggestion-item';
        div.addEventListener('click', () => {
          excludeSearchInput.value = name;
          excludeSuggestions.style.display = 'none';
          selectedMember = {
            name: name,
            group: member.group,
            groupName: groupNames[member.group] || member.group,
            id: member.id || null
          };
        });
        excludeSuggestions.appendChild(div);
      });
    }
  });

  // 添加到不统计列表（基于数据引用）
  addToExcludeButton.addEventListener('click', () => {
    if (!selectedMember) {
      alert('请先搜索并选择要添加的人员！');
      return;
    }

    // 检查是否已经存在
    const exists = excludedMembers.some(excluded => 
      excluded.name === selectedMember.name && excluded.group === selectedMember.group
    );

    if (exists) {
      alert('该人员已经在不统计列表中！');
      return;
    }

    // 使用数据引用管理器添加成员
    const success = ExcludedMembersManager.addMember(selectedMember.name, selectedMember.group);
    
    if (success) {
      loadExcludedMembers();
    } else {
      alert('添加失败，该人员可能已在不统计列表中！');
      return;
    }
    
    // 清空搜索
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;

    // 记录日志
    if (window.systemLogger) {
      window.systemLogger.info(`添加人员到不统计列表: ${selectedMember.name} (${groupNames[selectedMember.group] || selectedMember.group})`);
    }

    alert('已添加到不统计列表！');
  });

  // 从列表中移除
  removeFromExcludeButton.addEventListener('click', () => {
    if (!selectedMember) {
      alert('请先搜索并选择要移除的人员！');
      return;
    }

    // 从列表中移除
    excludedMembers = excludedMembers.filter(excluded => 
      !(excluded.name === selectedMember.name && excluded.group === selectedMember.group)
    );
    
    saveExcludedMembers();
    loadExcludedMembers();
    
    // 清空搜索
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;

    // 记录日志
    if (window.systemLogger) {
      window.systemLogger.info(`从不统计列表移除人员: ${selectedMember.name} (${selectedMember.groupName})`);
    }

    alert('已从列表中移除！');
  });

  // 加载不统计人员列表（显示所有小组的不统计人员）
  function loadExcludedMembers() {
    if (!excludeList) return;


    if (excludedMembers.length === 0) {
      excludeList.innerHTML = '<div class="empty-exclude-list">暂无不统计人员</div>';
      return;
    }

    excludeList.innerHTML = '';
    excludedMembers.forEach((member, index) => {
      const item = document.createElement('div');
      item.className = 'exclude-item';
      item.innerHTML = `
        <div class="exclude-item-info">
          <div class="exclude-item-name">${member.name}</div>
          <div class="exclude-item-group">${groupNames[member.group] || member.group}</div>
        </div>
        <button class="exclude-item-remove" onclick="removeExcludedMember(${index})">移除</button>
      `;
      excludeList.appendChild(item);
    });
  }

  // 移除不统计人员（全局函数）
  window.removeExcludedMember = function(index) {
    const member = excludedMembers[index];
    if (confirm(`确定要从不统计列表中移除 ${member.name} 吗？`)) {
      excludedMembers.splice(index, 1);
      saveExcludedMembers();
      loadExcludedMembers();
      
      // 记录日志
      if (window.systemLogger) {
        window.systemLogger.info(`从不统计列表移除人员: ${member.name} (${member.groupName})`);
      }
    }
  };

  // 保存不统计人员列表
  function saveExcludedMembers() {
    try {
      localStorage.setItem('msh_excludedMembers', JSON.stringify(excludedMembers));
      
      // 使用NewDataManager进行同步
      if (window.newDataManager) {
        // 标记数据变更，触发自动同步
        window.newDataManager.markDataChange('excludedMembers', 'modified', 'excludedMembers_update');
        console.log('✅ 已标记excludedMembers数据变更，将自动同步到Firebase');
        
        // 立即触发同步，确保数据不会丢失
        setTimeout(() => {
          if (window.newDataManager.hasLocalChanges) {
            console.log('🔄 立即同步excludedMembers数据到Firebase');
            window.newDataManager.performManualSync();
          }
        }, 1000);
      } else {
        // 回退到旧方法
      if (db) {
        window.utils.safeSyncToFirebase(excludedMembers, 'excludedMembers').catch(error => {
          console.error('安全同步不统计人员列表到Firebase失败:', error);
        });
        }
      }
    } catch (error) {
      console.error('保存不统计人员列表失败:', error);
    }
  }

  // 加载不统计人员列表
  function loadExcludedMembersFromStorage() {
    try {
      // 从本地存储加载
      const localData = localStorage.getItem('msh_excludedMembers');
      if (localData) {
        excludedMembers = JSON.parse(localData);
      }
      
      // 从Firebase加载
      if (db) {
        db.ref('excludedMembers').once('value').then(snapshot => {
          const firebaseData = snapshot.val();
          if (firebaseData && Array.isArray(firebaseData)) {
            excludedMembers = firebaseData;
            localStorage.setItem('msh_excludedMembers', JSON.stringify(excludedMembers));
          }
        }).catch(error => {
          console.error('从Firebase加载不统计人员列表失败:', error);
        });
      }
    } catch (error) {
      console.error('加载不统计人员列表失败:', error);
    }
  }

  // 初始化时加载不统计人员列表
  loadExcludedMembersFromStorage();

  // 全局函数：获取不统计人员列表
  window.getExcludedMembers = function() {
    return excludedMembers;
  };


  // 初始加载数据 - 已禁用，使用NewDataManager
  console.log("管理页面正在连接Firebase数据库...");
  // loadDataFromFirebase(); // 已禁用，使用NewDataManager

  // 启动实时数据同步（已禁用，使用NewDataManager）
  if (false && window.utils && window.utils.dataSyncManager) {
    window.utils.dataSyncManager.startListening((dataType, data) => {
      console.log(`管理页面收到${dataType}数据更新:`, data);
      
      // 检查是否正在进行成员移动操作，如果是则忽略同步更新
      if (window.memberMoveInProgress || localStorage.getItem('msh_member_move_flag')) {
        console.log('⚠️ 检测到成员移动操作进行中，忽略数据同步更新');
        return;
      }
      
      switch (dataType) {
        case 'attendanceRecords':
          attendanceRecords = data;
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          break;
        case 'groups':
          console.log('管理页面 - 接收到的groups数据:', data);
          
          // 获取本地数据
          const localGroups = localStorage.getItem('msh_groups');
          let localGroupsData = {};
          if (localGroups) {
            try {
              localGroupsData = JSON.parse(localGroups);
              console.log('管理页面 - 本地groups数据:', localGroupsData);
            } catch (error) {
              console.error('管理页面 - 解析本地groups数据失败:', error);
            }
          }
          
          // 使用页面同步管理器处理数据（只合并，不自动同步）
          if (pageSyncManager) {
            groups = pageSyncManager.syncData(localGroupsData, data, 'groups');
          } else {
            // 降级到简单合并策略
            groups = data || {};
            console.log('管理页面 - 使用简单合并策略');
          }
            
            console.log('管理页面 - 合并后的groups数据:', groups);
          localStorage.setItem('msh_groups', JSON.stringify(groups));
            
            // 重新加载页面显示
            loadGroups();
            loadMembers(groupSelect ? groupSelect.value : '');
          break;
        case 'groupNames':
          groupNames = data;
          console.log('管理页面 - 接收到的groupNames数据:', groupNames);
          
          // 清理无效的数字键
          cleanGroupNames();
          
          
          localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
          // 恢复页面状态
          restorePageState();
          break;
      }
    });

    // 设置页面可见性监听（已禁用，避免覆盖NewDataManager的数据）
    if (false && window.utils.dataSyncManager.setupVisibilityListener) {
    window.utils.dataSyncManager.setupVisibilityListener(() => {
      console.log('管理页面重新可见，检查数据同步...');
        // 已禁用，避免覆盖NewDataManager的数据
        return;
      loadDataFromFirebase();
    });
    }

    // 页面卸载时确保数据同步
    window.addEventListener('beforeunload', async (event) => {
      console.log('页面即将关闭，确保数据同步');
      try {
        // 同步所有数据到Firebase
        if (db) {
          await db.ref('groups').set(groups);
          await db.ref('groupNames').set(groupNames);
          await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
          console.log('页面关闭前数据同步完成');
        }
      } catch (error) {
        console.error('页面关闭前数据同步失败:', error);
      }
    });
  }