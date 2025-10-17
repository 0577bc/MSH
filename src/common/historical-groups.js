/**
 * 历史组别名称映射模块 (historical-groups.js)
 * 功能：统一管理历史组别名称映射，确保旧数据兼容性
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 历史组别名称映射 ====================

/**
 * 历史组别名称映射表
 * 格式：{ "旧名称": "新组别ID" }
 * 通过UUID匹配验证，确保100%准确
 */
export const HISTORICAL_GROUP_NAMES = {
  '乐清1组': 'group3',  // 现在是"花园小家" (匹配度: 2/2人)
  '乐清2组': 'group4',  // 现在是"时代小家" (匹配度: 8/8人)
  '乐清3组': 'group5',  // 现在是"以勒小家" (匹配度: 5/5人)
  '七里港': 'group1',   // 现在是"阿茜组" (匹配度: 5/5人)
};

// ==================== 组别名称转换工具 ====================

/**
 * 根据历史组别名称获取对应的新组别ID
 * @param {string} historicalName - 历史组别名称
 * @returns {string|null} - 新组别ID，如果未找到则返回null
 */
export function getGroupIdByHistoricalName(historicalName) {
  return HISTORICAL_GROUP_NAMES[historicalName] || null;
}

/**
 * 检查是否为历史组别名称
 * @param {string} groupName - 组别名称
 * @returns {boolean} - 是否为历史组别名称
 */
export function isHistoricalGroupName(groupName) {
  return groupName in HISTORICAL_GROUP_NAMES;
}

/**
 * 获取所有历史组别名称列表
 * @returns {string[]} - 历史组别名称数组
 */
export function getAllHistoricalGroupNames() {
  return Object.keys(HISTORICAL_GROUP_NAMES);
}

/**
 * 获取所有对应的新组别ID列表
 * @returns {string[]} - 新组别ID数组
 */
export function getAllNewGroupIds() {
  return Object.values(HISTORICAL_GROUP_NAMES);
}

/**
 * 根据新组别ID查找对应的历史名称
 * @param {string} groupId - 新组别ID
 * @returns {string|null} - 历史组别名称，如果未找到则返回null
 */
export function getHistoricalNameByGroupId(groupId) {
  for (const [historicalName, newId] of Object.entries(HISTORICAL_GROUP_NAMES)) {
    if (newId === groupId) {
      return historicalName;
    }
  }
  return null;
}

/**
 * 转换组别名称（支持双向转换）
 * @param {string} groupName - 组别名称或ID
 * @param {string} direction - 转换方向：'toNew' 或 'toHistorical'
 * @returns {string} - 转换后的名称
 */
export function convertGroupName(groupName, direction = 'toNew') {
  if (direction === 'toNew') {
    // 历史名称 -> 新ID
    return getGroupIdByHistoricalName(groupName) || groupName;
  } else {
    // 新ID -> 历史名称
    return getHistoricalNameByGroupId(groupName) || groupName;
  }
}

// ==================== 数据兼容性工具 ====================

/**
 * 处理包含历史组别名称的记录
 * @param {Object} record - 签到记录对象
 * @param {Object} groupNames - 当前组别名称映射
 * @returns {Object} - 处理后的记录对象
 */
export function processHistoricalGroupRecord(record, groupNames = {}) {
  if (!record || !record.group) {
    return record;
  }

  const historicalGroupId = getGroupIdByHistoricalName(record.group);
  if (historicalGroupId && groupNames[historicalGroupId]) {
    return {
      ...record,
      group: historicalGroupId,
      originalGroup: record.group // 保留原始组别名称用于调试
    };
  }

  return record;
}

/**
 * 批量处理历史组别记录
 * @param {Array} records - 记录数组
 * @param {Object} groupNames - 当前组别名称映射
 * @returns {Array} - 处理后的记录数组
 */
export function processHistoricalGroupRecords(records, groupNames = {}) {
  if (!Array.isArray(records)) {
    return records;
  }

  return records.map(record => processHistoricalGroupRecord(record, groupNames));
}

// ==================== 调试和验证工具 ====================

/**
 * 验证历史组别映射的完整性
 * @param {Object} currentGroups - 当前组别数据
 * @returns {Object} - 验证结果
 */
export function validateHistoricalGroupMapping(currentGroups = {}) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    statistics: {
      totalHistoricalNames: Object.keys(HISTORICAL_GROUP_NAMES).length,
      matchedGroups: 0,
      unmatchedGroups: 0
    }
  };

  // 检查每个历史组别是否在当前组别中存在
  for (const [historicalName, groupId] of Object.entries(HISTORICAL_GROUP_NAMES)) {
    if (currentGroups[groupId]) {
      validation.statistics.matchedGroups++;
    } else {
      validation.statistics.unmatchedGroups++;
      validation.warnings.push(`历史组别"${historicalName}"对应的新组别ID"${groupId}"在当前数据中不存在`);
    }
  }

  if (validation.statistics.unmatchedGroups > 0) {
    validation.valid = false;
  }

  return validation;
}

/**
 * 获取历史组别映射的使用统计
 * @param {Array} records - 签到记录数组
 * @returns {Object} - 使用统计信息
 */
export function getHistoricalGroupUsageStats(records) {
  const stats = {
    totalRecords: records.length,
    historicalGroupUsage: {},
    conversionNeeded: 0
  };

  if (!Array.isArray(records)) {
    return stats;
  }

  records.forEach(record => {
    if (record.group && isHistoricalGroupName(record.group)) {
      stats.conversionNeeded++;
      stats.historicalGroupUsage[record.group] = (stats.historicalGroupUsage[record.group] || 0) + 1;
    }
  });

  return stats;
}

console.log('✅ 历史组别映射模块已加载');
