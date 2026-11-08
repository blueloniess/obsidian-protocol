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
