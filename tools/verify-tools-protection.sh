#!/bin/bash

# MSH签到系统 - 工具保护验证脚本
# 功能：验证所有工具文件是否受到保护，防止清理程序误删
# 作者：MSH系统管理员
# 版本：1.0

echo "🔧 MSH签到系统工具保护验证脚本启动..."
echo "=================================="

# 定义工具目录结构
TOOL_DIRS=(
    "tools/msh-system"
    "tools/cloud-forms"
    "tools/cross-system"
)

# 定义MSH系统工具
MSH_TOOLS=(
    "data-consistency-validator.html"
    "uuid_editor.html"
    "diagnose-sunday-tracking.html"
    "emergency-data-check.html"
    "emergency-data-recovery.html"
    "event-generation-test.html"
    "trigger-event-generation.html"
    "data-conflict-manager.html"
    "group-key-standardizer.html"
    "member-distribution-checker.html"
    "member-extractor.html"
    "msh-data-sync-helper.js"
)

# 定义云表单工具
CLOUD_TOOLS=(
    "external-form-admin.html"
    "external-form-public.html"
    "功能检查报告.md"
)

# 定义工具索引和指南
TOOL_GUIDES=(
    "index.html"
    "TOOLS_GUIDE.md"
    "IMPORT-GUIDE.md"
    "protect_documents.sh"
)

# 检查工具目录结构
check_tool_directories() {
    echo "📁 检查工具目录结构..."
    
    local all_good=true
    
    for dir in "${TOOL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo "✅ $dir 目录存在"
        else
            echo "❌ $dir 目录缺失"
            all_good=false
        fi
    done
    
    if [ "$all_good" = true ]; then
        echo "✅ 所有工具目录结构完整"
    else
        echo "❌ 工具目录结构不完整"
        return 1
    fi
}

# 检查MSH系统工具
check_msh_tools() {
    echo ""
    echo "🔧 检查MSH系统工具..."
    
    local all_good=true
    
    for tool in "${MSH_TOOLS[@]}"; do
        if [ -f "tools/msh-system/$tool" ]; then
            echo "✅ $tool 存在"
        else
            echo "❌ $tool 缺失"
            all_good=false
        fi
    done
    
    # 检查MSH系统索引页面
    if [ -f "tools/msh-system/index.html" ]; then
        echo "✅ msh-system/index.html 存在"
    else
        echo "❌ msh-system/index.html 缺失"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        echo "✅ 所有MSH系统工具完整"
    else
        echo "❌ MSH系统工具有缺失"
        return 1
    fi
}

# 检查云表单工具
check_cloud_tools() {
    echo ""
    echo "☁️ 检查云表单工具..."
    
    local all_good=true
    
    for tool in "${CLOUD_TOOLS[@]}"; do
        if [ -f "tools/cloud-forms/$tool" ]; then
            echo "✅ $tool 存在"
        else
            echo "❌ $tool 缺失"
            all_good=false
        fi
    done
    
    # 检查云表单索引页面
    if [ -f "tools/cloud-forms/index.html" ]; then
        echo "✅ cloud-forms/index.html 存在"
    else
        echo "❌ cloud-forms/index.html 缺失"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        echo "✅ 所有云表单工具完整"
    else
        echo "❌ 云表单工具有缺失"
        return 1
    fi
}

# 检查跨系统工具目录
check_cross_system_tools() {
    echo ""
    echo "🔄 检查跨系统工具..."
    
    if [ -d "tools/cross-system" ]; then
        echo "✅ cross-system 目录存在"
        if [ -f "tools/cross-system/index.html" ]; then
            echo "✅ cross-system/index.html 存在"
        else
            echo "❌ cross-system/index.html 缺失"
            return 1
        fi
    else
        echo "❌ cross-system 目录缺失"
        return 1
    fi
    
    echo "✅ 跨系统工具目录完整（预留扩展）"
}

# 检查工具索引和指南
check_tool_guides() {
    echo ""
    echo "📚 检查工具索引和指南..."
    
    local all_good=true
    
    for guide in "${TOOL_GUIDES[@]}"; do
        if [ -f "tools/$guide" ]; then
            echo "✅ $guide 存在"
        else
            echo "❌ $guide 缺失"
            all_good=false
        fi
    done
    
    # 检查工具总览页面
    if [ -f "tools/index.html" ]; then
        echo "✅ tools/index.html 存在"
    else
        echo "❌ tools/index.html 缺失"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        echo "✅ 所有工具索引和指南完整"
    else
        echo "❌ 工具索引和指南有缺失"
        return 1
    fi
}

# 检查保护文件清单
check_protection_files() {
    echo ""
    echo "🛡️ 检查保护文件清单..."
    
    local all_good=true
    
    # 检查PROTECTED_FILES.md
    if [ -f "docs/PROTECTED_FILES.md" ]; then
        echo "✅ PROTECTED_FILES.md 存在"
        
        # 检查是否包含工具保护规则
        if grep -q "tools/" "docs/PROTECTED_FILES.md"; then
            echo "✅ 工具保护规则已包含在PROTECTED_FILES.md中"
        else
            echo "❌ 工具保护规则未包含在PROTECTED_FILES.md中"
            all_good=false
        fi
    else
        echo "❌ PROTECTED_FILES.md 缺失"
        all_good=false
    fi
    
    # 检查CLEANUP_CHECKLIST.md
    if [ -f "docs/commands/CLEANUP_CHECKLIST.md" ]; then
        echo "✅ CLEANUP_CHECKLIST.md 存在"
        
        # 检查是否包含工具保护规则
        if grep -q "tools/" "docs/commands/CLEANUP_CHECKLIST.md"; then
            echo "✅ 工具保护规则已包含在CLEANUP_CHECKLIST.md中"
        else
            echo "❌ 工具保护规则未包含在CLEANUP_CHECKLIST.md中"
            all_good=false
        fi
    else
        echo "❌ CLEANUP_CHECKLIST.md 缺失"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        echo "✅ 保护文件清单完整"
    else
        echo "❌ 保护文件清单有缺失"
        return 1
    fi
}

# 统计工具数量
count_tools() {
    echo ""
    echo "📊 工具统计..."
    
    local msh_count=0
    local cloud_count=0
    local total_count=0
    
    # 统计MSH系统工具
    for tool in "${MSH_TOOLS[@]}"; do
        if [ -f "tools/msh-system/$tool" ]; then
            msh_count=$((msh_count + 1))
        fi
    done
    
    # 统计云表单工具
    for tool in "${CLOUD_TOOLS[@]}"; do
        if [ -f "tools/cloud-forms/$tool" ]; then
            cloud_count=$((cloud_count + 1))
        fi
    done
    
    # 统计工具索引和指南
    local guide_count=0
    for guide in "${TOOL_GUIDES[@]}"; do
        if [ -f "tools/$guide" ]; then
            guide_count=$((guide_count + 1))
        fi
    done
    
    total_count=$((msh_count + cloud_count + guide_count))
    
    echo "🔧 MSH系统工具: $msh_count 个"
    echo "☁️ 云表单工具: $cloud_count 个"
    echo "📚 工具指南: $guide_count 个"
    echo "📊 总计: $total_count 个工具文件"
}

# 主函数
main() {
    local overall_status=0
    
    check_tool_directories || overall_status=1
    check_msh_tools || overall_status=1
    check_cloud_tools || overall_status=1
    check_cross_system_tools || overall_status=1
    check_tool_guides || overall_status=1
    check_protection_files || overall_status=1
    count_tools
    
    echo ""
    echo "=================================="
    if [ $overall_status -eq 0 ]; then
        echo "🎉 工具保护验证完成 - 所有工具文件都受到保护！"
        echo "✅ 清理程序不会误删工具文件"
    else
        echo "⚠️ 工具保护验证发现问题，请检查上述缺失的文件"
        echo "❌ 建议在清理前先修复这些问题"
    fi
    
    echo ""
    echo "📋 后续操作建议："
    echo "1. 在清理文件前运行此脚本验证工具保护状态"
    echo "2. 确保所有工具文件都在PROTECTED_FILES.md中"
    echo "3. 清理前运行 ./tools/protect_documents.sh 检查系统状态"
    echo "4. 如有工具文件缺失，请及时恢复"
    
    exit $overall_status
}

# 运行主函数
main


