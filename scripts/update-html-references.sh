#!/bin/bash
# 更新HTML文件的JS/CSS引用脚本
# 用于模块化拆分后的引用更新

echo "开始更新HTML文件引用..."

# 定义需要更新的HTML文件
HTML_FILES=(
  "admin.html"
  "attendance-records.html"
  "daily-report.html"
  "group-management.html"
  "index.html"
  "personal-page.html"
  "summary.html"
  "sunday-tracking.html"
  "test-optimization.html"
  "tracking-event-detail.html"
)

# 备份所有HTML文件
echo "正在备份HTML文件..."
for file in "${HTML_FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "${file}.pre-split-backup"
    echo "✅ 备份 $file"
  fi
done

# 更新每个HTML文件
for file in "${HTML_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  跳过不存在的文件: $file"
    continue
  fi
  
  echo "更新 $file..."
  
  # 1. 更新style.css引用为多个模块
  if grep -q '<link rel="stylesheet" href="src/style.css">' "$file"; then
    sed -i.tmp 's|<link rel="stylesheet" href="src/style.css">|<!-- 样式模块 -->\n    <link rel="stylesheet" href="src/styles/base.css">\n    <link rel="stylesheet" href="src/styles/components.css">\n    <link rel="stylesheet" href="src/styles/utils.css">|' "$file"
    echo "  ✅ 更新 style.css 引用"
  fi
  
  # 2. 更新utils.js引用为多个模块
  if grep -q '<script src="src/utils.js"></script>' "$file"; then
    sed -i.tmp 's|<script src="src/utils.js"></script>|<!-- 工具函数模块 -->\n    <script src="src/core/firebase-utils.js"></script>\n    <script src="src/core/time-utils.js"></script>\n    <script src="src/core/security-utils.js"></script>\n    <script src="src/data/uuid-manager.js"></script>\n    <script src="src/features/sunday-tracking-utils.js"></script>\n    <script src="src/data/sync-managers.js"></script>|' "$file"
    echo "  ✅ 更新 utils.js 引用"
  fi
  
  # 3. 更新new-data-manager.js引用为多个模块
  if grep -q '<script src="src/new-data-manager.js"></script>' "$file"; then
    sed -i.tmp 's|<script src="src/new-data-manager.js"></script>|<!-- 数据管理器模块 -->\n    <script src="src/data-manager/index.js"></script>\n    <script src="src/data-manager/data-loader.js"></script>\n    <script src="src/data-manager/data-recovery.js"></script>\n    <script src="src/data-manager/data-sync.js"></script>\n    <script src="src/data-manager/data-operations.js"></script>|' "$file"
    echo "  ✅ 更新 new-data-manager.js 引用"
  fi
  
  # 4. 更新sunday-tracking.js引用为多个模块（仅针对sunday-tracking.html）
  if [ "$file" == "sunday-tracking.html" ] && grep -q '<script src="src/sunday-tracking.js"></script>' "$file"; then
    sed -i.tmp 's|<script src="src/sunday-tracking.js"></script>|<!-- 主日跟踪模块 -->\n    <script src="src/sunday-tracking/index.js"></script>\n    <script src="src/sunday-tracking/data-handler.js"></script>\n    <script src="src/sunday-tracking/event-manager.js"></script>\n    <script src="src/sunday-tracking/ui-components.js"></script>|' "$file"
    echo "  ✅ 更新 sunday-tracking.js 引用"
  fi
  
  # 清理临时文件
  rm -f "${file}.tmp"
done

echo ""
echo "=== 更新完成 ==="
echo "所有HTML文件已更新"
echo "备份文件：*.pre-split-backup"
echo ""
echo "如需回滚，运行："
echo "  for f in *.pre-split-backup; do mv \"\$f\" \"\${f%.pre-split-backup}\"; done"

