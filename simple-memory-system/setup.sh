#!/bin/bash

# 外部记忆系统初始化脚本
# 版本：v1.7
# 用途：自动初始化记忆系统

echo "🚀 初始化外部记忆系统 v1.7..."

# 获取用户输入
echo "📝 请输入项目名称："
read project_name
echo "🎯 请输入项目目标："
read project_goal

# 创建文件结构
echo "📁 创建文件结构..."
touch progress.md archive.md cloud.md memory.json memory.log.md

# 初始化Git仓库
echo "📝 初始化Git仓库..."
git init
git add .
git commit -m "初始化外部记忆系统 v1.7"

# 配置git-crypt加密
echo "🔒 配置git-crypt加密..."
if command -v git-crypt &> /dev/null; then
    git-crypt init
    echo "请添加GPG用户（可选，直接回车跳过）："
    read gpg_user
    if [ ! -z "$gpg_user" ]; then
        git-crypt add-gpg-user $gpg_user
        echo "✅ git-crypt配置完成"
    else
        echo "⚠️ 跳过git-crypt配置，建议后续手动配置"
    fi
else
    echo "⚠️ git-crypt未安装，建议安装后手动配置："
    echo "   brew install git-crypt"
    echo "   git-crypt init"
fi

# 设置文件权限
echo "🔧 设置文件权限..."
chmod +x setup.sh

# 创建基础内容
echo "📝 创建基础内容..."
cat > progress.md << EOF
# 项目进度记录

> 最后更新：$(date +"%Y-%m-%d")
> 项目：$project_name

## 🎯 当前状态

**项目目标**：$project_goal

## 📋 待办事项

- [TODO] [HIGH] 完成核心功能开发
- [TODO] [MEDIUM] 编写使用文档
- [TODO] [LOW] 性能优化

## ✅ 已完成

- [DONE] 项目架构设计
- [DONE] 基础功能实现

## 🎯 重要决策

- [DECISION] [HIGH] 选择技术栈
- [DECISION] [MEDIUM] 确定项目架构

## ⚠️ 风险与约束

- [RISK] [HIGH] 技术风险
- [CONSTRAINT] [HIGH] 时间约束

## 📚 学到的知识

- [LEARNED] 技术选型经验
- [LEARNED] 项目管理经验

## 💡 新想法

- [IDEA] 功能优化想法
- [IDEA] 技术改进想法

## 💻 代码片段

- [CODE] [HIGH] 核心算法实现
- [CODE] [MEDIUM] 工具函数封装

## 🔍 快速搜索

**关键词**：TODO, DONE, DECISION, RISK, CONSTRAINT, LEARNED, IDEA, CODE
**优先级**：HIGH, MEDIUM, LOW

## 📊 用户偏好学习

### 短期偏好（最近10次）
- **标记类型**：[TODO: 60%, DECISION: 25%, RISK: 15%]
- **优先级习惯**：[HIGH: 30%, MEDIUM: 50%, LOW: 20%]
- **触发关键词**：["决定", "风险", "TODO", "完成"]
- **使用模式**：工作日集中，周末分散

### 长期偏好（整体统计）
- **标记类型**：[TODO: 50%, DECISION: 20%, RISK: 15%, CODE: 15%]
- **优先级习惯**：[HIGH: 25%, MEDIUM: 60%, LOW: 15%]
- **触发关键词**：["决定", "风险", "TODO", "完成", "代码"]
- **归档频率**：每周一次
- **工作模式**：上午决策，下午编码，晚上总结

### 智能建议
- **标记推荐**：基于历史使用频率推荐标记类型
- **优先级建议**：根据内容重要性自动建议优先级
- **触发优化**：学习用户常用关键词，提高触发准确性
- **归档提醒**：根据用户习惯智能提醒归档时机

## 📢 通知历史（最近50条）

- [$(date +"%Y-%m-%d")] 系统初始化完成
EOF

cat > archive.md << EOF
# 历史归档文件

> 归档日期：$(date +"%Y-%m-%d")

## 📚 已归档内容

### 已完成事项
- [DONE] 项目初始化

### 已归档决策
- [DECISION] 选择外部记忆系统方案

### 已解决风险
- [RISK] 系统复杂度 → 通过简化设计解决

## 📊 归档统计

- **总归档条目**：3
- **归档日期**：$(date +"%Y-%m-%d")
- **归档原因**：系统初始化
- **归档总结**：已归档3个DONE：项目初始化等

## 📈 压缩总结

### 日总结（$(date +"%Y-%m-%d")）
- **完成项目**：3个DONE，包括项目初始化
- **重要决策**：1个DECISION，选择外部记忆系统方案
- **解决风险**：1个RISK，系统复杂度通过简化设计解决
EOF

# 创建.gitignore文件
echo "📝 创建.gitignore文件..."
cat > .gitignore << EOF
# 敏感文件
*.key
*.pem
*.p12
*.pfx
.env
.env.local
.env.production

# 临时文件
*.tmp
*.temp
*.log

# 系统文件
.DS_Store
Thumbs.db
EOF

# 安全提醒
echo "🔒 安全提醒："
echo "   - 已配置git-crypt加密（如果可用）"
echo "   - 已创建.gitignore忽略敏感文件"
echo "   - 避免在文件中记录敏感信息"
echo "   - 定期备份重要数据"

# 每日提醒设置
echo "⏰ 每日提醒设置："
echo "   建议添加cron任务检查高优先级TODO："
echo "   crontab -e"
echo "   添加：0 9 * * * cd $(pwd) && echo '检查高优先级TODO'"

echo "✅ 初始化完成！"
echo "📋 下一步："
echo "1. 配置 Cursor Agent"
echo "2. 编辑 progress.md 设置项目信息"
echo "3. 开始使用记忆系统"
echo "4. 使用 /sfeedback 提供反馈"
echo "5. 使用 /saudit 检查安全状态"
echo "6. 使用 /smonitor 查看系统状态"
echo "7. 体验自动标记建议功能"
echo "8. 使用 /force记 记录紧急信息"
