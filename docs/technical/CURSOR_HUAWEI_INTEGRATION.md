# Cursor与华为云集成开发方案

## 概述

基于华为云方案，我们可以在Cursor中进行本地开发，然后部署到华为云服务器。本文档详细说明如何在Cursor中开发表单系统并集成华为云服务。

## 开发环境配置

### 1. 本地开发环境

**在Cursor中开发**：
- ✅ 完全支持在Cursor中进行编程
- ✅ 支持Node.js、JavaScript、HTML、CSS等
- ✅ 支持Git版本控制
- ✅ 支持AI编程助手

**开发流程**：
```
Cursor本地开发 → Git提交 → 华为云部署 → 测试验证
```

### 2. 华为云服务配置

**服务器配置**：
- **ECS云服务器**: 1核2GB，Ubuntu 20.04
- **RDS MySQL**: 1核1GB，20GB存储
- **弹性公网IP**: 固定IP地址
- **安全组**: 开放80、443、3000端口

## 开发实施步骤

### 阶段1：本地开发环境搭建

**1.1 在Cursor中创建项目**
```bash
# 在Cursor中创建新项目
mkdir msh-form-system
cd msh-form-system

# 初始化Node.js项目
npm init -y

# 安装依赖
npm install express mysql2 cors dotenv
npm install -D nodemon
```

**1.2 项目结构**
```
msh-form-system/
├── src/
│   ├── app.js          # 主应用文件
│   ├── routes/         # 路由文件
│   ├── models/         # 数据模型
│   ├── controllers/    # 控制器
│   └── middleware/     # 中间件
├── public/             # 静态文件
├── views/              # 模板文件
├── config/             # 配置文件
├── package.json
└── .env                # 环境变量
```

**1.3 基础代码开发**
```javascript
// src/app.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 基础路由
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API路由
app.use('/api', require('./routes/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`表单系统服务器运行在端口 ${PORT}`);
});
```

### 阶段2：数据库设计和API开发

**2.1 数据库表结构**
```sql
-- 在华为云RDS中执行
CREATE DATABASE msh_form_system;
USE msh_form_system;

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

**2.2 API接口开发**
```javascript
// src/routes/api.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 新增表单数据
router.post('/form-data', async (req, res) => {
  try {
    const {
      eventId,
      memberName,
      memberUUID,
      group,
      startDate,
      consecutiveAbsences,
      dataSource = 'msh-tracking'
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO form_data 
       (event_id, member_name, member_uuid, group_name, start_date, consecutive_absences, data_source) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, memberName, memberUUID, group, startDate, consecutiveAbsences, dataSource]
    );

    res.json({
      success: true,
      message: '数据保存成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 查询表单数据
router.get('/form-data', async (req, res) => {
  try {
    const { eventId } = req.query;

    const [rows] = await pool.execute(
      'SELECT * FROM form_data WHERE event_id = ?',
      [eventId]
    );

    res.json({
      success: true,
      data: rows[0] || null
    });
  } catch (error) {
    console.error('查询数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 更新表单数据
router.put('/form-data', async (req, res) => {
  try {
    const {
      eventId,
      trackingDate,
      trackingContent,
      trackingMethod,
      trackingPerson,
      eventStatus,
      notes
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE form_data SET 
       tracking_date = ?, tracking_content = ?, tracking_method = ?, 
       tracking_person = ?, event_status = ?, notes = ?, status = 'resolved'
       WHERE event_id = ?`,
      [trackingDate, trackingContent, trackingMethod, trackingPerson, eventStatus, notes, eventId]
    );

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '数据更新成功'
      });
    } else {
      res.json({
        success: false,
        message: '未找到相关数据'
      });
    }
  } catch (error) {
    console.error('更新数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

### 阶段3：前端页面开发

**3.1 表单页面**
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MSH跟踪事件表单</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .event-info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <h1>MSH跟踪事件表单</h1>
    
    <div id="eventInfo" class="event-info hidden">
        <h3>事件信息</h3>
        <p><strong>事件编号:</strong> <span id="eventId"></span></p>
        <p><strong>成员花名:</strong> <span id="memberName"></span></p>
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
            <label for="trackingContent">跟踪内容:</label>
            <textarea id="trackingContent" name="trackingContent" rows="5" required placeholder="请详细描述跟踪情况..."></textarea>
        </div>
        
        <div class="form-group">
            <label for="trackingMethod">跟踪方式:</label>
            <select id="trackingMethod" name="trackingMethod" required>
                <option value="">请选择</option>
                <option value="电话联系">电话联系</option>
                <option value="微信联系">微信联系</option>
                <option value="上门拜访">上门拜访</option>
                <option value="其他">其他</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="trackingPerson">跟踪人员:</label>
            <input type="text" id="trackingPerson" name="trackingPerson" required placeholder="请输入跟踪人员姓名">
        </div>
        
        <div class="form-group">
            <label for="eventStatus">事件状态:</label>
            <select id="eventStatus" name="eventStatus" required>
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
        const eventId = urlParams.get('eventId');
        
        if (eventId) {
            // 显示事件信息
            document.getElementById('eventInfo').classList.remove('hidden');
            document.getElementById('eventId').textContent = urlParams.get('eventId') || '未知';
            document.getElementById('memberName').textContent = urlParams.get('memberName') || '未知';
            document.getElementById('groupName').textContent = urlParams.get('group') || '未知';
            document.getElementById('consecutiveAbsences').textContent = urlParams.get('consecutiveAbsences') || '0';
            document.getElementById('startDate').textContent = urlParams.get('startDate') || '未知';
            
            // 设置默认跟踪日期为今天
            document.getElementById('trackingDate').value = new Date().toISOString().split('T')[0];
        }
        
        // 表单提交处理
        document.getElementById('trackingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                eventId: eventId,
                trackingDate: document.getElementById('trackingDate').value,
                trackingContent: document.getElementById('trackingContent').value,
                trackingMethod: document.getElementById('trackingMethod').value,
                trackingPerson: document.getElementById('trackingPerson').value,
                eventStatus: document.getElementById('eventStatus').value,
                notes: document.getElementById('notes').value
            };
            
            try {
                const response = await fetch('/api/form-data', {
                    method: 'PUT',
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

### 阶段4：华为云部署配置

**4.1 环境变量配置**
```bash
# .env 文件
DB_HOST=your-rds-endpoint
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=msh_form_system
DB_PORT=3306
PORT=3000
NODE_ENV=production
```

**4.2 部署脚本**
```bash
#!/bin/bash
# deploy.sh

echo "开始部署到华为云..."

# 1. 连接到华为云服务器
ssh root@your-server-ip

# 2. 更新代码
cd /var/www/msh-form-system
git pull origin main

# 3. 安装依赖
npm install --production

# 4. 重启服务
pm2 restart msh-form-system

echo "部署完成！"
```

**4.3 PM2配置**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'msh-form-system',
    script: 'src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 阶段5：MSH系统集成

**5.1 更新MSH系统代码**
```javascript
// 在 src/sunday-tracking.js 中更新
async function forwardToSelfHostedForm(eventId) {
  try {
    console.log(`🔄 开始转发事件到自建表单系统: ${eventId}`);
    showLoadingState('正在转发到表单系统...');
    
    const eventRecord = window.utils.SundayTrackingManager.getTrackingRecord(eventId);
    if (!eventRecord) {
      throw new Error('事件记录未找到，请刷新页面重试');
    }
    
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
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ 转发失败:', error);
    showNotification('转发失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

async function fetchFromSelfHostedForm(eventId) {
  try {
    console.log(`🔄 开始从自建表单系统抓取数据: ${eventId}`);
    showLoadingState('正在从表单系统抓取数据...');
    
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
    console.error('❌ 抓取失败:', error);
    showNotification('抓取失败：' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}
```

## 开发工作流

### 1. 本地开发流程
```
1. 在Cursor中编写代码
2. 本地测试功能
3. Git提交代码
4. 推送到远程仓库
```

### 2. 部署流程
```
1. 连接到华为云服务器
2. 拉取最新代码
3. 安装依赖
4. 重启服务
5. 验证功能
```

### 3. 测试流程
```
1. 本地功能测试
2. 服务器部署测试
3. MSH系统集成测试
4. 端到端测试
```

## 成本分析

### 开发成本
- **开发时间**: 4-6周
- **开发工具**: Cursor（免费）
- **本地环境**: 免费

### 服务器成本
- **华为云ECS**: 600元/年
- **华为云RDS**: 240元/年
- **域名**: 50元/年
- **SSL证书**: 免费

### 总成本
- **首年**: 约900元
- **后续年度**: 约900元/年

## 优势总结

1. **开发效率**: 在Cursor中开发，支持AI编程助手
2. **成本控制**: 华为云方案成本最低
3. **完全控制**: 自建系统，完全可控
4. **技术积累**: 提升团队技术能力
5. **扩展性**: 可根据需求自由扩展

## 总结

使用华为云方案，您完全可以：
- ✅ 在Cursor中进行本地开发
- ✅ 使用Git进行版本控制
- ✅ 部署到华为云服务器
- ✅ 实现完整的表单系统功能
- ✅ 与MSH系统无缝集成

这个方案既经济实惠，又技术先进，是您的最佳选择！

---

**创建时间**: 2025-09-27  
**版本**: 1.0  
**维护者**: MSH开发团队
