<template>
  <div class="page-container">
    <!-- 管理员视图：完整的用户管理 -->
    <el-card v-if="authStore.isAdmin()">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新建用户
          </el-button>
        </div>
      </template>

      <el-table :data="users" v-loading="loading">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="200" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'">
              {{ row.role === 'ADMIN' ? '管理员' : '成员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="warning" size="small" @click="handleResetPassword(row)">
              重置密码
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
              :disabled="row.id === authStore.user?.id"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 创建/编辑对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑用户' : '新建用户'"
        width="500px"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="用户名" prop="username" v-if="!isEdit">
            <el-input v-model="form.username" />
          </el-form-item>
          <el-form-item label="密码" prop="password" v-if="!isEdit">
            <el-input v-model="form.password" type="password" show-password />
          </el-form-item>
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" style="width: 100%">
              <el-option label="管理员" value="ADMIN" />
              <el-option label="成员" value="MEMBER" />
            </el-select>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>
    </el-card>

    <!-- 非管理员视图：个人资料卡片 -->
    <el-card v-else>
      <template #header>
        <span>个人资料</span>
      </template>

      <div v-if="currentUser" class="user-profile">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">
            {{ currentUser.username }}
          </el-descriptions-item>
          <el-descriptions-item label="姓名">
            {{ currentUser.name }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ currentUser.email || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="currentUser.role === 'ADMIN' ? 'danger' : 'info'">
              {{ currentUser.role === 'ADMIN' ? '管理员' : '成员' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(currentUser.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px">
          <el-button type="primary" @click="showChangePasswordDialog">
            修改密码
          </el-button>
        </div>
      </div>

      <!-- 修改密码对话框 -->
      <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="100px"
        >
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              show-password
              placeholder="至少6个字符"
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              show-password
              placeholder="再次输入新密码"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleChangePassword">确定</el-button>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getUsers, updateUser, deleteUser, resetPassword } from '@/api/users'
import { register } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const users = ref<User[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const passwordDialogVisible = ref(false)
const passwordFormRef = ref<FormInstance>()

const form = reactive<any>({
  id: '',
  username: '',
  password: '',
  name: '',
  role: 'MEMBER'
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const passwordRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次密码输入不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 非管理员的当前用户信息
const currentUser = computed(() => {
  if (!authStore.isAdmin() && users.value.length > 0) {
    return users.value[0]
  }
  return null
})

const fetchUsers = async () => {
  loading.value = true
  try {
    users.value = await getUsers()
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    id: '',
    username: '',
    password: '',
    name: '',
    role: 'MEMBER'
  })
  dialogVisible.value = true
}

const handleEdit = (row: User) => {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    role: row.role
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (isEdit.value) {
        await updateUser(form.id, {
          name: form.name,
          role: form.role
        })
        ElMessage.success('用户更新成功')
      } else {
        await register({
          username: form.username,
          password: form.password,
          name: form.name
        })
        ElMessage.success('用户创建成功')
      }

      dialogVisible.value = false
      fetchUsers()
    } catch (error) {}
  })
}

const handleResetPassword = (row: User) => {
  ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.{6,}/,
    inputErrorMessage: '密码至少6个字符'
  }).then(async ({ value }) => {
    await resetPassword(row.id, value)
    ElMessage.success('密码重置成功')
  })
}

const handleDelete = (row: User) => {
  ElMessageBox.confirm('确定要删除此用户吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchUsers()
  })
}

const showChangePasswordDialog = () => {
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (!currentUser.value) return

      await resetPassword(currentUser.value.id, passwordForm.newPassword)
      ElMessage.success('密码修改成功')
      passwordDialogVisible.value = false
    } catch (error: any) {
      ElMessage.error(error.message || '密码修改失败')
    }
  })
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.page-container {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-profile {
  max-width: 600px;
}
</style>
