<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务管理</span>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新建任务
          </el-button>
        </div>
      </template>

      <!-- 强大的筛选功能 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.search"
          placeholder="搜索任务标题/描述"
          style="width: 250px"
          clearable
          @change="fetchData"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="filters.projectId" placeholder="筛选项目" style="width: 180px" clearable @change="fetchData">
          <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>

        <el-select v-model="filters.status" placeholder="状态" style="width: 150px" clearable @change="fetchData">
          <el-option label="待处理" value="TODO" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="测试中" value="TESTING" />
          <el-option label="已完成" value="DONE" />
          <el-option label="已阻塞" value="BLOCKED" />
        </el-select>

        <el-select v-model="filters.priority" placeholder="优先级" style="width: 150px" clearable @change="fetchData">
          <el-option label="低" value="LOW" />
          <el-option label="中" value="MEDIUM" />
          <el-option label="高" value="HIGH" />
          <el-option label="紧急" value="URGENT" />
        </el-select>

        <el-select
          v-model="filters.assigneeId"
          placeholder="负责人"
          style="width: 150px"
          clearable
          @change="fetchData"
          v-if="authStore.isAdmin()"
        >
          <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>

        <el-button @click="expandAll" :icon="Expand">全部展开</el-button>
        <el-button @click="collapseAll" :icon="Fold">全部折叠</el-button>
      </div>

      <!-- 树形任务列表 -->
      <el-table
        ref="tableRef"
        :data="treeData"
        v-loading="loading"
        style="margin-top: 20px"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="true"
        border
      >
        <!-- 任务标题列（支持层级） -->
        <el-table-column prop="title" label="任务标题" min-width="300">
          <template #default="{ row }">
            <div class="title-cell">
              <span>{{ row.title }}</span>
              <el-button
                v-if="!row.parentId || row.level < 2"
                link
                type="primary"
                size="small"
                @click="showCreateChildDialog(row)"
              >
                <el-icon><Plus /></el-icon>
                添加子任务
              </el-button>
            </div>
          </template>
        </el-table-column>

        <!-- 所属项目（行内编辑） -->
        <el-table-column label="所属项目" width="180">
          <template #default="{ row }">
            <el-select
              v-if="!row.isRequirementRow && !row.isProjectRow"
              v-model="row.projectId"
              @change="handleProjectChange(row)"
              size="small"
              :disabled="!!row.parentId"
            >
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <strong v-else-if="row.isProjectRow">{{ row.projectName }}</strong>
          </template>
        </el-table-column>

        <!-- 所属需求（行内编辑） -->
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
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 优先级（行内编辑） -->
        <el-table-column label="优先级" width="130">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow && !row.isRequirementRow"
              v-model="row.priority"
              @change="handlePriorityChange(row)"
              size="small"
            >
              <el-option label="低" value="LOW">
                <el-tag type="info" size="small">低</el-tag>
              </el-option>
              <el-option label="中" value="MEDIUM">
                <el-tag size="small">中</el-tag>
              </el-option>
              <el-option label="高" value="HIGH">
                <el-tag type="warning" size="small">高</el-tag>
              </el-option>
              <el-option label="紧急" value="URGENT">
                <el-tag type="danger" size="small">紧急</el-tag>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- 状态（行内编辑） -->
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow && !row.isRequirementRow"
              v-model="row.status"
              @change="handleStatusChange(row)"
              size="small"
            >
              <el-option label="待处理" value="TODO">
                <el-tag type="info" size="small">待处理</el-tag>
              </el-option>
              <el-option label="进行中" value="IN_PROGRESS">
                <el-tag size="small">进行中</el-tag>
              </el-option>
              <el-option label="测试中" value="TESTING">
                <el-tag type="warning" size="small">测试中</el-tag>
              </el-option>
              <el-option label="已完成" value="DONE">
                <el-tag type="success" size="small">已完成</el-tag>
              </el-option>
              <el-option label="已阻塞" value="BLOCKED">
                <el-tag type="danger" size="small">已阻塞</el-tag>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- 负责人（多选行内编辑） -->
        <el-table-column label="负责人" width="200">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow && !row.isRequirementRow"
              v-model="row.assigneeIds"
              @change="handleAssigneesChange(row)"
              multiple
              collapse-tags
              collapse-tags-tooltip
              size="small"
              placeholder="选择负责人"
              style="width: 100%"
            >
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </template>
        </el-table-column>

        <!-- 工时（预估/实际）（行内编辑） -->
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

        <!-- 开始/截止日期（行内编辑） -->
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

        <!-- 操作 -->
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div v-if="!row.isProjectRow && !row.isRequirementRow">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="650px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="form.title" placeholder="输入任务标题" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="任务描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="详细描述需求内容"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="所属项目" prop="projectId" v-if="!form.parentId">
          <el-select v-model="form.projectId" style="width: 100%" placeholder="选择项目">
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="关联需求" v-if="!form.parentId">
          <el-select v-model="form.requirementId" style="width: 100%" clearable placeholder="选择需求（可选）">
            <el-option
              v-for="r in getRequirementsByProject(form.projectId)"
              :key="r.id"
              :label="r.title"
              :value="r.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="父任务" v-if="form.parentId">
          <el-input :value="parentTaskTitle" disabled />
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已完成" value="DONE" />
            <el-option label="已阻塞" value="BLOCKED" />
          </el-select>
        </el-form-item>

        <el-form-item label="负责人">
          <el-select
            v-model="form.assigneeIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            placeholder="可选择多个负责人"
          >
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预估工时(天)">
              <el-input-number
                v-model="form.estimatedHours"
                :min="0"
                :step="0.5"
                :precision="1"
                placeholder="预估工时"
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
                placeholder="实际工时"
                style="width: 100%"
              />
              <div class="form-hint">实际完成的工时</div>
            </el-form-item>
          </el-col>
        </el-row>

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
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Expand, Fold } from '@element-plus/icons-vue'
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks'
import { getProjects } from '@/api/projects'
import { getRequirements } from '@/api/requirements'
import { getUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { Task, Project, Requirement, User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tasks = ref<Task[]>([])
const projectOptions = ref<Project[]>([])
const requirementOptions = ref<Requirement[]>([])
const userOptions = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const tableRef = ref<any>()
const parentTask = ref<Task | null>(null)

const filters = reactive({
  search: '',
  projectId: '',
  status: '',
  priority: '',
  assigneeId: ''
})

const form = reactive<any>({
  id: '',
  title: '',
  description: '',
  projectId: '',
  requirementId: '',
  priority: 'MEDIUM',
  status: 'TODO',
  assigneeIds: [],
  estimatedHours: 0,
  actualHours: 0,
  startDate: null,
  dueDate: null,
  parentId: ''
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

// 对话框标题
const dialogTitle = computed(() => {
  if (isEdit.value) return '编辑任务'
  if (form.parentId) return '新建子任务'
  return '新建任务'
})

// 父任务标题
const parentTaskTitle = computed(() => {
  return parentTask.value?.title || ''
})

// 根据项目获取需求列表
const getRequirementsByProject = (projectId: string): Requirement[] => {
  if (!projectId) return []
  return requirementOptions.value.filter(r => r.projectId === projectId && !r.parentId)
}

// 构建树形数据结构
const treeData = computed(() => {
  if (filters.projectId || filters.search) {
    // 如果有筛选条件，显示扁平列表
    return buildFlatTree(tasks.value)
  }
  // 否则按项目分组显示树形结构
  return buildProjectTree(tasks.value)
})

/**
 * 构建扁平树形结构（用于筛选时）
 */
const buildFlatTree = (items: Task[]): any[] => {
  const itemMap = new Map<string, any>()
  const rootItems: any[] = []

  // 先创建所有节点
  items.forEach(item => {
    itemMap.set(item.id, {
      ...item,
      assigneeIds: item.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
      children: [],
      level: 0
    })
  })

  // 建立父子关系
  items.forEach(item => {
    const node = itemMap.get(item.id)!
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!
      parent.children.push(node)
      node.level = parent.level + 1
    } else {
      rootItems.push(node)
    }
  })

  return rootItems
}

/**
 * 构建按需求分组的树形结构
 */
const buildProjectTree = (items: Task[]): any[] => {
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

/**
 * 获取数据
 */
const fetchData = async () => {
  loading.value = true
  try {
    tasks.value = await getTasks(filters)
  } catch (error: any) {
    ElMessage.error(error.message || '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 展开所有节点
 */
const expandAll = () => {
  treeData.value.forEach((row: any) => {
    tableRef.value?.toggleRowExpansion(row, true)
    if (row.children) {
      expandChildren(row.children)
    }
  })
}

/**
 * 递归展开子节点
 */
const expandChildren = (children: any[]) => {
  children.forEach(child => {
    tableRef.value?.toggleRowExpansion(child, true)
    if (child.children && child.children.length > 0) {
      expandChildren(child.children)
    }
  })
}

/**
 * 折叠所有节点
 */
const collapseAll = () => {
  treeData.value.forEach((row: any) => {
    tableRef.value?.toggleRowExpansion(row, false)
  })
}

/**
 * 显示创建对话框
 */
const showCreateDialog = () => {
  isEdit.value = false
  parentTask.value = null
  resetFormData()
  dialogVisible.value = true
}

/**
 * 显示创建子任务对话框
 */
const showCreateChildDialog = (parent: Task) => {
  isEdit.value = false
  parentTask.value = parent
  resetFormData()
  form.parentId = parent.id
  form.projectId = parent.projectId
  dialogVisible.value = true
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.assign(form, {
    id: '',
    title: '',
    description: '',
    projectId: '',
    requirementId: '',
    priority: 'MEDIUM',
    status: 'TODO',
    assigneeIds: [],
    estimatedHours: 0,
    actualHours: 0,
    startDate: null,
    dueDate: null,
    parentId: ''
  })
}

/**
 * 重置表单（对话框关闭时）
 */
const resetForm = () => {
  formRef.value?.resetFields()
  parentTask.value = null
}

/**
 * 编辑任务
 */
const handleEdit = (row: Task) => {
  isEdit.value = true
  parentTask.value = null

  Object.assign(form, {
    id: row.id,
    title: row.title,
    description: row.description || '',
    projectId: row.projectId,
    requirementId: row.requirementId || '',
    priority: row.priority,
    status: row.status,
    assigneeIds: row.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
    estimatedHours: row.estimatedHours || 0,
    actualHours: row.actualHours || 0,
    startDate: row.startDate || null,
    dueDate: row.dueDate || null,
    parentId: row.parentId || ''
  })

  // 如果有父任务，加载父任务信息
  if (row.parentId) {
    parentTask.value = tasks.value.find(r => r.id === row.parentId) || null
  }

  dialogVisible.value = true
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data: any = {
        title: form.title,
        description: form.description,
        projectId: form.projectId,
        requirementId: form.requirementId || undefined,
        priority: form.priority,
        status: form.status,
        assigneeIds: form.assigneeIds.length > 0 ? form.assigneeIds : undefined,
        estimatedHours: form.estimatedHours || 0,
        actualHours: form.actualHours || 0,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined
      }

      // 如果是子任务，添加 parentId
      if (form.parentId) {
        data.parentId = form.parentId
      }

      if (isEdit.value) {
        await updateTask(form.id, data)
        ElMessage.success('任务更新成功')
      } else {
        await createTask(data)
        ElMessage.success('任务创建成功')
      }

      dialogVisible.value = false
      await fetchData()

      // 如果是新建，自动展开父节点
      if (!isEdit.value && form.parentId) {
        await nextTick()
        expandAll()
      }
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 删除需求
 */
const handleDelete = (row: Task) => {
  // 检查是否有子任务
  const hasChildren = tasks.value.some(r => r.parentId === row.id)
  const message = hasChildren
    ? '此任务包含子任务，删除后子任务也会被删除。确定要删除吗？'
    : '确定要删除此任务吗？'

  ElMessageBox.confirm(message, '提示', { type: 'warning' })
    .then(async () => {
      try {
        await deleteTask(row.id)
        ElMessage.success('删除成功')
        fetchData()
      } catch (error: any) {
        ElMessage.error(error.message || '删除失败')
      }
    })
    .catch(() => {})
}

// ========== 行内编辑处理函数 ==========

/**
 * 更新任务（行内编辑通用方法）
 */
const updateTaskInline = async (row: Task, data: any, successMessage: string) => {
  const originalData = { ...row }
  try {
    await updateTask(row.id, data)
    ElMessage.success(successMessage)
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
    // 恢复原值
    Object.assign(row, originalData)
  }
}

/**
 * 处理项目变更
 */
const handleProjectChange = async (row: Task) => {
  await updateTaskInline(row, { projectId: row.projectId }, '项目更新成功')
  fetchData() // 重新加载以更新树形结构
}

/**
 * 处理需求变更
 */
const handleRequirementChange = async (row: Task) => {
  await updateTaskInline(row, { requirementId: row.requirementId || undefined }, '需求更新成功')
  fetchData() // 重新加载以更新树形结构
}

/**
 * 处理优先级变更
 */
const handlePriorityChange = async (row: Task) => {
  await updateTaskInline(row, { priority: row.priority }, '优先级更新成功')
}

/**
 * 处理状态变更
 */
const handleStatusChange = async (row: Task) => {
  await updateTaskInline(row, { status: row.status }, '状态更新成功')
}

/**
 * 处理负责人变更（多选）
 */
const handleAssigneesChange = async (row: any) => {
  const assigneeIds = row.assigneeIds.length > 0 ? row.assigneeIds : undefined
  await updateTaskInline(row, { assigneeIds }, '负责人更新成功')
  fetchData() // 重新加载以更新负责人显示
}

/**
 * 处理预估工时变更
 */
const handleEstimatedHoursChange = async (row: Task) => {
  await updateTaskInline(row, { estimatedHours: row.estimatedHours }, '预估工时更新成功')
}

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

/**
 * 初始化数据
 */
onMounted(async () => {
  try {
    const [projects, requirements, users] = await Promise.all([
      getProjects(),
      getRequirements(),
      getUsers()
    ])
    projectOptions.value = projects
    requirementOptions.value = requirements
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
</script>

<style scoped>
.page-container {
  height: 100%;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.title-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.hours-cell,
.date-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 树形表格样式优化 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row--level-0) {
  background-color: #f5f7fa;
  font-weight: bold;
}

:deep(.el-table__row--level-1) {
  background-color: #fafafa;
}
</style>
