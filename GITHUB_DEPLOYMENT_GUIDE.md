# GitHub Pages 部署完整指南

> 📅 创建日期：2025-10-09  
> 🎯 目标：让 https://0577bc.github.io/MSH/ 正常运行

---

## 📋 部署流程总览

```
步骤1: 创建GitHub Actions配置文件 (5分钟)
    ↓
步骤2: 配置GitHub Secrets (5分钟)
    ↓
步骤3: 推送代码触发部署 (2分钟)
    ↓
步骤4: 启用GitHub Pages (2分钟)
    ↓
步骤5: 验证访问 (1分钟)
    ↓
✅ 完成！网站可以访问
```

---

## 🚀 步骤1: 创建GitHub Actions配置

### 方式A: 在GitHub网页上创建（推荐）

1. **访问你的仓库**：
   ```
   https://github.com/0577bc/MSH
   ```

2. **创建workflow文件**：
   - 点击 "Add file" → "Create new file"
   - 文件路径输入：`.github/workflows/deploy.yml`
   - 复制下面的内容粘贴：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Create config.js from secrets
      run: |
        cat > config.js << 'EOF'
        /**
         * MSH系统配置文件 (自动生成)
         * 来源: GitHub Secrets
         */
        
        if (typeof window !== 'undefined') {
          // Firebase配置
          window.firebaseConfig = {
            apiKey: "${{ secrets.FIREBASE_API_KEY }}",
            authDomain: "${{ secrets.FIREBASE_AUTH_DOMAIN }}",
            databaseURL: "${{ secrets.FIREBASE_DATABASE_URL }}",
            projectId: "${{ secrets.FIREBASE_PROJECT_ID }}",
            storageBucket: "${{ secrets.FIREBASE_STORAGE_BUCKET }}",
            messagingSenderId: "${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}",
            appId: "${{ secrets.FIREBASE_APP_ID }}"
          };
          
          // 外部表单系统配置（可选）
          window.externalFormConfig = {
            apiBaseUrl: '${{ secrets.EXTERNAL_FORM_API_URL }}' || 'http://your-server-ip/api',
            auth: {
              username: '${{ secrets.EXTERNAL_FORM_USERNAME }}' || 'admin',
              password: '${{ secrets.EXTERNAL_FORM_PASSWORD }}' || 'password',
              token: null
            },
            endpoints: {
              login: '/auth/login',
              forms: '/forms',
              submissions: '/submissions',
              status: '/status'
            }
          };
        }
        EOF
    
    - name: Setup Pages
      uses: actions/configure-pages@v4
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: '.'
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

3. **提交文件**：
   - 在底部填写提交信息：`添加GitHub Actions自动部署配置`
   - 点击 "Commit new file"

---

## 🔐 步骤2: 配置GitHub Secrets

### 获取配置值

从你的本地 `config.js` 文件中获取这些值：

```javascript
// 你需要这些值：
apiKey: "AIzaSyBMp9_gt3TpRQivmCFTz6g9SSKF-oOo01Y"
authDomain: "yjys-4102e.firebaseapp.com"
databaseURL: "https://yjys-4102e-default-rtdb.firebaseio.com/"
projectId: "yjys-4102e"
storageBucket: "yjys-4102e.firebasestorage.app"
messagingSenderId: "690578220792"
appId: "1:690578220792:web:8e6d537901e2636782fd0d"
```

### 添加Secrets步骤

1. **访问Settings**：
   ```
   https://github.com/0577bc/MSH/settings/secrets/actions
   ```

2. **点击 "New repository secret"**

3. **添加以下7个必需的Secrets**：

| Secret名称 | 值（从你的config.js复制） |
|-----------|------------------------|
| `FIREBASE_API_KEY` | `AIzaSyBMp9_gt3TpRQivmCFTz6g9SSKF-oOo01Y` |
| `FIREBASE_AUTH_DOMAIN` | `yjys-4102e.firebaseapp.com` |
| `FIREBASE_DATABASE_URL` | `https://yjys-4102e-default-rtdb.firebaseio.com/` |
| `FIREBASE_PROJECT_ID` | `yjys-4102e` |
| `FIREBASE_STORAGE_BUCKET` | `yjys-4102e.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `690578220792` |
| `FIREBASE_APP_ID` | `1:690578220792:web:8e6d537901e2636782fd0d` |

4. **（可选）添加外部表单系统的Secrets**：

如果需要外部表单功能：

| Secret名称 | 值 |
|-----------|-----|
| `EXTERNAL_FORM_API_URL` | `http://112.124.97.58/api` |
| `EXTERNAL_FORM_USERNAME` | `admin` |
| `EXTERNAL_FORM_PASSWORD` | `admin123456` |

### 添加单个Secret的详细步骤

```
1. 点击 "New repository secret"
2. Name: FIREBASE_API_KEY
3. Secret: AIzaSyBMp9_gt3TpRQivmCFTz6g9SSKF-oOo01Y
4. 点击 "Add secret"
5. 重复以上步骤添加其他6个Secret
```

---

## 📄 步骤3: 启用GitHub Pages

### 方式1: 通过Settings配置（推荐）

1. **访问Pages设置**：
   ```
   https://github.com/0577bc/MSH/settings/pages
   ```

2. **配置Source**：
   - Source: `GitHub Actions`
   - **注意**：选择 "GitHub Actions"，不是 "Deploy from a branch"

3. **保存**：配置会自动保存

### 如何找到配置

```
仓库主页
  → Settings (顶部菜单)
  → Pages (左侧菜单，在 Code and automation 部分)
  → Source 下拉框
  → 选择 "GitHub Actions"
```

---

## 🔄 步骤4: 触发部署

### 自动触发

创建workflow文件后，会自动触发第一次部署。

### 手动触发

如果需要手动触发：

1. 访问 Actions：
   ```
   https://github.com/0577bc/MSH/actions
   ```

2. 选择 "Deploy to GitHub Pages" workflow

3. 点击 "Run workflow" → "Run workflow"

---

## ✅ 步骤5: 验证部署

### 检查部署状态

1. **查看Actions**：
   ```
   https://github.com/0577bc/MSH/actions
   ```

2. **查看最新workflow运行**：
   - 绿色 ✅ = 成功
   - 黄色 🟡 = 进行中
   - 红色 ❌ = 失败（查看日志）

3. **等待部署完成**：通常需要1-2分钟

### 访问网站

部署成功后，访问：

```
https://0577bc.github.io/MSH/
```

### 验证功能

- ✅ 页面能正常加载
- ✅ 没有 config.js 404 错误
- ✅ Firebase连接成功
- ✅ 能看到签到界面

---

## 🐛 故障排除

### 问题1: Workflow运行失败

**症状**：Actions显示红色 ❌

**解决**：
1. 点击失败的workflow
2. 查看错误日志
3. 确认所有Secrets都已正确添加

### 问题2: 网站404

**症状**：访问GitHub Pages显示404

**可能原因**：
- Pages未启用
- Workflow尚未完成
- Source配置错误

**解决**：
1. 确认Pages已启用（Settings → Pages）
2. 确认Source选择了 "GitHub Actions"
3. 等待workflow完成（查看Actions）

### 问题3: config.js仍然404

**症状**：网站加载但config.js找不到

**解决**：
1. 检查Secrets是否都已添加
2. 重新运行workflow
3. 查看workflow日志中的 "Create config.js" 步骤

### 问题4: Firebase连接失败

**症状**：页面加载但Firebase初始化失败

**解决**：
1. 检查Secrets中的值是否正确
2. 确认没有多余的空格或引号
3. 验证Firebase配置是否有效

---

## 📊 配置检查清单

部署前确认：

- [ ] 已在GitHub创建 `.github/workflows/deploy.yml`
- [ ] 已添加7个必需的Firebase Secrets
- [ ] 已在Settings → Pages启用GitHub Actions
- [ ] 已触发workflow运行
- [ ] Workflow运行成功（绿色✅）
- [ ] 能访问 https://0577bc.github.io/MSH/
- [ ] 页面功能正常

---

## 🎯 预期结果

完成所有步骤后：

```
✅ GitHub Actions自动运行
✅ 自动生成config.js（包含真实配置）
✅ 自动部署到GitHub Pages
✅ 网站可以公开访问
✅ Firebase功能正常工作

⏱️ 整个过程约15分钟
🔄 以后每次推送main分支都会自动部署
```

---

## 💡 重要提示

### 安全性

- ✅ Secrets在GitHub中加密存储
- ✅ Secrets不会出现在日志中
- ✅ 只有仓库管理员能查看Secrets
- ✅ workflow运行在隔离环境中

### 自动化

- 🔄 每次推送main分支自动部署
- 🔄 可以手动触发部署
- 🔄 部署失败会发送通知

### 维护

- 🔧 更新配置：只需修改Secrets
- 🔧 回滚：运行旧的workflow
- 🔧 禁用：删除workflow文件或禁用Actions

---

## 📞 需要帮助？

如果遇到问题：

1. 查看workflow运行日志
2. 参考本文档的故障排除部分
3. 检查GitHub Pages状态页面

---

**创建日期**：2025-10-09  
**最后更新**：2025-10-09  
**状态**：✅ 可以开始配置
