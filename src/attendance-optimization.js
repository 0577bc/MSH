/**
 * MSH签到数据优化工具
 * 基于外部记忆系统，实施签到记录结构优化
 */

// 全局变量
let attendanceRecords = [];
let originalDataSize = 0;
let optimizedDataSize = 0;
let fieldAnalysis = {};
let optimizationLog = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 签到数据优化工具初始化');
    initializeFirebase();
    addLog('info', '签到数据优化工具已启动');
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
 * 加载签到数据
 */
async function loadAttendanceData() {
    addLog('info', '开始加载签到数据...');
    
    try {
        // 从本地存储加载
        const localData = localStorage.getItem('attendanceRecords');
        if (localData) {
            attendanceRecords = JSON.parse(localData);
            addLog('success', `从本地存储加载了 ${attendanceRecords.length} 条签到记录`);
        } else {
            // 检查Firebase是否已初始化
            if (firebase.apps.length === 0) {
                addLog('error', 'Firebase未初始化，无法从Firebase加载数据');
                return;
            }
            
            // 🚨 修复：优化工具只加载当天数据，不拉取全部历史数据
            const today = new Date().toISOString().split('T')[0];
            const snapshot = await firebase.database().ref('attendanceRecords')
              .orderByChild('date')
              .equalTo(today)
              .once('value');
            const todayData = snapshot.val();
            attendanceRecords = todayData ? Object.values(todayData) : [];
            addLog('success', `从Firebase加载了当天 ${attendanceRecords.length} 条签到记录`);
        }

        // 计算原始数据大小
        originalDataSize = JSON.stringify(attendanceRecords).length;
        
        // 更新统计信息
        updateStatistics();
        
        // 显示原始结构
        displayOriginalStructure();
        
        addLog('success', '签到数据加载完成');
        
    } catch (error) {
        console.error('❌ 加载签到数据失败:', error);
        addLog('error', '加载签到数据失败: ' + error.message);
    }
}

/**
 * 分析数据结构
 */
function analyzeDataStructure() {
    if (attendanceRecords.length === 0) {
        addLog('error', '请先加载签到数据');
        return;
    }

    addLog('info', '开始分析数据结构...');
    
    // 分析字段使用情况
    fieldAnalysis = analyzeFieldUsage();
    
    // 显示字段分析结果
    displayFieldAnalysis();
    
    addLog('success', '数据结构分析完成');
}

/**
 * 分析字段使用情况
 */
function analyzeFieldUsage() {
    const analysis = {
        totalRecords: attendanceRecords.length,
        fieldUsage: {},
        redundancy: {},
        optimization: {}
    };

    // 分析每个字段的使用情况
    const sampleRecord = attendanceRecords[0];
    if (!sampleRecord) return analysis;

    // 核心字段分析
    const coreFields = ['group', 'name', 'memberUUID', 'time', 'date', 'timeSlot'];
    const memberSnapshotFields = ['uuid', 'id', 'name', 'nickname', 'gender', 'phone', 'baptized', 'age', 'joinDate'];
    const groupSnapshotFields = ['groupId', 'groupName'];
    const systemFields = ['createdAt', 'recordId'];

    // 分析核心字段
    coreFields.forEach(field => {
        analysis.fieldUsage[field] = {
            present: sampleRecord.hasOwnProperty(field),
            essential: ['group', 'memberUUID', 'time', 'timeSlot'].includes(field),
            redundant: ['name', 'date'].includes(field),
            type: typeof sampleRecord[field]
        };
    });

    // 分析成员快照字段
    if (sampleRecord.memberSnapshot) {
        memberSnapshotFields.forEach(field => {
            analysis.fieldUsage[`memberSnapshot.${field}`] = {
                present: sampleRecord.memberSnapshot.hasOwnProperty(field),
                essential: ['uuid', 'name', 'nickname'].includes(field),
                redundant: ['id', 'gender', 'phone', 'baptized', 'age', 'joinDate'].includes(field),
                type: typeof sampleRecord.memberSnapshot[field]
            };
        });
    }

    // 分析小组快照字段
    if (sampleRecord.groupSnapshot) {
        groupSnapshotFields.forEach(field => {
            analysis.fieldUsage[`groupSnapshot.${field}`] = {
                present: sampleRecord.groupSnapshot.hasOwnProperty(field),
                essential: ['groupId', 'groupName'].includes(field),
                redundant: false,
                type: typeof sampleRecord.groupSnapshot[field]
            };
        });
    }

    // 分析系统字段
    systemFields.forEach(field => {
        analysis.fieldUsage[field] = {
            present: sampleRecord.hasOwnProperty(field),
            essential: ['recordId'].includes(field),
            redundant: ['createdAt'].includes(field),
            type: typeof sampleRecord[field]
        };
    });

    return analysis;
}

/**
 * 显示字段分析结果
 */
function displayFieldAnalysis() {
    const container = document.getElementById('fieldAnalysis');
    container.innerHTML = '';

    const fieldCards = document.createElement('div');
    fieldCards.className = 'field-analysis';

    Object.entries(fieldAnalysis.fieldUsage).forEach(([field, info]) => {
        const card = document.createElement('div');
        card.className = 'field-card';
        
        const statusClass = info.essential ? 'essential' : 
                           info.redundant ? 'redundant' : 'optimizable';
        const statusText = info.essential ? '必需' : 
                          info.redundant ? '冗余' : '可优化';

        card.innerHTML = `
            <h4>${field}</h4>
            <div class="field-stats">
                <span>类型: ${info.type}</span>
                <span class="field-status ${statusClass}">${statusText}</span>
            </div>
            <div>存在: ${info.present ? '✅' : '❌'}</div>
        `;
        
        fieldCards.appendChild(card);
    });

    container.appendChild(fieldCards);
}

/**
 * 生成优化后的结构
 */
function generateOptimizedStructure() {
    if (attendanceRecords.length === 0) {
        addLog('error', '请先加载签到数据');
        return;
    }

    addLog('info', '开始生成优化后的数据结构...');
    
    // 生成优化后的记录示例
    const sampleRecord = attendanceRecords[0];
    const optimizedRecord = createOptimizedRecord(sampleRecord);
    
    // 计算优化后的数据大小
    const optimizedRecords = attendanceRecords.map(record => createOptimizedRecord(record));
    optimizedDataSize = JSON.stringify(optimizedRecords).length;
    
    // 显示优化后的结构
    displayOptimizedStructure(optimizedRecord);
    
    // 更新统计信息
    updateStatistics();
    
    addLog('success', '优化结构生成完成');
}

/**
 * 创建优化后的记录
 */
function createOptimizedRecord(originalRecord) {
    return {
        // 核心信息（精简版）
        group: originalRecord.group,
        memberUUID: originalRecord.memberUUID,
        time: new Date(originalRecord.time).toISOString(), // 统一为ISO格式
        timeSlot: originalRecord.timeSlot,
        
        // 精简快照（仅报表必需）
        memberSnapshot: {
            uuid: originalRecord.memberSnapshot?.uuid || originalRecord.memberUUID,
            name: originalRecord.memberSnapshot?.name || originalRecord.name,
            nickname: originalRecord.memberSnapshot?.nickname || ''
        },
        
        groupSnapshot: {
            groupId: originalRecord.groupSnapshot?.groupId || originalRecord.group,
            groupName: originalRecord.groupSnapshot?.groupName || ''
        },
        
        // 系统信息
        recordId: originalRecord.recordId
    };
}

/**
 * 应用优化
 */
async function applyOptimization() {
    if (attendanceRecords.length === 0) {
        addLog('error', '请先加载签到数据');
        return;
    }

    const confirmed = confirm('⚠️ 确定要应用优化吗？这将修改现有的签到数据结构。\n\n建议先备份数据！');
    if (!confirmed) {
        addLog('info', '用户取消了优化操作');
        return;
    }

    addLog('info', '开始应用优化...');
    
    try {
        // 生成优化后的数据
        const optimizedRecords = attendanceRecords.map(record => createOptimizedRecord(record));
        
        // 更新本地存储
        localStorage.setItem('attendanceRecords', JSON.stringify(optimizedRecords));
        addLog('success', '本地存储已更新');
        
        // 🚨 修复：优化工具不应覆盖全部数据，只处理当天数据
        if (firebase.apps.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = optimizedRecords.filter(record => record.date === today);
            
            if (todayRecords.length > 0) {
                // 只同步当天的优化记录
                for (const record of todayRecords) {
                    await firebase.database().ref('attendanceRecords').push(record);
                }
                addLog('success', `当天优化记录已同步: ${todayRecords.length}条`);
            } else {
                addLog('info', '当天无优化记录需要同步');
            }
        } else {
            addLog('warning', 'Firebase未初始化，仅更新了本地存储');
        }
        
        // 更新全局变量
        attendanceRecords = optimizedRecords;
        originalDataSize = optimizedDataSize;
        
        // 更新统计信息
        updateStatistics();
        
        addLog('success', '优化应用完成！');
        
    } catch (error) {
        console.error('❌ 应用优化失败:', error);
        addLog('error', '应用优化失败: ' + error.message);
    }
}

/**
 * 显示原始结构
 */
function displayOriginalStructure() {
    const container = document.getElementById('originalStructure');
    if (attendanceRecords.length > 0) {
        const sampleRecord = attendanceRecords[0];
        container.textContent = JSON.stringify(sampleRecord, null, 2);
    } else {
        container.innerHTML = '<div class="loading">无数据</div>';
    }
}

/**
 * 显示优化后的结构
 */
function displayOptimizedStructure(optimizedRecord) {
    const container = document.getElementById('optimizedStructure');
    container.textContent = JSON.stringify(optimizedRecord, null, 2);
}

/**
 * 更新统计信息
 */
function updateStatistics() {
    document.getElementById('totalRecords').textContent = attendanceRecords.length;
    document.getElementById('originalSize').textContent = formatBytes(originalDataSize);
    document.getElementById('optimizedSize').textContent = formatBytes(optimizedDataSize);
    
    if (originalDataSize > 0 && optimizedDataSize > 0) {
        const reductionRate = ((originalDataSize - optimizedDataSize) / originalDataSize * 100).toFixed(1);
        document.getElementById('reductionRate').textContent = `${reductionRate}%`;
    }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    
    optimizationLog.push(logItem);
    
    // 更新日志显示
    updateLogDisplay();
    
    console.log(`[${timestamp}] ${message}`);
}

/**
 * 更新日志显示
 */
function updateLogDisplay() {
    const container = document.getElementById('optimizationLog');
    container.innerHTML = '';
    
    optimizationLog.slice(-20).forEach(log => {
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

/**
 * 导出优化报告
 */
function exportOptimizationReport() {
    const report = {
        timestamp: new Date().toISOString(),
        totalRecords: attendanceRecords.length,
        originalSize: originalDataSize,
        optimizedSize: optimizedDataSize,
        reductionRate: originalDataSize > 0 ? ((originalDataSize - optimizedDataSize) / originalDataSize * 100).toFixed(1) : 0,
        fieldAnalysis: fieldAnalysis,
        optimizationLog: optimizationLog
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-optimization-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('success', '优化报告已导出');
}
