FROM node:18-alpine

# 配置 Alpine 国内镜像源（使用清华源，更稳定）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk update

# 安装必要的构建工具和 OpenSSL（Prisma 需要）
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

# 配置 npm 国内镜像源和网络参数
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 5

# 复制 package.json
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
# 使用 --loglevel=info 可以看到安装进度
RUN npm install --loglevel=info

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 删除 devDependencies 但保留 prisma 和 tsx
RUN npm prune --production && npm install prisma tsx

# 暴露端口
EXPOSE 3000

# 启动脚本
CMD ["sh", "-c", "npx prisma migrate deploy && (npm run prisma:seed || echo 'Seed skipped') && npm start"]
