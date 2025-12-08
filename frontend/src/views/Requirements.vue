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
          placeholder="搜索需求"
          style="width: 250px"
          clearable
          @change="fetchData"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="filters.projectId" placeholder="项目" style="width: 180px" clearable @change="fetchData">
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

        <el-select v-model="filters.assigneeId" placeholder="负责人" style="width: 150px" clearable @change="fetchData" v-if="authStore.isAdmin()">
          <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>

      <!-- 需求列表 -->
      <el-table :data="requirements" v-loading="loading" style="margin-top: 20px">
        <el-table-column prop="title" label="需求标题" min-width="200" />
        <el-table-column prop="project.name" label="所属项目" width="150" />
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)">{{ getPriorityText(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assignee.name" label="负责人" width="120" />
        <el-table-column prop="estimatedHours" label="预估工时(天)" width="120" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑需求' : '新建需求'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="需求标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="所属项目" prop="projectId">
          <el-select v-model="form.projectId" style="width: 100%">
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
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
          <el-select v-model="form.assigneeId" style="width: 100%" clearable>
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预估工时(天)">
          <el-input-number v-model="form.estimatedHours" :min="0" :step="0.5" :precision="1" placeholder="输入天数，如0.5、1、1.5" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getRequirements, createRequirement, updateRequirement, deleteRequirement } from '@/api/requirements'
import { getProjects } from '@/api/projects'
import { getUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { Requirement, Project, User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const requirements = ref<Requirement[]>([])
const projectOptions = ref<Project[]>([])
const userOptions = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

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
  assigneeId: '',
  estimatedHours: 0
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }]
}

const fetchData = async () => {
  loading.value = true
  try {
    requirements.value = await getRequirements(filters)
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    id: '',
    title: '',
    description: '',
    projectId: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    assigneeId: '',
    estimatedHours: 0
  })
  dialogVisible.value = true
}

const handleEdit = (row: Requirement) => {
  isEdit.value = true
  Object.assign(form, { ...row, projectId: row.projectId, assigneeId: row.assigneeId || '' })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const data = { ...form }
      if (!data.assigneeId) delete data.assigneeId
      if (isEdit.value) {
        await updateRequirement(form.id, data)
        ElMessage.success('需求更新成功')
      } else {
        await createRequirement(data)
        ElMessage.success('需求创建成功')
      }
      dialogVisible.value = false
      fetchData()
    } catch (error) {}
  })
}

const handleDelete = (row: Requirement) => {
  ElMessageBox.confirm('确定要删除此需求吗？', '提示', { type: 'warning' }).then(async () => {
    await deleteRequirement(row.id)
    ElMessage.success('删除成功')
    fetchData()
  })
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = { LOW: 'info', MEDIUM: '', HIGH: 'warning', URGENT: 'danger' }
  return map[priority] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }
  return map[priority] || priority
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = { PENDING: 'info', IN_PROGRESS: '', COMPLETED: 'success', REJECTED: 'danger' }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = { PENDING: '待处理', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '已拒绝' }
  return map[status] || status
}

onMounted(async () => {
  projectOptions.value = await getProjects()
  userOptions.value = await getUsers()
  fetchData()
})
</script>

<style scoped>
.page-container { height: 100%; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; }
</style>
