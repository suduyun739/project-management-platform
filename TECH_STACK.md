# 技术架构文档

## 技术栈概览

### 前端技术栈

- **框架**: Vue 3.4+ (Composition API)
- **构建工具**: Vite 5.0+
- **语言**: TypeScript 5.3+
- **UI组件库**: Element Plus 2.5+
- **状态管理**: Pinia 2.1+
- **路由**: Vue Router 4.2+
- **HTTP客户端**: Axios 1.6+
- **样式**: CSS3 + Element Plus 主题

### 后端技术栈

- **运行时**: Node.js 18+
- **框架**: Express 4.18+
- **语言**: TypeScript 5.3+
- **ORM**: Prisma 5.7+
- **数据库**: PostgreSQL 14+
- **认证**: JWT (jsonwebtoken 9.0+)
- **密码加密**: bcrypt 5.1+
- **数据验证**: Zod 3.22+
- **跨域**: CORS 2.8+

### 开发工具

- **包管理器**: npm
- **代码规范**: TypeScript ESLint
- **容器化**: Docker + Docker Compose
- **版本控制**: Git

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         浏览器客户端                          │
│                    (Vue 3 + Element Plus)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST API
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                         前端服务                              │
│                    (Vite Dev Server / Nginx)                 │
│                         Port: 5173                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ API Requests
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                         后端服务                              │
│                    (Node.js + Express)                       │
│                         Port: 3000                           │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │ Projects │  │ Require  │  │  Tasks   │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                        │   │
│  │         (Authentication, Authorization)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Prisma ORM                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Database Queries
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 数据库                          │
│                         Port: 5432                           │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Users  │  │Projects │  │Require  │  │  Tasks  │       │
│  │  Table  │  │  Table  │  │  Table  │  │  Table  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 前端架构

```
frontend/
├── public/              # 静态资源
│   └── favicon.svg      # 网站图标
├── src/
│   ├── api/            # API 接口封装
│   │   ├── auth.ts     # 认证相关
│   │   ├── projects.ts # 项目管理
│   │   ├── requirements.ts # 需求管理
│   │   ├── tasks.ts    # 任务管理
│   │   └── users.ts    # 用户管理
│   ├── assets/         # 资源文件
│   ├── components/     # 公共组件
│   ├── router/         # 路由配置
│   │   └── index.ts
│   ├── stores/         # Pinia 状态管理
│   │   └── auth.ts     # 认证状态
│   ├── types/          # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/          # 工具函数
│   │   └── request.ts  # Axios 封装
│   ├── views/          # 页面组件
│   │   ├── Login.vue       # 登录页
│   │   ├── Dashboard.vue   # 数据统计
│   │   ├── Projects.vue    # 项目管理
│   │   ├── Requirements.vue # 需求管理
│   │   ├── Tasks.vue       # 任务管理
│   │   ├── Kanban.vue      # 看板视图
│   │   └── Users.vue       # 用户管理
│   ├── App.vue         # 根组件
│   └── main.ts         # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 后端架构

```
backend/
├── prisma/
│   ├── schema.prisma   # 数据库模型定义
│   ├── seed.ts         # 种子数据
│   └── migrations/     # 数据库迁移文件
├── src/
│   ├── middleware/     # 中间件
│   │   └── auth.ts     # 认证中间件
│   ├── routes/         # 路由处理
│   │   ├── auth.ts     # 认证路由
│   │   ├── projects.ts # 项目路由
│   │   ├── requirements.ts # 需求路由
│   │   ├── tasks.ts    # 任务路由
│   │   └── users.ts    # 用户路由
│   ├── types/          # 类型定义
│   │   └── index.ts
│   ├── utils/          # 工具函数
│   │   └── prisma.ts   # Prisma 客户端
│   └── index.ts        # 入口文件
├── .env                # 环境变量
├── package.json
└── tsconfig.json
```

## 数据库设计

### ER 图

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │         │   Project   │         │ Requirement │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ id (PK)     │────┐    │ id (PK)     │────┐    │ id (PK)     │
│ username    │    │    │ name        │    │    │ title       │
│ password    │    │    │ description │    │    │ description │
│ name        │    │    │ status      │    │    │ status      │
│ email       │    │    │ priority    │    │    │ priority    │
│ role        │    │    │ startDate   │    │    │ projectId(FK)│
│ avatar      │    │    │ endDate     │    │    │ parentId(FK)│
│ createdAt   │    │    │ sortOrder   │    │    │ estimatedHrs│
└─────────────┘    │    │ creatorId(FK)│    │    │ createdAt   │
                   │    └─────────────┘    │    └─────────────┘
                   │            │           │            │
                   └────────────┼───────────┼────────────┘
                                │           │
                                ↓           ↓
                   ┌─────────────────────────────────┐
                   │    RequirementAssignee          │
                   ├─────────────────────────────────┤
                   │ id (PK)                         │
                   │ requirementId (FK) → Requirement│
                   │ userId (FK) → User              │
                   └─────────────────────────────────┘

┌─────────────┐
│    Task     │
├─────────────┤
│ id (PK)     │
│ title       │
│ description │
│ status      │
│ priority    │
│ projectId(FK)│
│ requirementId(FK)│
│ parentId(FK)│
│ estimatedHrs│
│ actualHours │
│ startDate   │
│ dueDate     │
│ createdAt   │
└─────────────┘
       │
       ↓
┌─────────────────────────────────┐
│       TaskAssignee              │
├─────────────────────────────────┤
│ id (PK)                         │
│ taskId (FK) → Task              │
│ userId (FK) → User              │
└─────────────────────────────────┘
```

### 数据表详细说明

#### User（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| username | String | 用户名（唯一） |
| password | String | 密码（bcrypt加密） |
| name | String | 姓名 |
| email | String? | 邮箱（可选） |
| role | Enum | 角色（ADMIN/MEMBER） |
| avatar | String? | 头像URL（可选） |
| createdAt | DateTime | 创建时间 |

#### Project（项目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| name | String | 项目名称 |
| description | String? | 项目描述 |
| status | Enum | 状态（PLANNING/ACTIVE/COMPLETED/PAUSED） |
| priority | Enum | 优先级（LOW/MEDIUM/HIGH/URGENT） |
| startDate | DateTime? | 开始日期 |
| endDate | DateTime? | 结束日期 |
| sortOrder | Int | 排序序号 |
| creatorId | String | 创建人ID（外键→User） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Requirement（需求表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| title | String | 需求标题 |
| description | String? | 需求描述 |
| status | Enum | 状态（PENDING/IN_PROGRESS/COMPLETED/CANCELLED） |
| priority | Enum | 优先级（LOW/MEDIUM/HIGH/URGENT） |
| projectId | String | 项目ID（外键→Project） |
| parentId | String? | 父需求ID（外键→Requirement） |
| estimatedHours | Float? | 预估工时（天） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### RequirementAssignee（需求负责人关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| requirementId | String | 需求ID（外键→Requirement） |
| userId | String | 用户ID（外键→User） |

#### Task（任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| title | String | 任务标题 |
| description | String? | 任务描述 |
| status | Enum | 状态（TODO/IN_PROGRESS/TESTING/DONE/BLOCKED） |
| priority | Enum | 优先级（LOW/MEDIUM/HIGH/URGENT） |
| projectId | String | 项目ID（外键→Project） |
| requirementId | String? | 需求ID（外键→Requirement） |
| parentId | String? | 父任务ID（外键→Task） |
| estimatedHours | Float? | 预估工时（天） |
| actualHours | Float? | 实际工时（天） |
| startDate | DateTime? | 开始日期 |
| dueDate | DateTime? | 截止日期 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### TaskAssignee（任务负责人关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (UUID) | 主键 |
| taskId | String | 任务ID（外键→Task） |
| userId | String | 用户ID（外键→User） |

## 核心技术实现

### 认证与授权

- **JWT Token**: 使用 JWT 进行身份认证
- **角色权限**: ADMIN 和 MEMBER 两种角色
- **中间件验证**: 每个受保护的路由都经过认证中间件

### 数据隔离

- **多负责人机制**: 使用关联表实现多对多关系
- **Prisma查询**: 使用 `some` 关系查询实现数据过滤
- **前后端双重验证**: 前端UI控制 + 后端API保护

### 状态管理

- **Pinia**: Vue 3 推荐的状态管理方案
- **持久化**: Token 存储在 localStorage
- **响应式**: 利用 Vue 3 的响应式系统

### 类型安全

- **TypeScript**: 全栈 TypeScript 开发
- **Zod**: 运行时数据验证
- **Prisma**: 类型安全的数据库ORM

## 性能优化

### 前端优化

- Vite 快速构建和热更新
- 路由懒加载
- Element Plus 按需引入
- 图标 SVG 矢量格式

### 后端优化

- Prisma 查询优化
- 关联数据预加载（include）
- 索引优化
- 连接池管理

### 数据库优化

- 外键索引
- 复合索引
- 查询优化

## 安全措施

- 密码 bcrypt 加密
- JWT Token 验证
- CORS 跨域配置
- SQL 注入防护（Prisma ORM）
- XSS 防护
- 权限验证（前端 + 后端）

## 部署架构

### Docker Compose 部署

```yaml
services:
  db:        # PostgreSQL 数据库
  backend:   # Node.js 后端服务
  frontend:  # Vue 前端服务
```

### 生产环境

- Nginx 反向代理
- PM2 进程管理
- PostgreSQL 主从复制
- 日志收集和监控
- 定期数据备份
