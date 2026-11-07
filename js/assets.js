import {PALETTE as P} from './config.js';
import {canvas} from './utils.js';
export const assets={sprites:{},glows:{},white:{},sparks:{}};
const colors={player:P.player,trooper:P.player,normal:P.normal,fast:P.fast,tank:P.tank,bomber:P.bomber,boss:P.boss,bullet:P.bullet,gem:P.player,particle:P.white,hostile:P.boss,drone:P.blue};
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();}
function shape(c,key){
  c.lineWidth=2;c.fillStyle=P.panel;c.strokeStyle=colors[key];
  if(key==='player'){polygon(c,[[-22,20],[-13,-12],[0,-32],[13,-12],[22,20],[8,13],[0,22],[-8,13]]);c.fillStyle=P.player;polygon(c,[[-5,-13],[0,-22],[5,-13],[0,5]]);c.fillRect(14,-28,6,28);c.fillRect(-17,16,8,8);}
  else if(key==='trooper'){
    // 从上方看去的头盔、肩甲、枪管和双靴。每名队员都有自己的枪口。
    c.fillStyle=P.bg; c.fillRect(-11,7,7,12); c.fillRect(4,7,7,12);
    polygon(c,[[-15,-6],[-9,-13],[9,-13],[15,-6],[10,11],[-10,11]]);
    c.fillStyle=P.uniform; c.fillRect(-16,-8,7,9); c.fillRect(9,-8,7,9);
    c.fillStyle=P.helmet; polygon(c,[[-8,-14],[-5,-19],[6,-19],[10,-12],[7,-3],[-6,-3]]);
    c.fillStyle=P.bg; c.fillRect(-6,-14,12,4);c.fillStyle=P.blue;c.fillRect(-8,0,16,11);c.fillStyle=P.gold;c.fillRect(-7,-19,14,3);c.fillStyle=P.uniform;c.fillRect(-8,0,16,10);c.fillStyle=P.blue;c.fillRect(-8,0,5,8);c.fillStyle=P.gold;c.fillRect(-6,-19,12,3);
    c.fillStyle=P.roadLine; c.fillRect(12,-29,4,25); c.fillRect(10,-26,8,5);
  }
  else if(key==='bullet'||key==='hostile'){c.fillStyle=colors[key];c.fillRect(-3,-15,6,30);}
  else if(key==='gem'){c.fillStyle=P.player;polygon(c,[[0,-9],[7,0],[0,10],[-7,0]]);}
  else if(key==='particle'){c.fillStyle=P.white;c.fillRect(-3,-3,6,6);}
  else if(key==='drone'){polygon(c,[[0,-15],[15,0],[0,10],[-15,0]]);c.fillStyle=P.blue;c.fillRect(-22,-5,10,5);c.fillRect(12,-5,10,5);}
  else if(key==='boss'){
    // 正面重装感染体：双肩装甲、抓钩、裂开的面罩与胸腔暴露核心。
    polygon(c,[[-12,12],[-2,13],[-4,30],[-16,31]]);
    polygon(c,[[3,14],[14,12],[18,30],[7,31]]);
    polygon(c,[[-19,-17],[-8,-21],[9,-21],[21,-16],[17,10],[8,19],[-9,18],[-18,9]]);
    polygon(c,[[-17,-18],[-29,-14],[-32,-2],[-21,3],[-11,-8]]);
    polygon(c,[[17,-18],[29,-14],[32,-2],[21,3],[11,-8]]);
    polygon(c,[[-28,-1],[-20,3],[-23,13],[-28,20],[-26,10],[-33,16]]);
    polygon(c,[[26,0],[19,3],[24,15],[32,20],[29,10],[35,14]]);
    c.fillStyle=P.grid;
    polygon(c,[[-12,-27],[-5,-32],[8,-31],[14,-24],[10,-11],[0,-8],[-10,-13]]);
    c.fillStyle=P.boss;c.fillRect(-8,-21,7,3);c.fillRect(3,-21,7,3);
    c.strokeStyle=P.bomber;c.lineWidth=1.8;
    polygon(c,[[-6,-2],[1,-7],[7,-1],[2,8],[-3,6]]);
    for(const x of [-24,21]){c.beginPath();c.moveTo(x,-11);c.lineTo(x+4,-7);c.stroke();}
  }
  else{
    const tank=key==='tank',boss=key==='boss',fast=key==='fast',w=tank?27:fast?10:18;c.fillStyle=colors[key];c.strokeStyle=P.panel;
    polygon(c,[[-w,-13],[-w-7,9],[-w+1,16],[-w+4,5],[-8,13],[-12,29],[-3,30],[2,15],[10,28],[18,25],[10,7],[w,13],[w+8,4],[w,-14],[9,-20],[-8,-19]]);
    c.fillStyle=P.skin;polygon(c,[[-9,-25],[6,-28],[12,-17],[7,-8],[-8,-10]]);c.fillStyle=P.bg;c.fillRect(-6,-20,4,4);c.fillRect(3,-20,4,4);
    if(key==='bomber'){c.strokeStyle=P.bomber;c.beginPath();c.arc(0,0,11,0,7);c.stroke();c.fillStyle=P.bomber;c.fillRect(-3,-6,6,12);}
    if(boss){c.strokeStyle=P.gold;polygon(c,[[-19,-21],[-22,-35],[-7,-29],[0,-39],[9,-29],[22,-35],[19,-21]]);}
    c.fillStyle=P.grid;c.fillRect(-7,7,7,12);c.fillRect(5,7,7,12);c.fillStyle=P.skin;c.fillRect(-w-3,1,6,10);c.fillRect(w,0,6,10);c.fillStyle=P.white;c.globalAlpha=.18;c.fillRect(-8,-23,12,4);c.globalAlpha=1;if(tank){c.fillStyle=P.panel;c.fillRect(-22,-6,44,18);c.strokeStyle=P.tank;c.strokeRect(-22,-6,44,18);c.fillStyle=P.gold;c.fillRect(-14,-2,28,4);}
  }
}
/** 仅启动时生成高斯模糊光晕。优先 Canvas filter blur（高斯核），
 * 旧WebView fallback通过一次shadowBlur烘焙；运行时只drawImage + lighter。 */
export function initAssets(){
  for(const key of Object.keys(colors)){
    const factor=key==='boss'?4:1,size=128*factor,base=canvas(size,size),c=base.getContext('2d');c.scale(factor,factor);c.translate(64,64);shape(c,key);assets.sprites[key]=base;
    const white=canvas(size,size),w=white.getContext('2d');w.drawImage(base,0,0);w.globalCompositeOperation='source-in';w.fillStyle=P.white;w.fillRect(0,0,size,size);assets.white[key]=white;
    const glow=canvas(size,size),g=glow.getContext('2d');if('filter'in g){g.filter=`blur(${9*factor}px)`;g.drawImage(base,0,0);g.filter='none';}else{g.shadowColor=colors[key];g.shadowBlur=18*factor;g.drawImage(base,0,0);}assets.glows[key]=glow;
  }
  for(const color of Object.values(P)){const s=canvas(12,12),sc=s.getContext('2d');sc.fillStyle=color;sc.fillRect(2,2,8,8);assets.sparks[color]=s;}
  const bg=canvas(720,1280),c=bg.getContext('2d'),grad=c.createLinearGradient(0,0,720,1280);grad.addColorStop(0,P.panel);grad.addColorStop(.5,P.bg);grad.addColorStop(1,P.panel);c.fillStyle=grad;c.fillRect(0,0,720,1280);
  for(let i=0;i<13000;i++){c.globalAlpha=Math.random()*.055;c.fillStyle=P.white;c.fillRect(Math.random()*720,Math.random()*1280,1,1);}c.globalAlpha=1;
  // 废弃道路、板块与电路全部烘焙。
  c.strokeStyle=P.grid;c.lineWidth=2;for(let y=30;y<1280;y+=180){c.strokeRect(30,y,110,130);c.strokeRect(580,y+50,110,130);c.fillStyle=P.grid;c.fillRect(353,y,14,55);}assets.background=bg;
  const v=canvas(720,1280),vc=v.getContext('2d'),vg=vc.createRadialGradient(360,640,180,360,640,750);vg.addColorStop(0,'transparent');vg.addColorStop(1,P.black);vc.fillStyle=vg;vc.fillRect(0,0,720,1280);assets.vignette=v;
  const warning=canvas(720,1280),wc=warning.getContext('2d');for(const flip of [false,true]){wc.save();if(flip){wc.translate(720,0);wc.scale(-1,1);}const edge=wc.createLinearGradient(0,0,160,0);edge.addColorStop(0,P.hp);edge.addColorStop(1,'transparent');wc.fillStyle=edge;wc.fillRect(0,0,160,1280);wc.restore();}assets.warning=warning;
  const panel=canvas(64,64),pc=panel.getContext('2d');pc.fillStyle=P.panel;pc.fillRect(0,0,64,64);pc.globalAlpha=.12;pc.drawImage(bg,0,0,64,64);assets.panel=panel;
}
export function sprite(c,key,x,y,angle=0,scale=1,flash=0,glow=true){c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);if(!['bullet','gem','particle','hostile'].includes(key)){c.fillStyle=P.black;c.globalAlpha*=.25;c.beginPath();c.ellipse(4,15,22*scale,10*scale,0,0,7);c.fill();c.globalAlpha/=.25;}if(glow){c.globalCompositeOperation='lighter';c.globalAlpha*=.2;c.drawImage(assets.glows[key],-64*scale,-64*scale,128*scale,128*scale);c.globalAlpha/=.2;c.globalCompositeOperation='source-over';}c.drawImage(assets.sprites[key],-64*scale,-64*scale,128*scale,128*scale);if(flash>0){c.globalCompositeOperation='lighter';c.globalAlpha*=Math.min(1,flash*9);c.drawImage(assets.white[key],-64*scale,-64*scale,128*scale,128*scale);}c.restore();}
