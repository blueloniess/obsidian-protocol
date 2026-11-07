import {save} from './save.js';
export const audio={ctx:null,last:0,unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{});}catch{}},play(type){
 if(!save.data.settings.sound||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;if(type==='hit'&&t-this.last<.055)return;if(type==='hit')this.last=t;
 const specs={shoot:[180,70,.06,.035],hit:[95,40,.07,.04],upgrade:[420,1000,.38,.12],hurt:[120,30,.25,.15],boss:[65,140,.8,.15]};const [f,end,d,v]=specs[type]||specs.hit;
 const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type==='upgrade'?'sine':'triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(end,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d);o.onended=()=>{o.disconnect();g.disconnect();};
}};
