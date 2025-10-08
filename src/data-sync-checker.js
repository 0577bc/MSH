// ==================== 数据同步检查工具 ====================
// 功能：检查Firebase数据库、MSH本地存储、外部表单之间的数据同步状态
// 作者：MSH系统
// 版本：2.0

(function() {
    'use strict';

    // 全局变量
    let firebaseData = {};
    let mshData = {};
    let externalFormData = {};
    let checkResults = [];

    // 初始化页面
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('🔧 数据同步检查工具初始化');
        
        try {
            // 初始化Firebase
            await initializeFirebase();
            
            // 自动开始检查
            await checkDataSync();
            
            console.log('✅ 数据同步检查工具初始化完成');
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
     * 检查数据同步状态
     */
    async function checkDataSync() {
        try {
            console.log('🔄 开始检查数据同步状态...');
            showMessage('正在检查数据同步状态...', 'info');
            
            // 并行加载所有数据源
            const [firebaseResult, mshResult, externalResult] = await Promise.allSettled([
                loadFirebaseData(),
                loadMSHData(),
                loadExternalFormData()
            ]);

            // 处理Firebase数据
            if (firebaseResult.status === 'fulfilled') {
                firebaseData = firebaseResult.value;
                console.log('✅ Firebase数据加载成功');
            } else {
                console.error('❌ Firebase数据加载失败:', firebaseResult.reason);
                firebaseData = { members: [] };
            }

            // 处理MSH系统数据
            if (mshResult.status === 'fulfilled') {
                mshData = mshResult.value;
                console.log('✅ MSH数据加载成功');
            } else {
                console.error('❌ MSH数据加载失败:', mshResult.reason);
                mshData = { members: [] };
            }

            // 处理外部表单数据
            if (externalResult.status === 'fulfilled') {
                externalFormData = externalResult.value;
                console.log('✅ 外部表单数据加载成功');
            } else {
                console.error('❌ 外部表单数据加载失败:', externalResult.reason);
                externalFormData = { members: [] };
            }

            // 生成检查结果
            generateCheckResults();
            
            // 显示结果
            displayCheckResults();
            updateStatistics();
            
            showMessage('数据同步检查完成', 'success');
            
        } catch (error) {
            console.error('❌ 检查数据同步失败:', error);
            showMessage('检查数据同步失败: ' + error.message, 'error');
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

            const members = [];
            Object.entries(groups).forEach(([groupKey, groupMembers]) => {
                if (Array.isArray(groupMembers)) {
                    groupMembers.forEach(member => {
                        members.push({
                            ...member,
                            group: groupKey,
                            groupDisplayName: groupNames[groupKey] || groupKey,
                            source: 'firebase'
                        });
                    });
                }
            });

            return { groups, groupNames, members, totalMembers: members.length };
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

            const members = [];
            Object.entries(groups).forEach(([groupKey, groupMembers]) => {
                if (Array.isArray(groupMembers)) {
                    groupMembers.forEach(member => {
                        members.push({
                            ...member,
                            group: groupKey,
                            groupDisplayName: groupNames[groupKey] || groupKey,
                            source: 'msh'
                        });
                    });
                }
            });

            return { groups, groupNames, members, totalMembers: members.length };
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

            const members = [];
            submissions.forEach(submission => {
                const submissionData = submission.submissionData || {};
                if (submissionData.memberName && submissionData.group) {
                    members.push({
                        name: submissionData.memberName,
                        group: submissionData.group,
                        groupDisplayName: submissionData.group,
                        uuid: submissionData.memberUUID || '',
                        nickname: submissionData.nickname || '',
                        phone: submissionData.phone || '',
                        gender: submissionData.gender || '',
                        baptized: submissionData.baptized || '',
                        age: submissionData.age || '',
                        source: 'external-form',
                        submissionId: submission.id,
                        trackingContent: submissionData.trackingContent || '',
                        trackingStatus: submissionData.trackingStatus || '',
                        createdAt: submission.createdAt
                    });
                }
            });

            return { submissions, members, totalMembers: members.length };
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
     * 生成检查结果
     */
    function generateCheckResults() {
        console.log('🔄 生成检查结果...');
        
        checkResults = [];
        
        // 获取所有唯一的成员标识
        const memberKeys = new Set();
        [...firebaseData.members || [], ...mshData.members || [], ...externalFormData.members || []].forEach(member => {
            const key = `${member.name}-${member.group}`;
            memberKeys.add(key);
        });

        // 为每个成员生成检查记录
        memberKeys.forEach(key => {
            const [name, group] = key.split('-');
            
            const firebaseMember = (firebaseData.members || []).find(m => m.name === name && m.group === group);
            const mshMember = (mshData.members || []).find(m => m.name === name && m.group === group);
            const externalMember = (externalFormData.members || []).find(m => m.name === name && m.group === group);

            const checkRecord = {
                name,
                group,
                firebase: firebaseMember || null,
                msh: mshMember || null,
                external: externalMember || null,
                status: determineSyncStatus(firebaseMember, mshMember, externalMember),
                dataSources: {
                    firebase: !!firebaseMember,
                    msh: !!mshMember,
                    external: !!externalMember
                }
            };

            checkResults.push(checkRecord);
        });

        // 按状态排序
        checkResults.sort((a, b) => {
            const statusOrder = { 'synced': 0, 'partial': 1, 'missing': 2 };
            return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        });
        
        console.log('✅ 检查结果生成完成:', checkResults.length, '条记录');
    }

    /**
     * 确定同步状态
     */
    function determineSyncStatus(firebaseMember, mshMember, externalMember) {
        const hasFirebase = !!firebaseMember;
        const hasMSH = !!mshMember;
        const hasExternal = !!externalMember;

        // 如果三个数据源都有数据
        if (hasFirebase && hasMSH && hasExternal) {
            return 'synced';
        }

        // 如果只有部分数据源有数据
        if (hasFirebase || hasMSH || hasExternal) {
            return 'partial';
        }

        // 如果都没有数据
        return 'missing';
    }

    /**
     * 显示检查结果
     */
    function displayCheckResults() {
        const container = document.getElementById('checkResults');
        
        if (checkResults.length === 0) {
            container.innerHTML = '<div class="loading">没有找到数据</div>';
            return;
        }

        container.innerHTML = checkResults.map(item => {
            const statusClass = `status-${item.status}`;
            const statusText = {
                'synced': '已同步',
                'partial': '部分同步',
                'missing': '缺失'
            }[item.status] || '未知';

            return `
                <div class="member-item ${item.status === 'synced' ? 'found' : 'missing'}">
                    <div class="member-header">
                        <span class="member-name">${item.name}</span>
                        <span class="member-group">${item.group}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="member-details">
                        <div><strong>Firebase:</strong> ${item.dataSources.firebase ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>MSH缓存:</strong> ${item.dataSources.msh ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>外部表单:</strong> ${item.dataSources.external ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>UUID:</strong> ${item.firebase?.uuid || item.msh?.uuid || item.external?.uuid || '未设置'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 显示缺失成员详情
     */
    function displayMissingMembers() {
        const container = document.getElementById('missingMembersList');
        const missingMembers = checkResults.filter(item => item.status === 'partial' || item.status === 'missing');
        
        if (missingMembers.length === 0) {
            container.innerHTML = '<div class="success">✅ 没有缺失的成员数据</div>';
            return;
        }

        container.innerHTML = missingMembers.map(item => {
            const statusClass = `status-${item.status}`;
            const statusText = {
                'partial': '部分同步',
                'missing': '完全缺失'
            }[item.status] || '未知';

            return `
                <div class="member-item missing">
                    <div class="member-header">
                        <span class="member-name">${item.name}</span>
                        <span class="member-group">${item.group}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="member-details">
                        <div><strong>Firebase:</strong> ${item.dataSources.firebase ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>MSH缓存:</strong> ${item.dataSources.msh ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>外部表单:</strong> ${item.dataSources.external ? '✅ 有' : '❌ 无'}</div>
                        <div><strong>UUID:</strong> ${item.firebase?.uuid || item.msh?.uuid || item.external?.uuid || '未设置'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        const total = checkResults.length;
        const firebaseCount = checkResults.filter(item => item.dataSources.firebase).length;
        const mshCount = checkResults.filter(item => item.dataSources.msh).length;
        const externalCount = checkResults.filter(item => item.dataSources.external).length;
        const missingCount = checkResults.filter(item => item.status === 'partial' || item.status === 'missing').length;

        document.getElementById('totalMembers').textContent = total;
        document.getElementById('firebaseMembers').textContent = firebaseCount;
        document.getElementById('mshMembers').textContent = mshCount;
        document.getElementById('externalMembers').textContent = externalCount;
        document.getElementById('missingMembers').textContent = missingCount;

        // 显示缺失成员详情
        displayMissingMembers();

        console.log('📊 数据同步统计:', {
            总成员数: total,
            Firebase中有: firebaseCount,
            MSH缓存中有: mshCount,
            外部表单中有: externalCount,
            缺失成员: missingCount
        });
    }

    /**
     * 同步缺失数据
     */
    async function syncMissingData() {
        try {
            console.log('🔄 开始同步缺失数据...');
            showMessage('正在同步缺失数据...', 'info');
            
            const missingMembers = checkResults.filter(item => item.status === 'partial' || item.status === 'missing');
            
            if (missingMembers.length === 0) {
                showMessage('没有需要同步的缺失数据', 'success');
                return;
            }

            // 这里可以实现具体的同步逻辑
            // 例如：将外部表单的数据同步到Firebase和MSH系统
            console.log('需要同步的缺失成员:', missingMembers);
            
            showMessage(`发现 ${missingMembers.length} 个缺失成员，需要手动处理`, 'warning');
            
        } catch (error) {
            console.error('❌ 同步缺失数据失败:', error);
            showMessage('同步缺失数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 导出同步报告
     */
    function exportSyncReport() {
        try {
            const reportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: checkResults.length,
                    firebase: checkResults.filter(item => item.dataSources.firebase).length,
                    msh: checkResults.filter(item => item.dataSources.msh).length,
                    external: checkResults.filter(item => item.dataSources.external).length,
                    missing: checkResults.filter(item => item.status === 'partial' || item.status === 'missing').length
                },
                firebaseData: firebaseData,
                mshData: mshData,
                externalFormData: externalFormData,
                checkResults: checkResults
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-data-sync-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessage('同步报告导出成功', 'success');
        } catch (error) {
            console.error('❌ 导出同步报告失败:', error);
            showMessage('导出同步报告失败: ' + error.message, 'error');
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
        const container = document.getElementById('checkResults');
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
    window.checkDataSync = checkDataSync;
    window.syncMissingData = syncMissingData;
    window.exportSyncReport = exportSyncReport;

})();
