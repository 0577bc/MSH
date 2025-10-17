# group-management.js 拆分计划

**原文件**: src/group-management.js (1676行)  
**目标**: 拆分为6个模块，每个模块不超过500行  
**方法**: 先建立框架，再逐步移植代码

---

## 📊 文件结构分析

| 模块名称 | 行数范围 | 代码行数 | 主要功能 |
|---------|---------|---------|---------|
| 全局变量 | 6-26 | 21行 | 全局变量、DOM元素引用 |
| 初始化 | 27-507 | 480行 | 页面初始化、数据加载、事件绑定 |
| 小组管理 | 507-617 | 110行 | 小组增删改查 |
| 成员管理 | 617-954 | 337行 | 成员增删改查、移动 |
| 人员检索 | 954-1029 | 75行 | 搜索功能 |
| 成员移动 | 1034-1207 | 173行 | 成员移动功能 |
| 导出功能 | 1207-1434 | 227行 | 导出CSV/JSON |
| 修改组名 | 1434-1676 | 242行 | 修改组名、表单处理 |

**总计**: 1676行

---

## 🎯 拆分方案

### 模块1: shared-state.js (~100行)
**功能**: 全局状态管理
- 全局变量定义
- DOM元素引用
- 状态标志位
- 选中成员变量

### 模块2: init-module.js (~400行)
**功能**: 初始化和数据加载
- `initializePage()` - 主初始化函数
- `initializeFirebase()` - Firebase初始化
- `initializeDOMElements()` - DOM元素初始化
- `waitForNewDataManager()` - 等待数据管理器
- `loadData()` - 数据加载
- `loadFromLocalStorageWithValidation()` - 本地存储加载
- `normalizeDataFormat()` - 数据格式化
- `validateDataIntegrity()` - 数据验证
- `initializePageDisplay()` - 页面显示初始化
- `preventFormSubmission()` - 防止表单提交

### 模块3: event-handlers.js (~300行)
**功能**: 事件监听和处理
- `initializeEventListeners()` - 事件监听器初始化
- `initializeFormEvents()` - 表单事件初始化
- 所有按钮点击事件处理器

### 模块4: group-member-operations.js (~500行)
**功能**: 小组和成员管理
- **小组管理**:
  - `updateGroupSelect()` - 更新小组选择
  - `handleGroupSelect()` - 处理小组选择
  - `showAddGroupForm()` - 显示添加小组表单
  - `handleSaveGroup()` - 保存小组
- **成员管理**:
  - `displayMembers()` - 显示成员列表
  - `showAddMemberForm()` - 显示添加成员表单
  - `handleSaveMember()` - 保存成员
  - `editMember()` - 编辑成员
  - `handleSaveEditMember()` - 保存编辑
  - `deleteMember()` - 删除成员
  - `handleDeleteMember()` - 处理删除
  - `handleRegenerateIds()` - 重新生成ID
- **成员移动**:
  - `performMemberMove()` - 执行成员移动

### 模块5: search-export.js (~350行)
**功能**: 搜索和导出
- **搜索功能**:
  - `handleMemberSearch()` - 处理搜索
  - `showSuggestions()` - 显示建议
  - `hideSuggestions()` - 隐藏建议
  - `selectMember()` - 选择成员
- **导出功能**:
  - `showExportDialog()` - 显示导出对话框
  - `hideExportDialog()` - 隐藏导出对话框
  - `handleExportMembers()` - 处理导出
  - `exportToCSV()` - 导出CSV
  - `exportToJSON()` - 导出JSON

### 模块6: group-name-editor.js (~250行)
**功能**: 修改组名
- `showEditGroupForm()` - 显示编辑表单
- `hideEditGroupForm()` - 隐藏编辑表单
- `handleSaveEditGroup()` - 保存修改
- 辅助函数

### 模块7: index.js (~50行)
**功能**: 主入口文件
- 导入所有模块
- 启动页面初始化
- DOMContentLoaded 事件处理

---

## 🔄 移植顺序

1. ✅ 创建框架文件（空文件）
2. ⏳ 移植 shared-state.js
3. ⏳ 移植 init-module.js
4. ⏳ 移植 event-handlers.js
5. ⏳ 移植 group-member-operations.js
6. ⏳ 移植 search-export.js
7. ⏳ 移植 group-name-editor.js
8. ⏳ 创建 index.js 入口
9. ⏳ 更新 group-management.html 引用
10. ⏳ 测试验证

---

## ⚠️ 注意事项

1. **全局变量访问**: 使用 `window.groupManagement.xxx` 统一命名空间
2. **函数导出**: 所有函数导出到 `window.groupManagement`
3. **依赖关系**: 保持模块间依赖清晰
4. **向后兼容**: 确保现有功能不受影响
5. **测试验证**: 每个模块移植后都要验证

---

**创建日期**: 2025-10-14  
**负责人**: AI Agent  
**预计时间**: 2-3小时


