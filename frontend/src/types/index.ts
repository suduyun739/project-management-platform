export interface User {
  id: string
  username: string
  name: string
  email?: string
  role: 'ADMIN' | 'MEMBER'
  avatar?: string
  createdAt: string
  updatedAt?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  creatorId: string
  creator?: User
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
  _count?: {
    requirements: number
    tasks: number
  }
}

export interface Requirement {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  projectId: string
  project?: { id: string; name: string }
  assigneeId?: string
  assignee?: User
  estimatedHours?: number
  createdAt: string
  updatedAt: string
  _count?: {
    tasks: number
    comments: number
  }
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'DONE' | 'BLOCKED'
  projectId: string
  project?: { id: string; name: string }
  requirementId?: string
  requirement?: { id: string; title: string }
  assigneeId?: string
  assignee?: User
  estimatedHours?: number
  actualHours?: number
  startDate?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  _count?: {
    comments: number
  }
}

export interface KanbanData {
  TODO: Task[]
  IN_PROGRESS: Task[]
  TESTING: Task[]
  DONE: Task[]
  BLOCKED: Task[]
}
