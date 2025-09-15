#!/bin/bash

# MSH签到系统 - 文档保护脚本
# 功能：自动保护重要文档，防止误删
# 作者：MSH系统管理员
# 版本：1.0

echo "🛡️  MSH签到系统文档保护脚本启动..."

# 定义受保护的文件列表
PROTECTED_FILES=(
    "docs/requirements/SYSTEM_REQUIREMENTS.md"
    "docs/reports/OPTIMIZATION_REPORT.md"
    "docs/reports/CHANGELOG.md"
    "docs/requirements/API_DOCUMENTATION.md"
    "DEPLOYMENT.md"
    "MAINTENANCE.md"
    "docs/troubleshooting/TROUBLESHOOTING.md"
    "docs/PROTECTED_FILES.md"
    "docs/guides/DOCUMENTATION_GUIDE.md"
    "docs/commands/CLEANUP_CHECKLIST.md"
    "docs/commands/CLEANUP_COMMANDS.md"
    "docs/guides/CODE_OPTIMIZATION_GUIDE.md"
    "docs/guides/FILE_ORGANIZATION_GUIDE.md"
    "docs/guides/AUTO_DOCUMENT_UPDATE.md"
    "docs/commands/SAFE_OPERATION_COMMANDS.md"
    "docs/README.md"
    "backup/"
    "config.js"
    "manifest.json"
    "protect_documents.sh"
)

# 定义受保护的目录
PROTECTED_DIRS=(
    "backup"
    "docs"
    "config"
)

# 检查文件是否存在
check_protected_files() {
    echo "📋 检查受保护文件..."
    
    for file in "${PROTECTED_FILES[@]}"; do
        if [ -e "$file" ]; then
            echo "✅ $file 存在"
        else
            echo "⚠️  $file 不存在"
        fi
    done
}

# 检查目录是否存在
check_protected_dirs() {
    echo "📁 检查受保护目录..."
    
    for dir in "${PROTECTED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo "✅ $dir 目录存在"
        else
            echo "⚠️  $dir 目录不存在"
        fi
    done
}

# 创建备份目录结构
create_backup_structure() {
    echo "📁 创建备份目录结构..."
    
    mkdir -p backup/{config,weekly,monthly,docs}
    mkdir -p docs/{api,user,technical}
    
    echo "✅ 备份目录结构创建完成"
}

# 备份重要文档
backup_important_docs() {
    echo "💾 备份重要文档..."
    
    local backup_dir="backup/docs/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    for file in "${PROTECTED_FILES[@]}"; do
        if [ -e "$file" ] && [ "$file" != "backup/" ]; then
            if [ -d "$file" ]; then
                cp -r "$file" "$backup_dir/"
            else
                cp "$file" "$backup_dir/"
            fi
            echo "✅ 已备份 $file"
        fi
    done
    
    echo "✅ 文档备份完成：$backup_dir"
}

# 更新.gitignore文件
update_gitignore() {
    echo "📝 更新.gitignore文件..."
    
    if [ ! -f ".gitignore" ]; then
        echo "⚠️  .gitignore文件不存在，创建新文件..."
    fi
    
    # 确保.gitignore包含保护规则
    if ! grep -q "PROTECTED_FILES.md" .gitignore 2>/dev/null; then
        echo "" >> .gitignore
        echo "# 受保护的重要文档" >> .gitignore
        echo "!SYSTEM_REQUIREMENTS.md" >> .gitignore
        echo "!OPTIMIZATION_REPORT.md" >> .gitignore
        echo "!CHANGELOG.md" >> .gitignore
        echo "!API_DOCUMENTATION.md" >> .gitignore
        echo "!DEPLOYMENT.md" >> .gitignore
        echo "!MAINTENANCE.md" >> .gitignore
        echo "!TROUBLESHOOTING.md" >> .gitignore
        echo "!PROTECTED_FILES.md" >> .gitignore
        echo "!DOCUMENTATION_GUIDE.md" >> .gitignore
        echo "!backup/" >> .gitignore
        echo "!backup/**/*" >> .gitignore
        echo "✅ .gitignore文件已更新"
    else
        echo "✅ .gitignore文件已包含保护规则"
    fi
}

# 验证保护机制
verify_protection() {
    echo "🔍 验证保护机制..."
    
    # 检查.gitignore文件
    if [ -f ".gitignore" ]; then
        echo "✅ .gitignore文件存在"
    else
        echo "❌ .gitignore文件不存在"
        return 1
    fi
    
    # 检查保护文件
    local missing_files=0
    for file in "${PROTECTED_FILES[@]}"; do
        if [ ! -e "$file" ]; then
            echo "❌ 受保护文件缺失：$file"
            missing_files=$((missing_files + 1))
        fi
    done
    
    if [ $missing_files -eq 0 ]; then
        echo "✅ 所有受保护文件都存在"
    else
        echo "⚠️  有 $missing_files 个受保护文件缺失"
    fi
    
    # 检查备份目录
    if [ -d "backup" ]; then
        echo "✅ 备份目录存在"
    else
        echo "❌ 备份目录不存在"
        return 1
    fi
}

# 显示保护状态
show_protection_status() {
    echo ""
    echo "🛡️  文档保护状态报告"
    echo "================================"
    echo "📅 检查时间：$(date)"
    echo "📁 项目目录：$(pwd)"
    echo ""
    
    echo "📋 受保护文件："
    for file in "${PROTECTED_FILES[@]}"; do
        if [ -e "$file" ]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (缺失)"
        fi
    done
    
    echo ""
    echo "📁 受保护目录："
    for dir in "${PROTECTED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo "  ✅ $dir/"
        else
            echo "  ❌ $dir/ (缺失)"
        fi
    done
    
    echo ""
    echo "💾 备份状态："
    if [ -d "backup" ]; then
        local backup_count=$(find backup -type f | wc -l)
        echo "  ✅ 备份目录存在，包含 $backup_count 个文件"
    else
        echo "  ❌ 备份目录不存在"
    fi
    
    echo ""
    echo "📝 保护机制："
    if [ -f ".gitignore" ]; then
        echo "  ✅ .gitignore文件存在"
    else
        echo "  ❌ .gitignore文件不存在"
    fi
    
    if [ -f "PROTECTED_FILES.md" ]; then
        echo "  ✅ 保护文件清单存在"
    else
        echo "  ❌ 保护文件清单不存在"
    fi
}

# 主函数
main() {
    echo "🚀 开始执行文档保护操作..."
    echo ""
    
    # 检查当前目录
    if [ ! -f "index.html" ]; then
        echo "❌ 错误：当前目录不是MSH项目根目录"
        echo "请确保在包含index.html的目录中运行此脚本"
        exit 1
    fi
    
    # 执行保护操作
    check_protected_files
    echo ""
    
    check_protected_dirs
    echo ""
    
    create_backup_structure
    echo ""
    
    backup_important_docs
    echo ""
    
    update_gitignore
    echo ""
    
    verify_protection
    echo ""
    
    show_protection_status
    
    echo ""
    echo "🎉 文档保护操作完成！"
    echo ""
    echo "📋 后续操作建议："
    echo "1. 定期运行此脚本检查保护状态"
    echo "2. 在清理文件前先查看PROTECTED_FILES.md"
    echo "3. 重要文档变更后及时备份"
    echo "4. 定期检查.gitignore文件的有效性"
}

# 运行主函数
main "$@"
