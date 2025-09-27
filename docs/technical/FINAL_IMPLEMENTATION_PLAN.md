# 最终实施方案 - 自建表单系统

## 技术栈确认

### 后端技术栈
- **框架**: Node.js + Express
- **数据库**: MySQL
- **开发工具**: Cursor IDE
- **版本控制**: Git

### 前端技术栈
- **技术**: 原生 HTML + JavaScript
- **样式**: 原生 CSS
- **框架**: 无（保持与MSH系统一致）

### 云服务
- **云服务商**: 阿里云
- **服务器**: ECS云服务器
- **数据库**: RDS MySQL
- **域名**: 阿里云域名服务

### 开发成本
- **人力成本**: 免费（内部开发）
- **开发工具**: 免费
- **服务器成本**: 约960元/年

## 阿里云成本分析

### 服务器配置
- **ECS实例**: 1核2GB内存，1Mbps带宽
- **操作系统**: Ubuntu 20.04 LTS
- **存储**: 40GB SSD
- **价格**: 约55元/月（660元/年）

### 数据库配置
- **RDS MySQL**: 1核1GB内存
- **存储**: 20GB SSD
- **备份**: 7天自动备份
- **价格**: 约25元/月（300元/年）

### 总成本
- **服务器**: 660元/年
- **数据库**: 300元/年
- **域名**: 50元/年（可选）
- **总计**: 约960元/年

## 开发实施计划

### 阶段1：环境搭建（第1周）

**1.1 阿里云资源准备**
- [ ] 注册阿里云账号
- [ ] 购买ECS实例（1核2GB）
- [ ] 购买RDS MySQL实例
- [ ] 配置安全组（开放80、443、3000端口）
- [ ] 申请弹性公网IP

**1.2 本地开发环境**
- [ ] 在Cursor中创建项目
- [ ] 初始化Node.js项目
- [ ] 安装依赖包
- [ ] 配置开发环境

**1.3 服务器环境配置**
- [ ] 连接ECS服务器
- [ ] 安装Node.js和npm
- [ ] 安装PM2进程管理器
- [ ] 配置Nginx反向代理
- [ ] 配置SSL证书

### 阶段2：数据库设计（第1-2周）

**2.1 数据库表结构设计**
```sql
-- 创建数据库
CREATE DATABASE msh_form_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE msh_form_system;

-- 表单数据表
CREATE TABLE form_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(255) NOT NULL COMMENT '事件编号',
    member_name VARCHAR(255) NOT NULL COMMENT '成员花名',
    member_uuid VARCHAR(255) NOT NULL COMMENT '成员UUID',
    group_name VARCHAR(255) COMMENT '组别',
    start_date DATE COMMENT '开始日期',
    consecutive_absences INT DEFAULT 0 COMMENT '连续缺勤次数',
    data_source VARCHAR(100) DEFAULT 'msh-tracking' COMMENT '数据源',
    status ENUM('pending', 'processing', 'resolved') DEFAULT 'pending' COMMENT '状态',
    tracking_date DATE COMMENT '跟踪日期',
    tracking_content TEXT COMMENT '跟踪内容',
    tracking_method VARCHAR(100) COMMENT '跟踪方式',
    tracking_person VARCHAR(255) COMMENT '跟踪人员',
    event_status VARCHAR(100) COMMENT '事件状态',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_event_id (event_id),
    INDEX idx_member_uuid (member_uuid),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单数据表';
```

**2.2 数据库连接配置**
```javascript
// config/database.js
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  timezone: '+08:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;
```

### 阶段3：后端API开发（第2-3周）

**3.1 主应用文件**
```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// 路由配置
app.use('/api', require('./routes/api'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`表单系统服务器运行在端口 ${PORT}`);
});
```

**3.2 API路由开发**
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

    // 数据验证
    if (!eventId || !memberName || !memberUUID) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

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
      message: '保存数据失败'
    });
  }
});

// 查询表单数据
router.get('/form-data', async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: '缺少事件ID参数'
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM form_data WHERE event_id = ? ORDER BY created_at DESC LIMIT 1',
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
      message: '查询数据失败'
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

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: '缺少事件ID参数'
      });
    }

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
      message: '更新数据失败'
    });
  }
});

// 获取所有表单数据（管理用）
router.get('/form-data/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM form_data';
    let params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM form_data';
    let countParams = [];
    if (status) {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        list: rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取数据列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据列表失败'
    });
  }
});

module.exports = router;
```

### 阶段4：前端页面开发（第3-4周）

**4.1 表单页面**
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MSH跟踪事件表单</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .header h1 { 
            color: #007bff; 
            font-size: 28px;
            margin-bottom: 10px;
        }
        .form-group { 
            margin-bottom: 20px; 
        }
        label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600;
            color: #555;
        }
        input, textarea, select { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #ddd; 
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #007bff;
        }
        button { 
            background: #007bff; 
            color: white; 
            padding: 12px 30px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.3s;
            width: 100%;
        }
        button:hover { 
            background: #0056b3; 
        }
        .event-info { 
            background: #e3f2fd; 
            padding: 20px; 
            border-radius: 6px; 
            margin-bottom: 30px;
            border-left: 4px solid #007bff;
        }
        .event-info h3 { 
            color: #007bff; 
            margin-bottom: 15px;
        }
        .event-info p { 
            margin-bottom: 8px;
        }
        .hidden { 
            display: none; 
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MSH跟踪事件表单</h1>
            <p>请填写跟踪事件的相关信息</p>
        </div>
        
        <div id="eventInfo" class="event-info hidden">
            <h3>事件信息</h3>
            <p><strong>事件编号:</strong> <span id="eventId"></span></p>
            <p><strong>成员花名:</strong> <span id="memberName"></span></p>
            <p><strong>组别:</strong> <span id="groupName"></span></p>
            <p><strong>连续缺勤:</strong> <span id="consecutiveAbsences"></span>次</p>
            <p><strong>开始日期:</strong> <span id="startDate"></span></p>
        </div>
        
        <div id="messageArea"></div>
        
        <form id="trackingForm">
            <div class="form-group">
                <label for="trackingDate">跟踪日期 *</label>
                <input type="date" id="trackingDate" name="trackingDate" required>
            </div>
            
            <div class="form-group">
                <label for="trackingContent">跟踪内容 *</label>
                <textarea id="trackingContent" name="trackingContent" rows="5" required 
                    placeholder="请详细描述跟踪情况，包括联系结果、成员反馈等..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="trackingMethod">跟踪方式 *</label>
                <select id="trackingMethod" name="trackingMethod" required>
                    <option value="">请选择跟踪方式</option>
                    <option value="电话联系">电话联系</option>
                    <option value="微信联系">微信联系</option>
                    <option value="上门拜访">上门拜访</option>
                    <option value="短信联系">短信联系</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="trackingPerson">跟踪人员 *</label>
                <input type="text" id="trackingPerson" name="trackingPerson" required 
                    placeholder="请输入跟踪人员姓名">
            </div>
            
            <div class="form-group">
                <label for="eventStatus">事件状态 *</label>
                <select id="eventStatus" name="eventStatus" required>
                    <option value="pending">待处理</option>
                    <option value="resolved">已解决</option>
                    <option value="ongoing">持续跟踪</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="notes">备注</label>
                <textarea id="notes" name="notes" rows="3" 
                    placeholder="其他需要说明的信息..."></textarea>
            </div>
            
            <button type="submit">提交跟踪记录</button>
        </form>
    </div>
    
    <script>
        // 全局变量
        let currentEventId = null;
        
        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', function() {
            initializePage();
        });
        
        // 初始化页面
        function initializePage() {
            const urlParams = new URLSearchParams(window.location.search);
            currentEventId = urlParams.get('eventId');
            
            if (currentEventId) {
                loadEventInfo(urlParams);
                checkExistingData();
            } else {
                showMessage('错误：缺少事件ID参数', 'error');
            }
            
            // 设置默认跟踪日期为今天
            document.getElementById('trackingDate').value = new Date().toISOString().split('T')[0];
            
            // 绑定表单提交事件
            document.getElementById('trackingForm').addEventListener('submit', handleFormSubmit);
        }
        
        // 加载事件信息
        function loadEventInfo(urlParams) {
            document.getElementById('eventInfo').classList.remove('hidden');
            document.getElementById('eventId').textContent = urlParams.get('eventId') || '未知';
            document.getElementById('memberName').textContent = urlParams.get('memberName') || '未知';
            document.getElementById('groupName').textContent = urlParams.get('group') || '未知';
            document.getElementById('consecutiveAbsences').textContent = urlParams.get('consecutiveAbsences') || '0';
            document.getElementById('startDate').textContent = urlParams.get('startDate') || '未知';
        }
        
        // 检查是否已有数据
        async function checkExistingData() {
            try {
                const response = await fetch(`/api/form-data?eventId=${currentEventId}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    fillFormWithExistingData(result.data);
                    showMessage('检测到已有跟踪记录，您可以修改后重新提交', 'success');
                }
            } catch (error) {
                console.log('检查现有数据失败:', error);
            }
        }
        
        // 用现有数据填充表单
        function fillFormWithExistingData(data) {
            if (data.tracking_date) {
                document.getElementById('trackingDate').value = data.tracking_date;
            }
            if (data.tracking_content) {
                document.getElementById('trackingContent').value = data.tracking_content;
            }
            if (data.tracking_method) {
                document.getElementById('trackingMethod').value = data.tracking_method;
            }
            if (data.tracking_person) {
                document.getElementById('trackingPerson').value = data.tracking_person;
            }
            if (data.event_status) {
                document.getElementById('eventStatus').value = data.event_status;
            }
            if (data.notes) {
                document.getElementById('notes').value = data.notes;
            }
        }
        
        // 处理表单提交
        async function handleFormSubmit(e) {
            e.preventDefault();
            
            const formData = {
                eventId: currentEventId,
                trackingDate: document.getElementById('trackingDate').value,
                trackingContent: document.getElementById('trackingContent').value,
                trackingMethod: document.getElementById('trackingMethod').value,
                trackingPerson: document.getElementById('trackingPerson').value,
                eventStatus: document.getElementById('eventStatus').value,
                notes: document.getElementById('notes').value
            };
            
            // 显示加载状态
            const submitButton = document.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = '提交中...';
            submitButton.disabled = true;
            
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
                    showMessage('跟踪记录提交成功！', 'success');
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                } else {
                    showMessage('提交失败：' + result.message, 'error');
                }
            } catch (error) {
                console.error('提交失败:', error);
                showMessage('提交失败：网络错误', 'error');
            } finally {
                // 恢复按钮状态
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        }
        
        // 显示消息
        function showMessage(message, type) {
            const messageArea = document.getElementById('messageArea');
            messageArea.innerHTML = `<div class="${type}">${message}</div>`;
        }
    </script>
</body>
</html>
```

### 阶段5：部署配置（第4-5周）

**5.1 环境变量配置**
```bash
# .env 文件
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.mysql.rds.aliyuncs.com
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=msh_form_system
DB_PORT=3306
```

**5.2 PM2配置**
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
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

**5.3 Nginx配置**
```nginx
# /etc/nginx/sites-available/msh-form-system
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 阶段6：MSH系统集成（第5-6周）

**6.1 更新MSH系统代码**
```javascript
// 在 src/sunday-tracking.js 中更新转发函数
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

// 更新抓取函数
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

## 开发时间线

### 第1周：环境搭建
- **周一-周二**: 阿里云资源准备
- **周三-周四**: 本地开发环境配置
- **周五**: 服务器环境配置

### 第2周：数据库和API开发
- **周一-周二**: 数据库设计和配置
- **周三-周四**: 后端API开发
- **周五**: API测试和调试

### 第3周：前端开发
- **周一-周二**: 前端页面开发
- **周三-周四**: 页面样式和交互
- **周五**: 前端功能测试

### 第4周：部署和集成
- **周一-周二**: 服务器部署配置
- **周三-周四**: MSH系统集成
- **周五**: 集成测试

### 第5周：测试和优化
- **周一-周二**: 功能测试
- **周三-周四**: 性能优化
- **周五**: 用户体验优化

### 第6周：上线和文档
- **周一-周二**: 生产环境部署
- **周三-周四**: 用户培训
- **周五**: 文档整理

## 成本总结

### 开发成本
- **人力成本**: 免费（内部开发）
- **开发工具**: 免费
- **学习成本**: 免费

### 运营成本
- **阿里云ECS**: 660元/年
- **阿里云RDS**: 300元/年
- **域名**: 50元/年（可选）
- **总成本**: 约960元/年

### 对比分析
- **第三方服务**: 800元/年 × 5年 = 4000元
- **自建系统**: 960元/年 × 5年 = 4800元
- **差异**: 仅多800元，但获得完全控制权

## 风险评估

### 技术风险
- **开发难度**: 低（技术栈简单）
- **维护成本**: 低（结构清晰）
- **扩展性**: 高（可自由扩展）

### 运营风险
- **服务器稳定性**: 高（阿里云可靠）
- **数据安全**: 高（自建控制）
- **备份策略**: 完善（RDS自动备份）

## 总结

这个方案具有以下优势：

1. **技术简单**: 使用成熟的技术栈
2. **成本可控**: 年成本仅960元
3. **完全控制**: 数据和功能完全可控
4. **易于维护**: 代码结构清晰
5. **扩展性强**: 可根据需求自由扩展

建议按照这个方案实施，预计6周内完成开发并上线使用。

---

**创建时间**: 2025-09-27  
**版本**: 1.0  
**维护者**: MSH开发团队
