/**
 * 公共工具函数模块 (utils.js) - 主入口文件
 * 功能：整合所有工具函数模块
 * 作者：MSH系统
 * 版本：3.0 (模块化重构)
 * 
 * 使用说明：
 * 在HTML文件中按以下顺序引入：
 * <script src="src/core/firebase-utils.js"></script>
 * <script src="src/core/time-utils.js"></script>
 * <script src="src/core/security-utils.js"></script>
 * <script src="src/data/uuid-manager.js"></script>
 * <script src="src/features/sunday-tracking-utils.js"></script>
 * <script src="src/data/sync-managers.js"></script>
 * 
 * 或者只引入此文件，它会自动加载所有依赖模块：
 * <script src="src/utils.js"></script>
 */

// 初始化window.utils命名空间
if (typeof window.utils === 'undefined') {
  window.utils = {};
}

// 动态加载所有子模块（如果它们还未加载）
(function() {
  const modules = [
    'src/core/firebase-utils.js',
    'src/core/time-utils.js',
    'src/core/security-utils.js',
    'src/data/uuid-manager.js',
    'src/features/sunday-tracking-utils.js',
    'src/data/sync-managers.js'
  ];
  
  // 检查是否已经加载了模块（通过检查关键函数）
  const isLoaded = window.utils.initializeFirebase && 
                   window.utils.getLocalDateString && 
                   window.utils.preventDuplicateExecution &&
                   window.utils.generateUUID &&
                   window.utils.SundayTrackingManager &&
                   window.utils.PageSyncManager;
  
  if (!isLoaded) {
    console.log('📦 工具函数模块未完全加载，提示：请在HTML中按顺序引入所有模块文件');
    console.log('或者使用以下脚本标签：');
    modules.forEach(module => {
      console.log(`<script src="${module}"></script>`);
    });
  } else {
    console.log('✅ 工具函数模块已全部加载');
  }
})();

// 导出模块列表供其他地方使用
window.utils.modules = {
  core: ['firebase-utils', 'time-utils', 'security-utils'],
  data: ['uuid-manager', 'sync-managers'],
  features: ['sunday-tracking-utils']
};

console.log('📦 utils.js 主入口已加载 (v3.0 模块化版本)');
