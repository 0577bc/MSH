#!/bin/bash
# Git Hooks 安装脚本
# 创建日期：2025-10-08
# 用途：安装pre-commit和pre-push钩子

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$SCRIPT_DIR/../.git"
HOOKS_DIR="$GIT_DIR/hooks"

echo "🔧 安装 Git Hooks..."
echo ""

# 检查是否在Git仓库中
if [ ! -d "$GIT_DIR" ]; then
    echo "❌ 错误：不在Git仓库中"
    exit 1
fi

# 创建hooks目录
mkdir -p "$HOOKS_DIR"

# 安装pre-commit hook
echo "📝 安装 pre-commit hook..."
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit Hook - 时间验证
# 自动安装日期：2025-10-08

echo "🕐 执行pre-commit检查：时间验证..."
echo ""

# 运行时间验证脚本
if [ -f "./scripts/time-validator.sh" ]; then
    ./scripts/time-validator.sh
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ 时间验证失败！"
        echo "请修正时间错误后重新提交"
        echo ""
        echo "提示："
        echo "1. 运行 'date +%Y-%m-%d' 获取当前日期"
        echo "2. 修正文档中的错误日期"
        echo "3. 重新提交"
        echo ""
        exit 1
    fi
else
    echo "⚠️  警告：time-validator.sh 未找到，跳过时间验证"
fi

echo ""
echo "✅ pre-commit检查通过"
echo ""
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ pre-commit hook 已安装"
echo ""

# 安装pre-push hook
echo "📝 安装 pre-push hook..."
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push Hook - 全面验证
# 自动安装日期：2025-10-08

echo "🕐 执行pre-push检查：全面验证..."
echo ""

# 运行Node.js高级验证器（如果可用）
if command -v node &> /dev/null && [ -f "./scripts/auto-time-validator.js" ]; then
    echo "使用Node.js高级验证器..."
    node ./scripts/auto-time-validator.js
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ 验证失败！"
        echo "请修正所有错误后重新推送"
        echo ""
        exit 1
    fi
elif [ -f "./scripts/time-validator.sh" ]; then
    echo "使用Bash验证脚本..."
    ./scripts/time-validator.sh
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ 验证失败！"
        echo "请修正所有错误后重新推送"
        echo ""
        exit 1
    fi
else
    echo "⚠️  警告：验证脚本未找到，跳过验证"
fi

echo ""
echo "✅ pre-push检查通过"
echo ""
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ pre-push hook 已安装"
echo ""

# 创建卸载脚本
echo "📝 创建卸载脚本..."
cat > "$SCRIPT_DIR/uninstall-git-hooks.sh" << 'EOF'
#!/bin/bash
# Git Hooks 卸载脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$SCRIPT_DIR/../.git"
HOOKS_DIR="$GIT_DIR/hooks"

echo "🗑️  卸载 Git Hooks..."
echo ""

if [ -f "$HOOKS_DIR/pre-commit" ]; then
    rm "$HOOKS_DIR/pre-commit"
    echo "✅ pre-commit hook 已卸载"
fi

if [ -f "$HOOKS_DIR/pre-push" ]; then
    rm "$HOOKS_DIR/pre-push"
    echo "✅ pre-push hook 已卸载"
fi

echo ""
echo "✅ Git Hooks 卸载完成"
EOF

chmod +x "$SCRIPT_DIR/uninstall-git-hooks.sh"
echo "✅ 卸载脚本已创建"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git Hooks 安装完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "已安装的Hooks:"
echo "  • pre-commit  - 提交前时间验证"
echo "  • pre-push    - 推送前全面验证"
echo ""
echo "测试Hooks:"
echo "  git commit --allow-empty -m \"test hooks\""
echo ""
echo "卸载Hooks:"
echo "  ./scripts/uninstall-git-hooks.sh"
echo ""


