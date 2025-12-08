import request from '@/utils/request'
import type { Requirement } from '@/types'

export const getRequirements = (params?: {
  projectId?: string
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
}) => {
  return request.get<any, Requirement[]>('/requirements', { params })
}

export const getRequirement = (id: string) => {
  return request.get<any, Requirement>(`/requirements/${id}`)
}

export const createRequirement = (data: {
  title: string
  description?: string
  priority?: string
  projectId: string
  assigneeId?: string
  estimatedHours?: number
}) => {
  return request.post<any, Requirement>('/requirements', data)
}

export const updateRequirement = (id: string, data: Partial<Requirement>) => {
  return request.put<any, Requirement>(`/requirements/${id}`, data)
}

export const deleteRequirement = (id: string) => {
  return request.delete(`/requirements/${id}`)
}
