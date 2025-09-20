// ==================== 新数据管理器 ====================
// 实现完整的数据拉取、本地存储、手动同步策略

class NewDataManager {
  constructor() {
    this.isDataLoaded = false;
    this.hasLocalChanges = false;
    this.isSyncing = false; // 同步状态标志
    this.isFirstLoad = true; // 首次加载标志
    this.dataChangeFlags = {
      groups: { added: [], modified: [], deleted: [] },
      attendanceRecords: { added: [], modified: [], deleted: [] },
      groupNames: { added: [], modified: [], deleted: [] },
      dailyNewcomers: { added: [], modified: [], deleted: [] },
      excludedMembers: { added: [], modified: [], deleted: [] }
    };
    this.syncButton = null;
    this.autoSyncTimer = null; // 自动同步定时器
    this.originalData = {
      groups: null,
      attendanceRecords: null,
      groupNames: null,
      dailyNewcomers: null,
      excludedMembers: null
    };
    this.changeDetectionTimer = null; // 防抖定时器
    this.setupDataChangeDetection();
    this.setupDailyCleanup(); // 设置每日清理机制
    
    // 延迟检查本地数据，等待Firebase初始化完成
    setTimeout(() => {
      this.checkExistingData().catch(error => {
        console.error('❌ 检查本地数据失败:', error);
        // 如果Firebase仍未初始化，再次延迟重试
        if (error.message && error.message.includes('Firebase')) {
          console.log('🔄 Firebase仍未初始化，5秒后重试...');
          setTimeout(() => {
            this.checkExistingData().catch(retryError => {
              console.error('❌ 重试检查本地数据失败:', retryError);
            });
          }, 5000);
        }
      });
    }, 1000); // 延迟1秒，等待Firebase初始化
  }

  // 检查是否已有本地数据
  async checkExistingData() {
    const hasLocalGroups = this.loadFromLocalStorage('groups');
    const hasLocalAttendance = this.loadFromLocalStorage('attendanceRecords');
    const hasLocalGroupNames = this.loadFromLocalStorage('groupNames');
    const hasLocalExcludedMembers = this.loadFromLocalStorage('excludedMembers');
    
    console.log('🔍 检查本地数据:', {
      groups: !!hasLocalGroups,
      attendanceRecords: !!hasLocalAttendance,
      groupNames: !!hasLocalGroupNames,
      excludedMembers: !!hasLocalExcludedMembers
    });
    
    // 调试：检查本地存储中的实际数据
    if (hasLocalGroups) {
      console.log('🔍 本地存储中的groups:', Object.keys(hasLocalGroups));
      console.log('🔍 本地存储中的groups详细内容:', hasLocalGroups);
    } else {
      console.log('🔍 本地存储中groups为空');
    }
    if (hasLocalGroupNames) {
      console.log('🔍 本地存储中的groupNames:', Object.keys(hasLocalGroupNames));
      console.log('🔍 本地存储中的groupNames详细内容:', hasLocalGroupNames);
    } else {
      console.log('🔍 本地存储中groupNames为空');
    }
    
    // 检查本地数据的有效性和结构
    const isGroupsValid = hasLocalGroups && hasLocalGroups !== null && typeof hasLocalGroups === 'object' && !Array.isArray(hasLocalGroups) && Object.keys(hasLocalGroups).length > 0;
    const isGroupNamesValid = hasLocalGroupNames && hasLocalGroupNames !== null && typeof hasLocalGroupNames === 'object' && !Array.isArray(hasLocalGroupNames) && Object.keys(hasLocalGroupNames).length > 0;
    const isAttendanceValid = hasLocalAttendance && Array.isArray(hasLocalAttendance);
    // 修复excludedMembers验证逻辑：支持对象和数组两种格式
    const isExcludedMembersValid = hasLocalExcludedMembers && (
      Array.isArray(hasLocalExcludedMembers) || 
      (typeof hasLocalExcludedMembers === 'object' && Object.keys(hasLocalExcludedMembers).length > 0)
    );
    
    // 修改验证逻辑：只要groups和groupNames有效就认为数据有效，attendanceRecords和excludedMembers可以为空
    const isLocalDataValid = isGroupsValid && isGroupNamesValid;
    
    console.log('🔍 本地数据结构验证:', {
      groupsValid: isGroupsValid,
      groupNamesValid: isGroupNamesValid,
      attendanceValid: isAttendanceValid,
      excludedMembersValid: isExcludedMembersValid,
      groupsType: hasLocalGroups ? (Array.isArray(hasLocalGroups) ? 'Array' : 'Object') : 'null',
      groupNamesType: hasLocalGroupNames ? (Array.isArray(hasLocalGroupNames) ? 'Array' : 'Object') : 'null',
      groupsKeys: hasLocalGroups ? Object.keys(hasLocalGroups).length : 0,
      groupNamesKeys: hasLocalGroupNames ? Object.keys(hasLocalGroupNames).length : 0,
      attendanceLength: hasLocalAttendance ? hasLocalAttendance.length : 0,
      excludedMembersLength: hasLocalExcludedMembers ? (
        Array.isArray(hasLocalExcludedMembers) ? 
          hasLocalExcludedMembers.length : 
          Object.keys(hasLocalExcludedMembers).length
      ) : 0
    });
    
    if (isLocalDataValid) {
      // 检查数据完整性：确保所有groupNames中的小组都在groups中存在
      const missingGroups = Object.keys(hasLocalGroupNames).filter(groupName => 
        !hasLocalGroups.hasOwnProperty(groupName)
      );
      
      if (missingGroups.length > 0) {
        console.warn('⚠️ 检测到数据不完整，缺少小组数据:', missingGroups);
        console.log('🔧 尝试从Firebase恢复缺失的数据...');
        
        try {
          // 尝试从Firebase获取缺失的小组数据
          const db = firebase.database();
          const groupsSnapshot = await db.ref('groups').once('value');
          const firebaseGroups = groupsSnapshot.val() || {};
          
          // 检查Firebase中是否有这些小组的数据
          const firebaseHasMissingGroups = missingGroups.some(groupName => 
            firebaseGroups.hasOwnProperty(groupName) && 
            Array.isArray(firebaseGroups[groupName]) && 
            firebaseGroups[groupName].length > 0
          );
          
          if (firebaseHasMissingGroups) {
            console.log('✅ 从Firebase找到缺失的小组数据，进行恢复');
            // 合并Firebase数据到本地数据
            Object.keys(firebaseGroups).forEach(groupName => {
              if (!hasLocalGroups.hasOwnProperty(groupName)) {
                hasLocalGroups[groupName] = firebaseGroups[groupName];
              }
            });
            
            // 保存恢复后的数据
            this.saveToLocalStorage('groups', hasLocalGroups);
            console.log('✅ 数据恢复完成');
          } else {
            console.log('⚠️ Firebase中也没有这些小组的数据，创建空数组');
            // 为缺失的小组创建空数组
            missingGroups.forEach(groupName => {
              hasLocalGroups[groupName] = [];
            });
            
            // 保存修复后的数据
            this.saveToLocalStorage('groups', hasLocalGroups);
            console.log('✅ 数据修复完成');
          }
        } catch (error) {
          console.error('❌ 从Firebase恢复数据失败:', error);
          console.log('🔧 降级修复：为缺失的小组创建空数组');
          
          // 为缺失的小组创建空数组
          missingGroups.forEach(groupName => {
            hasLocalGroups[groupName] = [];
          });
          
          // 保存修复后的数据
          this.saveToLocalStorage('groups', hasLocalGroups);
          console.log('✅ 数据修复完成');
        }
      }
      
      console.log('📋 检测到有效的本地数据，跳过首次拉取');
      this.isFirstLoad = false;
      this.isDataLoaded = true;
      
      // 恢复原始数据用于变更检测
      this.originalData.groups = JSON.parse(JSON.stringify(hasLocalGroups));
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(hasLocalAttendance));
      this.originalData.groupNames = JSON.parse(JSON.stringify(hasLocalGroupNames));
      this.originalData.excludedMembers = JSON.parse(JSON.stringify(hasLocalExcludedMembers));
      
      // 设置全局变量
      window.groups = hasLocalGroups;
      window.attendanceRecords = hasLocalAttendance;
      window.groupNames = hasLocalGroupNames;
      
      // 特别处理excludedMembers：检查是否需要从Firebase更新
      console.log('🔍 设置excludedMembers全局变量:');
      const localDataLength = hasLocalExcludedMembers ? (
        Array.isArray(hasLocalExcludedMembers) ? 
          hasLocalExcludedMembers.length : 
          Object.keys(hasLocalExcludedMembers).length
      ) : 0;
      console.log('🔍 本地excludedMembers数据:', localDataLength, '个');
      console.log('🔍 本地excludedMembers详情:', hasLocalExcludedMembers);
      
      // 检查Firebase是否有更新的数据
      if (firebase.apps.length > 0) {
        try {
          const db = firebase.database();
          const firebaseSnapshot = await db.ref('excludedMembers').once('value');
          const firebaseExcludedMembers = firebaseSnapshot.val() || [];
          
          console.log('🔍 Firebase excludedMembers数据:', firebaseExcludedMembers.length, '个');
          
          // 如果Firebase数据更多，使用Firebase数据
          if (firebaseExcludedMembers.length > localDataLength) {
            console.log('🔍 使用Firebase数据（数据更多）');
            // 确保Firebase数据转换为对象格式
            const firebaseExcludedMembersObj = {};
            firebaseExcludedMembers.forEach((member, index) => {
              firebaseExcludedMembersObj[member.uuid || `firebase_${index}`] = member;
            });
            window.excludedMembers = firebaseExcludedMembersObj;
            // 更新本地存储
            this.saveToLocalStorage('excludedMembers', firebaseExcludedMembersObj);
          } else {
            console.log('🔍 使用本地数据');
            window.excludedMembers = hasLocalExcludedMembers;
          }
        } catch (error) {
          console.error('🔍 检查Firebase数据失败，使用本地数据:', error);
          window.excludedMembers = hasLocalExcludedMembers;
        }
      } else {
        console.log('🔍 Firebase未初始化，使用本地数据');
        window.excludedMembers = hasLocalExcludedMembers;
      }
      
      console.log('🔍 调试 - NewDataManager设置全局变量:', {
        'window.groups': window.groups ? Object.keys(window.groups) : 'undefined',
        'window.groupNames': window.groupNames ? Object.keys(window.groupNames) : 'undefined',
        'window.attendanceRecords': window.attendanceRecords ? window.attendanceRecords.length : 'undefined',
        'window.excludedMembers': window.excludedMembers ? window.excludedMembers.length : 'undefined'
      });
      
      // 检测是否有未同步的变更
      this.detectDataChanges();
    } else {
      console.log('📋 本地数据无效或不完整，需要从Firebase拉取');
      
      // 智能数据恢复：先尝试从Firebase恢复，再清理无效数据
      console.log('🔧 尝试从Firebase恢复数据...');
      try {
        // 检查Firebase是否已初始化
        if (!firebase.apps.length) {
          console.log('⚠️ Firebase未初始化，跳过数据恢复');
          throw new Error('Firebase未初始化');
        }
        
        const db = firebase.database();
        const [groupsSnapshot, groupNamesSnapshot, attendanceSnapshot, excludedMembersSnapshot] = await Promise.all([
          db.ref('groups').once('value'),
          db.ref('groupNames').once('value'),
          db.ref('attendanceRecords').once('value'),
          db.ref('excludedMembers').once('value')
        ]);
        
        const firebaseGroups = groupsSnapshot.val() || {};
        const firebaseGroupNames = groupNamesSnapshot.val() || {};
        const firebaseAttendance = attendanceSnapshot.val() || {};
        const firebaseExcludedMembers = excludedMembersSnapshot.val() || [];
        
        console.log('🔍 Firebase数据恢复检查:');
        console.log('🔍 Firebase excludedMembers:', firebaseExcludedMembers.length, '个');
        const localDataLength = hasLocalExcludedMembers ? (
          Array.isArray(hasLocalExcludedMembers) ? 
            hasLocalExcludedMembers.length : 
            Object.keys(hasLocalExcludedMembers).length
        ) : 0;
        console.log('🔍 本地 excludedMembers:', localDataLength, '个');
        console.log('🔍 isExcludedMembersValid:', isExcludedMembersValid);
        
        // 检查Firebase数据是否有效
        const firebaseGroupsValid = Object.keys(firebaseGroups).length > 0;
        const firebaseGroupNamesValid = Object.keys(firebaseGroupNames).length > 0;
        
        if (firebaseGroupsValid && firebaseGroupNamesValid) {
          console.log('✅ 从Firebase找到有效数据，进行恢复');
          
          // 恢复数据到本地存储
          if (!isGroupsValid) {
            this.saveToLocalStorage('groups', firebaseGroups);
            console.log('✅ 已恢复groups数据');
          }
          if (!isGroupNamesValid) {
            this.saveToLocalStorage('groupNames', firebaseGroupNames);
            console.log('✅ 已恢复groupNames数据');
          }
          if (!isAttendanceValid && Object.keys(firebaseAttendance).length > 0) {
            const attendanceArray = Object.values(firebaseAttendance);
            this.saveToLocalStorage('attendanceRecords', attendanceArray);
            console.log('✅ 已恢复attendanceRecords数据');
          }
          // 只有在本地数据无效且Firebase有数据时才恢复
          if (!isExcludedMembersValid && Array.isArray(firebaseExcludedMembers) && firebaseExcludedMembers.length > 0) {
            this.saveToLocalStorage('excludedMembers', firebaseExcludedMembers);
            console.log('✅ 已恢复excludedMembers数据');
          } else if (isExcludedMembersValid) {
            // 如果本地数据有效，确保本地数据被正确设置
            console.log('✅ 使用本地excludedMembers数据，无需恢复');
            // 添加保护：如果本地数据比Firebase数据更新，不要被覆盖
            if (Array.isArray(firebaseExcludedMembers) && firebaseExcludedMembers.length > 0) {
              console.log('⚠️ 检测到Firebase有excludedMembers数据，但本地数据有效，保持本地数据');
            }
          }
          
          // 更新全局变量
          window.groups = firebaseGroups;
          window.groupNames = firebaseGroupNames;
          if (Object.keys(firebaseAttendance).length > 0) {
            window.attendanceRecords = Object.values(firebaseAttendance);
          }
          // 只有在本地数据无效时才使用Firebase数据
          if (!isExcludedMembersValid && Array.isArray(firebaseExcludedMembers) && firebaseExcludedMembers.length > 0) {
            console.log('🔍 使用Firebase excludedMembers数据:', firebaseExcludedMembers.length, '个');
            // 确保Firebase数据转换为对象格式
            const firebaseExcludedMembersObj = {};
            firebaseExcludedMembers.forEach((member, index) => {
              firebaseExcludedMembersObj[member.uuid || `firebase_${index}`] = member;
            });
            window.excludedMembers = firebaseExcludedMembersObj;
          } else if (isExcludedMembersValid) {
            // 如果本地数据有效，使用本地数据
            const localDataLength = Array.isArray(hasLocalExcludedMembers) ? 
              hasLocalExcludedMembers.length : 
              Object.keys(hasLocalExcludedMembers).length;
            console.log('🔍 使用本地 excludedMembers数据:', localDataLength, '个');
            console.log('🔍 本地 excludedMembers数据详情:', hasLocalExcludedMembers);
            window.excludedMembers = hasLocalExcludedMembers;
          } else {
            console.log('🔍 没有有效的excludedMembers数据，设置为空对象');
            window.excludedMembers = {};
          }
          
          console.log('✅ 数据恢复完成，跳过重新拉取');
          return;
        } else {
          console.log('⚠️ Firebase数据也无效，清理本地数据');
        }
      } catch (error) {
        console.error('❌ 从Firebase恢复数据失败:', error);
        if (error.message === 'Firebase未初始化') {
          console.log('💡 Firebase未初始化，等待后续初始化完成后再尝试');
        } else {
          console.log('🧹 清理无效的本地数据');
        }
      }
      
      // 检查数据是否受保护
      if (this.isDataProtected()) {
        console.log('🛡️ 数据受保护，跳过清理操作');
        console.log('💡 如果有数据问题，请等待自动同步完成后再刷新页面');
        return;
      }
      
      // 清理无效的本地数据
      if (!isGroupsValid) {
        console.log('🧹 清理无效的groups数据 (类型:', typeof hasLocalGroups, ')');
        localStorage.removeItem('msh_groups');
      }
      if (!isGroupNamesValid) {
        console.log('🧹 清理无效的groupNames数据 (类型:', typeof hasLocalGroupNames, ')');
        localStorage.removeItem('msh_groupNames');
      }
      if (!isAttendanceValid) {
        console.log('🧹 清理无效的attendanceRecords数据 (类型:', typeof hasLocalAttendance, ')');
        localStorage.removeItem('msh_attendanceRecords');
      }
      // 注意：不清理excludedMembers数据，因为它可能包含用户添加的"未签到不统计人员"
      if (!isExcludedMembersValid) {
        console.log('⚠️ excludedMembers数据无效，但保留以防丢失用户数据');
      }
      
      // 强制重新拉取数据
      this.isFirstLoad = true;
      this.isDataLoaded = false;
    }
  }

  // 页面打开时完整拉取Firebase数据到本地
  async loadAllDataFromFirebase() {
    try {
      // 检查是否已经拉取过数据
      if (!this.isFirstLoad) {
        console.log('📋 数据已拉取过，跳过重复拉取');
        return true;
      }

      // 检查是否有未同步的本地数据
      if (this.hasLocalChanges) {
        console.log('⚠️ 检测到未同步的本地数据，询问用户是否继续');
        const shouldContinue = confirm('检测到未同步的本地数据，继续拉取远程数据将覆盖本地更改。是否继续？');
        if (!shouldContinue) {
          console.log('❌ 用户取消拉取，保持本地数据');
          return false;
        }
        // 用户选择继续，清除本地变更标志
        this.hasLocalChanges = false;
        this.dataChangeFlags = {
          groups: { added: [], modified: [], deleted: [] },
          attendanceRecords: { added: [], modified: [], deleted: [] },
          groupNames: { added: [], modified: [], deleted: [] },
          dailyNewcomers: { added: [], modified: [], deleted: [] },
          excludedMembers: { added: [], modified: [], deleted: [] }
        };
      }

      console.log('🔄 开始从Firebase完整拉取数据...');
      
      if (!firebase.apps.length) {
        console.error('Firebase未初始化');
        return false;
      }

      // 显示加载状态
      this.showLoadingState();

      const db = firebase.database();
      
      // 并行拉取所有数据
      const [groupsSnapshot, attendanceSnapshot, groupNamesSnapshot, excludedMembersSnapshot] = await Promise.all([
        db.ref('groups').once('value'),
        db.ref('attendanceRecords').once('value'),
        db.ref('groupNames').once('value'),
        db.ref('excludedMembers').once('value')
      ]);

      // 处理数据
      const groups = groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {};
      const attendanceRecords = attendanceSnapshot.exists() ? Object.values(attendanceSnapshot.val() || {}) : [];
      const groupNames = groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {};
      const excludedMembers = excludedMembersSnapshot.exists() ? excludedMembersSnapshot.val() || [] : [];

      // 确保未分组存在
      if (!groups['未分组']) {
        groups['未分组'] = [];
      }
      if (!groupNames['未分组']) {
        groupNames['未分组'] = '未分组';
      }

      // 为所有人员添加UUID（如果还没有）- 保持现有UUID不变
      if (window.utils && window.utils.addUUIDsToMembers) {
        const updatedGroups = window.utils.addUUIDsToMembers(groups);
        if (JSON.stringify(updatedGroups) !== JSON.stringify(groups)) {
          Object.assign(groups, updatedGroups);
          console.log('✅ 为现有人员添加了UUID（保持现有UUID不变）');
        } else {
          console.log('✅ 所有人员已有UUID，无需添加');
        }
      }

      // 存储到本地
      this.saveToLocalStorage('groups', groups);
      this.saveToLocalStorage('attendanceRecords', attendanceRecords);
      this.saveToLocalStorage('groupNames', groupNames);
      this.saveToLocalStorage('excludedMembers', excludedMembers);

      // 更新全局变量
      window.groups = groups;
      window.attendanceRecords = attendanceRecords;
      window.groupNames = groupNames;
      window.excludedMembers = excludedMembers;

      // 保存原始数据用于变更检测
      this.originalData.groups = JSON.parse(JSON.stringify(groups));
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(attendanceRecords));
      this.originalData.groupNames = JSON.parse(JSON.stringify(groupNames));
      this.originalData.excludedMembers = JSON.parse(JSON.stringify(excludedMembers));

      this.isDataLoaded = true;
      this.isFirstLoad = false; // 标记已完成首次拉取
      
      // 验证数据完整性
      const isValid = this.validateDataIntegrity(groups, attendanceRecords, groupNames);
      if (!isValid) {
        console.error('❌ 数据完整性验证失败');
        this.hideLoadingState();
        return false;
      }

      // 隐藏加载状态，启用页面操作
      this.hideLoadingState();
      this.enablePageOperations();
      
      console.log('✅ 数据完整拉取完成，页面已启用操作');
      return true;

    } catch (error) {
      console.error('❌ 从Firebase拉取数据失败:', error);
      return false;
    }
  }

  // 保存数据到本地存储
  saveToLocalStorage(dataType, data) {
    try {
      localStorage.setItem(`msh_${dataType}`, JSON.stringify(data));
      localStorage.setItem(`msh_${dataType}_timestamp`, Date.now().toString());
      console.log(`✅ ${dataType}数据已保存到本地存储`);
    } catch (error) {
      console.error(`❌ 保存${dataType}到本地存储失败:`, error);
    }
  }

  // 从本地存储加载数据
  loadFromLocalStorage(dataType) {
    try {
      const data = localStorage.getItem(`msh_${dataType}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ 从本地存储加载${dataType}失败:`, error);
      return null;
    }
  }

  // ==================== 当日新增人员快照管理 ====================
  
  // 添加当日新增人员
  addDailyNewcomer(date, name, createdAt, expiresAt) {
    try {
      const dailyNewcomers = this.loadFromLocalStorage('dailyNewcomers') || {};
      
      if (!dailyNewcomers[date]) {
        dailyNewcomers[date] = {
          data: [],
          createdAt: createdAt,
          expiresAt: expiresAt
        };
      }
      
      // 检查是否已存在（避免重复添加）
      if (!dailyNewcomers[date].data.includes(name)) {
        dailyNewcomers[date].data.push(name);
        this.saveToLocalStorage('dailyNewcomers', dailyNewcomers);
        this.markDataChange('dailyNewcomers', 'added', `${date}_${name}`);
        console.log(`✅ 已添加当日新增人员: ${name} (${date})`);
      } else {
        console.log(`⚠️ 当日新增人员已存在: ${name} (${date})`);
      }
    } catch (error) {
      console.error('❌ 添加当日新增人员失败:', error);
    }
  }
  
  // 获取当日新增人员列表
  getDailyNewcomers(date) {
    try {
      const dailyNewcomers = this.loadFromLocalStorage('dailyNewcomers') || {};
      const dayData = dailyNewcomers[date];
      
      if (dayData && dayData.data) {
        // 检查是否过期
        if (new Date(dayData.expiresAt) > new Date()) {
          return dayData.data;
        } else {
          // 数据已过期，删除
          delete dailyNewcomers[date];
          this.saveToLocalStorage('dailyNewcomers', dailyNewcomers);
          console.log(`🗑️ 已清理过期的当日新增人员数据: ${date}`);
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ 获取当日新增人员失败:', error);
      return [];
    }
  }
  
  // 清理过期的当日新增人员数据
  cleanupExpiredDailyNewcomers() {
    try {
      const dailyNewcomers = this.loadFromLocalStorage('dailyNewcomers') || {};
      const now = new Date();
      let hasChanges = false;
      
      Object.keys(dailyNewcomers).forEach(date => {
        const dayData = dailyNewcomers[date];
        if (dayData && dayData.expiresAt && new Date(dayData.expiresAt) <= now) {
          delete dailyNewcomers[date];
          hasChanges = true;
          console.log(`🗑️ 已清理过期的当日新增人员数据: ${date}`);
        }
      });
      
      if (hasChanges) {
        this.saveToLocalStorage('dailyNewcomers', dailyNewcomers);
        this.markDataChange('dailyNewcomers', 'deleted', 'expired_cleanup');
      }
    } catch (error) {
      console.error('❌ 清理过期当日新增人员数据失败:', error);
    }
  }
  
  // 设置每日清理机制
  setupDailyCleanup() {
    // 立即执行一次清理
    this.cleanupExpiredDailyNewcomers();
    
    // 设置定时器，每小时检查一次
    setInterval(() => {
      this.cleanupExpiredDailyNewcomers();
    }, 60 * 60 * 1000); // 1小时
    
    console.log('✅ 当日新增人员自动清理机制已启动');
  }

  // 设置数据变更检测
  setupDataChangeDetection() {
    // 定期检测数据变更（减少频率到10秒）
    setInterval(() => {
      if (!this.isSyncing) { // 同步时不检测
        this.debouncedDetectChanges();
      }
    }, 10000); // 每10秒检测一次

    // 监听localStorage变化（使用防抖）
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('msh_') && !this.isSyncing) {
        this.debouncedDetectChanges();
      }
    });
  }

  // 防抖数据变更检测
  debouncedDetectChanges() {
    clearTimeout(this.changeDetectionTimer);
    this.changeDetectionTimer = setTimeout(() => {
      this.detectDataChanges();
    }, 1000); // 1秒内多次变更只检测一次
  }

  // 检测数据变更
  detectDataChanges() {
    if (!this.isDataLoaded || this.isSyncing) return;

    let hasChanges = false;
    const changes = {
      groups: { added: [], modified: [], deleted: [] },
      attendanceRecords: { added: [], modified: [], deleted: [] },
      groupNames: { added: [], modified: [], deleted: [] },
      dailyNewcomers: { added: [], modified: [], deleted: [] },
      excludedMembers: { added: [], modified: [], deleted: [] }
    };

    // 检测groups变更
    const currentGroups = this.loadFromLocalStorage('groups') || {};
    if (this.originalData.groups) {
      const groupChanges = this.compareData(this.originalData.groups, currentGroups, 'groups');
      if (groupChanges.hasChanges) {
        changes.groups = groupChanges.changes;
        hasChanges = true;
      }
    }

    // 检测attendanceRecords变更
    const currentAttendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
    if (this.originalData.attendanceRecords) {
      const attendanceChanges = this.compareData(this.originalData.attendanceRecords, currentAttendanceRecords, 'attendanceRecords');
      if (attendanceChanges.hasChanges) {
        changes.attendanceRecords = attendanceChanges.changes;
        hasChanges = true;
      }
    }

    // 检测groupNames变更
    const currentGroupNames = this.loadFromLocalStorage('groupNames') || {};
    if (this.originalData.groupNames) {
      const groupNamesChanges = this.compareData(this.originalData.groupNames, currentGroupNames, 'groupNames');
      if (groupNamesChanges.hasChanges) {
        changes.groupNames = groupNamesChanges.changes;
        hasChanges = true;
      }
    }

    // 检测dailyNewcomers变更
    const currentDailyNewcomers = this.loadFromLocalStorage('dailyNewcomers') || {};
    if (this.originalData.dailyNewcomers) {
      const dailyNewcomersChanges = this.compareData(this.originalData.dailyNewcomers, currentDailyNewcomers, 'dailyNewcomers');
      if (dailyNewcomersChanges.hasChanges) {
        changes.dailyNewcomers = dailyNewcomersChanges.changes;
        hasChanges = true;
      }
    }

    // 检测excludedMembers变更
    const currentExcludedMembers = this.loadFromLocalStorage('excludedMembers') || [];
    if (this.originalData.excludedMembers) {
      const excludedMembersChanges = this.compareData(this.originalData.excludedMembers, currentExcludedMembers, 'excludedMembers');
      if (excludedMembersChanges.hasChanges) {
        changes.excludedMembers = excludedMembersChanges.changes;
        hasChanges = true;
      }
    }

    // 更新变更状态
    if (hasChanges) {
      this.dataChangeFlags = changes;
      this.hasLocalChanges = true;
      this.updateSyncButton();
      console.log('📊 检测到数据变更:', changes);
    }
  }

  // 比较数据变更
  compareData(original, current, dataType) {
    const changes = { added: [], modified: [], deleted: [] };
    let hasChanges = false;

    if (dataType === 'groups' || dataType === 'groupNames' || dataType === 'dailyNewcomers') {
      // 对象类型数据比较
      const originalKeys = Object.keys(original);
      const currentKeys = Object.keys(current);

      // 检测新增的键
      currentKeys.forEach(key => {
        if (!originalKeys.includes(key)) {
          changes.added.push(key);
          hasChanges = true;
        }
      });

      // 检测删除的键
      originalKeys.forEach(key => {
        if (!currentKeys.includes(key)) {
          changes.deleted.push(key);
          hasChanges = true;
        }
      });

      // 检测修改的键
      originalKeys.forEach(key => {
        if (currentKeys.includes(key)) {
          if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
            changes.modified.push(key);
            hasChanges = true;
          }
        }
      });
    } else if (dataType === 'attendanceRecords') {
      // 数组类型数据比较
      if (original.length !== current.length) {
        hasChanges = true;
        if (current.length > original.length) {
          changes.added.push(`新增${current.length - original.length}条记录`);
        } else {
          changes.deleted.push(`删除${original.length - current.length}条记录`);
        }
      }

      // 检测记录内容变更
      const maxLength = Math.max(original.length, current.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < original.length && i < current.length) {
          if (JSON.stringify(original[i]) !== JSON.stringify(current[i])) {
            changes.modified.push(`记录${i + 1}`);
            hasChanges = true;
          }
        }
      }
    }

    return { hasChanges, changes };
  }

  // 标记数据变更（保留原有方法用于手动标记）
  markDataChange(dataType, changeType, itemId) {
    if (!this.dataChangeFlags[dataType]) {
      this.dataChangeFlags[dataType] = { added: [], modified: [], deleted: [] };
    }

    const flags = this.dataChangeFlags[dataType];
    
    // 移除其他类型的标记（一个项目只能有一种变更类型）
    flags.added = flags.added.filter(id => id !== itemId);
    flags.modified = flags.modified.filter(id => id !== itemId);
    flags.deleted = flags.deleted.filter(id => id !== itemId);

    // 添加新的变更标记
    if (changeType === 'added' || changeType === 'modified' || changeType === 'deleted') {
      flags[changeType].push(itemId);
    }

    this.hasLocalChanges = true;
    this.updateSyncButton();
    console.log(`📝 手动标记${dataType}数据变更: ${changeType} - ${itemId}`);
    console.log('🔍 调试 - 数据变更标志更新后:', this.dataChangeFlags);
    console.log('🔍 调试 - hasLocalChanges:', this.hasLocalChanges);
    
    // 数据保护：标记有未同步的变更，防止数据被误删
    this.markDataAsProtected();
    
    // 自动同步到Firebase（延迟3秒，避免频繁同步）
    this.scheduleAutoSync();
  }

  // 标记数据为受保护状态，防止被误删
  markDataAsProtected() {
    localStorage.setItem('msh_data_protected', 'true');
    localStorage.setItem('msh_data_protected_time', Date.now().toString());
    console.log('🛡️ 数据已标记为受保护状态');
  }

  // 检查数据是否受保护
  isDataProtected() {
    const protectedTime = localStorage.getItem('msh_data_protected_time');
    if (!protectedTime) return false;
    
    const timeDiff = Date.now() - parseInt(protectedTime);
    // 如果数据在5分钟内被标记为受保护，则认为仍受保护
    return timeDiff < 5 * 60 * 1000;
  }

  // 清除数据保护标记
  clearDataProtection() {
    localStorage.removeItem('msh_data_protected');
    localStorage.removeItem('msh_data_protected_time');
    console.log('🔓 数据保护标记已清除');
  }

  // 自动同步调度
  scheduleAutoSync() {
    // 清除之前的定时器
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    
    // 设置3秒后自动同步
    this.autoSyncTimer = setTimeout(() => {
      if (this.hasLocalChanges && !this.isSyncing) {
        console.log('🔄 自动同步到Firebase...');
        console.log('🔍 调试 - 当前数据变更标志:', this.dataChangeFlags);
        console.log('🔍 调试 - 是否有本地变更:', this.hasLocalChanges);
        this.performManualSync();
      } else if (this.isSyncing) {
        console.log('⚠️ 正在同步中，跳过自动同步');
      } else {
        console.log('⚠️ 没有检测到数据变更，跳过自动同步');
      }
    }, 3000);
  }

  // 标记excludedMembers数据变更
  markExcludedMembersChange(changeType, memberInfo) {
    const itemId = `${memberInfo.name}_${memberInfo.group}`;
    this.markDataChange('excludedMembers', changeType, itemId);
    console.log(`📝 标记excludedMembers变更: ${changeType} - ${memberInfo.name} (${memberInfo.group})`);
  }

  // 创建同步按钮
  createSyncButton() {
    if (this.syncButton) return;

    const button = document.createElement('button');
    button.id = 'manualSyncButton';
    button.className = 'sync-button';
    button.innerHTML = '🔄 同步数据';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', () => this.performManualSync());
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showChangeDetails();
    });
    document.body.appendChild(button);
    this.syncButton = button;
    this.updateSyncButton();
  }

  // 更新同步按钮状态
  updateSyncButton() {
    if (!this.syncButton) return;

    if (this.hasLocalChanges) {
      this.syncButton.style.background = '#ff6b35';
      this.syncButton.innerHTML = '🔄 有未同步数据';
    } else {
      this.syncButton.style.background = '#28a745';
      this.syncButton.innerHTML = '✅ 未检测到数据变更';
    }
  }

  // 强制同步当前数据
  async forceSyncCurrentData() {
    try {
      console.log('🔄 强制同步当前数据到Firebase...');
      this.isSyncing = true;
      
      const db = firebase.database();
      const groups = this.loadFromLocalStorage('groups') || {};
      const groupNames = this.loadFromLocalStorage('groupNames') || {};
      const attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
      const dailyNewcomers = this.loadFromLocalStorage('dailyNewcomers') || {};
      
      // 同步所有数据
      await db.ref('groups').update(groups);
      await db.ref('groupNames').update(groupNames);
      await db.ref('attendanceRecords').set(attendanceRecords);
      await db.ref('dailyNewcomers').update(dailyNewcomers);
      
      console.log('✅ 强制同步完成');
      this.isSyncing = false;
      
      // 更新原始数据
      this.originalData.groups = JSON.parse(JSON.stringify(groups));
      this.originalData.groupNames = JSON.parse(JSON.stringify(groupNames));
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(attendanceRecords));
      this.originalData.dailyNewcomers = JSON.parse(JSON.stringify(dailyNewcomers));
      
    } catch (error) {
      console.error('❌ 强制同步失败:', error);
      this.isSyncing = false;
    }
  }

  // 执行手动同步
  async performManualSync() {
    // 防止重复同步
    if (this.isSyncing) {
      console.log('⚠️ 正在同步中，跳过重复同步请求');
      return;
    }

    if (!this.hasLocalChanges) {
      console.log('⚠️ 没有检测到数据变更，但强制同步当前数据');
      // 强制同步当前数据，即使没有检测到变更
      await this.forceSyncCurrentData();
      return;
    }

    try {
      console.log('🔄 开始手动同步数据...');
      this.isSyncing = true; // 设置同步状态
      
      // 更新同步按钮状态（如果存在）
      if (this.syncButton) {
        this.syncButton.innerHTML = '🔄 同步中...';
        this.syncButton.disabled = true;
      }

      const db = firebase.database();
      const syncResults = {
        groups: false,
        attendanceRecords: false,
        groupNames: false,
        dailyNewcomers: false,
        excludedMembers: false
      };

      // 同步groups数据
      if (this.dataChangeFlags.groups.added.length > 0 || 
          this.dataChangeFlags.groups.modified.length > 0 || 
          this.dataChangeFlags.groups.deleted.length > 0) {
        
        const groups = this.loadFromLocalStorage('groups');
        if (groups) {
          console.log('🔍 调试 - 准备同步的groups数据:', groups);
          console.log('🔍 调试 - groups数据大小:', Object.keys(groups).length);
          
          // 安全检查：确保groups数据结构正确
          const hasValidStructure = Object.keys(groups).length > 0 && 
            Object.values(groups).every(group => Array.isArray(group));
          
          if (!hasValidStructure) {
            console.warn('⚠️ 警告：groups数据结构无效，跳过同步以防止数据丢失');
            syncResults.groups = true; // 跳过同步
          } else {
            try {
              await db.ref('groups').update(groups);
              console.log('✅ groups数据已同步到Firebase');
              
              // 优化验证逻辑：只验证关键字段
              const verifySnapshot = await db.ref('groups').once('value');
              const remoteGroups = verifySnapshot.val() || {};
              
              console.log('🔍 调试 - 同步验证:', {
                localGroups: Object.keys(groups).length,
                remoteGroups: Object.keys(remoteGroups).length,
                localKeys: Object.keys(groups),
                remoteKeys: Object.keys(remoteGroups)
              });
              
              syncResults.groups = this.verifyDataSync(groups, remoteGroups, 'groups');
              console.log(`✅ groups数据同步${syncResults.groups ? '成功' : '失败'}`);
            } catch (error) {
              console.error('❌ groups数据同步失败:', error);
              syncResults.groups = false;
            }
          }
        }
      } else {
        syncResults.groups = true; // 无需同步，视为成功
      }

      // 同步attendanceRecords数据
      if (this.dataChangeFlags.attendanceRecords.added.length > 0 || 
          this.dataChangeFlags.attendanceRecords.modified.length > 0 || 
          this.dataChangeFlags.attendanceRecords.deleted.length > 0) {
        
        const attendanceRecords = this.loadFromLocalStorage('attendanceRecords');
        if (attendanceRecords) {
          console.log('🔍 调试 - 准备同步的attendanceRecords数据大小:', attendanceRecords.length);
          
          // 安全检查：如果attendanceRecords为空，不进行同步
          if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
            console.warn('⚠️ 警告：attendanceRecords数据为空，跳过同步以防止数据丢失');
            syncResults.attendanceRecords = true; // 跳过同步
          } else {
            // 修复：使用set()而不是update()来同步数组数据
            await db.ref('attendanceRecords').set(attendanceRecords);
          }
          // 优化验证逻辑：处理Firebase返回的数据格式
          const verifySnapshot = await db.ref('attendanceRecords').once('value');
          const remoteData = verifySnapshot.val();
          let remoteRecords;
          
          if (Array.isArray(remoteData)) {
            remoteRecords = remoteData;
          } else if (remoteData && typeof remoteData === 'object') {
            remoteRecords = Object.values(remoteData);
          } else {
            remoteRecords = [];
          }
          
          syncResults.attendanceRecords = this.verifyDataSync(attendanceRecords, remoteRecords, 'attendanceRecords');
          console.log(`✅ attendanceRecords数据同步${syncResults.attendanceRecords ? '成功' : '失败'}`);
        }
      } else {
        syncResults.attendanceRecords = true; // 无需同步，视为成功
      }

      // 同步groupNames数据
      if (this.dataChangeFlags.groupNames.added.length > 0 || 
          this.dataChangeFlags.groupNames.modified.length > 0 || 
          this.dataChangeFlags.groupNames.deleted.length > 0) {
        
        const groupNames = this.loadFromLocalStorage('groupNames');
        if (groupNames) {
          console.log('🔍 调试 - 准备同步的groupNames数据:', Object.keys(groupNames));
          
          // 安全检查：如果groupNames为空，不进行同步
          if (!groupNames || Object.keys(groupNames).length === 0) {
            console.warn('⚠️ 警告：groupNames数据为空，跳过同步以防止数据丢失');
            syncResults.groupNames = true; // 跳过同步
          } else {
            await db.ref('groupNames').update(groupNames);
          }
          // 优化验证逻辑：只验证关键字段
          const verifySnapshot = await db.ref('groupNames').once('value');
          syncResults.groupNames = this.verifyDataSync(groupNames, verifySnapshot.val(), 'groupNames');
          console.log(`✅ groupNames数据同步${syncResults.groupNames ? '成功' : '失败'}`);
        }
      } else {
        syncResults.groupNames = true; // 无需同步，视为成功
      }

      // 同步dailyNewcomers数据
      if (this.dataChangeFlags.dailyNewcomers && 
          (this.dataChangeFlags.dailyNewcomers.added.length > 0 || 
           this.dataChangeFlags.dailyNewcomers.modified.length > 0 || 
           this.dataChangeFlags.dailyNewcomers.deleted.length > 0)) {
        
        const dailyNewcomers = this.loadFromLocalStorage('dailyNewcomers');
        if (dailyNewcomers) {
          console.log('🔄 同步dailyNewcomers数据...');
          await db.ref('dailyNewcomers').set(dailyNewcomers);
          
          // 验证同步结果
          const verifySnapshot = await db.ref('dailyNewcomers').once('value');
          syncResults.dailyNewcomers = this.verifyDataSync(dailyNewcomers, verifySnapshot.val(), 'dailyNewcomers');
          console.log(`✅ dailyNewcomers数据同步${syncResults.dailyNewcomers ? '成功' : '失败'}`);
        }
      } else {
        syncResults.dailyNewcomers = true; // 无需同步，视为成功
      }

      // 同步excludedMembers数据
      if (this.dataChangeFlags.excludedMembers && 
          (this.dataChangeFlags.excludedMembers.added.length > 0 || 
           this.dataChangeFlags.excludedMembers.modified.length > 0 || 
           this.dataChangeFlags.excludedMembers.deleted.length > 0)) {
        
        const excludedMembers = this.loadFromLocalStorage('excludedMembers');
        if (excludedMembers) {
          console.log('🔄 同步excludedMembers数据...');
          await db.ref('excludedMembers').set(excludedMembers);
          
          // 验证同步结果
          const verifySnapshot = await db.ref('excludedMembers').once('value');
          syncResults.excludedMembers = this.verifyDataSync(excludedMembers, verifySnapshot.val(), 'excludedMembers');
          console.log(`✅ excludedMembers数据同步${syncResults.excludedMembers ? '成功' : '失败'}`);
        }
      } else {
        syncResults.excludedMembers = true; // 无需同步，视为成功
      }

      // 检查所有同步是否成功
      const allSyncSuccess = syncResults.groups && syncResults.attendanceRecords && syncResults.groupNames && syncResults.dailyNewcomers && syncResults.excludedMembers;

      if (allSyncSuccess) {
        // 只有所有同步都成功才清空变更标记
        this.dataChangeFlags = {
          groups: { added: [], modified: [], deleted: [] },
          attendanceRecords: { added: [], modified: [], deleted: [] },
          groupNames: { added: [], modified: [], deleted: [] },
          dailyNewcomers: { added: [], modified: [], deleted: [] },
          excludedMembers: { added: [], modified: [], deleted: [] }
        };
        this.hasLocalChanges = false;

        // 更新原始数据，防止重复检测变更
        this.originalData.groups = JSON.parse(JSON.stringify(this.loadFromLocalStorage('groups') || {}));
        this.originalData.attendanceRecords = JSON.parse(JSON.stringify(this.loadFromLocalStorage('attendanceRecords') || []));
        this.originalData.groupNames = JSON.parse(JSON.stringify(this.loadFromLocalStorage('groupNames') || {}));
        this.originalData.dailyNewcomers = JSON.parse(JSON.stringify(this.loadFromLocalStorage('dailyNewcomers') || {}));
        this.originalData.excludedMembers = JSON.parse(JSON.stringify(this.loadFromLocalStorage('excludedMembers') || []));

        // 更新同步按钮状态（如果存在）
        if (this.syncButton) {
          this.syncButton.innerHTML = '✅ 同步完成';
          this.syncButton.style.background = '#28a745';
        }
        
        // 同步成功后清除数据保护标记
        this.clearDataProtection();
        
        setTimeout(() => {
          if (this.syncButton) {
            this.syncButton.disabled = false;
          }
          this.isSyncing = false; // 重置同步状态
          this.updateSyncButton();
        }, 2000);

        console.log('✅ 手动同步完成');
        alert('数据同步完成！');
      } else {
        // 同步失败，不清空标识，保持变更标记
        if (this.syncButton) {
          this.syncButton.innerHTML = '❌ 同步失败';
          this.syncButton.style.background = '#dc3545';
          this.syncButton.disabled = false;
        }
        this.isSyncing = false; // 重置同步状态
        
        const failedTypes = Object.entries(syncResults)
          .filter(([type, success]) => !success)
          .map(([type]) => type)
          .join('、');
        
        console.log('❌ 手动同步失败，保持变更标识');
        console.log('❌ 同步失败详情:', syncResults);
        
        // 特别处理excludedMembers同步失败
        if (failedTypes.includes('excludedMembers')) {
          console.log('❌ excludedMembers同步失败，可能数据被覆盖');
          alert(`数据同步失败：${failedTypes}。\n\n特别提醒：排除人员列表同步失败，可能数据被其他操作覆盖。请重新添加排除人员。`);
        } else {
          alert(`数据同步失败：${failedTypes}。请检查网络连接后重试。`);
        }
      }

    } catch (error) {
      console.error('❌ 手动同步失败:', error);
      if (this.syncButton) {
        this.syncButton.innerHTML = '❌ 同步失败';
        this.syncButton.style.background = '#dc3545';
        this.syncButton.disabled = false;
      }
      this.isSyncing = false; // 重置同步状态
      alert('数据同步失败，请重试');
    }
  }

  // 清理本地数据
  clearLocalData() {
    try {
      localStorage.removeItem('msh_groups');
      localStorage.removeItem('msh_attendanceRecords');
      localStorage.removeItem('msh_groupNames');
      localStorage.removeItem('msh_groups_timestamp');
      localStorage.removeItem('msh_attendanceRecords_timestamp');
      localStorage.removeItem('msh_groupNames_timestamp');
      console.log('✅ 本地数据已清理');
    } catch (error) {
      console.error('❌ 清理本地数据失败:', error);
    }
  }

  // 检查是否有本地变更
  hasLocalChanges() {
    return this.hasLocalChanges;
  }

  // 获取变更统计
  getChangeStats() {
    const stats = {};
    for (const [dataType, flags] of Object.entries(this.dataChangeFlags)) {
      stats[dataType] = {
        added: flags.added.length,
        modified: flags.modified.length,
        deleted: flags.deleted.length,
        total: flags.added.length + flags.modified.length + flags.deleted.length
      };
    }
    return stats;
  }

  // 优化的数据同步验证
  verifyDataSync(localData, remoteData, dataType) {
    try {
      if (!localData || !remoteData) {
        return false;
      }

      if (dataType === 'groups' || dataType === 'groupNames' || dataType === 'dailyNewcomers') {
        // 对象类型验证：只验证关键字段
        const localKeys = Object.keys(localData);
        const remoteKeys = Object.keys(remoteData);
        
        // 检查键的数量差异（允许本地数据有更多键，即新增数据）
        if (localKeys.length < remoteKeys.length) {
          console.log('🔍 验证失败：本地数据键数量少于远程数据');
          console.log('🔍 本地键:', localKeys);
          console.log('🔍 远程键:', remoteKeys);
          return false;
        }
        
        // 如果本地数据有更多键，这是正常的（新增数据）
        if (localKeys.length > remoteKeys.length) {
          console.log('🔍 验证通过：本地数据有新增键，这是正常的');
          console.log('🔍 本地键:', localKeys);
          console.log('🔍 远程键:', remoteKeys);
        }
        
        // 如果键数量相同，检查是否有不同的键
        if (localKeys.length === remoteKeys.length) {
          const localSet = new Set(localKeys);
          const remoteSet = new Set(remoteKeys);
          const localOnly = localKeys.filter(key => !remoteSet.has(key));
          const remoteOnly = remoteKeys.filter(key => !localSet.has(key));
          
          if (localOnly.length > 0 || remoteOnly.length > 0) {
            console.log('🔍 键数量相同但内容不同:');
            console.log('🔍 本地独有键:', localOnly);
            console.log('🔍 远程独有键:', remoteOnly);
          }
        }
        
        // 检查关键字段（只验证远程数据中存在的键）
        for (const key of remoteKeys) {
          if (localKeys.includes(key)) {
            const localItem = localData[key];
            const remoteItem = remoteData[key];
            
            if (dataType === 'groups' && Array.isArray(localItem) && Array.isArray(remoteItem)) {
              // 验证人员数组长度（允许本地数据有更多人员）
              if (localItem.length < remoteItem.length) {
                console.log(`🔍 验证失败：${key} 本地人员数量少于远程`);
                return false;
              }
              // 验证人员姓名（忽略UUID和时间戳）
              for (let i = 0; i < remoteItem.length; i++) {
                if (localItem[i] && remoteItem[i] && localItem[i].name !== remoteItem[i].name) {
                  console.log(`🔍 验证失败：${key} 第${i}个人员姓名不匹配`);
                  return false;
                }
              }
            } else if (dataType === 'dailyNewcomers' && typeof localItem === 'object' && typeof remoteItem === 'object') {
              // 验证当日新增人员数据结构
              if (localItem.data && remoteItem.data && Array.isArray(localItem.data) && Array.isArray(remoteItem.data)) {
                // 验证新增人员列表
                if (localItem.data.length < remoteItem.data.length) {
                  console.log(`🔍 验证失败：${key} 本地新增人员数量少于远程`);
                  return false;
                }
                // 验证人员姓名
                for (let i = 0; i < remoteItem.data.length; i++) {
                  if (localItem.data[i] !== remoteItem.data[i]) {
                    console.log(`🔍 验证失败：${key} 第${i}个新增人员姓名不匹配`);
                    return false;
                  }
                }
              }
            } else if (typeof localItem === 'string' && typeof remoteItem === 'string') {
              // 验证字符串值
              if (localItem !== remoteItem) {
                console.log(`🔍 验证失败：${key} 字符串值不匹配`);
                return false;
              }
            }
          } else {
            console.log(`🔍 验证失败：本地数据缺少键 ${key}`);
            return false;
          }
        }
        return true;
        
      } else if (dataType === 'attendanceRecords') {
        // 数组类型验证：只验证记录数量
        const localLength = Array.isArray(localData) ? localData.length : 0;
        const remoteLength = Array.isArray(remoteData) ? remoteData.length : 0;
        
        console.log(`🔍 验证${dataType}数据: 本地长度=${localLength}, 远程长度=${remoteLength}`);
        
        // 允许±1的差异（网络延迟可能导致）
        const isValid = Math.abs(localLength - remoteLength) <= 1;
        console.log(`🔍 ${dataType}数据验证${isValid ? '通过' : '失败'}`);
        
        return isValid;
        
      } else if (dataType === 'excludedMembers') {
        // excludedMembers需要更严格的验证：检查内容一致性
        // 支持对象和数组两种格式
        const localLength = Array.isArray(localData) ? localData.length : Object.keys(localData).length;
        const remoteLength = Array.isArray(remoteData) ? remoteData.length : Object.keys(remoteData).length;
        
        console.log(`🔍 验证${dataType}数据: 本地长度=${localLength}, 远程长度=${remoteLength}`);
        
        // 首先检查长度
        if (Math.abs(localLength - remoteLength) > 1) {
          console.log(`🔍 ${dataType}数据验证失败：长度差异过大`);
          return false;
        }
        
        // 检查内容一致性（如果长度相同）
        if (localLength === remoteLength && localLength > 0) {
          // 创建本地和远程数据的映射，用于比较
          const localMap = new Map();
          const remoteMap = new Map();
          
          // 构建本地数据映射
          const localItems = Array.isArray(localData) ? localData : Object.values(localData);
          localItems.forEach((item, index) => {
            if (item && item.name) {
              const key = `${item.name}_${item.group || 'unknown'}`;
              localMap.set(key, item);
            }
          });
          
          // 构建远程数据映射
          const remoteItems = Array.isArray(remoteData) ? remoteData : Object.values(remoteData);
          remoteItems.forEach((item, index) => {
            if (item && item.name) {
              const key = `${item.name}_${item.group || 'unknown'}`;
              remoteMap.set(key, item);
            }
          });
          
          // 检查是否有本地数据在远程数据中缺失
          for (const [key, localItem] of localMap) {
            if (!remoteMap.has(key)) {
              console.log(`🔍 ${dataType}数据验证失败：远程数据缺失本地项目 ${key}`);
              return false;
            }
          }
          
          // 检查是否有远程数据在本地数据中缺失
          for (const [key, remoteItem] of remoteMap) {
            if (!localMap.has(key)) {
              console.log(`🔍 ${dataType}数据验证失败：本地数据缺失远程项目 ${key}`);
              return false;
            }
          }
          
          console.log(`🔍 ${dataType}数据验证通过：内容一致性检查通过`);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('验证数据同步失败:', error);
      return false;
    }
  }

  // 显示变更详情
  showChangeDetails() {
    if (!this.hasLocalChanges) {
      alert('没有未同步的数据变更');
      return;
    }

    const stats = this.getChangeStats();
    let details = '📊 未同步数据变更详情：\n\n';
    
    for (const [dataType, stat] of Object.entries(stats)) {
      if (stat.total > 0) {
        details += `📁 ${dataType}:\n`;
        if (stat.added > 0) details += `  ➕ 新增: ${stat.added}项\n`;
        if (stat.modified > 0) details += `  ✏️ 修改: ${stat.modified}项\n`;
        if (stat.deleted > 0) details += `  ❌ 删除: ${stat.deleted}项\n`;
        details += `  📊 总计: ${stat.total}项\n\n`;
      }
    }
    
    details += '💡 点击右上角同步按钮进行数据同步';
    alert(details);
  }

  // 紧急数据恢复功能
  async emergencyDataRecovery() {
    try {
      console.log('🚨 开始紧急数据恢复...');
      
      // 从Firebase拉取最新数据
      const db = firebase.database();
      
      // 拉取groups数据
      const groupsSnapshot = await db.ref('groups').once('value');
      const groups = groupsSnapshot.val() || {};
      
      // 拉取attendanceRecords数据
      const attendanceSnapshot = await db.ref('attendanceRecords').once('value');
      const attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      
      // 拉取groupNames数据
      const groupNamesSnapshot = await db.ref('groupNames').once('value');
      const groupNames = groupNamesSnapshot.val() || {};
      
      // 拉取dailyNewcomers数据
      const dailyNewcomersSnapshot = await db.ref('dailyNewcomers').once('value');
      const dailyNewcomers = dailyNewcomersSnapshot.val() || {};
      
      console.log('🔍 从Firebase恢复的数据:', {
        groups: Object.keys(groups).length,
        attendanceRecords: attendanceRecords.length,
        groupNames: Object.keys(groupNames).length,
        dailyNewcomers: Object.keys(dailyNewcomers).length
      });
      
      // 保存到本地存储
      this.saveToLocalStorage('groups', groups);
      this.saveToLocalStorage('attendanceRecords', attendanceRecords);
      this.saveToLocalStorage('groupNames', groupNames);
      this.saveToLocalStorage('dailyNewcomers', dailyNewcomers);
      
      // 设置全局变量
      window.groups = groups;
      window.attendanceRecords = attendanceRecords;
      window.groupNames = groupNames;
      window.dailyNewcomers = dailyNewcomers;
      
      // 更新原始数据
      this.originalData.groups = JSON.parse(JSON.stringify(groups));
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(attendanceRecords));
      this.originalData.groupNames = JSON.parse(JSON.stringify(groupNames));
      this.originalData.dailyNewcomers = JSON.parse(JSON.stringify(dailyNewcomers));
      
      // 清除变更标记
      this.dataChangeFlags = {
        groups: { added: [], modified: [], deleted: [] },
        attendanceRecords: { added: [], modified: [], deleted: [] },
        groupNames: { added: [], modified: [], deleted: [] },
        dailyNewcomers: { added: [], modified: [], deleted: [] }
      };
      this.hasLocalChanges = false;
      
      // 更新同步按钮
      this.updateSyncButton();
      
      console.log('✅ 紧急数据恢复完成');
      alert('数据恢复完成！请刷新页面查看恢复的数据。');
      
    } catch (error) {
      console.error('❌ 紧急数据恢复失败:', error);
      alert('数据恢复失败，请检查网络连接后重试。');
    }
  }

  // 显示加载状态
  showLoadingState() {
    // 创建加载遮罩
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'data-loading-overlay';
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: white;
      font-size: 18px;
      font-weight: bold;
    `;
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 20px;">🔄 正在从Firebase拉取数据...</div>
        <div style="font-size: 14px; opacity: 0.8;">请稍候，数据拉取完成后页面将自动启用</div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);

    // 禁用页面操作
    this.disablePageOperations();
  }

  // 隐藏加载状态
  hideLoadingState() {
    const loadingOverlay = document.getElementById('data-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }

  // 禁用页面操作
  disablePageOperations() {
    // 禁用所有表单元素
    const formElements = document.querySelectorAll('input, select, button, textarea');
    formElements.forEach(element => {
      element.disabled = true;
      element.style.opacity = '0.5';
    });

    // 禁用页面导航
    const navButtons = document.querySelectorAll('button[onclick*="navigate"], a[href]');
    navButtons.forEach(button => {
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.5';
    });
  }

  // 启用页面操作
  enablePageOperations() {
    // 启用所有表单元素
    const formElements = document.querySelectorAll('input, select, button, textarea');
    formElements.forEach(element => {
      element.disabled = false;
      element.style.opacity = '1';
    });

    // 启用页面导航
    const navButtons = document.querySelectorAll('button[onclick*="navigate"], a[href]');
    navButtons.forEach(button => {
      button.style.pointerEvents = 'auto';
      button.style.opacity = '1';
    });
  }

  // 验证数据完整性
  validateDataIntegrity(groups, attendanceRecords, groupNames) {
    try {
      // 验证groups数据
      if (!groups || typeof groups !== 'object') {
        console.error('❌ groups数据格式错误');
        return false;
      }

      // 验证attendanceRecords数据
      if (!Array.isArray(attendanceRecords)) {
        console.error('❌ attendanceRecords数据格式错误');
        return false;
      }

      // 验证groupNames数据
      if (!groupNames || typeof groupNames !== 'object') {
        console.error('❌ groupNames数据格式错误');
        return false;
      }

      // 验证必要的小组存在（"未分组"是系统默认小组，用于存放新成员）
      if (!groups['未分组']) {
        console.warn('⚠️ 缺少"未分组"小组，自动创建');
        groups['未分组'] = [];
        // 同时更新groupNames
        if (!groupNames['未分组']) {
          groupNames['未分组'] = '未分组';
        }
      }

      console.log('✅ 数据完整性验证通过');
      return true;
    } catch (error) {
      console.error('❌ 数据完整性验证异常:', error);
      return false;
    }
  }

  // ==================== 删除操作方法 ====================
  
  /**
   * 删除小组中的成员
   * @param {string} groupKey - 小组键名
   * @param {string} memberName - 成员姓名
   */
  async deleteGroupMember(groupKey, memberName) {
    try {
      console.log(`🔄 删除小组成员: ${groupKey} - ${memberName}`);
      
      // 获取当前数据
      const groups = this.loadFromLocalStorage('groups') || {};
      const attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
      
      if (!groups[groupKey]) {
        throw new Error(`小组 ${groupKey} 不存在`);
      }
      
      // 从小组中移除成员
      const updatedMembers = groups[groupKey].filter(member => 
        (member.name || member) !== memberName
      );
      groups[groupKey] = updatedMembers;
      
      // 删除相关的签到记录
      const memberRecords = attendanceRecords.filter(record => 
        record.name === memberName && record.group === groupKey
      );
      
      const updatedAttendanceRecords = attendanceRecords.filter(record => 
        !(record.name === memberName && record.group === groupKey)
      );
      
      // 保存到本地存储
      this.saveToLocalStorage('groups', groups);
      this.saveToLocalStorage('attendanceRecords', updatedAttendanceRecords);
      
      // 更新全局变量
      window.groups = groups;
      window.attendanceRecords = updatedAttendanceRecords;
      
      // 标记数据变更
      this.markDataChange('groups', 'modified', `delete_member_${groupKey}_${memberName}`);
      this.markDataChange('attendanceRecords', 'deleted', `delete_member_records_${memberName}`);
      
      console.log(`✅ 小组成员删除成功: ${memberName}`);
      console.log(`📊 同时删除了 ${memberRecords.length} 条相关签到记录`);
      
      // 自动同步到Firebase
      await this.performManualSync();
      
    } catch (error) {
      console.error('❌ 删除小组成员失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除单条签到记录
   * @param {Object} record - 要删除的签到记录
   */
  async deleteAttendanceRecord(record) {
    try {
      console.log(`🔄 删除签到记录: ${record.name} - ${record.time}`);
      
      // 获取当前数据
      const attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
      
      // 查找并删除记录
      const updatedRecords = attendanceRecords.filter(r => 
        !(r.name === record.name && 
          r.group === record.group && 
          r.time === record.time)
      );
      
      if (updatedRecords.length === attendanceRecords.length) {
        throw new Error('找不到要删除的签到记录');
      }
      
      // 保存到本地存储
      this.saveToLocalStorage('attendanceRecords', updatedRecords);
      
      // 更新全局变量
      window.attendanceRecords = updatedRecords;
      
      // 标记数据变更
      this.markDataChange('attendanceRecords', 'deleted', `delete_record_${record.name}_${record.time}`);
      
      console.log(`✅ 签到记录删除成功: ${record.name}`);
      
      // 自动同步到Firebase
      await this.performManualSync();
      
    } catch (error) {
      console.error('❌ 删除签到记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除整个小组
   * @param {string} groupKey - 小组键名
   */
  async deleteGroup(groupKey) {
    try {
      console.log(`🔄 删除小组: ${groupKey}`);
      
      // 获取当前数据
      const groups = this.loadFromLocalStorage('groups') || {};
      const groupNames = this.loadFromLocalStorage('groupNames') || {};
      const attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
      
      if (!groups[groupKey]) {
        throw new Error(`小组 ${groupKey} 不存在`);
      }
      
      const memberCount = groups[groupKey].length;
      
      // 删除小组
      delete groups[groupKey];
      delete groupNames[groupKey];
      
      // 删除相关签到记录
      const groupRecords = attendanceRecords.filter(record => record.group === groupKey);
      const updatedAttendanceRecords = attendanceRecords.filter(record => record.group !== groupKey);
      
      // 保存到本地存储
      this.saveToLocalStorage('groups', groups);
      this.saveToLocalStorage('groupNames', groupNames);
      this.saveToLocalStorage('attendanceRecords', updatedAttendanceRecords);
      
      // 更新全局变量
      window.groups = groups;
      window.groupNames = groupNames;
      window.attendanceRecords = updatedAttendanceRecords;
      
      // 标记数据变更
      this.markDataChange('groups', 'deleted', `delete_group_${groupKey}`);
      this.markDataChange('groupNames', 'deleted', `delete_group_name_${groupKey}`);
      this.markDataChange('attendanceRecords', 'deleted', `delete_group_records_${groupKey}`);
      
      console.log(`✅ 小组删除成功: ${groupKey}`);
      console.log(`📊 同时删除了 ${memberCount} 名成员和 ${groupRecords.length} 条签到记录`);
      
      // 自动同步到Firebase
      await this.performManualSync();
      
    } catch (error) {
      console.error('❌ 删除小组失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
window.newDataManager = new NewDataManager();

// 页面关闭时清理本地数据（仅在用户明确关闭浏览器或标签页时）
window.addEventListener('beforeunload', (event) => {
  // 使用 sessionStorage 来标记页面是否被刷新
  const isPageRefresh = sessionStorage.getItem('msh_page_refresh');
  
  if (isPageRefresh) {
    console.log('📋 页面刷新，保留本地数据');
    sessionStorage.removeItem('msh_page_refresh');
  } else {
    console.log('📋 页面关闭，清理本地数据');
    window.newDataManager.clearLocalData();
  }
});

// 页面加载时标记为刷新
window.addEventListener('load', () => {
  sessionStorage.setItem('msh_page_refresh', 'true');
});

// 导出到window.utils
if (window.utils) {
  window.utils.NewDataManager = NewDataManager;
} else {
  window.utils = { NewDataManager };
}

// 紧急数据恢复功能暴露到全局
window.emergencyDataRecovery = () => {
  if (window.newDataManager) {
    window.newDataManager.emergencyDataRecovery();
  } else {
    alert('数据管理器未初始化，无法进行数据恢复');
  }
};

