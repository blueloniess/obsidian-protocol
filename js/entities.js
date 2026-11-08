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
