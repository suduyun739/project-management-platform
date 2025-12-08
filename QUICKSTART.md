# 快速开始

快速在本地开发环境或服务器上启动项目管理平台。

## 本地开发环境

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- npm 或 yarn

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置数据库

```bash
# 创建数据库
createdb project_management

# 配置环境变量
cd backend
cp .env.example .env

# 编辑 .env 文件，修改数据库连接
# DATABASE_URL="postgresql://user:password@localhost:5432/project_management"
```

### 3. 初始化数据库

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 初始化种子数据
npx prisma db seed
```

### 4. 启动服务

在两个终端窗口中分别运行：

```bash
# 终端1：启动后端 (端口 3000)
cd backend
npm run dev

# 终端2：启动前端 (端口 5173)
cd frontend
npm run dev
```

### 5. 访问应用

打开浏览器访问: http://localhost:5173

默认账号:
- 用户名: admin
- 密码: admin123

## Docker 部署（推荐）

### 前置要求

- Docker
- Docker Compose

### 一键启动

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 访问应用

浏览器访问: http://localhost

默认账号:
- 用户名: admin
- 密码: admin123

### 停止服务

```bash
docker-compose down
```

## 服务器部署

详细部署文档请查看 [DEPLOY.md](./DEPLOY.md)

## 常见问题

### 数据库连接失败

检查 PostgreSQL 是否启动：
```bash
# Linux/Mac
sudo systemctl status postgresql

# 或使用 Docker
docker-compose ps postgres
```

### 端口被占用

检查端口占用情况：
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Linux/Mac
lsof -i :3000
lsof -i :5173
```

### Prisma 迁移失败

重置数据库：
```bash
cd backend
npx prisma migrate reset
```

## 下一步

- 阅读 [使用指南](./USAGE.md) 了解详细功能
- 查看 [部署文档](./DEPLOY.md) 进行生产部署
- 修改默认管理员密码

## 技术支持

遇到问题？检查：
1. Node.js 版本是否 >= 18
2. 数据库是否正常运行
3. 环境变量是否正确配置
4. 依赖是否完整安装

更多帮助请查看项目文档。
