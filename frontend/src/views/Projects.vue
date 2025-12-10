<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>项目与需求管理</span>
          <div class="header-buttons">
            <el-button v-if="authStore.isAdmin()" type="primary" @click="showCreateProjectDialog">
              <el-icon><Plus /></el-icon>
              新建项目
            </el-button>
            <el-button type="success" @click="showCreateRequirementDialog">
              <el-icon><Plus /></el-icon>
              新建需求
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选功能 -->
      <div class="filter-bar">
        <el-switch
          v-model="expandAllState"
          @change="toggleExpandAll"
          active-text="展开"
          inactive-text="折叠"
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #909399;"
        />

        <el-select
          v-model="filters.selectedProjectId"
          placeholder="选择项目"
          style="width: 220px"
          clearable
          filterable
          @change="handleProjectSelect"
        >
          <el-option
            v-for="p in projectOptions"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>

        <el-select
          v-model="filters.projectStatus"
          placeholder="项目状态"
          style="width: 130px"
          clearable
          @change="fetchData"
        >
          <el-option label="进行中" value="ACTIVE" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="已归档" value="ARCHIVED" />
        </el-select>

        <el-select
          v-model="filters.projectPriority"
          placeholder="项目优先级"
          style="width: 130px"
          clearable
          @change="handleProjectPriorityFilter"
        >
          <el-option label="低" value="LOW" />
          <el-option label="中" value="MEDIUM" />
          <el-option label="高" value="HIGH" />
          <el-option label="紧急" value="URGENT" />
        </el-select>

        <el-select
          v-model="filters.requirementStatus"
          placeholder="需求状态"
          style="width: 130px"
          clearable
          @change="handleRequirementStatusFilter"
        >
          <el-option label="待处理" value="PENDING" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="已拒绝" value="REJECTED" />
        </el-select>

        <el-select
          v-model="filters.requirementPriority"
          placeholder="需求优先级"
          style="width: 130px"
          clearable
          @change="handleRequirementPriorityFilter"
        >
          <el-option label="低" value="LOW" />
          <el-option label="中" value="MEDIUM" />
          <el-option label="高" value="HIGH" />
          <el-option label="紧急" value="URGENT" />
        </el-select>
      </div>

      <!-- 项目与需求树形列表 -->
      <el-table
        ref="tableRef"
        :data="treeData"
        v-loading="loading"
        style="margin-top: 20px"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="false"
        border
      >
        <!-- 名称/标题列 -->
        <el-table-column label="项目/需求" min-width="300">
          <template #default="{ row }">
            <div class="title-cell" :style="{ paddingLeft: getTitlePaddingLeft(row) }">
              <strong v-if="row.isProject" style="font-size: 16px">
                📁 {{ row.name }}
              </strong>
              <span v-else :style="{ color: row.parentId ? '#606266' : '#303133' }">
                {{ row.title }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 状态列 -->
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <!-- 项目状态 -->
            <el-select
              v-if="row.isProject"
              v-model="row.status"
              :disabled="!authStore.isAdmin()"
              @change="handleProjectStatusChange(row)"
              size="small"
            >
              <el-option label="进行中" value="ACTIVE">
                <el-tag type="success" size="small">进行中</el-tag>
              </el-option>
              <el-option label="已完成" value="COMPLETED">
                <el-tag type="info" size="small">已完成</el-tag>
              </el-option>
              <el-option label="已归档" value="ARCHIVED">
                <el-tag type="warning" size="small">已归档</el-tag>
              </el-option>
            </el-select>
            <!-- 需求状态 -->
            <el-select
              v-else
              v-model="row.status"
              @change="handleRequirementStatusChange(row)"
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

        <!-- 优先级列 -->
        <el-table-column label="优先级" width="130">
          <template #default="{ row }">
            <!-- 项目优先级 -->
            <el-select
              v-if="row.isProject"
              v-model="row.priority"
              :disabled="!authStore.isAdmin()"
              @change="handleProjectPriorityChange(row)"
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
            <!-- 需求优先级 -->
            <el-select
              v-else
              v-model="row.priority"
              @change="handleRequirementPriorityChange(row)"
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

        <!-- 负责人列 -->
        <el-table-column label="负责人" width="200">
          <template #default="{ row }">
            <el-select
              v-if="!row.isProject"
              v-model="row.assigneeIds"
              @change="handleRequirementAssigneesChange(row)"
              multiple
              :max-collapse-tags="2"
              collapse-tags-tooltip
              size="small"
              placeholder="选择负责人"
              style="width: 100%"
            >
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 时间列 -->
        <el-table-column label="时间" width="140">
          <template #default="{ row }">
            <!-- 项目时间（三行显示） -->
            <div v-if="row.isProject" class="time-cell">
              <el-date-picker
                v-model="row.startDate"
                type="date"
                size="small"
                :disabled="!authStore.isAdmin()"
                placeholder="开始日期"
                @change="handleProjectDateChange(row, 'startDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
              <div class="time-divider">|</div>
              <el-date-picker
                v-model="row.endDate"
                type="date"
                size="small"
                :disabled="!authStore.isAdmin()"
                placeholder="结束日期"
                @change="handleProjectDateChange(row, 'endDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </div>
            <!-- 需求时间（三行显示） -->
            <div v-else class="time-cell">
              <el-date-picker
                v-model="row.startDate"
                type="date"
                size="small"
                placeholder="开始日期"
                @change="handleRequirementDateChange(row, 'startDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
              <div class="time-divider">|</div>
              <el-date-picker
                v-model="row.endDate"
                type="date"
                size="small"
                placeholder="结束日期"
                @change="handleRequirementDateChange(row, 'endDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </div>
          </template>
        </el-table-column>

        <!-- 进度统计列 -->
        <el-table-column label="进度" width="200">
          <template #default="{ row }">
            <!-- 项目进度 -->
            <div v-if="row.isProject" class="progress-cell">
              <div class="progress-item">
                <span class="progress-label">需求:</span>
                <el-progress
                  :percentage="row.requirementProgress || 0"
                  :color="getProgressColor(row.requirementProgress)"
                  :stroke-width="6"
                />
              </div>
              <div class="progress-item">
                <span class="progress-label">任务:</span>
                <el-progress
                  :percentage="row.taskProgress || 0"
                  :color="getProgressColor(row.taskProgress)"
                  :stroke-width="6"
                />
              </div>
            </div>
            <!-- 需求预估工时 -->
            <div v-else class="workload-cell">
              <span class="workload-label">预估工时:</span>
              <el-input-number
                v-model="row.estimatedHours"
                @change="handleRequirementEstimatedHoursChange(row)"
                :min="0"
                :step="0.5"
                :precision="1"
                size="small"
                controls-position="right"
                style="width: 100px"
              />
              <span class="workload-unit">天</span>
            </div>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <!-- 项目操作 -->
            <div v-if="row.isProject && authStore.isAdmin()" class="project-operations">
              <el-button link type="warning" size="small" @click="handleSortProject(row, 'pinToTop')" title="置顶">
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button link type="info" size="small" @click="handleSortProject(row, 'moveUp')" title="上移">
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <el-button link type="info" size="small" @click="handleSortProject(row, 'moveDown')" title="下移">
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <el-button link type="primary" size="small" @click="handleEditProject(row)">
                编辑
              </el-button>
              <el-button link type="danger" size="small" @click="handleDeleteProject(row)">
                删除
              </el-button>
            </div>
            <!-- 需求操作 -->
            <div v-else-if="!row.isProject">
              <el-button
                link
                type="success"
                size="small"
                @click="showCreateChildRequirementDialog(row)"
                v-if="!row.parentId || row.level < 2"
                title="添加子需求"
              >
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button link type="primary" size="small" @click="handleEditRequirement(row)">
                编辑
              </el-button>
              <el-button v-if="authStore.isAdmin()" link type="danger" size="small" @click="handleDeleteRequirement(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 项目创建/编辑对话框 -->
    <el-dialog
      v-model="projectDialogVisible"
      :title="isEditProject ? '编辑项目' : '新建项目'"
      width="600px"
    >
      <el-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectRules"
        label-width="100px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
        <el-form-item label="项目状态" prop="status" v-if="isEditProject">
          <el-select v-model="projectForm.status" style="width: 100%">
            <el-option label="进行中" value="ACTIVE" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已归档" value="ARCHIVED" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="projectForm.priority" style="width: 100%">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="projectForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="projectForm.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleProjectSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 需求创建/编辑对话框 -->
    <el-dialog
      v-model="requirementDialogVisible"
      :title="requirementDialogTitle"
      width="650px"
      @closed="resetRequirementForm"
    >
      <el-form
        ref="requirementFormRef"
        :model="requirementForm"
        :rules="requirementRules"
        label-width="110px"
      >
        <el-form-item label="需求标题" prop="title">
          <el-input v-model="requirementForm.title" placeholder="输入需求标题" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="需求描述">
          <el-input
            v-model="requirementForm.description"
            type="textarea"
            :rows="4"
            placeholder="详细描述需求内容"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="所属项目" prop="projectId" v-if="!requirementForm.parentId">
          <el-select v-model="requirementForm.projectId" style="width: 100%" placeholder="选择项目">
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="父需求" v-if="requirementForm.parentId">
          <el-input :value="parentRequirementTitle" disabled />
        </el-form-item>

        <el-form-item label="父需求" v-if="!requirementForm.parentId && !isEditRequirement">
          <el-select v-model="requirementForm.parentId" style="width: 100%" placeholder="选择父需求（可选）" clearable>
            <el-option
              v-for="r in availableParentRequirements"
              :key="r.id"
              :label="r.title"
              :value="r.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="requirementForm.priority" style="width: 100%">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status" v-if="isEditRequirement">
          <el-select v-model="requirementForm.status" style="width: 100%">
            <el-option label="待处理" value="PENDING" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已拒绝" value="REJECTED" />
          </el-select>
        </el-form-item>

        <el-form-item label="负责人">
          <el-select
            v-model="requirementForm.assigneeIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            placeholder="可选择多个负责人"
          >
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="开始日期">
          <el-date-picker
            v-model="requirementForm.startDate"
            type="date"
            placeholder="选择开始日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="结束日期">
          <el-date-picker
            v-model="requirementForm.endDate"
            type="date"
            placeholder="选择结束日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="预估工时(天)">
          <el-input-number
            v-model="requirementForm.estimatedHours"
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
        <el-button @click="requirementDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRequirementSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Expand, Fold, Top, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { getProjects, createProject, updateProject, deleteProject, sortProject } from '@/api/projects'
import { getRequirements, createRequirement, updateRequirement, deleteRequirement } from '@/api/requirements'
import { getTasks } from '@/api/tasks'
import { getUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import type { Project, Requirement, Task, User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const projects = ref<Project[]>([])
const requirements = ref<Requirement[]>([])
const tasks = ref<Task[]>([])
const userOptions = ref<User[]>([])
const tableRef = ref<any>()
const expandAllState = ref(true)

// 项目对话框
const projectDialogVisible = ref(false)
const isEditProject = ref(false)
const projectFormRef = ref<FormInstance>()
const projectForm = reactive<any>({
  id: '',
  name: '',
  description: '',
  status: 'ACTIVE',
  priority: 'MEDIUM',
  startDate: null,
  endDate: null
})

// 需求对话框
const requirementDialogVisible = ref(false)
const isEditRequirement = ref(false)
const requirementFormRef = ref<FormInstance>()
const parentRequirement = ref<Requirement | null>(null)
const requirementForm = reactive<any>({
  id: '',
  title: '',
  description: '',
  projectId: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  assigneeIds: [],
  estimatedHours: 1,
  startDate: null,
  endDate: null,
  parentId: ''
})

// 筛选条件
const filters = reactive({
  selectedProjectId: '',
  search: '',
  projectStatus: '',
  projectPriority: '',
  requirementStatus: '',
  requirementPriority: ''
})

// 表单验证规则
const projectRules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const requirementRules: FormRules = {
  title: [
    { required: true, message: '请输入需求标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

// 项目选项
const projectOptions = computed(() => projects.value)

// 需求对话框标题
const requirementDialogTitle = computed(() => {
  if (isEditRequirement.value) return '编辑需求'
  if (requirementForm.parentId) return '新建子需求'
  return '新建需求'
})

// 父需求标题
const parentRequirementTitle = computed(() => {
  return parentRequirement.value?.title || ''
})

// 可用的父需求列表（排除自己和已有父需求的需求）
const availableParentRequirements = computed(() => {
  if (!requirementForm.projectId) return []
  return requirements.value.filter(
    r => r.projectId === requirementForm.projectId && !r.parentId && r.id !== requirementForm.id
  )
})

// 构建树形数据
const treeData = computed(() => {
  return buildProjectTree()
})

/**
 * 获取标题缩进
 */
const getTitlePaddingLeft = (row: any): string => {
  if (row.isProject) return '0px'
  if (row.parentId) return '40px' // 子需求
  return '20px' // 顶层需求
}

/**
 * 切换全部展开/折叠
 */
const toggleExpandAll = (value: boolean) => {
  if (value) {
    expandAll()
  } else {
    collapseAll()
  }
}

/**
 * 项目下拉选择处理
 */
const handleProjectSelect = async () => {
  await fetchData()
  if (filters.selectedProjectId) {
    await nextTick()
    expandAll()
  }
}

/**
 * 搜索处理（仅按项目搜索，搜索后自动展开）
 */
const handleSearch = async () => {
  await fetchData()
  if (filters.search) {
    await nextTick()
    expandAll()
  }
}

/**
 * 项目优先级筛选处理（筛选后自动展开）
 */
const handleProjectPriorityFilter = async () => {
  await fetchData()
  if (filters.projectPriority) {
    await nextTick()
    expandAll()
  }
}

/**
 * 需求状态筛选处理（筛选后自动展开）
 */
const handleRequirementStatusFilter = async () => {
  await fetchData()
  if (filters.requirementStatus) {
    await nextTick()
    expandAll()
  }
}

/**
 * 需求优先级筛选处理（筛选后自动展开）
 */
const handleRequirementPriorityFilter = async () => {
  await fetchData()
  if (filters.requirementPriority) {
    await nextTick()
    expandAll()
  }
}

/**
 * 构建项目-需求树形结构
 */
const buildProjectTree = (): any[] => {
  const result: any[] = []

  // 筛选项目
  let filteredProjects = projects.value
  if (filters.selectedProjectId) {
    filteredProjects = filteredProjects.filter(p => p.id === filters.selectedProjectId)
  }
  if (filters.search) {
    filteredProjects = filteredProjects.filter(
      p => p.name.includes(filters.search)
    )
  }
  if (filters.projectStatus) {
    filteredProjects = filteredProjects.filter(p => p.status === filters.projectStatus)
  }
  if (filters.projectPriority) {
    filteredProjects = filteredProjects.filter(p => p.priority === filters.projectPriority)
  }

  // 筛选需求
  let filteredRequirements = requirements.value

  // 如果选择了项目或搜索项目，则显示该项目下的所有需求
  if (filters.selectedProjectId || filters.search) {
    const matchedProjectIds = filteredProjects.map(p => p.id)
    filteredRequirements = filteredRequirements.filter(r => matchedProjectIds.includes(r.projectId))
  }

  if (filters.requirementStatus) {
    filteredRequirements = filteredRequirements.filter(r => r.status === filters.requirementStatus)
  }
  if (filters.requirementPriority) {
    filteredRequirements = filteredRequirements.filter(r => r.priority === filters.requirementPriority)
  }

  // 构建需求Map
  const requirementMap = new Map<string, any>()
  filteredRequirements.forEach(req => {
    requirementMap.set(req.id, {
      ...req,
      isProject: false,
      assigneeIds: req.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
      children: [],
      level: 0
    })
  })

  // 建立需求父子关系
  filteredRequirements.forEach(req => {
    const node = requirementMap.get(req.id)!
    if (req.parentId && requirementMap.has(req.parentId)) {
      const parent = requirementMap.get(req.parentId)!
      parent.children.push(node)
      node.level = parent.level + 1
    }
  })

  // 为每个项目添加需求
  filteredProjects.forEach(project => {
    // 计算项目进度
    const projectRequirements = filteredRequirements.filter(r => r.projectId === project.id)
    const projectTasks = tasks.value.filter(t => t.projectId === project.id)

    const requirementProgress = calculateRequirementProgress(projectRequirements)
    const taskProgress = calculateTaskProgress(projectTasks)

    const projectNode: any = {
      ...project,
      id: `project-${project.id}`,
      isProject: true,
      priority: project.priority || 'MEDIUM',
      requirementProgress,
      taskProgress,
      children: []
    }

    // 添加顶层需求（没有父需求的）
    filteredRequirements.forEach(req => {
      if (req.projectId === project.id && !req.parentId) {
        const reqNode = requirementMap.get(req.id)
        if (reqNode) {
          projectNode.children.push(reqNode)
        }
      }
    })

    result.push(projectNode)
  })

  return result
}

/**
 * 计算需求进度
 */
const calculateRequirementProgress = (requirements: Requirement[]): number => {
  if (requirements.length === 0) return 0
  const completed = requirements.filter(r => r.status === 'COMPLETED').length
  return Math.round((completed / requirements.length) * 100)
}

/**
 * 计算任务进度
 */
const calculateTaskProgress = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0
  const completed = tasks.filter(t => t.status === 'DONE').length
  return Math.round((completed / tasks.length) * 100)
}

/**
 * 进度颜色
 */
const getProgressColor = (percentage: number) => {
  if (percentage < 30) return '#f56c6c'
  if (percentage < 70) return '#e6a23c'
  return '#67c23a'
}

/**
 * 获取数据
 */
const fetchData = async () => {
  loading.value = true
  try {
    const [projectsData, requirementsData, tasksData, usersData] = await Promise.all([
      getProjects(),
      getRequirements(),
      getTasks({}),
      getUsers()
    ])
    projects.value = projectsData
    requirements.value = requirementsData
    tasks.value = tasksData
    userOptions.value = usersData
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败')
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

// ========== 项目操作 ==========

/**
 * 显示创建项目对话框
 */
const showCreateProjectDialog = () => {
  isEditProject.value = false
  Object.assign(projectForm, {
    id: '',
    name: '',
    description: '',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null
  })
  projectDialogVisible.value = true
}

/**
 * 编辑项目
 */
const handleEditProject = (row: any) => {
  isEditProject.value = true
  Object.assign(projectForm, {
    id: row.id.replace('project-', ''),
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority || 'MEDIUM',
    startDate: row.startDate || null,
    endDate: row.endDate || null
  })
  projectDialogVisible.value = true
}

/**
 * 提交项目表单
 */
const handleProjectSubmit = async () => {
  if (!projectFormRef.value) return

  await projectFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const data = {
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        priority: projectForm.priority,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate
      }

      if (isEditProject.value) {
        await updateProject(projectForm.id, data)
        ElMessage.success('项目更新成功')
      } else {
        await createProject(data)
        ElMessage.success('项目创建成功')
      }

      projectDialogVisible.value = false
      await fetchData()
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败')
    }
  })
}

/**
 * 删除项目
 */
const handleDeleteProject = (row: any) => {
  const projectId = row.id.replace('project-', '')
  const hasRequirements = requirements.value.some(r => r.projectId === projectId)
  const message = hasRequirements
    ? '此项目包含需求，删除后需求也会被删除。确定要删除吗？'
    : '确定要删除此项目吗？'

  ElMessageBox.confirm(message, '提示', { type: 'warning' })
    .then(async () => {
      try {
        await deleteProject(projectId)
        ElMessage.success('删除成功')
        fetchData()
      } catch (error: any) {
        ElMessage.error(error.message || '删除失败')
      }
    })
    .catch(() => {})
}

/**
 * 项目排序（上移/下移/置顶）
 */
const handleSortProject = async (row: any, action: 'moveUp' | 'moveDown' | 'pinToTop') => {
  const projectId = row.id.replace('project-', '')
  try {
    await sortProject(projectId, action)
    const actionText = action === 'pinToTop' ? '置顶' : action === 'moveUp' ? '上移' : '下移'
    ElMessage.success(`项目${actionText}成功`)
    await fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '排序失败')
  }
}

/**
 * 项目状态行内编辑
 */
const handleProjectStatusChange = async (row: any) => {
  const projectId = row.id.replace('project-', '')
  const originalData = { ...row }
  try {
    await updateProject(projectId, { status: row.status })
    ElMessage.success('状态更新成功')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
    Object.assign(row, originalData)
  }
}

/**
 * 项目优先级行内编辑
 */
const handleProjectPriorityChange = async (row: any) => {
  const projectId = row.id.replace('project-', '')
  const originalData = { ...row }
  try {
    await updateProject(projectId, { priority: row.priority })
    ElMessage.success('优先级更新成功')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
    Object.assign(row, originalData)
  }
}

/**
 * 项目日期行内编辑
 */
const handleProjectDateChange = async (row: any, field: 'startDate' | 'endDate') => {
  const projectId = row.id.replace('project-', '')
  const originalData = { ...row }
  try {
    await updateProject(projectId, { [field]: row[field] })
    ElMessage.success('日期更新成功')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
    Object.assign(row, originalData)
  }
}

// ========== 需求操作 ==========

/**
 * 显示创建需求对话框
 */
const showCreateRequirementDialog = () => {
  isEditRequirement.value = false
  parentRequirement.value = null
  Object.assign(requirementForm, {
    id: '',
    title: '',
    description: '',
    projectId: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    assigneeIds: [],
    estimatedHours: 1,
    parentId: ''
  })
  requirementDialogVisible.value = true
}

/**
 * 显示创建子需求对话框
 */
const showCreateChildRequirementDialog = (parent: Requirement) => {
  isEditRequirement.value = false
  parentRequirement.value = parent
  Object.assign(requirementForm, {
    id: '',
    title: '',
    description: '',
    projectId: parent.projectId,
    priority: 'MEDIUM',
    status: 'PENDING',
    assigneeIds: [],
    estimatedHours: 1,
    parentId: parent.id
  })
  requirementDialogVisible.value = true
}

/**
 * 编辑需求
 */
const handleEditRequirement = (row: Requirement) => {
  isEditRequirement.value = true
  parentRequirement.value = null

  Object.assign(requirementForm, {
    id: row.id,
    title: row.title,
    description: row.description || '',
    projectId: row.projectId,
    priority: row.priority,
    status: row.status,
    assigneeIds: row.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [],
    estimatedHours: row.estimatedHours || 0,
    startDate: row.startDate || null,
    endDate: row.endDate || null,
    parentId: row.parentId || ''
  })

  // 如果有父需求，加载父需求信息
  if (row.parentId) {
    parentRequirement.value = requirements.value.find(r => r.id === row.parentId) || null
  }

  requirementDialogVisible.value = true
}

/**
 * 提交需求表单
 */
const handleRequirementSubmit = async () => {
  if (!requirementFormRef.value) return

  await requirementFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data: any = {
        title: requirementForm.title,
        description: requirementForm.description,
        projectId: requirementForm.projectId,
        priority: requirementForm.priority,
        status: requirementForm.status,
        assigneeIds: requirementForm.assigneeIds.length > 0 ? requirementForm.assigneeIds : undefined,
        estimatedHours: requirementForm.estimatedHours || 0,
        startDate: requirementForm.startDate || undefined,
        endDate: requirementForm.endDate || undefined
      }

      // 如果是子需求，添加 parentId
      if (requirementForm.parentId) {
        data.parentId = requirementForm.parentId
      }

      if (isEditRequirement.value) {
        await updateRequirement(requirementForm.id, data)
        ElMessage.success('需求更新成功')
      } else {
        await createRequirement(data)
        ElMessage.success('需求创建成功')
      }

      requirementDialogVisible.value = false
      await fetchData()

      // 如果是新建，自动展开父节点
      if (!isEditRequirement.value) {
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
const handleDeleteRequirement = (row: Requirement) => {
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

/**
 * 需求行内编辑通用方法
 */
const updateRequirementInline = async (row: Requirement, data: any, successMessage: string) => {
  const originalData = { ...row }
  try {
    await updateRequirement(row.id, data)
    ElMessage.success(successMessage)
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
    Object.assign(row, originalData)
  }
}

/**
 * 需求状态行内编辑
 */
const handleRequirementStatusChange = async (row: Requirement) => {
  await updateRequirementInline(row, { status: row.status }, '状态更新成功')
  fetchData() // 重新加载以更新项目进度
}

/**
 * 需求优先级行内编辑
 */
const handleRequirementPriorityChange = async (row: Requirement) => {
  await updateRequirementInline(row, { priority: row.priority }, '优先级更新成功')
}

/**
 * 需求负责人行内编辑
 */
const handleRequirementAssigneesChange = async (row: any) => {
  const assigneeIds = row.assigneeIds.length > 0 ? row.assigneeIds : undefined
  await updateRequirementInline(row, { assigneeIds }, '负责人更新成功')
  fetchData()
}

/**
 * 需求预估工时行内编辑
 */
const handleRequirementEstimatedHoursChange = async (row: Requirement) => {
  await updateRequirementInline(row, { estimatedHours: row.estimatedHours }, '预估工时更新成功')
}

/**
 * 需求日期行内编辑
 */
const handleRequirementDateChange = async (row: Requirement, field: 'startDate' | 'endDate') => {
  const value = row[field] || undefined
  const message = field === 'startDate' ? '开始日期更新成功' : '结束日期更新成功'
  await updateRequirementInline(row, { [field]: value }, message)
}

/**
 * 重置需求表单
 */
const resetRequirementForm = () => {
  requirementFormRef.value?.resetFields()
  parentRequirement.value = null
}

/**
 * 初始化
 */
onMounted(async () => {
  await fetchData()
  await nextTick()
  expandAll()
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

.header-buttons {
  display: flex;
  gap: 12px;
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

.date-cell {
  display: flex;
  align-items: center;
  gap: 2px;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.time-divider {
  color: #909399;
  font-size: 12px;
  text-align: center;
  height: 1px;
  line-height: 1px;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 12px;
  color: #606266;
  min-width: 40px;
}

.workload-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workload-label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.workload-unit {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
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
