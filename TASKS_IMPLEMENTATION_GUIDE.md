# Tasks.vue 完整实现指南

由于Tasks.vue代码量较大（预计900+行），这里提供完整的实现步骤和关键代码片段。

## 实现方式

**最简单的方法**：直接复制 Requirements.vue 并修改关键部分

## 步骤1：复制基础结构

```bash
cp frontend/src/views/Requirements.vue frontend/src/views/Tasks.vue
```

## 步骤2：全局替换

在Tasks.vue中进行以下全局替换：

```
需求 → 任务
Requirement → Task
requirement → task
Requirements → Tasks
requirements → tasks
```

## 步骤3：关键修改点

### 3.1 导入部分修改

```typescript
// 修改API导入
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks'
```

### 3.2 添加实际工时字段

在form reactive对象中添加：
```typescript
const form = reactive<any>({
  // ... 其他字段
  estimatedHours: 0,
  actualHours: 0,      // 新增
  startDate: null,     // 新增
  dueDate: null,       // 新增
})
```

### 3.3 修改树形结构构建逻辑

将 `buildProjectTree` 改为 `buildRequirementTree`：

```typescript
/**
 * 构建按需求分组的树形结构
 */
const buildRequirementTree = (items: Task[]): any[] => {
  const projectMap = new Map<string, any>()
  const requirementMap = new Map<string, any>()
  const result: any[] = []

  const targetProjectId = filters.projectId

  // 按项目和需求分组
  items.forEach(item => {
    if (targetProjectId && item.projectId !== targetProjectId) return

    const projectId = item.projectId
    const requirementId = item.requirementId

    // 创建项目节点
    if (!projectMap.has(projectId)) {
      const project = projectOptions.value.find(p => p.id === projectId)
      projectMap.set(projectId, {
        id: `project-${projectId}`,
        isProjectRow: true,
        projectId,
        projectName: project?.name || '未知项目',
        title: project?.name || '未知项目',
        children: []
      })
    }

    // 如果有需求，创建需求节点
    if (requirementId) {
      const reqKey = `${projectId}-${requirementId}`
      if (!requirementMap.has(reqKey)) {
        const requirement = requirementOptions.value.find(r => r.id === requirementId)
        requirementMap.set(reqKey, {
          id: `requirement-${reqKey}`,
          isRequirementRow: true,
          requirementId,
          requirementTitle: requirement?.title || '未知需求',
          title: requirement?.title || '未知需求',
          projectId,
          children: []
        })
      }
    }
  })

  // 构建任务的树形结构
  const itemMap = new Map<string, any>()
  items.forEach(item => {
    if (targetProjectId && item.projectId !== targetProjectId) return

    itemMap.set(item.id, {
      ...item,
      assigneeIds: item.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
      children: [],
      level: 0
    })
  })

  // 建立父子关系并放入对应需求/项目
  items.forEach(item => {
    if (targetProjectId && item.projectId !== targetProjectId) return

    const node = itemMap.get(item.id)!

    if (item.parentId && itemMap.has(item.parentId)) {
      // 有父任务，添加到父任务的 children
      const parent = itemMap.get(item.parentId)!
      parent.children.push(node)
      node.level = parent.level + 1
    } else {
      // 没有父任务
      if (item.requirementId) {
        // 有需求，添加到需求节点
        const reqKey = `${item.projectId}-${item.requirementId}`
        const reqNode = requirementMap.get(reqKey)
        if (reqNode) {
          reqNode.children.push(node)
        }
      } else {
        // 无需求，直接添加到项目节点
        const projectNode = projectMap.get(item.projectId)
        if (projectNode) {
          projectNode.children.push(node)
        }
      }
    }
  })

  // 将需求节点添加到项目节点
  requirementMap.forEach(reqNode => {
    if (reqNode.children.length > 0) {
      const projectNode = projectMap.get(reqNode.projectId)
      if (projectNode) {
        projectNode.children.push(reqNode)
      }
    }
  })

  // 转换为数组
  projectMap.forEach(projectNode => {
    if (projectNode.children.length > 0) {
      result.push(projectNode)
    }
  })

  return result
}
```

### 3.4 添加需求选择器函数

```typescript
// 根据项目获取需求列表
const getRequirementsByProject = (projectId: string): Requirement[] => {
  if (!projectId) return []
  return requirementOptions.value.filter(r => r.projectId === projectId && !r.parentId)
}
```

### 3.5 添加实际工时处理函数

```typescript
/**
 * 处理实际工时变更
 */
const handleActualHoursChange = async (row: Task) => {
  await updateTaskInline(row, { actualHours: row.actualHours }, '实际工时更新成功')
}

/**
 * 处理开始日期变更
 */
const handleStartDateChange = async (row: Task) => {
  await updateTaskInline(row, { startDate: row.startDate || undefined }, '开始日期更新成功')
}

/**
 * 处理截止日期变更
 */
const handleDueDateChange = async (row: Task) => {
  await updateTaskInline(row, { dueDate: row.dueDate || undefined }, '截止日期更新成功')
}
```

### 3.6 修改onMounted初始化

```typescript
onMounted(async () => {
  try {
    const [projects, requirements, users] = await Promise.all([
      getProjects(),
      getRequirements(),
      getUsers()
    ])
    projectOptions.value = projects
    requirementOptions.value = requirements  // 新增
    userOptions.value = users

    // 默认显示第一个项目的任务
    if (projects.length > 0 && !filters.projectId) {
      filters.projectId = projects[0].id
    }

    await fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '初始化失败')
  }
})
```

### 3.7 模板修改要点

#### 表格列修改

```vue
<!-- 所属需求列（新增） -->
<el-table-column label="所属需求" width="180">
  <template #default="{ row }">
    <el-select
      v-if="!row.isRequirementRow && !row.isProjectRow && !row.parentId"
      v-model="row.requirementId"
      @change="handleRequirementChange(row)"
      size="small"
      clearable
      placeholder="选择需求"
    >
      <el-option
        v-for="r in getRequirementsByProject(row.projectId)"
        :key="r.id"
        :label="r.title"
        :value="r.id"
      />
    </el-select>
    <strong v-else-if="row.isRequirementRow">{{ row.requirementTitle }}</strong>
    <strong v-else-if="row.isProjectRow">{{ row.projectName }}</strong>
    <span v-else>-</span>
  </template>
</el-table-column>

<!-- 工时列（双输入框） -->
<el-table-column label="工时(天)" width="180">
  <template #default="{ row }">
    <div v-if="!row.isRequirementRow && !row.isProjectRow" class="hours-cell">
      <el-input-number
        v-model="row.estimatedHours"
        @change="handleEstimatedHoursChange(row)"
        :min="0"
        :step="0.5"
        :precision="1"
        size="small"
        controls-position="right"
        style="width: 70px"
      />
      <span style="margin: 0 4px">/</span>
      <el-input-number
        v-model="row.actualHours"
        @change="handleActualHoursChange(row)"
        :min="0"
        :step="0.5"
        :precision="1"
        size="small"
        controls-position="right"
        style="width: 70px"
      />
    </div>
  </template>
</el-table-column>

<!-- 日期列（双日期选择器） -->
<el-table-column label="开始/截止日期" width="220">
  <template #default="{ row }">
    <div v-if="!row.isRequirementRow && !row.isProjectRow" class="date-cell">
      <el-date-picker
        v-model="row.startDate"
        @change="handleStartDateChange(row)"
        type="date"
        size="small"
        placeholder="开始"
        value-format="YYYY-MM-DD"
        style="width: 100px"
      />
      <span style="margin: 0 4px">-</span>
      <el-date-picker
        v-model="row.dueDate"
        @change="handleDueDateChange(row)"
        type="date"
        size="small"
        placeholder="截止"
        value-format="YYYY-MM-DD"
        style="width: 100px"
      />
    </div>
  </template>
</el-table-column>
```

#### 表单修改

```vue
<!-- 关联需求选择器 -->
<el-col :span="12">
  <el-form-item label="关联需求" v-if="!form.parentId">
    <el-select v-model="form.requirementId" style="width: 100%" clearable placeholder="选择需求">
      <el-option
        v-for="r in getRequirementsByProject(form.projectId)"
        :key="r.id"
        :label="r.title"
        :value="r.id"
      />
    </el-select>
  </el-form-item>
</el-col>

<!-- 工时输入 -->
<el-row :gutter="20">
  <el-col :span="12">
    <el-form-item label="预估工时(天)">
      <el-input-number
        v-model="form.estimatedHours"
        :min="0"
        :step="0.5"
        :precision="1"
        style="width: 100%"
      />
      <div class="form-hint">工时以天为单位</div>
    </el-form-item>
  </el-col>

  <el-col :span="12">
    <el-form-item label="实际工时(天)">
      <el-input-number
        v-model="form.actualHours"
        :min="0"
        :step="0.5"
        :precision="1"
        style="width: 100%"
      />
      <div class="form-hint">实际完成的工时</div>
    </el-form-item>
  </el-col>
</el-row>

<!-- 日期选择 -->
<el-row :gutter="20">
  <el-col :span="12">
    <el-form-item label="开始日期">
      <el-date-picker
        v-model="form.startDate"
        type="date"
        style="width: 100%"
        placeholder="选择开始日期"
        value-format="YYYY-MM-DD"
      />
    </el-form-item>
  </el-col>

  <el-col :span="12">
    <el-form-item label="截止日期">
      <el-date-picker
        v-model="form.dueDate"
        type="date"
        style="width: 100%"
        placeholder="选择截止日期"
        value-format="YYYY-MM-DD"
      />
    </el-form-item>
  </el-col>
</el-row>
```

### 3.8 样式修改

添加新的样式类：

```css
.hours-cell,
.date-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

## 步骤4：状态定义修改

```typescript
// 状态选项从需求的4个改为任务的5个
<el-option label="待处理" value="TODO" />
<el-option label="进行中" value="IN_PROGRESS" />
<el-option label="测试中" value="TESTING" />
<el-option label="已完成" value="DONE" />
<el-option label="已阻塞" value="BLOCKED" />
```

## 步骤5：数据加载requirementOptions

确保加载需求列表：

```typescript
const requirementOptions = ref<Requirement[]>([])

onMounted(async () => {
  // ...
  requirementOptions.value = await getRequirements()
  // ...
})
```

## 完整检查清单

- [ ] 导入getTasks, createTask, updateTask, deleteTask
- [ ] 添加requirementOptions状态
- [ ] 添加actualHours, startDate, dueDate字段
- [ ] 实现buildRequirementTree函数
- [ ] 实现getRequirementsByProject函数
- [ ] 添加handleRequirementChange处理函数
- [ ] 添加handleActualHoursChange处理函数
- [ ] 添加handleStartDateChange处理函数
- [ ] 添加handleDueDateChange处理函数
- [ ] 修改状态选项为5个
- [ ] 添加所属需求列
- [ ] 修改工时列为双输入框
- [ ] 修改日期列为双日期选择器
- [ ] 更新表单字段
- [ ] 更新onMounted初始化逻辑
- [ ] 添加CSS样式

## 预期效果

完成后的任务页面应该具备：
1. 树形结构：项目 → 需求 → 任务 → 子任务（4级）
2. 多选负责人行内编辑
3. 所有列行内编辑
4. 预估/实际工时双输入
5. 开始/截止日期双选择
6. 默认显示第一个项目
7. 子任务创建功能
8. 全部展开/折叠控制
