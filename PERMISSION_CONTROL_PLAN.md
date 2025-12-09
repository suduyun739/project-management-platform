# 权限控制与数据隔离实施方案

## 一、需求确认 ✅

### 1. 项目权限 (已实现)
- ✅ 所有人可见所有项目
- ✅ 只有管理员可以创建/编辑/删除/排序项目

### 2. 需求与任务权限 (待实施)
**多负责人机制**：
- 使用`assignees`关联表，支持多人协同
- 无主次之分，所有负责人平等

**数据可见性**：
- 管理员：可以看到所有需求/任务
- 非管理员：只能看到"自己名下"的 = 自己作为负责人之一的需求/任务

**操作权限**：
- 管理员：所有操作权限
- 非管理员：
  - ✅ 可以新增需求/子需求/任务/子任务
  - ✅ 新增时强制绑定当前用户为负责人之一
  - ✅ 可以修改：状态、优先级、时间、工时
  - ❌ 不能修改：标题、描述、项目、父级关系
  - ❌ 不能删除（只有管理员可以删除）

### 3. 用户管理权限
- 管理员：可以看到所有用户列表，可以管理所有用户
- 非管理员：
  - 只能看到自己的信息（重定向到个人资料页）
  - 只能修改自己的密码
  - 不能看到其他用户

### 4. 数据看板
- 管理员：
  - 显示所有统计数据
  - 默认筛选第一个/置顶项目
  - 可以切换项目查看
- 非管理员：
  - 只显示自己作为负责人的需求数和任务数
  - 不显示项目选择器（只关注自己的工作）

### 5. UI优化
- 展开/折叠开关：移到筛选栏最左侧

---

## 二、技术实施方案

### 1. 数据库查询改造

#### 问题现状
当前代码同时使用：
- `assigneeId` 字段（单个负责人，已废弃）
- `assignees` 关联表（多个负责人）

#### 解决方案
**完全移除对 `assigneeId` 的依赖，只使用 `assignees` 关联表**

**查询逻辑**：
```typescript
// 管理员：查询所有
where: {}

// 非管理员：查询自己作为负责人之一的
where: {
  assignees: {
    some: {
      userId: req.user!.id
    }
  }
}
```

### 2. 后端API修改清单

#### A. requirements.ts

**GET /requirements** - 获取需求列表
```typescript
// 当前（错误）
if (req.user?.role !== 'ADMIN' && !assigneeId) {
  where.assigneeId = req.user!.id;
}

// 修改为（正确）
if (req.user?.role !== 'ADMIN') {
  where.assignees = {
    some: {
      userId: req.user!.id
    }
  };
}
```

**POST /requirements** - 创建需求
```typescript
// 非管理员创建时，强制添加自己为负责人
if (req.user?.role !== 'ADMIN') {
  // 确保 assigneeIds 包含当前用户
  if (!assigneeIds) {
    assigneeIds = [req.user!.id];
  } else if (!assigneeIds.includes(req.user!.id)) {
    assigneeIds.push(req.user!.id);
  }
}
```

**PUT /requirements/:id** - 更新需求
```typescript
// 检查用户是否为负责人之一
const isAssignee = await prisma.requirementAssignee.findFirst({
  where: {
    requirementId: id,
    userId: req.user!.id
  }
});

// 非管理员只能更新：status, priority, estimatedHours
if (!isAdmin && isAssignee) {
  const allowedFields = ['status', 'priority', 'estimatedHours'];
  const keys = Object.keys(data);
  if (keys.some(key => !allowedFields.includes(key))) {
    return res.status(403).json({
      error: '您只能更新状态、优先级和工时'
    });
  }
}
```

**DELETE /requirements/:id** - 删除需求
```typescript
// 只有管理员可以删除
if (req.user?.role !== 'ADMIN') {
  return res.status(403).json({ error: '只有管理员可以删除需求' });
}
```

#### B. tasks.ts

**相同的逻辑应用到任务API**：
- GET /tasks - 数据隔离
- POST /tasks - 强制绑定当前用户
- PUT /tasks/:id - 非管理员只能更新状态/优先级/时间/工时
- DELETE /tasks/:id - 只有管理员可以删除

### 3. 前端权限控制

#### A. Projects.vue

**隐藏/禁用项目操作按钮**：
```vue
<div v-if="row.isProject && authStore.isAdmin()" class="project-operations">
  <el-button @click="handleSortProject">置顶</el-button>
  <el-button @click="handleEditProject">编辑</el-button>
  <el-button @click="handleDeleteProject">删除</el-button>
</div>
```

**禁用项目行内编辑**：
```vue
<el-select
  v-if="row.isProject"
  v-model="row.status"
  :disabled="!authStore.isAdmin()"
  @change="handleProjectStatusChange(row)"
>
```

#### B. Tasks.vue

**隐藏删除按钮**：
```vue
<el-button
  v-if="authStore.isAdmin()"
  link
  type="danger"
  size="small"
  @click="handleDelete(row)"
>
  删除
</el-button>
```

**禁用标题/描述编辑**（非管理员）：
- 对话框中的标题和描述输入框设置 `:disabled="!authStore.isAdmin() && isEdit"`

### 4. 用户管理页面改造

#### users.ts 后端
```typescript
// GET /users
router.get('/', async (req: AuthRequest, res) => {
  // 非管理员只能查询自己
  if (req.user?.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });
    return res.json([user]); // 返回数组格式保持一致
  }

  // 管理员查询所有用户
  const users = await prisma.user.findMany({ ... });
  res.json(users);
});
```

#### Users.vue 前端
```vue
<div v-if="authStore.isAdmin()">
  <!-- 管理员看到完整的用户列表和管理功能 -->
  <el-table>...</el-table>
</div>
<div v-else>
  <!-- 非管理员只看到个人资料卡片 -->
  <el-card>
    <div class="user-profile">
      <h3>{{ currentUser.name }}</h3>
      <p>{{ currentUser.email }}</p>
      <el-button @click="showChangePasswordDialog">修改密码</el-button>
    </div>
  </el-card>
</div>
```

### 5. 数据看板改造

#### Dashboard.vue
```typescript
// 管理员模式
if (authStore.isAdmin()) {
  // 显示项目选择器
  // 默认选中第一个项目
  // 统计该项目下的所有需求和任务
}

// 非管理员模式
else {
  // 隐藏项目选择器
  // 统计自己作为负责人的需求数和任务数
  const myRequirements = await getRequirements({
    assigneeId: authStore.user.id
  });
  const myTasks = await getTasks({
    assigneeId: authStore.user.id
  });

  // 显示统计卡片
  - 我负责的需求数
  - 我负责的任务数
  - 按状态分组的统计
}
```

### 6. UI优化

#### 展开/折叠开关位置
```vue
<div class="filter-bar">
  <!-- 最左侧 -->
  <el-switch
    v-model="expandAllState"
    @change="toggleExpandAll"
    active-text="展开"
    inactive-text="折叠"
    style="--el-switch-on-color: #13ce66; --el-switch-off-color: #909399;"
  />

  <!-- 其他筛选项 -->
  <el-input ... />
  <el-select ... />
  ...
</div>
```

---

## 三、实施步骤

### Phase 1: 后端权限控制 (30分钟)
1. ✅ 修复 projects.ts（已完成）
2. 修复 requirements.ts - 多负责人查询和权限
3. 修复 tasks.ts - 多负责人查询和权限
4. 修复 users.ts - 数据隔离

### Phase 2: 前端权限控制 (20分钟)
5. 修改 Projects.vue - 隐藏/禁用管理员按钮
6. 修改 Tasks.vue - 隐藏/禁用管理员按钮
7. 修改 Users.vue - 非管理员只看自己

### Phase 3: 数据看板 (15分钟)
8. 重写 Dashboard.vue - 双模式统计

### Phase 4: UI优化 (5分钟)
9. 调整展开/折叠开关位置

### Phase 5: 测试 (10分钟)
10. 测试管理员功能
11. 测试非管理员功能
12. 测试权限边界

---

## 四、预期效果

### 管理员视角
- ✅ 可以看到所有项目/需求/任务
- ✅ 可以创建/编辑/删除项目
- ✅ 可以管理所有需求和任务
- ✅ 可以管理所有用户
- ✅ 数据看板显示完整统计，可切换项目

### 非管理员视角
- ✅ 可以看到所有项目（只读）
- ✅ 只能看到自己作为负责人的需求/任务
- ✅ 可以创建需求/任务（自动绑定自己）
- ✅ 只能修改状态/优先级/时间/工时
- ❌ 不能删除任何内容
- ✅ 用户管理页面只显示个人资料
- ✅ 数据看板只显示自己的工作统计

---

## 五、风险和注意事项

### 1. 数据迁移
- **风险**: 现有数据可能只有 `assigneeId` 没有 `assignees`
- **方案**: 后端兼容查询，同时查询两种方式

### 2. 性能问题
- **风险**: `assignees` 关联查询可能影响性能
- **方案**: 在 `requirementId` 和 `userId` 上建立复合索引

### 3. 前端缓存
- **风险**: 权限变更后前端缓存旧数据
- **方案**: 刷新页面或清除 localStorage

---

## 六、测试用例

### 用例1: 非管理员创建需求
1. 登录非管理员账号
2. 进入项目与需求页面
3. 点击"新建需求"
4. 填写表单，不选择负责人
5. 提交
6. **预期**: 自动将当前用户添加为负责人

### 用例2: 非管理员查看数据
1. 登录非管理员账号
2. 进入项目与需求页面
3. **预期**: 只看到自己作为负责人的需求
4. 进入需求与任务页面
5. **预期**: 只看到自己作为负责人的任务

### 用例3: 非管理员尝试删除
1. 登录非管理员账号
2. 进入项目与需求页面
3. **预期**: 所有"删除"按钮被隐藏
4. 尝试通过API直接删除
5. **预期**: 返回403错误

### 用例4: 管理员完整权限
1. 登录管理员账号
2. 可以看到所有数据
3. 可以进行所有操作
4. **预期**: 无任何限制

---

**请确认以上方案是否符合您的需求，我将立即开始实施！**
