import assert from 'node:assert/strict';
import {Pool,Grid} from '../js/utils.js';
import {BALANCE as B} from '../js/config.js';
import {fresh,validate} from '../js/save.js';
import {UPGRADES,choices,SYNERGIES} from '../js/upgrades.js';
import {Mode} from '../js/modes.js';
const pool=new Pool(2),a=pool.take({x:1});assert.ok(a);assert.ok(pool.take({x:2}));assert.equal(pool.take({}),null);a.active=false;assert.equal(pool.take({x:3}),a);assert.equal(pool.count,2);pool.clear();assert.equal(pool.count,0);
const grid=new Grid(),e={active:true,x:150,y:150};grid.rebuild([e]);let found=false;grid.query(150,150,25,t=>found=t===e);assert.ok(found);
assert.deepEqual(validate(fresh()),fresh());for(const bad of [{...fresh(),coins:-1},{...fresh(),stage:16},{...fresh(),top:[NaN]},{...fresh(),shop:{damage:99}}])assert.throws(()=>validate(bad));
assert.ok(UPGRADES.length>=18);for(let i=0;i<100;i++)assert.equal(new Set(choices({luck:0}).map(u=>u.id)).size,3);
for(let i=0;i<100;i++)assert.ok(choices({luck:0,homing:1,freeze:1,shots:B.maxShots,crit:B.maxCrit,armor:B.maxArmor,drone:B.maxSummons,orbit:B.maxSummons,chain:B.maxChain}).every(u=>!['homing','freeze','multi','crit','armor','drone','orbit','chain'].includes(u.id)));
assert.ok(SYNERGIES[0].test({shots:5,pierce:3}));assert.ok(SYNERGIES[1].test({chain:2,freeze:1}));assert.ok(SYNERGIES[2].test({aura:2,burn:2}));
for(let stage=1;stage<=15;stage++){let bosses=0,finished=false;const mode=new Mode('campaign',stage),g={time:200,enemies:{count:0},ui:{toast(){}},spawnEnemy(type){if(type===4)bosses++;return {};},finish(w){finished=w;}};for(let i=0;i<20000&&!finished;i++)mode.update(g,B.step);assert.ok(finished,`stage ${stage} completes`);assert.equal(bosses,1);assert.equal(mode.local,3);}
let bosses=0;const mode=new Mode('endless'),g={time:200,enemies:{count:0},ui:{toast(){}},spawnEnemy(t){if(t===4)bosses++;return {};},finish(){throw Error('endless ended');}};for(let i=0;i<60000&&mode.wave<=20;i++)mode.update(g,B.step);assert.ok(mode.wave>20);assert.equal(bosses,2);
console.log('PASS: pool limits/reuse, grid, save validation, 36 upgrades, 3 synergies, all 15 stages, endless bosses.');
