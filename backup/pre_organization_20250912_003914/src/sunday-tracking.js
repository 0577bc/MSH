/**
 * MSH主日跟踪页面脚本 (sunday-tracking.js)
 * 功能：主日跟踪功能实现
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 全局变量 ====================
let app, db;
let groups = {};
let groupNames = {};
let attendanceRecords = [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let backToSummaryButton, backToSigninButton, exportButton;
let sundayTrackingSection, sundayTrackingList;

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
    pageSyncManager = new window.utils.PageSyncManager('sundayTracking');
    console.log('主日跟踪页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backToSummaryButton = document.getElementById('backToSummaryButton');
  backToSigninButton = document.getElementById('backToSigninButton');
  exportButton = document.getElementById('exportButton');
  
  sundayTrackingSection = document.getElementById('sundayTrackingSection');
  sundayTrackingList = document.getElementById('sundayTrackingList');
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backToSummaryButton) {
    backToSummaryButton.addEventListener('click', () => window.location.href = 'summary.html');
  }

  if (backToSigninButton) {
    backToSigninButton.addEventListener('click', () => window.location.href = 'index.html');
  }

  // 导出按钮事件
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      try {
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
        const canvas = await html2canvas(sundayTrackingSection, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });

        // 下载图片
        const link = document.createElement('a');
        link.download = `主日跟踪-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();

        alert('导出成功！');
      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请重试！');
      }
    });
  }
  
  // 重置跟踪状态按钮事件
  const resetTrackingBtn = document.getElementById('resetTrackingBtn');
  if (resetTrackingBtn) {
    resetTrackingBtn.addEventListener('click', () => {
      if (confirm('确定要重置所有跟踪记录的状态吗？这将把所有已解决/忽略的记录重新设置为跟踪状态。')) {
        if (window.utils && window.utils.SundayTrackingManager) {
          const success = window.utils.SundayTrackingManager.resetAllTrackingRecords();
          if (success) {
            alert('已重置所有跟踪记录状态！');
            // 重新加载跟踪数据
            loadSundayTracking();
          } else {
            alert('重置失败，请重试！');
          }
        } else {
          alert('主日跟踪功能暂不可用！');
        }
      }
    });
  }

}

// ==================== 数据加载 ====================
async function loadData() {
  try {
    console.log('主日跟踪页面正在连接Firebase数据库...');
    await loadDataFromFirebase();
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    console.log('Using local storage as fallback');
    loadDataFromLocalStorage();
  }
}

async function loadDataFromFirebase() {
  if (!db) {
    throw new Error('Firebase数据库未初始化');
  }

  try {
    // 加载签到记录
    const attendanceSnapshot = await db.ref('attendanceRecords').once('value');
    if (attendanceSnapshot.exists()) {
      attendanceRecords = attendanceSnapshot.val() || [];
      window.attendanceRecords = attendanceRecords; // 设置到全局变量
      console.log(`签到记录已加载: ${attendanceRecords.length} 条`);
    }

    // 加载小组数据
    const groupsSnapshot = await db.ref('groups').once('value');
    if (groupsSnapshot.exists()) {
      groups = groupsSnapshot.val() || {};
      window.groups = groups; // 设置到全局变量
      console.log('小组数据已加载');
    }

    // 加载小组名称映射
    const groupNamesSnapshot = await db.ref('groupNames').once('value');
    if (groupNamesSnapshot.exists()) {
      groupNames = groupNamesSnapshot.val() || {};
      window.groupNames = groupNames; // 设置到全局变量
      console.log('小组名称映射已加载');
    }

    // 更新UUID索引
    if (window.utils && window.utils.UUIDIndex) {
      window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
      window.utils.UUIDIndex.updateMemberIndex(groups);
    }

    console.log('主日跟踪页面数据加载成功');
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    throw error;
  }
}

function loadDataFromLocalStorage() {
  try {
    // 从本地存储加载数据
    const storedAttendance = localStorage.getItem('msh_attendance_records');
    if (storedAttendance) {
      attendanceRecords = JSON.parse(storedAttendance);
      window.attendanceRecords = attendanceRecords; // 设置到全局变量
    }

    const storedGroups = localStorage.getItem('msh_groups');
    if (storedGroups) {
      groups = JSON.parse(storedGroups);
      window.groups = groups; // 设置到全局变量
    }

    const storedGroupNames = localStorage.getItem('msh_group_names');
    if (storedGroupNames) {
      groupNames = JSON.parse(storedGroupNames);
      window.groupNames = groupNames; // 设置到全局变量
    }

    // 更新UUID索引
    if (window.utils && window.utils.UUIDIndex) {
      window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
      window.utils.UUIDIndex.updateMemberIndex(groups);
    }

    console.log('主日跟踪页面数据从本地存储加载成功');
  } catch (error) {
    console.error('从本地存储加载数据失败:', error);
  }
}

// ==================== 数据同步 ====================
function startListening() {
  if (!db) {
    console.error('Firebase数据库未初始化，无法启动数据同步');
    return;
  }

  try {
    if (window.utils && window.utils.dataSyncManager) {
      window.utils.dataSyncManager.startListening((dataType, data) => {
        console.log(`数据同步: ${dataType}`, data);
        
        // 获取本地数据
        let localData;
        switch (dataType) {
          case 'attendanceRecords':
            localData = attendanceRecords;
            break;
          case 'groups':
            localData = groups;
            break;
          case 'groupNames':
            localData = groupNames;
            break;
          default:
            return;
        }
        
        // 使用页面同步管理器处理数据
        if (pageSyncManager) {
          const mergedData = pageSyncManager.syncData(localData, data, dataType);
          
          // 更新本地数据
          switch (dataType) {
            case 'attendanceRecords':
              attendanceRecords = mergedData;
              window.attendanceRecords = attendanceRecords;
              if (window.utils && window.utils.UUIDIndex) {
                window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
              }
              loadSundayTracking();
              break;
            case 'groups':
              groups = mergedData;
              loadSundayTracking();
              break;
            case 'groupNames':
              groupNames = mergedData;
              loadSundayTracking();
              break;
          }
        } else {
          // 降级到简单更新
          switch (dataType) {
            case 'attendanceRecords':
              attendanceRecords = data || [];
              window.attendanceRecords = attendanceRecords;
              if (window.utils && window.utils.UUIDIndex) {
                window.utils.UUIDIndex.updateRecordIndex(attendanceRecords);
              }
              loadSundayTracking();
              break;
            case 'groups':
              groups = data || {};
              loadSundayTracking();
              break;
            case 'groupNames':
              groupNames = data || {};
              loadSundayTracking();
              break;
          }
        }
      });
      console.log('数据同步监听已启动');
    }
  } catch (error) {
    console.error('启动数据同步监听失败:', error);
  }
}

// ==================== 主日跟踪功能 ====================

// 加载主日跟踪数据
function loadSundayTracking() {
  if (!window.utils || !window.utils.SundayTrackingManager) {
    console.error('主日跟踪管理器未加载');
    alert('主日跟踪功能暂不可用，请刷新页面重试！');
    return;
  }

  try {
    const trackingManager = window.utils.SundayTrackingManager;
    
    // 调试信息
    console.log('=== 主日跟踪调试信息 ===');
    console.log('全局签到记录数量:', window.attendanceRecords ? window.attendanceRecords.length : 0);
    console.log('全局小组数据:', window.groups ? Object.keys(window.groups).length : 0);
    console.log('全局小组数据详情:', window.groups);
    
    // 检查所有人员数据
    const allMembers = trackingManager.getAllMembers();
    console.log('所有人员数量:', allMembers.length);
    console.log('所有人员详情:', allMembers);
    
    // 检查排除人员
    const excludedMembers = trackingManager.getExcludedMembers();
    console.log('排除人员数量:', excludedMembers.length);
    console.log('排除人员详情:', excludedMembers);
    
    // 生成跟踪列表
    const trackingList = trackingManager.generateTrackingList();
    console.log('生成的跟踪列表:', trackingList);
    
    // 更新统计信息
    updateTrackingSummary(trackingList);
    
    // 显示跟踪列表
    displayTrackingList(trackingList);
    
    // 检查数据保留期限
    trackingManager.checkDataRetention();
    
    // 初始化数据保留管理
    if (!window.sundayTrackingInitialized) {
      trackingManager.initializeDataRetention();
      window.sundayTrackingInitialized = true;
    }
    
  } catch (error) {
    console.error('加载主日跟踪数据失败:', error);
    alert('加载跟踪数据失败，请重试！');
  }
}

// 更新跟踪统计信息
function updateTrackingSummary(trackingList) {
  const trackingCount = trackingList.length;
  
  // 更新统计显示
  const trackingCountEl = document.getElementById('trackingCount');
  const lastUpdateTimeEl = document.getElementById('lastUpdateTime');
  
  if (trackingCountEl) trackingCountEl.textContent = trackingCount;
  if (lastUpdateTimeEl) {
    const now = new Date();
    lastUpdateTimeEl.textContent = now.toLocaleString('zh-CN');
  }
}

  // 显示跟踪列表
  function displayTrackingList(trackingList) {
    if (!sundayTrackingList) {
      console.error('主日跟踪列表元素未找到');
      return;
    }
    
    sundayTrackingList.innerHTML = '';
    
    if (trackingList.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="5" style="text-align: center; color: #666;">暂无跟踪记录</td>';
      sundayTrackingList.appendChild(row);
      return;
    }
    
    trackingList.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.memberName}</td>
        <td>${item.group}</td>
        <td>${item.consecutiveAbsences}次</td>
        <td>${item.lastAttendanceDate ? formatDateForDisplay(item.lastAttendanceDate) : '无'}</td>
        <td>
          <button class="resolve-btn" onclick="resolveTracking('${item.memberUUID}', '${item.memberName}')">跟踪</button>
          <button class="ignore-btn" onclick="ignoreTracking('${item.memberUUID}', '${item.memberName}')">忽略</button>
        </td>
      `;
      sundayTrackingList.appendChild(row);
    });
  }

// 格式化日期显示
function formatDateForDisplay(dateInput) {
  if (!dateInput) return '无';
  
  // 处理 Date 对象或日期字符串
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) return '无';
  
  return date.toLocaleDateString('zh-CN');
}

// 获取状态文本
function getStatusText(status) {
  switch (status) {
    case 'tracking': return '跟踪中';
    case 'resolved': return '已解决';
    case 'removed': return '已移除';
    default: return '未知';
  }
}

// 跟踪
function resolveTracking(memberUUID, memberName) {
  // 显示跟踪对话框
  const dialog = document.getElementById('resolveTrackingDialog');
  if (!dialog) {
    console.error('跟踪对话框未找到');
    return;
  }
  
  // 清空表单
  document.getElementById('resolveReason').value = '';
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmResolve');
  const cancelBtn = document.getElementById('cancelResolve');
  
  const handleConfirm = () => {
    const reason = document.getElementById('resolveReason').value.trim();
    
    if (!reason) {
      alert('请填写情况说明！');
      return;
    }
    
    // 调用跟踪功能
    if (window.utils && window.utils.SundayTrackingManager) {
      const success = window.utils.SundayTrackingManager.resolveTracking(memberUUID, reason, '系统');
      
      if (success) {
        alert(`已记录 ${memberName} 的跟踪情况！`);
        dialog.classList.add('hidden-dialog');
        
        // 重新加载跟踪数据
        loadSundayTracking();
      } else {
        alert('记录跟踪情况失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
    
    // 移除事件监听器
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  const handleCancel = () => {
    dialog.classList.add('hidden-dialog');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

// 忽略跟踪
function ignoreTracking(memberUUID, memberName) {
  // 显示忽略对话框
  const dialog = document.getElementById('ignoreTrackingDialog');
  if (!dialog) {
    console.error('忽略跟踪对话框未找到');
    return;
  }
  
  // 清空表单
  document.getElementById('ignoreReason').value = '';
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmIgnore');
  const cancelBtn = document.getElementById('cancelIgnore');
  
  const handleConfirm = () => {
    const reason = document.getElementById('ignoreReason').value.trim();
    
    if (!reason) {
      alert('请填写忽略原因！');
      return;
    }
    
    // 调用忽略跟踪功能
    if (window.utils && window.utils.SundayTrackingManager) {
      console.log(`开始忽略跟踪: ${memberName} (${memberUUID})`);
      const success = window.utils.SundayTrackingManager.ignoreTracking(memberUUID, reason);
      console.log(`忽略跟踪结果: ${success}`);
      
      if (success) {
        alert(`已忽略 ${memberName} 的跟踪！`);
        dialog.classList.add('hidden-dialog');
        
        // 重新加载跟踪数据
        loadSundayTracking();
      } else {
        alert('忽略跟踪失败，请重试！');
      }
    } else {
      alert('主日跟踪功能暂不可用！');
    }
    
    // 移除事件监听器
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  const handleCancel = () => {
    dialog.classList.add('hidden-dialog');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };
  
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

// 将函数暴露到全局作用域
window.resolveTracking = resolveTracking;
window.ignoreTracking = ignoreTracking;

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('主日跟踪页面加载中...');
  
  // 初始化DOM元素
  initializeDOMElements();
  
  // 初始化页面同步管理器
  initializePageSyncManager();
  
  // 初始化Firebase
  const firebaseInitialized = await initializeFirebase();
  if (!firebaseInitialized) {
    console.error('Firebase初始化失败');
    return;
  }
  
  // 加载数据
  await loadData();
  
  // 启动数据同步
  startListening();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 自动加载跟踪数据
  loadSundayTracking();
  
  console.log('主日跟踪页面初始化完成');
});
