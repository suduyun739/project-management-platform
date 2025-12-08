# 部署指南 - 项目管理平台更新

## 快速部署步骤

### 1. 上传代码到服务器

将整个项目文件夹上传到服务器,或使用 Git 拉取最新代码:

```bash
# 方式一: 如果使用 Git
cd /path/to/project
git pull origin main

# 方式二: 如果是本地上传
# 使用 scp, sftp 或其他工具上传整个项目文件夹到服务器
```

### 2. 停止现有服务

```bash
cd /path/to/项目管理平台
docker compose down
```

### 3. 重新构建镜像

由于代码有更新,需要重新构建 Docker 镜像:

```bash
# 清理旧镜像并重新构建 (推荐)
docker compose build --no-cache

# 或快速构建 (如果确定依赖没变化)
docker compose build
```

### 4. 启动服务

```bash
docker compose up -d
```

### 5. 验证部署

#### 5.1 检查容器状态

```bash
docker compose ps
```

应该看到 3 个容器都在运行:
- `postgres` - 数据库
- `backend` - 后端服务
- `frontend` - 前端服务

#### 5.2 查看日志

```bash
# 查看后端日志,确认数据库迁移成功
docker compose logs backend

# 应该看到类似输出:
# ✅ Prisma Migrate applied successfully
# ✅ 项目管理平台 - 后端服务已启动
```

```bash
# 查看前端日志
docker compose logs frontend
```

#### 5.3 测试访问

打开浏览器访问: `http://您的服务器IP:8080`

登录后测试:
1. ✅ 项目页面左侧显示项目侧边栏
2. ✅ 创建需求/任务时,描述、负责人等非必填项可以留空
3. ✅ 工时输入显示"天"而不是"h"
4. ✅ 可以输入 0.5、1、1.5 等天数

## 数据库迁移说明

### 自动迁移

本次更新会自动执行数据库迁移,添加两个新字段:
- `requirements.parentId` - 支持子需求
- `tasks.parentId` - 支持子任务

迁移文件位置:
```
backend/prisma/migrations/20240102000000_add_parent_child_relationships/migration.sql
```

### 迁移验证

如果需要手动验证迁移是否成功:

```bash
# 进入数据库容器
docker compose exec postgres psql -U pmuser -d project_management

# 检查新字段
\d requirements
\d tasks

# 应该能看到 parentId 字段
```

## 回滚方案

如果部署后发现问题,可以快速回滚:

### 方式一: 回滚代码

```bash
# 如果使用 Git
git reset --hard <上一个commit的hash>
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 方式二: 回滚数据库

```bash
# 连接数据库
docker compose exec postgres psql -U pmuser -d project_management

# 删除新字段 (谨慎操作!)
ALTER TABLE requirements DROP COLUMN IF EXISTS "parentId";
ALTER TABLE tasks DROP COLUMN IF EXISTS "parentId";
```

## 常见问题

### Q1: 容器启动失败

**查看具体错误**:
```bash
docker compose logs backend
docker compose logs frontend
```

**常见原因**:
- 端口被占用 → 检查 8080 和 5432 端口
- 内存不足 → 检查服务器内存: `free -h`
- 镜像构建失败 → 重新构建: `docker compose build --no-cache`

### Q2: 数据库迁移失败

**症状**: 后端日志显示 Prisma 迁移错误

**解决**:
```bash
# 手动执行迁移
docker compose exec backend npx prisma migrate deploy

# 查看迁移状态
docker compose exec backend npx prisma migrate status
```

### Q3: 前端页面空白或报错

**可能原因**:
- 后端服务未启动
- CORS 配置问题
- 浏览器缓存

**解决**:
```bash
# 重启前端服务
docker compose restart frontend

# 清理浏览器缓存后重新访问
# Ctrl + Shift + R (Chrome/Firefox 强制刷新)
```

### Q4: 项目侧边栏不显示

**可能原因**: 前端代码未更新或组件加载失败

**解决**:
```bash
# 确保前端镜像重新构建
docker compose build frontend --no-cache
docker compose up -d frontend

# 检查浏览器控制台是否有 JavaScript 错误
```

## 性能优化建议

### 1. 数据库索引

如果项目、需求、任务数量增长后性能下降,可以添加索引:

```sql
-- 为 parentId 字段添加索引,提升查询性能
CREATE INDEX IF NOT EXISTS idx_requirements_parent
ON requirements(parentId);

CREATE INDEX IF NOT EXISTS idx_tasks_parent
ON tasks(parentId);
```

### 2. Docker 资源限制

如果服务器资源有限,可以在 `docker-compose.yml` 中限制资源:

```yaml
services:
  backend:
    # ...
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 监控建议

### 查看服务状态

```bash
# 实时监控容器资源使用
docker stats

# 查看最近日志
docker compose logs --tail=100 -f

# 只看错误日志
docker compose logs backend | grep -i error
```

### 定期健康检查

```bash
# 检查后端健康
curl http://localhost:3000/health

# 检查前端访问
curl http://localhost:8080
```

## 备份建议

在重大更新前,建议备份数据库:

```bash
# 备份数据库
docker compose exec postgres pg_dump -U pmuser project_management > backup_$(date +%Y%m%d).sql

# 恢复数据库 (如需要)
docker compose exec -T postgres psql -U pmuser project_management < backup_20240102.sql
```

## 联系支持

如果遇到无法解决的问题:
1. 收集日志: `docker compose logs > logs.txt`
2. 记录错误信息和复现步骤
3. 提供服务器环境信息: `docker version` 和 `docker compose version`
