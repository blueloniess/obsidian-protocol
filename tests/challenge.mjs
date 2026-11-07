import assert from 'node:assert/strict';
import {BALANCE as B} from '../js/config.js';
import {player,initEntities,spawnEnemy,hit,hurt,healingFactor} from '../js/entities.js';
import {stageHealth,healthPressure,armorFactor,updateEnemyChallenge,updateHazards,warnStrike} from '../js/challenge.js';
import {Particles} from '../js/particles.js';
function game(stage){const g={p:player(),mode:{kind:'campaign',stage,wave:(stage-1)*3+3},time:0,state:'playing',fx:new Particles(),ui:{toast(){}},score:0,coins:0,kills:0,freeze:0,shake:0,finish(win){this.state='ended';this.won=win;}};initEntities(g);g.p.squad=300n;g.p.x=528;return g;}
assert.equal(stageHealth(1),1);assert.equal(stageHealth(2),1.28);assert.ok(stageHealth(10)>B.hpStageGrowth**9*5);assert.ok(healthPressure(10000n)>healthPressure(1000n)*5);
const g=game(4),tank=spawnEnemy(g,2);const shield=tank.shield,hp=tank.hp;
hit(g,tank,100,false,true);assert.ok(Math.abs(shield-tank.shield-35)<.001);assert.equal(tank.hp,hp);
g.p.pierce=2;const before=tank.shield;hit(g,tank,100,false,true);assert.ok(Math.abs(before-tank.shield-100)<.001);
hit(g,tank,10,false,false);assert.ok(tank.hp<hp,'持续伤害绕过护甲');
hit(g,tank,tank.shield,false,true);assert.equal(tank.shield,0);assert.ok(tank.exposed>0);
const boss=spawnEnemy(g,4);assert.equal(armorFactor(boss),.25);boss.cycle=3.1;assert.equal(armorFactor(boss),1.35);
const beforeWarning=g.p.hp;warnStrike(g,boss,528,94,.34,'test');updateHazards(g,1,hurt);assert.equal(g.p.hp,beforeWarning,'预警期间不伤害');
g.p.x=192;updateHazards(g,1,hurt);assert.equal(g.p.hp,beforeWarning,'提前离开落点不受伤');
g.hazards.clear();g.p.x=528;warnStrike(g,boss,528,94,.34,'test');updateHazards(g,2,hurt);assert.ok(g.p.hp<beforeWarning&&g.p.squad<300n);assert.equal(healingFactor(g.p),.2);
g.hazards.clear();warnStrike(g,boss,528,94,.34,'test');boss.active=false;updateHazards(g,2,hurt);assert.equal(g.hazards.count,0);
function survive(stage,dodge){const sim=game(stage),boss=spawnEnemy(sim,4);let avoided=0;
 for(let i=0;i<40*60&&sim.state==='playing';i++){
  const dt=B.step;sim.time+=dt;sim.p.invul=Math.max(0,sim.p.invul-dt);sim.p.wound=Math.max(0,(sim.p.wound||0)-dt);
  updateEnemyChallenge(sim,boss,dt);
  if(dodge){const zones=sim.hazards.items.filter(h=>h.active&&h.left<.9);const safe=[192,360,528].filter(x=>zones.every(h=>Math.abs(x-h.x)>h.width+67.5+8));let target=zones.length?safe[0]:528;if(target!==undefined){const delta=target-sim.p.x,step=sim.p.speed*B.track.strafeFactor*dt;sim.p.x+=Math.max(-step,Math.min(step,delta));if(zones.length)avoided++;}}
  updateHazards(sim,dt,hurt);
 }
 return {alive:sim.state==='playing',hp:sim.p.hp,avoided};
}
for(const stage of [3,7,10,15]){const idle=survive(stage,false),dodge=survive(stage,true);assert.equal(idle.alive,false,'站桩应失败 '+stage);assert.equal(dodge.alive,true,'预警可躲避 '+stage);assert.equal(dodge.hp,120);console.log({stage,idle,dodge});}
const artillery=game(5),thrower=spawnEnemy(artillery,3);thrower.y=400;updateEnemyChallenge(artillery,thrower,.1);assert.equal(artillery.hazards.count,1);
console.log('PASS: late HP scaling, armor counters, boss exposure, warning safety, dead-owner cancellation, wounds; stationary fails and dodging survives stages 3/7/10/15.');

const dual=game(7),db=spawnEnemy(dual,4);db.strikes=1;db.strikeTimer=0;updateEnemyChallenge(dual,db,.01);assert.deepEqual(dual.hazards.items.filter(h=>h.active).map(h=>h.x),[192,528]);dual.p.x=360;updateHazards(dual,2,hurt);assert.equal(dual.p.hp,120,'中央缺口保持安全');
