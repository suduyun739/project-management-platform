# 快速部署指南

## ✅ 镜像源配置已完成

ZIP 包中的 Dockerfile 已经包含以下加速配置：

### 后端 Dockerfile
```dockerfile
# Alpine 镜像源 → 阿里云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# npm 镜像源 → npmmirror（淘宝镜像）
RUN npm config set registry https://registry.npmmirror.com

# 必要依赖（Prisma + bcrypt 编译）
RUN apk add --no-cache python3 make g++ openssl openssl-dev
```

### 前端 Dockerfile
```dockerfile
# Alpine 镜像源 → 阿里云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# npm 镜像源 → npmmirror
RUN npm config set registry https://registry.npmmirror.com
```

## 🚀 部署步骤（推荐）

### 方式一：正常构建（推荐，3-5分钟）

```bash
# 1. 解压 ZIP 包到服务器
cd /path/to/project

# 2. 停止旧容器
docker compose down

# 3. 构建镜像（使用缓存）
docker compose build

# 4. 启动服务
docker compose up -d

# 5. 查看日志
docker compose logs -f backend
```

**预计时间**: 3-5分钟（只下载 ECharts 等新依赖）

### 方式二：完全重建（8-15分钟）

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

**仅在遇到缓存问题时使用！**

### 方式三：分别构建（最灵活）

```bash
# 先构建后端
docker compose build backend
docker compose up -d backend

# 等待后端启动成功后，再构建前端
docker compose build frontend
docker compose up -d frontend
```

## 📊 构建时间对比

| 构建方式 | 无镜像源 | 有镜像源 |
|---------|---------|---------|
| 正常构建 | 10-20分钟 | **3-5分钟** ⚡ |
| 完全重建 | 20-30分钟 | **8-15分钟** ⚡ |
| 只构建前端 | 5-10分钟 | **1-3分钟** ⚡ |

## 🔍 验证部署成功

### 1. 检查容器状态
```bash
docker compose ps
```

应该看到 3 个容器都是 `Up` 状态：
- postgres
- backend
- frontend

### 2. 检查后端日志
```bash
docker compose logs backend | tail -20
```

应该看到：
```
✅ Prisma Migrate applied successfully
✅ 项目管理平台 - 后端服务已启动
```

### 3. 检查数据库迁移
```bash
docker compose exec backend npx prisma migrate status
```

应该显示所有迁移都已应用。

### 4. 访问测试
```bash
# 测试前端
curl http://localhost:8080

# 测试后端
curl http://localhost:3000/health
```

## 🎯 功能验证清单

登录后依次检查：

### 基础功能
- [ ] 能够成功登录
- [ ] 左侧菜单显示正常
- [ ] 面包屑导航显示正常

### 新功能
- [ ] 左侧菜单有"数据看板"（第一项）
- [ ] 点击"数据看板"能看到图表（饼图、柱状图、仪表盘）
- [ ] 项目页面左侧有项目列表侧边栏
- [ ] 项目侧边栏显示统计和进度条

### 优化功能
- [ ] 创建需求时，描述可以留空（不报错）
- [ ] 创建任务时，负责人可以留空（不报错）
- [ ] 工时显示单位是"天"而不是"h"
- [ ] 工时可以输入 0.5、1、1.5 等小数

### 数据看板交互
- [ ] 点击统计卡片能跳转
- [ ] 点击饼图扇区能跳转到对应状态的列表
- [ ] 筛选项目后图表自动更新
- [ ] 详细表格中的数字可以点击跳转

## ⚠️ 常见问题排查

### Q1: 后端容器一直重启

**检查**:
```bash
docker compose logs backend
```

**可能原因**:
- 数据库连接失败 → 检查 postgres 容器是否启动
- Prisma 缺少 OpenSSL → 已在 Dockerfile 中添加

**解决**:
```bash
# 重建后端
docker compose build backend --no-cache
docker compose up -d backend
```

### Q2: 前端白屏或 404

**检查**:
```bash
docker compose logs frontend
```

**可能原因**:
- 前端构建失败
- ECharts 依赖缺失

**解决**:
```bash
# 重建前端
docker compose build frontend --no-cache
docker compose restart frontend
```

### Q3: 数据看板图表不显示

**检查浏览器控制台**，可能看到：
- `echarts is not defined` → ECharts 未加载
- `Cannot read property of undefined` → 数据格式问题

**解决**:
```bash
# 清除浏览器缓存后刷新
Ctrl + Shift + R (强制刷新)

# 如果还不行，重建前端
docker compose build frontend --no-cache
docker compose restart frontend
```

### Q4: 数据库字段不存在错误

**错误示例**:
```
column "parentId" does not exist
```

**原因**: 数据库迁移未执行

**解决**:
```bash
# 手动执行迁移
docker compose exec backend npx prisma migrate deploy

# 验证迁移状态
docker compose exec backend npx prisma migrate status

# 检查字段是否存在
docker compose exec postgres psql -U pmuser -d project_management -c "\d requirements"
```

### Q5: 构建速度还是很慢

**可能原因**:
1. 服务器网络问题
2. Docker 缓存未生效
3. 镜像源配置未生效

**排查**:
```bash
# 检查 npm 镜像源是否生效
docker compose run --rm backend npm config get registry
# 应该输出: https://registry.npmmirror.com

# 如果不是，说明镜像源配置未生效，需要重新构建
docker compose build --no-cache
```

## 🔄 更新流程

当代码更新后：

```bash
# 1. 停止服务
docker compose down

# 2. 拉取最新代码（Git）或下载新 ZIP
git pull origin master
# 或解压新的 ZIP 包

# 3. 正常构建（推荐）
docker compose build

# 4. 启动服务
docker compose up -d

# 5. 验证
docker compose logs -f backend
```

## 📝 部署后的首次设置

### 1. 创建管理员账号

如果是全新部署，后端会自动创建一个管理员账号：
- 用户名: `admin`
- 密码: `admin123`

**⚠️ 首次登录后请立即修改密码！**

### 2. 创建测试数据

登录后建议：
1. 创建 2-3 个测试项目
2. 在每个项目下创建几个需求
3. 为需求创建几个任务
4. 访问数据看板查看效果

### 3. 邀请团队成员

在"用户管理"页面创建团队成员账号。

## 🎉 部署完成

如果所有检查都通过，恭喜您部署成功！

**访问地址**: `http://服务器IP:8080`

**功能亮点**:
- 🎨 全新数据可视化看板
- 📊 多种图表展示（饼图、柱状图、仪表盘）
- 🔍 智能筛选和数据联动
- 👆 图表可点击跳转详情
- 📁 项目侧边栏快速导航
- ⚡ 表单验证优化
- 📅 工时单位改为天

## 📚 相关文档

- [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - 功能优化总结
- [DASHBOARD_UPDATE.md](DASHBOARD_UPDATE.md) - 数据看板详细说明
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 详细部署指南

## 🆘 需要帮助？

如果遇到问题：
1. 查看对应的错误日志
2. 参考上面的"常见问题排查"
3. 检查 GitHub Issues
4. 提供详细的错误信息和日志

---

**最后更新**: 2024-01-02
**版本**: v2.0 - 数据可视化版本
