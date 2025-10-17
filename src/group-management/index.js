/**
 * 小组管理 - 主入口文件
 * 功能：模块加载顺序控制、页面初始化入口
 */

// ==================== 模块说明 ====================
// 依赖的模块文件（按顺序加载）：
// 1. shared-state.js - 共享状态
// 2. init-module.js - 初始化模块
// 3. event-handlers.js - 事件处理
// 4. group-member-operations.js - 小组和成员操作
// 5. search-export.js - 搜索和导出
// 6. group-name-editor.js - 修改组名
// 7. index.js - 本文件（入口）

// ==================== 验证模块加载 ====================

/**
 * 验证所有模块是否正确加载
 */
function validateModulesLoaded() {
  const required = [
    'groups',
    'groupNames',
    'dom',
    'initializePage',
    'updateGroupSelect',
    'handleMemberSearch',
    'showExportDialog',
    'showEditGroupForm'
  ];
  
  const missing = [];
  required.forEach(key => {
    if (!window.groupManagement[key]) {
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ 缺少必需的模块:', missing);
    return false;
  }
  
  console.log('✅ 所有模块加载完成');
  return true;
}

// ==================== 页面加载入口 ====================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('小组管理页面：脚本加载完成');
  
  try {
    // 验证模块加载
    if (!validateModulesLoaded()) {
      throw new Error('模块加载不完整，请检查脚本引用顺序');
    }
    
    // 调用初始化函数
    await window.groupManagement.initializePage();
    
    console.log('小组管理页面：初始化完成');
  } catch (error) {
    console.error('小组管理页面：初始化失败', error);
    alert('页面初始化失败，请刷新页面重试！\n错误：' + error.message);
  }
});

console.log('✅ 小组管理 - 主入口文件已加载');
