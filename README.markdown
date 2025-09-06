# MSH 签到系统

## 项目概述
MSH 签到系统是一个基于 Web 的应用程序，用于管理小组成员签到、记录新人信息、查看每日签到报表和汇总报告。系统使用 Firebase 实时数据库存储数据，并支持 PWA（渐进式 Web 应用）功能，适用于移动和桌面设备。

## 功能
- **签到页面** (`index.html`): 提供小组和成员选择、姓名搜索、签到登记、新人登记和日报表查看功能。
- **管理页面** (`admin.html`): 支持小组和成员管理、密码修改、日志查看、数据导入/导出。
- **日报表页面** (`daily-report.html`): 显示当日签到、新增和未签到人员信息。
- **汇总页面** (`summary.html`): 支持查看签到记录、季度和年度报告，导出记录和清空记录。

## 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES Modules)
- **后端**: Firebase Realtime Database
- **依赖**: Firebase SDK (v10.12.2)
- **PWA**: 支持离线访问和移动设备安装

## 安装步骤
1. **克隆项目**:
   ```bash
   git clone <repository-url>
   cd msh-system
   ```
2. **安装依赖**:
   ```bash
   npm install
   ```
3. **配置 Firebase**:
   - 创建一个 `.env` 文件，添加 Firebase 配置（参考 `.env.example`）：
     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
     ```
4. **运行项目**:
   ```bash
   npm run dev
   ```
   访问 `http://localhost:5173`（或你的 Vite 配置端口）。

## 使用说明
1. **签到**:
   - 在 `index.html` 中选择小组和成员，或通过姓名搜索进行签到。
   - 新人登记需选择小组并输入姓名和联系号码。
2. **管理**:
   - 访问 `admin.html` 管理小组和成员，修改密码，查看日志，导入/导出数据。
   - 需确保已登录（在 `main.js` 或后端实现身份验证）。
3. **报表**:
   - `daily-report.html` 显示当日签到、新增和未签到人员。
   - `summary.html` 支持查看签到记录、季度和年度报告。
4. **PWA**:
   - 可在支持的浏览器中安装为应用，需确保 `manifest.json` 和图标正确配置。

## 文件结构
```
msh-system/
├── src/
│   ├── style.css           # 全局样式
│   ├── main.js            # 签到页面逻辑
│   ├── daily-report.js    # 日报表逻辑
│   ├── summary.js         # 汇总页面逻辑
│   ├── admin.js           # 管理页面逻辑
├── index.html             # 签到页面
├── admin.html             # 管理页面
├── daily-report.html      # 日报表页面
├── summary.html           # 汇总页面
├── manifest.json          # PWA 配置
├── .env                   # Firebase 配置（敏感信息）
├── node_modules/          # 项目依赖
├── package.json           # 项目配置文件
```

## 注意事项
- **安全性**:
  - 确保 Firebase 配置存储在 `.env` 文件中，避免直接嵌入 HTML。
  - 在 `main.js`、`admin.js` 等中实现身份验证和 CSRF 保护。
- **可访问性**:
  - 页面已添加 `aria-label` 和 `<caption>`，支持屏幕阅读器。
- **用户体验**:
  - 建议在 JavaScript 中实现加载状态提示和错误反馈。
- **PWA**:
  - 验证 `manifest.json` 中的图标和配置。
  - 确保服务工作者（Service Worker）在 `main.js` 中正确注册。

## 开发建议
- 在 `main.js`、`admin.js` 等中添加错误处理和加载状态提示。
- 实现后端 API（如 `/api/firebase-config`）以安全加载 Firebase 配置。
- 测试 PWA 功能，确保离线访问正常。
- 验证所有表单提交使用 HTTPS 和 CSRF 令牌。

## 联系方式
如有问题，请联系项目维护者或提交 Issue。