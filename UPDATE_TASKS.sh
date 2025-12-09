#!/bin/bash
# 任务页面完善脚本

cd "$(dirname "$0")"

echo "开始更新Tasks.vue..."

# 备份原文件
cp frontend/src/views/Tasks.vue frontend/src/views/Tasks_old_backup.vue

# 复制Requirements.vue作为基础
cp frontend/src/views/Requirements.vue frontend/src/views/Tasks.vue

# 执行替换
cd frontend/src/views

# 1. 基础替换
sed -i 's/需求管理/任务管理/g' Tasks.vue
sed -i 's/新建需求/新建任务/g' Tasks.vue
sed -i 's/添加子需求/添加子任务/g' Tasks.vue
sed -i 's/子需求/子任务/g' Tasks.vue
sed -i 's/需求标题/任务标题/g' Tasks.vue
sed -i 's/需求页面/任务页面/g' Tasks.vue
sed -i 's/需求列表/任务列表/g' Tasks.vue
sed -i 's/需求/任务/g' Tasks.vue

# 2. API导入替换
sed -i 's/getRequirements, createRequirement, updateRequirement, deleteRequirement/getTasks, createTask, updateTask, deleteTask/g' Tasks.vue
sed -i 's/from.*@\/api\/requirements/from '\''@\/api\/tasks'\''/g' Tasks.vue

# 3. 类型替换
sed -i 's/Requirement\[\]/Task[]/g' Tasks.vue
sed -i 's/Requirement>/Task>/g' Tasks.vue
sed -i 's/: Requirement/: Task/g' Tasks.vue
sed -i 's/<Requirement>/<Task>/g' Tasks.vue

# 4. 变量名替换
sed -i 's/requirements\.value/tasks.value/g' Tasks.vue
sed -i 's/const requirements/const tasks/g' Tasks.vue
sed -i 's/parentRequirement/parentTask/g' Tasks.vue

# 5. 函数名替换
sed -i 's/getRequirements/getTasks/g' Tasks.vue
sed -i 's/createRequirement/createTask/g' Tasks.vue
sed -i 's/updateRequirement/updateTask/g' Tasks.vue
sed -i 's/deleteRequirement/deleteTask/g' Tasks.vue
sed -i 's/buildProjectTree/buildRequirementTree/g' Tasks.vue

# 6. 状态值替换（需求的4个状态改为任务的5个状态）
sed -i 's/PENDING/TODO/g' Tasks.vue
sed -i 's/REJECTED/BLOCKED/g' Tasks.vue

echo "Tasks.vue更新完成！"
echo "请手动完成以下步骤："
echo "1. 打开 frontend/src/views/Tasks.vue"
echo "2. 在状态选项中添加 TESTING 状态"
echo "3. 在表单中添加 actualHours, startDate, dueDate 字段"
echo "4. 添加处理函数: handleActualHoursChange, handleStartDateChange, handleDueDateChange"
echo "5. 修改树形结构函数名和逻辑"
echo ""
echo "详细步骤请查看 TASKS_IMPLEMENTATION_GUIDE.md"
