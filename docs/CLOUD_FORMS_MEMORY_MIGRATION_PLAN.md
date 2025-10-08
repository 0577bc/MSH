# 云表单系统记忆移植实施方案

> **创建日期**: 2025-10-08  
> **实施周期**: 3周  
> **优先级**: 🔴 P0 - 架构基础  
> **状态**: 📋 待执行

---

## 📊 执行摘要

**目标**: 为云表单系统建立完整的记忆系统，继承MSH系统的优秀实践

**时间表**:
- **Week 1**: 基础搭建 + 完全移植（60%）
- **Week 2**: 技术适配（30%）
- **Week 3**: 完善测试（10%）

**预期成果**:
- ✅ 云表单系统拥有独立完整的记忆系统
- ✅ 继承MSH系统80%的规则和习惯
- ✅ 适配云表单的技术特点
- ✅ 建立两系统的同步机制

---

## 📅 Week 1: 基础搭建 + 完全移植

### Day 1: 创建目录结构和基础文件

#### 任务 1.1: 创建记忆系统目录

**执行命令**:
```bash
cd /Users/benchen/MSH/cloud-forms
mkdir -p .cloud-memory
cd .cloud-memory
```

**创建文件**:
```bash
touch README.md
touch progress.md
touch memory.json
touch rules.md
touch design-system.json
touch tech-stack-mapping.md
```

**预期结果**:
```
cloud-forms/
└── .cloud-memory/
    ├── README.md                 # 使用指南
    ├── progress.md               # 项目进度
    ├── memory.json               # 用户偏好
    ├── rules.md                  # 规则集合
    ├── design-system.json        # 设计规范
    └── tech-stack-mapping.md     # 技术栈对照表
```

**验收标准**: ✅ 目录和文件创建成功

---

#### 任务 1.2: 创建 README.md

**文件**: `cloud-forms/.cloud-memory/README.md`

**内容模板**:
```markdown
# 云表单系统记忆系统

> **版本**: v1.0  
> **创建日期**: 2025-10-08  
> **状态**: 生产就绪

## 🎯 系统概述

云表单系统记忆系统是专为云表单系统设计的智能记忆管理方案，继承自MSH系统的优秀实践，并适配云表单的技术特点。

## 📁 文件结构

- `README.md` - 本文件，使用指南
- `progress.md` - 项目进度记录
- `memory.json` - 用户偏好和习惯
- `rules.md` - P0/P1级规则集合
- `design-system.json` - UI/UX设计规范
- `tech-stack-mapping.md` - 技术栈对照表

## 🎯 核心原则

1. **独立但一致**: 独立的记忆系统，但与MSH保持一致的风格
2. **适配技术栈**: 所有规则适配阿里云技术栈
3. **安全优先**: 继承MSH的安全经验
4. **持续同步**: 定期同步MSH的通用规则更新

## 🚀 快速开始

### 日常开发
1. 阅读 `rules.md` 了解P0/P1级规则
2. 参考 `design-system.json` 进行UI开发
3. 遵循 `memory.json` 中的用户偏好

### 记录进度
在 `progress.md` 中记录开发进展，使用 [云表单] 标识

### 更新规则
当MSH系统规则更新时，评估后同步到本系统

## 📋 与MSH系统的关系

**继承关系**:
- ✅ 继承通用规则（100%）
- ✅ 继承用户偏好（100%）
- ✅ 继承设计规范（100%）
- 🔄 适配技术规则（需要修改）

**独立性**:
- ✅ 独立的记忆系统目录
- ✅ 独立的配置文件
- ✅ 独立的进度记录
- ✅ 独立的技术栈

## 🔗 相关文档

- [MSH记忆系统](../../simple-memory-system/README.md)
- [系统识别指南](../../simple-memory-system/SYSTEM_CONTEXT.md)
- [记忆移植分析](../../docs/MEMORY_MIGRATION_ANALYSIS.md)
```

**验收标准**: ✅ README.md 创建完成

---

#### 任务 1.3: 移植 P0/P1 级规则

**文件**: `cloud-forms/.cloud-memory/rules.md`

**执行步骤**:
1. 从 MSH 的 `.cursorrules` 复制通用规则
2. 适配 Firebase → 阿里云
3. 添加云表单特定规则

**内容模板**:
```markdown
# 云表单系统规则集合

> **版本**: v1.0  
> **创建日期**: 2025-10-08  
> **来源**: 继承自MSH系统，适配云表单技术栈

---

## 🔴 P0级规则（必须遵守）

### P0-1: 系统识别

**在执行任何操作前，必须确认当前在云表单系统**

**系统标识**:
- 路径: `/Users/benchen/MSH/cloud-forms/`
- 技术栈: 阿里云 ECS + RDS MySQL
- 配置文件: `cloud-forms/config.js`
- 记录标识: [云表单]

**严禁操作**:
- ❌ 使用 Firebase
- ❌ 访问 MSH 的 config.js
- ❌ 在记录中不标注 [云表单]

---

### P0-2: 时间管理

**任何涉及时间的操作，必须先运行 `date +%Y-%m-%d` 命令获取当前系统时间**

- ✅ 使用刚刚获取的当前系统时间
- ❌ 严禁使用对话历史中的日期
- ❌ 严禁使用推测或记忆中的日期
- ❌ 严禁使用未来日期
- 📋 格式必须为：YYYY-MM-DD

**触发条件**: 创建新文档、更新现有文档、记录进度、生成报告

---

### P0-3: 数据安全

**任何数据覆盖操作必须用户多次确认**

**MySQL 特定规则**:
- 🚨 检测到 `DELETE FROM table` 时必须立即警告
- 🚨 对话包含"删除全表"时必须多次确认
- ❌ 禁止使用 `TRUNCATE TABLE`（除非用户明确要求）
- ✅ 使用 `UPDATE` 更新指定记录
- ✅ 使用 `DELETE WHERE` 删除指定记录

**API 特定规则**:
- 🚨 检测到批量删除API时必须确认
- ✅ 使用事务保证数据一致性
- ✅ 重要操作前先备份数据

---

### P0-4: 文档管理

**禁止主动创建文档文件（.md），只有用户明确请求时才能创建新文档**

- ❌ 禁止主动创建 .md 文档
- ❌ 禁止主动创建 README 文件
- ❌ 禁止"善意"创建文档
- ✅ 只在用户明确请求时创建
- ✅ 优先在现有文档中扩展内容

---

### P0-5: 技术栈隔离

**云表单系统只能使用阿里云技术栈**

**允许使用**:
- ✅ fetch() 调用阿里云 API
- ✅ MySQL 数据库操作
- ✅ Redis 缓存
- ✅ 阿里云 OSS 存储

**严禁使用**:
- ❌ Firebase 任何功能
- ❌ localStorage 存储敏感数据（可用于临时UI状态）
- ❌ MSH 系统的配置文件

---

### P0-6: 地域限制

**云表单系统仅限国内使用**

- ✅ 部署在阿里云国内区域
- ✅ 使用国内CDN
- ❌ 禁止部署到海外服务器
- ❌ 禁止使用需要翻墙的服务

---

## 🟡 P1级规则（强烈建议）

### P1-1: 代码修改验证

**任何涉及代码修改的操作，必须遵循"分析-确认-执行"三步流程**

**重要说明**:
- 🔍 **检查/诊断操作** → 可以直接执行，不需要确认
- ⚠️ **修改代码操作** → 必须先分析、等确认、再执行

**标准流程**:
1. 📊 先提供分析报告（影响范围、修改方案、风险评估）
2. ✅ 等待用户确认
3. 🔧 确认后再执行修改

**适用场景**: 多文件修改、关键逻辑修改、跨模块修改、架构调整、性能优化、Bug修复

---

### P1-2: API 设计规范

**所有 API 必须遵循 RESTful 规范**

**命名规范**:
- ✅ GET `/api/events` - 获取事件列表
- ✅ POST `/api/events` - 创建事件
- ✅ PUT `/api/events/:id` - 更新事件
- ✅ DELETE `/api/events/:id` - 删除事件

**响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

---

### P1-3: 错误处理

**所有异步操作必须包含 try-catch 错误处理**

```javascript
try {
  const response = await fetch('/api/events');
  const data = await response.json();
  // 处理数据
} catch (error) {
  console.error('获取事件失败:', error);
  // 显示用户友好的错误提示
}
```

---

### P1-4: 数据验证

**前后端都必须进行数据验证**

**前端验证**:
- ✅ 必填字段检查
- ✅ 格式验证（邮箱、电话等）
- ✅ 长度限制

**后端验证**:
- ✅ 参数类型检查
- ✅ SQL 注入防护
- ✅ XSS 防护

---

## 🟢 P2级规则（建议遵循）

### P2-1: 代码注释

**使用中文注释，详细说明功能**

```javascript
/**
 * 获取事件列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise<Array>} 事件列表
 */
async function getEvents(params) {
  // 实现代码
}
```

---

### P2-2: 性能优化

**避免频繁的数据库查询**

- ✅ 使用 Redis 缓存热点数据
- ✅ 批量操作代替单条操作
- ✅ 使用数据库索引
- ✅ 分页查询大数据量

---

### P2-3: 安全最佳实践

**保护敏感信息**

- ✅ 使用环境变量存储密钥
- ✅ 密码必须加密存储
- ✅ 使用 HTTPS
- ✅ 实施 CORS 策略

---

## 📋 规则检查清单

### 开始任何操作前

- [ ] 确认当前在云表单系统（路径包含 `cloud-forms/`）
- [ ] 确认使用阿里云技术栈
- [ ] 确认不会访问 Firebase
- [ ] 记录时添加 [云表单] 标识

### 修改代码前

- [ ] 提供分析报告
- [ ] 等待用户确认
- [ ] 确认后执行修改

### 数据操作前

- [ ] 评估影响范围
- [ ] 确认是否需要备份
- [ ] 使用事务保证一致性
- [ ] 添加错误处理

---

**文档版本**: v1.0  
**创建日期**: 2025-10-08  
**最后更新**: 2025-10-08  
**状态**: ✅ 生效中
```

**验收标准**: ✅ rules.md 创建完成，包含所有P0/P1/P2规则

---

### Day 2: 移植用户偏好和设计规范

#### 任务 2.1: 移植用户偏好

**文件**: `cloud-forms/.cloud-memory/memory.json`

**执行步骤**:
1. 读取 MSH 的 `simple-memory-system/memory.json`
2. 复制用户偏好部分
3. 添加云表单特定配置

**内容模板**:
```json
{
  "version": "1.0",
  "created_at": "2025-10-08",
  "system": "云表单系统",
  "source": "继承自MSH系统",
  
  "user_preferences": {
    "code_style": {
      "comment_language": "中文",
      "naming_convention": "camelCase",
      "error_handling": "try-catch",
      "async_pattern": "async/await",
      "indent": "2 spaces",
      "quotes": "single"
    },
    
    "development_habits": {
      "modular_design": true,
      "documentation_first": false,
      "test_driven": false,
      "incremental_development": true,
      "code_review": true,
      "git_commit_frequency": "frequent"
    },
    
    "communication_style": {
      "language": "中文",
      "detail_level": "详细",
      "code_explanation": "需要",
      "confirmation_before_action": true,
      "progress_updates": "及时",
      "error_reporting": "详细"
    },
    
    "ui_preferences": {
      "design_style": "现代简洁",
      "color_scheme": "蓝色渐变",
      "responsive": true,
      "accessibility": true,
      "animation": "适度"
    }
  },
  
  "cloud_forms_specific": {
    "tech_stack": {
      "backend": "阿里云 ECS + RDS MySQL",
      "frontend": "HTML5 + Vanilla JS",
      "cache": "Redis",
      "storage": "阿里云 OSS",
      "deployment": "阿里云 ECS"
    },
    
    "security": {
      "region": "国内",
      "auth": "JWT Token",
      "encryption": "AES-256",
      "https": true
    },
    
    "performance": {
      "cache_strategy": "Redis + 浏览器缓存",
      "cdn": "阿里云 CDN",
      "lazy_loading": true,
      "pagination": true
    }
  },
  
  "recent_activities": {
    "memory_system_setup": {
      "date": "2025-10-08",
      "type": "SETUP",
      "description": "创建云表单系统记忆系统，继承MSH系统规则"
    }
  },
  
  "statistics": {
    "total_records": 1,
    "last_updated": "2025-10-08"
  }
}
```

**验收标准**: ✅ memory.json 创建完成，包含用户偏好和云表单特定配置

---

#### 任务 2.2: 移植设计规范

**文件**: `cloud-forms/.cloud-memory/design-system.json`

**执行步骤**:
1. 读取 MSH 的 `DESIGN-SYSTEM.json`
2. 复制设计规范
3. 调整云表单的主题色

**内容模板**:
```json
{
  "version": "1.0",
  "created_at": "2025-10-08",
  "system": "云表单系统设计规范",
  "source": "继承自MSH系统",
  
  "colors": {
    "primary": "#4facfe",
    "primary_dark": "#00d4fe",
    "secondary": "#667eea",
    "success": "#28a745",
    "warning": "#ffc107",
    "error": "#dc3545",
    "info": "#17a2b8",
    
    "text": {
      "primary": "#2c3e50",
      "secondary": "#6c757d",
      "disabled": "#adb5bd",
      "inverse": "#ffffff"
    },
    
    "background": {
      "primary": "#ffffff",
      "secondary": "#f8f9fa",
      "tertiary": "#e9ecef",
      "dark": "#343a40"
    },
    
    "border": {
      "light": "#e9ecef",
      "medium": "#dee2e6",
      "dark": "#adb5bd"
    },
    
    "gradients": {
      "primary": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "secondary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "success": "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
    }
  },
  
  "typography": {
    "font_family": {
      "base": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      "monospace": "'Courier New', Courier, monospace"
    },
    
    "font_size": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px"
    },
    
    "font_weight": {
      "light": 300,
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    
    "line_height": {
      "tight": 1.25,
      "normal": 1.5,
      "relaxed": 1.75
    }
  },
  
  "spacing": {
    "unit": "8px",
    "scale": [0, 8, 16, 24, 32, 40, 48, 64, 80, 96]
  },
  
  "border_radius": {
    "sm": "5px",
    "md": "8px",
    "lg": "12px",
    "xl": "15px",
    "2xl": "20px",
    "full": "9999px"
  },
  
  "shadows": {
    "sm": "0 1px 3px rgba(0,0,0,0.1)",
    "md": "0 4px 6px rgba(0,0,0,0.1)",
    "lg": "0 10px 25px rgba(0,0,0,0.1)",
    "xl": "0 20px 60px rgba(0,0,0,0.2)"
  },
  
  "transitions": {
    "fast": "0.15s ease",
    "normal": "0.3s ease",
    "slow": "0.5s ease"
  },
  
  "breakpoints": {
    "mobile": "320px",
    "tablet": "768px",
    "desktop": "1024px",
    "wide": "1280px"
  },
  
  "components": {
    "button": {
      "border_radius": "5px",
      "padding": "10px 20px",
      "font_weight": 500,
      "transition": "0.3s ease",
      "variants": {
        "primary": {
          "background": "#4facfe",
          "color": "#ffffff",
          "hover_background": "#00d4fe"
        },
        "secondary": {
          "background": "#6c757d",
          "color": "#ffffff",
          "hover_background": "#5a6268"
        },
        "success": {
          "background": "#28a745",
          "color": "#ffffff",
          "hover_background": "#218838"
        }
      }
    },
    
    "card": {
      "border_radius": "12px",
      "padding": "20px",
      "shadow": "0 4px 6px rgba(0,0,0,0.1)",
      "background": "#ffffff",
      "border": "1px solid #e9ecef"
    },
    
    "input": {
      "border_radius": "5px",
      "padding": "10px 15px",
      "border": "1px solid #dee2e6",
      "focus_border": "#4facfe",
      "background": "#ffffff"
    },
    
    "modal": {
      "border_radius": "15px",
      "shadow": "0 10px 30px rgba(0,0,0,0.2)",
      "backdrop": "rgba(0,0,0,0.5)",
      "max_width": "600px"
    }
  },
  
  "layout": {
    "container_max_width": "1200px",
    "grid_columns": 12,
    "grid_gap": "20px"
  }
}
```

**验收标准**: ✅ design-system.json 创建完成，包含完整的设计规范

---

### Day 3: 创建进度记录和技术对照表

#### 任务 3.1: 创建进度记录

**文件**: `cloud-forms/.cloud-memory/progress.md`

**内容模板**:
```markdown
# 云表单系统项目进度记录

> 最后更新：2025-10-08  
> 项目：云表单系统  
> 版本：v1.0  
> 技术栈：阿里云 ECS + RDS MySQL

---

## 🎯 当前状态

**项目目标**：基于阿里云的独立数据管理系统，支持事件跟踪和小家签到

**技术栈**：
- 后端：阿里云 ECS + RDS MySQL
- 前端：HTML5 + Vanilla JS
- 缓存：Redis
- 存储：阿里云 OSS
- 部署：阿里云 ECS

---

## 📝 最新进展 (2025-10-08)

- 🎯 [云表单] **记忆系统建立完成（2025-10-08）**：创建独立的记忆系统，继承MSH规则 ✅
  - **系统**: 云表单系统
  - **技术栈**: 阿里云 ECS + RDS MySQL
  - **继承内容**：
    - P0/P1/P2级规则（100%）
    - 用户偏好配置（100%）
    - UI/UX设计规范（100%）
  - **适配内容**：
    - 数据安全规则（Firebase → MySQL）
    - 技术栈规则（Firebase → 阿里云）
  - **文件结构**：
    - `.cloud-memory/README.md` - 使用指南
    - `.cloud-memory/progress.md` - 本文件
    - `.cloud-memory/memory.json` - 用户偏好
    - `.cloud-memory/rules.md` - 规则集合
    - `.cloud-memory/design-system.json` - 设计规范
    - `.cloud-memory/tech-stack-mapping.md` - 技术对照表

- 📂 [云表单] **系统结构整理完成（2025-10-08）**：三入口设计，模块清晰 ✅
  - **系统**: 云表单系统
  - **技术栈**: 阿里云 ECS + RDS MySQL
  - **主要模块**：
    1. 事件跟踪模块
    2. 小家签到模块（签到、报表、管理、成员）
    3. 工具模块（测试工具）

---

## 📋 待办事项

### 高优先级 (P0)

- [ ] 创建阿里云配置文件
- [ ] 设计 API 接口规范
- [ ] 创建数据库表结构
- [ ] 实现 JWT 认证

### 中优先级 (P1)

- [ ] 开发事件跟踪模块
- [ ] 开发小家签到模块
- [ ] 实现数据导入导出功能
- [ ] 创建测试套件

### 低优先级 (P2)

- [ ] 性能优化
- [ ] 文档完善
- [ ] 用户反馈收集

---

## 🎯 里程碑

### Phase 1: 基础搭建 (Week 1-2)
- [x] 记忆系统建立
- [ ] 配置文件创建
- [ ] API 接口设计
- [ ] 数据库设计

### Phase 2: 核心功能 (Week 3-6)
- [ ] 事件跟踪模块
- [ ] 小家签到模块
- [ ] 成员管理模块
- [ ] 认证授权系统

### Phase 3: 完善优化 (Week 7-8)
- [ ] 性能优化
- [ ] 安全加固
- [ ] 测试完善
- [ ] 文档编写

---

## 📊 统计信息

- **总任务数**: 15
- **已完成**: 2
- **进行中**: 0
- **待开始**: 13
- **完成率**: 13%

---

**文档版本**: v1.0  
**创建日期**: 2025-10-08  
**最后更新**: 2025-10-08
```

**验收标准**: ✅ progress.md 创建完成

---

#### 任务 3.2: 创建技术栈对照表

**文件**: `cloud-forms/.cloud-memory/tech-stack-mapping.md`

**内容模板**:
```markdown
# 技术栈对照表

> **版本**: v1.0  
> **创建日期**: 2025-10-08  
> **目的**: 帮助理解MSH系统和云表单系统的技术差异

---

## 📊 技术栈对照

| 功能 | MSH系统 | 云表单系统 | 说明 |
|------|---------|-----------|------|
| **数据库** | Firebase Realtime Database | 阿里云 RDS MySQL | 完全不同 |
| **认证** | Firebase Auth | JWT Token | 需要重新实现 |
| **存储** | Firebase + localStorage | MySQL + Redis | 架构不同 |
| **部署** | 静态文件服务器 | 阿里云 ECS | 部署方式不同 |
| **CDN** | Firebase Hosting | 阿里云 CDN | 服务商不同 |
| **缓存** | localStorage | Redis | 技术不同 |
| **文件存储** | Firebase Storage | 阿里云 OSS | 服务不同 |

---

## 🔄 代码模式对照

### 数据查询

**MSH系统 (Firebase)**:
```javascript
// 查询数据
firebase.database()
  .ref('events')
  .once('value')
  .then(snapshot => {
    const data = snapshot.val();
    // 处理数据
  });
```

**云表单系统 (API + MySQL)**:
```javascript
// 查询数据
fetch('/api/events')
  .then(res => res.json())
  .then(data => {
    // 处理数据
  })
  .catch(error => {
    console.error('查询失败:', error);
  });
```

---

### 数据创建

**MSH系统 (Firebase)**:
```javascript
// 创建数据
firebase.database()
  .ref('events')
  .push({
    name: '新事件',
    date: '2025-10-08'
  });
```

**云表单系统 (API + MySQL)**:
```javascript
// 创建数据
fetch('/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '新事件',
    date: '2025-10-08'
  })
})
.then(res => res.json())
.then(data => {
  console.log('创建成功:', data);
});
```

---

### 数据更新

**MSH系统 (Firebase)**:
```javascript
// 更新数据
firebase.database()
  .ref(`events/${eventId}`)
  .update({
    status: 'completed'
  });
```

**云表单系统 (API + MySQL)**:
```javascript
// 更新数据
fetch(`/api/events/${eventId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'completed'
  })
})
.then(res => res.json())
.then(data => {
  console.log('更新成功:', data);
});
```

---

### 数据删除

**MSH系统 (Firebase)**:
```javascript
// 删除数据
firebase.database()
  .ref(`events/${eventId}`)
  .remove();
```

**云表单系统 (API + MySQL)**:
```javascript
// 删除数据
fetch(`/api/events/${eventId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('删除成功:', data);
});
```

---

### 实时监听

**MSH系统 (Firebase)**:
```javascript
// 实时监听
firebase.database()
  .ref('events')
  .on('value', snapshot => {
    const data = snapshot.val();
    // 实时更新UI
  });
```

**云表单系统 (轮询或WebSocket)**:
```javascript
// 方案1: 定时轮询
setInterval(() => {
  fetch('/api/events')
    .then(res => res.json())
    .then(data => {
      // 更新UI
    });
}, 5000); // 每5秒查询一次

// 方案2: WebSocket (推荐)
const ws = new WebSocket('ws://api.example.com/events');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 实时更新UI
};
```

---

## 🔒 安全规则对照

### 数据安全

**MSH系统**:
```javascript
// 禁止使用 set() 覆盖全部数据
firebase.database().ref('events').set(data); // ❌ 禁止

// 使用 update() 增量更新
firebase.database().ref('events').update(data); // ✅ 推荐
```

**云表单系统**:
```sql
-- 禁止删除全表
DELETE FROM events; -- ❌ 禁止

-- 删除指定记录
DELETE FROM events WHERE id = 1; -- ✅ 推荐

-- 使用事务保证一致性
START TRANSACTION;
UPDATE events SET status = 'completed' WHERE id = 1;
COMMIT;
```

---

## 📋 迁移检查清单

### 从 MSH 迁移到云表单时

- [ ] 将 `firebase.database()` 改为 `fetch('/api/')`
- [ ] 将 `.ref()` 改为 API 路径
- [ ] 将 `.once()` / `.on()` 改为 `fetch()` 或 WebSocket
- [ ] 将 `.push()` 改为 `POST` 请求
- [ ] 将 `.update()` 改为 `PUT` 请求
- [ ] 将 `.remove()` 改为 `DELETE` 请求
- [ ] 添加 JWT Token 认证
- [ ] 添加错误处理
- [ ] 使用 try-catch 包裹异步操作

---

## 🎯 最佳实践

### 云表单系统开发建议

1. **统一使用 async/await**
```javascript
async function getEvents() {
  try {
    const response = await fetch('/api/events');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取事件失败:', error);
    throw error;
  }
}
```

2. **封装 API 调用**
```javascript
// api.js
class API {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// 使用
const api = new API('https://api.example.com', token);
const events = await api.get('/events');
```

3. **使用 Redis 缓存**
```javascript
// 先查缓存，再查数据库
async function getEvents() {
  // 尝试从缓存获取
  const cached = await redis.get('events');
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 从数据库获取
  const events = await db.query('SELECT * FROM events');
  
  // 存入缓存（5分钟过期）
  await redis.setex('events', 300, JSON.stringify(events));
  
  return events;
}
```

---

**文档版本**: v1.0  
**创建日期**: 2025-10-08  
**最后更新**: 2025-10-08
```

**验收标准**: ✅ tech-stack-mapping.md 创建完成

---

### Week 1 验收标准

**完成标准**:
- ✅ 目录结构创建完成
- ✅ 6个核心文件全部创建
- ✅ P0/P1/P2规则完整移植
- ✅ 用户偏好完整移植
- ✅ 设计规范完整移植
- ✅ 技术对照表创建完成

**验收方式**:
```bash
cd /Users/benchen/MSH/cloud-forms/.cloud-memory
ls -la
# 应该看到所有6个文件

cat README.md | wc -l
# 应该有内容

cat rules.md | grep "P0级规则"
# 应该找到规则
```

---

## 📅 Week 2: 技术适配和配置创建

### Day 4-5: 创建配置文件

#### 任务 4.1: 创建阿里云配置文件

**文件**: `cloud-forms/config.js`

**内容模板**:
```javascript
/**
 * 云表单系统配置文件
 * 
 * ⚠️ 重要提示:
 * 1. 本文件包含阿里云配置，禁止包含任何Firebase配置
 * 2. 敏感信息应使用环境变量
 * 3. 生产环境配置应单独管理
 */

const CloudConfig = {
  // 系统信息
  system: {
    name: '云表单系统',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // API 配置
  api: {
    baseURL: process.env.API_BASE_URL || 'https://api.example.com',
    timeout: 30000,
    retryTimes: 3
  },
  
  // 阿里云配置
  aliyun: {
    region: 'cn-hangzhou',
    
    // RDS MySQL 配置
    rds: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'cloud_forms',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectionLimit: 10
    },
    
    // Redis 配置
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: 0
    },
    
    // OSS 配置
    oss: {
      region: 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || 'cloud-forms'
    }
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },
  
  // 安全配置
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 限制100次请求
    }
  },
  
  // 缓存配置
  cache: {
    defaultTTL: 300, // 5分钟
    checkPeriod: 600 // 10分钟检查一次过期
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: './logs/app.log'
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudConfig;
}
```

**验收标准**: ✅ config.js 创建完成，不包含任何Firebase配置

---

#### 任务 4.2: 创建环境变量模板

**文件**: `cloud-forms/.env.example`

**内容**:
```env
# 云表单系统环境变量模板
# 复制此文件为 .env 并填写实际值

# 环境
NODE_ENV=development

# API 配置
API_BASE_URL=https://api.example.com

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cloud_forms
DB_USER=root
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=cloud-forms

# JWT 配置
JWT_SECRET=your_jwt_secret_key

# CORS 配置
CORS_ORIGIN=*

# 日志级别
LOG_LEVEL=info
```

**验收标准**: ✅ .env.example 创建完成

---

### Day 6-7: API 接口设计

#### 任务 6.1: 创建 API 接口规范文档

**文件**: `cloud-forms/docs/API_SPECIFICATION.md`

**内容**: (创建完整的API文档，包括所有端点、请求/响应格式、错误码等)

---

## 📅 Week 3: 完善和测试

### Day 8-10: 测试和文档

#### 任务 8.1: 创建测试计划

**文件**: `cloud-forms/docs/TEST_PLAN.md`

#### 任务 8.2: 编写开发者指南

**文件**: `cloud-forms/docs/DEVELOPER_GUIDE.md`

---

## 📋 总体验收标准

### 必须完成的文件

```
cloud-forms/
├── .cloud-memory/
│   ├── README.md                 ✅
│   ├── progress.md               ✅
│   ├── memory.json               ✅
│   ├── rules.md                  ✅
│   ├── design-system.json        ✅
│   └── tech-stack-mapping.md     ✅
├── config.js                     ✅
├── .env.example                  ✅
└── docs/
    ├── API_SPECIFICATION.md      ✅
    ├── TEST_PLAN.md              ✅
    └── DEVELOPER_GUIDE.md        ✅
```

### 质量标准

- ✅ 所有P0规则已移植并适配
- ✅ 所有用户偏好已移植
- ✅ 所有设计规范已移植
- ✅ 技术栈对照表完整
- ✅ 配置文件不包含Firebase
- ✅ API规范文档完整
- ✅ 测试计划完整

---

## 🎯 成功指标

**完成标准**:
1. ✅ 记忆系统完整建立
2. ✅ 继承MSH 80%的规则和习惯
3. ✅ 适配云表单技术特点
4. ✅ 所有文档齐全
5. ✅ 通过验收测试

**预期效果**:
- 开发效率提升 50%+
- 代码质量保持一致
- 避免重复MSH的错误
- 用户体验统一

---

**文档版本**: v1.0  
**创建日期**: 2025-10-08  
**状态**: 📋 待执行  
**预计完成**: 2025-10-29
