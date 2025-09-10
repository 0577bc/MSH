/**
 * 日报表页面主文件 (daily-report.js)
 * 功能：生成每日签到报表、统计数据
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 全局变量和初始化 ====================
let app, db;
let attendanceRecords = [];
let groups = {};
let groupNames = {};

// DOM元素引用
let signedList, unsignedList, newcomersList;
let totalSigned, totalNewcomers, backButton;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  try {
    app = firebase.app();
    db = firebase.database();
    return true;
  } catch (error) {
    if (window.firebaseConfig) {
      app = firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();
      return true;
    } else {
      console.error('❌ Firebase配置未找到');
      return false;
    }
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  signedList = document.getElementById('signedList');
  unsignedList = document.getElementById('unsignedList');
  newcomersList = document.getElementById('newcomersList');
  totalSigned = document.getElementById('totalSigned');
  totalNewcomers = document.getElementById('totalNewcomers');
  backButton = document.getElementById('backButton');
}

document.addEventListener('DOMContentLoaded', async () => {
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化Firebase并等待完成
  const firebaseInitialized = await initializeFirebase();
  
  if (firebaseInitialized) {
    // 加载数据
    await loadData();
    
    // 初始化数据同步监听器
    if (window.utils && window.utils.dataSyncManager) {
      try {
        window.utils.dataSyncManager.startListening();
      } catch (error) {
        console.error('启动数据同步监听失败:', error);
      }
    }
  }
  
  // 初始化事件监听器
  initializeEventListeners();
  
});

// ==================== 数据加载和管理 ====================
async function loadData() {
  try {
    // 加载数据从Firebase
    await loadDataFromFirebase();
    
    // 生成日报表
    generateDailyReport();
    
    console.log("✅ 日报表页面数据加载成功");
  } catch (error) {
    console.error("❌ 日报表页面数据加载失败:", error);
  }
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', () => window.location.href = 'index.html');
  }

  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据加载函数 ====================
async function loadDataFromFirebase() {
    try {
      if (!db) {
        throw new Error('Firebase数据库未初始化');
      }
      const attendanceRef = db.ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      const groupsRef = db.ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
      }

      const groupNamesRef = db.ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        Object.assign(groupNames, groupNamesSnapshot.val() || {});
      }

      // 确保未分组组别和名称映射存在
      let needsSync = false;
      if (!groups.hasOwnProperty('未分组')) {
        groups['未分组'] = [];
        console.log("日报表页面：已添加未分组组别");
        needsSync = true;
      } else {
        console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
      }
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
        console.log("日报表页面：已添加未分组名称映射");
        needsSync = true;
      }
      
      // 如果需要同步，立即同步到Firebase
      if (needsSync) {
        try {
          if (!db) {
            throw new Error('Firebase数据库未初始化');
          }
          await db.ref('groups').update({ '未分组': [] });
          await db.ref('groupNames').update({ '未分组': '未分组' });
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
      // 使用快照数据，确保显示的是签到时的真实信息
      const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
      const displayName = record.memberSnapshot?.name || record.name;
      const displayNickname = record.memberSnapshot?.nickname || '';
      const fullName = displayNickname ? `${displayName} (${displayNickname})` : displayName;
      
      row.innerHTML = `
        <td>${displayGroup}</td>
        <td>${fullName}</td>
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
        
        // 获取不统计人员列表
        const excludedMembers = window.utils.loadExcludedMembers();
        
        
        // 按时间段分类签到记录，并过滤掉不统计的人员
        // 只统计上午签到情况（早到、准时、迟到）
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
        
        
        // 统计上午签到的人员（用于计算未签到人员）
        const morningSignedMembers = [
          ...earlyRecords.map(record => record.name),
          ...onTimeRecords.map(record => record.name),
          ...lateRecords.map(record => record.name)
        ];
        
        // 计算上午未签到的人员（只统计上午未签到，下午签到不算）
        const unsignedMembers = window.utils.filterExcludedMembers(
          groupMembers.filter(member => !morningSignedMembers.includes(member.name)),
          group,
          excludedMembers
        );
        
        const row = document.createElement('tr');
        const unsignedNames = unsignedMembers.map(member => member.name).join(', ');
        
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
    // 统计上午签到记录
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
    
    const earlyCount = earlyRecords.length;
    const onTimeCount = onTimeRecords.length;
    const lateCount = lateRecords.length;
    // 总签到人数只包括上午签到
    const totalCount = earlyCount + onTimeCount + lateCount;
    
    // 计算应到人数（所有组员总数，排除不统计人员）
    const excludedMembers = window.utils.loadExcludedMembers();
    let expectedCount = 0;
    Object.keys(groups).forEach(group => {
      const groupMembers = groups[group] || [];
      const validMembers = window.utils.filterExcludedMembers(groupMembers, group, excludedMembers);
      expectedCount += validMembers.length;
    });
    
    // 更新人数
    const earlyCountElement = document.getElementById('earlyCount');
    const onTimeCountElement = document.getElementById('onTimeCount');
    const lateCountElement = document.getElementById('lateCount');
    const expectedCountElement = document.getElementById('expectedCount');
    const totalCountElement = document.getElementById('totalCount');
    
    if (earlyCountElement) earlyCountElement.textContent = earlyCount;
    if (onTimeCountElement) onTimeCountElement.textContent = onTimeCount;
    if (lateCountElement) lateCountElement.textContent = lateCount;
    if (expectedCountElement) expectedCountElement.textContent = expectedCount;
    if (totalCountElement) totalCountElement.textContent = totalCount;
    
    // 计算并更新百分比
    const earlyPercentageElement = document.getElementById('earlyPercentage');
    const onTimePercentageElement = document.getElementById('onTimePercentage');
    const latePercentageElement = document.getElementById('latePercentage');
    const attendancePercentageElement = document.getElementById('attendancePercentage');
    
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
    
    // 计算签到人数占比（签到人数/应到人数）
    if (expectedCount > 0) {
      const attendancePercentage = Math.round((totalCount / expectedCount) * 100);
      if (attendancePercentageElement) attendancePercentageElement.textContent = attendancePercentage + '%';
    } else {
      if (attendancePercentageElement) attendancePercentageElement.textContent = '0%';
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
          console.log('日报表页面 - 接收到的groups数据:', data);
          
          // 优先使用本地数据，避免数据丢失（包括花名等字段）
          const localGroups = localStorage.getItem('msh_groups');
          if (localGroups) {
            try {
              const localGroupsData = JSON.parse(localGroups);
              console.log('日报表页面 - 使用本地groups数据，确保数据不丢失（包括花名）');
              groups = localGroupsData;
              
              // 如果本地数据与远程数据不同，同步本地数据到Firebase
              if (JSON.stringify(groups) !== JSON.stringify(data)) {
                console.log('日报表页面 - 本地数据与远程数据不同，同步本地数据到Firebase');
                if (db) {
                  db.ref('groups').set(groups).catch(error => {
                    console.error('日报表页面 - 同步本地groups数据失败:', error);
                  });
                }
              }
            } catch (error) {
              console.error('日报表页面 - 解析本地groups数据失败:', error);
              groups = data; // 如果本地数据解析失败，使用远程数据
            }
          } else {
            console.log('日报表页面 - 没有本地数据，使用远程groups数据');
            groups = data;
          }
          
          // 确保未分组组别存在
          if (!groups.hasOwnProperty('未分组')) {
            groups['未分组'] = [];
            console.log("日报表页面同步：已添加未分组组别");
            // 立即同步到Firebase
            if (db) {
              db.ref('groups').update({ '未分组': [] }).catch(error => {
                console.error("同步未分组组别到Firebase失败:", error);
              });
            }
          } else {
            console.log(`未分组已存在，成员数量: ${groups['未分组'].length}`);
          }
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          generateDailyReport();
          break;
        case 'groupNames':
          Object.assign(groupNames, data);
          console.log('日报表页面 - 接收到的groupNames数据:', groupNames);
          
          // 确保未分组名称映射存在
          if (!groupNames['未分组']) {
            groupNames['未分组'] = '未分组';
            console.log("日报表页面同步：已添加未分组名称映射");
            // 使用update而不是set，避免覆盖其他数据
            if (db) {
              db.ref('groupNames').update({ '未分组': '未分组' }).catch(error => {
                console.error("同步未分组名称映射到Firebase失败:", error);
              });
            }
          }
          
          // 检查并修复培茹组（在groupNames加载后检查）
          if (!groups['培茹组'] && groupNames['培茹组']) {
            console.log("日报表页面 - 检测到培茹组名称存在但成员数组丢失，正在修复...");
            groups['培茹组'] = []; // 重新创建空的培茹组
            if (db) {
              db.ref('groups').update({ '培茹组': [] }).catch(error => {
                console.error("日报表页面 - 修复培茹组失败:", error);
              });
            }
            console.log("日报表页面 - 培茹组已修复");
            
            // 更新本地存储
            localStorage.setItem('msh_groups', JSON.stringify(groups));
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