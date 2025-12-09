<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>需求管理</span>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新建需求
          </el-button>
        </div>
      </template>

      <!-- 强大的筛选功能 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.search"
          placeholder="搜索需求标题/描述"
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
          <el-option label="待处理" value="PENDING" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="已拒绝" value="REJECTED" />
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

      <!-- 树形需求列表 -->
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
        <!-- 需求标题列（支持层级） -->
        <el-table-column prop="title" label="需求标题" min-width="300">
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
                添加子需求
              </el-button>
            </div>
          </template>
        </el-table-column>

        <!-- 所属项目（行内编辑） -->
        <el-table-column label="所属项目" width="180">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow"
              v-model="row.projectId"
              @change="handleProjectChange(row)"
              size="small"
              :disabled="!!row.parentId"
            >
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <strong v-else>{{ row.projectName }}</strong>
          </template>
        </el-table-column>

        <!-- 优先级（行内编辑） -->
        <el-table-column label="优先级" width="130">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow"
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
              v-if="!row.isProjectRow"
              v-model="row.status"
              @change="handleStatusChange(row)"
              size="small"
            >
              <el-option label="待处理" value="PENDING">
                <el-tag type="info" size="small">待处理</el-tag>
              </el-option>
              <el-option label="进行中" value="IN_PROGRESS">
                <el-tag size="small">进行中</el-tag>
              </el-option>
              <el-option label="已完成" value="COMPLETED">
                <el-tag type="success" size="small">已完成</el-tag>
              </el-option>
              <el-option label="已拒绝" value="REJECTED">
                <el-tag type="danger" size="small">已拒绝</el-tag>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- 负责人（多选行内编辑） -->
        <el-table-column label="负责人" width="200">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProjectRow"
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

        <!-- 预估工时（行内编辑） -->
        <el-table-column label="预估工时(天)" width="140">
          <template #default="{ row }">
            <el-input-number
              v-if="!row.isProjectRow"
              v-model="row.estimatedHours"
              @change="handleEstimatedHoursChange(row)"
              :min="0"
              :step="0.5"
              :precision="1"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div v-if="!row.isProjectRow">
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
        <el-form-item label="需求标题" prop="title">
          <el-input v-model="form.title" placeholder="输入需求标题" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="需求描述">
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

        <el-form-item label="父需求" v-if="form.parentId">
          <el-input :value="parentRequirementTitle" disabled />
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
            <el-option label="待处理" value="PENDING" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已拒绝" value="REJECTED" />
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

        <el-form-item label="预估工时(天)">
          <el-input-number
            v-model="form.estimatedHours"
            :min="0"
            :step="0.5"
            :precision="1"
            placeholder="输入天数，如0.5、1、1.5"
            style="width: 100%"
          />
          <div class="form-hint">工时以天为单位，支持小数（如0.5天、1.5天）</div>
        </el-form-item>
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
import { getRequirements, createRequirement, updateRequirement, deleteRequirement } from '@/api/requirements'
import { getProjects } from '@/api/projects'
import { getUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { Requirement, Project, User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const requirements = ref<Requirement[]>([])
const projectOptions = ref<Project[]>([])
const userOptions = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const tableRef = ref<any>()
const parentRequirement = ref<Requirement | null>(null)

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
  priority: 'MEDIUM',
  status: 'PENDING',
  assigneeIds: [],
  estimatedHours: 0,
  parentId: ''
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入需求标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

// 对话框标题
const dialogTitle = computed(() => {
  if (isEdit.value) return '编辑需求'
  if (form.parentId) return '新建子需求'
  return '新建需求'
})

// 父需求标题
const parentRequirementTitle = computed(() => {
  return parentRequirement.value?.title || ''
})

// 构建树形数据结构
const treeData = computed(() => {
  if (filters.projectId || filters.search) {
    // 如果有筛选条件，显示扁平列表
    return buildFlatTree(requirements.value)
  }
  // 否则按项目分组显示树形结构
  return buildProjectTree(requirements.value)
})

/**
 * 构建扁平树形结构（用于筛选时）
 */
const buildFlatTree = (items: Requirement[]): any[] => {
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
 * 构建按项目分组的树形结构
 */
const buildProjectTree = (items: Requirement[]): any[] => {
  const projectMap = new Map<string, any>()
  const result: any[] = []

  // 按项目分组
  items.forEach(item => {
    const projectId = item.projectId
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
  })

  // 构建需求的树形结构
  const itemMap = new Map<string, any>()
  items.forEach(item => {
    itemMap.set(item.id, {
      ...item,
      assigneeIds: item.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
      children: [],
      level: 0
    })
  })

  // 建立父子关系并放入对应项目
  items.forEach(item => {
    const node = itemMap.get(item.id)!

    if (item.parentId && itemMap.has(item.parentId)) {
      // 有父需求，添加到父需求的 children
      const parent = itemMap.get(item.parentId)!
      parent.children.push(node)
      node.level = parent.level + 1
    } else {
      // 没有父需求，作为项目的一级需求
      const projectNode = projectMap.get(item.projectId)
      if (projectNode) {
        projectNode.children.push(node)
      }
    }
  })

  // 转换为数组并排序
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
    requirements.value = await getRequirements(filters)
  } catch (error: any) {
    ElMessage.error(error.message || '获取需求列表失败')
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
  parentRequirement.value = null
  resetFormData()
  dialogVisible.value = true
}

/**
 * 显示创建子需求对话框
 */
const showCreateChildDialog = (parent: Requirement) => {
  isEdit.value = false
  parentRequirement.value = parent
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
    priority: 'MEDIUM',
    status: 'PENDING',
    assigneeIds: [],
    estimatedHours: 0,
    parentId: ''
  })
}

/**
 * 重置表单（对话框关闭时）
 */
const resetForm = () => {
  formRef.value?.resetFields()
  parentRequirement.value = null
}

/**
 * 编辑需求
 */
const handleEdit = (row: Requirement) => {
  isEdit.value = true
  parentRequirement.value = null

  Object.assign(form, {
    id: row.id,
    title: row.title,
    description: row.description || '',
    projectId: row.projectId,
    priority: row.priority,
    status: row.status,
    assigneeIds: row.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
    estimatedHours: row.estimatedHours || 0,
    parentId: row.parentId || ''
  })

  // 如果有父需求，加载父需求信息
  if (row.parentId) {
    parentRequirement.value = requirements.value.find(r => r.id === row.parentId) || null
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
        priority: form.priority,
        status: form.status,
        assigneeIds: form.assigneeIds.length > 0 ? form.assigneeIds : undefined,
        estimatedHours: form.estimatedHours || 0
      }

      // 如果是子需求，添加 parentId
      if (form.parentId) {
        data.parentId = form.parentId
      }

      if (isEdit.value) {
        await updateRequirement(form.id, data)
        ElMessage.success('需求更新成功')
      } else {
        await createRequirement(data)
        ElMessage.success('需求创建成功')
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
const handleDelete = (row: Requirement) => {
  // 检查是否有子需求
  const hasChildren = requirements.value.some(r => r.parentId === row.id)
  const message = hasChildren
    ? '此需求包含子需求，删除后子需求也会被删除。确定要删除吗？'
    : '确定要删除此需求吗？'

  ElMessageBox.confirm(message, '提示', { type: 'warning' })
    .then(async () => {
      try {
        await deleteRequirement(row.id)
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
 * 更新需求（行内编辑通用方法）
 */
const updateRequirementInline = async (row: Requirement, data: any, successMessage: string) => {
  const originalData = { ...row }
  try {
    await updateRequirement(row.id, data)
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
const handleProjectChange = async (row: Requirement) => {
  await updateRequirementInline(row, { projectId: row.projectId }, '项目更新成功')
  fetchData() // 重新加载以更新树形结构
}

/**
 * 处理优先级变更
 */
const handlePriorityChange = async (row: Requirement) => {
  await updateRequirementInline(row, { priority: row.priority }, '优先级更新成功')
}

/**
 * 处理状态变更
 */
const handleStatusChange = async (row: Requirement) => {
  await updateRequirementInline(row, { status: row.status }, '状态更新成功')
}

/**
 * 处理负责人变更（多选）
 */
const handleAssigneesChange = async (row: any) => {
  const assigneeIds = row.assigneeIds.length > 0 ? row.assigneeIds : undefined
  await updateRequirementInline(row, { assigneeIds }, '负责人更新成功')
  fetchData() // 重新加载以更新负责人显示
}

/**
 * 处理预估工时变更
 */
const handleEstimatedHoursChange = async (row: Requirement) => {
  await updateRequirementInline(row, { estimatedHours: row.estimatedHours }, '预估工时更新成功')
}

/**
 * 初始化数据
 */
onMounted(async () => {
  try {
    const [projects, users] = await Promise.all([getProjects(), getUsers()])
    projectOptions.value = projects
    userOptions.value = users
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
