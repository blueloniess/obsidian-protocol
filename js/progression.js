import { normalizeSquad } from './runway.js';
import { BALANCE as B } from './config.js';
import { UPGRADES, SYNERGIES } from './upgrades.js';

export const freshProgress = () => ({ history: [], pending: 0, xp: 0, squad: '1', rerolls: null, nextStage: 1 });
/** 只保存已选强化ID；从基础角色重放，避免跨关重复叠加永久商店属性。 */
export function validateProgress(data) {
  if (data === undefined) return freshProgress();
  if (!data || !Array.isArray(data.history) || data.history.length > 2000 ||
      !Number.isSafeInteger(data.pending??0) || (data.pending??0)<0 || (data.pending??0)>2000 ||
      !data.history.every(id => typeof id==='string') ||
      !Number.isFinite(data.xp) || data.xp < 0 ||
      typeof data.squad !== 'string' || !/^[1-9][0-9]*$/.test(data.squad) ||
      !(data.rerolls === null || (Number.isSafeInteger(data.rerolls) && data.rerolls >= 0)) ||
      !Number.isInteger(data.nextStage) || data.nextStage < 1 || data.nextStage > B.stages)
    throw Error('闯关成长存档不合法');
  return { history: data.history.filter(id=>UPGRADES.some(u=>u.id===id)&&!id.startsWith('spec_')&&!UPGRADES.find(u=>u.id===id).active), inventory:Object.fromEntries(["grenade","laser","turret"].map(k=>[k,Math.max(0,Math.min(999,Math.floor(Number(data.inventory?.[k])||0)))])),gateRate:Number.isFinite(data.gateRate)?data.gateRate:null,gateDamage:Number.isFinite(data.gateDamage)?data.gateDamage:null,pending:0,weapon:Math.max(1,Number.isSafeInteger(data.weapon)?data.weapon:1), xp: data.xp, squad: String(normalizeSquad(data.squad)), rerolls: data.rerolls, nextStage: data.nextStage };
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
  p.level = data.history.length + p.pendingUpgrades + 1;
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
  return { history: [...(p.upgradeHistory || [])], inventory:{...(p.inventory||{})},gateRate:p.gateRate||0,gateDamage:p.gateDamage||0,pending:0,weapon:p.weapon||1, xp: p.xp,
    squad: won ? String(normalizeSquad(p.squad > 0n ? p.squad : 1n)) : String(normalizeSquad(previous.squad)),
    rerolls: p.rerolls, nextStage: won ? Math.min(B.stages, stage + 1) : previous.nextStage };
}
