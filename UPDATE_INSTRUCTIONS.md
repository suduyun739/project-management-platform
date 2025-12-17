# 服务器更新指南

本次更新包含以下新功能：

## 更新内容

### 1. 项目重名校验
- 创建项目时自动检查名称是否已存在
- 更新项目时检查新名称是否与其他项目重复
- 自动显示友好的错误提示

### 2. 数据库自动备份系统
- 每天凌晨2点自动备份数据库
- 自动压缩备份文件节省空间
- 自动清理30天前的旧备份
- 支持手动备份和恢复
- 支持数据迁移

## 服务器更新步骤

### 步骤1：备份当前数据（重要！）

```bash
# 进入项目目录
cd /path/to/project-management-platform

# 手动备份当前数据库（使用旧的备份方式）
docker exec pm_postgres pg_dump -U pmuser -d project_management > manual_backup_before_update.sql

# 压缩备份文件
gzip manual_backup_before_update.sql
```

### 步骤2：拉取最新代码

```bash
# 拉取最新代码
git pull origin master
```

你应该看到以下文件更新：
- `backend/src/routes/projects.ts` - 项目重名校验
- `docker-compose.yml` - 新增备份服务
- `scripts/backup.sh` - 备份脚本
- `scripts/restore.sh` - 恢复脚本
- `scripts/Dockerfile.backup` - 备份服务镜像
- `scripts/crontab` - 定时任务配置
- `README.md` - 更新说明
- `BACKUP_GUIDE.md` - 备份指南

### 步骤3：停止当前服务

```bash
# 停止所有容器
docker-compose down
```

**注意**：`down` 命令会停止并删除容器，但不会删除数据卷，你的数据是安全的。

### 步骤4：重新构建并启动服务

```bash
# 重新构建镜像（包括新的备份服务）
docker-compose build

# 启动所有服务
docker-compose up -d
```

### 步骤5：验证服务状态

```bash
# 检查所有容器是否正常运行
docker-compose ps

# 你应该看到4个容器都是 Up 状态：
# - pm_postgres  (数据库)
# - pm_backend   (后端)
# - pm_frontend  (前端)
# - pm_backup    (新增的备份服务)

# 查看备份服务日志
docker logs pm_backup

# 检查后端日志
docker logs pm_backend
```

### 步骤6：测试新功能

#### 测试项目重名校验

1. 访问管理界面
2. 尝试创建一个与现有项目同名的项目
3. 应该看到错误提示："项目名称已存在，请使用其他名称"

#### 测试备份功能

```bash
# 执行手动备份测试
bash scripts/backup.sh

# 检查备份文件
ls -lh backups/

# 你应该看到新创建的备份文件
# 格式：backup_YYYYMMDD_HHMMSS.sql.gz
```

## 备份功能说明

### 自动备份
- **备份时间**：每天凌晨2点
- **备份位置**：`./backups/` 目录
- **备份格式**：`backup_YYYYMMDD_HHMMSS.sql.gz`
- **保留期限**：30天（自动删除旧备份）

### 查看备份
```bash
# 查看所有备份文件
ls -lh backups/

# 查看备份服务日志
docker logs pm_backup

# 实时查看备份日志
docker logs -f pm_backup
```

### 手动备份
```bash
# 随时执行手动备份
bash scripts/backup.sh
```

### 从备份恢复
```bash
# 查看可用备份
ls -lh backups/

# 恢复数据库（需要输入 yes 确认）
bash scripts/restore.sh backups/backup_20250117_020000.sql.gz

# 恢复后重启后端
docker-compose restart backend
```

## 存储空间建议

备份文件会占用一定的磁盘空间：

- **小型项目** (< 1000条记录)：每个备份约 < 1MB，30天约占用 30MB
- **中型项目** (1000-10000条记录)：每个备份约 1-10MB，30天约占用 300MB
- **大型项目** (> 10000条记录)：每个备份约 > 10MB，30天约占用 > 300MB

建议定期检查磁盘空间：

```bash
# 查看磁盘使用情况
df -h

# 查看备份目录大小
du -sh backups/
```

## 故障排查

### 问题1：备份容器无法启动

```bash
# 查看错误日志
docker logs pm_backup

# 常见原因：
# - Docker socket 挂载权限问题
# - crontab 文件格式问题（需要 Unix 格式）

# 解决方案：重新构建
docker-compose build backup
docker-compose up -d backup
```

### 问题2：备份文件未生成

```bash
# 检查备份服务是否运行
docker ps | grep pm_backup

# 检查 cron 是否运行
docker exec pm_backup ps aux | grep crond

# 手动执行备份测试
docker exec pm_backup /app/scripts/backup.sh
```

### 问题3：项目重名校验不生效

```bash
# 检查后端日志
docker logs pm_backend

# 重启后端服务
docker-compose restart backend
```

## 回滚方案

如果更新后出现问题，可以回滚到之前的版本：

```bash
# 停止服务
docker-compose down

# 回滚代码到上一个版本
git reset --hard 7859b81  # 替换为之前的 commit ID

# 重新启动服务（不构建备份服务）
docker-compose up -d postgres backend frontend

# 如果需要恢复数据
gunzip -c manual_backup_before_update.sql.gz | docker exec -i pm_postgres psql -U pmuser -d project_management
```

## 后续维护

### 监控备份状态

建议设置定期检查：

```bash
# 添加到 crontab（每天上午10点检查）
0 10 * * * [ ! -f "/path/to/project/backups/backup_$(date +\%Y\%m\%d)_*.sql.gz" ] && echo "警告：今天的备份文件不存在！" | mail -s "备份检查警告" your@email.com
```

### 异地备份（可选但推荐）

```bash
# 使用 rsync 同步到其他服务器
rsync -avz backups/ user@backup-server:/backup/project-management/

# 或使用 rclone 同步到云存储
rclone copy backups/ remote:database-backups/
```

### 定期测试恢复

建议每月在测试环境验证一次备份恢复流程。

## 更多文档

- [BACKUP_GUIDE.md](BACKUP_GUIDE.md) - 详细的备份使用指南
- [README.md](README.md) - 项目总览
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南

## 联系支持

如有问题，请提交 Issue 或联系开发团队。

---

**更新版本**: v1.1.0
**更新日期**: 2025-01-17
