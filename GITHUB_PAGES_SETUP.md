# GitHub Pages 部署指南

## ⚠️ 重要说明

MSH系统的 `config.js` 包含Firebase密钥，出于安全考虑已在 `.gitignore` 中忽略。

因此，**直接访问GitHub Pages会出现404错误**。

---

## 🎯 访问方式

### 方案1: 本地访问（推荐）✅

```bash
# 1. 克隆仓库
git clone https://github.com/0577bc/MSH.git
cd MSH

# 2. 创建配置文件
cp config.example.js config.js

# 3. 编辑config.js，填入真实Firebase配置
# 详见：CONFIG_SETUP.md

# 4. 启动本地服务器
python3 -m http.server 8000

# 5. 访问
open http://localhost:8000
```

**优点**：
- ✅ 完全功能
- ✅ 数据安全
- ✅ 无需额外配置

---

### 方案2: GitHub Pages + GitHub Actions（适合团队）

如果需要在线访问，使用GitHub Actions自动部署：

#### 步骤1: 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

需要添加的Secrets：

| Secret名称 | 说明 | 示例值 |
|-----------|------|--------|
| `FIREBASE_API_KEY` | Firebase API密钥 | AIzaSy... |
| `FIREBASE_AUTH_DOMAIN` | Firebase认证域名 | your-project.firebaseapp.com |
| `FIREBASE_DATABASE_URL` | Firebase数据库URL | https://your-project.firebaseio.com |
| `FIREBASE_PROJECT_ID` | Firebase项目ID | your-project-id |
| `FIREBASE_STORAGE_BUCKET` | Firebase存储桶 | your-project.appspot.com |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase消息发送者ID | 1234567890 |
| `FIREBASE_APP_ID` | Firebase应用ID | 1:1234567890:web:... |

#### 步骤2: 启用GitHub Actions

1. 仓库已包含 `.github/workflows/deploy.yml`
2. 推送代码到main分支会自动触发部署
3. 或手动触发：Actions → Deploy to GitHub Pages → Run workflow

#### 步骤3: 启用GitHub Pages

```
Settings → Pages → Source → gh-pages branch
```

部署完成后，访问：
```
https://0577bc.github.io/MSH/
```

---

### 方案3: Fork后添加配置（适合个人）

如果你要Fork这个项目：

```bash
# 1. Fork仓库到你的账号
# 2. 克隆你的Fork
git clone https://github.com/YOUR_USERNAME/MSH.git

# 3. 添加你的config.js
cp config.example.js config.js
# 编辑config.js填入真实配置

# 4. 提交（只在你的私有仓库）
git add config.js
git commit -m "Add my config"
git push

# 5. 启用GitHub Pages
```

⚠️ **注意**：只在私有仓库这样做，公开仓库会泄露密钥！

---

## 🔒 安全建议

### ✅ 推荐做法

- ✅ 本地开发：使用本地服务器 + config.js
- ✅ 团队部署：使用GitHub Actions + Secrets
- ✅ 私有仓库：可以直接提交config.js

### ❌ 不要做

- ❌ 在公开仓库提交真实的config.js
- ❌ 在公开的GitHub Pages暴露Firebase密钥
- ❌ 分享包含密钥的配置文件

---

## 💡 常见问题

### Q: 为什么GitHub Pages访问显示404？

**A**: config.js被.gitignore忽略，没有上传到GitHub。这是安全设计。

### Q: 如何在线演示？

**A**: 使用GitHub Actions + Secrets部署，或部署到其他平台（Vercel、Netlify）。

### Q: 本地访问正常吗？

**A**: 完全正常！本地有config.js文件，功能完整。

---

## 📚 相关文档

- [配置指南](./CONFIG_SETUP.md) - 详细配置步骤
- [项目说明](./README_GITHUB.md) - GitHub版本说明
- [强制规则](./MANDATORY_RULES.md) - 安全规则

---

**最后更新**: 2025-10-08  
**推荐方式**: 本地访问（localhost:8000）
