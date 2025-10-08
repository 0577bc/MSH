#!/usr/bin/env node

/**
 * 智能文档更新脚本
 * 基于外部大脑系统自动更新MASTER_FIX_LOG.md
 */

const fs = require('fs');
const path = require('path');

class FixLogUpdater {
    constructor() {
        this.fixLogPath = path.join(__dirname, '../MASTER_FIX_LOG.md');
        this.progressPath = path.join(__dirname, '../../simple-memory-system/progress.md');
        this.archivePath = path.join(__dirname, '../../simple-memory-system/archive.md');
    }

    /**
     * 从外部大脑系统读取修复记录
     */
    async readFixRecords() {
        try {
            const progressContent = fs.readFileSync(this.progressPath, 'utf8');
            const archiveContent = fs.readFileSync(this.archivePath, 'utf8');
            
            // 解析修复记录
            const fixRecords = this.parseFixRecords(progressContent, archiveContent);
            return fixRecords;
        } catch (error) {
            console.error('读取外部大脑记录失败:', error);
            return [];
        }
    }

    /**
     * 解析修复记录
     */
    parseFixRecords(progressContent, archiveContent) {
        const fixRecords = [];
        
        // 从progress.md中提取[FIX]记录
        const progressFixes = this.extractFixesFromContent(progressContent);
        fixRecords.push(...progressFixes);
        
        // 从archive.md中提取[FIX]记录
        const archiveFixes = this.extractFixesFromContent(archiveContent);
        fixRecords.push(...archiveFixes);
        
        return fixRecords;
    }

    /**
     * 从内容中提取修复记录
     */
    extractFixesFromContent(content) {
        const fixes = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 匹配[FIX]标记
            if (line.includes('[FIX]')) {
                const fix = this.parseFixLine(line, lines, i);
                if (fix) {
                    fixes.push(fix);
                }
            }
        }
        
        return fixes;
    }

    /**
     * 解析修复行
     */
    parseFixLine(line, lines, index) {
        try {
            // 提取基本信息
            const match = line.match(/- \[FIX\] \[([A-Z]+)\] (.+?) \[(\d{4}-\d{2}-\d{2})\]/);
            if (!match) return null;
            
            const priority = match[1];
            const description = match[2];
            const date = match[3];
            
            // 查找相关上下文
            const context = this.findContext(lines, index);
            
            return {
                priority,
                description,
                date,
                context,
                lineNumber: index + 1
            };
        } catch (error) {
            console.error('解析修复行失败:', error);
            return null;
        }
    }

    /**
     * 查找上下文信息
     */
    findContext(lines, index) {
        const context = {
            before: [],
            after: []
        };
        
        // 查找前面的相关行
        for (let i = Math.max(0, index - 5); i < index; i++) {
            if (lines[i].trim() && !lines[i].startsWith('-')) {
                context.before.push(lines[i]);
            }
        }
        
        // 查找后面的相关行
        for (let i = index + 1; i < Math.min(lines.length, index + 10); i++) {
            if (lines[i].trim() && !lines[i].startsWith('-')) {
                context.after.push(lines[i]);
            }
        }
        
        return context;
    }

    /**
     * 更新修复日志
     */
    async updateFixLog() {
        try {
            console.log('开始更新修复日志...');
            
            // 读取现有修复记录
            const fixRecords = await this.readFixRecords();
            console.log(`找到 ${fixRecords.length} 条修复记录`);
            
            // 读取现有修复日志
            const existingLog = fs.readFileSync(this.fixLogPath, 'utf8');
            
            // 检查是否有新记录需要添加
            const newRecords = this.findNewRecords(fixRecords, existingLog);
            
            if (newRecords.length === 0) {
                console.log('没有新的修复记录需要添加');
                return;
            }
            
            console.log(`发现 ${newRecords.length} 条新修复记录`);
            
            // 更新修复日志
            await this.addNewRecordsToLog(newRecords);
            
            console.log('修复日志更新完成');
            
        } catch (error) {
            console.error('更新修复日志失败:', error);
        }
    }

    /**
     * 查找新记录
     */
    findNewRecords(fixRecords, existingLog) {
        const newRecords = [];
        
        for (const record of fixRecords) {
            console.log(`检查修复记录: ${record.description}`);
            console.log(`记录日期: ${record.date}`);
            
            // 检查记录是否已存在于日志中
            const exists = existingLog.includes(record.description) || 
                          (existingLog.includes(record.date) && existingLog.includes(record.description.substring(0, 10))); // 更精确的匹配
            
            console.log(`记录是否存在: ${exists}`);
            
            if (!exists) {
                newRecords.push(record);
                console.log(`发现新修复记录: ${record.description}`);
            } else {
                console.log(`修复记录已存在: ${record.description}`);
            }
        }
        
        return newRecords;
    }

    /**
     * 添加新记录到日志
     */
    async addNewRecordsToLog(newRecords) {
        try {
            let logContent = fs.readFileSync(this.fixLogPath, 'utf8');
            
            // 按日期排序
            newRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            for (const record of newRecords) {
                const fixEntry = this.generateFixEntry(record);
                
                // 在适当位置插入新记录
                logContent = this.insertFixEntry(logContent, fixEntry, record.date);
            }
            
            // 写回文件
            fs.writeFileSync(this.fixLogPath, logContent, 'utf8');
            
        } catch (error) {
            console.error('添加新记录失败:', error);
        }
    }

    /**
     * 生成修复条目
     */
    generateFixEntry(record) {
        const date = record.date;
        const description = record.description;
        const priority = record.priority;
        
        return `
### ${date} - ${description}

**问题描述**:
- 基于外部大脑系统自动检测的修复记录

**修复措施**:
- 详细修复措施待补充

**修复结果**:
- 修复状态待确认

**影响范围**: ${this.getImpactLevel(priority)} - 自动检测
**修复类型**: 自动检测
**状态**: 🔄 待确认
`;
    }

    /**
     * 获取影响级别
     */
    getImpactLevel(priority) {
        switch (priority) {
            case 'HIGH': return '高影响';
            case 'MEDIUM': return '中影响';
            case 'LOW': return '低影响';
            default: return '中影响';
        }
    }

    /**
     * 插入修复条目
     */
    insertFixEntry(logContent, fixEntry, date) {
        // 查找插入位置（按日期排序）
        const lines = logContent.split('\n');
        let insertIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('### ') && lines[i].includes(date)) {
                // 找到相同日期的记录，插入到后面
                insertIndex = i + 1;
                break;
            } else if (lines[i].startsWith('### ')) {
                const lineDate = lines[i].match(/(\d{4}-\d{2}-\d{2})/);
                if (lineDate && new Date(date) > new Date(lineDate[1])) {
                    insertIndex = i;
                    break;
                }
            }
        }
        
        if (insertIndex === -1) {
            // 没有找到合适位置，插入到详细修复记录部分
            const detailIndex = lines.findIndex(line => line.includes('## 📝 详细修复记录'));
            if (detailIndex !== -1) {
                insertIndex = detailIndex + 1;
            }
        }
        
        if (insertIndex !== -1) {
            lines.splice(insertIndex, 0, fixEntry);
        }
        
        return lines.join('\n');
    }

    /**
     * 运行更新
     */
    async run() {
        console.log('启动智能文档更新...');
        await this.updateFixLog();
        console.log('智能文档更新完成');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const updater = new FixLogUpdater();
    updater.run().catch(console.error);
}

module.exports = FixLogUpdater;
