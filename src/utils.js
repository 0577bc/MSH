// 公共工具函数模块
// 用于减少代码重复，提高可维护性

// 加载不统计人员列表
function loadExcludedMembers() {
  let excludedMembers = [];
  try {
    const localData = localStorage.getItem('msh_excludedMembers');
    if (localData) {
      excludedMembers = JSON.parse(localData);
    }
  } catch (error) {
    console.error('加载不统计人员列表失败:', error);
  }
  return excludedMembers;
}

// 小组排序函数（"未分组"永远排在最后）
function sortGroups(groups, groupNames) {
  return Object.keys(groups).sort((a, b) => {
    const nameA = groupNames[a] || a;
    const nameB = groupNames[b] || b;
    
    // "未分组"永远排在最后
    if (nameA === "未分组") return 1;
    if (nameB === "未分组") return -1;
    
    return nameA.localeCompare(nameB, 'zh-CN');
  });
}

// 成员按姓名排序
function sortMembersByName(members) {
  return members.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

// 检查成员是否在不统计列表中
function isMemberExcluded(member, group, excludedMembers) {
  return excludedMembers.some(excluded => 
    excluded.name === member.name && excluded.group === group
  );
}

// 过滤不统计的人员
function filterExcludedMembers(members, group, excludedMembers) {
  return members.filter(member => !isMemberExcluded(member, group, excludedMembers));
}

// 获取签到时间段类型
function getAttendanceType(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes < 9 * 60 + 20) return '早到'; // 9:20之前
  if (timeInMinutes < 9 * 60 + 30) return '准时'; // 9:20-9:30
  if (timeInMinutes < 10 * 60 + 40) return '迟到'; // 9:30-10:40
  return '迟到';
}

// 格式化日期为中文格式
function formatDateToChinese(date) {
  return date.toLocaleDateString('zh-CN');
}

// 获取今天的日期字符串
function getTodayString() {
  return formatDateToChinese(new Date());
}

// 检查是否为当日新增人员（通过新朋友按钮添加）
function isTodayNewcomer(member) {
  if (!member.joinDate || !member.addedViaNewcomerButton) return false;
  return formatDateToChinese(new Date(member.joinDate)) === getTodayString();
}

// 实时数据同步管理
class DataSyncManager {
  constructor() {
    this.listeners = new Map();
    this.isListening = false;
    this.lastSyncTime = 0;
    this.workerManager = null;
    this.syncQueue = [];
    this.isProcessingSync = false;
  }

  // 初始化Worker管理器
  initWorkerManager() {
    if (window.workerManager && !this.workerManager) {
      this.workerManager = window.workerManager;
    }
  }

  // 异步数据同步
  async syncDataAsync(localData, remoteData, conflictResolution = 'newest') {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程同步');
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'SYNC_DATA',
        data: {
          localData,
          remoteData,
          conflictResolution
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步同步失败:', error);
      // 回退到主线程同步
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }
  }

  // 主线程数据同步（回退方案）
  syncDataMainThread(localData, remoteData, conflictResolution) {
    const startTime = performance.now();
    
    try {
      const conflicts = this.findConflicts(localData, remoteData);
      const mergedData = this.mergeData(localData, remoteData, conflictResolution);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return {
        mergedData,
        conflicts,
        processingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('主线程同步失败:', error);
      throw error;
    }
  }

  // 开始监听Firebase数据变化
  startListening(callback) {
    if (this.isListening) return;
    
    try {
      const db = firebase.database();
      
      // 监听签到记录变化
      const attendanceRef = db.ref('attendanceRecords');
      attendanceRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
          this.lastSyncTime = Date.now();
          callback('attendanceRecords', data);
        }
      });

      // 监听小组数据变化
      const groupsRef = db.ref('groups');
      groupsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.lastSyncTime = Date.now();
          callback('groups', data);
        }
      });

      // 监听小组名称变化
      const groupNamesRef = db.ref('groupNames');
      groupNamesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.lastSyncTime = Date.now();
          callback('groupNames', data);
        }
      });

      this.isListening = true;
      console.log('数据同步监听已启动');
    } catch (error) {
      console.error('启动数据同步监听失败:', error);
    }
  }

  // 停止监听
  stopListening() {
    if (!this.isListening) return;
    
    try {
      const db = firebase.database();
      db.ref('attendanceRecords').off();
      db.ref('groups').off();
      db.ref('groupNames').off();
      
      this.isListening = false;
      console.log('数据同步监听已停止');
    } catch (error) {
      console.error('停止数据同步监听失败:', error);
    }
  }

  // 检查页面可见性
  setupVisibilityListener(callback) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 页面重新可见时，检查是否需要同步数据
        const now = Date.now();
        if (now - this.lastSyncTime > 30000) { // 30秒内没有同步
          callback();
        }
      }
    });
  }
}

// 创建全局数据同步管理器实例
const dataSyncManager = new DataSyncManager();

// 数据冲突解决管理器
const DataConflictResolver = {
  // 检测数据冲突
  detectConflicts(localData, remoteData, dataType) {
    const conflicts = [];
    
    if (dataType === 'attendanceRecords') {
      // 检查签到记录冲突
      const localRecords = localData || [];
      const remoteRecords = remoteData || [];
      
      // 检查是否有相同的签到记录但内容不同
      localRecords.forEach((localRecord, localIndex) => {
        const remoteIndex = remoteRecords.findIndex(remoteRecord => {
          // 只有当ID相同，或者（姓名相同且日期相同且时间相同）时才认为是同一条记录
          if (remoteRecord.id && localRecord.id && remoteRecord.id === localRecord.id) {
            return true;
          }
          
          // 如果没有ID，则通过姓名、日期和时间来匹配
          if (!remoteRecord.id && !localRecord.id) {
            return remoteRecord.name === localRecord.name && 
                   remoteRecord.date === localRecord.date && 
                   remoteRecord.time === localRecord.time;
          }
          
          return false;
        });
        
        if (remoteIndex !== -1) {
          const remoteRecord = remoteRecords[remoteIndex];
          if (JSON.stringify(localRecord) !== JSON.stringify(remoteRecord)) {
            conflicts.push({
              type: 'attendanceRecord',
              localIndex,
              remoteIndex,
              localRecord,
              remoteRecord,
              conflict: '签到记录内容不一致'
            });
          }
        }
      });
    } else if (dataType === 'groups') {
      // 检查小组数据冲突
      const localGroups = localData || {};
      const remoteGroups = remoteData || {};
      
      Object.keys(localGroups).forEach(groupName => {
        if (remoteGroups[groupName]) {
          const localMembers = localGroups[groupName];
          const remoteMembers = remoteGroups[groupName];
          
          // 检查成员数据是否一致
          if (JSON.stringify(localMembers) !== JSON.stringify(remoteMembers)) {
            conflicts.push({
              type: 'group',
              groupName,
              localMembers,
              remoteMembers,
              conflict: '小组成员数据不一致'
            });
          }
        }
      });
    }
    
    return conflicts;
  },
  
  // 显示冲突解决对话框
  async resolveConflicts(conflicts, dataType) {
    if (conflicts.length === 0) {
      return null; // 无冲突
    }
    
    // 创建冲突解决对话框
    const modal = document.createElement('div');
    modal.id = 'conflictModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 20px; border-radius: 10px;
      max-width: 80%; max-height: 80%; overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    let conflictHtml = `
      <h3>⚠️ 数据冲突检测</h3>
      <p>发现 ${conflicts.length} 个数据冲突，请选择解决方案：</p>
    `;
    
    conflicts.forEach((conflict, index) => {
      conflictHtml += `
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
          <h4>冲突 ${index + 1}: ${conflict.conflict}</h4>
          <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
              <h5>本地数据:</h5>
              <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; font-size: 12px; max-height: 200px; overflow-y: auto;">
${JSON.stringify(conflict.localRecord || conflict.localMembers, null, 2)}
              </pre>
            </div>
            <div style="flex: 1;">
              <h5>远程数据:</h5>
              <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; font-size: 12px; max-height: 200px; overflow-y: auto;">
${JSON.stringify(conflict.remoteRecord || conflict.remoteMembers, null, 2)}
              </pre>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <label>
              <input type="radio" name="conflict_${index}" value="local" checked> 使用本地数据
            </label>
            <label style="margin-left: 20px;">
              <input type="radio" name="conflict_${index}" value="remote"> 使用远程数据
            </label>
            <label style="margin-left: 20px;">
              <input type="radio" name="conflict_${index}" value="merge"> 智能合并
            </label>
          </div>
        </div>
      `;
    });
    
    conflictHtml += `
      <div style="text-align: center; margin-top: 20px;">
        <button id="resolveConflicts" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">解决冲突</button>
        <button id="cancelConflicts" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">取消</button>
      </div>
    `;
    
    content.innerHTML = conflictHtml;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 返回Promise等待用户选择
    return new Promise((resolve) => {
      document.getElementById('resolveConflicts').addEventListener('click', () => {
        const resolutions = [];
        conflicts.forEach((conflict, index) => {
          const selected = document.querySelector(`input[name="conflict_${index}"]:checked`);
          resolutions.push({
            conflict,
            resolution: selected.value
          });
        });
        
        document.body.removeChild(modal);
        resolve(resolutions);
      });
      
      document.getElementById('cancelConflicts').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
    });
  },
  
  // 应用冲突解决方案
  applyResolutions(localData, remoteData, resolutions, dataType) {
    if (!resolutions) {
      return localData; // 用户取消，使用本地数据
    }
    
    let resolvedData = JSON.parse(JSON.stringify(localData)); // 深拷贝
    
    resolutions.forEach(({ conflict, resolution }) => {
      if (dataType === 'attendanceRecords') {
        if (resolution === 'remote') {
          // 使用远程数据替换本地数据
          resolvedData[conflict.localIndex] = conflict.remoteRecord;
        } else if (resolution === 'merge') {
          // 智能合并：保留最新的时间戳
          const localTime = new Date(conflict.localRecord.timestamp || 0);
          const remoteTime = new Date(conflict.remoteRecord.timestamp || 0);
          resolvedData[conflict.localIndex] = localTime > remoteTime ? conflict.localRecord : conflict.remoteRecord;
        }
        // 'local' 选项不需要修改，保持本地数据
      } else if (dataType === 'groups') {
        if (resolution === 'remote') {
          resolvedData[conflict.groupName] = conflict.remoteMembers;
        } else if (resolution === 'merge') {
          // 智能合并：合并成员列表，去重
          const localMembers = conflict.localMembers || [];
          const remoteMembers = conflict.remoteMembers || [];
          const mergedMembers = [...localMembers];
          
          remoteMembers.forEach(remoteMember => {
            const exists = mergedMembers.some(localMember => 
              localMember.id === remoteMember.id || 
              (localMember.name === remoteMember.name && localMember.phone === remoteMember.phone)
            );
            if (!exists) {
              mergedMembers.push(remoteMember);
            }
          });
          
          resolvedData[conflict.groupName] = mergedMembers;
        }
      }
    });
    
    return resolvedData;
  }
};

// 数据合并策略
const DataMergeStrategy = {
  // 合并签到记录
  mergeAttendanceRecords(localRecords, remoteRecords) {
    const merged = [...(remoteRecords || [])];
    
    (localRecords || []).forEach(localRecord => {
      // 查找是否已存在相同的记录
      const existingIndex = merged.findIndex(remoteRecord => {
        // 通过ID匹配
        if (remoteRecord.id && localRecord.id && remoteRecord.id === localRecord.id) {
          return true;
        }
        // 通过姓名、日期、时间匹配
        if (!remoteRecord.id && !localRecord.id) {
          return remoteRecord.name === localRecord.name && 
                 remoteRecord.date === localRecord.date && 
                 remoteRecord.time === localRecord.time;
        }
        return false;
      });
      
      if (existingIndex !== -1) {
        // 记录已存在，检查是否需要更新
        const existingRecord = merged[existingIndex];
        if (JSON.stringify(localRecord) !== JSON.stringify(existingRecord)) {
          // 记录内容不同，标记为冲突
          console.log('发现签到记录冲突:', localRecord, existingRecord);
        }
        // 使用本地数据（本地数据优先）
        merged[existingIndex] = localRecord;
      } else {
        // 新记录，直接添加
        merged.push(localRecord);
      }
    });
    
    return merged;
  },
  
  // 合并小组数据
  mergeGroups(localGroups, remoteGroups) {
    const merged = { ...(remoteGroups || {}) };
    
    Object.keys(localGroups || {}).forEach(groupName => {
      if (!merged[groupName]) {
        // 新小组，直接添加
        merged[groupName] = [...(localGroups[groupName] || [])];
      } else {
        // 小组已存在，合并成员
        const localMembers = localGroups[groupName] || [];
        const remoteMembers = merged[groupName] || [];
        const mergedMembers = [...remoteMembers];
        
        localMembers.forEach(localMember => {
          const existingIndex = mergedMembers.findIndex(remoteMember => 
            remoteMember.id === localMember.id || 
            (remoteMember.name === localMember.name && remoteMember.phone === localMember.phone)
          );
          
          if (existingIndex !== -1) {
            // 成员已存在，检查是否需要更新
            const existingMember = mergedMembers[existingIndex];
            if (JSON.stringify(localMember) !== JSON.stringify(existingMember)) {
              console.log('发现成员数据冲突:', localMember, existingMember);
            }
            // 使用本地数据（本地数据优先）
            mergedMembers[existingIndex] = localMember;
          } else {
            // 新成员，直接添加
            mergedMembers.push(localMember);
          }
        });
        
        merged[groupName] = mergedMembers;
      }
    });
    
    return merged;
  },
  
  // 合并小组名称
  mergeGroupNames(localNames, remoteNames) {
    // 处理对象类型的小组名称数据
    let localArray = [];
    let remoteArray = [];
    
    // 如果是对象，提取键名作为数组
    if (typeof localNames === 'object' && localNames !== null && !Array.isArray(localNames)) {
      localArray = Object.keys(localNames);
    } else if (Array.isArray(localNames)) {
      localArray = localNames;
    }
    
    if (typeof remoteNames === 'object' && remoteNames !== null && !Array.isArray(remoteNames)) {
      remoteArray = Object.keys(remoteNames);
    } else if (Array.isArray(remoteNames)) {
      remoteArray = remoteNames;
    }
    
    const merged = [...remoteArray];
    
    localArray.forEach(localName => {
      if (!merged.includes(localName)) {
        merged.push(localName);
      }
    });
    
    return merged.sort();
  }
};

// 安全的数据同步函数 - 带真正的数据合并和冲突检测
async function safeSyncToFirebase(localData, dataType) {
  try {
    const db = firebase.database();
    const remoteRef = db.ref(dataType);
    
    // 获取远程数据
    const remoteSnapshot = await remoteRef.once('value');
    const remoteData = remoteSnapshot.val();
    
    // 检测数据冲突
    const conflicts = DataConflictResolver.detectConflicts(localData, remoteData, dataType);
    
    let finalData;
    
    // 如果有冲突，显示解决对话框
    if (conflicts.length > 0) {
      console.log(`发现 ${conflicts.length} 个数据冲突，等待用户解决...`);
      const resolutions = await DataConflictResolver.resolveConflicts(conflicts, dataType);
      finalData = DataConflictResolver.applyResolutions(localData, remoteData, resolutions, dataType);
    } else {
      // 没有冲突，进行数据合并
      switch (dataType) {
        case 'attendanceRecords':
          finalData = DataMergeStrategy.mergeAttendanceRecords(localData, remoteData);
          break;
        case 'groups':
          finalData = DataMergeStrategy.mergeGroups(localData, remoteData);
          break;
        case 'groupNames':
          finalData = DataMergeStrategy.mergeGroupNames(localData, remoteData);
          break;
        default:
          finalData = localData;
      }
    }
    
    // 保存最终数据
    await remoteRef.set(finalData);
    
    // 验证同步是否成功
    const verifySnapshot = await remoteRef.once('value');
    const verifyData = verifySnapshot.val();
    
    // 比较数据是否一致
    const isSyncSuccess = JSON.stringify(finalData) === JSON.stringify(verifyData);
    
    if (isSyncSuccess) {
      console.log(`✅ ${dataType}数据已成功同步到Firebase`);
      // 更新同步状态到本地存储
      localStorage.setItem(`msh_${dataType}_sync_status`, JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        dataHash: JSON.stringify(finalData).length,
        syncSuccess: true,
        conflictsResolved: conflicts.length
      }));
      return finalData;
    } else {
      console.error(`❌ ${dataType}数据同步验证失败`);
      throw new Error(`${dataType}数据同步验证失败`);
    }
    
  } catch (error) {
    console.error(`安全同步${dataType}到Firebase失败:`, error);
    // 记录同步失败状态
    localStorage.setItem(`msh_${dataType}_sync_status`, JSON.stringify({
      lastSyncTime: new Date().toISOString(),
      syncSuccess: false,
      error: error.message
    }));
    throw error;
  }
}

// 页面跳转同步管理
const PageNavigationSync = {
  // 检查是否正在同步
  isSyncing: false,
  
  // 页面跳转前同步
  async syncBeforeNavigation(targetUrl) {
    if (this.isSyncing) {
      console.log('正在同步中，等待完成...');
      return false;
    }
    
    this.isSyncing = true;
    
    try {
      // 显示同步提示
      const syncModal = this.showSyncModal('正在同步数据，请稍候...');
      
      // 同步所有数据
      const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
      const syncResults = [];
      
      for (const dataType of dataTypes) {
        const localData = JSON.parse(localStorage.getItem(`msh_${dataType}`) || '[]');
        if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
          try {
            await safeSyncToFirebase(localData, dataType);
            syncResults.push({ dataType, success: true });
          } catch (error) {
            syncResults.push({ dataType, success: false, error: error.message });
          }
        }
      }
      
      // 检查同步结果
      const failedSyncs = syncResults.filter(result => !result.success);
      
      if (failedSyncs.length > 0) {
        this.hideSyncModal(syncModal);
        const errorMessage = '同步失败的数据类型：\n' + 
          failedSyncs.map(f => `${f.dataType}: ${f.error}`).join('\n') + 
          '\n\n是否仍要继续跳转？';
        
        if (!confirm(errorMessage)) {
          this.isSyncing = false;
          return false;
        }
      }
      
      this.hideSyncModal(syncModal);
      this.isSyncing = false;
      return true;
      
    } catch (error) {
      this.hideSyncModal(syncModal);
      this.isSyncing = false;
      console.error('页面跳转同步失败:', error);
      return false;
    }
  },
  
  // 显示同步模态框
  showSyncModal(message) {
    const modal = document.createElement('div');
    modal.id = 'syncModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
      align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 30px; border-radius: 10px;
      text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 20px;">${message}</div>
      <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    return modal;
  },
  
  // 隐藏同步模态框
  hideSyncModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  },
  
  // 页面关闭前同步确认
  async syncBeforeClose(event) {
    // 检查是否有未同步的数据
    if (window.utils && window.utils.SyncStatusManager) {
      const hasUnsynced = window.utils.SyncStatusManager.hasUnsyncedData();
      
      if (hasUnsynced) {
        // 阻止默认关闭行为
        event.preventDefault();
        event.returnValue = '';
        
        // 显示同步确认对话框
        const shouldSync = confirm('检测到未同步的数据！\n\n是否在关闭页面前同步数据？\n\n点击"确定"进行同步\n点击"取消"直接关闭');
        
        if (shouldSync) {
          const syncSuccess = await this.syncBeforeNavigation(null);
          if (syncSuccess) {
            // 同步成功，允许关闭
            window.removeEventListener('beforeunload', this.syncBeforeClose);
            window.close();
          } else {
            // 同步失败，继续阻止关闭
            return '';
          }
        } else {
          // 用户选择不同步，显示警告
          const forceClose = confirm('⚠️ 警告：未同步的数据可能会丢失！\n\n确定要直接关闭页面吗？');
          if (forceClose) {
            window.removeEventListener('beforeunload', this.syncBeforeClose);
            window.close();
          } else {
            return '';
          }
        }
      }
    }
    
    return '';
  }
};

// 同步状态管理
const SyncStatusManager = {
  // 检查数据同步状态
  checkSyncStatus: function(dataType) {
    const statusKey = `msh_${dataType}_sync_status`;
    const status = localStorage.getItem(statusKey);
    
    if (!status) {
      return {
        hasSyncStatus: false,
        message: '未找到同步状态记录'
      };
    }
    
    try {
      const syncStatus = JSON.parse(status);
      const lastSyncTime = new Date(syncStatus.lastSyncTime);
      const now = new Date();
      const timeDiff = now - lastSyncTime;
      
      if (syncStatus.syncSuccess) {
        return {
          hasSyncStatus: true,
          isSuccess: true,
          lastSyncTime: syncStatus.lastSyncTime,
          timeDiff: timeDiff,
          message: `最后同步成功: ${lastSyncTime.toLocaleString()}`
        };
      } else {
        return {
          hasSyncStatus: true,
          isSuccess: false,
          lastSyncTime: syncStatus.lastSyncTime,
          error: syncStatus.error,
          message: `最后同步失败: ${lastSyncTime.toLocaleString()} - ${syncStatus.error}`
        };
      }
    } catch (error) {
      return {
        hasSyncStatus: false,
        message: '同步状态数据格式错误'
      };
    }
  },
  
  // 获取所有数据类型的同步状态
  getAllSyncStatus: function() {
    const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
    const statuses = {};
    
    dataTypes.forEach(dataType => {
      statuses[dataType] = this.checkSyncStatus(dataType);
    });
    
    return statuses;
  },
  
  // 检查是否有未同步的数据
  hasUnsyncedData: function() {
    const statuses = this.getAllSyncStatus();
    
    for (const dataType in statuses) {
      const status = statuses[dataType];
      if (!status.hasSyncStatus || !status.isSuccess) {
        return true;
      }
    }
    
    return false;
  },
  
  // 显示同步状态警告
  showSyncWarning: function() {
    const statuses = this.getAllSyncStatus();
    const warnings = [];
    
    for (const dataType in statuses) {
      const status = statuses[dataType];
      if (!status.hasSyncStatus || !status.isSuccess) {
        warnings.push(`${dataType}: ${status.message}`);
      }
    }
    
    if (warnings.length > 0) {
      const message = '⚠️ 数据同步警告:\n\n' + warnings.join('\n') + '\n\n建议在清理缓存前确保数据已同步到Firebase。';
      alert(message);
      return true;
    }
    
    return false;
  }
};

// 主动同步按钮管理
const SyncButtonManager = {
  button: null,
  hasLocalChanges: false,
  
  // 创建同步按钮
  createSyncButton() {
    const button = document.createElement('button');
    button.id = 'syncButton';
    button.innerHTML = '✅ 已同步';
    button.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      padding: 10px 15px; border: none; border-radius: 5px;
      background: #28a745; color: white; cursor: pointer;
      font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease; display: none;
    `;
    
    // 5秒后显示按钮
    setTimeout(() => {
      button.style.display = 'block';
      this.updateButtonStatus();
    }, 5000);
    
    // 点击事件
    button.addEventListener('click', async () => {
      await this.performSync(button);
    });
    
    document.body.appendChild(button);
    this.button = button;
    return button;
  },
  
  // 标记本地数据有更改
  markLocalChanges() {
    this.hasLocalChanges = true;
    this.updateButtonStatus();
  },
  
  // 更新按钮状态
  updateButtonStatus() {
    if (!this.button) return;
    
    if (this.hasLocalChanges) {
      this.button.innerHTML = '🔄 同步';
      this.button.style.background = '#6c757d';
    } else {
      this.button.innerHTML = '✅ 已同步';
      this.button.style.background = '#28a745';
    }
  },
  
  // 执行同步
  async performSync(button) {
    if (PageNavigationSync.isSyncing) {
      alert('正在同步中，请稍候...');
      return;
    }
    
    PageNavigationSync.isSyncing = true;
    
    try {
      // 更新按钮状态
      button.innerHTML = '🔄 同步中...';
      button.style.background = '#ffc107';
      button.disabled = true;
      
      // 同步所有数据
      const dataTypes = ['attendanceRecords', 'groups', 'groupNames'];
      const syncResults = [];
      
      for (const dataType of dataTypes) {
        const localData = JSON.parse(localStorage.getItem(`msh_${dataType}`) || '[]');
        if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
          try {
            await safeSyncToFirebase(localData, dataType);
            syncResults.push({ dataType, success: true });
          } catch (error) {
            syncResults.push({ dataType, success: false, error: error.message });
          }
        }
      }
      
      // 检查同步结果
      const failedSyncs = syncResults.filter(result => !result.success);
      
      if (failedSyncs.length === 0) {
        // 全部成功
        this.hasLocalChanges = false;
        button.innerHTML = '✅ 同步成功';
        button.style.background = '#28a745';
        setTimeout(() => {
          this.updateButtonStatus();
        }, 3000);
      } else {
        // 部分失败
        button.innerHTML = '❌ 同步失败';
        button.style.background = '#dc3545';
        setTimeout(() => {
          this.updateButtonStatus();
        }, 3000);
        
        // 显示错误详情
        const errorMessage = '同步失败的数据类型：\n' + 
          failedSyncs.map(f => `${f.dataType}: ${f.error}`).join('\n');
        alert(errorMessage);
      }
      
    } catch (error) {
      button.innerHTML = '❌ 同步失败';
      button.style.background = '#dc3545';
      setTimeout(() => {
        this.updateButtonStatus();
      }, 3000);
      
      alert('同步失败: ' + error.message);
    } finally {
      PageNavigationSync.isSyncing = false;
      button.disabled = false;
    }
  }
};

// 唯一标识符管理
const IdentifierManager = {
  // 验证手机号码格式
  validatePhoneNumber: function(phone) {
    if (!phone) return false;
    // 中国大陆手机号码正则表达式
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 检查手机号码是否已存在
  checkPhoneExists: function(phone, groups, excludeMember = null) {
    if (!phone) return false;
    
    for (const groupId in groups) {
      if (groups[groupId]) {
        for (const member of groups[groupId]) {
          if (member.phone === phone) {
            // 如果是同一个成员（编辑时），不算重复
            if (excludeMember && member === excludeMember) {
              continue;
            }
            return true;
          }
        }
      }
    }
    return false;
  },

  // 生成唯一ID（如果不存在）
  ensureUniqueId: function(member, groupId) {
    if (!member.id) {
      // 如果没有ID，生成一个
      const prefix = getGroupPrefix(groupId);
      const existingIds = this.getAllExistingIds();
      let newId;
      let counter = 1;
      
      do {
        newId = prefix + String(counter).padStart(3, '0');
        counter++;
      } while (existingIds.has(newId));
      
      member.id = newId;
    }
    return member.id;
  },

  // 获取所有现有ID
  getAllExistingIds: function() {
    const ids = new Set();
    // 这里需要访问全局groups变量，在实际使用时传入
    return ids;
  },

  // 验证成员标识符
  validateMemberIdentifiers: function(member, groups, excludeMember = null) {
    const errors = [];
    
    // 验证手机号码
    if (member.phone && !this.validatePhoneNumber(member.phone)) {
      errors.push('手机号码格式不正确');
    }
    
    // 检查手机号码重复
    if (member.phone && this.checkPhoneExists(member.phone, groups, excludeMember)) {
      errors.push('手机号码已存在');
    }
    
    return errors;
  }
};

// 获取小组前缀（从admin.js复制）
function getGroupPrefix(groupId) {
  const groupPrefixes = {
    '陈薛尚': 'AA', '乐清1组': 'AB', '乐清2组': 'AC', '乐清3组': 'AD',
    '乐清4组': 'AE', '乐清5组': 'AF', '乐清6组': 'AG', '乐清7组': 'AH',
    '乐清8组': 'AI', '乐清9组': 'AJ', '乐清10组': 'AK', '美团组': 'AL',
    '未分组': 'AM'
  };
  if (groupPrefixes[groupId]) return groupPrefixes[groupId];
  const usedPrefixes = new Set(Object.values(groupPrefixes));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const prefix = letters[i] + letters[j];
      if (!usedPrefixes.has(prefix)) return prefix;
    }
  }
  return 'ZZ'; // Fallback
}

// 异步数据同步增强
class AsyncDataSync {
  constructor() {
    this.workerManager = null;
    this.syncQueue = [];
    this.isProcessing = false;
  }

  // 初始化Worker管理器
  initWorkerManager() {
    if (window.workerManager && !this.workerManager) {
      this.workerManager = window.workerManager;
    }
  }

  // 异步数据同步
  async syncDataAsync(localData, remoteData, conflictResolution = 'newest') {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程同步');
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'SYNC_DATA',
        data: {
          localData,
          remoteData,
          conflictResolution
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步同步失败:', error);
      return this.syncDataMainThread(localData, remoteData, conflictResolution);
    }
  }

  // 主线程数据同步（回退方案）
  syncDataMainThread(localData, remoteData, conflictResolution) {
    const startTime = performance.now();
    
    try {
      const conflicts = DataConflictResolver.detectConflicts(localData, remoteData, 'attendanceRecords');
      const mergedData = DataMergeStrategy.mergeData(localData, remoteData, conflictResolution);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return {
        mergedData,
        conflicts,
        processingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('主线程同步失败:', error);
      throw error;
    }
  }

  // 异步大数据集处理
  async processLargeDatasetAsync(dataset, operation, options) {
    this.initWorkerManager();
    
    if (!this.workerManager) {
      console.warn('Worker管理器不可用，使用主线程处理');
      return this.processLargeDatasetMainThread(dataset, operation, options);
    }

    try {
      const result = await this.workerManager.addTask({
        type: 'PROCESS_LARGE_DATASET',
        data: {
          dataset,
          operation,
          options
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('异步处理失败:', error);
      return this.processLargeDatasetMainThread(dataset, operation, options);
    }
  }

  // 主线程大数据集处理（回退方案）
  processLargeDatasetMainThread(dataset, operation, options) {
    const startTime = performance.now();
    
    let result;
    switch (operation) {
      case 'SORT':
        result = dataset.sort((a, b) => {
          const aVal = a[options.key];
          const bVal = b[options.key];
          return options.order === 'desc' ? bVal > aVal : aVal > bVal;
        });
        break;
      case 'FILTER':
        result = dataset.filter(item => {
          switch (options.filter) {
            case 'equals':
              return item[options.field] === options.value;
            case 'contains':
              return item[options.field] && item[options.field].includes(options.value);
            default:
              return true;
          }
        });
        break;
      case 'SEARCH':
        result = dataset.filter(item => 
          options.fields.some(field => 
            item[field] && item[field].toLowerCase().includes(options.query.toLowerCase())
          )
        );
        break;
      default:
        result = dataset;
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      result,
      operation,
      processingTime,
      timestamp: Date.now()
    };
  }
}

// 创建全局异步同步实例
const asyncDataSync = new AsyncDataSync();

// 导出函数到全局作用域
if (typeof window !== 'undefined') {
  window.utils = {
    loadExcludedMembers,
    sortGroups,
    sortMembersByName,
    isMemberExcluded,
    filterExcludedMembers,
    getAttendanceType,
    formatDateToChinese,
    getTodayString,
    isTodayNewcomer,
    dataSyncManager,
    safeSyncToFirebase,
    SyncStatusManager,
    PageNavigationSync,
    SyncButtonManager,
    DataConflictResolver,
    DataMergeStrategy,
    IdentifierManager,
    AsyncDataSync,
    asyncDataSync
  };
}
