    const sortedList = trackingList.sort((a, b) => {
      // 第一关键词：组别
      if (a.group !== b.group) {
        // 确保"group0"排在第一
        if (a.group === 'group0') return -1;
        if (b.group === 'group0') return 1;
        return a.group.localeCompare(b.group);
      }
      
      // 第二关键词：连续缺勤次数（降序）
      if (a.consecutiveAbsences !== b.consecutiveAbsences) {
        return b.consecutiveAbsences - a.consecutiveAbsences;
      }
      
      // 第三关键词：姓名
      return a.memberName.localeCompare(b.memberName);
    });
    
    sortedList.forEach((item, index) => {
      const row = document.createElement('tr');
      
      // 根据事件类型和状态设置不同的样式
      let rowClass = '';
      let statusText = '';
      let buttonHtml = '';
      
      if (item.eventType === 'extended_absence') {
        rowClass = 'extended-absence-row';
      } else if (item.eventType === 'severe_absence') {
        rowClass = 'severe-absence-row';
      } else {
        rowClass = 'normal-absence-row';
      }
      
      // 根据事件状态设置样式和按钮
      if (item.status === 'terminated') {
        rowClass += ' terminated-event';
        statusText = ' (已终止)';
        buttonHtml = `
          <button class="detail-btn" onclick="viewEventDetail('${item.recordId || item.memberUUID}')" title="查看详情">查看详情</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')" title="个人页面">个人页面</button>
          <button class="forward-btn" onclick="forwardToExternalForm('${item.recordId || item.memberUUID}')" title="转发到外部表单">转发</button>
          <button class="fetch-btn" onclick="fetchExternalFormData('${item.recordId || item.memberUUID}')" title="抓取外部数据">抓取</button>
        `;
      } else {
        buttonHtml = `
          <button class="detail-btn" onclick="viewEventDetail('${item.recordId || item.memberUUID}')" title="查看详情">查看详情</button>
          <button class="personal-btn" onclick="viewPersonalPage('${item.memberUUID}')" title="个人页面">个人页面</button>
          <button class="forward-btn" onclick="forwardToExternalForm('${item.recordId || item.memberUUID}')" title="转发到外部表单">转发</button>
          <button class="fetch-btn" onclick="fetchExternalFormData('${item.recordId || item.memberUUID}')" title="抓取外部数据">抓取</button>
        `;
      }
      
      
      // 计算缺勤周数范围显示
      const weekRange = getAbsenceWeekRange(item.trackingStartDate, item.consecutiveAbsences);
      const absenceDisplay = weekRange ? `(${weekRange})` : '';
      
      row.className = rowClass;
      row.innerHTML = `
        <td>${item.memberName}${statusText}</td>
        <td>${groupNames[item.originalGroup || item.group] || (item.originalGroup || item.group)}</td>
        <td>${item.consecutiveAbsences}次 <span class="event-type">${absenceDisplay}</span></td>
        <td>${item.lastAttendanceDate ? window.utils.formatDateForDisplay(item.lastAttendanceDate) : '无'}</td>
        <td class="action-buttons">
          ${buttonHtml}
        </td>
      `;
      
      sundayTrackingList.appendChild(row);
    });
  }

// ==================== 事件详情功能 ====================

/**
 * 查看事件详情
 * 功能：跳转到事件详情页面
 * 作者：MSH系统
 * 版本：2.0
 */
function viewEventDetail(eventId) {
  try {
    console.log(`🔍 查看事件详情: ${eventId}`);
    
    // 构建详情页面URL
    const detailUrl = `tracking-event-detail.html?eventId=${eventId}`;
    
    // 跳转到详情页面
    window.location.href = detailUrl;
    
  } catch (error) {
    console.error('❌ 查看事件详情失败:', error);
    alert('查看详情失败：' + error.message);
  }
}

// ==================== 外部表单集成功能 ====================

/**
 * 获取外部表单认证token
 * 功能：获取外部表单系统的JWT认证token
 * 作者：MSH系统
 * 版本：2.0
 */
async function getExternalFormToken() {
  try {
    // 检查是否已有有效token
    if (window.externalFormConfig && window.externalFormConfig.auth.token) {
      // 简单检查token是否过期（这里可以添加更复杂的token验证）
      return window.externalFormConfig.auth.token;
    }
    
    // 登录获取新token
    const response = await fetch(`${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.login}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: window.externalFormConfig.auth.username,
        password: window.externalFormConfig.auth.password
      })
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.token) {
      // 缓存token
      window.externalFormConfig.auth.token = result.token;
      console.log('✅ 外部表单认证成功');
      return result.token;
    } else {
      throw new Error('登录响应中未包含token');
    }
    
  } catch (error) {
    console.error('❌ 获取外部表单token失败:', error);
    throw error;
  }
}

/**
 * 转发到外部表单
 * 功能：将事件信息转发到外部表单系统
 * 作者：MSH系统
 * 版本：2.0
 */
async function forwardToExternalFormInternal(eventId) {
  try {
    console.log(`🔄 开始转发事件到外部表单: ${eventId}`);
    showLoadingState('正在转发到外部表单...');
    
    // 检查外部表单功能是否启用
    if (!window.externalFormConfig || !window.externalFormConfig.features.enableForwarding) {
      throw new Error('外部表单转发功能未启用');
    }
    
    // 获取事件详情
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
    // 检查是否已经转发过
    if (eventRecord.forwarded === true) {
      const forwardDate = eventRecord.forwardDate ? new Date(eventRecord.forwardDate).toLocaleString('zh-CN') : '未知时间';
      const confirmResend = confirm(`该事件已于 ${forwardDate} 转发过！\n\n是否要重新转发？\n\n点击"确定"重新转发\n点击"取消"取消操作`);
      if (!confirmResend) {
        showNotification('已取消转发操作', 'info');
        return;
      }
    }
    
    // 获取认证token
    const token = await getExternalFormToken();
    if (!token) {
      throw new Error('无法获取外部表单认证token');
    }
    
    // 构建提交数据（符合后端API格式）
    const eventData = {
      formId: 'f4b20710-fed9-489f-955f-f9cbea48caac', // 使用第一个测试表单
      submissionData: {
        eventId: eventId,
        memberName: eventRecord.memberName || '未知成员',
        memberUUID: eventRecord.memberUUID || eventId,
        group: eventRecord.groupDisplayName || eventRecord.group || eventRecord.originalGroup || '未知组别',
        startDate: eventRecord.startDate || new Date().toISOString().split('T')[0],
        consecutiveAbsences: eventRecord.consecutiveAbsences || 0,
        source: 'msh-tracking',
        timestamp: new Date().toISOString(),
        // 添加UUID匹配验证标记
        uuidValidation: 'required',
        status: 'pending' // 初始状态为待接收
      }
    };
    
    // 发送事件到外部表单API（使用submissions端点）
    const response = await fetch(`${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.submissions}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📤 转发API响应:', result);
    
    if (result.message && result.message.includes('成功')) {
      // 更新事件记录的转发状态
      eventRecord.forwarded = true;
      eventRecord.forwardDate = new Date().toISOString();
      eventRecord.forwardStatus = 'success';
      eventRecord.forwardResponse = result;
      eventRecord.forwardStatus = 'pending'; // 标记为待接收状态
      eventRecord.uuidMatchRequired = true; // 标记需要UUID匹配
      
      // 保存更新后的事件记录
      const saveSuccess = window.utils.SundayTrackingManager.saveTrackingRecord(eventRecord);
      if (saveSuccess) {
        console.log('✅ 事件转发状态已更新');
      }
      
      showNotification('事件已转发到外部表单，等待UUID匹配确认！', 'success');
      console.log('✅ 转发到外部表单成功，状态：待接收');
      
      // 刷新页面显示，更新按钮状态
      setTimeout(() => {
        loadSundayTracking();
      }, 1000);
    } else {
      throw new Error(result.message || '转发失败');
    }
    
  } catch (error) {
    console.error('❌ 转发到外部表单失败:', error);
    showNotification('转发失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

/**
 * 抓取外部表单数据
 * 功能：从外部表单系统获取已填写的表单数据
 * 作者：MSH系统
 * 版本：2.0
 */
async function fetchExternalFormData(eventId) {
  try {
    console.log(`🔄 开始抓取外部表单数据: ${eventId}`);
    
    // 检查外部表单功能是否启用
    if (!window.externalFormConfig || !window.externalFormConfig.features.enableFetching) {
      throw new Error('外部表单抓取功能未启用');
    }
    
    // 显示加载状态
    showLoadingState('正在抓取外部表单数据...');
    
    // 获取认证token
    const token = await getExternalFormToken();
    if (!token) {
      throw new Error('无法获取外部表单认证token');
    }
    
    // 获取事件信息，确保只抓取对应事件的数据
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error(`事件记录未找到: ${eventId}`);
    }
    
    const memberUUID = eventRecord.memberUUID;
    console.log(`📋 抓取事件 ${eventId} 的外部表单数据，成员UUID: ${memberUUID}`);
    
    // 构建API请求 - 添加更多过滤参数确保只获取相关数据
    const apiUrl = `${window.externalFormConfig.apiBaseUrl}${window.externalFormConfig.endpoints.submissions}?eventId=${eventId}&memberUUID=${memberUUID}&source=external-form`;
    console.log(`🌐 API请求URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📥 API响应:', result);
    
    // 处理返回的数据（可能是数组或对象）
    const submissions = result.submissions || result;
    
    if (submissions && submissions.length > 0) {
      // 处理抓取到的数据
      console.log(`📊 找到${submissions.length}条外部表单数据`);
      await processExternalFormData(eventId, submissions);
      showNotification(`外部表单数据抓取成功！共${submissions.length}条记录`, 'success');
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
async function processExternalFormData(eventId, submissions) {
  try {
    console.log('🔄 处理外部表单数据:', submissions);
    
    // 如果是数组，处理每个提交
    if (!Array.isArray(submissions)) {
      submissions = [submissions];
    }
    
    // 获取事件信息
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error(`事件记录未找到: ${eventId}`);
    }
    
    const memberUUID = eventRecord.memberUUID;
    console.log(`📋 处理事件 ${eventId} 的跟踪记录，成员UUID: ${memberUUID}`);
    
    // 获取现有的个人跟踪记录，用于重复检测
    const existingRecords = await getExistingPersonalTrackingRecords(memberUUID);
    console.log(`📊 现有跟踪记录数量: ${existingRecords.length}`);
    
    let savedCount = 0;
    let skippedCount = 0;
    
    for (const submission of submissions) {
      const data = submission.submissionData || submission;
      
      // 更宽松的数据验证 - 检查是否有任何有效内容
      const hasContent = data.trackingContent || data.content || data.notes || data.description || data.message;
      if (!hasContent) {
        console.warn('⚠️ 跳过无内容的数据:', submission);
        skippedCount++;
        continue;
      }
      
      // 检查是否已存在相同的记录（基于提交ID和内容）
      const isDuplicate = checkForDuplicateRecord(existingRecords, submission, data);
      if (isDuplicate) {
        console.log('🔄 跳过重复记录:', submission.id || 'unknown');
        skippedCount++;
        continue;
      }
      
      // 创建跟踪记录
      const trackingRecord = {
        eventId: eventId,
        memberUUID: memberUUID,
        trackingDate: data.trackingDate || new Date().toISOString().split('T')[0],
        content: data.trackingContent || data.content || data.notes || data.description || data.message || '',
        category: '外部表单',
        person: data.submitterName || data.personName || '外部填报',
        source: 'external-form',
        notes: `提交ID: ${submission.id || 'unknown'}\n状态: ${getTrackingStatusText(data.trackingStatus || 'pending')}\n原始数据: ${JSON.stringify(data)}`,
        externalSubmissionId: submission.id,
        createdAt: submission.createdAt || new Date().toISOString(),
        // 添加更多元数据
        originalData: data,
        submissionTime: submission.submittedAt || submission.createdAt || new Date().toISOString()
      };
      
      // 保存到Firebase
      try {
        if (!window.db) {
          console.warn('⚠️ Firebase数据库未初始化，跳过Firebase保存');
          savedCount++;
          continue;
        }
        
        // 保存到跟踪记录（与详情页面兼容的路径）
        const trackingRef = window.db.ref(`trackingRecords/${memberUUID}`);
        const newRecordRef = trackingRef.push();
        await newRecordRef.set(trackingRecord);
        
        // 同时保存到个人跟踪记录（用于个人页面）
        const personalTrackingRef = window.db.ref(`personalTracking/${memberUUID}`);
        const personalRecordRef = personalTrackingRef.push();
        await personalRecordRef.set(trackingRecord);
        
        console.log('✅ 跟踪记录已保存到Firebase:', trackingRecord);
        savedCount++;
        
        // 更新现有记录列表，避免重复检测
        existingRecords.push({
          key: newRecordRef.key,
          ...trackingRecord
        });
        
      } catch (error) {
        console.error('❌ 保存到Firebase失败:', error);
        throw error;
      }
    }
    
    if (savedCount > 0) {
      showNotification(`成功同步${savedCount}条记录到MSH系统！${skippedCount > 0 ? ` (跳过${skippedCount}条重复记录)` : ''}`, 'success');
      
      // 刷新页面显示
      await loadSundayTracking();
      
      console.log(`✅ 外部表单数据处理完成，共保存${savedCount}条记录，跳过${skippedCount}条重复记录`);
    } else {
      showNotification(`没有可同步的数据${skippedCount > 0 ? ` (${skippedCount}条重复记录已跳过)` : ''}`, 'warning');
    }
    
  } catch (error) {
    console.error('❌ 处理外部表单数据失败:', error);
    throw error;
  }
}

/**
 * 获取现有的个人跟踪记录
 * 功能：从Firebase获取指定成员的个人跟踪记录
 */
async function getExistingPersonalTrackingRecords(memberUUID) {
  try {
    if (!window.db) {
      console.warn('⚠️ Firebase数据库未初始化，返回空记录列表');
      return [];
    }
    
    // 从跟踪记录路径获取数据（与详情页面一致）
    const trackingRef = window.db.ref(`trackingRecords/${memberUUID}`);
    const snapshot = await trackingRef.once('value');
    const records = snapshot.val() || {};
    
    // 转换为数组格式
    const recordArray = Object.keys(records).map(key => ({
      key: key,
      ...records[key]
    }));
    
    console.log(`📊 获取到 ${recordArray.length} 条现有个人跟踪记录`);
    return recordArray;
    
  } catch (error) {
    console.error('❌ 获取现有个人跟踪记录失败:', error);
    return [];
  }
}

/**
 * 检查重复记录
 * 功能：检查新记录是否与现有记录重复
 */
function checkForDuplicateRecord(existingRecords, submission, data) {
  const submissionId = submission.id;
  const content = data.trackingContent || data.content || data.notes || data.description || data.message || '';
  
  // 检查是否有相同的外部提交ID
  if (submissionId) {
    const hasSameSubmissionId = existingRecords.some(record => 
      record.externalSubmissionId === submissionId
    );
    if (hasSameSubmissionId) {
      console.log(`🔄 发现相同提交ID的记录: ${submissionId}`);
      return true;
    }
  }
  
  // 检查是否有相同的内容（内容相似度检查）
  const hasSimilarContent = existingRecords.some(record => {
    const existingContent = record.content || '';
    // 简单的内容相似度检查（可以进一步优化）
    const similarity = calculateContentSimilarity(content, existingContent);
    return similarity > 0.8; // 80%以上相似度认为是重复
  });
  
  if (hasSimilarContent) {
    console.log(`🔄 发现相似内容的记录`);
    return true;
  }
  
  return false;
}

/**
 * 计算内容相似度
 * 功能：计算两个文本内容的相似度
 */
function calculateContentSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  // 简单的相似度计算（基于共同字符）
  const set1 = new Set(text1.toLowerCase().split(''));
  const set2 = new Set(text2.toLowerCase().split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * 获取跟踪状态文本
 */
function getTrackingStatusText(status) {
  const statusMap = {
    'pending': '待处理',
    'contacted': '已联系',
    'followed': '持续跟进',
    'resolved': '已解决'
  };
  return statusMap[status] || status;
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
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
  `;
  
  // 设置背景色
  const colors = {
