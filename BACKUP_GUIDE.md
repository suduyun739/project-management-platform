# 数据库备份与恢复指南

本指南详细说明如何使用项目的数据库备份和恢复功能。

## 功能概述

- ✅ **手动备份**：随时执行备份操作
- ✅ **自动备份**：可选的定时备份（每7天一次）
- ✅ **一键恢复**：从备份文件快速恢复数据库
- ✅ **自动清理**：自动删除30天前的旧备份
- ✅ **数据迁移**：支持跨服务器数据迁移

## 手动备份

### 执行备份

```bash
# 进入项目目录
cd /path/to/project-management-platform

# 执行备份脚本
bash scripts/backup.sh
```

### 备份输出示例

```
======================================
开始备份数据库
======================================
备份时间: 2025-01-17 14:30:00
备份文件: /path/to/backups/backup_20250117_143000.sql.gz

正在导出数据库...
✓ 数据库导出成功
正在压缩备份文件...
✓ 备份文件已压缩: backup_20250117_143000.sql.gz
✓ 文件大小: 2.3M

清理旧备份文件（保留 30 天）...
  无需清理

当前备份文件列表:
======================================
backup_20250117_143000.sql.gz (2.3M)
backup_20250110_020000.sql.gz (2.1M)

✓ 备份完成！
======================================
```

### 备份文件

- **存储位置**：`./backups/`
- **文件格式**：`backup_YYYYMMDD_HHMMSS.sql.gz`
- **示例**：`backup_20250117_143000.sql.gz`

## 自动定时备份

### 设置定时备份

仅需执行一次：

```bash
# 设置定时任务
bash scripts/setup-backup-cron.sh
```

### 设置输出示例

```
设置定时备份任务...
项目目录: /path/to/project-management-platform
✓ 定时备份任务设置成功！

备份计划：
  频率: 每7天（每周日凌晨2点）
  备份脚本: /path/to/project-management-platform/scripts/backup.sh
  日志文件: /path/to/project-management-platform/backups/backup.log

查看当前定时任务：
  crontab -l

删除定时任务：
  crontab -e  # 然后删除包含 'project-management' 的行
```

### 查看定时任务

```bash
# 查看当前的 crontab
crontab -l

# 输出示例：
# 项目管理平台数据库备份 - 每周日凌晨2点执行
0 2 * * 0 cd /path/to/project && bash scripts/backup.sh >> backups/backup.log 2>&1
```

### 查看备份日志

```bash
# 查看备份日志
cat backups/backup.log

# 或实时查看
tail -f backups/backup.log
```

### 修改备份频率

如需修改备份频率，编辑 crontab：

```bash
# 编辑 crontab
crontab -e

# 修改 cron 表达式
# 格式：分 时 日 月 周
```

**常用 cron 表达式**：

```bash
# 每周日凌晨2点（每7天）
0 2 * * 0

# 每天凌晨2点
0 2 * * *

# 每3天凌晨2点
0 2 */3 * *

# 每月1号凌晨2点
0 2 1 * *
```

### 取消定时备份

```bash
# 编辑 crontab
crontab -e

# 删除包含 'project-management' 的行，保存退出
```

## 数据库恢复

### 查看可用备份

```bash
# 列出所有备份文件
ls -lh backups/

# 查看最新的3个备份
ls -lt backups/ | head -n 4
```

### 从备份恢复

```bash
# 执行恢复脚本
bash scripts/restore.sh backups/backup_20250117_143000.sql.gz
```

### 恢复流程

1. 脚本显示警告信息
2. 要求输入 `yes` 确认恢复
3. 自动解压备份文件
4. 执行数据库恢复
5. 清理临时文件
6. 提示重启后端服务

### 恢复后重启服务

```bash
# 重启后端服务
docker-compose restart backend

# 或重启所有服务
docker-compose restart
```

## 数据迁移

### 场景1：服务器迁移

**旧服务器操作：**

```bash
# 1. 执行备份
cd /path/to/project
bash scripts/backup.sh

# 2. 记录备份文件名
ls -lh backups/
# 例如：backup_20250117_143000.sql.gz
```

**新服务器操作：**

```bash
# 1. 克隆项目并启动服务
git clone <your-repo-url>
cd project-management-platform
docker-compose up -d postgres backend frontend

# 2. 创建 backups 目录
mkdir -p backups

# 3. 从旧服务器复制备份文件
scp user@oldserver:/path/to/backups/backup_*.sql.gz ./backups/

# 4. 恢复数据库
bash scripts/restore.sh backups/backup_20250117_143000.sql.gz

# 5. 重启服务
docker-compose restart backend
```

### 场景2：开发/测试环境同步

```bash
# 在生产环境备份
cd /production/project
bash scripts/backup.sh

# 复制到开发环境
scp backups/backup_*.sql.gz dev@devserver:/dev/project/backups/

# 在开发环境恢复
cd /dev/project
bash scripts/restore.sh backups/backup_*.sql.gz
docker-compose restart backend
```

### 场景3：定期归档

```bash
# 创建长期归档目录
mkdir -p /archive/database/2025

# 复制重要备份到归档目录
cp backups/backup_20250101_*.sql.gz /archive/database/2025/

# 或上传到云存储（示例：使用 rclone）
rclone copy backups/ remote:database-backups/
```

## 备份文件管理

### 备份文件大小

压缩后的备份文件大小取决于数据量：

- 小型项目（< 1000条记录）：< 1 MB
- 中型项目（1000-10000条记录）：1-10 MB
- 大型项目（> 10000条记录）：> 10 MB

### 存储空间计算

保留30天备份的存储空间：

```
手动备份：取决于备份频率
自动备份（每7天）：约 5 个备份文件

例如：
- 单个备份 2MB，每7天备份 → 需要约 10MB 存储
- 单个备份 10MB，每7天备份 → 需要约 50MB 存储
```

### 手动清理备份

```bash
# 删除30天前的备份（与自动清理相同）
find backups/ -name "backup_*.sql.gz" -type f -mtime +30 -delete

# 删除60天前的备份
find backups/ -name "backup_*.sql.gz" -type f -mtime +60 -delete

# 只保留最新5个备份
ls -t backups/backup_*.sql.gz | tail -n +6 | xargs rm -f
```

## 故障排查

### 备份失败

**问题**：备份脚本执行失败

**检查步骤：**

```bash
# 1. 检查 PostgreSQL 容器是否运行
docker ps | grep pm_postgres

# 2. 检查数据库连接
docker exec pm_postgres pg_isready -U pmuser -d project_management

# 3. 检查备份目录权限
ls -ld backups/

# 4. 手动执行备份命令测试
docker exec -t pm_postgres pg_dump -U pmuser -d project_management > test.sql
```

### 恢复失败

**问题**：恢复时报错

**检查步骤：**

```bash
# 1. 检查备份文件是否完整
gunzip -t backups/backup_*.sql.gz

# 2. 检查数据库是否可访问
docker exec pm_postgres psql -U pmuser -d project_management -c "SELECT 1;"

# 3. 查看详细错误信息
bash -x scripts/restore.sh backups/backup_*.sql.gz
```

### 定时任务未执行

**问题**：自动备份没有运行

**检查步骤：**

```bash
# 1. 检查 crontab 是否设置
crontab -l | grep backup

# 2. 检查 cron 服务是否运行
systemctl status cron  # Ubuntu/Debian
systemctl status crond # CentOS/RHEL

# 3. 检查备份日志
cat backups/backup.log

# 4. 手动执行测试
bash scripts/backup.sh
```

## 最佳实践

### 1. 定期测试恢复

建议每月测试一次恢复流程：

```bash
# 在测试环境验证备份
bash scripts/restore.sh backups/latest_backup.sql.gz
```

### 2. 多重备份策略

- **本地备份**：自动备份到 `./backups/`
- **远程备份**：定期同步到其他服务器
- **云备份**：上传到云存储（AWS S3、阿里云OSS等）

### 3. 重要操作前手动备份

在执行重要操作前创建备份：

```bash
# 数据库迁移前
bash scripts/backup.sh

# 重大更新前
bash scripts/backup.sh

# 批量删除数据前
bash scripts/backup.sh
```

### 4. 监控备份状态

可以添加简单的监控脚本：

```bash
#!/bin/bash
# check-backup.sh

BACKUP_DIR="/path/to/backups"
DAYS=7

# 检查最近7天是否有备份
RECENT_BACKUP=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime -$DAYS | wc -l)

if [ "$RECENT_BACKUP" -eq 0 ]; then
    echo "警告：最近 $DAYS 天没有备份文件！"
    # 发送告警（邮件、钉钉、企业微信等）
fi
```

### 5. 异地存储

使用 `rsync` 或 `rclone` 定期同步备份文件：

```bash
# 使用 rsync 同步到其他服务器
rsync -avz backups/ user@backup-server:/backup/project-management/

# 使用 rclone 同步到云存储
rclone copy backups/ remote:database-backups/ --log-file=backups/rclone.log
```

## 安全建议

### 1. 备份文件加密（可选）

```bash
# 加密备份文件
gpg -c backups/backup_*.sql.gz

# 解密
gpg -d backups/backup_*.sql.gz.gpg > backup.sql.gz
```

### 2. 限制访问权限

```bash
# 限制备份目录权限
chmod 700 backups/
chmod 600 backups/*.sql.gz
```

### 3. 敏感数据处理

- 生产环境备份不要随意分享
- 测试环境恢复前考虑数据脱敏
- 定期审查备份文件的访问权限

## 快速参考

### 常用命令

```bash
# 手动备份
bash scripts/backup.sh

# 设置定时备份
bash scripts/setup-backup-cron.sh

# 查看备份文件
ls -lh backups/

# 恢复数据库
bash scripts/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz

# 查看定时任务
crontab -l

# 查看备份日志
cat backups/backup.log
```

### 备份文件格式

```
backup_YYYYMMDD_HHMMSS.sql.gz
       ^^^^^^^^ ^^^^^^
       日期     时间
```

示例：`backup_20250117_143000.sql.gz` = 2025年1月17日 14:30:00

## 相关文档

- [README.md](README.md) - 项目总览
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [UPDATE_INSTRUCTIONS.md](UPDATE_INSTRUCTIONS.md) - 更新指南

## 技术支持

如遇到问题，请：

1. 查看本文档的故障排查章节
2. 检查备份日志文件
3. 提交 Issue 到项目仓库

---

**最后更新**: 2025-01-17
