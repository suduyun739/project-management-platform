#!/bin/bash

# 数据库备份脚本
# 用于备份 PostgreSQL 数据库

set -e

# 配置变量
CONTAINER_NAME="pm_postgres"
DB_NAME="project_management"
DB_USER="pmuser"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.sql"
KEEP_DAYS=30  # 保留最近30天的备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "开始备份数据库..."
echo "备份时间: $(date)"
echo "备份文件: $BACKUP_FILE"

# 执行备份
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "✓ 备份成功！"

    # 压缩备份文件
    gzip "$BACKUP_FILE"
    echo "✓ 备份文件已压缩: ${BACKUP_FILE}.gz"

    # 删除超过保留期限的旧备份
    echo "清理旧备份文件..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete
    echo "✓ 已删除 ${KEEP_DAYS} 天前的备份"

    # 显示当前备份列表
    echo ""
    echo "当前备份文件列表:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "暂无备份文件"
else
    echo "✗ 备份失败！"
    exit 1
fi
