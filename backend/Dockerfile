FROM node:18-alpine

WORKDIR /app

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

# 删除 devDependencies，减小镜像体积
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 启动脚本
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
