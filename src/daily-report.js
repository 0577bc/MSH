// src/daily-report.js
// 使用全局 firebase 对象和 window.firebaseConfig

// Initialize Firebase
const app = firebase.initializeApp(window.firebaseConfig);
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
  const signedList = document.getElementById('signedList');
  const unsignedList = document.getElementById('unsignedList');
  const newcomersList = document.getElementById('newcomersList');
  const totalSigned = document.getElementById('totalSigned');
  const totalNewcomers = document.getElementById('totalNewcomers');
  const backButton = document.getElementById('backButton');

  let attendanceRecords = [];
  let groups = {};
  const groupNames = {};

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
        Object.assign(groupNames, groupNamesSnapshot.val() || {});
      }

      generateDailyReport();
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
    }
  }

  function generateDailyReport() {
    const today = new Date().toLocaleDateString('zh-CN');
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === today
    );

    signedList.innerHTML = '';
    todayRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[record.group] || record.group}</td>
        <td>${record.name}</td>
        <td>${record.time}</td>
      `;
      signedList.appendChild(row);
    });
    totalSigned.textContent = todayRecords.length;

    unsignedList.innerHTML = '';
    const allMembers = Object.keys(groups).flatMap(group => 
      groups[group].map(member => ({ group, name: member.name }))
    );
    const signedNames = new Set(todayRecords.map(record => record.name));
    const unsignedByGroup = {};
    allMembers.forEach(member => {
      if (!signedNames.has(member.name)) {
        if (!unsignedByGroup[member.group]) unsignedByGroup[member.group] = [];
        unsignedByGroup[member.group].push(member.name);
      }
    });
    Object.keys(unsignedByGroup).forEach(group => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[group] || group}</td>
        <td>${unsignedByGroup[group].join(', ')}</td>
      `;
      unsignedList.appendChild(row);
    });

    newcomersList.innerHTML = '';
    let newcomersCount = 0;
    Object.keys(groups).forEach(group => {
      groups[group].forEach(member => {
        if (member.joinDate && new Date(member.joinDate).toLocaleDateString('zh-CN') === today) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${groupNames[group] || group}</td>
            <td>${member.name}</td>
          `;
          newcomersList.appendChild(row);
          newcomersCount++;
        }
      });
    });
    totalNewcomers.textContent = newcomersCount;
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = "index.html";
    });
  }

  loadDataFromFirebase();
});