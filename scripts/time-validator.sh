#!/bin/bash
# 时间验证脚本 - Time Validator
# 创建日期：2025-10-08
# 用途：自动检查所有文档中的时间一致性和准确性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取当前日期
CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)
CURRENT_DAY=$(date +%d)

echo -e "${BLUE}🔍 时间验证脚本 - Time Validator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "当前系统时间：${GREEN}${CURRENT_DATE}${NC}"
echo ""

# 错误计数
ERROR_COUNT=0
WARNING_COUNT=0

# 检查未来日期
echo -e "${YELLOW}📅 检查未来日期...${NC}"
echo ""

# 查找所有Markdown文件
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read file; do
    # 提取文件中的所有日期
    dates=$(grep -oE '202[0-9]-[0-9]{2}-[0-9]{2}' "$file" 2>/dev/null | sort -u)
    
    if [ -n "$dates" ]; then
        while IFS= read -r date; do
            # 检查是否是未来日期
            if [[ "$date" > "$CURRENT_DATE" ]]; then
                echo -e "${RED}❌ 错误：${file}${NC}"
                echo -e "   包含未来日期：${RED}${date}${NC}"
                echo -e "   当前日期：${GREEN}${CURRENT_DATE}${NC}"
                echo ""
                ERROR_COUNT=$((ERROR_COUNT + 1))
            fi
        done <<< "$dates"
    fi
done

# 检查关键文件的"最后更新"字段
echo -e "${YELLOW}📝 检查关键文件最后更新时间...${NC}"
echo ""

CRITICAL_FILES=(
    "simple-memory-system/progress.md"
    "MANDATORY_RULES.md"
    "PRE_OPERATION_CHECKLIST.md"
    ".cursorrules"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        # 检查文件是否今天有修改
        if [ "$(uname)" == "Darwin" ]; then
            # macOS
            file_mod_date=$(stat -f "%Sm" -t "%Y-%m-%d" "$file")
        else
            # Linux
            file_mod_date=$(stat -c %y "$file" | cut -d' ' -f1)
        fi
        
        # 提取文件中的"最后更新"日期
        update_date=$(grep -oE "最后更新[：:]\s*202[0-9]-[0-9]{2}-[0-9]{2}" "$file" | grep -oE "202[0-9]-[0-9]{2}-[0-9]{2}" | head -1)
        
        if [ -n "$update_date" ]; then
            if [[ "$update_date" != "$file_mod_date" ]]; then
                echo -e "${YELLOW}⚠️  警告：${file}${NC}"
                echo -e "   文档中的最后更新：${YELLOW}${update_date}${NC}"
                echo -e "   文件实际修改日期：${GREEN}${file_mod_date}${NC}"
                echo -e "   建议更新文档中的日期"
                echo ""
                WARNING_COUNT=$((WARNING_COUNT + 1))
            fi
        fi
    fi
done

# 检查progress.md的当日记录
echo -e "${YELLOW}📊 检查progress.md当日记录...${NC}"
echo ""

if [ -f "simple-memory-system/progress.md" ]; then
    # 检查是否有今天日期的记录
    today_records=$(grep -c "$CURRENT_DATE" "simple-memory-system/progress.md" || echo "0")
    
    if [ "$today_records" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  警告：progress.md${NC}"
        echo -e "   未找到今天（${GREEN}${CURRENT_DATE}${NC}）的记录"
        echo -e "   建议添加当日进度记录"
        echo ""
        WARNING_COUNT=$((WARNING_COUNT + 1))
    else
        echo -e "${GREEN}✓ progress.md 包含 ${today_records} 条今日记录${NC}"
        echo ""
    fi
fi

# 检查常见的时间格式错误
echo -e "${YELLOW}🔧 检查时间格式错误...${NC}"
echo ""

# 查找错误的日期格式（如：2025/10/08, 2025.10.08）
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read file; do
    # 检查斜杠格式
    if grep -qE '202[0-9]/[0-9]{2}/[0-9]{2}' "$file" 2>/dev/null; then
        echo -e "${RED}❌ 错误：${file}${NC}"
        echo -e "   包含错误的日期格式（使用斜杠）"
        echo -e "   应该使用：YYYY-MM-DD 格式"
        echo ""
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    # 检查点号格式
    if grep -qE '202[0-9]\.[0-9]{2}\.[0-9]{2}' "$file" 2>/dev/null; then
        echo -e "${RED}❌ 错误：${file}${NC}"
        echo -e "   包含错误的日期格式（使用点号）"
        echo -e "   应该使用：YYYY-MM-DD 格式"
        echo ""
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done

# 总结
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 验证结果总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！${NC}"
    echo -e "   没有发现时间错误或警告"
    echo ""
    exit 0
else
    echo -e "发现的问题："
    if [ $ERROR_COUNT -gt 0 ]; then
        echo -e "  ${RED}❌ 错误：${ERROR_COUNT} 个${NC}"
    fi
    if [ $WARNING_COUNT -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  警告：${WARNING_COUNT} 个${NC}"
    fi
    echo ""
    
    if [ $ERROR_COUNT -gt 0 ]; then
        echo -e "${RED}❌ 验证失败：发现严重时间错误${NC}"
        echo -e "请修正上述错误后重新运行验证"
        echo ""
        exit 1
    else
        echo -e "${YELLOW}⚠️  验证通过但有警告${NC}"
        echo -e "建议修正上述警告以提高文档质量"
        echo ""
        exit 0
    fi
fi


