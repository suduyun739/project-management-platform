# 部署文档

本文档详细说明如何在腾讯云服务器（2核2G，Ubuntu）上部署项目管理平台。

## 服务器要求

- **配置**: 2核2G内存，50G存储
- **操作系统**: Ubuntu 20.04 或更高版本
- **软件**: Docker & Docker Compose

## 一、准备工作

### 1. 安装 Docker

```bash
# 更新软件包
sudo apt update
sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

### 2. 安装 Docker Compose

```bash
# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

## 二、部署应用

### 1. 上传代码到服务器

方式一：使用 Git
```bash
# 在服务器上克隆代码（如果使用 Git）
git clone <your-repo-url>
cd 项目管理平台
```

方式二：使用 SCP
```bash
# 在本地打包
tar -czf project-management.tar.gz 项目管理平台

# 上传到服务器
scp project-management.tar.gz ubuntu@your-server-ip:/home/ubuntu/

# 在服务器上解压
ssh ubuntu@your-server-ip
tar -xzf project-management.tar.gz
cd 项目管理平台
```

### 2. 配置环境变量

编辑 `docker-compose.yml`，修改以下配置：

```yaml
services:
  backend:
    environment:
      JWT_SECRET: "你的密钥-请修改为复杂字符串"  # 重要！务必修改

  postgres:
    environment:
      POSTGRES_PASSWORD: "你的数据库密码"  # 重要！务必修改
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 验证部署

访问 `http://your-server-ip` 应该能看到登录页面。

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

**重要：首次登录后请立即修改密码！**

## 三、防火墙配置

### Ubuntu UFW 防火墙

```bash
# 允许 HTTP 流量
sudo ufw allow 80/tcp

# 允许 HTTPS 流量（如果配置了 SSL）
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 腾讯云安全组

在腾讯云控制台配置安全组规则：

1. 登录腾讯云控制台
2. 进入云服务器 -> 安全组
3. 添加入站规则：
   - 协议：TCP
   - 端口：80
   - 来源：0.0.0.0/0

## 四、常用运维命令

### 查看服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（慎用！）
docker-compose down -v
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 或者分步执行
docker-compose down
docker-compose build
docker-compose up -d
```

### 数据库备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U pmuser project_management > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T postgres psql -U pmuser project_management < backup_20240101.sql
```

### 查看资源使用

```bash
# 查看 Docker 容器资源使用情况
docker stats

# 查看磁盘使用
df -h

# 清理未使用的 Docker 资源
docker system prune -a
```

## 五、性能优化

### 1. 数据库优化

编辑 `docker-compose.yml`，为 PostgreSQL 添加配置：

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=256MB
    -c effective_cache_size=512MB
    -c max_connections=50
```

### 2. 应用优化

对于 2核2G 服务器，建议：

- 限制 Node.js 内存使用：在 backend Dockerfile 中添加
  ```dockerfile
  ENV NODE_OPTIONS="--max-old-space-size=512"
  ```

- 定期清理 Docker 资源
  ```bash
  # 添加到 crontab 每周执行
  0 2 * * 0 docker system prune -af
  ```

## 六、HTTPS 配置（可选）

### 使用 Nginx + Let's Encrypt

1. 安装 Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

2. 申请 SSL 证书
```bash
sudo certbot --nginx -d your-domain.com
```

3. 配置自动续期
```bash
sudo certbot renew --dry-run
```

## 七、监控告警（可选）

### 使用 Portainer 管理容器

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 \
  --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

访问 `http://your-server-ip:9000` 配置 Portainer。

## 八、故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
```

### 数据库连接失败

```bash
# 检查数据库容器状态
docker-compose ps postgres

# 进入数据库容器
docker-compose exec postgres psql -U pmuser -d project_management

# 查看数据库日志
docker-compose logs postgres
```

### 前端无法访问后端

检查 Nginx 配置和容器网络：
```bash
# 进入前端容器
docker-compose exec frontend sh

# 测试后端连接
wget -O- http://backend:3000/health
```

## 九、安全建议

1. **修改默认密码**: 首次登录后立即修改 admin 密码
2. **修改数据库密码**: 在 docker-compose.yml 中修改
3. **修改 JWT 密钥**: 在 docker-compose.yml 中修改
4. **启用防火墙**: 只开放必要端口
5. **定期备份**: 设置自动备份脚本
6. **定期更新**: 保持系统和 Docker 镜像更新
7. **使用 HTTPS**: 为生产环境配置 SSL 证书

## 十、技术支持

如遇到问题，请检查：

1. Docker 和 Docker Compose 版本
2. 服务器资源使用情况（内存、磁盘）
3. 防火墙和安全组配置
4. 容器日志输出

更多信息请查看项目 README.md 文档。
