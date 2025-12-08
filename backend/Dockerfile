FROM node:18-alpine

# 配置 Alpine 国内镜像源（阿里云）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装必要的构建工具和 OpenSSL（Prisma 需要）
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

# 配置 npm 国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制 package.json
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm install

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
