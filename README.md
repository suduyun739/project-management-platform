# 项目管理平台

轻量级项目管理工具，适合小型团队使用。

## 功能特性

- ✅ 用户认证和权限管理（管理员/普通成员）
- ✅ 项目管理
- ✅ 需求管理
- ✅ 任务管理
- ✅ 看板视图
- ✅ 强大的筛选功能
- ✅ 数据权限隔离

## 技术栈

- **前端**: Vue 3 + Element Plus + Pinia
- **后端**: Node.js + Express + Prisma
- **数据库**: PostgreSQL
- **部署**: Docker Compose

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动后端服务（端口 3000）
npm run dev:backend

# 启动前端服务（端口 5173）
npm run dev:frontend
```

### 生产部署

```bash
# 使用 Docker Compose 部署
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问地址：http://your-server-ip:80

默认管理员账号：
- 用户名: admin
- 密码: admin123

**首次登录后请立即修改密码！**

## 服务器要求

- 2核2G内存（最低配置）
- 50G 存储空间
- Ubuntu 20.04+
- Docker & Docker Compose

## 目录结构

```
.
├── backend/          # 后端服务
├── frontend/         # 前端应用
├── docker-compose.yml
└── README.md
```

## 使用说明

详细使用文档请查看 [使用指南](./USAGE.md)
