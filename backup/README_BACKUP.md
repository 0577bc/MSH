# MSH 程序备份说明

## 备份时间
备份创建时间：$(date)

## 备份内容

### 1. 源代码文件
- `src/` - 所有源代码文件
- `*.html` - 所有HTML页面文件
- `config.js` - 配置文件
- `manifest.json` - PWA配置文件
- `favicon.ico` - 网站图标
- `README.md` - 项目文档

### 2. 数据备份
- 使用 `backup_data.html` 工具备份浏览器中的数据
- 包括 localStorage 和 sessionStorage 中的所有MSH相关数据

## 备份使用方法

### 恢复代码文件
1. 将备份目录中的所有文件复制回项目根目录
2. 确保文件权限正确

### 恢复数据
1. 打开 `backup_data.html` 文件
2. 使用数据恢复功能（需要手动实现恢复逻辑）

## 备份文件结构
```
backup/
├── src/                    # 源代码目录
├── admin.html             # 管理员页面
├── index.html             # 主页面
├── summary.html           # 汇总页面
├── daily-report.html      # 日报表页面
├── config.js              # 配置文件
├── manifest.json          # PWA配置
├── favicon.ico            # 网站图标
├── README.md              # 项目文档
└── README_BACKUP.md       # 本备份说明文件
```

## 重要说明
- 此备份包含程序的所有源代码
- 数据备份需要单独使用 `backup_data.html` 工具
- 备份文件与当前开发版本完全独立
- 后续的程序修改不会影响此备份文件

## 数据备份工具使用说明
1. 在浏览器中打开 `backup_data.html`
2. 点击"备份本地存储数据"按钮
3. 点击"下载备份文件"按钮保存数据
4. 重复上述步骤备份SessionStorage数据
5. 或直接使用"导出所有数据"功能一次性备份所有数据
