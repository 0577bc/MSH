/**
 * 小组管理 - 修改组名模块
 * 功能：修改组名、组名编辑表单
 */

// ==================== 修改组名功能 ====================

/**
 * 显示修改组名表单
 */
function showEditGroupForm() {
  const dom = window.groupManagement.dom;
  const groupNames = window.groupManagement.groupNames;
  
  const selectedGroup = dom.groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择要修改的小组！');
    return;
  }
  
  const currentGroupName = groupNames[selectedGroup] || selectedGroup;
  
  // 填充当前的小组名称和描述
  if (dom.editGroupName) {
    dom.editGroupName.value = currentGroupName;
  }
  
  if (dom.editGroupDescription) {
    // 如果有描述信息，可以在这里填充
    dom.editGroupDescription.value = '';
  }
  
  // 显示表单
  if (dom.editGroupForm) {
    dom.editGroupForm.classList.remove('hidden-form');
    // 聚焦到名称输入框
    if (dom.editGroupName) {
      dom.editGroupName.focus();
      dom.editGroupName.select();
    }
  }
}

/**
 * 隐藏修改组名表单
 */
function hideEditGroupForm() {
  const dom = window.groupManagement.dom;
  
  if (dom.editGroupForm) {
    dom.editGroupForm.classList.add('hidden-form');
  }
  
  // 清空表单
  if (dom.editGroupName) {
    dom.editGroupName.value = '';
  }
  if (dom.editGroupDescription) {
    dom.editGroupDescription.value = '';
  }
}

/**
 * 处理保存修改组名
 */
async function handleSaveEditGroup() {
  const dom = window.groupManagement.dom;
  const groupNames = window.groupManagement.groupNames;
  
  const selectedGroup = dom.groupSelect.value;
  if (!selectedGroup) {
    alert('请先选择要修改的小组！');
    return;
  }
  
  const newName = dom.editGroupName ? dom.editGroupName.value.trim() : '';
  const newDescription = dom.editGroupDescription ? dom.editGroupDescription.value.trim() : '';
  
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
    
    // 更新全局变量
    window.groupManagement.groupNames = groupNames;
    
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
    if (window.groupManagement.updateGroupSelect) {
      window.groupManagement.updateGroupSelect();
    }
    
    // 如果当前选择的是被修改的小组，刷新成员列表
    if (dom.groupSelect && dom.groupSelect.value === selectedGroup) {
      if (window.groupManagement.displayMembers) {
        window.groupManagement.displayMembers(selectedGroup);
      }
    }
    
    // 隐藏表单
    hideEditGroupForm();
    
    alert(`小组名称修改成功！\n原名称: ${currentGroupName}\n新名称: ${newName}`);
    
  } catch (error) {
    console.error('❌ 修改小组名称失败:', error);
    alert('修改小组名称失败，请重试！');
  }
}

// ==================== 导出到 window ====================
window.groupManagement.showEditGroupForm = showEditGroupForm;
window.groupManagement.hideEditGroupForm = hideEditGroupForm;
window.groupManagement.handleSaveEditGroup = handleSaveEditGroup;

console.log('✅ 小组管理 - 修改组名模块已加载');
