document.addEventListener('DOMContentLoaded', () => {
    const signedList = document.getElementById('signedList');
    const unsignedList = document.getElementById('unsignedList');
    const newcomersList = document.getElementById('newcomersList');
    const totalSigned = document.getElementById('totalSigned');
    const totalNewcomers = document.getElementById('totalNewcomers');
    const backButton = document.getElementById('backButton');
  
    let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    let groups = JSON.parse(localStorage.getItem('groups')) || {};
    const groupNames = JSON.parse(localStorage.getItem('groupNames')) || {
      group1: "小组1",
      group2: "小组2",
      group3: "小组3",
      group4: "小组4",
      group5: "小组5",
      group6: "小组6",
      group7: "小组7"
    };
  
    function generateDailyReport() {
      const today = new Date().toLocaleDateString('zh-CN');
      const todayRecords = attendanceRecords.filter(record => 
        new Date(record.time).toLocaleDateString('zh-CN') === today
      );
  
      // 签到人员
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
  
      // 未签到人员
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
  
      // 新增人员
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
  
    backButton.addEventListener('click', () => {
      window.location.href = "index.html";
    });
  
    generateDailyReport();
  });