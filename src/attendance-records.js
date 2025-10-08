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
  
  // 【优化V2.0】只加载基础数据和当天的签到记录
  await loadBasicDataAndToday();
  
  // 创建同步按钮
  if (window.newDataManager) {
    window.newDataManager.createSyncButton('syncButtonContainer');
  }
  
  initializeEventListeners();
  console.log("✅ 签到原始记录页面初始化完成（优化加载模式）");
});

// ==================== 基础数据和当天数据加载（优化V2.0）====================
/**
 * 加载基础数据和当天的签到记录
 */
async function loadBasicDataAndToday() {
  try {
    // 先初始化Firebase（如果还没有初始化）
    if (!firebase.apps.length && window.firebaseConfig) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase应用创建成功');
    }
    
    // 1. 加载基础数据
    await loadBasicData();
    
    // 2. 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    if (dateSelect) dateSelect.value = today;
    
    // 3. 只加载今天的签到记录
    await loadAttendanceDataByDate(today);
    
    console.log("✅ 签到原始记录页面数据加载成功");
    
  } catch (error) {
    console.error("❌ 签到原始记录页面数据加载失败:", error);
    alert('数据加载失败，请刷新页面重试');
  }
}

/**
 * 加载基础数据（groups、groupNames）
 */
async function loadBasicData() {
  // 优先使用全局变量
  if (window.groups && Object.keys(window.groups).length > 0) {
    groups = window.groups;
    groupNames = window.groupNames || {};
    console.log("✅ 使用全局基础数据");
    return;
  }
  
  // 从本地存储加载
  const localGroups = localStorage.getItem('msh_groups');
  const localGroupNames = localStorage.getItem('msh_group_names');
  
  if (localGroups && localGroupNames) {
    groups = JSON.parse(localGroups);
    groupNames = JSON.parse(localGroupNames);
    console.log("✅ 从本地存储加载基础数据");
    return;
  }
  
  // 从Firebase加载
  console.log("🔄 从Firebase加载基础数据...");
  const db = firebase.database();
  const [groupsSnap, groupNamesSnap] = await Promise.all([
    db.ref('groups').once('value'),
    db.ref('groupNames').once('value')
  ]);
  
  groups = groupsSnap.val() || {};
  groupNames = groupNamesSnap.val() || {};
  
  // 保存到全局和本地
  window.groups = groups;
  window.groupNames = groupNames;
  localStorage.setItem('msh_groups', JSON.stringify(groups));
  localStorage.setItem('msh_group_names', JSON.stringify(groupNames));
  
  console.log("✅ Firebase基础数据加载完成");
}

// ==================== 页面初始化 ====================
// initializePage函数已移除，逻辑整合到loadBasicDataAndToday中

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
    dateSelect.addEventListener('change', async () => {
      const selectedDate = dateSelect.value;
      // 【优化V2.0】按需加载该日期的签到数据
      await loadAttendanceDataByDate(selectedDate);
    });
  }

  // 查看数据按钮事件
  if (viewDateData) {
    viewDateData.addEventListener('click', async () => {
      const selectedDate = dateSelect ? dateSelect.value : '';
      // 【优化V2.0】按需加载该日期的签到数据
      await loadAttendanceDataByDate(selectedDate);
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

// ==================== 数据加载（优化V2.0）====================
/**
 * 按日期加载签到数据
 * @param {string} date - 日期字符串 YYYY-MM-DD
 */
async function loadAttendanceDataByDate(date) {
  if (!attendanceDataList) return;
  
  console.log(`🔄 加载 ${date} 的签到数据...`);
  
  // 检查sessionStorage缓存
  const cacheKey = `attendance_${date}`;
  let dateRecords = sessionStorage.getItem(cacheKey);
  
  // 验证缓存数据，如果缓存为空数组则重新加载
  if (dateRecords) {
    const cachedData = JSON.parse(dateRecords);
    if (cachedData && cachedData.length > 0) {
      console.log(`✅ 从缓存获取 ${date} 数据: ${cachedData.length} 条`);
      dateRecords = cachedData;
      // 直接渲染缓存数据
      renderAttendanceRecords(dateRecords);
      return;
    } else {
      console.log(`⚠️ 缓存数据为空，重新从Firebase加载`);
      sessionStorage.removeItem(cacheKey); // 清除空缓存
      dateRecords = null;
    }
  }
  
  if (!dateRecords) {
    console.log(`🔄 从Firebase加载 ${date} 数据...`);
    
    const db = firebase.database();
    // 构建ISO字符串范围（符合系统历史决策：time字段使用ISO标准格式）
    const dateStart = `${date}T00:00:00.000Z`;
    const dateEnd = `${date}T23:59:59.999Z`;
    
    console.log(`🔍 Firebase查询范围 (ISO): ${dateStart} - ${dateEnd}`);
    
    const snapshot = await db.ref('attendanceRecords')
      .orderByChild('time')
      .startAt(dateStart)
      .endAt(dateEnd)
      .once('value');
    
    dateRecords = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    // 缓存数据
    sessionStorage.setItem(cacheKey, JSON.stringify(dateRecords));
    console.log(`✅ 加载了 ${dateRecords.length} 条记录`);
  }
  
  // 渲染数据
  renderAttendanceRecords(dateRecords);
}

/**
 * 渲染签到记录
 * @param {Array} records - 签到记录数组
 */
function renderAttendanceRecords(records) {
  if (!attendanceDataList) return;
  
  attendanceDataList.innerHTML = '';
  
  if (records.length === 0) {
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
  records.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  records.forEach((record, index) => {
    const row = document.createElement('tr');
    
    // 使用快照数据
    const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
    const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
    const displayName = window.utils.getDisplayName(memberInfo);
    const signinTime = new Date(record.time).toISOString();
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${displayName}</td>
      <td>${displayGroup}</td>
      <td>${signinTime}</td>
      <td>
        <button class="btn btn-sm btn-primary edit-btn" data-record='${JSON.stringify(record)}' data-index="${index}">编辑</button>
      </td>
    `;
    
    attendanceDataList.appendChild(row);
  });
  
  // 添加编辑事件监听器
  addEditEventListeners();
}

// ==================== 编辑事件监听器（优化V2.0）====================
function addEditEventListeners() {
  // 编辑按钮事件
  const editButtons = attendanceDataList.querySelectorAll('.edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // 【优化V2.0】从按钮的data属性中直接获取记录
      const recordData = e.target.dataset.record;
      const record = JSON.parse(recordData);
      
      console.log('编辑按钮点击，记录:', record);
      
      openEditModal(record);
    });
  });
}

// ==================== 编辑功能（优化V2.0）====================
function openEditModal(record) {
  currentEditRecord = record;
  
  // 使用快照数据中的姓名，如果有花名则显示花名
  const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
  const displayName = window.utils.getDisplayName(memberInfo);
  
  if (editName) editName.value = displayName;
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

async function saveEditedRecord() {
  if (!currentEditRecord) return;
  
  const record = currentEditRecord;
  
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
  
  // 【优化V2.0】更新记录（需要更新Firebase中的记录）
  const updatedRecord = {
    ...record,
    name: newName,
    group: newGroup,
    time: new Date(newTime).toISOString(),
    timeSlot: window.utils.getAttendanceType(new Date(newTime))
  };
  
  console.log('📝 签到记录已更新:', {
    oldTime: record.time,
    newTime: updatedRecord.time,
    timeSlot: updatedRecord.timeSlot
  });
  
  // 【优化V2.0】直接更新Firebase（不依赖全局数组）
  try {
    const db = firebase.database();
    
    // 找到并更新Firebase中的记录
    // 方案：通过唯一标识查找记录（name + group + 原time）
    const recordsRef = db.ref('attendanceRecords');
    const snapshot = await recordsRef.once('value');
    const allRecords = snapshot.val() || {};
    
    // 找到匹配的记录
    let recordKey = null;
    for (const [key, value] of Object.entries(allRecords)) {
      if (value.name === record.name && 
          value.group === record.group && 
          value.time === record.time) {
        recordKey = key;
        break;
      }
    }
    
    if (recordKey) {
      // 更新找到的记录
      await recordsRef.child(recordKey).update(updatedRecord);
      console.log('✅ Firebase记录已更新');
    } else {
      console.warn('⚠️ 未找到匹配的Firebase记录');
    }
    
    // 清除该日期的缓存
    const oldDate = new Date(record.time).toISOString().split('T')[0];
    const newDate = new Date(updatedRecord.time).toISOString().split('T')[0];
    sessionStorage.removeItem(`attendance_${oldDate}`);
    if (oldDate !== newDate) {
      sessionStorage.removeItem(`attendance_${newDate}`);
    }
    
    // 重新加载当前日期的数据
    const currentDate = dateSelect ? dateSelect.value : '';
    await loadAttendanceDataByDate(currentDate);
    
    // 关闭模态框
    closeEditModal();
    
    // 显示成功提示
    alert('✅ 签到记录已成功更新');
    
  } catch (error) {
    console.error('❌ Firebase更新失败:', error);
    alert('更新失败，请重试');
  }
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
    // 使用快照数据，确保显示的是签到时的真实信息
    const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
    const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
    const displayName = window.utils.getDisplayName(memberInfo);
    const signinTime = new Date(record.time).toISOString();
    
    const row = [
      index + 1,
      `"${displayName}"`,
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
