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
  
    let groups = JSON.parse(localStorage.getItem('groups')) || {
      group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后" }],
      group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后" }]
    };
    const groupNames = JSON.parse(localStorage.getItem('groupNames')) || {
      group1: "小组1",
      group2: "小组2",
      group3: "小组3",
      group4: "小组4",
      group5: "小组5",
      group6: "小组6",
      group7: "小组7"
    };
    let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
  
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
        console.log(`Checking for table with ID ${type}Table:`, table); // 添加调试日志
        if (!table) {
          console.error(`Table with ID ${type}Table not found in DOM`);
          return; // 跳过当前循环，避免错误
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
        attendanceRecords.push(record);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        const list = document.getElementById(`${timeSlot}List`);
        const table = document.getElementById(`${timeSlot}Table`);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${groupNames[group] || group}</td>
          <td>${member}</td>
          <td>${record.time}</td>
        `;
        if (list) list.appendChild(row);
        if (table) table.style.display = 'table';
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
        localStorage.setItem('groups', JSON.stringify(groups));
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
  
    loadGroupsAndMembers();
    loadMembers(groupSelect ? groupSelect.value : '');
    loadAttendanceRecords();
  });