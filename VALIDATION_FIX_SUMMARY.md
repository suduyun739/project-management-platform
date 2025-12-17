# 表单校验优化总结

## 问题分析

1. **后端校验规则（基于 Zod Schema）**：
   - 项目：只有 `name` 必填，时间字段（startDate, endDate）都是 optional
   - 需求：`title`, `projectId`, `priority` 必填，时间字段和预估工时都是 optional
   - 任务：`title`, `projectId`, `priority` 必填，时间字段和预估工时都是 optional

2. **前端校验规则现状**：
   - Projects.vue: `name` 必填 ✓
   - Requirements.vue: `title`, `projectId`, `priority` 必填 ✓
   - Tasks.vue: `title`, `projectId`, `priority` 必填 ✓

3. **核心问题**：
   - 前端表单没有明确标注哪些是必填项（缺少 `*` 号）
   - 可选字段（如时间、工时）可能被提交为空字符串而非 undefined/null
   - 错误提示信息不够友好

## 优化方案

### 1. 添加必填项标识
- 在所有表单的必填字段 label 前添加红色 `*` 号
- 修改 `<el-form-item>` 的 `required` 属性为 true

### 2. 优化数据提交逻辑
- 在提交前清理空值：空字符串转换为 undefined
- 确保可选字段为空时不提交

### 3. 优化错误提示
- 统一错误提示格式
- 添加更友好的提示文本

## 需要修改的文件

1. `frontend/src/views/Projects.vue` - 项目表单
2. `frontend/src/views/Projects.vue` - 需求表单（在同一文件中）
3. `frontend/src/views/Tasks.vue` - 任务表单
