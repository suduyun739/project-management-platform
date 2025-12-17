#!/bin/bash

# 数据库恢复脚本
# 用于从备份文件恢复 PostgreSQL 数据库

set -e

# 配置变量
CONTAINER_NAME="pm_postgres"
DB_NAME="project_management"
DB_USER="pmuser"
BACKUP_DIR="./backups"

# 检查是否提供了备份文件参数
if [ -z "$1" ]; then
    echo "用法: $0 <备份文件>"
    echo ""
    echo "可用的备份文件:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "暂无备份文件"
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "✗ 错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "  数据库恢复警告"
echo "=========================================="
echo "即将从以下备份恢复数据库："
echo "  备份文件: $BACKUP_FILE"
echo "  目标数据库: $DB_NAME"
echo ""
echo "⚠️  警告：此操作将覆盖现有数据库中的所有数据！"
echo ""
read -p "确认要继续吗？(输入 yes 继续): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "开始恢复数据库..."
echo "恢复时间: $(date)"

# 解压备份文件（如果是压缩的）
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "解压备份文件..."
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# 执行恢复
echo "正在恢复数据库..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$RESTORE_FILE"

# 检查恢复是否成功
if [ $? -eq 0 ]; then
    echo "✓ 数据库恢复成功！"
else
    echo "✗ 数据库恢复失败！"
    # 清理临时文件
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    exit 1
fi

# 清理临时文件
if [ -n "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
    echo "✓ 已清理临时文件"
fi

echo ""
echo "恢复完成！建议重启应用容器："
echo "  docker-compose restart backend"
