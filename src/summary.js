// src/summary.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtxq7tQkHjFEK5Eo0sh-X0H1ywrExYir0",
  authDomain: "mshsystem-e50ca.firebaseapp.com",
  projectId: "mshsystem-e50ca",
  storageBucket: "mshsystem-e50ca.firebasestorage.app",
  messagingSenderId: "188333154672",
  appId: "1:188333154672:web:ebb15e9d7f2e7a77c82fb5",
  measurementId: "G-1NJQ1K6YTH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
  const summaryList = document.getElementById('summaryList');
  const tableHead = document.getElementById('tableHead');
  const reportTitle = document.getElementById('reportTitle');
  const backButton = document.getElementById('backButton');
  const backToSigninButton = document.getElementById('backToSigninButton');
  const clearRecordsButton = document.getElementById('clearRecordsButton');
  const exportButton = document.getElementById('exportButton');
  const reportType = document.getElementById('reportType');
  const reportPeriod = document.getElementById('reportPeriod');
  const periodLabel = document.getElementById('periodLabel');

  let attendanceRecords = [];
  const groupNames = {};

  async function loadDataFromFirebase() {
    try {
      const attendanceRef = ref(db, 'attendanceRecords');
      const attendanceSnapshot = await get(attendanceRef);
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      const groupNamesRef = ref(db, 'groupNames');
      const groupNamesSnapshot = await get(groupNamesRef);
      if (groupNamesSnapshot.exists()) {
        Object.assign(groupNames, groupNamesSnapshot.val() || {});
      }

      generateSummary('records');
      updatePeriodOptions('records');
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
    }
  }

  function getMorningAttendanceType(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const time = hours + minutes / 60;
    if (time >= 5 && time < 9) return '早到'; // 5:00 - 9:00
    if (time >= 9 && time < 9.5) return '准时'; // 9:00 - 9:30
    if (time >= 9.5 && time < 11.5) return '迟到'; // 9:30 - 11:30
    return '其他';
  }

  function countSundays(start, end) {
    let sundays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) sundays++;
    }
    return sundays;
  }

  function generateSummary(filterType = 'records', period = null) {
    summaryList.innerHTML = '';
    tableHead.innerHTML = '';
    reportTitle.textContent = filterType === 'records' ? '签到记录' : filterType === 'quarterly' ? '季度报告' : '年度报告';

    if (filterType === 'records') {
      tableHead.innerHTML = `
        <tr>
          <th>组别</th>
          <th>姓名</th>
          <th>签到时间</th>
          <th>签到时段</th>
          <th>操作</th>
        </tr>
      `;
      attendanceRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${groupNames[record.group] || record.group}</td>
          <td>${record.name}</td>
          <td><input type="text" value="${record.time}" data-index="${index}"></td>
          <td>${record.timeSlot || getMorningAttendanceType(new Date(record.time))}</td>
          <td><button class="saveTime" data-index="${index}">保存</button></td>
        `;
        summaryList.appendChild(row);
      });

      document.querySelectorAll('.saveTime').forEach(button => {
        button.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          const newTime = e.target.parentElement.previousElementSibling.previousElementSibling.querySelector('input').value;
          attendanceRecords[index].time = newTime;
          attendanceRecords[index].timeSlot = getMorningAttendanceType(new Date(newTime));
          const recordRef = ref(db, `attendanceRecords/${Object.keys(attendanceRecords[index])[0]}`); // 假设使用 push 生成的键
          set(recordRef, attendanceRecords[index]);
          alert('时间已更新！');
          generateSummary('records');
        });
      });
    } else {
      tableHead.innerHTML = `
        <tr>
          <th>组别</th>
          <th>姓名</th>
          <th>早到次数</th>
          <th>准时次数</th>
          <th>迟到次数</th>
          <th>签到率</th>
        </tr>
      `;
      const startDate = filterType === 'quarterly' && period ? 
        new Date(period.split('-Q')[0], (parseInt(period.split('-Q')[1]) - 1) * 3, 1) : 
        new Date(parseInt(period), 0, 1);
      const endDate = filterType === 'quarterly' && period ? 
        new Date(period.split('-Q')[0], parseInt(period.split('-Q')[1]) * 3, 0) : 
        new Date(parseInt(period), 11, 31);
      const filteredRecords = attendanceRecords.filter(record => {
        const date = new Date(record.time);
        return date.getDay() === 0 && 
               date >= startDate && 
               date <= endDate && 
               getMorningAttendanceType(date) !== '其他';
      });

      const memberStats = {};
      filteredRecords.forEach(record => {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            early: 0, 
            onTime: 0, 
            late: 0 
          };
        }
        const type = getMorningAttendanceType(new Date(record.time));
        if (type === '早到') memberStats[key].early++;
        else if (type === '准时') memberStats[key].onTime++;
        else if (type === '迟到') memberStats[key].late++;
      });

      const totalSundays = countSundays(startDate, endDate);
      Object.values(memberStats).forEach(stat => {
        const totalSignIns = stat.early + stat.onTime + stat.late;
        const signInRate = `${totalSignIns}/${totalSundays}`;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${groupNames[stat.group] || stat.group}</td>
          <td>${stat.name}</td>
          <td>${stat.early}</td>
          <td>${stat.onTime}</td>
          <td>${stat.late}</td>
          <td>${signInRate}</td>
        `;
        summaryList.appendChild(row);
      });
    }
  }

  function updatePeriodOptions(type) {
    reportPeriod.innerHTML = '';
    periodLabel.style.display = 'none';
    reportPeriod.style.display = 'none';
    if (type === 'quarterly') {
      periodLabel.style.display = 'inline';
      reportPeriod.style.display = 'inline';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        for (let q = 1; q <= 4; q++) {
          const option = document.createElement('option');
          option.value = `${year}-Q${q}`;
          option.textContent = `${year}年第${q}季度`;
          reportPeriod.appendChild(option);
        }
      });
    } else if (type === 'yearly') {
      periodLabel.style.display = 'inline';
      reportPeriod.style.display = 'inline';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        reportPeriod.appendChild(option);
      });
    }
  }

  function countSundays(start, end) {
    let sundays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) sundays++;
    }
    return sundays;
  }

  function exportToCSV(type, period = null) {
    let data = [];
    let filename = '';
    if (type === 'records') {
      data = attendanceRecords.map(r => [groupNames[r.group] || r.group, r.name, r.time, r.timeSlot || getMorningAttendanceType(new Date(r.time))]);
      filename = 'attendance_records.csv';
    } else {
      const startDate = type === 'quarterly' && period ? 
        new Date(period.split('-Q')[0], (parseInt(period.split('-Q')[1]) - 1) * 3, 1) : 
        new Date(parseInt(period), 0, 1);
      const endDate = type === 'quarterly' && period ? 
        new Date(period.split('-Q')[0], parseInt(period.split('-Q')[1]) * 3, 0) : 
        new Date(parseInt(period), 11, 31);
      const filteredRecords = attendanceRecords.filter(record => {
        const date = new Date(record.time);
        return date.getDay() === 0 && 
               date >= startDate && 
               date <= endDate && 
               getMorningAttendanceType(date) !== '其他';
      });

      const memberStats = {};
      filteredRecords.forEach(record => {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            early: 0, 
            onTime: 0, 
            late: 0 
          };
        }
        const attType = getMorningAttendanceType(new Date(record.time));
        if (attType === '早到') memberStats[key].early++;
        else if (attType === '准时') memberStats[key].onTime++;
        else if (attType === '迟到') memberStats[key].late++;
      });

      const totalSundays = countSundays(startDate, endDate);
      data = Object.values(memberStats).map(stat => {
        const totalSignIns = stat.early + stat.onTime + stat.late;
        const signInRate = `${totalSignIns}/${totalSundays}`;
        return [groupNames[stat.group] || stat.group, stat.name, stat.early, stat.onTime, stat.late, signInRate];
      });
      filename = type === 'quarterly' ? `quarterly_${period}.csv` : `yearly_${period}.csv`;
    }

    const csvContent = "data:text/csv;charset=utf-8," + 
      [(type === 'records' ? ['组别', '姓名', '签到时间', '签到时段'] : ['组别', '姓名', '早到次数', '准时次数', '迟到次数', '签到率'])].concat(data)
      .map(row => row.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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

  if (clearRecordsButton) {
    clearRecordsButton.addEventListener('click', () => {
      const enteredPassword = prompt("请输入管理员密码：");
      if (enteredPassword === adminPassword) {
        if (confirm("确定清空所有签到记录吗？此操作不可恢复！")) {
          set(ref(db, 'attendanceRecords'), {});
          attendanceRecords = [];
          alert('签到记录已清空！');
          generateSummary('records');
        }
      } else {
        alert('密码错误，清空失败！');
      }
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const type = reportType.value;
      exportToCSV(type, type === 'records' ? null : reportPeriod.value || reportPeriod.options[0]?.value);
    });
  }

  if (reportType) {
    reportType.addEventListener('change', () => {
      const type = reportType.value;
      updatePeriodOptions(type);
      generateSummary(type, type === 'records' ? null : reportPeriod.value || reportPeriod.options[0]?.value);
    });
  }

  if (reportPeriod) {
    reportPeriod.addEventListener('change', () => {
      generateSummary(reportType.value, reportPeriod.value);
    });
  }

  loadDataFromFirebase();
});