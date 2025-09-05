# MSH 签到系统

## 项目概述
这是一个基于 JavaScript 和 Firebase Firestore 的签到系统，用于管理小组成员签到、新人登记、管理员操作、日/季/年度报表生成和 Excel 导出。使用 Vite 作为构建工具，支持 PWA（Progressive Web App）离线功能。

## 功能列表
- **签到**：用户选择小组和成员进行签到，支持时间段分类（早到、准时、迟到）。
- **新人登记**：添加新成员到 Firestore 数据库。
- **管理员页面**：修改成员信息、小组管理（添加/删除/改名）、密码修改、修改日志查看。
- **日报表**：显示当日签到统计。
- **签到汇总**：查看签到记录、日/季/年度报表，支持 Excel 导出（使用 xlsx 库）。
- **搜索建议**：姓名搜索支持建议列表。
- **PWA 支持**：通过 Service Worker 支持离线缓存。

## 技术栈
- **前端**：JavaScript, HTML, CSS。
- **构建工具**：Vite (v7.1.3 或更高版本)。
- **数据库**：Firebase Firestore (v12.1.0)。
- **依赖**：
  - firebase (^12.1.0)
  - xlsx (^0.18.5)
- **其他**：Service Worker for PWA, Promise for async operations.

## 项目结构
project/
├── src/
│   ├── firebase-config.js   # Firebase 初始化和 Firestore db 导出
│   ├── main.js              # 主页面逻辑 (签到、新人登记)
│   ├── admin.js             # 管理员页面逻辑
│   ├── daily-report.js      # 日报表逻辑
│   ├── summary.js           # 签到汇总和报表逻辑
│   ├── service-worker.js    # PWA Service Worker
│   ├── style.css            # CSS 样式
├── index.html               # 主页面
├── admin.html               # 管理员页面
├── daily-report.html        # 日报表页面
├── summary.html             # 签到汇总页面
├── manifest.json            # PWA manifest
├── vite.config.js           # Vite 配置
├── package.json             # 依赖配置
└── README.md                # 说明文件

## 安装和运行
1. **安装依赖**：
npm install

2. **开发模式**：
npm run dev
- 访问 http://localhost:5500

3. **构建生产版本**：
npm run build
- 输出到 `dist/` 目录。

4. **注册 Service Worker**：
- 浏览器会自动注册 `src/service-worker.js`，支持离线缓存。

## Firebase 配置
- 在 `src/firebase-config.js` 中替换占位符（apiKey, messagingSenderId, appId 等）为您的 Firebase 项目配置。从 Firebase 控制台获取（项目设置 → 常规 → 您的应用）。
- Firebase 项目 ID：yjys-4102e。
- 启用 Firestore 数据库。
- **安全规则**（测试用，生产环境需加强）：
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /{document=**} {
allow read, write: if true;
}
}
}

## Firestore 数据结构
- `settings` 集合：
- 文档 `adminPassword`：{ password: "1234" }（初始密码）。
- 文档 `groupNames`：{ group1: "小组1", group2: "小组2", ... }（小组名称）。
- `members` 集合：
- 每个文档：{ group, name, phone, gender, baptized, age, addedDate }。
- `attendance` 集合：
- 每个文档：{ group, member, date, time, segment }。
- `logs` 集合：
- 每个文档：{ date, action }（修改日志）。

## 初始化数据
如果 Firestore 为空，在 `main.js` 或单独脚本运行以下代码初始化：
async function initData() {
await setDoc(doc(db, 'settings', 'adminPassword'), { password: '1234' });
await setDoc(doc(db, 'settings', 'groupNames'), {
group1: '小组1',
group2: '小组2',
group3: '小组3',
group4: '小组4'
});
await addDoc(collection(db, 'members'), {
group: 'group1',
name: '成员A',
phone: '',
gender: '男',
baptized: '否',
age: '90后',
addedDate: '2025-08-30'
});
}
initData();

## 注意事项
- **生产环境**：加强 Firestore 规则，使用 Firebase Authentication 限制访问。
- **浏览器兼容性**：在 Chrome/Firefox 测试运行。
- **漏洞修复**：运行 `npm audit fix` 处理依赖漏洞。
- **部署**：使用 Firebase Hosting：
firebase init
firebase deploy
- **更新软件**：复制所有文件到其他 AI，运行 `npm install`，然后 `npm run dev` 测试。

## 联系
如果有问题，请联系开发者。