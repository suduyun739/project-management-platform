import request from '@/utils/request'

export const createComment = (data: {
  content: string
  requirementId?: string
  taskId?: string
}) => {
  return request.post('/comments', data)
}

export const deleteComment = (id: string) => {
  return request.delete(`/comments/${id}`)
}
