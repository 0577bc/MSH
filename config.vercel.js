/**
 * Vercel环境下的配置文件
 * 自动从环境变量读取Firebase配置
 */

if (typeof window !== 'undefined') {
  // Firebase配置 - 从Vercel环境变量读取
  window.firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://your-project-default-rtdb.firebaseio.com/",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
    appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
  };
  
  // 外部表单系统配置（可选）
  window.externalFormConfig = {
    apiBaseUrl: process.env.EXTERNAL_FORM_API_URL || 'http://your-server-ip/api',
    auth: {
      username: process.env.EXTERNAL_FORM_USERNAME || 'admin',
      password: process.env.EXTERNAL_FORM_PASSWORD || 'password',
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
