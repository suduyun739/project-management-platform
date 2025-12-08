import request from '@/utils/request'
import type { User } from '@/types'

export const login = (username: string, password: string) => {
  return request.post<any, { token: string; user: User }>('/auth/login', {
    username,
    password
  })
}

export const register = (data: {
  username: string
  password: string
  name: string
  email?: string
}) => {
  return request.post<any, User>('/auth/register', data)
}

export const getCurrentUser = () => {
  return request.get<any, User>('/auth/me')
}

export const changePassword = (oldPassword: string, newPassword: string) => {
  return request.put('/auth/password', { oldPassword, newPassword })
}
