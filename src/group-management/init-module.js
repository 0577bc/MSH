/**
 * 小组管理 - 初始化模块
 * 功能：页面初始化、数据加载、数据验证
 */

// ==================== 主初始化函数 ====================

/**
 * 初始化页面
 */
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
  
  // 初始化事件监听器（在 event-handlers.js 中实现）
  if (window.groupManagement.initializeEventListeners) {
    window.groupManagement.initializeEventListeners();
  }
  
  // 初始化页面显示
  initializePageDisplay();
  
  // 防止表单提交刷新页面
  preventFormSubmission();
}

// ==================== Firebase 初始化 ====================

/**
 * 初始化Firebase
 */
function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    console.log('✅ 成员管理页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 成员管理页面Firebase初始化失败');
    return false;
  }
}

// ==================== DOM 元素初始化 ====================

/**
 * 初始化DOM元素
 */
function initializeDOMElements() {
  console.log('🔍 开始初始化DOM元素...');
  
  const dom = window.groupManagement.dom;
  
  // 基本元素
  dom.groupSelect = document.getElementById('groupSelect');
  dom.memberList = document.getElementById('memberList');
  dom.addMemberButton = document.getElementById('addMemberButton');
  dom.regenerateIdsButton = document.getElementById('regenerateIdsButton');
  
  // 小组管理元素
  dom.addGroupButton = document.getElementById('addGroupButton');
  
  // 未签到不统计按钮（跳转到独立页面）
  dom.excludeStatsButton = document.getElementById('excludeStatsButton');
  
  // 人员检索元素
  dom.memberSearch = document.getElementById('memberSearch');
  dom.memberSuggestions = document.getElementById('memberSuggestions');
  
  // UUID编辑器元素
  dom.uuidEditorButton = document.getElementById('uuidEditorButton');
  
  // 导出相关元素
  dom.exportMembersButton = document.getElementById('exportMembersButton');
  dom.exportMembersDialog = document.getElementById('exportMembersDialog');
  dom.cancelExportButton = document.getElementById('cancelExportButton');
  dom.confirmExportButton = document.getElementById('confirmExportButton');
  
  // 修改组名相关元素
  dom.editGroupNameButton = document.getElementById('editGroupNameButton');
  dom.editGroupForm = document.getElementById('editGroupForm');
  dom.editGroupName = document.getElementById('editGroupName');
  dom.editGroupDescription = document.getElementById('editGroupDescription');
  dom.saveEditGroupButton = document.getElementById('saveEditGroupButton');
  dom.cancelEditGroupButton = document.getElementById('cancelEditGroupButton');
  
  const domElements = {
    groupSelect: !!dom.groupSelect,
    memberList: !!dom.memberList,
    addMemberButton: !!dom.addMemberButton,
    regenerateIdsButton: !!dom.regenerateIdsButton,
    addGroupButton: !!dom.addGroupButton,
    excludeStatsButton: !!dom.excludeStatsButton,
    memberSearch: !!dom.memberSearch,
    exportMembersButton: !!dom.exportMembersButton,
    editGroupNameButton: !!dom.editGroupNameButton
  };
  
  console.log('🔍 DOM元素初始化结果:', domElements);
}

// ==================== 等待 NewDataManager ====================

/**
 * 等待NewDataManager初始化
 */
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

// ==================== 数据加载 ====================

/**
 * 加载数据（优化版：只加载必要数据）
 */
async function loadData() {
  console.log('小组管理页面：开始加载数据...');
  
  try {
    // 等待NewDataManager设置全局变量
    let attempts = 0;
    const maxAttempts = 20;
    const timeout = 200;
    
    // 只等待必要的数据：groups, groupNames, excludedMembers
    // ❌ 不再等待 attendanceRecords（成员管理不需要签到记录）
    while (attempts < maxAttempts) {
      if (window.groups && window.groupNames && window.excludedMembers !== undefined) {
        console.log('✅ 从NewDataManager获取到必要数据');
        break;
      }
      
      attempts++;
      console.log(`⏳ 等待NewDataManager初始化... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️ 数据加载超时，尝试从localStorage加载数据');
      // 尝试从localStorage加载数据
      await loadFromLocalStorageWithValidation();
    }
    
    // 获取数据
    window.groupManagement.groups = window.groups || {};
    window.groupManagement.groupNames = window.groupNames || {};
    // ❌ 不再加载 attendanceRecords
    window.groupManagement.excludedMembers = window.excludedMembers || {};
    
    console.log('🔍 group-management.js - excludedMembers加载状态:', {
      type: typeof window.groupManagement.excludedMembers,
      isArray: Array.isArray(window.groupManagement.excludedMembers),
      count: Object.keys(window.groupManagement.excludedMembers).length
    });
    
    // 确保数据格式正确（从数组转换为对象）
    window.groupManagement.groups = normalizeDataFormat(window.groupManagement.groups, 'groups');
    window.groupManagement.groupNames = normalizeDataFormat(window.groupManagement.groupNames, 'groupNames');
    
    // 验证数据完整性
    const validation = validateDataIntegrity();
    if (!validation.isValid) {
      console.warn('⚠️ 数据完整性验证失败:', validation.errors);
      // 如果本地数据不完整，触发增量同步
      if (window.newDataManager) {
        console.log('🔄 触发增量同步...');
        await window.newDataManager.performIncrementalSync();
      }
    }
    
    console.log('✅ 小组管理页面数据加载完成', {
      groupsCount: Object.keys(window.groupManagement.groups).length,
      groupNamesCount: Object.keys(window.groupManagement.groupNames).length,
      excludedMembersCount: Object.keys(window.groupManagement.excludedMembers).length,
      dataIntegrity: validation.isValid ? '完整' : '需要同步'
    });
    
  } catch (error) {
    console.error('❌ 小组管理页面数据加载失败:', error);
    window.groupManagement.groups = {};
    window.groupManagement.groupNames = {};
    window.groupManagement.excludedMembers = {};
  }
}

/**
 * 从localStorage加载数据并验证
 */
async function loadFromLocalStorageWithValidation() {
  try {
    const storedGroups = localStorage.getItem('msh_groups');
    const storedGroupNames = localStorage.getItem('msh_groupNames');
    const storedExcludedMembers = localStorage.getItem('msh_excludedMembers');
    
    if (storedGroups) {
      window.groups = JSON.parse(storedGroups);
      console.log('✅ 从localStorage加载了groups数据');
    }
    if (storedGroupNames) {
      window.groupNames = JSON.parse(storedGroupNames);
      console.log('✅ 从localStorage加载了groupNames数据');
    }
    if (storedExcludedMembers) {
      window.excludedMembers = JSON.parse(storedExcludedMembers);
      console.log('✅ 从localStorage加载了excludedMembers数据');
    }
  } catch (error) {
    console.error('❌ 从localStorage加载数据失败:', error);
  }
}

// ==================== 数据验证 ====================

/**
 * 规范化数据格式
 */
function normalizeDataFormat(data, dataType) {
  if (Array.isArray(data)) {
    console.log(`🔧 检测到${dataType}是数组格式，开始转换...`);
    const normalizedData = {};
    
    data.forEach((item, index) => {
      if (typeof item === 'string') {
        normalizedData[item] = dataType === 'groups' ? [] : item;
      } else if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          normalizedData[key] = item[key];
        });
      } else {
        normalizedData[index.toString()] = dataType === 'groups' ? [] : index.toString();
      }
    });
    
    console.log(`✅ ${dataType}数组转换完成:`, Object.keys(normalizedData));
    return normalizedData;
  }
  return data;
}

/**
 * 验证数据完整性
 */
function validateDataIntegrity() {
  const errors = [];
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
  // 验证 groups 和 groupNames 的一致性
  const groupKeys = Object.keys(groups);
  const groupNameKeys = Object.keys(groupNames);
  
  // 检查是否有小组没有对应的名称
  groupKeys.forEach(key => {
    if (!groupNames[key]) {
      errors.push(`小组 ${key} 缺少对应的名称`);
    }
  });
  
  // 检查是否有名称没有对应的小组
  groupNameKeys.forEach(key => {
    if (!groups[key]) {
      errors.push(`小组名称 ${key} 缺少对应的小组数据`);
    }
  });
  
  // 检查成员数据的完整性
  groupKeys.forEach(groupKey => {
    const members = groups[groupKey] || [];
    members.forEach((member, index) => {
      if (!member.uuid) {
        errors.push(`小组 ${groupKey} 的成员 ${index} 缺少UUID`);
      }
      if (!member.name) {
        errors.push(`小组 ${groupKey} 的成员 ${index} 缺少姓名`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// ==================== 页面显示初始化 ====================

/**
 * 初始化页面显示
 */
function initializePageDisplay() {
  console.log('🔍 开始初始化页面显示...');
  console.log('🔍 当前数据状态:', {
    groups: window.groupManagement.groups,
    groupNames: window.groupManagement.groupNames,
    isDataLoaded: window.newDataManager ? window.newDataManager.isDataLoaded : false
  });
  
  // 更新小组选择下拉框（在 group-member-operations.js 中实现）
  if (window.groupManagement.updateGroupSelect) {
    window.groupManagement.updateGroupSelect();
  }
  
  // 加载排除成员列表 - 已移除，功能迁移到独立页面
  
  console.log('✅ 页面显示初始化完成');
}

/**
 * 防止表单提交刷新页面
 */
function preventFormSubmission() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 表单提交已阻止，避免页面刷新');
    });
  });
}

// ==================== 导出到 window ====================
window.groupManagement.initializePage = initializePage;
window.groupManagement.initializeFirebase = initializeFirebase;
window.groupManagement.initializeDOMElements = initializeDOMElements;
window.groupManagement.waitForNewDataManager = waitForNewDataManager;
window.groupManagement.loadData = loadData;
window.groupManagement.preventFormSubmission = preventFormSubmission;

console.log('✅ 小组管理 - 初始化模块已加载');
