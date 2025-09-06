// 全局错误处理
window.addEventListener('error', function(e) {
  console.error('全局错误:', e.error);
  
  // 如果是Firebase相关错误，显示友好提示
  if (e.error && e.error.message && e.error.message.includes('Firebase')) {
    showFirebaseError();
  }
});

// 显示Firebase错误提示
function showFirebaseError() {
  // 检查是否已经显示了错误提示
  if (document.getElementById('firebase-error-notice')) {
    return;
  }
  
  const errorNotice = document.createElement('div');
  errorNotice.id = 'firebase-error-notice';
  errorNotice.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f8d7da;
    color: #721c24;
    padding: 15px;
    border: 1px solid #f5c6cb;
    border-radius: 5px;
    z-index: 10000;
    max-width: 300px;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  
  errorNotice.innerHTML = `
    <strong>⚠️ Firebase连接错误</strong><br>
    无法连接到Firebase数据库，请检查网络连接和配置。<br>
    <small>请确保config.js中的Firebase配置正确。</small>
    <button onclick="this.parentElement.remove()" style="
      float: right;
      background: none;
      border: none;
      color: #721c24;
      cursor: pointer;
      font-size: 16px;
      margin-top: -5px;
    ">×</button>
  `;
  
  document.body.appendChild(errorNotice);
  
  // 5秒后自动隐藏
  setTimeout(() => {
    if (errorNotice.parentElement) {
      errorNotice.remove();
    }
  }, 5000);
}

// 检查Firebase配置
function checkFirebaseConfig() {
  if (!window.firebaseConfig) {
    showFirebaseError();
  }
}

// 页面加载完成后检查配置
document.addEventListener('DOMContentLoaded', checkFirebaseConfig);
