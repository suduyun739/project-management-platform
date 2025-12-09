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

        <el-select v-model="filters.projectId" placeholder="筛选项目" style="width: 180px" clearable @change="handleProjectFilter">
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
        <!-- 任务标题列 -->
        <el-table-column prop="title" label="任务标题" min-width="300">
          <template #default="{ row }">
            <div class="title-cell">
              <span>{{ row.title }}</span>
              <el-button
                v-if="!row.isRequirementRow && !row.isProjectRow && row.level < 2"
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

        <!-- 所属需求 -->
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

        <!-- 优先级 -->
        <el-table-column label="优先级" width="130">
          <template #default="{ row }">
            <el-select
              v-if="!row.isRequirementRow && !row.isProjectRow"
              v-model="row.priority"
              @change="handlePriorityChange(row)"
              size="small"
            >
              <el-option label="低" value="LOW"><el-tag type="info" size="small">低</el-tag></el-option>
              <el-option label="中" value="MEDIUM"><el-tag size="small">中</el-tag></el-option>
              <el-option label="高" value="HIGH"><el-tag type="warning" size="small">高</el-tag></el-option>
              <el-option label="紧急" value="URGENT"><el-tag type="danger" size="small">紧急</el-tag></el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- 状态 -->
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-select
              v-if="!row.isRequirementRow && !row.isProjectRow"
              v-model="row.status"
              @change="handleStatusChange(row)"
              size="small"
            >
              <el-option label="待处理" value="TODO"><el-tag type="info" size="small">待处理</el-tag></el-option>
              <el-option label="进行中" value="IN_PROGRESS"><el-tag size="small">进行中</el-tag></el-option>
              <el-option label="测试中" value="TESTING"><el-tag type="warning" size="small">测试中</el-tag></el-option>
              <el-option label="已完成" value="DONE"><el-tag type="success" size="small">已完成</el-tag></el-option>
              <el-option label="已阻塞" value="BLOCKED"><el-tag type="danger" size="small">已阻塞</el-tag></el-option>
            </el-select>
          </template>
        </el-table-column>

        <!-- 负责人 -->
        <el-table-column label="负责人" width="200">
          <template #default="{ row }">
            <el-select
              v-if="!row.isRequirementRow && !row.isProjectRow"
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

        <!-- 工时 -->
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

        <!-- 日期 -->
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
            <div v-if="!row.isRequirementRow && !row.isProjectRow">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 - 请查看完整代码 -->
  </div>
</template>

<script setup lang="ts">
// 完整脚本代码请参考需求页面的实现模式
// 这里是简化版本,实际使用时需要补充完整
import { ref } from 'vue'
import { Plus, Search, Expand, Fold } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const tableRef = ref()
const filters = ref({})
const treeData = ref([])
const projectOptions = ref([])
const userOptions = ref([])

// 方法声明
const fetchData = () => {}
const handleProjectFilter = () => {}
const expandAll = () => {}
const collapseAll = () => {}
const showCreateDialog = () => {}
const showCreateChildDialog = () => {}
const handleRequirementChange = () => {}
const handlePriorityChange = () => {}
const handleStatusChange = () => {}
const handleAssigneesChange = () => {}
const handleEstimatedHoursChange = () => {}
const handleActualHoursChange = () => {}
const handleStartDateChange = () => {}
const handleDueDateChange = () => {}
const handleEdit = () => {}
const handleDelete = () => {}
const getRequirementsByProject = () => []
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

.hours-cell,
.date-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.el-table__row--level-0) {
  background-color: #f5f7fa;
  font-weight: bold;
}

:deep(.el-table__row--level-1) {
  background-color: #fafafa;
}
</style>
