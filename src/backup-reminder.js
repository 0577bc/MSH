/**
 * MSH系统 - 自动化备份提醒系统
 * 功能：每周日晚上7点提醒备份，未备份则持续提醒
 */

class BackupReminderSystem {
  constructor() {
    this.BACKUP_SCHEDULE = {
      dayOfWeek: 0, // 周日
      hour: 19,     // 晚上7点
      minute: 0
    };
    
    this.STORAGE_KEY = 'msh_last_backup_time';
    this.DISMISSED_KEY = 'msh_backup_reminder_dismissed';
  }

  /**
   * 初始化备份提醒系统
   */
  init() {
    console.log('🔔 备份提醒系统已启动');
    
    // 页面加载时检查是否需要提醒
    this.checkBackupReminder();
    
    // 每小时检查一次（在周日晚上7点会触发）
    setInterval(() => {
      this.checkBackupReminder();
    }, 60 * 60 * 1000); // 每小时
  }

  /**
   * 检查是否需要显示备份提醒
   */
  checkBackupReminder() {
    const now = new Date();
    const lastBackupTime = this.getLastBackupTime();
    const isDismissed = this.isDismissedToday();

    console.log('🔍 检查备份状态:', {
      当前时间: now.toISOString(),
      上次备份: lastBackupTime ? new Date(lastBackupTime).toISOString() : '从未备份',
      今日已忽略: isDismissed
    });

    // 如果今天已经忽略提醒，不再显示
    if (isDismissed) {
      console.log('⏭️ 今日已忽略备份提醒');
      return;
    }

    // 检查是否需要备份
    if (this.shouldShowReminder(now, lastBackupTime)) {
      this.showBackupReminder();
    }
  }

  /**
   * 判断是否应该显示提醒
   */
  shouldShowReminder(now, lastBackupTime) {
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // 1. 检查是否是周日晚上7点之后
    const isSundayEvening = dayOfWeek === 0 && hour >= 19;

    // 2. 检查本周是否已备份
    const hasBackupThisWeek = this.hasBackupThisWeek(lastBackupTime);

    // 3. 如果是周日晚上7点后，且本周未备份，显示提醒
    if (isSundayEvening && !hasBackupThisWeek) {
      console.log('⚠️ 周日晚上7点后，本周未备份，需要提醒');
      return true;
    }

    // 4. 如果不是周日，但本周应该备份而未备份，也显示提醒
    if (dayOfWeek > 0 && this.isBackupOverdue(lastBackupTime)) {
      console.log('⚠️ 备份逾期，需要提醒');
      return true;
    }

    return false;
  }

  /**
   * 检查本周是否已备份
   */
  hasBackupThisWeek(lastBackupTime) {
    if (!lastBackupTime) return false;

    const now = new Date();
    const lastBackup = new Date(lastBackupTime);

    // 获取本周日的开始时间（周日00:00）
    const thisWeekStart = new Date(now);
    const daysToSunday = now.getDay(); // 0=周日, 1=周一, ...
    thisWeekStart.setDate(now.getDate() - daysToSunday);
    thisWeekStart.setHours(0, 0, 0, 0);

    // 如果上次备份在本周日之后，说明本周已备份
    return lastBackup >= thisWeekStart;
  }

  /**
   * 检查备份是否逾期
   */
  isBackupOverdue(lastBackupTime) {
    if (!lastBackupTime) return true;

    const now = new Date();
    const lastBackup = new Date(lastBackupTime);
    const daysSinceBackup = (now - lastBackup) / (1000 * 60 * 60 * 24);

    // 如果超过7天未备份，视为逾期
    return daysSinceBackup > 7;
  }

  /**
   * 显示备份提醒对话框
   */
  showBackupReminder() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastBackupTime = this.getLastBackupTime();
    
    let message = '';
    
    if (dayOfWeek === 0) {
      // 周日
      message = `🔔 每周完整备份提醒\n\n今天是周日晚上，请执行完整系统备份！\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n完整备份包含：\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n【数据备份】\n✅ 签到记录（${this.getRecordCount()}条）\n✅ 小组数据（12个）\n✅ 成员数据（154人）\n✅ 排除人员（30人）\n\n【系统备份】\n✅ 核心页面（10个）\n✅ 源代码（31个）\n✅ 工具文件（25个）\n✅ 配置文件\n✅ 文档系统（70+个）\n✅ 记忆系统\n\n⚠️ 备份期间请停止所有其他操作！\n⚠️ 必须完成数据+系统两个备份！`;
    } else {
      // 其他日期
      const daysSince = lastBackupTime ? 
        Math.floor((now - new Date(lastBackupTime)) / (1000 * 60 * 60 * 24)) : 
        '未知';
      message = `⚠️ 完整备份逾期提醒\n\n距离上次完整备份已${daysSince}天\n建议立即执行完整备份！\n\n完整备份包含：\n• 数据备份（Firebase数据）\n• 系统备份（代码+文档+配置）\n\n⚠️ 备份期间请停止其他操作！`;
    }

    // 显示提醒对话框
    const userChoice = confirm(message + '\n\n点击"确定"立即备份\n点击"取消"稍后提醒');

    if (userChoice) {
      // 用户选择立即备份
      this.openBackupTool();
    } else {
      // 用户选择稍后提醒
      this.dismissReminderForToday();
      alert('⏰ 已设置稍后提醒\n\n下次打开系统时会再次提醒\n建议今日完成备份！');
    }
  }

  /**
   * 打开备份工具
   */
  openBackupTool() {
    // 显示备份指引
    const instructions = `📋 完整备份步骤（必须全部完成）：\n\n⚠️ 备份期间请停止所有其他操作！\n\n【第1步】数据备份：\n   1. 点击"确定"后会自动打开数据备份工具\n   2. 点击"立即创建完整备份"按钮\n   3. 等待下载完成\n\n【第2步】系统备份：\n   在终端执行以下命令：\n   cd /Users/benchen/MSH/backup\n   ./create-full-system-backup.sh\n\n【第3步】验证备份：\n   确认两个备份文件都已生成\n\n【第4步】标记完成：\n   点击页面右下角"标记已完成备份"按钮\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n完整备份包含：\n✅ Firebase数据（签到、小组、成员）\n✅ 系统代码（HTML、JS、CSS）\n✅ 工具文件（25个工具）\n✅ 配置文件（config.js等）\n✅ 文档系统（70+个文档）\n✅ 记忆系统（progress.md等）`;
    
    alert(instructions);
    
    // 在新标签页打开数据备份工具
    window.open('tools/msh-system/auto-backup-now.html', '_blank');
    
    // 显示标记按钮和系统备份提醒
    this.showMarkBackupButton();
    this.showSystemBackupReminder();
  }

  /**
   * 显示系统备份提醒（浮动提示）
   */
  showSystemBackupReminder() {
    const existingReminder = document.getElementById('systemBackupReminder');
    if (existingReminder) return;

    const reminder = document.createElement('div');
    reminder.id = 'systemBackupReminder';
    reminder.innerHTML = `
      <div style="padding: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #c0392b;">⚠️ 请执行系统备份</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">在终端执行以下命令：</p>
        <code style="display: block; background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 13px;">
          cd /Users/benchen/MSH/backup<br>
          ./create-full-system-backup.sh
        </code>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #7f8c8d;">完成后点击右下角"标记已完成备份"按钮</p>
      </div>
    `;
    reminder.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: white;
      border: 3px solid #e74c3c;
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(231, 76, 60, 0.3);
      z-index: 9999;
      animation: slideIn 0.5s ease-out;
    `;

    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(reminder);
  }

  /**
   * 显示"标记已备份"按钮
   */
  showMarkBackupButton() {
    // 创建浮动按钮
    const existingButton = document.getElementById('markBackupButton');
    if (existingButton) return; // 已存在，不重复创建

    const button = document.createElement('button');
    button.id = 'markBackupButton';
    button.textContent = '✅ 标记已完成备份';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 25px;
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
      z-index: 10000;
      transition: all 0.3s;
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(46, 204, 113, 0.6)';
    };

    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(46, 204, 113, 0.4)';
    };

    button.onclick = () => {
      this.markBackupCompleted();
    };

    document.body.appendChild(button);
  }

  /**
   * 标记备份已完成
   */
  markBackupCompleted() {
    const confirm = window.confirm('确认已完成以下全部备份？\n\n✅ 数据备份（Firebase数据）\n   - 签到记录\n   - 小组和成员\n   - 排除人员\n\n✅ 系统备份（代码和文档）\n   - 核心页面（10个）\n   - 源代码（31个）\n   - 工具文件（25个）\n   - 配置文件\n   - 文档系统\n   - 记忆系统\n\n⚠️ 两个备份都必须完成才能标记！');
    
    if (confirm) {
      // 记录备份时间
      const now = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, now);
      
      // 移除标记按钮和提醒框
      const button = document.getElementById('markBackupButton');
      if (button) {
        button.remove();
      }
      
      const reminder = document.getElementById('systemBackupReminder');
      if (reminder) {
        reminder.remove();
      }

      alert('✅ 完整备份已标记完成！\n\n备份内容：\n• 数据备份（Firebase）\n• 系统备份（代码+文档）\n\n下次提醒时间：下周日晚上7点');
      console.log('✅ 完整备份时间已记录:', now);
    }
  }

  /**
   * 忽略今日提醒
   */
  dismissReminderForToday() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(this.DISMISSED_KEY, today);
    console.log('⏭️ 已忽略今日备份提醒');
  }

  /**
   * 检查今日是否已忽略提醒
   */
  isDismissedToday() {
    const dismissedDate = localStorage.getItem(this.DISMISSED_KEY);
    if (!dismissedDate) return false;

    const today = new Date().toISOString().split('T')[0];
    return dismissedDate === today;
  }

  /**
   * 获取上次备份时间（智能检测多个来源）
   */
  getLastBackupTime() {
    const sources = [];
    
    // 来源1：localStorage 手动标记
    const manualMarked = localStorage.getItem(this.STORAGE_KEY);
    if (manualMarked) {
      sources.push({ 
        time: manualMarked, 
        source: '手动标记',
        timestamp: new Date(manualMarked).getTime()
      });
    }
    
    // 来源2：最近下载的备份文件名
    const recentFile = localStorage.getItem('msh_recent_backup_file');
    if (recentFile) {
      // 从文件名提取时间：MSH-完整备份-2025-10-08T07-25-12.json
      const timeMatch = recentFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      if (timeMatch) {
        const fileTimeStr = timeMatch[1].replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
        sources.push({ 
          time: fileTimeStr, 
          source: '备份文件',
          fileName: recentFile,
          timestamp: new Date(fileTimeStr).getTime()
        });
      }
    }
    
    // 来源3：NewDataManager的同步时间（作为参考）
    if (window.newDataManager?.metadata?.groups?.lastSync) {
      const syncTime = window.newDataManager.metadata.groups.lastSync;
      sources.push({ 
        time: syncTime, 
        source: '数据同步',
        timestamp: new Date(syncTime).getTime()
      });
    }
    
    // 取最新的时间
    if (sources.length > 0) {
      sources.sort((a, b) => b.timestamp - a.timestamp);
      console.log('📊 备份时间来源（取最新）:', sources[0]);
      if (sources.length > 1) {
        console.log('   其他来源:', sources.slice(1));
      }
      return sources[0].time;
    }
    
    console.log('⚠️ 未找到任何备份时间记录');
    return null;
  }

  /**
   * 获取当前签到记录数量
   */
  getRecordCount() {
    if (window.attendanceRecords && window.attendanceRecords.length) {
      return window.attendanceRecords.length;
    }
    
    const localData = localStorage.getItem('msh_attendanceRecords');
    if (localData) {
      try {
        const records = JSON.parse(localData);
        return Array.isArray(records) ? records.length : Object.keys(records).length;
      } catch (e) {
        return '未知';
      }
    }
    
    return '未知';
  }

  /**
   * 获取备份状态信息（供其他模块调用）
   */
  getBackupStatus() {
    const lastBackupTime = this.getLastBackupTime();
    const hasBackupThisWeek = this.hasBackupThisWeek(lastBackupTime);
    const isOverdue = this.isBackupOverdue(lastBackupTime);

    return {
      lastBackupTime,
      hasBackupThisWeek,
      isOverdue,
      nextBackupDate: this.getNextBackupDate()
    };
  }

  /**
   * 获取下次备份日期
   */
  getNextBackupDate() {
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(19, 0, 0, 0);
    return nextSunday;
  }
}

// 创建全局实例
window.backupReminderSystem = new BackupReminderSystem();

// 自动初始化（延迟5秒，避免干扰页面加载）
setTimeout(() => {
  if (window.backupReminderSystem) {
    window.backupReminderSystem.init();
  }
}, 5000);

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackupReminderSystem;
}
