/**
 * 汇总页面主文件 (summary.js)
 * 功能：数据汇总、报表展示、数据导出
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 全局变量和初始化 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let backButton, backToSigninButton, exportButton;
let showDailyReport, showSundayTracking, showQuarterlyReport, showYearlyReport;
let dailyDateSelect, quarterSelect, yearSelect;
let viewDailyReport, viewQuarterlyReport, viewYearlyReport;
let dailyReportSection, quarterlyReportSection, yearlyReportSection;
let dailyReportList, quarterlyReportList, yearlyReportList;

// 性能优化相关
let virtualScrollManager = null;
let useVirtualScroll = true;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
try {
  app = firebase.app();
  db = firebase.database();
    console.log('✅ 使用已存在的Firebase应用');
    return true;
} catch (error) {
  if (window.firebaseConfig) {
    app = firebase.initializeApp(window.firebaseConfig);
    db = firebase.database();
      console.log('✅ 创建新的Firebase应用');
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
    pageSyncManager = new window.utils.PageSyncManager('summary');
    console.log('汇总页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backButton = document.getElementById('backButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  exportButton = document.getElementById('exportButton');
  
  // 导航按钮
  showDailyReport = document.getElementById('showDailyReport');
  showSundayTracking = document.getElementById('showSundayTracking');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  // 日期选择器
  dailyDateSelect = document.getElementById('dailyDateSelect');
  quarterSelect = document.getElementById('quarterSelect');
  yearSelect = document.getElementById('yearSelect');
  
  // 查看按钮
  viewDailyReport = document.getElementById('viewDailyReport');
  viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  viewYearlyReport = document.getElementById('viewYearlyReport');
  
  // 报表section
  dailyReportSection = document.getElementById('dailyReportSection');
  quarterlyReportSection = document.getElementById('quarterlyReportSection');
  yearlyReportSection = document.getElementById('yearlyReportSection');
  
  // 表格列表
  dailyReportList = document.getElementById('dailyReportList');
  quarterlyReportList = document.getElementById('quarterlyReportList');
  yearlyReportList = document.getElementById('yearlyReportList');
}

document.addEventListener('DOMContentLoaded', async () => {
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 使用新数据管理器加载数据
  if (window.newDataManager) {
    try {
      // 先初始化Firebase（如果还没有初始化）
      if (!firebase.apps.length && window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
        console.log('✅ Firebase应用创建成功');
      }
      
      await window.newDataManager.loadAllDataFromFirebase();
      
      // 从全局变量获取数据
      groups = window.groups || {};
      groupNames = window.groupNames || {};
      attendanceRecords = window.attendanceRecords || [];
      
      // 数据已通过NewDataManager加载，无需额外操作
      
      console.log("✅ 汇总页面数据加载成功");
    } catch (error) {
      console.error("❌ 汇总页面数据加载失败:", error);
    }
  } else {
    console.error("❌ 新数据管理器未找到，无法加载数据");
    // 显示错误信息给用户
    alert('数据管理器初始化失败，请刷新页面重试');
  }
  
  console.log("汇总页面初始化完成");
});

// ==================== 数据加载和管理 ====================
// 旧的loadData函数已移除，现在使用NewDataManager

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backButton) {
    backButton.addEventListener('click', () => window.location.href = 'admin.html');
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', () => window.location.href = 'index.html');
  }

  // 导出按钮事件
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
        // 获取当前显示的报表section
        const activeSection = document.querySelector('.report-section:not(.hidden-form)');
        if (!activeSection) {
          alert('请先选择一个报表页面！');
          return;
        }

        // 动态加载html2canvas库
        if (!window.html2canvas) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          document.head.appendChild(script);
          
          // 等待库加载完成
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        // 生成图片
        const canvas = await html2canvas(activeSection, {
          backgroundColor: '#ffffff',
          scale: 1, // 降低图片质量，减少文件大小
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          width: activeSection.scrollWidth,
          height: activeSection.scrollHeight
        });

        // 根据当前报表类型生成文件名
        let fileName = 'MSH报表';
        const sectionId = activeSection.id;
        const currentDate = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        
        if (sectionId === 'dailyReportSection') {
          dailyDateSelect = document.getElementById('dailyDateSelect');
          const selectedDate = dailyDateSelect ? dailyDateSelect.value : '';
          fileName = `MSH日报表_${selectedDate || currentDate}`;
        } else if (sectionId === 'quarterlyReportSection') {
          quarterSelect = document.getElementById('quarterSelect');
          const selectedQuarter = quarterSelect ? quarterSelect.value : '';
          fileName = `MSH季度报表_${selectedQuarter || '当前季度'}`;
        } else if (sectionId === 'yearlyReportSection') {
          yearSelect = document.getElementById('yearSelect');
          const selectedYear = yearSelect ? yearSelect.value : '';
          fileName = `MSH年度报表_${selectedYear || new Date().getFullYear()}`;
        } else {
          fileName = `MSH报表_${currentDate}`;
        }

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('报表图片已导出！');
      } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败，请重试！');
      }
    });
  }

  // 导航按钮事件

  if (showDailyReport) {
    console.log('showDailyReport按钮已找到，绑定事件监听器');
    showDailyReport.addEventListener('click', () => {
      console.log('showDailyReport按钮被点击，切换到日报表');
      showSection('dailyReport');
    });
  } else {
    console.error('showDailyReport按钮未找到！');
  }


  if (showQuarterlyReport) {
    showQuarterlyReport.addEventListener('click', () => {
      showSection('quarterlyReport');
    });
  }

  if (showYearlyReport) {
    showYearlyReport.addEventListener('click', () => {
      showSection('yearlyReport');
    });
  }


  if (dailyDateSelect) {
    dailyDateSelect.addEventListener('change', () => {
      const selectedDate = dailyDateSelect.value;
      if (selectedDate) {
        loadDailyReport(selectedDate);
      }
    });
  }

  if (viewDailyReport) {
    console.log('viewDailyReport按钮已找到，绑定事件监听器');
    viewDailyReport.addEventListener('click', () => {
      console.log('viewDailyReport按钮被点击');
      const selectedDate = dailyDateSelect ? dailyDateSelect.value : '';
      console.log('选择的日期:', selectedDate);
      if (selectedDate) {
        loadDailyReport(selectedDate);
      } else {
        alert('请选择日期！');
      }
    });
  } else {
    console.error('viewDailyReport按钮未找到！');
  }


  if (quarterSelect) {
    quarterSelect.addEventListener('change', () => {
      const selectedQuarter = quarterSelect.value;
      if (selectedQuarter) {
        loadQuarterlyReport(selectedQuarter);
      }
    });
  }

  if (viewQuarterlyReport) {
    viewQuarterlyReport.addEventListener('click', () => {
      const quarter = quarterSelect ? quarterSelect.value : '';
      if (quarter) {
        loadQuarterlyReport(quarter);
      } else {
        alert('请选择季度！');
      }
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      const selectedYear = yearSelect.value;
      if (selectedYear) {
        loadYearlyReport(selectedYear);
      }
    });
  }

  if (viewYearlyReport) {
    viewYearlyReport.addEventListener('click', () => {
      const year = yearSelect ? yearSelect.value : '';
      if (year) {
        loadYearlyReport(year);
      } else {
        alert('请选择年份！');
      }
    });
  }


  // 数据同步监听器已在DOMContentLoaded中初始化
}

// ==================== 数据同步初始化 ====================
// 旧的数据同步代码已移除，现在使用NewDataManager统一管理数据

// ==================== 事件处理函数 ====================

// ==================== 表格渲染优化函数 ====================
  
  // 优化表格渲染函数
  function renderOptimizedTable(container, data, columns, options = {}) {
    if (!container || !data) return;
    
    const { useVirtualScroll: useVirtual = useVirtualScroll, pageSize = 50 } = options;
    
    // 如果数据量小，直接渲染
    if (data.length <= 100) {
      renderTableDirectly(container, data, columns);
      return;
    }
    
    if (useVirtual && window.VirtualScrollManager) {
      // 使用虚拟滚动
      if (virtualScrollManager) {
        virtualScrollManager.destroy();
      }
      
      virtualScrollManager = new VirtualScrollManager({
        container: container,
        data: data,
        itemHeight: 40,
        visibleCount: Math.ceil(container.clientHeight / 40) || 20,
        renderItem: (item, index) => renderTableRow(item, index, columns)
      });
    } else if (window.PaginationManager) {
      // 使用分页
      if (virtualScrollManager) {
        virtualScrollManager.destroy();
      }
      
      virtualScrollManager = new PaginationManager({
        container: container,
        data: data,
        pageSize: pageSize,
        renderItem: (item, index) => renderTableRow(item, index, columns)
      });
    } else {
      // 回退到直接渲染
      renderTableDirectly(container, data, columns);
    }
  }
  
  // 直接渲染表格
  function renderTableDirectly(container, data, columns) {
    container.innerHTML = '';
    
    data.forEach((item, index) => {
      const row = renderTableRow(item, index, columns);
      container.appendChild(row);
    });
  }
  
  // 渲染表格行
  function renderTableRow(item, index, columns) {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'even' : 'odd';
    
    columns.forEach(column => {
      const cell = document.createElement('td');
      const value = getCellValue(item, column);
      cell.textContent = value;
      cell.className = column.className || '';
      row.appendChild(cell);
    });
    
    return row;
  }
  
  // 获取单元格值
  function getCellValue(item, column) {
    if (typeof column.dataKey === 'function') {
      return column.dataKey(item);
    } else if (typeof column.dataKey === 'string') {
      return item[column.dataKey] || '';
    } else {
      return '';
    }
  }
  
  // 导航按钮
  showDailyReport = document.getElementById('showDailyReport');
  showQuarterlyReport = document.getElementById('showQuarterlyReport');
  showYearlyReport = document.getElementById('showYearlyReport');
  
  
  // 日报表相关
  dailyReportSection = document.getElementById('dailyReportSection');
  dailyDateSelect = document.getElementById('dailyDateSelect');
  viewDailyReport = document.getElementById('viewDailyReport');
  dailyReportList = document.getElementById('dailyReportList');
  earlyCount = document.getElementById('earlyCount');
  onTimeCount = document.getElementById('onTimeCount');
  lateCount = document.getElementById('lateCount');
  signedCount = document.getElementById('signedCount');
  unsignedCount = document.getElementById('unsignedCount');
  newcomerCount = document.getElementById('newcomerCount');
  attendanceRate = document.getElementById('attendanceRate');
  
  // 季度报表相关
  quarterlyReportSection = document.getElementById('quarterlyReportSection');
  quarterSelect = document.getElementById('quarterSelect');
  viewQuarterlyReport = document.getElementById('viewQuarterlyReport');
  quarterlyReportList = document.getElementById('quarterlyReportList');
  
  // 年度报表相关
  yearlyReportSection = document.getElementById('yearlyReportSection');
  yearSelect = document.getElementById('yearSelect');
  viewYearlyReport = document.getElementById('viewYearlyReport');
  yearlyReportList = document.getElementById('yearlyReportList');

  // 旧的数据加载函数已移除，现在使用NewDataManager

  function initializePage() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    if (dailyDateSelect) dailyDateSelect.value = today;
    
    // 初始化季度和年份选项
    initializePeriodOptions();
    
    // 默认显示日报表
    showSection('dailyReport');
  }

  function initializePeriodOptions() {
    // 初始化季度选项
    if (quarterSelect) {
      quarterSelect.innerHTML = '<option value="">--请选择季度--</option>';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        for (let q = 1; q <= 4; q++) {
          const option = document.createElement('option');
          option.value = `${year}-Q${q}`;
          option.textContent = `${year}年第${q}季度`;
          quarterSelect.appendChild(option);
        }
      });
    }

    // 初始化年份选项
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="">--请选择年份--</option>';
      const years = [...new Set(attendanceRecords.map(r => new Date(r.time).getFullYear()))];
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
      });
    }
  }

  function showSection(sectionName) {
    console.log('showSection被调用，sectionName:', sectionName);
    // 隐藏所有section
    const sections = [dailyReportSection, quarterlyReportSection, yearlyReportSection];
    sections.forEach(section => {
      if (section) {
        section.style.display = 'none';
        section.classList.add('hidden-form');
      }
    });

    // 移除所有导航按钮的active类
    const navButtons = [showDailyReport, showSundayTracking, showQuarterlyReport, showYearlyReport];
    navButtons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    // 显示选中的section
    switch (sectionName) {
      case 'dailyReport':
        console.log('显示日报表section');
        if (dailyReportSection) {
          console.log('dailyReportSection元素存在，设置显示');
          dailyReportSection.style.display = 'block';
          dailyReportSection.classList.remove('hidden-form');
          console.log('dailyReportSection display:', dailyReportSection.style.display);
          console.log('dailyReportSection classList:', dailyReportSection.classList.toString());
        } else {
          console.error('dailyReportSection元素不存在！');
        }
        if (showDailyReport) showDailyReport.classList.add('active');
        break;
      case 'quarterlyReport':
        if (quarterlyReportSection) {
          quarterlyReportSection.style.display = 'block';
          quarterlyReportSection.classList.remove('hidden-form');
        }
        if (showQuarterlyReport) showQuarterlyReport.classList.add('active');
        break;
      case 'yearlyReport':
        if (yearlyReportSection) {
          yearlyReportSection.style.display = 'block';
          yearlyReportSection.classList.remove('hidden-form');
        }
        if (showYearlyReport) showYearlyReport.classList.add('active');
        break;
    }
  }

  // 获取签到时间段类型的中文显示
  function getAttendanceTypeChinese(date) {
    const type = window.utils.getAttendanceType(date);
    switch (type) {
      case 'early': return '早到';
      case 'onTime': return '准时';
      case 'late': return '迟到';
      case 'afternoon': return '下午';
      case 'invalid': return '无效';
      default: return '未知';
    }
  }




  async function syncToFirebase() {
    try {
      if (db) {
        await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
        console.log('签到记录已安全同步到Firebase');
      }
    } catch (error) {
      console.error('安全同步到Firebase失败:', error);
    }
  }

  // 直接同步到Firebase，覆盖远程数据（用于删除操作）
  async function directSyncToFirebase() {
    try {
      // 先保存到本地存储
      localStorage.setItem('msh_attendance_records', JSON.stringify(attendanceRecords));
      
      if (db) {
        const attendanceRef = db.ref('attendanceRecords');
        await attendanceRef.set(attendanceRecords);
        console.log('签到记录已直接同步到Firebase（覆盖模式）');
      }
      
      // 更新全局变量
      window.attendanceRecords = attendanceRecords;
      
    } catch (error) {
      console.error('直接同步到Firebase失败:', error);
      throw error;
    }
  }

  function loadDailyReport(date) {
    if (!dailyReportList) return;
    
    console.log('日报表 - 开始加载，日期:', date);
    console.log('日报表 - groups数据:', groups);
    console.log('日报表 - 未分组是否存在:', groups['未分组']);
    console.log('日报表 - 未分组成员数量:', groups['未分组'] ? groups['未分组'].length : '不存在');
    
    const targetDate = new Date(date).toLocaleDateString('zh-CN');
    const dayRecords = attendanceRecords.filter(record => 
      new Date(record.time).toLocaleDateString('zh-CN') === targetDate
    );

    // 统计各时段人数
    let earlyCountNum = 0, onTimeCountNum = 0, lateCountNum = 0;
    const signedNames = new Set();
    
    dayRecords.forEach(record => {
      signedNames.add(record.name);
      const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
      if (timeSlot === 'early') earlyCountNum++;
      else if (timeSlot === 'onTime') onTimeCountNum++;
      else if (timeSlot === 'late') lateCountNum++;
    });

    // 统计未签到人数（排除不统计的人员）
    const excludedMembers = window.utils.loadExcludedMembers();
    const allMembers = Object.keys(groups).flatMap(group => 
      groups[group].map(member => ({ group, name: member.name }))
    ).filter(member => 
      !excludedMembers.some(excluded => 
        excluded.name === member.name && excluded.group === member.group
      )
    );
    const unsignedCountNum = allMembers.length - signedNames.size;

    // 统计新人（只有通过"新朋友"按钮添加的人员，且是选择日期当天新增的）
    let newcomerCountNum = 0;
    const selectedDate = new Date(date).toLocaleDateString('zh-CN');
    Object.keys(groups).forEach(group => {
      groups[group].forEach(member => {
        if (member.joinDate && member.addedViaNewcomerButton) {
          const memberJoinDate = new Date(member.joinDate).toLocaleDateString('zh-CN');
          if (memberJoinDate === selectedDate) {
          newcomerCountNum++;
          }
        }
      });
    });

    // 计算签到总人数
    const signedCountNum = earlyCountNum + onTimeCountNum + lateCountNum;

    // 更新汇总数据
    if (earlyCount) earlyCount.textContent = earlyCountNum;
    if (onTimeCount) onTimeCount.textContent = onTimeCountNum;
    if (lateCount) lateCount.textContent = lateCountNum;
    if (signedCount) signedCount.textContent = signedCountNum;
    if (unsignedCount) unsignedCount.textContent = unsignedCountNum;
    if (newcomerCount) newcomerCount.textContent = newcomerCountNum;
    
    const totalMembers = allMembers.length;
    const attendanceRateNum = totalMembers > 0 ? Math.round((signedNames.size / totalMembers) * 100) : 0;
    if (attendanceRate) attendanceRate.textContent = attendanceRateNum + '%';

    // 生成详细的日报表内容
    dailyReportList.innerHTML = '';
    
    // 按组别显示签到情况（按字母顺序排序），"未分组"永远排在最后
    const sortedGroups = window.utils.sortGroups(groups, groupNames);
    console.log('日报表 - 所有组别:', sortedGroups);
    console.log('日报表 - groups数据:', groups);
    sortedGroups.forEach(group => {
      const groupMembers = groups[group] || [];
      const groupName = groupNames[group] || group;
      console.log(`日报表 - 处理组别: ${group}, 成员数量: ${groupMembers.length}`);
      
      // 统计该组的签到情况
      const groupRecords = dayRecords.filter(record => record.group === group);
      const signedMembers = groupRecords.map(record => record.name);
      
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
      
      const row = document.createElement('tr');
      const unsignedNames = unsignedMembers.map(member => member.name).join(', ');
      
      // 计算上午签到人数（早到+准时+迟到）
      const morningSignedCount = earlyRecords.length + onTimeRecords.length + lateRecords.length;
      
      // 计算应到人数（排除不统计人员）
      const validGroupMembers = window.utils.filterExcludedMembers(groupMembers, group, excludedMembers);
      const totalGroupMembers = validGroupMembers.length;
      
      // 计算签到率（上午签到人数/应到人数）
      const attendanceRate = totalGroupMembers > 0 ? Math.round((morningSignedCount / totalGroupMembers) * 100) : 0;
      
      row.innerHTML = `
        <td>${groupName}</td>
        <td>${earlyRecords.map(record => record.name).join(', ')}</td>
        <td>${onTimeRecords.map(record => record.name).join(', ')}</td>
        <td>${lateRecords.map(record => record.name).join(', ')}</td>
        <td>${unsignedNames || '无'}</td>
        <td>${attendanceRate}%</td>
      `;
      dailyReportList.appendChild(row);
    });

    // 按组统计
    const groupStats = {};
    Object.keys(groups).forEach(group => {
      const groupMembers = groups[group];
      const groupSigned = dayRecords.filter(record => record.group === group);
      const signedNames = groupSigned.map(record => record.name);
      // 获取不统计人员列表
      const excludedMembers = window.utils.loadExcludedMembers();
      
      // 过滤掉不统计的人员
      const unsignedMembers = groupMembers.filter(member => 
        !signedNames.includes(member.name) &&
        !excludedMembers.some(excluded => 
          excluded.name === member.name && excluded.group === group
        )
      );
      
      const groupEarly = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'early';
      }).length;
      const groupOnTime = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'onTime';
      }).length;
      const groupLate = groupSigned.filter(record => {
        const timeSlot = record.timeSlot || window.utils.getAttendanceType(new Date(record.time));
        return timeSlot === 'late';
      }).length;
      const groupUnsigned = groupMembers.length - groupSigned.length;
      const groupRate = groupMembers.length > 0 ? Math.round((groupSigned.length / groupMembers.length) * 100) : 0;
      
      groupStats[group] = {
        early: groupEarly,
        onTime: groupOnTime,
        late: groupLate,
        unsigned: groupUnsigned,
        unsignedNames: unsignedMembers.map(member => member.name).join(', '),
        rate: groupRate
      };
    });

    // 注意：这里不应该清空表格，因为上面已经生成了详细的签到情况
    // 如果需要显示汇总统计，应该使用单独的表格或区域
  }

  function loadQuarterlyReport(quarter) {
    if (!quarterlyReportList) return;
    
    const [year, q] = quarter.split('-Q');
    const startMonth = (parseInt(q) - 1) * 3;
    const startDate = new Date(parseInt(year), startMonth, 1);
    const endDate = new Date(parseInt(year), startMonth + 3, 0);
    
    const quarterRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 获取不统计人员列表
    const excludedMembers = window.utils.loadExcludedMembers();
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    quarterRecords.forEach(record => {
      // 检查是否在不统计列表中（使用UUID匹配）
      const isExcluded = window.utils.isMemberExcluded(record, excludedMembers);
      
      if (!isExcluded) {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            morning: 0, 
            afternoon: 0, 
            evening: 0 
          };
        }
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        if (timeSlot === '上午') memberStats[key].morning++;
        else if (timeSlot === '下午') memberStats[key].afternoon++;
        else if (timeSlot === '晚上') memberStats[key].evening++;
      }
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    quarterlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      quarterlyReportList.appendChild(row);
    });
  }

  function loadYearlyReport(year) {
    if (!yearlyReportList) return;
    
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    
    const yearRecords = attendanceRecords.filter(record => {
      const date = new Date(record.time);
      return date >= startDate && date <= endDate && date.getDay() === 0; // 只统计周日
    });

    // 获取不统计人员列表
    const excludedMembers = window.utils.loadExcludedMembers();
    
    // 统计每个成员的签到情况（排除不统计的人员）
    const memberStats = {};
    yearRecords.forEach(record => {
      // 检查是否在不统计列表中（使用UUID匹配）
      const isExcluded = window.utils.isMemberExcluded(record, excludedMembers);
      
      if (!isExcluded) {
        const key = `${record.group}-${record.name}`;
        if (!memberStats[key]) {
          memberStats[key] = { 
            group: record.group, 
            name: record.name, 
            morning: 0, 
            afternoon: 0, 
            evening: 0 
          };
        }
        const timeSlot = record.timeSlot || getAttendanceType(new Date(record.time));
        if (timeSlot === '上午') memberStats[key].morning++;
        else if (timeSlot === '下午') memberStats[key].afternoon++;
        else if (timeSlot === '晚上') memberStats[key].evening++;
      }
    });

    // 计算总周日数
    const totalSundays = countSundays(startDate, endDate);
    
    // 显示统计结果
    yearlyReportList.innerHTML = '';
    Object.values(memberStats).forEach(stat => {
      const totalSignIns = stat.morning + stat.afternoon + stat.evening;
      const signInRate = totalSundays > 0 ? Math.round((totalSignIns / totalSundays) * 100) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${groupNames[stat.group] || stat.group}</td>
        <td>${stat.name}</td>
        <td>${stat.morning}</td>
        <td>${stat.afternoon}</td>
        <td>${stat.evening}</td>
        <td>${signInRate}%</td>
      `;
      yearlyReportList.appendChild(row);
    });
  }

  function countSundays(start, end) {
    let sundays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) sundays++;
    }
    return sundays;
  }

  
  
  



