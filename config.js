// 默认配置文件 - 用于GitHub Pages演示
// 注意：这是演示配置，实际使用时请替换为您的Firebase配置

window.firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  databaseURL: "https://demo-project-default-rtdb.firebaseio.com/",
  projectId: "demo-project",
  storageBucket: "demo-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

// 演示用管理员密码
window.adminPassword = "demo123";

// 示例数据
window.sampleData = {
  groups: {
    "group1": [
      { name: "张三", phone: "13800138001", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "李四", phone: "13800138002", gender: "女", baptized: "否", age: "90后", joinDate: "2024-01-15" },
      { name: "王五", phone: "13800138003", gender: "男", baptized: "是", age: "70后", joinDate: "2024-02-01" },
      { name: "赵六", phone: "13800138004", gender: "女", baptized: "否", age: "00后", joinDate: "2024-02-15" }
    ],
    "group2": [
      { name: "陈七", phone: "13800138005", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-10" },
      { name: "刘八", phone: "13800138006", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-20" },
      { name: "周九", phone: "13800138007", gender: "男", baptized: "否", age: "70后", joinDate: "2024-02-05" },
      { name: "吴十", phone: "13800138008", gender: "女", baptized: "是", age: "80后", joinDate: "2024-02-20" }
    ],
    "group3": [
      { name: "郑十一", phone: "13800138009", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-05" },
      { name: "孙十二", phone: "13800138010", gender: "女", baptized: "是", age: "00后", joinDate: "2024-01-25" },
      { name: "何十三", phone: "13800138011", gender: "男", baptized: "是", age: "80后", joinDate: "2024-02-10" },
      { name: "黄十四", phone: "13800138012", gender: "女", baptized: "否", age: "70后", joinDate: "2024-02-25" }
    ]
  },
  groupNames: {
    "group1": "第一小组",
    "group2": "第二小组", 
    "group3": "第三小组"
  }
};