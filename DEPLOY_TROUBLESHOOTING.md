# 部署问题排查指南

## 问题1: Docker build 卡在 npm install

### 症状
运行 `docker compose build` 时，构建卡在 `RUN npm install` 步骤，长时间无响应。

### 已采取的优化措施

我已经在 Dockerfile 中添加了以下npm网络配置：

```dockerfile
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 5
```

**配置说明**:
- `fetch-retry-mintimeout`: 最小重试超时 20秒
- `fetch-retry-maxtimeout`: 最大重试超时 120秒
- `fetch-timeout`: 总超时时间 5分钟
- `maxsockets`: 限制并发连接数为5（避免服务器资源耗尽）

### 解决方案

#### 方案1: 清理缓存重新构建（推荐首先尝试）

```bash
# 1. 停止所有容器
docker compose down

# 2. 清理 Docker 构建缓存
docker builder prune -af

# 3. 清理悬空镜像
docker image prune -af

# 4. 重新构建（使用 --no-cache 和 --progress=plain 查看详细进度）
docker compose build --no-cache --progress=plain

# 5. 启动
docker compose up -d
```

**优点**: `--progress=plain` 会显示完整的构建日志，你能看到npm install的实时输出，不会误以为卡住了。

#### 方案2: 分步构建（如果方案1仍然卡住）

如果整体构建仍然有问题，可以分别构建后端和前端：

```bash
# 先只构建后端
docker compose build --no-cache --progress=plain backend

# 如果后端成功，再构建前端
docker compose build --no-cache --progress=plain frontend

# 全部成功后启动
docker compose up -d
```

#### 方案3: 增加构建超时和内存限制

如果你的服务器内存紧张（2GB），可以设置内存限制：

在 `docker-compose.yml` 中添加构建参数：

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # 添加资源限制
    mem_limit: 1g
    memswap_limit: 1g
```

但是**不推荐**添加太严格的限制，因为npm install需要一定内存。

#### 方案4: 手动进入容器检查（诊断用）

如果仍然无法确定问题，可以手动运行一个临时容器来测试npm install：

```bash
# 使用相同的基础镜像启动临时容器
docker run -it --rm node:18-alpine sh

# 在容器内手动执行构建步骤
sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
apk add --no-cache python3 make g++ openssl openssl-dev
npm config set registry https://registry.npmmirror.com
npm config set fetch-timeout 300000

# 创建工作目录并测试安装
mkdir /test && cd /test
# 手动创建 package.json 并测试 npm install
```

### 监控构建进度

使用 `--progress=plain` 参数后，你应该能看到类似这样的输出：

```
#8 [backend 5/10] RUN npm install --loglevel=info
#8 0.521 npm info using npm@10.2.4
#8 0.523 npm info using node@v18.19.0
#8 1.234 npm http fetch GET 200 https://registry.npmmirror.com/@prisma/client
#8 2.145 npm http fetch GET 200 https://registry.npmmirror.com/express
...
```

如果看到这样的输出，说明npm正在正常工作，只是需要等待。

### 预期构建时间

使用国内镜像源后：
- **后端构建**: 约 3-5 分钟（首次构建，包含依赖下载）
- **前端构建**: 约 5-8 分钟（首次构建，Element Plus等依赖较大）
- **后续构建**: 如果package.json没变，Docker会使用缓存层，约1-2分钟

### 常见错误信息

1. **ETIMEDOUT** - 网络超时
   - 解决：重新运行构建，npm会自动重试

2. **ECONNRESET** - 连接重置
   - 解决：检查服务器网络，可能需要等待后重试

3. **Memory exhausted** - 内存不足
   - 解决：临时关闭其他服务释放内存，或者使用swap

### 如果上述方案都不行

最后的备选方案 - 本地构建镜像并推送：

1. 在本地（网络好的环境）构建镜像
2. 推送到Docker Hub或阿里云容器镜像服务
3. 在服务器上直接拉取镜像

但这个方案较复杂，通常不需要。

---

## 问题2: 数据库连接失败

### 检查数据库是否启动

```bash
docker compose ps
docker compose logs postgres
```

### 检查健康检查状态

```bash
docker compose exec postgres pg_isready -U pmuser -d project_management
```

### 手动连接测试

```bash
docker compose exec postgres psql -U pmuser -d project_management
```

---

## 问题3: 前端无法访问后端API

### 检查网络连通性

```bash
# 进入前端容器
docker compose exec frontend sh

# 测试能否访问后端
wget -O- http://backend:3000/api/health || echo "无法访问"
```

### 检查后端日志

```bash
docker compose logs backend --tail=100 -f
```

---

## 完整部署检查清单

- [ ] Git代码已拉取最新版本
- [ ] Docker和Docker Compose已安装
- [ ] 清理了旧的容器和镜像 (`docker compose down`, `docker builder prune -af`)
- [ ] 使用 `--progress=plain` 查看构建进度
- [ ] 后端构建成功
- [ ] 前端构建成功
- [ ] 数据库启动并健康 (healthy)
- [ ] 数据库迁移执行成功 (`docker compose exec backend npx prisma migrate deploy`)
- [ ] 可以通过 http://服务器IP 访问前端
- [ ] 可以成功登录系统（admin/admin123）

---

**创建时间**: 2024-01-02
**最后更新**: 2024-01-02
