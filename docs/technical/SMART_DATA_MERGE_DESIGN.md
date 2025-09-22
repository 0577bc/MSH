# 智能数据合并方案设计

**日期**: 2025-09-21  
**目标**: 解决签到页面数据同步时的数据丢失问题  

## 问题分析

### 当前问题
1. **数据覆盖**: `loadAllDataFromFirebase()` 完全覆盖本地数据
2. **新增数据丢失**: 本地添加的新朋友等数据在同步时丢失
3. **缺乏智能合并**: 没有时间戳比较和冲突解决机制

### 影响场景
- 用户在index页面添加新朋友
- 切换到其他页面时触发数据同步
- 本地新增数据被Firebase旧数据覆盖

## 智能合并策略

### 1. 数据分类策略

#### 1.1 新增数据（本地独有）
- **识别**: 本地有，Firebase没有的数据
- **处理**: 保留本地数据，推送到Firebase
- **示例**: 新添加的朋友、新的签到记录

#### 1.2 更新数据（Firebase独有）
- **识别**: Firebase有，本地没有的数据
- **处理**: 从Firebase拉取到本地
- **示例**: 其他用户添加的数据

#### 1.3 冲突数据（两边都有）
- **识别**: 本地和Firebase都有相同ID的数据，但内容不同
- **处理**: 基于时间戳选择最新版本
- **示例**: 同一条签到记录被不同用户修改

### 2. 时间戳机制

#### 2.1 数据时间戳
```javascript
{
  "dataType": "groups",
  "lastModified": 1695292800000,  // 最后修改时间
  "version": 1,                   // 版本号
  "source": "local|firebase"      // 数据来源
}
```

#### 2.2 记录级时间戳
```javascript
{
  "uuid": "member-uuid",
  "name": "张三",
  "createdAt": 1695292800000,     // 创建时间
  "updatedAt": 1695292900000,     // 更新时间
  "source": "local|firebase"      // 数据来源
}
```

### 3. 合并算法

#### 3.1 三路合并算法
```javascript
function smartMerge(localData, firebaseData, baseData) {
  const result = {};
  
  // 获取所有唯一ID
  const allIds = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(firebaseData || {}),
    ...Object.keys(baseData || {})
  ]);
  
  for (const id of allIds) {
    const local = localData[id];
    const firebase = firebaseData[id];
    const base = baseData[id];
    
    if (local && firebase) {
      // 冲突解决：选择最新版本
      result[id] = resolveConflict(local, firebase, base);
    } else if (local) {
      // 本地独有：保留本地数据
      result[id] = local;
    } else if (firebase) {
      // Firebase独有：使用Firebase数据
      result[id] = firebase;
    }
  }
  
  return result;
}
```

#### 3.2 冲突解决策略
```javascript
function resolveConflict(local, firebase, base) {
  // 基于时间戳选择最新版本
  const localTime = local.updatedAt || local.createdAt || 0;
  const firebaseTime = firebase.updatedAt || firebase.createdAt || 0;
  
  if (localTime > firebaseTime) {
    return local;  // 本地更新
  } else if (firebaseTime > localTime) {
    return firebase;  // Firebase更新
  } else {
    // 时间相同，基于数据完整性选择
    return local.length > firebase.length ? local : firebase;
  }
}
```

## 实现方案

### 1. 数据结构扩展

#### 1.1 添加元数据字段
```javascript
// 在NewDataManager中添加
this.metadata = {
  groups: {
    lastSync: null,
    version: 0,
    conflicts: []
  },
  attendanceRecords: {
    lastSync: null,
    version: 0,
    conflicts: []
  }
};
```

#### 1.2 记录级元数据
```javascript
// 为每个数据项添加元数据
{
  "uuid": "member-uuid",
  "name": "张三",
  "group": "小组1",
  "_metadata": {
    "createdAt": 1695292800000,
    "updatedAt": 1695292900000,
    "source": "local",
    "version": 1
  }
}
```

### 2. 智能合并方法

#### 2.1 新的loadAllDataFromFirebase方法
```javascript
async loadAllDataFromFirebaseWithMerge() {
  try {
    // 1. 获取本地数据
    const localData = this.getAllLocalData();
    
    // 2. 获取Firebase数据
    const firebaseData = await this.getFirebaseData();
    
    // 3. 获取基础数据（上次同步的数据）
    const baseData = this.getBaseData();
    
    // 4. 执行智能合并
    const mergedData = this.smartMerge(localData, firebaseData, baseData);
    
    // 5. 保存合并结果
    this.saveMergedData(mergedData);
    
    // 6. 更新元数据
    this.updateMetadata(mergedData);
    
    return true;
  } catch (error) {
    console.error('智能合并失败:', error);
    return false;
  }
}
```

#### 2.2 智能合并核心方法
```javascript
smartMerge(localData, firebaseData, baseData) {
  const merged = {};
  
  // 合并各种数据类型
  merged.groups = this.mergeGroups(
    localData.groups, 
    firebaseData.groups, 
    baseData.groups
  );
  
  merged.attendanceRecords = this.mergeAttendanceRecords(
    localData.attendanceRecords, 
    firebaseData.attendanceRecords, 
    baseData.attendanceRecords
  );
  
  merged.groupNames = this.mergeGroupNames(
    localData.groupNames, 
    firebaseData.groupNames, 
    baseData.groupNames
  );
  
  return merged;
}
```

### 3. 用户交互优化

#### 3.1 合并预览界面
```javascript
function showMergePreview(conflicts, newData, lostData) {
  const preview = `
    <div class="merge-preview">
      <h3>数据合并预览</h3>
      <div class="conflicts">
        <h4>冲突数据 (${conflicts.length}项)</h4>
        ${conflicts.map(conflict => `
          <div class="conflict-item">
            <p>${conflict.type}: ${conflict.description}</p>
            <div class="options">
              <button onclick="resolveConflict('${conflict.id}', 'local')">保留本地</button>
              <button onclick="resolveConflict('${conflict.id}', 'firebase')">使用远程</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="new-data">
        <h4>新增数据 (${newData.length}项)</h4>
        <p>将保留本地新增的数据</p>
      </div>
      <div class="lost-data">
        <h4>远程更新 (${lostData.length}项)</h4>
        <p>将从远程获取更新的数据</p>
      </div>
      <div class="actions">
        <button onclick="confirmMerge()">确认合并</button>
        <button onclick="cancelMerge()">取消合并</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', preview);
}
```

#### 3.2 自动合并模式
```javascript
function enableAutoMerge() {
  // 对于非冲突数据，自动合并
  // 对于冲突数据，基于时间戳自动选择最新版本
  // 记录所有合并操作，供用户查看
}
```

## 实施计划

### 阶段1: 基础架构
1. 扩展数据结构，添加时间戳和元数据
2. 实现基础的时间戳比较机制
3. 添加数据来源标识

### 阶段2: 合并算法
1. 实现三路合并算法
2. 添加冲突检测和解决机制
3. 实现数据完整性验证

### 阶段3: 用户界面
1. 设计合并预览界面
2. 实现用户交互功能
3. 添加合并历史记录

### 阶段4: 优化和测试
1. 性能优化
2. 边界情况处理
3. 用户接受度测试

## 预期效果

### 解决的问题
- ✅ 新朋友数据不再丢失
- ✅ 多用户协作时数据冲突得到解决
- ✅ 用户体验显著提升
- ✅ 数据安全性增强

### 性能影响
- 合并操作增加约200-500ms处理时间
- 存储空间增加约10-15%（元数据）
- 网络传输量基本不变

### 兼容性
- 向后兼容现有数据结构
- 渐进式升级，不影响现有功能
- 可回退到原有同步机制

---

**设计人员**: AI Assistant  
**审核状态**: 待审核  
**实施状态**: 设计阶段
