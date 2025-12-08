<template>
  <div class="project-sidebar">
    <div class="sidebar-header">
      <h3>项目列表</h3>
      <el-button type="primary" size="small" @click="$emit('create')">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <el-input
      v-model="searchText"
      placeholder="搜索项目"
      size="small"
      clearable
      style="margin-bottom: 12px"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <div class="project-list">
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="project-item"
        :class="{ active: selectedProjectId === project.id }"
        @click="selectProject(project)"
      >
        <div class="project-info">
          <div class="project-name">{{ project.name }}</div>
          <div class="project-stats">
            <el-tag size="small" type="info">需求: {{ project._count?.requirements || 0 }}</el-tag>
            <el-tag size="small" type="warning">任务: {{ project._count?.tasks || 0 }}</el-tag>
          </div>
          <el-progress
            :percentage="calculateProgress(project)"
            :stroke-width="4"
            :show-text="true"
            :format="() => `${calculateProgress(project)}%`"
          />
        </div>

        <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, project)">
          <el-icon class="more-icon" @click.stop><MoreFilled /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="requirements">查看需求</el-dropdown-item>
              <el-dropdown-item command="tasks">查看任务</el-dropdown-item>
              <el-dropdown-item command="dashboard">数据看板</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@/types'

interface Props {
  projects: Project[]
  selectedProjectId?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['select', 'create'])
const router = useRouter()

const searchText = ref('')

const filteredProjects = computed(() => {
  if (!searchText.value) return props.projects
  const search = searchText.value.toLowerCase()
  return props.projects.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.description?.toLowerCase().includes(search)
  )
})

const selectProject = (project: Project) => {
  emit('select', project)
}

const calculateProgress = (project: Project) => {
  const reqCount = project._count?.requirements || 0
  const taskCount = project._count?.tasks || 0
  const total = reqCount + taskCount
  if (total === 0) return 0

  // 这里简化计算，实际应该基于完成状态
  // 在后续优化中会从后端获取真实进度数据
  return Math.round((taskCount / (total * 2)) * 100)
}

const handleCommand = (command: string, project: Project) => {
  switch (command) {
    case 'requirements':
      router.push({ path: '/requirements', query: { projectId: project.id } })
      break
    case 'tasks':
      router.push({ path: '/tasks', query: { projectId: project.id } })
      break
    case 'dashboard':
      router.push({ path: '/dashboard', query: { projectId: project.id } })
      break
  }
}
</script>

<style scoped>
.project-sidebar {
  height: 100%;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.project-list {
  flex: 1;
  overflow-y: auto;
}

.project-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.project-item:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.project-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.project-info {
  flex: 1;
}

.project-name {
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}

.project-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.more-icon {
  cursor: pointer;
  color: #909399;
  padding: 4px;
}

.more-icon:hover {
  color: #409eff;
}
</style>
