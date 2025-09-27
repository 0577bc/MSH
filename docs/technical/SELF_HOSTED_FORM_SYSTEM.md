# 自建表单系统方案 - 高性价比实现

## 概述

基于MSH系统的需求，设计一个自建的表单系统，支持数据传输和回填功能，使用国内数据库，实现最高性价比。

## 技术栈选择

### 1. 后端技术栈

**推荐方案：Node.js + Express**
- **优势**: 与MSH系统技术栈一致，开发效率高
- **成本**: 免费开源
- **学习成本**: 低（团队已熟悉）

**备选方案：Python + Flask**
- **优势**: 开发简单，生态丰富
- **成本**: 免费开源
- **学习成本**: 中等

### 2. 数据库选择

**推荐方案：MySQL**
- **优势**: 国内使用广泛，稳定可靠
- **成本**: 免费开源
- **云服务**: 腾讯云、阿里云都有托管服务

**备选方案：PostgreSQL**
- **优势**: 功能强大，支持复杂查询
- **成本**: 免费开源
- **云服务**: 各大云厂商都支持

### 3. 前端技术栈

**推荐方案：原生HTML + JavaScript**
- **优势**: 简单直接，与MSH系统保持一致
- **成本**: 免费
- **学习成本**: 无

**备选方案：Vue.js**
- **优势**: 组件化开发，用户体验好
- **成本**: 免费开源
- **学习成本**: 中等

## 云服务成本分析

### 1. 腾讯云方案

**服务器配置**：
- **规格**: 1核2GB内存，1Mbps带宽
- **价格**: 约60元/月（720元/年）
- **适用**: 小型应用，并发量不高

**数据库配置**：
- **MySQL**: 1核1GB，20GB存储
- **价格**: 约30元/月（360元/年）
- **适用**: 中小型数据量

**总成本**: 约1080元/年

### 2. 阿里云方案

**服务器配置**：
- **规格**: 1核2GB内存，1Mbps带宽
- **价格**: 约55元/月（660元/年）
- **适用**: 小型应用

**数据库配置**：
- **MySQL**: 1核1GB，20GB存储
- **价格**: 约25元/月（300元/年）
- **适用**: 中小型数据量

**总成本**: 约960元/年

### 3. 华为云方案

**服务器配置**：
- **规格**: 1核2GB内存，1Mbps带宽
- **价格**: 约50元/月（600元/年）
- **适用**: 小型应用

**数据库配置**：
- **MySQL**: 1核1GB，20GB存储
- **价格**: 约20元/月（240元/年）
- **适用**: 中小型数据量

**总成本**: 约840元/年

### 4. 最低成本方案

**使用免费额度**：
- **腾讯云**: 新用户免费试用1个月
- **阿里云**: 新用户免费试用1个月
- **华为云**: 新用户免费试用1个月

**长期方案**：
- **服务器**: 选择最低配置，约40-60元/月
- **数据库**: 选择最低配置，约20-30元/月
- **总成本**: 约720-1080元/年

## 系统架构设计

### 1. 整体架构

```
MSH系统 ←→ 自建表单系统 ←→ 数据库
    ↓           ↓           ↓
  转发数据    处理表单     存储数据
    ↓           ↓           ↓
  抓取数据    回填数据     查询数据
```

### 2. 数据库设计

**表单数据表 (form_data)**
```sql
CREATE TABLE form_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(255) NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    member_uuid VARCHAR(255) NOT NULL,
    group_name VARCHAR(255),
    start_date DATE,
    consecutive_absences INT DEFAULT 0,
    data_source VARCHAR(100) DEFAULT 'msh-tracking',
    status ENUM('pending', 'processing', 'resolved') DEFAULT 'pending',
    tracking_date DATE,
    tracking_content TEXT,
    tracking_method VARCHAR(100),
    tracking_person VARCHAR(255),
    event_status VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_member_uuid (member_uuid),
    INDEX idx_status (status)
);
```

### 3. API接口设计

**数据新增接口**
```javascript
// POST /api/form-data
{
  "eventId": "uuid_date_index",
  "memberName": "花名",
  "memberUUID": "uuid",
  "group": "组别",
  "startDate": "2025-09-27",
  "consecutiveAbsences": 3,
  "dataSource": "msh-tracking"
}
```

**数据查询接口**
```javascript
// GET /api/form-data?eventId=uuid_date_index
{
  "success": true,
  "data": {
    "eventId": "uuid_date_index",
    "trackingDate": "2025-09-27",
    "trackingContent": "跟踪内容",
    "trackingMethod": "电话联系",
    "trackingPerson": "跟踪人员",
    "eventStatus": "已解决",
    "notes": "备注"
  }
}
```

**数据更新接口**
```javascript
// PUT /api/form-data
{
  "eventId": "uuid_date_index",
  "trackingDate": "2025-09-27",
  "trackingContent": "更新内容",
  "trackingMethod": "微信联系",
  "trackingPerson": "李牧师",
  "eventStatus": "已解决",
  "notes": "更新备注"
}
```

## 开发实施计划

### 阶段1：基础架构搭建（1-2周）

**任务清单**：
- [ ] 选择云服务提供商
- [ ] 购买服务器和数据库
- [ ] 配置开发环境
- [ ] 设计数据库结构
- [ ] 搭建基础后端框架

**技术实现**：
```javascript
// 基础Express服务器
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 数据库连接
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.listen(3000, () => {
  console.log('表单系统服务器启动成功');
});
```

### 阶段2：核心功能开发（2-3周）

**任务清单**：
- [ ] 实现数据新增接口
- [ ] 实现数据查询接口
- [ ] 实现数据更新接口
- [ ] 开发前端表单页面
- [ ] 实现数据回填功能

**核心代码示例**：
```javascript
// 数据新增
app.post('/api/form-data', async (req, res) => {
  try {
    const { eventId, memberName, memberUUID, group, startDate, consecutiveAbsences } = req.body;
    
    const [result] = await db.execute(
      'INSERT INTO form_data (event_id, member_name, member_uuid, group_name, start_date, consecutive_absences) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, memberName, memberUUID, group, startDate, consecutiveAbsences]
    );
    
    res.json({
      success: true,
      message: '数据保存成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 数据查询
app.get('/api/form-data', async (req, res) => {
  try {
    const { eventId } = req.query;
    
    const [rows] = await db.execute(
      'SELECT * FROM form_data WHERE event_id = ?',
      [eventId]
    );
    
    res.json({
      success: true,
      data: rows[0] || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### 阶段3：MSH系统集成（1周）

**任务清单**：
- [ ] 修改MSH系统转发功能
- [ ] 修改MSH系统抓取功能
- [ ] 测试数据传输
- [ ] 测试数据回填
- [ ] 优化用户体验

**MSH系统集成代码**：
```javascript
// 更新转发函数
async function forwardToSelfHostedForm(eventId) {
  try {
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    
    const response = await fetch('https://your-domain.com/api/form-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventId: eventId,
        memberName: eventRecord.memberName,
        memberUUID: eventRecord.memberUUID,
        group: eventRecord.group,
        startDate: eventRecord.startDate,
        consecutiveAbsences: eventRecord.consecutiveAbsences,
        dataSource: 'msh-tracking'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      showNotification('事件已成功转发到表单系统！', 'success');
    }
  } catch (error) {
    showNotification('转发失败：' + error.message, 'error');
  }
}

// 更新抓取函数
async function fetchFromSelfHostedForm(eventId) {
  try {
    const response = await fetch(`https://your-domain.com/api/form-data?eventId=${eventId}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const formData = result.data;
      await processExternalFormData(eventId, {
        trackingDate: formData.tracking_date,
        content: formData.tracking_content,
        category: formData.tracking_method,
        person: formData.tracking_person,
        status: formData.event_status,
        notes: formData.notes
      });
      showNotification('成功从表单系统抓取到数据！', 'success');
    } else {
      showNotification('未找到相关数据', 'warning');
    }
  } catch (error) {
    showNotification('抓取失败：' + error.message, 'error');
  }
}
```

### 阶段4：测试和优化（1周）

**任务清单**：
- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 用户体验优化
- [ ] 文档编写

## 成本效益分析

### 开发成本

**人力成本**：
- **开发时间**: 4-6周
- **开发人员**: 1-2人
- **预估成本**: 8000-15000元（按市场价计算）

**技术成本**：
- **服务器**: 720-1080元/年
- **数据库**: 包含在服务器成本中
- **域名**: 约50元/年
- **SSL证书**: 免费（Let's Encrypt）

**总成本**: 约8000-16000元（首年）

### 长期效益

**年度运营成本**：
- **服务器**: 720-1080元/年
- **域名**: 50元/年
- **维护**: 2000-5000元/年（按需）

**对比第三方服务**：
- **第三方服务**: 800元/年 × 5年 = 4000元
- **自建系统**: 8000-16000元（首年）+ 3000-6000元（后续4年）= 11000-22000元

**结论**: 如果使用超过3年，自建系统更经济；如果只是短期使用，第三方服务更划算。

## 风险评估

### 技术风险
- **开发难度**: 中等（团队有经验）
- **维护成本**: 需要持续维护
- **扩展性**: 良好（可自定义）

### 运营风险
- **服务器稳定性**: 依赖云服务商
- **数据安全**: 需要自己保障
- **备份策略**: 需要自己实施

### 缓解措施
- **选择可靠的云服务商**
- **实施定期备份**
- **监控系统状态**
- **准备应急预案**

## 推荐方案

### 最佳性价比方案

**技术栈**: Node.js + Express + MySQL
**云服务**: 华为云（最低成本）
**部署方式**: 容器化部署
**监控**: 基础监控 + 日志

**实施步骤**：
1. **第1周**: 搭建基础架构
2. **第2-3周**: 开发核心功能
3. **第4周**: MSH系统集成
4. **第5周**: 测试和优化

**总投入**: 约8000-12000元（首年）
**年度运营**: 约800-1000元

## 总结

自建表单系统虽然初期投入较大，但具有以下优势：

1. **完全控制**: 可以完全控制功能和数据
2. **成本可控**: 长期使用成本更低
3. **扩展性强**: 可以根据需求自由扩展
4. **数据安全**: 数据完全在自己控制下
5. **技术积累**: 提升团队技术能力

建议如果项目需要长期使用（3年以上），选择自建方案；如果只是短期需求，可以考虑其他方案。

---

**创建时间**: 2025-09-27  
**版本**: 1.0  
**维护者**: MSH开发团队
