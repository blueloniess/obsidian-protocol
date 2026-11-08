import {updateEntities} from '../js/entities.js';
import {useItem} from '../js/loot.js';
export function control(g){g.input.move=(p,dt)=>{const threats=g.enemies.items.filter(e=>e.active).sort((a,b)=>b.y-a.y),urgent=threats.find(e=>e.type!==4&&e.y>650),gate=g.runway.rows[0]?.gates[0],loot=g.loot.find(o=>o.y>350),zones=g.hazards.items.filter(h=>h.active);let x=urgent?.x??(loot?.x??(gate?.x??threats[0]?.x??360));if(zones.some(h=>Math.abs(h.x-x)<h.width+50)){x=[160,360,560].find(v=>zones.every(h=>Math.abs(h.x-v)>h.width+60))??360;}p.x=x;};}
export function step(g,tick){g.time+=1/60;g.mode.update(g,1/60);if(g.state==='playing')updateEntities(g,1/60);g.fx.update(1/60);g.shake*=Math.exp(-8/60);if(tick%60===0&&g.enemies.count>=3)for(const id of ['grenade','turret','laser'])useItem(g,id);}
