/**
 * 跟踪事件详情页面脚本 (tracking-event-detail.js)
 * 功能：显示具体缺勤计算和跟踪记录
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== 全局变量 ====================
let app, db;
let memberUUID, eventId;
let memberInfo = null;
let absenceDetails = null;
let trackingRecords = [];
let pageSyncManager; // 页面同步管理器

// DOM元素引用
let backToTrackingButton, refreshButton;
let loadingIndicator, errorMessage, eventDetailContent;
let memberInfoEl, absenceDetailsEl, trackingHistoryEl, actionButtonsEl;

// ==================== Firebase初始化 ====================
async function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    // 设置全局变量，供其他模块使用
    window.db = db;
    console.log('✅ 跟踪事件详情页面Firebase初始化成功');
    return true;
  } else {
    console.error('❌ 跟踪事件详情页面Firebase初始化失败');
    return false;
  }
}

// ==================== 页面同步管理器初始化 ====================
function initializePageSyncManager() {
  if (window.utils && window.utils.PageSyncManager) {
    pageSyncManager = new window.utils.PageSyncManager('trackingEventDetail');
    console.log('跟踪事件详情页面同步管理器初始化完成');
  } else {
    console.error('页面同步管理器未找到');
  }
}

// ==================== DOM元素初始化 ====================
function initializeDOMElements() {
  backToTrackingButton = document.getElementById('backToTrackingButton');
  refreshButton = document.getElementById('refreshButton');
  
  loadingIndicator = document.getElementById('loadingIndicator');
  errorMessage = document.getElementById('errorMessage');
  eventDetailContent = document.getElementById('eventDetailContent');
  
  memberInfoEl = document.getElementById('memberInfo');
  absenceDetailsEl = document.getElementById('absenceDetails');
  trackingHistoryEl = document.getElementById('trackingHistory');
  actionButtonsEl = document.getElementById('actionButtons');
}

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回按钮事件
  if (backToTrackingButton) {
    backToTrackingButton.addEventListener('click', () => {
      window.location.href = 'sunday-tracking.html';
    });
  }

  // 刷新按钮事件
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      console.log('🔄 用户点击刷新按钮');
      loadEventDetail(true); // 强制刷新
    });
  }
}

// ==================== 页面初始化 ====================
async function initializePage() {
  try {
    console.log('🔍 初始化跟踪事件详情页面');
    
    // 从URL参数获取memberUUID和eventId
    const urlParams = new URLSearchParams(window.location.search);
    memberUUID = urlParams.get('uuid');
    eventId = urlParams.get('eventId');
    
    if (!memberUUID) {
      throw new Error('缺少成员UUID参数');
    }
    
    console.log(`成员UUID: ${memberUUID}, 事件ID: ${eventId}`);
    
    // 显示加载状态
    showLoadingState();
    
    // 首先加载基础数据（groups和groupNames）
    await loadBaseData();
    
    // 并行加载数据
    await Promise.all([
      loadMemberInfo(),
      calculateAbsenceDetails(),
      loadTrackingRecords()
    ]);
    
    // 显示完整信息
    displayCompleteInfo();
    
    console.log('✅ 跟踪事件详情页面初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    showErrorMessage(error.message);
  } finally {
    hideLoadingState();
  }
}

// ==================== 数据加载函数 ====================

/**
 * 加载基础数据
 * 功能：加载groups和groupNames数据，为UUIDIndex提供基础
 * 作者：MSH系统
 * 版本：2.0
 */
async function loadBaseData() {
  console.log('📋 加载基础数据...');
  
  try {
    // 加载groups数据
    const groupsRef = db.ref('groups');
    const groupsSnapshot = await groupsRef.once('value');
    window.groups = groupsSnapshot.val() || {};
    
    // 加载groupNames数据
    const groupNamesRef = db.ref('groupNames');
    const groupNamesSnapshot = await groupNamesRef.once('value');
    window.groupNames = groupNamesSnapshot.val() || {};
    
    console.log('🔍 基础数据加载状态:', {
      groupsLoaded: !!window.groups,
      groupsCount: window.groups ? Object.keys(window.groups).length : 0,
      groupNamesLoaded: !!window.groupNames,
      groupNamesKeys: window.groupNames ? Object.keys(window.groupNames) : 'undefined'
    });
    
    // 更新UUIDIndex（确保groupNames已加载）
    if (window.utils && window.utils.UUIDIndex) {
      window.utils.UUIDIndex.updateMemberIndex(window.groups);
      console.log('✅ UUIDIndex已更新');
      
      // 验证更新结果
      const sampleMember = window.utils.UUIDIndex.findMemberByUUID(memberUUID);
      console.log('🔍 验证UUIDIndex更新结果:', {
        groupNamesLoaded: !!window.groupNames,
        groupNamesKeys: window.groupNames ? Object.keys(window.groupNames) : 'undefined',
        sampleMember: sampleMember,
        sampleMemberGroup: sampleMember ? sampleMember.group : 'undefined',
        sampleMemberGroupDisplayName: sampleMember ? sampleMember.groupDisplayName : 'undefined'
      });
    }
    
    console.log('✅ 基础数据加载完成');
  } catch (error) {
    console.error('❌ 基础数据加载失败:', error);
    throw error;
  }
}

/**
 * 加载成员基本信息
 * 功能：从全局数据中获取成员信息
 * 作者：MSH系统
 * 版本：2.0
 */
async function loadMemberInfo() {
  try {
    console.log(`📋 加载成员信息 - UUID: ${memberUUID}`);
    
    const member = window.utils.UUIDIndex.findMemberByUUID(memberUUID);
    if (!member) {
      throw new Error('成员信息未找到');
    }
    
    console.log('🔍 从UUIDIndex获取的原始成员信息:', member);
    
    // 确保groupDisplayName正确设置
    let groupDisplayName = member.groupDisplayName;
    let memberGroup = member.group;
    
    console.log('🔍 初始状态:', {
      groupDisplayName: groupDisplayName,
      memberGroup: memberGroup,
      windowGroupNames: {
        exists: !!window.groupNames,
        type: typeof window.groupNames,
        keys: window.groupNames ? Object.keys(window.groupNames) : 'undefined',
        hasMemberGroup: window.groupNames && memberGroup && window.groupNames.hasOwnProperty(memberGroup)
      }
    });
    
    // 如果成员信息中缺少group字段，尝试从原始数据中获取
    if (!memberGroup) {
      console.log('⚠️ 成员信息缺少group字段，尝试从原始数据获取');
      
      // 从window.groups中查找该成员
      if (window.groups) {
        for (const [groupName, members] of Object.entries(window.groups)) {
          const foundMember = members.find(m => m.uuid === memberUUID);
          if (foundMember) {
            memberGroup = foundMember.group || groupName;
            console.log(`🔧 从原始数据找到group: ${memberGroup}`);
            break;
          }
        }
      }
    }
    
    // 设置groupDisplayName
    if (!groupDisplayName && memberGroup) {
      if (window.groupNames && window.groupNames[memberGroup]) {
        groupDisplayName = window.groupNames[memberGroup];
        console.log(`🔧 从groupNames映射获取显示名称: ${memberGroup} -> ${groupDisplayName}`);
      } else {
        groupDisplayName = memberGroup;
        console.log(`⚠️ 未找到组别映射，使用原始名称: ${groupDisplayName}`);
      }
    } else if (!memberGroup) {
      console.log(`❌ 无法确定成员组别:`, member);
      memberGroup = '未分组';
      groupDisplayName = '未分组';
    }
    
    memberInfo = {
      name: member.name,
      group: memberGroup,
      groupDisplayName: groupDisplayName,
      phone: member.phone,
      gender: member.gender,
      baptismStatus: member.baptismStatus,
      ageGroup: member.ageGroup
    };
    
    console.log('✅ 成员信息加载完成:', memberInfo);
    console.log('🔍 最终状态:', {
      group: memberInfo.group,
      groupDisplayName: memberInfo.groupDisplayName
    });
  } catch (error) {
    console.error('❌ 加载成员信息失败:', error);
    throw error;
  }
}

/**
 * 计算详细缺勤数据（优化版：使用延迟计算策略）
 * 功能：使用SundayTrackingManager计算缺勤详情
 * 作者：MSH系统
 * 版本：2.0
 */
async function calculateAbsenceDetails() {
  try {
    console.log(`🔍 开始计算缺勤详情 - UUID: ${memberUUID}`);
    
    const startTime = performance.now();
    
    // 检查是否需要重新计算
    const needsRecalculation = window.realTimeUpdateManager?.needsRecalculation(memberUUID);
    console.log(`🔍 需要重新计算: ${needsRecalculation}`);
    
    // 检查缓存（如果不需要重新计算）
    if (!needsRecalculation && window.unifiedCacheManager) {
      const cached = window.unifiedCacheManager.get('absenceDetails', memberUUID);
      if (cached) {
        console.log('📦 使用缓存的缺勤计算结果');
        absenceDetails = cached;
        return;
      }
    }
    
    // 执行计算
    absenceDetails = await window.utils.SundayTrackingManager
      .calculateConsecutiveAbsences(memberUUID);
    
    // 保存到缓存
    if (window.unifiedCacheManager) {
      window.unifiedCacheManager.set('absenceDetails', memberUUID, absenceDetails);
    }
    
    // 清除重新计算标志
    if (needsRecalculation && window.realTimeUpdateManager) {
      window.realTimeUpdateManager.clearRecalculationFlag(memberUUID);
    }
    
    const endTime = performance.now();
    console.log(`✅ 缺勤计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ 计算缺勤详情失败:', error);
    throw error;
  }
}

/**
 * 加载跟踪记录历史
 * 功能：从Firebase或localStorage加载跟踪记录
 * 作者：MSH系统
 * 版本：2.0
 */
async function loadTrackingRecords() {
  try {
    console.log(`📋 加载跟踪记录 - UUID: ${memberUUID}`);
    
    // 检查缓存
    if (window.unifiedCacheManager) {
      const cached = window.unifiedCacheManager.get('trackingRecords', memberUUID);
      if (cached) {
        console.log('📦 使用缓存的跟踪记录');
        trackingRecords = cached;
        return;
      }
    }
    
    // 从Firebase加载跟踪记录
    if (db) {
      const trackingSnapshot = await db.ref(`trackingRecords/${memberUUID}`).once('value');
      if (trackingSnapshot.exists()) {
        const records = trackingSnapshot.val();
        trackingRecords = Object.values(records || {});
      } else {
        trackingRecords = [];
      }
    } else {
      // 从localStorage加载
      const stored = localStorage.getItem(`msh_tracking_records_${memberUUID}`);
      if (stored) {
        trackingRecords = JSON.parse(stored);
      } else {
        trackingRecords = [];
      }
    }
    
    // 保存到缓存
    if (window.unifiedCacheManager) {
      window.unifiedCacheManager.set('trackingRecords', memberUUID, trackingRecords);
    }
    
    console.log(`✅ 跟踪记录加载完成，共 ${trackingRecords.length} 条`);
  } catch (error) {
    console.error('❌ 加载跟踪记录失败:', error);
    throw error;
  }
}

// ==================== 显示函数 ====================

/**
 * 显示完整信息
 * 功能：显示所有加载的数据
 * 作者：MSH系统
 * 版本：2.0
 */
function displayCompleteInfo() {
  // 显示成员基本信息
  displayMemberInfo();
  
  // 显示缺勤详情
  displayAbsenceDetails();
  
  // 显示跟踪记录历史
  displayTrackingHistory();
  
  // 显示操作按钮
  displayActionButtons();
}

/**
 * 显示成员信息
 * 功能：在页面上显示成员基本信息
 * 作者：MSH系统
 * 版本：2.0
 */
function displayMemberInfo() {
  if (!memberInfoEl || !memberInfo) return;
  
  // 详细调试信息
  console.log('🔍 displayMemberInfo 详细调试信息:');
  console.log('  memberInfo:', memberInfo);
  console.log('  memberInfo.group:', memberInfo.group);
  console.log('  memberInfo.groupDisplayName:', memberInfo.groupDisplayName);
  console.log('  window.groupNames:', window.groupNames);
  console.log('  window.groupNames类型:', typeof window.groupNames);
  console.log('  window.groupNames是否为对象:', window.groupNames && typeof window.groupNames === 'object');
  
  // 检查UUIDIndex中的成员信息
  const uuidIndexMember = window.utils?.UUIDIndex?.findMemberByUUID(memberUUID);
  console.log('  UUIDIndex中的成员信息:', uuidIndexMember);
  if (uuidIndexMember) {
    console.log('  UUIDIndex成员group:', uuidIndexMember.group);
    console.log('  UUIDIndex成员groupDisplayName:', uuidIndexMember.groupDisplayName);
  }
  
  // 获取组别显示名称（优先使用groupDisplayName，回退到groupNames映射）
  let groupDisplayName = memberInfo.groupDisplayName || memberInfo.group;
  if (!memberInfo.groupDisplayName && window.groupNames && window.groupNames[memberInfo.group]) {
    groupDisplayName = window.groupNames[memberInfo.group];
    console.log(`✅ 使用groupNames映射: ${memberInfo.group} -> ${groupDisplayName}`);
  } else if (!memberInfo.groupDisplayName) {
    console.log(`⚠️ 未找到组别映射: ${memberInfo.group}, 使用原始名称`);
    console.log(`⚠️ groupNames检查:`, {
      exists: !!window.groupNames,
      hasKey: window.groupNames && window.groupNames.hasOwnProperty(memberInfo.group),
      keys: window.groupNames ? Object.keys(window.groupNames) : 'undefined'
    });
  } else {
    console.log(`✅ 使用groupDisplayName: ${groupDisplayName}`);
  }
  
  memberInfoEl.innerHTML = `
    <h3>成员信息</h3>
    <div class="member-info-content">
      <p><strong>姓名：</strong>${memberInfo.name}</p>
      <p><strong>组别：</strong>${groupDisplayName}</p>
      <p><strong>电话：</strong>${memberInfo.phone || '未填写'}</p>
      <p><strong>性别：</strong>${memberInfo.gender || '未填写'}</p>
      <p><strong>受洗状态：</strong>${memberInfo.baptismStatus || '未填写'}</p>
      <p><strong>年龄段：</strong>${memberInfo.ageGroup || '未填写'}</p>
    </div>
  `;
}

/**
 * 显示缺勤详情
 * 功能：在页面上显示缺勤计算详情
 * 作者：MSH系统
 * 版本：2.0
 */
function displayAbsenceDetails() {
  if (!absenceDetailsEl || !absenceDetails) return;
  
  const { consecutiveAbsences, lastAttendanceDate, trackingStartDate } = absenceDetails;
  
  absenceDetailsEl.innerHTML = `
    <h3>缺勤详情</h3>
    <div class="absence-details-content">
      <p><strong>连续缺勤：</strong>${consecutiveAbsences} 次</p>
      <p><strong>最后签到：</strong>${lastAttendanceDate ? window.utils.formatDateForDisplay(lastAttendanceDate) : '无'}</p>
      <p><strong>跟踪开始：</strong>${trackingStartDate ? window.utils.formatDateForDisplay(trackingStartDate) : '无'}</p>
    </div>
  `;
}

/**
 * 显示跟踪记录历史
 * 功能：在页面上显示跟踪记录历史
 * 作者：MSH系统
 * 版本：2.0
 */
function displayTrackingHistory() {
  if (!trackingHistoryEl) return;
  
  if (trackingRecords.length === 0) {
    trackingHistoryEl.innerHTML = `
      <h3>跟踪记录历史</h3>
      <p>暂无跟踪记录</p>
    `;
    return;
  }
  
  const historyHtml = trackingRecords.map(record => `
    <div class="tracking-record-item">
      <p><strong>日期：</strong>${window.utils.formatDateForDisplay(record.date)}</p>
      <p><strong>内容：</strong>${record.content}</p>
      <p><strong>类别：</strong>${record.category}</p>
      <p><strong>回馈人员：</strong>${record.person}</p>
      <p><strong>创建时间：</strong>${window.utils.formatDateForDisplay(record.createdAt)}</p>
    </div>
  `).join('');
  
  trackingHistoryEl.innerHTML = `
    <h3>跟踪记录历史</h3>
    <div class="tracking-records-list">
      ${historyHtml}
    </div>
  `;
}

/**
 * 显示操作按钮
 * 功能：在页面上显示操作按钮
 * 作者：MSH系统
 * 版本：2.0
 */
function displayActionButtons() {
  if (!actionButtonsEl || !memberInfo) return;
  
  actionButtonsEl.innerHTML = `
    <button class="main-button primary-button" 
            onclick="resolveTracking('${eventId}', '${memberInfo.name}')"
            aria-label="跟踪${memberInfo.name}">
      跟踪
    </button>
    <button class="main-button info-button" 
            onclick="forwardToExternalForm('${eventId}')"
            aria-label="转发到外部表单">
      转发到外部表单
    </button>
    <button class="main-button success-button" 
            onclick="fetchExternalFormData('${eventId}')"
            aria-label="抓取外部表单数据">
      抓取外部数据
    </button>
    <button class="main-button danger-button" 
            onclick="ignoreTracking('${eventId}', '${memberInfo.name}')"
            aria-label="终止${memberInfo.name}的跟踪事件">
      事件终止
    </button>
    <button class="main-button secondary-button" 
            onclick="viewPersonalPage('${memberUUID}')"
            aria-label="查看${memberInfo.name}的个人页面">
      个人页面
    </button>
  `;
}

// ==================== 外部表单集成功能 ====================

/**
 * 转发到外部表单
 * 功能：将事件信息转发到pub.baishuyun.com的表单
 * 作者：MSH系统
 * 版本：2.0
 */
function forwardToExternalForm(eventId) {
  try {
    console.log(`🔄 开始转发事件到外部表单: ${eventId}`);
    
    // 获取事件详情
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      alert('事件记录未找到，请刷新页面重试');
      return;
    }
    
    // 构建转发URL，包含事件信息
    const baseUrl = 'https://pub.baishuyun.com/form';
    const params = new URLSearchParams({
      eventId: eventId,
      memberName: eventRecord.memberName || memberInfo.name,
      memberUUID: eventRecord.memberUUID || memberUUID,
      group: eventRecord.group || memberInfo.group,
      startDate: eventRecord.startDate,
      consecutiveAbsences: eventRecord.consecutiveAbsences || 0,
      source: 'msh-tracking',
      timestamp: Date.now()
    });
    
    const forwardUrl = `${baseUrl}?${params.toString()}`;
    
    // 打开新窗口
    const newWindow = window.open(forwardUrl, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
      alert('无法打开新窗口，请检查浏览器弹窗设置');
      return;
    }
    
    console.log('✅ 转发到外部表单成功:', forwardUrl);
    
    // 显示成功提示
    showNotification('已转发到外部表单，请在新窗口中填写跟踪内容', 'success');
    
  } catch (error) {
    console.error('❌ 转发到外部表单失败:', error);
    alert('转发失败：' + error.message);
  }
}

/**
 * 抓取外部表单数据
 * 功能：从pub.baishuyun.com获取已填写的表单数据
 * 作者：MSH系统
 * 版本：2.0
 */
async function fetchExternalFormData(eventId) {
  try {
    console.log(`🔄 开始抓取外部表单数据: ${eventId}`);
    
    // 显示加载状态
    showLoadingState('正在抓取外部表单数据...');
    
    // 构建API请求
    const apiUrl = 'https://pub.baishuyun.com/api/form-data';
    const requestData = {
      eventId: eventId,
      action: 'fetch',
      timestamp: Date.now()
    };
    
    console.log('📤 发送API请求:', requestData);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📥 API响应:', result);
    
    if (result.success && result.data) {
      // 处理抓取到的数据
      await processExternalFormData(eventId, result.data);
      showNotification('外部表单数据抓取成功！', 'success');
    } else {
      showNotification('未找到相关的外部表单数据', 'warning');
    }
    
  } catch (error) {
    console.error('❌ 抓取外部表单数据失败:', error);
    showNotification('抓取失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

/**
 * 处理外部表单数据
 * 功能：将抓取到的外部表单数据保存到系统
 * 作者：MSH系统
 * 版本：2.0
 */
async function processExternalFormData(eventId, formData) {
  try {
    console.log('🔄 处理外部表单数据:', formData);
    
    // 验证数据完整性
    if (!formData.trackingDate || !formData.content) {
      throw new Error('外部表单数据不完整');
    }
    
    // 创建跟踪记录
    const trackingRecord = {
      eventId: eventId,
      trackingDate: formData.trackingDate,
      content: formData.content,
      category: formData.category || '外部表单',
      person: formData.person || '系统',
      source: 'external-form',
      notes: formData.notes || '',
      createdAt: new Date().toISOString()
    };
    
    // 保存到系统
    const success = await window.utils.SundayTrackingManager.addTrackingRecord(
      memberUUID, 
      trackingRecord
    );
    
    if (!success) {
      throw new Error('保存跟踪记录失败');
    }
    
    // 更新事件状态（如果外部表单标记为已解决）
    if (formData.status === 'resolved') {
      await updateEventStatus(eventId, 'resolved');
    }
    
    // 刷新页面显示
    await loadTrackingRecords();
    displayTrackingHistory();
    
    console.log('✅ 外部表单数据处理完成:', trackingRecord);
    
  } catch (error) {
    console.error('❌ 处理外部表单数据失败:', error);
    throw error;
  }
}

/**
 * 更新事件状态
 * 功能：更新事件的跟踪状态
 * 作者：MSH系统
 * 版本：2.0
 */
async function updateEventStatus(eventId, status) {
  try {
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到');
    }
    
    // 更新状态
    eventRecord.status = status;
    eventRecord.updatedAt = new Date().toISOString();
    
    // 保存更新
    const success = window.utils.SundayTrackingManager.saveTrackingRecord(eventRecord);
    if (!success) {
      throw new Error('更新事件状态失败');
    }
    
    console.log(`✅ 事件状态已更新为: ${status}`);
    
  } catch (error) {
    console.error('❌ 更新事件状态失败:', error);
    throw error;
  }
}

/**
 * 显示通知
 * 功能：显示操作结果通知
 * 作者：MSH系统
 * 版本：2.0
 */
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加样式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  // 设置背景色
  const colors = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// ==================== 状态管理函数 ====================

/**
 * 显示加载状态
 * 功能：显示页面加载状态
 * 作者：MSH系统
 * 版本：2.0
 */
function showLoadingState() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
  if (eventDetailContent) {
    eventDetailContent.style.display = 'none';
  }
  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
}

/**
 * 隐藏加载状态
 * 功能：隐藏页面加载状态
 * 作者：MSH系统
 * 版本：2.0
 */
function hideLoadingState() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  if (eventDetailContent) {
    eventDetailContent.style.display = 'block';
  }
}

/**
 * 显示错误信息
 * 功能：显示错误信息
 * 作者：MSH系统
 * 版本：2.0
 */
function showErrorMessage(message) {
  if (errorMessage) {
    const errorText = document.getElementById('errorText');
    if (errorText) {
      errorText.textContent = message;
    }
    errorMessage.style.display = 'block';
  }
  if (eventDetailContent) {
    eventDetailContent.style.display = 'none';
  }
}

// ==================== 跟踪操作函数 ====================

/**
 * 跟踪操作
 * 功能：处理跟踪操作
 * 作者：MSH系统
 * 版本：2.0
 */
function resolveTracking(recordId, memberName) {
  console.log(`🔍 开始跟踪操作 - 记录ID: ${recordId}, 成员: ${memberName}`);
  
  // 显示跟踪对话框
  const dialog = document.getElementById('resolveTrackingDialog');
  if (!dialog) {
    console.error('跟踪对话框未找到');
    return;
  }
  
  // 清空表单并设置默认日期
  document.getElementById('trackingDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('trackingContent').value = '';
  document.getElementById('trackingCategory').value = '';
  document.getElementById('trackingPerson').value = '';
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmResolve');
  const cancelBtn = document.getElementById('cancelResolve');
  
  const handleConfirm = async () => {
    const date = document.getElementById('trackingDate').value;
    const content = document.getElementById('trackingContent').value.trim();
    const category = document.getElementById('trackingCategory').value;
    const person = document.getElementById('trackingPerson').value.trim();
    
    if (!date || !content || !category || !person) {
      alert('请填写所有必填字段！');
      return;
    }
    
    try {
      // 调用跟踪功能
      if (window.utils && window.utils.SundayTrackingManager) {
        const trackingData = {
          date: date,
          content: content,
          category: category,
          person: person,
          memberUUID: memberUUID,
          memberName: memberName,
          createdAt: new Date().toISOString()
        };
        
        const success = window.utils.SundayTrackingManager.addTrackingRecord(memberUUID, trackingData);
        
        if (success) {
          alert(`已记录 ${memberName} 的跟踪情况！`);
          dialog.classList.add('hidden-dialog');
          
          // 重新加载跟踪记录
          await loadTrackingRecords();
          displayTrackingHistory();
        } else {
          alert('记录跟踪情况失败，请重试！');
        }
      } else {
        alert('主日跟踪功能暂不可用！');
      }
    } catch (error) {
      console.error('跟踪操作失败:', error);
      alert('跟踪操作失败，请重试！');
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

/**
 * 忽略跟踪操作
 * 功能：处理忽略跟踪操作
 * 作者：MSH系统
 * 版本：2.0
 */
async function ignoreTracking(recordId, memberName) {
  console.log(`🔍 开始忽略跟踪操作 - 记录ID: ${recordId}, 成员: ${memberName}`);
  
  // 显示忽略对话框
  const dialog = document.getElementById('ignoreTrackingDialog');
  if (!dialog) {
    console.error('忽略跟踪对话框未找到');
    return;
  }
  
  // 清空表单并设置默认日期
  document.getElementById('ignoreReason').value = '';
  document.getElementById('ignoreDate').value = new Date().toISOString().split('T')[0];
  
  // 显示对话框
  dialog.classList.remove('hidden-dialog');
  
  // 绑定确认按钮事件
  const confirmBtn = document.getElementById('confirmIgnore');
  const cancelBtn = document.getElementById('cancelIgnore');
  
  const handleConfirm = async () => {
    const reason = document.getElementById('ignoreReason').value.trim();
    const date = document.getElementById('ignoreDate').value;
    
    if (!reason || !date) {
      alert('请填写终止原因和日期！');
      return;
    }
    
    try {
      // 调用忽略跟踪功能
      if (window.utils && window.utils.SundayTrackingManager) {
        const terminationRecord = {
          memberUUID: memberUUID,
          memberName: memberName,
          reason: reason,
          terminationDate: date,
          createdAt: new Date().toISOString()
        };
        
        const success = await window.utils.SundayTrackingManager.terminateTracking(recordId, terminationRecord);
        
        if (success) {
          alert(`已终止 ${memberName} 的跟踪事件！`);
          dialog.classList.add('hidden-dialog');
          
          // 清除相关缓存，确保数据更新
          console.log('🔍 事件终止成功，清除相关缓存...');
          
          // 清除统一缓存管理器中的相关缓存
          if (window.unifiedCacheManager) {
            window.unifiedCacheManager.clearMemberCache(memberUUID);
            window.unifiedCacheManager.clear('trackingRecords', memberUUID);
            window.unifiedCacheManager.clear('absenceDetails', memberUUID);
            console.log('✅ 统一缓存已清除');
          }
          
          // 清除实时更新管理器的重新计算标志
          if (window.realTimeUpdateManager) {
            window.realTimeUpdateManager.clearRecalculationFlag(memberUUID);
            console.log('✅ 重新计算标志已清除');
          }
          
          // 清除SundayTrackingManager的内部缓存
          if (window.utils?.SundayTrackingManager?._cache) {
            window.utils.SundayTrackingManager._cache.memberCalculations.delete(memberUUID);
            window.utils.SundayTrackingManager._cache.trackingRecords = null; // 强制重新加载
            console.log('✅ SundayTrackingManager缓存已清除');
          }
          
          // 重新加载数据以验证状态
          console.log('🔍 重新加载数据验证状态...');
          await loadTrackingRecords();
          displayTrackingHistory();
          
          // 检查全局跟踪记录状态
          const allRecords = window.utils?.SundayTrackingManager?.getTrackingRecords();
          console.log('🔍 全局跟踪记录状态:', allRecords);
          if (allRecords) {
            const terminatedRecords = allRecords.filter(r => r.status === 'terminated');
            const activeRecords = allRecords.filter(r => r.status === 'active');
            console.log(`🔍 全局记录统计: 总${allRecords.length}个, 活跃${activeRecords.length}个, 已终止${terminatedRecords.length}个`);
            
            // 查找当前成员的相关记录
            const memberRecords = allRecords.filter(r => r.memberUUID === memberUUID);
            console.log(`🔍 当前成员(${memberName})的记录:`, memberRecords);
            memberRecords.forEach((record, index) => {
              console.log(`  记录${index + 1}: ID=${record.recordId}, 状态=${record.status}, 创建时间=${record.createdAt}`);
            });
          }
          
          // 检查localStorage状态
          const localStorageData = localStorage.getItem('msh_sunday_tracking');
          console.log('🔍 localStorage数据:', localStorageData);
          
          console.log('🔍 调试完成，请查看控制台输出');
          
          // 注释掉跳转，便于调试
          // window.location.href = 'sunday-tracking.html';
        } else {
          alert('终止跟踪失败，请重试！');
        }
      } else {
        alert('主日跟踪功能暂不可用！');
      }
    } catch (error) {
      console.error('忽略跟踪操作失败:', error);
      alert('忽略跟踪操作失败，请重试！');
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

/**
 * 查看个人页面
 * 功能：跳转到个人页面
 * 作者：MSH系统
 * 版本：2.0
 */
function viewPersonalPage(memberUUID) {
  console.log(`🔗 跳转到个人页面 - UUID: ${memberUUID}`);
  window.location.href = `personal-page.html?uuid=${memberUUID}`;
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('跟踪事件详情页面加载中...');
  
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
  
  // 初始化事件监听器
  initializeEventListeners();
  
  // 初始化页面
  await initializePage();
  
  console.log('跟踪事件详情页面初始化完成');
});

// 将函数暴露到全局作用域
window.resolveTracking = resolveTracking;
window.ignoreTracking = ignoreTracking;
window.viewPersonalPage = viewPersonalPage;
