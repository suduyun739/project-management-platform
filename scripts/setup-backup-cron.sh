#!/bin/bash

# 设置定时备份任务
# 每7天执行一次备份（每周日凌晨2点）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "设置定时备份任务..."
echo "项目目录: $PROJECT_DIR"

# 检查 crontab 是否已安装
if ! command -v crontab &> /dev/null; then
    echo "错误: crontab 未安装"
    echo "请先安装 cron："
    echo "  Ubuntu/Debian: sudo apt-get install cron"
    echo "  CentOS/RHEL: sudo yum install cronie"
    exit 1
fi

# 创建临时 crontab 文件
TEMP_CRON=$(mktemp)

# 获取当前用户的 crontab（如果存在）
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# 检查是否已存在备份任务
if grep -q "project-management.*backup.sh" "$TEMP_CRON"; then
    echo "检测到已存在的备份任务，将更新..."
    # 删除旧的备份任务
    sed -i '/project-management.*backup.sh/d' "$TEMP_CRON"
fi

# 添加新的备份任务（每周日凌晨2点）
echo "# 项目管理平台数据库备份 - 每周日凌晨2点执行" >> "$TEMP_CRON"
echo "0 2 * * 0 cd $PROJECT_DIR && bash scripts/backup.sh >> backups/backup.log 2>&1" >> "$TEMP_CRON"

# 安装新的 crontab
crontab "$TEMP_CRON"

# 清理临时文件
rm -f "$TEMP_CRON"

echo "✓ 定时备份任务设置成功！"
echo ""
echo "备份计划："
echo "  频率: 每7天（每周日凌晨2点）"
echo "  备份脚本: $PROJECT_DIR/scripts/backup.sh"
echo "  日志文件: $PROJECT_DIR/backups/backup.log"
echo ""
echo "查看当前定时任务："
echo "  crontab -l"
echo ""
echo "删除定时任务："
echo "  crontab -e  # 然后删除包含 'project-management' 的行"
