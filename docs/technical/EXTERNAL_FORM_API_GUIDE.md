# 外部表单API搭建指南 - 百数云集成版本

## 概述

本文档指导如何基于百数云平台搭建外部表单API，用于接收MSH签到系统的事件转发和提供数据抓取功能。百数云是一个专业的表单数据管理平台，提供完善的API接口支持。

### 百数云平台信息
- **平台地址**: https://pub.baishuyun.com
- **API文档**: https://doc.baishuyun.com
- **应用ID**: 5513db246bbb9265042980b6

## 百数云API集成方案

### 1. 百数云API认证

百数云API需要进行身份认证，通常使用以下方式：
- **应用密钥认证**: 通过App Key和App Secret进行认证
- **Token认证**: 使用访问令牌进行API调用

### 2. 数据新增API - 基于百数云规范

**功能**: 将MSH系统事件数据新增到百数云表单

**API端点**: `https://pub.baishuyun.com/webapi/entry/app/{appId}`
- `appId`: 5513db246bbb9265042980b6

**请求方法**: POST

**请求头**:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {access_token}
```

**请求体示例**（百数云格式）:
```json
{
  "data": {
    "事件编号": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
    "成员花名": "张三",
    "成员UUID": "dd10a783-86b5-471d-8796-22f88c7ada7e",
    "组别": "乐清1组",
    "开始日期": "2025-08-03",
    "连续缺勤次数": 3,
    "数据源": "msh-tracking",
    "创建时间": "2025-09-27T10:30:00Z",
    "状态": "待处理"
  }
}
```

**响应示例**（百数云格式）:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": "64f8b5a2c8e7d40001234567",
    "created_at": "2025-09-27T10:30:00Z"
  }
}
```

### 3. 数据查询API - 基于百数云规范

**功能**: 获取已填写的表单数据

**API端点**: `https://pub.baishuyun.com/webapi/query/app/{appId}`
- `appId`: 5513db246bbb9265042980b6

**请求方法**: GET

**请求参数**:
```
?filter={"事件编号":"dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1"}
&limit=1
&sort={"创建时间":-1}
```

**请求头**:
```
Authorization: Bearer {access_token}
Accept: application/json
```

**响应示例**（百数云格式）:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "64f8b5a2c8e7d40001234567",
        "事件编号": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
        "成员花名": "张三",
        "跟踪日期": "2025-09-27",
        "跟踪内容": "已联系成员，了解缺勤原因...",
        "跟踪方式": "电话联系",
        "跟踪人员": "李牧师",
        "事件状态": "已解决",
        "备注": "成员表示会参加下次聚会",
        "创建时间": "2025-09-27T10:30:00Z",
        "更新时间": "2025-09-27T14:30:00Z"
      }
    ],
    "total": 1
  }
}
```

## 百数云集成技术实现

### MSH系统端集成代码更新

**修改 `src/sunday-tracking.js` 中的转发功能**
```javascript
// 更新转发函数以支持百数云API
async function forwardToExternalForm(eventId) {
  try {
    console.log(`🔄 开始转发事件到百数云: ${eventId}`);
    showLoadingState('正在转发到百数云表单...');
    
    // 获取事件详情
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
    // 构建百数云格式的数据
    const baishuyunData = {
      data: {
        "事件编号": eventId,
        "成员花名": eventRecord.memberName || '未知成员',
        "成员UUID": eventRecord.memberUUID || eventId,
        "组别": eventRecord.group || eventRecord.originalGroup || '未知组别',
        "开始日期": eventRecord.startDate || new Date().toISOString().split('T')[0],
        "连续缺勤次数": eventRecord.consecutiveAbsences || 0,
        "数据源": "msh-tracking",
        "创建时间": new Date().toISOString(),
        "状态": "待处理"
      }
    };
    
    // 发送到百数云API
    const apiUrl = 'https://pub.baishuyun.com/webapi/entry/app/5513db246bbb9265042980b6';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + getBaishuyunToken() // 需要实现获取token的函数
      },
      body: JSON.stringify(baishuyunData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📤 百数云API响应:', result);
    
    if (result.code === 200) {
      showNotification('事件已成功转发到百数云表单！', 'success');
      console.log('✅ 转发到百数云成功');
    } else {
      throw new Error(result.msg || '转发失败');
    }
    
  } catch (error) {
    console.error('❌ 转发到百数云失败:', error);
    showNotification('转发失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

// 抓取函数更新
async function fetchExternalFormData(eventId) {
  try {
    console.log(`🔄 开始从百数云抓取数据: ${eventId}`);
    showLoadingState('正在从百数云抓取数据...');
    
    // 构建查询参数
    const filter = encodeURIComponent(JSON.stringify({"事件编号": eventId}));
    const apiUrl = `https://pub.baishuyun.com/webapi/query/app/5513db246bbb9265042980b6?filter=${filter}&limit=1&sort=${encodeURIComponent(JSON.stringify({"创建时间":-1}))}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + getBaishuyunToken(),
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📥 百数云查询响应:', result);
    
    if (result.code === 200 && result.data.list.length > 0) {
      const formData = result.data.list[0];
      
      // 转换百数云数据格式到MSH格式
      const processedData = {
        eventId: eventId,
        trackingDate: formData["跟踪日期"],
        content: formData["跟踪内容"],
        category: formData["跟踪方式"],
        person: formData["跟踪人员"],
        status: formData["事件状态"],
        notes: formData["备注"]
      };
      
      await processExternalFormData(eventId, processedData);
      showNotification('成功从百数云抓取到跟踪数据！', 'success');
    } else {
      showNotification('未找到相关跟踪数据', 'warning');
    }
    
  } catch (error) {
    console.error('❌ 从百数云抓取数据失败:', error);
    showNotification('抓取失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

// 百数云Token管理
function getBaishuyunToken() {
  // 从配置或环境变量获取token
  return localStorage.getItem('baishuyun_token') || process.env.BAISHUYUN_TOKEN || '';
}
```

### 配置文件更新

**在 `config.js` 中添加百数云配置**
```javascript
// 百数云配置
const BAISHUYUN_CONFIG = {
  baseUrl: 'https://pub.baishuyun.com',
  appId: '5513db246bbb9265042980b6',
  apiEndpoints: {
    entry: '/webapi/entry/app/',
    query: '/webapi/query/app/',
    auth: '/webapi/auth/'
  },
  // 认证配置
  auth: {
    type: 'bearer', // 或 'api_key'
    tokenKey: 'baishuyun_token'
  }
};
```

## 百数云表单字段映射

### 表单字段设计

在百数云平台中，需要创建包含以下字段的表单：

| 字段名称 | 字段类型 | 是否必填 | 说明 |
|----------|----------|----------|------|
| 事件编号 | 单行文本 | 是 | 事件唯一标识 |
| 成员花名 | 单行文本 | 是 | 成员花名（非真实姓名） |
| 成员UUID | 单行文本 | 是 | 成员唯一标识 |
| 组别 | 单行文本 | 是 | 所属小组 |
| 开始日期 | 日期 | 是 | 缺勤开始日期 |
| 连续缺勤次数 | 数字 | 是 | 连续缺勤次数 |
| 数据源 | 单行文本 | 否 | 固定值: msh-tracking |
| 创建时间 | 日期时间 | 是 | 记录创建时间 |
| 状态 | 下拉选择 | 是 | 待处理/处理中/已解决 |
| 跟踪日期 | 日期 | 否 | 跟踪联系日期 |
| 跟踪内容 | 多行文本 | 否 | 跟踪详细内容 |
| 跟踪方式 | 下拉选择 | 否 | 电话联系/微信联系/上门拜访/其他 |
| 跟踪人员 | 单行文本 | 否 | 跟踪人员姓名 |
| 事件状态 | 下拉选择 | 否 | 待处理/已解决/持续跟踪 |
| 备注 | 多行文本 | 否 | 其他备注信息 |

## 部署和配置指南

### 1. 百数云账号配置

**步骤1: 注册百数云账号**
1. 访问 https://pub.baishuyun.com
2. 注册企业账号或个人账号
3. 完成邮箱验证

**步骤2: 创建应用表单**
1. 登录百数云控制台
2. 创建新的表单应用
3. 按照上述字段映射表配置表单字段
4. 获取应用ID: `5513db246bbb9265042980b6`

**步骤3: 获取应用ID和API认证信息**

**获取应用ID**：
1. 在应用URL中查找：`app/`后面的部分即为应用ID
2. 或使用百数云函数：`app.getcurrentinfo()` 获取应用信息
3. 记录应用ID（如：`5513db246bbb9265042980b6`）

**获取API认证信息**：
1. 进入应用设置页面 → API设置
2. 启用API访问权限（可能需要付费版本）
3. 生成API访问密钥（App Key & App Secret）
4. 或配置OAuth2.0认证
5. 记录认证信息

**注意**：API权限通常需要付费版本支持，免费版可能无法使用API功能

### 2. MSH系统配置

**步骤1: 更新配置文件**
在 `config.js` 中添加百数云配置（如前面代码所示）

**步骤2: 配置认证信息**
```javascript
// 在localStorage中设置百数云token
localStorage.setItem('baishuyun_token', 'your_access_token_here');
```

**步骤3: 更新集成代码**
替换 `src/sunday-tracking.js` 中的 `forwardToExternalForm` 和 `fetchExternalFormData` 函数

### 3. 安全配置

**API安全设置**
- 使用HTTPS协议确保数据传输安全
- 定期更新API访问密钥
- 设置IP白名单限制访问
- 实施API调用频率限制

**数据安全考虑**
- 敏感数据加密存储
- 定期备份表单数据
- 访问日志记录和监控
- 符合数据保护法规

## 测试和验证

### 1. API测试方案

**测试转发功能**
```javascript
// 测试转发到百数云
async function testForwardToBaishuyun() {
  const testEventId = 'test-event-123';
  try {
    await forwardToExternalForm(testEventId);
    console.log('✅ 转发测试成功');
  } catch (error) {
    console.error('❌ 转发测试失败:', error);
  }
}

// 测试数据抓取
async function testFetchFromBaishuyun() {
  const testEventId = 'test-event-123';
  try {
    await fetchExternalFormData(testEventId);
    console.log('✅ 抓取测试成功');
  } catch (error) {
    console.error('❌ 抓取测试失败:', error);
  }
}
```

### 2. 验证清单

**转发功能验证**
- [ ] 事件数据成功发送到百数云
- [ ] 百数云返回正确的响应格式
- [ ] 错误处理机制正常工作
- [ ] 用户收到成功/失败通知

**抓取功能验证**
- [ ] 能够查询到对应的表单数据
- [ ] 数据格式转换正确
- [ ] 数据成功更新到MSH系统
- [ ] 处理空数据情况

### 3. 性能测试

**负载测试**
- 同时转发多个事件
- 测试API响应时间
- 验证并发请求处理能力

**稳定性测试**
- 长时间运行测试
- 网络异常恢复测试
- 数据一致性验证

## 维护和监控

### 1. 日常维护

**定期检查项目**
- API调用成功率监控
- 数据同步状态检查
- 错误日志审查
- 访问令牌有效性验证

**备份策略**
- 百数云表单数据定期导出
- MSH系统数据备份
- 配置文件备份

### 2. 故障处理

**常见问题**
1. **认证失败**: 检查Token是否过期，重新获取访问令牌
2. **数据格式错误**: 验证字段映射和数据类型
3. **网络超时**: 检查网络连接和API服务状态
4. **权限不足**: 确认API密钥权限配置

**故障恢复流程**
1. 识别问题类型
2. 查看错误日志
3. 执行对应修复方案
4. 验证修复效果
5. 记录问题和解决方案

### 3. 优化建议

**性能优化**
- 实施请求缓存机制
- 优化数据传输格式
- 使用批量操作减少API调用

**用户体验优化**
- 添加进度指示器
- 改进错误提示信息
- 支持离线数据同步

## 文档维护

### 更新记录
- **2025-09-27**: 基于百数云平台重新设计API集成方案
- **2025-09-27**: 更新MSH系统集成代码示例
- **2025-09-27**: 添加详细的配置和测试指南
- **2025-09-27**: 更新字段映射：转发花名而非姓名，完善应用ID获取方法

### 相关文档
- [MSH项目概述](../../PROJECT-OVERVIEW.md)
- [技术设计文档](./EXTERNAL_FORM_INTEGRATION.md)
- [百数云官方文档](https://doc.baishuyun.com)

---

**创建时间**: 2025-09-27  
**版本**: 2.0 - 百数云集成版  
**维护者**: MSH开发团队  
**最后更新**: 2025-09-27  
**参考链接**: https://pub.baishuyun.com/webapi/docinfo/app/5513db246bbb9265042980b6/overview