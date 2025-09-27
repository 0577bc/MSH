# 外部表单API搭建指南

## 概述

本文档指导如何搭建 `pub.baishuyun.com` 的外部表单API，用于接收MSH签到系统的事件转发和提供数据抓取功能。

## API端点设计

### 1. 转发API - `/api/forward`

**功能**: 接收MSH系统转发的事件数据

**请求方法**: POST

**请求头**:
```
Content-Type: application/json
Accept: application/json
```

**请求体示例**:
```json
{
  "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
  "memberName": "张三",
  "memberUUID": "dd10a783-86b5-471d-8796-22f88c7ada7e",
  "group": "乐清1组",
  "startDate": "2025-08-03",
  "consecutiveAbsences": 3,
  "source": "msh-tracking",
  "timestamp": 1693123456789
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "事件转发成功",
  "data": {
    "formId": "form_12345",
    "url": "https://pub.baishuyun.com/form/form_12345"
  }
}
```

### 2. 数据抓取API - `/api/form-data`

**功能**: 获取已填写的表单数据

**请求方法**: POST

**请求体示例**:
```json
{
  "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
  "action": "fetch",
  "timestamp": 1693123456789
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
    "trackingDate": "2025-09-27",
    "content": "已联系成员，了解缺勤原因...",
    "category": "电话联系",
    "person": "李牧师",
    "status": "resolved",
    "notes": "成员表示会参加下次聚会"
  }
}
```

## 技术实现建议

### 后端技术栈

**推荐方案1: Node.js + Express**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

// 转发API
app.post('/api/forward', async (req, res) => {
  try {
    const { eventId, memberName, memberUUID, group, startDate, consecutiveAbsences } = req.body;
    
    // 创建表单记录
    const formId = generateFormId();
    const formData = {
      formId,
      eventId,
      memberName,
      memberUUID,
      group,
      startDate,
      consecutiveAbsences,
      status: 'pending',
      createdAt: new Date()
    };
    
    // 保存到数据库
    await saveFormData(formData);
    
    res.json({
      success: true,
      message: '事件转发成功',
      data: {
        formId,
        url: `https://pub.baishuyun.com/form/${formId}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 数据抓取API
app.post('/api/form-data', async (req, res) => {
  try {
    const { eventId } = req.body;
    
    // 从数据库获取表单数据
    const formData = await getFormDataByEventId(eventId);
    
    if (!formData) {
      return res.json({
        success: false,
        message: '未找到相关表单数据'
      });
    }
    
    res.json({
      success: true,
      data: formData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

**推荐方案2: Python + Flask**
```python
from flask import Flask, request, jsonify
import uuid
from datetime import datetime

app = Flask(__name__)

@app.route('/api/forward', methods=['POST'])
def forward_event():
    try:
        data = request.json
        event_id = data.get('eventId')
        member_name = data.get('memberName')
        
        # 生成表单ID
        form_id = str(uuid.uuid4())
        
        # 保存到数据库
        form_data = {
            'form_id': form_id,
            'event_id': event_id,
            'member_name': member_name,
            'status': 'pending',
            'created_at': datetime.now()
        }
        
        # 数据库操作
        save_form_data(form_data)
        
        return jsonify({
            'success': True,
            'message': '事件转发成功',
            'data': {
                'formId': form_id,
                'url': f'https://pub.baishuyun.com/form/{form_id}'
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/form-data', methods=['POST'])
def fetch_form_data():
    try:
        data = request.json
        event_id = data.get('eventId')
        
        # 从数据库获取数据
        form_data = get_form_data_by_event_id(event_id)
        
        if not form_data:
            return jsonify({
                'success': False,
                'message': '未找到相关表单数据'
            })
        
        return jsonify({
            'success': True,
            'data': form_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
```

### 数据库设计

**表单数据表 (forms)**
```sql
CREATE TABLE forms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    form_id VARCHAR(255) UNIQUE NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    member_uuid VARCHAR(255) NOT NULL,
    group_name VARCHAR(255),
    start_date DATE,
    consecutive_absences INT DEFAULT 0,
    status ENUM('pending', 'completed', 'resolved') DEFAULT 'pending',
    tracking_date DATE,
    content TEXT,
    category VARCHAR(255),
    person VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 前端表单页面

**表单页面示例 (form.html)**
```html
<!DOCTYPE html>
<html>
<head>
    <title>跟踪事件表单</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .event-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>跟踪事件表单</h1>
    
    <div class="event-info">
        <h3>事件信息</h3>
        <p><strong>成员姓名:</strong> <span id="memberName"></span></p>
        <p><strong>组别:</strong> <span id="groupName"></span></p>
        <p><strong>连续缺勤:</strong> <span id="consecutiveAbsences"></span>次</p>
        <p><strong>开始日期:</strong> <span id="startDate"></span></p>
    </div>
    
    <form id="trackingForm">
        <div class="form-group">
            <label for="trackingDate">跟踪日期:</label>
            <input type="date" id="trackingDate" name="trackingDate" required>
        </div>
        
        <div class="form-group">
            <label for="content">跟踪内容:</label>
            <textarea id="content" name="content" rows="5" required placeholder="请详细描述跟踪情况..."></textarea>
        </div>
        
        <div class="form-group">
            <label for="category">跟踪方式:</label>
            <select id="category" name="category" required>
                <option value="">请选择</option>
                <option value="电话联系">电话联系</option>
                <option value="微信联系">微信联系</option>
                <option value="上门拜访">上门拜访</option>
                <option value="其他">其他</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="person">跟踪人员:</label>
            <input type="text" id="person" name="person" required placeholder="请输入跟踪人员姓名">
        </div>
        
        <div class="form-group">
            <label for="status">事件状态:</label>
            <select id="status" name="status" required>
                <option value="pending">待处理</option>
                <option value="resolved">已解决</option>
                <option value="ongoing">持续跟踪</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="notes">备注:</label>
            <textarea id="notes" name="notes" rows="3" placeholder="其他备注信息..."></textarea>
        </div>
        
        <button type="submit">提交跟踪记录</button>
    </form>
    
    <script>
        // 从URL参数获取事件信息
        const urlParams = new URLSearchParams(window.location.search);
        document.getElementById('memberName').textContent = urlParams.get('memberName') || '未知';
        document.getElementById('groupName').textContent = urlParams.get('group') || '未知';
        document.getElementById('consecutiveAbsences').textContent = urlParams.get('consecutiveAbsences') || '0';
        document.getElementById('startDate').textContent = urlParams.get('startDate') || '未知';
        
        // 设置默认跟踪日期为今天
        document.getElementById('trackingDate').value = new Date().toISOString().split('T')[0];
        
        // 表单提交处理
        document.getElementById('trackingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                eventId: urlParams.get('eventId'),
                trackingDate: document.getElementById('trackingDate').value,
                content: document.getElementById('content').value,
                category: document.getElementById('category').value,
                person: document.getElementById('person').value,
                status: document.getElementById('status').value,
                notes: document.getElementById('notes').value
            };
            
            try {
                const response = await fetch('/api/save-form', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('跟踪记录提交成功！');
                    window.close();
                } else {
                    alert('提交失败：' + result.message);
                }
            } catch (error) {
                alert('提交失败：' + error.message);
            }
        });
    </script>
</body>
</html>
```

## 部署建议

### 1. 服务器配置

**推荐配置**:
- CPU: 2核心
- 内存: 4GB
- 存储: 50GB SSD
- 带宽: 5Mbps

### 2. 域名和SSL

- 域名: `pub.baishuyun.com`
- SSL证书: Let's Encrypt (免费)
- CDN: 阿里云CDN或腾讯云CDN

### 3. 数据库

**推荐方案**:
- MySQL 8.0+ 或 PostgreSQL 13+
- 定期备份
- 读写分离（高并发时）

### 4. 监控和日志

- 应用监控: PM2 (Node.js) 或 Supervisor (Python)
- 日志管理: Winston (Node.js) 或 Loguru (Python)
- 错误追踪: Sentry

## 安全考虑

### 1. API安全

```javascript
// 添加API密钥验证
const API_KEY = process.env.API_KEY;

app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

// 添加CORS支持
app.use(cors({
  origin: ['https://your-msh-domain.com'],
  credentials: true
}));
```

### 2. 数据验证

```javascript
const Joi = require('joi');

const forwardSchema = Joi.object({
  eventId: Joi.string().required(),
  memberName: Joi.string().required(),
  memberUUID: Joi.string().required(),
  group: Joi.string().required(),
  startDate: Joi.date().required(),
  consecutiveAbsences: Joi.number().integer().min(0).required()
});

app.post('/api/forward', (req, res) => {
  const { error, value } = forwardSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  // 处理请求...
});
```

## 测试方案

### 1. API测试脚本

```javascript
// test-api.js
const axios = require('axios');

async function testForwardAPI() {
  try {
    const response = await axios.post('https://pub.baishuyun.com/api/forward', {
      eventId: 'test-event-123',
      memberName: '测试成员',
      memberUUID: 'test-uuid-123',
      group: '测试组',
      startDate: '2025-09-27',
      consecutiveAbsences: 2,
      source: 'msh-tracking',
      timestamp: Date.now()
    });
    
    console.log('转发API测试结果:', response.data);
  } catch (error) {
    console.error('转发API测试失败:', error.message);
  }
}

async function testFetchAPI() {
  try {
    const response = await axios.post('https://pub.baishuyun.com/api/form-data', {
      eventId: 'test-event-123',
      action: 'fetch',
      timestamp: Date.now()
    });
    
    console.log('抓取API测试结果:', response.data);
  } catch (error) {
    console.error('抓取API测试失败:', error.message);
  }
}

// 运行测试
testForwardAPI();
testFetchAPI();
```

## 维护指南

### 1. 定期备份

```bash
# 数据库备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u username -p database_name > backup_$DATE.sql
```

### 2. 日志轮转

```javascript
// 日志配置
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

**创建时间**: 2025-09-27  
**版本**: 1.0  
**维护者**: MSH开发团队
