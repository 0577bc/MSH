// src/main.js
// 使用全局 firebase 对象（通过 CDN 引入）和 window.firebaseConfig

// 引入Firebase初始化模块
// Initialize Firebase
let app, db;

document.addEventListener('DOMContentLoaded', () => {
  // 初始化Firebase
  try {
    // 检查是否已经有默认应用
    app = firebase.app();
    db = firebase.database();
    console.log('使用已存在的Firebase应用');
  } catch (error) {
    // 如果没有默认应用，则创建新的
    if (window.firebaseConfig) {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      console.log('创建新的Firebase应用');
    } else {
      console.error('Firebase配置未找到');
      alert('Firebase配置错误，请检查config.js文件');
    }
  }
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

  // 初始化示例数据
  async function initializeSampleData() {
    try {
      const groupsRef = firebase.database().ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      
      // 如果没有数据，则初始化示例数据
      if (!groupsSnapshot.exists() || Object.keys(groupsSnapshot.val() || {}).length === 0) {
        console.log("初始化示例数据...");
        await groupsRef.set(window.sampleData.groups);
        await firebase.database().ref('groupNames').set(window.sampleData.groupNames);
        console.log("示例数据初始化完成！");
      }
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      // 首先初始化示例数据（如果需要）
      await initializeSampleData();

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
      console.log("Firebase数据加载成功");
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
      console.log("Firebase连接失败，使用本地存储作为备选方案");
      
      // 备选方案：使用本地存储
      loadFromLocalStorage();
    }
  }

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      // 从本地存储加载数据
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
      } else {
        // 如果没有本地数据，使用示例数据
        groups = window.sampleData.groups;
        localStorage.setItem('msh_groups', JSON.stringify(groups));
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
      } else {
        groupNames = window.sampleData.groupNames;
        localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
      }

      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
      }

      loadGroupsAndMembers();
      loadMembers(groupSelect ? groupSelect.value : '');
      loadAttendanceRecords();
      
      console.log("已切换到本地存储模式");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  // 手动同步数据到Firebase
  async function syncToFirebase() {
    try {
      if (groups && Object.keys(groups).length > 0) {
        await firebase.database().ref('groups').set(groups);
      }
      if (groupNames && Object.keys(groupNames).length > 0) {
        await firebase.database().ref('groupNames').set(groupNames);
      }
      if (attendanceRecords && attendanceRecords.length > 0) {
        await firebase.database().ref('attendanceRecords').set(attendanceRecords);
      }
      console.log("数据已同步到Firebase");
    } catch (error) {
      console.error("同步到Firebase失败:", error);
    }
  }

  function loadGroupsAndMembers() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      // 按字母顺序排序小组，"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = groupNames[group];
        groupSelect.appendChild(option);
      });
    }
    if (newGroupSelect) {
      newGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      // 按字母顺序排序小组，"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = groupNames[group];
        newGroupSelect.appendChild(option);
      });
    }
  }

  function loadMembers(group) {
    if (memberSelect) {
      memberSelect.innerHTML = '<option value="">--请选择成员--</option>';
      if (groups[group]) {
        // 按姓名字母顺序排序
        const sortedMembers = window.utils.sortMembersByName(groups[group]);
        sortedMembers.forEach(member => {
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
    const timeInMinutes = hours * 60 + minutes;
    
    // 早到：9:20之前 (0:00 - 9:20)
    if (timeInMinutes < 9 * 60 + 20) return 'early';
    
    // 准时：9:30之前 (9:20 - 9:30)
    if (timeInMinutes < 9 * 60 + 30) return 'onTime';
    
    // 迟到：10:40之前 (9:30 - 10:40)
    if (timeInMinutes < 10 * 60 + 40) return 'late';
    
    // 下午签到：11:30之后 (11:30 - 24:00)
    if (timeInMinutes >= 11 * 60 + 30) return 'afternoon';
    
    // 10:40-11:30之间不允许签到
    return 'invalid';
  }

  function loadAttendanceRecords() {
    const today = window.utils.getTodayString();
    // 只显示上午的签到记录（早到、准时、迟到），不显示下午签到
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === today &&
      ['early', 'onTime', 'late'].includes(getAttendanceType(new Date(record.time)))
    );
    
    // 获取表格容器
    const tablesContainer = document.querySelector('.tables-container');
    
    // 如果没有今天的签到记录，隐藏整个表格容器
    if (todayRecords.length === 0) {
      if (tablesContainer) {
        tablesContainer.style.display = 'none';
      }
      return;
    }
    
    // 显示表格容器，使用flex布局
    if (tablesContainer) {
      tablesContainer.style.display = 'flex';
    }
    
    // 按时间段分类记录并按时间排序
    const earlyRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'early')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    const onTimeRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'onTime')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    const lateRecords = todayRecords.filter(record => getAttendanceType(new Date(record.time)) === 'late')
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // 显示早到签到名单 (9:20之前)
    const earlyTable = document.getElementById('earlyTable');
    if (earlyTable) {
      earlyTable.style.display = 'table'; // 始终显示表格
      earlyList.innerHTML = '';
      if (earlyRecords.length > 0) {
        earlyRecords.forEach(record => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${groupNames[record.group] || record.group}</td>
            <td>${record.name}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          earlyList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">😴</span>
              <span class="empty-text">暂无早到记录</span>
            </div>
          </td>
        `;
        earlyList.appendChild(emptyRow);
      }
    }
    
    // 显示准时签到名单 (9:30之前)
    const onTimeTable = document.getElementById('onTimeTable');
    if (onTimeTable) {
      onTimeTable.style.display = 'table'; // 始终显示表格
      onTimeList.innerHTML = '';
      if (onTimeRecords.length > 0) {
        onTimeRecords.forEach(record => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${groupNames[record.group] || record.group}</td>
            <td>${record.name}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          onTimeList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">⏰</span>
              <span class="empty-text">暂无准时记录</span>
            </div>
          </td>
        `;
        onTimeList.appendChild(emptyRow);
      }
    }
    
    // 显示迟到签到名单 (10:40之前)
    const lateTable = document.getElementById('lateTable');
    if (lateTable) {
      lateTable.style.display = 'table'; // 始终显示表格
      lateList.innerHTML = '';
      if (lateRecords.length > 0) {
        lateRecords.forEach(record => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${groupNames[record.group] || record.group}</td>
            <td>${record.name}</td>
            <td>${new Date(record.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</td>
          `;
          lateList.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" class="empty-state">
            <div class="empty-message">
              <span class="empty-icon">⏳</span>
              <span class="empty-text">暂无迟到记录</span>
            </div>
          </td>
        `;
        lateList.appendChild(emptyRow);
      }
    }
    
    // 加载当日新增人员
    loadTodayNewcomers();
    
    // 更新签到人数统计
    updateSigninCount();
  }

  // 加载当日新增人员
  function loadTodayNewcomers() {
    const newcomerList = document.getElementById('newcomerList');
    const newcomerSection = document.querySelector('.newcomer-section');
    if (!newcomerList || !newcomerSection) return;
    
    const today = window.utils.getTodayString();
    const todayNewcomers = [];
    
    // 查找当日新增的成员（只有通过"新朋友"按钮添加的人员）
    Object.keys(groups).forEach(group => {
      if (groups[group]) {
        groups[group].forEach(member => {
          if (member.joinDate) {
            // 只有通过"新朋友"按钮添加的人员才显示在当日新增人员表中
            if (window.utils.isTodayNewcomer(member)) {
              todayNewcomers.push({
                ...member,
                group: group
              });
            }
          }
        });
      }
    });
    
    // 如果没有新增人员，隐藏整个表格
    if (todayNewcomers.length === 0) {
      newcomerSection.style.display = 'none';
      return;
    }
    
    // 显示表格并填充数据
    newcomerSection.style.display = 'block';
    newcomerList.innerHTML = '';
    todayNewcomers.forEach(member => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[member.group] || member.group}</td>
        <td>${member.name}</td>
      `;
      newcomerList.appendChild(row);
    });
  }

  // 更新签到人数统计
  function updateSigninCount() {
    const signinCountElement = document.getElementById('signinCount');
    if (!signinCountElement) return;
    
    const today = window.utils.getTodayString();
    // 只统计10:40之前的签到记录
    const morningRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.time).toLocaleDateString('zh-CN');
      if (recordDate !== today) return false;
      
      const time = new Date(record.time);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes < 10 * 60 + 40; // 10:40之前
    });
    
    signinCountElement.textContent = morningRecords.length;
  }

  if (memberSearch && suggestions) {
    memberSearch.addEventListener('input', () => {
      const query = memberSearch.value.toLowerCase();
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      if (query.length < 1) return;
      
      // 获取所有成员信息，包括组别
      const allMembers = [];
      Object.keys(groups).forEach(group => {
        groups[group].forEach(member => {
          allMembers.push({
            ...member,
            group: group
          });
        });
      });
      
      const matches = allMembers.filter(member => 
        member.name.toLowerCase().includes(query)
      );
      
      if (matches.length > 0) {
        suggestions.style.display = 'block';
        matches.forEach(member => {
          const div = document.createElement('div');
          div.innerHTML = `
            <span class="member-name">${member.name}</span>
            <span class="member-group">(${groupNames[member.group] || member.group})</span>
          `;
          div.className = 'suggestion-item';
          div.addEventListener('click', () => {
            memberSearch.value = member.name;
            suggestions.style.display = 'none';
            
            // 自动填入小组和成员选择框
            if (groupSelect) {
              groupSelect.value = member.group;
              loadMembers(member.group);
            }
            if (memberSelect) {
              memberSelect.value = member.name;
            }
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
    signinButton.addEventListener('click', async () => {
      const group = groupSelect ? groupSelect.value : '';
      const member = memberSelect ? memberSelect.value : '';
      if (!group || !member) {
        alert('请选择小组和成员！');
        return;
      }
      const now = new Date();
      const timeSlot = getAttendanceType(now);
      const today = now.toLocaleDateString('zh-CN');
      
      // 检查是否在允许签到的时间段内
      if (timeSlot === 'invalid') {
        alert('当前时间不允许签到！签到时间：上午9:20-10:40，下午11:30之后。');
        return;
      }
      
      // 检查该成员在今天同一时间段是否已经签到
      const hasSignedInSameSlot = attendanceRecords.some(record => 
        record.name === member && 
        new Date(record.time).toLocaleDateString('zh-CN') === today &&
        getAttendanceType(new Date(record.time)) === timeSlot
      );
      
      if (hasSignedInSameSlot) {
        const timeSlotNames = {
          'early': '早到时段',
          'onTime': '准时时段', 
          'late': '迟到时段',
          'afternoon': '下午时段'
        };
        alert(`该成员在${timeSlotNames[timeSlot]}已签到，不能重复签到！`);
        return;
      }
      
      const record = {
        group,
        name: member,
        time: now.toLocaleString('zh-CN'),
        timeSlot
      };
      // 先保存到本地
      attendanceRecords.push(record);
      localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
      
      // 立即更新显示
      loadAttendanceRecords();
      
      // 清空选择
      if (groupSelect) groupSelect.value = '';
      if (memberSelect) memberSelect.value = '';
      if (memberSearch) memberSearch.value = '';
      if (suggestions) suggestions.style.display = 'none';
      
      // 然后尝试同步到Firebase
      try {
        await syncToFirebase();
        alert('签到成功！');
      } catch (error) {
        console.log("Firebase同步失败，但本地保存成功");
        alert('签到成功！（本地保存）');
      }
    });
  }

  if (addNewcomerButton) {
    addNewcomerButton.addEventListener('click', () => {
      if (addMemberForm) {
        if (addMemberForm.classList.contains('hidden-form')) {
          addMemberForm.classList.remove('hidden-form');
        } else {
          addMemberForm.classList.add('hidden-form');
        }
      }
    });
  }

  if (saveNewMemberButton && newGroupSelect && newMemberName && newMemberPhone) {
    saveNewMemberButton.addEventListener('click', () => {
      const group = newGroupSelect.value;
      const name = newMemberName.value.trim();
      const phone = newMemberPhone.value.trim();
      const gender = document.getElementById('newMemberGender') ? document.getElementById('newMemberGender').value : '';
      const baptized = document.getElementById('newMemberBaptized') ? document.getElementById('newMemberBaptized').value : '';
      const age = document.getElementById('newMemberAge') ? document.getElementById('newMemberAge').value : '';
      
      if (!group || !name) {
        alert('请选择小组并输入新朋友姓名！');
        return;
      }
      
      if (!gender || !baptized || !age) {
        alert('请填写完整的个人信息！');
        return;
      }
      
      const newMember = {
        name,
        phone: phone || "",
        gender,
        baptized,
        age,
        joinDate: new Date().toISOString(),
        addedViaNewcomerButton: true // 标识通过"新朋友"按钮添加
      };
      if (!groups[group]) groups[group] = [];
      groups[group].push(newMember);
      firebase.database().ref(`groups/${group}`).set(groups[group]);
      newGroupSelect.value = '';
      newMemberName.value = '';
      newMemberPhone.value = '';
      if (document.getElementById('newMemberGender')) document.getElementById('newMemberGender').value = '';
      if (document.getElementById('newMemberBaptized')) document.getElementById('newMemberBaptized').value = '';
      if (document.getElementById('newMemberAge')) document.getElementById('newMemberAge').value = '';
      if (addMemberForm) addMemberForm.classList.add('hidden-form');
      loadGroupsAndMembers();
      loadMembers(group);
      alert('新朋友已成功添加！');
    });
  }

  if (cancelNewMemberButton) {
    cancelNewMemberButton.addEventListener('click', () => {
      if (addMemberForm) addMemberForm.classList.add('hidden-form');
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

  // 初始加载数据 - 优先使用Firebase
  console.log("正在连接Firebase数据库...");
  loadDataFromFirebase();
});