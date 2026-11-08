import assert from 'node:assert/strict';
import {player,initEntities,spawnEnemy,updateEntities} from '../js/entities.js';
import {Runway,makeGate} from '../js/runway.js';
import {applyGate,weaponStats,combatProfile} from '../js/combat.js';
import {Mode,difficulty} from '../js/modes.js';
import {hitLoot,unlockHits} from '../js/loot.js';
import {Particles} from '../js/particles.js';
import {save,fresh} from '../js/save.js';
save.data=fresh();
function game(){const g={p:player(),mode:new Mode('campaign'),state:'playing',time:0,fx:new Particles(),ui:{toast(){}},input:{move(){}},runway:new Runway(),kills:0,score:0,coins:0,loot:[],lootClock:100,turrets:[],persistGrowth(){},finish(win){this.state='ended';},levelUp(){}};initEntities(g);g.spawnEnemy=type=>spawnEnemy(g,type);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1000;g.p.nextXP=1e9;g.p.upgradeHistory=[];return g;}
const g=game();assert.deepEqual(weaponStats(g.p),{damage:10,rate:1});
g.runway.addRow(500,1n,g.p);const gate=g.runway.rows[0].gates[0];Object.assign(gate,{stat:'rate',value:-3n});for(let i=0;i<6;i++){const b={x:gate.x,y:500,py:510,mass:1n,hits:new Set(),active:true};g.runway.intercept(b,g,()=>{});}assert.equal(gate.value,3n);applyGate(g.p,gate);assert.deepEqual(weaponStats(g.p),{damage:10,rate:4});
const charge=gate.value;g.time++;g.runway.update(g,1/60);assert.equal(gate.value,charge,'不命中就不增加');
applyGate(g.p,{stat:'damage',value:20n});assert.deepEqual(weaponStats(g.p),{damage:30,rate:4});
g.p.gateRate=9999;assert.equal(weaponStats(g.p).rate,240);for(let i=0;i<50;i++)assert.equal(makeGate(i,1n,Math.random,g.p).stat,'damage');
const basic=game().p;assert.equal(unlockHits('grenade',basic),50);basic.gateRate=49;assert.equal(unlockHits('grenade',basic),200);
g.loot=[{x:192,y:500,hits:200,id:'grenade'}];const bulk={x:192,y:495,py:510,mass:250n,active:true};hitLoot(g,bulk);assert.equal(g.loot[0].hits,0);assert.equal(bulk.mass,50n);assert.equal(bulk.active,true,'溢出弹数继续向前');
for(const [rate,damage,aoe] of [[1,10,false],[50,50,false],[50,50,true],[240,1000,true]]){const sim=game();sim.p.gateRate=rate-1;sim.p.gateDamage=damage-10;sim.p.explosive=aoe?1:0;sim.mode.next(sim);sim.mode.spawnPack(sim);const xs=new Set(sim.enemies.items.filter(e=>e.active).map(e=>e.x));assert.equal(xs.size>1,aoe||combatProfile(sim.p).power>=80);console.log({rate,damage,aoe,profile:combatProfile(sim.p),enemies:sim.enemies.count,hp:sim.enemies.items.find(e=>e.active)?.hp});}
// 高频射击10秒实际发射总弹数，不因可视示踪弹预算丢失。
for(const rate of [1,50,240]){const sim=game();sim.p.gateRate=rate-1;let emitted=0n;for(let i=0;i<600;i++){sim.time+=1/60;sim.bullets.clear();updateEntities(sim,1/60);for(const b of sim.bullets.items)if(b.active)emitted+=b.mass;sim.fx.update(1/60);}assert.ok(Math.abs(Number(emitted)-rate*10)<=Math.ceil(rate*.07),`${rate}: ${emitted}`);console.log({rate,shots10s:String(emitted)});}
console.log('PASS exact impact gates, separated stats, cap-only-damage gates, dynamic loot, surplus bullets, formations, firing conservation');


for(const [rate,damage,aoe,stage] of [[1,10,false,1],[50,50,false,3],[50,50,true,3],[240,1000,true,7]]){const sim=game();sim.mode=new Mode('campaign',stage);sim.p.gateRate=rate-1;sim.p.gateDamage=damage-10;sim.p.explosive=aoe?1:0;sim.mode.next(sim);let peak=0;sim.input.move=p=>{const e=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y)[0];if(e)p.x=e.x;};for(let i=0;i<2400&&sim.state==='playing';i++){sim.time+=1/60;sim.mode.update(sim,1/60);updateEntities(sim,1/60);sim.fx.update(1/60);peak=Math.max(peak,sim.enemies.count);}console.log({matrix:{rate,damage,aoe,stage},seconds:Math.round(sim.time),kills:sim.kills,peak,leaks:sim.leaks||0,hp:Math.round(sim.p.hp),state:sim.state});assert.ok(peak<=120);assert.ok(Number.isFinite(sim.p.hp));}
