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

## ✨ 核心功能

### 📱 签到管理
- **多小组支持**: 9个小组管理
- **实时签到**: 早到、准时、迟到分类
- **新朋友登记**: 完整信息录入
- **签到统计**: 实时人数统计

### 👥 成员管理
- **花名管理**: 支持花名和真名
- **信息维护**: 姓名、电话、性别、受洗状态、年龄段
- **UUID管理**: 唯一标识符系统
- **未签到不统计**: 智能统计逻辑

### 📊 数据管理
- **实时同步**: Firebase 实时数据库
- **缓存优化**: 减少90%网络请求
- **数据备份**: 自动备份机制
- **数据清理**: 删除管理功能

### 🧠 智能记忆系统
- **智能触发**: 自动识别重要信息
- **自动归档**: 智能阈值归档
- **用户学习**: 个性化体验
- **安全审计**: 敏感信息扫描

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Firebase Realtime Database v8
- **PWA**: Service Worker, Manifest
- **部署**: 静态文件服务器

## 📈 性能优化

- **缓存策略**: 页面切换速度提升约80%
- **网络优化**: 网络请求减少约90%
- **代码优化**: 重复函数合并，减少约200行重复代码
- **智能记忆**: 提升AI编程效率50%+

## 📚 文档

- [项目结构](PROJECT-STRUCTURE.md) - 完整的项目文件结构
- [项目概述](PROJECT-OVERVIEW.md) - 详细的技术架构和功能说明
- [设计系统](DESIGN-SYSTEM.json) - 编码规范和UI模式
- [智能记忆系统](simple-memory-system/README.md) - 外部记忆系统使用指南
- [详细文档](docs/) - 完整的技术文档

## 🔧 维护

### 智能记忆系统
```bash
# 初始化记忆系统
cd simple-memory-system
./setup.sh
```

### 文件保护
```bash
# 运行清理检查
./tools/protect_documents.sh
```

## 📞 支持

如有问题，请查看：
- [故障排除指南](docs/troubleshooting/TROUBLESHOOTING.md)
- [保护文件清单](docs/PROTECTED_FILES.md)

---

**MSH签到系统** - 高效、可靠的签到管理解决方案