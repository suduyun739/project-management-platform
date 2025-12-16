<template>
  <div class="dashboard-container">
    <!-- 筛选器 -->
    <el-card class="filter-card">
      <el-space wrap>
        <!-- 管理员可以选择项目 -->
        <el-select
          v-if="authStore.isAdmin()"
          v-model="selectedProjectId"
          placeholder="选择项目"
          style="width: 250px"
          clearable
          filterable
          @change="fetchData"
        >
          <el-option
            v-for="p in projectOptions"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>
        <!-- 非管理员显示提示 -->
        <el-text v-else size="large" tag="b">我的工作统计</el-text>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="fetchData"
        />
        <el-button type="primary" @click="fetchData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </el-space>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card" @click="navigateTo('requirements')">
        <div class="stat-icon" style="background-color: #ecf5ff">
          <el-icon :size="32" color="#409eff"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">需求总数</div>
          <div class="stat-value">{{ stats.totalRequirements }}</div>
          <div class="stat-progress">
            <span>完成: {{ stats.completedRequirements }}</span>
            <span>{{ requirementCompletionRate }}%</span>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" @click="navigateTo('tasks')">
        <div class="stat-icon" style="background-color: #fef0f0">
          <el-icon :size="32" color="#f56c6c"><List /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">{{ stats.totalTasks }}</div>
          <div class="stat-progress">
            <span>完成: {{ stats.doneTasks }}</span>
            <span>{{ taskCompletionRate }}%</span>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon" style="background-color: #f0f9ff">
          <el-icon :size="32" color="#67c23a"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">预估工时(天)</div>
          <div class="stat-value">{{ stats.totalEstimatedHours }}</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon" style="background-color: #fdf6ec">
          <el-icon :size="32" color="#e6a23c"><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">整体进度</div>
          <div class="stat-value">{{ overallProgress }}%</div>
          <el-progress
            :percentage="overallProgress"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="16">
      <!-- 需求状态分布 -->
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>需求状态分布</span>
              <el-tag size="small">总计: {{ stats.totalRequirements }}</el-tag>
            </div>
          </template>
          <div ref="requirementPieRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 任务状态分布 -->
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>任务状态分布</span>
              <el-tag size="small">总计: {{ stats.totalTasks }}</el-tag>
            </div>
          </template>
          <div ref="taskPieRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 任务优先级分布 -->
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>任务优先级分布</span>
              <el-radio-group v-model="priorityFilterType" size="small" @change="updatePriorityBarChart">
                <el-radio-button label="incomplete">未完成</el-radio-button>
                <el-radio-button label="completed">已完成</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="priorityBarRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 状态明细 -->
    <el-card class="table-card">
      <template #header>
        <div class="chart-header">
          <span>状态明细</span>
          <el-radio-group v-model="detailType" size="small" @change="updateDetailTable">
            <el-radio-button label="requirements">需求</el-radio-button>
            <el-radio-button label="tasks">任务</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="detailData" stripe>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ row.statusLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="数量" width="100">
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="navigateToDetail(detailType, row.status)"
            >
              {{ row.count }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="percentage" label="占比" width="120">
          <template #default="{ row }">
            {{ row.percentage }}%
          </template>
        </el-table-column>
        <el-table-column label="进度">
          <template #default="{ row }">
            <el-progress
              :percentage="row.percentage"
              :color="getProgressColor(row.percentage)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 项目完成情况对比 -->
    <el-row :gutter="16">
      <el-col :xs="24">
        <el-card class="chart-card">
          <template #header>
            <span>项目完成情况对比</span>
          </template>
          <div ref="projectComparisonRef" class="chart-container-large"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { getRequirements } from '@/api/requirements'
import { getTasks } from '@/api/tasks'
import { getProjects } from '@/api/projects'
import { useAuthStore } from '@/stores/auth'
import type { Requirement, Task, Project } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const selectedProjectId = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const projectOptions = ref<Project[]>([])
const detailType = ref<'requirements' | 'tasks'>('requirements')
const priorityFilterType = ref<'incomplete' | 'completed'>('incomplete')

// 图表引用
const requirementPieRef = ref<HTMLElement>()
const taskPieRef = ref<HTMLElement>()
const priorityBarRef = ref<HTMLElement>()
const projectComparisonRef = ref<HTMLElement>()

let requirementPieChart: ECharts | null = null
let taskPieChart: ECharts | null = null
let priorityBarChart: ECharts | null = null
let projectComparisonChart: ECharts | null = null

// 原始数据
const requirements = ref<Requirement[]>([])
const tasks = ref<Task[]>([])

// 统计数据
const stats = reactive({
  totalRequirements: 0,
  completedRequirements: 0,
  totalTasks: 0,
  doneTasks: 0,
  totalEstimatedHours: 0,
  requirementsByStatus: {} as Record<string, number>,
  tasksByStatus: {} as Record<string, number>
})

// 计算属性
const requirementCompletionRate = computed(() => {
  if (stats.totalRequirements === 0) return 0
  return Math.round((stats.completedRequirements / stats.totalRequirements) * 100)
})

const taskCompletionRate = computed(() => {
  if (stats.totalTasks === 0) return 0
  return Math.round((stats.doneTasks / stats.totalTasks) * 100)
})

const overallProgress = computed(() => {
  return Math.round((requirementCompletionRate.value + taskCompletionRate.value) / 2)
})

const detailData = computed(() => {
  if (detailType.value === 'requirements') {
    const statusLabels: Record<string, string> = {
      PENDING: '待处理',
      IN_PROGRESS: '进行中',
      COMPLETED: '已完成',
      REJECTED: '已拒绝'
    }
    const total = stats.totalRequirements
    return Object.entries(stats.requirementsByStatus).map(([status, count]) => ({
      status,
      statusLabel: statusLabels[status],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  } else {
    const statusLabels: Record<string, string> = {
      TODO: '待处理',
      IN_PROGRESS: '进行中',
      TESTING: '测试中',
      DONE: '已完成',
      BLOCKED: '已阻塞'
    }
    const total = stats.totalTasks
    return Object.entries(stats.tasksByStatus).map(([status, count]) => ({
      status,
      statusLabel: statusLabels[status],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  }
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const filters: any = {}

    // 管理员模式：可以选择项目
    if (authStore.isAdmin()) {
      if (selectedProjectId.value) {
        filters.projectId = selectedProjectId.value
      }
    } else {
      // 非管理员模式：只看自己作为负责人的需求和任务
      filters.assigneeId = authStore.user?.id
    }

    // 获取需求和任务数据
    ;[requirements.value, tasks.value] = await Promise.all([
      getRequirements(filters),
      getTasks(filters)
    ])

    // 计算统计数据
    calculateStats()

    // 更新图表
    await nextTick()
    updateCharts()
  } finally {
    loading.value = false
  }
}

// 计算统计数据
const calculateStats = () => {
  // 需求统计
  stats.totalRequirements = requirements.value.length
  stats.completedRequirements = requirements.value.filter(r => r.status === 'COMPLETED').length
  stats.requirementsByStatus = requirements.value.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 任务统计
  stats.totalTasks = tasks.value.length
  stats.doneTasks = tasks.value.filter(t => t.status === 'DONE').length
  stats.tasksByStatus = tasks.value.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 工时统计：只统计任务的预估工时；如果需求下没有任务，则使用需求的预估工时
  const requirementsWithTasks = new Set(tasks.value.map(t => t.requirementId).filter(Boolean))
  const requirementsWithoutTasks = requirements.value.filter(r => !requirementsWithTasks.has(r.id))

  stats.totalEstimatedHours = Math.round(
    (tasks.value.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) +
     requirementsWithoutTasks.reduce((sum, r) => sum + (r.estimatedHours || 0), 0)) * 10
  ) / 10
}

// 更新所有图表
const updateCharts = () => {
  updateRequirementPieChart()
  updateTaskPieChart()
  updatePriorityBarChart()
  updateProjectComparisonChart()
}

// 需求状态饼图
const updateRequirementPieChart = () => {
  if (!requirementPieRef.value) return

  if (!requirementPieChart) {
    requirementPieChart = echarts.init(requirementPieRef.value)
  }

  const statusLabels: Record<string, string> = {
    PENDING: '待处理',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成',
    REJECTED: '已拒绝'
  }

  const statusColors: Record<string, string> = {
    PENDING: '#909399',
    IN_PROGRESS: '#409eff',
    COMPLETED: '#67c23a',
    REJECTED: '#f56c6c'
  }

  const data = Object.entries(stats.requirementsByStatus).map(([status, count]) => ({
    name: statusLabels[status],
    value: count,
    itemStyle: { color: statusColors[status] }
  }))

  requirementPieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: '{b}\n{c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  })

  requirementPieChart.on('click', (params: any) => {
    const statusMap: Record<string, string> = {
      '待处理': 'PENDING',
      '进行中': 'IN_PROGRESS',
      '已完成': 'COMPLETED',
      '已拒绝': 'REJECTED'
    }
    navigateToDetail('requirements', statusMap[params.name])
  })
}

// 任务状态饼图
const updateTaskPieChart = () => {
  if (!taskPieRef.value) return

  if (!taskPieChart) {
    taskPieChart = echarts.init(taskPieRef.value)
  }

  const statusLabels: Record<string, string> = {
    TODO: '待处理',
    IN_PROGRESS: '进行中',
    TESTING: '测试中',
    DONE: '已完成',
    BLOCKED: '已阻塞'
  }

  const statusColors: Record<string, string> = {
    TODO: '#909399',
    IN_PROGRESS: '#409eff',
    TESTING: '#e6a23c',
    DONE: '#67c23a',
    BLOCKED: '#f56c6c'
  }

  const data = Object.entries(stats.tasksByStatus).map(([status, count]) => ({
    name: statusLabels[status],
    value: count,
    itemStyle: { color: statusColors[status] }
  }))

  taskPieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: '{b}\n{c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }
    ]
  })

  taskPieChart.on('click', (params: any) => {
    const statusMap: Record<string, string> = {
      '待处理': 'TODO',
      '进行中': 'IN_PROGRESS',
      '测试中': 'TESTING',
      '已完成': 'DONE',
      '已阻塞': 'BLOCKED'
    }
    navigateToDetail('tasks', statusMap[params.name])
  })
}

// 任务优先级柱状图
const updatePriorityBarChart = () => {
  if (!priorityBarRef.value) return

  if (!priorityBarChart) {
    priorityBarChart = echarts.init(priorityBarRef.value)
  }

  // 根据筛选条件过滤任务
  const filteredTasks = priorityFilterType.value === 'completed'
    ? tasks.value.filter(t => t.status === 'DONE')
    : tasks.value.filter(t => t.status !== 'DONE')

  // 统计优先级分布（仅任务）
  const priorityDistribution = filteredTasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const priorityLabels: Record<string, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    URGENT: '紧急'
  }

  const priorityColors: Record<string, string> = {
    LOW: '#909399',
    MEDIUM: '#409eff',
    HIGH: '#e6a23c',
    URGENT: '#f56c6c'
  }

  priorityBarChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: ['低', '中', '高', '紧急']
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        type: 'bar',
        data: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => ({
          value: priorityDistribution[p] || 0,
          itemStyle: { color: priorityColors[p] }
        })),
        barWidth: '60%'
      }
    ]
  })
}

// 项目对比柱状图
const updateProjectComparisonChart = () => {
  if (!projectComparisonRef.value) return

  if (!projectComparisonChart) {
    projectComparisonChart = echarts.init(projectComparisonRef.value)
  }

  // 按项目分组统计
  const projectStats: Record<string, any> = {}

  requirements.value.forEach(r => {
    const projectName = r.project?.name || '未知项目'
    if (!projectStats[projectName]) {
      projectStats[projectName] = { requirements: 0, completedReqs: 0, tasks: 0, doneTasks: 0 }
    }
    projectStats[projectName].requirements++
    if (r.status === 'COMPLETED') {
      projectStats[projectName].completedReqs++
    }
  })

  tasks.value.forEach(t => {
    const projectName = t.project?.name || '未知项目'
    if (!projectStats[projectName]) {
      projectStats[projectName] = { requirements: 0, completedReqs: 0, tasks: 0, doneTasks: 0 }
    }
    projectStats[projectName].tasks++
    if (t.status === 'DONE') {
      projectStats[projectName].doneTasks++
    }
  })

  const projectNames = Object.keys(projectStats)
  const reqData = projectNames.map(name => projectStats[name].requirements)
  const completedReqData = projectNames.map(name => projectStats[name].completedReqs)
  const taskData = projectNames.map(name => projectStats[name].tasks)
  const doneTaskData = projectNames.map(name => projectStats[name].doneTasks)

  projectComparisonChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['需求总数', '已完成需求', '任务总数', '已完成任务']
    },
    xAxis: {
      type: 'category',
      data: projectNames
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '需求总数',
        type: 'bar',
        data: reqData,
        itemStyle: { color: '#409eff' }
      },
      {
        name: '已完成需求',
        type: 'bar',
        data: completedReqData,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '任务总数',
        type: 'bar',
        data: taskData,
        itemStyle: { color: '#e6a23c' }
      },
      {
        name: '已完成任务',
        type: 'bar',
        data: doneTaskData,
        itemStyle: { color: '#95d475' }
      }
    ]
  })
}

// 导航函数
const navigateTo = (type: string) => {
  const query: any = {}
  if (selectedProjectId.value) {
    query.projectId = selectedProjectId.value
  }
  router.push({ path: `/${type}`, query })
}

const navigateToDetail = (type: string, status: string) => {
  const query: any = { status }
  if (selectedProjectId.value) {
    query.projectId = selectedProjectId.value
  }
  // 需求跳转到 projects 页面，任务跳转到 tasks 页面
  const path = type === 'requirements' ? '/projects' : '/tasks'
  router.push({ path, query })
}

const updateDetailTable = () => {
  // 表格数据通过 computed 自动更新
}

const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    PENDING: 'info',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    REJECTED: 'danger',
    TODO: 'info',
    TESTING: 'warning',
    DONE: 'success',
    BLOCKED: 'danger'
  }
  return typeMap[status] || 'info'
}

const getProgressColor = (percentage: number) => {
  if (percentage < 30) return '#67c23a'
  if (percentage < 70) return '#409eff'
  return '#f56c6c'
}

// 窗口调整时重新渲染图表
const handleResize = () => {
  requirementPieChart?.resize()
  taskPieChart?.resize()
  priorityBarChart?.resize()
  projectComparisonChart?.resize()
}

onMounted(async () => {
  // 获取项目列表（管理员需要）
  if (authStore.isAdmin()) {
    projectOptions.value = await getProjects()
    // 默认选中第一个项目（已按sortOrder排序，第一个就是置顶/最上面的）
    if (projectOptions.value.length > 0) {
      selectedProjectId.value = projectOptions.value[0].id
    }
  }

  await fetchData()

  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  padding: 16px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.filter-card {
  margin-bottom: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-progress {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.chart-card {
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-container-large {
  width: 100%;
  height: 400px;
}

.table-card {
  margin-bottom: 16px;
}
</style>
