// src/main.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, setDoc, doc, getDoc, query, where } from 'firebase/firestore';

console.log('Imported db:', db);

// 数据变量
let groupNames = {};
let groups = {};
let attendanceRecords = [];
let adminPassword = '1234';

// 加载管理员密码
async function loadAdminPassword() {
  try {
    const docRef = doc(db, 'settings', 'adminPassword');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      adminPassword = docSnap.data().password || '1234';
    } else {
      await setDoc(docRef, { password: '1234' });
    }
  } catch (error) {
    console.error('加载管理员密码失败:', error);
  }
}

// 加载小组名称
async function loadGroupNames() {
  try {
    const docRef = doc(db, 'settings', 'groupNames');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      groupNames = docSnap.data() || {};
      updateGroupSelect();
    } else {
      await setDoc(docRef, { group1: '小组1', group2: '小组2', group3: '小组3', group4: '小组4' });
      groupNames = { group1: '小组1', group2: '小组2', group3: '小组3', group4: '小组4' };
      updateGroupSelect();
    }
  } catch (error) {
    console.error('加载小组名称失败:', error);
    alert('加载小组名称失败，请检查网络或 Firebase 配置');
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
    alert('加载小组成员失败，请检查网络或 Firebase 配置');
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

// 更新小组选择下拉框
function updateGroupSelect() {
  const groupSelect = document.getElementById('groupSelect');
  const newGroupSelect = document.getElementById('newGroupSelect');
  groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
  newGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
  const sortedGroups = Object.keys(groupNames).sort((a, b) => groupNames[a].localeCompare(groupNames[b], 'zh'));
  sortedGroups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = groupNames[group];
    groupSelect.appendChild(option);
    newGroupSelect.appendChild(option.cloneNode(true));
  });
}

// 更新成员选择下拉框
function updateMemberSelect(group) {
  const memberSelect = document.getElementById('memberSelect');
  memberSelect.innerHTML = '<option value="">--请选择成员--</option>';
  if (group && groups[group]) {
    groups[group].forEach(member => {
      const option = document.createElement('option');
      option.value = member.name;
      option.textContent = member.name;
      memberSelect.appendChild(option);
    });
  }
}

// 更新签到表格显示
function updateTableVisibility() {
  const morningList = document.getElementById('morningList');
  const midMorningList = document.getElementById('midMorningList');
  const lateMorningList = document.getElementById('lateMorningList');
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(record => record.date === today);

  morningList.innerHTML = '';
  midMorningList.innerHTML = '';
  lateMorningList.innerHTML = '';

  todayRecords.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${groupNames[record.group] || record.group}</td>
      <td>${record.member}</td>
      <td>${record.time}</td>
    `;
    const timeParts = record.time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    if (hours < 9 || (hours === 9 && minutes === 0)) {
      morningList.appendChild(row);
    } else if (hours === 9 && minutes <= 30) {
      midMorningList.appendChild(row);
    } else {
      lateMorningList.appendChild(row);
    }
  });

  morningList.parentElement.classList.toggle('hidden', morningList.children.length === 0);
  midMorningList.parentElement.classList.toggle('hidden', midMorningList.children.length === 0);
  lateMorningList.parentElement.classList.toggle('hidden', lateMorningList.children.length === 0);
}

// 搜索建议
function updateSuggestions() {
  const memberSearch = document.getElementById('memberSearch');
  const suggestions = document.getElementById('suggestions');
  const query = memberSearch.value.trim().toLowerCase();
  suggestions.innerHTML = '';
  if (query) {
    const allMembers = [];
    for (let group in groups) {
      groups[group].forEach(member => {
        if (member.name.toLowerCase().includes(query)) {
          allMembers.push({ group, name: member.name });
        }
      });
    }
    allMembers.forEach(member => {
      const suggestion = document.createElement('div');
      suggestion.textContent = `${member.name} (${groupNames[member.group] || member.group})`;
      suggestion.classList.add('suggestion');
      suggestion.addEventListener('click', () => {
        document.getElementById('groupSelect').value = member.group;
        updateMemberSelect(member.group);
        document.getElementById('memberSelect').value = member.name;
        memberSearch.value = '';
        suggestions.innerHTML = '';
      });
      suggestions.appendChild(suggestion);
    });
  }
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', () => {
  const groupSelect = document.getElementById('groupSelect');
  const memberSelect = document.getElementById('memberSelect');
  const signinButton = document.getElementById('signinButton');
  const adminButton = document.getElementById('adminButton');
  const addNewcomerButton = document.getElementById('addNewcomerButton');
  const addMemberForm = document.getElementById('addMemberForm');
  const newGroupSelect = document.getElementById('newGroupSelect');
  const newMemberName = document.getElementById('newMemberName');
  const newMemberPhone = document.getElementById('newMemberPhone');
  const saveNewMemberButton = document.getElementById('saveNewMemberButton');
  const cancelNewMemberButton = document.getElementById('cancelNewMemberButton');
  const dailyReportButton = document.getElementById('dailyReportButton');
  const memberSearch = document.getElementById('memberSearch');

  groupSelect.addEventListener('change', () => updateMemberSelect(groupSelect.value));
  memberSearch.addEventListener('input', updateSuggestions);

  signinButton.addEventListener('click', async () => {
    const group = groupSelect.value;
    const member = memberSelect.value;
    if (group && member) {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const hours = now.getHours();
      const minutes = now.getMinutes();
      let segment = '';
      if (hours < 11 || (hours === 11 && minutes === 0)) {
        segment = 'morning';
      } else if ((hours === 11 && minutes >= 30) || hours < 18) {
        segment = 'afternoon';
      } else {
        segment = 'evening';
      }

      try {
        const q = query(collection(db, 'attendance'), where('date', '==', date), where('member', '==', member), where('segment', '==', segment));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.size > 0) {
          alert('您已在该时间段签到过！');
          return;
        }
        const time = now.toTimeString().split(' ')[0].slice(0, 5);
        await addDoc(collection(db, 'attendance'), {
          group,
          member,
          date,
          time,
          segment
        });
        await loadAttendanceRecords();
        updateTableVisibility();
        alert('签到成功！');
      } catch (error) {
        console.error('签到失败:', error);
        alert('签到失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('请选择小组和成员！');
    }
  });

  addNewcomerButton.addEventListener('click', () => {
    addMemberForm.style.display = 'block';
  });

  saveNewMemberButton.addEventListener('click', async () => {
    const group = newGroupSelect.value;
    const name = newMemberName.value.trim();
    const phone = newMemberPhone.value.trim();
    const age = document.getElementById('newMemberAge').value || '90后';
    if (group && name && phone) {
      const now = new Date();
      const addedDate = now.toISOString().split('T')[0];
      try {
        const docRef = await addDoc(collection(db, 'members'), {
          group,
          name,
          phone,
          gender: '男',
          baptized: '否',
          age,
          addedDate
        });
        if (!groups[group]) groups[group] = [];
        groups[group].push({ name, phone, gender: '男', baptized: '否', age, addedDate, id: docRef.id });
        updateMemberSelect(group);
        addMemberForm.style.display = 'none';
        newMemberName.value = '';
        newMemberPhone.value = '';
        alert('新人已新增！');
      } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('请选择小组并输入新人姓名和联系号码！');
    }
  });

  cancelNewMemberButton.addEventListener('click', () => {
    addMemberForm.style.display = 'none';
    newMemberName.value = '';
    newMemberPhone.value = '';
  });

  adminButton.addEventListener('click', async () => {
    await loadAdminPassword();
    const password = prompt('请输入管理员密码：');
    if (password === adminPassword) {
      window.location.href = 'admin.html';
    } else {
      alert('密码错误！');
    }
  });

  dailyReportButton.addEventListener('click', () => {
    window.location.href = 'daily-report.html';
  });

  // 初始加载
  Promise.all([loadAdminPassword(), loadGroupNames(), loadGroups(), loadAttendanceRecords()]).then(() => {
    updateGroupSelect();
    updateTableVisibility();
  });
});