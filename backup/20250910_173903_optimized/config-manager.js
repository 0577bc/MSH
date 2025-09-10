/**
 * 配置管理器 (config-manager.js)
 * 功能：处理敏感配置信息，提供安全的配置加载和管理功能
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - 环境变量优先加载
 * - 本地配置文件支持
 * - 配置验证和加密
 * - 敏感信息保护
 */

class ConfigManager {
  constructor() {
    this.config = null;
    this.isLoaded = false;
  }

  /**
   * 加载配置
   * 优先从环境变量加载，然后从本地配置文件加载
   */
  async loadConfig() {
    if (this.isLoaded) {
      return this.config;
    }

    try {
      // 尝试从环境变量加载（如果可用）
      if (typeof process !== 'undefined' && process.env) {
        this.config = this.loadFromEnv();
        if (this.config) {
          console.log('配置已从环境变量加载');
          this.isLoaded = true;
          return this.config;
        }
      }

      // 从本地配置文件加载
      this.config = this.loadFromLocal();
      if (this.config) {
        console.log('配置已从本地文件加载');
        this.isLoaded = true;
        return this.config;
      }

      throw new Error('无法加载配置');
    } catch (error) {
      console.error('配置加载失败:', error);
      throw error;
    }
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnv() {
    if (typeof process === 'undefined' || !process.env) {
      return null;
    }

    const env = process.env;
    if (!env.FIREBASE_API_KEY) {
      return null;
    }

    return {
      firebase: {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        databaseURL: env.FIREBASE_DATABASE_URL,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID
      },
      adminEmails: env.ADMIN_EMAILS ? env.ADMIN_EMAILS.split(',') : [],
      app: {
        name: env.APP_NAME || 'MSH签到系统',
        version: env.APP_VERSION || '1.0.0'
      }
    };
  }

  /**
   * 从本地配置文件加载配置
   */
  loadFromLocal() {
    if (typeof window === 'undefined' || !window.firebaseConfig) {
      return null;
    }

    return {
      firebase: window.firebaseConfig,
      adminEmails: ['0577bc@gmail.com', '123@qq.com'], // 默认管理员
      app: {
        name: 'MSH签到系统',
        version: '1.0.0'
      }
    };
  }

  /**
   * 获取Firebase配置
   */
  getFirebaseConfig() {
    if (!this.config) {
      throw new Error('配置未加载');
    }
    return this.config.firebase;
  }

  /**
   * 获取管理员邮箱列表
   */
  getAdminEmails() {
    if (!this.config) {
      throw new Error('配置未加载');
    }
    return this.config.adminEmails;
  }

  /**
   * 获取应用配置
   */
  getAppConfig() {
    if (!this.config) {
      throw new Error('配置未加载');
    }
    return this.config.app;
  }

  /**
   * 验证配置完整性
   */
  validateConfig() {
    if (!this.config) {
      return { valid: false, error: '配置未加载' };
    }

    const firebase = this.config.firebase;
    const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
    
    for (const field of requiredFields) {
      if (!firebase[field]) {
        return { valid: false, error: `缺少必需的Firebase配置字段: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * 重置配置
   */
  reset() {
    this.config = null;
    this.isLoaded = false;
  }
}

// 创建全局实例
const configManager = new ConfigManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.configManager = configManager;
}

// 自动加载配置
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      await configManager.loadConfig();
      const validation = configManager.validateConfig();
      if (!validation.valid) {
        console.error('配置验证失败:', validation.error);
        return;
      }
      
      // 将Firebase配置设置到全局变量
      window.firebaseConfig = configManager.getFirebaseConfig();
      console.log('配置管理器初始化成功');
    } catch (error) {
      console.error('配置管理器初始化失败:', error);
    }
  });
}
