# 项目管理平台

一个功能完善的项目管理系统，支持项目、需求、任务的全生命周期管理，具备完整的权限控制和数据隔离机制。

## 功能特性

### 核心功能

- **项目管理**：创建、编辑、删除项目，支持项目状态跟踪和排序
- **需求管理**：支持多级需求（父需求-子需求），完整的状态流转
- **任务管理**：任务创建、分配、跟踪，支持子任务和看板视图
- **看板视图**：拖拽式任务状态管理，直观的可视化展示
- **数据统计**：项目维度和个人维度的数据统计分析

### 权限与安全

- **双角色体系**：管理员和普通成员，权限分明
- **数据隔离**：普通成员只能查看和管理自己负责的内容
- **多负责人机制**：支持多人协同，所有负责人权限平等
- **JWT认证**：安全的token认证机制
- **密码加密**：使用bcrypt加密存储

### 用户体验

- **树形结构**：项目-需求-任务的层级展示
- **行内编辑**：快速修改状态、优先级等字段
- **智能筛选**：多维度组合筛选，快速定位目标
- **展开/折叠**：一键控制树形结构的显示层级
- **响应式设计**：适配各种屏幕尺寸

## 技术栈

### 前端

- Vue 3 + TypeScript
- Element Plus UI组件库
- Pinia 状态管理
- Vue Router 路由管理
- Axios HTTP客户端
- Vite 构建工具

### 后端

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL数据库
- JWT认证
- bcrypt密码加密
- Zod数据验证

### 部署

- Docker + Docker Compose
- Nginx（生产环境）
- PM2（进程管理）
- 自动数据库备份

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose（推荐）

### Docker Compose部署（推荐）

```bash
# 克隆项目
git clone https://github.com/suduyun739/project-management-platform.git
cd project-management-platform

# 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env 文件

# 启动所有服务
cd ..
docker-compose up -d

# 初始化数据库
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

服务将在以下端口启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 数据库：localhost:5432

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

**重要**：首次登录后请立即修改密码！

## 数据备份与恢复

系统集成了自动数据库备份功能，每天凌晨2点自动备份，保留最近30天的备份数据。

### 自动备份

备份服务已集成在 docker-compose.yml 中，启动服务后会自动运行：

```bash
# 备份文件存储位置
./backups/

# 查看备份日志
docker logs pm_backup

# 查看备份文件列表
ls -lh backups/
```

### 手动备份

```bash
# 进入项目目录
cd /path/to/project-management-platform

# 执行备份脚本
bash scripts/backup.sh

# 备份文件将保存在 ./backups/ 目录
# 格式：backup_YYYYMMDD_HHMMSS.sql.gz
```

### 恢复数据库

```bash
# 查看可用备份
ls -lh backups/

# 从备份恢复（需要确认）
bash scripts/restore.sh backups/backup_20250117_020000.sql.gz

# 恢复后重启后端服务
docker-compose restart backend
```

### 备份策略

- **自动备份时间**：每天凌晨 2:00
- **备份保留期**：30天
- **备份格式**：压缩的 SQL 文件（.sql.gz）
- **存储位置**：./backups/ 目录

### 数据迁移

备份文件可用于数据迁移：

```bash
# 1. 在旧服务器上备份
bash scripts/backup.sh

# 2. 复制备份文件到新服务器
scp backups/backup_*.sql.gz user@newserver:/path/to/project/backups/

# 3. 在新服务器上恢复
bash scripts/restore.sh backups/backup_*.sql.gz
```

## 文档

- [部署指南](DEPLOYMENT.md) - 详细的部署和更新说明
- [用户指南](USER_GUIDE.md) - 功能使用说明
- [技术架构](TECH_STACK.md) - 技术栈和架构设计
- [API文档](API_DOCS.md) - RESTful API接口文档

## 项目结构

```
project-management-platform/
├── frontend/           # Vue 3 前端项目
│   ├── public/        # 静态资源
│   ├── src/
│   │   ├── api/      # API接口
│   │   ├── components/ # 公共组件
│   │   ├── router/   # 路由配置
│   │   ├── stores/   # Pinia状态管理
│   │   ├── types/    # TypeScript类型
│   │   ├── utils/    # 工具函数
│   │   └── views/    # 页面组件
│   └── ...
├── backend/           # Node.js 后端项目
│   ├── prisma/       # 数据库模型和迁移
│   ├── src/
│   │   ├── middleware/ # 中间件
│   │   ├── routes/   # API路由
│   │   ├── types/    # TypeScript类型
│   │   └── utils/    # 工具函数
│   └── ...
├── scripts/           # 备份脚本
│   ├── backup.sh     # 数据库备份脚本
│   ├── restore.sh    # 数据库恢复脚本
│   └── crontab       # 定时任务配置
├── backups/          # 备份文件存储（自动创建）
├── docker-compose.yml # Docker编排配置
└── README.md         # 本文件
```

## 权限说明

### 管理员权限

✅ 查看所有数据
✅ 管理项目（创建、编辑、删除、排序）
✅ 管理需求（创建、编辑、删除）
✅ 管理任务（创建、编辑、删除）
✅ 管理用户（创建、编辑、删除、重置密码）
✅ 查看全局统计

### 普通用户权限

✅ 查看所有项目（只读）
✅ 查看自己负责的需求和任务
✅ 创建需求和任务（自动成为负责人）
✅ 编辑自己负责的需求和任务
✅ 查看个人统计数据
❌ 不能删除任何内容
❌ 不能编辑项目
❌ 不能管理其他用户

## 更新日志

### v1.1.0 (2025-01-17)

- ✅ 项目名称重名校验（创建和更新时）
- ✅ 自动数据库备份功能（每日凌晨2点）
- ✅ 手动备份和恢复脚本
- ✅ 备份数据保留策略（30天）
- ✅ 支持数据迁移

### v1.0.0 (2025-01-01)

- ✅ 完整的项目、需求、任务管理功能
- ✅ 权限控制和数据隔离
- ✅ 多负责人机制
- ✅ 看板视图
- ✅ 数据统计
- ✅ 用户管理
- ✅ Docker一键部署
- ✅ 完整的API文档

## 开发团队

由 Claude Code 辅助开发完成。

## 许可证

MIT License

## 技术支持

如有问题，请提交 Issue 到项目仓库。
