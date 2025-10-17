/**
 * 小组管理 - 小组和成员操作模块
 * 功能：小组管理、成员管理、成员移动
 */

// ==================== 小组管理 ====================

/**
 * 更新小组选择下拉框
 */
function updateGroupSelect() {
  const dom = window.groupManagement.dom;
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
  if (!dom.groupSelect) {
    return;
  }
  
  // 清空现有选项
  dom.groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
  
  // 获取小组列表并排序
  const groupKeys = Object.keys(groups);
  
  if (groupKeys.length === 0) {
    dom.groupSelect.innerHTML = '<option value="">--暂无小组--</option>';
    return;
  }
  
  // 使用utils.sortGroups进行排序
  let sortedGroups = [];
  if (window.utils && window.utils.sortGroups) {
    sortedGroups = window.utils.sortGroups(groups, groupNames);
  } else {
    sortedGroups = groupKeys.sort();
  }
  
  // 添加小组选项
  sortedGroups.forEach(groupKey => {
    const displayName = groupNames[groupKey] || groupKey;
    const option = document.createElement('option');
    option.value = groupKey;
    option.textContent = displayName;
    dom.groupSelect.appendChild(option);
  });
}

/**
 * 处理小组选择
 */
function handleGroupSelect() {
  const dom = window.groupManagement.dom;
  const selectedGroup = dom.groupSelect.value;
  console.log('选择的小组:', selectedGroup);
  
  if (selectedGroup) {
    displayMembers(selectedGroup);
  } else {
    dom.memberList.innerHTML = '<tr><td colspan="8" class="no-data">请选择小组</td></tr>';
  }
}

/**
 * 显示添加小组表单
 */
function showAddGroupForm() {
  const addGroupForm = document.getElementById('addGroupForm');
  if (addGroupForm) {
    addGroupForm.classList.remove('hidden-form');
    document.getElementById('newGroupName').focus();
  }
}

/**
 * 处理保存小组
 */
async function handleSaveGroup() {
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
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
    
    // 更新全局变量
    window.groupManagement.groups = groups;
    window.groupManagement.groupNames = groupNames;
    
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

/**
 * 显示成员列表
 */
function displayMembers(groupKey) {
  const dom = window.groupManagement.dom;
  const groups = window.groupManagement.groups;
  
  console.log('显示成员列表:', groupKey);
  
  if (!dom.memberList) {
    console.error('memberList 元素未找到');
    return;
  }
  
  const members = groups[groupKey] || [];
  console.log('成员列表:', members);
  
  if (members.length === 0) {
    dom.memberList.innerHTML = '<tr><td colspan="9" class="no-data">该小组暂无成员</td></tr>';
    return;
  }
  
  dom.memberList.innerHTML = '';
  
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
      <td class="uuid-cell hidden-column" title="${member.uuid || '无UUID'}">${member.uuid ? member.uuid.substring(0, 8) + '...' : '无'}</td>
      <td>
        <button class="edit-btn" onclick="window.groupManagement.editMember('${member.uuid}', '${groupKey}')">编辑</button>
        <button class="move-btn" onclick="window.groupManagement.moveMember('${groupKey}', ${index})">移动</button>
        <button class="delete-btn" onclick="window.groupManagement.deleteMember('${member.uuid}', '${member.name}', '${groupKey}')">删除</button>
      </td>
    `;
    dom.memberList.appendChild(row);
  });
}

/**
 * 显示添加成员表单
 */
function showAddMemberForm() {
  const dom = window.groupManagement.dom;
  const selectedGroup = dom.groupSelect.value;
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

/**
 * 处理保存成员
 */
async function handleSaveMember() {
  const dom = window.groupManagement.dom;
  const groups = window.groupManagement.groups;
  const selectedGroup = dom.groupSelect.value;
  
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
    window[flagName] = false;
    return;
  }
  
  try {
    // 添加到小组
    if (!groups[selectedGroup]) {
      groups[selectedGroup] = [];
    }
    groups[selectedGroup].push(memberData);
    
    // 更新全局变量
    window.groupManagement.groups = groups;
    
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

/**
 * 清空添加成员表单
 */
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

/**
 * 编辑成员
 */
function editMember(memberUUID, groupKey) {
  const groups = window.groupManagement.groups;
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
  
  // 在编辑表单中显示UUID
  const uuidDisplay = document.getElementById('editMemberUuid');
  const uuidValue = document.querySelector('#editMemberUuid .uuid-display');
  if (uuidDisplay && uuidValue) {
    uuidValue.textContent = member.uuid || '无UUID';
    uuidDisplay.classList.remove('hidden-uuid');
  }
  
  // 存储编辑信息（包含所有需要的字段）
  window.groupManagement.selectedMember = { 
    uuid: memberUUID, 
    group: groupKey,
    createdAt: member.createdAt || new Date().toISOString()
  };
  
  // 显示编辑表单
  document.getElementById('editMemberForm').classList.remove('hidden-form');
}

/**
 * 处理保存编辑成员
 */
async function handleSaveEditMember() {
  const groups = window.groupManagement.groups;
  const selectedMember = window.groupManagement.selectedMember;
  
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
    window[flagName] = false;
    return;
  }
  
  try {
    // 更新成员信息
    const members = groups[selectedMember.group] || [];
    const memberIndex = members.findIndex(m => m.uuid === selectedMember.uuid);
    
    if (memberIndex >= 0) {
      members[memberIndex] = memberData;
      
      // 更新全局变量
      window.groupManagement.groups = groups;
      
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
      window.groupManagement.selectedMember = null;
      
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

/**
 * 删除成员
 */
function deleteMember(memberUUID, memberName, groupKey) {
  // 存储待删除成员信息
  window.groupManagement.selectedMember = { 
    uuid: memberUUID, 
    name: memberName, 
    group: groupKey 
  };
  
  // 显示删除确认对话框
  const deleteMemberDialog = document.getElementById('deleteMemberDialog');
  const deleteMemberName = document.getElementById('deleteMemberName');
  if (deleteMemberDialog && deleteMemberName) {
    deleteMemberName.textContent = memberName;
    deleteMemberDialog.classList.remove('hidden-form');
  }
}

/**
 * 处理删除成员
 */
async function handleDeleteMember() {
  const groups = window.groupManagement.groups;
  const selectedMember = window.groupManagement.selectedMember;
  
  if (!selectedMember) {
    alert('未选择要删除的成员！');
    return;
  }
  
  try {
    const members = groups[selectedMember.group] || [];
    const memberIndex = members.findIndex(m => m.uuid === selectedMember.uuid);
    
    if (memberIndex >= 0) {
      // 删除成员
      members.splice(memberIndex, 1);
      
      // 更新全局变量
      window.groupManagement.groups = groups;
      
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
      window.groupManagement.selectedMember = null;
      
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

/**
 * 重新生成成员ID
 */
async function handleRegenerateIds() {
  const groups = window.groupManagement.groups;
  
  if (!confirm('确定要重新生成所有成员的ID吗？此操作不可撤销！')) {
    return;
  }
  
  try {
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].forEach((member, index) => {
        if (!member.id) {
          member.id = `${groupKey}_${index + 1}`;
        }
      });
    });
    
    // 更新全局变量
    window.groupManagement.groups = groups;
    
    // 保存到NewDataManager
    if (window.newDataManager) {
      window.newDataManager.saveToLocalStorage('groups', groups);
      window.newDataManager.markDataChange('groups', 'modified', 'member_edit');
      window.newDataManager.performManualSync();
    }
    
    alert('成员ID重新生成成功！');
  } catch (error) {
    console.error('重新生成ID失败:', error);
    alert('重新生成ID失败，请重试！');
  }
}

// ==================== 成员移动功能 ====================

/**
 * 移动成员（入口函数）
 */
function moveMember(currentGroup, memberIndex) {
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
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
    window.moveMemberInProgress = false;
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
      // 移除对话框
      if (dialog && dialog.parentNode) {
        document.body.removeChild(dialog);
      }
      
      // 执行移动
      performMemberMove(currentGroup, memberIndex, targetGroup);
      window.moveMemberInProgress = false;
    }
  });
}

/**
 * 执行成员移动
 */
async function performMemberMove(currentGroup, memberIndex, targetGroup) {
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  const dom = window.groupManagement.dom;
  const member = groups[currentGroup][memberIndex];
  
  try {
    console.log(`开始移动成员: ${member.name} 从 ${currentGroup} 到 ${targetGroup}`);
    
    // 🔒 安全检查：目标小组必须存在
    if (!groups.hasOwnProperty(targetGroup)) {
      alert(`目标小组 "${targetGroup}" 不存在！\n移动操作已取消。`);
      console.error(`❌ 目标小组不存在: ${targetGroup}`);
      return;
    }
    
    // 直接从数组中移动成员
    groups[currentGroup].splice(memberIndex, 1);
    
    // 添加到目标小组
    groups[targetGroup].push(member);
    
    // 注意：不修改历史签到记录，保持历史数据完整性
    // 历史签到记录应该保持原来的小组信息，反映当时的真实情况
    console.log(`ℹ️ 成员 ${member.name} 已移动，但历史签到记录保持原样以维护数据完整性`);
    
    // 更新未签到不统计列表中的成员信息
    const excludedMembers = window.groupManagement.excludedMembers;
    if (typeof excludedMembers !== 'undefined' && Object.keys(excludedMembers).length > 0) {
      Object.keys(excludedMembers).forEach(key => {
        const excluded = excludedMembers[key];
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
    
    // 更新全局变量
    window.groupManagement.groups = groups;
    
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
    if (dom.groupSelect && dom.groupSelect.value === currentGroup) {
      displayMembers(currentGroup);
    } else if (dom.groupSelect && dom.groupSelect.value === targetGroup) {
      displayMembers(targetGroup);
    } else {
      // 如果当前没有选择小组，则重新加载当前选择的小组
      const selectedGroup = dom.groupSelect.value;
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

// ==================== 导出到 window ====================
window.groupManagement.updateGroupSelect = updateGroupSelect;
window.groupManagement.handleGroupSelect = handleGroupSelect;
window.groupManagement.showAddGroupForm = showAddGroupForm;
window.groupManagement.handleSaveGroup = handleSaveGroup;
window.groupManagement.displayMembers = displayMembers;
window.groupManagement.showAddMemberForm = showAddMemberForm;
window.groupManagement.handleSaveMember = handleSaveMember;
window.groupManagement.editMember = editMember;
window.groupManagement.handleSaveEditMember = handleSaveEditMember;
window.groupManagement.deleteMember = deleteMember;
window.groupManagement.handleDeleteMember = handleDeleteMember;
window.groupManagement.handleRegenerateIds = handleRegenerateIds;
window.groupManagement.moveMember = moveMember;
window.groupManagement.performMemberMove = performMemberMove;

console.log('✅ 小组管理 - 小组和成员操作模块已加载');
