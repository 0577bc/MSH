#!/bin/bash

# 外部大脑设置验证脚本
# 用于确认外部大脑是否已正确配置并启用

echo "🧠 外部大脑设置验证脚本"
echo "================================"

# 检查配置文件
echo "📋 检查配置文件..."

if [ -f "/Users/benchen/MSH/.cursorrules" ]; then
    echo "✅ .cursorrules 文件存在"
else
    echo "❌ .cursorrules 文件不存在"
fi

if [ -f "/Users/benchen/MSH/simple-memory-system/memory-config.json" ]; then
    echo "✅ memory-config.json 配置文件存在"
    
    # 检查配置内容
    auto_enable=$(grep -o '"auto_enable": true' /Users/benchen/MSH/simple-memory-system/memory-config.json)
    if [ -n "$auto_enable" ]; then
        echo "✅ 自动启用配置正确"
    else
        echo "❌ 自动启用配置错误"
    fi
else
    echo "❌ memory-config.json 配置文件不存在"
fi

# 检查核心文件
echo ""
echo "📁 检查核心文件..."

files=(
    "progress.md"
    "cloud.md" 
    "memory.json"
    "archive.md"
    "memory-agent.md"
    "README.md"
)

for file in "${files[@]}"; do
    if [ -f "/Users/benchen/MSH/simple-memory-system/$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
    fi
done

# 检查权限
echo ""
echo "🔐 检查权限..."

if [ -r "/Users/benchen/MSH/simple-memory-system/progress.md" ]; then
    echo "✅ progress.md 可读"
else
    echo "❌ progress.md 不可读"
fi

if [ -w "/Users/benchen/MSH/simple-memory-system/progress.md" ]; then
    echo "✅ progress.md 可写"
else
    echo "❌ progress.md 不可写"
fi

# 检查Git状态
echo ""
echo "📦 检查Git状态..."

cd /Users/benchen/MSH
if git status &> /dev/null; then
    echo "✅ Git仓库正常"
    
    # 检查是否有未提交的更改
    if git diff --quiet; then
        echo "✅ 工作目录干净"
    else
        echo "⚠️  有未提交的更改"
        echo "   建议运行: git add . && git commit -m '启用外部大脑配置'"
    fi
else
    echo "❌ Git仓库异常"
fi

# 检查触发规则
echo ""
echo "🎯 检查触发规则..."

if grep -q "auto_enable.*true" /Users/benchen/MSH/simple-memory-system/memory-config.json; then
    echo "✅ 自动启用规则已配置"
else
    echo "❌ 自动启用规则未配置"
fi

# 显示当前配置
echo ""
echo "⚙️  当前配置状态:"
echo "================================"

if [ -f "/Users/benchen/MSH/simple-memory-system/memory-config.json" ]; then
    echo "📊 配置详情:"
    cat /Users/benchen/MSH/simple-memory-system/memory-config.json | grep -E '"(auto_enable|auto_archive|auto_notify|auto_commit|auto_suggest|force_memory|global_search|forget_right)"'
fi

echo ""
echo "🎉 验证完成！"
echo ""
echo "📝 如何确认外部大脑已启用:"
echo "1. 在对话中使用关键词触发自动记录"
echo "2. 使用 /sstatus 命令查看系统状态"
echo "3. 使用 /smonitor 命令查看系统监控"
echo "4. 观察是否有自动建议和智能提示"
echo ""
echo "🔧 如果发现问题，请检查:"
echo "1. Cursor是否已重启并加载新配置"
echo "2. 文件权限是否正确"
echo "3. Git状态是否正常"
