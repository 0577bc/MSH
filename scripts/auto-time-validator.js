#!/usr/bin/env node
/**
 * 高级时间验证器（Advanced Time Validator）
 * 创建日期：2025-10-08
 * 功能：自动检查文档时间一致性，生成详细报告
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色定义
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// 配置
const config = {
    rootDir: process.cwd(),
    excludeDirs: ['node_modules', '.git', 'backup'],
    criticalFiles: [
        'simple-memory-system/progress.md',
        'MANDATORY_RULES.md',
        'PRE_OPERATION_CHECKLIST.md',
        '.cursorrules'
    ],
    datePattern: /(\d{4})-(\d{2})-(\d{2})/g,
    timeKeywords: ['最后更新', '完成日期', '创建日期', '记录时间', '更新时间']
};

// 获取当前日期
function getCurrentDate() {
    const date = execSync('date +%Y-%m-%d').toString().trim();
    return date;
}

// 日志工具
const logger = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
    section: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}`)
};

// 扫描Markdown文件
function scanMarkdownFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!config.excludeDirs.includes(item)) {
                scanMarkdownFiles(fullPath, files);
            }
        } else if (item.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// 提取文件中的所有日期
function extractDates(content) {
    const dates = [];
    let match;
    
    while ((match = config.datePattern.exec(content)) !== null) {
        dates.push({
            date: match[0],
            year: parseInt(match[1]),
            month: parseInt(match[2]),
            day: parseInt(match[3]),
            index: match.index
        });
    }
    
    return dates;
}

// 检查未来日期
function checkFutureDates(files, currentDate) {
    logger.section('📅 检查未来日期');
    
    const errors = [];
    const currentDateObj = new Date(currentDate);
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const dates = extractDates(content);
        
        for (const dateInfo of dates) {
            const dateObj = new Date(dateInfo.date);
            
            if (dateObj > currentDateObj) {
                errors.push({
                    file: path.relative(config.rootDir, file),
                    date: dateInfo.date,
                    line: content.substring(0, dateInfo.index).split('\n').length
                });
                
                logger.error(`${path.relative(config.rootDir, file)}`);
                logger.error(`  行 ${content.substring(0, dateInfo.index).split('\n').length}: 包含未来日期 ${colors.red}${dateInfo.date}${colors.reset}`);
            }
        }
    }
    
    if (errors.length === 0) {
        logger.success('未发现未来日期');
    }
    
    return errors;
}

// 检查关键文件的最后更新时间
function checkLastUpdateTimes(currentDate) {
    logger.section('📝 检查关键文件最后更新时间');
    
    const warnings = [];
    
    for (const file of config.criticalFiles) {
        const fullPath = path.join(config.rootDir, file);
        
        if (!fs.existsSync(fullPath)) {
            continue;
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const stat = fs.statSync(fullPath);
        
        // 提取"最后更新"日期
        const updateMatch = content.match(/最后更新[：:]\s*(\d{4}-\d{2}-\d{2})/);
        
        if (updateMatch) {
            const updateDate = updateMatch[1];
            const fileModDate = stat.mtime.toISOString().split('T')[0];
            
            // 如果文件今天有修改，检查"最后更新"是否为今天
            if (fileModDate === currentDate && updateDate !== currentDate) {
                warnings.push({
                    file,
                    updateDate,
                    fileModDate
                });
                
                logger.warning(`${file}`);
                logger.warning(`  文档中的最后更新: ${updateDate}`);
                logger.warning(`  文件实际修改日期: ${colors.green}${fileModDate}${colors.reset}`);
            }
        }
    }
    
    if (warnings.length === 0) {
        logger.success('所有关键文件最后更新时间一致');
    }
    
    return warnings;
}

// 检查progress.md的当日记录
function checkProgressDailyRecord(currentDate) {
    logger.section('📊 检查progress.md当日记录');
    
    const progressFile = path.join(config.rootDir, 'simple-memory-system/progress.md');
    
    if (!fs.existsSync(progressFile)) {
        logger.warning('progress.md 文件不存在');
        return { found: false, count: 0 };
    }
    
    const content = fs.readFileSync(progressFile, 'utf8');
    const lines = content.split('\n');
    
    let todayCount = 0;
    const todayLines = [];
    
    lines.forEach((line, index) => {
        if (line.includes(currentDate)) {
            todayCount++;
            todayLines.push(index + 1);
        }
    });
    
    if (todayCount > 0) {
        logger.success(`找到 ${todayCount} 条今日记录（行号: ${todayLines.slice(0, 5).join(', ')}${todayLines.length > 5 ? '...' : ''}）`);
        return { found: true, count: todayCount, lines: todayLines };
    } else {
        logger.warning('未找到今日记录');
        return { found: false, count: 0 };
    }
}

// 检查日期格式错误
function checkDateFormat(files) {
    logger.section('🔧 检查日期格式错误');
    
    const errors = [];
    const wrongFormats = [
        { pattern: /\d{4}\/\d{2}\/\d{2}/g, name: '斜杠格式' },
        { pattern: /\d{4}\.\d{2}\.\d{2}/g, name: '点号格式' }
    ];
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const format of wrongFormats) {
            if (format.pattern.test(content)) {
                errors.push({
                    file: path.relative(config.rootDir, file),
                    format: format.name
                });
                
                logger.error(`${path.relative(config.rootDir, file)}`);
                logger.error(`  包含错误的${colors.red}${format.name}${colors.reset}`);
            }
        }
    }
    
    if (errors.length === 0) {
        logger.success('未发现日期格式错误');
    }
    
    return errors;
}

// 检查时间关键词使用
function checkTimeKeywordUsage(files, currentDate) {
    logger.section('🔍 检查时间关键词使用情况');
    
    const stats = {
        total: 0,
        byKeyword: {}
    };
    
    for (const keyword of config.timeKeywords) {
        stats.byKeyword[keyword] = 0;
    }
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const keyword of config.timeKeywords) {
            const regex = new RegExp(keyword, 'g');
            const matches = content.match(regex);
            
            if (matches) {
                stats.byKeyword[keyword] += matches.length;
                stats.total += matches.length;
            }
        }
    }
    
    logger.info(`共发现 ${stats.total} 处时间关键词使用`);
    
    for (const [keyword, count] of Object.entries(stats.byKeyword)) {
        if (count > 0) {
            logger.info(`  ${keyword}: ${count} 次`);
        }
    }
    
    return stats;
}

// 生成HTML报告
function generateHTMLReport(results, currentDate) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>时间验证报告 - ${currentDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; line-height: 1.6; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; }
        h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; padding-left: 10px; border-left: 4px solid #3498db; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.success { background: #d4edda; border: 1px solid #c3e6cb; }
        .summary-card.warning { background: #fff3cd; border: 1px solid #ffeeba; }
        .summary-card.error { background: #f8d7da; border: 1px solid #f5c6cb; }
        .summary-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
        .summary-card .number { font-size: 36px; font-weight: bold; }
        .summary-card.success .number { color: #28a745; }
        .summary-card.warning .number { color: #ffc107; }
        .summary-card.error .number { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; color: #495057; }
        tr:hover { background: #f8f9fa; }
        .error-item { color: #dc3545; }
        .warning-item { color: #ffc107; }
        .success-item { color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; text-align: center; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge.success { background: #28a745; color: white; }
        .badge.error { background: #dc3545; color: white; }
        .badge.warning { background: #ffc107; color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🕐 时间验证报告</h1>
        <p style="color: #666; margin-bottom: 20px;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        
        <div class="summary">
            <div class="summary-card ${results.errors.future.length === 0 ? 'success' : 'error'}">
                <h3>未来日期</h3>
                <div class="number">${results.errors.future.length}</div>
            </div>
            <div class="summary-card ${results.errors.format.length === 0 ? 'success' : 'error'}">
                <h3>格式错误</h3>
                <div class="number">${results.errors.format.length}</div>
            </div>
            <div class="summary-card ${results.warnings.update.length === 0 ? 'success' : 'warning'}">
                <h3>更新警告</h3>
                <div class="number">${results.warnings.update.length}</div>
            </div>
            <div class="summary-card ${results.progress.found ? 'success' : 'warning'}">
                <h3>当日记录</h3>
                <div class="number">${results.progress.count}</div>
            </div>
        </div>
        
        <h2>📋 检查详情</h2>
        
        ${results.errors.future.length > 0 ? `
        <h3 style="color: #dc3545;">❌ 未来日期错误</h3>
        <table>
            <tr><th>文件</th><th>日期</th><th>行号</th></tr>
            ${results.errors.future.map(e => `<tr><td>${e.file}</td><td class="error-item">${e.date}</td><td>${e.line}</td></tr>`).join('')}
        </table>
        ` : '<p class="success-item">✓ 未发现未来日期</p>'}
        
        ${results.errors.format.length > 0 ? `
        <h3 style="color: #dc3545;">❌ 格式错误</h3>
        <table>
            <tr><th>文件</th><th>格式类型</th></tr>
            ${results.errors.format.map(e => `<tr><td>${e.file}</td><td class="error-item">${e.format}</td></tr>`).join('')}
        </table>
        ` : '<p class="success-item">✓ 未发现格式错误</p>'}
        
        ${results.warnings.update.length > 0 ? `
        <h3 style="color: #ffc107;">⚠️ 最后更新警告</h3>
        <table>
            <tr><th>文件</th><th>文档日期</th><th>文件修改日期</th></tr>
            ${results.warnings.update.map(w => `<tr><td>${w.file}</td><td class="warning-item">${w.updateDate}</td><td>${w.fileModDate}</td></tr>`).join('')}
        </table>
        ` : '<p class="success-item">✓ 所有文件更新时间一致</p>'}
        
        <h2>📊 统计信息</h2>
        <p>检查文件总数: ${results.stats.totalFiles}</p>
        <p>时间关键词使用: ${results.stats.timeKeywords.total} 次</p>
        <p>当日记录数量: ${results.progress.count}</p>
        
        <div class="footer">
            <p>时间验证器 v2.0 - 由 MSH 系统开发团队维护</p>
            <p>验证时间: ${currentDate}</p>
        </div>
    </div>
</body>
</html>
`;
    
    const reportPath = path.join(config.rootDir, 'reports', `time-validation-${currentDate}.html`);
    const reportsDir = path.join(config.rootDir, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, html);
    
    return reportPath;
}

// 主函数
async function main() {
    console.clear();
    
    logger.title('🕐 高级时间验证器 (Advanced Time Validator v2.0)');
    logger.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const currentDate = getCurrentDate();
    logger.info(`当前系统时间: ${colors.green}${currentDate}${colors.reset}`);
    logger.info(`工作目录: ${config.rootDir}`);
    
    // 扫描文件
    logger.section('📁 扫描Markdown文件');
    const files = scanMarkdownFiles(config.rootDir);
    logger.success(`找到 ${files.length} 个Markdown文件`);
    
    // 执行检查
    const results = {
        errors: {
            future: [],
            format: []
        },
        warnings: {
            update: []
        },
        progress: {},
        stats: {
            totalFiles: files.length,
            timeKeywords: {}
        }
    };
    
    results.errors.future = checkFutureDates(files, currentDate);
    results.warnings.update = checkLastUpdateTimes(currentDate);
    results.progress = checkProgressDailyRecord(currentDate);
    results.errors.format = checkDateFormat(files);
    results.stats.timeKeywords = checkTimeKeywordUsage(files, currentDate);
    
    // 生成报告
    logger.section('📄 生成验证报告');
    const reportPath = generateHTMLReport(results, currentDate);
    logger.success(`HTML报告已生成: ${path.relative(config.rootDir, reportPath)}`);
    
    // 总结
    logger.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.title('📋 验证结果总结');
    logger.title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalErrors = results.errors.future.length + results.errors.format.length;
    const totalWarnings = results.warnings.update.length + (results.progress.found ? 0 : 1);
    
    if (totalErrors === 0 && totalWarnings === 0) {
        logger.success(`${colors.bold}所有检查通过！${colors.reset}`);
        logger.success('未发现任何错误或警告');
        console.log('');
        process.exit(0);
    } else {
        console.log('发现的问题:');
        if (totalErrors > 0) {
            logger.error(`错误: ${totalErrors} 个`);
        }
        if (totalWarnings > 0) {
            logger.warning(`警告: ${totalWarnings} 个`);
        }
        console.log('');
        
        if (totalErrors > 0) {
            logger.error(`${colors.bold}验证失败: 发现严重错误${colors.reset}`);
            logger.error('请修正上述错误后重新运行验证');
            console.log('');
            process.exit(1);
        } else {
            logger.warning(`${colors.bold}验证通过但有警告${colors.reset}`);
            logger.warning('建议修正上述警告以提高文档质量');
            console.log('');
            process.exit(0);
        }
    }
}

// 运行
main().catch(error => {
    logger.error(`执行失败: ${error.message}`);
    console.error(error);
    process.exit(1);
});


