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
