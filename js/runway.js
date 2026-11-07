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
    const count = Math.min(game.mode.remaining, track.openingMax, track.openingSize + (game.mode.stage - 1) * track.openingStageGrowth);
    for (let i = 0; i < count; i++) {
      const enemy = game.spawnEnemy(0);
      if (!enemy) break;
      game.mode.remaining--;
      // 所有刷怪入口集中在前方，不从玩家两翼包夹。
      const vanguard = i < 10;
      enemy.x = enemy.px = game.p.x;
      enemy.y = enemy.py = vanguard ? 390 - i * 45 : 300 - Math.floor((i - 10) / 10) * 52;
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
