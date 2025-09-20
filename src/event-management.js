// 事件管理页面JavaScript
// 全局变量
let firebaseApp;
let db;
let eventsData = [];
let filteredEvents = [];
let groups = {};
let groupNames = {};

// DOM元素引用
let groupFilter, statusFilter, searchInput;
let eventsTableBody;
let totalEventsEl, trackingEventsEl, terminatedEventsEl, resolvedEventsEl;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  try {
    // 检查是否已经初始化
    if (firebase.apps.length > 0) {
      firebaseApp = firebase.app();
      db = firebase.database();
      console.log('✅ 使用已存在的Firebase应用');
      return true;
    }
    
    // 使用全局Firebase配置（如果存在）
    if (window.firebaseConfig) {
      firebaseApp = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      console.log('✅ 使用全局Firebase配置初始化成功');
      return true;
    }
    
    // 如果没有全局配置，尝试从config.js加载
    if (typeof firebaseConfig !== 'undefined') {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      console.log('✅ 使用config.js配置初始化成功');
      return true;
    }
    
    console.warn('⚠️ 未找到Firebase配置，使用默认配置');
    return true; // 即使没有Firebase配置也继续，因为事件管理主要使用本地存储
  } catch (error) {
    console.error('Firebase初始化失败:', error);
    return true; // 即使Firebase初始化失败也继续，因为事件管理主要使用本地存储
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  groupFilter = document.getElementById('groupFilter');
  statusFilter = document.getElementById('statusFilter');
  searchInput = document.getElementById('searchInput');
  eventsTableBody = document.getElementById('eventsTableBody');
  
  totalEventsEl = document.getElementById('totalEvents');
  trackingEventsEl = document.getElementById('trackingEvents');
  terminatedEventsEl = document.getElementById('terminatedEvents');
  resolvedEventsEl = document.getElementById('resolvedEvents');
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 筛选控件事件
  if (groupFilter) {
    groupFilter.addEventListener('change', applyFilters);
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', applyFilters);
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  
  // 对话框事件
  initializeDialogEvents();
}

// 初始化对话框事件
function initializeDialogEvents() {
  // 重启事件对话框
  const restartDialog = document.getElementById('restartEventDialog');
  const confirmRestart = document.getElementById('confirmRestart');
  const cancelRestart = document.getElementById('cancelRestart');
  
  if (confirmRestart) {
    confirmRestart.addEventListener('click', handleRestartEvent);
  }
  
  if (cancelRestart) {
    cancelRestart.addEventListener('click', () => {
      restartDialog.classList.add('hidden-dialog');
    });
  }
  
  // 终止功能已移除，只在主日跟踪页面使用
  
  // 查看详情对话框
  const viewDialog = document.getElementById('viewEventDialog');
  const closeEventDetails = document.getElementById('closeEventDetails');
  
  if (closeEventDetails) {
    closeEventDetails.addEventListener('click', () => {
      viewDialog.classList.add('hidden-dialog');
    });
  }
}

// ==================== 数据加载 ====================
async function loadEventsData() {
  try {
    console.log('开始加载事件数据...');
    
    // 显示加载状态
    eventsTableBody.innerHTML = '<tr><td colspan="8" class="loading">正在加载事件数据...</td></tr>';
    
    // 加载基础数据
    await loadBaseData();
    
    // 加载事件数据
    await loadTrackingEvents();
    
    // 初始化筛选数据
    filteredEvents = [...eventsData];
    
    // 更新显示
    updateEventsDisplay();
    updateStatistics();
    
    console.log('事件数据加载完成');
  } catch (error) {
    console.error('加载事件数据失败:', error);
    eventsTableBody.innerHTML = '<tr><td colspan="8" class="no-events">加载数据失败，请刷新页面重试</td></tr>';
  }
}

// 加载基础数据
async function loadBaseData() {
  try {
    // 首先尝试从Firebase加载数据
    if (db) {
      console.log('从Firebase加载基础数据...');
      
      // 加载小组数据
      const groupsSnapshot = await db.ref('groups').once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
        window.groups = groups; // 设置到全局变量
        console.log('从Firebase加载小组数据:', Object.keys(groups).length, '个小组');
      }

      // 加载小组名称映射
      const groupNamesSnapshot = await db.ref('groupNames').once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
        window.groupNames = groupNames; // 设置到全局变量
        console.log('从Firebase加载小组名称数据:', Object.keys(groupNames).length, '个小组名称');
      }
    }
    
    // 如果Firebase没有数据，尝试从本地存储加载
    if (!groups || Object.keys(groups).length === 0) {
      console.log('从本地存储加载小组数据...');
      
      // 尝试不同的localStorage键名
      const storedGroups = localStorage.getItem('msh_groups') || localStorage.getItem('groups');
      if (storedGroups) {
        groups = JSON.parse(storedGroups);
        window.groups = groups; // 设置到全局变量
        console.log('从本地存储加载小组数据:', Object.keys(groups).length, '个小组');
      }
    }
    
    if (!groupNames || Object.keys(groupNames).length === 0) {
      const storedGroupNames = localStorage.getItem('msh_group_names') || localStorage.getItem('groupNames');
      if (storedGroupNames) {
        groupNames = JSON.parse(storedGroupNames);
        window.groupNames = groupNames; // 设置到全局变量
        console.log('从本地存储加载小组名称数据:', Object.keys(groupNames).length, '个小组名称');
      }
    }
    
    // 加载签到记录数据
    if (db) {
      console.log('从Firebase加载签到记录...');
      const attendanceSnapshot = await db.ref('attendanceRecords').once('value');
      if (attendanceSnapshot.exists()) {
        const attendanceRecords = attendanceSnapshot.val() || [];
        window.attendanceRecords = attendanceRecords;
        console.log('从Firebase加载签到记录:', attendanceRecords.length, '条记录');
      }
    }
    
    // 如果Firebase没有签到记录，尝试从本地存储加载
    if (!window.attendanceRecords || window.attendanceRecords.length === 0) {
      console.log('从本地存储加载签到记录...');
      const storedAttendance = localStorage.getItem('msh_attendance') || localStorage.getItem('attendanceRecords');
      if (storedAttendance) {
        const attendanceRecords = JSON.parse(storedAttendance);
        window.attendanceRecords = attendanceRecords;
        console.log('从本地存储加载签到记录:', attendanceRecords.length, '条记录');
      }
    }
    
    console.log('基础数据加载完成');
    console.log('最终小组数据:', groups ? Object.keys(groups).length : 0, '个小组');
    console.log('最终小组名称数据:', groupNames ? Object.keys(groupNames).length : 0, '个小组名称');
  } catch (error) {
    console.error('加载基础数据失败:', error);
  }
}

// 加载跟踪事件数据
async function loadTrackingEvents() {
  try {
    if (!window.utils || !window.utils.SundayTrackingManager) {
      throw new Error('主日跟踪管理器未加载');
    }
    
    const trackingManager = window.utils.SundayTrackingManager;
    
    // 调试信息
    console.log('window.groups:', window.groups ? Object.keys(window.groups).length : 0, '个小组');
    console.log('window.groupNames:', window.groupNames ? Object.keys(window.groupNames).length : 0, '个小组名称');
    
    // 获取所有人员
    const allMembers = trackingManager.getAllMembers();
    console.log('获取到的人员数量:', allMembers.length);
    
    // 获取所有跟踪记录
    let allTrackingRecords = trackingManager.getAllTrackingRecords();
    console.log('获取到的跟踪记录数量:', allTrackingRecords.length);
    
    // 如果没有跟踪记录，尝试生成跟踪列表
    if (allTrackingRecords.length === 0) {
      console.log('没有跟踪记录，尝试生成跟踪列表...');
      
      // 检查是否有签到记录
      if (window.attendanceRecords && window.attendanceRecords.length > 0) {
        console.log('发现签到记录，生成跟踪列表...');
        const trackingList = trackingManager.generateTrackingList();
        console.log('生成的跟踪列表数量:', trackingList.length);
        
        // 重新获取跟踪记录
        allTrackingRecords = trackingManager.getAllTrackingRecords();
        console.log('重新获取到的跟踪记录数量:', allTrackingRecords.length);
      } else {
        console.log('没有签到记录，无法生成跟踪列表');
      }
    }
    
    // 转换为事件数据格式
    eventsData = allTrackingRecords.map(record => ({
      id: record.recordId || record.memberUUID,
      memberUUID: record.memberUUID,
      memberName: record.memberName || '未知成员',
      group: record.group || '未分组',
      status: record.status || 'tracking',
      consecutiveAbsences: record.consecutiveAbsences || 0,
      startDate: record.startDate || record.trackingStartDate,
      lastAttendanceDate: record.lastAttendanceDate,
      createdAt: record.createdAt || record.updatedAt,
      terminationRecord: record.terminationRecord,
      trackingData: record.trackingData
    }));
    
    // 按创建时间倒序排列
    eventsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 更新小组筛选选项
    updateGroupFilterOptions();
    
    console.log(`加载了 ${eventsData.length} 个事件记录`);
    if (eventsData.length > 0) {
      console.log('第一条事件记录:', eventsData[0]);
    }
  } catch (error) {
    console.error('加载跟踪事件失败:', error);
    eventsData = [];
  }
}

// ==================== 显示更新 ====================
function updateEventsDisplay() {
  if (!eventsTableBody) return;
  
  if (filteredEvents.length === 0) {
    eventsTableBody.innerHTML = '<tr><td colspan="8" class="no-events">暂无事件数据</td></tr>';
    return;
  }
  
  eventsTableBody.innerHTML = filteredEvents.map(event => `
    <tr>
      <td>${event.memberName}</td>
      <td>${groupNames[event.group] || event.group}</td>
      <td>
        <span class="event-status status-${event.status}">
          ${window.utils.getStatusText(event.status)}
        </span>
      </td>
      <td>${event.consecutiveAbsences}次</td>
      <td>${window.utils.formatDateForDisplay(event.startDate)}</td>
      <td>${event.lastAttendanceDate ? window.utils.formatDateForDisplay(event.lastAttendanceDate) : '无'}</td>
      <td>${window.utils.formatDateForDisplay(event.createdAt)}</td>
      <td>
        <div class="event-actions">
          <button class="btn btn-sm btn-info" onclick="viewEventDetails('${event.id}')">详情</button>
          ${event.status === 'terminated' ? `
            <button class="btn btn-sm btn-warning" onclick="restartEvent('${event.id}', '${event.memberName}')">重启</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function updateStatistics() {
  const total = eventsData.length;
  const tracking = eventsData.filter(e => e.status === 'tracking').length;
  const terminated = eventsData.filter(e => e.status === 'terminated').length;
  const resolved = eventsData.filter(e => e.status === 'resolved').length;
  
  if (totalEventsEl) totalEventsEl.textContent = total;
  if (trackingEventsEl) trackingEventsEl.textContent = tracking;
  if (terminatedEventsEl) terminatedEventsEl.textContent = terminated;
  if (resolvedEventsEl) resolvedEventsEl.textContent = resolved;
}

// ==================== 筛选功能 ====================
function applyFilters() {
  const groupValue = groupFilter ? groupFilter.value : '';
  const statusValue = statusFilter ? statusFilter.value : '';
  const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredEvents = eventsData.filter(event => {
    const groupMatch = !groupValue || event.group === groupValue;
    const statusMatch = !statusValue || event.status === statusValue;
    const searchMatch = !searchValue || event.memberName.toLowerCase().includes(searchValue);
    
    return groupMatch && statusMatch && searchMatch;
  });
  
  updateEventsDisplay();
  console.log(`筛选结果: ${filteredEvents.length} 个事件`);
}

function clearFilters() {
  if (groupFilter) groupFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  if (searchInput) searchInput.value = '';
  
  filteredEvents = [...eventsData];
  updateEventsDisplay();
  console.log('筛选已清除');
}

function refreshEvents() {
  loadEventsData();
}

// ==================== 小组筛选选项更新 ====================
function updateGroupFilterOptions() {
  if (!groupFilter) return;
  
  // 获取所有小组
  const allGroups = new Set();
  eventsData.forEach(event => {
    if (event.group) {
      allGroups.add(event.group);
    }
  });
  
  // 清空现有选项（保留"全部小组"选项）
  groupFilter.innerHTML = '<option value="">--全部小组--</option>';
  
  // 添加小组选项
  const sortedGroups = Array.from(allGroups).sort((a, b) => {
    if (a === '未分组') return 1;
    if (b === '未分组') return -1;
    return a.localeCompare(b);
  });
  
  sortedGroups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = groupNames[group] || group;
    groupFilter.appendChild(option);
  });
}

// ==================== 事件操作 ====================
function viewEventDetails(eventId) {
  const event = eventsData.find(e => e.id === eventId);
  if (!event) return;
  
  const detailsDialog = document.getElementById('viewEventDialog');
  const eventDetails = document.getElementById('eventDetails');
  
  if (!detailsDialog || !eventDetails) return;
  
  // 生成事件详情HTML
  eventDetails.innerHTML = `
    <div style="margin-bottom: 15px;">
      <strong>成员姓名:</strong> ${event.memberName}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>小组:</strong> ${groupNames[event.group] || event.group}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>事件状态:</strong> 
      <span class="event-status status-${event.status}">${window.utils.getStatusText(event.status)}</span>
    </div>
    <div style="margin-bottom: 15px;">
      <strong>连续缺勤:</strong> ${event.consecutiveAbsences}次
    </div>
    <div style="margin-bottom: 15px;">
      <strong>开始日期:</strong> ${window.utils.formatDateForDisplay(event.startDate)}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>最后签到:</strong> ${event.lastAttendanceDate ? window.utils.formatDateForDisplay(event.lastAttendanceDate) : '无'}
    </div>
    <div style="margin-bottom: 15px;">
      <strong>创建时间:</strong> ${window.utils.formatDateForDisplay(event.createdAt)}
    </div>
    ${event.terminationRecord ? `
      <div style="margin-bottom: 15px;">
        <strong>终止信息:</strong>
        <div style="margin-left: 20px; margin-top: 5px;">
          <div>终止日期: ${window.utils.formatDateForDisplay(event.terminationRecord.terminationDate)}</div>
          <div>终止原因: ${event.terminationRecord.reason}</div>
        </div>
      </div>
    ` : ''}
  `;
  
  detailsDialog.classList.remove('hidden-dialog');
}

function restartEvent(eventId, memberName) {
  const restartDialog = document.getElementById('restartEventDialog');
  const restartMemberName = document.getElementById('restartMemberName');
  const restartDate = document.getElementById('restartDate');
  
  if (!restartDialog || !restartMemberName || !restartDate) return;
  
  // 设置默认值
  restartMemberName.value = memberName;
  restartDate.value = new Date().toISOString().split('T')[0];
  
  // 清空原因
  const restartReason = document.getElementById('restartReason');
  if (restartReason) restartReason.value = '';
  
  // 显示对话框
  restartDialog.classList.remove('hidden-dialog');
  
  // 存储当前事件ID
  restartDialog.dataset.eventId = eventId;
}

// 终止功能已移除，只在主日跟踪页面使用

// ==================== 事件处理 ====================
async function handleRestartEvent() {
  const restartDialog = document.getElementById('restartEventDialog');
  const restartReason = document.getElementById('restartReason');
  const restartDate = document.getElementById('restartDate');
  
  if (!restartDialog || !restartReason || !restartDate) return;
  
  const eventId = restartDialog.dataset.eventId;
  const reason = restartReason.value.trim();
  const date = restartDate.value;
  
  if (!reason || !date) {
    alert('请填写重启原因和日期！');
    return;
  }
  
  try {
    // 调用重启事件功能
    if (window.utils && window.utils.SundayTrackingManager) {
      const success = window.utils.SundayTrackingManager.restartEvent(eventId, {
        reason: reason,
        restartDate: date,
        createdAt: new Date().toISOString()
      });
      
      if (success) {
        alert('事件重启成功！');
        restartDialog.classList.add('hidden-dialog');
        
        // 重新加载数据
        await loadEventsData();
      } else {
        alert('事件重启失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
  } catch (error) {
    console.error('重启事件失败:', error);
    alert('重启事件失败，请重试！');
  }
}

// 终止事件处理函数已移除，只在主日跟踪页面使用

// ==================== 工具函数 ====================
// getStatusText函数已移至utils.js，使用window.utils.getStatusText()

// formatDateForDisplay函数已移至utils.js，使用window.utils.formatDateForDisplay()

function goBackToSundayTracking() {
  window.location.href = 'sunday-tracking.html';
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('事件管理页面加载中...');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化Firebase
  const firebaseInitialized = await initializeFirebase();
  if (!firebaseInitialized) {
    console.error('Firebase初始化失败');
    return;
  }
  
  // 加载事件数据
  await loadEventsData();
  
  console.log('事件管理页面初始化完成');
});

// 将函数暴露到全局作用域
window.viewEventDetails = viewEventDetails;
window.restartEvent = restartEvent;
// window.terminateEvent = terminateEvent; // 已移除，只在主日跟踪页面使用
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.refreshEvents = refreshEvents;
window.goBackToSundayTracking = goBackToSundayTracking;
