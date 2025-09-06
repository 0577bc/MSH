// 演示模式管理器
// 在演示模式下提供模拟的Firebase功能

class DemoMode {
  constructor() {
    this.isDemo = window.isDemoMode || false;
    this.data = {
      groups: window.sampleData?.groups || {},
      groupNames: window.sampleData?.groupNames || {},
      attendanceRecords: []
    };
    
    if (this.isDemo) {
      console.log('🎭 演示模式已启用');
      this.initializeDemoData();
    }
  }

  // 初始化演示数据
  initializeDemoData() {
    // 从localStorage加载或使用默认数据
    const savedData = localStorage.getItem('msh_demo_data');
    if (savedData) {
      try {
        this.data = JSON.parse(savedData);
      } catch (e) {
        console.warn('演示数据加载失败，使用默认数据');
      }
    }
    
    // 确保有默认数据
    if (!this.data.groups || Object.keys(this.data.groups).length === 0) {
      this.data = {
        groups: window.sampleData?.groups || {},
        groupNames: window.sampleData?.groupNames || {},
        attendanceRecords: []
      };
    }
  }

  // 保存数据到localStorage
  saveData() {
    if (this.isDemo) {
      localStorage.setItem('msh_demo_data', JSON.stringify(this.data));
    }
  }

  // 模拟Firebase数据库引用
  ref(path) {
    return {
      once: (eventType) => {
        return new Promise((resolve) => {
          const data = this.getDataByPath(path);
          resolve({
            exists: () => data !== null,
            val: () => data
          });
        });
      },
      set: (value) => {
        return new Promise((resolve) => {
          this.setDataByPath(path, value);
          this.saveData();
          resolve();
        });
      },
      push: (value) => {
        return new Promise((resolve) => {
          const newKey = Date.now().toString();
          this.setDataByPath(path + '/' + newKey, value);
          this.saveData();
          resolve({
            key: newKey
          });
        });
      }
    };
  }

  // 根据路径获取数据
  getDataByPath(path) {
    const keys = path.split('/').filter(key => key !== '');
    let current = this.data;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }

  // 根据路径设置数据
  setDataByPath(path, value) {
    const keys = path.split('/').filter(key => key !== '');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // 获取数据库实例
  database() {
    return {
      ref: (path) => this.ref(path)
    };
  }

  // 获取应用实例
  app() {
    return {
      database: () => this.database()
    };
  }
}

// 创建全局演示模式实例
window.DemoMode = DemoMode;
window.demoMode = new DemoMode();
