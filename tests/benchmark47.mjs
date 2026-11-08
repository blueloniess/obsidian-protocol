import {weaponStats} from '../js/combat.js';
import assert from 'node:assert/strict';
import {Game,Input} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,updateEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {updateLoot,unlockHits,useItem} from '../js/loot.js';
import {BALANCE as B} from '../js/config.js';
let seed=Number(process.env.SEED||902);Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const sim=game();sim.input.move=(p,dt)=>{const threats=sim.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=sim.runway.rows[0]?.gates[0],loot=sim.loot.find(o=>o.y>350),zones=sim.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};
const report=[];for(let stage=1;stage<=10;stage++){sim.start('campaign',stage);let peak=0,sum=0,samples=0,peakGems=0;const born=new Map(),lifetimes=[];const orig=sim.spawnEnemy;sim.spawnEnemy=function(type){const e=orig.call(this,type);if(e)born.set(e.id,{e,t:this.time});return e;};for(let tick=0;tick<600*60&&sim.state==='playing';tick++){sim.time+=1/60;sim.mode.update(sim,1/60);if(sim.state==='playing')updateEntities(sim,1/60);sim.fx.update(1/60);peak=Math.max(peak,sim.enemies.count);peakGems=Math.max(peakGems,sim.gems.count);sum+=sim.enemies.count;samples++;for(const [id,o] of born)if(!o.e.active||o.e.id!==id){lifetimes.push(sim.time-o.t);born.delete(id);}if(tick%60===0&&sim.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(sim,id);}sim.spawnEnemy=orig;const row={...weaponStats(sim.p),peak,average:Math.round(sum/samples*10)/10,peakGems,meanLife:Math.round(lifetimes.reduce((a,b)=>a+b,0)/Math.max(1,lifetimes.length)*100)/100,stage,seconds:Math.round(sim.time),hp:sim.p.hp,kills:sim.kills,shots:sim.p.shots,squad:String(sim.p.squad),next:save.data.campaign.nextStage};report.push(row);console.log(row);if(sim.p.hp<=0)break;}
if(process.env.REPORT){const {writeFileSync}=await import('node:fs');writeFileSync(process.env.REPORT,JSON.stringify(report,null,2));}
assert.equal(report.length,10);assert.ok(report.every(r=>r.hp>0));
