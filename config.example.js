// Firebase配置文件示例
// 请复制此文件为 config.js 并填入您的真实配置

// 确保在全局作用域中定义配置
if (typeof window !== 'undefined') {
  
  // 真实Firebase配置 - 请替换为您的项目配置
  window.firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  };
}

// 注意：管理员密码现在由Firebase Authentication管理
// 不再需要在此文件中存储密码

// 真实小组数据
window.sampleData = {
  groups: {
    // 请在此处添加您的真实小组数据
  },
  groupNames: {
    // 请在此处添加您的真实小组名称
  }
};