# 部署指南

## 环境要求

- Docker 和 Docker Compose
- Node.js 18+ (本地开发)
- PostgreSQL 14+ (或使用 Docker)

## 快速部署（推荐）

### 1. 克隆项目

```bash
git clone https://github.com/suduyun739/project-management-platform.git
cd project-management-platform
```

### 2. 配置环境变量

创建后端环境变量文件：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：

```env
DATABASE_URL="postgresql://postgres:password@db:5432/project_management"
JWT_SECRET="your-secret-key-here"
PORT=3000
```

### 3. 使用 Docker Compose 一键部署

返回项目根目录：

```bash
cd ..
docker-compose up -d
```

等待构建完成后，服务将在以下端口启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 数据库：localhost:5432

### 4. 初始化数据

首次部署需要运行数据库迁移和种子数据：

```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

### 5. 默认管理员账号

- 用户名：`admin`
- 密码：`admin123`

**重要：首次登录后请立即修改密码！**

## 手动部署

### 后端部署

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
npm start
```

### 前端部署

```bash
cd frontend
npm install
npm run build
```

将 `dist` 目录部署到 Nginx 或其他静态服务器。

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 更新部署

### Docker Compose 方式

```bash
git pull
docker-compose down
docker-compose up -d --build
docker-compose exec backend npx prisma migrate deploy
```

### 手动方式

```bash
# 后端
cd backend
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart backend

# 前端
cd ../frontend
npm install
npm run build
# 复制 dist 到服务器
```

## 故障排除

### 数据库连接失败

检查 `DATABASE_URL` 配置是否正确，确保数据库服务已启动：

```bash
docker-compose ps
docker-compose logs db
```

### 后端启动失败

查看后端日志：

```bash
docker-compose logs backend
```

### 前端无法连接后端

检查前端的 API 基础路径配置（`frontend/src/config.ts`）是否正确。

### 端口冲突

如果默认端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  frontend:
    ports:
      - "8080:5173"  # 修改为其他端口
  backend:
    ports:
      - "8000:3000"  # 修改为其他端口
```

## 生产环境建议

1. **使用 HTTPS**：配置 SSL 证书（推荐使用 Let's Encrypt）
2. **修改默认密码**：更改管理员默认密码
3. **配置备份**：定期备份数据库
4. **日志监控**：配置日志收集和监控
5. **性能优化**：根据实际负载调整数据库连接池大小

## 备份与恢复

### 备份数据库

```bash
docker-compose exec db pg_dump -U postgres project_management > backup.sql
```

### 恢复数据库

```bash
docker-compose exec -T db psql -U postgres project_management < backup.sql
```

## 监控和日志

### 查看服务状态

```bash
docker-compose ps
```

### 查看实时日志

```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务

```bash
docker-compose restart backend
docker-compose restart frontend
```
