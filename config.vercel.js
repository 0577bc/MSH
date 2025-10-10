/**
 * Vercel环境下的配置文件
 * 使用Vercel环境变量注入的配置
 */

if (typeof window !== 'undefined') {
  // Firebase配置 - 从Vercel环境变量读取
  window.firebaseConfig = {
    apiKey: "AIzaSyBMp9_gt3TpRQivmCFTz6g9SSKF-oOo01Y",
    authDomain: "yjys-4102e.firebaseapp.com",
    databaseURL: "https://yjys-4102e-default-rtdb.firebaseio.com/",
    projectId: "yjys-4102e",
    storageBucket: "yjys-4102e.firebasestorage.app",
    messagingSenderId: "690578220792",
    appId: "1:690578220792:web:8e6d537901e2636782fd0d"
  };
  
  // 外部表单系统配置（可选）
  // 注意：敏感凭据已移除，如需使用外部表单功能，请在本地config.js中配置
  window.externalFormConfig = {
    apiBaseUrl: 'http://112.124.97.58/api',
    auth: {
      username: '', // 生产环境不包含凭据
      password: '', // 生产环境不包含凭据
      token: null
    },
    endpoints: {
      login: '/auth/login',
      forms: '/forms',
      submissions: '/submissions',
      status: '/status'
    }
  };
  
  console.log('✅ Vercel环境配置已加载');
  console.log('Firebase项目ID:', window.firebaseConfig.projectId);
}
