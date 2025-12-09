# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000`
- **认证方式**: JWT Bearer Token
- **请求头**: `Authorization: Bearer <token>`
- **响应格式**: JSON

## 认证接口

### 用户注册

```http
POST /api/auth/register
```

**请求体**:
```json
{
  "username": "string",      // 必填，最少3个字符
  "password": "string",      // 必填，最少6个字符
  "name": "string"           // 必填
}
```

**响应**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "role": "MEMBER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt_token"
}
```

### 用户登录

```http
POST /api/auth/login
```

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "email": "string | null",
    "role": "ADMIN | MEMBER",
    "avatar": "string | null",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt_token"
}
```

### 获取当前用户信息

```http
GET /api/auth/me
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "name": "string",
  "email": "string | null",
  "role": "ADMIN | MEMBER",
  "avatar": "string | null",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 项目接口

### 获取项目列表

```http
GET /api/projects?status=ACTIVE&search=关键词
```

**查询参数**:
- `status`: 项目状态（可选）
- `search`: 搜索关键词（可选）

**响应**:
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "status": "PLANNING | ACTIVE | COMPLETED | PAUSED",
    "priority": "LOW | MEDIUM | HIGH | URGENT",
    "startDate": "2025-01-01T00:00:00.000Z | null",
    "endDate": "2025-12-31T00:00:00.000Z | null",
    "sortOrder": 0,
    "creatorId": "uuid",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "creator": {
      "id": "uuid",
      "name": "string"
    }
  }
]
```

### 获取项目详情

```http
GET /api/projects/:id
```

**响应**: 同项目列表中的单个项目对象

### 创建项目（管理员）

```http
POST /api/projects
```

**请求体**:
```json
{
  "name": "string",                    // 必填
  "description": "string",             // 可选
  "status": "PLANNING",                // 可选，默认 PLANNING
  "priority": "MEDIUM",                // 可选，默认 MEDIUM
  "startDate": "2025-01-01",          // 可选
  "endDate": "2025-12-31"             // 可选
}
```

**响应**: 创建的项目对象

### 更新项目（管理员）

```http
PUT /api/projects/:id
```

**请求体**: 同创建项目，所有字段可选

**响应**: 更新后的项目对象

### 删除项目（管理员）

```http
DELETE /api/projects/:id
```

**响应**:
```json
{
  "message": "项目删除成功"
}
```

### 项目排序（管理员）

```http
POST /api/projects/:id/sort
```

**请求体**:
```json
{
  "action": "moveUp | moveDown | pinToTop"
}
```

**响应**:
```json
{
  "message": "项目排序更新成功"
}
```

---

## 需求接口

### 获取需求列表

```http
GET /api/requirements?projectId=uuid&status=PENDING&priority=HIGH&assigneeId=uuid&search=关键词
```

**查询参数**:
- `projectId`: 项目ID（可选）
- `status`: 需求状态（可选）
- `priority`: 优先级（可选）
- `assigneeId`: 负责人ID（可选）
- `search`: 搜索关键词（可选）

**数据权限**:
- 管理员：查看所有需求
- 普通用户：只查看自己作为负责人的需求

**响应**:
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string | null",
    "status": "PENDING | IN_PROGRESS | COMPLETED | CANCELLED",
    "priority": "LOW | MEDIUM | HIGH | URGENT",
    "projectId": "uuid",
    "parentId": "uuid | null",
    "estimatedHours": 1.0,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "project": {
      "id": "uuid",
      "name": "string"
    },
    "parent": {
      "id": "uuid",
      "title": "string"
    },
    "assignees": [
      {
        "id": "uuid",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string"
        }
      }
    ],
    "children": []
  }
]
```

### 获取需求详情

```http
GET /api/requirements/:id
```

**响应**: 同需求列表中的单个需求对象

### 创建需求

```http
POST /api/requirements
```

**请求体**:
```json
{
  "title": "string",                  // 必填
  "description": "string",            // 可选
  "status": "PENDING",                // 可选，默认 PENDING
  "priority": "MEDIUM",               // 可选，默认 MEDIUM
  "projectId": "uuid",                // 必填
  "parentId": "uuid",                 // 可选，子需求时填写
  "assigneeIds": ["uuid"],            // 可选，负责人ID数组
  "estimatedHours": 1.0               // 可选，默认1
}
```

**注意**: 普通用户创建时会自动添加为负责人

**响应**: 创建的需求对象

### 更新需求

```http
PUT /api/requirements/:id
```

**请求体**: 同创建需求，所有字段可选

**权限**:
- 管理员：可更新所有需求
- 普通用户：只能更新自己作为负责人的需求

**响应**: 更新后的需求对象

### 删除需求（管理员）

```http
DELETE /api/requirements/:id
```

**响应**:
```json
{
  "message": "需求删除成功"
}
```

---

## 任务接口

### 获取任务列表

```http
GET /api/tasks?projectId=uuid&requirementId=uuid&status=TODO&priority=HIGH&assigneeId=uuid&search=关键词
```

**查询参数**:
- `projectId`: 项目ID（可选）
- `requirementId`: 需求ID（可选）
- `status`: 任务状态（可选）
- `priority`: 优先级（可选）
- `assigneeId`: 负责人ID（可选）
- `search`: 搜索关键词（可选）

**数据权限**:
- 管理员：查看所有任务
- 普通用户：只查看自己作为负责人的任务

**响应**:
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string | null",
    "status": "TODO | IN_PROGRESS | TESTING | DONE | BLOCKED",
    "priority": "LOW | MEDIUM | HIGH | URGENT",
    "projectId": "uuid",
    "requirementId": "uuid | null",
    "parentId": "uuid | null",
    "estimatedHours": 1.0,
    "actualHours": 0.0,
    "startDate": "2025-01-01T00:00:00.000Z | null",
    "dueDate": "2025-12-31T00:00:00.000Z | null",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "project": {
      "id": "uuid",
      "name": "string"
    },
    "requirement": {
      "id": "uuid",
      "title": "string"
    },
    "assignees": [
      {
        "id": "uuid",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string"
        }
      }
    ],
    "_count": {
      "comments": 0
    }
  }
]
```

### 获取看板数据

```http
GET /api/tasks/kanban?projectId=uuid&assigneeId=uuid
```

**查询参数**:
- `projectId`: 项目ID（可选）
- `assigneeId`: 负责人ID（可选）

**响应**:
```json
{
  "TODO": [...],
  "IN_PROGRESS": [...],
  "TESTING": [...],
  "DONE": [...],
  "BLOCKED": [...]
}
```

### 获取任务详情

```http
GET /api/tasks/:id
```

**响应**: 同任务列表中的单个任务对象

### 创建任务

```http
POST /api/tasks
```

**请求体**:
```json
{
  "title": "string",                  // 必填
  "description": "string",            // 可选
  "status": "TODO",                   // 可选，默认 TODO
  "priority": "MEDIUM",               // 可选，默认 MEDIUM
  "projectId": "uuid",                // 必填
  "requirementId": "uuid",            // 可选
  "parentId": "uuid",                 // 可选，子任务时填写
  "assigneeIds": ["uuid"],            // 可选，负责人ID数组
  "estimatedHours": 1.0,              // 可选，默认1
  "actualHours": 0.0,                 // 可选
  "startDate": "2025-01-01",         // 可选
  "dueDate": "2025-12-31"            // 可选
}
```

**注意**: 普通用户创建时会自动添加为负责人

**响应**: 创建的任务对象

### 更新任务

```http
PUT /api/tasks/:id
```

**请求体**: 同创建任务，所有字段可选

**权限**:
- 管理员：可更新所有任务
- 普通用户：只能更新自己作为负责人的任务

**响应**: 更新后的任务对象

### 删除任务（管理员）

```http
DELETE /api/tasks/:id
```

**响应**:
```json
{
  "message": "任务删除成功"
}
```

---

## 用户接口

### 获取用户列表

```http
GET /api/users
```

**数据权限**:
- 管理员：查看所有用户
- 普通用户：只查看自己

**响应**:
```json
[
  {
    "id": "uuid",
    "username": "string",
    "name": "string",
    "email": "string | null",
    "role": "ADMIN | MEMBER",
    "avatar": "string | null",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### 获取用户详情

```http
GET /api/users/:id
```

**响应**:
```json
{
  "id": "uuid",
  "username": "string",
  "name": "string",
  "email": "string | null",
  "role": "ADMIN | MEMBER",
  "avatar": "string | null",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "_count": {
    "createdProjects": 0,
    "requirements": 0,
    "tasks": 0
  }
}
```

### 更新用户信息

```http
PUT /api/users/:id
```

**请求体**:
```json
{
  "name": "string",        // 可选
  "email": "string",       // 可选
  "role": "ADMIN"          // 可选，仅管理员可修改角色
}
```

**权限**:
- 管理员：可更新所有用户
- 普通用户：只能更新自己的姓名和邮箱

**响应**: 更新后的用户对象

### 删除用户（管理员）

```http
DELETE /api/users/:id
```

**响应**:
```json
{
  "message": "用户删除成功"
}
```

### 重置用户密码（管理员）

```http
POST /api/users/:id/reset-password
```

**请求体**:
```json
{
  "newPassword": "string"  // 必填，最少6个字符
}
```

**响应**:
```json
{
  "message": "密码重置成功"
}
```

---

## 错误响应

所有错误响应格式统一：

```json
{
  "error": "错误信息"
}
```

### 常见HTTP状态码

- `200 OK`: 请求成功
- `201 Created`: 创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器错误

### 常见错误信息

- `用户名或密码错误`: 登录失败
- `Token 无效或已过期`: 认证失败
- `只有管理员可以执行此操作`: 权限不足
- `无权访问此资源`: 数据权限不足
- `资源不存在`: 请求的资源ID不存在

---

## 枚举值定义

### 用户角色（Role）

- `ADMIN`: 管理员
- `MEMBER`: 普通成员

### 项目状态（ProjectStatus）

- `PLANNING`: 规划中
- `ACTIVE`: 进行中
- `COMPLETED`: 已完成
- `PAUSED`: 已暂停

### 需求状态（RequirementStatus）

- `PENDING`: 待处理
- `IN_PROGRESS`: 进行中
- `COMPLETED`: 已完成
- `CANCELLED`: 已取消

### 任务状态（TaskStatus）

- `TODO`: 待办
- `IN_PROGRESS`: 进行中
- `TESTING`: 测试中
- `DONE`: 已完成
- `BLOCKED`: 已阻塞

### 优先级（Priority）

- `LOW`: 低
- `MEDIUM`: 中
- `HIGH`: 高
- `URGENT`: 紧急

---

## 请求示例

### 使用 curl

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取项目列表
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"新任务",
    "projectId":"project-uuid",
    "status":"TODO",
    "priority":"MEDIUM"
  }'
```

### 使用 JavaScript (Axios)

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// 获取项目列表
const projects = await api.get('/projects')

// 创建任务
const task = await api.post('/tasks', {
  title: '新任务',
  projectId: 'project-uuid',
  status: 'TODO',
  priority: 'MEDIUM'
})
```
