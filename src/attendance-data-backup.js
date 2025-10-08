// ==================== 签到数据备份工具 ====================
// 功能：备份和导出所有签到数据，为系统优化做准备
// 作者：MSH系统
// 版本：2.0

(function() {
    'use strict';

    // 全局变量
    let attendanceRecords = [];
    let backupLog = [];
    let dataAnalysis = {};

    // 初始化页面
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('💾 签到数据备份工具初始化');
        
        try {
            // 初始化Firebase
            await initializeFirebase();
            
            console.log('✅ 签到数据备份工具初始化完成');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            showError('系统初始化失败: ' + error.message);
        }
    });

    /**
     * 初始化Firebase
     */
    async function initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            console.log('✅ Firebase初始化成功');
        } catch (error) {
            console.error('❌ Firebase初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载签到数据
     */
    async function loadAttendanceData() {
        try {
            console.log('📊 开始加载签到数据...');
            addLog('开始加载签到数据...', 'info');
            
            // 从多个来源加载数据
            await loadFromMultipleSources();
            
            // 分析数据
            analyzeData();
            
            // 更新统计信息
            updateStatistics();
            
            // 显示数据预览
            displayDataPreview();
            
            addLog(`签到数据加载完成，共 ${attendanceRecords.length} 条记录`, 'success');
            
        } catch (error) {
            console.error('❌ 加载签到数据失败:', error);
            addLog('加载签到数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 从多个来源加载数据
     */
    async function loadFromMultipleSources() {
        attendanceRecords = [];
        
        // 1. 从全局变量加载
        if (window.attendanceRecords && Array.isArray(window.attendanceRecords)) {
            attendanceRecords = [...window.attendanceRecords];
            addLog(`从全局变量加载: ${attendanceRecords.length} 条记录`, 'info');
        }
        
        // 2. 从本地存储加载
        try {
            const localData = localStorage.getItem('msh_attendanceRecords');
            if (localData) {
                const localRecords = JSON.parse(localData);
                if (Array.isArray(localRecords)) {
                    // 合并数据，去重
                    const existingIds = new Set(attendanceRecords.map(r => r.recordId || r.time));
                    const newRecords = localRecords.filter(r => !existingIds.has(r.recordId || r.time));
                    attendanceRecords = [...attendanceRecords, ...newRecords];
                    addLog(`从本地存储加载: ${newRecords.length} 条新记录`, 'info');
                }
            }
        } catch (error) {
            console.error('❌ 从本地存储加载失败:', error);
        }
        
        // 3. 从Firebase加载
        try {
            const db = firebase.database();
            const snapshot = await db.ref('attendanceRecords').once('value');
            
            if (snapshot.exists()) {
                const firebaseRecords = snapshot.val();
                if (Array.isArray(firebaseRecords)) {
                    // 合并数据，去重
                    const existingIds = new Set(attendanceRecords.map(r => r.recordId || r.time));
                    const newRecords = firebaseRecords.filter(r => !existingIds.has(r.recordId || r.time));
                    attendanceRecords = [...attendanceRecords, ...newRecords];
                    addLog(`从Firebase加载: ${newRecords.length} 条新记录`, 'info');
                }
            }
        } catch (error) {
            console.error('❌ 从Firebase加载失败:', error);
        }
        
        // 按时间排序
        attendanceRecords.sort((a, b) => {
            const timeA = new Date(a.time || a.createdAt);
            const timeB = new Date(b.time || b.createdAt);
            return timeA - timeB;
        });
        
        console.log('📊 数据加载完成:', {
            总记录数: attendanceRecords.length,
            数据来源: ['全局变量', '本地存储', 'Firebase']
        });
    }

    /**
     * 分析数据
     */
    function analyzeData() {
        dataAnalysis = {
            totalRecords: attendanceRecords.length,
            uniqueMembers: new Set(),
            uniqueGroups: new Set(),
            timeSlots: {},
            dateRange: { start: null, end: null },
            dataSize: 0,
            structureAnalysis: {}
        };
        
        attendanceRecords.forEach(record => {
            // 统计成员
            if (record.name) {
                dataAnalysis.uniqueMembers.add(record.name);
            }
            if (record.memberUUID) {
                dataAnalysis.uniqueMembers.add(record.memberUUID);
            }
            
            // 统计小组
            if (record.group) {
                dataAnalysis.uniqueGroups.add(record.group);
            }
            
            // 统计时间段
            if (record.timeSlot) {
                dataAnalysis.timeSlots[record.timeSlot] = (dataAnalysis.timeSlots[record.timeSlot] || 0) + 1;
            }
            
            // 统计日期范围
            const recordTime = new Date(record.time || record.createdAt);
            if (!dataAnalysis.dateRange.start || recordTime < dataAnalysis.dateRange.start) {
                dataAnalysis.dateRange.start = recordTime;
            }
            if (!dataAnalysis.dateRange.end || recordTime > dataAnalysis.dateRange.end) {
                dataAnalysis.dateRange.end = recordTime;
            }
            
            // 分析数据结构
            Object.keys(record).forEach(key => {
                if (!dataAnalysis.structureAnalysis[key]) {
                    dataAnalysis.structureAnalysis[key] = {
                        count: 0,
                        hasValue: 0,
                        sampleValues: []
                    };
                }
                dataAnalysis.structureAnalysis[key].count++;
                if (record[key] && record[key] !== '' && record[key] !== null && record[key] !== undefined) {
                    dataAnalysis.structureAnalysis[key].hasValue++;
                    if (dataAnalysis.structureAnalysis[key].sampleValues.length < 3) {
                        dataAnalysis.structureAnalysis[key].sampleValues.push(record[key]);
                    }
                }
            });
        });
        
        // 计算数据大小
        dataAnalysis.dataSize = JSON.stringify(attendanceRecords).length;
        
        console.log('📊 数据分析完成:', dataAnalysis);
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        document.getElementById('totalRecords').textContent = dataAnalysis.totalRecords;
        document.getElementById('totalMembers').textContent = dataAnalysis.uniqueMembers.size;
        document.getElementById('totalGroups').textContent = dataAnalysis.uniqueGroups.size;
        document.getElementById('dataSize').textContent = formatBytes(dataAnalysis.dataSize);
    }

    /**
     * 显示数据预览
     */
    function displayDataPreview() {
        const container = document.getElementById('dataPreview');
        
        if (attendanceRecords.length === 0) {
            container.innerHTML = '<div class="error">❌ 没有找到签到数据</div>';
            return;
        }
        
        // 显示前3条记录作为示例
        const sampleRecords = attendanceRecords.slice(0, 3);
        
        let html = `
            <div class="success">
                <h4>📊 数据概览</h4>
                <p><strong>总记录数:</strong> ${dataAnalysis.totalRecords}</p>
                <p><strong>涉及成员:</strong> ${dataAnalysis.uniqueMembers.size}</p>
                <p><strong>涉及小组:</strong> ${dataAnalysis.uniqueGroups.size}</p>
                <p><strong>数据大小:</strong> ${formatBytes(dataAnalysis.dataSize)}</p>
                <p><strong>日期范围:</strong> ${dataAnalysis.dateRange.start ? dataAnalysis.dateRange.start.toLocaleDateString() : '未知'} - ${dataAnalysis.dateRange.end ? dataAnalysis.dateRange.end.toLocaleDateString() : '未知'}</p>
            </div>
        `;
        
        html += '<h4>📋 数据结构分析</h4>';
        html += '<div class="data-preview">';
        html += JSON.stringify(dataAnalysis.structureAnalysis, null, 2);
        html += '</div>';
        
        html += '<h4>📝 示例记录</h4>';
        html += '<div class="data-preview">';
        html += JSON.stringify(sampleRecords, null, 2);
        html += '</div>';
        
        container.innerHTML = html;
    }

    /**
     * 导出完整备份
     */
    function exportFullBackup() {
        try {
            console.log('💾 开始导出完整备份...');
            addLog('开始导出完整备份...', 'info');
            
            const backupData = {
                metadata: {
                    exportTime: new Date().toISOString(),
                    version: '2.0',
                    type: 'full_backup',
                    totalRecords: attendanceRecords.length,
                    dataAnalysis: dataAnalysis
                },
                attendanceRecords: attendanceRecords,
                systemInfo: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: Date.now()
                }
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-attendance-full-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addLog('完整备份导出成功', 'success');
            
        } catch (error) {
            console.error('❌ 导出完整备份失败:', error);
            addLog('导出完整备份失败: ' + error.message, 'error');
        }
    }

    /**
     * 导出优化备份
     */
    function exportOptimizedBackup() {
        try {
            console.log('⚡ 开始导出优化备份...');
            addLog('开始导出优化备份...', 'info');
            
            // 创建优化后的数据结构
            const optimizedRecords = attendanceRecords.map(record => {
                return {
                    // 核心信息（精简版）
                    group: record.group,
                    memberUUID: record.memberUUID,
                    time: record.time,
                    timeSlot: record.timeSlot,
                    
                    // 精简快照（仅报表必需）
                    memberSnapshot: record.memberSnapshot ? {
                        uuid: record.memberSnapshot.uuid,
                        name: record.memberSnapshot.name,
                        nickname: record.memberSnapshot.nickname
                    } : null,
                    
                    groupSnapshot: record.groupSnapshot ? {
                        groupId: record.groupSnapshot.groupId,
                        groupName: record.groupSnapshot.groupName
                    } : null,
                    
                    // 系统信息
                    recordId: record.recordId
                };
            });
            
            const backupData = {
                metadata: {
                    exportTime: new Date().toISOString(),
                    version: '2.0',
                    type: 'optimized_backup',
                    totalRecords: optimizedRecords.length,
                    optimization: {
                        originalSize: dataAnalysis.dataSize,
                        optimizedSize: JSON.stringify(optimizedRecords).length,
                        reduction: Math.round((1 - JSON.stringify(optimizedRecords).length / dataAnalysis.dataSize) * 100)
                    }
                },
                attendanceRecords: optimizedRecords,
                systemInfo: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: Date.now()
                }
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-attendance-optimized-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addLog(`优化备份导出成功，数据减少 ${Math.round((1 - JSON.stringify(optimizedRecords).length / dataAnalysis.dataSize) * 100)}%`, 'success');
            
        } catch (error) {
            console.error('❌ 导出优化备份失败:', error);
            addLog('导出优化备份失败: ' + error.message, 'error');
        }
    }

    /**
     * 分析数据结构
     */
    function analyzeDataStructure() {
        try {
            console.log('🔍 开始分析数据结构...');
            addLog('开始分析数据结构...', 'info');
            
            const analysis = {
                timestamp: new Date().toISOString(),
                totalRecords: attendanceRecords.length,
                fieldAnalysis: {},
                optimizationSuggestions: []
            };
            
            // 分析每个字段的使用情况
            Object.entries(dataAnalysis.structureAnalysis).forEach(([field, stats]) => {
                const usageRate = Math.round((stats.hasValue / stats.count) * 100);
                analysis.fieldAnalysis[field] = {
                    ...stats,
                    usageRate: usageRate,
                    isEssential: usageRate > 80,
                    isRedundant: usageRate < 20
                };
            });
            
            // 生成优化建议
            Object.entries(analysis.fieldAnalysis).forEach(([field, stats]) => {
                if (stats.isRedundant) {
                    analysis.optimizationSuggestions.push({
                        field: field,
                        suggestion: '可考虑移除',
                        reason: `使用率仅 ${stats.usageRate}%`
                    });
                } else if (stats.usageRate < 50) {
                    analysis.optimizationSuggestions.push({
                        field: field,
                        suggestion: '可考虑优化',
                        reason: `使用率 ${stats.usageRate}%，可能包含冗余数据`
                    });
                }
            });
            
            // 显示分析结果
            displayStructureAnalysis(analysis);
            
            addLog('数据结构分析完成', 'success');
            
        } catch (error) {
            console.error('❌ 分析数据结构失败:', error);
            addLog('分析数据结构失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示结构分析结果
     */
    function displayStructureAnalysis(analysis) {
        const container = document.getElementById('dataPreview');
        
        let html = '<h4>🔍 数据结构分析结果</h4>';
        
        html += '<div class="success">';
        html += '<h5>📊 字段使用率分析</h5>';
        html += '<div class="data-preview">';
        html += JSON.stringify(analysis.fieldAnalysis, null, 2);
        html += '</div>';
        html += '</div>';
        
        if (analysis.optimizationSuggestions.length > 0) {
            html += '<div class="success">';
            html += '<h5>💡 优化建议</h5>';
            html += '<ul>';
            analysis.optimizationSuggestions.forEach(suggestion => {
                html += `<li><strong>${suggestion.field}:</strong> ${suggestion.suggestion} - ${suggestion.reason}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }
        
        container.innerHTML = html;
    }

    /**
     * 格式化字节大小
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 添加日志
     */
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logItem = {
            timestamp: timestamp,
            message: message,
            type: type
        };
        
        backupLog.unshift(logItem);
        
        // 限制日志数量
        if (backupLog.length > 100) {
            backupLog = backupLog.slice(0, 100);
        }
        
        // 更新日志显示
        displayBackupLog();
        
        console.log(`[${timestamp}] ${message}`);
    }

    /**
     * 显示备份日志
     */
    function displayBackupLog() {
        const container = document.getElementById('backupLog');
        
        if (backupLog.length === 0) {
            container.innerHTML = '<div class="loading">暂无日志记录</div>';
            return;
        }

        container.innerHTML = `
            <div class="backup-log">
                ${backupLog.map(log => `
                    <div class="log-item ${log.type}">
                        <strong>${log.timestamp}</strong> - ${log.message}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 显示错误信息
     */
    function showError(message) {
        const container = document.getElementById('dataPreview');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    // 暴露全局函数
    window.loadAttendanceData = loadAttendanceData;
    window.exportFullBackup = exportFullBackup;
    window.exportOptimizedBackup = exportOptimizedBackup;
    window.analyzeDataStructure = analyzeDataStructure;

})();

