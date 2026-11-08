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
