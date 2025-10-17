/**
 * 小组管理 - 共享状态模块
 * 功能：全局变量、DOM元素引用、状态管理
 */

// 初始化命名空间
if (!window.groupManagement) {
  window.groupManagement = {};
}

// ==================== 全局变量 ====================
window.groupManagement.groups = {};
window.groupManagement.groupNames = {};
// ❌ 已删除 attendanceRecords - 成员管理页面不需要签到记录
// ❌ 已删除 excludedMembers - 排除人员管理已迁移到独立页面
// ❌ 已删除 selectedMembers - 多选功能已迁移到独立页面
// ❌ 已删除 filteredExcludedMembers - 过滤功能已迁移到独立页面

// 当前选中的成员（用于编辑和删除）
window.groupManagement.selectedMember = null;

// ==================== DOM元素引用 ====================
window.groupManagement.dom = {
  // 基本元素
  groupSelect: null,
  memberList: null,
  addMemberButton: null,
  regenerateIdsButton: null,
  
  // 小组管理元素
  addGroupButton: null,
  excludeStatsButton: null,
  
  // 人员检索元素
  memberSearch: null,
  memberSuggestions: null,
  
  // UUID编辑器元素
  uuidEditorButton: null,
  
  // 导出相关元素
  exportMembersButton: null,
  exportMembersDialog: null,
  cancelExportButton: null,
  confirmExportButton: null,
  
  // 修改组名相关元素
  editGroupNameButton: null,
  editGroupForm: null,
  editGroupName: null,
  editGroupDescription: null,
  saveEditGroupButton: null,
  cancelEditGroupButton: null
};

// ==================== 状态标志位 ====================
// 防止事件监听器重复绑定
window.groupManagement.eventListenersInitialized = false;

// ==================== 导出 ====================
console.log('✅ 小组管理 - 共享状态模块已加载');

