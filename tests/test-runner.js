// 测试运行器
// 管理和执行所有测试用例

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.isRunning = false;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      running: 0
    };
  }

  // 注册测试
  registerTest(test) {
    this.tests.push(test);
    this.updateStats();
  }

  // 注册测试套件
  registerTestSuite(suite) {
    suite.tests.forEach(test => {
      this.registerTest({
        ...test,
        suite: suite.name,
        category: suite.category
      });
    });
  }

  // 运行所有测试
  async runAllTests() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clearResults();
    this.updateStats();
    
    console.log('开始运行所有测试...');
    
    for (const test of this.tests) {
      await this.runTest(test);
    }
    
    this.isRunning = false;
    this.updateStats();
    console.log('所有测试完成');
  }

  // 运行指定类别的测试
  async runTestsByCategory(category) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clearResults();
    this.updateStats();
    
    const categoryTests = this.tests.filter(test => test.category === category);
    console.log(`开始运行${category}测试...`);
    
    for (const test of categoryTests) {
      await this.runTest(test);
    }
    
    this.isRunning = false;
    this.updateStats();
    console.log(`${category}测试完成`);
  }

  // 运行单个测试
  async runTest(test) {
    const testElement = this.getTestElement(test);
    if (testElement) {
      testElement.className = 'test-item running';
      testElement.querySelector('.test-status').textContent = '运行中...';
      testElement.querySelector('.test-status').className = 'test-status running';
    }

    this.stats.running++;
    this.updateStats();

    try {
      const result = await test.fn();
      
      if (result === true || (result && result.passed)) {
        this.results.push({
          test: test,
          status: 'passed',
          message: result.message || '测试通过',
          duration: result.duration || 0
        });
        
        if (testElement) {
          testElement.className = 'test-item passed';
          testElement.querySelector('.test-status').textContent = '通过';
          testElement.querySelector('.test-status').className = 'test-status passed';
        }
        
        this.stats.passed++;
      } else {
        this.results.push({
          test: test,
          status: 'failed',
          message: result.message || '测试失败',
          error: result.error,
          duration: result.duration || 0
        });
        
        if (testElement) {
          testElement.className = 'test-item failed';
          testElement.querySelector('.test-status').textContent = '失败';
          testElement.querySelector('.test-status').className = 'test-status failed';
        }
        
        this.stats.failed++;
      }
    } catch (error) {
      this.results.push({
        test: test,
        status: 'failed',
        message: '测试执行出错',
        error: error.message,
        duration: 0
      });
      
      if (testElement) {
        testElement.className = 'test-item failed';
        testElement.querySelector('.test-status').textContent = '错误';
        testElement.querySelector('.test-status').className = 'test-status failed';
      }
      
      this.stats.failed++;
    }

    this.stats.running--;
    this.updateStats();
  }

  // 获取测试元素
  getTestElement(test) {
    const container = document.getElementById(`${test.category}Tests`);
    if (!container) return null;
    
    const testId = `${test.suite}-${test.name}`.replace(/\s+/g, '-').toLowerCase();
    return document.getElementById(testId);
  }

  // 创建测试元素
  createTestElement(test) {
    const testId = `${test.suite}-${test.name}`.replace(/\s+/g, '-').toLowerCase();
    
    const testElement = document.createElement('div');
    testElement.id = testId;
    testElement.className = 'test-item';
    testElement.innerHTML = `
      <div class="test-name">${test.name}</div>
      <div class="test-status">待运行</div>
    `;
    
    // 添加点击事件显示详情
    testElement.addEventListener('click', () => {
      this.showTestDetails(test);
    });
    
    return testElement;
  }

  // 显示测试详情
  showTestDetails(test) {
    const result = this.results.find(r => r.test === test);
    if (!result) return;
    
    const detailsContainer = document.getElementById('testDetails');
    const resultsContainer = document.getElementById('testResults');
    
    detailsContainer.innerHTML = `
      <h5>${test.name}</h5>
      <p><strong>状态:</strong> ${result.status === 'passed' ? '通过' : '失败'}</p>
      <p><strong>消息:</strong> ${result.message}</p>
      ${result.duration ? `<p><strong>耗时:</strong> ${result.duration}ms</p>` : ''}
      ${result.error ? `<div class="error-details">错误详情: ${result.error}</div>` : ''}
    `;
    
    resultsContainer.style.display = 'block';
  }

  // 更新统计信息
  updateStats() {
    this.stats.total = this.tests.length;
    
    document.getElementById('totalTests').textContent = this.stats.total;
    document.getElementById('passedTests').textContent = this.stats.passed;
    document.getElementById('failedTests').textContent = this.stats.failed;
    document.getElementById('runningTests').textContent = this.stats.running;
  }

  // 清除结果
  clearResults() {
    this.results = [];
    this.stats = {
      total: this.tests.length,
      passed: 0,
      failed: 0,
      running: 0
    };
    
    // 重置所有测试元素
    this.tests.forEach(test => {
      const testElement = this.getTestElement(test);
      if (testElement) {
        testElement.className = 'test-item';
        testElement.querySelector('.test-status').textContent = '待运行';
        testElement.querySelector('.test-status').className = 'test-status';
      }
    });
    
    document.getElementById('testResults').style.display = 'none';
    this.updateStats();
  }

  // 渲染测试列表
  renderTests() {
    // 按类别分组测试
    const categories = ['security', 'data', 'ui', 'sync'];
    
    categories.forEach(category => {
      const container = document.getElementById(`${category}Tests`);
      if (!container) return;
      
      const categoryTests = this.tests.filter(test => test.category === category);
      
      categoryTests.forEach(test => {
        const testElement = this.createTestElement(test);
        container.appendChild(testElement);
      });
    });
  }
}

// 创建全局测试运行器
const testRunner = new TestRunner();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 注册测试套件
  if (window.securityTests) {
    testRunner.registerTestSuite(window.securityTests);
  }
  
  if (window.dataTests) {
    testRunner.registerTestSuite(window.dataTests);
  }
  
  if (window.uiTests) {
    testRunner.registerTestSuite(window.uiTests);
  }
  
  if (window.syncTests) {
    testRunner.registerTestSuite(window.syncTests);
  }
  
  // 渲染测试列表
  testRunner.renderTests();
  
  // 绑定事件
  document.getElementById('runAllTests').addEventListener('click', () => {
    testRunner.runAllTests();
  });
  
  document.getElementById('runSecurityTests').addEventListener('click', () => {
    testRunner.runTestsByCategory('security');
  });
  
  document.getElementById('runDataTests').addEventListener('click', () => {
    testRunner.runTestsByCategory('data');
  });
  
  document.getElementById('runUITests').addEventListener('click', () => {
    testRunner.runTestsByCategory('ui');
  });
  
  document.getElementById('clearResults').addEventListener('click', () => {
    testRunner.clearResults();
  });
});

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.testRunner = testRunner;
}
