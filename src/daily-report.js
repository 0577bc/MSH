// src/daily-report.js
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', async () => {
  const dailyReportList = document.getElementById('dailyReportList');
  const dateRow = document.getElementById('dateRow');
  const backButton = document.getElementById('backButton');

  let groups = {};
  let groupNames = {};
  let attendanceRecords = [];

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
    }
  }

  // 生成日报表
  function generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    dateRow.innerHTML = `<td colspan="5" style="text-align: right;">日期：${today}</td>`;
    dailyReportList.innerHTML = '';

    const todayRecords = attendanceRecords.filter(record => record.date === today);
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

  backButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // 初始加载
  await Promise.all([loadGroupNames(), loadGroups(), loadAttendanceRecords()]);
  generateDailyReport();
});