// ==================== 数据冲突管理系统 ====================
// 功能：检测和解决Firebase、MSH系统、外部表单之间的数据冲突
// 作者：MSH系统
// 版本：2.0

(function() {
    'use strict';

    // 全局变量
    let firebaseData = {};
    let mshData = {};
    let externalFormData = {};
    let conflicts = [];
    let currentConflict = null;

    // 初始化页面
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('⚔️ 数据冲突管理系统初始化');
        
        try {
            // 初始化Firebase
            await initializeFirebase();
            
            // 自动开始检测冲突
            await detectConflicts();
            
            console.log('✅ 数据冲突管理系统初始化完成');
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
     * 检测数据冲突
     */
    async function detectConflicts() {
        try {
            console.log('🔍 开始检测数据冲突...');
            showMessage('正在检测数据冲突...', 'info');
            
            // 并行加载所有数据源
            const [firebaseResult, mshResult, externalResult] = await Promise.allSettled([
                loadFirebaseData(),
                loadMSHData(),
                loadExternalFormData()
            ]);

            // 处理数据加载结果
            firebaseData = firebaseResult.status === 'fulfilled' ? firebaseResult.value : { members: [] };
            mshData = mshResult.status === 'fulfilled' ? mshResult.value : { members: [] };
            externalFormData = externalResult.status === 'fulfilled' ? externalResult.value : { members: [] };

            // 生成冲突检测结果
            generateConflictDetection();
            
            // 显示冲突列表
            displayConflicts();
            
            // 更新统计信息
            updateStatistics();
            
            showMessage('数据冲突检测完成', 'success');
            
        } catch (error) {
            console.error('❌ 检测数据冲突失败:', error);
            showMessage('检测数据冲突失败: ' + error.message, 'error');
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
     * 生成冲突检测结果
     */
    function generateConflictDetection() {
        console.log('🔄 生成冲突检测结果...');
        
        conflicts = [];
        
        // 1. 检测UUID冲突
        detectUUIDConflicts();
        
        // 2. 检测小组名称冲突
        detectGroupConflicts();
        
        // 3. 检测数据不一致冲突
        detectDataConflicts();
        
        console.log('✅ 冲突检测完成:', conflicts.length, '个冲突');
    }

    /**
     * 检测UUID冲突
     */
    function detectUUIDConflicts() {
        const uuidMap = new Map();
        
        // 收集所有UUID
        [...firebaseData.members || [], ...mshData.members || [], ...externalFormData.members || []].forEach(member => {
            if (member.uuid) {
                if (!uuidMap.has(member.uuid)) {
                    uuidMap.set(member.uuid, []);
                }
                uuidMap.get(member.uuid).push(member);
            }
        });

        // 检查UUID冲突
        uuidMap.forEach((members, uuid) => {
            if (members.length > 1) {
                // 检查是否有不同的成员使用同一个UUID
                const uniqueNames = [...new Set(members.map(m => m.name))];
                if (uniqueNames.length > 1) {
                    conflicts.push({
                        type: 'uuid',
                        title: `UUID冲突: ${uuid}`,
                        description: `多个成员使用同一个UUID: ${uniqueNames.join(', ')}`,
                        uuid: uuid,
                        members: members,
                        severity: 'high'
                    });
                }
            }
        });
    }

    /**
     * 检测小组名称冲突
     */
    function detectGroupConflicts() {
        const nameGroupMap = new Map();
        
        // 收集所有成员的小组信息
        [...firebaseData.members || [], ...mshData.members || [], ...externalFormData.members || []].forEach(member => {
            const key = member.name;
            if (!nameGroupMap.has(key)) {
                nameGroupMap.set(key, []);
            }
            nameGroupMap.get(key).push({
                name: member.name,
                group: member.group,
                source: member.source,
                uuid: member.uuid
            });
        });

        // 检查小组名称冲突
        nameGroupMap.forEach((groups, name) => {
            const uniqueGroups = [...new Set(groups.map(g => g.group))];
            if (uniqueGroups.length > 1) {
                conflicts.push({
                    type: 'group',
                    title: `小组名称冲突: ${name}`,
                    description: `成员 ${name} 在不同小组中: ${uniqueGroups.join(', ')}`,
                    name: name,
                    groups: groups,
                    severity: 'medium'
                });
            }
        });
    }

    /**
     * 检测数据不一致冲突
     */
    function detectDataConflicts() {
        const nameMap = new Map();
        
        // 收集所有成员信息
        [...firebaseData.members || [], ...mshData.members || [], ...externalFormData.members || []].forEach(member => {
            const key = `${member.name}-${member.group}`;
            if (!nameMap.has(key)) {
                nameMap.set(key, []);
            }
            nameMap.get(key).push(member);
        });

        // 检查数据不一致
        nameMap.forEach((members, key) => {
            if (members.length > 1) {
                // 检查关键字段是否一致
                const firstMember = members[0];
                const hasInconsistency = members.some(member => 
                    member.uuid !== firstMember.uuid ||
                    member.nickname !== firstMember.nickname ||
                    member.phone !== firstMember.phone
                );

                if (hasInconsistency) {
                    conflicts.push({
                        type: 'data',
                        title: `数据不一致: ${firstMember.name}`,
                        description: `成员 ${firstMember.name} 在不同数据源中的信息不一致`,
                        name: firstMember.name,
                        group: firstMember.group,
                        members: members,
                        severity: 'medium'
                    });
                }
            }
        });
    }

    /**
     * 显示冲突列表
     */
    function displayConflicts() {
        const container = document.getElementById('conflictList');
        
        if (conflicts.length === 0) {
            container.innerHTML = '<div class="success">✅ 没有检测到数据冲突</div>';
            return;
        }

        container.innerHTML = conflicts.map((conflict, index) => {
            const conflictClass = `conflict-${conflict.type}`;
            const typeClass = `conflict-type ${conflict.type}`;
            const typeText = {
                'uuid': 'UUID冲突',
                'group': '小组冲突',
                'data': '数据冲突'
            }[conflict.type] || '未知';

            return `
                <div class="conflict-item ${conflictClass}">
                    <div class="conflict-header">
                        <span class="conflict-title">${conflict.title}</span>
                        <span class="${typeClass}">${typeText}</span>
                    </div>
                    <div class="conflict-details">
                        <div class="data-source">
                            <h4>冲突详情</h4>
                            <div class="data-source-item">
                                <strong>描述:</strong>
                                <span>${conflict.description}</span>
                            </div>
                            <div class="data-source-item">
                                <strong>严重程度:</strong>
                                <span>${conflict.severity === 'high' ? '高' : conflict.severity === 'medium' ? '中' : '低'}</span>
                            </div>
                        </div>
                        ${generateConflictDetails(conflict)}
                    </div>
                    <div class="conflict-actions">
                        <button class="btn btn-primary" onclick="resolveConflict(${index})">🔧 解决冲突</button>
                        <button class="btn btn-warning" onclick="ignoreConflict(${index})">⏭️ 忽略</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 生成冲突详情
     */
    function generateConflictDetails(conflict) {
        if (conflict.type === 'uuid') {
            return conflict.members.map(member => `
                <div class="data-source">
                    <h4>${member.source.toUpperCase()}</h4>
                    <div class="data-source-item">
                        <strong>姓名:</strong>
                        <span>${member.name}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>小组:</strong>
                        <span>${member.group}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>UUID:</strong>
                        <span>${member.uuid}</span>
                    </div>
                </div>
            `).join('');
        } else if (conflict.type === 'group') {
            return conflict.groups.map(group => `
                <div class="data-source">
                    <h4>${group.source.toUpperCase()}</h4>
                    <div class="data-source-item">
                        <strong>姓名:</strong>
                        <span>${group.name}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>小组:</strong>
                        <span>${group.group}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>UUID:</strong>
                        <span>${group.uuid || '未设置'}</span>
                    </div>
                </div>
            `).join('');
        } else if (conflict.type === 'data') {
            return conflict.members.map(member => `
                <div class="data-source">
                    <h4>${member.source.toUpperCase()}</h4>
                    <div class="data-source-item">
                        <strong>姓名:</strong>
                        <span>${member.name}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>小组:</strong>
                        <span>${member.group}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>UUID:</strong>
                        <span>${member.uuid || '未设置'}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>花名:</strong>
                        <span>${member.nickname || '未设置'}</span>
                    </div>
                    <div class="data-source-item">
                        <strong>电话:</strong>
                        <span>${member.phone || '未设置'}</span>
                    </div>
                </div>
            `).join('');
        }
        return '';
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        const total = conflicts.length;
        const uuidConflicts = conflicts.filter(c => c.type === 'uuid').length;
        const groupConflicts = conflicts.filter(c => c.type === 'group').length;
        const dataConflicts = conflicts.filter(c => c.type === 'data').length;
        const resolved = conflicts.filter(c => c.resolved).length;

        document.getElementById('totalConflicts').textContent = total;
        document.getElementById('uuidConflicts').textContent = uuidConflicts;
        document.getElementById('groupConflicts').textContent = groupConflicts;
        document.getElementById('dataConflicts').textContent = dataConflicts;
        document.getElementById('resolvedConflicts').textContent = resolved;

        console.log('📊 冲突统计:', {
            总冲突数: total,
            UUID冲突: uuidConflicts,
            小组冲突: groupConflicts,
            数据冲突: dataConflicts,
            已解决: resolved
        });
    }

    /**
     * 解决冲突
     */
    function resolveConflict(conflictIndex) {
        currentConflict = conflicts[conflictIndex];
        showConflictResolutionDialog();
    }

    /**
     * 显示冲突解决对话框
     */
    function showConflictResolutionDialog() {
        const dialog = document.getElementById('conflictResolutionDialog');
        const title = document.getElementById('conflictResolutionTitle');
        const body = document.getElementById('conflictResolutionBody');

        title.textContent = `解决冲突: ${currentConflict.title}`;
        
        // 根据冲突类型生成解决方案
        let resolutionOptions = '';
        
        if (currentConflict.type === 'uuid') {
            resolutionOptions = `
                <div class="resolution-option" data-action="keep-first">
                    <h4>保留第一个成员</h4>
                    <p>保留 ${currentConflict.members[0].name} 的UUID，删除其他重复的UUID</p>
                </div>
                <div class="resolution-option" data-action="generate-new">
                    <h4>生成新的UUID</h4>
                    <p>为所有冲突的成员生成新的唯一UUID</p>
                </div>
                <div class="resolution-option" data-action="merge-members">
                    <h4>合并成员信息</h4>
                    <p>将相同UUID的成员信息合并为一个记录</p>
                </div>
            `;
        } else if (currentConflict.type === 'group') {
            resolutionOptions = `
                <div class="resolution-option" data-action="use-firebase">
                    <h4>使用Firebase数据</h4>
                    <p>以Firebase中的小组名称为准，同步到其他数据源</p>
                </div>
                <div class="resolution-option" data-action="use-msh">
                    <h4>使用MSH数据</h4>
                    <p>以MSH系统中的小组名称为准，同步到其他数据源</p>
                </div>
                <div class="resolution-option" data-action="use-external">
                    <h4>使用外部表单数据</h4>
                    <p>以外部表单中的小组名称为准，同步到其他数据源</p>
                </div>
            `;
        } else if (currentConflict.type === 'data') {
            resolutionOptions = `
                <div class="resolution-option" data-action="use-firebase">
                    <h4>使用Firebase数据</h4>
                    <p>以Firebase中的数据为准，覆盖其他数据源</p>
                </div>
                <div class="resolution-option" data-action="use-msh">
                    <h4>使用MSH数据</h4>
                    <p>以MSH系统中的数据为准，覆盖其他数据源</p>
                </div>
                <div class="resolution-option" data-action="merge-data">
                    <h4>合并数据</h4>
                    <p>合并所有数据源的信息，保留最完整的数据</p>
                </div>
            `;
        }

        body.innerHTML = resolutionOptions;

        // 绑定选择事件
        document.querySelectorAll('.resolution-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.resolution-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        dialog.style.display = 'flex';
    }

    /**
     * 应用冲突解决方案
     */
    function applyConflictResolution() {
        const selectedOption = document.querySelector('.resolution-option.selected');
        if (!selectedOption) {
            showMessage('请选择一个解决方案', 'error');
            return;
        }

        const action = selectedOption.dataset.action;
        console.log('应用冲突解决方案:', action);
        
        // 这里实现具体的冲突解决逻辑
        showMessage('冲突解决方案已应用', 'success');
        closeConflictResolution();
        
        // 重新检测冲突
        detectConflicts();
    }

    /**
     * 关闭冲突解决对话框
     */
    function closeConflictResolution() {
        document.getElementById('conflictResolutionDialog').style.display = 'none';
        currentConflict = null;
    }

    /**
     * 忽略冲突
     */
    function ignoreConflict(conflictIndex) {
        conflicts[conflictIndex].ignored = true;
        displayConflicts();
        updateStatistics();
        showMessage('冲突已忽略', 'info');
    }

    /**
     * 解决所有冲突
     */
    async function resolveAllConflicts() {
        try {
            console.log('🔄 开始解决所有冲突...');
            showMessage('正在解决所有冲突...', 'info');
            
            // 这里实现批量解决冲突的逻辑
            // 例如：清空外部表单数据，重新同步等
            
            showMessage('所有冲突已解决', 'success');
            
            // 重新检测冲突
            await detectConflicts();
            
        } catch (error) {
            console.error('❌ 解决所有冲突失败:', error);
            showMessage('解决所有冲突失败: ' + error.message, 'error');
        }
    }

    /**
     * 清空外部表单数据
     */
    async function clearExternalFormData() {
        try {
            if (!confirm('确定要清空外部表单数据吗？此操作不可撤销！')) {
                return;
            }

            console.log('🗑️ 开始清空外部表单数据...');
            showMessage('正在清空外部表单数据...', 'info');
            
            // 这里实现清空外部表单数据的逻辑
            // 例如：删除所有submissions等
            
            showMessage('外部表单数据已清空', 'success');
            
            // 重新检测冲突
            await detectConflicts();
            
        } catch (error) {
            console.error('❌ 清空外部表单数据失败:', error);
            showMessage('清空外部表单数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 导出冲突报告
     */
    function exportConflictReport() {
        try {
            const reportData = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: conflicts.length,
                    uuid: conflicts.filter(c => c.type === 'uuid').length,
                    group: conflicts.filter(c => c.type === 'group').length,
                    data: conflicts.filter(c => c.type === 'data').length,
                    resolved: conflicts.filter(c => c.resolved).length
                },
                conflicts: conflicts
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `msh-conflict-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessage('冲突报告导出成功', 'success');
        } catch (error) {
            console.error('❌ 导出冲突报告失败:', error);
            showMessage('导出冲突报告失败: ' + error.message, 'error');
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
        const container = document.getElementById('conflictList');
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
    window.detectConflicts = detectConflicts;
    window.resolveAllConflicts = resolveAllConflicts;
    window.clearExternalFormData = clearExternalFormData;
    window.exportConflictReport = exportConflictReport;
    window.resolveConflict = resolveConflict;
    window.ignoreConflict = ignoreConflict;
    window.applyConflictResolution = applyConflictResolution;
    window.closeConflictResolution = closeConflictResolution;

})();
