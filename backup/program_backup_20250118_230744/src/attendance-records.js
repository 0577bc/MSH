/**
 * 签到原始记录页面
 * 独立管理签到数据的查看、编辑和删除
 * 版本：1.0
 */

// ==================== 全局变量和初始化 ====================
let groups = window.groups || {};
let groupNames = window.groupNames || {};
let attendanceRecords = window.attendanceRecords || [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let dateSelect, viewDateData, attendanceDataList;
let editModal;
let editForm, editName, editGroup, editTime;
let cancelEdit, saveEdit;

// 当前编辑的记录
let currentEditRecord = null;

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('attendanceRecords');
    console.log('签到记录页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  // 日期选择相关
  dateSelect = document.getElementById('dateSelect');
  viewDateData = document.getElementById('viewDateData');
  attendanceDataList = document.getElementById('attendanceDataList');
  
  // 模态框相关
  editModal = document.getElementById('editModal');
  editForm = document.getElementById('editForm');
  editName = document.getElementById('editName');
  editGroup = document.getElementById('editGroup');
  editTime = document.getElementById('editTime');
  cancelEdit = document.getElementById('cancelEdit');
  saveEdit = document.getElementById('saveEdit');
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('签到原始记录页面开始初始化...');
  
  initializeDOMElements();
  initializePageSyncManager();
  
  // 使用新数据管理器加载数据
  if (window.newDataManager) {
    try {
      // 先初始化Firebase（如果还没有初始化）
      if (!firebase.apps.length && window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('✅ Firebase应用创建成功');
      }
      
      // 等待NewDataManager完成初始化
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts && (!window.newDataManager || !window.newDataManager.isDataLoaded)) {
        console.log(`⏳ 等待NewDataManager初始化... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // 检查NewDataManager是否已经加载了数据
      if (window.newDataManager && window.newDataManager.isDataLoaded) {
        console.log('📋 数据已通过NewDataManager加载，直接使用');
        groups = window.groups || {};
        groupNames = window.groupNames || {};
        attendanceRecords = window.attendanceRecords || [];
      } else {
        // 检查是否有本地数据可以直接使用
        const hasLocalData = window.groups && Object.keys(window.groups).length > 0;
        if (hasLocalData) {
          console.log('📋 检测到本地数据，直接使用，跳过Firebase拉取');
          groups = window.groups;
          groupNames = window.groupNames || {};
          attendanceRecords = window.attendanceRecords || [];
        } else {
          console.log('🔄 首次加载，从Firebase拉取数据');
          await window.newDataManager.loadAllDataFromFirebase();
          
          // 从全局变量获取数据
          groups = window.groups || {};
          groupNames = window.groupNames || {};
          attendanceRecords = window.attendanceRecords || [];
        }
      }
      
      // 初始化页面
      initializePage();
      
      // 创建同步按钮
      if (window.newDataManager) {
        window.newDataManager.createSyncButton('syncButtonContainer');
      }
      
      console.log("✅ 签到原始记录页面数据加载成功");
    } catch (error) {
      console.error("❌ 签到原始记录页面数据加载失败:", error);
    }
  } else {
    console.error("❌ 新数据管理器未找到，无法加载数据");
    alert('数据管理器初始化失败，请刷新页面重试');
  }
  
  initializeEventListeners();
  console.log("签到原始记录页面初始化完成");
});

// ==================== 页面初始化 ====================
function initializePage() {
  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  if (dateSelect) dateSelect.value = today;
  
  // 加载签到数据
  loadAttendanceData(today);
  
  // 填充组别选择器
  populateGroupSelect();
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = 'summary.html';
    });
  }

  // 导出按钮事件
  const exportButton = document.getElementById('exportButton');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportAttendanceData();
    });
  }

  // 日期选择事件
  if (dateSelect) {
    dateSelect.addEventListener('change', () => {
      const selectedDate = dateSelect.value;
      loadAttendanceData(selectedDate);
    });
  }

  // 查看数据按钮事件
  if (viewDateData) {
    viewDateData.addEventListener('click', () => {
      const selectedDate = dateSelect ? dateSelect.value : '';
      loadAttendanceData(selectedDate);
    });
  }

  // 编辑模态框事件
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      closeEditModal();
    });
  }

  if (saveEdit) {
    saveEdit.addEventListener('click', () => {
      saveEditedRecord();
    });
  }


  // 模态框关闭事件
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        closeEditModal();
      }
    });
  }


  // 关闭按钮事件
  const closeButtons = document.querySelectorAll('.close');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      closeEditModal();
    });
  });
}

// ==================== 数据加载 ====================
function loadAttendanceData(date) {
  if (!attendanceDataList) return;
  
  console.log('加载签到数据，日期:', date);
  
  let filteredRecords = attendanceRecords;
  
  // 如果指定了日期，过滤记录
  if (date) {
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    filteredRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );
  }
  
  console.log('加载签到数据，记录数量:', filteredRecords.length);
  
  attendanceDataList.innerHTML = '';
  
  if (filteredRecords.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="5" class="empty-cell">
        <div class="empty-message">
          <span class="empty-icon">📝</span>
          <span class="empty-text">暂无签到数据</span>
        </div>
      </td>
    `;
    attendanceDataList.appendChild(emptyRow);
    return;
  }

  // 按时间排序（最新的在前）
  filteredRecords.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  filteredRecords.forEach((record, index) => {
    const row = document.createElement('tr');
    const displayGroup = groupNames[record.group] || record.group;
    const signinTime = new Date(record.time).toLocaleString('zh-CN');
    
    // 找到记录在原始数组中的索引
    const originalIndex = attendanceRecords.findIndex(r => 
      r.name === record.name && 
      r.group === record.group && 
      r.time === record.time
    );
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${record.name}</td>
      <td>${displayGroup}</td>
      <td>${signinTime}</td>
      <td>
        <button class="btn btn-sm btn-primary edit-btn" data-original-index="${originalIndex}" data-display-index="${index}">编辑</button>
      </td>
    `;
    
    attendanceDataList.appendChild(row);
  });
  
  // 添加编辑事件监听器
  addEditEventListeners();
}

// ==================== 编辑事件监听器 ====================
function addEditEventListeners() {
  // 编辑按钮事件
  const editButtons = attendanceDataList.querySelectorAll('.edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const originalIndex = parseInt(e.target.dataset.originalIndex);
      const displayIndex = parseInt(e.target.dataset.displayIndex);
      
      console.log('编辑按钮点击，显示索引:', displayIndex, '原始索引:', originalIndex);
      
      // 直接使用原始索引获取记录
      if (originalIndex >= 0 && originalIndex < attendanceRecords.length) {
        const record = attendanceRecords[originalIndex];
        console.log('要编辑的记录:', record);
        console.log('记录姓名:', record.name, '记录组别:', record.group, '记录时间:', record.time);
        
        openEditModal(record, originalIndex);
      } else {
        console.error('原始索引超出范围:', originalIndex);
        alert('编辑失败：记录索引错误');
      }
    });
  });
}

// ==================== 编辑功能 ====================
function openEditModal(record, index) {
  currentEditRecord = { record, index };
  
  if (editName) editName.value = record.name;
  if (editTime) {
    // 转换时间格式为datetime-local需要的格式
    const date = new Date(record.time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    editTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  // 设置组别选择器
  if (editGroup) {
    editGroup.innerHTML = '';
    // 使用groups对象来获取所有组别，确保显示完整
    Object.keys(groups).forEach(groupId => {
      const option = document.createElement('option');
      option.value = groupId;
      option.textContent = groupNames[groupId] || groupId;
      if (groupId === record.group) {
        option.selected = true;
      }
      editGroup.appendChild(option);
    });
  }
  
  if (editModal) {
    editModal.style.display = 'block';
  }
}

function closeEditModal() {
  if (editModal) {
    editModal.style.display = 'none';
  }
  currentEditRecord = null;
}

function saveEditedRecord() {
  if (!currentEditRecord) return;
  
  const { record, index } = currentEditRecord;
  
  // 获取表单数据
  const newName = editName ? editName.value.trim() : '';
  const newGroup = editGroup ? editGroup.value : '';
  const newTime = editTime ? editTime.value : '';
  
  if (!newName || !newGroup || !newTime) {
    alert('请填写完整信息');
    return;
  }
  
  // 验证姓名格式
  if (newName.length < 2 || newName.length > 10) {
    alert('姓名长度应在2-10个字符之间');
    return;
  }
  
  // 验证时间格式
  const newDateTime = new Date(newTime);
  if (isNaN(newDateTime.getTime())) {
    alert('请选择有效的时间');
    return;
  }
  
  // 验证时间是否在合理范围内（不能是未来时间）
  const now = new Date();
  if (newDateTime > now) {
    alert('签到时间不能是未来时间');
    return;
  }
  
  // 更新记录
  const updatedRecord = {
    ...record,
    name: newName,
    group: newGroup,
    time: new Date(newTime).toISOString()
  };
  
  // 更新数组
  attendanceRecords[index] = updatedRecord;
  
  // 保存到本地存储
  if (window.newDataManager) {
    window.newDataManager.saveToLocalStorage('attendanceRecords', attendanceRecords);
    window.newDataManager.markDataChange('attendanceRecords', 'modified', record.uuid || record.time);
  }
  
  // 更新全局变量
  window.attendanceRecords = attendanceRecords;
  
  // 重新加载数据
  const currentDate = dateSelect ? dateSelect.value : '';
  loadAttendanceData(currentDate);
  
  // 关闭模态框
  closeEditModal();
  
  console.log('签到记录已更新');
  alert('签到记录已更新！');
}


// ==================== 导出功能 ====================
function exportAttendanceData() {
  const selectedDate = dateSelect ? dateSelect.value : '';
  const currentDate = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
  
  let fileName = `MSH签到原始记录_${selectedDate || currentDate}`;
  
  // 获取当前显示的数据
  let exportData = attendanceRecords;
  if (selectedDate) {
    const targetDate = new Date(selectedDate).toLocaleDateString('zh-CN');
    exportData = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );
  }
  
  // 转换为CSV格式
  const csvContent = convertToCSV(exportData);
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
  
  console.log('签到数据已导出');
}

function convertToCSV(data) {
  const headers = ['序号', '姓名', '组别', '签到时间'];
  const csvRows = [headers.join(',')];
  
  data.forEach((record, index) => {
    const displayGroup = groupNames[record.group] || record.group;
    const signinTime = new Date(record.time).toLocaleString('zh-CN');
    
    const row = [
      index + 1,
      `"${record.name}"`,
      `"${displayGroup}"`,
      `"${signinTime}"`
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

// ==================== 辅助功能 ====================
function populateGroupSelect() {
  if (!editGroup) return;
  
  editGroup.innerHTML = '';
  Object.keys(groupNames).forEach(groupName => {
    const option = document.createElement('option');
    option.value = groupName;
    option.textContent = groupNames[groupName];
    editGroup.appendChild(option);
  });
}
