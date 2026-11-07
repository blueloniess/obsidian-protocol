import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { initEntities, spawnEnemy } from '../js/entities.js';
import { Particles } from '../js/particles.js';
import { save, fresh, validate } from '../js/save.js';
import { UPGRADES } from '../js/upgrades.js';
import { difficulty, Mode } from '../js/modes.js';
import { xpThreshold } from '../js/progression.js';
import { BALANCE as B } from '../js/config.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const ui=new Proxy({}, {get:()=>()=>{}});
function make(){const g=Object.create(Game.prototype);g.fx=new Particles();g.input={reset(){},move(){}};g.ui=ui;initEntities(g);return g;}
save.data=fresh();
const g=make();g.start('campaign',1);
assert.equal(g.enemies.count,3);
for(let i=0;i<5*60;i++)g.mode.update(g,B.step);
assert.equal(g.enemies.count,3,'首关前5秒不追加敌群');
assert.ok(g.enemies.items.filter(e=>e.active).every(e=>e.type===0));
const budgets=[];
for(const stage of [1,2,5,10,15]){const mode=new Mode('campaign',stage);mode.local=1;mode.wave=(stage-1)*3+1;budgets.push(difficulty(mode,1));}
for(let i=1;i<budgets.length;i++)assert.ok(budgets[i].population>budgets[i-1].population&&budgets[i].pack>=budgets[i-1].pack);
assert.ok(difficulty(g.mode,8).pack>difficulty(g.mode,1).pack);
const normal=spawnEnemy(g,0).maxHP;g.mode.stage=2;
assert.ok(spawnEnemy(g,0).maxHP>normal*1.2);g.mode.stage=1;
const ids=['damage','damage','health','multi','multi','multi','multi','pierce','pierce','pierce','chain','chain','freeze','aura','aura','burn','burn'];
for(const id of ids){g.p.xp=g.p.nextXP+7;g.levelUp();assert.equal(g.state,'playing');g.applyUpgrade(UPGRADES.find(u=>u.id===id));g.persistGrowth();}
assert.equal(g.p.level,ids.length+1);
assert.equal(g.p.synergies.size,3);
const stats=Object.fromEntries(['damage','maxHP','shots','pierce','chain','freeze','aura','burn','level','nextXP','rerolls'].map(k=>[k,g.p[k]]));
g.p.squad=10n**400n;g.p.xp=17;g.gems.clear();g.gems.take({value:140});g.finish(true);
assert.equal(save.data.campaign.xp,157,'收集结算时遗留经验，包括首领掉落');
const encoded=save.export();save.data=fresh();save.load();
assert.deepEqual(save.data.campaign.history,ids);
g.start('campaign',2);
for(const [key,value]of Object.entries(stats))assert.equal(g.p[key],value,key+' 跨关继承且不重复叠加');
assert.equal(g.p.squad,10n**400n);assert.equal(g.p.xp,157);assert.equal(g.p.synergies.size,3);assert.equal(g.p.hp,g.p.maxHP);
assert.equal(g.enemies.count,11,'第二关开场明显多于首关');
g.p.squad=0n;g.p.xp=161;g.finish(false);g.start('campaign',2);
assert.equal(g.p.squad,10n**400n,'失败从上次通关编队恢复');assert.equal(g.p.xp,161);assert.equal(g.p.damage,stats.damage);
save.import(encoded);assert.equal(save.data.campaign.squad,String(10n**400n));
const legacy={...fresh(),version:1,stage:4,coins:133};delete legacy.campaign;
const migrated=validate(legacy);assert.equal(migrated.stage,4);assert.equal(migrated.coins,133);assert.equal(migrated.campaign.history.length,0);
for(const patch of [{history:['invalid']},{xp:-1},{squad:'-2'},{nextStage:16}])assert.throws(()=>validate({...fresh(),campaign:{...fresh().campaign,...patch}}));
assert.deepEqual([1,2,3,4,5].map(xpThreshold),[24,31,40,52,67]);
g.start('endless');assert.equal(g.p.level,1);assert.equal(g.p.squad,2n,'无限模式独立于闯关成长');
console.log('PASS: gentle opening, rising stage/level density, health scaling, all upgrade stats + 3 synergies across stages, XP growth, death/reload/import/legacy saves.');
console.log({stageOpeningBudgets:budgets.map(d=>d.population),packSizes:budgets.map(d=>d.pack),xp:[1,2,3,4,5].map(xpThreshold)});

// 批量经验不暂停；待领次数参与等级/经验门槛，还原与旧存档兼容。
save.data=fresh();g.start('campaign',1);g.p.xp=147;g.input.pointer=9;g.levelUp();
assert.equal(g.state,'playing');assert.equal(g.input.pointer,9);assert.equal(g.p.level,5);assert.equal(g.p.pendingUpgrades,4);assert.equal(g.p.xp,0);
g.gems.clear();g.finish(true);g.start('campaign',2);assert.equal(g.p.pendingUpgrades,4);assert.equal(g.p.level,5);assert.equal(g.p.nextXP,67);
const pendingSave=save.export();save.import(pendingSave);assert.equal(save.data.campaign.pending,4);
for(const pending of [-1,1.5,Infinity,2001])assert.throws(()=>validate({...fresh(),campaign:{...fresh().campaign,pending}}));
console.log('PASS: silent multi-level gain, pointer preserved, pending claims survive stage/save/export/import.');
