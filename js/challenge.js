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
