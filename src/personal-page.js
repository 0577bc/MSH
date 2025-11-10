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
    
    if (!currentMemberUUID) {
      console.error('成员UUID未设置，无法加载数据');
      throw new Error('缺少成员UUID参数');
    }
    
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

  if (!currentMemberUUID) {
    console.error('成员UUID未设置，无法加载签到记录');
    return;
  }

  try {
    // 加载小组数据
    const groupsSnapshot = await db.ref('groups').once('value');
    groups = groupsSnapshot.val() || {};
    
    // 加载小组名称
    const groupNamesSnapshot = await db.ref('groupNames').once('value');
    groupNames = groupNamesSnapshot.val() || {};
    
    // 🔧 优化：直接从Firebase加载该成员的所有签到记录，不依赖全局数据
    // 原因：全局数据可能不完整（只包含当天数据），个人页面需要显示完整历史记录
    console.log(`🔍 从Firebase加载成员签到记录（UUID: ${currentMemberUUID}）`);
    
    // 先获取成员信息，用于兼容旧数据（没有memberUUID的情况）
    const member = findMemberByUUID(currentMemberUUID);
    console.log('📋 成员信息:', member ? { name: member.name, uuid: currentMemberUUID } : '未找到');
    
    // 尝试按memberUUID查询（优先方式）
    try {
      const attendanceSnapshot = await db.ref('attendanceRecords')
        .orderByChild('memberUUID')
        .equalTo(currentMemberUUID)
        .once('value');
      const memberData = attendanceSnapshot.val();
      attendanceRecords = memberData ? Object.values(memberData) : [];
      console.log(`✅ 按memberUUID查询到 ${attendanceRecords.length} 条记录`);
      
      // 如果没有通过memberUUID找到记录，且成员有name，尝试通过name匹配
      if (attendanceRecords.length === 0 && member && member.name) {
        console.log(`⚠️ 未找到memberUUID匹配的记录，尝试通过name匹配: ${member.name}`);
        // 加载所有记录后通过name过滤
        const allSnapshot = await db.ref('attendanceRecords').once('value');
        const allData = allSnapshot.val();
        const allRecords = allData ? Object.values(allData) : [];
        console.log(`📊 总共有 ${allRecords.length} 条签到记录`);
        
        // 通过name匹配
        attendanceRecords = allRecords.filter(record => {
          return record.name === member.name;
        });
        console.log(`✅ 通过name匹配到 ${attendanceRecords.length} 条记录`);
        
        // 调试：显示前几条记录的memberUUID和name
        if (allRecords.length > 0) {
          console.log('🔍 调试：前3条记录的memberUUID和name:', 
            allRecords.slice(0, 3).map(r => ({ 
              name: r.name, 
              memberUUID: r.memberUUID,
              hasUUID: !!r.memberUUID
            }))
          );
        }
      }
    } catch (queryError) {
      console.warn('⚠️ 按memberUUID查询失败（可能没有索引），尝试加载所有记录后过滤:', queryError.message);
      // 回退方案：加载所有记录后过滤
      const allSnapshot = await db.ref('attendanceRecords').once('value');
      const allData = allSnapshot.val();
      const allRecords = allData ? Object.values(allData) : [];
      console.log(`📊 从Firebase加载了 ${allRecords.length} 条总记录`);
      
      // 过滤出当前成员的记录
      attendanceRecords = allRecords.filter(record => {
        if (record.memberUUID === currentMemberUUID) return true;
        // 兼容：如果没有memberUUID，尝试通过name匹配
        if (!record.memberUUID && member && member.name && record.name === member.name) {
          return true;
        }
        return false;
      });
      console.log(`✅ 从全部记录中过滤出成员签到记录 ${attendanceRecords.length} 条`);
    }

    console.log('✅ 个人页面数据加载成功');
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
    const storedAttendance = localStorage.getItem('msh_attendanceRecords');

    if (storedGroups) groups = JSON.parse(storedGroups);
    if (storedGroupNames) groupNames = JSON.parse(storedGroupNames);
    
    // 🔧 优化：如果有全局签到记录，只加载当前成员的记录
    if (storedAttendance && currentMemberUUID) {
      const allRecords = JSON.parse(storedAttendance);
      if (Array.isArray(allRecords)) {
        // 过滤出当前成员的记录
        const member = findMemberByUUID(currentMemberUUID);
        attendanceRecords = allRecords.filter(record => {
          if (record.memberUUID === currentMemberUUID) return true;
          // 兼容：如果没有memberUUID，尝试通过name匹配
          if (!record.memberUUID && member && member.name && record.name === member.name) {
            return true;
          }
          return false;
        });
        console.log(`✅ 从本地存储过滤出成员签到记录 ${attendanceRecords.length} 条`);
      } else {
        attendanceRecords = [];
      }
    } else if (storedAttendance) {
      attendanceRecords = JSON.parse(storedAttendance);
    }

    console.log('✅ 个人页面数据从本地存储加载成功');
  } catch (error) {
    console.error('从本地存储加载数据失败:', error);
    attendanceRecords = [];
  }
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('个人页面开始初始化...');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 从URL参数获取成员UUID（需要在loadData之前获取）
  const urlParams = new URLSearchParams(window.location.search);
  currentMemberUUID = urlParams.get('uuid');
  
  if (!currentMemberUUID) {
    console.error('未找到成员UUID参数');
    alert('页面参数错误，请从主日跟踪页面进入');
    return;
  }
  
  // 初始化Firebase
  await initializeFirebase();
  
  // 加载数据（loadData内部会使用currentMemberUUID）
  await loadData();
  
  // 显示个人信息、签到日历和跟踪记录
  displayPersonalInfo();
  displayAttendanceCalendar();
  displayTrackingRecords();
  
  console.log('✅ 个人页面初始化完成');
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
          <span class="record-date">${window.utils.formatDateForDisplay(record.date || (record.time ? new Date(record.time).toISOString().split('T')[0] : ''))}</span>
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
  
  // 检查是否有签到记录，并获取签到详情
  const attendanceRecord = getAttendanceRecordForDate(dayDate, attendanceRecords);
  const hasAttendance = !!attendanceRecord;
  
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
  
  // 构建日期信息显示
  if (hasAttendance && attendanceRecord) {
    dayClasses.push('present');
    // 格式化签到时间
    const timeStr = attendanceRecord.time ? 
      new Date(attendanceRecord.time).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '';
    dayInfo = `<div class="day-info present">✓ ${timeStr || '已签到'}</div>`;
  } else if (isSunday && !isOtherMonth) {
    // 只对当月的主日显示未签到
    dayClasses.push('absent');
    dayInfo = '<div class="day-info absent">✗ 未签到</div>';
  }
  
  return `
    <div class="${dayClasses.join(' ')}" data-date="${dayDate.toISOString().split('T')[0]}" 
         title="${isSunday ? '主日' : ''} ${hasAttendance ? '已签到' : isSunday && !isOtherMonth ? '未签到' : ''}">
      <div class="day-number">${day}</div>
      ${dayInfo}
    </div>
  `;
}

// ==================== 检查指定日期的签到情况 ====================
function checkAttendanceForDate(date, attendanceRecords) {
  const record = getAttendanceRecordForDate(date, attendanceRecords);
  return !!record;
}

// ==================== 获取指定日期的签到记录 ====================
function getAttendanceRecordForDate(date, attendanceRecords) {
  if (!attendanceRecords || !Array.isArray(attendanceRecords)) return null;
  
  // 查找匹配的记录
  const record = attendanceRecords.find(record => {
    if (!record.time) return false;
    
    try {
      const recordDate = new Date(record.time);
      return isSameDate(recordDate, date);
    } catch (error) {
      return false;
    }
  });
  
  return record || null;
}

// ==================== 判断是否为同一天 ====================
function isSameDate(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// ==================== 工具函数 ====================
// formatDateForDisplay函数已移至utils.js，使用window.utils.formatDateForDisplay()

