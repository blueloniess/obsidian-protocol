import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {save,fresh,validate} from '../js/save.js';
import {initEntities} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {BALANCE as B} from '../js/config.js';
import {weaponStats} from '../js/combat.js';
import {updateLoot} from '../js/loot.js';
const storage=new Map();globalThis.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)??null};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.input={reset(){},move(){}};g.ui=new Proxy({}, {get:()=>()=>{}});initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',1);assert.equal(B.stages,10);assert.equal(g.runway.rows[0].gates[0].stat,'rate');assert.ok(g.runway.rows[0].gates[0].value>0n);const before=g.lootClock;g.p.xp=500;g.levelUp();assert.equal(g.lootClock,before,'升级不得催生补给');
g.start('endless');g.p.hp=70;g.p.breachLoss=30;g.p.inventory={grenade:2};g.p.gateDamage=50;g.p.gateRate=20;g.coins=123;g.mode.wave=8;g.mode.remaining=20;g.mode.budget=80;g.p.level=9;const e=g.spawnEnemy(2);e.hp/=2;const ehp=e.hp;g.loot=[{id:'grenade',x:150,y:500,hits:38,age:5}];const damage=weaponStats(g.p).damage;
g.exitEndless();assert.equal(save.data.coins,123);assert.equal(save.data.endless.wave,8);save.load();assert.ok(save.data.endless);save.data.shop.damage=4;g.start('endless');assert.equal(g.p.hp,70);assert.equal(g.p.breachLoss,30);assert.equal(g.mode.wave,8);assert.equal(g.p.level,9);assert.equal(g.p.inventory.grenade,2);assert.equal(g.loot[0].hits,38);assert.ok(g.enemies.items.some(e=>e.active&&e.hp===ehp));assert.ok(weaponStats(g.p).damage>damage);g.checkpointEndless();g.checkpointEndless();assert.equal(save.data.coins,123,'重复存档不得重复发钱');
g.finish(false);assert.equal(save.data.endless,null,'失败不可续存死局');
g.start('campaign',3);g.enemies.clear();g.mode.remaining=100;g.mode.spawnPack(g);const xs=g.enemies.items.filter(e=>e.active).map(e=>e.x);assert.ok(Math.max(...xs)-Math.min(...xs)>150,'中期必须分散');
g.start('endless');g.loot=[];g.lootClock=B.director.lootFirst;g.healClock=B.director.healFirst;let total=0;for(let i=0;i<180;i++){g.time++;updateLoot(g,1);total+=g.loot.filter(o=>o.id!=='heal').length;g.loot=[];}assert.ok(total>=6&&total<=15,`三分钟强化补给 ${total}`);
assert.equal(validate({...fresh(),stage:15,campaign:{...fresh().campaign,nextStage:15}}).stage,10);
console.log('PASS 10-stage migration, positive rate tutorial, level-up does not spawn loot, sparse drops, scattered enemies, endless exit/save/shop/resume, no duplicate coins, death resets run');
