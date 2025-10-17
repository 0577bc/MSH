/**
 * 小组管理 - 事件处理模块
 * 功能：事件监听器初始化、事件处理函数
 */

// ==================== 事件监听器初始化 ====================

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
  console.log('🔍 开始初始化事件监听器...');
  
  // 防止重复绑定
  if (window.groupManagement.eventListenersInitialized) {
    console.log('⚠️ 事件监听器已初始化，跳过重复绑定');
    return;
  }
  
  const dom = window.groupManagement.dom;
  
  // 返回按钮
  const backToAdminButton = document.getElementById('backToAdminButton');
  const backToMainButton = document.getElementById('backToMainButton');
  
  if (backToAdminButton) {
    backToAdminButton.addEventListener('click', () => {
      console.log('🔙 点击返回管理页面按钮');
      window.location.href = 'admin.html';
    });
  }
  
  if (backToMainButton) {
    backToMainButton.addEventListener('click', async () => {
      console.log('🔙 点击返回签到页面按钮');
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
  
  // 小组选择
  if (dom.groupSelect) {
    dom.groupSelect.addEventListener('change', () => {
      if (window.groupManagement.handleGroupSelect) {
        window.groupManagement.handleGroupSelect();
      }
    });
  }
  
  // 成员管理按钮
  if (dom.addMemberButton) {
    dom.addMemberButton.addEventListener('click', () => {
      if (window.groupManagement.showAddMemberForm) {
        window.groupManagement.showAddMemberForm();
      }
    });
  }
  
  if (dom.regenerateIdsButton) {
    dom.regenerateIdsButton.addEventListener('click', () => {
      if (window.groupManagement.handleRegenerateIds) {
        window.groupManagement.handleRegenerateIds();
      }
    });
  }
  
  // 小组管理按钮
  if (dom.addGroupButton) {
    dom.addGroupButton.addEventListener('click', () => {
      if (window.groupManagement.showAddGroupForm) {
        window.groupManagement.showAddGroupForm();
      }
    });
  }
  
  // 未签到不统计按钮 - 跳转到新页面
  if (dom.excludeStatsButton) {
    dom.excludeStatsButton.addEventListener('click', () => {
      console.log('🔄 跳转到未签到不统计人员管理页面...');
      window.location.href = '../tools/msh-system/excluded-members-viewer.html';
    });
  }
  
  // 导出成员按钮
  if (dom.exportMembersButton) {
    dom.exportMembersButton.addEventListener('click', () => {
      if (window.groupManagement.showExportDialog) {
        window.groupManagement.showExportDialog();
      }
    });
  }
  
  if (dom.cancelExportButton) {
    dom.cancelExportButton.addEventListener('click', () => {
      if (window.groupManagement.hideExportDialog) {
        window.groupManagement.hideExportDialog();
      }
    });
  }
  
  if (dom.confirmExportButton) {
    dom.confirmExportButton.addEventListener('click', () => {
      if (window.groupManagement.handleExportMembers) {
        window.groupManagement.handleExportMembers();
      }
    });
  }
  
  // 修改组名按钮
  if (dom.editGroupNameButton) {
    dom.editGroupNameButton.addEventListener('click', () => {
      if (window.groupManagement.showEditGroupForm) {
        window.groupManagement.showEditGroupForm();
      }
    });
  }
  
  if (dom.saveEditGroupButton) {
    dom.saveEditGroupButton.addEventListener('click', () => {
      if (window.groupManagement.handleSaveEditGroup) {
        window.groupManagement.handleSaveEditGroup();
      }
    });
  }
  
  if (dom.cancelEditGroupButton) {
    dom.cancelEditGroupButton.addEventListener('click', () => {
      if (window.groupManagement.hideEditGroupForm) {
        window.groupManagement.hideEditGroupForm();
      }
    });
  }
  
  // 人员检索
  if (dom.memberSearch) {
    dom.memberSearch.addEventListener('input', () => {
      if (window.groupManagement.handleMemberSearch) {
        window.groupManagement.handleMemberSearch();
      }
    });
    dom.memberSearch.addEventListener('focus', () => {
      if (dom.memberSearch.value.trim() && window.groupManagement.handleMemberSearch) {
        window.groupManagement.handleMemberSearch();
      }
    });
  }
  
  // 未签到不统计功能已迁移到独立页面，相关事件监听器已移除
  
  // UUID编辑器按钮
  if (dom.uuidEditorButton) {
    dom.uuidEditorButton.addEventListener('click', () => {
      console.log('🔍 点击UUID编辑器按钮');
      window.location.href = 'tools/msh-system/uuid_editor.html';
    });
  } else {
    console.error('❌ 未找到UUID编辑器按钮元素');
  }
  
  // 表单事件
  initializeFormEvents();
  
  // 标记已初始化
  window.groupManagement.eventListenersInitialized = true;
  console.log('✅ 事件监听器初始化完成');
}

// ==================== 表单事件初始化 ====================

/**
 * 初始化表单事件
 */
function initializeFormEvents() {
  // 添加成员表单
  const addMemberForm = document.getElementById('addMemberForm');
  const saveMemberButton = document.getElementById('saveMemberButton');
  const cancelMemberButton = document.getElementById('cancelMemberButton');
  
  if (saveMemberButton) {
    saveMemberButton.addEventListener('click', () => {
      if (window.groupManagement.handleSaveMember) {
        window.groupManagement.handleSaveMember();
      }
    });
  }
  
  if (cancelMemberButton) {
    cancelMemberButton.addEventListener('click', () => {
      if (addMemberForm) {
        addMemberForm.classList.add('hidden-form');
      }
    });
  }
  
  // 编辑成员表单
  const editMemberForm = document.getElementById('editMemberForm');
  const saveEditMemberButton = document.getElementById('saveEditMemberButton');
  const cancelEditMemberButton = document.getElementById('cancelEditMemberButton');
  
  if (saveEditMemberButton) {
    saveEditMemberButton.addEventListener('click', () => {
      if (window.groupManagement.handleSaveEditMember) {
        window.groupManagement.handleSaveEditMember();
      }
    });
  }
  
  if (cancelEditMemberButton) {
    cancelEditMemberButton.addEventListener('click', () => {
      if (editMemberForm) {
        editMemberForm.classList.add('hidden-form');
      }
    });
  }
  
  // 添加小组表单
  const addGroupForm = document.getElementById('addGroupForm');
  const saveGroupButton = document.getElementById('saveGroupButton');
  const cancelGroupButton = document.getElementById('cancelGroupButton');
  
  if (saveGroupButton) {
    saveGroupButton.addEventListener('click', () => {
      if (window.groupManagement.handleSaveGroup) {
        window.groupManagement.handleSaveGroup();
      }
    });
  }
  
  if (cancelGroupButton) {
    cancelGroupButton.addEventListener('click', () => {
      if (addGroupForm) {
        addGroupForm.classList.add('hidden-form');
      }
    });
  }
  
  // 删除成员确认
  const confirmDeleteMemberButton = document.getElementById('confirmDeleteMemberButton');
  const cancelDeleteMemberButton = document.getElementById('cancelDeleteMemberButton');
  
  if (confirmDeleteMemberButton) {
    confirmDeleteMemberButton.addEventListener('click', () => {
      if (window.groupManagement.handleDeleteMember) {
        window.groupManagement.handleDeleteMember();
      }
    });
  }
  
  if (cancelDeleteMemberButton) {
    cancelDeleteMemberButton.addEventListener('click', () => {
      const deleteMemberDialog = document.getElementById('deleteMemberDialog');
      if (deleteMemberDialog) {
        deleteMemberDialog.classList.add('hidden-form');
      }
    });
  }
}

// ==================== 导出到 window ====================
window.groupManagement.initializeEventListeners = initializeEventListeners;
window.groupManagement.initializeFormEvents = initializeFormEvents;

console.log('✅ 小组管理 - 事件处理模块已加载');
