import assert from 'node:assert/strict';
import {player,initEntities,spawnEnemy,hit,updateEntities} from '../js/entities.js';
import {shopCost} from '../js/shop.js';
import {Runway} from '../js/runway.js';
import {Particles} from '../js/particles.js';
import {Mode} from '../js/modes.js';
const g={p:player(),mode:new Mode('campaign'),state:'playing',time:0,fx:new Particles(),runway:new Runway(),input:{move(){}},ui:{toast(){}},kills:0,coins:0,score:0,lootClock:1000,healClock:1000,loot:[],turrets:[],levelUp(){},finish(){}};initEntities(g);g.runway.rows=[];g.runway.drums=[];g.runway.nextRow=1000;
for(let i=0;i<3;i++){const e=spawnEnemy(g,0);e.x=600;e.y=300;hit(g,e,10000);}
assert.equal(g.coins,3,'击杀基础收益不变');assert.equal(g.gems.items.filter(e=>e.active).reduce((a,b)=>a+(b.coins||0),0),1);
updateEntities(g,1/60);assert.equal(g.coins,3,'远处掉落不会自动给CR');for(const gem of g.gems.items)if(gem.active){gem.x=g.p.x;gem.y=g.p.y;}updateEntities(g,1/60);assert.equal(g.coins,4);updateEntities(g,1/60);assert.equal(g.coins,4,'不能重复领取');
assert.equal(shopCost(0),60);for(let i=0;i<10;i++){const old=Math.ceil(80*(i+1)**3*1.07**i);assert.ok(i<3?shopCost(i)<old:shopCost(i)===old);}console.log('PASS pickup-only bonus CR, no double collection, first three levels discounted, later costs unchanged');
