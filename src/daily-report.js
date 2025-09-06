// src/daily-report.js
// 使用全局 firebase 对象和 window.firebaseConfig

// Initialize Firebase
let app, db;
try {
  app = firebase.app();
  db = firebase.database();
} catch (error) {
  if (window.firebaseConfig) {
    app = firebase.initializeApp(window.firebaseConfig);
    db = firebase.database();
  } else {
    console.error('Firebase配置未找到');
  }
}

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

      // 确保DOM元素已加载后再生成报表
      if (signedList) {
        generateDailyReport();
      } else {
        console.log('DOM elements not ready, will retry...');
        setTimeout(() => {
          if (signedList) {
            generateDailyReport();
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error loading data from Firebase:", error);
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
        Object.assign(groupNames, JSON.parse(localGroupNames));
      } else {
        Object.assign(groupNames, window.sampleData.groupNames);
      }

      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
      }

      // 确保DOM元素已加载后再生成报表
      if (signedList) {
        generateDailyReport();
      } else {
        console.log('DOM elements not ready, will retry...');
        setTimeout(() => {
          if (signedList) {
            generateDailyReport();
          }
        }, 100);
      }
      console.log("Daily report data loaded from local storage");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  function generateDailyReport() {
    if (!signedList) {
      console.error('signedList element not found');
      return;
    }
    
    const today = new Date().toLocaleDateString('zh-CN');
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === today
    );
    
    console.log('=== 日报表生成调试信息 ===');
    console.log('今日日期:', today);
    console.log('今日签到记录:', todayRecords);
    console.log('所有组别:', Object.keys(groups));
    console.log('组别数据:', groups);

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
    if (totalSigned) totalSigned.textContent = todayRecords.length;

    if (unsignedList) {
      unsignedList.innerHTML = '';
      
      console.log('开始处理各组签到情况...');
      console.log('groups对象:', groups);
      console.log('Object.keys(groups):', Object.keys(groups));
      
      // 按组别显示签到情况
      Object.keys(groups).forEach(group => {
        const groupMembers = groups[group] || [];
        const groupName = groupNames[group] || group;
        
        // 统计该组的签到情况
        const groupRecords = todayRecords.filter(record => record.group === group);
        const signedMembers = groupRecords.map(record => record.name);
        const unsignedMembers = groupMembers.filter(member => !signedMembers.includes(member.name));
        
        // 调试信息
        console.log(`组别: ${groupName}`);
        console.log(`组内成员:`, groupMembers.map(m => m.name));
        console.log(`已签到成员:`, signedMembers);
        console.log(`未签到成员:`, unsignedMembers.map(m => m.name));
        console.log(`未签到成员数量:`, unsignedMembers.length);
        console.log(`未签到成员姓名字符串:`, unsignedMembers.map(member => member.name).join(', '));
        
        // 按时间段分类签到记录
        const earlyRecords = groupRecords.filter(record => {
          const time = new Date(record.time);
          const hours = time.getHours();
          const minutes = time.getMinutes();
          const timeInMinutes = hours * 60 + minutes;
          return timeInMinutes < 9 * 60 + 20; // 9:20之前
        });
        
        const onTimeRecords = groupRecords.filter(record => {
          const time = new Date(record.time);
          const hours = time.getHours();
          const minutes = time.getMinutes();
          const timeInMinutes = hours * 60 + minutes;
          return timeInMinutes >= 9 * 60 + 20 && timeInMinutes < 9 * 60 + 30; // 9:20-9:30
        });
        
        const lateRecords = groupRecords.filter(record => {
          const time = new Date(record.time);
          const hours = time.getHours();
          const minutes = time.getMinutes();
          const timeInMinutes = hours * 60 + minutes;
          return timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 10 * 60 + 40; // 9:30-10:40
        });
        
        const row = document.createElement('tr');
        const unsignedNames = unsignedMembers.map(member => member.name).join(', ');
        console.log(`生成HTML - 未签到人员: "${unsignedNames}"`);
        
        row.innerHTML = `
          <td>${groupName}</td>
          <td>${earlyRecords.map(record => record.name).join(', ')}</td>
          <td>${onTimeRecords.map(record => record.name).join(', ')}</td>
          <td>${lateRecords.map(record => record.name).join(', ')}</td>
          <td>${unsignedNames || '无'}</td>
        `;
        unsignedList.appendChild(row);
      });
    }

    if (newcomersList) {
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
    if (totalNewcomers) totalNewcomers.textContent = newcomersCount;
    }
    
    // 更新统计数据
    updateStatistics(todayRecords);
  }
  
  // 更新统计数据的函数
  function updateStatistics(todayRecords) {
    // 只统计上午的签到记录（早到、准时、迟到），不显示下午签到
    const morningRecords = todayRecords.filter(record => {
      const time = new Date(record.time);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes < 10 * 60 + 40; // 10:40之前
    });
    
    const earlyRecords = morningRecords.filter(record => {
      const time = new Date(record.time);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes < 9 * 60 + 20; // 9:20之前
    });
    
    const onTimeRecords = morningRecords.filter(record => {
      const time = new Date(record.time);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes >= 9 * 60 + 20 && timeInMinutes < 9 * 60 + 30; // 9:20-9:30
    });
    
    const lateRecords = morningRecords.filter(record => {
      const time = new Date(record.time);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 10 * 60 + 40; // 9:30-10:40
    });
    
    const earlyCount = earlyRecords.length;
    const onTimeCount = onTimeRecords.length;
    const lateCount = lateRecords.length;
    const totalCount = earlyCount + onTimeCount + lateCount;
    
    // 更新人数
    const earlyCountElement = document.getElementById('earlyCount');
    const onTimeCountElement = document.getElementById('onTimeCount');
    const lateCountElement = document.getElementById('lateCount');
    const totalCountElement = document.getElementById('totalCount');
    
    if (earlyCountElement) earlyCountElement.textContent = earlyCount;
    if (onTimeCountElement) onTimeCountElement.textContent = onTimeCount;
    if (lateCountElement) lateCountElement.textContent = lateCount;
    if (totalCountElement) totalCountElement.textContent = totalCount;
    
    // 计算并更新百分比
    const earlyPercentageElement = document.getElementById('earlyPercentage');
    const onTimePercentageElement = document.getElementById('onTimePercentage');
    const latePercentageElement = document.getElementById('latePercentage');
    
    if (totalCount > 0) {
      const earlyPercentage = Math.round((earlyCount / totalCount) * 100);
      const onTimePercentage = Math.round((onTimeCount / totalCount) * 100);
      const latePercentage = Math.round((lateCount / totalCount) * 100);
      
      if (earlyPercentageElement) earlyPercentageElement.textContent = earlyPercentage + '%';
      if (onTimePercentageElement) onTimePercentageElement.textContent = onTimePercentage + '%';
      if (latePercentageElement) latePercentageElement.textContent = latePercentage + '%';
    } else {
      if (earlyPercentageElement) earlyPercentageElement.textContent = '0%';
      if (onTimePercentageElement) onTimePercentageElement.textContent = '0%';
      if (latePercentageElement) latePercentageElement.textContent = '0%';
    }
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = "index.html";
    });
  }

  // 导出功能
  const exportTableButton = document.getElementById('exportTableButton');
  
  if (exportTableButton) {
    exportTableButton.addEventListener('click', () => {
      exportTable();
    });
  }

  // 导出表格函数
  async function exportTable() {
    try {
      // 获取要导出的表格
      const table = document.getElementById('unsignedTable');
      if (!table) {
        alert('未找到要导出的表格！');
        return;
      }

      // 显示加载提示
      const originalText = exportTableButton.textContent;
      exportTableButton.textContent = '导出中...';
      exportTableButton.disabled = true;

      await exportToImage(table);

      // 恢复按钮状态
      exportTableButton.textContent = originalText;
      exportTableButton.disabled = false;

    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + error.message);
      
      // 恢复按钮状态
      exportTableButton.textContent = '导出表格';
      exportTableButton.disabled = false;
    }
  }

  // 导出为图片
  async function exportToImage(table) {
    return new Promise((resolve, reject) => {
      html2canvas(table, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `MSH日报表-各组签到情况-${new Date().toLocaleDateString('zh-CN')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        resolve();
      }).catch(reject);
    });
  }

  // 初始加载数据 - 优先使用Firebase
  console.log("日报表正在连接Firebase数据库...");
  loadDataFromFirebase();
});