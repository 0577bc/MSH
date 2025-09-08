/**
 * Web Worker - 异步数据同步处理
 * 避免同步操作阻塞UI线程
 */

// 监听主线程消息
self.addEventListener('message', function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'SYNC_DATA':
            handleDataSync(data);
            break;
        case 'VALIDATE_DATA':
            handleDataValidation(data);
            break;
        case 'MERGE_DATA':
            handleDataMerge(data);
            break;
        case 'PROCESS_LARGE_DATASET':
            handleLargeDataset(data);
            break;
        default:
            self.postMessage({
                type: 'ERROR',
                error: `未知的消息类型: ${type}`
            });
    }
});

/**
 * 处理数据同步
 */
function handleDataSync(data) {
    try {
        const { localData, remoteData, conflictResolution } = data;
        
        // 模拟数据同步处理
        const startTime = performance.now();
        
        // 数据比较和合并逻辑
        const conflicts = findConflicts(localData, remoteData);
        const mergedData = mergeData(localData, remoteData, conflictResolution);
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        self.postMessage({
            type: 'SYNC_COMPLETE',
            data: {
                mergedData,
                conflicts,
                processingTime,
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'SYNC_ERROR',
            error: error.message
        });
    }
}

/**
 * 处理数据验证
 */
function handleDataValidation(data) {
    try {
        const { dataset, validationRules } = data;
        const startTime = performance.now();
        
        const validationResults = validateDataset(dataset, validationRules);
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        self.postMessage({
            type: 'VALIDATION_COMPLETE',
            data: {
                results: validationResults,
                processingTime,
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'VALIDATION_ERROR',
            error: error.message
        });
    }
}

/**
 * 处理数据合并
 */
function handleDataMerge(data) {
    try {
        const { datasets, mergeStrategy } = data;
        const startTime = performance.now();
        
        const mergedData = performDataMerge(datasets, mergeStrategy);
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        self.postMessage({
            type: 'MERGE_COMPLETE',
            data: {
                mergedData,
                processingTime,
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'MERGE_ERROR',
            error: error.message
        });
    }
}

/**
 * 处理大数据集
 */
function handleLargeDataset(data) {
    try {
        const { dataset, operation, options } = data;
        const startTime = performance.now();
        
        let result;
        switch (operation) {
            case 'SORT':
                result = sortLargeDataset(dataset, options);
                break;
            case 'FILTER':
                result = filterLargeDataset(dataset, options);
                break;
            case 'SEARCH':
                result = searchLargeDataset(dataset, options);
                break;
            case 'STATISTICS':
                result = calculateStatistics(dataset, options);
                break;
            default:
                throw new Error(`不支持的操作: ${operation}`);
        }
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        self.postMessage({
            type: 'LARGE_DATASET_COMPLETE',
            data: {
                result,
                operation,
                processingTime,
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'LARGE_DATASET_ERROR',
            error: error.message
        });
    }
}

/**
 * 查找数据冲突
 */
function findConflicts(localData, remoteData) {
    const conflicts = [];
    
    // 比较签到记录
    if (localData.attendanceRecords && remoteData.attendanceRecords) {
        const localRecords = localData.attendanceRecords;
        const remoteRecords = remoteData.attendanceRecords;
        
        // 查找相同ID但内容不同的记录
        for (const localRecord of localRecords) {
            const remoteRecord = remoteRecords.find(r => r.id === localRecord.id);
            if (remoteRecord && !isEqual(localRecord, remoteRecord)) {
                conflicts.push({
                    type: 'attendance_record',
                    id: localRecord.id,
                    local: localRecord,
                    remote: remoteRecord
                });
            }
        }
    }
    
    // 比较组数据
    if (localData.groups && remoteData.groups) {
        const localGroups = localData.groups;
        const remoteGroups = remoteData.groups;
        
        for (const [groupName, localGroup] of Object.entries(localGroups)) {
            const remoteGroup = remoteGroups[groupName];
            if (remoteGroup && !isEqual(localGroup, remoteGroup)) {
                conflicts.push({
                    type: 'group',
                    name: groupName,
                    local: localGroup,
                    remote: remoteGroup
                });
            }
        }
    }
    
    return conflicts;
}

/**
 * 合并数据
 */
function mergeData(localData, remoteData, conflictResolution) {
    const mergedData = {
        attendanceRecords: [],
        groups: {},
        groupNames: {},
        lastSync: Date.now()
    };
    
    // 合并签到记录
    if (localData.attendanceRecords && remoteData.attendanceRecords) {
        const allRecords = [...localData.attendanceRecords, ...remoteData.attendanceRecords];
        const uniqueRecords = new Map();
        
        for (const record of allRecords) {
            const key = `${record.id}_${record.date}_${record.timeSlot}`;
            if (!uniqueRecords.has(key)) {
                uniqueRecords.set(key, record);
            } else {
                // 处理冲突
                const existing = uniqueRecords.get(key);
                const resolved = resolveConflict(existing, record, conflictResolution);
                uniqueRecords.set(key, resolved);
            }
        }
        
        mergedData.attendanceRecords = Array.from(uniqueRecords.values());
    }
    
    // 合并组数据
    if (localData.groups && remoteData.groups) {
        mergedData.groups = { ...remoteData.groups, ...localData.groups };
    }
    
    if (localData.groupNames && remoteData.groupNames) {
        mergedData.groupNames = { ...remoteData.groupNames, ...localData.groupNames };
    }
    
    return mergedData;
}

/**
 * 解决冲突
 */
function resolveConflict(existing, incoming, strategy) {
    switch (strategy) {
        case 'local':
            return existing;
        case 'remote':
            return incoming;
        case 'newest':
            return existing.timestamp > incoming.timestamp ? existing : incoming;
        case 'merge':
            return { ...existing, ...incoming, timestamp: Date.now() };
        default:
            return incoming;
    }
}

/**
 * 验证数据集
 */
function validateDataset(dataset, rules) {
    const results = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    // 验证签到记录
    if (dataset.attendanceRecords) {
        for (const record of dataset.attendanceRecords) {
            if (!record.id || !record.name || !record.date) {
                results.errors.push(`无效的签到记录: ${JSON.stringify(record)}`);
                results.valid = false;
            }
        }
    }
    
    // 验证组数据
    if (dataset.groups) {
        for (const [groupName, group] of Object.entries(dataset.groups)) {
            if (!groupName || !group.members || !Array.isArray(group.members)) {
                results.errors.push(`无效的组数据: ${groupName}`);
                results.valid = false;
            }
        }
    }
    
    return results;
}

/**
 * 执行数据合并
 */
function performDataMerge(datasets, strategy) {
    const merged = {};
    
    for (const dataset of datasets) {
        for (const [key, value] of Object.entries(dataset)) {
            if (merged[key]) {
                merged[key] = mergeValues(merged[key], value, strategy);
            } else {
                merged[key] = value;
            }
        }
    }
    
    return merged;
}

/**
 * 合并值
 */
function mergeValues(existing, incoming, strategy) {
    if (Array.isArray(existing) && Array.isArray(incoming)) {
        return [...existing, ...incoming];
    } else if (typeof existing === 'object' && typeof incoming === 'object') {
        return { ...existing, ...incoming };
    } else {
        return incoming;
    }
}

/**
 * 排序大数据集
 */
function sortLargeDataset(dataset, options) {
    const { key, order = 'asc' } = options;
    
    return dataset.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (order === 'desc') {
            return bVal > aVal ? 1 : -1;
        } else {
            return aVal > bVal ? 1 : -1;
        }
    });
}

/**
 * 过滤大数据集
 */
function filterLargeDataset(dataset, options) {
    const { filter, value } = options;
    
    return dataset.filter(item => {
        switch (filter) {
            case 'equals':
                return item[filter] === value;
            case 'contains':
                return item[filter].includes(value);
            case 'startsWith':
                return item[filter].startsWith(value);
            case 'endsWith':
                return item[filter].endsWith(value);
            default:
                return true;
        }
    });
}

/**
 * 搜索大数据集
 */
function searchLargeDataset(dataset, options) {
    const { query, fields } = options;
    const lowerQuery = query.toLowerCase();
    
    return dataset.filter(item => {
        for (const field of fields) {
            if (item[field] && item[field].toLowerCase().includes(lowerQuery)) {
                return true;
            }
        }
        return false;
    });
}

/**
 * 计算统计信息
 */
function calculateStatistics(dataset, options) {
    const { fields } = options;
    const stats = {};
    
    for (const field of fields) {
        const values = dataset.map(item => item[field]).filter(val => val !== undefined);
        
        if (values.length > 0) {
            stats[field] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                sum: values.reduce((a, b) => a + b, 0),
                average: values.reduce((a, b) => a + b, 0) / values.length
            };
        }
    }
    
    return stats;
}

/**
 * 深度比较两个对象
 */
function isEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!isEqual(obj1[key], obj2[key])) return false;
        }
        
        return true;
    }
    
    return obj1 === obj2;
}
