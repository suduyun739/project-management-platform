# 重大重构进度说明

## 已完成的修改

### 1. 表单验证修复 ✅
- **文件**: `frontend/src/views/Tasks.vue`
- **修改**: 修复了 startDate 和 dueDate 字段在为空时的验证错误
- **详情**: 在提交表单时，删除空的日期字段，避免发送 null 值导致后端验证错误

### 2. 用户管理优化 ✅
- **文件**: `frontend/src/views/Users.vue`
- **修改**: 删除了邮箱字段的显示和编辑功能
- **原因**: 用户要求移除邮箱字段

### 3. 数据模型扩展 ✅
- **文件**: `backend/prisma/schema.prisma`
- **修改内容**:
  1. **项目排序支持**: 添加 `sortOrder` 字段到 Project 模型
  2. **多负责人支持**:
     - 创建 `RequirementAssignee` 关联表（需求-负责人多对多关系）
     - 创建 `TaskAssignee` 关联表（任务-负责人多对多关系）
     - 保留原有的 `assigneeId` 字段以兼容旧数据
  3. **数据迁移**: 自动将现有的单一负责人迁移到新的多对多关系表

- **迁移文件**: `backend/prisma/migrations/20240102120000_add_multi_assignees_and_project_sorting/migration.sql`

### 4. 前端依赖更新 ✅
- **文件**: `frontend/package.json`
- **添加**: `sortablejs@1.15.2` - 用于实现拖拽排序功能

## 进行中的工作

### 项目页面重构 🚧

**用户需求**:
1. 添加起止时间和结束时间列
2. 状态和时间列支持行内编辑（不需要打开编辑对话框）
3. 修复进度计算 - 需求和任务进度分开计算
4. 支持拖拽排序项目
5. 点击项目可跳转到筛选后的需求/任务页面

**实现方案**:
- 使用 Element Plus 的 el-table 与 sortablejs 结合实现拖拽
- 行内编辑使用 el-select 和 el-date-picker 嵌入表格单元格
- 进度计算调用后端API获取准确数据

## 待实现的功能

### 1. 需求页面重构 ⏳

**用户需求**:
1. 需求与项目合并到同一个页面
2. 项目作为一级标题，需求作为二级标题（树形结构）
3. 除标题外的所有列支持行内编辑
4. 负责人支持多选
5. 支持添加子需求功能
6. 项目支持拖拽排序
7. 需求列表跟随项目列表的排序

**实现方案**:
- 使用 el-table 的 tree-props 实现树形表格
- 数据结构: `{ id, name, children: [requirements] }`
- 多选负责人使用 el-select multiple 模式
- 操作列添加"添加子需求"按钮

### 2. 任务页面重构 ⏳

**用户需求**:
1. 默认显示第一个项目的任务
2. 显示当前项目名称，支持切换项目
3. 需求作为一级标题，子需求和任务作为子项
4. 支持行内编辑所有列
5. 负责人支持多选
6. 支持添加子任务
7. 默认展开所有节点

**实现方案**:
- 项目选择器放在页面顶部
- 树形结构: 需求 → 子需求/任务
- 默认调用第一个项目（按 sortOrder 排序）
- 使用 default-expand-all 属性

### 3. 数据看板优化 ⏳

**需求**:
1. 删除任务看板页面 (Kanban.vue)
2. 数据看板默认显示第一个项目
3. 其他优化改进

### 4. 后端API更新 ⏳

**需要更新的接口**:

#### Projects API
- GET `/api/projects` - 添加 sortOrder 排序
- PUT `/api/projects/:id` - 支持更新 startDate, endDate, sortOrder
- POST `/api/projects/reorder` - 批量更新项目排序

#### Requirements API
- GET `/api/requirements` - 包含 assignees 关系数据
- POST `/api/requirements` - 支持 assigneeIds 数组
- PUT `/api/requirements/:id` - 支持更新多个负责人
- POST `/api/requirements/:id/assignees` - 添加/删除负责人

#### Tasks API
- GET `/api/tasks` - 包含 assignees 关系数据
- POST `/api/tasks` - 支持 assigneeIds 数组
- PUT `/api/tasks/:id` - 支持更新多个负责人
- POST `/api/tasks/:id/assignees` - 添加/删除负责人

### 5. TypeScript 类型更新 ⏳

**文件**: `frontend/src/types/index.ts`

需要更新:
```typescript
export interface Project {
  // ... 现有字段
  sortOrder: number
}

export interface Requirement {
  // ... 现有字段
  assignees?: User[] // 替代单一的 assignee
  assigneeIds?: string[] // 用于表单提交
}

export interface Task {
  // ... 现有字段
  assignees?: User[] // 替代单一的 assignee
  assigneeIds?: string[] // 用于表单提交
}
```

## 技术要点

### 拖拽排序实现
```typescript
import Sortable from 'sortablejs'

// 在 onMounted 中初始化
const tableBody = document.querySelector('.el-table__body-wrapper tbody')
Sortable.create(tableBody, {
  onEnd: async (evt) => {
    // 更新排序并调用API保存
  }
})
```

### 行内编辑实现
```vue
<el-table-column label="状态" width="120">
  <template #default="{ row }">
    <el-select
      v-model="row.status"
      @change="handleStatusChange(row)"
      size="small"
    >
      <el-option label="进行中" value="ACTIVE" />
      <el-option label="已完成" value="COMPLETED" />
    </el-select>
  </template>
</el-table-column>
```

### 树形表格实现
```vue
<el-table
  :data="treeData"
  row-key="id"
  :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
  default-expand-all
>
  <!-- columns -->
</el-table>
```

### 多选负责人实现
```vue
<el-select
  v-model="row.assigneeIds"
  multiple
  @change="handleAssigneesChange(row)"
>
  <el-option
    v-for="user in users"
    :key="user.id"
    :label="user.name"
    :value="user.id"
  />
</el-select>
```

## 测试清单

### 数据迁移测试
- [ ] 现有单一负责人正确迁移到多对多表
- [ ] 项目 sortOrder 自动生成
- [ ] 旧数据的 assigneeId 字段保留

### 功能测试
- [ ] 项目拖拽排序并保存
- [ ] 项目状态行内编辑
- [ ] 项目时间字段行内编辑
- [ ] 需求树形显示
- [ ] 需求多选负责人
- [ ] 添加子需求
- [ ] 任务按项目分组显示
- [ ] 任务多选负责人
- [ ] 添加子任务
- [ ] 数据看板默认显示第一个项目

### 权限测试
- [ ] 普通用户只能编辑自己负责的内容
- [ ] 管理员可以编辑所有内容
- [ ] 项目创建者可以编辑自己的项目

## 部署注意事项

1. **数据库迁移**:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

2. **验证迁移**:
   ```bash
   docker compose exec backend npx prisma migrate status
   docker compose exec postgres psql -U pmuser -d project_management -c "\d requirement_assignees"
   docker compose exec postgres psql -U pmuser -d project_management -c "\d task_assignees"
   ```

3. **前端依赖安装**:
   ```bash
   # 本地开发
   cd frontend && npm install

   # Docker 会自动处理
   ```

4. **检查数据迁移结果**:
   ```sql
   SELECT COUNT(*) FROM requirement_assignees;
   SELECT COUNT(*) FROM task_assignees;
   ```

## 时间估算

- ✅ 表单验证修复: 完成
- ✅ 用户管理优化: 完成
- ✅ 数据模型扩展: 完成
- 🚧 项目页面重构: 进行中
- ⏳ 需求页面重构: 2-3小时
- ⏳ 任务页面重构: 2-3小时
- ⏳ 后端API更新: 2小时
- ⏳ 数据看板优化: 1小时
- ⏳ 测试和调试: 2小时

**预计总时间**: 10-12小时的开发工作

## 下一步行动

1. 完成项目页面的行内编辑和拖拽排序
2. 更新后端API支持新的数据结构
3. 实现需求与项目合并的树形页面
4. 实现任务按项目分组的树形页面
5. 删除 Kanban.vue 并优化数据看板
6. 全面测试
7. 推送到 GitHub
8. 更新部署文档

---

**最后更新**: 2024-01-02
**当前状态**: 数据模型已完成，开始UI重构
