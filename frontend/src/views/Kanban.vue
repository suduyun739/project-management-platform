<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务看板</span>
          <el-space>
            <el-select v-model="filters.projectId" placeholder="选择项目" style="width: 200px" clearable @change="fetchData">
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="filters.assigneeId" placeholder="负责人" style="width: 150px" clearable @change="fetchData" v-if="authStore.isAdmin()">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-space>
        </div>
      </template>

      <div class="kanban-board" v-loading="loading">
        <div class="kanban-column" v-for="(column, key) in columns" :key="key">
          <div class="column-header" :style="{ borderTopColor: column.color }">
            <span class="column-title">{{ column.title }}</span>
            <el-tag size="small" round>{{ kanbanData[key]?.length || 0 }}</el-tag>
          </div>

          <div class="column-body">
            <div
              class="task-card"
              v-for="task in kanbanData[key]"
              :key="task.id"
              @click="handleEditTask(task)"
            >
              <div class="task-header">
                <el-tag :type="getPriorityType(task.priority)" size="small">
                  {{ getPriorityText(task.priority) }}
                </el-tag>
              </div>

              <div class="task-title">{{ task.title }}</div>

              <div class="task-info">
                <el-text size="small" type="info">
                  {{ task.project?.name }}
                </el-text>
              </div>

              <div class="task-footer">
                <el-avatar :size="24" v-if="task.assignee">
                  {{ task.assignee.name.charAt(0) }}
                </el-avatar>
                <el-text size="small" type="info" v-else>未分配</el-text>

                <el-space :size="4" v-if="task.estimatedHours">
                  <el-icon><Clock /></el-icon>
                  <el-text size="small">{{ task.estimatedHours }}h</el-text>
                </el-space>
              </div>
            </div>

            <div class="empty-column" v-if="!kanbanData[key]?.length">
              <el-empty description="暂无任务" :image-size="60" />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 任务详情/编辑对话框 -->
    <el-dialog v-model="dialogVisible" title="任务详情" width="650px">
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="任务标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" style="width: 100%">
                <el-option label="低" value="LOW" />
                <el-option label="中" value="MEDIUM" />
                <el-option label="高" value="HIGH" />
                <el-option label="紧急" value="URGENT" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="待处理" value="TODO" />
                <el-option label="进行中" value="IN_PROGRESS" />
                <el-option label="测试中" value="TESTING" />
                <el-option label="已完成" value="DONE" />
                <el-option label="已阻塞" value="BLOCKED" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预估工时">
              <el-input-number v-model="form.estimatedHours" :min="0" :step="0.5" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实际工时">
              <el-input-number v-model="form.actualHours" :min="0" :step="0.5" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateTask">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getKanbanData, updateTask } from '@/api/tasks'
import { getProjects } from '@/api/projects'
import { getUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { KanbanData, Task, Project, User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const kanbanData = ref<KanbanData>({
  TODO: [],
  IN_PROGRESS: [],
  TESTING: [],
  DONE: [],
  BLOCKED: []
})
const projectOptions = ref<Project[]>([])
const userOptions = ref<User[]>([])
const dialogVisible = ref(false)
const formRef = ref()

const filters = reactive({
  projectId: '',
  assigneeId: ''
})

const form = reactive<any>({
  id: '',
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  estimatedHours: 0,
  actualHours: 0
})

const columns = {
  TODO: { title: '待处理', color: '#909399' },
  IN_PROGRESS: { title: '进行中', color: '#409EFF' },
  TESTING: { title: '测试中', color: '#E6A23C' },
  DONE: { title: '已完成', color: '#67C23A' },
  BLOCKED: { title: '已阻塞', color: '#F56C6C' }
}

const fetchData = async () => {
  loading.value = true
  try {
    kanbanData.value = await getKanbanData(filters)
  } finally {
    loading.value = false
  }
}

const handleEditTask = (task: Task) => {
  Object.assign(form, {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    estimatedHours: task.estimatedHours || 0,
    actualHours: task.actualHours || 0
  })
  dialogVisible.value = true
}

const handleUpdateTask = async () => {
  try {
    await updateTask(form.id, {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      estimatedHours: form.estimatedHours,
      actualHours: form.actualHours
    })
    ElMessage.success('任务更新成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {}
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = { LOW: 'info', MEDIUM: '', HIGH: 'warning', URGENT: 'danger' }
  return map[priority]
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' }
  return map[priority]
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

.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 8px 0;
  min-height: 600px;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  background-color: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 12px 16px;
  background-color: #fff;
  border-radius: 8px 8px 0 0;
  border-top: 3px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-title {
  font-weight: 600;
  font-size: 14px;
}

.column-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #e4e7ed;
}

.task-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.task-header {
  margin-bottom: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-info {
  margin-bottom: 8px;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-column {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
