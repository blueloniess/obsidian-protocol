import assert from 'node:assert/strict';
import {Game,Input} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,updateEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {updateLoot,unlockHits,useItem} from '../js/loot.js';
import {BALANCE as B} from '../js/config.js';
let seed=902;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',1);assert.equal(new Set(g.enemies.items.filter(e=>e.active).map(e=>e.x)).size,3);
for(let j=0;j<6;j++){g.mode.remaining=100;g.mode.spawnPack(g);}assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.x>=160&&e.x<=560));
const p={x:192,squad:1n,speed:235};Input.prototype.move.call({target:540,pointer:1,keys:new Set()},p,1/60);assert.equal(p.x,540);
g.start('campaign',1);g.time=5;updateLoot(g,5);assert.equal(g.loot[0].id,'grenade');assert.ok(g.loot[0].hits<=6);
for(const stage of [3,4]){g.start('campaign',stage);const e=g.spawnEnemy(4);e.shield=0;e.plates=0;e.guard=0;e.cycle=4;e.hp=1;const shots=g.p.shots,squad=g.p.squad;hit(g,e,1000,false,true);assert.ok(g.p.shots>shots||g.p.squad>squad);const rewarded=g.p.squad;hit(g,e,1000);assert.equal(g.p.squad,rewarded,'不能重复领取');}
console.log('PASS multi-lane opening, side margins, immediate drag, early accessible grenade, guaranteed stage3+ boss reward');
// 完整闯关自动策略，真实射击/拾取/门/首领/结算；不直接修改战斗属性。
save.data=fresh();const sim=game();sim.input.move=(p,dt)=>{const threats=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=sim.runway.rows[0]?.gates[0],loot=sim.loot.find(o=>o.y>350),zones=sim.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};
for(let stage=1;stage<=4;stage++){sim.start('campaign',stage);for(let tick=0;tick<600*60&&sim.state==='playing';tick++){sim.time+=1/60;sim.mode.update(sim,1/60);if(sim.state==='playing')updateEntities(sim,1/60);sim.fx.update(1/60);if(tick%60===0&&sim.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(sim,id);}console.log({stage,seconds:Math.round(sim.time),hp:sim.p.hp,kills:sim.kills,shots:sim.p.shots,squad:String(sim.p.squad),next:save.data.campaign.nextStage});assert.ok(sim.p.hp>0&&save.data.campaign.nextStage>stage,'前四关换线拾取策略应可通关');}

save.data=fresh();const idle=game();idle.start('campaign',1);for(let i=0;i<300*60&&idle.state==='playing';i++){idle.time+=1/60;idle.mode.update(idle,1/60);if(idle.state==='playing')updateEntities(idle,1/60);idle.fx.update(1/60);}assert.equal(save.data.campaign.nextStage,1,'站桩不应通关首关');console.log('PASS active strategy clears 1–4, stationary strategy cannot clear stage1');
