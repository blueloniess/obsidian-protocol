import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {initEntities,updateEntities} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {save,fresh} from '../js/save.js';
import {BALANCE as B} from '../js/config.js';
let seed=487;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
globalThis.localStorage={setItem(){},getItem(){return null;}};save.data=fresh();
const g=Object.create(Game.prototype);g.fx=new Particles();initEntities(g);
let cards,won,stageTarget=1;
g.ui=new Proxy({overlay:{innerHTML:''},upgrade(c){cards=c;},result(w){won=w;}},{get:(obj,key)=>obj[key]||(()=>{})});
g.input={reset(){},move(p,dt){
 const row=g.runway.rows[0];const enemies=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y);const danger=enemies.find(e=>e.type!==4&&e.y>540);
 const gate=row?.gates[0];let aim=danger?danger.x-10:gate&&(gate.kind==='divide'||gate.value<10n||p.squad<BigInt([35,90,180][stageTarget-1]))?gate.x:(enemies[0]?.x??360);
 const zones=g.hazards.items.filter(h=>h.active&&(h.left<.9||h.flash>0));
 const width=(Math.min(Number(p.squad),B.track.columns)-1)*B.track.spacing/2;
 if(zones.some(h=>Math.abs(aim-h.x)<h.width+width+8)){
  const safe=[115,192,360,528,605].filter(x=>zones.every(h=>Math.abs(x-h.x)>h.width+width+8));
  safe.sort((a,b)=>Math.abs(a-aim)-Math.abs(b-aim));aim=safe[0]??360;
 }
 const step=p.speed*B.track.strafeFactor*dt;p.x+=Math.max(-step,Math.min(step,aim-p.x));
}};
const order=['spec_artillery','damage','multi','pierce','breach','salvo','execution','rate'];
const results=[];
for(let stage=1;stage<=3;stage++){
 stageTarget=stage;g.start('campaign',stage);const startLevel=g.p.level,startCount=g.p.squad;let peak=0;
 for(let tick=0;tick<300*60&&g.state!=='ended';tick++){
  if(g.p.pendingUpgrades){g.openUpgrades();cards.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));g.choose(cards[0]);}
  g.time+=B.step;g.mode.update(g,B.step);if(g.state==='playing')updateEntities(g,B.step);g.fx.update(B.step);peak=Math.max(peak,g.enemies.count);
 }
 results.push({stage,startLevel,endLevel:g.p.level,startCount:String(startCount),count:String(g.p.squad),seconds:Math.round(g.time),kills:g.kills,peak,won});
 console.log(results.at(-1));assert.ok(g.p.squad>0n);assert.equal(won,true,'正常选卡与继承可以通过第'+stage+'关');
 if(stage>1)assert.ok(startLevel>1&&startCount>2n);
}
assert.ok(BigInt(results[2].count)>120n,'真实连续闯关人数可以突破120');
assert.ok(results[2].kills>results[1].kills&&results[1].kills>results[0].kills,'尸潮总量随成长增加');
console.log('PASS: three-stage campaign using production upgrade choices, saved stats, uncapped army and adaptive enemies.');console.log(results);
