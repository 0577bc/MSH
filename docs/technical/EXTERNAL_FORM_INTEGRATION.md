# 外部表单集成技术文档

## 概述

本文档描述了MSH签到系统与外部表单系统（pub.baishuyun.com）的集成方案，实现主日跟踪事件的转发和抓取功能。

## 功能特性

### 1. 事件转发功能
- 将主日跟踪事件信息转发到外部表单
- 自动填充事件基本信息
- 支持新窗口打开，避免页面跳转

### 2. 数据抓取功能
- 从外部表单获取已填写的跟踪数据
- 自动保存到MSH系统
- 支持事件状态同步

## 技术实现

### 1. 事件唯一编码

#### 1.1 编码格式
```
{memberUUID}_{startDate}_{eventIndex}
```

**示例**：`abc123-def456-ghi789_2025-09-27_1`

#### 1.2 编码组成
- `memberUUID`: 成员唯一标识符
- `startDate`: 事件开始日期（YYYY-MM-DD格式）
- `eventIndex`: 事件序号（从1开始）

### 2. 转发功能实现

#### 2.1 转发URL构建
```javascript
const baseUrl = 'https://pub.baishuyun.com/form';
const params = new URLSearchParams({
  eventId: eventId,                    // 事件唯一ID
  memberName: eventRecord.memberName, // 成员姓名
  memberUUID: eventRecord.memberUUID, // 成员UUID
  group: eventRecord.group,           // 小组名称
  startDate: eventRecord.startDate,   // 事件开始日期
  consecutiveAbsences: eventRecord.consecutiveAbsences, // 连续缺勤次数
  source: 'msh-tracking',             // 来源标识
  timestamp: Date.now()               // 时间戳
});
```

#### 2.2 转发流程
1. 获取事件详情
2. 构建转发URL
3. 打开新窗口
4. 显示成功提示

### 3. 抓取功能实现

#### 3.1 API请求格式
```javascript
const apiUrl = 'https://pub.baishuyun.com/api/form-data';
const requestData = {
  eventId: eventId,
  action: 'fetch',
  timestamp: Date.now()
};
```

#### 3.2 数据返回格式
```javascript
{
  "success": true,
  "data": {
    "eventId": "事件ID",
    "memberUUID": "成员UUID",
    "trackingDate": "2025-09-27",
    "content": "跟踪内容",
    "category": "跟踪类别",
    "person": "回馈人员",
    "status": "resolved|tracking",
    "notes": "备注信息"
  }
}
```

### 4. 数据同步机制

#### 4.1 跟踪记录保存
```javascript
const trackingRecord = {
  eventId: eventId,
  trackingDate: formData.trackingDate,
  content: formData.content,
  category: formData.category || '外部表单',
  person: formData.person || '系统',
  source: 'external-form',
  notes: formData.notes || '',
  createdAt: new Date().toISOString()
};
```

#### 4.2 事件状态更新
- 如果外部表单标记为已解决，自动更新事件状态
- 支持状态同步和冲突解决

## 外部表单要求

### 1. 接收参数

外部表单需要接收以下参数：

| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| eventId | String | 事件唯一ID | abc123-def456-ghi789_2025-09-27_1 |
| memberName | String | 成员姓名 | 张三 |
| memberUUID | String | 成员UUID | abc123-def456-ghi789 |
| group | String | 小组名称 | 第一小组 |
| startDate | String | 事件开始日期 | 2025-09-27 |
| consecutiveAbsences | Number | 连续缺勤次数 | 3 |
| source | String | 来源标识 | msh-tracking |
| timestamp | Number | 时间戳 | 1695801600000 |

### 2. 返回数据格式

外部表单需要提供API接口返回数据：

```javascript
// API端点：POST /api/form-data
// 请求体：
{
  "eventId": "事件ID",
  "action": "fetch",
  "timestamp": 1695801600000
}

// 响应格式：
{
  "success": true,
  "data": {
    "eventId": "事件ID",
    "memberUUID": "成员UUID",
    "trackingDate": "2025-09-27",
    "content": "跟踪内容描述",
    "category": "电话联系|微信联系|上门拜访|小组聚会|其他",
    "person": "回馈人员姓名",
    "status": "resolved|tracking",
    "notes": "备注信息"
  }
}
```

## 安全考虑

### 1. 数据验证
- 验证事件ID有效性
- 检查数据完整性
- 防止恶意数据注入

### 2. 访问控制
- 使用HTTPS传输
- 实现API认证机制
- 防止未授权访问

### 3. 数据保护
- 敏感信息加密传输
- 实现数据备份机制
- 确保数据一致性

## 错误处理

### 1. 网络错误
- 连接超时处理
- 网络中断重试
- 用户友好提示

### 2. 数据错误
- 数据格式验证
- 缺失字段处理
- 数据冲突解决

### 3. 系统错误
- 服务不可用处理
- 权限验证失败
- 系统异常恢复

## 测试验证

### 1. 功能测试
- 转发功能测试
- 抓取功能测试
- 数据同步测试

### 2. 性能测试
- 响应时间测试
- 并发处理测试
- 负载压力测试

### 3. 兼容性测试
- 浏览器兼容性
- 移动端适配
- 网络环境测试

## 部署说明

### 1. 前端部署
- 更新JavaScript文件
- 更新CSS样式文件
- 测试功能完整性

### 2. 外部表单部署
- 创建表单接收页面
- 配置API接口
- 实现数据存储

### 3. 监控配置
- 设置错误监控
- 配置性能监控
- 实现日志记录

## 维护指南

### 1. 日常维护
- 监控系统状态
- 检查数据同步
- 处理用户反馈

### 2. 故障排除
- 查看错误日志
- 检查网络连接
- 验证数据完整性

### 3. 版本更新
- 备份现有数据
- 测试新功能
- 逐步部署更新

---

**文档版本**: 1.0  
**创建日期**: 2025-09-27  
**最后更新**: 2025-09-27  
**维护人员**: MSH系统开发团队
