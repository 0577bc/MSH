/**
 * 用户反馈收集器 (user-feedback-collector.js)
 * 功能：收集用户反馈，提供反馈管理和分析功能
 * 作者：MSH系统
 * 版本：1.0
 */

// ==================== 用户反馈收集器 ====================

class UserFeedbackCollector {
  constructor() {
    this.feedbackData = [];
    this.isCollecting = false;
    this.feedbackForm = null;
    this.feedbackButton = null;
  }

  // 初始化反馈收集器
  initialize() {
    console.log('🔄 初始化用户反馈收集器...');
    
    // 创建反馈按钮
    this.createFeedbackButton();
    
    // 创建反馈表单
    this.createFeedbackForm();
    
    // 加载现有反馈数据
    this.loadFeedbackData();
    
    // 开始收集用户行为
    this.startBehaviorCollection();
    
    console.log('✅ 用户反馈收集器已初始化');
  }

  // 创建反馈按钮
  createFeedbackButton() {
    // 检查是否已存在反馈按钮
    if (document.getElementById('feedback-button')) {
      return;
    }

    const button = document.createElement('div');
    button.id = 'feedback-button';
    button.innerHTML = '💬 反馈';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4299e1;
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      transition: all 0.3s ease;
      user-select: none;
    `;

    // 悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.background = '#3182ce';
      button.style.transform = 'scale(1.05)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#4299e1';
      button.style.transform = 'scale(1)';
    });

    // 点击事件
    button.addEventListener('click', () => {
      this.showFeedbackForm();
    });

    document.body.appendChild(button);
    this.feedbackButton = button;
  }

  // 创建反馈表单
  createFeedbackForm() {
    const form = document.createElement('div');
    form.id = 'feedback-form';
    form.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      padding: 30px;
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10001;
      display: none;
    `;

    form.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #2d3748;">💬 用户反馈</h3>
        <button id="close-feedback-form" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #718096;">&times;</button>
      </div>
      
      <form id="feedback-form-content">
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #4a5568;">反馈类型</label>
          <select id="feedback-type" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
            <option value="bug">🐛 错误报告</option>
            <option value="feature">💡 功能建议</option>
            <option value="improvement">⚡ 性能优化</option>
            <option value="ui">🎨 界面优化</option>
            <option value="other">📝 其他</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #4a5568;">优先级</label>
          <select id="feedback-priority" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
            <option value="low">🟢 低</option>
            <option value="medium">🟡 中</option>
            <option value="high">🔴 高</option>
            <option value="urgent">🚨 紧急</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #4a5568;">反馈内容</label>
          <textarea id="feedback-content" placeholder="请详细描述您的问题或建议..." style="width: 100%; height: 120px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #4a5568;">联系方式（可选）</label>
          <input type="text" id="feedback-contact" placeholder="您的邮箱或电话，方便我们回复" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="feedback-anonymous" style="margin-right: 8px;">
            <span style="color: #4a5568;">匿名反馈</span>
          </label>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="cancel-feedback" style="padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #4a5568; border-radius: 6px; cursor: pointer; font-size: 14px;">取消</button>
          <button type="submit" style="padding: 10px 20px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">提交反馈</button>
        </div>
      </form>
    `;

    document.body.appendChild(form);
    this.feedbackForm = form;

    // 绑定事件
    this.bindFeedbackFormEvents();
  }

  // 绑定反馈表单事件
  bindFeedbackFormEvents() {
    const form = this.feedbackForm;
    const closeBtn = form.querySelector('#close-feedback-form');
    const cancelBtn = form.querySelector('#cancel-feedback');
    const submitBtn = form.querySelector('button[type="submit"]');
    const formContent = form.querySelector('#feedback-form-content');

    // 关闭表单
    closeBtn.addEventListener('click', () => {
      this.hideFeedbackForm();
    });

    cancelBtn.addEventListener('click', () => {
      this.hideFeedbackForm();
    });

    // 点击背景关闭
    form.addEventListener('click', (e) => {
      if (e.target === form) {
        this.hideFeedbackForm();
      }
    });

    // 提交表单
    formContent.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitFeedback();
    });
  }

  // 显示反馈表单
  showFeedbackForm() {
    if (this.feedbackForm) {
      this.feedbackForm.style.display = 'block';
      document.body.style.overflow = 'hidden';
      
      // 聚焦到第一个输入框
      const firstInput = this.feedbackForm.querySelector('input, textarea, select');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }

  // 隐藏反馈表单
  hideFeedbackForm() {
    if (this.feedbackForm) {
      this.feedbackForm.style.display = 'none';
      document.body.style.overflow = '';
      
      // 清空表单
      this.feedbackForm.querySelector('#feedback-form-content').reset();
    }
  }

  // 提交反馈
  async submitFeedback() {
    try {
      const form = this.feedbackForm.querySelector('#feedback-form-content');
      const formData = new FormData(form);
      
      const feedback = {
        id: this.generateFeedbackId(),
        timestamp: new Date().toISOString(),
        type: form.querySelector('#feedback-type').value,
        priority: form.querySelector('#feedback-priority').value,
        content: form.querySelector('#feedback-content').value,
        contact: form.querySelector('#feedback-contact').value,
        anonymous: form.querySelector('#feedback-anonymous').checked,
        userAgent: navigator.userAgent,
        url: window.location.href,
        screenResolution: `${screen.width}x${screen.height}`,
        browserInfo: this.getBrowserInfo(),
        systemInfo: this.getSystemInfo()
      };

      // 验证必填字段
      if (!feedback.content.trim()) {
        alert('请填写反馈内容');
        return;
      }

      // 保存反馈
      this.saveFeedback(feedback);
      
      // 同步到Firebase
      await this.syncFeedbackToFirebase(feedback);
      
      // 显示成功消息
      this.showSuccessMessage('反馈提交成功，感谢您的建议！');
      
      // 隐藏表单
      this.hideFeedbackForm();
      
      console.log('✅ 反馈提交成功:', feedback);
      
    } catch (error) {
      console.error('❌ 提交反馈失败:', error);
      this.showErrorMessage('提交失败，请稍后重试');
    }
  }

  // 保存反馈到本地
  saveFeedback(feedback) {
    this.feedbackData.push(feedback);
    localStorage.setItem('msh_user_feedback', JSON.stringify(this.feedbackData));
  }

  // 同步反馈到Firebase
  async syncFeedbackToFirebase(feedback) {
    try {
      if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        console.warn('Firebase未初始化，跳过同步');
        return;
      }

      const db = firebase.database();
      await db.ref(`userFeedback/${feedback.id}`).set(feedback);
      
      console.log('✅ 反馈已同步到Firebase');
    } catch (error) {
      console.error('❌ 同步反馈到Firebase失败:', error);
    }
  }

  // 加载反馈数据
  loadFeedbackData() {
    try {
      const stored = localStorage.getItem('msh_user_feedback');
      if (stored) {
        this.feedbackData = JSON.parse(stored);
        console.log(`📊 加载了 ${this.feedbackData.length} 条反馈数据`);
      }
    } catch (error) {
      console.error('加载反馈数据失败:', error);
      this.feedbackData = [];
    }
  }

  // 开始收集用户行为
  startBehaviorCollection() {
    this.isCollecting = true;
    
    // 收集页面访问
    this.collectPageVisit();
    
    // 收集用户交互
    this.collectUserInteractions();
    
    // 收集错误信息
    this.collectErrors();
    
    // 收集性能数据
    this.collectPerformanceData();
  }

  // 收集页面访问
  collectPageVisit() {
    const visit = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };

    this.saveBehaviorData('pageVisit', visit);
  }

  // 收集用户交互
  collectUserInteractions() {
    const interactionTypes = ['click', 'keydown', 'scroll', 'resize'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const interaction = {
          timestamp: new Date().toISOString(),
          type: type,
          target: event.target.tagName,
          className: event.target.className,
          id: event.target.id,
          x: event.clientX || 0,
          y: event.clientY || 0,
          url: window.location.href
        };

        this.saveBehaviorData('userInteraction', interaction);
      });
    });
  }

  // 收集错误信息
  collectErrors() {
    window.addEventListener('error', (event) => {
      const error = {
        timestamp: new Date().toISOString(),
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        url: window.location.href
      };

      this.saveBehaviorData('error', error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        timestamp: new Date().toISOString(),
        type: 'unhandledrejection',
        reason: event.reason,
        url: window.location.href
      };

      this.saveBehaviorData('error', error);
    });
  }

  // 收集性能数据
  collectPerformanceData() {
    if (window.performanceMonitor) {
      const performanceData = window.performanceMonitor.getPerformanceReport();
      this.saveBehaviorData('performance', performanceData);
    }
  }

  // 保存行为数据
  saveBehaviorData(type, data) {
    try {
      const behaviorData = JSON.parse(localStorage.getItem('msh_user_behavior') || '{}');
      
      if (!behaviorData[type]) {
        behaviorData[type] = [];
      }
      
      behaviorData[type].push(data);
      
      // 限制数据量
      if (behaviorData[type].length > 100) {
        behaviorData[type] = behaviorData[type].slice(-50);
      }
      
      localStorage.setItem('msh_user_behavior', JSON.stringify(behaviorData));
    } catch (error) {
      console.error('保存行为数据失败:', error);
    }
  }

  // 获取反馈统计
  getFeedbackStats() {
    const stats = {
      total: this.feedbackData.length,
      byType: {},
      byPriority: {},
      byDate: {},
      recent: this.feedbackData.slice(-10)
    };

    this.feedbackData.forEach(feedback => {
      // 按类型统计
      stats.byType[feedback.type] = (stats.byType[feedback.type] || 0) + 1;
      
      // 按优先级统计
      stats.byPriority[feedback.priority] = (stats.byPriority[feedback.priority] || 0) + 1;
      
      // 按日期统计
      const date = feedback.timestamp.split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }

  // 获取行为数据
  getBehaviorData() {
    try {
      return JSON.parse(localStorage.getItem('msh_user_behavior') || '{}');
    } catch (error) {
      console.error('获取行为数据失败:', error);
      return {};
    }
  }

  // 导出反馈数据
  exportFeedbackData() {
    try {
      const data = {
        feedback: this.feedbackData,
        behavior: this.getBehaviorData(),
        stats: this.getFeedbackStats(),
        exportTime: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `msh-feedback-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('✅ 反馈数据已导出');
    } catch (error) {
      console.error('❌ 导出反馈数据失败:', error);
    }
  }

  // 清空反馈数据
  clearFeedbackData() {
    if (confirm('确定要清空所有反馈数据吗？此操作不可撤销！')) {
      this.feedbackData = [];
      localStorage.removeItem('msh_user_feedback');
      localStorage.removeItem('msh_user_behavior');
      console.log('✅ 反馈数据已清空');
    }
  }

  // 辅助方法
  generateFeedbackId() {
    return 'feedback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    const browsers = {
      'Chrome': /Chrome/,
      'Firefox': /Firefox/,
      'Safari': /Safari/,
      'Edge': /Edge/,
      'IE': /Trident/
    };

    for (const [name, regex] of Object.entries(browsers)) {
      if (regex.test(ua)) {
        return name;
      }
    }
    return 'Unknown';
  }

  getSystemInfo() {
    return {
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      doNotTrack: navigator.doNotTrack
    };
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 10002;
      animation: slideIn 0.3s ease;
    `;

    if (type === 'success') {
      messageDiv.style.background = '#48bb78';
    } else {
      messageDiv.style.background = '#f56565';
    }

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }
}

// 创建全局实例
window.userFeedbackCollector = new UserFeedbackCollector();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.userFeedbackCollector.initialize();
  });
} else {
  window.userFeedbackCollector.initialize();
}

console.log('✅ 用户反馈收集器已初始化');


