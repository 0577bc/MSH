// src/summary.js
// 使用全局 firebase 对象和 window.firebaseConfig

// Initialize Firebase
let app, db;
try {
  app = firebase.app();
  db = firebase.database();
} catch (error) {
  app = firebase.initializeApp(window.firebaseConfig);
  db = firebase.database();
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("Summary page loaded");
  
  // 获取DOM元素
  const backButton = document.getElementById('backButton');
  const backToSigninButton = document.getElementById('backToSigninButton');
  const exportButton = document.getElementById('exportButton');
  
  // 导航按钮
  const showAttendanceData = document.getElementById('showAttendanceData');
  const showDailyReport = document.getElementById('showDailyReport');
  const showQuarterlyReport = document.getElementById('showQuarterlyReport');
  const showYearlyReport = document.getElementById('showYearlyReport');
  
  // 签到数据相关
  const attendanceDataSection = document.getElementById('attendanceDataSection');
  const dateSelect = document.getElementById('dateSelect');
  const viewDateData = document.getElementById('viewDateData');
  const attendanceDataList = document.getElementById('attendanceDataList');
  
  // 日报表相关
  const dailyReportSection = document.getElementById('dailyReportSection');
  const dailyDateSelect = document.getElementById('dailyDateSelect');
  const viewDailyReport = document.getElementById('viewDailyReport');
  const earlyCount = document.getElementById('earlyCount');
  const onTimeCount = document.getElementById('onTimeCount');
  const lateCount = document.getElementById('lateCount');
  const unsignedCount = document.getElementById('unsignedCount');
  const newcomerCount = document.getElementById('newcomerCount');
  const attendanceRate = document.getElementById('attendanceRate');
  const dailyReportList = document.getElementById('dailyReportList');
  
  // 季度报表相关
  const quarterlyReportSection = document.getElementById('quarterlyReportSection');
  const quarterSelect = document.getElementById('quarterSelect');
  const viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  const quarterlyReportList = document.getElementById('quarterlyReportList');
  
  // 年度报表相关
  const yearlyReportSection = document.getElementById('yearlyReportSection');
  const yearSelect = document.getElementById('yearSelect');
  const viewYearlyReport = document.getElementById('viewYearlyReport');
  const yearlyReportList = document.getElementById('yearlyReportList');

  let attendanceRecords = [];
  let groups = {};
  let groupNames = {};

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      const attendanceRef = firebase.database().ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      const groupsRef = firebase.database().ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
      }

      const groupNamesRef = firebase.database().ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
      }

      initializePage();
      console.log("Summary data loaded from Firebase");
    } catch (error) {
      console.error("Error loading summary data from Firebase:", error);
      console.log("Using local storage as fallback");
      loadFromLocalStorage();
    }
  }

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
      } else {
        groups = window.sampleData.groups;
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
      } else {
        groupNames = window.sampleData.groupNames;
      }

      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
      }

      initializePage();
      console.log("Summary data loaded from local storage");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  function initializePage() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    if (dateSelect) dateSelect.value = today;
    if (dailyDateSelect) dailyDateSelect.value = today;
    
    // 初始化季度和年份选项
    initializePeriodOptions();
    
    // 默认显示签到数据
    showSection('attendanceData');
    loadAttendanceData(today);
  }

  function initializePeriodOptions() {
    // 初始化季度选项
    if (quarterSelect) {
      quarterSelect.innerHTML = '<option value="">--请选择季度--</option>';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        for (let q = 1; q <= 4; q++) {
          const option = document.createElement('option');
          option.value = `${year}-Q${q}`;
          option.textContent = `${year}年第${q}季度`;
          quarterSelect.appendChild(option);
        }
      });
    }

    // 初始化年份选项
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="">--请选择年份--</option>';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
      });
    }
  }

  function showSection(sectionName) {
    // 隐藏所有section
    const sections = [attendanceDataSection, dailyReportSection, quarterlyReportSection, yearlyReportSection];
    sections.forEach(section => {
      if (section) section.style.display = 'none';
    });

    // 移除所有导航按钮的active类
    const navButtons = [showAttendanceData, showDailyReport, showQuarterlyReport, showYearlyReport];
    navButtons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    // 显示选中的section
    switch (sectionName) {
      case 'attendanceData':
        if (attendanceDataSection) attendanceDataSection.style.display = 'block';
        if (showAttendanceData) showAttendanceData.classList.add('active');
        break;
      case 'dailyReport':
        if (dailyReportSection) dailyReportSection.style.display = 'block';
        if (showDailyReport) showDailyReport.classList.add('active');
        break;
      case 'quarterlyReport':
        if (quarterlyReportSection) quarterlyReportSection.style.display = 'block';
        if (showQuarterlyReport) showQuarterlyReport.classList.add('active');
        break;
      case 'yearlyReport':
        if (yearlyReportSection) yearlyReportSection.style.display = 'block';
        if (showYearlyReport) showYearlyReport.classList.add('active');
        break;
    }
  }

  function getAttendanceType(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // 早到：9:20之前 (0:00 - 9:20)
    if (timeInMinutes < 9 * 60 + 20) return '早到';
    
    // 准时：9:30之前 (9:20 - 9:30)
    if (timeInMinutes < 9 * 60 + 30) return '准时';
    
    // 迟到：10:40之前 (9:30 - 10:40)
    if (timeInMinutes < 10 * 60 + 40) return '迟到';
    
    // 10:40之后不再统计在日报表中
    return '无效';
  }

  function loadAttendanceData(date) {
    if (!attendanceDataList) return;
    
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    const dayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );

    attendanceDataList.innerHTML = '';
    dayRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[record.group] || record.group}</td>
        <td>${record.name}</td>
        <td class="time-cell">${record.time}</td>
        <td class="timeSlot-cell">${record.timeSlot || getAttendanceType(new Date(record.time))}</td>
        <td>
          <button class="edit-time-btn" data-index="${index}" data-record-id="${record.id || index}">编辑时间</button>
        </td>
      `;
      attendanceDataList.appendChild(row);
    });

    // 添加编辑时间按钮的事件监听器
    document.querySelectorAll('.edit-time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const recordIndex = parseInt(e.target.dataset.index);
        const record = dayRecords[recordIndex];
        editAttendanceTime(record, recordIndex);
      });
    });
  }

  function editAttendanceTime(record, recordIndex) {
    // 创建编辑对话框
    const dialog = document.createElement('div');
    dialog.className = 'edit-time-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>编辑签到时间</h3>
        <p><strong>姓名：</strong>${record.name}</p>
        <p><strong>组别：</strong>${groupNames[record.group] || record.group}</p>
        <p><strong>当前时间：</strong>${record.time}</p>
        <div class="form-group">
          <label for="newTime">新签到时间：</label>
          <input type="datetime-local" id="newTime" value="${formatDateTimeForInput(record.time)}" required>
        </div>
        <div class="dialog-buttons">
          <button id="saveTimeBtn" type="button">保存</button>
          <button id="cancelTimeBtn" type="button">取消</button>
        </div>
      </div>
    `;
    
    // 添加样式
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const content = dialog.querySelector('.dialog-content');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 400px;
      max-width: 500px;
    `;
    
    document.body.appendChild(dialog);
    
    // 事件监听器
    const saveBtn = dialog.querySelector('#saveTimeBtn');
    const cancelBtn = dialog.querySelector('#cancelTimeBtn');
    const newTimeInput = dialog.querySelector('#newTime');
    
    saveBtn.addEventListener('click', () => {
      const newTime = newTimeInput.value;
      if (!newTime) {
        alert('请输入新的签到时间！');
        return;
      }
      
      // 更新记录
      const newDateTime = new Date(newTime);
      const newTimeString = newDateTime.toLocaleString('zh-CN');
      const newTimeSlot = getAttendanceType(newDateTime);
      
      // 找到并更新attendanceRecords中的记录
      const recordToUpdate = attendanceRecords.find(r => 
        r.name === record.name && 
        r.group === record.group && 
        r.time === record.time
      );
      
      if (recordToUpdate) {
        recordToUpdate.time = newTimeString;
        recordToUpdate.timeSlot = newTimeSlot;
        
        // 保存到本地存储
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
        
        // 同步到Firebase
        syncToFirebase();
        
        // 重新加载数据
        const currentDate = document.getElementById('dateSelect').value;
        loadAttendanceData(currentDate);
        
        // 如果当前显示的是日报表，也重新加载日报表
        if (dailyReportSection && !dailyReportSection.classList.contains('hidden-form')) {
          loadDailyReport(currentDate);
        }
        
        // 关闭对话框
        document.body.removeChild(dialog);
        
        alert('签到时间已更新！所有相关统计已重新计算。');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // 点击背景关闭对话框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  function formatDateTimeForInput(dateTimeString) {
    // 将中文日期时间格式转换为datetime-local输入格式
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function syncToFirebase() {
    try {
      if (db) {
        await firebase.database().ref('attendanceRecords').set(attendanceRecords);
        console.log('签到记录已同步到Firebase');
      }
    } catch (error) {
      console.error('同步到Firebase失败:', error);
    }
  }

  function loadDailyReport(date) {
    if (!dailyReportList) return;
    
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    const dayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );

    // 统计各时段人数
    let earlyCountNum = 0, onTimeCountNum = 0, lateCountNum = 0;
    const signedNames = new Set();
    
    dayRecords.forEach(record => {
      signedNames.add(record.name);
      const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
      if (timeSlot === '早到') earlyCountNum++;
      else if (timeSlot === '准时') onTimeCountNum++;
      else if (timeSlot === '迟到') lateCountNum++;
    });

    // 统计未签到人数
    const allMembers = Object.keys(groups).flatMap(group => 
      groups[group].map(member => ({ group, name: member.name }))
    );
    const unsignedCount = allMembers.length - signedNames.size;

    // 统计新人
    let newcomerCount = 0;
    Object.keys(groups).forEach(group => {
      groups[group].forEach(member => {
        if (member.joinDate && new Date(member.joinDate).toLocaleDateString('zh-CN') === targetDate) {
          newcomerCount++;
        }
      });
    });

    // 更新汇总数据
    if (earlyCount) earlyCount.textContent = earlyCountNum;
    if (onTimeCount) onTimeCount.textContent = onTimeCountNum;
    if (lateCount) lateCount.textContent = lateCountNum;
    if (unsignedCount) unsignedCount.textContent = unsignedCount;
    if (newcomerCount) newcomerCount.textContent = newcomerCount;
    
    const totalMembers = allMembers.length;
    const attendanceRateNum = totalMembers > 0 ? Math.round((signedNames.size / totalMembers) * 100) : 0;
    if (attendanceRate) attendanceRate.textContent = attendanceRateNum + '%';

    // 按组统计
    const groupStats = {};
    Object.keys(groups).forEach(group => {
      const groupMembers = groups[group];
      const groupSigned = dayRecords.filter(record => record.group === group);
      const signedNames = groupSigned.map(record => record.name);
      const unsignedMembers = groupMembers.filter(member => !signedNames.includes(member.name));
      
      const groupEarly = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        return timeSlot === '早到';
      }).length;
      const groupOnTime = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        return timeSlot === '准时';
      }).length;
      const groupLate = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        return timeSlot === '迟到';
      }).length;
      const groupUnsigned = groupMembers.length - groupSigned.length;
      const groupRate = groupMembers.length > 0 ? Math.round((groupSigned.length / groupMembers.length) * 100) : 0;
      
      groupStats[group] = {
        early: groupEarly,
        onTime: groupOnTime,
        late: groupLate,
        unsigned: groupUnsigned,
        unsignedNames: unsignedMembers.map(member => member.name).join(', '),
        rate: groupRate
      };
    });

    // 显示组统计
    dailyReportList.innerHTML = '';
    Object.keys(groupStats).forEach(group => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[group] || group}</td>
        <td>${groupStats[group].early}</td>
        <td>${groupStats[group].onTime}</td>
        <td>${groupStats[group].late}</td>
        <td>${groupStats[group].unsigned}</td>
        <td>${groupStats[group].unsignedNames || '无'}</td>
        <td>${groupStats[group].rate}%</td>
      `;
      dailyReportList.appendChild(row);
    });
  }

  function loadQuarterlyReport(quarter) {
    if (!quarterlyReportList) return;
    
    const [year, q] = quarter.split('-Q');
    const startMonth = (parseInt(q) - 1) * 3;
    const startDate = new Date(parseInt(year), startMonth, 1);
    const endDate = new Date(parseInt(year), startMonth + 3, 0);
    
    const quarterRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 统计每个成员的签到情况
    const memberStats = {};
    quarterRecords.forEach(record => {
      const key = `${record.group}-${record.name}`;
      if (!memberStats[key]) {
        memberStats[key] = { 
          group: record.group, 
          name: record.name, 
          morning: 0, 
          afternoon: 0, 
          evening: 0 
        };
      }
      const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
      if (timeSlot === '上午') memberStats[key].morning++;
      else if (timeSlot === '下午') memberStats[key].afternoon++;
      else if (timeSlot === '晚上') memberStats[key].evening++;
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    quarterlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      quarterlyReportList.appendChild(row);
    });
  }

  function loadYearlyReport(year) {
    if (!yearlyReportList) return;
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    
    const yearRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 统计每个成员的签到情况
    const memberStats = {};
    yearRecords.forEach(record => {
      const key = `${record.group}-${record.name}`;
      if (!memberStats[key]) {
        memberStats[key] = { 
          group: record.group, 
          name: record.name, 
          morning: 0, 
          afternoon: 0, 
          evening: 0 
        };
      }
      const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
      if (timeSlot === '上午') memberStats[key].morning++;
      else if (timeSlot === '下午') memberStats[key].afternoon++;
      else if (timeSlot === '晚上') memberStats[key].evening++;
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    yearlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      yearlyReportList.appendChild(row);
    });
  }

  function countSundays(start, end) {
    let sundays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) sundays++;
    }
    return sundays;
  }

  // 事件监听器
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = "admin.html";
    });
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', () => {
      window.location.href = "index.html";
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const data = { attendanceRecords, groups, groupNames };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "msh-summary-data.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }

  // 导航按钮事件
  if (showAttendanceData) {
    showAttendanceData.addEventListener('click', () => {
      showSection('attendanceData');
    });
  }

  if (showDailyReport) {
    showDailyReport.addEventListener('click', () => {
      showSection('dailyReport');
    });
  }

  if (showQuarterlyReport) {
    showQuarterlyReport.addEventListener('click', () => {
      showSection('quarterlyReport');
    });
  }

  if (showYearlyReport) {
    showYearlyReport.addEventListener('click', () => {
      showSection('yearlyReport');
    });
  }

  // 签到数据相关事件
  if (viewDateData) {
    viewDateData.addEventListener('click', () => {
      const date = dateSelect ? dateSelect.value : new Date().toISOString().split('T')[0];
      loadAttendanceData(date);
    });
  }

  // 日报表相关事件
  if (viewDailyReport) {
    viewDailyReport.addEventListener('click', () => {
      const date = dailyDateSelect ? dailyDateSelect.value : new Date().toISOString().split('T')[0];
      loadDailyReport(date);
    });
  }

  // 季度报表相关事件
  if (viewQuarterlyReport) {
    viewQuarterlyReport.addEventListener('click', () => {
      const quarter = quarterSelect ? quarterSelect.value : '';
      if (quarter) {
        loadQuarterlyReport(quarter);
      } else {
        alert('请选择季度！');
      }
    });
  }

  // 年度报表相关事件
  if (viewYearlyReport) {
    viewYearlyReport.addEventListener('click', () => {
      const year = yearSelect ? yearSelect.value : '';
      if (year) {
        loadYearlyReport(year);
      } else {
        alert('请选择年份！');
      }
    });
  }

  // 初始加载数据 - 优先使用Firebase
  console.log("汇总页面正在连接Firebase数据库...");
  loadDataFromFirebase();
});