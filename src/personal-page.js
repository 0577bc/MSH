/**
 * 个人页面脚本 (personal-page.js)
 * 功能：显示个人信息和跟踪记录
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 全局变量 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let currentMemberUUID = null;
let currentCalendarDate = new Date(); // 当前日历显示的日期

// DOM元素引用
let backToTrackingButton, backToSummaryButton, backToSigninButton;
let personalInfoSection, personalInfo, trackingRecordsSection, trackingRecords;
let attendanceCalendarSection, attendanceCalendar, currentMonthDisplay;
let prevMonthButton, nextMonthButton;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    console.log('✅ 个人页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 个人页面Firebase初始化失败');
    return false;
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backToTrackingButton = document.getElementById('backToTrackingButton');
  backToSummaryButton = document.getElementById('backToSummaryButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  
  personalInfoSection = document.getElementById('personalInfoSection');
  personalInfo = document.getElementById('personalInfo');
  trackingRecordsSection = document.getElementById('trackingRecordsSection');
  trackingRecords = document.getElementById('trackingRecords');
  
  // 日历相关元素
  attendanceCalendarSection = document.getElementById('attendanceCalendarSection');
  attendanceCalendar = document.getElementById('attendanceCalendar');
  currentMonthDisplay = document.getElementById('currentMonthDisplay');
  prevMonthButton = document.getElementById('prevMonthButton');
  nextMonthButton = document.getElementById('nextMonthButton');
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backToTrackingButton) {
    backToTrackingButton.addEventListener('click', () => window.location.href = 'sunday-tracking.html');
  }

  if (backToSummaryButton) {
    backToSummaryButton.addEventListener('click', () => window.location.href = 'summary.html');
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
  
  // 日历控制按钮事件
  if (prevMonthButton) {
    prevMonthButton.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      displayAttendanceCalendar();
    });
  }
  
  if (nextMonthButton) {
    nextMonthButton.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      displayAttendanceCalendar();
    });
  }
}

// ==================== 数据加载 ====================
async function loadData() {
  try {
    console.log('个人页面正在连接Firebase数据库...');
    await loadDataFromFirebase();
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    console.log('Using local storage as fallback');
    loadDataFromLocalStorage();
  }
}

async function loadDataFromFirebase() {
  if (!db) {
    console.error('Firebase数据库未初始化');
    return;
  }

  try {
    // 加载小组数据
    const groupsSnapshot = await db.ref('groups').once('value');
    groups = groupsSnapshot.val() || {};
    
    // 加载小组名称
    const groupNamesSnapshot = await db.ref('groupNames').once('value');
    groupNames = groupNamesSnapshot.val() || {};
    
    // 加载签到记录
    const attendanceSnapshot = await db.ref('attendanceRecords').once('value');
    attendanceRecords = attendanceSnapshot.val() || [];

    console.log('个人页面数据加载成功');
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    throw error;
  }
}

function loadDataFromLocalStorage() {
  try {
    // 从本地存储加载数据
    const storedGroups = localStorage.getItem('msh_groups');
    const storedGroupNames = localStorage.getItem('msh_group_names');
    const storedAttendance = localStorage.getItem('msh_attendance_records');

    if (storedGroups) groups = JSON.parse(storedGroups);
    if (storedGroupNames) groupNames = JSON.parse(storedGroupNames);
    if (storedAttendance) attendanceRecords = JSON.parse(storedAttendance);

    console.log('个人页面数据从本地存储加载成功');
  } catch (error) {
    console.error('从本地存储加载数据失败:', error);
  }
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('个人页面开始初始化...');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化Firebase
  await initializeFirebase();
  
  // 加载数据
  await loadData();
  
  // 从URL参数获取成员UUID
  const urlParams = new URLSearchParams(window.location.search);
  currentMemberUUID = urlParams.get('uuid');
  
  if (currentMemberUUID) {
    // 显示个人信息、签到日历和跟踪记录
    displayPersonalInfo();
    displayAttendanceCalendar();
    displayTrackingRecords();
  } else {
    console.error('未找到成员UUID参数');
    alert('页面参数错误，请从主日跟踪页面进入');
  }
  
  console.log('个人页面初始化完成');
});

// ==================== 显示个人信息 ====================
function displayPersonalInfo() {
  if (!personalInfo || !currentMemberUUID) return;
  
  // 查找成员信息
  let memberInfo = null;
  let memberGroup = null;
  
  Object.keys(groups).forEach(group => {
    const members = groups[group];
    const member = members.find(m => m.uuid === currentMemberUUID);
    if (member) {
      memberInfo = member;
      memberGroup = group;
    }
  });
  
  if (!memberInfo) {
    personalInfo.innerHTML = '<p>未找到成员信息</p>';
    return;
  }
  
  // 显示个人信息
  personalInfo.innerHTML = `
    <div class="personal-info-card">
      <h3>基本信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <label>姓名：</label>
          <span>${memberInfo.name || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>花名：</label>
          <span>${memberInfo.nickname || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>组别：</label>
          <span>${groupNames[memberGroup] || memberGroup}</span>
        </div>
        <div class="info-item">
          <label>电话：</label>
          <span>${memberInfo.phone || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>性别：</label>
          <span>${memberInfo.gender || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>受洗：</label>
          <span>${memberInfo.baptized || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>年龄：</label>
          <span>${memberInfo.age || '未设置'}</span>
        </div>
        <div class="info-item">
          <label>加入日期：</label>
          <span>${memberInfo.joinDate || '未设置'}</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== 显示跟踪记录 ====================
function displayTrackingRecords() {
  if (!trackingRecords || !currentMemberUUID) return;
  
  // 获取个人跟踪记录
  const personalRecords = window.utils.SundayTrackingManager.getPersonalTrackingRecords(currentMemberUUID);
  
  if (!personalRecords || personalRecords.length === 0) {
    trackingRecords.innerHTML = '<p>暂无跟踪记录</p>';
    return;
  }
  
  // 显示跟踪记录
  let recordsHTML = '<div class="tracking-records-list">';
  
  personalRecords.forEach((record, index) => {
    recordsHTML += `
      <div class="tracking-record-item">
        <div class="record-header">
          <span class="record-date">${window.utils.formatDateForDisplay(record.date)}</span>
          <span class="record-category">${record.category}</span>
        </div>
        <div class="record-content">
          <p><strong>内容：</strong>${record.content}</p>
          <p><strong>回馈人员：</strong>${record.person}</p>
        </div>
      </div>
    `;
  });
  
  recordsHTML += '</div>';
  trackingRecords.innerHTML = recordsHTML;
}

// ==================== 显示签到日历 ====================
function displayAttendanceCalendar() {
  if (!attendanceCalendar || !currentMemberUUID) return;
  
  // 更新月份显示
  if (currentMonthDisplay) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + 1;
    currentMonthDisplay.textContent = `${year}年${month}月`;
  }
  
  // 获取该成员的签到记录
  const memberAttendanceRecords = getMemberAttendanceRecords(currentMemberUUID);
  
  // 生成日历HTML
  const calendarHTML = generateCalendarHTML(currentCalendarDate, memberAttendanceRecords);
  attendanceCalendar.innerHTML = calendarHTML;
}

// ==================== 获取成员签到记录 ====================
function getMemberAttendanceRecords(memberUUID) {
  if (!attendanceRecords || !Array.isArray(attendanceRecords)) return [];
  
  // 首先尝试通过 memberUUID 匹配
  let filteredRecords = attendanceRecords.filter(record => 
    record.memberUUID === memberUUID
  );
  
  // 如果没有找到，尝试通过 name 匹配
  if (filteredRecords.length === 0) {
    const member = findMemberByUUID(memberUUID);
    if (member && member.name) {
      filteredRecords = attendanceRecords.filter(record => 
        record.name === member.name
      );
    }
  }
  
  return filteredRecords;
}

// ==================== 查找成员信息 ====================
function findMemberByUUID(memberUUID) {
  for (const group in groups) {
    const members = groups[group];
    const member = members.find(m => m.uuid === memberUUID);
    if (member) return member;
  }
  return null;
}

// ==================== 生成日历HTML ====================
function generateCalendarHTML(date, attendanceRecords) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();
  
  // 获取当月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 获取第一天是星期几（0=周日，1=周一...）
  const firstDayOfWeek = firstDay.getDay();
  
  // 获取当月天数
  const daysInMonth = lastDay.getDate();
  
  // 获取上个月的最后几天
  const prevMonth = new Date(year, month, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  let calendarHTML = `
    <div class="calendar-header">
      <div class="calendar-header-cell">日</div>
      <div class="calendar-header-cell">一</div>
      <div class="calendar-header-cell">二</div>
      <div class="calendar-header-cell">三</div>
      <div class="calendar-header-cell">四</div>
      <div class="calendar-header-cell">五</div>
      <div class="calendar-header-cell">六</div>
    </div>
    <div class="calendar-body">
  `;
  
  // 添加上个月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayDate = new Date(year, month - 1, day);
    calendarHTML += generateDayHTML(day, dayDate, true, attendanceRecords);
  }
  
  // 添加当月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    calendarHTML += generateDayHTML(day, dayDate, false, attendanceRecords);
  }
  
  // 添加下个月的日期（填满6行）
  const totalCells = firstDayOfWeek + daysInMonth;
  const remainingCells = 42 - totalCells; // 6行 × 7列 = 42个单元格
  
  for (let day = 1; day <= remainingCells; day++) {
    const dayDate = new Date(year, month + 1, day);
    calendarHTML += generateDayHTML(day, dayDate, true, attendanceRecords);
  }
  
  calendarHTML += `
    </div>
  `;
  
  return calendarHTML;
}

// ==================== 生成单日HTML ====================
function generateDayHTML(day, dayDate, isOtherMonth, attendanceRecords) {
  const today = new Date();
  const isToday = isSameDate(dayDate, today);
  const isSunday = dayDate.getDay() === 0;
  
  // 检查是否有签到记录
  const hasAttendance = checkAttendanceForDate(dayDate, attendanceRecords);
  
  let dayClasses = ['calendar-day'];
  let dayInfo = '';
  
  if (isOtherMonth) {
    dayClasses.push('other-month');
  }
  
  if (isToday) {
    dayClasses.push('today');
  }
  
  if (isSunday) {
    dayClasses.push('sunday');
  }
  
  if (hasAttendance) {
    dayClasses.push('present');
    dayInfo = '<div class="day-info present">已签到</div>';
  } else if (isSunday) {
    dayClasses.push('absent');
    dayInfo = '<div class="day-info absent">未签到</div>';
  }
  
  return `
    <div class="${dayClasses.join(' ')}" data-date="${dayDate.toISOString().split('T')[0]}">
      <div class="day-number">${day}</div>
      ${dayInfo}
    </div>
  `;
}

// ==================== 检查指定日期的签到情况 ====================
function checkAttendanceForDate(date, attendanceRecords) {
  if (!attendanceRecords || !Array.isArray(attendanceRecords)) return false;
  
  return attendanceRecords.some(record => {
    if (!record.time) return false;
    
    try {
      const recordDate = new Date(record.time);
      return isSameDate(recordDate, date);
    } catch (error) {
      return false;
    }
  });
}

// ==================== 判断是否为同一天 ====================
function isSameDate(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// ==================== 工具函数 ====================
// formatDateForDisplay函数已移至utils.js，使用window.utils.formatDateForDisplay()

