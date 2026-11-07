import {BALANCE as B,PALETTE as P} from './config.js';
import {Pool,rand} from './utils.js';
import {assets} from './assets.js';
export class Particles{
 constructor(){this.pool=new Pool(B.particles);this.numbers=new Pool(B.numbers);this.quality=1;}
 burst(x,y,color,count=12,speed=140){for(let i=0;i<Math.ceil(count*this.quality);i++){const a=rand(0,Math.PI*2),s=rand(20,speed),life=rand(.18,.6);this.pool.take({x,y,px:x,py:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color,ring:false,size:rand(2,5)});}}
 ring(x,y,color){this.pool.take({x,y,px:x,py:y,vx:0,vy:0,life:.6,max:.6,color,ring:true,size:10});}
 number(x,y,value,crit=false){this.numbers.take({x,y,start:y,life:.7,max:.7,value:String(Math.ceil(value)),crit});}
 update(dt){for(const p of this.pool.items)if(p.active){p.px=p.x;p.py=p.y;p.life-=dt;if(p.life<=0){p.active=false;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;if(p.ring)p.size+=440*dt;}for(const p of this.numbers.items)if(p.active){p.life-=dt;p.y=p.start-48*(1-(p.life/p.max)**2);if(p.life<=0)p.active=false;}}
 draw(c){c.save();c.globalCompositeOperation='lighter';for(const p of this.pool.items)if(p.active){c.globalAlpha=p.life/p.max;if(p.ring){c.strokeStyle=p.color;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,p.size,0,7);c.stroke();}else{c.drawImage(assets.sparks[p.color],p.x,p.y,p.size,p.size);if(this.quality>.5)c.drawImage(assets.glows.gem,p.x-14,p.y-14,28,28);}}c.restore();for(const n of this.numbers.items)if(n.active){c.globalAlpha=Math.min(1,n.life*4);c.fillStyle=n.crit?P.crit:P.text;c.font=`bold ${n.crit?27:19}px monospace`;c.textAlign='center';c.fillText(n.value,n.x,n.y);}c.globalAlpha=1;}
 clear(){this.pool.clear();this.numbers.clear();}
}
