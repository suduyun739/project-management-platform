# 第一阶段完成 - 后端多负责人API支持

## ✅ 已完成的工作

### 1. 数据库Schema扩展
- ✅ 添加 `sortOrder` 字段到 Project 模型
- ✅ 创建 `RequirementAssignee` 多对多关联表
- ✅ 创建 `TaskAssignee` 多对多关联表
- ✅ 保留旧的 `assigneeId` 字段以兼容旧数据
- ✅ 创建数据迁移脚本，自动迁移现有数据

迁移文件: `backend/prisma/migrations/20240102120000_add_multi_assignees_and_project_sorting/migration.sql`

### 2. 后端API更新

#### Projects API ✅
- GET `/api/projects` - 按 `sortOrder` 排序返回
- POST `/api/projects/reorder` - 批量更新项目排序
- 新增 `reorderProjects()` 前端API方法

#### Requirements API ✅
- **创建** (POST `/api/requirements`)
  - 支持 `assigneeIds` 数组参数
  - 自动创建多对多关系记录

- **更新** (PUT `/api/requirements/:id`)
  - 支持 `assigneeIds` 数组参数
  - 先删除旧关系再创建新关系

- **查询** (GET `/api/requirements`)
  - 返回 `assignees` 关系数据
  - 每个 assignee 包含 user 信息

#### Tasks API ✅
- **创建** (POST `/api/tasks`)
  - 支持 `assigneeIds` 数组参数
  - 自动创建多对多关系记录

- **更新** (PUT `/api/tasks/:id`)
  - 支持 `assigneeIds` 数组参数
  - 先删除旧关系再创建新关系

- **查询** (GET `/api/tasks`)
  - 返回 `assignees` 关系数据
  - 每个 assignee 包含 user 信息

### 3. 前端TypeScript类型更新 ✅
- Project 接口: 添加 `sortOrder: number`
- Requirement 接口: 添加 `assignees?: User[]` 和 `assigneeIds?: string[]`
- Task 接口: 添加 `assignees?: User[]` 和 `assigneeIds?: string[]`

### 4. 前端依赖 ✅
- 添加 `sortablejs@1.15.2` 用于拖拽排序

### 5. Bug修复 ✅
- Tasks.vue: 修复 startDate/dueDate 为空时的验证错误
- Users.vue: 删除邮箱字段

### 6. 代码提交 ✅
已完成4个commit:
1. `4425cdb` - WIP: 重大重构 - 数据模型扩展和表单修复
2. `f22a708` - 添加项目排序API和类型支持
3. `7c3e270` - 更新Requirements API支持多负责人
4. `e933f2c` - 更新Tasks API支持多负责人

## 🎯 测试第一阶段

### 部署步骤

1. **拉取代码**
```bash
cd /path/to/project
git pull origin master
```

2. **运行数据库迁移**
```bash
docker compose down
docker compose up -d postgres

# 等待数据库启动
sleep 5

# 运行迁移
docker compose exec backend npx prisma migrate deploy

# 查看迁移状态
docker compose exec backend npx prisma migrate status
```

3. **重新构建并启动**
```bash
docker compose build
docker compose up -d
```

4. **验证数据迁移**
```bash
# 检查新表是否存在
docker compose exec postgres psql -U pmuser -d project_management -c "\d requirement_assignees"
docker compose exec postgres psql -U pmuser -d project_management -c "\d task_assignees"

# 检查数据是否迁移
docker compose exec postgres psql -U pmuser -d project_management -c "SELECT COUNT(*) FROM requirement_assignees;"
docker compose exec postgres psql -U pmuser -d project_management -c "SELECT COUNT(*) FROM task_assignees;"
```

### API测试

#### 测试创建带多负责人的需求
```bash
curl -X POST http://localhost:3000/api/requirements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试多负责人需求",
    "projectId": "PROJECT_ID",
    "assigneeIds": ["USER_ID_1", "USER_ID_2"]
  }'
```

#### 测试创建带多负责人的任务
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试多负责人任务",
    "projectId": "PROJECT_ID",
    "assigneeIds": ["USER_ID_1", "USER_ID_2"]
  }'
```

#### 测试项目排序
```bash
curl -X POST http://localhost:3000/api/projects/reorder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectIds": ["PROJECT_ID_1", "PROJECT_ID_2", "PROJECT_ID_3"]
  }'
```

#### 测试获取需求（验证返回assignees）
```bash
curl http://localhost:3000/api/requirements \
  -H "Authorization: Bearer YOUR_TOKEN"
```

期望的响应应该包含:
```json
{
  "id": "xxx",
  "title": "需求标题",
  "assignees": [
    {
      "requirementId": "xxx",
      "userId": "yyy",
      "user": {
        "id": "yyy",
        "name": "用户名",
        "username": "username"
      }
    }
  ]
}
```

## ⏰ 下一阶段预览

第二阶段将包含：
1. 项目页面添加起止时间列
2. 项目状态支持行内编辑
3. 项目列表支持拖拽排序

预计完成时间：1-2小时

## 📋 数据兼容性说明

### 向后兼容
- 保留了 `assigneeId` 字段，现有数据不会丢失
- 现有单一负责人已自动迁移到 `assignees` 表
- 旧的API调用（使用 `assigneeId`）仍然有效

### 推荐使用新API
- 新创建的需求/任务建议使用 `assigneeIds` 数组
- 前端应优先显示 `assignees` 数据而非 `assignee`
- 如果 `assignees` 为空，回退到显示 `assignee`

### 数据一致性
迁移脚本确保:
```sql
-- 所有现有的单一负责人都被复制到新表
INSERT INTO "requirement_assignees" ("requirementId", "userId", "assignedAt")
SELECT "id", "assigneeId", "createdAt"
FROM "requirements"
WHERE "assigneeId" IS NOT NULL;
```

这意味着:
- 如果一个需求原本有 `assigneeId = "user123"`
- 迁移后 `assignees` 表会有一条记录 `{requirementId, userId: "user123"}`
- 同时 `assigneeId` 字段仍然是 `"user123"`

---

**提交时间**: 2024-01-02
**分支**: master
**最新commit**: e933f2c
**状态**: ✅ 第一阶段完成，可测试
