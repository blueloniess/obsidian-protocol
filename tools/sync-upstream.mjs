#!/usr/bin/env node
/**
 * 把官方发布的源码包（Obsidian-Protocol-x.y.z-Source.zip）同步到本部署仓库。
 *
 * 本仓库 = 官方游戏源码 + 一层「Web 部署补丁」，这个脚本负责在升级版本时
 * 只覆盖官方文件、保留部署文件，并自动重新打上补丁（幂等，可反复运行）：
 *
 *   node tools/sync-upstream.mjs "D:\path\Obsidian-Protocol-4.8.0-Source.zip"
 *
 * 保留（不被官方包覆盖、也不会被清理）的部署文件：
 *   server.js、Procfile、Dockerfile、DEPLOY.md、package-lock.json、.gitignore、
 *   tools/sync-upstream.mjs、icons/apple-touch-icon.png
 *   （180x180 iOS 主屏幕图标；官方包图标没变时可复用，变了需要重新生成）
 *
 * 自动合并 / 补丁：
 *   package.json  —— 版本号取自官方包，补上 start/dev/sync 脚本与 engines
 *   index.html    —— 插入 iOS 独立应用 meta 与 apple-touch-icon 引用
 *   sw.js         —— 把 apple-touch-icon 加入 Service Worker 预缓存列表
 *   README.md     —— 顶部插入 Web 部署说明
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.join('tools', 'sync-upstream.mjs');
const PRESERVE = new Set([
  '.gitignore',
  'DEPLOY.md',
  'Dockerfile',
  'Procfile',
  'package-lock.json',
  'server.js',
  SELF,
  path.join('icons', 'apple-touch-icon.png'),
]);
const APPLE_ICON_LINK = '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">';
const APPLE_META = '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="黑曜防线"><meta name="format-detection" content="telephone=no,email=no,address=no">';
const README_NOTE = '> **Web 部署**：本仓库根目录即网站根目录，`server.js` 是零依赖静态服务（同时监听 `0.0.0.0:80` 和 `:3000`，兼容帽子云内部域名与自定义域名端口），可直接用帽子云等平台的 Buildpack 自动识别（`package.json`）部署。完整步骤见 [DEPLOY.md](./DEPLOY.md)。本地运行：`npm start`。';

function fail(message) {
  console.error(`[sync] 失败：${message}`);
  process.exit(1);
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, base, out);
    } else {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

function patchIndexHtml() {
  const file = path.join(REPO, 'index.html');
  let html = readFileSync(file, 'utf8');
  if (html.includes('apple-touch-icon')) return false;
  html = html.replace('<title>', `${APPLE_META}<title>`).replace('<link rel="manifest"', `${APPLE_ICON_LINK}<link rel="manifest"`);
  writeFileSync(file, html);
  return true;
}

function patchServiceWorker() {
  const file = path.join(REPO, 'sw.js');
  let source = readFileSync(file, 'utf8');
  if (source.includes('apple-touch-icon.png')) return false;
  if (!source.includes("'./icons/icon-512.png'")) fail('sw.js 里找不到预期的 icon-512 预缓存项');
  source = source.replace("'./icons/icon-512.png'", "'./icons/icon-512.png','./icons/apple-touch-icon.png'");
  writeFileSync(file, source);
  return true;
}

function patchReadme() {
  const file = path.join(REPO, 'README.md');
  let readme = readFileSync(file, 'utf8');
  if (readme.includes('Web 部署')) return false;
  const newline = readme.indexOf('\n');
  readme = newline === -1
    ? `${readme}\n\n${README_NOTE}\n`
    : `${readme.slice(0, newline)}\n\n${README_NOTE}${readme.slice(newline)}`;
  writeFileSync(file, readme);
  return true;
}

function mergePackageJson(sourcePackage) {
  const pkg = JSON.parse(readFileSync(sourcePackage, 'utf8'));
  const merged = {
    name: 'obsidian-protocol-web',
    version: pkg.version,
    private: true,
    description: '黑曜防线 · Obsidian Protocol — 离线 HTML5 肉鸽射击游戏的 Web 部署仓库（零依赖 Node 静态服务，适配 Buildpack 自动识别）',
    type: pkg.type ?? 'module',
    engines: { node: '>=18.0.0' },
    scripts: {
      start: 'node server.js',
      dev: 'node server.js',
      ...pkg.scripts,
      'sync:upstream': 'node tools/sync-upstream.mjs',
    },
  };
  writeFileSync(path.join(REPO, 'package.json'), `${JSON.stringify(merged, null, 2)}\n`);
  return merged;
}

const zipArgument = process.argv[2];
if (!zipArgument) fail('用法: node tools/sync-upstream.mjs <Obsidian-Protocol-x.y.z-Source.zip>');
const zipPath = path.resolve(zipArgument);
if (!existsSync(zipPath)) fail(`源码包不存在：${zipPath}`);

const tempDir = path.join(os.tmpdir(), `obsidian-sync-${Date.now()}`);
mkdirSync(tempDir, { recursive: true });

try {
  // Windows 自带的 Expand-Archive 处理 zip 最稳；Linux/macOS 用 unzip。
  if (process.platform === 'win32') {
    const escapedZip = zipPath.replace(/'/g, "''");
    const escapedTemp = tempDir.replace(/'/g, "''");
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedTemp}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-q', zipPath, '-d', tempDir], { stdio: 'inherit' });
  }

  // 官方包有时把文件放在顶层，有时套一层 obsidian-protocol/ 目录。
  let sourceDir = tempDir;
  if (!existsSync(path.join(sourceDir, 'package.json'))) {
    const candidates = readdirSync(sourceDir)
      .map((name) => path.join(sourceDir, name))
      .filter((candidate) => statSync(candidate).isDirectory() && existsSync(path.join(candidate, 'package.json')));
    if (candidates.length !== 1) fail('解压后找不到唯一的源码根目录（package.json 所在目录）');
    sourceDir = candidates[0];
  }

  const sourceFiles = walk(sourceDir);
  const sourceSet = new Set(sourceFiles.map((file) => file.split(path.sep).join('/')));
  const previousVersion = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;

  // 1) 覆盖官方文件（部署文件除外）
  let copied = 0;
  for (const relative of sourceFiles) {
    if (PRESERVE.has(relative)) continue;
    const target = path.join(REPO, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(sourceDir, relative), target);
    copied += 1;
  }

  // 2) 删除官方包已不存在的旧文件（部署文件除外）
  const removed = [];
  for (const relative of walk(REPO)) {
    if (PRESERVE.has(relative) || relative.startsWith('.sync')) continue;
    if (!sourceSet.has(relative.split(path.sep).join('/'))) {
      rmSync(path.join(REPO, relative), { force: true });
      removed.push(relative);
    }
  }

  // 3) 合并 package.json + 重新打补丁
  const mergedPackage = mergePackageJson(path.join(sourceDir, 'package.json'));
  const patched = {
    'index.html': patchIndexHtml(),
    'sw.js': patchServiceWorker(),
    'README.md': patchReadme(),
  };

  // 4) 自检
  const swSource = readFileSync(path.join(REPO, 'sw.js'), 'utf8');
  const cacheMatch = swSource.match(/CACHE='([^']+)'/);
  const appleIcon = path.join(REPO, 'icons', 'apple-touch-icon.png');
  if (!cacheMatch) fail('sw.js 里没有 CACHE 版本号');
  if (!swSource.includes('apple-touch-icon.png')) fail('sw.js 补丁失败');
  if (!existsSync(appleIcon)) fail('缺少 icons/apple-touch-icon.png，请从旧版本保留或用 Pillow 重新生成');
  console.log(`[sync] 版本：${previousVersion} → ${mergedPackage.version}（SW 缓存 ${cacheMatch[1]}）`);
  console.log(`[sync] 覆盖官方文件 ${copied} 个，删除旧文件 ${removed.length} 个${removed.length ? `：${removed.join(', ')}` : ''}`);
  for (const [file, changed] of Object.entries(patched)) console.log(`[sync] 补丁 ${file}: ${changed ? '已应用' : '已存在，跳过'}`);
  console.log(`[sync] apple-touch-icon 校验：${createHash('sha256').update(readFileSync(appleIcon)).digest('hex').slice(0, 12)}…（${statSync(appleIcon).size} 字节）`);
  console.log('[sync] 完成。下一步：npm install --package-lock-only && npm test && git add -A && git commit && git push');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
