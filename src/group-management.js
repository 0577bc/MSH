/**
 * 小组管理页面脚本
 * 负责处理小组和成员的管理功能
 */

// ==================== 全局变量 ====================
let groups = {};
let groupNames = {};
let attendanceRecords = {};
let excludedMembers = {};
let selectedMembers = []; // 多选已选择的成员列表
let filteredExcludedMembers = []; // 过滤后的排除列表

// DOM元素引用
let groupSelect, memberList, addMemberButton, regenerateIdsButton;
let addGroupButton, excludeStatsButton, excludeStatsView;
let excludeSearchInput, excludeSuggestions, addToExcludeButton, excludeList, closeExcludeButton;
let excludeListSearchInput, clearExcludeListSearch;
let memberSearch, memberSuggestions;
let uuidEditorButton;
// 多选相关元素
let selectedMembersList, selectedCount, clearSelectedButton;
// 导出相关元素
let exportMembersButton, exportMembersDialog, cancelExportButton, confirmExportButton;
// 修改组名相关元素
let editGroupNameButton, editGroupForm, editGroupName, editGroupDescription, saveEditGroupButton, cancelEditGroupButton;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async function() {
  console.log('小组管理页面：脚本加载完成');
  
  try {
    await initializePage();
    console.log('小组管理页面：初始化完成');
  } catch (error) {
    console.error('小组管理页面：初始化失败', error);
  }
});

// 初始化页面
async function initializePage() {
  console.log('小组管理页面：开始初始化...');
  
  // 初始化Firebase
  initializeFirebase();
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 等待NewDataManager初始化
  await waitForNewDataManager();
  
  // 加载数据
  await loadData();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化页面显示
  initializePageDisplay();
  
  // 防止表单提交刷新页面
  preventFormSubmission();
}

// 初始化Firebase
function initializeFirebase() {
  try {
    if (window.firebaseConfig && typeof firebase !== 'undefined') {
      // 检查Firebase是否已经初始化
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('✅ Firebase初始化成功');
      } else {
        console.log('✅ Firebase已初始化');
      }
      return true;
    } else {
      console.log('⚠️ Firebase配置或SDK未找到');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase初始化失败:', error);
    return false;
  }
}

// 初始化DOM元素
function initializeDOMElements() {
  console.log('🔍 开始初始化DOM元素...');
  
  // 基本元素
  groupSelect = document.getElementById('groupSelect');
  memberList = document.getElementById('memberList');
  addMemberButton = document.getElementById('addMemberButton');
  regenerateIdsButton = document.getElementById('regenerateIdsButton');
  
  // 小组管理元素
  addGroupButton = document.getElementById('addGroupButton');
  
  // 未签到不统计元素
  excludeStatsButton = document.getElementById('excludeStatsButton');
  excludeStatsView = document.getElementById('excludeStatsView');
  excludeSearchInput = document.getElementById('excludeSearchInput');
  excludeSuggestions = document.getElementById('excludeSuggestions');
  addToExcludeButton = document.getElementById('addToExcludeButton');
  excludeList = document.getElementById('excludeList');
  closeExcludeButton = document.getElementById('closeExcludeButton');
  
  // 排除列表搜索元素
  excludeListSearchInput = document.getElementById('excludeListSearchInput');
  clearExcludeListSearch = document.getElementById('clearExcludeListSearch');
  
  // 人员检索元素
  memberSearch = document.getElementById('memberSearch');
  memberSuggestions = document.getElementById('memberSuggestions');
  
  // UUID编辑器元素
  uuidEditorButton = document.getElementById('uuidEditorButton');
  
  // 多选相关元素
  selectedMembersList = document.getElementById('selectedMembersList');
  selectedCount = document.getElementById('selectedCount');
  clearSelectedButton = document.getElementById('clearSelectedButton');
  
  // 导出相关元素
  exportMembersButton = document.getElementById('exportMembersButton');
  exportMembersDialog = document.getElementById('exportMembersDialog');
  cancelExportButton = document.getElementById('cancelExportButton');
  confirmExportButton = document.getElementById('confirmExportButton');
  
  // 修改组名相关元素
  editGroupNameButton = document.getElementById('editGroupNameButton');
  editGroupForm = document.getElementById('editGroupForm');
  editGroupName = document.getElementById('editGroupName');
  editGroupDescription = document.getElementById('editGroupDescription');
  saveEditGroupButton = document.getElementById('saveEditGroupButton');
  cancelEditGroupButton = document.getElementById('cancelEditGroupButton');
  
  const domElements = {
    groupSelect: !!groupSelect,
    memberList: !!memberList,
    addMemberButton: !!addMemberButton,
    regenerateIdsButton: !!regenerateIdsButton,
    addGroupButton: !!addGroupButton,
    excludeStatsButton: !!excludeStatsButton,
    excludeStatsView: !!excludeStatsView,
    memberSearch: !!memberSearch,
    exportMembersButton: !!exportMembersButton,
    editGroupNameButton: !!editGroupNameButton
  };
  
  console.log('🔍 DOM元素初始化结果:', domElements);
}

// 等待NewDataManager初始化
async function waitForNewDataManager() {
  console.log('小组管理页面：等待NewDataManager初始化...');
  
  let attempts = 0;
  const maxAttempts = 20;
  const timeout = 200;
  
  while (attempts < maxAttempts) {
    if (window.newDataManager) {
      console.log('小组管理页面：NewDataManager初始化成功');
      return;
    }
    
    attempts++;
    console.log(`⏳ 等待NewDataManager初始化... (${attempts}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, timeout));
  }
  
  console.log('⚠️ NewDataManager初始化超时，继续执行...');
}

// 加载数据
async function loadData() {
  console.log('小组管理页面：开始加载数据...');
  
  try {
    // 等待NewDataManager设置全局变量
    let attempts = 0;
    const maxAttempts = 20;
    const timeout = 200;
    
    while (attempts < maxAttempts) {
      if (window.groups && window.groupNames && window.attendanceRecords && window.excludedMembers !== undefined) {
        console.log('✅ 从NewDataManager获取到数据');
        break;
      }
      
      attempts++;
      console.log(`⏳ 等待NewDataManager初始化... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️ 数据加载超时，尝试从localStorage加载数据');
      // 尝试从localStorage加载数据
      try {
        const storedGroups = localStorage.getItem('msh_groups');
        const storedGroupNames = localStorage.getItem('msh_groupNames');
        const storedAttendanceRecords = localStorage.getItem('msh_attendanceRecords');
        const storedExcludedMembers = localStorage.getItem('msh_excludedMembers');
        
        if (storedGroups) {
          window.groups = JSON.parse(storedGroups);
          console.log('✅ 从localStorage加载了groups数据');
        }
        if (storedGroupNames) {
          window.groupNames = JSON.parse(storedGroupNames);
          console.log('✅ 从localStorage加载了groupNames数据');
        }
        if (storedAttendanceRecords) {
          window.attendanceRecords = JSON.parse(storedAttendanceRecords);
          console.log('✅ 从localStorage加载了attendanceRecords数据');
        }
        if (storedExcludedMembers) {
          window.excludedMembers = JSON.parse(storedExcludedMembers);
          console.log('✅ 从localStorage加载了excludedMembers数据');
        }
      } catch (error) {
        console.error('从localStorage加载数据失败:', error);
      }
    }
    
    // 获取数据
    groups = window.groups || {};
    groupNames = window.groupNames || {};
    attendanceRecords = window.attendanceRecords || {};
    console.log('🔍 group-management.js - 检查window.excludedMembers:', window.excludedMembers);
    console.log('🔍 group-management.js - window.excludedMembers类型:', typeof window.excludedMembers);
    console.log('🔍 group-management.js - window.excludedMembers是否为数组:', Array.isArray(window.excludedMembers));
    if (window.excludedMembers && typeof window.excludedMembers === 'object') {
      console.log('🔍 group-management.js - window.excludedMembers键数量:', Object.keys(window.excludedMembers).length);
    }
    excludedMembers = window.excludedMembers || {};
    console.log('🔍 group-management.js - 最终excludedMembers:', excludedMembers);
    console.log('🔍 group-management.js - 最终excludedMembers键数量:', Object.keys(excludedMembers).length);
    
    // 确保数据格式正确（从数组转换为对象）
    if (Array.isArray(groups)) {
      console.log('🔧 检测到groups是数组格式，开始转换...');
      const groupsObj = {};
      groups.forEach((group, index) => {
        if (typeof group === 'string') {
          groupsObj[group] = [];
        } else if (typeof group === 'object' && group !== null) {
          // 如果group是对象，使用其key作为小组名
          Object.keys(group).forEach(key => {
            groupsObj[key] = group[key];
          });
        } else {
          // 如果group是其他类型，使用索引作为key
          groupsObj[index.toString()] = [];
        }
      });
      groups = groupsObj;
      console.log('✅ groups数组转换完成:', Object.keys(groups));
    }
    
    if (Array.isArray(groupNames)) {
      console.log('🔧 检测到groupNames是数组格式，开始转换...');
      const groupNamesObj = {};
      groupNames.forEach((name, index) => {
        if (typeof name === 'string') {
          groupNamesObj[name] = name;
        } else if (typeof name === 'object' && name !== null) {
          // 如果name是对象，使用其key-value对
          Object.keys(name).forEach(key => {
            groupNamesObj[key] = name[key];
          });
        } else {
          // 如果name是其他类型，使用索引作为key
          groupNamesObj[index.toString()] = index.toString();
        }
      });
      groupNames = groupNamesObj;
      console.log('✅ groupNames数组转换完成:', Object.keys(groupNames));
    }
    
    console.log('小组管理页面：数据加载完成', {
      groupsType: typeof groups,
      groupsCount: Object.keys(groups).length,
      groupNamesType: typeof groupNames,
      groupNamesCount: Object.keys(groupNames).length,
      attendanceRecordsCount: Object.keys(attendanceRecords).length,
      excludedMembersCount: Object.keys(excludedMembers).length
    });
    
  } catch (error) {
    console.error('小组管理页面：数据加载失败', error);
    groups = {};
    groupNames = {};
    attendanceRecords = {};
    excludedMembers = {};
  }
}

// 初始化事件监听器
function initializeEventListeners() {
  console.log('🔍 开始初始化事件监听器...');
  
  // 返回按钮
  const backToAdminButton = document.getElementById('backToAdminButton');
  const backToMainButton = document.getElementById('backToMainButton');
  
  if (backToAdminButton) {
    backToAdminButton.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
  }
  
  if (backToMainButton) {
    backToMainButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
  
  // 小组选择
  if (groupSelect) {
    groupSelect.addEventListener('change', handleGroupSelect);
  }
  
  // 成员管理按钮
  if (addMemberButton) {
    addMemberButton.addEventListener('click', showAddMemberForm);
  }
  
  if (regenerateIdsButton) {
    regenerateIdsButton.addEventListener('click', handleRegenerateIds);
  }
  
  // 小组管理按钮
  if (addGroupButton) {
    addGroupButton.addEventListener('click', showAddGroupForm);
  }
  
  // 未签到不统计按钮
  if (excludeStatsButton) {
    excludeStatsButton.addEventListener('click', showExcludeStatsView);
  }
  
  if (closeExcludeButton) {
    closeExcludeButton.addEventListener('click', hideExcludeStatsView);
  }
  
  // 导出成员按钮
  if (exportMembersButton) {
    exportMembersButton.addEventListener('click', showExportDialog);
  }
  
  if (cancelExportButton) {
    cancelExportButton.addEventListener('click', hideExportDialog);
  }
  
  if (confirmExportButton) {
    confirmExportButton.addEventListener('click', handleExportMembers);
  }
  
  // 修改组名按钮
  if (editGroupNameButton) {
    editGroupNameButton.addEventListener('click', showEditGroupForm);
  }
  
  if (saveEditGroupButton) {
    saveEditGroupButton.addEventListener('click', handleSaveEditGroup);
  }
  
  if (cancelEditGroupButton) {
    cancelEditGroupButton.addEventListener('click', hideEditGroupForm);
  }
  
  // 人员检索
  if (memberSearch) {
    memberSearch.addEventListener('input', handleMemberSearch);
    memberSearch.addEventListener('focus', () => {
      if (memberSearch.value.trim()) {
        handleMemberSearch();
      }
    });
  }
  
  // 未签到不统计搜索 - 按照index页面标准实现
  if (excludeSearchInput) {
    // 移除之前的事件监听器（如果存在）
    excludeSearchInput.removeEventListener('input', handleExcludeSearch);
    
    // 添加新的事件监听器
    excludeSearchInput.addEventListener('input', handleExcludeSearch);
    excludeSearchInput.addEventListener('focus', () => {
      if (excludeSearchInput.value.trim()) {
        handleExcludeSearch();
      }
    });
    console.log('✅ 未签到不统计搜索事件监听器已添加');
  } else {
    console.error('❌ excludeSearchInput元素未找到');
  }
  
  if (addToExcludeButton) {
    addToExcludeButton.addEventListener('click', addToExcludeList);
  }
  
  // 清空选择按钮
  if (clearSelectedButton) {
    clearSelectedButton.addEventListener('click', clearSelectedMembers);
  }
  
  // 排除列表搜索
  if (excludeListSearchInput) {
    excludeListSearchInput.addEventListener('input', handleExcludeListSearch);
    console.log('✅ 排除列表搜索事件监听器已添加');
  } else {
    console.error('❌ excludeListSearchInput元素未找到');
  }
  
  if (clearExcludeListSearch) {
    clearExcludeListSearch.addEventListener('click', clearExcludeListSearchInput);
  }
  
  // UUID编辑器按钮
  if (uuidEditorButton) {
    uuidEditorButton.addEventListener('click', () => {
      window.location.href = 'tools/uuid_editor.html';
    });
  }
  
  // 表单事件
  initializeFormEvents();
  
  console.log('✅ 事件监听器初始化完成');
}

// 初始化表单事件
function initializeFormEvents() {
  // 添加成员表单
  const addMemberForm = document.getElementById('addMemberForm');
  const addMemberFormElement = document.getElementById('addMemberFormElement');
  const saveMemberButton = document.getElementById('saveMemberButton');
  const cancelMemberButton = document.getElementById('cancelMemberButton');
  
  if (saveMemberButton) {
    saveMemberButton.addEventListener('click', handleSaveMember);
  }
  
  if (cancelMemberButton) {
    cancelMemberButton.addEventListener('click', () => {
      addMemberForm.classList.add('hidden-form');
    });
  }
  
  // 编辑成员表单
  const editMemberForm = document.getElementById('editMemberForm');
  const saveEditMemberButton = document.getElementById('saveEditMemberButton');
  const cancelEditMemberButton = document.getElementById('cancelEditMemberButton');
  
  if (saveEditMemberButton) {
    saveEditMemberButton.addEventListener('click', handleSaveEditMember);
  }
  
  if (cancelEditMemberButton) {
    cancelEditMemberButton.addEventListener('click', () => {
      editMemberForm.classList.add('hidden-form');
    });
  }
  
  // 添加小组表单
  const addGroupForm = document.getElementById('addGroupForm');
  const addGroupFormElement = document.getElementById('addGroupFormElement');
  const saveGroupButton = document.getElementById('saveGroupButton');
  const cancelGroupButton = document.getElementById('cancelGroupButton');
  
  if (saveGroupButton) {
    saveGroupButton.addEventListener('click', handleSaveGroup);
  }
  
  if (cancelGroupButton) {
    cancelGroupButton.addEventListener('click', () => {
      addGroupForm.classList.add('hidden-form');
    });
  }
  
  // 删除成员确认
  const confirmDeleteMemberButton = document.getElementById('confirmDeleteMemberButton');
  const cancelDeleteMemberButton = document.getElementById('cancelDeleteMemberButton');
  
  if (confirmDeleteMemberButton) {
    confirmDeleteMemberButton.addEventListener('click', handleDeleteMember);
  }
  
  if (cancelDeleteMemberButton) {
    cancelDeleteMemberButton.addEventListener('click', () => {
      document.getElementById('deleteMemberDialog').classList.add('hidden-form');
    });
  }
}

// 初始化页面显示
function initializePageDisplay() {
  console.log('🔍 开始初始化页面显示...');
  console.log('🔍 当前数据状态:', {
    groups: groups,
    groupNames: groupNames,
    isDataLoaded: window.newDataManager ? window.newDataManager.isDataLoaded : false
  });
  
  // 更新小组选择下拉框
  updateGroupSelect();
  
  // 加载排除成员列表
  loadExcludedMembers();
  
  console.log('✅ 页面显示初始化完成');
}

// ==================== 小组管理 ====================

// 更新小组选择下拉框
function updateGroupSelect() {
  console.log('🔍 updateGroupSelect 开始执行', {
    groupSelect: !!groupSelect,
    groups: groups,
    groupNames: groupNames,
    groupsKeys: Object.keys(groups),
    groupNamesKeys: Object.keys(groupNames)
  });
  
  if (!groupSelect) {
    console.error('❌ groupSelect 元素未找到');
    return;
  }
  
  // 清空现有选项
  groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
  
  // 获取小组列表并排序
  const groupKeys = Object.keys(groups);
  console.log('🔍 直接获取的groups keys:', groupKeys);
  console.log('🔍 groups对象内容:', groups);
  
  if (groupKeys.length === 0) {
    console.log('❌ 没有找到任何小组数据');
    groupSelect.innerHTML = '<option value="">--暂无小组--</option>';
    return;
  }
  
  // 使用utils.sortGroups进行排序
  let sortedGroups = [];
  if (window.utils && window.utils.sortGroups) {
    console.log('🔍 调用sortGroups前的参数:', { groupKeys, groupNames });
    sortedGroups = window.utils.sortGroups(groups, groupNames);
    console.log('🔍 使用utils.sortGroups排序结果:', sortedGroups);
  } else {
    sortedGroups = groupKeys.sort();
    console.log('🔍 使用默认排序结果:', sortedGroups);
  }
  
  console.log('🔍 最终使用的小组列表:', sortedGroups);
  console.log('🔍 groups键名:', Object.keys(groups));
  console.log('🔍 groupNames键名:', Object.keys(groupNames));
  console.log('🔍 groupNames内容:', groupNames);
  
  // 添加小组选项
  sortedGroups.forEach(groupKey => {
    const displayName = groupNames[groupKey] || groupKey;
    const option = document.createElement('option');
    option.value = groupKey;
    option.textContent = displayName;
    groupSelect.appendChild(option);
    console.log(`✅ 添加小组选项: ${groupKey} -> ${displayName} (groupNames[${groupKey}] = ${groupNames[groupKey]})`);
  });
  
  console.log(`✅ updateGroupSelect 执行完成，选项数量: ${groupSelect.options.length}`);
}

// 处理小组选择
function handleGroupSelect() {
  const selectedGroup = groupSelect.value;
  console.log('选择的小组:', selectedGroup);
  
  if (selectedGroup) {
    displayMembers(selectedGroup);
  } else {
    memberList.innerHTML = '<tr><td colspan="8" class="no-data">请选择小组</td></tr>';
  }
}

// 显示添加小组表单
function showAddGroupForm() {
  const addGroupForm = document.getElementById('addGroupForm');
  if (addGroupForm) {
    addGroupForm.classList.remove('hidden-form');
    document.getElementById('newGroupName').focus();
  }
}

// 处理保存小组
async function handleSaveGroup() {
  const groupName = document.getElementById('newGroupName').value.trim();
  const groupDescription = document.getElementById('newGroupDescription').value.trim();
  
  if (!groupName) {
    alert('请输入小组名称！');
    return;
  }
  
  // 检查小组是否已存在
  if (groups[groupName]) {
    alert('小组已存在！');
    return;
  }
  
  try {
    // 创建新小组
    groups[groupName] = [];
    groupNames[groupName] = groupName;
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
      window.newDataManager.saveToLocalStorage('groupNames', groupNames);
        window.newDataManager.markDataChange('groupNames', 'modified', 'group_edit');
    }
    
    // 更新显示
    updateGroupSelect();
    
    // 关闭表单
    document.getElementById('addGroupForm').classList.add('hidden-form');
    
    // 清空表单
    document.getElementById('newGroupName').value = '';
    document.getElementById('newGroupDescription').value = '';
    
    // 后台同步
    if (window.newDataManager) {
      window.newDataManager.performManualSync();
    }
    
    alert('小组添加成功！');
    
  } catch (error) {
    console.error('保存小组失败:', error);
    alert('保存小组失败，请重试！');
  }
}

// ==================== 成员管理 ====================

// 显示成员列表
function displayMembers(groupKey) {
  console.log('显示成员列表:', groupKey);
  
  if (!memberList) {
    console.error('memberList 元素未找到');
    return;
  }
  
  const members = groups[groupKey] || [];
  console.log('成员列表:', members);
  
  if (members.length === 0) {
    memberList.innerHTML = '<tr><td colspan="8" class="no-data">该小组暂无成员</td></tr>';
    return;
  }
  
  memberList.innerHTML = '';
  
  members.forEach((member, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${member.name || ''}</td>
      <td>${member.nickname || ''}</td>
      <td>${member.gender || ''}</td>
      <td>${member.phone || ''}</td>
      <td>${member.baptized || ''}</td>
      <td>${member.age || ''}</td>
      <td>
        <button class="edit-btn" onclick="editMember('${member.uuid}', '${groupKey}')">编辑</button>
        <button class="move-btn" onclick="moveMember('${groupKey}', ${index})">移动</button>
        <button class="delete-btn" onclick="deleteMember('${member.uuid}', '${member.name}', '${groupKey}')">删除</button>
      </td>
    `;
    memberList.appendChild(row);
  });
}

// 显示添加成员表单
function showAddMemberForm() {
  const selectedGroup = groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择小组！');
    return;
  }
  
  const addMemberForm = document.getElementById('addMemberForm');
  if (addMemberForm) {
    addMemberForm.classList.remove('hidden-form');
    document.getElementById('addMemberName').focus();
  }
}

// 处理保存成员
async function handleSaveMember() {
  const selectedGroup = groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择小组！');
    return;
  }
  
  // 防止重复提交
  const flagName = 'isExecuting_saveMember';
  if (window[flagName]) {
    console.log('保存成员操作正在进行中，跳过重复执行');
    return;
  }
  
  // 设置执行标志
  window[flagName] = true;
  
  const memberData = {
    name: document.getElementById('addMemberName').value.trim(),
    nickname: document.getElementById('addMemberNickname') ? document.getElementById('addMemberNickname').value.trim() : '',
    phone: document.getElementById('addMemberPhone').value.trim(),
    gender: document.getElementById('addMemberGender').value,
    baptized: document.getElementById('addMemberBaptized').value,
    age: document.getElementById('addMemberAge').value,
    uuid: window.utils.generateUUID(),
    group: selectedGroup,
    createdAt: new Date().toISOString()
  };
  
  if (!memberData.name) {
    alert('请输入成员姓名！');
    return;
  }
  
  try {
    // 添加到小组
    if (!groups[selectedGroup]) {
      groups[selectedGroup] = [];
    }
    groups[selectedGroup].push(memberData);
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
    }
    
    // 更新显示
    displayMembers(selectedGroup);
    
    // 关闭表单
    document.getElementById('addMemberForm').classList.add('hidden-form');
    
    // 清空表单
    clearAddMemberForm();
    
    // 后台同步
    if (window.newDataManager) {
      window.newDataManager.performManualSync();
    }
    
    alert('成员添加成功！');
    
  } catch (error) {
    console.error('保存成员失败:', error);
    alert('保存成员失败，请重试！');
  } finally {
    // 清除防重复提交标识符
    window[flagName] = false;
  }
}

// 编辑成员
function editMember(memberUUID, groupKey) {
  const members = groups[groupKey] || [];
  const member = members.find(m => m.uuid === memberUUID);
  
  if (!member) {
    alert('成员未找到！');
    return;
  }
  
  // 填充编辑表单
  document.getElementById('editMemberName').value = member.name || '';
  document.getElementById('editMemberNickname').value = member.nickname || '';
  document.getElementById('editMemberPhone').value = member.phone || '';
  document.getElementById('editMemberGender').value = member.gender || '';
  document.getElementById('editMemberBaptized').value = member.baptized || '';
  document.getElementById('editMemberAge').value = member.age || '';
  
  // 存储编辑信息
  selectedMember = { uuid: memberUUID, group: groupKey };
  
  // 显示编辑表单
  document.getElementById('editMemberForm').classList.remove('hidden-form');
}

// 处理保存编辑成员
async function handleSaveEditMember() {
  if (!selectedMember) {
    alert('未选择要编辑的成员！');
    return;
  }
  
  // 防止重复提交
  const flagName = 'isExecuting_saveEditMember';
  if (window[flagName]) {
    console.log('保存编辑成员操作正在进行中，跳过重复执行');
    return;
  }
  
  // 设置执行标志
  window[flagName] = true;
  
  const memberData = {
    name: document.getElementById('editMemberName').value.trim(),
    nickname: document.getElementById('editMemberNickname') ? document.getElementById('editMemberNickname').value.trim() : '',
    phone: document.getElementById('editMemberPhone').value.trim(),
    gender: document.getElementById('editMemberGender').value,
    baptized: document.getElementById('editMemberBaptized').value,
    age: document.getElementById('editMemberAge').value,
    uuid: selectedMember.uuid,
    group: selectedMember.group,
    createdAt: selectedMember.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (!memberData.name) {
    alert('请输入成员姓名！');
    return;
  }
  
  try {
    // 更新成员信息
    const members = groups[selectedMember.group] || [];
    const memberIndex = members.findIndex(m => m.uuid === selectedMember.uuid);
    
    if (memberIndex >= 0) {
      members[memberIndex] = memberData;
      
      // 保存到NewDataManager
      if (window.newDataManager) {
        window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
      }
      
      // 更新显示
      displayMembers(selectedMember.group);
      
      // 关闭表单
      document.getElementById('editMemberForm').classList.add('hidden-form');
      
      // 清空选择
      selectedMember = null;
      
      // 后台同步
      if (window.newDataManager) {
        window.newDataManager.performManualSync();
      }
      
      alert('成员信息更新成功！');
    } else {
      alert('成员未找到！');
    }
    
  } catch (error) {
    console.error('更新成员失败:', error);
    alert('更新成员失败，请重试！');
  } finally {
    // 清除防重复提交标识符
    window[flagName] = false;
  }
}

// 删除成员
function deleteMember(memberUUID, memberName, groupKey) {
  // 显示确认对话框
  document.getElementById('deleteMemberName').textContent = memberName;
  document.getElementById('deleteMemberGroup').textContent = groupNames[groupKey] || groupKey;
  document.getElementById('deleteMemberDialog').classList.remove('hidden-form');
  
  // 存储删除信息
  selectedMember = { uuid: memberUUID, group: groupKey };
}

// 处理删除成员
async function handleDeleteMember() {
  if (!selectedMember) {
    alert('未选择要删除的成员！');
    return;
  }
  
  try {
    // 从小组中移除成员
    const members = groups[selectedMember.group] || [];
    const memberIndex = members.findIndex(m => m.uuid === selectedMember.uuid);
    
    if (memberIndex >= 0) {
      members.splice(memberIndex, 1);
      
      // 保存到NewDataManager
      if (window.newDataManager) {
        window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
      }
      
      // 更新显示
      displayMembers(selectedMember.group);
      
      // 关闭对话框
      document.getElementById('deleteMemberDialog').classList.add('hidden-form');
      
      // 清空选择
      selectedMember = null;
      
      // 后台同步
      if (window.newDataManager) {
        window.newDataManager.performManualSync();
      }
      
      alert('成员删除成功！');
    } else {
      alert('成员未找到！');
    }
    
  } catch (error) {
    console.error('删除成员失败:', error);
    alert('删除成员失败，请重试！');
  }
}

// 处理重新生成序号
async function handleRegenerateIds() {
  const selectedGroup = groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择小组！');
    return;
  }
  
  if (!confirm('确定要重新生成该小组的成员序号吗？')) {
    return;
  }
  
  try {
    const members = groups[selectedGroup] || [];
    members.forEach((member, index) => {
      member.sequenceNumber = index + 1;
    });
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groups', groups);
        window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
    }
    
    // 更新显示
    displayMembers(selectedGroup);
    
    // 后台同步
    if (window.newDataManager) {
      window.newDataManager.performManualSync();
    }
    
    alert('序号重新生成成功！');
    
  } catch (error) {
    console.error('重新生成序号失败:', error);
    alert('重新生成序号失败，请重试！');
  }
}

// ==================== 人员检索 ====================

// 处理人员检索
function handleMemberSearch() {
  const searchTerm = memberSearch.value.trim().toLowerCase();
  
  if (!searchTerm) {
    hideSuggestions();
    return;
  }
  
  // 搜索所有成员
  const allMembers = [];
  Object.keys(groups).forEach(groupKey => {
    const members = groups[groupKey] || [];
    members.forEach(member => {
      allMembers.push({
        ...member,
        groupKey: groupKey,
        groupName: groupNames[groupKey] || groupKey
      });
    });
  });
  
  // 过滤匹配的成员
  const matches = allMembers.filter(member => 
    member.name.toLowerCase().includes(searchTerm) ||
    (member.nickname && member.nickname.toLowerCase().includes(searchTerm))
  );
  
  if (matches.length > 0) {
    showSuggestions(matches);
  } else {
    hideSuggestions();
  }
}

// 显示建议
function showSuggestions(matches) {
  if (!memberSuggestions) return;
  
  memberSuggestions.innerHTML = '';
  memberSuggestions.classList.remove('hidden');
  
  matches.slice(0, 10).forEach(member => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = `${member.name} (${member.groupName})`;
    item.addEventListener('click', () => {
      selectMember(member);
    });
    memberSuggestions.appendChild(item);
  });
}

// 隐藏建议
function hideSuggestions() {
  if (memberSuggestions) {
    memberSuggestions.classList.add('hidden');
  }
}

// 选择成员
function selectMember(member) {
  // 选择对应的小组
  groupSelect.value = member.groupKey;
  
  // 显示成员列表
  displayMembers(member.groupKey);
  
  // 清空搜索
  memberSearch.value = '';
  hideSuggestions();
}

// ==================== 未签到不统计管理 ====================

// 显示未签到不统计管理界面
function showExcludeStatsView() {
  if (excludeStatsView) {
    excludeStatsView.classList.remove('hidden-form');
    loadExcludedMembers();
    
    // 确保搜索输入框获得焦点
    if (excludeSearchInput) {
      setTimeout(() => {
        excludeSearchInput.focus();
      }, 100);
    }
  }
}

// 隐藏未签到不统计管理界面
function hideExcludeStatsView() {
  if (excludeStatsView) {
    excludeStatsView.classList.add('hidden-form');
    excludeSearchInput.value = '';
    hideExcludeSuggestions();
    
    // 清除排除列表搜索状态
    if (excludeListSearchInput) {
      excludeListSearchInput.value = '';
    }
    filteredExcludedMembers = [];
    
    // 清空多选状态
    clearSelectedMembers();
  }
}

// 处理排除搜索 - 支持人员姓名和小组名称搜索
function handleExcludeSearch() {
  const query = excludeSearchInput.value.trim();
  
  // 清空建议列表
  if (excludeSuggestions) {
    excludeSuggestions.innerHTML = '';
    excludeSuggestions.classList.add('hidden');
  }
  
  if (query.length < 1) {
    hideExcludeSuggestions();
    return;
  }
  
  // 验证数据源
  if (!groups || Object.keys(groups).length === 0) {
    console.error('groups数据未加载或为空');
    return;
  }
  
  if (!groupNames || Object.keys(groupNames).length === 0) {
    console.error('groupNames数据未加载或为空');
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  const suggestions = [];
  
  // 1. 搜索小组名称
  Object.keys(groups).forEach(groupKey => {
    const groupDisplayName = (groupNames[groupKey] || groupKey).toLowerCase();
    if (groupDisplayName.includes(lowerQuery)) {
      const groupMembers = groups[groupKey] || [];
      const availableMembers = groupMembers.filter(member => {
        if (!member || !member.name) return false;
        // 检查是否已经在排除列表中
        const isExcluded = Object.values(excludedMembers).some(excluded => 
          excluded.name === member.name && excluded.group === groupKey
        );
        return !isExcluded;
      });
      
      if (availableMembers.length > 0) {
        suggestions.push({
          type: 'group',
          groupKey: groupKey,
          groupName: groupNames[groupKey] || groupKey,
          members: availableMembers,
          memberCount: availableMembers.length
        });
      }
    }
  });
  
  // 2. 搜索个人成员
  Object.keys(groups).forEach(groupKey => {
    if (groups[groupKey] && Array.isArray(groups[groupKey])) {
      groups[groupKey].forEach(member => {
        if (member && member.name) {
          const memberName = member.name.toLowerCase();
          const nickname = (member.nickname || '').toLowerCase();
          
          // 检查姓名或花名是否匹配
          if (memberName.includes(lowerQuery) || nickname.includes(lowerQuery)) {
            // 检查是否已经在排除列表中
            const isExcluded = Object.values(excludedMembers).some(excluded => 
              excluded.name === member.name && excluded.group === groupKey
            );
            
            if (!isExcluded) {
              // 检查是否已经选择
              const isSelected = selectedMembers.some(selected => 
                selected.name === member.name && selected.groupKey === groupKey
              );
              
              suggestions.push({
                type: 'member',
                ...member,
                groupKey: groupKey,
                groupName: groupNames[groupKey] || groupKey,
                isSelected: isSelected
              });
            }
          }
        }
      });
    }
  });
  
  // 显示建议
  if (suggestions.length > 0) {
    showExcludeSuggestions(suggestions);
  } else {
    hideExcludeSuggestions();
  }
}

// 显示排除建议 - 支持小组和成员多选
function showExcludeSuggestions(suggestions) {
  if (!excludeSuggestions) {
    console.error('excludeSuggestions元素未找到');
    return;
  }
  
  if (!Array.isArray(suggestions)) {
    console.error('suggestions不是数组');
    return;
  }
  
  excludeSuggestions.innerHTML = '';
  excludeSuggestions.classList.remove('hidden');
  
  suggestions.slice(0, 15).forEach(item => {
    if (!item) return;
    
    const div = document.createElement('div');
    
    if (item.type === 'group') {
      // 小组项
      div.className = 'suggestion-item group-item';
      div.innerHTML = `
        <div class="member-info">
          <div class="group-name">${item.groupName}</div>
          <div class="group-members-count">${item.memberCount} 个成员</div>
        </div>
        <input type="checkbox" class="select-checkbox" ${isGroupSelected(item.groupKey) ? 'checked' : ''}>
      `;
      div.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          toggleGroupSelection(item);
        }
      });
    } else if (item.type === 'member') {
      // 成员项
      div.className = `suggestion-item ${item.isSelected ? 'selected' : ''}`;
      const name = item.name || item.Name || item.姓名 || item.fullName;
      const nickname = item.nickname || item.Nickname || item.花名 || item.alias;
      
      div.innerHTML = `
        <div class="member-info">
          <div class="member-name">${name}${nickname ? ` (${nickname})` : ''}</div>
          <div class="member-group">${item.groupName}</div>
        </div>
        <input type="checkbox" class="select-checkbox" ${item.isSelected ? 'checked' : ''}>
      `;
      div.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          toggleMemberSelection(item);
        }
      });
    }
    
    excludeSuggestions.appendChild(div);
  });
}

// 隐藏排除建议 - 按照index页面标准实现
function hideExcludeSuggestions() {
  if (excludeSuggestions) {
    excludeSuggestions.classList.add('hidden');
    excludeSuggestions.innerHTML = '';
  }
}

// 旧的单选功能已移除，现在使用多选功能

// 旧的单选添加功能已移除，现在使用多选功能

// 从排除列表移除
async function removeFromExcludeList(memberUUID) {
  if (!confirm('确定要从排除列表中移除该成员吗？')) {
    return;
  }
  
  try {
    // 从排除列表移除
    delete excludedMembers[memberUUID];
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('excludedMembers', excludedMembers);
        window.newDataManager.markDataChange('excludedMembers', 'modified', 'exclude_edit');
    }
    
    // 更新显示
    loadExcludedMembers();
    
    // 后台同步
    if (window.newDataManager) {
      window.newDataManager.performManualSync();
    }
    
    alert('成员已从排除列表移除！');
    
  } catch (error) {
    console.error('从排除列表移除失败:', error);
    alert('从排除列表移除失败，请重试！');
  }
}

// 加载排除成员列表
function loadExcludedMembers() {
  if (!excludeList) return;
  
  const excludedList = Object.values(excludedMembers);
  
  if (excludedList.length === 0) {
    excludeList.innerHTML = '<div class="no-data">暂无排除成员</div>';
    filteredExcludedMembers = [];
    return;
  }
  
  // 如果没有搜索条件，显示所有成员
  if (!excludeListSearchInput || !excludeListSearchInput.value.trim()) {
    filteredExcludedMembers = excludedList;
  }
  
  displayExcludedMembers(filteredExcludedMembers);
}

// 显示排除成员列表
function displayExcludedMembers(membersToShow) {
  if (!excludeList) return;
  
  if (membersToShow.length === 0) {
    excludeList.innerHTML = '<div class="no-data">没有找到匹配的排除成员</div>';
    return;
  }
  
  excludeList.innerHTML = '';
  
  membersToShow.forEach(member => {
    const item = document.createElement('div');
    item.className = 'exclude-item';
    item.innerHTML = `
      <span>${member.name} (${member.groupName})</span>
      <button class="remove-btn" onclick="removeFromExcludeList('${member.uuid || Object.keys(excludedMembers).find(key => excludedMembers[key] === member)}')">移除</button>
    `;
    excludeList.appendChild(item);
  });
}

// ==================== 排除列表搜索功能 ====================

// 处理排除列表搜索
function handleExcludeListSearch() {
  const query = excludeListSearchInput.value.trim().toLowerCase();
  
  if (!query) {
    // 如果没有搜索条件，显示所有排除成员
    filteredExcludedMembers = Object.values(excludedMembers);
    displayExcludedMembers(filteredExcludedMembers);
    return;
  }
  
  // 过滤排除成员
  const allExcludedMembers = Object.values(excludedMembers);
  filteredExcludedMembers = allExcludedMembers.filter(member => {
    if (!member || !member.name) return false;
    
    // 支持多种字段名搜索
    const name = member.name || member.Name || member.姓名 || member.fullName;
    const nickname = member.nickname || member.Nickname || member.花名 || member.alias;
    const groupName = member.groupName || member.group;
    
    // 搜索姓名、花名和组别
    const nameMatch = name && name.toLowerCase().includes(query);
    const nicknameMatch = nickname && nickname.toLowerCase().includes(query);
    const groupMatch = groupName && groupName.toLowerCase().includes(query);
    
    return nameMatch || nicknameMatch || groupMatch;
  });
  
  displayExcludedMembers(filteredExcludedMembers);
}

// 清除排除列表搜索
function clearExcludeListSearchInput() {
  if (excludeListSearchInput) {
    excludeListSearchInput.value = '';
    filteredExcludedMembers = Object.values(excludedMembers);
    displayExcludedMembers(filteredExcludedMembers);
  }
}

// ==================== 工具函数 ====================

// 生成UUID
// generateUUID函数已移至utils.js，使用window.utils.generateUUID()

// 清空添加成员表单
function clearAddMemberForm() {
  document.getElementById('addMemberName').value = '';
  if (document.getElementById('addMemberNickname')) {
    document.getElementById('addMemberNickname').value = '';
  }
  document.getElementById('addMemberPhone').value = '';
  document.getElementById('addMemberGender').value = '';
  document.getElementById('addMemberBaptized').value = '';
  document.getElementById('addMemberAge').value = '';
}

// 防止表单提交刷新页面
function preventFormSubmission() {
  // 防止所有表单的默认提交行为
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 防止Enter键提交表单
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  
  // 防止keypress事件
  document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// ==================== 多选功能 ====================

// 切换成员选择状态
function toggleMemberSelection(member) {
  const existingIndex = selectedMembers.findIndex(selected => 
    selected.name === member.name && selected.groupKey === member.groupKey
  );
  
  if (existingIndex >= 0) {
    // 取消选择
    selectedMembers.splice(existingIndex, 1);
  } else {
    // 添加选择
    selectedMembers.push({
      name: member.name,
      groupKey: member.groupKey,
      groupName: member.groupName,
      uuid: member.uuid,
      nickname: member.nickname
    });
  }
  
  updateSelectedMembersDisplay();
  updateSearchSuggestions();
}

// 切换小组选择状态
function toggleGroupSelection(group) {
  const groupMembers = group.members || [];
  const allSelected = groupMembers.every(member => 
    selectedMembers.some(selected => 
      selected.name === member.name && selected.groupKey === group.groupKey
    )
  );
  
  if (allSelected) {
    // 取消选择整个小组
    selectedMembers = selectedMembers.filter(selected => 
      selected.groupKey !== group.groupKey
    );
  } else {
    // 选择整个小组
    groupMembers.forEach(member => {
      const exists = selectedMembers.some(selected => 
        selected.name === member.name && selected.groupKey === group.groupKey
      );
      if (!exists) {
        selectedMembers.push({
          name: member.name,
          groupKey: group.groupKey,
          groupName: group.groupName,
          uuid: member.uuid,
          nickname: member.nickname
        });
      }
    });
  }
  
  updateSelectedMembersDisplay();
  updateSearchSuggestions();
}

// 检查小组是否已选择
function isGroupSelected(groupKey) {
  const groupMembers = groups[groupKey] || [];
  return groupMembers.every(member => 
    selectedMembers.some(selected => 
      selected.name === member.name && selected.groupKey === groupKey
    )
  );
}

// 更新已选择成员显示
function updateSelectedMembersDisplay() {
  if (!selectedMembersList || !selectedCount) return;
  
  selectedCount.textContent = selectedMembers.length;
  selectedMembersList.innerHTML = '';
  
  selectedMembers.forEach(member => {
    const item = document.createElement('div');
    item.className = 'selected-member-item';
    item.innerHTML = `
      <div class="member-info">
        <div class="member-name">${member.name}${member.nickname ? ` (${member.nickname})` : ''}</div>
        <div class="member-group">${member.groupName}</div>
      </div>
      <button class="remove-btn" onclick="removeSelectedMember('${member.name}', '${member.groupKey}')">×</button>
    `;
    selectedMembersList.appendChild(item);
  });
}

// 移除已选择的成员
function removeSelectedMember(name, groupKey) {
  selectedMembers = selectedMembers.filter(member => 
    !(member.name === name && member.groupKey === groupKey)
  );
  updateSelectedMembersDisplay();
  updateSearchSuggestions();
}

// 清空所有选择
function clearSelectedMembers() {
  selectedMembers = [];
  updateSelectedMembersDisplay();
  updateSearchSuggestions();
  if (excludeSearchInput) {
    excludeSearchInput.value = '';
  }
  hideExcludeSuggestions();
}

// 更新搜索建议的选中状态
function updateSearchSuggestions() {
  if (excludeSuggestions && !excludeSuggestions.classList.contains('hidden')) {
    // 重新触发搜索以更新选中状态
    handleExcludeSearch();
  }
}

// 更新添加到排除列表的函数
async function addToExcludeList() {
  if (selectedMembers.length === 0) {
    alert('请先选择要排除的成员！');
    return;
  }
  
  try {
    let addedCount = 0;
    
    // 批量添加选中的成员
    selectedMembers.forEach(member => {
      // 检查是否已经在排除列表中
      const isExcluded = Object.values(excludedMembers).some(excluded => 
        excluded.name === member.name && excluded.group === member.groupKey
      );
      
      if (!isExcluded) {
        excludedMembers[member.uuid] = {
          name: member.name,
          group: member.groupKey,
          groupName: member.groupName,
          addedAt: new Date().toISOString()
        };
        addedCount++;
      }
    });
    
    if (addedCount === 0) {
      alert('所选成员已全部在排除列表中！');
      return;
    }
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('excludedMembers', excludedMembers);
      window.newDataManager.markDataChange('excludedMembers', 'modified', 'exclude_edit');
    }
    
    // 更新显示
    loadExcludedMembers();
    
    // 清空选择
    clearSelectedMembers();
    
    // 后台同步
    if (window.newDataManager) {
      window.newDataManager.performManualSync();
    }
    
    alert(`已成功添加 ${addedCount} 个成员到排除列表！`);
    
  } catch (error) {
    console.error('添加到排除列表失败:', error);
    alert('添加到排除列表失败，请重试！');
  }
}

// ==================== 成员移动功能 ====================

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
    window.moveMemberInProgress = false;
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
  
  try {
    console.log(`开始移动成员: ${member.name} 从 ${currentGroup} 到 ${targetGroup}`);
    
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
    
    // 更新未签到不统计列表中的成员信息
    if (typeof excludedMembers !== 'undefined' && excludedMembers.length > 0) {
      excludedMembers.forEach(excluded => {
        if (excluded.name === member.name && excluded.group === currentGroup) {
          excluded.group = targetGroup;
          console.log(`更新排除列表中成员的小组信息: ${member.name} -> ${targetGroup}`);
        }
      });
      
      // 保存排除列表更新
      if (window.newDataManager) {
        window.newDataManager.saveToLocalStorage('excludedMembers', excludedMembers);
        window.newDataManager.markDataChange('excludedMembers', 'modified', member.name);
      }
    }
    
    // 保存到本地存储
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groups', groups);
      window.newDataManager.markDataChange('groups', 'modified', member.name);
      
      // 同步到Firebase
      try {
        await window.newDataManager.syncToFirebase();
        console.log('✅ 成员移动数据已同步到Firebase');
      } catch (error) {
        console.error('❌ 同步到Firebase失败:', error);
        alert('移动成功，但同步到服务器失败，请稍后手动同步！');
      }
    }
    
    console.log(`✅ 成员移动完成: ${member.name} 从 ${currentGroup} 到 ${targetGroup}`);
    
    // 重新加载成员列表
    if (groupSelect && groupSelect.value === currentGroup) {
      displayMembers(currentGroup);
    } else if (groupSelect && groupSelect.value === targetGroup) {
      displayMembers(targetGroup);
    } else {
      // 如果当前没有选择小组，则重新加载当前选择的小组
      const selectedGroup = groupSelect.value;
      if (selectedGroup) {
        displayMembers(selectedGroup);
      }
    }
    
    alert(`成员 ${member.name} 已成功移动到"${groupNames[targetGroup] || targetGroup}"！\n\n注意：历史签到记录保持原样，反映当时的真实情况。`);
    
  } catch (error) {
    console.error('❌ 成员移动失败:', error);
    alert('成员移动失败，请重试！');
  }
}

// ==================== 导出成员功能 ====================

// 显示导出对话框
function showExportDialog() {
  if (exportMembersDialog) {
    exportMembersDialog.classList.remove('hidden-form');
    
    // 根据当前选择的小组更新导出范围提示
    const currentGroupOption = document.querySelector('input[name="exportScope"][value="current"]');
    if (currentGroupOption && groupSelect.value) {
      const groupDisplayName = groupNames[groupSelect.value] || groupSelect.value;
      currentGroupOption.nextElementSibling.textContent = `当前选择的小组 (${groupDisplayName})`;
    } else if (currentGroupOption) {
      currentGroupOption.nextElementSibling.textContent = '当前选择的小组 (未选择)';
      currentGroupOption.disabled = true;
    }
  }
}

// 隐藏导出对话框
function hideExportDialog() {
  if (exportMembersDialog) {
    exportMembersDialog.classList.add('hidden-form');
  }
}

// 处理导出成员
function handleExportMembers() {
  try {
    // 获取导出选项
    const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;
    const exportScope = document.querySelector('input[name="exportScope"]:checked').value;
    const selectedFields = Array.from(document.querySelectorAll('input[name="exportFields"]:checked')).map(cb => cb.value);
    
    // 检查是否选择了当前小组但未选择小组
    if (exportScope === 'current' && !groupSelect.value) {
      alert('请先选择要导出的小组！');
      return;
    }
    
    // 检查是否选择了导出字段
    if (selectedFields.length === 0) {
      alert('请至少选择一个导出字段！');
      return;
    }
    
    // 准备导出数据
    let exportData = [];
    
    if (exportScope === 'current') {
      // 导出当前小组
      const currentGroup = groupSelect.value;
      const groupDisplayName = groupNames[currentGroup] || currentGroup;
      const members = groups[currentGroup] || [];
      
      members.forEach((member, index) => {
        const memberData = {
          groupName: groupDisplayName,
          groupKey: currentGroup,
          uuid: member.uuid || '',
          name: member.name || '',
          nickname: member.nickname || '',
          gender: member.gender || '',
          phone: member.phone || '',
          baptized: member.baptized || '',
          age: member.age || '',
          index: index + 1
        };
        
        // 只包含选中的字段
        const filteredData = {};
        selectedFields.forEach(field => {
          filteredData[field] = memberData[field] || '';
        });
        
        exportData.push(filteredData);
      });
      
      console.log(`📊 准备导出当前小组 "${groupDisplayName}" 的 ${exportData.length} 个成员`);
      
    } else {
      // 导出所有小组
      Object.keys(groups).forEach(groupKey => {
        const groupDisplayName = groupNames[groupKey] || groupKey;
        const members = groups[groupKey] || [];
        
        members.forEach((member, index) => {
          const memberData = {
            groupName: groupDisplayName,
            groupKey: groupKey,
            uuid: member.uuid || '',
            name: member.name || '',
            nickname: member.nickname || '',
            gender: member.gender || '',
            phone: member.phone || '',
            baptized: member.baptized || '',
            age: member.age || '',
            index: index + 1
          };
          
          // 只包含选中的字段
          const filteredData = {};
          selectedFields.forEach(field => {
            filteredData[field] = memberData[field] || '';
          });
          
          exportData.push(filteredData);
        });
      });
      
      console.log(`📊 准备导出所有小组的 ${exportData.length} 个成员`);
    }
    
    if (exportData.length === 0) {
      alert('没有找到要导出的成员数据！');
      return;
    }
    
    // 执行导出
    if (exportFormat === 'csv') {
      exportToCSV(exportData, selectedFields);
    } else if (exportFormat === 'json') {
      exportToJSON(exportData);
    }
    
    // 关闭对话框
    hideExportDialog();
    
  } catch (error) {
    console.error('❌ 导出失败:', error);
    alert('导出失败，请重试！');
  }
}

// 导出为CSV格式
function exportToCSV(data, fields) {
  try {
    // 生成CSV标题行
    const headers = fields.map(field => {
      const fieldNames = {
        'groupName': '小组名称',
        'uuid': 'UUID',
        'name': '姓名',
        'nickname': '花名',
        'gender': '性别',
        'phone': '联系方式',
        'baptized': '是否受洗',
        'age': '年龄段'
      };
      return fieldNames[field] || field;
    });
    
    // 生成CSV内容
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        fields.map(field => {
          const value = row[field] || '';
          // 处理包含逗号或引号的值
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 下载文件
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const scope = document.querySelector('input[name="exportScope"]:checked').value === 'current' ? 
      (groupNames[groupSelect.value] || groupSelect.value) : 'all_groups';
    link.setAttribute('download', `members_export_${scope}_${timestamp}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV文件导出成功');
    alert(`✅ 成功导出 ${data.length} 个成员信息到CSV文件！`);
    
  } catch (error) {
    console.error('❌ CSV导出失败:', error);
    alert('CSV导出失败，请重试！');
  }
}

// 导出为JSON格式
function exportToJSON(data) {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // 下载文件
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const scope = document.querySelector('input[name="exportScope"]:checked').value === 'current' ? 
      (groupNames[groupSelect.value] || groupSelect.value) : 'all_groups';
    link.setAttribute('download', `members_export_${scope}_${timestamp}.json`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ JSON文件导出成功');
    alert(`✅ 成功导出 ${data.length} 个成员信息到JSON文件！`);
    
  } catch (error) {
    console.error('❌ JSON导出失败:', error);
    alert('JSON导出失败，请重试！');
  }
}

// ==================== 修改组名功能 ====================

// 显示修改组名表单
function showEditGroupForm() {
  const selectedGroup = groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择要修改的小组！');
    return;
  }
  
  const currentGroupName = groupNames[selectedGroup] || selectedGroup;
  
  // 填充当前的小组名称和描述
  if (editGroupName) {
    editGroupName.value = currentGroupName;
  }
  
  if (editGroupDescription) {
    // 如果有描述信息，可以在这里填充
    editGroupDescription.value = '';
  }
  
  // 显示表单
  if (editGroupForm) {
    editGroupForm.classList.remove('hidden-form');
    // 聚焦到名称输入框
    if (editGroupName) {
      editGroupName.focus();
      editGroupName.select();
    }
  }
}

// 隐藏修改组名表单
function hideEditGroupForm() {
  if (editGroupForm) {
    editGroupForm.classList.add('hidden-form');
  }
  
  // 清空表单
  if (editGroupName) {
    editGroupName.value = '';
  }
  if (editGroupDescription) {
    editGroupDescription.value = '';
  }
}

// 处理保存修改组名
async function handleSaveEditGroup() {
  const selectedGroup = groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择要修改的小组！');
    return;
  }
  
  const newName = editGroupName ? editGroupName.value.trim() : '';
  const newDescription = editGroupDescription ? editGroupDescription.value.trim() : '';
  
  if (!newName) {
    alert('请输入新的小组名称！');
    return;
  }
  
  const currentGroupName = groupNames[selectedGroup] || selectedGroup;
  if (newName === currentGroupName) {
    alert('新名称与当前名称相同，无需修改！');
    return;
  }
  
  try {
    console.log(`开始修改小组名称: ${selectedGroup} -> ${newName}`);
    
    // 更新小组名称
    groupNames[selectedGroup] = newName;
    
    // 如果有描述信息，也可以保存（这里可以根据需要扩展）
    if (newDescription && newDescription !== '') {
      console.log(`小组描述: ${newDescription}`);
      // 可以扩展保存描述信息的逻辑
    }
    
    // 保存到本地存储
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groupNames', groupNames);
      window.newDataManager.markDataChange('groupNames', 'modified', selectedGroup);
      
      // 同步到Firebase
      try {
        await window.newDataManager.syncToFirebase();
        console.log('✅ 小组名称修改数据已同步到Firebase');
      } catch (error) {
        console.error('❌ 同步到Firebase失败:', error);
        alert('小组名称修改成功，但同步到服务器失败，请稍后手动同步！');
      }
    }
    
    console.log(`✅ 小组名称修改完成: ${selectedGroup} -> ${newName}`);
    
    // 更新小组选择器显示
    updateGroupSelect();
    
    // 如果当前选择的是被修改的小组，刷新成员列表
    if (groupSelect && groupSelect.value === selectedGroup) {
      displayMembers(selectedGroup);
    }
    
    // 隐藏表单
    hideEditGroupForm();
    
    alert(`小组名称修改成功！\n原名称: ${currentGroupName}\n新名称: ${newName}`);
    
  } catch (error) {
    console.error('❌ 修改小组名称失败:', error);
    alert('修改小组名称失败，请重试！');
  }
}

// 全局函数（供HTML调用）
window.editMember = editMember;
window.deleteMember = deleteMember;
window.moveMember = window.moveMember; // 移动成员功能
window.removeFromExcludeList = removeFromExcludeList;
window.removeSelectedMember = removeSelectedMember;
window.clearSelectedMembers = clearSelectedMembers;
