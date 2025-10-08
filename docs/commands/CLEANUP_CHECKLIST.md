# MSH签到系统 - 文件清理检查清单

## 🚨 清理前必读

**⚠️ 重要提醒：在清理任何文件前，必须完成以下检查！**

## 📋 清理前检查清单

### **1. 保护状态检查**
```bash
# 运行保护脚本检查当前状态
./tools/protect_documents.sh
```

**必须确认**：
- [ ] 所有受保护文件都存在
- [ ] 备份目录结构完整
- [ ] .gitignore文件包含保护规则

### **2. 受保护文件确认**
```bash
# 查看受保护文件清单
cat PROTECTED_FILES.md
```

**绝对不可删除的文件**：
- [ ] `SYSTEM_REQUIREMENTS.md` - 系统需求文档
- [ ] `OPTIMIZATION_REPORT.md` - 优化报告
- [ ] `CHANGELOG.md` - 变更日志
- [ ] `API_DOCUMENTATION.md` - API文档
- [ ] `DEPLOYMENT.md` - 部署指南
- [ ] `MAINTENANCE.md` - 维护手册
- [ ] `TROUBLESHOOTING.md` - 故障排除
- [ ] `PROTECTED_FILES.md` - 保护文件清单
- [ ] `DOCUMENTATION_GUIDE.md` - 文档指南
- [ ] `backup/` 目录及其所有内容
- [ ] `config.js` - 配置文件
- [ ] `manifest.json` - PWA配置
- [ ] `protect_documents.sh` - 保护脚本

### **3. 核心功能文件确认**
**绝对不可删除的文件**：
- [ ] `index.html` - 主签到页面
- [ ] `admin.html` - 管理页面
- [ ] `daily-report.html` - 日报表页面
- [ ] `summary.html` - 汇总页面
- [ ] `attendance-records.html` - 签到原始记录
- [ ] `delete-management.html` - 删除管理
- [ ] `firebase-monitor.html` - Firebase监控
- [ ] `sunday-tracking.html` - 主日跟踪
- [ ] `src/main.js` - 主页面逻辑
- [ ] `src/admin.js` - 管理页面逻辑
- [ ] `src/new-data-manager.js` - 数据管理核心
- [ ] `src/utils.js` - 工具函数库
- [ ] `src/style.css` - 样式文件
- [ ] `src/service-worker.js` - 服务工作者

### **4. 工具和辅助文件确认**
**绝对不可删除的工具文件**：
- [ ] `tools/` 目录及其所有内容（完整保护）
- [ ] `tools/msh-system/` - MSH系统工具目录
- [ ] `tools/cloud-forms/` - 云表单工具目录  
- [ ] `tools/cross-system/` - 跨系统工具目录
- [ ] `tools/index.html` - 工具总览页面
- [ ] `tools/TOOLS_GUIDE.md` - 工具使用指南
- [ ] `tools/IMPORT-GUIDE.md` - 导入指南
- [ ] `tools/protect_documents.sh` - 文档保护脚本

## ✅ 可以安全删除的文件

### **1. 临时文件**
- [ ] 以 `temp-` 开头的文件
- [ ] 以 `.tmp` 结尾的文件
- [ ] 以 `.temp` 结尾的文件
- [ ] 以 `.bak` 结尾的备份文件

### **2. 测试文件**
- [ ] 以 `test-` 开头的HTML文件
- [ ] 以 `debug-` 开头的HTML文件
- [ ] 以 `demo-` 开头的文件

### **3. 缓存文件**
- [ ] `.cache/` 目录
- [ ] `cache/` 目录
- [ ] 以 `.cache` 结尾的文件

### **4. 日志文件**
- [ ] 以 `.log` 结尾的文件
- [ ] `logs/` 目录

### **5. 开发工具文件**
- [ ] `.DS_Store` (macOS)
- [ ] `Thumbs.db` (Windows)
- [ ] 以 `.swp` 结尾的文件 (Vim)
- [ ] 以 `.swo` 结尾的文件 (Vim)
- [ ] 以 `~` 结尾的文件 (备份文件)

## 🔍 清理前验证步骤

### **步骤1：运行保护检查**
```bash
./tools/protect_documents.sh
```

### **步骤1.5：验证工具保护**
```bash
./tools/verify-tools-protection.sh
```

### **步骤2：确认保护状态**
确保看到：
```
✅ 所有受保护文件都存在
✅ 备份目录存在
✅ .gitignore文件存在
✅ 保护文件清单存在
```

### **步骤3：检查文件引用**
```bash
# 检查HTML文件中的script引用
grep -r "script src=" *.html

# 检查JavaScript文件中的import/require
grep -r "import\|require" src/

# 检查工具文件引用
grep -r "tools/" *.html
```

### **步骤4：备份重要变更**
```bash
# 创建清理前备份
mkdir -p backup/pre_cleanup_$(date +%Y%m%d_%H%M%S)
cp -r src/ backup/pre_cleanup_$(date +%Y%m%d_%H%M%S)/
```

## 🚫 清理禁止事项

### **绝对禁止删除**
1. **任何 .md 文件** - 所有文档文件
2. **backup/ 目录** - 所有备份文件
3. **config.js** - 系统配置
4. **manifest.json** - PWA配置
5. **tools/ 目录** - 所有工具文件（完整保护）
6. **任何在 PROTECTED_FILES.md 中列出的文件**
7. **核心功能文件** - HTML、JavaScript、CSS文件
8. **工具分类目录** - msh-system/、cloud-forms/、cross-system/

### **删除前必须确认**
1. **文件不被其他文件引用**
2. **文件不在受保护清单中**
3. **文件不是系统核心功能**
4. **文件有对应的备份**

## 📝 清理后验证

### **清理后必须执行**
```bash
# 1. 再次运行保护检查
./tools/protect_documents.sh

# 2. 检查系统功能
# 打开浏览器测试主要功能

# 3. 检查文件引用
grep -r "script src=" *.html
```

### **验证清单**
- [ ] 所有受保护文件仍然存在
- [ ] 系统主要功能正常工作
- [ ] 页面可以正常加载
- [ ] 数据同步功能正常
- [ ] 没有404错误

## 🆘 紧急恢复

### **如果误删重要文件**
```bash
# 1. 从备份恢复
cp backup/docs/latest/误删文件名 ./

# 2. 从Git恢复（如果使用Git）
git checkout HEAD -- 误删文件名

# 3. 重新创建文件
# 参考 PROTECTED_FILES.md 中的文件清单
```

## 📞 联系信息

**清理前如有疑问**：
- 查看 `PROTECTED_FILES.md`
- 运行 `./tools/protect_documents.sh`
- 联系系统管理员

---
*此检查清单将根据系统变更持续更新*
