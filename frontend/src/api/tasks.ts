import request from '@/utils/request'
import type { Task, KanbanData } from '@/types'

export const getTasks = (params?: {
  projectId?: string
  requirementId?: string
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
}) => {
  return request.get<any, Task[]>('/tasks', { params })
}

export const getKanbanData = (params?: {
  projectId?: string
  assigneeId?: string
}) => {
  return request.get<any, KanbanData>('/tasks/kanban', { params })
}

export const getTask = (id: string) => {
  return request.get<any, Task>(`/tasks/${id}`)
}

export const createTask = (data: {
  title: string
  description?: string
  priority?: string
  status?: string
  projectId: string
  requirementId?: string
  assigneeId?: string
  assigneeIds?: string[]
  parentId?: string
  estimatedHours?: number
  actualHours?: number
  startDate?: string
  dueDate?: string
}) => {
  return request.post<any, Task>('/tasks', data)
}

export const updateTask = (id: string, data: Partial<Task>) => {
  return request.put<any, Task>(`/tasks/${id}`, data)
}

export const deleteTask = (id: string) => {
  return request.delete(`/tasks/${id}`)
}
