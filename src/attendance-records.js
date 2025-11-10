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
  
  // 🔔 监听数据更新事件，自动刷新页面数据
  window.addEventListener('attendanceRecordsUpdated', (event) => {
    console.log('🔔 检测到签到记录更新事件:', event.detail);
    
    // 清除所有sessionStorage中的签到记录缓存
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('attendance_')) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ 已清除缓存: ${key}`);
      }
    });
    
    // 重新加载当前日期的数据
    if (dateSelect && dateSelect.value) {
      console.log('🔄 重新加载数据:', dateSelect.value);
      loadAttendanceDataByDate(dateSelect.value);
    }
  });
  
  console.log('✅ 数据更新事件监听器已注册');
  
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
    const today = window.utils.getLocalDateString();
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
    // 🔧 修复：构建本地时区的ISO字符串范围
    // date参数是本地日期（YYYY-MM-DD），需要转换为本地时间的ISO范围
    const localDateStart = new Date(`${date}T00:00:00`); // 本地时间00:00:00
    const localDateEnd = new Date(`${date}T23:59:59.999`); // 本地时间23:59:59.999
    const dateStart = localDateStart.toISOString();
    const dateEnd = localDateEnd.toISOString();
    
    console.log(`🔍 Firebase查询范围 (本地时间 ${date}): ${dateStart} - ${dateEnd}`);
    
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
    // 显示本地时区的日期和时间
    const signinTime = new Date(record.time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
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
  
  if (editName) {
    editName.value = displayName;
    editName.setAttribute('readonly', 'true'); // 确保姓名字段为只读
  }
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
  
  // 获取表单数据（姓名字段为只读，不允许修改）
  const newGroup = editGroup ? editGroup.value : '';
  const newTime = editTime ? editTime.value : '';
  
  if (!newGroup || !newTime) {
    alert('请填写完整信息');
    return;
  }
  
  // 姓名不允许修改，使用原记录的姓名
  const newName = record.name;
  
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
  
  // 【安全漏洞修复】检查修改时间后是否会导致重复签到
  const newTimeSlot = window.utils.getAttendanceType(newDateTime);
  const newDate = newDateTime.toLocaleDateString('zh-CN');
  
  // 获取成员的UUID
  let memberUUID = record.memberUUID;
  if (!memberUUID) {
    // 如果没有UUID，尝试从groups中查找
    const memberInfo = window.groups[newGroup]?.find(m => m.name === newName);
    memberUUID = memberInfo?.uuid;
  }
  
  if (memberUUID) {
    // 检查是否会导致重复签到（排除当前记录）
    const attendanceRecords = window.attendanceRecords || [];
    const duplicateCheck = attendanceRecords.some(existingRecord => {
      // 排除当前正在编辑的记录（优先使用UUID + time匹配）
      if (record.memberUUID && existingRecord.memberUUID === record.memberUUID && existingRecord.time === record.time) {
        return false;
      }
      // 降级方案：使用name + time匹配（兼容旧数据）
      if (!record.memberUUID && existingRecord.time === record.time && existingRecord.name === record.name) {
        return false;
      }
      
      const existingDate = new Date(existingRecord.time).toLocaleDateString('zh-CN');
      const existingTimeSlot = window.utils.getAttendanceType(new Date(existingRecord.time));
      
      // 检查UUID和日期匹配
      if (existingRecord.memberUUID !== memberUUID || existingDate !== newDate) {
        return false;
      }
      
      // 时间段重复检查规则
      switch (newTimeSlot) {
        case 'early':
        case 'onTime':
        case 'late':
          // 上午时间段(0:00-11:00)只允许一次签到
          const morningSlots = ['early', 'onTime', 'late'];
          return morningSlots.includes(existingTimeSlot);
          
        case 'afternoon':
          // 下午签到：11:00-17:00只允许一次签到
          return existingTimeSlot === 'afternoon';
          
        case 'evening':
          // 晚上签到：17:00-00:00只允许一次签到
          return existingTimeSlot === 'evening';
          
        default:
          return false;
      }
    });
    
    if (duplicateCheck) {
      const timeSlotNames = {
        'early': '早到时间段(0:00-9:20)',
        'onTime': '准时时间段(9:20-9:30)',
        'late': '迟到时间段(9:30-10:40)',
        'afternoon': '下午时间段(11:00-17:00)',
        'evening': '晚上时间段(17:00-00:00)'
      };
      
      const restrictionMessage = {
        'early': '上午时间段(0:00-11:00)',
        'onTime': '上午时间段(0:00-11:00)',
        'late': '上午时间段(0:00-11:00)',
        'afternoon': '下午时间段(11:00-17:00)',
        'evening': '晚上时间段(17:00-00:00)'
      };
      
      alert(`🚫 修改时间会导致重复签到！\n\n` +
            `成员：${newName}\n` +
            `修改时间：${timeSlotNames[newTimeSlot]}\n` +
            `限制：${restrictionMessage[newTimeSlot]}内只允许一次签到\n\n` +
            `该成员已在此时间段签到，不允许修改到此时间！`);
      return;
    }
  } else {
    console.warn('⚠️ 无法获取成员UUID，跳过重复签到检查');
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
    // 方案：通过UUID + 原time查找记录（避免姓名修改冲突）
    const recordsRef = db.ref('attendanceRecords');
    const snapshot = await recordsRef.once('value');
    const allRecords = snapshot.val() || {};
    
    // 找到匹配的记录（优先通过UUID匹配，避免姓名修改冲突）
    let recordKey = null;
    for (const [key, value] of Object.entries(allRecords)) {
      // 优先使用UUID + time匹配（UUID是唯一标识）
      if (record.memberUUID && value.memberUUID === record.memberUUID && value.time === record.time) {
        recordKey = key;
        break;
      }
      // 降级方案：使用name + group + time匹配（用于旧数据兼容）
      if (!record.memberUUID && value.name === record.name && 
          value.group === record.group && value.time === record.time) {
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
    const oldDate = window.utils.getLocalDateFromISO(record.time);
    const newDate = window.utils.getLocalDateFromISO(updatedRecord.time);
    sessionStorage.removeItem(`attendance_${oldDate}`);
    if (oldDate !== newDate) {
      sessionStorage.removeItem(`attendance_${newDate}`);
    }
    
    // 🔧 修复：更新localStorage中的记录并通知NewDataManager
    // 重新加载当前日期的数据（这会从Firebase获取最新数据）
    const currentDate = dateSelect ? dateSelect.value : '';
    await loadAttendanceDataByDate(currentDate);
    
    // 🔧 修复：更新NewDataManager的数据，避免误报变更
    if (window.newDataManager) {
      try {
        // 更新localStorage中的记录（只更新被修改的那条）
        const localRecords = JSON.parse(localStorage.getItem('msh_attendanceRecords') || '[]');
        const recordIndex = localRecords.findIndex(r => {
          // 优先使用UUID + time匹配
          if (record.memberUUID && r.memberUUID === record.memberUUID && r.time === record.time) {
            return true;
          }
          // 降级方案：使用name + group + time匹配
          if (!record.memberUUID && r.name === record.name && 
              r.group === record.group && r.time === record.time) {
            return true;
          }
          return false;
        });
        
        if (recordIndex !== -1) {
          // 更新localStorage中的记录
          localRecords[recordIndex] = updatedRecord;
          if (window.newDataManager.saveToLocalStorage) {
            window.newDataManager.saveToLocalStorage('attendanceRecords', localRecords);
            console.log('✅ 已更新localStorage中的签到记录');
          }
          
          // 更新全局变量
          window.attendanceRecords = localRecords;
          
          // 更新NewDataManager的基准数据，避免误报变更
          if (window.newDataManager.originalData) {
            // 更新基准数据中对应的记录
            const originalRecords = window.newDataManager.originalData.attendanceRecords || [];
            const originalIndex = originalRecords.findIndex(r => {
              if (record.memberUUID && r.memberUUID === record.memberUUID && r.time === record.time) {
                return true;
              }
              if (!record.memberUUID && r.name === record.name && 
                  r.group === record.group && r.time === record.time) {
                return true;
              }
              return false;
            });
            
            if (originalIndex !== -1) {
              originalRecords[originalIndex] = JSON.parse(JSON.stringify(updatedRecord));
            }
            window.newDataManager.originalData.attendanceRecords = originalRecords;
            console.log('✅ 已更新NewDataManager基准数据');
          }
          
          // 清除变更标记（因为数据已同步到Firebase）
          if (window.newDataManager.dataChangeFlags) {
            // 从变更标记中移除这条记录
            const flags = window.newDataManager.dataChangeFlags.attendanceRecords;
            flags.modified = flags.modified.filter(item => {
              // 移除匹配的记录变更标记
              if (typeof item === 'object' && item.time === record.time) {
                if (record.memberUUID && item.memberUUID === record.memberUUID) {
                  return false;
                }
                if (!record.memberUUID && item.name === record.name && item.group === record.group) {
                  return false;
                }
              }
              return true;
            });
            
            // 如果没有其他变更，清除变更标记
            const hasOtherChanges = flags.added.length > 0 || flags.modified.length > 0 || flags.deleted.length > 0;
            if (!hasOtherChanges && 
                Object.values(window.newDataManager.dataChangeFlags).every(f => 
                  f.added.length === 0 && f.modified.length === 0 && f.deleted.length === 0)) {
              window.newDataManager.hasLocalChanges = false;
              console.log('✅ 已清除数据变更标记（无其他变更）');
            } else {
              console.log('✅ 已更新数据变更标记（仍有其他变更）');
            }
          }
        } else {
          console.warn('⚠️ 未在localStorage中找到要更新的记录');
        }
        
      } catch (error) {
        console.error('❌ 更新NewDataManager数据失败:', error);
        // 如果更新失败，清除localStorage作为后备方案
        localStorage.removeItem('msh_attendanceRecords');
        console.log('🗑️ 已清除localStorage中的签到记录缓存，下次将从Firebase重新加载');
      }
    } else {
      // 如果没有NewDataManager，清除localStorage作为后备方案
      localStorage.removeItem('msh_attendanceRecords');
      console.log('🗑️ 已清除localStorage中的签到记录缓存，index页面将从Firebase重新加载');
    }
    
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
