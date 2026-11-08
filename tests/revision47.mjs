import assert from 'node:assert/strict';
import {Game} from '../js/game.js';
import {save,fresh} from '../js/save.js';
import {initEntities,hit} from '../js/entities.js';
import {Particles} from '../js/particles.js';
import {encounterHP} from '../js/combat.js';
import {difficulty} from '../js/modes.js';
import {BALANCE as B} from '../js/config.js';
globalThis.localStorage={setItem(){},getItem(){return null;}};
function game(){const g=Object.create(Game.prototype);g.fx=new Particles();g.ui=new Proxy({}, {get:()=>()=>{}});g.input={reset(){},move(){}};initEntities(g);return g;}
save.data=fresh();const g=game();g.start('campaign',6);g.p.damage=10748.8;g.p.rate=1/240;g.p.squad=2n;g.p.shots=3;
const hp=encounterHP(g.p,0,6);assert.ok(hp>g.p.damage*10&&hp<g.p.damage*80,'录像火力下不能一枪蒸发，也不能变血墙');
for(let stage=5;stage<=100;stage++){for(let type=0;type<5;type++){const a=encounterHP(g.p,type,stage),b=encounterHP(g.p,type,stage+1);assert.ok(Number.isFinite(a)&&b/a<1.1,'后期血量无指数跳档');}const a=difficulty({kind:'campaign',stage,local:2,aoe:true},20,230);assert.ok(a.pack<=12);}
const d4=difficulty({kind:'campaign',stage:4,local:2},20,230),d5=difficulty({kind:'campaign',stage:5,local:2},20,230);assert.ok(d5.population/d4.population<1.3);
g.enemies.clear();g.mode.remaining=100;g.mode.spawnPack(g);assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.y>=260&&e.y<=405&&e.x>=160&&e.x<=560));
const enemy=g.enemies.items.find(e=>e.active),fixed=enemy.hp;g.p.damage*=2;assert.equal(enemy.hp,fixed,'强化不改变已生成敌人血量');
g.enemies.clear();g.gems.clear();g.kills=0;g.coins=0;for(let i=0;i<100;i++){const e=g.spawnEnemy(0);e.x=360;e.y=400;hit(g,e,e.hp*2);}
assert.equal(g.gems.count,1);const gem=g.gems.items.find(e=>e.active);assert.equal(gem.value,400);assert.equal(gem.coins,33);assert.equal(g.coins,100,'合并不能吞经验或CR');
g.start('endless');g.mode.wave=16;g.p.damage=10748.8;g.p.rate=1/240;g.p.squad=2n;g.p.shots=3;assert.equal(g.spawnEnemy(0).maxHP,hp,'无限使用同一晚期血量算法');
console.log('PASS late HP continuity to stage100, stage5 budget continuity, visible spawn bounds, immutable living HP, XP/CR conservation, endless parity');
