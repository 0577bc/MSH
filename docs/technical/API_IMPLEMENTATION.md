# MSH表单系统 - API实现方案

## 🎯 实现概述

### 核心功能模块
1. **用户认证系统** - 注册、登录、权限管理
2. **表单管理系统** - 表单创建、编辑、发布
3. **数据提交系统** - 表单提交、审核、统计
4. **事件跟踪系统** - MSH系统事件同步
5. **系统管理** - 配置管理、日志监控

### 技术架构
```
前端 (MSH系统) ←→ API网关 ←→ 后端服务 ←→ 数据库
     ↓              ↓           ↓         ↓
  用户界面      路由分发    业务逻辑   数据存储
```

---

## 🔐 用户认证系统

### 1. 用户注册API
```javascript
// POST /api/users/register
{
  "username": "string (3-50字符)",
  "password": "string (最少6字符)",
  "email": "string (可选, 邮箱格式)",
  "realName": "string (可选, 最多50字符)",
  "groupName": "string (可选, 最多50字符)"
}

// 响应
{
  "success": true,
  "message": "用户注册成功",
  "data": {
    "user": {
      "id": 1,
      "uuid": "uuid-string",
      "username": "username",
      "email": "email@example.com",
      "realName": "真实姓名",
      "groupName": "组别",
      "role": "user"
    },
    "token": "jwt-token"
  }
}
```

### 2. 用户登录API
```javascript
// POST /api/users/login
{
  "username": "string",
  "password": "string"
}

// 响应
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": { /* 用户信息 */ },
    "token": "jwt-token"
  }
}
```

### 3. 用户信息API
```javascript
// GET /api/users/profile
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "user": { /* 用户信息 */ }
  }
}
```

---

## 📝 表单管理系统

### 1. 创建表单API
```javascript
// POST /api/forms
// Headers: Authorization: Bearer <token>
{
  "title": "string (最多200字符)",
  "description": "string (可选)",
  "formData": {
    "fields": [
      {
        "type": "text|textarea|select|radio|checkbox|date|number",
        "name": "field_name",
        "label": "字段标签",
        "required": true,
        "options": ["选项1", "选项2"] // 仅select/radio/checkbox需要
      }
    ]
  },
  "isPublic": false,
  "allowAnonymous": false,
  "maxSubmissions": 0,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}

// 响应
{
  "success": true,
  "message": "表单创建成功",
  "data": {
    "form": {
      "id": 1,
      "uuid": "uuid-string",
      "title": "表单标题",
      "status": "draft",
      "createdAt": "2025-09-29T10:00:00Z"
    }
  }
}
```

### 2. 获取表单列表API
```javascript
// GET /api/forms?page=1&limit=10&status=published&isPublic=true
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "forms": [
      {
        "id": 1,
        "uuid": "uuid-string",
        "title": "表单标题",
        "description": "表单描述",
        "status": "published",
        "isPublic": true,
        "submissionCount": 5,
        "createdAt": "2025-09-29T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 3. 获取表单详情API
```javascript
// GET /api/forms/:uuid
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "form": {
      "id": 1,
      "uuid": "uuid-string",
      "title": "表单标题",
      "description": "表单描述",
      "formData": { /* 表单结构 */ },
      "status": "published",
      "isPublic": true,
      "allowAnonymous": false,
      "maxSubmissions": 0,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "createdBy": {
        "id": 1,
        "username": "creator",
        "realName": "创建者"
      },
      "createdAt": "2025-09-29T10:00:00Z"
    }
  }
}
```

---

## 📤 数据提交系统

### 1. 提交表单数据API
```javascript
// POST /api/submissions
// Headers: Authorization: Bearer <token> (可选，匿名提交时不需要)
{
  "formUuid": "uuid-string",
  "submitterName": "string (可选)",
  "submitterEmail": "string (可选)",
  "submitterPhone": "string (可选)",
  "submissionData": {
    "field_name_1": "value1",
    "field_name_2": "value2"
  }
}

// 响应
{
  "success": true,
  "message": "提交成功",
  "data": {
    "submission": {
      "id": 1,
      "uuid": "uuid-string",
      "formId": 1,
      "status": "pending",
      "submittedAt": "2025-09-29T10:00:00Z"
    }
  }
}
```

### 2. 获取提交列表API
```javascript
// GET /api/submissions?formId=1&status=pending&page=1&limit=10
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": 1,
        "uuid": "uuid-string",
        "formId": 1,
        "submitterName": "提交者姓名",
        "status": "pending",
        "submittedAt": "2025-09-29T10:00:00Z",
        "reviewedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### 3. 审核提交API
```javascript
// PUT /api/submissions/:uuid/review
// Headers: Authorization: Bearer <token>
{
  "status": "approved|rejected",
  "reviewNotes": "string (可选)"
}

// 响应
{
  "success": true,
  "message": "审核完成",
  "data": {
    "submission": {
      "id": 1,
      "uuid": "uuid-string",
      "status": "approved",
      "reviewedAt": "2025-09-29T10:00:00Z",
      "reviewNotes": "审核备注"
    }
  }
}
```

---

## 🔄 事件跟踪系统

### 1. 同步MSH事件API
```javascript
// POST /api/tracking/sync
// Headers: Authorization: Bearer <token>
{
  "events": [
    {
      "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
      "memberUuid": "dd10a783-86b5-471d-8796-22f88c7ada7e",
      "memberName": "张三",
      "groupName": "乐清1组",
      "startDate": "2025-08-03",
      "consecutiveAbsences": 3,
      "status": "active"
    }
  ]
}

// 响应
{
  "success": true,
  "message": "事件同步成功",
  "data": {
    "syncedCount": 1,
    "events": [
      {
        "id": 1,
        "uuid": "uuid-string",
        "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
        "status": "active"
      }
    ]
  }
}
```

### 2. 获取跟踪事件API
```javascript
// GET /api/tracking/events?groupName=乐清1组&status=active&page=1&limit=10
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 1,
        "uuid": "uuid-string",
        "eventId": "dd10a783-86b5-471d-8796-22f88c7ada7e_2025-08-03_1",
        "memberUuid": "dd10a783-86b5-471d-8796-22f88c7ada7e",
        "memberName": "张三",
        "groupName": "乐清1组",
        "startDate": "2025-08-03",
        "consecutiveAbsences": 3,
        "status": "active",
        "createdAt": "2025-09-29T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 3. 更新事件状态API
```javascript
// PUT /api/tracking/events/:uuid
// Headers: Authorization: Bearer <token>
{
  "status": "terminated|resolved",
  "terminationReason": "string (可选)",
  "resolutionNotes": "string (可选)"
}

// 响应
{
  "success": true,
  "message": "事件状态更新成功",
  "data": {
    "event": {
      "id": 1,
      "uuid": "uuid-string",
      "status": "terminated",
      "terminationReason": "终止原因",
      "terminationDate": "2025-09-29T10:00:00Z"
    }
  }
}
```

---

## ⚙️ 系统管理

### 1. 系统配置API
```javascript
// GET /api/system/configs
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "configs": [
      {
        "key": "system_name",
        "value": "MSH表单系统",
        "type": "string",
        "description": "系统名称",
        "isPublic": true
      }
    ]
  }
}
```

### 2. 更新系统配置API
```javascript
// PUT /api/system/configs/:key
// Headers: Authorization: Bearer <token>
{
  "value": "新值"
}

// 响应
{
  "success": true,
  "message": "配置更新成功",
  "data": {
    "config": {
      "key": "system_name",
      "value": "新值",
      "updatedAt": "2025-09-29T10:00:00Z"
    }
  }
}
```

### 3. 系统统计API
```javascript
// GET /api/system/stats
// Headers: Authorization: Bearer <token>

// 响应
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "active": 95,
      "inactive": 5
    },
    "forms": {
      "total": 25,
      "published": 20,
      "draft": 5
    },
    "submissions": {
      "total": 500,
      "pending": 50,
      "approved": 400,
      "rejected": 50
    },
    "events": {
      "total": 30,
      "active": 25,
      "terminated": 5
    }
  }
}
```

---

## 🔍 搜索和过滤

### 1. 高级搜索API
```javascript
// POST /api/search
// Headers: Authorization: Bearer <token>
{
  "type": "forms|submissions|events",
  "query": "搜索关键词",
  "filters": {
    "status": "published",
    "groupName": "乐清1组",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  },
  "sort": {
    "field": "createdAt",
    "order": "desc"
  },
  "page": 1,
  "limit": 10
}

// 响应
{
  "success": true,
  "data": {
    "results": [ /* 搜索结果 */ ],
    "pagination": { /* 分页信息 */ },
    "facets": {
      "status": { "published": 20, "draft": 5 },
      "groupName": { "乐清1组": 10, "乐清2组": 15 }
    }
  }
}
```

---

## 📊 数据导出

### 1. 导出表单数据API
```javascript
// GET /api/forms/:uuid/export?format=csv|excel&status=all|approved|pending
// Headers: Authorization: Bearer <token>

// 响应 (CSV格式)
Content-Type: text/csv
Content-Disposition: attachment; filename="form_data.csv"

"提交时间","提交者","字段1","字段2"
"2025-09-29 10:00:00","张三","值1","值2"
```

### 2. 导出统计报告API
```javascript
// GET /api/reports/statistics?type=forms|submissions|events&format=pdf|excel
// Headers: Authorization: Bearer <token>

// 响应
Content-Type: application/pdf
Content-Disposition: attachment; filename="statistics_report.pdf"
```

---

## 🚨 错误处理

### 标准错误响应格式
```javascript
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误信息"
  },
  "timestamp": "2025-09-29T10:00:00Z"
}
```

### 常见错误代码
- `VALIDATION_ERROR` - 输入验证失败
- `AUTHENTICATION_ERROR` - 认证失败
- `AUTHORIZATION_ERROR` - 权限不足
- `NOT_FOUND` - 资源不存在
- `DUPLICATE_ERROR` - 数据重复
- `RATE_LIMIT_ERROR` - 请求频率限制
- `SERVER_ERROR` - 服务器内部错误

---

## 📋 API测试用例

### 1. 用户认证测试
```javascript
// 测试用户注册
POST /api/users/register
{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com"
}
// 期望: 201 Created, 返回用户信息和token

// 测试用户登录
POST /api/users/login
{
  "username": "testuser",
  "password": "password123"
}
// 期望: 200 OK, 返回用户信息和token

// 测试获取用户信息
GET /api/users/profile
Headers: Authorization: Bearer <token>
// 期望: 200 OK, 返回用户信息
```

### 2. 表单管理测试
```javascript
// 测试创建表单
POST /api/forms
Headers: Authorization: Bearer <token>
{
  "title": "测试表单",
  "formData": { "fields": [] }
}
// 期望: 201 Created, 返回表单信息

// 测试获取表单列表
GET /api/forms
Headers: Authorization: Bearer <token>
// 期望: 200 OK, 返回表单列表

// 测试获取表单详情
GET /api/forms/:uuid
Headers: Authorization: Bearer <token>
// 期望: 200 OK, 返回表单详情
```

---

## 🔧 部署配置

### 1. 环境变量配置
```bash
# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=rm-bp1863f84204h1973.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=msh_form_system
DB_USER=msh_admin
DB_PASSWORD=your_password_here

# JWT配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/opt/msh-form-system/uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=/opt/msh-form-system/logs/app.log
```

### 2. Nginx配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        root /opt/msh-form-system/public;
        try_files $uri $uri/ /index.html;
    }
}
```

---

**最后更新**: 2025-09-29  
**版本**: 1.0  
**维护者**: MSH开发团队
