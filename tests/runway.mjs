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
