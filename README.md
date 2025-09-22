# MSH 签到系统

一个基于Web的签到管理系统，支持多小组管理、实时数据同步和自动备份。

## 🚀 快速开始

### 本地开发
```bash
# 使用Python启动本地服务器
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000
```

访问 `http://localhost:8000` 开始使用。

## 📁 系统结构

### 核心页面
- **index.html** - 主签到页面
- **admin.html** - 管理页面
- **group-management.html** - 成员管理页面
- **summary.html** - 签到汇总页面
- **sunday-tracking.html** - 主日跟踪页面
- **daily-report.html** - 日报页面
- **attendance-records.html** - 签到记录页面
- **delete-management.html** - 数据删除管理页面
- **firebase-monitor.html** - Firebase监控页面
- **personal-page.html** - 个人页面

### 工具页面
- **tools/uuid_editor.html** - UUID编辑器
- **tools/batch_signin_fix.html** - 批量签到修复工具
- **tools/export_missing_uuids.html** - 导出工具
- **tools/protect_documents.sh** - 文档保护脚本
- **debug-tool.html** - 综合调试工具

### 源代码
- **src/** - 所有JavaScript和CSS源文件
- **config.js** - 系统配置文件
- **manifest.json** - PWA配置

### 文档
- **docs/** - 所有系统文档
  - **docs/README.md** - 详细文档
  - **docs/requirements/** - 需求文档
  - **docs/reports/** - 报告文档
  - **docs/commands/** - 命令文档
  - **docs/guides/** - 指南文档

### 备份
- **backup/** - 系统备份文件

## ✨ 最新功能

### Firebase数据拉取优化
- 页面切换速度提升约80%
- 网络请求减少约90%
- 统一数据状态管理

### 成员管理
- 完整的成员管理功能
- 花名管理
- 未签到不统计功能
- UUID管理

### 主日跟踪
- 连续缺勤事件管理
- 多事件支持
- 事件终止机制
- 事件管理页面

### 代码优化
- 重复函数合并，减少约200行重复代码
- 统一工具函数接口，提高代码复用性
- 清理未使用代码，提升系统性能
- 优化调试工具，简化开发流程

## 📖 详细文档

更多详细信息请查看：
- [系统需求文档](docs/requirements/SYSTEM_REQUIREMENTS.md)
- [更新日志](docs/reports/CHANGELOG.md)
- [API文档](docs/requirements/API_DOCUMENTATION.md)
- [故障排除](docs/troubleshooting/TROUBLESHOOTING.md)
- [代码清理报告](docs/reports/CLEANUP_REPORT.md)

## 🔧 维护

### 文件清理
```bash
# 运行清理检查
./tools/protect_documents.sh
```

### 备份策略
系统自动备份重要数据到 `backup/` 目录。

## 📞 支持

如有问题，请查看：
- [故障排除指南](docs/troubleshooting/TROUBLESHOOTING.md)
- [保护文件清单](docs/PROTECTED_FILES.md)

---

**MSH签到系统** - 高效、可靠的签到管理解决方案