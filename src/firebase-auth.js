// Firebase Authentication 模块
// 用于替换原有的简单密码验证

// 管理员邮箱列表（可以配置多个管理员）
const ADMIN_EMAILS = [
  '0577bc@gmail.com'  // 主管理员邮箱
  // 如需添加更多管理员，请在此数组中添加邮箱地址
];

// 检查是否为管理员邮箱
function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}

// 管理员登录
async function adminLogin(email, password) {
  try {
    console.log('尝试管理员登录:', email);
    
    // 使用Firebase Auth进行登录
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    console.log('Firebase登录成功:', user.email);
    
    // 检查是否为管理员邮箱
    if (isAdminEmail(user.email)) {
      console.log('管理员权限验证通过');
      
      // 记录登录日志
      if (window.systemLogger) {
        window.systemLogger.success(`管理员登录成功: ${user.email}`);
      }
      
      return { 
        success: true, 
        user: {
          email: user.email,
          uid: user.uid
        }
      };
    } else {
      // 非管理员用户，立即登出
      await firebase.auth().signOut();
      console.log('非管理员用户，已登出');
      
      if (window.systemLogger) {
        window.systemLogger.warning(`非管理员用户尝试登录: ${user.email}`);
      }
      
      return { 
        success: false, 
        error: '无管理员权限，请联系系统管理员' 
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    
    // 记录登录失败日志
    if (window.systemLogger) {
      window.systemLogger.error(`登录失败: ${error.message}`);
    }
    
    // 根据错误类型返回友好的错误信息
    let errorMessage = '登录失败';
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = '用户不存在';
        break;
      case 'auth/wrong-password':
        errorMessage = '密码错误';
        break;
      case 'auth/invalid-email':
        errorMessage = '邮箱格式不正确';
        break;
      case 'auth/user-disabled':
        errorMessage = '用户账户已被禁用';
        break;
      case 'auth/too-many-requests':
        errorMessage = '登录尝试次数过多，请稍后再试';
        break;
      default:
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// 管理员登出
async function adminLogout() {
  try {
    await firebase.auth().signOut();
    console.log('管理员已登出');
    
    // 记录登出日志
    if (window.systemLogger) {
      window.systemLogger.info('管理员已登出');
    }
    
    return { success: true };
  } catch (error) {
    console.error('登出失败:', error);
    return { success: false, error: error.message };
  }
}

// 监听认证状态变化
function onAuthStateChanged(callback) {
  return firebase.auth().onAuthStateChanged((user) => {
    if (user && isAdminEmail(user.email)) {
      // 用户已登录且为管理员
      console.log('管理员已登录:', user.email);
      callback({ 
        isAdmin: true, 
        user: {
          email: user.email,
          uid: user.uid
        }
      });
    } else {
      // 用户未登录或非管理员
      console.log('用户未登录或非管理员');
      callback({ isAdmin: false, user: null });
    }
  });
}

// 获取当前用户信息
function getCurrentUser() {
  const user = firebase.auth().currentUser;
  if (user && isAdminEmail(user.email)) {
    return {
      email: user.email,
      uid: user.uid
    };
  }
  return null;
}

// 检查用户是否已登录
function isLoggedIn() {
  const user = firebase.auth().currentUser;
  return user && isAdminEmail(user.email);
}

// 导出函数供其他模块使用
window.firebaseAuth = {
  adminLogin,
  adminLogout,
  onAuthStateChanged,
  getCurrentUser,
  isLoggedIn,
  isAdminEmail
};
