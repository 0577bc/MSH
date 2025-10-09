/**
 * 智能配置文件加载器
 * 根据环境自动选择正确的配置文件
 */

(function() {
  'use strict';
  
  // 检查是否在Vercel环境（通过域名判断）
  const isVercel = window.location.hostname.includes('vercel.app') || 
                   window.location.hostname.includes('vercel.com');
  
  // 同步加载配置文件
  function loadConfigSync() {
    if (isVercel) {
      console.log('🌐 检测到Vercel环境，同步加载config.vercel.js');
      // 直接写入script标签，确保同步加载
      document.write('<script src="./config.vercel.js"><\/script>');
    } else {
      console.log('🏠 检测到本地环境，同步加载config.js');
      // 直接写入script标签，确保同步加载
      document.write('<script src="./config.js"><\/script>');
    }
  }
  
  // 异步加载配置文件的备用方案
  function loadConfigAsync() {
    const script = document.createElement('script');
    
    if (isVercel) {
      script.src = './config.vercel.js';
      console.log('🌐 检测到Vercel环境，异步加载config.vercel.js');
    } else {
      script.src = './config.js';
      console.log('🏠 检测到本地环境，异步加载config.js');
    }
    
    // 错误处理：如果主要配置文件加载失败，尝试降级
    script.onerror = function() {
      console.error('❌ 配置文件加载失败:', script.src);
      
      // 降级到另一个配置文件
      const fallbackScript = document.createElement('script');
      if (isVercel) {
        fallbackScript.src = './config.js';
        console.log('🔄 降级到config.js');
      } else {
        fallbackScript.src = './config.vercel.js';
        console.log('🔄 降级到config.vercel.js');
      }
      
      // 如果降级也失败，提供错误信息
      fallbackScript.onerror = function() {
        console.error('❌ 所有配置文件加载失败！');
        console.error('请检查以下文件是否存在：');
        console.error('- config.js (本地环境)');
        console.error('- config.vercel.js (Vercel环境)');
      };
      
      document.head.appendChild(fallbackScript);
    };
    
    // 成功加载的回调
    script.onload = function() {
      console.log('✅ 配置文件加载成功:', script.src);
    };
    
    document.head.appendChild(script);
  }
  
  // 尝试同步加载，如果失败则使用异步加载
  try {
    loadConfigSync();
  } catch (error) {
    console.warn('⚠️ 同步加载失败，使用异步加载:', error);
    loadConfigAsync();
  }
  
  // 导出函数供其他脚本使用
  window.loadSmartConfig = loadConfigAsync;
})();
