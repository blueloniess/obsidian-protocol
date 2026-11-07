import {BALANCE as B} from './config.js';
export function weaponStats(p){return {damage:Math.max(1,p.damage+(p.gateDamage||0)),rate:Math.min(B.director.rateCap,Math.max(1,1/p.rate+(p.gateRate||0)))};}
export function bulletFlow(p){return weaponStats(p).rate*Math.max(1,Math.min(1e12,Number(p.squad)))*Math.min(B.maxShots,p.shots||1);}
export function combatProfile(p){const stats=weaponStats(p),aoe=Boolean(p.explosive||p.chain||p.aura||p.shots>=3),dps=stats.damage*bulletFlow(p),power=Math.max(1,dps/10);return {aoe,dps,power,pressure:2+Math.log2(power)*12,hp:Math.max(power**.28,stats.damage/10*(.8+.06*Math.log2(power)))*(aoe?1.15:1),columns:aoe?5:1};}
export function gateNeed(p){return Math.max(2,Math.round(bulletFlow(p)*.65));}
export function applyGate(p,gate){const before=weaponStats(p),n=Number(gate.value);if(gate.stat==='rate')p.gateRate=Math.max(1-1/p.rate,Math.min(B.director.rateCap-1/p.rate,(p.gateRate||0)+n));else p.gateDamage=Math.max(1-p.damage,(p.gateDamage||0)+n);return {before,after:weaponStats(p)};}
