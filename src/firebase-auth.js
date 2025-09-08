// 简单密码验证模块
// 适用于内部可信任人员使用，主要目的是防止误操作

// 管理员密码配置
const ADMIN_PASSWORD = 'msh2025'; // 简单密码，可根据需要修改

// 验证管理员密码
function verifyAdminPassword(password) {
  return password === ADMIN_PASSWORD;
}

// 检查是否为管理员（兼容性函数）
async function isAdminEmail(email) {
  // 简单密码模式下，不需要邮箱验证
  return true;
}

// 简单的登录状态管理
let loginState = false;

// 管理员登录
async function adminLogin(email, password) {
  try {
    console.log('尝试管理员登录');
    
    // 使用简单密码验证
    if (verifyAdminPassword(password)) {
      loginState = true;
      console.log('管理员登录成功');
      
      // 记录登录日志
      if (window.systemLogger) {
        window.systemLogger.success('管理员登录成功');
      }
      
      return { 
        success: true, 
        user: {
          email: 'admin@local',
          uid: 'local-admin'
        }
      };
    } else {
      console.log('密码错误');
      
      if (window.systemLogger) {
        window.systemLogger.warning('管理员登录失败：密码错误');
      }
      
      return { 
        success: false, 
        error: '密码错误' 
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    
    if (window.systemLogger) {
      window.systemLogger.error(`登录失败: ${error.message}`);
    }
    
    return { success: false, error: '登录失败，请重试' };
  }
}

// 管理员登出
async function adminLogout() {
  try {
    loginState = false;
    console.log('管理员已登出');
    
    if (window.systemLogger) {
      window.systemLogger.info('管理员已登出');
    }
    
    return { success: true };
  } catch (error) {
    console.error('登出失败:', error);
    return { success: false, error: error.message };
  }
}

// 监听认证状态变化（兼容性函数）
function onAuthStateChanged(callback) {
  // 简单密码模式下，直接返回当前登录状态
  callback({ 
    isAdmin: loginState, 
    user: loginState ? { email: 'admin@local', uid: 'local-admin' } : null 
  });
  
  // 返回一个取消监听的函数
  return () => {};
}

// 获取当前用户信息
function getCurrentUser() {
  if (loginState) {
    return {
      email: 'admin@local',
      uid: 'local-admin'
    };
  }
  return null;
}

// 检查用户是否已登录
function checkIsLoggedIn() {
  return loginState;
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.firebaseAuth = {
    verifyAdminPassword,
    isAdminEmail,
    adminLogin,
    adminLogout,
    onAuthStateChanged,
    getCurrentUser,
    isLoggedIn: checkIsLoggedIn
  };
}