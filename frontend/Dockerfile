FROM node:18-alpine as builder

# 配置 Alpine 国内镜像源（使用清华源，更稳定）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk update

WORKDIR /app

# 配置 npm 国内镜像源和网络参数
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 5

COPY package*.json ./
RUN npm install --loglevel=info

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# 生产环境使用 nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
