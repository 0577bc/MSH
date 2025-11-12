# MSH签到系统

一个基于Firebase的PWA签到管理系统，支持全体成员签到、主日跟踪、数据分析等功能。

## ⚠️ 重要提示

**本仓库不包含以下内容（已在.gitignore中）**：
- ❌ 真实的Firebase配置文件（config.js）
- ❌ 云表单系统代码（cloud-forms/）
- ❌ 本地备份数据（backup/）
- ❌ 记忆系统对话历史（simple-memory-system/）

**首次使用请参考**：[CONFIG_SETUP.md](./CONFIG_SETUP.md)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd MSH
```

### 2. 配置Firebase

```bash
# 复制配置模板
cp config.example.js config.js

# 编辑config.js，填写您的Firebase配置
```

详细配置指南请查看：[CONFIG_SETUP.md](./CONFIG_SETUP.md)

### 3. 启动本地服务器

```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000
```

### 4. 访问系统

打开浏览器访问：`http://localhost:8000`

## 📁 项目结构

```
MSH/
├── index.html              # 主签到页面
├── admin.html              # 管理页面
├── group-management.html   # 成员管理
├── summary.html            # 签到汇总
├── src/                    # 源代码
├── tools/                  # 工具页面
├── docs/                   # 项目文档
└── scripts/                # 脚本工具
```

## 🎯 核心功能

- ✅ 全体成员签到（不限小组）
- ✅ 实时签到统计
- ✅ 主日跟踪事件管理
- ✅ 成员信息管理
- ✅ UUID唯一标识
- ✅ PWA离线支持
- ✅ 数据实时同步

## 🛡️ 安全说明

### 敏感信息保护

本项目使用 `.gitignore` 保护以下敏感信息：

- Firebase API密钥和配置
- 外部系统凭据
- 本地备份数据
- 用户对话历史

### 配置文件

- `config.example.js` - 配置模板（可公开）
- `config.js` - 真实配置（.gitignore已忽略）

## 📖 文档

- [项目概述](./PROJECT-OVERVIEW.md)
- [配置指南](./CONFIG_SETUP.md)
- [强制规则](./MANDATORY_RULES.md)
- [设计系统](./DESIGN-SYSTEM.json)

## 🔧 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Firebase Realtime Database v8
- **PWA**: Service Worker, Manifest
- **部署**: 静态文件服务器

## 📊 性能优化

- 页面加载速度提升 60-80%
- 数据传输量减少 90%+
- 存储空间减少 50%+

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

[添加您的许可证信息]

---

**版本**: v3.0  
**最后更新**: 2025-10-08
