#!/bin/bash

# 数据库备份脚本
# 用于备份 PostgreSQL 数据库
# 可以手动执行或通过 cron 定时执行

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 配置变量
CONTAINER_NAME="pm_postgres"
DB_NAME="project_management"
DB_USER="pmuser"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.sql"
KEEP_DAYS=30  # 保留最近30天的备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "======================================"
echo "开始备份数据库"
echo "======================================"
echo "备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "备份文件: $BACKUP_FILE.gz"
echo ""

# 检查 Docker 容器是否运行
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✗ 错误: 数据库容器 $CONTAINER_NAME 未运行"
    exit 1
fi

# 执行备份
echo "正在导出数据库..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$BACKUP_FILE" 2>/dev/null

# 检查备份是否成功
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    echo "✓ 数据库导出成功"

    # 压缩备份文件
    echo "正在压缩备份文件..."
    gzip "$BACKUP_FILE"

    if [ -f "${BACKUP_FILE}.gz" ]; then
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        echo "✓ 备份文件已压缩: ${BACKUP_FILE}.gz"
        echo "✓ 文件大小: $BACKUP_SIZE"
    else
        echo "✗ 压缩失败"
        exit 1
    fi

    # 删除超过保留期限的旧备份
    echo ""
    echo "清理旧备份文件（保留 ${KEEP_DAYS} 天）..."
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$KEEP_DAYS)

    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read file; do
            rm -f "$file"
            echo "  已删除: $(basename $file)"
        done
    else
        echo "  无需清理"
    fi

    # 显示当前备份列表
    echo ""
    echo "当前备份文件列表:"
    echo "======================================"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'  || echo "暂无备份文件"

    echo ""
    echo "✓ 备份完成！"
    echo "======================================"
else
    echo "✗ 备份失败！"
    exit 1
fi
