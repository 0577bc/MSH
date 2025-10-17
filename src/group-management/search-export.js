/**
 * 小组管理 - 搜索和导出模块
 * 功能：成员搜索、数据导出（CSV/JSON）
 */

// ==================== 人员检索 ====================

/**
 * 处理人员检索
 */
function handleMemberSearch() {
  const dom = window.groupManagement.dom;
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
  const searchTerm = dom.memberSearch.value.trim().toLowerCase();
  
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

/**
 * 显示建议
 */
function showSuggestions(matches) {
  const dom = window.groupManagement.dom;
  
  if (!dom.memberSuggestions) return;
  
  dom.memberSuggestions.innerHTML = '';
  dom.memberSuggestions.classList.remove('hidden');
  
  matches.slice(0, 10).forEach(member => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = `${member.name} (${member.groupName})`;
    item.addEventListener('click', () => {
      selectMember(member);
    });
    dom.memberSuggestions.appendChild(item);
  });
}

/**
 * 隐藏建议
 */
function hideSuggestions() {
  const dom = window.groupManagement.dom;
  
  if (dom.memberSuggestions) {
    dom.memberSuggestions.classList.add('hidden');
  }
}

/**
 * 选择成员
 */
function selectMember(member) {
  const dom = window.groupManagement.dom;
  
  // 选择对应的小组
  dom.groupSelect.value = member.groupKey;
  
  // 显示成员列表
  if (window.groupManagement.displayMembers) {
    window.groupManagement.displayMembers(member.groupKey);
  }
  
  // 清空搜索
  dom.memberSearch.value = '';
  hideSuggestions();
}

// ==================== 导出成员功能 ====================

/**
 * 显示导出对话框
 */
function showExportDialog() {
  const dom = window.groupManagement.dom;
  const groupNames = window.groupManagement.groupNames;
  
  if (dom.exportMembersDialog) {
    dom.exportMembersDialog.classList.remove('hidden-form');
    
    // 根据当前选择的小组更新导出范围提示
    const currentGroupOption = document.querySelector('input[name="exportScope"][value="current"]');
    if (currentGroupOption && dom.groupSelect.value) {
      const groupDisplayName = groupNames[dom.groupSelect.value] || dom.groupSelect.value;
      currentGroupOption.nextElementSibling.textContent = `当前选择的小组 (${groupDisplayName})`;
    } else if (currentGroupOption) {
      currentGroupOption.nextElementSibling.textContent = '当前选择的小组 (未选择)';
      currentGroupOption.disabled = true;
    }
  }
}

/**
 * 隐藏导出对话框
 */
function hideExportDialog() {
  const dom = window.groupManagement.dom;
  
  if (dom.exportMembersDialog) {
    dom.exportMembersDialog.classList.add('hidden-form');
  }
}

/**
 * 处理导出成员
 */
function handleExportMembers() {
  const dom = window.groupManagement.dom;
  const groups = window.groupManagement.groups;
  const groupNames = window.groupManagement.groupNames;
  
  try {
    // 获取导出选项
    const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;
    const exportScope = document.querySelector('input[name="exportScope"]:checked').value;
    const selectedFields = Array.from(document.querySelectorAll('input[name="exportFields"]:checked')).map(cb => cb.value);
    
    // 检查是否选择了当前小组但未选择小组
    if (exportScope === 'current' && !dom.groupSelect.value) {
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
      const currentGroup = dom.groupSelect.value;
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

/**
 * 导出为CSV格式
 */
function exportToCSV(data, fields) {
  const dom = window.groupManagement.dom;
  const groupNames = window.groupManagement.groupNames;
  
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
      (groupNames[dom.groupSelect.value] || dom.groupSelect.value) : 'all_groups';
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

/**
 * 导出为JSON格式
 */
function exportToJSON(data) {
  const dom = window.groupManagement.dom;
  const groupNames = window.groupManagement.groupNames;
  
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
      (groupNames[dom.groupSelect.value] || dom.groupSelect.value) : 'all_groups';
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

// ==================== 导出到 window ====================
window.groupManagement.handleMemberSearch = handleMemberSearch;
window.groupManagement.showSuggestions = showSuggestions;
window.groupManagement.hideSuggestions = hideSuggestions;
window.groupManagement.selectMember = selectMember;
window.groupManagement.showExportDialog = showExportDialog;
window.groupManagement.hideExportDialog = hideExportDialog;
window.groupManagement.handleExportMembers = handleExportMembers;
window.groupManagement.exportToCSV = exportToCSV;
window.groupManagement.exportToJSON = exportToJSON;

console.log('✅ 小组管理 - 搜索和导出模块已加载');
