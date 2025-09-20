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
let pageSyncManager; // 页面同步管理器

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

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('dailyReport');
    console.log('日报页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
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
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 使用新数据管理器加载数据
  if (window.newDataManager) {
    try {
      // 先初始化Firebase（如果还没有初始化）
      if (!firebase.apps.length && window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('✅ Firebase应用创建成功');
      }
      
      // 等待NewDataManager完成初始化
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts && (!window.newDataManager || !window.newDataManager.isDataLoaded)) {
        console.log(`⏳ 等待NewDataManager初始化... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // 检查NewDataManager是否已经加载了数据
      if (window.newDataManager && window.newDataManager.isDataLoaded) {
        console.log('📋 数据已通过NewDataManager加载，直接使用');
        groups = window.groups || {};
        groupNames = window.groupNames || {};
        attendanceRecords = window.attendanceRecords || [];
      } else {
        // 检查是否有本地数据可以直接使用
        const hasLocalData = window.groups && Object.keys(window.groups).length > 0;
        if (hasLocalData) {
          console.log('📋 检测到本地数据，直接使用，跳过Firebase拉取');
          groups = window.groups;
          groupNames = window.groupNames || {};
          attendanceRecords = window.attendanceRecords || [];
        } else {
          console.log('🔄 首次加载，从Firebase拉取数据');
          await window.newDataManager.loadAllDataFromFirebase();
          
          // 从全局变量获取数据
          groups = window.groups || {};
          groupNames = window.groupNames || {};
          attendanceRecords = window.attendanceRecords || [];
        }
      }
      
      console.log("🔍 日报表页面数据加载:", {
        groups: Object.keys(groups).length,
        groupNames: Object.keys(groupNames).length,
        attendanceRecords: attendanceRecords.length,
        dailyNewcomers: window.dailyNewcomers ? Object.keys(window.dailyNewcomers).length : 0
      });
      
      // 生成日报表
      generateDailyReport();
      
      console.log("✅ 日报表页面数据加载成功");
    } catch (error) {
      console.error("❌ 日报表页面数据加载失败:", error);
    }
  } else {
    console.error("❌ 新数据管理器未找到，无法加载数据");
    // 显示错误信息给用户
    alert('数据管理器初始化失败，请刷新页面重试');
  }
  
  // 初始化事件监听器
  initializeEventListeners();
  
});

// ==================== 数据加载和管理 ====================
// 旧的loadData函数已移除，现在使用NewDataManager

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', () => {
      // 使用history.back()保持页面状态，避免重新加载数据
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据加载函数 ====================
// 旧的数据加载函数已移除，现在使用NewDataManager统一管理数据

  /**
   * 生成日报表
   * 根据选择的日期生成当日的签到统计报表
   * 包括签到人员列表、未签到人员列表、各时间段统计等
   */
  function generateDailyReport() {
    if (!signedList) {
      console.error('signedList element not found');
      return;
    }
    
    const today = new Date().toLocaleDateString('zh-CN');
    const todayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === today
    );
    
    // 调试日志：记录当日签到数据统计
    console.log(`📊 日报表生成 - 日期: ${today}, 签到记录数: ${todayRecords.length}`);
    

    signedList.innerHTML = '';
    todayRecords.forEach(record => {
      const row = document.createElement('tr');
      // 使用快照数据，确保显示的是签到时的真实信息
      const displayGroup = record.groupSnapshot?.groupName || groupNames[record.group] || record.group;
      const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
      const displayName = window.utils.getDisplayName(memberInfo);
      
      row.innerHTML = `
        <td>${displayGroup}</td>
        <td>${displayName}</td>
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
        
        /**
         * 根据时间段过滤签到记录
         * @param {string} timeSlot - 时间段类型 ('early', 'onTime', 'late')
         * @returns {Array} 过滤后的签到记录数组
         */
        const filterRecordsByTimeSlot = (timeSlot) => {
          return groupRecords.filter(record => {
            const recordTimeSlot = window.utils.getAttendanceType(new Date(record.time));
            const isExcluded = window.utils.isMemberExcluded(record, group, excludedMembers);
            return recordTimeSlot === timeSlot && !isExcluded;
          });
        };
        
        const earlyRecords = filterRecordsByTimeSlot('early');
        const onTimeRecords = filterRecordsByTimeSlot('onTime');
        const lateRecords = filterRecordsByTimeSlot('late');
        
        
        // 统计上午签到的人员（用于计算未签到人员）
        // 使用UUID进行统计匹配，避免姓名变更导致的重复统计
        const morningSignedUUIDs = [
          ...earlyRecords.map(record => record.memberUUID || record.name),
          ...onTimeRecords.map(record => record.memberUUID || record.name),
          ...lateRecords.map(record => record.memberUUID || record.name)
        ];
        
        // 计算上午未签到的人员（只统计上午未签到，下午签到不算）
        const unsignedMembers = window.utils.filterExcludedMembers(
          groupMembers.filter(member => !morningSignedUUIDs.includes(member.uuid || member.name)),
          group,
          excludedMembers
        );
        
        const row = document.createElement('tr');
        const unsignedNames = unsignedMembers.map(member => window.utils.getDisplayName(member)).join(', ');
        
        row.innerHTML = `
          <td>${groupName}</td>
          <td>${earlyRecords.map(record => {
            const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
            return window.utils.getDisplayName(memberInfo);
          }).join(', ')}</td>
          <td>${onTimeRecords.map(record => {
            const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
            return window.utils.getDisplayName(memberInfo);
          }).join(', ')}</td>
          <td>${lateRecords.map(record => {
            const memberInfo = record.memberSnapshot || { name: record.name, nickname: '' };
            return window.utils.getDisplayName(memberInfo);
          }).join(', ')}</td>
          <td>${unsignedNames || '无'}</td>
        `;
        unsignedList.appendChild(row);
      });
    }

    if (newcomersList) {
      newcomersList.innerHTML = '';
      let newcomersCount = 0;
      
      // 使用快照数据而不是实时计算
      const today = new Date().toISOString().split('T')[0];
      const dailyNewcomers = window.newDataManager ? window.newDataManager.getDailyNewcomers(today) : [];
      
      console.log('📊 当日新增人员快照数据:', {
        date: today,
        newcomers: dailyNewcomers,
        count: dailyNewcomers.length
      });
      
      if (dailyNewcomers.length > 0) {
        // 按字母顺序排序小组，"未分组"永远排在最后
        const sortedGroups = window.utils.sortGroups(groups, groupNames);
        
        dailyNewcomers.forEach(newcomerName => {
          // 查找该人员在哪个小组
          let foundGroup = null;
          sortedGroups.forEach(group => {
            if (groups[group] && groups[group].some(member => member.name === newcomerName)) {
              foundGroup = group;
            }
          });
          
          if (foundGroup) {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${groupNames[foundGroup] || foundGroup}</td>
              <td>${newcomerName}</td>
            `;
            newcomersList.appendChild(row);
            newcomersCount++;
          } else {
            // 如果找不到小组，显示为"未分组"
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>未分组</td>
              <td>${newcomerName}</td>
            `;
            newcomersList.appendChild(row);
            newcomersCount++;
          }
        });
      }
      
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

  // 旧的数据同步代码已移除，现在使用NewDataManager统一管理数据