# 代码拆分后使用指南

**更新日期**: 2025-10-13  
**适用版本**: v3.0 (模块化重构后)

---

## 🎯 快速开始

### 1. 启动本地服务器
```bash
cd /Users/benchen/MSH
python3 -m http.server 8000
```

### 2. 访问系统
浏览器打开: `http://localhost:8000`

### 3. 测试功能
按照 [docs/optimizations/TESTING_CHECKLIST.md](docs/optimizations/TESTING_CHECKLIST.md) 进行测试

---

## 📦 新的模块结构

### 如何引入模块

在HTML文件中，现在需要按以下顺序引入模块：

```html
<!-- 1. Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>

<!-- 2. 配置文件 -->
<script src="./config.js"></script>

<!-- 3. 样式模块 -->
<link rel="stylesheet" href="./src/styles/base.css">
<link rel="stylesheet" href="./src/styles/components.css">
<link rel="stylesheet" href="./src/styles/utils.css">
<!-- 根据页面需要引入特定样式 -->
<link rel="stylesheet" href="./src/styles/pages/sunday-tracking.css">

<!-- 4. 核心工具模块 -->
<script src="./src/core/firebase-utils.js"></script>
<script src="./src/core/time-utils.js"></script>
<script src="./src/core/security-utils.js"></script>

<!-- 5. 数据管理模块 -->
<script src="./src/data/uuid-manager.js"></script>
<script src="./src/data/sync-managers.js"></script>

<!-- 6. 功能模块 -->
<script src="./src/features/sunday-tracking-utils.js"></script>

<!-- 7. 数据管理器模块 -->
<script src="./src/data-manager/index.js"></script>
<script src="./src/data-manager/data-loader.js"></script>
<script src="./src/data-manager/data-recovery.js"></script>
<script src="./src/data-manager/data-sync.js"></script>
<script src="./src/data-manager/data-operations.js"></script>

<!-- 8. 业务逻辑 -->
<script src="./src/main.js"></script>
```

### 模块说明

| 模块 | 文件数 | 功能 |
|------|--------|------|
| core/ | 3 | Firebase、时间、安全工具 |
| data/ | 2 | UUID管理、数据同步 |
| features/ | 1 | 主日跟踪工具 |
| data-manager/ | 5 | 数据管理器（加载、同步、恢复） |
| sunday-tracking/ | 4 | 主日跟踪页面逻辑 |
| styles/ | 6 | 样式文件（基础、组件、页面） |

---

## 🔍 常见问题

### Q1: 页面出现404错误怎么办？
**A**: 检查文件路径是否正确，确保使用 `./src/core/` 这样的相对路径。

### Q2: Console显示"模块未加载"？
**A**: 检查模块引入顺序，核心模块必须在业务模块之前加载。

### Q3: 样式显示不正确？
**A**: 确认引入了必要的样式文件：
- base.css（必须）
- components.css（必须）
- 页面特定样式（按需）

### Q4: 功能不正常，怎么回滚？
**A**: 使用以下命令回滚：
```bash
cd /Users/benchen/MSH
for f in *.pre-split-backup; do mv "$f" "${f%.pre-split-backup}"; done
mv src/utils.js.backup src/utils.js
mv src/style.css.backup src/style.css
mv src/new-data-manager.js.backup src/new-data-manager.js
mv src/sunday-tracking.js.backup src/sunday-tracking.js
```

---

## 📝 开发指南

### 修改现有模块
1. 找到对应的模块文件
2. 修改代码
3. 测试功能
4. 提交更改

### 添加新功能
1. 确定功能所属模块
2. 在对应目录创建新文件
3. 更新模块导出
4. 更新HTML引用
5. 测试验证

### 性能优化建议
- 只引入必要的模块
- 按需加载页面特定样式
- 使用浏览器缓存
- 定期清理localStorage

---

## 🐛 Bug报告

### 如何报告Bug
1. 记录页面URL
2. 记录重现步骤
3. 截图Console错误
4. 截图Network请求
5. 提供环境信息（浏览器、设备）

### Bug报告模板
```
页面: 
问题描述: 
重现步骤:
1. 
2. 
3. 
预期结果: 
实际结果: 
Console错误: 
截图: 
严重程度: 🔴/🟡/🟢
```

---

## 📊 性能监控

### 关键指标
- 页面加载时间: < 3秒
- JavaScript加载: < 1秒
- 首次内容渲染: < 2秒
- 数据同步延迟: < 1秒

### 监控工具
- Chrome DevTools Performance
- Lighthouse
- Firebase Console
- Network Tab

---

## 🔗 相关文档

- [测试清单](docs/optimizations/TESTING_CHECKLIST.md)
- [拆分报告](docs/optimizations/CODE_SPLIT_SUMMARY.md)
- [项目结构](docs/PROJECT-STRUCTURE.md)
- [优化索引](docs/optimizations/OPTIMIZATION_INDEX.md)

---

## 📞 技术支持

如遇到问题，请：
1. 查看[测试清单](docs/optimizations/TESTING_CHECKLIST.md)
2. 检查[常见问题](#常见问题)
3. 查看Console错误信息
4. 准备好详细的Bug报告

---

**祝测试顺利！** 🎉
