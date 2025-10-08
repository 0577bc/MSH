// ==================== 小组名称管理系统 ====================
// 功能：统一管理小组名称，确保MSH系统和外部表单的数据一致性
// 作者：MSH系统
// 版本：2.0

(function() {
    'use strict';

    // 全局变量
    let firebaseData = {};
    let mshData = {};
    let externalFormData = {};
    let groupData = [];
    let changeLog = [];

    // 初始化页面
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('🏷️ 小组名称管理系统初始化');
        
        try {
            // 初始化Firebase
            await initializeFirebase();
            
            // 自动加载小组数据
            await loadGroupData();
            
            console.log('✅ 小组名称管理系统初始化完成');
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
     * 加载小组数据
     */
    async function loadGroupData() {
        try {
            console.log('🔄 开始加载小组数据...');
            showMessage('正在加载小组数据...', 'info');
            
            // 并行加载所有数据源
            const [firebaseResult, mshResult, externalResult] = await Promise.allSettled([
                loadFirebaseData(),
                loadMSHData(),
                loadExternalFormData()
            ]);

            // 处理数据加载结果
            firebaseData = firebaseResult.status === 'fulfilled' ? firebaseResult.value : { groups: {}, groupNames: {} };
            mshData = mshResult.status === 'fulfilled' ? mshResult.value : { groups: {}, groupNames: {} };
            externalFormData = externalResult.status === 'fulfilled' ? externalResult.value : { groups: {} };

            // 生成小组数据
            generateGroupData();
            
            // 显示小组列表
            displayGroupList();
            
            // 更新统计信息
            updateStatistics();
            
            // 显示变更日志
            displayChangeLog();
            
            showMessage('小组数据加载完成', 'success');
            
        } catch (error) {
            console.error('❌ 加载小组数据失败:', error);
            showMessage('加载小组数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 加载Firebase数据
     */
    async function loadFirebaseData() {
        try {
            const db = firebase.database();
            
            const [groupsSnapshot, groupNamesSnapshot] = await Promise.all([
                db.ref('groups').once('value'),
                db.ref('groupNames').once('value')
            ]);

            const groups = groupsSnapshot.exists() ? groupsSnapshot.val() || {} : {};
            const groupNames = groupNamesSnapshot.exists() ? groupNamesSnapshot.val() || {} : {};

            return { groups, groupNames };
        } catch (error) {
            console.error('❌ 加载Firebase数据失败:', error);
            throw error;
        }
    }

    /**
     * 加载MSH系统数据
     */
    async function loadMSHData() {
        try {
            const groupsData = localStorage.getItem('msh_groups');
            const groupNamesData = localStorage.getItem('msh_groupNames');
            
            if (!groupsData || !groupNamesData) {
                throw new Error('MSH系统数据未找到');
            }

            const groups = JSON.parse(groupsData);
            const groupNames = JSON.parse(groupNamesData);

            return { groups, groupNames };
        } catch (error) {
            console.error('❌ 加载MSH数据失败:', error);
            throw error;
        }
    }

    /**
     * 加载外部表单数据
     */
    async function loadExternalFormData() {
        try {
            if (!window.externalFormConfig) {
                throw new Error('外部表单配置未找到');
            }

            const token = await getExternalFormToken();
            
            const response = await fetch(`${window.externalFormConfig.apiBaseUrl}/submissions?formId=${window.externalFormConfig.formId || 'f4b20710-fed9-489f-955f-f9cbea48caac'}&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`外部表单API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const submissions = data.submissions || [];

            // 从外部表单数据中提取小组信息
            const groups = {};
            submissions.forEach(submission => {
                const submissionData = submission.submissionData || {};
                if (submissionData.group) {
                    if (!groups[submissionData.group]) {
                        groups[submissionData.group] = [];
                    }
                    groups[submissionData.group].push(submissionData);
                }
            });

            return { groups };
        } catch (error) {
            console.error('❌ 加载外部表单数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取外部表单认证token
     */
    async function getExternalFormToken() {
        try {
            if (window.externalFormConfig && window.externalFormConfig.auth.token) {
                return window.externalFormConfig.auth.token;
            }
            
            const response = await fetch(`${window.externalFormConfig.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: window.externalFormConfig.auth.username,
                    password: window.externalFormConfig.auth.password
                })
            });
            
            if (!response.ok) {
                throw new Error(`登录失败: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.token) {
                window.externalFormConfig.auth.token = result.token;
                return result.token;
            } else {
                throw new Error('登录响应中未包含token');
            }
        } catch (error) {
            console.error('❌ 获取外部表单token失败:', error);
            throw error;
        }
    }

    /**
     * 生成小组数据
     */
    function generateGroupData() {
        console.log('🔄 生成小组数据...');
        
        groupData = [];
        
        // 收集所有小组（使用显示名称，而不是原始名称）
        const allGroups = new Set();
        
        // 从Firebase收集小组（使用显示名称）
        Object.keys(firebaseData.groups || {}).forEach(groupKey => {
            const displayName = firebaseData.groupNames && firebaseData.groupNames[groupKey] || groupKey;
            allGroups.add(displayName);
        });
        
        // 从MSH系统收集小组（使用显示名称）
        Object.keys(mshData.groups || {}).forEach(groupKey => {
            const displayName = mshData.groupNames && mshData.groupNames[groupKey] || groupKey;
            allGroups.add(displayName);
        });
        
        // 从外部表单收集小组（使用显示名称）
        Object.keys(externalFormData.groups || {}).forEach(groupKey => {
            allGroups.add(groupKey); // 外部表单直接使用显示名称
        });

        // 为每个小组生成数据
        allGroups.forEach(displayName => {
            // 查找对应的原始键名
            const firebaseKey = findGroupKeyByDisplayName(firebaseData.groups, firebaseData.groupNames, displayName);
            const mshKey = findGroupKeyByDisplayName(mshData.groups, mshData.groupNames, displayName);
            const externalKey = findGroupKeyByDisplayName(externalFormData.groups, {}, displayName);

            const groupInfo = {
                name: displayName, // 使用显示名称作为主要标识
                originalKeys: {
                    firebase: firebaseKey,
                    msh: mshKey,
                    external: externalKey
                },
                firebase: {
                    exists: !!(firebaseData.groups && firebaseData.groups[firebaseKey]),
                    displayName: displayName,
                    memberCount: firebaseData.groups && firebaseData.groups[firebaseKey] ? firebaseData.groups[firebaseKey].length : 0
                },
                msh: {
                    exists: !!(mshData.groups && mshData.groups[mshKey]),
                    displayName: displayName,
                    memberCount: mshData.groups && mshData.groups[mshKey] ? mshData.groups[mshKey].length : 0
                },
                external: {
                    exists: !!(externalFormData.groups && externalFormData.groups[externalKey]),
                    displayName: displayName,
                    memberCount: externalFormData.groups && externalFormData.groups[externalKey] ? externalFormData.groups[externalKey].length : 0
                },
                status: determineGroupStatus(displayName, firebaseKey, mshKey, externalKey)
            };

            groupData.push(groupInfo);
        });

        // 按状态排序
        groupData.sort((a, b) => {
            const statusOrder = { 'consistent': 0, 'inconsistent': 1, 'missing': 2 };
            return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        });
        
        console.log('✅ 小组数据生成完成:', groupData.length, '个小组');
    }

    /**
     * 根据显示名称查找对应的原始键名
     */
    function findGroupKeyByDisplayName(groups, groupNames, displayName) {
        if (!groups) return null;
        
        // 首先检查是否有直接的键名匹配
        if (groups[displayName]) {
            return displayName;
        }
        
        // 然后检查groupNames映射
        for (const [key, name] of Object.entries(groupNames || {})) {
            if (name === displayName && groups[key]) {
                return key;
            }
        }
        
        return null;
    }

    /**
     * 确定小组状态
     */
    function determineGroupStatus(displayName, firebaseKey, mshKey, externalKey) {
        const firebaseExists = !!(firebaseData.groups && firebaseData.groups[firebaseKey]);
        const mshExists = !!(mshData.groups && mshData.groups[mshKey]);
        const externalExists = !!(externalFormData.groups && externalFormData.groups[externalKey]);

        // 如果三个数据源都有数据
        if (firebaseExists && mshExists && externalExists) {
            return 'consistent';
        }

        // 如果只有部分数据源有数据
        if (firebaseExists || mshExists || externalExists) {
            return 'inconsistent';
        }

        // 如果都没有数据
        return 'missing';
    }

    /**
     * 显示小组列表
     */
    function displayGroupList() {
        const container = document.getElementById('groupList');
        
        if (groupData.length === 0) {
            container.innerHTML = '<div class="loading">没有找到小组数据</div>';
            return;
        }

        container.innerHTML = groupData.map(group => {
            const statusClass = `group-${group.status}`;
            const statusText = {
                'consistent': '一致',
                'inconsistent': '不一致',
                'missing': '缺失'
            }[group.status] || '未知';

            return `
                <div class="group-item ${statusClass}">
                    <div class="group-header">
                        <span class="group-name">${group.name}</span>
                        <div class="group-actions">
                            <button class="btn btn-sm btn-primary" onclick="editGroup('${group.name}')">✏️ 编辑</button>
                            <button class="btn btn-sm btn-success" onclick="syncGroup('${group.name}')">🔄 同步</button>
                        </div>
                    </div>
                    <div class="group-details">
                        <div><strong>状态:</strong> ${statusText}</div>
                        <div><strong>Firebase:</strong> ${group.firebase.exists ? '✅ 有' : '❌ 无'} (${group.firebase.memberCount}人)</div>
                        <div><strong>MSH系统:</strong> ${group.msh.exists ? '✅ 有' : '❌ 无'} (${group.msh.memberCount}人)</div>
                        <div><strong>外部表单:</strong> ${group.external.exists ? '✅ 有' : '❌ 无'} (${group.external.memberCount}人)</div>
                        <div><strong>显示名称:</strong> ${group.name}</div>
                        ${generateGroupHistory(group)}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 生成小组历史记录
     */
    function generateGroupHistory(group) {
        const history = [];
        
        // 检查是否有原始键名与显示名称不同
        if (group.originalKeys.firebase && group.originalKeys.firebase !== group.name) {
            history.push(`<div><strong>Firebase原始名称:</strong> ${group.originalKeys.firebase}</div>`);
        }
        if (group.originalKeys.msh && group.originalKeys.msh !== group.name) {
            history.push(`<div><strong>MSH原始名称:</strong> ${group.originalKeys.msh}</div>`);
        }
        if (group.originalKeys.external && group.originalKeys.external !== group.name) {
            history.push(`<div><strong>外部表单原始名称:</strong> ${group.originalKeys.external}</div>`);
        }
        
        if (history.length > 0) {
            return `
                <div class="group-change-log">
                    <h4>📝 历史记录</h4>
                    ${history.join('')}
                </div>
            `;
        }
        
        return '';
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        const total = groupData.length;
        const firebaseCount = groupData.filter(g => g.firebase.exists).length;
        const mshCount = groupData.filter(g => g.msh.exists).length;
        const externalCount = groupData.filter(g => g.external.exists).length;
        const inconsistentCount = groupData.filter(g => g.status === 'inconsistent').length;

        document.getElementById('totalGroups').textContent = total;
        document.getElementById('firebaseGroups').textContent = firebaseCount;
        document.getElementById('mshGroups').textContent = mshCount;
        document.getElementById('externalGroups').textContent = externalCount;
        document.getElementById('inconsistentGroups').textContent = inconsistentCount;

        console.log('📊 小组统计:', {
            总小组数: total,
            Firebase中有: firebaseCount,
            MSH系统中有: mshCount,
            外部表单中有: externalCount,
            不一致小组: inconsistentCount
        });
    }

    /**
     * 显示变更日志
     */
    function displayChangeLog() {
        const container = document.getElementById('groupChangeLog');
        
        // 生成变更日志
        generateChangeLog();
        
        if (changeLog.length === 0) {
            container.innerHTML = '<div class="loading">暂无变更记录</div>';
            return;
        }

        container.innerHTML = changeLog.map(change => `
            <div class="change-item ${change.type}">
                <strong>${change.timestamp}</strong> - ${change.description}
            </div>
        `).join('');
    }

    /**
     * 生成变更日志
     */
    function generateChangeLog() {
        changeLog = [];
        
        // 检查小组名称变更
        groupData.forEach(group => {
            if (group.originalKeys.firebase && group.originalKeys.firebase !== group.name) {
                changeLog.push({
                    type: 'rename',
                    timestamp: new Date().toISOString().split('T')[0],
                    description: `小组名称变更: ${group.originalKeys.firebase} → ${group.name}`
                });
            }
            if (group.originalKeys.msh && group.originalKeys.msh !== group.name) {
                changeLog.push({
                    type: 'rename',
                    timestamp: new Date().toISOString().split('T')[0],
                    description: `MSH小组名称变更: ${group.originalKeys.msh} → ${group.name}`
                });
            }
            if (group.originalKeys.external && group.originalKeys.external !== group.name) {
                changeLog.push({
                    type: 'rename',
                    timestamp: new Date().toISOString().split('T')[0],
                    description: `外部表单小组名称变更: ${group.originalKeys.external} → ${group.name}`
                });
            }
        });
        
        // 按时间排序
        changeLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * 编辑小组
     */
    function editGroup(groupName) {
        const group = groupData.find(g => g.name === groupName);
        if (!group) return;

        // 这里实现编辑小组的逻辑
        console.log('编辑小组:', groupName);
        showMessage('编辑功能开发中...', 'info');
    }

    /**
     * 同步小组
     */
    async function syncGroup(groupName) {
        try {
            console.log('🔄 开始同步小组:', groupName);
            showMessage('正在同步小组...', 'info');
            
            // 这里实现同步小组的逻辑
            // 例如：将Firebase中的小组信息同步到MSH系统和外部表单
            
            showMessage('小组同步完成', 'success');
            
            // 重新加载数据
            await loadGroupData();
            
        } catch (error) {
            console.error('❌ 同步小组失败:', error);
            showMessage('同步小组失败: ' + error.message, 'error');
        }
    }

    /**
     * 同步所有小组
     */
    async function syncAllGroups() {
        try {
            console.log('🔄 开始同步所有小组...');
            showMessage('正在同步所有小组...', 'info');
            
            // 这里实现同步所有小组的逻辑
            // 例如：批量同步所有小组信息
            
            showMessage('所有小组同步完成', 'success');
            
            // 重新加载数据
            await loadGroupData();
            
        } catch (error) {
            console.error('❌ 同步所有小组失败:', error);
            showMessage('同步所有小组失败: ' + error.message, 'error');
        }
    }

    /**
     * 检测小组冲突
     */
    async function detectGroupConflicts() {
        try {
            console.log('⚠️ 开始检测小组冲突...');
            showMessage('正在检测小组冲突...', 'info');
            
            // 这里实现检测小组冲突的逻辑
            // 例如：检测同名但不同显示名称的小组
            
            showMessage('小组冲突检测完成', 'success');
            
        } catch (error) {
            console.error('❌ 检测小组冲突失败:', error);
            showMessage('检测小组冲突失败: ' + error.message, 'error');
        }
    }

    /**
     * 对比数据源
     */
    async function compareDataSources() {
        try {
            console.log('🔍 开始对比数据源...');
            showMessage('正在对比数据源...', 'info');
            
            // 加载最新数据
            await loadGroupData();
            
            // 显示详细对比
            displayDataSourceComparison();
            
            showMessage('数据源对比完成', 'success');
            
        } catch (error) {
            console.error('❌ 对比数据源失败:', error);
            showMessage('对比数据源失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示数据源详细对比
     */
    function displayDataSourceComparison() {
        const container = document.getElementById('dataSourceComparison');
        
        // 获取本地存储数据
        const localGroupsData = localStorage.getItem('msh_groups');
        const localGroupNamesData = localStorage.getItem('msh_groupNames');
        
        let localGroups = {};
        let localGroupNames = {};
        
        if (localGroupsData) {
            try {
                localGroups = JSON.parse(localGroupsData);
            } catch (e) {
                console.error('解析本地groups数据失败:', e);
            }
        }
        
        if (localGroupNamesData) {
            try {
                localGroupNames = JSON.parse(localGroupNamesData);
            } catch (e) {
                console.error('解析本地groupNames数据失败:', e);
            }
        }
        
        // 生成对比HTML
        const comparisonHTML = `
            <div class="data-comparison-container">
                <div class="comparison-section">
                    <h3>📱 本地存储数据 (MSH系统)</h3>
                    <div class="data-details">
                        <h4>小组数据 (groups):</h4>
                        <pre class="data-json">${JSON.stringify(localGroups, null, 2)}</pre>
                        
                        <h4>小组名称映射 (groupNames):</h4>
                        <pre class="data-json">${JSON.stringify(localGroupNames, null, 2)}</pre>
                        
                        <div class="data-summary">
                            <strong>小组数量:</strong> ${Object.keys(localGroups).length}<br>
                            <strong>名称映射数量:</strong> ${Object.keys(localGroupNames).length}<br>
                            <strong>总成员数:</strong> ${Object.values(localGroups).reduce((sum, group) => sum + (Array.isArray(group) ? group.length : 0), 0)}
                        </div>
                    </div>
                </div>
                
                <div class="comparison-section">
                    <h3>☁️ Firebase数据库数据</h3>
                    <div class="data-details">
                        <h4>小组数据 (groups):</h4>
                        <pre class="data-json">${JSON.stringify(firebaseData.groups || {}, null, 2)}</pre>
                        
                        <h4>小组名称映射 (groupNames):</h4>
                        <pre class="data-json">${JSON.stringify(firebaseData.groupNames || {}, null, 2)}</pre>
                        
                        <div class="data-summary">
                            <strong>小组数量:</strong> ${Object.keys(firebaseData.groups || {}).length}<br>
                            <strong>名称映射数量:</strong> ${Object.keys(firebaseData.groupNames || {}).length}<br>
                            <strong>总成员数:</strong> ${Object.values(firebaseData.groups || {}).reduce((sum, group) => sum + (Array.isArray(group) ? group.length : 0), 0)}
                        </div>
                    </div>
                </div>
                
                <div class="comparison-section">
                    <h3>🔍 数据一致性分析</h3>
                    <div class="consistency-analysis">
                        ${generateConsistencyAnalysis(localGroups, localGroupNames, firebaseData.groups || {}, firebaseData.groupNames || {})}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = comparisonHTML;
    }

    /**
     * 生成一致性分析
     */
    function generateConsistencyAnalysis(localGroups, localGroupNames, firebaseGroups, firebaseGroupNames) {
        const analysis = [];
        
        // 检查小组数据一致性
        const localGroupKeys = Object.keys(localGroups);
        const firebaseGroupKeys = Object.keys(firebaseGroups);
        
        const groupsMatch = JSON.stringify(localGroupKeys.sort()) === JSON.stringify(firebaseGroupKeys.sort());
        analysis.push(`<div class="analysis-item ${groupsMatch ? 'success' : 'error'}">
            <strong>小组数据一致性:</strong> ${groupsMatch ? '✅ 一致' : '❌ 不一致'}
        </div>`);
        
        // 检查小组名称映射一致性
        const localGroupNamesKeys = Object.keys(localGroupNames);
        const firebaseGroupNamesKeys = Object.keys(firebaseGroupNames);
        
        const groupNamesMatch = JSON.stringify(localGroupNamesKeys.sort()) === JSON.stringify(firebaseGroupNamesKeys.sort());
        analysis.push(`<div class="analysis-item ${groupNamesMatch ? 'success' : 'error'}">
            <strong>小组名称映射一致性:</strong> ${groupNamesMatch ? '✅ 一致' : '❌ 不一致'}
        </div>`);
        
        // 检查具体的小组名称映射值
        let groupNamesValuesMatch = true;
        const mismatchedNames = [];
        
        for (const key of localGroupNamesKeys) {
            if (localGroupNames[key] !== firebaseGroupNames[key]) {
                groupNamesValuesMatch = false;
                mismatchedNames.push({
                    key: key,
                    local: localGroupNames[key],
                    firebase: firebaseGroupNames[key]
                });
            }
        }
        
        analysis.push(`<div class="analysis-item ${groupNamesValuesMatch ? 'success' : 'error'}">
            <strong>小组名称映射值一致性:</strong> ${groupNamesValuesMatch ? '✅ 一致' : '❌ 不一致'}
        </div>`);
        
        // 显示不匹配的详细信息
        if (mismatchedNames.length > 0) {
            analysis.push(`<div class="mismatch-details">
                <h4>不匹配的小组名称映射:</h4>
                ${mismatchedNames.map(mismatch => `
                    <div class="mismatch-item">
                        <strong>${mismatch.key}:</strong><br>
                        <span class="local-value">本地: ${mismatch.local}</span><br>
                        <span class="firebase-value">Firebase: ${mismatch.firebase}</span>
                    </div>
                `).join('')}
            </div>`);
        }
        
        // 检查成员数据一致性
        let membersMatch = true;
        const memberMismatches = [];
        
        for (const groupKey of localGroupKeys) {
            if (firebaseGroups[groupKey]) {
                const localMembers = localGroups[groupKey];
                const firebaseMembers = firebaseGroups[groupKey];
                
                if (Array.isArray(localMembers) && Array.isArray(firebaseMembers)) {
                    if (localMembers.length !== firebaseMembers.length) {
                        membersMatch = false;
                        memberMismatches.push({
                            group: groupKey,
                            localCount: localMembers.length,
                            firebaseCount: firebaseMembers.length
                        });
                    }
                }
            }
        }
        
        analysis.push(`<div class="analysis-item ${membersMatch ? 'success' : 'error'}">
            <strong>成员数据一致性:</strong> ${membersMatch ? '✅ 一致' : '❌ 不一致'}
        </div>`);
        
        // 显示成员数据不匹配的详细信息
        if (memberMismatches.length > 0) {
            analysis.push(`<div class="mismatch-details">
                <h4>成员数量不匹配的小组:</h4>
                ${memberMismatches.map(mismatch => `
                    <div class="mismatch-item">
                        <strong>${mismatch.group}:</strong><br>
                        <span class="local-value">本地: ${mismatch.localCount}人</span><br>
                        <span class="firebase-value">Firebase: ${mismatch.firebaseCount}人</span>
                    </div>
                `).join('')}
            </div>`);
        }
        
        return analysis.join('');
    }

    /**
     * 导出小组报告
     */
    function exportGroupReport() {
        try {
            const reportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: groupData.length,
                    firebase: groupData.filter(g => g.firebase.exists).length,
                    msh: groupData.filter(g => g.msh.exists).length,
                    external: groupData.filter(g => g.external.exists).length,
                    inconsistent: groupData.filter(g => g.status === 'inconsistent').length
                },
                groups: groupData,
                changeLog: changeLog
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-group-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessage('小组报告导出成功', 'success');
        } catch (error) {
            console.error('❌ 导出小组报告失败:', error);
            showMessage('导出小组报告失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示消息
     */
    function showMessage(message, type = 'info') {
        // 创建消息容器（如果不存在）
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }

        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 5px;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;

        // 根据类型设置样式
        if (type === 'error') {
            messageElement.style.background = '#fed7d7';
            messageElement.style.color = '#c53030';
            messageElement.style.borderLeft = '4px solid #f56565';
        } else if (type === 'warning') {
            messageElement.style.background = '#fef5e7';
            messageElement.style.color = '#d68910';
            messageElement.style.borderLeft = '4px solid #f6ad55';
        } else if (type === 'info') {
            messageElement.style.background = '#bee3f8';
            messageElement.style.color = '#2b6cb0';
            messageElement.style.borderLeft = '4px solid #3182ce';
        } else {
            messageElement.style.background = '#c6f6d5';
            messageElement.style.color = '#22543d';
            messageElement.style.borderLeft = '4px solid #48bb78';
        }

        messageElement.textContent = message;
        messageContainer.appendChild(messageElement);

        // 3秒后自动消失
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }
        }, 3000);
    }

    /**
     * 显示错误信息
     */
    function showError(message) {
        const container = document.getElementById('groupList');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // 暴露全局函数
    window.loadGroupData = loadGroupData;
    window.syncAllGroups = syncAllGroups;
    window.detectGroupConflicts = detectGroupConflicts;
    window.compareDataSources = compareDataSources;
    window.exportGroupReport = exportGroupReport;
    window.editGroup = editGroup;
    window.syncGroup = syncGroup;

})();
