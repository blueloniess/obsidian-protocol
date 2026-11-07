#!/usr/bin/env node
/**
 * 黑曜防线 · OBSIDIAN PROTOCOL — Web 静态站点服务
 *
 * 设计目标：让「无构建步骤」的 HTML5 游戏能直接用帽子云等平台的 Buildpack 部署。
 *   - 零第三方依赖：只用 Node.js 内置模块。Buildpack 即使只做了 `npm install`
 *     甚至完全跳过依赖安装，进程也能直接启动，不会因为网络/依赖失败而构建失败。
 *   - 监听 0.0.0.0：容器内必须绑定 0.0.0.0，绑定 127.0.0.1 时外部无法访问。
 *   - 端口：帽子云自动分配的 `<应用名>-xxxx.maozi.io` 内部域名固定转发到容器 80 端口，
 *     而自定义域名需要在域名绑定里显式填写端口（常见 3000/8080）。为两种方式都能直接访问，
 *     本服务同时监听 80 和 3000；平台若注入 PORT 也一并监听。单个端口不可用时只跳过该端口。
 *     日志会打印每个成功监听的地址，部署后在「日志」里核对即可。
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '0.0.0.0';
const preferredPort = Number.parseInt(process.env.PORT ?? '', 10);
const CANDIDATE_PORTS = [...new Set([preferredPort, 80, 3000])]
  .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);

const MIME_TYPES = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
}));

// 这些文件一旦被 CDN/浏览器长时间缓存，游戏更新后玩家会看到旧版本，所以必须回源。
const NO_CACHE_EXTENSIONS = new Set(['.html']);
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function sendText(res, status, body, extraHeaders = {}) {
  const buffer = Buffer.from(body, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    ...BASE_HEADERS,
    ...extraHeaders,
  });
  res.end(buffer);
}

function headersFor(filePath, size) {
  const extension = path.extname(filePath).toLowerCase();
  const isServiceWorker = path.basename(filePath) === 'sw.js';
  const cacheControl = isServiceWorker || NO_CACHE_EXTENSIONS.has(extension)
    ? 'no-cache'
    : 'public, max-age=3600';
  return {
    'Content-Type': MIME_TYPES.get(extension) ?? 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': cacheControl,
    ...BASE_HEADERS,
  };
}

async function handleRequest(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed\n', { Allow: 'GET, HEAD' });
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      sendText(res, 400, 'Bad Request\n');
      return;
    }
    // NUL 字节会让后续文件系统调用行为异常，直接拒绝。
    if (pathname.includes('\0')) {
      sendText(res, 400, 'Bad Request\n');
      return;
    }

    // 平台/负载均衡健康检查用。
    if (pathname === '/healthz') {
      sendText(res, 200, 'ok\n');
      return;
    }
    if (pathname === '/favicon.ico') {
      res.writeHead(204, { 'Cache-Control': 'public, max-age=3600', ...BASE_HEADERS });
      res.end();
      return;
    }

    const relative = path.posix.normalize(pathname).replace(/^\/+/, '');
    let filePath = path.resolve(ROOT, relative === '' || relative === '.' ? 'index.html' : relative);
    // 防路径穿越：解析后必须仍在站点目录内。
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      sendText(res, 403, 'Forbidden\n');
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }
    if (!info?.isFile()) {
      sendText(res, 404, 'Not Found\n');
      return;
    }

    res.writeHead(200, headersFor(filePath, info.size));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    console.error('[obsidian] request failed:', req.method, req.url, error);
    if (res.headersSent) {
      res.destroy();
    } else {
      sendText(res, 500, 'Internal Server Error\n');
    }
  }
}

const servers = [];
let listeningCount = 0;

for (const port of CANDIDATE_PORTS) {
  const server = http.createServer(handleRequest);
  servers.push(server);
  server.on('error', (error) => {
    console.warn(`[obsidian] 端口 ${port} 不可用（${error.code ?? error.message}），已跳过`);
  });
  server.on('listening', () => {
    listeningCount += 1;
    console.log(`[obsidian] 黑曜防线已启动：http://${HOST}:${port} （站点目录 ${ROOT}）`);
  });
  server.listen(port, HOST);
}

// 所有候选端口都被占用/无权限时退出，避免留下没有监听的僵尸进程。
setTimeout(() => {
  if (listeningCount === 0) {
    console.error('[obsidian] 没有任何端口监听成功，退出');
    process.exit(1);
  }
}, 3000);

// 平台缩容/重启会发送 SIGTERM，先停止接收新请求再退出。
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[obsidian] received ${signal}, shutting down`);
    let pending = servers.length;
    if (pending === 0) {
      process.exit(0);
    }
    for (const server of servers) {
      server.close(() => {
        pending -= 1;
        if (pending === 0) {
          process.exit(0);
        }
      });
    }
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
