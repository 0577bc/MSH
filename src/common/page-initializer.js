/**
 * 页面初始化器模块 (page-initializer.js)
 * 功能：统一页面初始化流程，减少代码重复
 * 作者：MSH系统
 * 版本：1.0
 */

import { handleError, handleFirebaseError } from './error-handler.js';

// ==================== 页面初始化器类 ====================

class PageInitializer {
  constructor() {
    this.initializedPages = new Set();
    this.firebaseApp = null;
    this.firebaseDb = null;
  }

  /**
   * 初始化页面
   * @param {string} pageType - 页面类型
   * @param {Object} options - 初始化选项
   * @returns {Promise<Object>} - 初始化结果
   */
  async initializePage(pageType, options = {}) {
    const {
      initializeFirebase = true,
      initializePageSyncManager = true,
      loadData = true,
      initializeEventListeners = true,
      customInitializers = []
    } = options;

    try {
      console.log(`🚀 开始初始化${pageType}页面...`);

      // 1. 初始化Firebase
      if (initializeFirebase) {
        const firebaseResult = await this.initializeFirebase();
        if (!firebaseResult.success) {
          throw new Error('Firebase初始化失败');
        }
      }

      // 2. 初始化页面同步管理器
      if (initializePageSyncManager) {
        const syncResult = this.initializePageSyncManager(pageType);
        if (!syncResult.success) {
          console.warn('页面同步管理器初始化失败，但继续执行');
        }
      }

      // 3. 加载数据
      if (loadData) {
        const dataResult = await this.loadPageData(pageType);
        if (!dataResult.success) {
          throw new Error('数据加载失败');
        }
      }

      // 4. 执行自定义初始化器
      for (const initializer of customInitializers) {
        if (typeof initializer === 'function') {
          await initializer();
        }
      }

      // 5. 初始化事件监听器
      if (initializeEventListeners) {
        this.initializeEventListeners(pageType);
      }

      // 标记页面为已初始化
      this.initializedPages.add(pageType);

      console.log(`✅ ${pageType}页面初始化完成`);
      
      return {
        success: true,
        pageType,
        firebase: this.firebaseApp ? 'initialized' : 'skipped',
        pageSync: initializePageSyncManager ? 'initialized' : 'skipped',
        dataLoaded: loadData ? 'loaded' : 'skipped'
      };

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'high',
        context: { pageType, operation: 'page_initialization' }
      });

      return {
        success: false,
        pageType,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 初始化Firebase
   * @returns {Promise<Object>} - 初始化结果
   */
  async initializeFirebase() {
    try {
      if (this.firebaseApp && this.firebaseDb) {
        console.log('✅ Firebase已初始化，复用现有实例');
        return { success: true, app: this.firebaseApp, db: this.firebaseDb };
      }

      // 检查Firebase配置
      if (!window.firebaseConfig) {
        throw new Error('Firebase配置未找到');
      }

      // 初始化Firebase应用
      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(window.firebaseConfig);
        console.log('✅ 创建新的Firebase应用');
      } else {
        this.firebaseApp = firebase.app();
        console.log('✅ 使用现有Firebase应用');
      }

      // 初始化数据库
      this.firebaseDb = firebase.database();

      // 设置全局变量
      window.app = this.firebaseApp;
      window.db = this.firebaseDb;

      return {
        success: true,
        app: this.firebaseApp,
        db: this.firebaseDb
      };

    } catch (error) {
      const errorResult = handleFirebaseError(error, 'Firebase初始化');
      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 初始化页面同步管理器
   * @param {string} pageType - 页面类型
   * @returns {Object} - 初始化结果
   */
  initializePageSyncManager(pageType) {
    try {
      if (!window.utils || !window.utils.PageSyncManager) {
        throw new Error('页面同步管理器未找到');
      }

      const pageSyncManager = new window.utils.PageSyncManager(pageType);
      window.pageSyncManager = pageSyncManager;
      
      console.log(`${pageType}页面同步管理器初始化完成`);
      
      return {
        success: true,
        manager: pageSyncManager
      };

    } catch (error) {
      handleError(error, {
        type: 'system',
        level: 'medium',
        context: { pageType, operation: 'page_sync_manager_init' }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 加载页面数据
   * @param {string} pageType - 页面类型
   * @returns {Promise<Object>} - 加载结果
   */
  async loadPageData(pageType) {
    try {
      // 根据页面类型加载相应的数据
      switch (pageType) {
        case 'main':
          return await this.loadMainPageData();
        case 'summary':
          return await this.loadSummaryPageData();
        case 'dailyReport':
          return await this.loadDailyReportPageData();
        case 'attendanceRecords':
          return await this.loadAttendanceRecordsPageData();
        default:
          console.log(`⚠️ 未知页面类型: ${pageType}，跳过数据加载`);
          return { success: true };
      }

    } catch (error) {
      const errorResult = handleError(error, {
        type: 'system',
        level: 'high',
        context: { pageType, operation: 'data_loading' }
      });

      return {
        success: false,
        error: errorResult.error,
        message: errorResult.message
      };
    }
  }

  /**
   * 加载主页面数据
   * @returns {Promise<Object>} - 加载结果
   */
  async loadMainPageData() {
    try {
      // 使用NewDataManager加载数据
      if (window.NewDataManager) {
        const result = await window.NewDataManager.loadData();
        if (result.success) {
          console.log('✅ 主页面数据加载成功');
          return { success: true, data: result.data };
        } else {
          throw new Error('NewDataManager数据加载失败');
        }
      } else {
        throw new Error('NewDataManager未找到');
      }

    } catch (error) {
      throw new Error(`主页面数据加载失败: ${error.message}`);
    }
  }

  /**
   * 加载汇总页面数据
   * @returns {Promise<Object>} - 加载结果
   */
  async loadSummaryPageData() {
    try {
      // 汇总页面通常只需要基础数据
      if (window.NewDataManager) {
        const result = await window.NewDataManager.loadBasicData();
        if (result.success) {
          console.log('✅ 汇总页面基础数据加载成功');
          return { success: true, data: result.data };
        } else {
          throw new Error('NewDataManager基础数据加载失败');
        }
      } else {
        throw new Error('NewDataManager未找到');
      }

    } catch (error) {
      throw new Error(`汇总页面数据加载失败: ${error.message}`);
    }
  }

  /**
   * 加载日报页面数据
   * @returns {Promise<Object>} - 加载结果
   */
  async loadDailyReportPageData() {
    try {
      // 日报页面只需要基础数据和当天数据
      if (window.NewDataManager) {
        const result = await window.NewDataManager.loadBasicDataAndToday();
        if (result.success) {
          console.log('✅ 日报页面数据加载成功');
          return { success: true, data: result.data };
        } else {
          throw new Error('NewDataManager数据加载失败');
        }
      } else {
        throw new Error('NewDataManager未找到');
      }

    } catch (error) {
      throw new Error(`日报页面数据加载失败: ${error.message}`);
    }
  }

  /**
   * 加载原始记录页面数据
   * @returns {Promise<Object>} - 加载结果
   */
  async loadAttendanceRecordsPageData() {
    try {
      // 原始记录页面通常按需加载数据
      console.log('✅ 原始记录页面数据按需加载');
      return { success: true };

    } catch (error) {
      throw new Error(`原始记录页面数据加载失败: ${error.message}`);
    }
  }

  /**
   * 初始化事件监听器
   * @param {string} pageType - 页面类型
   */
  initializeEventListeners(pageType) {
    // 基础事件监听器
    this.initializeBasicEventListeners();

    // 页面特定事件监听器
    switch (pageType) {
      case 'main':
        this.initializeMainPageEventListeners();
        break;
      case 'summary':
        this.initializeSummaryPageEventListeners();
        break;
      case 'dailyReport':
        this.initializeDailyReportPageEventListeners();
        break;
      case 'attendanceRecords':
        this.initializeAttendanceRecordsPageEventListeners();
        break;
    }
  }

  /**
   * 初始化基础事件监听器
   */
  initializeBasicEventListeners() {
    // 返回按钮通用处理
    const backButtons = document.querySelectorAll('[id*="backButton"], [class*="back-button"]');
    backButtons.forEach(button => {
      if (!button.hasAttribute('data-listener-added')) {
        button.addEventListener('click', () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = 'index.html';
          }
        });
        button.setAttribute('data-listener-added', 'true');
      }
    });

    // 导出按钮通用处理
    const exportButtons = document.querySelectorAll('[id*="exportButton"], [class*="export-button"]');
    exportButtons.forEach(button => {
      if (!button.hasAttribute('data-listener-added')) {
        button.addEventListener('click', () => {
          this.handleExportAction();
        });
        button.setAttribute('data-listener-added', 'true');
      }
    });
  }

  /**
   * 初始化主页面事件监听器
   */
  initializeMainPageEventListeners() {
    // 主页面特定的事件监听器
    console.log('✅ 主页面事件监听器已初始化');
  }

  /**
   * 初始化汇总页面事件监听器
   */
  initializeSummaryPageEventListeners() {
    // 汇总页面特定的事件监听器
    console.log('✅ 汇总页面事件监听器已初始化');
  }

  /**
   * 初始化日报页面事件监听器
   */
  initializeDailyReportPageEventListeners() {
    // 日报页面特定的事件监听器
    console.log('✅ 日报页面事件监听器已初始化');
  }

  /**
   * 初始化原始记录页面事件监听器
   */
  initializeAttendanceRecordsPageEventListeners() {
    // 原始记录页面特定的事件监听器
    console.log('✅ 原始记录页面事件监听器已初始化');
  }

  /**
   * 处理导出操作
   */
  handleExportAction() {
    // 通用的导出处理逻辑
    console.log('📤 执行导出操作');
    // 这里可以添加通用的导出逻辑
  }

  /**
   * 检查页面是否已初始化
   * @param {string} pageType - 页面类型
   * @returns {boolean} - 是否已初始化
   */
  isPageInitialized(pageType) {
    return this.initializedPages.has(pageType);
  }

  /**
   * 获取初始化状态
   * @returns {Object} - 初始化状态
   */
  getInitializationStatus() {
    return {
      firebase: this.firebaseApp ? 'initialized' : 'not_initialized',
      pages: Array.from(this.initializedPages),
      totalPages: this.initializedPages.size
    };
  }

  /**
   * 重置初始化状态
   */
  reset() {
    this.initializedPages.clear();
    this.firebaseApp = null;
    this.firebaseDb = null;
    console.log('🔄 页面初始化器已重置');
  }
}

// ==================== 便捷函数 ====================

// 创建全局页面初始化器实例
const pageInitializer = new PageInitializer();

/**
 * 便捷页面初始化函数
 * @param {string} pageType - 页面类型
 * @param {Object} options - 初始化选项
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializePage(pageType, options = {}) {
  return await pageInitializer.initializePage(pageType, options);
}

/**
 * 快速初始化主页面
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializeMainPage() {
  return await pageInitializer.initializePage('main', {
    initializeFirebase: true,
    initializePageSyncManager: true,
    loadData: true,
    initializeEventListeners: true
  });
}

/**
 * 快速初始化汇总页面
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializeSummaryPage() {
  return await pageInitializer.initializePage('summary', {
    initializeFirebase: true,
    initializePageSyncManager: true,
    loadData: true,
    initializeEventListeners: true
  });
}

/**
 * 快速初始化日报页面
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializeDailyReportPage() {
  return await pageInitializer.initializePage('dailyReport', {
    initializeFirebase: true,
    initializePageSyncManager: true,
    loadData: true,
    initializeEventListeners: true
  });
}

/**
 * 快速初始化原始记录页面
 * @returns {Promise<Object>} - 初始化结果
 */
export async function initializeAttendanceRecordsPage() {
  return await pageInitializer.initializePage('attendanceRecords', {
    initializeFirebase: true,
    initializePageSyncManager: true,
    loadData: false, // 原始记录页面按需加载
    initializeEventListeners: true
  });
}

// ==================== 导出 ====================

export { PageInitializer, pageInitializer };

// 将便捷函数添加到全局
window.MSHPageInitializer = {
  initialize: initializePage,
  main: initializeMainPage,
  summary: initializeSummaryPage,
  dailyReport: initializeDailyReportPage,
  attendanceRecords: initializeAttendanceRecordsPage,
  getStatus: () => pageInitializer.getInitializationStatus(),
  reset: () => pageInitializer.reset()
};

console.log('✅ 页面初始化器模块已加载');
