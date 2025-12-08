<template>
  <div class="page-container with-sidebar">
    <ProjectSidebar
      :projects="projects"
      :selected-project-id="selectedProjectId"
      @select="handleSelectProject"
      @create="showCreateDialog"
    />

    <div class="main-content">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ selectedProject ? selectedProject.name : '项目管理' }}</span>
            <el-button type="primary" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>
              新建项目
            </el-button>
          </div>
        </template>

      <!-- 筛选 -->
      <div class="filter-bar">
        <el-input
          v-model="filters.search"
          placeholder="搜索项目名称或描述"
          style="width: 300px"
          clearable
          @change="fetchProjects"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filters.status"
          placeholder="状态"
          style="width: 150px"
          clearable
          @change="fetchProjects"
        >
          <el-option label="进行中" value="ACTIVE" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="已归档" value="ARCHIVED" />
        </el-select>
      </div>

      <!-- 项目列表 -->
      <el-table :data="projects" v-loading="loading" style="margin-top: 20px">
        <el-table-column prop="name" label="项目名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="统计" width="150">
          <template #default="{ row }">
            <el-space>
              <el-text>需求: {{ row._count?.requirements || 0 }}</el-text>
              <el-text>任务: {{ row._count?.tasks || 0 }}</el-text>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="creator.name" label="创建人" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </el-card>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '新建项目'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
        <el-form-item label="项目状态" prop="status" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="进行中" value="ACTIVE" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已归档" value="ARCHIVED" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
          />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getProjects, createProject, updateProject, deleteProject } from '@/api/projects'
import ProjectSidebar from '@/components/ProjectSidebar.vue'
import type { Project } from '@/types'

const loading = ref(false)
const projects = ref<Project[]>([])
const selectedProjectId = ref<string>()
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const selectedProject = computed(() =>
  projects.value.find(p => p.id === selectedProjectId.value)
)

const filters = reactive({
  search: '',
  status: ''
})

const form = reactive<any>({
  id: '',
  name: '',
  description: '',
  status: 'ACTIVE',
  startDate: null,
  endDate: null
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const fetchProjects = async () => {
  loading.value = true
  try {
    projects.value = await getProjects(filters)
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    id: '',
    name: '',
    description: '',
    status: 'ACTIVE',
    startDate: null,
    endDate: null
  })
  dialogVisible.value = true
}

const handleEdit = (row: Project) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.startDate || null,
    endDate: row.endDate || null
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const data = {
        name: form.name,
        description: form.description,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate
      }

      if (isEdit.value) {
        await updateProject(form.id, data)
        ElMessage.success('项目更新成功')
      } else {
        await createProject(data)
        ElMessage.success('项目创建成功')
      }

      dialogVisible.value = false
      fetchProjects()
    } catch (error) {
      // 错误已在拦截器中处理
    }
  })
}

const handleDelete = (row: Project) => {
  ElMessageBox.confirm('确定要删除此项目吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    fetchProjects()
  })
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    ACTIVE: 'success',
    COMPLETED: 'info',
    ARCHIVED: 'warning'
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: '进行中',
    COMPLETED: '已完成',
    ARCHIVED: '已归档'
  }
  return map[status] || status
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

const handleSelectProject = (project: Project) => {
  selectedProjectId.value = project.id
  // 可以在这里添加更多的项目详情展示逻辑
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.page-container.with-sidebar {
  display: flex;
  gap: 0;
}

.page-container.with-sidebar :deep(.project-sidebar) {
  width: 280px;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
}
</style>
