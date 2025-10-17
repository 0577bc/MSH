/**
 * 公共工具函数模块 (utils.js)
 * 功能：提供通用工具函数，数据管理，系统辅助功能
 * 作者：MSH系统
 * 版本：2.0
 */

// ==================== UUID索引缓存 ====================
const UUIDIndex = {
  // UUID到成员的映射缓存
  memberIndex: new Map(),
  // 记录键到记录的映射缓存
  recordIndex: new Map(),
  
  // 更新成员索引
  updateMemberIndex: function(groups) {
    this.memberIndex.clear();
    let totalMembers = 0;
    let membersWithUUID = 0;
    
    console.log('🔍 UUIDIndex.updateMemberIndex 开始更新:', {
      groupsCount: Object.keys(groups).length,
      groupNamesLoaded: !!window.groupNames,
      groupNamesKeys: window.groupNames ? Object.keys(window.groupNames) : 'undefined'
    });
    
    Object.entries(groups).forEach(([groupName, members]) => {
      members.forEach(member => {
        totalMembers++;
        if (member.uuid) {
          // 确保成员有group字段
          if (!member.group) {
            member.group = groupName;
            console.log(`🔧 为成员 ${member.name} 补充group字段: ${groupName}`);
          }
          
          // 应用groupNames映射，确保存储的成员信息包含正确的显示名称
          const mappedMember = {
            ...member,
            group: member.group || groupName, // 确保group字段存在
            groupDisplayName: (window.groupNames && window.groupNames[member.group]) ? window.groupNames[member.group] : (member.group || groupName)
          };
          
          this.memberIndex.set(member.uuid, mappedMember);
          membersWithUUID++;
          
          // 调试：显示前几个成员的映射结果
          if (membersWithUUID <= 3) {
            console.log(`🔍 成员映射示例 ${membersWithUUID}:`, {
              name: member.name,
              group: member.group,
              groupDisplayName: mappedMember.groupDisplayName,
              uuid: member.uuid
            });
          }
        } else {
          // 调试：显示没有UUID的成员（只显示前3个）
          if (totalMembers <= 3) {
            console.log('成员缺少UUID:', member.name, JSON.stringify(member, null, 2));
          }
        }
      });
    });
    
    console.log(`✅ UUIDIndex更新完成: 总成员数 ${totalMembers}, 有UUID的成员数 ${membersWithUUID}`);
    
    // 显示一个示例成员的结构
    if (totalMembers > 0) {
      const firstGroup = Object.values(groups)[0];
      if (firstGroup && firstGroup.length > 0) {
        console.log('示例成员结构:', JSON.stringify(firstGroup[0], null, 2));
      }
    }
  },
  
  // 更新记录索引
  updateRecordIndex: function(attendanceRecords) {
    this.recordIndex.clear();
    attendanceRecords.forEach(record => {
      const key = `${record.name}_${record.time}_${record.group}`;
      this.recordIndex.set(key, record);
    });
  },
  
  // 根据UUID查找成员
  findMemberByUUID: function(uuid) {
    return this.memberIndex.get(uuid);
  },
  
  // 根据记录键查找记录
  findRecordByKey: function(recordKey) {
    return this.recordIndex.get(recordKey);
  }
};

// ==================== 数据处理工具函数 ====================

/**
 * 生成UUID v4
 * @returns {string} 生成的UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 为人员生成唯一ID
 * @param {Object} member 人员对象
 * @returns {string} 人员唯一ID
 */
function generateMemberUUID(member) {
  // 如果已有UUID，直接返回
  if (member.uuid) {
    return member.uuid;
  }
  
  // 生成新的UUID
  return generateUUID();
}

/**
 * 为所有人员添加UUID
 * @param {Object} groups 组别数据
 * @returns {Object} 更新后的组别数据
 */
function addUUIDsToMembers(groups) {
  const updatedGroups = {};
  
  for (const groupName in groups) {
    updatedGroups[groupName] = groups[groupName].map(member => {
      if (!member.uuid) {
        member.uuid = generateUUID();
        console.log(`为人员 ${member.name} 生成UUID: ${member.uuid}`);
      }
      return member;
    });
  }
  
  return updatedGroups;
}

/**
 * 为签到记录添加人员UUID关联
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Object} groups 组别数据
 * @returns {Array} 更新后的签到记录数组
 */
function addMemberUUIDsToAttendanceRecords(attendanceRecords, groups) {
  // 创建人员UUID映射表
  const memberUUIDMap = {};
  for (const groupName in groups) {
    groups[groupName].forEach(member => {
      memberUUIDMap[member.name] = member.uuid;
    });
  }
  
  return attendanceRecords.map(record => {
    if (!record.memberUUID && record.memberName) {
      record.memberUUID = memberUUIDMap[record.memberName];
      if (record.memberUUID) {
        console.log(`为签到记录 ${record.memberName} 关联UUID: ${record.memberUUID}`);
      }
    }
    return record;
  });
}

/**
 * 根据人员UUID获取签到统计
 * @param {string} memberUUID 人员UUID
 * @param {Array} attendanceRecords 签到记录数组
 * @param {string} startDate 开始日期 (YYYY-MM-DD)
 * @param {string} endDate 结束日期 (YYYY-MM-DD)
 * @returns {Object} 签到统计信息
 */
function getMemberAttendanceStatsByUUID(memberUUID, attendanceRecords, startDate, endDate) {
  const memberRecords = attendanceRecords.filter(record => {
    if (record.memberUUID !== memberUUID) return false;
    
    if (startDate && endDate) {
      const recordDate = new Date(record.time).toISOString().split('T')[0];
      return recordDate >= startDate && recordDate <= endDate;
    }
    
    return true;
  });
  
  const stats = {
    totalSignIns: memberRecords.length,
    morningSignIns: memberRecords.filter(r => r.timeSlot === 'morning' || r.timeSlot === 'early' || r.timeSlot === 'onTime' || r.timeSlot === 'late').length,
    afternoonSignIns: memberRecords.filter(r => r.timeSlot === 'afternoon').length,
    eveningSignIns: memberRecords.filter(r => r.timeSlot === 'evening').length,
    earlySignIns: memberRecords.filter(r => r.timeSlot === 'early').length,
    onTimeSignIns: memberRecords.filter(r => r.timeSlot === 'onTime').length,
    lateSignIns: memberRecords.filter(r => r.timeSlot === 'late').length,
    records: memberRecords
  };
  
  return stats;
}

/**
 * 根据组别获取签到统计（考虑人员可能换组）
 * @param {string} groupName 组别名称
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Object} groups 当前组别数据
 * @param {string} date 日期 (YYYY-MM-DD)
 * @returns {Object} 组别签到统计
 */
function getGroupAttendanceStatsByUUID(groupName, attendanceRecords, groups, date) {
  // 获取当前组别的所有人员UUID
  const currentMemberUUIDs = groups[groupName] ? groups[groupName].map(member => member.uuid) : [];
  
  // 统计这些人员的签到记录
  const groupRecords = attendanceRecords.filter(record => {
    if (!currentMemberUUIDs.includes(record.memberUUID)) return false;
    
    if (date) {
      const recordDate = new Date(record.time).toISOString().split('T')[0];
      return recordDate === date;
    }
    
    return true;
  });
  
  const stats = {
    totalMembers: currentMemberUUIDs.length,
    signedInMembers: new Set(groupRecords.map(r => r.memberUUID)).size,
    totalSignIns: groupRecords.length,
    morningSignIns: groupRecords.filter(r => r.timeSlot === 'morning' || r.timeSlot === 'early' || r.timeSlot === 'onTime' || r.timeSlot === 'late').length,
    afternoonSignIns: groupRecords.filter(r => r.timeSlot === 'afternoon').length,
    eveningSignIns: groupRecords.filter(r => r.timeSlot === 'evening').length,
    attendanceRate: currentMemberUUIDs.length > 0 ? Math.round((new Set(groupRecords.map(r => r.memberUUID)).size / currentMemberUUIDs.length) * 100) : 0,
    records: groupRecords
  };
  
  return stats;
}

/**
 * 获取人员的完整签到历史（跨组别）
 * @param {string} memberUUID 人员UUID
 * @param {Array} attendanceRecords 签到记录数组
 * @returns {Array} 按时间排序的签到记录
 */
function getMemberFullAttendanceHistory(memberUUID, attendanceRecords) {
  return attendanceRecords
    .filter(record => record.memberUUID === memberUUID)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * 创建人员UUID索引，提高查询性能
 * @param {Object} groups 组别数据
 * @returns {Object} UUID索引对象
 */
function createMemberUUIDIndex(groups) {
  const index = {};
  for (const groupName in groups) {
    groups[groupName].forEach(member => {
      if (member.uuid) {
        index[member.uuid] = {
          name: member.name,
          group: groupName,
          member: member
        };
      }
    });
  }
  return index;
}

/**
 * 批量处理签到记录，提高性能
 * @param {Array} attendanceRecords 签到记录数组
 * @param {Function} processor 处理函数
 * @param {number} batchSize 批处理大小
 * @returns {Array} 处理后的记录数组
 */
function batchProcessAttendanceRecords(attendanceRecords, processor, batchSize = 100) {
  const results = [];
  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize);
    const processedBatch = batch.map(processor);
    results.push(...processedBatch);
  }
  return results;
}

/**
 * 优化数据同步，减少不必要的更新
 * @param {Object} localData 本地数据
 * @param {Object} remoteData 远程数据
 * @returns {Object} 需要同步的数据
 */
function optimizeDataSync(localData, remoteData) {
  const changes = {};
  
  // 比较数据并只返回有变化的部分
  for (const key in localData) {
    if (JSON.stringify(localData[key]) !== JSON.stringify(remoteData[key])) {
      changes[key] = localData[key];
    }
  }
  
  return changes;
}

/**
 * 加载不统计人员列表（已废弃 - 保留用于兼容）
 * @deprecated 现在使用成员对象的 excluded 属性
 * @returns {Array} 不统计人员列表
 */
function loadExcludedMembers() {
  // 已废弃：请使用 member.excluded 属性（警告已移除以减少控制台噪音）
  
  // 为了兼容，从groups中提取excluded=true的成员
  if (window.groups) {
    const excludedList = [];
    Object.keys(window.groups).forEach(groupId => {
      const members = window.groups[groupId] || [];
      members.forEach(member => {
        if (member.excluded === true) {
          excludedList.push({
            ...member,
            group: groupId
          });
        }
      });
    });
    console.log('✅ 从成员标记中提取排除人员:', excludedList.length, '个');
    return excludedList;
  }
  
  return [];
}

/**
 * 检查人员是否在不统计列表中（支持UUID和姓名匹配）
 * @param {Object} record 签到记录
 * @param {Array} excludedMembers 不统计人员列表
 * @returns {boolean} 是否被排除
 */
function isMemberExcluded(record, excludedMembers) {
  // 首先尝试通过UUID匹配（更准确）
  if (record.memberUUID) {
    return excludedMembers.some(excluded => 
      excluded.uuid === record.memberUUID
    );
  }
  
  // 如果没有UUID，使用姓名和组别匹配（向后兼容）
  return excludedMembers.some(excluded => 
    excluded.name === record.name && excluded.group === record.group
  );
}

/**
 * 升级不统计人员列表，添加UUID支持
 * @param {Array} excludedMembers 原始不统计人员列表
 * @param {Object} groups 组别数据
 * @returns {Array} 升级后的不统计人员列表
 */
function upgradeExcludedMembersWithUUID(excludedMembers, groups) {
  return excludedMembers.map(excluded => {
    // 如果已经有UUID，直接返回
    if (excluded.uuid) {
      return excluded;
    }
    
    // 查找对应人员的UUID（支持姓名和花名匹配）
    for (const groupName in groups) {
      const member = groups[groupName].find(m => {
        // 直接姓名匹配
        if (m.name === excluded.name && groupName === excluded.group) {
          return true;
        }
        
        // 花名匹配
        const memberNickname = m.nickname || m.Nickname || m.花名 || m.alias || '';
        if (memberNickname && memberNickname === excluded.name && groupName === excluded.group) {
          return true;
        }
        
        // 反向匹配：排除人员的花名 vs 成员的姓名
        const excludedNickname = excluded.nickname || excluded.Nickname || excluded.花名 || excluded.alias || '';
        if (excludedNickname && excludedNickname === m.name && groupName === excluded.group) {
          return true;
        }
        
        return false;
      });
      
      if (member && member.uuid) {
        return {
          ...excluded,
          uuid: member.uuid
        };
      }
    }
    
    // 如果找不到对应人员，保持原样
    return excluded;
  });
}

/**
 * 小组排序函数
 * @param {Object} groups 小组数据
 * @param {Object} groupNames 小组名称映射
 * @returns {Array} 排序后的小组键数组
 * @note "未分组"永远排在第一
 */
function sortGroups(groups, groupNames) {
  return Object.keys(groups).sort((a, b) => {
    const nameA = groupNames[a] || a;
    const nameB = groupNames[b] || b;
    
    // "group0"永远排在第一（未分组）
    if (a === "group0") return -1;
    if (b === "group0") return 1;
    
    return nameA.localeCompare(nameB, 'zh-CN');
  });
}

/**
 * 成员按姓名排序
 * @param {Array} members 成员数组
 * @returns {Array} 排序后的成员数组
 */
function sortMembersByName(members) {
  return members.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

/**
 * 检查成员是否在不统计列表中
 * @param {Object} member 成员对象
 * @param {string} group 小组名称
 * @param {Array} excludedMembers 不统计人员列表
 * @returns {boolean} 是否在不统计列表中
 */
function isMemberExcluded(member, group, excludedMembers) {
  if (!member) {
    return false;
  }
  
  // 新逻辑：直接检查成员的 excluded 属性
  return member.excluded === true || member.excluded === 'true';
}

/**
 * 过滤不统计的人员（简化版 - 使用成员标记）
 * @param {Array} members 成员数组
 * @param {string} group 小组名称（保留参数用于兼容）
 * @param {Array} excludedMembers 不统计人员列表（保留参数用于兼容）
 * @returns {Array} 过滤后的成员数组
 */
function filterExcludedMembers(members, group, excludedMembers) {
  // 新逻辑：直接过滤 excluded 属性
  return members.filter(member => !(member.excluded === true || member.excluded === 'true'));
}

/**
 * 获取成员的显示名称（规则：有花名只显示花名，无花名显示姓名）
 * @param {Object} member 成员对象
 * @returns {string} 显示名称
 */
function getDisplayName(member) {
  if (!member) return '';
  
  const nickname = member.nickname || member.Nickname || member.花名 || member.alias || '';
  const name = member.name || member.Name || member.姓名 || member.fullName || '';
  
  // 显示规则：有花名只显示花名，无花名显示姓名（与index页面一致）
  if (nickname.trim()) {
    return nickname;
  }
  return name || '';
}


// 导出到window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}
Object.assign(window.utils, {
  UUIDIndex,
  generateUUID,
  generateMemberUUID,
  addUUIDsToMembers,
  addMemberUUIDsToAttendanceRecords,
  getMemberAttendanceStatsByUUID,
  getGroupAttendanceStatsByUUID,
  getMemberFullAttendanceHistory,
  createMemberUUIDIndex,
  batchProcessAttendanceRecords,
  optimizeDataSync,
  loadExcludedMembers,
  isMemberExcluded,
  upgradeExcludedMembersWithUUID,
  sortGroups,
  sortMembersByName,
  filterExcludedMembers,
  getDisplayName
});
