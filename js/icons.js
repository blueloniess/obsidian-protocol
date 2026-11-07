import {PALETTE as P} from './config.js';
export const icons={};
/** 所有徽章在启动时一次烘焙，战斗中仅drawImage，无滤镜。 */
export function initIcons(){for(const id of ['damage','rate','range','magnet','pierce','multi','breaker','slow','blast','focus','close','execute','recruit','turret','grenade','laser','hp','speed','luck','rerolls','weapon']){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');const color=['laser','luck','recruit','execute'].includes(id)?P.gold:['grenade','blast','damage'].includes(id)?P.bomber:P.player;
 const grad=c.createLinearGradient(0,0,128,128);grad.addColorStop(0,P.grid);grad.addColorStop(1,P.bg);c.fillStyle=grad;c.beginPath();c.roundRect(5,5,118,118,22);c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();c.globalAlpha=.15;c.fillStyle=color;c.beginPath();c.arc(64,64,45,0,7);c.fill();c.globalAlpha=1;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=7;c.lineCap='round';c.lineJoin='round';
 const line=points=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 if(['weapon','damage','close','focus'].includes(id)){c.fillRect(25,43,72,18);c.fillRect(43,59,17,30);c.fillStyle=P.secondary;c.fillRect(31,38,54,6);line([[80,70],[98,70]]);if(id==='focus'){c.strokeRect(17,25,92,75);}}
 else if(['rate','speed'].includes(id)){line([[31,32],[61,64],[31,96]]);line([[64,32],[94,64],[64,96]]);}
 else if(['grenade','blast'].includes(id)){c.beginPath();c.ellipse(64,73,26,32,0,0,7);c.fill();c.fillStyle=P.panel;c.fillRect(40,62,48,6);c.fillRect(40,78,48,6);c.fillStyle=P.secondary;c.fillRect(53,30,23,16);line([[68,26],[92,32],[98,50]]);}
 else if(['hp','breaker'].includes(id)){c.beginPath();c.moveTo(64,22);c.lineTo(97,36);c.lineTo(89,81);c.lineTo(64,106);c.lineTo(39,81);c.lineTo(31,36);c.closePath();c.stroke();line(id==='hp'?[[48,64],[80,64]]:[[70,38],[53,62],[76,64],[57,90]]);if(id==='hp')line([[64,48],[64,80]]);}
 else if(id==='magnet'){c.beginPath();c.arc(64,69,29,0,Math.PI);c.stroke();line([[35,69],[35,31]]);line([[93,69],[93,31]]);c.fillStyle=P.white;c.fillRect(29,28,12,12);c.fillRect(87,28,12,12);}
 else if(id==='turret'){c.fillRect(37,61,54,24);c.fillRect(57,25,14,44);line([[45,86],[31,104]]);line([[83,86],[97,104]]);}
 else if(id==='recruit'){c.beginPath();c.arc(57,43,16,0,7);c.fill();c.beginPath();c.arc(57,93,27,Math.PI,0);c.fill();line([[93,50],[93,78]]);line([[79,64],[107,64]]);}
 else if(id==='luck'){for(const [x,y] of [[50,45],[78,45],[50,73],[78,73]]){c.beginPath();c.arc(x,y,17,0,7);c.fill();}line([[65,76],[59,104]]);}
 else if(id==='laser'){line([[29,99],[84,44]]);c.lineWidth=14;line([[42,88],[93,37]]);c.strokeStyle=P.white;c.lineWidth=3;line([[32,100],[100,32]]);line([[90,18],[90,28]]);line([[103,36],[113,36]]);}
 else if(id==='slow'){for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[64,64],[64+36*Math.cos(a),64+36*Math.sin(a)]]);}}
 else{const n=id==='multi'?3:1;for(let i=0;i<n;i++){const x=64+(i-(n-1)/2)*24;c.beginPath();c.moveTo(x-8,89);c.lineTo(x-8,49);c.lineTo(x,29);c.lineTo(x+8,49);c.lineTo(x+8,89);c.closePath();c.fill();}if(id==='range'){c.strokeRect(24,21,80,83);}if(id==='pierce'||id==='execute')line([[27,66],[101,66]]);}
 c.fillStyle=P.white;c.globalAlpha=.45;c.fillRect(20,15,25,2);c.globalAlpha=1;icons[id]={canvas,url:canvas.toDataURL()};}}
export const iconHTML=id=>icons[id]?`<img class="item-icon" src="${icons[id].url}" alt="">`:'';
