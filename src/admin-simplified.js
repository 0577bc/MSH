/**
 * 管理页面主文件 (admin.js) - 简化版
 * 功能：提供跳转入口，不直接管理数据
 * 说明：所有成员管理功能已迁移到 group-management.js
 * 版本：3.0 (优化版)
 */

// ==================== 全局变量和初始化 ====================
let app, db;

// ==================== Firebase初始化 ====================
function initializeFirebase() {
  const result = window.utils.initializeFirebase();
  if (result.success) {
    app = result.app;
    db = result.db;
    window.db = db;
    console.log('✅ 管理页面Firebase初始化成功');
  } else {
    console.error('❌ 管理页面Firebase初始化失败');
    alert('Firebase配置错误，请检查config.js文件');
  }
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📌 管理页面初始化（简化版）');
  
  // 初始化Firebase（仅用于跳转页面可能需要）
  initializeFirebase();
  
  // 初始化事件监听器
  initializeEventListeners();
  
  console.log('✅ 管理页面初始化完成');
});

// ==================== 事件监听器初始化 ====================
function initializeEventListeners() {
  // 返回签到页面按钮
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', async () => {
      if (window.NavigationUtils) {
        await window.NavigationUtils.navigateBackToIndex();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  // 查看签到汇总按钮
  const summaryButton = document.getElementById('summaryButton');
  if (summaryButton) {
    summaryButton.addEventListener('click', () => {
      window.location.href = 'summary.html';
    });
  }

  // 成员管理按钮（跳转到专门的成员管理页面）
  const groupManagementButton = document.getElementById('groupManagementButton');
  if (groupManagementButton) {
    groupManagementButton.addEventListener('click', () => {
      console.log('🔄 跳转到成员管理页面...');
      window.location.href = 'group-management.html';
    });
  }

  // 未签到不统计人员管理按钮
  const excludedMembersViewerButton = document.getElementById('excludedMembersViewerButton');
  if (excludedMembersViewerButton) {
    excludedMembersViewerButton.addEventListener('click', () => {
      console.log('🔄 跳转到未签到不统计人员管理页面...');
      window.location.href = 'tools/msh-system/excluded-members-viewer.html';
    });
  }

  // 系统工具按钮
  const toolsButton = document.getElementById('toolsButton');
  if (toolsButton) {
    toolsButton.addEventListener('click', () => {
      console.log('🔄 跳转到系统工具页面...');
      window.location.href = 'tools/index.html';
    });
  }

  // 数据删除管理按钮
  const deleteManagementButton = document.getElementById('deleteManagementButton');
  if (deleteManagementButton) {
    deleteManagementButton.addEventListener('click', () => {
      console.log('🔍 点击数据删除管理按钮');
      const confirmAccess = confirm('⚠️ 数据删除管理是危险操作！\n\n只有管理员才能访问此功能。\n确定要继续吗？');
      if (confirmAccess) {
        console.log('✅ 正在跳转到数据冲突管理工具...');
        window.location.href = 'tools/msh-system/data-conflict-manager.html';
      } else {
        console.log('❌ 用户取消访问');
      }
    });
  }

  // 外部表单管理按钮
  const externalFormAdminButton = document.getElementById('externalFormAdminButton');
  if (externalFormAdminButton) {
    externalFormAdminButton.addEventListener('click', () => {
      if (window.externalFormConfig && window.externalFormConfig.apiBaseUrl) {
        window.open('tools/cloud-forms/external-form-admin.html', '_blank');
      } else {
        alert('⚠️ 外部表单系统未配置！\n\n请检查config.js中的externalFormConfig配置。');
      }
    });
  }

  // 数据转发按钮
  const dataForwardButton = document.getElementById('dataForwardButton');
  if (dataForwardButton) {
    dataForwardButton.addEventListener('click', () => {
      if (window.externalFormConfig && window.externalFormConfig.apiBaseUrl) {
        showDataForwardDialog();
      } else {
        alert('⚠️ 外部表单系统未配置！\n\n请检查config.js中的externalFormConfig配置。');
      }
    });
  }

  console.log('✅ 事件监听器初始化完成');
}

// ==================== 数据转发功能 ====================

/**
 * 显示数据转发对话框
 * 功能：提供数据转发到外部表单系统的界面
 */
function showDataForwardDialog() {
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.className = 'data-forward-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <h2>🔄 数据转发到外部表单系统</h2>
      <p class="dialog-description">
        将MSH系统中的数据手动转发到外部表单系统，遵循安全原则。<br>
        <strong>⚠️ 临时解决方案：</strong>当前使用forms端点进行数据同步，等专用API端点创建后将自动切换。
      </p>
      
      <div class="forward-options">
        <h3>选择要转发的数据类型：</h3>
        
        <div class="option-group">
          <label class="option-item">
            <input type="checkbox" id="forwardGroups" checked>
            <span class="checkmark"></span>
            <div class="option-content">
              <strong>小组数据</strong>
              <small>包含小组名称和成员信息，用于外部表单系统</small>
            </div>
          </label>
        </div>
        
        <div class="option-group">
          <label class="option-item">
            <input type="checkbox" id="forwardGroupSignin" checked>
            <span class="checkmark"></span>
            <div class="option-content">
              <strong>小组签到数据</strong>
              <small>同步小组名称、成员信息和UUID到小组签到表单</small>
            </div>
          </label>
        </div>
      </div>
      
      <div class="forward-status" id="forwardStatus" style="display: none;">
        <div class="status-content">
          <div class="status-icon">⏳</div>
          <div class="status-text">正在转发数据...</div>
          <div class="status-progress">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">0%</div>
          </div>
        </div>
      </div>
      
      <div class="dialog-buttons">
        <button id="startForwardBtn" class="primary-button">开始转发</button>
        <button id="cancelForwardBtn" class="secondary-button">取消</button>
      </div>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .data-forward-dialog {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    
    .data-forward-dialog .dialog-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .data-forward-dialog h2 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 20px;
    }
    
    .dialog-description {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .forward-options {
      margin-bottom: 20px;
    }
    
    .forward-options h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
    }
    
    .option-group {
      margin-bottom: 12px;
    }
    
    .option-item {
      display: flex;
      align-items: flex-start;
      cursor: pointer;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s;
    }
    
    .option-item:hover {
      background: #f5f5f5;
      border-color: #007bff;
    }
    
    .option-item input[type="checkbox"] {
      margin-right: 12px;
      margin-top: 2px;
    }
    
    .option-content strong {
      display: block;
      color: #333;
      margin-bottom: 4px;
    }
    
    .option-content small {
      color: #666;
      font-size: 12px;
    }
    
    .forward-status {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .status-content {
      display: flex;
      align-items: center;
    }
    
    .status-icon {
      font-size: 20px;
      margin-right: 12px;
    }
    
    .status-text {
      flex: 1;
      color: #333;
      font-weight: 500;
    }
    
    .status-progress {
      margin-top: 12px;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #007bff, #0056b3);
      width: 0%;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    .dialog-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .primary-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .primary-button:hover {
      background: #0056b3;
    }
    
    .secondary-button {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .secondary-button:hover {
      background: #545b62;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(dialog);
  
  // 事件监听器
  const startForwardBtn = dialog.querySelector('#startForwardBtn');
  const cancelForwardBtn = dialog.querySelector('#cancelForwardBtn');
  const forwardStatus = dialog.querySelector('#forwardStatus');
  const progressFill = dialog.querySelector('#progressFill');
  const progressText = dialog.querySelector('#progressText');
  
  startForwardBtn.addEventListener('click', async () => {
    const forwardGroups = dialog.querySelector('#forwardGroups').checked;
    const forwardGroupSignin = dialog.querySelector('#forwardGroupSignin').checked;
    
    if (!forwardGroups && !forwardGroupSignin) {
      alert('请至少选择一种数据类型进行转发！');
      return;
    }
    
    // 显示转发状态
    forwardStatus.style.display = 'block';
    startForwardBtn.disabled = true;
    startForwardBtn.textContent = '转发中...';
    
    try {
      // 从全局变量或NewDataManager获取数据
      const groups = window.groups || {};
      const groupNames = window.groupNames || {};
      
      await performDataForward({
        groups: forwardGroups,
        groupSignin: forwardGroupSignin,
        groupsData: groups,
        groupNamesData: groupNames
      }, progressFill, progressText);
      
      alert('✅ 数据转发完成！\n\n数据已成功转发到外部表单系统。');
      document.body.removeChild(dialog);
      document.head.removeChild(style);
      
    } catch (error) {
      console.error('数据转发失败:', error);
      alert('❌ 数据转发失败！\n\n错误信息：' + error.message);
      startForwardBtn.disabled = false;
      startForwardBtn.textContent = '开始转发';
    }
  });
  
  cancelForwardBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
    document.head.removeChild(style);
  });
  
  // 点击背景关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
    }
  });
}

/**
 * 执行数据转发
 */
async function performDataForward(options, progressFill, progressText) {
  const { groups, groupSignin, groupsData, groupNamesData } = options;
  let progress = 0;
  const totalSteps = (groups ? 1 : 0) + (groupSignin ? 1 : 0);
  let currentStep = 0;
  
  const updateProgress = (step, message) => {
    currentStep++;
    progress = Math.round((currentStep / totalSteps) * 100);
    progressFill.style.width = progress + '%';
    progressText.textContent = progress + '%';
    console.log(`数据转发进度: ${step} - ${message}`);
  };
  
  try {
    if (!window.externalFormConfig || !window.externalFormConfig.apiBaseUrl) {
      throw new Error('外部表单系统未配置');
    }
    
    const apiBaseUrl = window.externalFormConfig.apiBaseUrl;
    
    // 转发小组数据
    if (groups) {
      updateProgress('小组数据', '正在转发小组数据...');
      
      const response = await fetch(`${apiBaseUrl}${window.externalFormConfig.endpoints.syncGroups}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getExternalFormToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`小组数据转发失败: ${response.status}`);
      }
      
      console.log('✅ 小组数据已转发');
    }
    
    // 转发小组签到数据
    if (groupSignin) {
      updateProgress('小组签到', '正在同步小组签到数据...');
      
      const response = await fetch(`${apiBaseUrl}${window.externalFormConfig.endpoints.syncGroupSignin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getExternalFormToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`小组签到数据同步失败: ${response.status}`);
      }
      
      console.log('✅ 小组签到数据已同步');
    }
    
    updateProgress('完成', '数据转发完成！');
    
  } catch (error) {
    console.error('数据转发过程中发生错误:', error);
    throw error;
  }
}

/**
 * 获取外部表单系统认证令牌
 */
async function getExternalFormToken() {
  const cachedToken = localStorage.getItem('externalFormToken');
  const tokenExpiry = localStorage.getItem('externalFormTokenExpiry');
  
  if (cachedToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
    return cachedToken;
  }
  
  try {
    const response = await fetch(`${window.externalFormConfig.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: window.externalFormConfig.auth.username,
        password: window.externalFormConfig.auth.password
      })
    });
    
    if (!response.ok) {
      throw new Error('认证失败');
    }
    
    const data = await response.json();
    const token = data.token;
    const expiry = new Date().getTime() + (24 * 60 * 60 * 1000);
    
    localStorage.setItem('externalFormToken', token);
    localStorage.setItem('externalFormTokenExpiry', expiry.toString());
    
    return token;
    
  } catch (error) {
    console.error('获取外部表单系统令牌失败:', error);
    throw new Error('无法连接到外部表单系统');
  }
}

console.log('📌 Admin.js (简化版) 加载完成');


