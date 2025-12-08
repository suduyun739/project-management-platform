import request from '@/utils/request'
import type { Project } from '@/types'

export const getProjects = (params?: {
  status?: string
  search?: string
}) => {
  return request.get<any, Project[]>('/projects', { params })
}

export const getProject = (id: string) => {
  return request.get<any, Project>(`/projects/${id}`)
}

export const createProject = (data: {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}) => {
  return request.post<any, Project>('/projects', data)
}

export const updateProject = (id: string, data: Partial<Project>) => {
  return request.put<any, Project>(`/projects/${id}`, data)
}

export const deleteProject = (id: string) => {
  return request.delete(`/projects/${id}`)
}

export const reorderProjects = (projectIds: string[]) => {
  return request.post('/projects/reorder', { projectIds })
}
