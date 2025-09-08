// 数据管理测试套件
// 测试数据加载、保存、缓存等功能

window.dataTests = {
  name: '数据管理测试套件',
  category: 'data',
  tests: [
    {
      name: '数据管理器初始化测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          // 测试数据管理器初始化
          await window.dataManager.initialize();
          
          if (!window.dataManager.isInitialized) {
            return { passed: false, message: '数据管理器初始化失败' };
          }
          
          if (!window.dataManager.db) {
            return { passed: false, message: '数据库连接失败' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '数据管理器初始化成功', duration };
        } catch (error) {
          return { passed: false, message: '数据管理器初始化出错', error: error.message };
        }
      }
    },
    
    {
      name: '数据缓存功能测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          // 清除缓存
          window.dataManager.clearCache();
          
          // 第一次读取（应该从Firebase读取）
          const data1 = await window.dataManager.readData('test-cache', true);
          
          // 第二次读取（应该从缓存读取）
          const data2 = await window.dataManager.readData('test-cache', true);
          
          // 验证缓存是否工作
          if (window.dataManager.cache.has('test-cache')) {
            const duration = Date.now() - startTime;
            return { passed: true, message: '数据缓存功能正常', duration };
          } else {
            return { passed: false, message: '数据缓存未生效' };
          }
        } catch (error) {
          return { passed: false, message: '数据缓存测试出错', error: error.message };
        }
      }
    },
    
    {
      name: '小组数据加载测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const groups = await window.dataManager.loadGroups();
          
          if (typeof groups !== 'object') {
            return { passed: false, message: '小组数据格式错误' };
          }
          
          // 验证小组数据结构
          for (const [groupName, members] of Object.entries(groups)) {
            if (!Array.isArray(members)) {
              return { passed: false, message: `小组 ${groupName} 成员数据格式错误` };
            }
            
            // 验证成员数据结构
            for (const member of members) {
              if (!member.name || typeof member.name !== 'string') {
                return { passed: false, message: `成员数据缺少name字段` };
              }
            }
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '小组数据加载成功', duration };
        } catch (error) {
          return { passed: false, message: '小组数据加载失败', error: error.message };
        }
      }
    },
    
    {
      name: '签到记录加载测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const records = await window.dataManager.loadAttendanceRecords();
          
          if (!Array.isArray(records)) {
            return { passed: false, message: '签到记录格式错误' };
          }
          
          // 验证签到记录数据结构
          for (const record of records) {
            if (!record.name || !record.group || !record.time || !record.timeSlot) {
              return { passed: false, message: '签到记录缺少必要字段' };
            }
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '签到记录加载成功', duration };
        } catch (error) {
          return { passed: false, message: '签到记录加载失败', error: error.message };
        }
      }
    },
    
    {
      name: '数据写入测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const testData = {
            test: true,
            timestamp: Date.now(),
            message: '测试数据'
          };
          
          // 写入测试数据
          await window.dataManager.writeData('test-write', testData);
          
          // 读取验证
          const readData = await window.dataManager.readData('test-write');
          
          if (!readData || readData.test !== true) {
            return { passed: false, message: '数据写入验证失败' };
          }
          
          // 清理测试数据
          await window.dataManager.deleteData('test-write');
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '数据写入测试成功', duration };
        } catch (error) {
          return { passed: false, message: '数据写入测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '数据更新测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const originalData = {
            name: '原始数据',
            value: 100
          };
          
          // 写入原始数据
          await window.dataManager.writeData('test-update', originalData);
          
          // 更新数据
          const updates = {
            value: 200,
            updated: true
          };
          
          await window.dataManager.updateData('test-update', updates);
          
          // 验证更新
          const updatedData = await window.dataManager.readData('test-update');
          
          if (updatedData.value !== 200 || !updatedData.updated) {
            return { passed: false, message: '数据更新验证失败' };
          }
          
          // 清理测试数据
          await window.dataManager.deleteData('test-update');
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '数据更新测试成功', duration };
        } catch (error) {
          return { passed: false, message: '数据更新测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '数据删除测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const testData = { delete: 'me' };
          
          // 写入测试数据
          await window.dataManager.writeData('test-delete', testData);
          
          // 验证数据存在
          const beforeDelete = await window.dataManager.readData('test-delete');
          if (!beforeDelete) {
            return { passed: false, message: '测试数据写入失败' };
          }
          
          // 删除数据
          await window.dataManager.deleteData('test-delete');
          
          // 验证数据已删除
          const afterDelete = await window.dataManager.readData('test-delete');
          if (afterDelete) {
            return { passed: false, message: '数据删除失败' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '数据删除测试成功', duration };
        } catch (error) {
          return { passed: false, message: '数据删除测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '管理员邮箱加载测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const adminEmails = await window.dataManager.loadAdminEmails();
          
          if (!Array.isArray(adminEmails)) {
            return { passed: false, message: '管理员邮箱数据格式错误' };
          }
          
          // 验证邮箱格式
          for (const email of adminEmails) {
            if (typeof email !== 'string' || !email.includes('@')) {
              return { passed: false, message: `无效的管理员邮箱: ${email}` };
            }
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '管理员邮箱加载成功', duration };
        } catch (error) {
          return { passed: false, message: '管理员邮箱加载失败', error: error.message };
        }
      }
    }
  ]
};
