# 替代表单平台方案 - 年费少于800元

## 概述

由于百数云API功能需要付费版本且未开放，我们需要寻找其他支持数据传输和回填功能的表单平台。预算限制：年费少于800元。

## 推荐平台对比

### 1. 简道云 ⭐⭐⭐⭐⭐

**基本信息**：
- **平台地址**: https://www.jiandaoyun.com
- **国内服务**: ✅ 是
- **中文支持**: ✅ 完整
- **API支持**: ✅ 支持

**价格方案**：
- **免费版**: 基础功能，适合个人使用
- **付费版**: 约300-600元/年（具体价格需咨询）
- **企业版**: 约800-1200元/年

**功能特点**：
- 零代码应用搭建
- 丰富的表单模板
- 支持数据采集、流转、处理和分析
- 完整的API接口支持
- 数据回填功能
- 权限管理

**API功能**：
- 支持数据新增、查询、更新
- RESTful API接口
- 支持Webhook回调
- 数据导出功能

### 2. TDUCK（填鸭表单） ⭐⭐⭐⭐

**基本信息**：
- **平台地址**: https://www.tduckapp.com
- **国内服务**: ✅ 是
- **中文支持**: ✅ 完整
- **API支持**: ✅ 支持

**价格方案**：
- **免费版**: 基础功能
- **付费版**: 约200-500元/年
- **开源版本**: 可自部署

**功能特点**：
- 国产开源表单系统
- 数据隐私性强
- 支持自定义表单设计
- 支持数据回填
- 适合特殊需求场景

**API功能**：
- 开源版本可自定义API
- 支持数据导入导出
- Webhook支持

### 3. 腾讯问卷 ⭐⭐⭐

**基本信息**：
- **平台地址**: https://wj.qq.com
- **国内服务**: ✅ 是
- **中文支持**: ✅ 完整
- **API支持**: ⚠️ 有限

**价格方案**：
- **免费版**: 基础功能
- **付费版**: 约100-300元/年

**功能特点**：
- 腾讯官方产品
- 稳定性好
- 基础表单功能
- 数据统计功能

**API功能**：
- API功能相对有限
- 主要支持数据导出
- 可能需要付费版本

### 4. 问卷星 ⭐⭐⭐

**基本信息**：
- **平台地址**: https://www.wjx.cn
- **国内服务**: ✅ 是
- **中文支持**: ✅ 完整
- **API支持**: ⚠️ 有限

**价格方案**：
- **免费版**: 基础功能
- **付费版**: 约200-400元/年

**功能特点**：
- 老牌问卷平台
- 功能成熟
- 支持多种题型
- 数据分析功能

**API功能**：
- 基础API支持
- 数据导出功能
- 可能需要付费版本

### 5. 金数据 ⭐⭐⭐

**基本信息**：
- **平台地址**: https://jinshuju.net
- **国内服务**: ✅ 是
- **中文支持**: ✅ 完整
- **API支持**: ⚠️ 有限

**价格方案**：
- **免费版**: 基础功能
- **付费版**: 约300-600元/年

**功能特点**：
- 专业表单工具
- 支持复杂表单设计
- 数据统计功能
- 集成能力强

**API功能**：
- 基础API支持
- 数据导入导出
- 可能需要付费版本

## 详细对比表

| 平台 | 年费范围 | API支持 | 数据回填 | 国内服务 | 推荐指数 |
|------|----------|---------|----------|----------|----------|
| **简道云** | 300-600元 | ✅ 完整 | ✅ 支持 | ✅ 是 | ⭐⭐⭐⭐⭐ |
| **TDUCK** | 200-500元 | ✅ 完整 | ✅ 支持 | ✅ 是 | ⭐⭐⭐⭐ |
| **腾讯问卷** | 100-300元 | ⚠️ 有限 | ⚠️ 基础 | ✅ 是 | ⭐⭐⭐ |
| **问卷星** | 200-400元 | ⚠️ 有限 | ⚠️ 基础 | ✅ 是 | ⭐⭐⭐ |
| **金数据** | 300-600元 | ⚠️ 有限 | ⚠️ 基础 | ✅ 是 | ⭐⭐⭐ |

## 推荐方案

### 首选：简道云
**理由**：
- 功能最完整，API支持最好
- 价格在预算范围内
- 国内服务，稳定性好
- 支持复杂的数据流转和处理

**实施步骤**：
1. 注册简道云账号
2. 创建表单应用
3. 配置字段映射
4. 获取API接口信息
5. 更新MSH系统集成代码

### 备选：TDUCK（填鸭表单）
**理由**：
- 开源可定制
- 价格较低
- 数据隐私性强
- 适合特殊需求

**实施步骤**：
1. 注册TDUCK账号
2. 或考虑自部署开源版本
3. 配置表单和API
4. 集成到MSH系统

## 集成方案更新

### 简道云API集成示例

**数据新增API**：
```javascript
// 简道云数据新增
async function forwardToJiandaoyun(eventId) {
  try {
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    
    const data = {
      "事件编号": eventId,
      "成员花名": eventRecord.memberName || '未知成员',
      "成员UUID": eventRecord.memberUUID || eventId,
      "组别": eventRecord.group || '未知组别',
      "开始日期": eventRecord.startDate || new Date().toISOString().split('T')[0],
      "连续缺勤次数": eventRecord.consecutiveAbsences || 0,
      "数据源": "msh-tracking",
      "创建时间": new Date().toISOString(),
      "状态": "待处理"
    };
    
    const response = await fetch('https://api.jiandaoyun.com/api/v1/app/{app_id}/entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getJiandaoyunToken()
      },
      body: JSON.stringify({ data })
    });
    
    const result = await response.json();
    if (result.code === 0) {
      showNotification('事件已成功转发到简道云！', 'success');
    }
  } catch (error) {
    showNotification('转发失败：' + error.message, 'error');
  }
}
```

**数据查询API**：
```javascript
// 简道云数据查询
async function fetchFromJiandaoyun(eventId) {
  try {
    const response = await fetch(`https://api.jiandaoyun.com/api/v1/app/{app_id}/entry?filter={"事件编号":"${eventId}"}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + getJiandaoyunToken()
      }
    });
    
    const result = await response.json();
    if (result.code === 0 && result.data.length > 0) {
      const formData = result.data[0];
      // 处理回填数据
      await processExternalFormData(eventId, formData);
    }
  } catch (error) {
    showNotification('抓取失败：' + error.message, 'error');
  }
}
```

## 下一步行动

1. **选择平台**: 建议优先考虑简道云
2. **注册试用**: 创建账号并测试功能
3. **确认价格**: 联系客服确认具体价格
4. **配置表单**: 按照字段映射创建表单
5. **获取API**: 申请API接口权限
6. **更新代码**: 修改MSH系统集成代码
7. **测试验证**: 完整测试转发和回填功能

## 注意事项

1. **价格确认**: 实际价格可能因功能需求而异，建议联系客服确认
2. **API限制**: 确认免费版和付费版的API功能差异
3. **数据安全**: 确保数据传输和存储的安全性
4. **备份方案**: 准备备选方案以防主方案不可用

---

**创建时间**: 2025-09-27  
**版本**: 1.0  
**维护者**: MSH开发团队
