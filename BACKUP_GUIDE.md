# 数据库备份与恢复指南

本指南详细说明如何使用项目的数据库备份和恢复功能。

## 功能概述

- ✅ **自动备份**：每天凌晨2点自动备份数据库
- ✅ **手动备份**：随时执行备份操作
- ✅ **一键恢复**：从备份文件快速恢复数据库
- ✅ **自动清理**：自动删除30天前的旧备份
- ✅ **数据迁移**：支持跨服务器数据迁移

## 自动备份

### 启动备份服务

备份服务已集成在 Docker Compose 配置中，启动项目时会自动启动：

```bash
# 启动所有服务（包括备份服务）
docker-compose up -d

# 或重新构建并启动
docker-compose up -d --build
```

### 查看备份状态

```bash
# 查看备份服务日志
docker logs pm_backup

# 实时查看日志
docker logs -f pm_backup

# 查看备份文件列表
ls -lh backups/
```

### 备份文件位置

- **存储路径**：`./backups/`
- **文件格式**：`backup_YYYYMMDD_HHMMSS.sql.gz`
- **示例**：`backup_20250117_020000.sql.gz`

### 备份时间配置

默认每天凌晨2点备份，如需修改时间：

1. 编辑 `scripts/crontab` 文件
2. 修改 cron 表达式（格式：分 时 日 月 周）
3. 重新构建并启动备份服务：

```bash
docker-compose up -d --build backup
```

**Cron 表达式示例：**
```bash
# 每天凌晨2点
0 2 * * *

# 每天凌晨3点
0 3 * * *

# 每天中午12点
0 12 * * *

# 每6小时一次
0 */6 * * *

# 每周日凌晨2点
0 2 * * 0
```

## 手动备份

### 执行手动备份

```bash
# 确保在项目根目录
cd /path/to/project-management-platform

# 执行备份脚本
bash scripts/backup.sh
```

### 备份脚本功能

- 自动连接 Docker 容器中的 PostgreSQL 数据库
- 导出完整的数据库结构和数据
- 自动压缩备份文件（节省空间）
- 自动清理超过30天的旧备份
- 显示备份进度和结果

### 修改备份保留期

编辑 `scripts/backup.sh`，修改 `KEEP_DAYS` 变量：

```bash
KEEP_DAYS=30  # 保留最近30天的备份
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
# 执行恢复脚本（会要求确认）
bash scripts/restore.sh backups/backup_20250117_020000.sql.gz
```

**恢复流程：**

1. 脚本会显示警告信息
2. 要求输入 `yes` 确认恢复
3. 自动解压备份文件（如果是 .gz 格式）
4. 执行数据库恢复
5. 清理临时文件
6. 提示重启后端服务

### 恢复后重启服务

```bash
# 重启后端服务，使更改生效
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
# 例如：backup_20250117_140000.sql.gz
```

**新服务器操作：**

```bash
# 1. 克隆项目并启动服务
git clone https://github.com/suduyun739/project-management-platform.git
cd project-management-platform
docker-compose up -d

# 2. 创建 backups 目录
mkdir -p backups

# 3. 从旧服务器复制备份文件
# 方法1：使用 scp
scp user@oldserver:/path/to/project/backups/backup_*.sql.gz ./backups/

# 方法2：使用 rsync
rsync -avz user@oldserver:/path/to/project/backups/ ./backups/

# 4. 恢复数据库
bash scripts/restore.sh backups/backup_20250117_140000.sql.gz

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
cp backups/backup_20250101_020000.sql.gz /archive/database/2025/

# 也可以添加到 NAS 或云存储
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
总空间 = 单个备份大小 × 30天

例如：
- 单个备份 2MB → 需要 60MB 存储
- 单个备份 10MB → 需要 300MB 存储
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
# 1. 检查备份容器状态
docker ps | grep pm_backup

# 2. 查看 cron 日志
docker logs pm_backup

# 3. 进入容器检查 crontab 配置
docker exec pm_backup crontab -l

# 4. 检查时区设置
docker exec pm_backup date
```

## 最佳实践

### 1. 定期测试恢复

建议每月测试一次恢复流程，确保备份文件可用：

```bash
# 在测试环境验证备份
bash scripts/restore.sh backups/latest_backup.sql.gz
```

### 2. 多重备份策略

- **本地备份**：Docker 自动备份到 `./backups/`
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

设置告警监控：

```bash
# 检查今天是否有备份文件
if [ ! -f "backups/backup_$(date +%Y%m%d)_*.sql.gz" ]; then
    echo "警告：今天的备份文件不存在！"
    # 发送告警通知
fi
```

### 5. 备份文件命名规范

备份文件自动使用时间戳命名，便于识别：

```
backup_20250117_020000.sql.gz
       ^^^^^^^^ ^^^^^^
       日期     时间
       YYYYMMDD HHMMSS
```

## 安全建议

1. **备份文件加密**（可选）：
   ```bash
   # 加密备份文件
   gpg -c backups/backup_*.sql.gz

   # 解密
   gpg -d backups/backup_*.sql.gz.gpg > backup.sql.gz
   ```

2. **限制访问权限**：
   ```bash
   # 限制备份目录权限
   chmod 700 backups/
   chmod 600 backups/*.sql.gz
   ```

3. **异地存储**：
   - 将备份文件同步到其他服务器
   - 使用云存储服务
   - 定期下载到本地安全位置

4. **敏感数据处理**：
   - 生产环境备份不要随意分享
   - 测试环境恢复前考虑数据脱敏

## 技术细节

### 备份包含的内容

- 所有数据表结构（CREATE TABLE）
- 所有数据记录（INSERT）
- 索引定义
- 约束条件
- 序列（Sequences）

### 不包含的内容

- PostgreSQL 系统配置
- 用户和权限（这些在容器中管理）
- 其他数据库（仅备份 project_management 数据库）

### 备份格式

使用 `pg_dump` 生成纯文本 SQL 格式：

- 优点：可读性好，易于检查和编辑
- 缺点：体积较大（已通过 gzip 压缩）
- 压缩率：通常可达到 70-90%

## 相关文档

- [部署指南](DEPLOYMENT.md) - 项目部署说明
- [README.md](README.md) - 项目总览
- [API文档](API_DOCS.md) - API接口说明

## 技术支持

如遇到问题，请：

1. 查看本文档的故障排查章节
2. 检查 Docker 容器日志
3. 提交 Issue 到项目仓库

---

**最后更新**: 2025-01-17
