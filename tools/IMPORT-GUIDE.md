# 签到数据导入指南

## 概述
本指南介绍如何将签到数据备份导入到MSH系统中，并同步到Firebase。

## 导入方法

### 方法1：使用直接导入页面（推荐）
1. 打开浏览器，访问：`http://localhost:5500/tools/direct-import.html`
2. 点击"🚀 开始导入"按钮
3. 等待导入完成
4. 点击"🔄 同步到Firebase"按钮同步数据

### 方法2：使用控制台脚本
1. 在MSH系统页面打开浏览器控制台（F12）
2. 执行以下命令：
```javascript
// 加载导入脚本
const script = document.createElement('script');
script.src = './tools/console-import.js';
document.head.appendChild(script);

// 等待脚本加载后执行导入
setTimeout(() => {
    importAttendanceData().then(result => {
        console.log('导入结果:', result);
    });
}, 1000);
```

### 方法3：手动导入
1. 打开浏览器控制台
2. 复制并执行以下代码：

```javascript
// 导入签到数据
async function importAttendanceData() {
    console.log('🚀 开始导入签到数据...');
    
    try {
        // 加载备份数据
        const response = await fetch('./tools/签到数据');
        const backupData = await response.json();
        console.log(`✅ 成功加载备份数据，共 ${backupData.attendanceRecords.length} 条记录`);
        
        // 获取现有数据
        let existingRecords = [];
        try {
            const existing = localStorage.getItem('msh_attendanceRecords');
            if (existing) {
                existingRecords = JSON.parse(existing);
            }
        } catch (e) {
            console.log('⚠️ 本地存储中没有现有数据');
        }
        
        // 合并数据（避免重复）
        const existingIds = new Set(existingRecords.map(r => `${r.createdAt}_${r.date}_${r.group}`));
        const newRecords = backupData.attendanceRecords.filter(record => {
            const id = `${record.createdAt}_${record.date}_${record.group}`;
            return !existingIds.has(id);
        });
        
        console.log(`🔄 新增记录: ${newRecords.length} 条`);
        
        if (newRecords.length === 0) {
            console.log('ℹ️ 没有新数据需要导入');
            return;
        }
        
        // 保存到本地存储
        const allRecords = [...existingRecords, ...newRecords];
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(allRecords));
        console.log(`✅ 本地存储更新完成，总计 ${allRecords.length} 条记录`);
        
        // 更新NewDataManager
        if (window.newDataManager) {
            window.newDataManager.markDataChange('attendanceRecords', 'modified', 'import_attendance_data');
            console.log('✅ 已标记数据变更，将自动同步');
        }
        
        // 同步到Firebase
        if (window.utils && window.utils.safeSyncToFirebase) {
            await window.utils.safeSyncToFirebase(allRecords, 'attendanceRecords');
            console.log('✅ Firebase同步完成！');
        }
        
        console.log('🎉 签到数据导入完成！');
        return {
            success: true,
            totalRecords: allRecords.length,
            newRecords: newRecords.length,
            existingRecords: existingRecords.length
        };
        
    } catch (error) {
        console.error('❌ 导入失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 执行导入
importAttendanceData();
```

## 数据验证

导入完成后，可以验证数据完整性：

```javascript
// 验证数据
function validateData() {
    try {
        const records = JSON.parse(localStorage.getItem('msh_attendanceRecords') || '[]');
        console.log(`📊 总记录数: ${records.length}`);
        
        const groups = {};
        const members = new Set();
        const dates = new Set();
        
        records.forEach(record => {
            if (record.group) {
                groups[record.group] = (groups[record.group] || 0) + 1;
            }
            if (record.memberSnapshot && record.memberSnapshot.name) {
                members.add(record.memberSnapshot.name);
            }
            if (record.date) {
                dates.add(record.date);
            }
        });
        
        console.log(`👥 涉及组别: ${Object.keys(groups).length} 个`);
        console.log(`👤 涉及成员: ${members.size} 人`);
        console.log(`📅 涉及日期: ${dates.size} 天`);
        
        Object.entries(groups).forEach(([group, count]) => {
            console.log(`  ${group}: ${count} 条记录`);
        });
        
        return {
            totalRecords: records.length,
            groups: Object.keys(groups).length,
            members: members.size,
            dates: dates.size,
            groupStats: groups
        };
    } catch (error) {
        console.error('❌ 数据验证失败:', error);
        return null;
    }
}

// 执行验证
validateData();
```

## 注意事项

1. **数据备份**：导入前建议备份现有的签到数据
2. **重复检查**：系统会自动检查并避免重复导入
3. **同步机制**：导入后数据会自动同步到Firebase
4. **数据完整性**：导入过程中会验证数据完整性

## 故障排除

### 问题1：导入失败
- 检查备份文件是否存在
- 确认网络连接正常
- 查看控制台错误信息

### 问题2：Firebase同步失败
- 检查Firebase配置
- 确认网络连接
- 查看控制台错误信息

### 问题3：数据不完整
- 使用验证函数检查数据
- 重新导入数据
- 检查备份文件完整性

## 联系支持

如果遇到问题，请：
1. 查看控制台错误信息
2. 检查网络连接
3. 确认文件路径正确
4. 联系技术支持
