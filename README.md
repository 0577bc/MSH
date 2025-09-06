# MSH签到系统

这是一个基于Firebase的签到管理系统，支持多时间段签到和实时数据同步。

## 功能特点

### 1. 多时间段签到
- **早到**: 9:20之前
- **准时**: 9:20-9:30
- **迟到**: 9:30-10:40
- 每个成员每天只能签到一次

### 2. 智能姓名检索
- 输入姓名时实时显示匹配结果
- 显示成员姓名和所属小组
- 点击预选结果自动填入小组和成员选择框

### 3. 实时数据同步
- 基于Firebase实时数据库
- 多设备数据同步
- 签到名单实时更新

### 4. 签到名单显示
- 没有签到数据时自动隐藏表格
- 有数据时才显示相应的签到名单
- 按时间段分类显示

### 5. 日报表功能
- 查看当日签到情况
- 统计未签到人员（显示具体姓名）
- 新人登记记录

### 6. 汇总报告
- 支持查看不同日期的签到记录
- 季度和年度统计报告
- 数据导出功能

### 7. 管理功能
- 小组成员管理
- 密码修改
- 数据导入/导出
- 签到时间编辑

## 快速体验

### 在线演示
- 🌐 [GitHub Pages 演示](https://0577bc.github.io/MSH/) - 使用演示配置，可以体验所有功能
- 📱 支持移动端访问
- 🔄 实时数据同步演示

### 本地运行
```bash
git clone https://github.com/0577bc/MSH.git
cd MSH
# 直接用浏览器打开 index.html 即可体验
```

## 安装和配置

### 1. 克隆项目
```bash
git clone https://github.com/0577bc/MSH.git
cd MSH
```

### 2. 配置Firebase
1. 复制 `config.example.js` 为 `config.js`
2. 在 `config.js` 中填入您的Firebase配置信息
3. 设置一个安全的管理员密码

```javascript
// config.js
window.firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-project.firebaseapp.com", 
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

window.adminPassword = "your-secure-password";
```

### 3. Firebase数据库设置
在Firebase控制台中设置数据库规则：

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**注意**: 生产环境建议设置更严格的访问规则。

## 使用方法

1. 打开 `index.html` 进入签到页面
2. 选择小组和成员，或使用姓名检索功能
3. 点击签到按钮完成签到
4. 查看签到名单和日报表
5. 使用管理页面进行成员管理

## 页面说明

- **index.html**: 主签到页面
- **admin.html**: 管理页面（需要密码）
- **daily-report.html**: 日报表页面
- **summary.html**: 汇总报告页面

## 安全注意事项

⚠️ **重要安全提醒**:

1. **配置文件安全**:
   - `config.js` 包含敏感信息，已加入 `.gitignore`
   - 不要将 `config.js` 提交到版本控制系统
   - 使用 `config.example.js` 作为模板

2. **密码安全**:
   - 设置强密码作为管理员密码
   - 定期更换密码
   - 不要在公共场所使用管理功能

3. **数据安全**:
   - 定期备份Firebase数据
   - 建议在HTTPS环境下使用
   - 考虑设置Firebase数据库访问规则

4. **隐私保护**:
   - 成员信息包含个人数据，请遵守相关隐私法规
   - 建议在内部网络或受信任环境中使用

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Firebase Realtime Database
- **部署**: 静态文件，可部署到任何Web服务器

## 开发说明

### 项目结构
```
MSH/
├── index.html              # 主签到页面
├── admin.html              # 管理页面
├── daily-report.html       # 日报表页面
├── summary.html            # 汇总报告页面
├── config.example.js       # 配置文件模板
├── .gitignore             # Git忽略文件
├── src/
│   ├── main.js            # 主页面逻辑
│   ├── admin.js           # 管理页面逻辑
│   ├── daily-report.js    # 日报表逻辑
│   ├── summary.js         # 汇总报告逻辑
│   ├── firebase-init.js   # Firebase初始化模块
│   ├── service-worker.js  # 服务工作者
│   └── style.css          # 样式文件
└── README.md              # 说明文档
```

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。
