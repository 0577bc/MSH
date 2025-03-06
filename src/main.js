// src/main.js
// 使用全局 firebase 对象（通过 CDN 引入）

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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded successfully");
  const groupSelect = document.getElementById('groupSelect');
  const memberSelect = document.getElementById('memberSelect');
  const memberSearch = document.getElementById('memberSearch');
  const suggestions = document.getElementById('suggestions');
  const signinButton = document.getElementById('signinButton');
  const addNewcomerButton = document.getElementById('addNewcomerButton');
  const dailyReportButton = document.getElementById('dailyReportButton');
  const addMemberForm = document.getElementById('addMemberForm');
  const newGroupSelect = document.getElementById('newGroupSelect');
  const newMemberName = document.getElementById('newMemberName');
  const newMemberPhone = document.getElementById('newMemberPhone');
  const saveNewMemberButton = document.getElementById('saveNewMemberButton');
  const cancelNewMemberButton = document.getElementById('cancelNewMemberButton');
  const adminButton = document.getElementById('adminButton');
  const earlyList = document.getElementById('earlyList');
  const onTimeList = document.getElementById('onTimeList');
  const lateList = document.getElementById('lateList');

  let groups = {};
  let groupNames = {};
  let attendanceRecords = [];

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      // 加载 groups
      const groupsRef = firebase.database().ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
      }

      // 加载 groupNames
      const groupNamesRef = firebase.database().ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
      }

      // 加载 attendanceRecords
      const attendanceRef = firebase.database().ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      loadGroupsAndMembers();
      loadMembers(groupSelect ? groupSelect.value : '');
      loadAttendanceRecords();
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
    }
  }

  // 实时监听数据变化（可选）
  firebase.database().ref('groups').on('value', (snapshot) => {
    groups = snapshot.val() || {};
    loadGroupsAndMembers();
  });
  firebase.database().ref('groupNames').on('value', (snapshot) => {
    groupNames = snapshot.val() || {};
    loadGroupsAndMembers();
  });
  firebase.database().ref('attendanceRecords').on('value', (snapshot) => {
    attendanceRecords = Object.values(snapshot.val() || {});
    loadAttendanceRecords();
  });

  function loadGroupsAndMembers() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      for (let group in groupNames) {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = groupNames[group];
        groupSelect.appendChild(option);
      }
    }
    if (newGroupSelect) {
      newGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      for (let group in groupNames) {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = groupNames[group];
        newGroupSelect.appendChild(option);
      }
    }
  }

  function loadMembers(group) {
    if (memberSelect) {
      memberSelect.innerHTML = '<option value="">--请选择成员--</option>';
      if (groups[group]) {
        groups[group].forEach(member => {
          const option = document.createElement('option');
          option.value = member.name;
          option.textContent = member.name;
          memberSelect.appendChild(option);
        });
      }
    }
  }

  function getAttendanceType(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const time = hours + minutes / 60;
    if (time >= 5 && time < 9) return 'early'; // 5:00 - 9:00
    if (time >= 9 && time < 9.5) return 'onTime'; // 9:00 - 9:30
    if (time >= 9.5 && time < 11.5) return 'late'; // 9:30 - 11:30
    return 'other';
  }

  function loadAttendanceRecords() {
    const lists = {
      early: earlyList,
      onTime: onTimeList,
      late: lateList
    };
    Object.keys(lists).forEach(type => {
      const table = document.getElementById(`${type}Table`);
      if (!table) {
        console.error(`Table with ID ${type}Table not found in DOM`);
        return;
      }
      const records = attendanceRecords.filter(record => getAttendanceType(new Date(record.time)) === type);
      if (records.length > 0) {
        table.style.display = 'table';
        lists[type].innerHTML = '';
        records.forEach(record => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${groupNames[record.group] || record.group}</td>
            <td>${record.name}</td>
            <td>${record.time}</td>
          `;
          lists[type].appendChild(row);
        });
      } else {
        table.style.display = 'none';
      }
    });
  }

  if (memberSearch && suggestions) {
    memberSearch.addEventListener('input', () => {
      const query = memberSearch.value.toLowerCase();
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      if (query.length < 1) return;
      const allMembers = Object.values(groups).flat();
      const matches = allMembers.filter(member => member.name.toLowerCase().includes(query));
      if (matches.length > 0) {
        suggestions.style.display = 'block';
        matches.forEach(member => {
          const div = document.createElement('div');
          div.textContent = member.name;
          div.className = 'suggestion-item';
          div.addEventListener('click', () => {
            memberSearch.value = member.name;
            suggestions.style.display = 'none';
            const group = Object.keys(groups).find(g => groups[g].some(m => m.name === member.name));
            if (groupSelect) groupSelect.value = group;
            loadMembers(group);
            if (memberSelect) memberSelect.value = member.name;
          });
          suggestions.appendChild(div);
        });
      }
    });
  }

  if (groupSelect) {
    groupSelect.addEventListener('change', () => {
      loadMembers(groupSelect.value);
      if (memberSearch) memberSearch.value = '';
      if (suggestions) suggestions.style.display = 'none';
    });
  }

  if (signinButton) {
    signinButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      const member = memberSelect ? memberSelect.value : '';
      if (!group || !member) {
        alert('请选择小组和成员！');
        return;
      }
      const now = new Date();
      const timeSlot = getAttendanceType(now);
      const today = now.toLocaleDateString('zh-CN');
      const hasSigned = attendanceRecords.some(record => 
        record.name === member && 
        getAttendanceType(new Date(record.time)) === timeSlot && 
        new Date(record.time).toLocaleDateString('zh-CN') === today
      );
      if (hasSigned) {
        alert('该成员在此时间段已签到，不能重复签到！');
        return;
      }
      const record = {
        group,
        name: member,
        time: now.toLocaleString('zh-CN'),
        timeSlot
      };
      const newRecordRef = firebase.database().ref('attendanceRecords').push();
      newRecordRef.set(record);
      attendanceRecords.push(record); // 更新本地缓存
      loadAttendanceRecords();
      alert('签到成功！');
    });
  }

  if (addNewcomerButton) {
    addNewcomerButton.addEventListener('click', () => {
      if (addMemberForm) addMemberForm.style.display = 'block';
    });
  }

  if (saveNewMemberButton && newGroupSelect && newMemberName && newMemberPhone) {
    saveNewMemberButton.addEventListener('click', () => {
      const group = newGroupSelect.value;
      const name = newMemberName.value.trim();
      const phone = newMemberPhone.value.trim();
      if (!group || !name) {
        alert('请选择小组并输入新人姓名！');
        return;
      }
      const newMember = {
        name,
        phone: phone || "",
        gender: "男",
        baptized: "否",
        age: "90后",
        joinDate: new Date().toISOString()
      };
      if (!groups[group]) groups[group] = [];
      groups[group].push(newMember);
      firebase.database().ref(`groups/${group}`).set(groups[group]);
      if (addMemberForm) addMemberForm.style.display = 'none';
      newGroupSelect.value = '';
      newMemberName.value = '';
      newMemberPhone.value = '';
      loadGroupsAndMembers();
      loadMembers(group);
      alert('新人已成功添加！');
    });
  }

  if (cancelNewMemberButton) {
    cancelNewMemberButton.addEventListener('click', () => {
      if (addMemberForm) addMemberForm.style.display = 'none';
      if (newGroupSelect) newGroupSelect.value = '';
      if (newMemberName) newMemberName.value = '';
      if (newMemberPhone) newMemberPhone.value = '';
    });
  }

  if (dailyReportButton) {
    dailyReportButton.addEventListener('click', () => {
      window.location.href = "daily-report.html";
    });
  }

  if (adminButton) {
    adminButton.addEventListener('click', () => {
      window.location.href = "admin.html";
    });
  }

  // 初始加载数据
  loadDataFromFirebase();
});