#!/bin/bash

echo "🧹 开始清理Git历史记录..."

# 备份当前分支
echo "📦 创建备份分支..."
git branch backup-before-cleanup

# 使用git rebase -i 来合并重复提交
echo "🔄 开始交互式rebase..."
echo "请手动编辑rebase文件，将重复的提交标记为 'squash' 或 's'"
echo "重复提交包括："
echo "- 修复事件终止功能失效问题 (多个)"
echo "- 修复数据不一致问题 (多个)"
echo "- 文件整理和系统优化 (多个)"

# 启动交互式rebase
git rebase -i HEAD~20

echo "✅ Git历史清理完成！"
echo "📋 查看清理后的历史："
git log --oneline | head -10

echo "⚠️  如果需要恢复，可以使用：git reset --hard backup-before-cleanup"
