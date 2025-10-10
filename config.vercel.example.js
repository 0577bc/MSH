/**
 * Vercel环境下的配置文件
 * 使用Vercel环境变量注入的配置
 */

if (typeof window !== 'undefined') {
  // Firebase配置 - 请替换为您的真实配置
  window.firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  // 外部表单系统配置（可选）
  window.externalFormConfig = {
    apiBaseUrl: 'http://your-server-ip/api',
    auth: {
      username: 'your-username',
      password: 'your-password',
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
