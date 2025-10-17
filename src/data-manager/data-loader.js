/**
 * NewDataManager - 数据加载模块
 * 扩展 NewDataManager 类的数据加载方法
 */

Object.assign(NewDataManager.prototype, {
  
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
    if (hasLocalAttendance) {
      console.log('🔍 本地存储中的attendanceRecords:', hasLocalAttendance.length);
      console.log('🔍 本地存储中的attendanceRecords详细内容:', hasLocalAttendance);
    } else {
      console.log('🔍 本地存储中attendanceRecords为空');
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
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(hasLocalAttendance || []));
      this.originalData.groupNames = JSON.parse(JSON.stringify(hasLocalGroupNames));
      this.originalData.excludedMembers = JSON.parse(JSON.stringify(hasLocalExcludedMembers));
      
      // 设置全局变量
      window.groups = hasLocalGroups;
      window.attendanceRecords = hasLocalAttendance || [];
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
          const firebaseExcludedMembers = firebaseSnapshot.val() || {};
          
          // 兼容对象和数组格式
          const firebaseExcludedCount = Array.isArray(firebaseExcludedMembers) 
            ? firebaseExcludedMembers.length 
            : Object.keys(firebaseExcludedMembers).length;
          console.log('🔍 Firebase excludedMembers数据:', firebaseExcludedCount, '个');
          
          // 如果Firebase数据更多，使用Firebase数据
          if (firebaseExcludedCount > localDataLength) {
            console.log('🔍 使用Firebase数据（数据更多）');
            // 兼容数组和对象格式
            if (Array.isArray(firebaseExcludedMembers)) {
              const firebaseExcludedMembersObj = {};
              firebaseExcludedMembers.forEach((member, index) => {
                firebaseExcludedMembersObj[member.uuid || `firebase_${index}`] = member;
              });
              window.excludedMembers = firebaseExcludedMembersObj;
            } else {
              // 已经是对象格式
              window.excludedMembers = firebaseExcludedMembers;
            }
            // 更新本地存储
            this.saveToLocalStorage('excludedMembers', window.excludedMembers);
          } else {
            console.log('🔍 使用本地数据');
            // 兼容数组和对象格式
            if (Array.isArray(hasLocalExcludedMembers)) {
              const excludedObj = {};
              hasLocalExcludedMembers.forEach((member, index) => {
                excludedObj[member.uuid || `local_${index}`] = member;
              });
              window.excludedMembers = excludedObj;
            } else {
              window.excludedMembers = hasLocalExcludedMembers;
            }
          }
        } catch (error) {
          console.error('🔍 检查Firebase数据失败，使用本地数据:', error);
          // 兼容数组和对象格式
          if (Array.isArray(hasLocalExcludedMembers)) {
            const excludedObj = {};
            hasLocalExcludedMembers.forEach((member, index) => {
              excludedObj[member.uuid || `local_${index}`] = member;
            });
            window.excludedMembers = excludedObj;
          } else {
            window.excludedMembers = hasLocalExcludedMembers;
          }
        }
      } else {
        console.log('🔍 Firebase未初始化，使用本地数据');
        // 兼容数组和对象格式
        if (Array.isArray(hasLocalExcludedMembers)) {
          const excludedObj = {};
          hasLocalExcludedMembers.forEach((member, index) => {
            excludedObj[member.uuid || `local_${index}`] = member;
          });
          window.excludedMembers = excludedObj;
        } else {
          window.excludedMembers = hasLocalExcludedMembers;
        }
      }
      
      // 最终验证excludedMembers
      const finalExcludedCount = window.excludedMembers 
        ? (Array.isArray(window.excludedMembers) 
          ? window.excludedMembers.length 
          : Object.keys(window.excludedMembers).length)
        : 0;
      
      console.log('🔍 调试 - NewDataManager设置全局变量:', {
        'window.groups': window.groups ? Object.keys(window.groups).length : 0,
        'window.groupNames': window.groupNames ? Object.keys(window.groupNames).length : 0,
        'window.attendanceRecords': window.attendanceRecords ? window.attendanceRecords.length : 0,
        'window.excludedMembers': finalExcludedCount
      });
      
      console.log('✅ 最终 excludedMembers 数据类型:', Array.isArray(window.excludedMembers) ? '数组' : '对象');
      console.log('✅ 最终 excludedMembers 数据:', window.excludedMembers);
      
      // 检测是否有未同步的变更
      this.detectDataChanges();
      
      // 本地数据有效，直接返回成功
      console.log('✅ 本地数据有效，直接返回，跳过Firebase拉取');
      return true;
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
        const [groupsSnapshot, groupNamesSnapshot, excludedMembersSnapshot] = await Promise.all([
          db.ref('groups').once('value'),
          db.ref('groupNames').once('value'),
          db.ref('excludedMembers').once('value')
        ]);
        
        // 🚨 修复：数据恢复时只加载当天签到记录，不拉取全部历史数据
        const attendanceRecords = await this.loadTodayAttendanceRecordsFromFirebase();
        
        const firebaseGroups = groupsSnapshot.val() || {};
        const firebaseGroupNames = groupNamesSnapshot.val() || {};
        const firebaseAttendance = attendanceRecords; // 使用当天数据
        const firebaseExcludedMembers = excludedMembersSnapshot.val() || {};
        
        console.log('🔍 Firebase数据恢复检查:');
        // 兼容对象和数组格式
        const firebaseExcludedCount = Array.isArray(firebaseExcludedMembers) 
          ? firebaseExcludedMembers.length 
          : Object.keys(firebaseExcludedMembers).length;
        console.log('🔍 Firebase excludedMembers:', firebaseExcludedCount, '个');
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
          const firebaseExcludedCount = Array.isArray(firebaseExcludedMembers) 
            ? firebaseExcludedMembers.length 
            : Object.keys(firebaseExcludedMembers).length;
            
          if (!isExcludedMembersValid && firebaseExcludedCount > 0) {
            this.saveToLocalStorage('excludedMembers', firebaseExcludedMembers);
            console.log('✅ 已恢复excludedMembers数据（兼容对象/数组格式）');
          } else if (isExcludedMembersValid) {
            // 如果本地数据有效，确保本地数据被正确设置
            console.log('✅ 使用本地excludedMembers数据，无需恢复');
            // 添加保护：如果本地数据比Firebase数据更新，不要被覆盖
            if (firebaseExcludedCount > 0) {
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
          // firebaseExcludedCount 已在上方第346行声明，此处不需要重复声明
            
          if (!isExcludedMembersValid && firebaseExcludedCount > 0) {
            console.log('🔍 使用Firebase excludedMembers数据:', firebaseExcludedCount, '个');
            // 兼容数组和对象格式
            if (Array.isArray(firebaseExcludedMembers)) {
              // 数组格式转换为对象格式
              const firebaseExcludedMembersObj = {};
              firebaseExcludedMembers.forEach((member, index) => {
                firebaseExcludedMembersObj[member.uuid || `firebase_${index}`] = member;
              });
              window.excludedMembers = firebaseExcludedMembersObj;
            } else {
              // 已经是对象格式，直接使用
              window.excludedMembers = firebaseExcludedMembers;
            }
          } else if (isExcludedMembersValid) {
            // 如果本地数据有效，使用本地数据
            const localDataLength = Array.isArray(hasLocalExcludedMembers) ? 
              hasLocalExcludedMembers.length : 
              Object.keys(hasLocalExcludedMembers).length;
            console.log('🔍 使用本地 excludedMembers数据:', localDataLength, '个');
            console.log('🔍 本地 excludedMembers数据详情:', hasLocalExcludedMembers);
            // 兼容数组和对象格式
            if (Array.isArray(hasLocalExcludedMembers)) {
              const excludedObj = {};
              hasLocalExcludedMembers.forEach((member, index) => {
                excludedObj[member.uuid || `local_${index}`] = member;
              });
              window.excludedMembers = excludedObj;
            } else {
              window.excludedMembers = hasLocalExcludedMembers;
            }
          } else {
            console.log('🔍 没有有效的excludedMembers数据，设置为空对象');
            window.excludedMembers = {};
          }
          
          // 🔧 修复：更新originalData为恢复后的数据，避免误报变更
          if (window.groups) this.originalData.groups = JSON.parse(JSON.stringify(window.groups));
          if (window.groupNames) this.originalData.groupNames = JSON.parse(JSON.stringify(window.groupNames));
          if (window.attendanceRecords) this.originalData.attendanceRecords = JSON.parse(JSON.stringify(window.attendanceRecords));
          if (window.excludedMembers) this.originalData.excludedMembers = JSON.parse(JSON.stringify(window.excludedMembers));
          console.log('✅ 已更新originalData基准数据');
          
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
  },

  // 页面打开时完整拉取Firebase数据到本地
  async loadAllDataFromFirebase() {
    try {
      // 优先检查是否已经有数据加载完成
      if (this.isDataLoaded) {
        console.log('📋 数据已加载完成，跳过重复拉取');
        return true;
      }
      
      // 检查是否有有效的本地数据（避免重复拉取）
      const hasLocalGroups = this.loadFromLocalStorage('groups');
      const hasLocalGroupNames = this.loadFromLocalStorage('groupNames');
      const hasLocalAttendance = this.loadFromLocalStorage('attendanceRecords');
      
      if (hasLocalGroups && hasLocalGroupNames && hasLocalAttendance) {
        console.log('📋 检测到有效本地数据，跳过Firebase拉取');
        // 设置数据已加载状态
        this.isDataLoaded = true;
        this.isFirstLoad = false;
        
        // 设置全局变量
        window.groups = hasLocalGroups;
        window.groupNames = hasLocalGroupNames;
        window.attendanceRecords = hasLocalAttendance;
        
        return true;
      }
      
      // 检查是否已经拉取过数据
      if (!this.isFirstLoad) {
        console.log('📋 数据已拉取过，尝试增量拉取');
        
        // 尝试增量拉取
        const hasIncrementalChanges = await this.loadIncrementalDataFromFirebase();
        if (hasIncrementalChanges) {
          console.log('✅ 增量拉取成功，数据已更新');
          return true;
        }
        
        // 如果增量拉取没有变更，检查数据新鲜度
        const shouldUpdate = await this.shouldUpdateData();
        if (!shouldUpdate) {
          console.log('📋 数据仍然新鲜，跳过完整拉取');
          return true;
        }
        
        console.log('🔄 数据需要完整更新，开始完整拉取');
      }

      // 检查是否有未同步的本地数据
      if (this.hasLocalChanges) {
        console.log('🔍 检测到未同步的本地数据，启用智能合并');
        return await this.loadAllDataFromFirebaseWithMerge();
      }

      console.log('🔄 开始从Firebase完整拉取数据...');
      
      if (!firebase.apps.length) {
        console.error('Firebase未初始化');
        return false;
      }

      // 显示加载状态
      this.showLoadingState();

      const db = firebase.database();
      
      // 并行拉取所有数据（优化：只拉取当日签到记录）
      const [groupsSnapshot, groupNamesSnapshot] = await Promise.all([
        db.ref('groups').once('value'),
        db.ref('groupNames').once('value')
      ]);

      // 单独加载当日签到记录（优化版本）
      const attendanceRecords = await this.loadTodayAttendanceRecordsFromFirebase();

      // 处理数据
      const groups = groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {};
      const groupNames = groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {};

        // 确保group0存在（未分组）
        if (!groups['group0']) {
          groups['group0'] = [];
        }
        if (!groupNames['group0']) {
          groupNames['group0'] = '未分组';
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

      // 更新全局变量
      window.groups = groups;
      window.attendanceRecords = attendanceRecords;
      window.groupNames = groupNames;

      // 保存原始数据用于变更检测
      this.originalData.groups = JSON.parse(JSON.stringify(groups));
      this.originalData.attendanceRecords = JSON.parse(JSON.stringify(attendanceRecords));
      this.originalData.groupNames = JSON.parse(JSON.stringify(groupNames));

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
      
      // 预加载Sunday Tracking数据
      this.preloadSundayTrackingData();
      
      return true;

    } catch (error) {
      console.error('❌ 从Firebase拉取数据失败:', error);
      return false;
    }
  },

  // 智能合并版本的Firebase数据拉取
  async loadAllDataFromFirebaseWithMerge() {
    try {
      console.log('🔄 开始智能合并Firebase数据...');
      
      if (!firebase.apps.length) {
        console.error('Firebase未初始化');
        return false;
      }

      // 显示加载状态
      this.showLoadingState();

      // 1. 获取本地数据
      const localData = this.getAllLocalData();
      console.log('🔍 本地数据:', localData);

      // 2. 获取Firebase数据
      const firebaseData = await this.getFirebaseData();
      console.log('🔍 Firebase数据:', firebaseData);

      // 3. 获取基础数据（上次同步的数据）
      const baseData = this.getBaseData();
      console.log('🔍 基础数据:', baseData);

      // 4. 执行智能合并
      const mergeResult = this.smartMerge(localData, firebaseData, baseData);
      const mergedData = mergeResult.data;
      const conflicts = mergeResult.conflicts;
      
      console.log('✅ 智能合并完成:', mergedData);
      
      // 5. 如果有冲突，显示合并预览
      if (conflicts.length > 0) {
        const shouldContinue = await this.showMergePreview(conflicts, localData, firebaseData);
        if (!shouldContinue) {
          console.log('❌ 用户取消合并，保持本地数据');
          this.hideLoadingState();
          return false;
        }
      }

      // 6. 保存合并结果
      this.saveMergedData(mergedData);

      // 7. 更新元数据
      this.updateMetadata(mergedData);

      // 8. 更新全局变量
      this.updateGlobalVariables(mergedData);

      this.isDataLoaded = true;
      this.isFirstLoad = false;
      this.hasLocalChanges = false; // 清除变更标志

      // 隐藏加载状态，启用页面操作
      this.hideLoadingState();
      this.enablePageOperations();
      
      console.log('✅ 智能合并完成，页面已启用操作');
      
      // 预加载Sunday Tracking数据
      this.preloadSundayTrackingData();
      
      return true;

    } catch (error) {
      console.error('❌ 智能合并失败:', error);
      this.hideLoadingState();
      return false;
    }
  },

  // 获取所有本地数据
  getAllLocalData() {
    return {
      groups: this.loadFromLocalStorage('groups') || {},
      attendanceRecords: this.loadFromLocalStorage('attendanceRecords') || [],
      groupNames: this.loadFromLocalStorage('groupNames') || {}
    };
  },

  // 获取Firebase数据
  async getFirebaseData() {
    // 方法实现（如果原文件中有的话）
    return {};
  }

});

// 导出Mixin（注释掉，因为方法已通过Object.assign添加到原型）
// if (typeof window.DataManagerMixins === 'undefined') {
//   window.DataManagerMixins = {};
// }
// window.DataManagerMixins.DataLoader = {
//   checkExistingData,
//   loadAllDataFromFirebase,
//   loadAllDataFromFirebaseWithMerge,
//   getFirebaseData
// };

console.log('✅ NewDataManager - 数据加载模块已加载');
