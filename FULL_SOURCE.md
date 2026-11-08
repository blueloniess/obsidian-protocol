# 4.7完整源代码

## index.html
```
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#080916"><meta name="mobile-web-app-capable" content="yes"><meta name="description" content="黑曜防线：暗黑霓虹废土肉鸽射击，完全离线。"><title>黑曜防线 · OBSIDIAN</title><link rel="manifest" href="./manifest.json"><link rel="icon" href="./icons/icon-192.png"><link rel="stylesheet" href="./css/style.css"></head>
<body><main id="viewport"><div id="stage"><canvas id="game" width="720" height="1280" aria-label="黑曜防线游戏画面"></canvas><div id="hud"></div><div id="overlay"></div><div id="toast" role="status"></div><div id="offline" role="status">正在准备本地协议…</div></div></main><script type="module" src="./js/main.js"></script></body></html>

```

## manifest.json
```
{
 "id":"./", "name":"黑曜防线 · Obsidian Protocol", "short_name":"黑曜防线",
 "description":"暗黑霓虹废土肉鸽射击，单机离线生存。", "lang":"zh-CN", "start_url":"./", "scope":"./",
 "display":"standalone", "orientation":"portrait", "theme_color":"#080916", "background_color":"#080916",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]
}

```

## sw.js
```
const CACHE='obsidian-protocol-android-v4-7';
const RESOURCES=['./','./index.html','./manifest.json','./css/style.css','./icons/icon-192.png','./icons/icon-512.png','./js/config.js','./js/challenge.js','./js/utils.js','./js/assets.js','./js/save.js','./js/progression.js','./js/audio.js','./js/particles.js','./js/runway.js','./js/entities.js','./js/upgrades.js','./js/modes.js','./js/ui.js','./js/game.js','./js/icons.js','./js/shop.js','./js/combat.js','./js/loot.js','./js/main.js'];
// 原子预缓存：任意资源失败则安装失败，不宣称离线就绪。更新版本号使新缓存完整替代旧版。
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(RESOURCES.map(path => new Request(new URL(path, self.registration.scope), {cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('obsidian-protocol-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(u.origin!==self.location.origin){event.respondWith(new Response('External requests disabled',{status:403}));return;}event.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(event.request,{ignoreSearch:true});if(hit)return hit;if(event.request.mode==='navigate')return await c.match('./index.html');return new Response('Resource not packaged',{status:404});})());});

```

## package.json
```
{
  "name": "obsidian-protocol",
  "version": "4.7.0",
  "private": true,
  "type": "module",
  "scripts": {
    "prepare:apk": "node tools/prepare-apk.mjs",
    "test": "node tests/revision44.mjs && node tests/revision45.mjs && node tests/revision46.mjs && node tests/revision47.mjs && node tests/benchmark47.mjs"
  }
}

```

## capacitor.config.json
```
{
  "appId": "com.obsidian.protocol",
  "appName": "黑曜防线",
  "webDir": "www",
  "backgroundColor": "#080916",
  "android": {
    "backgroundColor": "#080916",
    "allowMixedContent": false
  }
}
```

## js/armory.js
```
import {BALANCE as B} from './config.js';
export function weapon(p){let result=B.weapons[0];for(const w of B.weapons)if(p.weaponPoints>=w.points)result=w;return result;}
/** 所有队员共用当前枪械，一人一份真实弹丸，不再以大整数弹丸代表无限人数。 */
export function gunStats(p){const w=weapon(p);return {...w,damage:w.damage*p.damage,rate:Math.max(B.minFireInterval,w.rate*p.rate),pellets:w.pellets+(p.shots-1),pierce:w.pierce+p.pierce};}
export function firepower(p){const w=gunStats(p);return w.damage/w.rate*w.pellets*Number(p.squad);}
export function weaponResult(p,gate){let value=BigInt(Math.floor(p.weaponPoints)),n=BigInt(gate.value),scale=BigInt(gate.scale??1);value=gate.kind==='multiply'?value*n/scale:gate.kind==='divide'?value*scale/(n>0n?n:1n):value+n;return Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number(value)));}
export function nextWeapon(p){return B.weapons.find(w=>w.points>p.weaponPoints);}

```

## js/assets.js
```
import {PALETTE as P} from './config.js';
import {canvas} from './utils.js';
export const assets={sprites:{},glows:{},white:{},sparks:{}};
const colors={player:P.player,trooper:P.player,normal:P.normal,fast:P.fast,tank:P.tank,bomber:P.bomber,boss:P.boss,bullet:P.bullet,gem:P.player,particle:P.white,hostile:P.boss,drone:P.blue};
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();}
function shape(c,key){
  c.lineWidth=2;c.fillStyle=P.panel;c.strokeStyle=colors[key];
  if(key==='player'){polygon(c,[[-22,20],[-13,-12],[0,-32],[13,-12],[22,20],[8,13],[0,22],[-8,13]]);c.fillStyle=P.player;polygon(c,[[-5,-13],[0,-22],[5,-13],[0,5]]);c.fillRect(14,-28,6,28);c.fillRect(-17,16,8,8);}
  else if(key==='trooper'){
    // 从上方看去的头盔、肩甲、枪管和双靴。每名队员都有自己的枪口。
    c.fillStyle=P.bg; c.fillRect(-11,7,7,12); c.fillRect(4,7,7,12);
    polygon(c,[[-15,-6],[-9,-13],[9,-13],[15,-6],[10,11],[-10,11]]);
    c.fillStyle=P.uniform; c.fillRect(-16,-8,7,9); c.fillRect(9,-8,7,9);
    c.fillStyle=P.helmet; polygon(c,[[-8,-14],[-5,-19],[6,-19],[10,-12],[7,-3],[-6,-3]]);
    c.fillStyle=P.bg; c.fillRect(-6,-14,12,4);c.fillStyle=P.blue;c.fillRect(-8,0,16,11);c.fillStyle=P.gold;c.fillRect(-7,-19,14,3);c.fillStyle=P.uniform;c.fillRect(-8,0,16,10);c.fillStyle=P.blue;c.fillRect(-8,0,5,8);c.fillStyle=P.gold;c.fillRect(-6,-19,12,3);
    c.fillStyle=P.roadLine; c.fillRect(12,-29,4,25); c.fillRect(10,-26,8,5);
  }
  else if(key==='bullet'||key==='hostile'){c.fillStyle=colors[key];c.fillRect(-3,-15,6,30);}
  else if(key==='gem'){c.fillStyle=P.player;polygon(c,[[0,-9],[7,0],[0,10],[-7,0]]);}
  else if(key==='particle'){c.fillStyle=P.white;c.fillRect(-3,-3,6,6);}
  else if(key==='drone'){polygon(c,[[0,-15],[15,0],[0,10],[-15,0]]);c.fillStyle=P.blue;c.fillRect(-22,-5,10,5);c.fillRect(12,-5,10,5);}
  else if(key==='boss'){
    // 正面重装感染体：双肩装甲、抓钩、裂开的面罩与胸腔暴露核心。
    polygon(c,[[-12,12],[-2,13],[-4,30],[-16,31]]);
    polygon(c,[[3,14],[14,12],[18,30],[7,31]]);
    polygon(c,[[-19,-17],[-8,-21],[9,-21],[21,-16],[17,10],[8,19],[-9,18],[-18,9]]);
    polygon(c,[[-17,-18],[-29,-14],[-32,-2],[-21,3],[-11,-8]]);
    polygon(c,[[17,-18],[29,-14],[32,-2],[21,3],[11,-8]]);
    polygon(c,[[-28,-1],[-20,3],[-23,13],[-28,20],[-26,10],[-33,16]]);
    polygon(c,[[26,0],[19,3],[24,15],[32,20],[29,10],[35,14]]);
    c.fillStyle=P.grid;
    polygon(c,[[-12,-27],[-5,-32],[8,-31],[14,-24],[10,-11],[0,-8],[-10,-13]]);
    c.fillStyle=P.boss;c.fillRect(-8,-21,7,3);c.fillRect(3,-21,7,3);
    c.strokeStyle=P.bomber;c.lineWidth=1.8;
    polygon(c,[[-6,-2],[1,-7],[7,-1],[2,8],[-3,6]]);
    for(const x of [-24,21]){c.beginPath();c.moveTo(x,-11);c.lineTo(x+4,-7);c.stroke();}
  }
  else{
    const tank=key==='tank',boss=key==='boss',fast=key==='fast',w=tank?27:fast?10:18;c.fillStyle=colors[key];c.strokeStyle=P.panel;
    polygon(c,[[-w,-13],[-w-7,9],[-w+1,16],[-w+4,5],[-8,13],[-12,29],[-3,30],[2,15],[10,28],[18,25],[10,7],[w,13],[w+8,4],[w,-14],[9,-20],[-8,-19]]);
    c.fillStyle=P.skin;polygon(c,[[-9,-25],[6,-28],[12,-17],[7,-8],[-8,-10]]);c.fillStyle=P.bg;c.fillRect(-6,-20,4,4);c.fillRect(3,-20,4,4);
    if(key==='bomber'){c.strokeStyle=P.bomber;c.beginPath();c.arc(0,0,11,0,7);c.stroke();c.fillStyle=P.bomber;c.fillRect(-3,-6,6,12);}
    if(boss){c.strokeStyle=P.gold;polygon(c,[[-19,-21],[-22,-35],[-7,-29],[0,-39],[9,-29],[22,-35],[19,-21]]);}
    c.fillStyle=P.grid;c.fillRect(-7,7,7,12);c.fillRect(5,7,7,12);c.fillStyle=P.skin;c.fillRect(-w-3,1,6,10);c.fillRect(w,0,6,10);c.fillStyle=P.white;c.globalAlpha=.18;c.fillRect(-8,-23,12,4);c.globalAlpha=1;if(tank){c.fillStyle=P.panel;c.fillRect(-22,-6,44,18);c.strokeStyle=P.tank;c.strokeRect(-22,-6,44,18);c.fillStyle=P.gold;c.fillRect(-14,-2,28,4);}
  }
}
/** 仅启动时生成高斯模糊光晕。优先 Canvas filter blur（高斯核），
 * 旧WebView fallback通过一次shadowBlur烘焙；运行时只drawImage + lighter。 */
export function initAssets(){
  for(const key of Object.keys(colors)){
    const factor=key==='boss'?4:1,size=128*factor,base=canvas(size,size),c=base.getContext('2d');c.scale(factor,factor);c.translate(64,64);shape(c,key);assets.sprites[key]=base;
    const white=canvas(size,size),w=white.getContext('2d');w.drawImage(base,0,0);w.globalCompositeOperation='source-in';w.fillStyle=P.white;w.fillRect(0,0,size,size);assets.white[key]=white;
    const glow=canvas(size,size),g=glow.getContext('2d');if('filter'in g){g.filter=`blur(${9*factor}px)`;g.drawImage(base,0,0);g.filter='none';}else{g.shadowColor=colors[key];g.shadowBlur=18*factor;g.drawImage(base,0,0);}assets.glows[key]=glow;
  }
  for(const color of Object.values(P)){const s=canvas(12,12),sc=s.getContext('2d');sc.fillStyle=color;sc.fillRect(2,2,8,8);assets.sparks[color]=s;}
  const bg=canvas(720,1280),c=bg.getContext('2d'),grad=c.createLinearGradient(0,0,720,1280);grad.addColorStop(0,P.panel);grad.addColorStop(.5,P.bg);grad.addColorStop(1,P.panel);c.fillStyle=grad;c.fillRect(0,0,720,1280);
  for(let i=0;i<13000;i++){c.globalAlpha=Math.random()*.055;c.fillStyle=P.white;c.fillRect(Math.random()*720,Math.random()*1280,1,1);}c.globalAlpha=1;
  // 废弃道路、板块与电路全部烘焙。
  c.strokeStyle=P.grid;c.lineWidth=2;for(let y=30;y<1280;y+=180){c.strokeRect(30,y,110,130);c.strokeRect(580,y+50,110,130);c.fillStyle=P.grid;c.fillRect(353,y,14,55);}assets.background=bg;
  const v=canvas(720,1280),vc=v.getContext('2d'),vg=vc.createRadialGradient(360,640,180,360,640,750);vg.addColorStop(0,'transparent');vg.addColorStop(1,P.black);vc.fillStyle=vg;vc.fillRect(0,0,720,1280);assets.vignette=v;
  const warning=canvas(720,1280),wc=warning.getContext('2d');for(const flip of [false,true]){wc.save();if(flip){wc.translate(720,0);wc.scale(-1,1);}const edge=wc.createLinearGradient(0,0,160,0);edge.addColorStop(0,P.hp);edge.addColorStop(1,'transparent');wc.fillStyle=edge;wc.fillRect(0,0,160,1280);wc.restore();}assets.warning=warning;
  const panel=canvas(64,64),pc=panel.getContext('2d');pc.fillStyle=P.panel;pc.fillRect(0,0,64,64);pc.globalAlpha=.12;pc.drawImage(bg,0,0,64,64);assets.panel=panel;
}
export function sprite(c,key,x,y,angle=0,scale=1,flash=0,glow=true){c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);if(!['bullet','gem','particle','hostile'].includes(key)){c.fillStyle=P.black;c.globalAlpha*=.25;c.beginPath();c.ellipse(4,15,22*scale,10*scale,0,0,7);c.fill();c.globalAlpha/=.25;}if(glow){c.globalCompositeOperation='lighter';c.globalAlpha*=.2;c.drawImage(assets.glows[key],-64*scale,-64*scale,128*scale,128*scale);c.globalAlpha/=.2;c.globalCompositeOperation='source-over';}c.drawImage(assets.sprites[key],-64*scale,-64*scale,128*scale,128*scale);if(flash>0){c.globalCompositeOperation='lighter';c.globalAlpha*=Math.min(.32,flash*4);c.drawImage(assets.white[key],-64*scale,-64*scale,128*scale,128*scale);}c.restore();}

```

## js/audio.js
```
import {save} from './save.js';
export const audio={ctx:null,last:0,unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{});}catch{}},play(type){
 if(!save.data.settings.sound||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;if(type==='hit'&&t-this.last<.055)return;if(type==='hit')this.last=t;
 const specs={shoot:[180,70,.06,.035],hit:[95,40,.07,.04],upgrade:[420,1000,.38,.12],hurt:[120,30,.25,.15],boss:[65,140,.8,.15]};const [f,end,d,v]=specs[type]||specs.hit;
 const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type==='upgrade'?'sine':'triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d);o.onended=()=>{o.disconnect();g.disconnect();};
}};

```

## js/challenge.js
```
import {BALANCE as B,PALETTE as P} from './config.js';
const C=B.challenge;
export const combatStage=g=>g.mode.kind==='campaign'?g.mode.stage:Math.max(1,Math.ceil(g.mode.wave/B.wavesPerStage));
export function stageHealth(stage){return stage<3?B.hpStageGrowth**(stage-1):B.hpStageGrowth*C.lateHPGrowth**(stage-2)*(1+C.lateHPQuadratic*Math.max(0,stage-3)**2);}
/** 数量压力与血量压力分开：血量跟随人数的次线性幂，避免后期只有数量增长。 */
export function healthPressure(count){const n=Math.max(0,Math.min(1e100,Number(count))),k=B.adaptive.densityKnee;return n<=k?n:k*(n/k)**C.healthPower;}
export function armorFactor(e){if(e.type===4&&e.stage>=C.startStage)return e.cycle<C.armorSeconds?C.armorFactor:C.exposedFactor;return e.exposed>0?C.breakBonus:1;}
export function initChallenge(e,stage){
 e.stage=stage;e.cycle=0;e.strikes=0;e.strikeTimer=C.firstAttack;e.exposed=0;
 e.shield=e.type===4?e.maxHP*.65:stage>=2&&e.type===2?e.maxHP*C.shieldRatio:0;e.maxShield=e.shield;
 return e;
}
export function warnStrike(g,owner,x,width,healthRatio,label){
 if(g.hazards.items.some(h=>h.active&&h.ownerId===owner.id))return null;
 return g.hazards.take({owner,ownerId:owner.id,x,width,healthRatio,label,
   left:owner.stage>=10?C.lateWarning:C.warning,total:owner.stage>=10?C.lateWarning:C.warning,flash:0});
}
function warnDouble(g,e){
 // 固定两侧封锁，中间永远留出能容纳整队的可达安全位置。
 const first=warnStrike(g,e,B.track.upgradeX,C.doubleWidth,C.blastHealth,'中央躲避');
 if(first)g.hazards.take({...first,active:true,x:B.track.gateRight});
}
export function updateEnemyChallenge(g,e,dt){
 e.exposed=Math.max(0,e.exposed-dt);
 if(e.type===4&&e.stage>=C.startStage){
  e.cycle=(e.cycle+dt)%(C.armorSeconds+C.exposedSeconds);e.strikeTimer-=dt;
  if(e.strikeTimer<=0){
   if(e.stage>=C.doubleStage&&e.strikes%2===1)warnDouble(g,e);
   else warnStrike(g,e,g.p.x,C.blastWidth,C.blastHealth+C.blastHealthGrowth*(e.stage-C.startStage),'离开红区');
   e.strikes++;e.strikeTimer=Math.max(C.attackMin,C.attackInterval-C.attackStageStep*(e.stage-C.startStage)-C.enrageStep*(2-e.plates));
   g.ui.toast(e.stage>=C.doubleStage&&e.strikes%2===0?'双侧轰击 · 移到中央缺口':'首领锁定落点 · 横移躲避');
  }
 }else if(e.type===3&&e.stage>=C.artilleryStage&&e.y>240&&e.y<780&&g.time>=(g.nextEliteStrike||0)){
  if(!g.enemies.items.some(t=>t.active&&t.type===4)&&!g.hazards.count){
   warnStrike(g,e,g.p.x,C.blastWidth,C.eliteBlastHealth,'毒爆投射');g.nextEliteStrike=g.time+C.eliteInterval;
  }
 }
}
/** 预警固定落点，不追踪手指；只有预警结束才结算，死亡/换关取消未落地攻击。 */
export function updateHazards(g,dt,hurt){
 for(const h of g.hazards.items)if(h.active){
  if(!h.owner.active||h.owner.id!==h.ownerId){h.active=false;continue;}
  if(h.flash>0){h.flash-=dt;if(h.flash<=0)h.active=false;continue;}
  h.left-=dt;if(h.left>0)continue;
  h.flash=.28;g.fx.ring(h.x,g.p.y,P.boss);g.shake=B.hitShake;
  const squadWidth=(Math.min(Number(g.p.squad<BigInt(B.track.columns)?g.p.squad:BigInt(B.track.columns)),B.track.columns)-1)*B.track.spacing/2;
  if(Math.abs(g.p.x-h.x)<h.width+squadWidth)hurt(g,g.p.maxHP*h.healthRatio,{area:true,type:4});
 }
}
export function drawHazards(g,c){
 c.save();c.textAlign='center';
 for(const h of g.hazards.items)if(h.active){
  const x=h.x-h.width,y=g.p.y-65,height=270;
  c.fillStyle=P.hp;c.strokeStyle=P.hp;c.lineWidth=4;
  c.globalAlpha=h.flash>0?.5:.1+.12*(1-Math.max(0,h.left)/h.total);
  c.fillRect(x,y,h.width*2,height);c.globalAlpha=.95;c.strokeRect(x,y,h.width*2,height);
  c.font='bold 22px system-ui';c.fillStyle=P.white;c.fillText(h.flash>0?'冲击':h.label,h.x,y-18);
  c.font='bold 30px monospace';c.fillText(Math.max(0,h.left).toFixed(1),h.x,y+55);
  c.beginPath();c.arc(h.x,y+110,34,0,Math.PI*2*Math.max(0,h.left)/h.total);c.stroke();
 }
 c.restore();
}
export function stageBrief(stage){
 if(stage>=7)return '双侧轰击留中央缺口；躲预警，趁核心暴露集火';
 if(stage>=5)return '投掷感染体会锁定落点；护甲可用穿透、爆炸或持续伤害处理';
 if(stage>=4)return '金色护甲精英入场；击破护甲后短暂易伤';
 if(stage>=3)return '首领开始预警轰击；横移躲红区，核心暴露时集火';
 return '左右换边射门与油桶，正面压制尸潮；升级后点击强化领取';
}

```

## js/combat.js
```
import {BALANCE as B} from './config.js';
export function weaponStats(p){return {damage:Math.max(1,p.damage+(p.gateDamage||0)),rate:Math.min(B.director.rateCap,Math.max(1,1/p.rate+(p.gateRate||0)))};}
export function bulletFlow(p){return weaponStats(p).rate*Math.max(1,Math.min(1e12,Number(p.squad)))*Math.min(B.maxShots,p.shots||1);}
export function combatProfile(p){const stats=weaponStats(p),aoe=Boolean(p.explosive||p.chain||p.aura||p.shots>=3),dps=stats.damage*bulletFlow(p),power=Math.max(1,dps/10);return {aoe,dps,power,pressure:2+Math.log2(power)*12,hp:Math.max(power**.28,stats.damage/10*(.8+.06*Math.log2(power)))*(aoe?1.12:1)*Math.max(1,(stats.rate/12)**.12),columns:aoe?5:1};}
export function gateNeed(p){return Math.max(2,Math.round(bulletFlow(p)*.65));}
export function applyGate(p,gate){const before=weaponStats(p),n=Number(gate.value);if(gate.stat==='rate')p.gateRate=Math.max(1-1/p.rate,Math.min(B.director.rateCap-1/p.rate,(p.gateRate||0)+n));else p.gateDamage=Math.max(1-p.damage,(p.gateDamage||0)+n);return {before,after:weaponStats(p)};}

/** 新生敌人只采样一次火力。按一条交火线实际分到的火力估算，避免总DPS直接堆到每一只怪上。
 * 射速取次线性幂，成长仍有收益；关卡线性增加耐久，无第5关断层，也不随战斗时长无限膨胀。
 * 首领另计三层血与护盾，避免对普通怪算法再次乘650/24造成巨额血墙。
 */
export function encounterHP(p,type,stage){
 const s=weaponStats(p),profile=combatProfile(p),lanes=profile.aoe?3:1;
 const flow=Math.max(1,bulletFlow(p)/lanes);
 const hits=2+B.encounter.hpSeconds*Math.max(0,flow-3)**B.encounter.hpRatePower;
 const growth=1+B.encounter.hpStageStep*Math.max(0,stage-1);
 return type===4?Math.max(36,profile.dps*B.encounter.bossDPSSeconds*growth):s.damage*hits*(B.enemyHP[type]/B.enemyHP[0])*growth;
}

```

## js/config.js
```
export const PALETTE = Object.freeze({
  road:'#484c49', rail:'#a8aaa0', roadLine:'#d3c9a1', uniform:'#3e82be', helmet:'#ebc252', skin:'#a1c9ab', bg:'#141d25', panel:'#13182b', grid:'#22304a', player:'#55f5e5', normal:'#62b6a0', fast:'#fa5da9', tank:'#a6b876', bomber:'#ffb454', boss:'#ff4c91',
  bullet:'#ffe59a', crit:'#ffd37b', hp:'#ff617c', ui:'#55f5e5', secondary:'#a5abc5', text:'#eef5ff', white:'#ffffff', black:'#000000', blue:'#5daeff', purple:'#c185ff', gold:'#ffd37b'
});
/** v4.7: 所有阶段使用连续尸潮预算；不再在第5关取消限流。
 * 新怪血量按当前单发伤害×有效射速的次线性估值设定，生成后固定，升级不会给存活敌人回血。
 * 普通怪目标是短时间集火可杀，首领独立按持续输出预算计算；不再叠乘人数、时间和指数关卡。
 * 门逐发命中加1，必须经过才应用；防线120HP，每只漏怪扣10。 */
export const BALANCE = Object.freeze({
  encounter:Object.freeze({spawnTop:260,spawnDepth:145,packCap:12,intervalFloor:1.1,latePopulationStep:18,hpRatePower:.88,hpSeconds:.16,hpStageStep:.065,bossDPSSeconds:1.5,gemMergeRadius:64,gemScale:.72,killParticles:5}),
  director:Object.freeze({rateCap:240,response:3,scatterStage:3,scatterPower:80,lootFirst:5,lootInterval:12,lootJitter:6,lateLootInterval:26,lateLootJitter:10,healFirst:16,healInterval:18,healAmount:20}),
  lootCost:Object.freeze({damage:12,rate:16,range:16,magnet:12,pierce:30,multi:45,blast:55,slow:32,breaker:40,focus:36,close:30,execute:55,recruit:180,turret:70,grenade:50,laser:110}),
  arsenal: Object.freeze({maxSquad:5,recruitEvery:4,permanentMagnet:12,pickupRadius:14,cardTouch:48,cardSpeed:85,cardInterval:9,cardJitter:5,cardHits:5,cardRarityHits:3,maxCards:2,grenadeRadius:155,grenadeRatio:7,grenadeDelay:.65,turretLife:10,turretRate:.22,turretRatio:.65,laserRatio:18,laserWidth:34,maxCharges:3,shieldBoss:.8,shieldElite:.55,shieldHitTime:.26,shieldBreakTime:.7,shieldBreakBonus:1.15,rangeStep:2,gateWeaponMin:0}),
  weapons: Object.freeze([
    {name:'制式手枪',points:0,damage:14,rate:.72,pellets:1,pierce:0,color:'gold'},
    {name:'疾风冲锋枪',points:8,damage:16,rate:.25,pellets:1,pierce:0,color:'blue'},
    {name:'突击步枪',points:25,damage:28,rate:.18,pellets:1,pierce:0,color:'player'},
    {name:'三联霰弹枪',points:55,damage:24,rate:.24,pellets:3,pierce:0,color:'bomber'},
    {name:'重型机枪',points:100,damage:36,rate:.10,pellets:1,pierce:1,color:'purple'},
    {name:'脉冲穿甲枪',points:180,damage:50,rate:.12,pellets:2,pierce:2,color:'gold'}
  ]),
  track: Object.freeze({
    playerY:990, startX:192, upgradeX:192, gateRight:528, hordeX:360, hordeLeft:160, hordeRight:560, startSquad:1, maxMultiplier:3, hostileGateAt:20, hostileGateHighAt:100, hostileGateChance:.8, hostileGateHighChance:.9, gateAddMicros:180000, gateDivideMicros:110000, gateMultiplyMicros:300000, gateMultiplyGrowth:1.35, gateHitWindow:.38, gateChargeSlow:1, visibleTroopers:30, maxTracers:42, hostileReserve:28, columns:5, spacing:32, rowSpacing:28,
    scroll:245, encounterInterval:32, gateHalfWidth:100, chargeHits:4, multiplierHits:10,
    drumHits:4, blastRadius:195, blastDamage:240, openingSize:3, openingStageGrowth:3, openingMax:20,
    strafeFactor:3, forwardSpeed:40, memberDamage:.85, fanMax:.24, fanGrowth:.008
  }),
  summonShare:6,specialArmyPower:.5,specLevel:5,artilleryDamage:1.25,artilleryRate:1.1,elementDamage:.9,engineerArmor:.1,breachBonus:.2,salvoRate:.92,conductionBonus:.2,igniteRatio:.6,supportRate:.8,supportDamage:.35,repairOnKill:.2,executionThreshold:.35,executionMultiplier:2,overloadMultiplier:1.6,swarmRate:.65,swarmDamage:1.5,
  maxShots:15,maxSummons:6,maxChain:8,maxCrit:.85,maxArmor:.7,minFireInterval:.06,normalShots:1,rangerShots:2,
  laserShots:5,laserPierce:3,stormChain:2,stormFreeze:1,eclipseAura:2,eclipseBurn:2,
  challenge: Object.freeze({startStage:3,shieldStage:4,artilleryStage:5,doubleStage:7,
    lateHPGrowth:1.23,lateHPQuadratic:.015,damageGrowth:.09,healthPower:.85,
    shieldRatio:.45,shieldResistance:.35,shieldPierce:2,breakWindow:2,breakBonus:1.35,
    armorSeconds:3,exposedSeconds:2.5,armorFactor:.25,exposedFactor:1.35,
    firstAttack:.7,attackInterval:5,attackMin:3,attackStageStep:.13,enrageStep:.5,
    warning:1.7,lateWarning:1.35,blastWidth:94,doubleWidth:56,
    blastHealth:.34,blastHealthGrowth:.012,squadLossDivisor:5,woundSeconds:3,woundHealing:.2,
    eliteInterval:6,eliteBlastHealth:.2,hazards:6,bossSlowFloor:.8,barrelHealthRatio:.35}),
  adaptive: Object.freeze({response:2,baseSquad:2,densityKnee:120,densityPerDoubling:100,hpPerMember:.085,bossPerMember:.075,packPerMember:.11,intervalPerMember:.012,budgetPerMember:1.1,elitePerMember:.0015}),
  packMinInterval:.5,packGrowth:.025,fastChance:.27,tankThreshold:.88,bomberChance:.10,
  bossFinalHP:1,bossMajorHP:1.6,bossAdvance:10,bossStartY:300,bossBreachY:1050,
  bossWarning:.85,bossDashDuration:.65,hostileBulletLife:8,
  width:720,height:1280,dpr:2,step:1/60,maxSteps:6,enemies:120,bullets:400,particles:300,gems:72,corpses:50,numbers:16,
  breachDamage:10,breachWarning:1.1,playerHP:120,playerSpeed:235,damage:10,fireInterval:1,bulletSpeed:760,bulletLife:1.5,crit:.08,critMultiplier:2,invulnerability:.65,
  enemyHP:[24,18,75,32,650],enemySpeed:[34,70,22,42,32],enemyRadius:[20,16,32,23,80],enemyDamage:[10,8,22,24,30],enemyXP:[4,5,12,7,140],
  hpWave:.13,hpTime:.10,speedWave:.012,speedCap:1.85,easyTime:30,easySpeed:.75,
  wavesPerStage:3,stages:10,waveDuration:16,spawnCount:12,spawnGrowth:24,spawnStagePower:1.35,spawnWaveGrowth:12,spawnLevelGrowth:4,packBase:2,packStageGrowth:3,packWaveGrowth:2,packLevelDivisor:2,packIntervalStage:.35,packIntervalWave:.28,packIntervalLevel:.035,openingDelay:6,hpStageGrowth:1.28,tutorialSlow:.42,bossEvery:10,bossAttack:4,bossShotSpeed:300,bossShots:12,bossShotDamage:16,
  bossArrival:2,packInterval:3,xpBase:24,xpGrowth:1.28,magnet:42,gemSpeed:510,coinKill:1,coinPickupEvery:3,coinPickupBoss:12,bossCoins:60,stageCoins:60,
  knockback:4,corpseTime:.85,critFreeze:0,shakeDecay:8,hitShake:9,critShake:4,spread:.12,
  damageUpgrade:1.18,rateUpgrade:.90,speedUpgrade:1.10,hpUpgrade:25,critUpgrade:.06,magnetUpgrade:18,regenUpgrade:.6,armorUpgrade:.07,luckUpgrade:.08,
  leech:.8,thorns:12,explosionRadius:85,explosionRatio:.4,chainRange:145,chainRatio:.45,freezeTime:1.5,freezeSlow:.45,burnTime:3,burnDPS:5,auraRadius:95,auraDPS:8,
  homingTurn:3,droneInterval:.8,droneRatio:.6,orbitRadius:100,orbitDamage:15,orbitInterval:.45,laserRatio:.65,stormRatio:.65,eclipseRatio:1.5,abilityInterval:1,
  healUpgrade:40,xpBonus:.15,shopBase:80,shopGrowth:1.65,shopMax:8,permanentDamage:.08,permanentHP:15,permanentSpeed:.025,permanentLuck:.01,unlockCost:350,
  rangerSpeed:1.12,rangerHP:.8,rangerDamage:.8,rangerRate:.8,rerolls:1,rerollUpgrade:1,
  rarityWeights:[60,25,12,3],qualityLowFPS:52,qualityHighFPS:58,qualityMin:.3
});

```

## js/entities.js
```
import {weaponStats,encounterHP} from './combat.js';
import {permanent} from './shop.js';
import {updateLoot,drawLoot,hitLoot} from './loot.js';
import {combatStage,stageHealth,initChallenge,armorFactor,updateEnemyChallenge,updateHazards,drawHazards,healthPressure} from './challenge.js';
import { drawSquad, soldierOffset, visibleTroopers, normalizeSquad, armyPressure } from './runway.js';
import {BALANCE as B,PALETTE as P} from './config.js';
import {Pool,Grid,clamp,rand,distance2,lerp} from './utils.js';
import {sprite} from './assets.js';
import {audio} from './audio.js';
import {save} from './save.js';
export const TYPES=['normal','fast','tank','bomber','boss'];
export function player(){const s=save.data,shop=s.shop,r=s.character===1;return {x:B.track.startX,y:B.track.playerY,px:B.track.startX,py:B.track.playerY,squad:BigInt(B.track.startSquad),r:18,angle:-Math.PI/2,hp:B.playerHP,maxHP:B.playerHP,breachLoss:0,damage:B.damage*(1+permanent('damage',shop.damage))*(r?B.rangerDamage:1),speed:B.playerSpeed*(1+permanent('speed',shop.speed))*(r?B.rangerSpeed:1),rate:B.fireInterval*(r?B.rangerRate:1)/(1+permanent('rate',shop.rate||0)),shots:r?B.rangerShots:B.normalShots,pierce:0,crit:B.crit,weapon:1,gateRate:0,gateDamage:0,magnet:B.magnet+permanent('magnet',shop.magnet||0),luck:shop.luck*B.permanentLuck,rerolls:B.rerolls+shop.rerolls,leech:0,thorns:0,explosive:0,chain:0,freeze:0,burn:0,aura:0,homing:0,drone:0,orbit:0,regen:0,armor:1-1/(1+permanent('hp',shop.hp)),xpBonus:0,invul:0,fire:0,ability:0,droneTimer:0,orbitTimer:0,level:1,xp:0,nextXP:B.xpBase,synergies:new Set()};}
export function initEntities(g){g.enemies=new Pool(B.enemies);g.bullets=new Pool(B.bullets,()=>({hits:new Set()}));g.gems=new Pool(B.gems);g.corpses=new Pool(B.corpses);g.grid=new Grid();g.serial=0;g.effects=[];g.hazards=new Pool(B.challenge.hazards);g.nextEliteStrike=0;}
export function spawnEnemy(g,type){
 const stage=combatStage(g),x=type===4?B.track.hordeX:rand(B.track.hordeLeft,B.track.hordeRight),y=type===4?B.bossStartY:rand(80,160);
 const bossScale=type===4?(stage%5===0?B.bossMajorHP:B.bossFinalHP):1;
 const pressure=Math.max(0,(g.mode.healthPressure??healthPressure(g.p.squad))-B.adaptive.baseSquad);
 const legacyHP=(type===4&&stage<=4?.03+.02*stage:stage<=2?.75:1)*(g.mode.fireHP||1)*(1+pressure*(type===4?B.adaptive.bossPerMember:B.adaptive.hpPerMember))*bossScale*B.enemyHP[type]*stageHealth(stage)*(1+B.hpWave*((g.mode.wave-1)%B.wavesPerStage))*(1+B.hpTime*Math.max(0,g.time-B.easyTime)/60);
 const hp=stage<=4?legacyHP:encounterHP(g.p,type,stage);
 const e=g.enemies.take({id:++g.serial,type,x,y,px:x,py:y,r:B.enemyRadius[type],hp,maxHP:hp,speed:B.enemySpeed[type]*Math.min(B.speedCap,1+B.speedWave*g.mode.wave),angle:0,nextNumber:0,flash:0,freeze:0,burn:0,burnPower:0,plates:type===4?2:0,guard:0,lockedX:null,attack:B.bossAttack,phase:0,dash:0,dx:0,dy:0,elite:stage>=B.challenge.shieldStage&&type===2});
 return e?initChallenge(e,stage):null;
}
/** 专精加成独立于队伍人数；元素条件在命中前读取，避免首次命中自触发。 */
export const auxiliaryPower=p=>Math.max(1,Math.min(1e100,Number(normalizeSquad(p.squad))))**B.specialArmyPower;
export function directMultiplier(p,e){
 let multiplier=(p.focus&&p.still>.7?1.4:1)*(p.close&&Math.abs(e.y-p.y)<260?1.55:1)*(p.execute&&e.exposed>0?1.6:1);multiplier*=e.type===4?1+(p.bossBonus||0):1;
 if(e.type===4&&p.execution&&e.hp/e.maxHP<B.executionThreshold)multiplier*=B.executionMultiplier;
 if(e.freeze>0)multiplier*=1+(p.conduction||0);
 if(p.overload&&e.freeze>0&&e.burn>0)multiplier*=B.overloadMultiplier;
 return multiplier;
}
export function nearest(g,x,y,except=null){let out=null,d=Infinity;for(const e of g.enemies.items)if(e.active&&e!==except){const n=(e.x-x)**2+(e.y-y)**2;if(n<d){d=n;out=e;}}return out;}
function shoot(g,x,y,a,damage,enemy=false){const b=g.bullets.take({x,y,px:x,py:y,vx:Math.cos(a)*(enemy?B.bossShotSpeed:B.bulletSpeed),vy:Math.sin(a)*(enemy?B.bossShotSpeed:B.bulletSpeed),angle:a,damage,mass:1n,life:enemy?B.hostileBulletLife:B.bulletLife,pierce:enemy?0:g.p.pierce,enemy});if(b)b.hits.clear();return b;}
export function healingFactor(p){return p.wound>0?B.challenge.woundHealing:1;}
/** 漏怪伤害不走接触无敌帧，十只同帧突破也精确扣100。 */
export function breach(g,e){if(!e.active)return;e.active=false;const p=g.p;p.breachLoss=(p.breachLoss||0)+B.breachDamage;p.hp=Math.max(0,Math.min(p.hp-B.breachDamage,p.maxHP-p.breachLoss));g.edgeWarning=B.breachWarning;g.leaks=(g.leaks||0)+1;g.ui.update?.();g.ui.toast(`防线突破 −${B.breachDamage} HP · 累计漏怪 ${g.leaks}`);if(p.hp<=0)g.finish(false);}
export function hurt(g,damage,source){
 const p=g.p;if(p.invul>0||g.state!=='playing')return;
 const area=source?.area;
 p.hp-=area?damage*(1-p.armor*.5):damage*(1-p.armor)/Math.sqrt(visibleTroopers(p.squad));
 const loss=0n;
 p.squad=p.squad>loss?p.squad-loss:0n;if(area)p.wound=B.challenge.woundSeconds;
 p.invul=B.invulnerability;g.shake=B.hitShake;g.fx.burst(p.x,p.y,P.hp,18);audio.play('hurt');
 if(source?.active&&p.thorns)hit(g,source,p.thorns*B.thorns*auxiliaryPower(p),false,false);
 if(p.hp<=0||p.squad===0n)g.finish(false);
}
/** direct=false避免爆炸/电链/持续伤害递归触发，所有击杀统一结算。 */
export function hit(g,e,damage,crit=false,direct=false){if(!e.active||e.guard>0)return;
 damage*=armorFactor(e);
 if(e.shield>0){if(!(e.shieldFlash>0))e.shieldFlash=.25;
   const factor=g.p.pierce>=B.challenge.shieldPierce||g.p.explosive?1:B.challenge.shieldResistance;
   const absorbed=Math.min(e.shield,damage*factor*(1+(g.p.shieldBonus||0)));e.shield-=absorbed;damage=0;
   if(e.shield<=0){e.exposed=B.challenge.breakWindow;g.fx.ring(e.x,e.y,P.gold,e.type===4?160:55);}
 }
 e.hp-=Math.max(0,damage);if(direct||crit||damage>=1)e.flash=.12;if(damage>0&&(direct||crit)&&g.time>=(e.nextNumber||0)){g.fx.number(e.x,e.y-e.r,damage,crit);e.nextNumber=g.time+.18;}if(crit)g.shake=Math.max(g.shake,1.2);audio.play('hit');
 if(e.hp<=0 && e.plates>0){
   e.plates--; e.hp=e.maxHP; e.guard=B.bossWarning;
   e.lockedX=null;
   g.fx.ring(e.x,e.y,P.gold); g.shake=B.hitShake;
   g.ui.toast(e.plates ? '装甲击碎 · 继续集火' : '核心暴露 · 最后一层血量');
   return;
 }
 if(e.hp<=0){e.active=false;if(e.type===4&&e.stage>=3){if(g.p.shots<B.maxShots&&e.stage%2===1){g.p.shots++;g.p.upgradeHistory.push('multi');g.ui.toast('首领奖励：分裂弹 +1（已生效）');}else{g.p.squad++;g.ui.toast('首领奖励：增援 +1（已加入）');}g.fx.ring(g.p.x,g.p.y,P.gold);g.persistGrowth?.();}g.kills++;g.score=Math.min(1e12,g.score+Math.round(e.maxHP));g.coins+=e.type===4?B.bossCoins:B.coinKill;g.p.hp=Math.min(g.p.maxHP,g.p.hp+(g.p.repairOnKill||0)*healingFactor(g.p));g.corpses.take({x:e.x,y:e.y,type:e.type,angle:-Math.PI/2+.18,life:B.corpseTime});g.fx.burst(e.x,e.y,P[TYPES[e.type]],e.type===4?24:B.encounter.killParticles);let merged=g.gems.items.find(t=>t.active&&!t.pull&&distance2(t,e)<B.encounter.gemMergeRadius**2);let gem=merged?null:g.gems.take({x:e.x,y:e.y,px:e.x,py:e.y,value:B.enemyXP[e.type],coins:e.type===4?B.coinPickupBoss:(e.type===2||g.kills%B.coinPickupEvery===0?1:0),pull:false});if(!gem){let closest=merged,d=merged?0:Infinity;for(const t of g.gems.items){if(!t.active)continue;const n=distance2(t,e);if(n<d){d=n;closest=t;}}if(closest){closest.value+=B.enemyXP[e.type];closest.coins=(closest.coins||0)+(e.type===4?B.coinPickupBoss:(e.type===2||g.kills%B.coinPickupEvery===0?1:0));}}if(e.type===3){g.fx.ring(e.x,e.y,P.bomber);if(distance2(e,g.p)<B.explosionRadius**2)hurt(g,B.enemyDamage[3]);}}
 if(!e.active && direct && e.burn>0 && g.p.ignite){
   g.fx.ring(e.x,e.y,P.bomber);
   for(const other of g.enemies.items)if(other.active&&distance2(other,e)<B.explosionRadius**2)hit(g,other,g.p.damage*g.p.ignite);
 }
 if(!direct)return;const p=g.p;p.hp=Math.min(p.maxHP,p.hp+p.leech*B.leech*healingFactor(p));e.freeze=(p.freeze||p.slow)?B.freezeTime:e.freeze;e.burn=p.burn?B.burnTime:e.burn;e.burnPower=p.burn*auxiliaryPower(p);
 const angle=Math.atan2(e.y-p.y,e.x-p.x);if (e.type !== 4) { e.x=clamp(e.x+Math.cos(angle)*B.knockback,B.track.hordeLeft,B.track.hordeRight);e.y+=Math.sin(angle)*B.knockback; }
 if(p.explosive){if(g.time>=(g.nextBlastVisual||0)){g.fx.burst(e.x,e.y,P.bomber,6,95);g.nextBlastVisual=g.time+.12;}g.grid.query(e.x,e.y,B.explosionRadius,t=>{if(t!==e&&distance2(t,e)<B.explosionRadius**2)hit(g,t,damage*B.explosionRatio*p.explosive);});}
 if(p.chain){let last=e;const visited=new Set([e.id]);for(let i=0;i<Math.min(p.chain,B.maxChain);i++){let next=null,d=B.chainRange**2;for(const t of g.enemies.items)if(t.active&&!visited.has(t.id)){const n=distance2(t,last);if(n<d){d=n;next=t;}}if(!next)break;visited.add(next.id);effect(g,{x:last.x,y:last.y,x2:next.x,y2:next.y,color:P.blue,life:.14,max:.14,width:3});if(p.synergies.has('storm'))next.freeze=B.freezeTime;hit(g,next,damage*(p.synergies.has('storm')?B.stormRatio:B.chainRatio)*(1+(p.conduction||0)));last=next;}}
}
function effect(g,o){if(g.effects.length<24)g.effects.push(o);}
export function updateEntities(g,dt){const p=g.p;p.squad=normalizeSquad(p.squad);p.px=p.x;p.py=p.y;p.invul=Math.max(0,p.invul-dt);p.wound=Math.max(0,(p.wound||0)-dt);p.hp=Math.min(p.maxHP,p.hp+p.regen*dt*healingFactor(p));
 g.input.move(p, dt);p.still=Math.abs(p.x-p.px)<.1?(p.still||0)+dt:0;
 g.runway.update(g, dt);
 if (g.state !== 'playing') return;
 updateLoot(g,dt);const target = nearest(g, p.x, p.y);
 p.angle = -Math.PI / 2;
 p.fire -= dt;
 if (p.fire <= 0) {
   const period=Math.max(B.minFireInterval,1/weaponStats(p).rate);p.fire+=period;
   // 一枚示踪弹代表一束同方向的子弹。余数均分，始终精确表示本轮总弹数。
   const shots = Math.min(B.maxShots, p.shots);
   p.volleyCarry=(p.volleyCarry||0)+Math.max(1,period*weaponStats(p).rate);
   const rounds=Math.floor(p.volleyCarry);p.volleyCarry-=rounds;
   const total = p.squad * BigInt(shots) * BigInt(rounds);
   const visible = visibleTroopers(p.squad);
   const budget = Math.max(1, Math.floor((B.bullets - B.track.hostileReserve) * period / B.bulletLife));
   const limit = Math.min(budget, B.track.maxTracers, B.bullets - B.track.hostileReserve - g.bullets.count);
   if (limit > 0) {
     const tracers = Number(total < BigInt(limit) ? total : BigInt(limit));
     const weight = total / BigInt(tracers), extra = total % BigInt(tracers);
     for (let i = 0; i < tracers; i++) {
       const index = Math.floor(i * visible / tracers);
       const offset = soldierOffset(index, visible);
       const x = p.x + offset.x + 10, y = p.y + offset.y - 24;
       // 大编队交叉射击，增加横向覆盖；小队仍可瞄准单一油桶。
       const fan = Math.min(B.track.fanMax, Math.max(0, visible - 6) * B.track.fanGrowth);
       const angle = p.angle + (i % shots - (shots - 1) / 2) * B.spread +
         (tracers > 1 ? fan * (i / (tracers - 1) - .5) : 0);
       const b = shoot(g, x, y, angle, weaponStats(p).damage);
       if (b) b.mass = weight + (BigInt(i) < extra ? 1n : 0n);
       if (i < B.track.columns) g.fx.burst(x, y, P.bullet, 1, 65);
     }
   } else p.fire = 0;
   audio.play('shoot');
 }
 p.droneTimer-=dt;if(p.drone&&target&&p.droneTimer<=0){p.droneTimer=B.droneInterval*B.supportRate**(p.support||0)*(p.swarm?B.swarmRate:1);for(let i=0;i<Math.min(p.drone,B.maxSummons);i++){const a=g.time+i*6.28/Math.min(p.drone,B.maxSummons),x=p.x+Math.cos(a)*65,y=p.y+Math.sin(a)*65;const droneShot=shoot(g,x,y,Math.atan2(target.y-y,target.x-x),p.damage*B.droneRatio*(1+B.supportDamage*(p.support||0))*(p.swarm?B.swarmDamage:1));if(droneShot)droneShot.mass=p.squad>BigInt(B.summonShare)?p.squad/BigInt(B.summonShare):1n;}}
 p.ability-=dt;p.orbitTimer-=dt;const ability=p.ability<=0,orbit=p.orbitTimer<=0;if(ability)p.ability=B.abilityInterval;if(orbit)p.orbitTimer=B.orbitInterval;
 for(const e of g.enemies.items)if(e.active){e.px=e.x;e.py=e.y;e.flash=Math.max(0,e.flash-dt);e.shieldFlash=Math.max(0,(e.shieldFlash||0)-dt);e.freeze=Math.max(0,e.freeze-dt);e.burn=Math.max(0,e.burn-dt);e.angle=Math.atan2(p.y-e.y,p.x-e.x);let speed=e.speed*(g.time<B.easyTime?B.easySpeed:1)*(e.freeze>0?B.freezeSlow:1);
  updateEnemyChallenge(g,e,dt);
  if (e.type === 4) {
    e.guard = Math.max(0, e.guard - dt);
    // 公路中央缓慢推进；冻结仅减速，不再横跨强化区追击。
    e.angle = Math.PI / 2;
    e.y += B.bossAdvance * (e.freeze > 0 ? (e.stage>=B.challenge.startStage?B.challenge.bossSlowFloor:B.freezeSlow) : 1) * dt;
    if (e.y >= B.bossBreachY) {
      g.ui.toast('首领突破防线'); g.finish(false); return;
    }
  } else {
    e.angle = Math.PI / 2;
    const tutorial = g.mode.stage === 1 && g.time < B.easyTime ? B.tutorialSlow + (1-B.tutorialSlow)*g.time/B.easyTime : 1;
    e.y += (B.track.forwardSpeed + speed) * tutorial * dt;
    if (e.y >= B.bossBreachY) {
      breach(g,e);if(g.state!=='playing')return;continue;
    }
  }
  if(e.burn>0)hit(g,e,B.burnDPS*e.burnPower*dt);if(!e.active)continue;
  const width = (Math.min(visibleTroopers(p.squad), B.track.columns) - 1) * B.track.spacing / 2;
  const tail = Math.floor((visibleTroopers(p.squad) - 1) / B.track.columns) * B.track.rowSpacing;
  if (Math.abs(e.x - p.x) < e.r + p.r + width &&
      e.y > p.y - e.r - p.r && e.y < p.y + tail + e.r + p.r) {
    hurt(g, B.enemyDamage[e.type]*(1+B.challenge.damageGrowth*Math.max(0,e.stage-2)), e);
    // 接触不销毁敌人；冲过防线仍要扣除漏怪伤害。
    if (g.state !== 'playing') return;
  }
  if(p.aura&&distance2(e,p)<(B.auraRadius+e.r)**2){const eclipse=p.synergies.has('eclipse');hit(g,e,B.auraDPS*p.aura*auxiliaryPower(p)*dt*(eclipse?B.eclipseRatio:1));if(eclipse){e.burn=B.burnTime;e.burnPower=p.burn*auxiliaryPower(p);}}
  if(p.orbit&&orbit)for(let i=0;i<Math.min(B.maxSummons,p.orbit);i++){const a=g.time*2+i*Math.PI*2/Math.min(B.maxSummons,p.orbit);if((e.x-p.x-Math.cos(a)*B.orbitRadius)**2+(e.y-p.y-Math.sin(a)*B.orbitRadius)**2<(e.r+15)**2)hit(g,e,B.orbitDamage*p.orbit*auxiliaryPower(p));}
 }
 updateHazards(g,dt,hurt);if(g.state!=='playing')return;
 g.grid.rebuild(g.enemies.items);
 if(ability&&p.synergies.has('laser')){const dx=Math.cos(p.angle),dy=Math.sin(p.angle);effect(g,{x:p.x,y:p.y,x2:p.x+dx*1500,y2:p.y+dy*1500,color:P.bullet,life:.25,max:.25,width:12});for(const e of g.enemies.items)if(e.active){const x=e.x-p.x,y=e.y-p.y;if(x*dx+y*dy>0&&Math.abs(x*dy-y*dx)<e.r+10)hit(g,e,p.damage*B.laserRatio*p.shots*auxiliaryPower(p));}}
 for(const b of g.bullets.items)if(b.active){b.px=b.x;b.py=b.y;b.life-=dt;if(b.life<=0||b.x<-160||b.x>880||b.y<-160||b.y>1440){b.active=false;continue;}
  if(false&&p.homing&&!g.runway.rows.some(row=>row.y<b.y&&row.gates.some(gate=>Math.abs(gate.x-b.x)<B.track.gateHalfWidth))){const t=nearest(g,b.x,b.y);if(t){const a=Math.atan2(t.y-b.y,t.x-b.x),delta=Math.atan2(Math.sin(a-b.angle),Math.cos(a-b.angle));b.angle+=clamp(delta,-B.homingTurn*dt,B.homingTurn*dt);b.vx=Math.cos(b.angle)*B.bulletSpeed;b.vy=Math.sin(b.angle)*B.bulletSpeed;}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.enemy){if(distance2(b,p)<(p.r+7)**2){b.active=false;hurt(g,b.damage);}continue;}
  if(hitLoot(g,b))continue;
  if (g.runway.intercept(b, g, drum => {
    g.fx.ring(drum.x, drum.y, P.bomber);
    g.fx.burst(drum.x, drum.y, P.bomber, 28, 260);
    g.shake = B.hitShake;
    audio.play('boss');
    for (const enemy of g.enemies.items) {
      if (enemy.active && distance2(enemy, drum) < B.track.blastRadius ** 2)
        hit(g, enemy, Math.max(B.track.blastDamage,enemy.maxHP*B.challenge.barrelHealthRatio));
    }
  })) continue;
  g.grid.query(b.x,b.y,100,e=>{if(!b.active||b.hits.has(e.id))return;const dx=b.x-b.px,dy=b.y-b.py,t=clamp(((e.x-b.px)*dx+(e.y-b.py)*dy)/(dx*dx+dy*dy||1),0,1);if((b.px+dx*t-e.x)**2+(b.py+dy*t-e.y)**2<(e.r+4+(p.bulletRadius||0))**2){b.hits.add(e.id);const crit=Math.random()<p.crit;const perShot=b.damage*(crit?B.critMultiplier:1)*directMultiplier(p,e);
    const needed=BigInt(Math.max(1,Math.ceil((e.hp+(e.shield||0)/(p.pierce>=B.challenge.shieldPierce||p.explosive?1:B.challenge.shieldResistance))/(perShot*armorFactor(e)))));
    const used=b.mass<needed?b.mass:needed;
    hit(g,e,perShot*Number(used),crit,true);
    if(b.pierce<=0)b.mass-=used;else b.pierce--;
    if(!b.mass)b.active=false;}});
 }
 for(const gem of g.gems.items)if(gem.active){gem.px=gem.x;gem.py=gem.y;if(!gem.pull)gem.y+=B.track.scroll*dt;if(gem.y>1280){gem.active=false;continue;}const d=Math.hypot(p.x-gem.x,p.y-gem.y);if(d<p.magnet)gem.pull=true;if(gem.pull){const step=Math.min(d,B.gemSpeed*dt);gem.x+=(p.x-gem.x)/(d||1)*step;gem.y+=(p.y-gem.y)/(d||1)*step;if(Math.random()<g.fx.quality*.2)g.fx.burst(gem.x,gem.y,P.player,1,15);}if(d<24){gem.active=false;p.xp+=gem.value*(1+p.xpBonus);g.coins+=gem.coins||0;}}
 for(const c of g.corpses.items)if(c.active){c.life-=dt;if(c.life<=0)c.active=false;}
 for(let i=g.effects.length-1;i>=0;i--){g.effects[i].life-=dt;if(g.effects[i].life<=0)g.effects.splice(i,1);}
 p.hp=Math.min(p.hp,Math.max(0,p.maxHP-(p.breachLoss||0)));
 if(p.xp>=p.nextXP&&g.state==='playing')g.levelUp();
}
export function drawEntities(g,c,alpha){drawLoot(g,c);
 for(const d of g.corpses.items)if(d.active){c.globalAlpha=d.life/B.corpseTime*.45;sprite(c,TYPES[d.type],d.x,d.y,d.angle,d.type===4?4:1,0,false);}c.globalAlpha=1;
 for(const gem of g.gems.items)if(gem.active){const x=lerp(gem.px,gem.x,alpha),y=lerp(gem.py,gem.y,alpha);sprite(c,'gem',x,y,0,B.encounter.gemScale,0,false);if(gem.coins){c.strokeStyle=P.gold;c.lineWidth=2;c.beginPath();c.arc(x,y,8,0,7);c.stroke();}}
 const p=g.p;if(p.aura){c.globalAlpha=.13;c.fillStyle=p.synergies.has('eclipse')?P.bomber:P.player;c.beginPath();c.arc(p.x,p.y,B.auraRadius,0,7);c.fill();c.globalAlpha=.6;c.strokeStyle=P.player;c.stroke();c.globalAlpha=1;}
 for(const e of g.enemies.items)if(e.active){const x=lerp(e.px,e.x,alpha),y=lerp(e.py,e.y,alpha);if(e.type>=3){c.globalAlpha=.35+.2*Math.sin(g.time*6);c.strokeStyle=P[TYPES[e.type]];c.lineWidth=e.type===4?4:2;c.beginPath();c.arc(x,y,e.r+9+Math.sin(g.time*5)*5,0,7);c.stroke();c.globalAlpha=1;}sprite(c,TYPES[e.type],x,y,-Math.PI/2+Math.sin(g.time*6+e.id)*.045,e.type===4?4:1,e.flash,g.fx.quality>.5);if(e.shield>0){if(e.shieldFlash>0){c.save();c.strokeStyle=P.gold;c.globalAlpha=.65;c.lineWidth=3;c.beginPath();c.arc(x,y,e.r+8+(1-e.shieldFlash/.25)*12,0,7);c.stroke();c.fillStyle=P.gold;c.font='bold 22px system-ui';c.textAlign='center';if(e.type===4)c.fillText('击破护盾后伤害生效',x,y-e.r-30);c.restore();}c.strokeStyle=P.gold;c.lineWidth=4;c.strokeRect(x-e.r-5,y-e.r-5,e.r*2+10,e.r*2+10);c.fillStyle=P.gold;c.fillRect(x-e.r,y+e.r+8,e.r*2*e.shield/e.maxShield,5);}if(e.type===4&&e.stage>=B.challenge.startStage){c.fillStyle=e.cycle<B.challenge.armorSeconds?P.gold:P.player;c.font='bold 20px system-ui';c.textAlign='center';c.fillText(e.cycle<B.challenge.armorSeconds?'硬化装甲':'核心暴露 · 集火',x,y-e.r-24);}if(e.freeze>0){c.strokeStyle=P.blue;c.strokeRect(x-e.r,y-e.r,e.r*2,e.r*2);}if(e.type!==4&&e.hp<e.maxHP){c.fillStyle=P.bg;c.fillRect(x-e.r,y-e.r-10,e.r*2,4);c.fillStyle=P.hp;c.fillRect(x-e.r,y-e.r-10,e.r*2*e.hp/e.maxHP,4);}}
 for(const b of g.bullets.items)if(b.active){c.strokeStyle=b.enemy?P.boss:P.bullet;c.globalAlpha=.3;c.lineWidth=b.enemy?5:b.mass>1n?3:2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.035,b.y-b.vy*.035);c.stroke();c.globalAlpha=1;if(b.enemy){sprite(c,'hostile',lerp(b.px,b.x,alpha),lerp(b.py,b.y,alpha),b.angle,.6,0,g.fx.quality>.5);}else sprite(c,'bullet',lerp(b.px,b.x,alpha),lerp(b.py,b.y,alpha),b.angle,.48,0,false);}
 for(let i=0;i<Math.min(p.drone,B.maxSummons);i++){const a=g.time+i*6.28/Math.min(p.drone,B.maxSummons);sprite(c,'drone',p.x+Math.cos(a)*65,p.y+Math.sin(a)*65,p.angle);}
 for(let i=0;i<Math.min(p.orbit,B.maxSummons);i++){const a=g.time*2+i*6.28/Math.min(p.orbit,B.maxSummons);sprite(c,'drone',p.x+Math.cos(a)*B.orbitRadius,p.y+Math.sin(a)*B.orbitRadius,a,.65);}
 drawSquad(c,p,alpha);drawHazards(g,c);
 c.save();c.globalCompositeOperation='lighter';for(const e of g.effects){c.globalAlpha=e.life/e.max;c.strokeStyle=e.color;c.lineWidth=e.width;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x2,e.y2);c.stroke();}c.restore();
}

```

## js/game.js
```
import {stageBrief} from './challenge.js';
import { restoreProgress, captureProgress } from './progression.js';
import {BALANCE as B,PALETTE as P} from './config.js';
import {clamp,rand} from './utils.js';
import {assets,sprite} from './assets.js';
import {Particles} from './particles.js';
import {player,initEntities,spawnEnemy,updateEntities,drawEntities} from './entities.js';
import {choices,SYNERGIES,canChoose,specialization} from './upgrades.js';
import {Mode} from './modes.js';
import {UI} from './ui.js';
import {audio} from './audio.js';
import {save} from './save.js';
import { Runway, visibleTroopers } from './runway.js';

/** 横移采用相对拖动，手指可以从屏幕任意位置开始，不会在按下瞬间传送小队。 */
export class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.reset();
    const canvas = game.canvas;
    canvas.addEventListener('pointerdown', event => {
      if (game.state !== 'playing' || this.pointer !== null) return;
      audio.unlock();
      canvas.setPointerCapture(event.pointerId);
      this.pointer = event.pointerId;
      this.anchor = this.logicalX(event);
      this.origin = this.target = game.p.x;
    });
    canvas.addEventListener('pointermove', event => {
      if(event.pointerId===this.pointer){this.target=this.origin+this.logicalX(event)-this.anchor;this.move(game.p,0);game.p.px=game.p.x;}
    });
    const release = event => {
      if (event.pointerId !== this.pointer) return;
      if (event.type === 'pointerup') {
        this.target = this.origin + this.logicalX(event) - this.anchor;
        this.move(game.p,0);game.p.px=game.p.x;this.pointer=null;this.target=null;
      } else this.reset();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      canvas.addEventListener(type, release);
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLTextAreaElement) return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
        this.keys.add(event.code);
        if (game.state === 'playing') event.preventDefault();
      }
      if (event.code === 'Escape' && !event.repeat) {
        if (game.state === 'playing') game.pause();
        else if (game.state === 'paused') game.resume();
      }
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());
  }

  logicalX(event) {
    const bounds = this.game.canvas.getBoundingClientRect();
    return 360+((event.clientX - bounds.left) * B.width / bounds.width-360)/(.68+.32*B.track.playerY/B.height);
  }

  reset() {
    this.pointer = null;
    this.target = null;
    this.keys.clear();
  }

  move(player, dt) {
    const step = player.speed * B.track.strafeFactor * dt;
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const delta = this.target === null ? (Number(right) - Number(left)) * step
                                      : this.target - player.x;
    const edge = 47 + (Math.min(visibleTroopers(player.squad), B.track.columns) - 1) * B.track.spacing / 2;
    player.x = clamp(player.x + delta, edge, B.width - edge);
    if (this.pointer === null && this.target !== null &&
        Math.abs(player.x - clamp(this.target, edge, B.width - edge)) < 0.1) this.target = null;
  }
}
export class Game{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.scene=document.createElement('canvas');this.scene.width=720;this.scene.height=1280;this.sceneCtx=this.scene.getContext('2d',{alpha:false});this.state='menu';this.time=0;this.fps=60;this.freeze=0;this.shake=0;this.fx=new Particles();initEntities(this);this.input=new Input(this);this.ui=new UI(this);this.acc=0;this.last=0;this.hudClock=0;this.qualityClock=0;this.visualTime=0;this.backgroundPause=false;this.resize();window.addEventListener('resize',()=>this.resize());window.visualViewport?.addEventListener('resize',()=>this.resize());this.nativeHidden=false;this.suspended=document.hidden;
 document.addEventListener('visibilitychange',()=>this.syncVisibility());this.ui.menu();this.frame(performance.now());}
 setNativeHidden(hidden) {
   this.nativeHidden = Boolean(hidden);
   this.syncVisibility();
 }

 syncVisibility() {
   const hidden = document.hidden || this.nativeHidden;
   if (hidden === this.suspended) return;
   this.suspended = hidden;
   this.acc = 0;
   this.last = 0;
   if (hidden) {
     if(this.mode?.kind==='endless'&&['playing','paused'].includes(this.state))this.checkpointEndless();
     this.backgroundPause = this.state === 'playing';
     if (this.backgroundPause) this.state = 'background';
     this.input.reset();
     cancelAnimationFrame(this.raf);
     this.raf = 0;
     audio.ctx?.suspend().catch(() => {});
   } else {
     if (this.backgroundPause && this.state === 'background') this.state = 'playing';
     this.backgroundPause = false;
     audio.ctx?.resume().catch(() => {});
     this.frame(performance.now());
   }
 }
 detailScale(){return this.fx.quality<.45?.7:this.fx.quality<.65?.85:1;}
 resize(){const host=document.querySelector('#viewport').getBoundingClientRect(),scale=Math.min(host.width/B.width,host.height/B.height);document.documentElement.style.setProperty('--touch-min',Math.ceil(48/Math.max(.25,scale))+'px');document.querySelector('#stage').style.transform=`scale(${scale})`;this.pixelRatio=Math.min(B.dpr,window.devicePixelRatio||1);this.renderDetail=this.detailScale();const res=Math.min(1,scale)*this.pixelRatio*this.renderDetail;this.canvas.width=Math.round(B.width*res);this.canvas.height=Math.round(B.height*res);this.ctx.setTransform(this.canvas.width/B.width,0,0,this.canvas.height/B.height,0,0);}
 start(kind,stage=1){this.mode=new Mode(kind,stage);this.p=player();this.p.upgradeHistory=[];this.p.pendingUpgrades=0;this.claiming=false;this.offers=null;if(kind==='campaign')restoreProgress(this.p,save.data.campaign);else if(save.data.endless)restoreProgress(this.p,save.data.endless.progress);this.runway=new Runway(this.p.squad);this.runway.rows=[];this.runway.serial=0;this.runway.addRow(475,this.p.squad,this.p);if(stage===1&&kind==='campaign'){this.runway.rows[0].gates[0].stat='rate';this.runway.rows[0].gates[0].value=2n;}this.loot=[];this.lootSerial=0;this.lootClock=B.director.lootFirst;this.healClock=B.director.healFirst;this.turrets=[];this.time=0;this.edgeWarning=0;this.leaks=0;this.score=0;this.coins=0;this.kills=0;this.freeze=0;this.shake=0;this.acc=0;for(const pool of [this.enemies,this.bullets,this.gems,this.corpses,this.hazards])pool.clear();this.fx.clear();this.effects.length=0;this.nextEliteStrike=0;this.state='playing';this.input.reset();this.ui.show('');this.ui.setupHUD();if(kind==='endless'&&save.data.endless)this.restoreEndless(save.data.endless);else{this.mode.next(this);this.runway.openingConvoy(this);}this.ui.update();this.ui.toast(stageBrief(stage));audio.unlock();}
 spawnEnemy(type){const e=spawnEnemy(this,type);if(e&&type===4){audio.play('boss');this.ui.toast('重甲首领入场');}return e;}
 pause(){if(this.state!=='playing')return;this.claiming=false;this.state='paused';this.acc=0;this.input.reset();this.ui.paused();}
 resume(){if(this.state!=='paused')return;this.state='playing';this.acc=0;this.last=performance.now();this.ui.show('');}
 /** 等级只积攒领取次数；不改变模拟状态，不弹窗、不重置触摸。 */
 levelUp(){const p=this.p;while(p.xp>=p.nextXP&&Number.isFinite(p.nextXP)){p.xp-=p.nextXP;p.nextXP=Math.ceil(p.nextXP*B.xpGrowth);p.level++;/* 等级提升不催生补给，独立刷新时钟。 */}this.persistGrowth();}
 persistGrowth(){if(this.mode.kind==='campaign'){save.data.campaign=captureProgress(this.p,save.data.campaign);save.write();}}
 openUpgrades(){if(this.state!=='playing'||!this.p.pendingUpgrades)return;this.claiming=true;this.offers=this.offers?.length?this.offers:choices(this.p);this.ui.upgrade(this.offers);}
 closeUpgrades(){this.claiming=false;this.ui.overlay.innerHTML='';}
 reroll(){if(this.claiming&&this.state==='playing'&&this.p.rerolls>0&&!this.offers.every(u=>u.group==='专精')){this.p.rerolls--;this.offers=choices(this.p);this.persistGrowth();this.ui.upgrade(this.offers);}}
 applyUpgrade(u){if(!this.p.pendingUpgrades||!canChoose(this.p,u))return false;u.apply(this.p);this.p.hp=Math.min(this.p.hp,this.p.maxHP-(this.p.breachLoss||0));this.p.upgradeHistory.push(u.id);this.p.pendingUpgrades--;this.offers=null;for(const s of SYNERGIES)if(!this.p.synergies.has(s.id)&&s.test(this.p)){this.p.synergies.add(s.id);this.ui.toast(`${s.name} · ${s.desc}`);}return true;}
 choose(u){if(this.state!=='playing'||!this.claiming||!this.offers.includes(u))return;if(!this.applyUpgrade(u))return;this.persistGrowth();if(this.p.pendingUpgrades)this.openUpgrades();else this.closeUpgrades();audio.play('upgrade');}
 /** 批领只从每次真实三选一卡中选取：优先专精进阶，其次低等级；专精由玩家亲选。 */
 claimAll(){if(this.state!=='playing'||!this.claiming)return;let count=0;const names=new Map();while(this.p.pendingUpgrades){const offered=this.offers;if(!offered.length||offered.every(u=>u.group==='专精'))break;const ranked=[...offered].sort((a,b)=>(b.group!=='基础')-(a.group!=='基础')||this.p.upgradeHistory.filter(id=>id===a.id).length-this.p.upgradeHistory.filter(id=>id===b.id).length);const u=ranked[0];if(!this.applyUpgrade(u))break;count++;names.set(u.name,(names.get(u.name)||0)+1);this.offers=choices(this.p);}this.persistGrowth();if(this.p.pendingUpgrades)this.ui.upgrade(this.offers);else this.closeUpgrades();this.ui.toast(count?`已领取 ${count} 项：${[...names].map(([n,k])=>n+'×'+k).join('、')}`:'请先亲自选择专精');}
 /** 主动结算只支付本次新增金币；敌人血量、波次与生命原样续接。 */
 checkpointEndless(){if(this.mode?.kind!=='endless'||this.state==='ended'||this.p.hp<=0)return;save.data.endless=this.endlessSnapshot();save.data.coins=Math.min(Number.MAX_SAFE_INTEGER,save.data.coins+this.coins);this.coins=0;save.write();}
 exitEndless(){if(this.mode.kind!=='endless')return;this.finish(false,true);this.ui.menu();this.ui.toast('无限进度已保存、信用点已结算；购买后可续战');}
 endlessSnapshot(){return {lootSerial:this.lootSerial||0,hazards:this.hazards.items.filter(h=>h.active).map(({owner,...h})=>h),x:this.p.x,kills:this.kills,leaks:this.leaks,loot:this.loot.map(o=>({...o})),turrets:this.turrets.map(t=>({...t})),rows:this.runway.rows.map(r=>({...r,gates:r.gates.map(t=>({...t,value:String(t.value),charge:String(t.charge||0),scale:String(t.scale||10)}))})),drums:this.runway.drums.map(d=>({...d})),progress:captureProgress(this.p,save.data.endless?.progress||save.data.campaign,true),wave:this.mode.wave,elapsed:this.mode.elapsed,time:this.time,remaining:this.mode.remaining,budget:this.mode.budget,bossSpawned:this.mode.bossSpawned,spawnTimer:this.mode.spawnTimer,enemies:this.enemies.items.filter(e=>e.active).map(e=>({...e})),hp:this.p.hp,breachLoss:this.p.breachLoss||0,score:this.score,gateWait:Math.max(8,this.runway.nextRow),lootWait:Math.max(8,this.lootClock),healWait:Math.max(8,this.healClock)};}
 restoreEndless(s){const m=this.mode;m.wave=s.wave-1;m.local=s.wave-1;m.next(this);Object.assign(m,{elapsed:s.elapsed,remaining:s.remaining,budget:s.budget,bossSpawned:s.bossSpawned,spawnTimer:s.spawnTimer??1});this.time=s.time;this.score=s.score;this.lootSerial=s.lootSerial||0;this.p.x=this.p.px=s.x??192;this.kills=s.kills||0;this.leaks=s.leaks||0;this.loot=s.loot||[];this.turrets=s.turrets||[];this.p.hp=s.hp;this.p.breachLoss=s.breachLoss;this.serial=0;for(const data of s.enemies){this.enemies.take({...data,active:true,px:data.x,py:data.y});this.serial=Math.max(this.serial,data.id);}for(const h of s.hazards||[]){const owner=this.enemies.items.find(e=>e.active&&e.id===h.ownerId);if(owner)this.hazards.take({...h,owner});}this.runway.rows=(s.rows||[]).map(r=>({...r,gates:r.gates.map(t=>({...t,value:BigInt(t.value),charge:BigInt(t.charge||0),scale:BigInt(t.scale||10)}))}));this.runway.drums=s.drums||[];this.runway.nextRow=s.gateWait??32;this.lootClock=s.lootWait??B.director.lootFirst;this.healClock=s.healWait??B.director.healFirst;}
 finish(win,exiting=false){if(this.state==='ended')return;this.state='ended';this.input.reset();if(win){this.coins+=B.stageCoins*this.mode.stage;}this.claiming=false;this.levelUp();const d=save.data;if(this.mode.kind==='campaign')d.campaign=captureProgress(this.p,d.campaign,win,this.mode.stage);d.coins=Math.min(Number.MAX_SAFE_INTEGER,d.coins+this.coins);if(win&&this.mode.kind==='campaign')d.stage=Math.max(d.stage,Math.min(B.stages,this.mode.stage+1));if(this.mode.kind==='endless'){d.endless=exiting&&this.p.hp>0?this.endlessSnapshot():null;d.best=Math.max(d.best,this.score);d.top.push(this.score);d.top.sort((a,b)=>b-a);d.top=d.top.slice(0,10);}save.write();this.ui.result(win);if(save.warning)this.ui.toast(save.warning);}
 /** 固定60Hz模拟，累加器最多补6步，避免长帧死亡螺旋；渲染插值上个/当前坐标。 */
 frame(now){if(document.hidden||this.suspended)return;const raw=this.last?(now-this.last)/1000:1/60,dt=clamp(raw,0,.1);this.last=now;this.visualTime+=dt;this.fps=this.fps*.95+(1/Math.max(.001,raw))*.05;
  this.qualityClock+=dt;if(this.qualityClock>2){this.qualityClock=0;if(this.fps<B.qualityLowFPS)this.fx.quality=Math.max(B.qualityMin,this.fx.quality-.15);else if(this.fps>B.qualityHighFPS)this.fx.quality=Math.min(1,this.fx.quality+.05);if(this.detailScale()!==this.renderDetail)this.resize();}
  if(this.state==='playing'){if(this.freeze>0)this.freeze=Math.max(0,this.freeze-dt);else{this.acc+=dt;let steps=0;while(this.acc>=B.step&&steps<B.maxSteps&&this.state==='playing'){this.time+=B.step;this.edgeWarning=Math.max(0,(this.edgeWarning||0)-B.step);this.mode.update(this,B.step);if(this.state==='playing')updateEntities(this,B.step);this.fx.update(B.step);this.shake*=Math.exp(-B.shakeDecay*B.step);this.acc-=B.step;steps++;if(this.freeze>0)break;}if(steps===B.maxSteps)this.acc=0;}}else this.acc=0;
  this.render(this.state==='playing'?clamp(this.acc/B.step,0,1):1);this.hudClock+=dt;if(this.hudClock>.1){this.hudClock=0;this.ui.update();}this.raf=requestAnimationFrame(t=>this.frame(t));}
 render(alpha){const c=this.ctx;c.drawImage(assets.background,0,0);c.save();c.globalAlpha=.25;c.strokeStyle=P.grid;c.lineWidth=1;const offset=(this.visualTime*12)%80;for(let x=0;x<720;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,1280);c.stroke();}for(let y=offset;y<1280;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(720,y);c.stroke();}c.globalAlpha=.08;c.fillStyle=P.ui;const scan=(this.visualTime*45)%1400;c.fillRect(0,scan,720,2);c.restore();
  if(this.p&&this.state!=='menu'){const world=this.sceneCtx;world.fillStyle=P.road;world.fillRect(0,0,720,1280);this.runway.drawRoad(world,this.time);world.save();if(this.shake>.1)world.translate(rand(-this.shake,this.shake),rand(-this.shake,this.shake));drawEntities(this,world,alpha);this.runway.draw(world,alpha,this.p);this.fx.draw(world);world.restore();
   // 64条水平带近似透视，所有对象一起投影，视觉与命中位置一致；无运行时滤镜。
   const bands=this.fx.quality<.5?40:64,h=1280/bands;for(let i=0;i<bands;i++){const y=i*h,scale=.68+.32*(y+h/2)/1280,w=720*scale;c.drawImage(this.scene,0,y,720,h,(720-w)/2,y,w,h+.5);}
  }else{sprite(c,'player',360,1040,-Math.PI/2,2,0);}
  c.globalAlpha=.25;c.drawImage(assets.vignette,0,0);c.globalAlpha=1;if(this.edgeWarning>0){c.globalAlpha=Math.min(.9,this.edgeWarning/B.breachWarning);c.drawImage(assets.warning,0,0);c.globalAlpha=1;}}
}

```

## js/icons.js
```
import {PALETTE as P} from './config.js';
export const icons={};
/** 所有徽章在启动时一次烘焙，战斗中仅drawImage，无滤镜。 */
export function initIcons(){for(const id of ['damage','rate','range','magnet','pierce','multi','breaker','slow','blast','focus','close','execute','recruit','turret','grenade','laser','hp','speed','luck','rerolls','weapon']){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');const color=['laser','luck','recruit','execute'].includes(id)?P.gold:['grenade','blast','damage'].includes(id)?P.bomber:P.player;
 const grad=c.createLinearGradient(0,0,128,128);grad.addColorStop(0,P.grid);grad.addColorStop(1,P.bg);c.fillStyle=grad;c.beginPath();c.roundRect(5,5,118,118,22);c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();c.globalAlpha=.15;c.fillStyle=color;c.beginPath();c.arc(64,64,45,0,7);c.fill();c.globalAlpha=1;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=7;c.lineCap='round';c.lineJoin='round';
 const line=points=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 if(['weapon','damage','close','focus'].includes(id)){c.fillRect(25,43,72,18);c.fillRect(43,59,17,30);c.fillStyle=P.secondary;c.fillRect(31,38,54,6);line([[80,70],[98,70]]);if(id==='focus'){c.strokeRect(17,25,92,75);}}
 else if(['rate','speed'].includes(id)){line([[31,32],[61,64],[31,96]]);line([[64,32],[94,64],[64,96]]);}
 else if(['grenade','blast'].includes(id)){c.beginPath();c.ellipse(64,73,26,32,0,0,7);c.fill();c.fillStyle=P.panel;c.fillRect(40,62,48,6);c.fillRect(40,78,48,6);c.fillStyle=P.secondary;c.fillRect(53,30,23,16);line([[68,26],[92,32],[98,50]]);}
 else if(['hp','breaker'].includes(id)){c.beginPath();c.moveTo(64,22);c.lineTo(97,36);c.lineTo(89,81);c.lineTo(64,106);c.lineTo(39,81);c.lineTo(31,36);c.closePath();c.stroke();line(id==='hp'?[[48,64],[80,64]]:[[70,38],[53,62],[76,64],[57,90]]);if(id==='hp')line([[64,48],[64,80]]);}
 else if(id==='magnet'){c.beginPath();c.arc(64,69,29,0,Math.PI);c.stroke();line([[35,69],[35,31]]);line([[93,69],[93,31]]);c.fillStyle=P.white;c.fillRect(29,28,12,12);c.fillRect(87,28,12,12);}
 else if(id==='turret'){c.fillRect(37,61,54,24);c.fillRect(57,25,14,44);line([[45,86],[31,104]]);line([[83,86],[97,104]]);}
 else if(id==='recruit'){c.beginPath();c.arc(57,43,16,0,7);c.fill();c.beginPath();c.arc(57,93,27,Math.PI,0);c.fill();line([[93,50],[93,78]]);line([[79,64],[107,64]]);}
 else if(id==='luck'){for(const [x,y] of [[50,45],[78,45],[50,73],[78,73]]){c.beginPath();c.arc(x,y,17,0,7);c.fill();}line([[65,76],[59,104]]);}
 else if(id==='laser'){line([[29,99],[84,44]]);c.lineWidth=14;line([[42,88],[93,37]]);c.strokeStyle=P.white;c.lineWidth=3;line([[32,100],[100,32]]);line([[90,18],[90,28]]);line([[103,36],[113,36]]);}
 else if(id==='slow'){for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[64,64],[64+36*Math.cos(a),64+36*Math.sin(a)]]);}}
 else{const n=id==='multi'?3:1;for(let i=0;i<n;i++){const x=64+(i-(n-1)/2)*24;c.beginPath();c.moveTo(x-8,89);c.lineTo(x-8,49);c.lineTo(x,29);c.lineTo(x+8,49);c.lineTo(x+8,89);c.closePath();c.fill();}if(id==='range'){c.strokeRect(24,21,80,83);}if(id==='pierce'||id==='execute')line([[27,66],[101,66]]);}
 c.fillStyle=P.white;c.globalAlpha=.45;c.fillRect(20,15,25,2);c.globalAlpha=1;icons[id]={canvas,url:canvas.toDataURL()};}}
export const iconHTML=id=>icons[id]?`<img class="item-icon" src="${icons[id].url}" alt="">`:'';

```

## js/loot.js
```
import {weaponStats,bulletFlow} from './combat.js';
import {icons} from './icons.js';
import {UPGRADES} from './upgrades.js';
import {BALANCE as B,PALETTE as P} from './config.js';
import {hit} from './entities.js';
const pool=['damage','rate','pierce','range','blast','slow','breaker','focus','close','execute','multi','magnet','recruit','turret','grenade','laser'];
export const unlockHits=(id,p)=>Math.ceil(Math.max(p&&bulletFlow(p)<12?({grenade:6,laser:12,turret:8,recruit:180}[id]??5):(B.lootCost[id]??24),p?bulletFlow(p)*({grenade:4,laser:8,turret:6,recruit:12}[id]??2):0));
export {weaponStats} from './combat.js';
export function rollLoot(luck=0,random=Math.random){if(random()<.003)return 'recruit';const advanced=['blast','breaker','focus','execute','multi','turret','grenade','laser'];const basic=['damage','rate','pierce','range','slow','close','magnet'];const set=random()<Math.min(1,.18+luck)?advanced:basic;return set[Math.floor(random()*set.length)];}
const names={heal:'医疗补给',recruit:'增援队员',turret:'固定炮台',grenade:'集束手雷',laser:'一次性激光炮'};
/** 补给独立随机刷新；命中扣弹数，解锁后仍须移动接取。 */
export function updateLoot(g,dt){
 g.loot??=[];g.turrets??=[];g.lootClock=(g.lootClock??B.director.lootFirst)-dt;
 if(g.lootClock<=0&&g.loot.length<2){const late=g.p.shots>=3||bulletFlow(g.p)>40;g.lootClock=(late?B.director.lateLootInterval:B.director.lootInterval)+Math.random()*(late?B.director.lateLootJitter:B.director.lootJitter);const serial=g.lootSerial||0;g.lootSerial=serial+1;const rolled=serial%2===0?['grenade','turret','laser'][Math.floor(serial/2)%3]:rollLoot(g.p.luck),id=rolled==='rate'&&weaponStats(g.p).rate>=B.director.rateCap?'damage':rolled;g.loot.push({x:180+Math.random()*360,y:140,id,hits:unlockHits(id,g.p),total:unlockHits(id,g.p),lastHit:-Infinity,age:0});}
 g.healClock=(g.healClock??B.director.healFirst)-dt;if(g.healClock<=0){g.healClock=B.director.healInterval;if(g.p.hp<g.p.maxHP&&!g.loot.some(o=>o.id==='heal'))g.loot.push({x:180+Math.random()*360,y:180,id:'heal',hits:0,age:0});}
 for(let i=g.loot.length-1;i>=0;i--){const o=g.loot[i];o.age=(o.age||0)+dt;o.y+=150*dt*(o.hits>0&&g.time-(o.lastHit??-Infinity)<.85&&o.age<25?.25:1);if(o.hits===0&&Math.abs(o.x-g.p.x)<65&&Math.abs(o.y-g.p.y)<45){
 if(o.id==='heal'){g.p.breachLoss=Math.max(0,(g.p.breachLoss||0)-B.director.healAmount);g.p.hp=Math.min(g.p.maxHP-(g.p.breachLoss||0),g.p.hp+B.director.healAmount);}
 const u=UPGRADES.find(u=>u.id===o.id);if(u&&!u.active){u.apply(g.p);g.p.upgradeHistory.push(u.id);g.persistGrowth();}
 if(o.id==='recruit')g.p.squad+=1n;
 if(['turret','grenade','laser'].includes(o.id)){g.p.inventory??={};g.p.inventory[o.id]=(g.p.inventory[o.id]||0)+1;g.persistGrowth();}
 g.ui.toast('获得 '+(u?.name||names[o.id]));g.loot.splice(i,1);
 }else if(o.y>1250)g.loot.splice(i,1);}
 for(let i=g.turrets.length-1;i>=0;i--){const t=g.turrets[i];t.life-=dt;t.fire-=dt;if(t.life<=0){g.turrets.splice(i,1);continue;}if(t.fire<=0){t.fire=.2;const b=g.bullets.take({x:t.x,y:t.y,px:t.x,py:t.y,vx:0,vy:-760,angle:-Math.PI/2,damage:weaponStats(g.p).damage,mass:1n,life:2,pierce:1,enemy:false});b?.hits.clear();}}
}
export function hitLoot(g,b){if(b.enemy)return false;for(const o of g.loot||[])if(o.hits>0&&Math.abs(b.x-o.x)<50&&b.py>=o.y-35&&b.y<=o.y+35){const used=(b.mass??1n)<BigInt(o.hits)?(b.mass??1n):BigInt(o.hits);o.hits-=Number(used);b.mass=(b.mass??1n)-used;o.lastHit=g.time;if(b.mass===0n)b.active=false;return !b.active;}return false;}
export function drawLoot(g,c){c.save();c.textAlign='center';for(const o of g.loot||[]){c.fillStyle=P.panel;c.strokeStyle=o.hits?P.gold:P.player;c.lineWidth=4;c.fillRect(o.x-55,o.y-40,110,80);c.strokeRect(o.x-55,o.y-40,110,80);c.fillStyle=o.hits?P.gold:P.player;c.font='bold 23px system-ui';if(icons[o.id]||o.id==='heal')c.drawImage((icons[o.id]||icons.hp).canvas,o.x-35,o.y-39,70,70);c.fillText(o.hits?'-'+o.hits:'接取',o.x,o.y+62);c.font='18px system-ui';c.fillText(UPGRADES.find(u=>u.id===o.id)?.name||names[o.id],o.x,o.y-55);}for(const t of g.turrets||[]){c.fillStyle=P.blue;c.fillRect(t.x-22,t.y-14,44,28);c.fillStyle=P.gold;c.fillRect(t.x-5,t.y-45,10,38);}c.restore();}

/** 仅按钮主动释放，拾取和刷新不触发。 */
export function useItem(g,id){if(g.state!=='playing'||!['turret','grenade','laser'].includes(id)||!(g.p.inventory?.[id]>0))return false;g.p.inventory[id]--;g.persistGrowth();
 if(id==='turret')g.turrets.push({x:g.p.x,y:g.p.y-80,life:12,fire:0});
 else{g.fx.ring(g.p.x,g.p.y,P.gold);for(const e of g.enemies.items)if(e.active&&(id==='grenade'?Math.hypot(e.x-g.p.x,e.y-(g.p.y-260))<260:Math.abs(e.x-g.p.x)<90))hit(g,e,weaponStats(g.p).damage*30,false,true);g.effects.push({x:g.p.x,y:g.p.y,x2:g.p.x,y2:id==='laser'?0:g.p.y-260,color:P.gold,life:.5,max:.5,width:id==='laser'?70:12});}
 g.ui.toast('使用 '+names[id]);g.ui.update?.();return true;
}

```

## js/main.js
```
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

window.addEventListener('pagehide',()=>game.checkpointEndless());

```

## js/modes.js
```
import {combatProfile} from './combat.js';
import { healthPressure } from './challenge.js';
import { armyPressure } from './runway.js';
import { BALANCE as B } from './config.js';

/** 等级只小幅增加尸潮数量；关卡决定基础强度，成长不会被同倍率抵消。 */
export function difficulty(mode, level = 1, squad = B.track.startSquad) {
  const stage = mode.kind === 'campaign' ? mode.stage : 1 + Math.floor((mode.wave - 1) / B.wavesPerStage);
  const local = mode.kind === 'campaign' ? mode.local : 1 + (mode.wave - 1) % B.wavesPerStage;
  const power = Math.max(0, level - 1);
  const extra=Math.max(0,(typeof squad==='bigint'?armyPressure(squad):Number(squad))-B.adaptive.baseSquad);
  const result={
    population: Math.round(B.spawnCount + B.spawnGrowth * (stage - 1) ** B.spawnStagePower + B.spawnWaveGrowth * (local - 1) + B.spawnLevelGrowth * power + B.adaptive.budgetPerMember*extra),
    pack: Math.min(B.enemies, B.packBase + B.packStageGrowth * (stage - 1) + B.packWaveGrowth * (local - 1) + Math.floor(power / B.packLevelDivisor)+Math.floor(extra*B.adaptive.packPerMember)+(mode.aoe?4:0)),
    interval: Math.max(B.packMinInterval, B.packInterval / (1 + B.packIntervalStage * (stage - 1) + B.packIntervalWave * (local - 1) + B.packIntervalLevel * power + extra*B.adaptive.intervalPerMember)),
    stage, local
  };
  // 前四关的预算连续延伸；火力只小幅增加预算，不产生第五关的六倍突增。
  result.population=Math.min(result.population,12+local*6+(stage-1)*B.encounter.latePopulationStep);
  result.pack=Math.min(result.pack,stage+2,B.encounter.packCap);
  result.interval=Math.max(result.interval,stage<=4?[0,2.8,2.2,1.8,1.5][stage]:B.encounter.intervalFloor);
  return result;
}
export class Mode {
  constructor(kind, stage = 1) {
    this.kind = kind;
    this.stage = stage;
    this.local = 0;
    this.wave = kind === 'campaign' ? (stage - 1) * B.wavesPerStage : 0;
    this.started = false;
    this.pressureSquad = null;
    this.healthPressure = null;
  }

  next(game) {
    this.wave++;
    this.local++;
    this.elapsed = 0;
    this.spawnTimer = this.local === 1 && this.stage === 1 ? B.openingDelay : 1;
    if(this.pressureSquad===null)this.pressureSquad=combatProfile(game.p).pressure;
    if(this.healthPressure===null)this.healthPressure=healthPressure(game.p?.squad??B.track.startSquad);
    this.aoe=combatProfile(game.p).aoe;this.budget = difficulty(this, game.p?.level,this.pressureSquad).population;
    this.remaining = this.budget;this.fireHP??=combatProfile(game.p).hp;this.aoe=combatProfile(game.p).aoe;
    this.bossWave = this.kind === 'campaign'
      ? this.local === B.wavesPerStage
      : this.wave % B.bossEvery === 0;
    this.bossSpawned = false;
    this.warned = false;
    this.packet = 0;
    this.started = true;
    game.ui.toast('第 ' + this.wave + ' 波 · 尸潮 ' + this.remaining + ' 只');
  }

  spawnPack(game) {
    // 批次随等级和路段递增；第一波只出现普通小怪。
    const profile=combatProfile(game.p),columns=profile.columns;const center=[240,480,360][this.packet%3];
    const limit = Math.min(this.remaining, B.enemies - game.enemies.count, difficulty(this, game.p?.level,this.pressureSquad).pack);
    const stage=this.kind==='campaign'?this.stage:1+Math.floor((this.wave-1)/B.wavesPerStage);
    const scattered=stage>=B.director.scatterStage||profile.power>=B.director.scatterPower;
    this.packet++;
    for (let i = 0; i < limit; i++) {
      const roll = Math.random();
      const type = this.wave === 1 ? 0 : this.wave > 2 && roll > B.tankThreshold - Math.min(.35,Math.max(0,this.pressureSquad-2)*B.adaptive.elitePerMember) ? 2 :
        this.wave > 1 && roll < B.bomberChance ? 3 : roll < B.fastChance ? 1 : 0;
      const enemy = game.spawnEnemy(type);
      if (!enemy) break;
      enemy.x = enemy.px = scattered?B.track.hordeLeft+Math.random()*(B.track.hordeRight-B.track.hordeLeft):Math.max(B.track.hordeLeft,Math.min(B.track.hordeRight,center + (i%columns-(columns-1)/2)*38));
      enemy.y = enemy.py = stage<=4?(scattered?90-Math.random()*240:155-Math.floor(i/columns)*28+Math.random()*18):(scattered?B.encounter.spawnTop+Math.random()*B.encounter.spawnDepth:B.encounter.spawnTop+Math.floor(i/columns)*28+Math.random()*18);
      this.remaining--;
    }
  }

  update(game, dt) {
    if (!this.started) this.next(game);
    this.elapsed += dt;const profile=combatProfile(game.p);this.aoe=profile.aoe;this.fireHP=(this.fireHP??profile.hp)+(profile.hp-(this.fireHP??profile.hp))*(1-Math.exp(-dt/B.director.response));
    const target=combatProfile(game.p).pressure;
    this.pressureSquad+=(target-this.pressureSquad)*(1-Math.exp(-dt/B.adaptive.response));
    this.healthPressure+=(healthPressure(game.p?.squad??B.track.startSquad)-this.healthPressure)*(1-Math.exp(-dt/B.adaptive.response));
    const budget=difficulty(this,game.p?.level,this.pressureSquad).population;
    // 仅追加新增预算，已经投入的敌人不会消失；人数减少时后续批次会放缓。
    if(budget>this.budget){this.remaining+=budget-this.budget;this.budget=budget;}
    if (this.bossWave && !this.bossSpawned) {
      if (!this.warned && this.elapsed >= B.bossArrival - 3) {
        this.warned = true;
        game.ui.toast('关底巨兽接近 · 在突破防线前击破重甲');
      }
      if (this.elapsed >= B.bossArrival && game.enemies.count < B.enemies) {
        game.spawnEnemy(4);
        this.bossSpawned = true;
      }
    }
    this.spawnTimer -= dt;
    if (this.remaining > 0 && this.spawnTimer <= 0) {
      this.spawnPack(game);
      this.spawnTimer = difficulty(this, game.p?.level,this.pressureSquad).interval;
    }
    if (this.elapsed >= B.waveDuration && this.remaining === 0 && game.enemies.count === 0) {
      if (this.kind === 'campaign' && this.local >= B.wavesPerStage) game.finish(true);
      else this.next(game);
    }
  }
}

```

## js/particles.js
```
import {BALANCE as B,PALETTE as P} from './config.js';
import {Pool,rand} from './utils.js';
import {assets} from './assets.js';
export class Particles{
 constructor(){this.pool=new Pool(B.particles);this.numbers=new Pool(B.numbers);this.quality=1;}
 burst(x,y,color,count=12,speed=140){for(let i=0;i<Math.ceil(count*this.quality);i++){const a=rand(0,Math.PI*2),s=rand(20,speed),life=rand(.18,.6);this.pool.take({x,y,px:x,py:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color,ring:false,size:rand(2,5)});}}
 ring(x,y,color,radius=260){this.pool.take({x,y,px:x,py:y,vx:0,vy:0,life:.6,max:.6,color,ring:true,size:10,growth:(radius-10)/.6});}
 number(x,y,value,crit=false){this.numbers.take({x,y,start:y,life:.7,max:.7,value:value>=1e6?(value/1e6).toFixed(1)+'M':value>=1e4?(value/1e3).toFixed(0)+'K':String(Math.ceil(value)),crit});}
 update(dt){for(const p of this.pool.items)if(p.active){p.px=p.x;p.py=p.y;p.life-=dt;if(p.life<=0){p.active=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;if(p.ring)p.size+=p.growth*dt;}for(const p of this.numbers.items)if(p.active){p.life-=dt;p.y=p.start-48*(1-(p.life/p.max)**2);if(p.life<=0)p.active=false;}}
 draw(c){c.save();c.globalCompositeOperation='lighter';for(const p of this.pool.items)if(p.active){c.globalAlpha=p.life/p.max;if(p.ring){c.strokeStyle=p.color;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,p.size,0,7);c.stroke();}else{c.drawImage(assets.sparks[p.color],p.x,p.y,p.size,p.size);if(this.quality>.5)c.drawImage(assets.glows.gem,p.x-14,p.y-14,28,28);}}c.restore();for(const n of this.numbers.items)if(n.active){c.globalAlpha=Math.min(1,n.life*4);c.fillStyle=n.crit?P.crit:P.text;c.font=`bold ${n.crit?21:17}px monospace`;c.textAlign='center';c.fillText(n.value,n.x,n.y);}c.globalAlpha=1;}
 clear(){this.pool.clear();this.numbers.clear();}
}

```

## js/progression.js
```
import { normalizeSquad } from './runway.js';
import { BALANCE as B } from './config.js';
import { UPGRADES, SYNERGIES } from './upgrades.js';

export function freshProgress(){return {history:[],pending:0,xp:0,squad:'1',rerolls:null,nextStage:1};}
/** 只保存已选强化ID；从基础角色重放，避免跨关重复叠加永久商店属性。 */
export function validateProgress(data) {
  if (data === undefined) return freshProgress();
  if (!data || !Array.isArray(data.history) || data.history.length > 2000 ||
      !Number.isSafeInteger(data.pending??0) || (data.pending??0)<0 || (data.pending??0)>2000 ||
      !data.history.every(id => typeof id==='string') ||
      !Number.isFinite(data.xp) || data.xp < 0 ||
      typeof data.squad !== 'string' || !/^[1-9][0-9]*$/.test(data.squad) ||
      !(data.rerolls === null || (Number.isSafeInteger(data.rerolls) && data.rerolls >= 0)) ||
      !Number.isInteger(data.nextStage) || data.nextStage < 1 || data.nextStage > 15)
    throw Error('闯关成长存档不合法');
  return { history: data.history.filter(id=>UPGRADES.some(u=>u.id===id)&&!id.startsWith('spec_')&&!UPGRADES.find(u=>u.id===id).active), inventory:Object.fromEntries(["grenade","laser","turret"].map(k=>[k,Math.max(0,Math.min(999,Math.floor(Number(data.inventory?.[k])||0)))])),gateRate:Number.isFinite(data.gateRate)?data.gateRate:null,gateDamage:Number.isFinite(data.gateDamage)?data.gateDamage:null,level:Number.isSafeInteger(data.level)&&data.level>0&&data.level<=2000?data.level:data.history.length+1,pending:0,weapon:Math.max(1,Number.isSafeInteger(data.weapon)?data.weapon:1), xp: data.xp, squad: String(normalizeSquad(data.squad)), rerolls: data.rerolls, nextStage: Math.min(B.stages,data.nextStage) };
}
export function xpThreshold(level) {
  let need = B.xpBase;
  for (let i = 1; i < level; i++) need = Math.ceil(need * B.xpGrowth);
  return need;
}
export function restoreProgress(p, data) {
  p.upgradeHistory = [...data.history];
  for (const id of data.history) UPGRADES.find(u => u.id === id).apply(p);
  p.inventory={...(data.inventory||{})};p.pendingUpgrades=0;p.weapon=data.weapon||1;p.gateRate=data.gateRate??((p.weapon-1)*.18/p.rate);p.gateDamage=data.gateDamage??(p.damage*(p.weapon-1)*.3);
  p.level = data.level||data.history.length+1;
  p.nextXP = xpThreshold(p.level);
  p.xp = data.xp;
  p.squad = normalizeSquad(data.squad);p.homing=0;
  if (data.rerolls !== null) p.rerolls = data.rerolls;
  p.hp = p.maxHP;
  for (const s of SYNERGIES) if (s.test(p)) p.synergies.add(s.id);
  return p;
}
/** 失败保留已选强化和经验；过关才更新下关的编队快照。 */
export function captureProgress(p, previous, won = false, stage = 1) {
  return { history: [...(p.upgradeHistory || [])], inventory:{...(p.inventory||{})},gateRate:p.gateRate||0,gateDamage:p.gateDamage||0,level:p.level,pending:0,weapon:p.weapon||1, xp: p.xp,
    squad: won ? String(normalizeSquad(p.squad > 0n ? p.squad : 1n)) : String(normalizeSquad(previous.squad)),
    rerolls: p.rerolls, nextStage: won ? Math.min(B.stages, stage + 1) : previous.nextStage };
}

```

## js/runway.js
```
import {gateNeed,applyGate} from './combat.js';
import {icons} from './icons.js';
import {weaponStats} from './loot.js';
import { BALANCE as B, PALETTE as P } from './config.js';
import { lerp } from './utils.js';
import { sprite } from './assets.js';


const track = B.track;
const lanes = [track.upgradeX, track.gateRight];
// 仅防止负人数，不设总人数上限。旧存档的完整整数原样保留。
export function normalizeSquad(population) { const n=BigInt(population); return n<0n?0n:n; }
/** 通过十进制前缀计算对数，巨量BigInt也不会转成Infinity。 */
export function armyPressure(population) {
  const n=normalizeSquad(population),knee=B.adaptive.densityKnee;
  if(n<=BigInt(knee))return Number(n);
  const digits=n.toString(),head=digits.slice(0,15);
  const log=Math.log10(Number(head))+digits.length-head.length;
  return knee+B.adaptive.densityPerDoubling*(log-Math.log10(knee))/Math.log10(2);
}
export function gateResult(population, gate) {
  const count=normalizeSquad(population),value=BigInt(gate.value),scale=BigInt(gate.scale??1);
  if(gate.kind==='multiply')return count*value/scale;
  if(gate.kind==='divide')return count*scale/(value>0n?value:1n);
  return normalizeSquad(count+value);
}

export function formatCount(value) {
  const raw=value.toString(),negative=raw.startsWith('-'),digits=negative?raw.slice(1):raw;
  if(digits.length<7)return raw;
  return (negative?'-':'')+digits[0]+'.'+digits.slice(1,3)+'e'+(digits.length-1);
}

export function visibleTroopers(population) {
  return Number(population < BigInt(track.visibleTroopers) ? population : track.visibleTroopers);
}

/** 符号独立随机；人数不影响正负概率。加法无上限，命中弹数决定最终收益。 */
export function makeGate(serial, population=2n, random=Math.random, player=null) {
  const hostile=random()<.5, additive=true;
  const magnitude=player?gateNeed(player):2;
  const kind=additive?'add':hostile?'divide':'multiply';
  const value=BigInt(additive?(hostile?-magnitude:magnitude):hostile?12+Math.floor(random()*9):11+Math.floor(random()*3));
  return {stat:player&&weaponStats(player).rate>=B.director.rateCap?'damage':random()<.5?'rate':'damage',kind,value,scale:10n,x:lanes[serial%2],charge:0n,lastHit:-Infinity};
}

export function soldierOffset(index, count) {
  const row = Math.floor(index / track.columns);
  const inRow = Math.min(track.columns, count - row * track.columns);
  return {
    x: (index % track.columns - (inRow - 1) / 2) * track.spacing,
    y: row * track.rowSpacing
  };
}

export const chargeThreshold=()=>1n;
/** 一次碰撞计入弹束代表的全部真实弹数，绝不按持续时间增加。 */
export function chargeGate(gate,hits){gate.value+=BigInt(hits);gate.charge=0n;}
export function gateLabel(gate){return (gate.value>=0n?'+':'')+String(gate.value);}

export class Runway {
  constructor(population=2n) {
    this.rows = [];
    this.drums = [];
    this.serial = 0;
    this.nextRow = track.encounterInterval;
    this.addRow(475,population);
    this.addDrum(lanes[1], 745);
  }

  /** 尸潮全部从道路前方推进；两侧轮换数字门和油桶，横移分配火力。 */
  openingConvoy(game) {
    const count = Math.min(game.mode.remaining, game.mode.stage<=4?track.openingMax:6, track.openingSize + (game.mode.stage - 1) * track.openingStageGrowth);
    for (let i = 0; i < count; i++) {
      const enemy = game.spawnEnemy(0);
      if (!enemy) break;
      game.mode.remaining--;
      // 所有刷怪入口集中在前方，不从玩家两翼包夹。
      const vanguard = i < 10;
      enemy.x = enemy.px = [200,360,520][i%3];
      enemy.y = enemy.py = game.mode.stage<=4?(vanguard ? 390 - i * 95 : 300 - Math.floor((i - 10) / 10) * 52):B.encounter.spawnTop+(i%5)*28;
    }
  }

  addRow(y,population=2n,player=null) {
    this.rows.push({y,py:y,gates:[makeGate(this.serial++,population,Math.random,player)]});
  }

  addDrum(x, y) {
    this.drums.push({ x, y, py: y, hits: track.drumHits, live: true });
  }

  update(g, dt) {
    this.nextRow -= dt;
    if (this.nextRow <= 0 && this.rows.length===0) {
      this.nextRow = track.encounterInterval;
      this.addRow(118,g.p.squad,g.p);
      const lane = lanes[this.rows[0].gates[0].x===lanes[0]?1:0];
      this.addDrum(lane, 395);

    }
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      row.py = row.y;
      const gate=row.gates[0], firing=g.time-(gate.lastHit??-Infinity)<=track.gateHitWindow;
      // 只按碰撞命中的真实弹数改值，时间不产生收益。
      const charging=gate.kind==='add'||gate.kind==='divide'||gate.value<BigInt(track.maxMultiplier*10);
      row.y+=track.scroll*dt*(firing&&charging?track.gateChargeSlow:1);
      if (row.y < g.p.y) continue;
      this.rows.splice(i, 1);
      const ratio=(g.p.y-row.py)/Math.max(.0001,row.y-row.py);
      const crossX=(g.p.px??g.p.x)+(g.p.x-(g.p.px??g.p.x))*Math.max(0,Math.min(1,ratio));
      const squadHalf=(Math.min(Number(g.p.squad),track.columns)-1)*track.spacing/2+18;
      const crossed=row.gates.find(t=>Math.abs(crossX-t.x)+squadHalf<=track.gateHalfWidth); // 整队穿过门洞才结算。

      if (!crossed) continue;
      const result=applyGate(g.p,crossed);g.fx.ring(g.p.x,g.p.y,crossed.value>=0n?P.player:P.hp);
      g.ui.toast(`${crossed.stat==='rate'?'射速':'伤害'} ${gateLabel(crossed)} · 伤害 ${result.before.damage.toFixed(1)}→${result.after.damage.toFixed(1)} · 射速 ${result.before.rate.toFixed(1)}→${result.after.rate.toFixed(1)}/秒`);g.persistGrowth?.();
      if (!g.p.squad) { g.finish(false); return; }
    }
    for (let i = this.drums.length - 1; i >= 0; i--) {
      const drum = this.drums[i];
      drum.py = drum.y;
      drum.y += track.scroll * dt;
      if (drum.live && drum.y >= g.p.y && drum.py < g.p.y &&
          Math.abs(drum.x - g.p.x) < 40) {
        drum.live = false;
        g.p.hp=Math.max(0,g.p.hp-10);
        g.fx.burst(drum.x, drum.y, P.bomber, 14);
        g.ui.toast('撞上炸药包 −10生命');
        if (!g.p.squad) { g.finish(false); return; }
      }
      if (!drum.live || drum.y > 1260) this.drums.splice(i, 1);
    }
  }

  /** 在弹丸本步的轨迹上寻找最先碰到的道具。每扇门都能射击；射除门会逐步消除惩罚。 */
  intercept(bullet, game, detonate) {
    let best = null;
    let nearest = Infinity;
    const consider = (item, y, halfWidth, thickness, drum) => {
      if (Math.abs(bullet.x - item.x) > halfWidth ||
          bullet.py < y - thickness || bullet.y > y + thickness) return;
      const distance = Math.max(0, bullet.py - y - thickness);
      if (distance < nearest) { nearest = distance; best = { item, drum }; }
    };
    for (const drum of this.drums) {
      if (drum.live) consider(drum, drum.y, 35, 35, true);
    }
    for (const row of this.rows) for (const gate of row.gates) {
      if (!bullet.hits?.has(gate)) consider(gate, row.y, track.gateHalfWidth, 12, false);
    }
    if (!best) return false;
    const item = best.item;
    if (best.drum) {
      bullet.active = false;
      item.hits -= Number(bullet.mass > BigInt(item.hits) ? BigInt(item.hits) : (bullet.mass ?? 1n));
      game.fx.burst(item.x, item.y, P.bomber, 3);
      if (item.hits <= 0) {
        item.live = false;
        detonate(item);
      }
    } else {
      bullet.hits?.add(item);
      item.lastHit=game.time;chargeGate(item,bullet.mass??1n);
    }
    return best.drum;
  }

  drawRoad(c,time){c.save();c.fillStyle=P.road;c.fillRect(0,0,720,1280);
    c.fillStyle=P.rail;for(const x of [12,686])c.fillRect(x,0,22,1280);
    const shift=time*track.scroll%100;for(let y=shift-100;y<1280;y+=100){c.fillStyle=P.roadLine;for(const x of [240,480])c.fillRect(x,y,5,46);c.fillStyle=P.panel;for(const x of [12,686])c.fillRect(x,y,22,8);}
    c.globalAlpha=.16;c.strokeStyle=P.black;c.lineWidth=2;for(let y=shift-100;y<1280;y+=200){c.beginPath();c.moveTo(35,y);c.lineTo(290,y+25);c.lineTo(400,y+12);c.lineTo(685,y+30);c.stroke();}c.globalAlpha=.7;c.strokeStyle=P.hp;c.setLineDash([16,12]);c.beginPath();c.moveTo(35,B.bossBreachY);c.lineTo(685,B.bossBreachY);c.stroke();c.restore();}

  draw(c, alpha, player) {
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const row of this.rows) for (const gate of row.gates) {
      const y = lerp(row.py, row.y, alpha);
      const w = track.gateHalfWidth;
      const positive = gate.kind === 'multiply' || (gate.kind === 'add' && gate.value > 0);
      const color = positive ? P.player : P.hp;
      c.fillStyle = color;
      c.globalAlpha=.35;c.fillStyle=P.black;c.fillRect(gate.x-w+8,y-48,w*2,75);c.globalAlpha=.95;c.fillStyle=P.panel;c.fillRect(gate.x-w,y-65,w*2,78);c.fillStyle=color;c.globalAlpha=.25;c.fillRect(gate.x-w,y-65,w*2,78);
      c.globalAlpha = 1; c.strokeStyle = color; c.lineWidth = 3;
      c.strokeRect(gate.x - w, y - 65, w * 2, 78);c.fillRect(gate.x-w,y-65,w*2,6);
      c.fillRect(gate.x - w - 3, y - 64, 8, 80);
      c.fillRect(gate.x + w - 5, y - 64, 8, 80);
      c.font = '900 52px system-ui';
      if(icons.weapon)c.drawImage(icons.weapon.canvas,gate.x-w+8,y-54,48,48);c.fillText(gateLabel(gate), gate.x+18, y - 25);
      if(player){const change=gate.value;c.font='bold 20px system-ui';c.fillText((change>=0n?'+':'')+formatCount(change)+(gate.stat==='rate'?' 发/秒':' 伤害'),gate.x,y-88);}
      {
        c.font='bold 18px system-ui';c.fillText((gate.stat==='rate'?'射速 / 秒':'单发伤害')+' · 1发=+1',gate.x,y+32);
      }
    }
    for (const drum of this.drums) if (drum.live) {
      const x = drum.x, y = lerp(drum.py, drum.y, alpha);
      c.fillStyle = P.panel; c.strokeStyle = P.bomber; c.lineWidth = 3;
      c.fillRect(x - 34, y - 35, 68, 70); c.strokeRect(x - 34, y - 35, 68, 70);
      c.fillStyle = P.bomber;
      c.fillRect(x - 35, y - 24, 70, 5); c.fillRect(x - 35, y + 20, 70, 5);
      c.font = 'bold 30px monospace'; c.fillText(String(drum.hits), x, y);
      c.font = 'bold 15px system-ui'; c.fillText('燃油', x, y - 53);
    }
    c.restore();
  }
}

export function drawSquad(c, p, alpha) {
  const x = lerp(p.px, p.x, alpha);
  const visible = visibleTroopers(p.squad);
  for (let i = visible - 1; i >= 0; i--) {
    const offset = soldierOffset(i, visible);
    sprite(c, 'trooper', x + offset.x, p.y + offset.y, -Math.PI / 2, .85, p.invul > 0 ? .08 : 0);
  }
  const badgeY = p.y + Math.floor((visible - 1) / track.columns) * track.rowSpacing + 31;
  c.fillStyle = P.bg; c.fillRect(x - 47, badgeY, 94, 32);
  c.textAlign = 'center'; c.font = 'bold 22px system-ui'; c.fillStyle = P.player;
  c.fillText(formatCount(p.squad) + ' 人', x, badgeY + 23);
}

```

## js/save.js
```
import { freshProgress, validateProgress } from './progression.js';
import {BALANCE as B} from './config.js';
const KEY='obsidian-save-v1';
export const fresh=()=>({version:2,campaign:freshProgress(),endless:null,coins:0,stage:1,best:0,top:[],unlocked:false,character:0,shop:{rate:0,magnet:0,damage:0,hp:0,speed:0,luck:0,rerolls:0},settings:{sound:true,manual:false}});
function integer(x,min,max){return Number.isSafeInteger(x)&&x>=min&&x<=max;}
/** 导入严格校验已知字段，不将任意JSON合并进运行对象。 */
export function validate(x){
 if(!x||![1,2].includes(x.version)||!integer(x.coins,0,Number.MAX_SAFE_INTEGER)||!integer(x.stage,1,15)||!integer(x.best,0,1e12)||!Array.isArray(x.top)||x.top.length>10||!x.top.every(n=>integer(n,0,1e12)))throw Error('存档格式或数值不合法');
 const s=fresh();for(const k of Object.keys(s.shop)){if(['magnet','rate'].includes(k)&&x.shop?.[k]===undefined)continue;if(!integer(x.shop?.[k],0,Number.MAX_SAFE_INTEGER))throw Error('商店数据不合法');s.shop[k]=x.shop[k];}
 if(typeof x.unlocked!=='boolean'||!integer(x.character,0,1)||typeof x.settings?.sound!=='boolean'||typeof x.settings?.manual!=='boolean')throw Error('设置不合法');
 return {...s,campaign:validateProgress(x.campaign),endless:validateEndless(x.endless),coins:x.coins,stage:Math.min(B.stages,x.stage),best:x.best,top:[...x.top].sort((a,b)=>b-a),unlocked:x.unlocked,character:x.unlocked?x.character:0,settings:{sound:x.settings.sound,manual:x.settings.manual}};
}
export const save={data:fresh(),warning:'',load(){try{const raw=localStorage.getItem(KEY);if(raw)this.data=validate(JSON.parse(raw));}catch{this.warning='无法读取本地存档，当前使用临时档。请导入备份。';}return this.data;},write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));this.warning='';return true;}catch{this.warning='本地存储不可用，请导出存档保管。';return false;}},export(){return JSON.stringify(this.data,null,2);},import(text){if(text.length>1000000)throw Error('存档文本过长');this.data=validate(JSON.parse(text));this.write();}};

/** 续玩档只包含有限实体与明确状态，不保存DOM或可执行内容。 */
function validateEndless(e){if(e==null)return null;if(!e||!Number.isSafeInteger(e.wave)||e.wave<1||!Number.isFinite(e.hp)||e.hp<0||e.hp>120||!Array.isArray(e.enemies)||e.enemies.length>B.enemies)throw Error('无限进度不合法');for(const enemy of e.enemies){if(!Number.isInteger(enemy.type)||enemy.type<0||enemy.type>4||!['x','y','hp','maxHP'].every(k=>Number.isFinite(enemy[k]))||enemy.hp<0||enemy.maxHP<=0)throw Error('无限敌人数据不合法');}for(const k of ['remaining','budget','elapsed','time','score','breachLoss'])if(!Number.isFinite(e[k])||e[k]<0)throw Error('无限计时数据不合法');for(const [key,limit] of [['loot',4],['turrets',100],['rows',2],['drums',4],['hazards',B.challenge.hazards]])if(e[key]!==undefined&&(!Array.isArray(e[key])||e[key].length>limit))throw Error('无限场景不合法');
for(const row of e.rows||[]){if(!Number.isFinite(row.y)||!Array.isArray(row.gates)||row.gates.length!==1||!row.gates.every(t=>/^-?[0-9]+$/.test(t.value)&&Number.isFinite(t.x)))throw Error('无限门数据不合法');}
return {...e,progress:validateProgress(e.progress)};}

```

## js/shop.js
```
export const shopCost=level=>Math.ceil(80*(level+1)**3*1.07**level*(level===0?.75:level===1?.85:level===2?.92:1));
export function permanent(id,level){const growth=level+.06*level*level;return ({rate:.04,damage:.08,magnet:15,speed:.025,hp:.015,rerolls:1}[id]||0)*growth;}
export function shopBenefit(id,level){if(id==='luck')return `高级补给 ${Math.min(100,18+level)}%（每级+1个百分点，概率最高100%）`;if(id==='hp')return `接触减伤 ${(100*(1-1/(1+permanent(id,level)))).toFixed(1)}%`;if(id==='magnet')return `拾取范围 +${permanent(id,level).toFixed(0)}`;if(id==='rerolls')return `初始备用 +${Math.floor(permanent(id,level))}`;return `${id==='damage'?'伤害':id==='rate'?'射速':'移速'} +${(permanent(id,level)*100).toFixed(1)}%`;}

```

## js/ui.js
```
import {iconHTML} from './icons.js';
import {shopCost,shopBenefit} from './shop.js';
import {useItem,weaponStats} from './loot.js';
import { formatCount } from './runway.js';
import {BALANCE as B,PALETTE as P} from './config.js';
import {save} from './save.js';
import {audio} from './audio.js';
import {RARITIES, UPGRADES, rankOf, skillStatus, specialization, canChoose} from './upgrades.js';
export class UI{
 constructor(g){this.g=g;this.overlay=document.querySelector('#overlay');this.hud=document.querySelector('#hud');this.toastNode=document.querySelector('#toast');this.messageTime=0;for(const [k,v]of Object.entries(P))document.documentElement.style.setProperty('--'+k,v);}
 show(html){this.hud.classList.toggle('covered',Boolean(html)&&this.g.state!=='playing');this.overlay.innerHTML=html;this.g.input?.reset();}
 button(id,fn){document.getElementById(id)?.addEventListener('click',()=>{audio.unlock();fn();});}
 toast(text){this.toastNode.textContent=text;this.toastNode.classList.add('show');clearTimeout(this.messageTime);this.messageTime=setTimeout(()=>this.toastNode.classList.remove('show'),2200);}
 menu(){this.g.state='menu';this.hud.innerHTML='';const d=save.data;this.show(`<section class="panel menu"><div class="eyebrow">感染公路</div><div class="title"><div class="brand-line"></div><h1>黑曜<br>防线<span style="color:var(--ui)">.</span></h1></div><div class="tag">OBSIDIAN PROTOCOL</div><p>带小队穿过感染公路。从少量僵尸开始逐步变强。闯关强化、等级与经验永久保留，无限增援编队，武器门必须经过才生效；火力越强尸潮越密。</p><div class="row stats"><div class="stat"><small>回收信用点</small><b>${d.coins}</b></div><div class="stat"><small>无限纪录</small><b>${d.best.toLocaleString()}</b></div><div class="stat"><small>已解锁区域</small><b>${String(d.stage).padStart(2,'0')} / 10</b></div></div><div class="row"><select id="stage-select" aria-label="选择关卡">${Array.from({length:d.stage},(_,i)=>`<option value="${i+1}" ${i+1===d.campaign.nextStage?'selected':''}>第 ${String(i+1).padStart(2,'0')} 关${(i+1)%5===0?' · 首领区域':''}</option>`).join('')}</select><button id="character">${d.character?'游隼 / 双联枪':'守望 / 脉冲枪'}</button></div><button class="primary" id="campaign">继续闯关 · LV.${d.campaign.history.length+(d.campaign.pending||0)+1}　→</button><button class="secondary" id="endless">${d.endless?'续战 · 第'+d.endless.wave+'波':'开始无限协议'}</button><div class="row"><button id="shop">军械库</button><button id="settings">系统</button><button id="ranks">排行</button></div><p class="instructions">左右拖动横移，队员持续向前开火。<br>门强化武器，必须经过才生效；负收益可绕开。<br>靠近拾取经验；射开强化补给后接取，人数无上限。<br>3关起躲红区、趁核心暴露集火；4关起护甲精英，5关起毒爆投射，7关起双侧轰击留中央缺口。</p><div class="version">LOCAL FIRST · V4.7 · NO SIGNAL REQUIRED</div></section>`);
 this.button('campaign',()=>this.g.start('campaign',Number(document.querySelector('#stage-select').value)));this.button('endless',()=>this.g.start('endless'));this.button('shop',()=>this.shop());this.button('settings',()=>this.settings());this.button('ranks',()=>this.ranks());this.button('character',()=>{if(!d.unlocked){this.toast('军械库可解锁游隼与双联枪');return;}d.character=1-d.character;save.write();this.menu();});if(save.warning)this.toast(save.warning);}
 setupHUD(){this.hud.innerHTML='<div class="xp"><i id="xp-fill"></i></div><div class="hud-top row"><div><div class="hud-label" id="mode-label"></div><div class="hud-value" id="wave-label"></div><div class="health"><i id="hp-fill"></i></div></div><div class="hud-right"><div class="hud-label">编队</div><div class="hud-value" id="timer-label"></div><div class="small" id="hp-label"></div></div></div><div class="weapon-readout" id="weapon-readout"></div><div class="inventory"><button id="use-grenade">手雷</button><button id="use-laser">激光</button><button id="use-turret">炮台</button></div><button class="claim" id="claim">强化 · 0</button><button class="pause" id="pause">Ⅱ</button><div class="boss-hud" id="boss-hud"></div><div class="hud-foot"><span id="level-label"></span><span id="perf-label"></span></div>';this.button('pause',()=>this.g.pause());for(const id of ['grenade','laser','turret'])this.button('use-'+id,()=>useItem(this.g,id));this.button('claim',()=>this.g.claiming?this.g.closeUpgrades():this.g.openUpgrades());}
 update(){if(!this.g.p||!document.getElementById('hp-fill'))return;const g=this.g,p=g.p;const ws=weaponStats(p);document.getElementById("weapon-readout").textContent=`伤害 ${ws.damage.toFixed(1)}　射速 ${ws.rate.toFixed(1)}/秒`;for(const [id,name] of [["grenade","手雷"],["laser","激光"],["turret","炮台"]]){const btn=document.getElementById("use-"+id),n=p.inventory?.[id]||0;btn.innerHTML=iconHTML(id)+"<span>"+name+" ×"+n+"</span>";btn.disabled=!n;}const claim=document.getElementById('claim');claim.textContent=`强化 · ${p.pendingUpgrades||0}`;claim.style.display='none';claim.disabled=true;claim.classList.toggle('ready',Boolean(p.pendingUpgrades));document.getElementById('xp-fill').style.width=Math.min(100,p.xp/p.nextXP*100)+'%';document.getElementById('hp-fill').style.width=Math.max(0,p.hp/p.maxHP*100)+'%';document.getElementById('hp-label').textContent=`${Math.max(0,Math.ceil(p.hp))} / ${Math.ceil(p.maxHP)} 防线${g.leaks?' · 漏 '+g.leaks:''}${p.wound>0?' · 重创治疗↓':''}`;document.getElementById('mode-label').textContent=g.mode.kind==='campaign'?`第 ${g.mode.stage} / 10 关`:'无限模式';document.getElementById('mode-label').textContent+=' · '+Math.min(99,Math.floor(((g.mode.local-1)+(1-g.mode.remaining/Math.max(1,g.mode.budget)))/3*100))+'%';document.getElementById('wave-label').textContent=`第 ${g.mode.wave} 波`;document.getElementById('timer-label').textContent=formatCount(p.squad)+' 人';document.getElementById('level-label').textContent=`LV.${p.level} · 本次 ${g.coins} CR`;document.getElementById('perf-label').textContent=`EXP ${Math.floor(p.xp)} / ${p.nextXP}`;const boss=g.enemies.items.find(e=>e.active&&e.type===4);document.getElementById('boss-hud').innerHTML=boss?`${boss.plates ? "重甲 ×"+boss.plates : "暴露核心"} · ${boss.stage>=B.challenge.startStage?(boss.cycle<B.challenge.armorSeconds?'硬化减伤':'核心暴露！'):'缓慢推进'} · 距突破 ${Math.max(0,Math.ceil((B.bossBreachY-boss.y)/B.bossAdvance))}秒<div class="health"><i style="width:${Math.max(0,boss.hp/boss.maxHP*100)}%"></i></div>`:'';}
 upgrade(cards){this.overlay.innerHTML=`<section class="panel claim-panel"><div class="eyebrow">NEURAL UPGRADE / LV.${this.g.p.level}</div><h2>领取强化 · 待领 ${this.g.p.pendingUpgrades}</h2><p>战斗继续 · 下方拖动照常移动 · 三选一${this.g.mode.kind==='campaign'?' · 强化跨关保留':''}</p><div class="cards">${cards.map((u,i)=>{const r=RARITIES[u.rarity];return `<button class="card" id="pick-${i}" style="border-color:${r.color};border-width:${r.width}px;border-left-width:${r.width+3}px"><em style="color:${r.color}">${r.name} · ${u.group}</em><em class="corner" style="color:${r.color}">${'◆'.repeat(u.rarity+1)}</em><strong>${u.name}</strong><span>${u.desc}</span><small class="skill-meta">${skillStatus(this.g.p,u)}</small></button>`;}).join('')}</div><div class="row"><button id="claim-all" ${cards.every(u=>u.group==='专精')?'disabled':''}>批量领取（优先进阶）</button><button id="claim-close">收起</button></div><button class="secondary" id="reroll" ${this.g.p.rerolls<=0||cards.every(u=>u.group==='专精')?'disabled':''}>刷新协议 · 剩余 ${this.g.p.rerolls}</button></section>`;cards.forEach((u,i)=>this.button('pick-'+i,()=>this.g.choose(u)));this.button('reroll',()=>this.g.reroll());this.button('claim-all',()=>this.g.claimAll());this.button('claim-close',()=>this.g.closeUpgrades());}
 paused(){this.show('<section class="panel menu"><div class="eyebrow">CONNECTION HELD</div><h2>行动暂停</h2><p>计时与战斗已冻结。</p><button class="primary" id="resume">继续行动</button><button id="build">技能路线 / 已选强化</button><button id="pause-settings">设置 / 存档</button><button id="abandon">保存结算 / 返回基地</button></section>');this.button('resume',()=>this.g.resume());this.button('build',()=>this.build());this.button('pause-settings',()=>this.settings(true));this.button('abandon',()=>{if(this.g.mode.kind==='endless')this.g.exitEndless();else{this.g.finish(false);this.menu();}});}
 build(){const p=this.g.p;this.show(`<section class="panel menu"><div class="eyebrow">BUILD / LV.${p.level}</div><h2>技能路线</h2><p>5级选择一种专精。强化满足前置后进入升级卡池；三种专精互斥，选择后跨关保留。</p><div class="skill-list">${UPGRADES.filter(u=>u.group!=='基础'||rankOf(p,u.id)>0).map(u=>`<article class="skill-entry ${canChoose(p,u)?'available':''}"><strong>${u.name} · ${rankOf(p,u.id)}级</strong><p>${u.desc}</p><small>${skillStatus(p,u)} · ${rankOf(p,u.id)>=u.max?'已满级':canChoose(p,u)?'可在升级中选择':'未满足前置'}</small></article>`).join('')}</div><button id="back">返回暂停</button></section>`);this.button('back',()=>this.paused());}
 result(win){const g=this.g;this.show(`<section class="panel menu"><div class="eyebrow">MISSION ${win?'COMPLETE':'TERMINATED'}</div><h2>${win?'区域已净化':'信号已中断'}</h2><div class="end-score">${g.score.toLocaleString()}</div><div class="row stats"><div class="stat"><small>消灭感染体</small><b>${g.kills}</b></div><div class="stat"><small>回收信用点</small><b>+${g.coins}</b></div><div class="stat"><small>生存时间</small><b>${Math.floor(g.time)}s</b></div></div><p>${win&&g.mode.stage===10?'你已突破全部10个区域。无限协议等待你的挑战。':'闯关成长保留。无限主动退出保存当前波次、敌人血量和编队；返回商店升级后可续战。无限战败则重新开始。'}</p><button class="primary" id="again">${win&&g.mode.stage<10?'进入下一区域':'再次行动'}</button><button id="home">返回基地</button></section>`);this.button('again',()=>g.start(g.mode.kind,win?Math.min(10,g.mode.stage+1):g.mode.stage));this.button('home',()=>this.menu());}
 shop(){const d=save.data,names={rate:'枪机研发 · 永久射速',magnet:'拾取训练 · 经验拾取范围 +15',damage:'弹芯校准 · 伤害 +8%',hp:'防护训练 · 接触减伤 +1.5%',speed:'机动强化 · 移速 +2.5%',luck:'幸运协议 · 幸运 +2.5%'};this.show(`<section class="panel menu"><div class="eyebrow">ARMORY / PERMANENT</div><h2>基地研发中心</h2><p>等级无游戏上限，属性收益递增，价格加速增长。幸运每级仅+1个百分点；极稀有增援独立抽取。</p><p>可用信用点　<span style="color:var(--gold)">${d.coins}</span></p><div class="shop-list">${Object.keys(names).map(k=>{const lv=d.shop[k],cost=shopCost(lv);return `<button class="shop-item" id="buy-${k}" ${!Number.isSafeInteger(cost)||d.coins<cost?'disabled':''}><span>${iconHTML(k)}${names[k].split(' · ')[0]}<br><small>LV.${lv} · ${shopBenefit(k,lv)}<br>下级：${shopBenefit(k,lv+1)}</small></span><span>${Number.isFinite(cost)?cost.toLocaleString():'超出数值范围'} CR</span></button>`;}).join('')}<button id="unlock" class="shop-item" ${d.unlocked||d.coins<B.unlockCost?'disabled':''}><span>游隼 + 双联枪<br><small>双发、射速快、机动强，生命较低</small></span><span>${d.unlocked?'已解锁':B.unlockCost+' CR'}</span></button></div><button id="back">返回基地</button></section>`);for(const k of Object.keys(names))this.button('buy-'+k,()=>{const cost=shopCost(d.shop[k]);if(Number.isSafeInteger(cost)&&d.coins>=cost){d.coins-=cost;d.shop[k]++;save.write();this.shop();}});this.button('unlock',()=>{if(!d.unlocked&&d.coins>=B.unlockCost){d.coins-=B.unlockCost;d.unlocked=true;save.write();this.shop();}});this.button('back',()=>this.menu());}
 settings(paused=false){const d=save.data;this.show(`<section class="panel menu"><div class="eyebrow">SYSTEM / LOCAL STORAGE</div><h2>系统设置</h2><button id="sound">合成音效：${d.settings.sound?'开':'关'}</button><p class="small">导出文本可复制到本地笔记。导入会替换永久进度；战斗中仅允许导出。</p><textarea id="save-text" spellcheck="false" aria-label="存档文本" placeholder="点击导出，或在此粘贴备份"></textarea><div class="row"><button id="export">导出文本</button><button id="import" ${paused?'disabled':''}>导入存档</button></div><div id="save-notice" class="notice"></div><button id="back">${paused?'返回暂停界面':'返回基地'}</button></section>`);this.button('sound',()=>{d.settings.sound=!d.settings.sound;save.write();this.settings(paused);});this.button('export',()=>{const t=document.querySelector('#save-text');t.value=save.export();t.focus();t.select();document.querySelector('#save-notice').textContent='已生成存档。长按文本复制，或使用 Ctrl+C。';});this.button('import',()=>{if(paused)return;try{save.import(document.querySelector('#save-text').value);document.querySelector('#save-notice').textContent=save.warning||'导入成功';}catch(e){document.querySelector('#save-notice').textContent=e.message;}});this.button('back',()=>paused?this.paused():this.menu());}
 ranks(){this.show(`<section class="panel menu"><div class="eyebrow">LOCAL RECORDS / TOP 10</div><h2>无限协议排行</h2><div class="leaderboard">${Array.from({length:10},(_,i)=>`<div class="rank">${String(i+1).padStart(2,'0')}　${save.data.top[i]?.toLocaleString()??'—'}</div>`).join('')}</div><button id="back">返回基地</button></section>`);this.button('back',()=>this.menu());}
}

```

## js/upgrades.js
```
import {BALANCE as B,PALETTE as P} from './config.js';
export const RARITIES=[{name:'标准',color:P.text,width:1},{name:'稀有',color:P.blue,width:2},{name:'史诗',color:P.purple,width:3},{name:'传说',color:P.gold,width:4}];
const add=(key,n=1)=>p=>p[key]=(p[key]||0)+n;
/** 所有词条通过道路补给盒命中解锁，再接触领取。没有追踪、自动索敌、自动炮台。 */
export const UPGRADES=[
 {id:'damage',name:'高压弹药',desc:'直击伤害 +18%',rarity:0,max:10,apply:p=>p.damage*=B.damageUpgrade},
 {id:'rate',name:'快速枪机',desc:'射击间隔 −10%',rarity:0,max:8,apply:p=>p.rate*=B.rateUpgrade},
 {id:'range',name:'宽径弹头',desc:'弹丸命中半径 +2，提升对线容错',rarity:0,max:5,apply:add('bulletRadius',B.arsenal.rangeStep)},
 {id:'magnet',name:'拾取背包',desc:'走近拾取经验的范围 +18',rarity:0,max:6,apply:add('magnet',B.magnetUpgrade)},
 {id:'pierce',name:'贯穿弹芯',desc:'穿透 +1；适合纵向成排敌人',rarity:1,max:5,apply:add('pierce')},
 {id:'multi',name:'侧翼枪口',desc:'增加一条散射弹道，近距离覆盖更宽',rarity:1,max:3,apply:add('shots')},
 {id:'breaker',name:'破盾弹药',desc:'护盾伤害 +35%；不会穿盾伤本体',rarity:1,max:4,apply:add('shieldBonus',.35)},
 {id:'slow',name:'阻滞弹',desc:'直击减速25%，延长清线窗口',rarity:1,max:1,apply:add('slow')},
 {id:'blast',name:'破片弹',desc:'直击产生小范围爆炸，群怪时更有效',rarity:2,max:3,apply:add('explosive')},
 {id:'focus',name:'稳姿射击',desc:'站稳0.7秒后伤害 +40%；移动立即取消',rarity:1,max:1,apply:add('focus')},
 {id:'close',name:'近距离压制',desc:'敌人进入前方260内，直击 +55%',rarity:1,max:1,apply:add('close')},
 {id:'execute',name:'破甲追击',desc:'护盾破裂后的2秒内，直击 +60%',rarity:2,max:1,apply:add('execute')},
 {id:'turret',name:'固定炮台',desc:'获得1次部署：在当前位置固定向前开火10秒，不索敌',rarity:2,max:Infinity,active:true,apply:p=>p.turretCharges=Math.min(B.arsenal.maxCharges,p.turretCharges+1)},
 {id:'grenade',name:'破片手雷',desc:'获得1枚：点击按钮，轰炸当前射线前方；可破盾',rarity:1,max:Infinity,active:true,apply:p=>p.grenadeCharges=Math.min(B.arsenal.maxCharges,p.grenadeCharges+1)},
 {id:'laser',name:'一次性激光炮',desc:'获得1发：点击按钮，贯穿当前射线整列敌人',rarity:3,max:Infinity,active:true,apply:p=>p.laserCharges=Math.min(B.arsenal.maxCharges,p.laserCharges+1)}
].map(u=>({...u,group:u.active?'战术装备':'枪械改装'}));
export const rankOf=(p,id)=>(p.upgradeHistory||[]).filter(v=>v===id).length;
export const specialization=()=>null;
export function canChoose(p,u){return rankOf(p,u.id)<u.max&&(!u.active||p[u.id+'Charges']<B.arsenal.maxCharges);}
export function choices(p){const pool=UPGRADES.filter(u=>canChoose(p,u));const out=[];while(pool.length&&out.length<3){let total=pool.reduce((n,u)=>n+B.rarityWeights[u.rarity],0),r=Math.random()*total,index=pool.length-1;for(let i=0;i<pool.length;i++){r-=B.rarityWeights[pool[i].rarity];if(r<=0){index=i;break;}}out.push(pool.splice(index,1)[0]);}return out;}
export const skillStatus=(p,u)=>`${u.group} · ${rankOf(p,u.id)} / ${Number.isFinite(u.max)?u.max:'消耗品'}`;
export const SYNERGIES=[];

```

## js/utils.js
```
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const rand=(a,b)=>a+Math.random()*(b-a);
export const distance2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
export function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
/** 固定容量对象池：启动时分配；申请只复用空闲实例，释放仅改 active。
 * 不 splice、不每发子弹 new；容量满时明确丢弃特效/弹丸，避免 GC 峰值。 */
export class Pool{
  constructor(capacity,factory=()=>({})){this.items=Array.from({length:capacity},()=>({...factory(),active:false}));this.cursor=0;}
  take(data){for(let i=0;i<this.items.length;i++){const n=(this.cursor+i)%this.items.length,o=this.items[n];if(!o.active){Object.assign(o,data);o.active=true;this.cursor=(n+1)%this.items.length;return o;}}return null;}
  clear(){for(const o of this.items)o.active=false;}
  get count(){let n=0;for(const o of this.items)if(o.active)n++;return n;}
}
/** 预分配均匀网格；弹丸只查询相邻桶，避免400×120全量距离测试。 */
export class Grid{
  constructor(){this.size=96;this.cols=12;this.rows=18;this.cells=Array.from({length:216},()=>[]);}
  rebuild(items){for(const c of this.cells)c.length=0;for(const e of items)if(e.active)this.cells[this.index(e.x,e.y)].push(e);}
  index(x,y){return clamp(Math.floor((y+192)/96),0,17)*12+clamp(Math.floor((x+192)/96),0,11);}
  query(x,y,r,visit){const x0=clamp(Math.floor((x-r+192)/96),0,11),x1=clamp(Math.floor((x+r+192)/96),0,11),y0=clamp(Math.floor((y-r+192)/96),0,17),y1=clamp(Math.floor((y+r+192)/96),0,17);for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)for(const e of this.cells[j*12+i])if(e.active)visit(e);}
}

```

## css/style.css
```
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:none}html,body{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;background:var(--bg,#080916);color:var(--text,#eef5ff);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}#viewport{position:fixed;inset:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);display:flex;align-items:center;justify-content:center;overflow:hidden}#stage{position:absolute;width:720px;height:1280px;transform-origin:center center;overflow:hidden;background:var(--bg)}canvas,#hud,#overlay{position:absolute;inset:0;width:100%;height:100%}#hud{pointer-events:none}#overlay{display:flex;align-items:center;justify-content:center;padding:42px;pointer-events:none}#overlay>*{pointer-events:auto}button,select,textarea{font:inherit}button{color:var(--text);background:var(--panel);border:1px solid var(--grid);border-radius:5px;min-height:58px;padding:13px 22px;font-weight:700;cursor:pointer;letter-spacing:1px}button:active{transform:scale(.98);background:var(--grid)}button:disabled{opacity:.35;cursor:default}.primary{background:var(--ui);border-color:var(--ui);color:var(--bg);box-shadow:0 0 28px color-mix(in srgb,var(--ui) 18%,transparent)}.secondary{border-color:var(--ui);color:var(--ui)}.panel{width:100%;padding:34px;background:var(--panel);background-image:var(--panel-texture);border:1px solid var(--grid);border-top:2px solid var(--ui);border-radius:10px;box-shadow:0 24px 80px var(--bg)}h1,h2,p{margin:0}h1{font-size:72px;line-height:1.12;letter-spacing:6px;font-weight:900}h2{font-size:34px;letter-spacing:3px}p{line-height:1.7;color:var(--secondary);font-size:20px}.eyebrow{font:14px monospace;letter-spacing:5px;color:var(--ui);margin-bottom:18px}.menu{display:flex;flex-direction:column;gap:19px}.menu .title{padding:10px 0 12px}.tag{color:var(--ui);font:16px monospace;letter-spacing:3px}.row{display:flex;gap:12px;align-items:center;justify-content:space-between}.row>*{flex:1}.stats{padding:20px 0;border-top:1px solid var(--grid);border-bottom:1px solid var(--grid)}.stat small{display:block;color:var(--secondary);font-size:15px;margin-bottom:8px}.stat b{font:27px monospace}.stat{flex:1}.muted{color:var(--secondary);font-size:17px}.small{font-size:16px}.cards{display:grid;gap:15px;margin:25px 0}.card{text-align:left;position:relative;padding:23px 25px;min-height:150px;border-left-width:6px}.card strong{display:block;font-size:28px;margin:10px 0}.card span{font-size:18px;font-weight:400;color:var(--secondary);letter-spacing:0}.card em{font-size:14px;font-style:normal;letter-spacing:3px}.card .corner{position:absolute;right:18px;top:16px}.shop-list{display:grid;gap:9px;margin:18px 0}.shop-item{min-height:69px;text-align:left;font-size:19px;display:flex;justify-content:space-between;align-items:center}.shop-item small{font-size:14px;color:var(--secondary)}.hud-top{position:absolute;top:28px;left:28px;right:28px}.hud-label{font:15px monospace;color:var(--secondary);letter-spacing:3px}.hud-value{font:26px monospace;margin-top:8px}.hud-right{text-align:right}.pause{position:absolute;right:28px;top:102px;pointer-events:auto;min-height:48px;font-size:18px}.health{height:6px;background:var(--grid);margin-top:14px}.health i{display:block;height:100%;background:var(--hp)}.xp{position:absolute;left:0;right:0;top:0;height:4px;background:var(--grid)}.xp i{height:100%;display:block;background:var(--ui)}.hud-foot{position:absolute;bottom:25px;left:30px;right:30px;font:14px monospace;color:var(--secondary);display:flex;justify-content:space-between}.boss-hud{position:absolute;left:170px;right:170px;top:130px;text-align:center;font-size:15px;color:var(--boss)}.boss-hud .health i{background:var(--boss)}#toast{position:absolute;bottom:60px;left:45px;right:45px;text-align:center;color:var(--ui);font-size:21px;letter-spacing:2px;pointer-events:none;opacity:0;transition:opacity .2s;background:var(--panel);padding:16px;border:1px solid var(--grid);border-radius:4px}#toast.show{opacity:1}#offline{position:absolute;bottom:6px;width:100%;text-align:center;font:11px monospace;color:var(--secondary);pointer-events:none}textarea{width:100%;height:240px;background:var(--bg);color:var(--text);border:1px solid var(--grid);padding:15px;font:15px monospace;user-select:text;-webkit-user-select:text;touch-action:auto;resize:none;margin:18px 0}.notice{min-height:30px;color:var(--gold);font-size:17px}.leaderboard{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:25px 0}.rank{background:var(--bg);padding:12px;font:20px monospace;color:var(--secondary)}select{width:100%;padding:13px;background:var(--bg);color:var(--text);border:1px solid var(--grid);font-size:20px}.instructions{padding:14px 0 0;font-size:17px}.brand-line{height:2px;width:78px;background:var(--ui);margin-bottom:25px}.version{font:12px monospace;color:var(--secondary);letter-spacing:3px}.end-score{font:70px monospace;color:var(--ui);margin:22px 0}.settings-line{margin:17px 0}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--gold);outline-offset:3px}

/* Scale the hit box to the phone, even when the logical canvas is smaller. */
button,select,.pause,.shop-item{min-height:max(58px,var(--touch-min,58px))}
.pause{min-width:var(--touch-min,58px)}
#overlay>.panel{max-height:100%;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
#overlay .panel *{touch-action:pan-y}
#overlay textarea{touch-action:auto}

.hud-top{right:calc(44px + var(--touch-min,88px))}.pause{top:24px;right:22px}

.skill-meta{display:block;margin-top:12px;font-size:15px;color:var(--ui);line-height:1.6}.skill-list{display:grid;gap:12px}.skill-entry{border:1px solid var(--grid);padding:16px;border-radius:5px}.skill-entry.available{border-left:3px solid var(--ui)}.skill-entry strong{font-size:22px}.skill-entry p{font-size:17px}.skill-entry small{color:var(--secondary);line-height:1.6}

.claim{position:absolute;right:22px;bottom:110px;pointer-events:auto;border:2px solid var(--gold);font-size:22px}.claim.ready{background:var(--gold);color:var(--bg)}
#overlay>.claim-panel{position:absolute;top:185px;left:24px;right:24px;width:auto;max-height:640px;padding:18px;background:var(--panel);box-shadow:none}.claim-panel .eyebrow{margin-bottom:6px}.claim-panel h2{font-size:26px}.claim-panel p{font-size:16px}.claim-panel .cards{gap:8px;margin:12px 0}.claim-panel .card{min-height:var(--touch-min);padding:10px 16px}.claim-panel .card strong{font-size:22px;margin:3px 0}.claim-panel .card em{font-size:11px}.claim-panel .card span{font-size:15px}.claim-panel .skill-meta{margin-top:3px;font-size:12px}.claim-panel button{font-size:17px}.claim-panel #reroll{margin-top:8px;width:100%}

.hud-top{background:var(--panel);padding:12px;border-radius:6px;top:12px;left:18px}.boss-hud{background:var(--panel);padding:7px;border-radius:4px;top:143px}.claim-panel .card .skill-meta{display:none}

/* 3.8: layered tactical dashboard; large touch surfaces and readable hierarchy. */
:root{--accent-soft:rgba(85,245,229,.09)}
button{border-radius:12px;letter-spacing:.5px;transition:background .12s,border-color .12s}
.panel{background:linear-gradient(155deg,var(--panel),var(--bg));border:1px solid var(--grid);border-top:3px solid var(--ui);border-radius:22px;box-shadow:0 18px 65px var(--black)}
.menu{gap:15px}.menu .title{padding:14px 0;position:relative}.menu .title:after{content:'TACTICAL / 038';position:absolute;right:0;bottom:18px;writing-mode:vertical-rl;letter-spacing:5px;color:var(--secondary);font:14px monospace}
h1{font-size:76px;letter-spacing:9px}.eyebrow{color:var(--gold);font-size:15px}.brand-line{width:100px;height:5px;background:var(--gold);border-radius:3px}
.stats{border:1px solid var(--grid);border-radius:12px;padding:16px;background:var(--accent-soft)}.stat b{color:var(--text)}.stat small{font-size:14px}
.primary{background:linear-gradient(115deg,var(--ui),var(--blue));color:var(--bg);box-shadow:none}.instructions{font-size:16px;line-height:1.8;border-top:1px solid var(--grid)}.menu>p{font-size:18px}.version{font-size:11px}
.hud-top{border:1px solid var(--grid);border-radius:14px;background:linear-gradient(115deg,var(--panel),var(--bg));padding:15px;top:15px}.hud-value{font-size:25px;font-weight:800;letter-spacing:.5px}.hud-label{font-size:13px;letter-spacing:2px}.health{height:9px;border-radius:6px;overflow:hidden}.health i{background:linear-gradient(90deg,var(--hp),var(--gold))}.hud-right .hud-value{color:var(--gold)}.boss-hud{top:153px;left:110px;right:110px;border:1px solid var(--boss);border-radius:10px;font-size:17px}.boss-hud:empty{display:none}
.hud-foot{background:var(--panel);border:1px solid var(--grid);border-radius:10px;bottom:24px;padding:12px;font-size:14px}.claim{border-radius:14px;bottom:115px;box-shadow:0 8px 24px var(--bg)}.pause{border-radius:14px;top:16px}
#toast{bottom:65px;left:55px;right:55px;font-size:19px;border-radius:12px;border-left:5px solid var(--gold);color:var(--text)}
.card{background:linear-gradient(110deg,var(--panel),var(--bg));border-radius:12px}.card strong{color:var(--text)}
@media (min-width:1000px){body{background:radial-gradient(ellipse at center,var(--grid),var(--bg) 65%)}#stage{box-shadow:0 0 100px var(--black)} }

.weapon-readout{position:absolute;top:210px;left:40px;right:40px;background:var(--panel);color:var(--gold);padding:10px;text-align:center;font:20px monospace;border-radius:10px}.inventory{position:absolute;bottom:100px;left:70px;right:70px;display:flex;gap:12px;pointer-events:auto}.inventory button{flex:1;font-size:20px;border-color:var(--gold)}

.item-icon{width:68px;height:68px;float:left;margin:0 16px 8px 0}.shop-item{background:linear-gradient(120deg,var(--panel),var(--bg));border-radius:15px;border-left:3px solid var(--gold);padding:18px}.shop-item small{line-height:1.8}.inventory button{background:linear-gradient(135deg,var(--grid),var(--panel))}

.inventory .item-icon{width:44px;height:44px;float:none;display:block;margin:0 auto 5px}.inventory button{padding:8px}.inventory span{font-size:18px}

/* 4.6: edge-only combat HUD. Keep the center lane free of persistent panels. */
#hud.covered{visibility:hidden}
.hud-top{top:10px;left:16px;right:calc(32px + var(--touch-min,88px));height:116px;padding:10px 14px;align-items:flex-start;border-radius:12px}
.hud-top .hud-label{font-size:17px;letter-spacing:0;white-space:nowrap}.hud-top .hud-value{font-size:25px;margin-top:5px}.hud-top .health{margin-top:8px;height:7px}.hud-right .small{font-size:17px;line-height:1.4;white-space:nowrap}
.weapon-readout{top:93px;left:32px;right:calc(46px + var(--touch-min,88px));padding:0;height:24px;background:none;text-align:left;font:18px system-ui;letter-spacing:.5px;overflow:hidden;white-space:nowrap}
.pause{top:10px;right:16px;padding:10px;border-radius:12px}
.boss-hud{top:135px;left:100px;right:100px;font-size:16px;padding:5px 10px;background:var(--panel);border-radius:8px}.boss-hud .health{height:5px;margin-top:5px}
.inventory{bottom:34px;left:100px;right:100px;gap:14px}.inventory button{min-height:max(72px,var(--touch-min,72px));padding:6px;border-width:1px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px}.inventory .item-icon{width:34px;height:34px;margin:0;display:inline-block}.inventory span{font-size:18px;white-space:nowrap}
.hud-foot{bottom:5px;left:25px;right:25px;padding:4px 8px;border:0;border-radius:0;background:none;font:15px system-ui;white-space:nowrap}
#toast{bottom:auto;top:192px;left:45px;right:45px;padding:8px 12px;font-size:17px;line-height:1.4;max-height:66px;overflow:hidden;border-left-width:3px;opacity:0}#toast.show{opacity:.95}

```

## android-offline/AndroidManifest.xml
```
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.obsidian.protocol" android:versionCode="40700" android:versionName="4.7.0">
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/>
    <application android:label="黑曜防线" android:icon="@drawable/launcher"
        android:hardwareAccelerated="true" android:allowBackup="false"
        android:usesCleartextTraffic="false" android:enableOnBackInvokedCallback="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity android:name=".GameActivity" android:exported="true"
            android:screenOrientation="portrait" android:windowSoftInputMode="adjustResize"
            android:configChanges="orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>

```

## android-offline/GameActivity.java
```
package com.obsidian.protocol;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;

/** Android owns lifecycle, insets and Back. The WebView loads exclusively from APK assets. */
public final class GameActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private AlertDialog exitDialog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 9, 22));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8, 9, 22));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if (!"https".equals(request.getUrl().getScheme()) || !HOST.equals(request.getUrl().getHost())
                        || path == null || !path.matches("/[a-zA-Z0-9_./-]+") || path.contains(".."))
                    return missing();
                try {
                    return new WebResourceResponse(mime(path), path.endsWith(".png") ? null : "UTF-8",
                            getAssets().open("www" + path));
                } catch (IOException ignored) {
                    return missing();
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()) || !"https".equals(request.getUrl().getScheme());
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int left = 0, right = 0, top = 0, bottom = 0;
            if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                left = insets.getDisplayCutout().getSafeInsetLeft();
                right = insets.getDisplayCutout().getSafeInsetRight();
                top = insets.getDisplayCutout().getSafeInsetTop();
                bottom = insets.getDisplayCutout().getSafeInsetBottom();
            }
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.mandatorySystemGestures() | WindowInsets.Type.ime());
                left = Math.max(left, bars.left); right = Math.max(right, bars.right);
                top = Math.max(top, bars.top); bottom = Math.max(bottom, bars.bottom);
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });
        immersive();
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private static String mime(String path) {
        String name = path.toLowerCase(Locale.ROOT);
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".json")) return "application/json";
        return "text/html";
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null,
                new ByteArrayInputStream(new byte[0]));
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (exitDialog != null && exitDialog.isShowing()) return;
        web.evaluateJavascript("window.obsidianBack ? window.obsidianBack() : 'exit'", result -> {
            if (!"\"exit\"".equals(result) && !"\"run-exit\"".equals(result)) return;
            if (isFinishing() || isDestroyed()) return;
            exitDialog = new AlertDialog.Builder(this).setTitle("退出黑曜防线？")
                    .setMessage("\"run-exit\"".equals(result) ? "退出会结束这场未结算的行动。" : "基地进度已保存在手机上。")
                    .setNegativeButton("留在游戏", null)
                    .setPositiveButton("退出", (dialog, which) -> finish()).show();
        });
    }

    @Override protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.obsidianLifecycle && window.obsidianLifecycle(true)", null);
        web.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        web.onResume();
        web.evaluateJavascript("window.obsidianLifecycle && window.obsidianLifecycle(false)", null);
    }

    @Override protected void onDestroy() {
        if (exitDialog != null) exitDialog.dismiss();
        ((android.view.ViewGroup) web.getParent()).removeView(web);
        web.destroy();
        super.onDestroy();
    }
}

```

## tools/build_android.py
```
"""Build the offline Android test APK with JDK 17 and Android SDK 35, without Gradle."""
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".build"
SDK = Path(os.environ.get("ANDROID_HOME", CACHE))
TOOLS = Path(os.environ.get("OBSIDIAN_BUILD_TOOLS", SDK / "build-tools" / "35.0.0"))
if not (TOOLS / "aapt2.exe").exists():
    TOOLS = CACHE / "tools" / "android-15"
PLATFORM = SDK / "platforms" / "android-35" / "android.jar"
if not PLATFORM.exists():
    PLATFORM = CACHE / "platform" / "android-35" / "android.jar"
JDK = Path(os.environ.get("JAVA_HOME", r"C:\Program Files\Java\jdk-17"))
JAVA = JDK / "bin" / "java.exe"

def run(*args, **kwargs):
    subprocess.run([str(item) for item in args], check=True, **kwargs)

def main():
    CACHE.mkdir(exist_ok=True)
    if not PLATFORM.is_file() or not JAVA.is_file() or not (TOOLS / "aapt2.exe").is_file():
        raise SystemExit("Set JAVA_HOME to JDK 17 and ANDROID_HOME to SDK with platform 35 and build-tools 35.0.0.")
    run("node", ROOT / "tools" / "prepare-apk.mjs")
    out = ROOT / "dist"
    out.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=CACHE) as folder:
        stage = Path(folder)
        res = stage / "res" / "drawable-nodpi"
        res.mkdir(parents=True)
        shutil.copyfile(ROOT / "icons/icon-192.png", res / "launcher.png")
        run(TOOLS / "aapt2.exe", "compile", "--dir", res.parent, "-o", stage / "res.zip")
        run(TOOLS / "aapt2.exe", "link", "-I", PLATFORM, "--manifest", ROOT / "android-offline/AndroidManifest.xml",
            "-o", stage / "raw.apk", stage / "res.zip")
        classes = stage / "classes"
        classes.mkdir()
        run(JDK / "bin/javac.exe", "-encoding", "UTF-8", "--release", "8", "-classpath", PLATFORM,
            "-d", classes, ROOT / "android-offline/GameActivity.java")
        dex = stage / "dex"
        dex.mkdir()
        run(JAVA, "-cp", TOOLS / "lib/d8.jar", "com.android.tools.r8.D8", "--release", "--min-api", "26",
            "--lib", PLATFORM, "--output", dex, *classes.rglob("*.class"))
        with zipfile.ZipFile(stage / "raw.apk", "a", zipfile.ZIP_DEFLATED) as apk:
            apk.write(dex / "classes.dex", "classes.dex")
            for asset in sorted((ROOT / "www").rglob("*")):
                if asset.is_file():
                    apk.write(asset, "assets/www/" + asset.relative_to(ROOT / "www").as_posix())
        run(TOOLS / "zipalign.exe", "-p", "4", stage / "raw.apk", stage / "aligned.apk")
        # Keep the local test identity for subsequent update installs. Never ship the private key.
        key, password = CACHE / "phone-test.p12", CACHE / "phone-test.password"
        if key.exists() and not password.exists():
            raise SystemExit("The existing local signing key password is missing.")
        if not password.exists():
            password.write_text(secrets.token_urlsafe(32), encoding="ascii")
        env = dict(os.environ, OBSIDIAN_SIGN_PASSWORD=password.read_text(encoding="ascii").strip())
        if not key.exists():
            run(JDK / "bin/keytool.exe", "-genkeypair", "-keystore", key, "-storetype", "PKCS12",
                "-alias", "phone-test", "-storepass:env", "OBSIDIAN_SIGN_PASSWORD", "-keyalg", "RSA",
                "-keysize", "3072", "-validity", "9000", "-dname", "CN=Obsidian Protocol Local Test", env=env)
        signer = TOOLS / "lib/apksigner.jar"
        signed = stage / "signed.apk"
        run(JAVA, "-jar", signer, "sign", "--ks", key, "--ks-key-alias", "phone-test",
            "--ks-pass", "env:OBSIDIAN_SIGN_PASSWORD", "--out", signed, stage / "aligned.apk", env=env)
        run(JAVA, "-jar", signer, "verify", "--verbose", signed)
        run(TOOLS / "zipalign.exe", "-c", "4", signed)
        with zipfile.ZipFile(signed) as apk:
            assert apk.testzip() is None
            for p in (ROOT / "www").rglob("*"):
                if p.is_file():
                    assert apk.read("assets/www/" + p.relative_to(ROOT / "www").as_posix()) == p.read_bytes()
        target = out / "Obsidian-Protocol-4.7.0-Android.apk"
        shutil.copyfile(signed, target)
        print(target, target.stat().st_size, "bytes", hashlib.sha256(target.read_bytes()).hexdigest())

if __name__ == "__main__":
    main()

```

## tools/build_web.py
```
"""Emit a double-click, offline HTML demo with the same production ES modules."""
from pathlib import Path
import json,re,base64
root=Path(__file__).resolve().parents[1]
modules={}
for p in (root/'js').glob('*.js'):
 code=p.read_text(encoding='utf-8')
 code=re.sub(r"from\s*(['\"])\./([^'\"]+)\.js\1",lambda m:"from 'obsidian/"+m[2]+"'",code)
 if p.stem=='main':
  start=code.index("if(location.hostname===")
  code=code[:start]+"status.textContent='离线试玩 · 鼠标拖动 / A D / 左右方向键';\n"
 modules['obsidian/'+p.stem]=code
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="manifest" href="./manifest.json">','').replace('<link rel="stylesheet" href="./css/style.css">','<style>'+(root/'css/style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('./icons/icon-192.png','data:image/png;base64,'+base64.b64encode((root/'icons/icon-192.png').read_bytes()).decode())
data=json.dumps(modules,ensure_ascii=False).replace('</','<\\/')
boot='<script>const modules='+data+';const imports={};for(const [name,code]of Object.entries(modules))imports[name]=URL.createObjectURL(new Blob([code],{type:"text/javascript"}));const map=document.createElement("script");map.type="importmap";map.textContent=JSON.stringify({imports});document.head.appendChild(map);import("obsidian/main");</script>'
html=html.replace('<script type="module" src="./js/main.js"></script>',boot)
out=root/'dist'/'Obsidian-Protocol-3.8.0-Web.html';out.write_text(html,encoding='utf-8');print(out)

```

## tools/generate_icons.py
```
"""纯 Python 标准库绘制本地图标；PNG 无需任何第三方依赖。"""
import json, re, struct, zlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
palette = dict(re.findall(r"(\w+):'(#[0-9a-fA-F]{6})'", (ROOT/'js/config.js').read_text(encoding='utf-8')))
def rgb(name): return bytes.fromhex(palette[name][1:])
def inside(x,y,points):
    result=False
    for i,(ax,ay) in enumerate(points):
        bx,by=points[i-1]
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax: result=not result
    return result
def png(size):
    rows=[]
    outer=[(.5,.19),(.73,.63),(.65,.76),(.5,.65),(.35,.76),(.27,.63)]
    inner=[(.5,.32),(.59,.56),(.5,.52),(.41,.56)]
    for y in range(size):
        row=bytearray(b'\0')
        for x in range(size):
            u,v=x/size,y/size
            color='bg'
            if x%(size//12)==0 or y%(size//12)==0: color='panel'
            if abs(((u-.5)**2+(v-.5)**2)**.5-.35)<.006: color='grid'
            if inside(u,v,outer): color='player'
            if inside(u,v,inner): color='bg'
            if .48<u<.52 and .69<v<.82: color='gold'
            row.extend(rgb(color))
        rows.append(row)
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
(ROOT/'icons').mkdir(exist_ok=True)
for size in (192,512): (ROOT/f'icons/icon-{size}.png').write_bytes(png(size))
print('Generated local 192px and 512px PNG icons.')

```

## tools/prepare-apk.mjs
```
import {mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'www');
async function copy(from,to){await mkdir(to,{recursive:true});for(const e of await readdir(from,{withFileTypes:true})){if(e.isDirectory())await copy(path.join(from,e.name),path.join(to,e.name));else await copyFile(path.join(from,e.name),path.join(to,e.name));}}
await mkdir(out,{recursive:true});
for(const dir of ['css','js','icons'])await copy(path.join(root,dir),path.join(out,dir));
for(const file of ['index.html','manifest.json','sw.js'])await copyFile(path.join(root,file),path.join(out,file));
await writeFile(path.join(root,'capacitor.config.json'),JSON.stringify({appId:'com.obsidian.protocol',appName:'黑曜防线',webDir:'www',backgroundColor:'#080916',android:{backgroundColor:'#080916',allowMixedContent:false}},null,2));
console.log('Prepared www and capacitor.config.json. No bundler required.');

```

## tests/balance.mjs
```
import assert from 'node:assert/strict';
import {BALANCE as B} from '../js/config.js';
import {Mode,difficulty} from '../js/modes.js';
import {player,spawnEnemy,initEntities,updateEntities,directMultiplier,hit} from '../js/entities.js';
import {Runway,chargeGate,gateResult,makeGate,armyPressure,chargeThreshold,gateLabel} from '../js/runway.js';
import {Particles} from '../js/particles.js';
import {UPGRADES,choices,rankOf,canChoose,specialization} from '../js/upgrades.js';
import {restoreProgress,freshProgress,validateProgress} from '../js/progression.js';
const max=120n;
assert.equal(gateResult(120n,{kind:'multiply',value:11n,scale:10n}),132n);
assert.equal(gateResult(121n,{kind:'multiply',value:11n,scale:10n}),133n);
assert.equal(gateResult(110n,{kind:'add',value:100000n}),100110n);
assert.equal(gateResult(150n,{kind:'divide',value:15n,scale:10n}),100n);
assert.equal(validateProgress({...freshProgress(),squad:String(10n**400n)}).squad,String(10n**400n));
for(const kind of ['multiply','divide']){const gate={kind,value:kind==='add'?-8n:15n,scale:10n,charge:0n};chargeGate(gate,10n**400n);assert.ok(gate.value<=BigInt(B.track.maxMultiplier*10));}
const decimal={kind:'multiply',value:10n,scale:10n,charge:0n};let microsToDouble=0n;
while(decimal.value<20n){const cost=chargeThreshold(decimal);microsToDouble+=cost;chargeGate(decimal,cost);}
assert.ok(microsToDouble>16000000n&&microsToDouble<17000000n);
assert.equal(gateLabel(decimal),'×2');
const partial={kind:'multiply',value:11n,scale:10n,charge:0n};chargeGate(partial,1000000n);assert.ok(partial.value<15n);
const negative={kind:'add',value:-8n,scale:10n,charge:0n};chargeGate(negative,BigInt(B.track.gateAddMicros*9));assert.equal(negative.value,1n);
const penalty={kind:'divide',value:15n,scale:10n,charge:0n};chargeGate(penalty,BigInt(B.track.gateDivideMicros*5+B.track.gateMultiplyMicros));assert.equal(gateLabel(penalty),'×1.1');
let rng=90210;const random=()=> (rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296;
const ratio=count=>{let bad=0;for(let i=0;i<2000;i++){const gate=makeGate(i,count,random);if(gate.kind==='divide'||gate.value<0n)bad++;}return bad/2000;};
for(const population of [2n,30n,1000n]){const bad=ratio(population);assert.ok(bad>.45&&bad<.55,'符号独立随机，不受人数控制');}
assert.ok(armyPressure(1000n)>armyPressure(120n));assert.ok(Number.isFinite(armyPressure(10n**400n)));
function game(){const g={p:player(),mode:new Mode('campaign'),time:0,state:'playing',ui:{toast(){}},input:{move(){}},fx:new Particles(),runway:new Runway(),kills:0,score:0,coins:0,freeze:0,shake:0,spawnEnemy(type){return spawnEnemy(this,type);},finish(win){this.state='ended';this.won=win;},levelUp(){this.p.xp=0;}};initEntities(g);g.mode.next(g);return g;}
const g=game(),weak=spawnEnemy(g,0),hp=weak.hp;
const row=g.runway.rows[0], gate=row.gates[0];
g.runway.drums=[];
g.runway.intercept({x:gate.x,py:row.y+2,y:row.y,active:true,hits:new Set(),mass:10n**400n},g,()=>{});
assert.equal(gate.charge,0n,'同帧弹数不放大充能');assert.equal(gate.lastHit,g.time);
g.p.squad=max;
for(let i=0;i<300;i++)g.mode.update(g,B.step);
assert.ok(g.mode.pressureSquad>105&&g.mode.pressureSquad<120,'5秒平滑追踪，非瞬时暴涨');
assert.equal(weak.hp,hp,'场上敌人不会因人数增加而回血');
const stronger=spawnEnemy(g,0);assert.ok(stronger.hp>hp*5);
const dense=difficulty(g.mode,1,120n),sparse=difficulty(g.mode,1,2n),larger=difficulty(g.mode,1,1000n);
assert.ok(larger.population>dense.population&&larger.pack>dense.pack&&larger.interval<dense.interval,'超过120仍增加总量密度频率');
assert.ok(dense.pack>sparse.pack&&dense.population>sparse.population&&dense.interval<sparse.interval);
const boostedBudget=g.mode.budget;g.p.squad=2n;
for(let i=0;i<600;i++)g.mode.update(g,B.step);
assert.ok(g.mode.pressureSquad<15,'减员后压力逐渐降低');assert.equal(g.mode.budget,boostedBudget,'不反复增加同一波预算');
// 一直躲在强化区不能跳过首领。
const idle=game();idle.mode.local=2;idle.mode.wave=2;idle.mode.next(idle);idle.runway.rows=[];idle.runway.drums=[];idle.runway.nextRow=1e5;
const boss=spawnEnemy(idle,4);boss.y=B.bossBreachY-1;
for(let i=0;i<30&&idle.state==='playing';i++)updateEntities(idle,B.step);
assert.equal(idle.won,false);
function pick(p,id){const u=UPGRADES.find(u=>u.id===id);assert.ok(canChoose(p,u),id);u.apply(p);p.upgradeHistory.push(id);}
for(const branch of ['artillery','elements','engineer']){
 const p=player();p.level=5;p.upgradeHistory=[];
 assert.deepEqual(new Set(choices(p).map(u=>u.id)),new Set(['spec_artillery','spec_elements','spec_engineer']));
 pick(p,'spec_'+branch);assert.equal(specialization(p),'spec_'+branch);
 assert.ok(choices(p).every(u=>!u.id.startsWith('spec_')));
 if(branch==='artillery'){pick(p,'pierce');pick(p,'pierce');pick(p,'multi');pick(p,'multi');pick(p,'breach');pick(p,'breach');pick(p,'salvo');pick(p,'execution');assert.ok(directMultiplier(p,{type:4,hp:20,maxHP:100})>2);}
 if(branch==='elements'){pick(p,'chain');pick(p,'burn');pick(p,'conduction');pick(p,'conduction');pick(p,'ignite');pick(p,'ignite');pick(p,'overload');assert.ok(directMultiplier(p,{type:0,freeze:1,burn:1})>2);assert.equal(directMultiplier(p,{type:0,freeze:0,burn:0}),1);}
 if(branch==='engineer'){pick(p,'drone');pick(p,'armor');pick(p,'support');pick(p,'support');pick(p,'field_repair');pick(p,'swarm');assert.equal(p.swarm,true);assert.ok(p.repairOnKill>0);}
 const restored=restoreProgress(player(),{...freshProgress(),history:p.upgradeHistory});
 assert.equal(specialization(restored),'spec_'+branch);assert.equal(restored.execution,p.execution);assert.equal(restored.overload,p.overload);assert.equal(restored.swarm,p.swarm);
 for(let i=0;i<30;i++){const c=choices(p);assert.equal(new Set(c.map(u=>u.id)).size,3);assert.ok(c.every(u=>canChoose(p,u)));}
}
const maxed=player();maxed.upgradeHistory=Array(10).fill('damage');assert.ok(!canChoose(maxed,UPGRADES[0]));
console.log('PASS: decimal gate gains, uncapped army, legacy army preservation, smooth adaptive HP/density/budget, no enemy healing, all 3 branches and capstones, prerequisite/rank/exclusivity, carryover.');
console.log({smallArmy:{pack:sparse.pack,budget:sparse.population,interval:sparse.interval},fullArmy:{pack:dense.pack,budget:dense.population,interval:dense.interval}});

// 召唤火力随编队增长，专精同时作用于伤害和攻击间隔。
const engineer=game();engineer.runway.rows=[];engineer.runway.drums=[];engineer.p.squad=120n;engineer.p.drone=1;engineer.p.support=2;engineer.p.swarm=true;engineer.p.fire=10;
const dummy=spawnEnemy(engineer,0);dummy.y=300;
updateEntities(engineer,B.step);
const drone=engineer.bullets.items.find(b=>b.active);
assert.equal(drone.mass,20n);
assert.ok(drone.damage>engineer.p.damage);
assert.ok(engineer.p.droneTimer<B.droneInterval/2);
// 爆燃不递归触发，维修只按真正击杀结算。
engineer.p.ignite=.6;engineer.p.repairOnKill=.2;engineer.p.hp=50;
const burned=spawnEnemy(engineer,0),neighbor=spawnEnemy(engineer,0);burned.x=neighbor.x=500;burned.y=neighbor.y=500;burned.burn=1;burned.hp=1;neighbor.hp=neighbor.maxHP=1000;
hit(engineer,burned,2,false,true);
assert.ok(neighbor.hp<1000);assert.ok(engineer.p.hp>50);
console.log('PASS: drone army share, engineering cadence/damage, burn detonation and kill repair execute in combat.');

// 实际固定步长：长时间射击可把除门变成×2，不能叠出多扇缓行门。
const focused=game();focused.runway.rows=[];focused.runway.addRow(118,100n);focused.runway.rows[0].gates[0]={kind:'divide',value:15n,scale:10n,x:192,charge:0n,lastHit:-Infinity};
focused.p.squad=100n;let reachedDouble=false;
for(let i=0;i<30*60;i++){
 focused.time+=B.step;
 const row=focused.runway.rows[0];
 if(row){const gate=row.gates[0];focused.runway.intercept({x:192,py:row.y+2,y:row.y,hits:new Set(),active:true,mass:1000000000n},focused,()=>{});if(gate.kind==='multiply'&&gate.value>=20n)reachedDouble=true;}
 focused.runway.update(focused,B.step);
 assert.ok(focused.runway.rows.length<=1);
}
assert.ok(reachedDouble,'持续射击可实际达到×2以上');assert.ok(focused.p.squad>=200n);
console.log('PASS: timed shooting converts a penalty gate to ×2+, army grows beyond 120, only one gate at a time.');

const live=game();live.p.squad=120n;live.runway.rows=[];live.runway.drums=[];live.runway.addRow(118,120n);live.runway.rows[0].gates[0]={kind:'divide',value:15n,scale:10n,x:192,charge:0n,lastHit:-Infinity};
let liveDouble=false;
for(let i=0;i<35*60;i++){
 live.time+=B.step;updateEntities(live,B.step);live.fx.update(B.step);
 if(live.runway.rows.some(row=>row.gates[0].kind==='multiply'&&row.gates[0].value>=20n))liveDouble=true;
}
assert.ok(liveDouble,'生产射击弹道可以把门提升到×2');assert.ok(live.p.squad>=240n);
console.log('PASS: real automatic volleys charge a division gate to ×2 and grow the squad above 240.');

```

## tests/benchmark47.mjs
```
import {weaponStats} from '../js/combat.js';
import assert from 'node:assert/strict';
import {Game,Input} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,updateEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {updateLoot,unlockHits,useItem} from '../js/loot.js';
import {BALANCE as B} from '../js/config.js';
let seed=Number(process.env.SEED||902);Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const sim=game();sim.input.move=(p,dt)=>{const threats=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=sim.runway.rows[0]?.gates[0],loot=sim.loot.find(o=>o.y>350),zones=sim.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};
const report=[];for(let stage=1;stage<=10;stage++){sim.start('campaign',stage);let peak=0,sum=0,samples=0,peakGems=0;const born=new Map(),lifetimes=[];const orig=sim.spawnEnemy;sim.spawnEnemy=function(type){const e=orig.call(this,type);if(e)born.set(e.id,{e,t:this.time});return e;};for(let tick=0;tick<600*60&&sim.state==='playing';tick++){sim.time+=1/60;sim.mode.update(sim,1/60);if(sim.state==='playing')updateEntities(sim,1/60);sim.fx.update(1/60);peak=Math.max(peak,sim.enemies.count);peakGems=Math.max(peakGems,sim.gems.count);sum+=sim.enemies.count;samples++;for(const [id,o] of born)if(!o.e.active||o.e.id!==id){lifetimes.push(sim.time-o.t);born.delete(id);}if(tick%60===0&&sim.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(sim,id);}sim.spawnEnemy=orig;const row={...weaponStats(sim.p),peak,average:Math.round(sum/samples*10)/10,peakGems,meanLife:Math.round(lifetimes.reduce((a,b)=>a+b,0)/Math.max(1,lifetimes.length)*100)/100,stage,seconds:Math.round(sim.time),hp:sim.p.hp,kills:sim.kills,shots:sim.p.shots,squad:String(sim.p.squad),next:save.data.campaign.nextStage};report.push(row);console.log(row);if(sim.p.hp<=0)break;}
if(process.env.REPORT){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.REPORT,JSON.stringify(report,null,2));}
assert.equal(report.length,10);assert.ok(report.every(r=>r.hp>0));

```

## tests/browser.mjs
```
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const tab=await(await fetch('http://127.0.0.1:9229/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map(),errors=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.clearBrowserCache');await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8766',storageTypes:'all'});await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2.6,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:8766/'});await wait(2200);
 assert.equal(await evaluate('document.querySelector("h1").textContent'),'黑曜防线.');
 assert.equal(await evaluate('window.obsidianDiagnostics().dpr'),2);
 await evaluate('navigator.serviceWorker.ready');await wait(300);
 const resources=await evaluate('(async()=>{const c=await caches.open("obsidian-protocol-android-v3-8");return (await c.keys()).length})()');assert.equal(resources,21);
 await mkdir('screenshots',{recursive:true});await writeFile('screenshots/menu.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 await evaluate('document.querySelector("#campaign").click()');await wait(120);
 await writeFile('screenshots/runway.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 await wait(1550);
 let d=await evaluate('obsidianDiagnostics()');assert.equal(d.state,'playing');assert.ok(d.time>.5);
 const inspect = code => evaluate('(async()=>{const {game:g}=await import("./js/main.js");'+code+'})()');
 assert.equal(await inspect('return g.enemies.items.filter(e=>e.active).every(e=>e.x>=84&&e.x<=636) && g.runway.rows.every(r=>r.gates.every(t=>t.x===192))'),true);
 const startPosition = await inspect('return [g.p.x,g.p.y,Number(g.p.squad)]');
 assert.equal(startPosition[2],2);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:85,y:655,id:1}]});
 await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:750,id:1}]});
 await wait(700);
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const moved = await inspect('return [g.p.x,g.p.y]');
 assert.ok(moved[0]>430);
 assert.equal(moved[1],startPosition[1]);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:280,y:750,id:2}]});
 await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:85,y:750,id:2}]});
 await wait(500); await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await inspect("g.runway.rows[0].y=g.p.y;Object.assign(g.runway.rows[0].gates[0],{kind:'add',value:20n,lastHit:-Infinity});g.p.x=528;g.runway.update(g,1/60);");
 assert.ok(await inspect('return g.p.squad>2n'),'左侧强化门扩队');
 assert.equal(await inspect('return g.input.pointer'),null);
 if(await inspect('return g.state')==='upgrade') await evaluate('document.querySelector("#pick-0").click()');
 await evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');
 const hiddenTime=await evaluate('obsidianDiagnostics().time');await wait(250);assert.equal(await evaluate('obsidianDiagnostics().time'),hiddenTime);
 await evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');await wait(150);assert.ok(['playing','upgrade'].includes(await evaluate('obsidianDiagnostics().state')));
 await evaluate('document.querySelector("#pick-0")?.click();document.querySelector("#pause").click()');assert.equal(await inspect('return g.state'),'paused');let t=await evaluate('obsidianDiagnostics().time');await wait(300);assert.equal(await evaluate('obsidianDiagnostics().time'),t);await evaluate('document.querySelector("#resume").click()');
 // 首关完整推进由 runway.mjs 验证；浏览器构造关底场景检查布局和渲染。
 await inspect('g.enemies.clear();g.mode.local=2;g.mode.wave=2;g.mode.next(g);g.p.squad=250n;g.p.nextXP=1e9;g.p.xp=0;');
 await wait(2400);
 assert.ok(await inspect('return g.enemies.items.some(e=>e.active&&e.type===4&&e.x===360)'));
 await writeFile('screenshots/first-boss.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 // 模块接口用于确定性集成测试，不在生产界面提供调试按钮。
 await inspect("if(g.state==='playing')g.p.xp=g.p.nextXP;");await wait(100);assert.equal(await evaluate('obsidianDiagnostics().state'),'playing');assert.equal(await evaluate('document.querySelectorAll(".card").length'),0);await evaluate('document.querySelector("#claim").click()');assert.equal(await evaluate('document.querySelectorAll(".card").length'),3);await writeFile('screenshots/upgrade.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));await evaluate('document.querySelector("#pick-0").click()');
 await evaluate('(async()=>{const {game:g}=await import("./js/main.js");const {UPGRADES}=await import("./js/upgrades.js");g.p.shots=5;g.p.pierce=3;g.p.chain=2;g.p.freeze=1;g.p.aura=2;g.p.burn=2;g.p.pendingUpgrades=1;g.applyUpgrade(UPGRADES[0]);g.p.hp=g.p.maxHP=120;g.p.invul=100;g.p.nextXP=1e9;g.p.xp=0;for(let i=0;i<100;i++){const e=g.spawnEnemy(i%4);if(!e)break;e.x=90+(i%10)*59;e.y=50-Math.floor(i/10)*45;}g.spawnEnemy(4);})()');await wait(3200);
 assert.equal(await evaluate('(async()=>(await import("./js/main.js")).game.p.synergies.size)()'),3);
 await writeFile('screenshots/combat.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 d=await evaluate('obsidianDiagnostics()');assert.equal(d.state,'playing');assert.ok(d.enemies<=120&&d.bullets<=400&&d.particles<=300);
 // 定点构造120人和小数门，确认人数显示不封顶、预期收益可见。
 await inspect("g.runway.rows=[];g.runway.addRow(620,120n);g.runway.rows[0].gates[0]={kind:'multiply',value:11n,scale:10n,x:192,charge:0n,lastHit:-Infinity};g.p.squad=120n;g.p.x=192;g.p.nextXP=1e9;g.p.xp=0;");
 await wait(150);await writeFile('screenshots/decimal-gate.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 assert.ok(await inspect("const {gateResult}=await import('./js/runway.js');return gateResult(120n,{kind:'multiply',value:11n,scale:10n})===132n"));
 // 后期双侧预警与护甲状态真实渲染；触摸移到中央缺口。
 await inspect("g.start('campaign',7);g.enemies.clear();g.mode.remaining=0;g.p.squad=60n;g.p.nextXP=1e9;g.p.xp=0;g.p.x=g.p.px=192;const boss=g.spawnEnemy(4);boss.strikes=1;boss.strikeTimer=.01;");
 await wait(250);
 assert.equal(await inspect('return g.hazards.count'),2);
 await writeFile('screenshots/boss-warning.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:110,y:740,id:7}]});
 await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:206,y:740,id:7}]});
 await wait(500);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(1200);
 assert.ok(await inspect('return Math.abs(g.p.x-360)<20&&g.p.hp===g.p.maxHP'));
 // 静默升级不释放正在拖动的指针；开启/关闭不重抽；批领保留等级并跨关。
 await inspect("const {save,fresh}=await import('./js/save.js');save.data=fresh();g.start('campaign',1);g.input.pointer=77;g.p.xp=147;g.levelUp();return g.p.pendingUpgrades;");
 assert.equal(await inspect('return g.p.pendingUpgrades'),4);
 assert.equal(await inspect('return g.input.pointer'),77);
 assert.equal(await inspect('return g.state'),'playing');
 await inspect('g.openUpgrades();');
 assert.equal(await inspect('return g.input.pointer'),77);
 const clock=await inspect('return g.time');await wait(300);assert.ok(await inspect('return g.time')>clock);
 await evaluate('document.querySelector("#pick-0").click();document.querySelector("#claim-all").click()');
 assert.equal(await inspect('return g.p.pendingUpgrades'),0);
 assert.equal(await inspect('return g.p.upgradeHistory.length'),4);
 assert.equal(await inspect('return g.state'),'playing');
 await inspect('g.input.reset();g.p.xp=g.p.nextXP;g.levelUp();g.gems.clear();g.finish(true);document.querySelector("#again").click();');
 assert.equal(await inspect('return g.p.pendingUpgrades'),1);
 await inspect("g.start('endless');g.p.squad=80n;const {breach}=await import('./js/entities.js');breach(g,g.spawnEnemy(0));g.render(1);");
 assert.equal(await inspect('return g.p.hp'),110);assert.ok(await inspect('return g.edgeWarning')>0);
 await writeFile('screenshots/breach-warning.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 // 专精卡片、技能路线及返回操作走真实移动端UI。
 await inspect("const {save,fresh}=await import('./js/save.js');save.data=fresh();g.start('campaign',1);g.p.level=4;g.p.nextXP=52;g.p.xp=52;g.levelUp();g.openUpgrades();");
 assert.equal(await evaluate('document.querySelectorAll(".card").length'),3);
 assert.ok(await evaluate('document.querySelector("#overlay").textContent.includes("工程专精")'));
 assert.equal(await evaluate('document.querySelector("#reroll").disabled'),true);
 await writeFile('screenshots/specializations.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 await evaluate('document.querySelector("#pick-0").click();document.querySelector("#pause").click();document.querySelector("#build").click()');
 assert.ok(await evaluate('document.querySelector("#overlay").textContent.includes("核心处决")'));
 await writeFile('screenshots/skill-tree.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 await evaluate('document.querySelector("#back").click();document.querySelector("#resume").click()');
 // 使用生产结算和下一关按钮检查继承，再重载页面检查存档恢复。
 const carried=await inspect("const {save,fresh}=await import('./js/save.js');const {UPGRADES}=await import('./js/upgrades.js');save.data=fresh();g.start('campaign',1);g.p.xp=g.p.nextXP+5;g.levelUp();g.applyUpgrade(UPGRADES[0]);g.persistGrowth();g.p.squad=45n;g.gems.clear();g.finish(true);document.querySelector('#again').click();return {stage:g.mode.stage,level:g.p.level,xp:g.p.xp,nextXP:g.p.nextXP,damage:g.p.damage,squad:String(g.p.squad)};");
 assert.deepEqual(carried,{stage:2,level:2,xp:5,nextXP:31,damage:28.32,squad:'45'});
 await send('Page.reload');await wait(800);
 assert.ok(await evaluate('document.querySelector("#campaign").textContent.includes("LV.2")'));
 await evaluate('document.querySelector("#campaign").click()');
 assert.deepEqual(await inspect('return {stage:g.mode.stage,level:g.p.level,xp:g.p.xp,nextXP:g.p.nextXP,damage:g.p.damage,squad:String(g.p.squad)}'),carried);
 await evaluate('(async()=>{const {game:g}=await import("./js/main.js");g.start("endless");g.score=12345;g.finish(false);})()');
 assert.equal(await evaluate('(async()=>(await import("./js/save.js")).save.data.top[0])()'),12345);
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send('Page.reload');await wait(1000);assert.equal(await evaluate('document.querySelector("h1").textContent'),'黑曜防线.');await evaluate('document.querySelector("#endless").click()');await wait(600);assert.equal(await evaluate('obsidianDiagnostics().state'),'playing');
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'file:///D:/DSH/obsidian-protocol/dist/Obsidian-Protocol-3.8.0-Web.html'});await wait(1000);
 assert.equal(await evaluate('document.querySelector("h1").textContent'),'黑曜防线.');
 await evaluate('document.querySelector("#endless").click()');await wait(300);
 const desktopTime=await evaluate('obsidianDiagnostics().time');await wait(250);assert.ok(await evaluate('obsidianDiagnostics().time')>desktopTime);
 await writeFile('screenshots/desktop-web.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
 assert.equal(errors.length,0,JSON.stringify(errors));console.log(JSON.stringify({status:'PASS',cacheResources:resources,checks:['forward volleys','alternating gates and frontal horde','horizontal-only drag','automatic gate settlement off-lane','final-wave slow boss','background lifecycle','mobile letterbox','DPR cap','menu','combat','pause','silent multi-level gains and batch claims','3 synergies','100 enemies + boss','pool limits','boss dual-lane warning and touch dodge','specialization cards and skill tree','cross-stage upgrades, pending claims and army','reload restores campaign level and XP','score save','offline reload and play','10 HP breach and red edges','double-click offline desktop HTML'],diagnostics:d,errors},null,2));
}finally{await send('Page.close').catch(()=>{});ws.close();}

```

## tests/campaign.mjs
```
import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {initEntities,updateEntities} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {save,fresh} from '../js/save.js';
import {BALANCE as B} from '../js/config.js';
let seed=487;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};save.data=fresh();
const g=Object.create(Game.prototype);g.fx=new Particles();initEntities(g);
let cards,won,stageTarget=1;
g.ui=new Proxy({overlay:{innerHTML:''},upgrade(c){cards=c;},result(w){won=w;}},{get:(obj,key)=>obj[key]||(()=>{})});
g.input={reset(){},move(p,dt){
 const row=g.runway.rows[0];const enemies=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y);const danger=enemies.find(e=>e.type!==4&&e.y>540);
 const gate=row?.gates[0];let aim=danger?danger.x-10:gate&&(gate.kind==='divide'||gate.value<10n||p.squad<BigInt([35,90,180][stageTarget-1]))?gate.x:(enemies[0]?.x??360);
 const zones=g.hazards.items.filter(h=>h.active&&(h.left<.9||h.flash>0));
 const width=(Math.min(Number(p.squad),B.track.columns)-1)*B.track.spacing/2;
 if(zones.some(h=>Math.abs(aim-h.x)<h.width+width+8)){
  const safe=[115,192,360,528,605].filter(x=>zones.every(h=>Math.abs(x-h.x)>h.width+width+8));
  safe.sort((a,b)=>Math.abs(a-aim)-Math.abs(b-aim));aim=safe[0]??360;
 }
 const step=p.speed*B.track.strafeFactor*dt;p.x+=Math.max(-step,Math.min(step,aim-p.x));
}};
const order=['spec_artillery','damage','multi','pierce','breach','salvo','execution','rate'];
const results=[];
for(let stage=1;stage<=3;stage++){
 stageTarget=stage;g.start('campaign',stage);const startLevel=g.p.level,startCount=g.p.squad;let peak=0;
 for(let tick=0;tick<300*60&&g.state!=='ended';tick++){
  if(g.p.pendingUpgrades){g.openUpgrades();cards.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));g.choose(cards[0]);}
  g.time+=B.step;g.mode.update(g,B.step);if(g.state==='playing')updateEntities(g,B.step);g.fx.update(B.step);peak=Math.max(peak,g.enemies.count);
 }
 results.push({stage,startLevel,endLevel:g.p.level,startCount:String(startCount),count:String(g.p.squad),seconds:Math.round(g.time),kills:g.kills,peak,won});
 console.log(results.at(-1));assert.ok(g.p.squad>0n);assert.equal(won,true,'正常选卡与继承可以通过第'+stage+'关');
 if(stage>1)assert.ok(startLevel>1&&startCount>2n);
}
assert.ok(BigInt(results[2].count)>120n,'真实连续闯关人数可以突破120');
assert.ok(results[2].kills>results[1].kills&&results[1].kills>results[0].kills,'尸潮总量随成长增加');
console.log('PASS: three-stage campaign using production upgrade choices, saved stats, uncapped army and adaptive enemies.');console.log(results);

```

## tests/challenge.mjs
```
import assert from 'node:assert/strict';
import {BALANCE as B} from '../js/config.js';
import {player,initEntities,spawnEnemy,hit,hurt,healingFactor} from '../js/entities.js';
import {stageHealth,healthPressure,armorFactor,updateEnemyChallenge,updateHazards,warnStrike} from '../js/challenge.js';
import {Particles} from '../js/particles.js';
function game(stage){const g={p:player(),mode:{kind:'campaign',stage,wave:(stage-1)*3+3},time:0,state:'playing',fx:new Particles(),ui:{toast(){}},score:0,coins:0,kills:0,freeze:0,shake:0,finish(win){this.state='ended';this.won=win;}};initEntities(g);g.p.squad=300n;g.p.x=528;return g;}
assert.equal(stageHealth(1),1);assert.equal(stageHealth(2),1.28);assert.ok(stageHealth(10)>B.hpStageGrowth**9*5);assert.ok(healthPressure(10000n)>healthPressure(1000n)*5);
const g=game(4),tank=spawnEnemy(g,2);const shield=tank.shield,hp=tank.hp;
hit(g,tank,100,false,true);assert.ok(Math.abs(shield-tank.shield-35)<.001);assert.equal(tank.hp,hp);
g.p.pierce=2;const before=tank.shield;hit(g,tank,100,false,true);assert.ok(Math.abs(before-tank.shield-100)<.001);
hit(g,tank,10,false,false);assert.ok(tank.hp<hp,'持续伤害绕过护甲');
hit(g,tank,tank.shield,false,true);assert.equal(tank.shield,0);assert.ok(tank.exposed>0);
const boss=spawnEnemy(g,4);assert.equal(armorFactor(boss),.25);boss.cycle=3.1;assert.equal(armorFactor(boss),1.35);
const beforeWarning=g.p.hp;warnStrike(g,boss,528,94,.34,'test');updateHazards(g,1,hurt);assert.equal(g.p.hp,beforeWarning,'预警期间不伤害');
g.p.x=192;updateHazards(g,1,hurt);assert.equal(g.p.hp,beforeWarning,'提前离开落点不受伤');
g.hazards.clear();g.p.x=528;warnStrike(g,boss,528,94,.34,'test');updateHazards(g,2,hurt);assert.ok(g.p.hp<beforeWarning&&g.p.squad<300n);assert.equal(healingFactor(g.p),.2);
g.hazards.clear();warnStrike(g,boss,528,94,.34,'test');boss.active=false;updateHazards(g,2,hurt);assert.equal(g.hazards.count,0);
function survive(stage,dodge){const sim=game(stage),boss=spawnEnemy(sim,4);let avoided=0;
 for(let i=0;i<40*60&&sim.state==='playing';i++){
  const dt=B.step;sim.time+=dt;sim.p.invul=Math.max(0,sim.p.invul-dt);sim.p.wound=Math.max(0,(sim.p.wound||0)-dt);
  updateEnemyChallenge(sim,boss,dt);
  if(dodge){const zones=sim.hazards.items.filter(h=>h.active&&h.left<.9);const safe=[192,360,528].filter(x=>zones.every(h=>Math.abs(x-h.x)>h.width+67.5+8));let target=zones.length?safe[0]:528;if(target!==undefined){const delta=target-sim.p.x,step=sim.p.speed*B.track.strafeFactor*dt;sim.p.x+=Math.max(-step,Math.min(step,delta));if(zones.length)avoided++;}}
  updateHazards(sim,dt,hurt);
 }
 return {alive:sim.state==='playing',hp:sim.p.hp,avoided};
}
for(const stage of [3,7,10,15]){const idle=survive(stage,false),dodge=survive(stage,true);assert.equal(idle.alive,false,'站桩应失败 '+stage);assert.equal(dodge.alive,true,'预警可躲避 '+stage);assert.equal(dodge.hp,120);console.log({stage,idle,dodge});}
const artillery=game(5),thrower=spawnEnemy(artillery,3);thrower.y=400;updateEnemyChallenge(artillery,thrower,.1);assert.equal(artillery.hazards.count,1);
console.log('PASS: late HP scaling, armor counters, boss exposure, warning safety, dead-owner cancellation, wounds; stationary fails and dodging survives stages 3/7/10/15.');

const dual=game(7),db=spawnEnemy(dual,4);db.strikes=1;db.strikeTimer=0;updateEnemyChallenge(dual,db,.01);assert.deepEqual(dual.hazards.items.filter(h=>h.active).map(h=>h.x),[192,528]);dual.p.x=360;updateHazards(dual,2,hurt);assert.equal(dual.p.hp,120,'中央缺口保持安全');

```

## tests/logic.mjs
```
import assert from 'node:assert/strict';
import {Pool,Grid} from '../js/utils.js';
import {BALANCE as B} from '../js/config.js';
import {fresh,validate} from '../js/save.js';
import {UPGRADES,choices,SYNERGIES} from '../js/upgrades.js';
import {Mode} from '../js/modes.js';
const pool=new Pool(2),a=pool.take({x:1});assert.ok(a);assert.ok(pool.take({x:2}));assert.equal(pool.take({}),null);a.active=false;assert.equal(pool.take({x:3}),a);assert.equal(pool.count,2);pool.clear();assert.equal(pool.count,0);
const grid=new Grid(),e={active:true,x:150,y:150};grid.rebuild([e]);let found=false;grid.query(150,150,25,t=>found=t===e);assert.ok(found);
assert.deepEqual(validate(fresh()),fresh());for(const bad of [{...fresh(),coins:-1},{...fresh(),stage:16},{...fresh(),top:[NaN]},{...fresh(),shop:{damage:99}}])assert.throws(()=>validate(bad));
assert.ok(UPGRADES.length>=18);for(let i=0;i<100;i++)assert.equal(new Set(choices({luck:0}).map(u=>u.id)).size,3);
for(let i=0;i<100;i++)assert.ok(choices({luck:0,homing:1,freeze:1,shots:B.maxShots,crit:B.maxCrit,armor:B.maxArmor,drone:B.maxSummons,orbit:B.maxSummons,chain:B.maxChain}).every(u=>!['homing','freeze','multi','crit','armor','drone','orbit','chain'].includes(u.id)));
assert.ok(SYNERGIES[0].test({shots:5,pierce:3}));assert.ok(SYNERGIES[1].test({chain:2,freeze:1}));assert.ok(SYNERGIES[2].test({aura:2,burn:2}));
for(let stage=1;stage<=15;stage++){let bosses=0,finished=false;const mode=new Mode('campaign',stage),g={time:200,enemies:{count:0},ui:{toast(){}},spawnEnemy(type){if(type===4)bosses++;return {};},finish(w){finished=w;}};for(let i=0;i<20000&&!finished;i++)mode.update(g,B.step);assert.ok(finished,`stage ${stage} completes`);assert.equal(bosses,1);assert.equal(mode.local,3);}
let bosses=0;const mode=new Mode('endless'),g={time:200,enemies:{count:0},ui:{toast(){}},spawnEnemy(t){if(t===4)bosses++;return {};},finish(){throw Error('endless ended');}};for(let i=0;i<60000&&mode.wave<=20;i++)mode.update(g,B.step);assert.ok(mode.wave>20);assert.equal(bosses,2);
console.log('PASS: pool limits/reuse, grid, save validation, 36 upgrades, 3 synergies, all 15 stages, endless bosses.');

```

## tests/playthrough47.mjs
```
import {updateEntities} from '../js/entities.js';
import {useItem} from '../js/loot.js';
export function control(g){g.input.move=(p,dt)=>{const threats=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=g.runway.rows[0]?.gates[0],loot=g.loot.find(o=>o.y>350),zones=g.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};}
export function step(g,tick){g.time+=1/60;g.mode.update(g,1/60);if(g.state==='playing')updateEntities(g,1/60);g.fx.update(1/60);g.shake*=Math.exp(-8/60);if(tick%60===0&&g.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(g,id);}

```

## tests/progression.mjs
```
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { initEntities, spawnEnemy } from '../js/entities.js';
import { Particles } from '../js/particles.js';
import { save, fresh, validate } from '../js/save.js';
import { UPGRADES } from '../js/upgrades.js';
import { difficulty, Mode } from '../js/modes.js';
import { xpThreshold } from '../js/progression.js';
import { BALANCE as B } from '../js/config.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const ui=new Proxy({}, {get:()=>()=>{}});
function make(){const g=Object.create(Game.prototype);g.fx=new Particles();g.input={reset(){},move(){}};g.ui=ui;initEntities(g);return g;}
save.data=fresh();
const g=make();g.start('campaign',1);
assert.equal(g.enemies.count,3);
for(let i=0;i<5*60;i++)g.mode.update(g,B.step);
assert.equal(g.enemies.count,3,'首关前5秒不追加敌群');
assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.type===0));
const budgets=[];
for(const stage of [1,2,5,10,15]){const mode=new Mode('campaign',stage);mode.local=1;mode.wave=(stage-1)*3+1;budgets.push(difficulty(mode,1));}
for(let i=1;i<budgets.length;i++)assert.ok(budgets[i].population>budgets[i-1].population&&budgets[i].pack>=budgets[i-1].pack);
assert.ok(difficulty(g.mode,8).pack>difficulty(g.mode,1).pack);
const normal=spawnEnemy(g,0).maxHP;g.mode.stage=2;
assert.ok(spawnEnemy(g,0).maxHP>normal*1.2);g.mode.stage=1;
const ids=['damage','damage','health','multi','multi','multi','multi','pierce','pierce','pierce','chain','chain','freeze','aura','aura','burn','burn'];
for(const id of ids){g.p.xp=g.p.nextXP+7;g.levelUp();assert.equal(g.state,'playing');g.applyUpgrade(UPGRADES.find(u=>u.id===id));g.persistGrowth();}
assert.equal(g.p.level,ids.length+1);
assert.equal(g.p.synergies.size,3);
const stats=Object.fromEntries(['damage','maxHP','shots','pierce','chain','freeze','aura','burn','level','nextXP','rerolls'].map(k=>[k,g.p[k]]));
g.p.squad=10n**400n;g.p.xp=17;g.gems.clear();g.gems.take({value:140});g.finish(true);
assert.equal(save.data.campaign.xp,157,'收集结算时遗留经验，包括首领掉落');
const encoded=save.export();save.data=fresh();save.load();
assert.deepEqual(save.data.campaign.history,ids);
g.start('campaign',2);
for(const [key,value]of Object.entries(stats))assert.equal(g.p[key],value,key+' 跨关继承且不重复叠加');
assert.equal(g.p.squad,10n**400n);assert.equal(g.p.xp,157);assert.equal(g.p.synergies.size,3);assert.equal(g.p.hp,g.p.maxHP);
assert.equal(g.enemies.count,11,'第二关开场明显多于首关');
g.p.squad=0n;g.p.xp=161;g.finish(false);g.start('campaign',2);
assert.equal(g.p.squad,10n**400n,'失败从上次通关编队恢复');assert.equal(g.p.xp,161);assert.equal(g.p.damage,stats.damage);
save.import(encoded);assert.equal(save.data.campaign.squad,String(10n**400n));
const legacy={...fresh(),version:1,stage:4,coins:133};delete legacy.campaign;
const migrated=validate(legacy);assert.equal(migrated.stage,4);assert.equal(migrated.coins,133);assert.equal(migrated.campaign.history.length,0);
for(const patch of [{history:['invalid']},{xp:-1},{squad:'-2'},{nextStage:16}])assert.throws(()=>validate({...fresh(),campaign:{...fresh().campaign,...patch}}));
assert.deepEqual([1,2,3,4,5].map(xpThreshold),[24,31,40,52,67]);
g.start('endless');assert.equal(g.p.level,1);assert.equal(g.p.squad,2n,'无限模式独立于闯关成长');
console.log('PASS: gentle opening, rising stage/level density, health scaling, all upgrade stats + 3 synergies across stages, XP growth, death/reload/import/legacy saves.');
console.log({stageOpeningBudgets:budgets.map(d=>d.population),packSizes:budgets.map(d=>d.pack),xp:[1,2,3,4,5].map(xpThreshold)});

// 批量经验不暂停；待领次数参与等级/经验门槛，还原与旧存档兼容。
save.data=fresh();g.start('campaign',1);g.p.xp=147;g.input.pointer=9;g.levelUp();
assert.equal(g.state,'playing');assert.equal(g.input.pointer,9);assert.equal(g.p.level,5);assert.equal(g.p.pendingUpgrades,4);assert.equal(g.p.xp,0);
g.gems.clear();g.finish(true);g.start('campaign',2);assert.equal(g.p.pendingUpgrades,4);assert.equal(g.p.level,5);assert.equal(g.p.nextXP,67);
const pendingSave=save.export();save.import(pendingSave);assert.equal(save.data.campaign.pending,4);
for(const pending of [-1,1.5,Infinity,2001])assert.throws(()=>validate({...fresh(),campaign:{...fresh().campaign,pending}}));
console.log('PASS: silent multi-level gain, pointer preserved, pending claims survive stage/save/export/import.');

```

## tests/results.json
```
{
  "version": "3.1.0",
  "gameplay": "horizontal squad runner",
  "logic": "PASS",
  "browser": "PASS",
  "errors": 0,
  "runtimeResourcesCached": 19,
  "mobileViewport": "412x915",
  "renderDPR": 2,
  "verified": [
    "uncapped BigInt gates and population",
    "weighted volleys accurately represent 10^400 soldiers",
    "shots charge a gate once and pass through",
    "division to multiplication",
    "loss, pause, upgrades, score, offline reload",
    "opening horde, nine-second boss and full first-stage simulation",
    "real browser touch controls and first boss"
  ],
  "notVerified": [
    "55fps on physical Android hardware",
    "OEM-specific interactions"
  ],
  "firstStageSimulation": {
    "peakLiveEnemies": 82,
    "firstBossSeconds": 9,
    "kills": 336
  },
  "controlledComparison": {
    "timeWindowSeconds": 6,
    "zombies": 72,
    "bosses": 1,
    "twoTroopers": {
      "kills": 12,
      "bossDamage": 20,
      "survived": false
    },
    "fortyEightTroopers": {
      "kills": 72,
      "bossDamage": 6229,
      "survived": true
    }
  },
  "android": {
    "artifact": "Obsidian-Protocol-3.1.0-Android.apk",
    "package": "com.obsidian.protocol",
    "minSdk": 26,
    "targetSdk": 35,
    "sha256": "96fb91b456bb41fb2b9a18b8845abfc225947e6c08f085b772cd65e575e68910",
    "bytes": 59137,
    "signatureSchemes": [
      "v2",
      "v3"
    ],
    "emulator": "Android 14 / API 34 / x86_64 / 720x1600",
    "webview": "113.0.5672.136",
    "verified": [
      "signed APK alignment and assets",
      "ADB install and offline cold launch with airplane mode and Wi-Fi disabled",
      "portrait one-finger strafe",
      "system Back pause and resume",
      "sleep and wake during combat",
      "tall-cutout emulation and HUD clearance"
    ]
  }
}
```

## tests/revision38.mjs
```
import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {player,initEntities,spawnEnemy,updateEntities,breach,hit} from '../js/entities.js';
import {Runway,chargeGate,gateResult,makeGate} from '../js/runway.js';
import {Mode,difficulty} from '../js/modes.js';
import {Particles} from '../js/particles.js';
import {BALANCE as B} from '../js/config.js';
import {UPGRADES} from '../js/upgrades.js';
function game(stage=1,kind='campaign'){const g={p:player(),mode:new Mode(kind,stage),time:0,state:'playing',fx:new Particles(),ui:{toast(t){g.message=t;}},input:{move(){}},runway:new Runway(),kills:0,score:0,coins:0,freeze:0,shake:0,finish(w){this.state='ended';this.won=w;},levelUp(){Game.prototype.levelUp.call(this);},persistGrowth(){},spawnEnemy(type){return spawnEnemy(this,type);}};initEntities(g);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1e6;g.p.nextXP=1e9;g.p.upgradeHistory=[];return g;}
const gate={kind:'add',value:-12n,charge:0n};chargeGate(gate,BigInt(B.track.gateAddMicros)*12n);assert.equal(gate.value,0n);chargeGate(gate,BigInt(B.track.gateAddMicros)*50n);assert.equal(gate.value,50n);assert.equal(gateResult(20n,gate),70n);
for(const kind of ['campaign','endless']){
 const g=game(1,kind);g.p.squad=50n;g.p.x=528;g.runway.addRow(g.p.y);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:-12n});g.runway.update(g,B.step);assert.equal(g.p.squad,38n,'门不要求同侧接取');assert.match(g.message,/-12/);g.runway.update(g,B.step);assert.equal(g.p.squad,38n);
 g.p.invul=100;g.p.armor=.7;for(let i=0;i<11;i++)breach(g,spawnEnemy(g,0));assert.equal(g.p.hp,10);assert.equal(g.leaks,11);assert.ok(g.edgeWarning>0);assert.equal(g.state,'playing');breach(g,spawnEnemy(g,0));assert.equal(g.p.hp,0);assert.equal(g.state,'ended');
}
const smooth=game();const target=spawnEnemy(smooth,0);target.hp=target.maxHP=1e6;for(let i=0;i<40;i++)hit(smooth,target,1,true,true);assert.equal(smooth.freeze,0,'连续暴击不暂停');assert.equal(smooth.fx.numbers.count,1,'同目标飘字限频');
function encounter(useBuild,kind){let seed=93;const old=Math.random;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;try{const g=game(7,kind);g.mode.wave=19;g.p.squad=120n;g.p.x=360;
 const ids=useBuild?[...Array(8).fill('damage'),...Array(6).fill('rate'),...Array(6).fill('pierce'),...Array(4).fill('multi')]:[...Array(5).fill('speed'),...Array(5).fill('magnet'),...Array(5).fill('luck'),...Array(5).fill('regen'),...Array(4).fill('health')];
 for(const id of ids){UPGRADES.find(u=>u.id===id).apply(g.p);g.p.upgradeHistory.push(id);}
 for(let i=0;i<24;i++){const e=spawnEnemy(g,2);e.x=150+(i%6)*80;e.y=160-Math.floor(i/6)*70;}
 g.input.move=(p,dt)=>{const closest=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y)[0];if(closest){const dx=closest.x-p.x;const step=p.speed*B.track.strafeFactor*dt;p.x+=Math.max(-step,Math.min(step,dx));}};
 for(let i=0;i<1800&&g.state==='playing'&&g.enemies.count;i++){g.time+=B.step;updateEntities(g,B.step);g.fx.update(B.step);}
 return {alive:g.state==='playing',kills:g.kills,leaks:g.leaks||0,hp:g.p.hp};}finally{Math.random=old;}}
for(const kind of ['campaign','endless']){const right=encounter(true,kind),wrong=encounter(false,kind);console.log({kind,right,wrong});assert.ok(right.kills>wrong.kills);assert.equal(wrong.alive,false);assert.equal(right.alive,true);}
console.log('PASS: uncapped signed gates, auto settlement off-lane, exact 12-leak defeat, red warning, zero hitstop, late builds decide survival in both modes.');

```

## tests/revision40.mjs
```
import assert from 'node:assert/strict';
import {player,initEntities,updateEntities,spawnEnemy,hit} from '../js/entities.js';
import {Runway,normalizeSquad} from '../js/runway.js';
import {Particles} from '../js/particles.js';
import {Mode} from '../js/modes.js';
import {updateLoot,hitLoot} from '../js/loot.js';
import {save,fresh,validate} from '../js/save.js';
assert.equal(normalizeSquad(100n),5n);assert.equal(player().squad,1n);assert.equal(player().rate,.72);
const g={p:player(),mode:new Mode('campaign'),state:'playing',time:0,fx:new Particles(),runway:new Runway(),input:{move(){}},ui:{toast(){}},persistGrowth(){},finish(){this.state='ended';},levelUp(){},kills:0,score:0,coins:0,loot:[],turrets:[],lootClock:100};initEntities(g);g.p.upgradeHistory=[];g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=100;
const gem=g.gems.take({x:600,y:1100,px:600,py:1100,value:5,pull:false});updateEntities(g,1/60);assert.equal(gem.pull,false);assert.equal(g.p.xp,0);
g.p.x=600;gem.x=600;gem.y=g.p.y;updateEntities(g,1/60);assert.equal(g.p.xp,5);
g.p.x=528;g.runway.addRow(g.p.y);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:5n});g.runway.update(g,1/60);assert.equal(g.p.weapon,1);
g.p.x=g.p.px=192;g.runway.addRow(g.p.y);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:5n});g.runway.update(g,1/60);assert.equal(g.p.weapon,6);assert.equal(g.p.squad,1n);
g.loot=[{id:'rate',x:192,y:g.p.y,hits:2}];const old=g.p.rate;updateLoot(g,0);assert.equal(g.p.rate,old);for(let i=0;i<2;i++)hitLoot(g,{x:192,y:g.p.y,py:g.p.y+2,mass:1n});updateLoot(g,0);assert.ok(g.p.rate<old);
const e=spawnEnemy(g,4);const hp=e.hp,shield=e.shield;hit(g,e,10,false,true);assert.equal(e.hp,hp);assert.ok(e.shield<shield&&e.shieldFlash>0);
const legacy=fresh();delete legacy.shop.magnet;assert.equal(validate(legacy).shop.magnet,0);
console.log('PASS: 1–5 people, pistol, proximity XP, optional weapon gate, shot-locked pickup, shield blocks health, legacy magnet migration');

```

## tests/revision41.mjs
```
import assert from 'node:assert/strict';
import {useItem,unlockHits,updateLoot,weaponStats} from '../js/loot.js';
import {player,initEntities} from '../js/entities.js';
import {Runway} from '../js/runway.js';
import {Particles} from '../js/particles.js';
const g={p:player(),state:'playing',time:0,lootClock:100,loot:[],turrets:[],fx:new Particles(),ui:{toast(){},update(){}},persistGrowth(){}};initEntities(g);g.p.upgradeHistory=[];
assert.ok(unlockHits('laser')>unlockHits('turret')&&unlockHits('turret')>unlockHits('rate'));
g.loot=[{x:g.p.x,y:g.p.y,hits:0,id:'laser'}];updateLoot(g,0);assert.equal(g.p.inventory.laser,1);assert.equal(g.effects.length,0);assert.equal(useItem(g,'laser'),true);assert.equal(g.p.inventory.laser,0);assert.equal(useItem(g,'laser'),false);
const low=weaponStats(g.p,1),high=weaponStats(g.p,8);assert.ok(high.damage>low.damage&&high.rate>low.rate);
for(const [x,n,expect] of [[528,1,false],[300,1,false],[192,1,true],[240,5,false],[192,5,true]]){g.p.x=g.p.px=x;g.p.squad=BigInt(n);g.p.weapon=1;g.runway=new Runway();g.runway.drums=[];g.runway.rows=[];g.runway.addRow(g.p.y-1);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:4n});g.runway.update(g,1/60);assert.equal(g.p.weapon>1,expect,`x=${x} n=${n}`);}
console.log('PASS: rarity hit costs, inventory not auto-use, single-use, visible weapon math, strict whole-squad gate crossing');

```

## tests/revision42.mjs
```
import assert from 'node:assert/strict';
import {normalizeSquad,makeGate,Runway} from '../js/runway.js';
import {rollLoot,unlockHits,weaponStats} from '../js/loot.js';
import {shopCost,permanent} from '../js/shop.js';
import {validate,fresh} from '../js/save.js';
import {validateProgress,freshProgress} from '../js/progression.js';
assert.equal(normalizeSquad(999999999999999999n),999999999999999999n);
for(let i=0;i<1000;i++)assert.equal(makeGate(i).kind,'add');
assert.equal(validateProgress({...freshProgress(),weapon:12345}).weapon,12345);
const saved=fresh();saved.shop.damage=100;assert.equal(validate(saved).shop.damage,100);
assert.ok(shopCost(20)>shopCost(10)*10);assert.ok(permanent('damage',21)-permanent('damage',20)>permanent('damage',2)-permanent('damage',1));
assert.equal(unlockHits('recruit'),180);
const test=(luck,r)=>{const vals=[.5,r,.1];return rollLoot(luck,()=>vals.shift());};assert.equal(test(0,.185),'damage');assert.equal(test(.01,.185),'blast');
const p={damage:14,rate:.72,weapon:30};assert.ok(weaponStats(p,1000).rate>weaponStats(p,30).rate);assert.ok(weaponStats(p,1000).damage>weaponStats(p,30).damage);
console.log('PASS: additive-only gates, uncapped weapon/army/shop, rising marginal gains/costs, exact +1pp luck threshold, 180-hit rare recruitment');

```

## tests/revision43.mjs
```
import assert from 'node:assert/strict';
import {player,initEntities,spawnEnemy,updateEntities} from '../js/entities.js';
import {Runway,makeGate} from '../js/runway.js';
import {applyGate,weaponStats,combatProfile} from '../js/combat.js';
import {Mode,difficulty} from '../js/modes.js';
import {hitLoot,unlockHits} from '../js/loot.js';
import {Particles} from '../js/particles.js';
import {save,fresh} from '../js/save.js';
save.data=fresh();
function game(){const g={p:player(),mode:new Mode('campaign'),state:'playing',time:0,fx:new Particles(),ui:{toast(){}},input:{move(){}},runway:new Runway(),kills:0,score:0,coins:0,loot:[],lootClock:100,turrets:[],persistGrowth(){},finish(win){this.state='ended';},levelUp(){}};initEntities(g);g.spawnEnemy=type=>spawnEnemy(g,type);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1000;g.p.nextXP=1e9;g.p.upgradeHistory=[];return g;}
const g=game();assert.deepEqual(weaponStats(g.p),{damage:10,rate:1});
g.runway.addRow(500,1n,g.p);const gate=g.runway.rows[0].gates[0];Object.assign(gate,{stat:'rate',value:-3n});for(let i=0;i<6;i++){const b={x:gate.x,y:500,py:510,mass:1n,hits:new Set(),active:true};g.runway.intercept(b,g,()=>{});}assert.equal(gate.value,3n);applyGate(g.p,gate);assert.deepEqual(weaponStats(g.p),{damage:10,rate:4});
const charge=gate.value;g.time++;g.runway.update(g,1/60);assert.equal(gate.value,charge,'不命中就不增加');
applyGate(g.p,{stat:'damage',value:20n});assert.deepEqual(weaponStats(g.p),{damage:30,rate:4});
g.p.gateRate=9999;assert.equal(weaponStats(g.p).rate,240);for(let i=0;i<50;i++)assert.equal(makeGate(i,1n,Math.random,g.p).stat,'damage');
const basic=game().p;assert.equal(unlockHits('grenade',basic),50);basic.gateRate=49;assert.equal(unlockHits('grenade',basic),200);
g.loot=[{x:192,y:500,hits:200,id:'grenade'}];const bulk={x:192,y:495,py:510,mass:250n,active:true};hitLoot(g,bulk);assert.equal(g.loot[0].hits,0);assert.equal(bulk.mass,50n);assert.equal(bulk.active,true,'溢出弹数继续向前');
for(const [rate,damage,aoe] of [[1,10,false],[50,50,false],[50,50,true],[240,1000,true]]){const sim=game();sim.p.gateRate=rate-1;sim.p.gateDamage=damage-10;sim.p.explosive=aoe?1:0;sim.mode.next(sim);sim.mode.spawnPack(sim);const xs=new Set(sim.enemies.items.filter(e=>e.active).map(e=>e.x));assert.equal(xs.size>1,aoe||combatProfile(sim.p).power>=80);console.log({rate,damage,aoe,profile:combatProfile(sim.p),enemies:sim.enemies.count,hp:sim.enemies.items.find(e=>e.active)?.hp});}
// 高频射击10秒实际发射总弹数，不因可视示踪弹预算丢失。
for(const rate of [1,50,240]){const sim=game();sim.p.gateRate=rate-1;let emitted=0n;for(let i=0;i<600;i++){sim.time+=1/60;sim.bullets.clear();updateEntities(sim,1/60);for(const b of sim.bullets.items)if(b.active)emitted+=b.mass;sim.fx.update(1/60);}assert.ok(Math.abs(Number(emitted)-rate*10)<=Math.ceil(rate*.07),`${rate}: ${emitted}`);console.log({rate,shots10s:String(emitted)});}
console.log('PASS exact impact gates, separated stats, cap-only-damage gates, dynamic loot, surplus bullets, formations, firing conservation');


for(const [rate,damage,aoe,stage] of [[1,10,false,1],[50,50,false,3],[50,50,true,3],[240,1000,true,7]]){const sim=game();sim.mode=new Mode('campaign',stage);sim.p.gateRate=rate-1;sim.p.gateDamage=damage-10;sim.p.explosive=aoe?1:0;sim.mode.next(sim);let peak=0;sim.input.move=p=>{const e=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y)[0];if(e)p.x=e.x;};for(let i=0;i<2400&&sim.state==='playing';i++){sim.time+=1/60;sim.mode.update(sim,1/60);updateEntities(sim,1/60);sim.fx.update(1/60);peak=Math.max(peak,sim.enemies.count);}console.log({matrix:{rate,damage,aoe,stage},seconds:Math.round(sim.time),kills:sim.kills,peak,leaks:sim.leaks||0,hp:Math.round(sim.p.hp),state:sim.state});assert.ok(peak<=120);assert.ok(Number.isFinite(sim.p.hp));}

```

## tests/revision44.mjs
```
import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {save,fresh,validate} from '../js/save.js';
import {initEntities} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {BALANCE as B} from '../js/config.js';
import {weaponStats} from '../js/combat.js';
import {updateLoot} from '../js/loot.js';
const storage=new Map();globalThis.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)??null};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.input={reset(){},move(){}};g.ui=new Proxy({}, {get:()=>()=>{}});initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',1);assert.equal(B.stages,10);assert.equal(g.runway.rows[0].gates[0].stat,'rate');assert.ok(g.runway.rows[0].gates[0].value>0n);const before=g.lootClock;g.p.xp=500;g.levelUp();assert.equal(g.lootClock,before,'升级不得催生补给');
g.start('endless');g.p.hp=70;g.p.breachLoss=30;g.p.inventory={grenade:2};g.p.gateDamage=50;g.p.gateRate=20;g.coins=123;g.mode.wave=8;g.mode.remaining=20;g.mode.budget=80;g.p.level=9;const e=g.spawnEnemy(2);e.hp/=2;const ehp=e.hp;g.loot=[{id:'grenade',x:150,y:500,hits:38,age:5}];const damage=weaponStats(g.p).damage;
g.exitEndless();assert.equal(save.data.coins,123);assert.equal(save.data.endless.wave,8);save.load();assert.ok(save.data.endless);save.data.shop.damage=4;g.start('endless');assert.equal(g.p.hp,70);assert.equal(g.p.breachLoss,30);assert.equal(g.mode.wave,8);assert.equal(g.p.level,9);assert.equal(g.p.inventory.grenade,2);assert.equal(g.loot[0].hits,38);assert.ok(g.enemies.items.some(e=>e.active&&e.hp===ehp));assert.ok(weaponStats(g.p).damage>damage);g.checkpointEndless();g.checkpointEndless();assert.equal(save.data.coins,123,'重复存档不得重复发钱');
g.finish(false);assert.equal(save.data.endless,null,'失败不可续存死局');
g.start('campaign',3);g.enemies.clear();g.mode.remaining=100;g.mode.spawnPack(g);const xs=g.enemies.items.filter(e=>e.active).map(e=>e.x);assert.ok(Math.max(...xs)-Math.min(...xs)>150,'中期必须分散');
g.start('endless');g.loot=[];g.lootClock=B.director.lootFirst;g.healClock=B.director.healFirst;let total=0;for(let i=0;i<180;i++){g.time++;updateLoot(g,1);total+=g.loot.filter(o=>o.id!=='heal').length;g.loot=[];}assert.ok(total>=6&&total<=15,`三分钟强化补给 ${total}`);
assert.equal(validate({...fresh(),stage:15,campaign:{...fresh().campaign,nextStage:15}}).stage,10);
console.log('PASS 10-stage migration, positive rate tutorial, level-up does not spawn loot, sparse drops, scattered enemies, endless exit/save/shop/resume, no duplicate coins, death resets run');

```

## tests/revision45.mjs
```
import assert from 'node:assert/strict';
import {Game,Input} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,updateEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {updateLoot,unlockHits,useItem} from '../js/loot.js';
import {BALANCE as B} from '../js/config.js';
let seed=902;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',1);assert.equal(new Set(g.enemies.items.filter(e=>e.active).map(e=>e.x)).size,3);
for(let j=0;j<6;j++){g.mode.remaining=100;g.mode.spawnPack(g);}assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.x>=160&&e.x<=560));
const p={x:192,squad:1n,speed:235};Input.prototype.move.call({target:540,pointer:1,keys:new Set()},p,1/60);assert.equal(p.x,540);
g.start('campaign',1);g.time=5;updateLoot(g,5);assert.equal(g.loot[0].id,'grenade');assert.ok(g.loot[0].hits<=6);
for(const stage of [3,4]){g.start('campaign',stage);const e=g.spawnEnemy(4);e.shield=0;e.plates=0;e.guard=0;e.cycle=4;e.hp=1;const shots=g.p.shots,squad=g.p.squad;hit(g,e,1000,false,true);assert.ok(g.p.shots>shots||g.p.squad>squad);const rewarded=g.p.squad;hit(g,e,1000);assert.equal(g.p.squad,rewarded,'不能重复领取');}
console.log('PASS multi-lane opening, side margins, immediate drag, early accessible grenade, guaranteed stage3+ boss reward');
// 完整闯关自动策略，真实射击/拾取/门/首领/结算；不直接修改战斗属性。
save.data=fresh();const sim=game();sim.input.move=(p,dt)=>{const threats=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=sim.runway.rows[0]?.gates[0],loot=sim.loot.find(o=>o.y>350),zones=sim.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};
for(let stage=1;stage<=4;stage++){sim.start('campaign',stage);for(let tick=0;tick<600*60&&sim.state==='playing';tick++){sim.time+=1/60;sim.mode.update(sim,1/60);if(sim.state==='playing')updateEntities(sim,1/60);sim.fx.update(1/60);if(tick%60===0&&sim.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(sim,id);}console.log({stage,seconds:Math.round(sim.time),hp:sim.p.hp,kills:sim.kills,shots:sim.p.shots,squad:String(sim.p.squad),next:save.data.campaign.nextStage});assert.ok(sim.p.hp>0&&save.data.campaign.nextStage>stage,'前四关换线拾取策略应可通关');}

save.data=fresh();const idle=game();idle.start('campaign',1);for(let i=0;i<300*60&&idle.state==='playing';i++){idle.time+=1/60;idle.mode.update(idle,1/60);if(idle.state==='playing')updateEntities(idle,1/60);idle.fx.update(1/60);}assert.equal(save.data.campaign.nextStage,1,'站桩不应通关首关');console.log('PASS active strategy clears 1–4, stationary strategy cannot clear stage1');

```

## tests/revision46.mjs
```
import assert from 'node:assert/strict';
import {player,initEntities,spawnEnemy,hit,updateEntities} from '../js/entities.js';
import {shopCost} from '../js/shop.js';
import {Runway} from '../js/runway.js';
import {Particles} from '../js/particles.js';
import {Mode} from '../js/modes.js';
const g={p:player(),mode:new Mode('campaign'),state:'playing',time:0,fx:new Particles(),runway:new Runway(),input:{move(){}},ui:{toast(){}},kills:0,coins:0,score:0,lootClock:1000,healClock:1000,loot:[],turrets:[],levelUp(){},finish(){}};initEntities(g);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1000;
for(let i=0;i<3;i++){const e=spawnEnemy(g,0);e.x=600;e.y=300;hit(g,e,10000);}
assert.equal(g.coins,3,'击杀基础收益不变');assert.equal(g.gems.items.filter(e=>e.active).reduce((a,b)=>a+(b.coins||0),0),1);
updateEntities(g,1/60);assert.equal(g.coins,3,'远处掉落不会自动给CR');for(const gem of g.gems.items)if(gem.active){gem.x=g.p.x;gem.y=g.p.y;}updateEntities(g,1/60);assert.equal(g.coins,4);updateEntities(g,1/60);assert.equal(g.coins,4,'不能重复领取');
assert.equal(shopCost(0),60);for(let i=0;i<10;i++){const old=Math.ceil(80*(i+1)**3*1.07**i);assert.ok(i<3?shopCost(i)<old:shopCost(i)===old);}console.log('PASS pickup-only bonus CR, no double collection, first three levels discounted, later costs unchanged');

```

## tests/revision47.mjs
```
import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {encounterHP} from '../js/combat.js';
import {difficulty} from '../js/modes.js';
import {BALANCE as B} from '../js/config.js';
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',6);g.p.damage=10748.8;g.p.rate=1/240;g.p.squad=2n;g.p.shots=3;
const hp=encounterHP(g.p,0,6);assert.ok(hp>g.p.damage*10&&hp<g.p.damage*80,'录像火力下不能一枪蒸发，也不能变血墙');
for(let stage=5;stage<=100;stage++){for(let type=0;type<5;type++){const a=encounterHP(g.p,type,stage),b=encounterHP(g.p,type,stage+1);assert.ok(Number.isFinite(a)&&b/a<1.1,'后期血量无指数跳档');}const a=difficulty({kind:'campaign',stage,local:2,aoe:true},20,230);assert.ok(a.pack<=12);}
const d4=difficulty({kind:'campaign',stage:4,local:2},20,230),d5=difficulty({kind:'campaign',stage:5,local:2},20,230);assert.ok(d5.population/d4.population<1.3);
g.enemies.clear();g.mode.remaining=100;g.mode.spawnPack(g);assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.y>=260&&e.y<=405&&e.x>=160&&e.x<=560));
const enemy=g.enemies.items.find(e=>e.active),fixed=enemy.hp;g.p.damage*=2;assert.equal(enemy.hp,fixed,'强化不改变已生成敌人血量');
g.enemies.clear();g.gems.clear();g.kills=0;g.coins=0;for(let i=0;i<100;i++){const e=g.spawnEnemy(0);e.x=360;e.y=400;hit(g,e,e.hp*2);}
assert.equal(g.gems.count,1);const gem=g.gems.items.find(e=>e.active);assert.equal(gem.value,400);assert.equal(gem.coins,33);assert.equal(g.coins,100,'合并不能吞经验或CR');
g.start('endless');g.mode.wave=16;g.p.damage=10748.8;g.p.rate=1/240;g.p.squad=2n;g.p.shots=3;assert.equal(g.spawnEnemy(0).maxHP,hp,'无限使用同一晚期血量算法');
console.log('PASS late HP continuity to stage100, stage5 budget continuity, visible spawn bounds, immutable living HP, XP/CR conservation, endless parity');

```

## tests/runway.mjs
```
import assert from 'node:assert/strict';
import { BALANCE as B } from '../js/config.js';
import { Runway, chargeGate, gateResult, soldierOffset } from '../js/runway.js';
import { initEntities, player, spawnEnemy, updateEntities } from '../js/entities.js';
import { Mode } from '../js/modes.js';
import { choices, SYNERGIES } from '../js/upgrades.js';
import { Particles } from '../js/particles.js';

assert.equal(gateResult(5, { kind: 'divide', value: 2 }), 2n);
assert.equal(gateResult(2, { kind: 'add', value: -3 }), 0n);
assert.equal(gateResult(20, { kind: 'multiply', value: 2 }), 40n);
assert.notDeepEqual(soldierOffset(0, 2), soldierOffset(1, 2));

function game() {
  const g = {
    p: player(), mode: new Mode('campaign'), runway: new Runway(), fx: new Particles(),
    input: { move() {} }, ui: { toast() {} }, state: 'playing',
    score: 0, kills: 0, coins: 0, time: 0, freeze: 0, shake: 0,
    spawnEnemy(type) { return spawnEnemy(this, type); },
    finish(win) { this.state = 'ended'; this.won = win; },
    levelUp() {
      const p=this.p;p.xp-=p.nextXP;p.nextXP=Math.ceil(p.nextXP*B.xpGrowth);p.level++;
      const cards=choices(p), order=['spec_artillery','damage','multi','pierce','breach','salvo','execution','rate'];
      cards.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
      cards[0].apply(p);p.upgradeHistory??=[];p.upgradeHistory.push(cards[0].id);
      for(const synergy of SYNERGIES)if(synergy.test(p))p.synergies.add(synergy.id);
    }
  };
  initEntities(g);
  g.mode.next(g);
  return g;
}

const g = game();
g.runway.drums = [];
const row = g.runway.rows[0];
const gate = row.gates[0];
gate.kind="add";gate.value = -1n;
const round={x:gate.x,py:row.y+11,y:row.y,active:true,hits:new Set()};
assert.equal(g.runway.intercept(round,g,()=>{}),false);
assert.equal(gate.value,-1n,'命中先记录射击，不按弹数充满');
chargeGate(gate,BigInt(2*B.track.gateAddMicros));
assert.equal(gate.value, 1n);
gate.lastHit=-Infinity;
row.y = g.p.y - 1;
g.runway.update(g, B.step);
assert.equal(g.p.squad, 3n);
g.runway.update(g, B.step);
assert.equal(g.p.squad, 3n, '同一对门只结算一次');

g.runway.addRow(g.p.y);
g.runway.rows[0].gates[0] = { x: g.p.x, kind: 'add', value: -5, charge: 0 };
g.runway.update(g, B.step);
assert.equal(g.p.squad, 0n);
assert.equal(g.won, false);

const huge = 10n ** 400n;
assert.equal(gateResult(huge, {kind:'multiply', value:13n}), huge * 13n);
const powerTest = game();
powerTest.p.squad=huge;
updateEntities(powerTest,B.step);
const volley=powerTest.bullets.items.filter(b=>b.active);
assert.ok(volley.length<=B.track.maxTracers);
assert.equal(volley.reduce((sum,b)=>sum+b.mass,0n),huge);

const charging=game();charging.runway.drums=[];
const chargingRow=charging.runway.rows[0], charged=chargingRow.gates[0];Object.assign(charged,{kind:'add',value:5n});
for(let i=0;i<40;i++){
 const shot={x:charged.x,py:chargingRow.y+2,y:chargingRow.y,hits:new Set(),active:true,mass:huge};
 charging.runway.intercept(shot,charging,()=>{});charging.runway.intercept(shot,charging,()=>{});
}
assert.equal(charged.value,5n,'同帧巨量射击不能跳过充能时间');
chargeGate(charged,BigInt(7*B.track.gateAddMicros));assert.equal(charged.value,12n);

function identicalEncounter(count){
  // 相同布阵、相同输入与随机种子，只替换编队人数。关掉沿途数字门以隔离火力变量。
  const rng=Math.random;
  let state=54321;
  Math.random=()=> (state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296;
  try{
    const sim=game();
    sim.p.x=sim.p.px=360;sim.p.squad=count;sim.p.nextXP=1e9;
    sim.runway.rows=[];sim.runway.drums=[];sim.runway.nextRow=100;
    for(let i=0;i<72;i++){
      const e=sim.spawnEnemy(i%9===0?2:0);
      e.x=e.px=210+(i%9)*37;e.y=e.py=490-Math.floor(i/9)*42;
    }
    const boss=sim.spawnEnemy(4);boss.x=boss.px=360;boss.y=boss.py=210;
    for(let i=0;i<360 && sim.state==='playing';i++){
      sim.time+=B.step;updateEntities(sim,B.step);sim.fx.update(B.step);
    }
    return {kills:sim.kills,bossDamage:Math.round(boss.maxHP*3-(boss.active?boss.maxHP*boss.plates+boss.hp:0)),survived:sim.state==='playing'};
  }finally{Math.random=rng;}
}
const small=identicalEncounter(2n),large=identicalEncounter(48n);
console.log('6s / 72 zombies + boss:',{two:small,fortyEight:large});
assert.ok(large.kills>small.kills && large.bossDamage>small.bossDamage);

const bigGate={kind:'multiply',value:3n,charge:0n};
chargeGate(bigGate,huge);
assert.equal(bigGate.value,30n);
const divided={kind:'divide',value:3n,charge:0n};
chargeGate(divided,2905000n);
assert.deepEqual(divided,{kind:'multiply',value:12n,charge:0n,scale:10n});

// 所有生产刷怪入口只在右路；所有强化门只在左路。
const lanes = game();
lanes.runway.openingConvoy(lanes);
lanes.mode.spawnPack(lanes);
lanes.runway.update(lanes, B.track.encounterInterval);
assert.ok(lanes.enemies.items.filter(e=>e.active).every(e=>e.x>=B.track.hordeLeft && e.x<=B.track.hordeRight));
for(let i=0;i<12;i++)lanes.runway.addRow(120);
assert.ok(lanes.runway.rows.every(r=>r.gates.length===1 && [B.track.upgradeX,B.track.gateRight].includes(r.gates[0].x)));
assert.ok(lanes.runway.rows.every(r=>['add','multiply','divide'].includes(r.gates[0].kind)));
const leak=game(); leak.runway.rows=[]; leak.runway.drums=[];
const stray=leak.spawnEnemy(0);stray.y=1251;
const hp=leak.p.hp,squad=leak.p.squad;
updateEntities(leak,B.step);
assert.equal(stray.active,false);assert.equal(leak.p.hp,hp-10);assert.equal(leak.p.squad,squad);
const advance=game(); advance.runway.rows=[];advance.runway.drums=[];
const giant=advance.spawnEnemy(4), x=giant.x,y=giant.y;
for(let i=0;i<60;i++)updateEntities(advance,B.step);
assert.equal(giant.x,x);assert.ok(Math.abs(giant.y-y-B.bossAdvance)<.001);
assert.ok(giant.hp>=7200 && giant.plates===2);
giant.y=B.bossBreachY;updateEntities(advance,B.step);
assert.equal(advance.won,false);
console.log('PASS: alternating upgrade gates, frontal spawn entrances, exact 10 HP leak penalty, slow boss advance and breach defeat.');

```

## tests/smoke40.mjs
```
import {writeFile} from 'node:fs/promises';
const tab=await(await fetch('http://127.0.0.1:9229/json/new?http://127.0.0.1:8766/',{method:'PUT'})).json();const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const jobs=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){jobs.get(m.id)(m.result);jobs.delete(m.id);}};const send=(method,params={})=>new Promise(r=>{jobs.set(++id,r);ws.send(JSON.stringify({id,method,params}));});await send('Page.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.reload',{ignoreCache:true});await new Promise(r=>setTimeout(r,2000));const result=await send('Runtime.evaluate',{expression:'(async()=>{const {game:g}=await import("./js/main.js");g.start("endless");return {state:g.state,people:String(g.p.squad),weapon:g.p.weapon};})()',awaitPromise:true,returnByValue:true});console.log(JSON.stringify(result));await new Promise(r=>setTimeout(r,3000));console.log(JSON.stringify(await send('Runtime.evaluate',{expression:'obsidianDiagnostics()',returnByValue:true})));await writeFile('screenshots/v4.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));await send('Page.close');ws.close();

```

## tests/smoke46.mjs
```
import {writeFile} from 'node:fs/promises';
const tab=await(await fetch('http://127.0.0.1:9229/json/new?http://127.0.0.1:8766/',{method:'PUT'})).json();const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const jobs=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){jobs.get(m.id)(m.result);jobs.delete(m.id);}};const send=(method,params={})=>new Promise(r=>{jobs.set(++id,r);ws.send(JSON.stringify({id,method,params}));});await send('Page.enable');await send('Network.setBypassServiceWorker',{bypass:true});await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.reload',{ignoreCache:true});await new Promise(r=>setTimeout(r,2000));const result=await send('Runtime.evaluate',{expression:'(async()=>{const {game:g}=await import("./js/main.js");g.start("endless");return {state:g.state,people:String(g.p.squad),weapon:g.p.weapon};})()',awaitPromise:true,returnByValue:true});console.log(JSON.stringify(result));await new Promise(r=>setTimeout(r,3000));console.log(JSON.stringify(await send('Runtime.evaluate',{expression:'obsidianDiagnostics()',returnByValue:true})));await writeFile('screenshots/v46.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));await send('Page.close');ws.close();

```

## tests/smoke47.mjs
```
import {writeFile} from 'node:fs/promises';
const tab=await(await fetch('http://127.0.0.1:9229/json/new?about:blank',{method:'PUT'})).json();const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const jobs=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){jobs.get(m.id)(m.result);jobs.delete(m.id);}};const send=(method,params={})=>new Promise(r=>{jobs.set(++id,r);ws.send(JSON.stringify({id,method,params}));});await send('Page.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.navigate',{url:'http://127.0.0.1:8766/?qa47='+Date.now()});await new Promise(r=>setTimeout(r,2000));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
console.log(await evaluate(`(async()=>({particle:(await import('./js/particles.js')).Particles.prototype.number.toString(),sprite:(await import('./js/assets.js')).sprite.toString().slice(-250),served:(await (await fetch('./js/particles.js?qa='+Date.now())).text()).includes("value:value>=1e6")}))()`));
await evaluate(`(async()=>{const {game:g}=await import('./js/main.js');const {save,fresh}=await import('./js/save.js');const h=await import('./tests/playthrough47.mjs');cancelAnimationFrame(g.raf);g.suspended=true;save.data=fresh();let seed=902;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;window.qa={g,h,tick:0,results:[]};h.control(g);return true;})()`);
for(let stage=1;stage<=10;stage++){
 await evaluate(`qa.g.start('campaign',${stage});qa.tick=0;true`);
 let peak=-1,status;
 do{
 status=await evaluate(`(()=>{const {g,h}=qa;for(let i=0;i<600&&g.state==='playing';i++)h.step(g,qa.tick++);g.visualTime=g.time;g.shake=0;g.ui.update();g.render(1);return {stage:g.mode.stage,time:g.time,hp:g.p.hp,state:g.state,enemies:g.enemies.count};})()`);
 if([5,10].includes(stage)&&status.enemies>peak&&status.state==='playing'){
 await writeFile('screenshots/v47-stage'+stage+'.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));peak=status.enemies;
 }
 }while(status.state==='playing'&&status.time<600);
 console.log(status);if(status.hp<=0||status.state==='playing')throw Error('Playthrough failed');
}
await writeFile('screenshots/v47-browser-report.json',JSON.stringify(await evaluate('({stages:10,state:qa.g.state,hp:qa.g.p.hp})'),null,2));
await send('Page.close');ws.close();

```

## tests/verification-3.2.json
```
{
  "version": "3.2.0",
  "logic": "PASS",
  "browser": "PASS",
  "offlineResources": 19,
  "stage1": {
    "peakEnemies": 78,
    "bossArrivalSeconds": 34.02,
    "clearSeconds": 48,
    "squad": 295,
    "kills": 372
  },
  "apk": "v2/v3 signature, alignment, embedded-resource comparison PASS",
  "nativeShell": "Android 14 emulator checked in 3.1; unchanged in 3.2",
  "physicalAndroidDevice": "not tested"
}
```

## tests/verification-3.3.json
```
{
  "version": "3.3.0",
  "logic": "PASS",
  "progression": "PASS",
  "browser": "PASS",
  "offlineResources": 20,
  "firstStage": {
    "openingEnemies": 3,
    "peakEnemiesInBotRun": 9,
    "clearSeconds": 55,
    "kills": 89
  },
  "xpThresholds": [
    24,
    31,
    40,
    52,
    67
  ],
  "carry": "stats, synergies, level, XP, next XP threshold, cleared squad; verified reload/import/failure/legacy migration",
  "apk": "v2/v3, alignment, asset consistency PASS",
  "physicalAndroidDevice": "not tested"
}
```

## tests/verification-3.4.json
```
{
  "version": "3.4.0",
  "nodeSuites": [
    "logic",
    "runway",
    "progression",
    "balance",
    "campaign"
  ],
  "browser": "PASS",
  "offlineResources": 20,
  "limits": {
    "army": 120,
    "multiplier": 3,
    "addGate": 12
  },
  "upgrades": 36,
  "branches": [
    "artillery",
    "elements",
    "engineer"
  ],
  "adaptive": "5-second exponential response; new-spawn HP and density, existing HP unchanged",
  "campaignSimulation": [
    {
      "stage": 1,
      "seconds": 89,
      "level": 14
    },
    {
      "stage": 2,
      "seconds": 55,
      "level": 19
    },
    {
      "stage": 3,
      "seconds": 52,
      "level": 21
    }
  ],
  "apk": "v2/v3 signature, alignment and embedded resource comparison PASS",
  "physicalAndroidDevice": "not tested"
}
```

## tests/verification-3.5.json
```
{
  "version": "3.5.0",
  "nodeSuites": [
    "logic",
    "runway",
    "progression",
    "balance",
    "campaign"
  ],
  "browser": "PASS",
  "offlineResources": 20,
  "armyCap": null,
  "gate": {
    "addCap": 12,
    "multiplierStep": 0.1,
    "doubleChargeSeconds": 16.4,
    "hostileChanceAt20": 0.8,
    "hostileChanceAt100": 0.9,
    "chargingScrollFactor": 0.25,
    "simultaneous": 1
  },
  "campaignSimulation": [
    {
      "stage": 1,
      "seconds": 89,
      "squad": 37,
      "kills": 199
    },
    {
      "stage": 2,
      "seconds": 69,
      "squad": 147,
      "kills": 433
    },
    {
      "stage": 3,
      "seconds": 51,
      "squad": 278,
      "kills": 765
    }
  ],
  "apk": "v2/v3 signature, alignment, bundled resources PASS",
  "physicalAndroidDevice": "not tested"
}
```

## tests/verification-3.6.json
```
{
  "version": "3.6.0",
  "tests": "all six Node suites and mobile browser PASS",
  "warningScenarios": [
    3,
    7,
    10,
    15
  ],
  "standing": "defeated in each warning scenario",
  "dodging": "survived each 40-second warning scenario",
  "fullCampaign": "first three stages passed with warning-aware input",
  "offlineResources": 21,
  "apk": "signature v2/v3, alignment, embedded-resource comparison PASS",
  "physicalPhone": "not tested"
}
```

## tests/verification-3.7.json
```
{
  "version": "3.7.0",
  "logic": "npm test PASS",
  "browser": "mobile viewport, drag, silent XP, batch claims, pending carryover, offline reload PASS; zero JS exceptions",
  "android": "v2/v3 signature, alignment, embedded resources PASS",
  "devicePerformance": "not measured on physical Android",
  "reference": "local user recording observed, Canvas 2.5D interpretation",
  "sha256": "41b1724b37f94078ae65c533b48565303b1830cedd218ef206dae37b3728e97e"
}
```

## tests/verification-3.8.json
```
{
  "version": "3.8.0",
  "logic": "all 7 suites PASS",
  "browser": "mobile touch, offline reload, silent claims, red edges, standalone desktop file PASS; zero exceptions",
  "lateBuildComparison": {
    "campaign": {
      "offensePierce": {
        "kills": 24,
        "leaks": 0,
        "survived": true
      },
      "utility": {
        "kills": 0,
        "leaks": 12,
        "survived": false
      }
    },
    "endless": "same results"
  },
  "apk": "v2/v3, alignment and embedded resource equality PASS",
  "physicalAndroidPerformance": "not measured",
  "sha256": "5d9a61af01301d8cf6bf2e98e344e53bbed613006814ee44da8cd2fe26fe2c69"
}
```

## tests/verification-4.3.json
```
{
  "version": "4.3.0",
  "logic": "revision43 PASS",
  "browser": "startup and 3-second simulation PASS",
  "apk": "signature/alignment/resource equality PASS",
  "physicalDevice": "not tested",
  "sha256": "c3ef59030c49d665add36a5a3114f7c2f93105759ba37d29a60470daa03ce62f"
}
```

## tests/verification-4.5.json
```
{
  "version": "4.5.0",
  "suites": [
    "revision44 PASS",
    "revision45 PASS"
  ],
  "campaign": "seeded active strategy clears 1\u20134; stationary cannot clear stage1",
  "browser": "startup PASS",
  "physicalAndroid": "not tested",
  "sha256": "f23b218933f1408a75868dacea7831e59bfd6b6b77d4728f0e1743d7e3de1136"
}
```

## tests/verification-4.6.json
```
{
  "version": "4.6.0",
  "logic": "revision44,45,46 PASS",
  "visual": "412x915 HUD screenshot checked with service worker bypass",
  "androidPhysical": "not tested",
  "sha256": "5e0cd5647491b807b97e3cbfbcfa984345ff2b7fe503389f3bd184bec341dc74"
}
```

## screenshots/v47-browser-report.json
```
{
  "stages": 10,
  "state": "ended",
  "hp": 120
}
```

## screenshots/v47-playthrough.json
```
[
  {
    "damage": 11.799999999999999,
    "rate": 34.111111111111114,
    "peak": 10,
    "average": 4,
    "peakGems": 7,
    "meanLife": 4.35,
    "stage": 1,
    "seconds": 80,
    "hp": 120,
    "kills": 73,
    "shots": 1,
    "squad": "1",
    "next": 2
  },
  {
    "damage": 203.924,
    "rate": 138.11111111111111,
    "peak": 18,
    "average": 8.8,
    "peakGems": 14,
    "meanLife": 5.76,
    "stage": 2,
    "seconds": 81,
    "hp": 120,
    "kills": 127,
    "shots": 1,
    "squad": "1",
    "next": 3
  },
  {
    "damage": 1084.924,
    "rate": 240,
    "peak": 21,
    "average": 9,
    "peakGems": 17,
    "meanLife": 3.96,
    "stage": 3,
    "seconds": 78,
    "hp": 120,
    "kills": 181,
    "shots": 3,
    "squad": "1",
    "next": 4
  },
  {
    "damage": 10962.924,
    "rate": 240,
    "peak": 21,
    "average": 7,
    "peakGems": 23,
    "meanLife": 2.41,
    "stage": 4,
    "seconds": 82,
    "hp": 120,
    "kills": 235,
    "shots": 3,
    "squad": "2",
    "next": 5
  },
  {
    "damage": 16737.924,
    "rate": 240,
    "peak": 40,
    "average": 12,
    "peakGems": 21,
    "meanLife": 3.77,
    "stage": 5,
    "seconds": 90,
    "hp": 120,
    "kills": 289,
    "shots": 4,
    "squad": "2",
    "next": 6
  },
  {
    "damage": 23469.924,
    "rate": 240,
    "peak": 47,
    "average": 13.6,
    "peakGems": 22,
    "meanLife": 4.25,
    "stage": 6,
    "seconds": 106,
    "hp": 62.30008665517772,
    "kills": 343,
    "shots": 4,
    "squad": "3",
    "next": 7
  },
  {
    "damage": 35077.924,
    "rate": 240,
    "peak": 60,
    "average": 18.7,
    "peakGems": 21,
    "meanLife": 4.24,
    "stage": 7,
    "seconds": 89,
    "hp": 120,
    "kills": 397,
    "shots": 5,
    "squad": "3",
    "next": 8
  },
  {
    "damage": 46262.924,
    "rate": 240,
    "peak": 55,
    "average": 19.4,
    "peakGems": 23,
    "meanLife": 4.06,
    "stage": 8,
    "seconds": 94,
    "hp": 120,
    "kills": 451,
    "shots": 5,
    "squad": "4",
    "next": 9
  },
  {
    "damage": 65155.924,
    "rate": 240,
    "peak": 60,
    "average": 20,
    "peakGems": 30,
    "meanLife": 3.26,
    "stage": 9,
    "seconds": 82,
    "hp": 120,
    "kills": 505,
    "shots": 6,
    "squad": "4",
    "next": 10
  },
  {
    "damage": 78124.924,
    "rate": 240,
    "peak": 38,
    "average": 12.5,
    "peakGems": 28,
    "meanLife": 1.94,
    "stage": 10,
    "seconds": 87,
    "hp": 120,
    "kills": 559,
    "shots": 6,
    "squad": "5",
    "next": 10
  }
]
```

