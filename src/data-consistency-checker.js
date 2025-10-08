/**
 * MSH数据一致性检测工具
 * 检测Firebase和本地存储的签到信息一致性
 */

// 全局变量
let firebaseData = [];
let localData = [];
let comparisonResults = [];
let consistencyLog = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 数据一致性检测工具初始化');
    initializeFirebase();
    addLog('info', '数据一致性检测工具已启动');
});

/**
 * 初始化Firebase
 */
function initializeFirebase() {
    try {
        // 检查是否已经初始化
        if (firebase.apps.length === 0) {
            // 使用window.firebaseConfig而不是config.firebaseConfig
            const firebaseConfig = window.firebaseConfig || config?.firebaseConfig;
            if (!firebaseConfig) {
                throw new Error('Firebase配置未找到');
            }
            firebase.initializeApp(firebaseConfig);
        }
        console.log('✅ Firebase初始化成功');
        addLog('success', 'Firebase连接成功');
    } catch (error) {
        console.error('❌ Firebase初始化失败:', error);
        addLog('error', 'Firebase连接失败: ' + error.message);
    }
}

/**
 * 加载Firebase数据
 */
async function loadFirebaseData() {
    addLog('info', '开始加载Firebase数据...');
    
    try {
        // 检查Firebase是否已初始化
        if (firebase.apps.length === 0) {
            addLog('error', 'Firebase未初始化，无法加载数据');
            return;
        }
        
        // 从Firebase加载签到记录
        const snapshot = await firebase.database().ref('attendanceRecords').once('value');
        firebaseData = snapshot.val() || [];
        
        // 更新统计信息
        document.getElementById('firebaseRecords').textContent = firebaseData.length;
        
        addLog('success', `从Firebase加载了 ${firebaseData.length} 条签到记录`);
        
    } catch (error) {
        console.error('❌ 加载Firebase数据失败:', error);
        addLog('error', '加载Firebase数据失败: ' + error.message);
    }
}

/**
 * 加载本地数据
 */
function loadLocalData() {
    addLog('info', '开始加载本地数据...');
    
    try {
        // 检查所有可能的键名
        const possibleKeys = ['msh_attendanceRecords', 'attendanceRecords', 'msh_attendance_records'];
        let localDataStr = null;
        let usedKey = null;
        
        for (const key of possibleKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                localDataStr = data;
                usedKey = key;
                addLog('info', `在键名 "${key}" 中找到数据`);
                break;
            }
        }
        
        if (localDataStr) {
            localData = JSON.parse(localDataStr);
            addLog('success', `从本地存储加载了 ${localData.length} 条签到记录 (键名: ${usedKey})`);
            
            // 显示数据示例
            if (localData.length > 0) {
                addLog('info', `数据示例: ${JSON.stringify(localData[0]).substring(0, 100)}...`);
            }
        } else {
            localData = [];
            addLog('warning', '本地存储中未找到签到记录数据');
            addLog('info', '检查的键名: ' + possibleKeys.join(', '));
            
            // 显示本地存储中的所有键
            const allKeys = Object.keys(localStorage);
            addLog('info', `本地存储中的所有键: ${allKeys.join(', ')}`);
        }
        
        // 更新统计信息
        const localRecordsElement = document.getElementById('localRecords');
        if (localRecordsElement) {
            localRecordsElement.textContent = localData.length;
        } else {
            addLog('warning', '未找到localRecords元素');
        }
        
        // 检查数据格式
        if (localData.length > 0) {
            addLog('info', '本地数据加载完成，可以进行数据对比');
        }
        
    } catch (error) {
        console.error('❌ 加载本地数据失败:', error);
        addLog('error', '加载本地数据失败: ' + error.message);
    }
}

/**
 * 对比数据
 */
function compareData() {
    if (firebaseData.length === 0 && localData.length === 0) {
        addLog('error', '请先加载Firebase和本地数据');
        return;
    }
    
    addLog('info', '开始对比数据...');
    
    try {
        comparisonResults = [];
        let consistentCount = 0;
        let inconsistentCount = 0;
        
        // 创建Firebase数据索引
        const firebaseIndex = {};
        const firebaseKeys = [];
        firebaseData.forEach((record, index) => {
            const key = generateRecordKey(record);
            firebaseIndex[key] = { record, index };
            firebaseKeys.push(key);
        });
        
        // 创建本地数据索引
        const localIndex = {};
        const localKeys = [];
        localData.forEach((record, index) => {
            const key = generateRecordKey(record);
            localIndex[key] = { record, index };
            localKeys.push(key);
        });
        
        addLog('info', `Firebase记录键数量: ${firebaseKeys.length}`);
        addLog('info', `本地记录键数量: ${localKeys.length}`);
        
        // 检查重复键
        const firebaseKeySet = new Set(firebaseKeys);
        const localKeySet = new Set(localKeys);
        
        if (firebaseKeys.length !== firebaseKeySet.size) {
            const duplicateCount = firebaseKeys.length - firebaseKeySet.size;
            addLog('warning', `Firebase中有 ${duplicateCount} 个重复键`);
            
            // 找出重复的键
            const firebaseKeyCounts = {};
            firebaseKeys.forEach(key => {
                firebaseKeyCounts[key] = (firebaseKeyCounts[key] || 0) + 1;
            });
            
            const firebaseDuplicates = Object.keys(firebaseKeyCounts).filter(key => firebaseKeyCounts[key] > 1);
            addLog('warning', `Firebase重复键: ${firebaseDuplicates.join(', ')}`);
        }
        
        if (localKeys.length !== localKeySet.size) {
            const duplicateCount = localKeys.length - localKeySet.size;
            addLog('warning', `本地中有 ${duplicateCount} 个重复键`);
            
            // 找出重复的键
            const localKeyCounts = {};
            localKeys.forEach(key => {
                localKeyCounts[key] = (localKeyCounts[key] || 0) + 1;
            });
            
            const localDuplicates = Object.keys(localKeyCounts).filter(key => localKeyCounts[key] > 1);
            addLog('warning', `本地重复键: ${localDuplicates.join(', ')}`);
        }
        
        // 对比所有记录
        const allKeys = new Set([...Object.keys(firebaseIndex), ...Object.keys(localIndex)]);
        
        // 找出仅在Firebase或仅在本地的记录
        const firebaseOnlyKeys = [];
        const localOnlyKeys = [];
        
        allKeys.forEach(key => {
            const firebaseRecord = firebaseIndex[key];
            const localRecord = localIndex[key];
            
            const comparison = {
                key,
                firebaseExists: !!firebaseRecord,
                localExists: !!localRecord,
                status: 'unknown',
                differences: []
            };
            
            if (firebaseRecord && localRecord) {
                // 两个都存在，检查内容是否一致
                const differences = compareRecordContent(firebaseRecord.record, localRecord.record);
                if (differences.length === 0) {
                    comparison.status = 'consistent';
                    consistentCount++;
                } else {
                    comparison.status = 'inconsistent';
                    comparison.differences = differences;
                    inconsistentCount++;
                }
            } else if (firebaseRecord && !localRecord) {
                // 只在Firebase存在
                comparison.status = 'firebase_only';
                firebaseOnlyKeys.push(key);
                inconsistentCount++;
            } else if (!firebaseRecord && localRecord) {
                // 只在本地存在
                comparison.status = 'local_only';
                localOnlyKeys.push(key);
                inconsistentCount++;
            }
            
            comparison.firebaseRecord = firebaseRecord?.record;
            comparison.localRecord = localRecord?.record;
            comparisonResults.push(comparison);
        });
        
        // 显示未匹配的记录信息
        if (firebaseOnlyKeys.length > 0) {
            addLog('warning', `仅在Firebase中的记录 (${firebaseOnlyKeys.length}条):`);
            firebaseOnlyKeys.slice(0, 3).forEach(key => {
                const record = firebaseIndex[key].record;
                addLog('warning', `- 键: ${key}, 成员: ${record.name || '未知'}, 时间: ${record.time || record.date || '未知'}`);
            });
        }
        
        if (localOnlyKeys.length > 0) {
            addLog('warning', `仅在本地的记录 (${localOnlyKeys.length}条):`);
            localOnlyKeys.slice(0, 3).forEach(key => {
                const record = localIndex[key].record;
                addLog('warning', `- 键: ${key}, 成员: ${record.name || '未知'}, 时间: ${record.time || record.date || '未知'}`);
            });
        }
        
        // 更新统计信息
        document.getElementById('consistentRecords').textContent = consistentCount;
        document.getElementById('inconsistentRecords').textContent = inconsistentCount;
        
        // 显示对比结果
        displayComparisonResults();
        
        addLog('success', `数据对比完成: ${consistentCount} 条一致, ${inconsistentCount} 条不一致`);
        
    } catch (error) {
        console.error('❌ 数据对比失败:', error);
        addLog('error', '数据对比失败: ' + error.message);
    }
}

/**
 * 生成记录键
 */
function generateRecordKey(record) {
    // 使用记录ID或生成唯一键
    if (record.recordId) {
        return record.recordId;
    }
    
    // 如果没有recordId，使用其他字段组合
    const time = record.time || (record.date ? record.date : '');
    const name = record.name || '';
    const group = record.group || '';
    
    return `${group}_${name}_${time}`;
}

/**
 * 对比记录内容
 */
function compareRecordContent(record1, record2) {
    const differences = [];
    
    // 对比所有字段
    const fields = ['group', 'name', 'memberUUID', 'time', 'date', 'timeSlot', 'createdAt', 'recordId'];
    
    fields.forEach(field => {
        const value1 = record1[field];
        const value2 = record2[field];
        
        if (value1 !== value2) {
            differences.push({
                field,
                firebaseValue: value1,
                localValue: value2
            });
        }
    });
    
    // 对比嵌套对象
    if (record1.memberSnapshot && record2.memberSnapshot) {
        const memberFields = ['uuid', 'id', 'name', 'nickname', 'gender', 'phone', 'baptized', 'age', 'joinDate'];
        memberFields.forEach(field => {
            const value1 = record1.memberSnapshot[field];
            const value2 = record2.memberSnapshot[field];
            
            if (value1 !== value2) {
                differences.push({
                    field: `memberSnapshot.${field}`,
                    firebaseValue: value1,
                    localValue: value2
                });
            }
        });
    }
    
    if (record1.groupSnapshot && record2.groupSnapshot) {
        const groupFields = ['groupId', 'groupName'];
        groupFields.forEach(field => {
            const value1 = record1.groupSnapshot[field];
            const value2 = record2.groupSnapshot[field];
            
            if (value1 !== value2) {
                differences.push({
                    field: `groupSnapshot.${field}`,
                    firebaseValue: value1,
                    localValue: value2
                });
            }
        });
    }
    
    return differences;
}

/**
 * 显示对比结果
 */
function displayComparisonResults() {
    const container = document.getElementById('comparisonResults');
    container.innerHTML = '';
    
    if (comparisonResults.length === 0) {
        container.innerHTML = '<div class="loading">暂无对比结果</div>';
        return;
    }
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'comparison-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>记录键</th>
            <th>状态</th>
            <th>Firebase (小组名称)</th>
            <th>本地 (小组名称)</th>
            <th>差异数量</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    comparisonResults.forEach(result => {
        const row = document.createElement('tr');
        
        const statusClass = result.status === 'consistent' ? 'status-consistent' : 
                           result.status === 'inconsistent' ? 'status-inconsistent' : 'status-missing';
        
        const statusText = result.status === 'consistent' ? '✅ 一致' :
                          result.status === 'inconsistent' ? '❌ 不一致' :
                          result.status === 'firebase_only' ? '⚠️ 仅Firebase' :
                          result.status === 'local_only' ? '⚠️ 仅本地' : '❓ 未知';
        
        // 获取显示用的小组名称
        const getDisplayGroupName = (record) => {
            if (record && record.groupSnapshot && record.groupSnapshot.groupName) {
                return record.groupSnapshot.groupName;
            }
            if (record && record.group && window.groupNames && window.groupNames[record.group]) {
                return window.groupNames[record.group];
            }
            return record ? record.group : '未知';
        };
        
        const firebaseGroupName = result.firebaseRecord ? getDisplayGroupName(result.firebaseRecord) : '-';
        const localGroupName = result.localRecord ? getDisplayGroupName(result.localRecord) : '-';
        
        row.innerHTML = `
            <td>${result.key}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${result.firebaseExists ? '✅' : '❌'} ${firebaseGroupName}</td>
            <td>${result.localExists ? '✅' : '❌'} ${localGroupName}</td>
            <td>${result.differences.length}</td>
            <td>
                <button class="btn btn-primary" onclick="showDetails('${result.key}')" style="padding: 4px 8px; font-size: 12px;">
                    查看详情
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * 显示详细信息
 */
function showDetails(key) {
    const result = comparisonResults.find(r => r.key === key);
    if (!result) return;
    
    // 获取显示用的小组名称
    const getDisplayGroupName = (record) => {
        if (record && record.groupSnapshot && record.groupSnapshot.groupName) {
            return record.groupSnapshot.groupName;
        }
        if (record && record.group && window.groupNames && window.groupNames[record.group]) {
            return window.groupNames[record.group];
        }
        return record ? record.group : '未知';
    };
    
    let details = `记录键: ${result.key}\n`;
    details += `状态: ${result.status}\n`;
    details += `Firebase存在: ${result.firebaseExists ? '是' : '否'}\n`;
    details += `本地存在: ${result.localExists ? '是' : '否'}\n\n`;
    
    // 显示小组名称信息
    if (result.firebaseRecord) {
        const firebaseGroupName = getDisplayGroupName(result.firebaseRecord);
        details += `Firebase小组名称: ${firebaseGroupName}\n`;
    }
    if (result.localRecord) {
        const localGroupName = getDisplayGroupName(result.localRecord);
        details += `本地小组名称: ${localGroupName}\n`;
    }
    details += '\n';
    
    if (result.differences.length > 0) {
        details += '差异详情:\n';
        result.differences.forEach(diff => {
            details += `- ${diff.field}: Firebase="${diff.firebaseValue}", 本地="${diff.localValue}"\n`;
        });
    }
    
    alert(details);
}

/**
 * 生成报告
 */
function generateReport() {
    if (comparisonResults.length === 0) {
        addLog('error', '请先进行数据对比');
        return;
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        firebaseRecords: firebaseData.length,
        localRecords: localData.length,
        totalComparisons: comparisonResults.length,
        consistentRecords: comparisonResults.filter(r => r.status === 'consistent').length,
        inconsistentRecords: comparisonResults.filter(r => r.status === 'inconsistent').length,
        firebaseOnlyRecords: comparisonResults.filter(r => r.status === 'firebase_only').length,
        localOnlyRecords: comparisonResults.filter(r => r.status === 'local_only').length,
        comparisonResults: comparisonResults
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-consistency-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('success', '一致性报告已导出');
}

/**
 * 同步数据 - 修复版本：将本地数据同步到Firebase
 */
async function syncData() {
    if (comparisonResults.length === 0) {
        addLog('error', '请先进行数据对比');
        return;
    }
    
    const confirmed = confirm('⚠️ 确定要同步数据吗？\n\n这将把本地数据同步到Firebase数据库。\n\n建议先备份数据！');
    if (!confirmed) {
        addLog('info', '用户取消了数据同步');
        return;
    }
    
    addLog('info', '开始同步数据...');
    
    try {
        // 检查Firebase是否已初始化
        if (firebase.apps.length === 0) {
            addLog('error', 'Firebase未初始化，无法同步数据');
            return;
        }

        // 使用本地数据更新Firebase（正确的同步方向）
        const ref = firebase.database().ref('attendanceRecords');
        await ref.set(localData);
        
        // 重新加载Firebase数据以验证同步
        await loadFirebaseData();
        
        // 重新对比数据
        compareData();
        
        addLog('success', `数据同步完成：已将 ${localData.length} 条记录同步到Firebase`);
        
    } catch (error) {
        console.error('❌ 数据同步失败:', error);
        addLog('error', '数据同步失败: ' + error.message);
    }
}

/**
 * 验证数据格式
 */
async function validateDataFormat() {
    addLog('info', '开始验证数据格式...');
    
    try {
        // 检查Firebase是否已初始化
        if (firebase.apps.length === 0) {
            addLog('error', 'Firebase未初始化，无法验证数据');
            return;
        }
        
        const snapshot = await firebase.database().ref('attendanceRecords').once('value');
        const records = snapshot.val() || [];
        const recordsArray = Array.isArray(records) ? records : Object.values(records);

        let validRecords = 0;
        let invalidRecords = 0;
        let formatIssues = [];

        recordsArray.forEach((record, index) => {
            let isValid = true;
            let issues = [];

            // 验证date格式 (YYYY-MM-DD) - 基于外部记忆系统标准
            // 注意：根据记忆系统，date字段已优化移除，优先使用time字段
            const dateValue = record.date || (record.time ? new Date(record.time).toISOString().split('T')[0] : '');
            if (dateValue) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dateValue)) {
                    isValid = false;
                    issues.push(`date格式错误: ${dateValue} (应为YYYY-MM-DD格式)`);
                }
            }

            // 验证time格式 - 基于外部记忆系统，应为ISO标准格式
            if (record.time) {
                // 检查是否为ISO标准格式
                const isoTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
                if (!isoTimeRegex.test(record.time)) {
                    // 如果不是ISO格式，检查是否为有效日期
                    try {
                        const timeObj = new Date(record.time);
                        if (isNaN(timeObj.getTime())) {
                            isValid = false;
                            issues.push(`time格式错误: ${record.time} (应为ISO标准格式)`);
                        } else {
                            addLog('warning', `记录 ${index}: time字段不是标准ISO格式: ${record.time}`);
                        }
                    } catch (error) {
                        isValid = false;
                        issues.push(`time解析错误: ${record.time}`);
                    }
                }
            }

            // 验证timeSlot格式 - 基于外部记忆系统标准
            if (record.timeSlot) {
                const validTimeSlots = ['early', 'onTime', 'late', 'afternoon', 'invalid'];
                if (!validTimeSlots.includes(record.timeSlot)) {
                    isValid = false;
                    issues.push(`timeSlot格式错误: ${record.timeSlot} (应为early/onTime/late/afternoon/invalid之一)`);
                }
            }

            // 验证UUID格式
            if (record.memberUUID) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(record.memberUUID)) {
                    isValid = false;
                    issues.push(`memberUUID格式错误: ${record.memberUUID}`);
                }
            }

            // 验证recordId格式 - 基于外部记忆系统标准
            if (record.recordId) {
                const recordIdRegex = /^att_\d+_[a-z0-9]+$/;
                if (!recordIdRegex.test(record.recordId)) {
                    isValid = false;
                    issues.push(`recordId格式错误: ${record.recordId} (应为att_时间戳_随机字符串格式)`);
                }
            }

            // 验证createdAt格式 - 应为时间戳
            if (record.createdAt) {
                if (typeof record.createdAt !== 'number' || record.createdAt <= 0) {
                    isValid = false;
                    issues.push(`createdAt格式错误: ${record.createdAt} (应为时间戳)`);
                }
            }

            if (isValid) {
                validRecords++;
            } else {
                invalidRecords++;
                formatIssues.push({
                    index,
                    issues,
                    record: {
                        name: record.name,
                        group: record.group,
                        time: record.time
                    }
                });
                addLog('warning', `记录 ${index}: 格式问题 [${issues.join(', ')}]`);
            }
        });

        // 显示详细验证结果
        displayValidationResults(validRecords, invalidRecords, formatIssues);
        addLog('success', `验证完成！格式正确记录: ${validRecords}, 格式错误记录: ${invalidRecords}`);

    } catch (error) {
        console.error('❌ 验证失败:', error);
        addLog('error', '验证失败: ' + error.message);
    }
}

/**
 * 显示验证结果
 */
function displayValidationResults(validRecords, invalidRecords, formatIssues) {
    const container = document.getElementById('comparisonResults');
    container.innerHTML = '';
    
    // 创建验证结果摘要
    const summary = document.createElement('div');
    summary.className = 'validation-summary';
    summary.innerHTML = `
        <h3>📊 数据格式验证结果</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${validRecords}</div>
                <div class="stat-label">格式正确</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${invalidRecords}</div>
                <div class="stat-label">格式错误</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${((validRecords / (validRecords + invalidRecords)) * 100).toFixed(1)}%</div>
                <div class="stat-label">正确率</div>
            </div>
        </div>
    `;
    container.appendChild(summary);
    
    // 显示详细问题列表
    if (formatIssues.length > 0) {
        const issuesTable = document.createElement('table');
        issuesTable.className = 'comparison-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>记录索引</th>
                <th>成员姓名</th>
                <th>小组</th>
                <th>时间</th>
                <th>格式问题</th>
            </tr>
        `;
        issuesTable.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        formatIssues.forEach(issue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${issue.index}</td>
                <td>${issue.record.name}</td>
                <td>${issue.record.group}</td>
                <td>${issue.record.time}</td>
                <td>${issue.issues.join(', ')}</td>
            `;
            tbody.appendChild(row);
        });
        issuesTable.appendChild(tbody);
        container.appendChild(issuesTable);
    }
}

/**
 * 添加日志
 */
function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logItem = {
        type,
        message,
        timestamp
    };
    
    consistencyLog.push(logItem);
    
    // 更新日志显示
    updateLogDisplay();
    
    console.log(`[${timestamp}] ${message}`);
}

/**
 * 更新日志显示
 */
function updateLogDisplay() {
    const container = document.getElementById('consistencyLog');
    container.innerHTML = '';
    
    consistencyLog.slice(-20).forEach(log => {
        const logElement = document.createElement('div');
        logElement.className = `log-item ${log.type}`;
        logElement.innerHTML = `
            <strong>[${log.timestamp}]</strong> ${log.message}
        `;
        container.appendChild(logElement);
    });
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
}
