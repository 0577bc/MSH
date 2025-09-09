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

      // 确保未分组组别和名称映射存在
      let needsSync = false;
      if (!groups['未分组']) {
        groups['未分组'] = [];
        console.log("日报表页面：已添加未分组组别");
        needsSync = true;
      }
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
        console.log("日报表页面：已添加未分组名称映射");
        needsSync = true;
      }
      
      // 如果需要同步，立即同步到Firebase
      if (needsSync) {
        try {
          const db = firebase.database();
          await db.ref('groups').set(groups);
          await db.ref('groupNames').set(groupNames);
          console.log("未分组组别已同步到Firebase");
        } catch (error) {
          console.error("同步未分组组别到Firebase失败:", error);
        }
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
      
      
      // 按组别显示签到情况（按字母顺序排序），"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const groupMembers = groups[group] || [];
        const groupName = groupNames[group] || group;
        
        // 统计该组的签到情况
        const groupRecords = todayRecords.filter(record => record.group === group);
        const signedMembers = groupRecords.map(record => record.name);
        
        // 获取不统计人员列表
        const excludedMembers = window.utils.loadExcludedMembers();
        
        // 过滤掉不统计的人员
        const unsignedMembers = window.utils.filterExcludedMembers(
          groupMembers.filter(member => !signedMembers.includes(member.name)),
          group,
          excludedMembers
        );
        
        
        // 按时间段分类签到记录，并过滤掉不统计的人员
        const earlyRecords = groupRecords.filter(record => {
          const timeSlot = window.utils.getAttendanceType(new Date(record.time));
          const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
          return timeSlot === 'early' && !isExcluded;
        });
        
        const onTimeRecords = groupRecords.filter(record => {
          const timeSlot = window.utils.getAttendanceType(new Date(record.time));
          const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
          return timeSlot === 'onTime' && !isExcluded;
        });
        
        const lateRecords = groupRecords.filter(record => {
          const timeSlot = window.utils.getAttendanceType(new Date(record.time));
          const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
          return timeSlot === 'late' && !isExcluded;
        });
        
        const afternoonRecords = groupRecords.filter(record => {
          const timeSlot = window.utils.getAttendanceType(new Date(record.time));
          const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
          return timeSlot === 'afternoon' && !isExcluded;
        });
        
        const row = document.createElement('tr');
        const unsignedNames = unsignedMembers.map(member => member.name).join(', ');
        
        row.innerHTML = `
          <td>${groupName}</td>
          <td>${earlyRecords.map(record => record.name).join(', ')}</td>
          <td>${onTimeRecords.map(record => record.name).join(', ')}</td>
          <td>${lateRecords.map(record => record.name).join(', ')}</td>
          <td>${afternoonRecords.map(record => record.name).join(', ')}</td>
          <td>${unsignedNames || '无'}</td>
        `;
        unsignedList.appendChild(row);
      });
    }

    if (newcomersList) {
      newcomersList.innerHTML = '';
    let newcomersCount = 0;
    // 按字母顺序排序小组，"未分组"永远排在最后
    const sortedGroups = window.utils.sortGroups(groups, groupNames);
    sortedGroups.forEach(group => {
      groups[group].forEach(member => {
        // 只有通过"新朋友"按钮添加的人员才显示在当日新增人员表中
        if (window.utils.isTodayNewcomer(member)) {
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
    // 统计所有签到记录（包括上午和下午）
    const earlyRecords = todayRecords.filter(record => {
      const timeSlot = window.utils.getAttendanceType(new Date(record.time));
      return timeSlot === 'early';
    });
    
    const onTimeRecords = todayRecords.filter(record => {
      const timeSlot = window.utils.getAttendanceType(new Date(record.time));
      return timeSlot === 'onTime';
    });
    
    const lateRecords = todayRecords.filter(record => {
      const timeSlot = window.utils.getAttendanceType(new Date(record.time));
      return timeSlot === 'late';
    });
    
    const afternoonRecords = todayRecords.filter(record => {
      const timeSlot = window.utils.getAttendanceType(new Date(record.time));
      return timeSlot === 'afternoon';
    });
    
    const earlyCount = earlyRecords.length;
    const onTimeCount = onTimeRecords.length;
    const lateCount = lateRecords.length;
    const afternoonCount = afternoonRecords.length;
    const totalCount = earlyCount + onTimeCount + lateCount + afternoonCount;
    
    // 更新人数
    const earlyCountElement = document.getElementById('earlyCount');
    const onTimeCountElement = document.getElementById('onTimeCount');
    const lateCountElement = document.getElementById('lateCount');
    const afternoonCountElement = document.getElementById('afternoonCount');
    const totalCountElement = document.getElementById('totalCount');
    
    if (earlyCountElement) earlyCountElement.textContent = earlyCount;
    if (onTimeCountElement) onTimeCountElement.textContent = onTimeCount;
    if (lateCountElement) lateCountElement.textContent = lateCount;
    if (afternoonCountElement) afternoonCountElement.textContent = afternoonCount;
    if (totalCountElement) totalCountElement.textContent = totalCount;
    
    // 计算并更新百分比
    const earlyPercentageElement = document.getElementById('earlyPercentage');
    const onTimePercentageElement = document.getElementById('onTimePercentage');
    const latePercentageElement = document.getElementById('latePercentage');
    const afternoonPercentageElement = document.getElementById('afternoonPercentage');
    
    if (totalCount > 0) {
      const earlyPercentage = Math.round((earlyCount / totalCount) * 100);
      const onTimePercentage = Math.round((onTimeCount / totalCount) * 100);
      const latePercentage = Math.round((lateCount / totalCount) * 100);
      const afternoonPercentage = Math.round((afternoonCount / totalCount) * 100);
      
      if (earlyPercentageElement) earlyPercentageElement.textContent = earlyPercentage + '%';
      if (onTimePercentageElement) onTimePercentageElement.textContent = onTimePercentage + '%';
      if (latePercentageElement) latePercentageElement.textContent = latePercentage + '%';
      if (afternoonPercentageElement) afternoonPercentageElement.textContent = afternoonPercentage + '%';
    } else {
      if (earlyPercentageElement) earlyPercentageElement.textContent = '0%';
      if (onTimePercentageElement) onTimePercentageElement.textContent = '0%';
      if (latePercentageElement) latePercentageElement.textContent = '0%';
      if (afternoonPercentageElement) afternoonPercentageElement.textContent = '0%';
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

  // 启动实时数据同步
  if (window.utils && window.utils.dataSyncManager) {
    window.utils.dataSyncManager.startListening((dataType, data) => {
      console.log(`日报表收到${dataType}数据更新:`, data);
      
      switch (dataType) {
        case 'attendanceRecords':
          attendanceRecords = data;
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          generateDailyReport();
          break;
        case 'groups':
          groups = data;
          // 确保未分组组别存在
          if (!groups['未分组']) {
            groups['未分组'] = [];
            console.log("日报表页面同步：已添加未分组组别");
            // 立即同步到Firebase
            const db = firebase.database();
            db.ref('groups').set(groups).catch(error => {
              console.error("同步未分组组别到Firebase失败:", error);
            });
          }
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          generateDailyReport();
          break;
        case 'groupNames':
          Object.assign(groupNames, data);
          // 确保未分组名称映射存在
          if (!groupNames['未分组']) {
            groupNames['未分组'] = '未分组';
            console.log("日报表页面同步：已添加未分组名称映射");
            // 立即同步到Firebase
            const db = firebase.database();
            db.ref('groupNames').set(groupNames).catch(error => {
              console.error("同步未分组名称映射到Firebase失败:", error);
            });
          }
          localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
          generateDailyReport();
          break;
      }
    });

    // 设置页面可见性监听
    window.utils.dataSyncManager.setupVisibilityListener(() => {
      console.log('日报表页面重新可见，检查数据同步...');
      loadDataFromFirebase();
    });
  }
});