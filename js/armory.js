import {BALANCE as B} from './config.js';
export function weapon(p){let result=B.weapons[0];for(const w of B.weapons)if(p.weaponPoints>=w.points)result=w;return result;}
/** 所有队员共用当前枪械，一人一份真实弹丸，不再以大整数弹丸代表无限人数。 */
export function gunStats(p){const w=weapon(p);return {...w,damage:w.damage*p.damage,rate:Math.max(B.minFireInterval,w.rate*p.rate),pellets:w.pellets+(p.shots-1),pierce:w.pierce+p.pierce};}
export function firepower(p){const w=gunStats(p);return w.damage/w.rate*w.pellets*Number(p.squad);}
export function weaponResult(p,gate){let value=BigInt(Math.floor(p.weaponPoints)),n=BigInt(gate.value),scale=BigInt(gate.scale??1);value=gate.kind==='multiply'?value*n/scale:gate.kind==='divide'?value*scale/(n>0n?n:1n):value+n;return Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number(value)));}
export function nextWeapon(p){return B.weapons.find(w=>w.points>p.weaponPoints);}
