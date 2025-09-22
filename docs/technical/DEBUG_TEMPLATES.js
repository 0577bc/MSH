/**
 * 调试模板库
 * 用于快速添加调试代码，提高调试效率
 */

// 通用调试模板
const DebugTemplates = {
    
    // 函数执行调试
    functionExecution: (functionName) => `
        const debugId = \`[\${Date.now()}] \${functionName}\`;
        console.log(\`\${debugId} - 开始执行\`);
        console.log(\`\${debugId} - 输入参数:\`, arguments);
        
        // 在函数结束时添加
        console.log(\`\${debugId} - 执行完成\`);
    `,
    
    // 数据流调试
    dataFlow: () => `
        const dataFlowDebug = {
            input: (data) => console.log('📥 数据输入:', data),
            process: (data) => console.log('⚙️ 数据处理:', data),
            output: (data) => console.log('📤 数据输出:', data),
            error: (error) => console.log('❌ 数据错误:', error)
        };
    `,
    
    // UI状态调试
    uiState: () => `
        const uiDebug = {
            elementState: (element, state) => console.log(\`🎯 \${element.id} 状态:\`, state),
            userAction: (action, data) => console.log(\`👆 用户操作: \${action}\`, data),
            stateChange: (from, to) => console.log(\`🔄 状态变化: \${from} → \${to}\`)
        };
    `,
    
    // 数据同步调试
    dataSync: () => `
        const syncDebug = {
            beforeSync: () => console.log('🔄 同步前状态检查'),
            duringSync: (data) => console.log('⚡ 同步中:', data),
            afterSync: (result) => console.log('✅ 同步完成:', result),
            errorSync: (error) => console.log('❌ 同步失败:', error)
        };
    `,
    
    // 选择器调试
    selector: () => `
        const selectorDebug = {
            beforeUpdate: (element) => console.log(\`🔍 更新前 \${element.id}:\`, element.value),
            afterUpdate: (element) => console.log(\`✅ 更新后 \${element.id}:\`, element.value),
            options: (element) => console.log(\`📋 \${element.id} 选项:\`, Array.from(element.options).map(opt => opt.value))
        };
    `,
    
    // 按钮状态调试
    buttonState: () => `
        const buttonDebug = {
            state: (button) => console.log(\`🔘 \${button.id} 状态:\`, {
                disabled: button.disabled,
                text: button.textContent,
                classList: button.classList.toString()
            }),
            click: (button) => console.log(\`👆 \${button.id} 被点击\`),
            enable: (button) => console.log(\`✅ \${button.id} 已启用\`),
            disable: (button) => console.log(\`❌ \${button.id} 已禁用\`)
        };
    `,
    
    // 数组操作调试
    arrayOperation: () => `
        const arrayDebug = {
            before: (arr, operation) => console.log(\`📋 \${operation} 前数组:\`, arr),
            after: (arr, operation) => console.log(\`📋 \${operation} 后数组:\`, arr),
            filter: (arr, condition) => console.log(\`🔍 过滤条件: \${condition}\`, arr),
            sort: (arr, criteria) => console.log(\`🔄 排序条件: \${criteria}\`, arr)
        };
    `,
    
    // 异步操作调试
    asyncOperation: () => `
        const asyncDebug = {
            start: (operation) => console.log(\`🚀 开始 \${operation}\`),
            progress: (operation, data) => console.log(\`⚡ \${operation} 进行中:\`, data),
            success: (operation, result) => console.log(\`✅ \${operation} 成功:\`, result),
            error: (operation, error) => console.log(\`❌ \${operation} 失败:\`, error)
        };
    `,
    
    // 表单调试
    formDebug: () => `
        const formDebug = {
            values: (form) => {
                const values = {};
                Array.from(form.elements).forEach(element => {
                    if (element.name) values[element.name] = element.value;
                });
                console.log('📝 表单值:', values);
                return values;
            },
            validation: (field, isValid) => console.log(\`✅ \${field} 验证结果: \${isValid}\`),
            submit: (form) => console.log('📤 表单提交:', form)
        };
    `,
    
    // 事件调试
    eventDebug: () => `
        const eventDebug = {
            trigger: (event, target) => console.log(\`🎯 事件触发: \${event} on \${target.id || target.tagName}\`),
            handler: (event, handler) => console.log(\`⚡ 事件处理: \${handler.name}\`),
            prevent: (event) => console.log('🛑 事件被阻止:', event.type)
        };
    `
};

// 快速调试函数
const QuickDebug = {
    
    // 快速添加函数调试
    addFunctionDebug: (functionName) => {
        console.log(`🔍 开始调试函数: ${functionName}`);
        return {
            start: () => console.log(`🚀 ${functionName} 开始执行`),
            end: () => console.log(`✅ ${functionName} 执行完成`),
            error: (error) => console.log(`❌ ${functionName} 执行错误:`, error),
            data: (data) => console.log(`📊 ${functionName} 数据:`, data)
        };
    },
    
    // 快速添加选择器调试
    addSelectorDebug: (selectorId) => {
        const element = document.getElementById(selectorId);
        if (!element) {
            console.warn(`⚠️ 元素 ${selectorId} 不存在`);
            return null;
        }
        
        return {
            value: () => console.log(`🔍 ${selectorId} 当前值:`, element.value),
            options: () => console.log(`📋 ${selectorId} 选项:`, Array.from(element.options).map(opt => ({value: opt.value, text: opt.text}))),
            change: (callback) => {
                element.addEventListener('change', (e) => {
                    console.log(`🔄 ${selectorId} 值变化:`, e.target.value);
                    if (callback) callback(e);
                });
            }
        };
    },
    
    // 快速添加按钮调试
    addButtonDebug: (buttonId) => {
        const button = document.getElementById(buttonId);
        if (!button) {
            console.warn(`⚠️ 按钮 ${buttonId} 不存在`);
            return null;
        }
        
        return {
            state: () => console.log(`🔘 ${buttonId} 状态:`, {
                disabled: button.disabled,
                text: button.textContent,
                classList: button.classList.toString()
            }),
            click: (callback) => {
                button.addEventListener('click', (e) => {
                    console.log(`👆 ${buttonId} 被点击`);
                    if (callback) callback(e);
                });
            }
        };
    },
    
    // 快速添加数据调试
    addDataDebug: (dataName, data) => {
        return {
            log: () => console.log(`📊 ${dataName}:`, data),
            length: () => console.log(`📏 ${dataName} 长度:`, Array.isArray(data) ? data.length : Object.keys(data).length),
            keys: () => console.log(`🔑 ${dataName} 键:`, Object.keys(data)),
            values: () => console.log(`💎 ${dataName} 值:`, Object.values(data))
        };
    }
};

// 调试开关
const DebugConfig = {
    enabled: true,
    levels: {
        error: true,
        warn: true,
        info: true,
        debug: true
    },
    
    log: (level, message, data) => {
        if (DebugConfig.enabled && DebugConfig.levels[level]) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        }
    }
};

// 导出调试工具
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DebugTemplates, QuickDebug, DebugConfig };
} else {
    window.DebugTemplates = DebugTemplates;
    window.QuickDebug = QuickDebug;
    window.DebugConfig = DebugConfig;
}
