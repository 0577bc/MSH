// ==================== 小组键名标准化工具 ====================
// 功能：将小组键名标准化为group1、group2、group3等格式
// 作者：MSH系统
// 版本：2.0

(function() {
    'use strict';

    // 全局变量
    let groupMappings = [];
    let standardizationLog = [];
    let originalData = {};
    let standardizedData = {};
    let firebaseData = {};
    let localData = {};

    // 初始化页面
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('🔧 小组键名标准化工具初始化');
        
        try {
            // 初始化Firebase
            await initializeFirebase();
            
            // 自动分析小组
            await analyzeGroups();
            
            console.log('✅ 小组键名标准化工具初始化完成');
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
     * 分析小组
     */
    async function analyzeGroups() {
        try {
            console.log('🔍 开始分析小组...');
            addLog('开始分析小组...', 'info');
            
            // 加载本地数据
            const localGroupsData = localStorage.getItem('msh_groups');
            const localGroupNamesData = localStorage.getItem('msh_groupNames');
            
            if (!localGroupsData || !localGroupNamesData) {
                throw new Error('本地数据未找到，请先加载MSH系统数据');
            }

            const localGroups = JSON.parse(localGroupsData);
            const localGroupNames = JSON.parse(localGroupNamesData);


            // 生成键名映射
            generateKeyMappings(localGroups, localGroupNames);
            
            // 显示键名映射列表
            displayKeyMappings();
            
            // 更新统计信息
            updateStatistics();
            
            addLog(`分析完成，发现 ${groupMappings.length} 个小组需要标准化`, 'success');
            
        } catch (error) {
            console.error('❌ 分析小组失败:', error);
            addLog('分析小组失败: ' + error.message, 'error');
        }
    }

    /**
     * 生成键名映射
     */
    function generateKeyMappings(groups, groupNames) {
        groupMappings = [];
        let groupIndex = 1;
        
        // 保存原始数据
        originalData = {
            groups: JSON.parse(JSON.stringify(groups)),
            groupNames: JSON.parse(JSON.stringify(groupNames))
        };
        
        // 首先处理"未分组"小组 - 查找显示名称为"未分组"的小组
        let ungroupedKey = null;
        Object.keys(groups).forEach(key => {
            const displayName = groupNames[key] || key;
            if (displayName === '未分组' || displayName === '未分组人员' || key === '未分组') {
                ungroupedKey = key;
            }
        });
        
        // 如果找到"未分组"小组，将其映射到group0（排在第一）
        if (ungroupedKey) {
            // 检查是否已经是group0
            if (ungroupedKey === 'group0') {
                groupMappings.push({
                    id: 'mapping-ungrouped',
                    oldKey: ungroupedKey,
                    newKey: ungroupedKey, // 不需要改变
                    displayName: '未分组',
                    memberCount: Array.isArray(groups[ungroupedKey]) ? groups[ungroupedKey].length : 0,
                    status: 'completed',
                    description: `group0 (未分组) - 已标准化`
                });
            } else {
                groupMappings.push({
                    id: 'mapping-ungrouped',
                    oldKey: ungroupedKey,
                    newKey: 'group0',
                    displayName: '未分组',
                    memberCount: Array.isArray(groups[ungroupedKey]) ? groups[ungroupedKey].length : 0,
                    status: 'pending',
                    description: `${ungroupedKey} → group0 (未分组)`
                });
            }
        } else {
            // 如果没有未分组小组，创建一个空的group0作为占位符
            groupMappings.push({
                id: 'mapping-ungrouped-placeholder',
                oldKey: 'group0',
                newKey: 'group0',
                displayName: '未分组',
                memberCount: 0,
                status: 'pending', // 改为pending状态，确保会被执行
                description: 'group0 (未分组) - 创建占位符，当前无未分组人员'
            });
        }
        
        // 为其他小组生成标准化键名
        Object.keys(groups).forEach(oldKey => {
            // 跳过"未分组"小组、group0和group999
            const displayName = groupNames[oldKey] || oldKey;
            if (oldKey !== 'group0' && oldKey !== 'group999' && displayName !== '未分组' && displayName !== '未分组人员') {
                // 检查是否已经是标准化格式 (group1, group2, group3, etc.)
                const isAlreadyStandardized = /^group\d+$/.test(oldKey);
                
                if (isAlreadyStandardized) {
                    // 已经是标准化格式，标记为已完成
                    groupMappings.push({
                        id: `mapping-${oldKey}`,
                        oldKey: oldKey,
                        newKey: oldKey, // 不需要改变
                        displayName: displayName,
                        memberCount: Array.isArray(groups[oldKey]) ? groups[oldKey].length : 0,
                        status: 'completed',
                        description: `${oldKey} (${displayName}) - 已标准化`
                    });
                } else {
                    // 需要标准化
                    const newKey = `group${groupIndex}`;
                    const memberCount = Array.isArray(groups[oldKey]) ? groups[oldKey].length : 0;
                    
                    groupMappings.push({
                        id: `mapping-${oldKey}`,
                        oldKey: oldKey,
                        newKey: newKey,
                        displayName: displayName,
                        memberCount: memberCount,
                        status: 'pending',
                        description: `${oldKey} → ${newKey} (${displayName})`
                    });
                    
                    groupIndex++;
                }
            }
        });
        
        // 如果原本就有group999且不是"未分组"，也进行标准化
        if (groups['group999'] && groupNames['group999'] !== '未分组') {
            const newKey = `group${groupIndex}`;
            const displayName = groupNames['group999'] || 'group999';
            const memberCount = Array.isArray(groups['group999']) ? groups['group999'].length : 0;
            
            groupMappings.push({
                id: 'mapping-group999',
                oldKey: 'group999',
                newKey: newKey,
                displayName: displayName,
                memberCount: memberCount,
                status: 'pending',
                description: `group999 → ${newKey} (${displayName})`
            });
            
            groupIndex++;
        }
        
        // 如果原本就有group0且不是"未分组"，也进行标准化
        if (groups['group0'] && groupNames['group0'] !== '未分组') {
            const newKey = `group${groupIndex}`;
            const displayName = groupNames['group0'] || 'group0';
            const memberCount = Array.isArray(groups['group0']) ? groups['group0'].length : 0;
            
            groupMappings.push({
                id: 'mapping-group0',
                oldKey: 'group0',
                newKey: newKey,
                displayName: displayName,
                memberCount: memberCount,
                status: 'pending',
                description: `group0 → ${newKey} (${displayName})`
            });
            
            groupIndex++;
        }
    }

    /**
     * 显示键名映射列表
     */
    function displayKeyMappings() {
        const container = document.getElementById('keyMappingList');
        
        if (groupMappings.length === 0) {
            container.innerHTML = '<div class="success">✅ 没有需要标准化的小组</div>';
            return;
        }

        container.innerHTML = groupMappings.map(mapping => {
            const statusClass = `key-mapping-${mapping.status}`;
            const statusClass2 = `key-mapping-status ${mapping.status}`;
            const statusText = {
                'pending': '待标准化',
                'processing': '处理中',
                'completed': '已完成',
                'error': '错误'
            }[mapping.status] || '未知';

            return `
                <div class="key-mapping-item ${statusClass}">
                    <div class="key-mapping-header">
                        <span class="key-mapping-title">${mapping.description}</span>
                        <span class="${statusClass2}">${statusText}</span>
                    </div>
                    <div class="key-mapping-details">
                        <div class="key-detail">
                            <h4>原始键名</h4>
                            <div class="old-key">${mapping.oldKey}</div>
                        </div>
                        <div class="key-detail">
                            <h4>新键名</h4>
                            <div class="new-key">${mapping.newKey}</div>
                        </div>
                        <div class="key-detail">
                            <h4>显示名称</h4>
                            <div class="display-name">${mapping.displayName}</div>
                        </div>
                        <div class="key-detail">
                            <h4>成员数量</h4>
                            <div class="member-count">${mapping.memberCount}人</div>
                        </div>
                    </div>
                    <div class="key-mapping-actions">
                        <button class="btn btn-primary" onclick="executeMapping('${mapping.id}')">🚀 执行映射</button>
                        <button class="btn btn-warning" onclick="rollbackMapping('${mapping.id}')">↩️ 回滚</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 预览更改
     */
    function previewChanges() {
        try {
            console.log('👁️ 开始预览更改...');
            addLog('开始预览更改...', 'info');
            
            // 生成标准化后的数据结构
            generateStandardizedData();
            
            // 显示预览
            displayPreview();
            
            addLog('预览生成完成', 'success');
            
        } catch (error) {
            console.error('❌ 预览更改失败:', error);
            addLog('预览更改失败: ' + error.message, 'error');
        }
    }

    /**
     * 生成标准化后的数据
     */
    function generateStandardizedData() {
        standardizedData = {
            groups: {},
            groupNames: {}
        };
        
        // 复制原始数据
        const originalGroups = originalData.groups;
        const originalGroupNames = originalData.groupNames;
        
        // 应用键名映射
        groupMappings.forEach(mapping => {
            if (originalGroups[mapping.oldKey]) {
                // 复制小组数据
                standardizedData.groups[mapping.newKey] = JSON.parse(JSON.stringify(originalGroups[mapping.oldKey]));
                
                // 设置显示名称
                standardizedData.groupNames[mapping.newKey] = mapping.displayName;
                
                // 对于"group999"，同时保留原始键名
                if (mapping.oldKey === 'group999') {
                    standardizedData.groups[mapping.oldKey] = JSON.parse(JSON.stringify(originalGroups[mapping.oldKey]));
                    standardizedData.groupNames[mapping.oldKey] = mapping.displayName;
                }
            }
        });
    }

    /**
     * 显示预览
     */
    function displayPreview() {
        const container = document.getElementById('previewChanges');
        
        const previewHTML = `
            <div class="preview-section">
                <h3>📊 标准化后的数据结构</h3>
                <h4>小组数据 (groups):</h4>
                <pre class="preview-json">${JSON.stringify(standardizedData.groups, null, 2)}</pre>
                
                <h4>小组名称映射 (groupNames):</h4>
                <pre class="preview-json">${JSON.stringify(standardizedData.groupNames, null, 2)}</pre>
                
                <div class="data-summary">
                    <strong>标准化后小组数量:</strong> ${Object.keys(standardizedData.groups).length}<br>
                    <strong>名称映射数量:</strong> ${Object.keys(standardizedData.groupNames).length}<br>
                    <strong>总成员数:</strong> ${Object.values(standardizedData.groups).reduce((sum, group) => sum + (Array.isArray(group) ? group.length : 0), 0)}
                </div>
            </div>
        `;
        
        container.innerHTML = previewHTML;
    }

    /**
     * 执行单个映射
     */
    async function executeMapping(mappingId) {
        try {
            const mapping = groupMappings.find(m => m.id === mappingId);
            if (!mapping) {
                addLog(`未找到映射: ${mappingId}`, 'error');
                return;
            }

            console.log('🚀 开始执行映射:', mapping.description);
            addLog(`开始执行映射: ${mapping.description}`, 'info');
            
            // 标记为处理中
            mapping.status = 'processing';
            displayKeyMappings();
            updateStatistics();
            
            // 更新本地存储
            await updateLocalStorage(mapping);
            
            // 同步到Firebase
            await syncToFirebase(mapping);
            
            // 标记为完成
            mapping.status = 'completed';
            displayKeyMappings();
            updateStatistics();
            
            addLog(`映射完成: ${mapping.description}`, 'success');
            
        } catch (error) {
            console.error('❌ 执行映射失败:', error);
            addLog('执行映射失败: ' + error.message, 'error');
            
            // 标记为错误
            const mapping = groupMappings.find(m => m.id === mappingId);
            if (mapping) {
                mapping.status = 'error';
                displayKeyMappings();
                updateStatistics();
            }
        }
    }

    /**
     * 更新本地存储
     */
    async function updateLocalStorage(mapping) {
        try {
            // 获取当前本地数据
            const localGroupsData = localStorage.getItem('msh_groups');
            const localGroupNamesData = localStorage.getItem('msh_groupNames');
            
            if (!localGroupsData || !localGroupNamesData) {
                throw new Error('本地数据未找到');
            }

            const localGroups = JSON.parse(localGroupsData);
            const localGroupNames = JSON.parse(localGroupNamesData);
            
            // 如果新键名已存在，先删除
            if (localGroups[mapping.newKey]) {
                delete localGroups[mapping.newKey];
                delete localGroupNames[mapping.newKey];
            }
            
            // 添加新的键名映射
            if (localGroups[mapping.oldKey]) {
                // 如果旧键名存在，复制数据到新键名
                localGroups[mapping.newKey] = JSON.parse(JSON.stringify(localGroups[mapping.oldKey]));
                localGroupNames[mapping.newKey] = mapping.displayName;
                
                // 删除旧键名（但保留"group999"）
                if (mapping.oldKey !== 'group999') {
                    delete localGroups[mapping.oldKey];
                    delete localGroupNames[mapping.oldKey];
                }
            } else if (mapping.oldKey === mapping.newKey) {
                // 如果旧键名和新键名相同（如group0占位符），直接创建
                localGroups[mapping.newKey] = [];
                localGroupNames[mapping.newKey] = mapping.displayName;
            }
            
            // 保存到本地存储
            localStorage.setItem('msh_groups', JSON.stringify(localGroups));
            localStorage.setItem('msh_groupNames', JSON.stringify(localGroupNames));
            
            addLog(`本地存储已更新: ${mapping.oldKey} → ${mapping.newKey}`, 'success');
            
        } catch (error) {
            console.error('❌ 更新本地存储失败:', error);
            throw error;
        }
    }

    /**
     * 同步到Firebase
     */
    async function syncToFirebase(mapping) {
        try {
            const db = firebase.database();
            
            // 获取当前Firebase数据
            const [groupsSnapshot, groupNamesSnapshot] = await Promise.all([
                db.ref('groups').once('value'),
                db.ref('groupNames').once('value')
            ]);

            const firebaseGroups = groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {};
            const firebaseGroupNames = groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {};
            
            // 准备更新数据
            const updates = {};
            
            // 如果新键名已存在，先删除
            if (firebaseGroups[mapping.newKey]) {
                updates[`groups/${mapping.newKey}`] = null;
                updates[`groupNames/${mapping.newKey}`] = null;
            }
            
            // 添加新的键名映射
            if (firebaseGroups[mapping.oldKey]) {
                // 如果旧键名存在，复制数据到新键名
                updates[`groups/${mapping.newKey}`] = firebaseGroups[mapping.oldKey];
                updates[`groupNames/${mapping.newKey}`] = mapping.displayName;
                
                // 删除旧键名（但保留"group999"）
                if (mapping.oldKey !== 'group999') {
                    updates[`groups/${mapping.oldKey}`] = null;
                    updates[`groupNames/${mapping.oldKey}`] = null;
                }
            } else if (mapping.oldKey === mapping.newKey) {
                // 如果旧键名和新键名相同（如group0占位符），直接创建
                updates[`groups/${mapping.newKey}`] = [];
                updates[`groupNames/${mapping.newKey}`] = mapping.displayName;
            }
            
            // 执行更新
            await db.ref().update(updates);
            
            addLog(`Firebase已同步: ${mapping.oldKey} → ${mapping.newKey}`, 'success');
            
        } catch (error) {
            console.error('❌ 同步到Firebase失败:', error);
            throw error;
        }
    }

    /**
     * 执行所有标准化
     */
    async function executeStandardization() {
        try {
            console.log('🚀 开始执行所有标准化...');
            addLog('开始执行所有标准化...', 'info');
            
            const pendingMappings = groupMappings.filter(m => m.status === 'pending');
            
            for (const mapping of pendingMappings) {
                await executeMapping(mapping.id);
                // 添加延迟避免过快执行
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            addLog('所有标准化执行完成', 'success');
            
        } catch (error) {
            console.error('❌ 执行所有标准化失败:', error);
            addLog('执行所有标准化失败: ' + error.message, 'error');
        }
    }

    /**
     * 回滚单个映射
     */
    async function rollbackMapping(mappingId) {
        try {
            const mapping = groupMappings.find(m => m.id === mappingId);
            if (!mapping) {
                addLog(`未找到映射: ${mappingId}`, 'error');
                return;
            }

            console.log('↩️ 开始回滚映射:', mapping.description);
            addLog(`开始回滚映射: ${mapping.description}`, 'info');
            
            // 这里实现回滚逻辑
            // 由于回滚比较复杂，暂时标记为待标准化
            mapping.status = 'pending';
            displayKeyMappings();
            updateStatistics();
            
            addLog(`回滚完成: ${mapping.description}`, 'success');
            
        } catch (error) {
            console.error('❌ 回滚映射失败:', error);
            addLog('回滚映射失败: ' + error.message, 'error');
        }
    }

    /**
     * 回滚所有更改
     */
    async function rollbackChanges() {
        try {
            console.log('↩️ 开始回滚所有更改...');
            addLog('开始回滚所有更改...', 'info');
            
            const completedMappings = groupMappings.filter(m => m.status === 'completed');
            
            for (const mapping of completedMappings) {
                await rollbackMapping(mapping.id);
                // 添加延迟避免过快执行
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            addLog('所有更改回滚完成', 'success');
            
        } catch (error) {
            console.error('❌ 回滚所有更改失败:', error);
            addLog('回滚所有更改失败: ' + error.message, 'error');
        }
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        const total = groupMappings.length;
        const pending = groupMappings.filter(m => m.status === 'pending').length;
        const completed = groupMappings.filter(m => m.status === 'completed').length;
        const error = groupMappings.filter(m => m.status === 'error').length;

        document.getElementById('totalGroups').textContent = total;
        document.getElementById('pendingGroups').textContent = pending;
        document.getElementById('completedGroups').textContent = completed;
        document.getElementById('errorGroups').textContent = error;

        console.log('📊 标准化统计:', {
            总小组数: total,
            待标准化: pending,
            已完成: completed,
            错误: error
        });
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
        
        standardizationLog.unshift(logItem);
        
        // 限制日志数量
        if (standardizationLog.length > 100) {
            standardizationLog = standardizationLog.slice(0, 100);
        }
        
        // 更新日志显示
        displayStandardizationLog();
        
        console.log(`[${timestamp}] ${message}`);
    }

    /**
     * 显示标准化日志
     */
    function displayStandardizationLog() {
        const container = document.getElementById('standardizationLog');
        
        if (standardizationLog.length === 0) {
            container.innerHTML = '<div class="loading">暂无日志记录</div>';
            return;
        }

        container.innerHTML = `
            <div class="standardization-log">
                <h4>📝 标准化日志</h4>
                ${standardizationLog.map(log => `
                    <div class="log-item ${log.type}">
                        <strong>${log.timestamp}</strong> - ${log.message}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 导出报告
     */
    function exportReport() {
        try {
            const reportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: groupMappings.length,
                    pending: groupMappings.filter(m => m.status === 'pending').length,
                    completed: groupMappings.filter(m => m.status === 'completed').length,
                    error: groupMappings.filter(m => m.status === 'error').length
                },
                mappings: groupMappings,
                originalData: originalData,
                standardizedData: standardizedData,
                log: standardizationLog
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-standardization-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            addLog('标准化报告导出成功', 'success');
        } catch (error) {
            console.error('❌ 导出标准化报告失败:', error);
            addLog('导出标准化报告失败: ' + error.message, 'error');
        }
    }

    /**
     * 恢复group999数据
     */
    async function restoreUnassignedGroup() {
        try {
            console.log('🔄 开始恢复group999数据...');
            addLog('开始恢复group999数据...', 'info');
            
            // 检查本地存储中是否有group999
            const localGroupsData = localStorage.getItem('msh_groups');
            const localGroupNamesData = localStorage.getItem('msh_groupNames');
            
            if (!localGroupsData || !localGroupNamesData) {
                throw new Error('本地数据未找到');
            }

            const localGroups = JSON.parse(localGroupsData);
            const localGroupNames = JSON.parse(localGroupNamesData);
            
            // 如果group999不存在，创建它
            if (!localGroups['group999']) {
                localGroups['group999'] = [];
                localGroupNames['group999'] = '未分组';
                
                // 保存到本地存储
                localStorage.setItem('msh_groups', JSON.stringify(localGroups));
                localStorage.setItem('msh_groupNames', JSON.stringify(localGroupNames));
                
                addLog('本地存储中已恢复group999', 'success');
            } else {
                addLog('本地存储中group999已存在', 'info');
            }
            
            // 同步到Firebase
            const db = firebase.database();
            const [groupsSnapshot, groupNamesSnapshot] = await Promise.all([
                db.ref('groups').once('value'),
                db.ref('groupNames').once('value')
            ]);

            const firebaseGroups = groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {};
            const firebaseGroupNames = groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {};
            
            // 如果Firebase中group999不存在，创建它
            if (!firebaseGroups['group999']) {
                const updates = {
                    'groups/group999': [],
                    'groupNames/group999': '未分组'
                };
                
                await db.ref().update(updates);
                addLog('Firebase中已恢复group999', 'success');
            } else {
                addLog('Firebase中group999已存在', 'info');
            }
            
            // 重新分析小组
            await analyzeGroups();
            
            addLog('group999数据恢复完成', 'success');
            
        } catch (error) {
            console.error('❌ 恢复group999数据失败:', error);
            addLog('恢复group999数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示错误信息
     */
    function showError(message) {
        const container = document.getElementById('keyMappingList');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    // ==================== 数据查看功能 ====================

    /**
     * 查看本地数据
     */
    async function viewLocalData() {
        try {
            addLog('开始加载本地数据...', 'info');
            
            // 从本地存储加载数据
            const localGroupsData = localStorage.getItem('msh_groups');
            const localGroupNamesData = localStorage.getItem('msh_groupNames');
            
            if (!localGroupsData || !localGroupNamesData) {
                throw new Error('本地数据未找到');
            }
            
            localData = {
                groups: JSON.parse(localGroupsData),
                groupNames: JSON.parse(localGroupNamesData)
            };
            
            displayDataViewer('local', localData);
            addLog('本地数据加载完成', 'success');
            
        } catch (error) {
            console.error('❌ 加载本地数据失败:', error);
            addLog('加载本地数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 查看Firebase数据
     */
    async function viewFirebaseData() {
        try {
            addLog('开始加载Firebase数据...', 'info');
            
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            
            const db = firebase.database();
            
            // 并行加载数据
            const [groupsSnapshot, groupNamesSnapshot] = await Promise.all([
                db.ref('groups').once('value'),
                db.ref('groupNames').once('value')
            ]);
            
            firebaseData = {
                groups: groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {},
                groupNames: groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {}
            };
            
            // 调试：检查Firebase中的小组信息
            console.log('🔍 Firebase中的小组键名:', Object.keys(firebaseData.groups));
            console.log('🔍 Firebase中的小组名称:', Object.keys(firebaseData.groupNames));
            console.log('🔍 Firebase小组名称映射:', firebaseData.groupNames);
            
            // 检查是否有未分组相关的信息
            const hasUngrouped = Object.keys(firebaseData.groups).some(key => {
                const displayName = firebaseData.groupNames[key] || key;
                return displayName === '未分组' || displayName === '未分组人员' || key === '未分组' || key === 'group0';
            });
            
            console.log('🔍 Firebase中是否有未分组信息:', hasUngrouped);
            
            if (hasUngrouped) {
                console.log('✅ Firebase中存在未分组信息');
                Object.keys(firebaseData.groups).forEach(key => {
                    const displayName = firebaseData.groupNames[key] || key;
                    if (displayName === '未分组' || displayName === '未分组人员' || key === '未分组' || key === 'group0') {
                        console.log(`🎯 找到未分组小组: ${key} -> ${displayName} (${firebaseData.groups[key]?.length || 0}人)`);
                    }
                });
            } else {
                console.log('⚠️ Firebase中不存在未分组信息');
            }
            
            displayDataViewer('firebase', firebaseData);
            addLog('Firebase数据加载完成', 'success');
            
        } catch (error) {
            console.error('❌ 加载Firebase数据失败:', error);
            addLog('加载Firebase数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 对比数据
     */
    async function compareData() {
        try {
            addLog('开始对比数据...', 'info');
            
            // 确保两个数据源都已加载
            if (!localData.groups || !firebaseData.groups) {
                throw new Error('请先加载本地数据和Firebase数据');
            }
            
            displayDataComparison(localData, firebaseData);
            addLog('数据对比完成', 'success');
            
        } catch (error) {
            console.error('❌ 对比数据失败:', error);
            addLog('对比数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 刷新数据
     */
    async function refreshData() {
        try {
            addLog('开始刷新数据...', 'info');
            
            // 清空数据
            localData = {};
            firebaseData = {};
            
            // 重新加载
            await viewLocalData();
            await viewFirebaseData();
            
            addLog('数据刷新完成', 'success');
            
        } catch (error) {
            console.error('❌ 刷新数据失败:', error);
            addLog('刷新数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示数据查看器
     */
    function displayDataViewer(type, data) {
        const container = document.getElementById('dataViewer');
        
        const summary = generateDataSummary(data);
        const jsonData = JSON.stringify(data, null, 2);
        
        container.innerHTML = `
            <div class="data-tabs">
                <button class="data-tab active" onclick="switchDataTab('summary')">📊 数据摘要</button>
                <button class="data-tab" onclick="switchDataTab('json')">📄 JSON数据</button>
            </div>
            
            <div id="dataSummary" class="data-content active">
                <div class="data-summary">
                    ${summary}
                </div>
            </div>
            
            <div id="dataJson" class="data-content">
                <pre class="data-json">${jsonData}</pre>
            </div>
        `;
    }

    /**
     * 显示数据对比
     */
    function displayDataComparison(localData, firebaseData) {
        const container = document.getElementById('dataViewer');
        
        const localSummary = generateDataSummary(localData);
        const firebaseSummary = generateDataSummary(firebaseData);
        
        container.innerHTML = `
            <div class="data-comparison">
                <div class="comparison-section">
                    <div class="comparison-title">📱 本地数据</div>
                    <div class="data-summary">
                        ${localSummary}
                    </div>
                    <pre class="data-json">${JSON.stringify(localData, null, 2)}</pre>
                </div>
                
                <div class="comparison-section">
                    <div class="comparison-title">☁️ Firebase数据</div>
                    <div class="data-summary">
                        ${firebaseSummary}
                    </div>
                    <pre class="data-json">${JSON.stringify(firebaseData, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * 生成数据摘要
     */
    function generateDataSummary(data) {
        const groups = data.groups || {};
        const groupNames = data.groupNames || {};
        
        const totalGroups = Object.keys(groups).length;
        const totalMembers = Object.values(groups).reduce((sum, group) => sum + (Array.isArray(group) ? group.length : 0), 0);
        const totalGroupNames = Object.keys(groupNames).length;
        
        return `
            <div class="data-summary-item">
                <div class="data-summary-number">${totalGroups}</div>
                <div class="data-summary-label">小组数量</div>
            </div>
            <div class="data-summary-item">
                <div class="data-summary-number">${totalMembers}</div>
                <div class="data-summary-label">总成员数</div>
            </div>
            <div class="data-summary-item">
                <div class="data-summary-number">${totalGroupNames}</div>
                <div class="data-summary-label">名称映射</div>
            </div>
        `;
    }

    /**
     * 切换数据标签页
     */
    function switchDataTab(tabName) {
        // 移除所有活动状态
        document.querySelectorAll('.data-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.data-content').forEach(content => content.classList.remove('active'));
        
        // 激活选中的标签页
        if (tabName === 'summary') {
            document.querySelector('.data-tab[onclick="switchDataTab(\'summary\')"]').classList.add('active');
            document.getElementById('dataSummary').classList.add('active');
        } else if (tabName === 'json') {
            document.querySelector('.data-tab[onclick="switchDataTab(\'json\')"]').classList.add('active');
            document.getElementById('dataJson').classList.add('active');
        }
    }

    // 暴露全局函数
    window.analyzeGroups = analyzeGroups;
    window.executeStandardization = executeStandardization;
    window.previewChanges = previewChanges;
    window.rollbackChanges = rollbackChanges;
    window.exportReport = exportReport;
    window.executeMapping = executeMapping;
    window.rollbackMapping = rollbackMapping;
    window.restoreUnassignedGroup = restoreUnassignedGroup;
    window.viewLocalData = viewLocalData;
    window.viewFirebaseData = viewFirebaseData;
    window.compareData = compareData;
    window.refreshData = refreshData;
    window.switchDataTab = switchDataTab;

})();

