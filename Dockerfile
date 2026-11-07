# 备用构建方式：帽子云创建应用时若把「构建类型」选成 Dockerfile，就会用这个文件。
# 默认推荐仍然选 Buildpack（平台读到 package.json 会自动识别为 Node.js 项目）。
# 两种方式启动的进程完全相同：node server.js，监听 0.0.0.0:3000。
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
