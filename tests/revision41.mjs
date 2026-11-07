import assert from 'node:assert/strict';
import {useItem,unlockHits,updateLoot,weaponStats} from '../js/loot.js';
import {player,initEntities} from '../js/entities.js';
import {Runway} from '../js/runway.js';
import {Particles} from '../js/particles.js';
const g={p:player(),state:'playing',time:0,lootClock:100,loot:[],turrets:[],fx:new Particles(),ui:{toast(){},update(){}},persistGrowth(){}};initEntities(g);g.p.upgradeHistory=[];
assert.ok(unlockHits('laser')>unlockHits('turret')&&unlockHits('turret')>unlockHits('rate'));
g.loot=[{x:g.p.x,y:g.p.y,hits:0,id:'laser'}];updateLoot(g,0);assert.equal(g.p.inventory.laser,1);assert.equal(g.effects.length,0);assert.equal(useItem(g,'laser'),true);assert.equal(g.p.inventory.laser,0);assert.equal(useItem(g,'laser'),false);
const low=weaponStats(g.p,1),high=weaponStats(g.p,8);assert.ok(high.damage>low.damage&&high.rate>low.rate);
for(const [x,n,expect] of [[528,1,false],[300,1,false],[192,1,true],[240,5,false],[192,5,true]]){g.p.x=g.p.px=x;g.p.squad=BigInt(n);g.p.weapon=1;g.runway=new Runway();g.runway.drums=[];g.runway.rows=[];g.runway.addRow(g.p.y-1);Object.assign(g.runway.rows[0].gates[0],{x:192,kind:'add',value:4n});g.runway.update(g,1/60);assert.equal(g.p.weapon>1,expect,`x=${x} n=${n}`);}
console.log('PASS: rarity hit costs, inventory not auto-use, single-use, visible weapon math, strict whole-squad gate crossing');
