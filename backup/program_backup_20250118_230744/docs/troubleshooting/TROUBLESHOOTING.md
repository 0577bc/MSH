# MSH签到系统 - 故障排除指南

## 📋 故障排除概述

**系统名称**：MSH签到系统  
**版本**：2.0  
**文档版本**：1.0  
**最后更新**：2025-01-11  
**维护者**：MSH技术团队  

## 🚨 常见问题分类

### **1. 数据同步问题**
### **2. 用户界面问题**
### **3. 性能问题**
### **4. 配置问题**
### **5. 浏览器兼容性问题**
### **6. 初始化问题**
### **7. 数据持久化问题**

## 🔧 数据同步问题

### **问题1：数据同步失败**

#### **症状**
- 页面显示"同步失败"错误
- 数据变更没有保存到Firebase
- 控制台显示同步错误信息

#### **可能原因**
1. 网络连接问题
2. Firebase配置错误
3. 数据格式不正确
4. 权限不足

#### **解决方案**
```javascript
// 1. 检查网络连接
if (!navigator.onLine) {
  console.error('网络连接已断开')
  return
}

// 2. 验证Firebase配置
if (!window.firebaseConfig) {
  console.error('Firebase配置缺失')
  return
}

// 3. 检查数据格式
const isValidData = validateDataFormat(data)
if (!isValidData) {
  console.error('数据格式不正确')
  return
}

// 4. 重试同步
async function retrySync(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await newDataManager.performManualSync()
      break
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('同步重试失败:', error)
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

#### **预防措施**
- 定期检查网络连接
- 验证Firebase配置
- 实施数据验证
- 添加重试机制

### **问题2：数据冲突**

#### **症状**
- 数据在不同设备上不一致
- 同步时出现冲突警告
- 数据被意外覆盖

#### **解决方案**
```javascript
// 1. 检测数据冲突
function detectDataConflict(localData, remoteData) {
  const conflicts = []
  
  for (const key in localData) {
    if (remoteData[key] && localData[key] !== remoteData[key]) {
      conflicts.push({
        key: key,
        local: localData[key],
        remote: remoteData[key]
      })
    }
  }
  
  return conflicts
}

// 2. 解决数据冲突
async function resolveDataConflict(conflicts) {
  for (const conflict of conflicts) {
    // 使用时间戳决定优先级
    if (conflict.local.timestamp > conflict.remote.timestamp) {
      await newDataManager.saveData(conflict.key, conflict.local)
    } else {
      await newDataManager.saveData(conflict.key, conflict.remote)
    }
  }
}
```

### **问题3：数据丢失**

#### **症状**
- 之前保存的数据消失
- 页面刷新后数据丢失
- 备份恢复失败

#### **解决方案**
```javascript
// 1. 从Firebase恢复数据
async function recoverFromFirebase() {
  try {
    const snapshot = await firebase.database().ref().once('value')
    const data = snapshot.val()
    
    if (data) {
      await newDataManager.setData('groups', data.groups || {})
      await newDataManager.setData('attendanceRecords', data.attendanceRecords || [])
      await newDataManager.setData('groupNames', data.groupNames || {})
      console.log('数据恢复成功')
    }
  } catch (error) {
    console.error('数据恢复失败:', error)
  }
}

// 2. 从本地存储恢复
function recoverFromLocalStorage() {
  try {
    const groups = JSON.parse(localStorage.getItem('msh_groups') || '{}')
    const attendanceRecords = JSON.parse(localStorage.getItem('msh_attendanceRecords') || '[]')
    const groupNames = JSON.parse(localStorage.getItem('msh_groupNames') || '{}')
    
    if (Object.keys(groups).length > 0) {
      newDataManager.setData('groups', groups)
      newDataManager.setData('attendanceRecords', attendanceRecords)
      newDataManager.setData('groupNames', groupNames)
      console.log('本地数据恢复成功')
    }
  } catch (error) {
    console.error('本地数据恢复失败:', error)
  }
}
```

## 🎨 用户界面问题

### **问题1：页面无法加载**

#### **症状**
- 页面显示空白
- 控制台显示JavaScript错误
- 资源加载失败

#### **解决方案**
```javascript
// 1. 检查资源加载
function checkResourceLoading() {
  const scripts = document.querySelectorAll('script[src]')
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]')
  
  scripts.forEach(script => {
    script.addEventListener('error', () => {
      console.error('脚本加载失败:', script.src)
    })
  })
  
  stylesheets.forEach(link => {
    link.addEventListener('error', () => {
      console.error('样式表加载失败:', link.href)
    })
  })
}

// 2. 检查Firebase SDK加载
function checkFirebaseSDK() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK未加载')
    return false
  }
  return true
}
```

### **问题2：模态框显示问题**

#### **症状**
- 模态框无法显示
- 模态框显示在错误位置
- 模态框内容不完整

#### **解决方案**
```css
/* 确保模态框样式正确 */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal.show {
  display: block;
}

.modal-content {
  background-color: #fefefe;
  margin: 5% auto;
  padding: 20px;
  border: 1px solid #888;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}
```

```javascript
// 正确的模态框显示方法
function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.style.display = 'block'
    modal.classList.add('show')
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.style.display = 'none'
    modal.classList.remove('show')
  }
}
```

### **问题3：表单验证失败**

#### **症状**
- 表单无法提交
- 验证错误信息不显示
- 必填字段检查失败

#### **解决方案**
```javascript
// 1. 表单验证函数
function validateForm(formId) {
  const form = document.getElementById(formId)
  if (!form) return false
  
  const requiredFields = form.querySelectorAll('[required]')
  let isValid = true
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error')
      showFieldError(field, '此字段为必填项')
      isValid = false
    } else {
      field.classList.remove('error')
      hideFieldError(field)
    }
  })
  
  return isValid
}

// 2. 显示字段错误
function showFieldError(field, message) {
  let errorElement = field.parentNode.querySelector('.field-error')
  if (!errorElement) {
    errorElement = document.createElement('div')
    errorElement.className = 'field-error'
    field.parentNode.appendChild(errorElement)
  }
  errorElement.textContent = message
  errorElement.style.display = 'block'
}

// 3. 隐藏字段错误
function hideFieldError(field) {
  const errorElement = field.parentNode.querySelector('.field-error')
  if (errorElement) {
    errorElement.style.display = 'none'
  }
}
```

## ⚡ 性能问题

### **问题1：页面加载缓慢**

#### **症状**
- 页面加载时间超过3秒
- 资源加载缓慢
- 用户界面响应延迟

#### **解决方案**
```javascript
// 1. 资源预加载
function preloadResources() {
  const criticalResources = [
    './src/new-data-manager.js',
    './src/utils.js',
    './src/style.css'
  ]
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    link.as = resource.endsWith('.js') ? 'script' : 'style'
    document.head.appendChild(link)
  })
}

// 2. 懒加载非关键资源
function lazyLoadResources() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target
        if (element.dataset.src) {
          element.src = element.dataset.src
          observer.unobserve(element)
        }
      }
    })
  })
  
  document.querySelectorAll('[data-src]').forEach(element => {
    observer.observe(element)
  })
}
```

### **问题2：数据操作缓慢**

#### **症状**
- 数据保存时间过长
- 大量数据操作时界面卡顿
- 同步操作超时

#### **解决方案**
```javascript
// 1. 数据操作优化
function optimizeDataOperations() {
  // 批量操作
  const batchOperations = []
  
  function addBatchOperation(operation) {
    batchOperations.push(operation)
    
    if (batchOperations.length >= 10) {
      executeBatchOperations()
    }
  }
  
  function executeBatchOperations() {
    const operations = batchOperations.splice(0, 10)
    Promise.all(operations).then(() => {
      if (batchOperations.length > 0) {
        executeBatchOperations()
      }
    })
  }
}

// 2. 防抖处理
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 使用防抖优化数据保存
const debouncedSave = debounce(async (data) => {
  await newDataManager.saveData('groups', data)
}, 1000)
```

## ⚙️ 配置问题

### **问题1：Firebase配置错误**

#### **症状**
- Firebase连接失败
- 认证错误
- 数据库访问被拒绝

#### **解决方案**
```javascript
// 1. 验证Firebase配置
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ]
  
  const config = window.firebaseConfig
  if (!config) {
    throw new Error('Firebase配置未找到')
  }
  
  const missingFields = requiredFields.filter(field => !config[field])
  if (missingFields.length > 0) {
    throw new Error(`Firebase配置缺少字段: ${missingFields.join(', ')}`)
  }
  
  return true
}

// 2. 测试Firebase连接
async function testFirebaseConnection() {
  try {
    const testRef = firebase.database().ref('test')
    await testRef.set({ timestamp: Date.now() })
    await testRef.remove()
    console.log('Firebase连接测试成功')
    return true
  } catch (error) {
    console.error('Firebase连接测试失败:', error)
    return false
  }
}
```

### **问题2：本地存储问题**

#### **症状**
- 数据无法保存到本地存储
- 本地存储空间不足
- 数据读取失败

#### **解决方案**
```javascript
// 1. 检查本地存储支持
function checkLocalStorageSupport() {
  try {
    const testKey = 'test'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.error('本地存储不支持:', error)
    return false
  }
}

// 2. 检查存储空间
function checkStorageSpace() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
      const used = estimate.usage || 0
      const quota = estimate.quota || 0
      const percentage = (used / quota) * 100
      
      if (percentage > 80) {
        console.warn('本地存储空间不足，使用率:', percentage.toFixed(2) + '%')
      }
    })
  }
}

// 3. 清理过期数据
function cleanupExpiredData() {
  const keys = Object.keys(localStorage)
  const expiredKeys = keys.filter(key => {
    if (key.startsWith('msh_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
          return true
        }
      } catch (error) {
        return true
      }
    }
    return false
  })
  
  expiredKeys.forEach(key => localStorage.removeItem(key))
  console.log('清理过期数据:', expiredKeys.length, '项')
}
```

## 🌐 浏览器兼容性问题

### **问题1：现代浏览器特性不支持**

#### **症状**
- 某些功能在旧浏览器中无法使用
- JavaScript错误
- 样式显示异常

#### **解决方案**
```javascript
// 1. 特性检测
function checkBrowserSupport() {
  const features = {
    localStorage: typeof Storage !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    promise: typeof Promise !== 'undefined',
    async: typeof async !== 'undefined'
  }
  
  const unsupportedFeatures = Object.keys(features).filter(feature => !features[feature])
  
  if (unsupportedFeatures.length > 0) {
    console.warn('不支持的浏览器特性:', unsupportedFeatures.join(', '))
    showBrowserWarning(unsupportedFeatures)
  }
  
  return features
}

// 2. 显示浏览器警告
function showBrowserWarning(unsupportedFeatures) {
  const warning = document.createElement('div')
  warning.className = 'browser-warning'
  warning.innerHTML = `
    <h3>浏览器兼容性警告</h3>
    <p>您的浏览器不支持以下特性: ${unsupportedFeatures.join(', ')}</p>
    <p>建议使用最新版本的Chrome、Firefox、Safari或Edge浏览器</p>
  `
  document.body.insertBefore(warning, document.body.firstChild)
}
```

### **问题2：移动端兼容性问题**

#### **症状**
- 移动设备上界面显示异常
- 触摸操作不响应
- 屏幕适配问题

#### **解决方案**
```css
/* 移动端适配 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10% auto;
    padding: 15px;
  }
  
  .form-group input,
  .form-group select {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .button-group button {
    width: 100%;
    margin-bottom: 10px;
  }
}
```

```javascript
// 移动端触摸事件处理
function handleMobileTouch() {
  if ('ontouchstart' in window) {
    // 添加触摸事件支持
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
}

function handleTouchStart(event) {
  // 处理触摸开始事件
}

function handleTouchMove(event) {
  // 处理触摸移动事件
}

function handleTouchEnd(event) {
  // 处理触摸结束事件
}
```

## 🔍 调试工具

### **1. 内置调试功能**
```javascript
// 启用调试模式
window.DEBUG_MODE = true

// 调试日志
function debugLog(message, data) {
  if (window.DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, data)
  }
}

// 性能监控
function monitorPerformance() {
  if (window.DEBUG_MODE) {
    performance.mark('start')
    
    // 执行操作
    
    performance.mark('end')
    performance.measure('operation', 'start', 'end')
    
    const measure = performance.getEntriesByName('operation')[0]
    console.log('操作耗时:', measure.duration, 'ms')
  }
}
```

### **2. 数据状态检查**
```javascript
// 检查数据状态
function checkDataStatus() {
  const status = {
    groups: newDataManager.getData('groups'),
    attendanceRecords: newDataManager.getData('attendanceRecords'),
    groupNames: newDataManager.getData('groupNames'),
    dailyNewcomers: newDataManager.getDailyNewcomers(),
    syncStatus: newDataManager.getSyncStatus()
  }
  
  console.log('数据状态:', status)
  return status
}

// 检查本地存储
function checkLocalStorage() {
  const storage = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith('msh_')) {
      try {
        storage[key] = JSON.parse(localStorage.getItem(key))
      } catch (error) {
        storage[key] = localStorage.getItem(key)
      }
    }
  }
  
  console.log('本地存储:', storage)
  return storage
}
```

## 📞 技术支持

### **问题报告**
1. **收集信息**：
   - 浏览器版本和类型
   - 操作系统信息
   - 错误信息和截图
   - 复现步骤

2. **联系渠道**：
   - GitHub Issues
   - 系统内置反馈功能
   - 邮件技术支持

### **紧急恢复**
```javascript
// 紧急数据恢复
function emergencyRecovery() {
  // 1. 从Firebase恢复
  recoverFromFirebase()
  
  // 2. 从本地存储恢复
  recoverFromLocalStorage()
  
  // 3. 重置系统状态
  resetSystemState()
  
  // 4. 重新初始化
  initializeSystem()
}
```

## 🔧 初始化问题

### **问题1：Firebase初始化错误**

#### **症状**
- 控制台显示"Firebase: No Firebase App '[DEFAULT]' has been created"
- NewDataManager初始化失败
- 页面功能异常

#### **可能原因**
1. Firebase初始化顺序问题
2. 配置文件错误
3. 网络连接问题

#### **解决方案**
1. **检查Firebase配置**
   ```javascript
   // 在控制台检查
   console.log('Firebase应用数量:', firebase.apps.length);
   console.log('Firebase配置:', firebase.apps[0]?.options);
   ```

2. **等待初始化完成**
   - 刷新页面，等待Firebase完全初始化
   - 检查控制台是否还有错误信息

3. **手动重试**
   ```javascript
   // 在控制台运行
   if (window.newDataManager) {
     window.newDataManager.checkExistingData();
   }
   ```

### **问题2：NewDataManager初始化失败**

#### **症状**
- 显示"NewDataManager设置的全局数据无效"
- 数据加载失败
- 同步功能异常

#### **解决方案**
1. **检查数据完整性**
   ```javascript
   // 检查本地数据
   console.log('本地数据状态:', {
     groups: !!localStorage.getItem('msh_groups'),
     groupNames: !!localStorage.getItem('msh_groupNames'),
     attendanceRecords: !!localStorage.getItem('msh_attendanceRecords'),
     excludedMembers: !!localStorage.getItem('msh_excludedMembers')
   });
   ```

2. **重新初始化**
   - 清除浏览器缓存
   - 刷新页面重新加载

## 🔧 数据持久化问题

### **问题1：添加"未签到不统计人员"后数据丢失**

#### **症状**
- 添加人员后删除缓存，人员消失
- 数据没有同步到Firebase
- 页面刷新后数据丢失

#### **解决方案**
1. **检查数据保护状态**
   ```javascript
   // 检查数据是否受保护
   if (window.newDataManager) {
     console.log('数据保护状态:', window.newDataManager.isDataProtected());
   }
   ```

2. **手动同步数据**
   ```javascript
   // 强制同步到Firebase
   if (window.newDataManager) {
     window.newDataManager.performManualSync();
   }
   ```

3. **检查同步状态**
   ```javascript
   // 检查同步按钮状态
   const syncButton = window.newDataManager?.syncButton;
   console.log('同步按钮状态:', syncButton?.innerHTML);
   ```

### **问题2：数据验证错误**

#### **症状**
- 控制台显示数据验证错误
- 数据被误判为无效
- 本地数据被清理

#### **解决方案**
1. **检查数据格式**
   ```javascript
   // 验证数据格式
   const data = localStorage.getItem('msh_groups');
   if (data) {
     try {
       const parsed = JSON.parse(data);
       console.log('数据格式正确:', typeof parsed === 'object' && !Array.isArray(parsed));
     } catch (error) {
       console.log('数据格式错误:', error.message);
     }
   }
   ```

2. **从Firebase恢复**
   - 等待自动恢复机制
   - 或手动从Firebase重新加载数据

## 📞 技术支持

### **问题报告**
如果遇到上述问题无法解决，请提供以下信息：
1. 浏览器控制台的完整错误日志
2. 问题复现步骤
3. 浏览器版本和操作系统信息
4. 网络连接状态

### **紧急恢复**
```javascript
// 紧急数据恢复脚本
function emergencyDataRecovery() {
  // 1. 清除所有本地数据
  localStorage.clear();
  
  // 2. 重新加载页面
  location.reload();
  
  // 3. 等待系统重新初始化
  console.log('系统正在重新初始化，请稍候...');
}
```

---
*此故障排除指南将根据问题发现和解决持续更新*
