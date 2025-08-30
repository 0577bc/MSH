import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

let groupNames = {};
let groups = {};
let attendanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  const summaryList = document.getElementById('summaryList');
  const showAttendanceButton = document.getElementById('showAttendanceButton');
  const dailyReportButton = document.getElementById('dailyReportButton');
  const quarterlyReportButton = document.getElementById('quarterlyReportButton');
  const yearlyReportButton = document.getElementById('yearlyReportButton');
  const backButton = document.getElementById('backButton');
  const summaryTable = document.getElementById('summaryTable');
  const dailyReportSection = document.getElementById('dailyReportSection');
  const dailyDate = document.getElementById('dailyDate');
  const generateDailyReport = document.getElementById('generateDailyReport');
  const exportDailyReport = document.getElementById('exportDailyReport');
  const dailyReportList = document.getElementById('dailyReportList');
  const quarterlyReportSection = document.getElementById('quarterlyReportSection');
  const quarterlyYear = document.getElementById('quarterlyYear');
  const quarterlyQuarter = document.getElementById('quarterlyQuarter');
  const generateQuarterlyReport = document.getElementById('generateQuarterlyReport');
  const exportQuarterlyReport = document.getElementById('exportQuarterlyReport');
  const quarterlyReportList = document.getElementById('quarterlyReportList');
  const yearlyReportSection = document.getElementById('yearlyReportSection');
  const yearlyYear = document.getElementById('yearlyYear');
  const generateYearlyReport = document.getElementById('generateYearlyReport');
  const exportYearlyReport = document.getElementById('exportYearlyReport');

  // 加载小组名称
  async function loadGroupNames() {
    try {
      const docRef = doc(db, 'settings', 'groupNames');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        groupNames = docSnap.data() || {};
      }
    } catch (error) {
      console.error('加载小组名称失败:', error);
    }
  }

  // 加载小组成员
  async function loadGroups() {
    try {
      const querySnapshot = await getDocs(collection(db, 'members'));
      groups = {};
      querySnapshot.forEach(doc => {
        const member = doc.data();
        if (!groups[member.group]) groups[member.group] = [];
        groups[member.group].push({
          name: member.name,
          phone: member.phone,
          gender: member.gender,
          baptized: member.baptized,
          age: member.age,
          addedDate: member.addedDate,
          id: doc.id
        });
      });
    } catch (error) {
      console.error('加载小组成员失败:', error);
    }
  }

  // 加载签到记录
  async function loadAttendanceRecords() {
    try {
      const querySnapshot = await getDocs(collection(db, 'attendance'));
      attendanceRecords = querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('加载签到记录失败:', error);
      alert('加载签到记录失败，请检查网络或 Firebase 配置');
    }
  }

  // 渲染签到记录
  function renderSummary() {
    summaryList.innerHTML = '';
    const sortedRecords = attendanceRecords.sort((a, b) => b.date.localeCompare(a.date));
    sortedRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${groupNames[record.group] || record.group}</td>
        <td>${record.member}</td>
        <td>${record.time}</td>
      `;
      summaryList.appendChild(row);
    });
  }

  // 生成日报表
  function generateDailyReportSummary(date) {
    dailyReportList.innerHTML = '';
    const dateRow = document.getElementById('dateRow');
    dateRow.innerHTML = `<td colspan="5" style="text-align: right;">日期：${date}</td>`;
    const todayRecords = attendanceRecords.filter(record => record.date === date);

    for (let group in groups) {
      const groupMembers = groups[group].map(member => member.name);
      const signedMembers = todayRecords.filter(record => record.group === group).map(record => record.member);
      const unsignedMembers = groupMembers.filter(member => !signedMembers.includes(member));

      const early = [];
      const onTime = [];
      const late = [];
      todayRecords.forEach(record => {
        if (record.group === group) {
          const timeParts = record.time.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          if (hours < 9 || (hours === 9 && minutes === 0)) {
            early.push(record.member);
          } else if (hours === 9 && minutes <= 30) {
            onTime.push(record.member);
          } else {
            late.push(record.member);
          }
        }
      });

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[group] || group}</td>
        <td>${early.join(', ') || '-'}</td>
        <td>${onTime.join(', ') || '-'}</td>
        <td>${late.join(', ') || '-'}</td>
        <td>${unsignedMembers.join(', ') || '-'}</td>
      `;
      dailyReportList.appendChild(row);
    }
  }

  // 生成季度报表
  function generateQuarterlyReportSummary(year, quarter) {
    quarterlyReportList.innerHTML = '';
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const sundayRecords = attendanceRecords.filter(record => {
      const date = new Date(record.date);
      return isSunday(record.date) &&
             date.getFullYear() === parseInt(year) &&
             date.getMonth() >= startMonth && date.getMonth() <= endMonth;
    });

    sundayRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${groupNames[record.group] || record.group}</td>
        <td>${record.member}</td>
        <td>${record.time}</td>
      `;
      quarterlyReportList.appendChild(row);
    });
  }

  // 生成年度报表
  function generateYearlyReportSummary(year) {
    yearlyReportList.innerHTML = '';
    const sundayRecords = attendanceRecords.filter(record => {
      const date = new Date(record.date);
      return isSunday(record.date) && date.getFullYear() === parseInt(year);
    });

    sundayRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${groupNames[record.group] || record.group}</td>
        <td>${record.member}</td>
        <td>${record.time}</td>
      `;
      yearlyReportList.appendChild(row);
    });
  }

  // 判断是否为周日
  function isSunday(dateStr) {
    const date = new Date(dateStr);
    return date.getDay() === 0;
  }

  // 导出 Excel
  function exportToExcel(records, filename) {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  // 事件监听器
  showAttendanceButton.addEventListener('click', () => {
    hideAllSections();
    summaryTable.style.display = 'block';
    renderSummary();
  });

  dailyReportButton.addEventListener('click', () => {
    hideAllSections();
    dailyReportSection.style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    dailyDate.value = today;
    generateDailyReportSummary(today);
  });

  generateDailyReport.addEventListener('click', () => {
    const date = dailyDate.value;
    if (date) {
      generateDailyReportSummary(date);
    } else {
      alert('请选择日期！');
    }
  });

  exportDailyReport.addEventListener('click', () => {
    const date = dailyDate.value;
    const records = attendanceRecords.filter(record => record.date === date).map(record => ({
      日期: record.date,
      组别: groupNames[record.group] || record.group,
      姓名: record.member,
      时间: record.time
    }));
    exportToExcel(records, `日报表_${date}`);
  });

  quarterlyReportButton.addEventListener('click', () => {
    hideAllSections();
    quarterlyReportSection.style.display = 'block';
    generateQuarterlyReportSummary(quarterlyYear.value, quarterlyQuarter.value);
  });

  generateQuarterlyReport.addEventListener('click', () => {
    generateQuarterlyReportSummary(quarterlyYear.value, quarterlyQuarter.value);
  });

  exportQuarterlyReport.addEventListener('click', () => {
    const year = quarterlyYear.value;
    const quarter = quarterlyQuarter.value;
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const sundayRecords = attendanceRecords.filter(record => {
      const date = new Date(record.date);
      return isSunday(record.date) &&
             date.getFullYear() === parseInt(year) &&
             date.getMonth() >= startMonth && date.getMonth() <= endMonth;
    }).map(record => ({
      日期: record.date,
      组别: groupNames[record.group] || record.group,
      姓名: record.member,
      时间: record.time
    }));
    exportToExcel(sundayRecords, `季度报表_${year}_Q${quarter}`);
  });

  yearlyReportButton.addEventListener('click', () => {
    hideAllSections();
    yearlyReportSection.style.display = 'block';
    generateYearlyReportSummary(yearlyYear.value);
  });

  generateYearlyReport.addEventListener('click', () => {
    generateYearlyReportSummary(yearlyYear.value);
  });

  exportYearlyReport.addEventListener('click', () => {
    const year = yearlyYear.value;
    const sundayRecords = attendanceRecords.filter(record => {
      const date = new Date(record.date);
      return isSunday(record.date) && date.getFullYear() === parseInt(year);
    }).map(record => ({
      日期: record.date,
      组别: groupNames[record.group] || record.group,
      姓名: record.member,
      时间: record.time
    }));
    exportToExcel(sundayRecords, `年度报表_${year}`);
  });

  backButton.addEventListener('click', () => {
    window.location.href = 'admin.html';
  });

  // 隐藏所有报表部分
  function hideAllSections() {
    summaryTable.style.display = 'none';
    dailyReportSection.style.display = 'none';
    quarterlyReportSection.style.display = 'none';
    yearlyReportSection.style.display = 'none';
    exportDailyReport.style.display = 'none';
    exportQuarterlyReport.style.display = 'none';
    exportYearlyReport.style.display = 'none';
  }

  // 初始加载
  Promise.all([loadGroupNames(), loadGroups(), loadAttendanceRecords()]).then(() => {
    hideAllSections();
    summaryTable.style.display = 'block';
    renderSummary();
  });
});