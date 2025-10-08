/**
 * MSH系统配置文件 (config.js)
 * 功能：Firebase配置、示例数据、系统设置
 * 作者：MSH系统
 * 版本：2.0
 * 注意：请替换为您的真实Firebase项目配置
 */

// ==================== Firebase配置 ====================
// 确保在全局作用域中定义配置
if (typeof window !== 'undefined') {
  
  // Firebase配置 - 请替换为您的项目配置
window.firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
}

// 注意：管理员密码现在由Firebase Authentication管理
// 不再需要在此文件中存储密码

// ==================== 外部表单系统配置 ====================
// 外部表单系统API配置（示例）
window.externalFormConfig = {
  // API基础URL - 请替换为您的服务器地址
  apiBaseUrl: 'http://your-server-ip/api',
  
  // 认证配置 - 请替换为您的凭据
  auth: {
    username: 'your-username',
    password: 'your-password',
    token: null // 运行时获取
  },
  
  // API端点
  endpoints: {
    login: '/auth/login',
    forms: '/forms',
    submissions: '/submissions',
    status: '/status',
    // 临时使用forms端点进行数据同步
    syncGroups: '/forms', // 临时使用forms端点
    syncGroupSignin: '/forms', // 临时使用forms端点
    groupSigninData: '/forms' // 临时使用forms端点
  },
  
  // 请求配置
  requestConfig: {
    timeout: 10000, // 10秒超时
    retryAttempts: 3, // 重试次数
    retryDelay: 1000 // 重试延迟(毫秒)
  },
  
  // 功能开关
  features: {
    enableForwarding: true, // 启用转发功能
    enableFetching: true,   // 启用抓取功能
    enableLogging: true     // 启用日志记录
  }
};

// ==================== 示例数据 ====================
// 初始化小组和成员数据（仅在首次运行时使用）
window.sampleData = {
  groups: {
    "group1": [
      { name: "薛高翔", phone: "13736381717", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "郑自欣", phone: "13020909028", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄安磁", phone: "15057314490", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄安晴", phone: "13968714130", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "吴纯洁", phone: "15857727798", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈斌", phone: "15010621653", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "薛佩哈", phone: "", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "陈姣姣", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "薛攀杰", phone: "", gender: "男", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "薛清心", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈晞", phone: "13738762000", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄伟泽", phone: "15257778297", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "郑依", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "高琼依", phone: "", gender: "女", baptized: "是", age: "00后", joinDate: "2024-01-01" }
    ],
    "group2": [
      { name: "梁静静", phone: "13706776354", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "黄鹏程", phone: "15068544958", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "陈斌斌", phone: "15057728111", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "何梅", phone: "15757791525", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈環", phone: "18767775120", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "林猛", phone: "17867875225", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "培茹", phone: "13806867628", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄特", phone: "18267877666", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "薛立达", phone: "", gender: "男", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "紫薇", phone: "", gender: "女", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "茜茜", phone: "", gender: "女", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "微英", phone: "", gender: "女", baptized: "否", age: "85后", joinDate: "2024-01-01" }
    ],
    "group3": [
      { name: "张亮", phone: "15857734777", gender: "女", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "李晓微", phone: "18072102221", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "陈立杨", phone: "13587807751", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "陈琼央", phone: "13867776936", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "黄慧诺", phone: "15057501139", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄晓静", phone: "13506676338", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "薛特", phone: "13738712345", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "黄达", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "历庆仁", phone: "", gender: "男", baptized: "否", age: "85后", joinDate: "2024-01-01" },
      { name: "悯乐", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "张熙", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "薛丽娜", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "娅妮", phone: "", gender: "女", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "赵军", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "孙锐", phone: "", gender: "女", baptized: "是", age: "70后", joinDate: "2024-01-01" },
      { name: "黄高乐", phone: "", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "曹晓挺", phone: "", gender: "男", baptized: "否", age: "80后", joinDate: "2024-01-01" },
      { name: "小红", phone: "18958881138", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" }
    ],
    "group4": [
      { name: "尚晓杰", phone: "13806607211", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄腾宇", phone: "13505872172", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄冬晨", phone: "13806605327", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "倪露露", phone: "15258768714", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈克", phone: "", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "亚丽", phone: "", gender: "女", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "素珍", phone: "", gender: "女", baptized: "否", age: "80后", joinDate: "2024-01-01" },
      { name: "安安", phone: "", gender: "女", baptized: "否", age: "95后", joinDate: "2024-01-01" },
      { name: "宸澳", phone: "", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "世尉", phone: "", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "媛媛", phone: "", gender: "女", baptized: "否", age: "90后", joinDate: "2024-01-01" }
    ],
    "group5": [
      { name: "李桂武", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "黄晓琼", phone: "668141", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "翁丽娜", phone: "15858775032", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "钱道阳", phone: "18067781919", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "包晓丹", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "王慧琴", phone: "18758771625", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "陈英", phone: "13251053327", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "婷婷", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "钱永哲", phone: "15224177722", gender: "男", baptized: "否", age: "85后", joinDate: "2024-01-01" }
    ],
    "group6": [
      { name: "钱茜茜", phone: "15058779690", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "张楠", phone: "13504333771", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "钱云存", phone: "13587763331", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "黄丽静", phone: "13588952892", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "黄约琴", phone: "13868375557", gender: "女", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "曹信勇", phone: "13995766650", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "钱素兰", phone: "18867718872", gender: "女", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "郑晨明", phone: "13736370274", gender: "男", baptized: "是", age: "80后", joinDate: "2024-01-01" },
      { name: "钱璐璐", phone: "", gender: "女", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "钱稳妥", phone: "", gender: "男", baptized: "是", age: "00后", joinDate: "2024-01-01" },
      { name: "陈赞卓", phone: "", gender: "男", baptized: "否", age: "75后", joinDate: "2024-01-01" }
    ],
    "group7": [
      { name: "琼娜", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "钱佳满", phone: "15057506115", gender: "男", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "钱佳佳", phone: "15088985123", gender: "女", baptized: "是", age: "95后", joinDate: "2024-01-01" },
      { name: "陈贝托", phone: "", gender: "男", baptized: "是", age: "00后", joinDate: "2024-01-01" },
      { name: "王东武", phone: "13695710902", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "倪庆锡", phone: "", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "玉洁", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "伟建", phone: "", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "陈豪", phone: "", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "奥诺", phone: "", gender: "女", baptized: "是", age: "85后", joinDate: "2024-01-01" },
      { name: "颜泽", phone: "", gender: "男", baptized: "否", age: "90后", joinDate: "2024-01-01" },
      { name: "晓伟", phone: "", gender: "男", baptized: "是", age: "85后", joinDate: "2024-01-01" }
    ],
    "group8": [
      { name: "南弈格", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "薛程远", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱淼", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱佳怡", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱彬诺", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈裕蕾", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "刘凯歌", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "高琪", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "高凡", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈凯祈", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈天望", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱高涵", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "郑冰西", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "高嘉达", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱诺依", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱莉诺", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈智博", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "郑和", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "薛智杰", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "郑茜尹", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "赵纤莹", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈瑜蔓", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱子航", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "钱俊杰", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈弈豪", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "郑策", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈娇娇", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈诺依", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "刘凯涵", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "诗楠", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "于方", phone: "", gender: "男", baptized: "是", age: "90后", joinDate: "2024-01-01" },
      { name: "陈可欣", phone: "", gender: "女", baptized: "是", age: "90后", joinDate: "2024-01-01" }
    ],
    "group0": []
  },
  groupNames: {
    "group1": "陈薛尚",
    "group2": "花园小家",  // 小组名称已修改
    "group3": "乐清2组",
    "group4": "乐清3组",
    "group5": "木山后",
    "group6": "七里港",
    "group7": "琼娜组",
    "group8": "美团组",
    "group0": "未分组"
  }
};