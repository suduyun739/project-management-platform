import request from '@/utils/request'
import type { User } from '@/types'

export const getUsers = () => {
  return request.get<any, User[]>('/users')
}

export const getUser = (id: string) => {
  return request.get<any, User>(`/users/${id}`)
}

export const updateUser = (id: string, data: Partial<User>) => {
  return request.put<any, User>(`/users/${id}`, data)
}

export const deleteUser = (id: string) => {
  return request.delete(`/users/${id}`)
}

export const resetPassword = (id: string, newPassword: string) => {
  return request.post(`/users/${id}/reset-password`, { newPassword })
}
