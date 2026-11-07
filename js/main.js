import {initIcons} from './icons.js';
import {initAssets,assets} from './assets.js';
import {save} from './save.js';
import {Game} from './game.js';
save.load();initAssets();initIcons();document.documentElement.style.setProperty('--panel-texture',`url(${assets.panel.toDataURL()})`);
export const game=new Game(document.querySelector('#game'));
// 只提供只读诊断，不暴露存档修改接口。
window.obsidianDiagnostics=()=>({state:game.state,fps:Math.round(game.fps),enemies:game.enemies.count,bullets:game.bullets.count,particles:game.fx.pool.count,dpr:game.pixelRatio,time:game.time});
// Android's Activity calls these two handlers on the local origin only.
window.obsidianLifecycle = hidden => game.setNativeHidden(hidden);
window.obsidianBack = () => {
  if(game.claiming){game.closeUpgrades();return 'handled';}
  const back = document.querySelector('#overlay #back');
  if (back) { back.click(); return 'handled'; }
  if (game.state === 'playing') { game.pause(); return 'handled'; }
  if (game.state === 'paused') { game.resume(); return 'handled'; }
  if (game.state === 'ended') { game.ui.menu(); return 'handled'; }
  return game.state === 'upgrade' ? 'run-exit' : 'exit';
};

document.addEventListener('contextmenu',e=>{if(!(e.target instanceof HTMLTextAreaElement))e.preventDefault();});
document.addEventListener('touchmove',e=>{if(!e.target.closest?.('#overlay'))e.preventDefault();},{passive:false});
const status=document.querySelector('#offline');
// Capacitor从APK内置资源加载，无需SW；避免旧缓存覆盖已安装版本。
if(location.hostname==='appassets.androidplatform.net'||window.Capacitor?.isNativePlatform?.()){status.textContent='APK · 本地资源已就绪';}
else if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').then(async()=>{await navigator.serviceWorker.ready;status.textContent='OFFLINE READY · 全部资源已缓存';}).catch(()=>{status.textContent='离线缓存失败 · 请通过 localhost 或 HTTPS 重试';});}
else status.textContent='请通过 localhost / HTTPS 启动，以启用离线缓存';
