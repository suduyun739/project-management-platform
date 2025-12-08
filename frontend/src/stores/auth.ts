import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import { login as loginApi, getCurrentUser } from '@/api/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAdmin = () => user.value?.role === 'ADMIN'

  const login = async (username: string, password: string) => {
    const data = await loginApi(username, password)
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    router.push('/')
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  const checkAuth = async () => {
    if (!token.value) {
      return
    }

    try {
      user.value = await getCurrentUser()
    } catch (error) {
      logout()
    }
  }

  return {
    user,
    token,
    isAdmin,
    login,
    logout,
    checkAuth
  }
})
