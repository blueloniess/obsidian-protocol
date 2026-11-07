import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {player,initEntities,spawnEnemy,updateEntities,breach,hit} from '../js/entities.js';
import {Runway,chargeGate,gateResult,makeGate} from '../js/runway.js';
import {Mode,difficulty} from '../js/modes.js';
import {Particles} from '../js/particles.js';
import {BALANCE as B} from '../js/config.js';
import {UPGRADES} from '../js/upgrades.js';
function game(stage=1,kind='campaign'){const g={p:player(),mode:new Mode(kind,stage),time:0,state:'playing',fx:new Particles(),ui:{toast(t){g.message=t;}},input:{move(){}},runway:new Runway(),kills:0,score:0,coins:0,freeze:0,shake:0,finish(w){this.state='ended';this.won=w;},levelUp(){Game.prototype.levelUp.call(this);},persistGrowth(){},spawnEnemy(type){return spawnEnemy(this,type);}};initEntities(g);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1e6;g.p.nextXP=1e9;g.p.upgradeHistory=[];return g;}
const gate={kind:'add',value:-12n,charge:0n};chargeGate(gate,BigInt(B.track.gateAddMicros)*12n);assert.equal(gate.value,0n);chargeGate(gate,BigInt(B.track.gateAddMicros)*50n);assert.equal(gate.value,50n);assert.equal(gateResult(20n,gate),70n);
for(const kind of ['campaign','endless']){
 const g=game(1,kind);g.p.squad=50n;g.p.x=528;g.runway.addRow(g.p.y);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:-12n});g.runway.update(g,B.step);assert.equal(g.p.squad,38n,'门不要求同侧接取');assert.match(g.message,/-12/);g.runway.update(g,B.step);assert.equal(g.p.squad,38n);
 g.p.invul=100;g.p.armor=.7;for(let i=0;i<11;i++)breach(g,spawnEnemy(g,0));assert.equal(g.p.hp,10);assert.equal(g.leaks,11);assert.ok(g.edgeWarning>0);assert.equal(g.state,'playing');breach(g,spawnEnemy(g,0));assert.equal(g.p.hp,0);assert.equal(g.state,'ended');
}
const smooth=game();const target=spawnEnemy(smooth,0);target.hp=target.maxHP=1e6;for(let i=0;i<40;i++)hit(smooth,target,1,true,true);assert.equal(smooth.freeze,0,'连续暴击不暂停');assert.equal(smooth.fx.numbers.count,1,'同目标飘字限频');
function encounter(useBuild,kind){let seed=93;const old=Math.random;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;try{const g=game(7,kind);g.mode.wave=19;g.p.squad=120n;g.p.x=360;
 const ids=useBuild?[...Array(8).fill('damage'),...Array(6).fill('rate'),...Array(6).fill('pierce'),...Array(4).fill('multi')]:[...Array(5).fill('speed'),...Array(5).fill('magnet'),...Array(5).fill('luck'),...Array(5).fill('regen'),...Array(4).fill('health')];
 for(const id of ids){UPGRADES.find(u=>u.id===id).apply(g.p);g.p.upgradeHistory.push(id);}
 for(let i=0;i<24;i++){const e=spawnEnemy(g,2);e.x=150+(i%6)*80;e.y=160-Math.floor(i/6)*70;}
 g.input.move=(p,dt)=>{const closest=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y)[0];if(closest){const dx=closest.x-p.x;const step=p.speed*B.track.strafeFactor*dt;p.x+=Math.max(-step,Math.min(step,dx));}};
 for(let i=0;i<1800&&g.state==='playing'&&g.enemies.count;i++){g.time+=B.step;updateEntities(g,B.step);g.fx.update(B.step);}
 return {alive:g.state==='playing',kills:g.kills,leaks:g.leaks||0,hp:g.p.hp};}finally{Math.random=old;}}
for(const kind of ['campaign','endless']){const right=encounter(true,kind),wrong=encounter(false,kind);console.log({kind,right,wrong});assert.ok(right.kills>wrong.kills);assert.equal(wrong.alive,false);assert.equal(right.alive,true);}
console.log('PASS: uncapped signed gates, auto settlement off-lane, exact 12-leak defeat, red warning, zero hitstop, late builds decide survival in both modes.');
