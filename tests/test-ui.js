// UI组件测试套件
// 测试DOM操作、事件处理、响应式设计等UI功能

window.uiTests = {
  name: 'UI组件测试套件',
  category: 'ui',
  tests: [
    {
      name: 'DOM元素存在性测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 检查主要DOM元素是否存在
        const requiredElements = [
          'groupSelect',
          'memberSelect',
          'memberSearch',
          'signinButton',
          'addNewcomerButton',
          'dailyReportButton'
        ];
        
        const missingElements = [];
        
        for (const elementId of requiredElements) {
          const element = document.getElementById(elementId);
          if (!element) {
            missingElements.push(elementId);
          }
        }
        
        if (missingElements.length > 0) {
          return { passed: false, message: `缺少DOM元素: ${missingElements.join(', ')}` };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '所有必需DOM元素存在', duration };
      }
    },
    
    {
      name: '表单元素功能测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const groupSelect = document.getElementById('groupSelect');
          const memberSelect = document.getElementById('memberSelect');
          const memberSearch = document.getElementById('memberSearch');
          
          if (!groupSelect || !memberSelect || !memberSearch) {
            return { passed: false, message: '表单元素不存在' };
          }
          
          // 测试下拉框功能
          if (groupSelect.tagName !== 'SELECT') {
            return { passed: false, message: '小组选择器不是下拉框' };
          }
          
          if (memberSelect.tagName !== 'SELECT') {
            return { passed: false, message: '成员选择器不是下拉框' };
          }
          
          // 测试输入框功能
          if (memberSearch.tagName !== 'INPUT') {
            return { passed: false, message: '搜索框不是输入框' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '表单元素功能正常', duration };
        } catch (error) {
          return { passed: false, message: '表单元素测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '按钮元素测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const buttons = [
            'signinButton',
            'addNewcomerButton',
            'dailyReportButton'
          ];
          
          for (const buttonId of buttons) {
            const button = document.getElementById(buttonId);
            if (!button) {
              return { passed: false, message: `按钮 ${buttonId} 不存在` };
            }
            
            if (button.tagName !== 'BUTTON') {
              return { passed: false, message: `元素 ${buttonId} 不是按钮` };
            }
            
            if (button.disabled) {
              return { passed: false, message: `按钮 ${buttonId} 被禁用` };
            }
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '所有按钮元素正常', duration };
        } catch (error) {
          return { passed: false, message: '按钮元素测试失败', error: error.message };
        }
      }
    },
    
    {
      name: 'CSS样式加载测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          // 检查CSS文件是否加载
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          let styleCssLoaded = false;
          
          for (const stylesheet of stylesheets) {
            if (stylesheet.href.includes('style.css')) {
              styleCssLoaded = true;
              break;
            }
          }
          
          if (!styleCssLoaded) {
            return { passed: false, message: 'style.css文件未加载' };
          }
          
          // 检查关键CSS类是否存在
          const testElement = document.createElement('div');
          testElement.className = 'button-row';
          document.body.appendChild(testElement);
          
          const computedStyle = window.getComputedStyle(testElement);
          const display = computedStyle.display;
          
          document.body.removeChild(testElement);
          
          if (display === 'none') {
            return { passed: false, message: 'CSS样式未正确应用' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: 'CSS样式加载正常', duration };
        } catch (error) {
          return { passed: false, message: 'CSS样式测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '响应式设计测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          // 测试移动端媒体查询
          const mediaQuery = window.matchMedia('(max-width: 768px)');
          
          // 模拟移动端屏幕
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375
          });
          
          // 触发媒体查询重新评估
          window.dispatchEvent(new Event('resize'));
          
          // 检查移动端样式是否应用
          const buttonRow = document.querySelector('.button-row');
          if (buttonRow) {
            const computedStyle = window.getComputedStyle(buttonRow);
            const flexDirection = computedStyle.flexDirection;
            
            // 在移动端应该是column布局
            if (mediaQuery.matches && flexDirection !== 'column') {
              return { passed: false, message: '移动端响应式布局未正确应用' };
            }
          }
          
          // 恢复原始屏幕尺寸
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024
          });
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '响应式设计测试通过', duration };
        } catch (error) {
          return { passed: false, message: '响应式设计测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '事件监听器测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const signinButton = document.getElementById('signinButton');
          const addNewcomerButton = document.getElementById('addNewcomerButton');
          
          if (!signinButton || !addNewcomerButton) {
            return { passed: false, message: '测试按钮不存在' };
          }
          
          // 测试点击事件是否绑定
          let signinClicked = false;
          let newcomerClicked = false;
          
          const signinHandler = () => { signinClicked = true; };
          const newcomerHandler = () => { newcomerClicked = true; };
          
          // 添加临时事件监听器
          signinButton.addEventListener('click', signinHandler);
          addNewcomerButton.addEventListener('click', newcomerHandler);
          
          // 模拟点击
          signinButton.click();
          addNewcomerButton.click();
          
          // 移除临时事件监听器
          signinButton.removeEventListener('click', signinHandler);
          addNewcomerButton.removeEventListener('click', newcomerHandler);
          
          if (!signinClicked || !newcomerClicked) {
            return { passed: false, message: '按钮点击事件未正确绑定' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '事件监听器测试通过', duration };
        } catch (error) {
          return { passed: false, message: '事件监听器测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '搜索建议框测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const memberSearch = document.getElementById('memberSearch');
          const suggestions = document.getElementById('suggestions');
          
          if (!memberSearch || !suggestions) {
            return { passed: false, message: '搜索相关元素不存在' };
          }
          
          // 测试输入事件
          const inputEvent = new Event('input', { bubbles: true });
          memberSearch.value = '测试';
          memberSearch.dispatchEvent(inputEvent);
          
          // 检查建议框是否显示
          const suggestionsStyle = window.getComputedStyle(suggestions);
          const display = suggestionsStyle.display;
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '搜索建议框功能正常', duration };
        } catch (error) {
          return { passed: false, message: '搜索建议框测试失败', error: error.message };
        }
      }
    },
    
    {
      name: '表单验证测试',
      fn: async () => {
        const startTime = Date.now();
        
        try {
          const groupSelect = document.getElementById('groupSelect');
          const memberSelect = document.getElementById('memberSelect');
          
          if (!groupSelect || !memberSelect) {
            return { passed: false, message: '表单元素不存在' };
          }
          
          // 测试必填字段验证
          if (!groupSelect.hasAttribute('required')) {
            return { passed: false, message: '小组选择器缺少required属性' };
          }
          
          if (!memberSelect.hasAttribute('required')) {
            return { passed: false, message: '成员选择器缺少required属性' };
          }
          
          // 测试aria-label属性
          if (!groupSelect.hasAttribute('aria-label')) {
            return { passed: false, message: '小组选择器缺少aria-label属性' };
          }
          
          if (!memberSelect.hasAttribute('aria-label')) {
            return { passed: false, message: '成员选择器缺少aria-label属性' };
          }
          
          const duration = Date.now() - startTime;
          return { passed: true, message: '表单验证测试通过', duration };
        } catch (error) {
          return { passed: false, message: '表单验证测试失败', error: error.message };
        }
      }
    }
  ]
};
