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

// 历史组别名称映射（用于兼容旧数据）
// 格式：{ "旧名称": "组别ID" }
// 通过UUID匹配验证，确保100%准确
const HISTORICAL_GROUP_NAMES = {
  '乐清1组': 'group3',  // 现在是"花园小家" (匹配度: 2/2人)
  '乐清2组': 'group4',  // 现在是"时代小家" (匹配度: 8/8人)
  '乐清3组': 'group5',  // 现在是"以勒小家" (匹配度: 5/5人)
  '七里港': 'group1',   // 现在是"阿茜组" (匹配度: 5/5人)
};

// DOM元素引用
let signedList, unsignedList, newcomersList;
let totalSigned, totalNewcomers, backButton;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = db;
    console.log('✅ 日报页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 日报页面Firebase初始化失败');
    return false;
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
  
  // 【优化V2.0】只加载基础数据和当天的签到记录
  await loadBasicDataAndToday();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 🔔 监听数据更新事件，自动刷新页面数据
  window.addEventListener('attendanceRecordsUpdated', async (event) => {
    console.log('🔔 日报表页面检测到签到记录更新事件:', event.detail);
    
    // 清除所有sessionStorage中的签到记录缓存
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('attendance_')) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ 已清除缓存: ${key}`);
      }
    });
    
    // 重新加载当前选择日期的数据
    if (dateInput && dateInput.value) {
      console.log('🔄 重新加载数据:', dateInput.value);
      const records = await loadAttendanceRecordsForDate(dateInput.value);
      generateDailyReport(records);
    }
  });
  
  console.log("✅ 日报表页面初始化完成（优化加载模式）");
  console.log('✅ 数据更新事件监听器已注册');
});

// ==================== 基础数据和当天数据加载（优化V2.0）====================
/**
 * 加载基础数据和当天的签到记录
 */
async function loadBasicDataAndToday() {
  try {
    // 先初始化Firebase（如果还没有初始化）
    if (!firebase.apps.length && window.firebaseConfig) {
      firebase.initializeApp(window.firebaseConfig);
      console.log('✅ Firebase应用创建成功');
    }
    
    // 1. 加载基础数据
    await loadBasicData();
    
    // 2. 只加载今天的签到记录
    const today = window.utils.getLocalDateString();
    const todayRecords = await loadAttendanceRecordsForDate(today);
    
    console.log("🔍 日报表页面数据加载:", {
      groups: Object.keys(groups).length,
      groupNames: Object.keys(groupNames).length,
      todayRecords: todayRecords.length
    });
    
    // 3. 生成日报表
    generateDailyReport(todayRecords);
    
  } catch (error) {
    console.error("❌ 日报表页面数据加载失败:", error);
    alert('数据加载失败，请刷新页面重试');
  }
}

/**
 * 加载基础数据（groups、groupNames、excludedMembers）
 */
async function loadBasicData() {
  // 优先使用全局变量（已由NewDataManager或其他页面加载）
  if (window.groups && Object.keys(window.groups).length > 0) {
    groups = window.groups;
    groupNames = window.groupNames || {};
    console.log("✅ 使用全局基础数据");
    // ⚠️ 强制从Firebase加载最新的excludedMembers数据
    await loadExcludedMembersFromFirebase();
    return;
  }
  
  // 否则从本地存储加载
  const localGroups = localStorage.getItem('msh_groups');
  const localGroupNames = localStorage.getItem('msh_group_names');
  
  if (localGroups && localGroupNames) {
    groups = JSON.parse(localGroups);
    groupNames = JSON.parse(localGroupNames);
    console.log("✅ 从本地存储加载基础数据");
    // ⚠️ 强制从Firebase加载最新的excludedMembers数据
    await loadExcludedMembersFromFirebase();
    return;
  }
  
  // 最后从Firebase加载
  console.log("🔄 从Firebase加载基础数据...");
  const db = firebase.database();
  const [groupsSnap, groupNamesSnap] = await Promise.all([
    db.ref('groups').once('value'),
    db.ref('groupNames').once('value')
  ]);
  
  groups = groupsSnap.val() || {};
  groupNames = groupNamesSnap.val() || {};
  
  // 保存到全局和本地
  window.groups = groups;
  window.groupNames = groupNames;
  localStorage.setItem('msh_groups', JSON.stringify(groups));
  localStorage.setItem('msh_group_names', JSON.stringify(groupNames));
  
  // 统计排除人员
  let excludedCount = 0;
  Object.keys(groups).forEach(groupId => {
    const members = groups[groupId] || [];
    excludedCount += members.filter(m => m.excluded === true || m.excluded === 'true').length;
  });
  
  console.log("✅ Firebase基础数据加载完成", {
    groups: Object.keys(groups).length,
    excludedMembers: excludedCount + '（从成员标记统计）'
  });
}

/**
 * 从Firebase强制加载最新的excludedMembers数据（已废弃）
 * @deprecated 现在排除信息在成员对象的 excluded 属性中，随 groups 一起加载
 */
async function loadExcludedMembersFromFirebase() {
  console.log("✅ 排除人员数据已集成到成员对象中，无需单独加载");
  // 不再需要单独加载 excludedMembers
}

/**
 * 按日期加载签到记录
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @returns {Array} 签到记录数组
 */
async function loadAttendanceRecordsForDate(date) {
  console.log(`🔄 加载 ${date} 的签到数据...`);
  
  // 检查sessionStorage缓存
  const cacheKey = `attendance_${date}`;
  let cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    console.log(`✅ 从缓存获取 ${date} 数据`);
    return JSON.parse(cached);
  }
  
  // 从Firebase按日期查询
  try {
    const db = firebase.database();
    // 🔧 修复：构建本地时区的ISO字符串范围
    // date参数是本地日期（YYYY-MM-DD），需要转换为本地时间的ISO范围
    const localDateStart = new Date(`${date}T00:00:00`); // 本地时间00:00:00
    const localDateEnd = new Date(`${date}T23:59:59.999`); // 本地时间23:59:59.999
    const dateStart = localDateStart.toISOString();
    const dateEnd = localDateEnd.toISOString();
    
    console.log(`🔍 Firebase查询范围 (本地时间 ${date}): ${dateStart} - ${dateEnd}`);
    
    const snapshot = await db.ref('attendanceRecords')
      .orderByChild('time')
      .startAt(dateStart)
      .endAt(dateEnd)
      .once('value');
    
    const records = snapshot.val() ? Object.values(snapshot.val()) : [];
    
    // 缓存到sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify(records));
    
    console.log(`✅ 加载了 ${records.length} 条 ${date} 的签到记录`);
    return records;
    
  } catch (error) {
    console.error(`❌ 加载 ${date} 签到数据失败:`, error);
    return [];
  }
}

// ==================== 数据加载和管理 ====================
// 旧的loadData函数已移除，现在使用NewDataManager

// ==================== 返回导航机制 ====================
// 使用统一的导航工具

// ==================== 缓存管理函数 ====================
/**
 * 清除今日数据缓存
 * 用于强制重新从Firebase加载最新数据
 */
function clearTodayCache() {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `attendance_${today}`;
  sessionStorage.removeItem(cacheKey);
  console.log('✅ 已清除今日缓存:', cacheKey);
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  // 刷新数据按钮事件
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', async () => {
      try {
        // 清除缓存
        clearTodayCache();
        
        // 显示加载提示
        refreshDataBtn.disabled = true;
        refreshDataBtn.textContent = '⏳ 刷新中...';
        
        // 重新加载数据
        await loadBasicDataAndToday();
        
        // 恢复按钮状态
        refreshDataBtn.disabled = false;
        refreshDataBtn.textContent = '🔄 刷新数据';
        
        // 提示用户
        alert('✅ 数据已刷新！');
        console.log('✅ 数据刷新完成');
      } catch (error) {
        console.error('❌ 数据刷新失败:', error);
        refreshDataBtn.disabled = false;
        refreshDataBtn.textContent = '🔄 刷新数据';
        alert('❌ 数据刷新失败，请重试');
      }
    });
  }

  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据加载函数 ====================
// 旧的数据加载函数已移除，现在使用NewDataManager统一管理数据

  /**
   * 生成日报表（优化V2.0）
   * @param {Array} records - 签到记录数组（传入参数）
   */
  function generateDailyReport(records) {
    if (!signedList) {
      console.error('signedList element not found');
      return;
    }
    
    // 【优化V2.0】使用传入的records参数，而不是全局attendanceRecords
    const todayRecords = records;
    const today = new Date().toLocaleDateString('zh-CN');
    
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
      
      
      // 按组别显示签到情况（按字母顺序排序），"group0"永远排在第一
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const groupMembers = groups[group] || [];
        const groupName = groupNames[group] || group;
        
        // 统计该组的签到情况
        // 🔧 修复：使用组别名称匹配，因为签到记录中的group字段存储的是中文名称
        // 同时支持历史组别名称（用于兼容旧数据）
        const groupRecords = todayRecords.filter(record => {
          // 1. 匹配当前组别名称
          if (record.group === groupName || record.group === group) {
            return true;
          }
          // 2. 匹配历史组别名称
          const historicalGroupId = HISTORICAL_GROUP_NAMES[record.group];
          if (historicalGroupId === group) {
            return true;
          }
          return false;
        });
        
        
        // 按时间段分类签到记录（早到、准时、迟到）
        // 注意：排除人员如果已签到，仍然会在对应时段中显示
        // 排除逻辑只应用于"未签到"统计，不应用于已签到人员的显示
        
        /**
         * 根据时间段过滤签到记录
         * @param {string} timeSlot - 时间段类型 ('early', 'onTime', 'late')
         * @returns {Array} 过滤后的签到记录数组
         */
        const filterRecordsByTimeSlot = (timeSlot) => {
          return groupRecords.filter(record => {
            const recordTimeSlot = window.utils.getAttendanceType(new Date(record.time));
            // 修复：排除人员如果已签到，应该正常显示在对应的时段中
            // 排除逻辑只应用于"未签到"统计，不应用于已签到人员的显示
            return recordTimeSlot === timeSlot;
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
        const unsignedMembers = groupMembers.filter(member => 
          !(member.excluded === true || member.excluded === 'true') && // 不是排除人员
          !morningSignedUUIDs.includes(member.uuid || member.name) // 且未签到
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
      
      // 使用与index页面相同的逻辑：基于groups数据中的addedViaNewcomerButton和joinDate
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
      
      console.log('📊 当日新增人员数据:', {
        date: today,
        newcomers: todayNewcomers,
        count: todayNewcomers.length
      });
      
      // 按字母顺序排序小组，"group999"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      
      todayNewcomers.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${groupNames[member.group] || member.group}</td>
          <td>${member.name}</td>
        `;
        newcomersList.appendChild(row);
        newcomersCount++;
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
    let expectedCount = 0;
    Object.keys(groups).forEach(group => {
      const groupMembers = groups[group] || [];
      // 只统计未排除的成员
      const validMembers = groupMembers.filter(member => 
        !(member.excluded === true || member.excluded === 'true')
      );
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

  // backButton事件已在initializeEventListeners中处理，避免重复绑定

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