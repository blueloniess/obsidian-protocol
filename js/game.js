import {stageBrief} from './challenge.js';
import { restoreProgress, captureProgress } from './progression.js';
import {BALANCE as B,PALETTE as P} from './config.js';
import {clamp,rand} from './utils.js';
import {assets,sprite} from './assets.js';
import {Particles} from './particles.js';
import {player,initEntities,spawnEnemy,updateEntities,drawEntities} from './entities.js';
import {choices,SYNERGIES,canChoose,specialization} from './upgrades.js';
import {Mode} from './modes.js';
import {UI} from './ui.js';
import {audio} from './audio.js';
import {save} from './save.js';
import { Runway, visibleTroopers } from './runway.js';

/** 横移采用相对拖动，手指可以从屏幕任意位置开始，不会在按下瞬间传送小队。 */
export class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.reset();
    const canvas = game.canvas;
    canvas.addEventListener('pointerdown', event => {
      if (game.state !== 'playing' || this.pointer !== null) return;
      audio.unlock();
      canvas.setPointerCapture(event.pointerId);
      this.pointer = event.pointerId;
      this.anchor = this.logicalX(event);
      this.origin = this.target = game.p.x;
    });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId === this.pointer)
        this.target = this.origin + this.logicalX(event) - this.anchor;
    });
    const release = event => {
      if (event.pointerId !== this.pointer) return;
      if (event.type === 'pointerup') {
        this.target = this.origin + this.logicalX(event) - this.anchor;
        this.pointer = null;
      } else this.reset();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      canvas.addEventListener(type, release);
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLTextAreaElement) return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
        this.keys.add(event.code);
        if (game.state === 'playing') event.preventDefault();
      }
      if (event.code === 'Escape' && !event.repeat) {
        if (game.state === 'playing') game.pause();
        else if (game.state === 'paused') game.resume();
      }
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());
  }

  logicalX(event) {
    const bounds = this.game.canvas.getBoundingClientRect();
    return 360+((event.clientX - bounds.left) * B.width / bounds.width-360)/(.68+.32*B.track.playerY/B.height);
  }

  reset() {
    this.pointer = null;
    this.target = null;
    this.keys.clear();
  }

  move(player, dt) {
    const step = player.speed * B.track.strafeFactor * dt;
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const delta = this.target === null ? (Number(right) - Number(left)) * step
                                      : clamp(this.target - player.x, -step, step);
    const edge = 47 + (Math.min(visibleTroopers(player.squad), B.track.columns) - 1) * B.track.spacing / 2;
    player.x = clamp(player.x + delta, edge, B.width - edge);
    if (this.pointer === null && this.target !== null &&
        Math.abs(player.x - clamp(this.target, edge, B.width - edge)) < 0.1) this.target = null;
  }
}
export class Game{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.scene=document.createElement('canvas');this.scene.width=720;this.scene.height=1280;this.sceneCtx=this.scene.getContext('2d',{alpha:false});this.state='menu';this.time=0;this.fps=60;this.freeze=0;this.shake=0;this.fx=new Particles();initEntities(this);this.input=new Input(this);this.ui=new UI(this);this.acc=0;this.last=0;this.hudClock=0;this.qualityClock=0;this.visualTime=0;this.backgroundPause=false;this.resize();window.addEventListener('resize',()=>this.resize());window.visualViewport?.addEventListener('resize',()=>this.resize());this.nativeHidden=false;this.suspended=document.hidden;
 document.addEventListener('visibilitychange',()=>this.syncVisibility());this.ui.menu();this.frame(performance.now());}
 setNativeHidden(hidden) {
   this.nativeHidden = Boolean(hidden);
   this.syncVisibility();
 }

 syncVisibility() {
   const hidden = document.hidden || this.nativeHidden;
   if (hidden === this.suspended) return;
   this.suspended = hidden;
   this.acc = 0;
   this.last = 0;
   if (hidden) {
     this.backgroundPause = this.state === 'playing';
     if (this.backgroundPause) this.state = 'background';
     this.input.reset();
     cancelAnimationFrame(this.raf);
     this.raf = 0;
     audio.ctx?.suspend().catch(() => {});
   } else {
     if (this.backgroundPause && this.state === 'background') this.state = 'playing';
     this.backgroundPause = false;
     audio.ctx?.resume().catch(() => {});
     this.frame(performance.now());
   }
 }
 detailScale(){return this.fx.quality<.45?.7:this.fx.quality<.65?.85:1;}
 resize(){const host=document.querySelector('#viewport').getBoundingClientRect(),scale=Math.min(host.width/B.width,host.height/B.height);document.documentElement.style.setProperty('--touch-min',Math.ceil(48/Math.max(.25,scale))+'px');document.querySelector('#stage').style.transform=`scale(${scale})`;this.pixelRatio=Math.min(B.dpr,window.devicePixelRatio||1);this.renderDetail=this.detailScale();const res=Math.min(1,scale)*this.pixelRatio*this.renderDetail;this.canvas.width=Math.round(B.width*res);this.canvas.height=Math.round(B.height*res);this.ctx.setTransform(this.canvas.width/B.width,0,0,this.canvas.height/B.height,0,0);}
 start(kind,stage=1){this.mode=new Mode(kind,stage);this.p=player();this.p.upgradeHistory=[];this.p.pendingUpgrades=0;this.claiming=false;this.offers=null;if(kind==='campaign')restoreProgress(this.p,save.data.campaign);this.runway=new Runway(this.p.squad);this.runway.rows=[];this.runway.serial=0;this.runway.addRow(475,this.p.squad,this.p);this.loot=[];this.lootClock=3;this.turrets=[];this.time=0;this.edgeWarning=0;this.leaks=0;this.score=0;this.coins=0;this.kills=0;this.freeze=0;this.shake=0;this.acc=0;for(const pool of [this.enemies,this.bullets,this.gems,this.corpses,this.hazards])pool.clear();this.fx.clear();this.effects.length=0;this.nextEliteStrike=0;this.state='playing';this.input.reset();this.ui.show('');this.ui.setupHUD();this.mode.next(this);this.runway.openingConvoy(this);this.ui.update();this.ui.toast(stageBrief(stage));audio.unlock();}
 spawnEnemy(type){const e=spawnEnemy(this,type);if(e&&type===4){audio.play('boss');this.ui.toast('重甲首领入场');}return e;}
 pause(){if(this.state!=='playing')return;this.claiming=false;this.state='paused';this.acc=0;this.input.reset();this.ui.paused();}
 resume(){if(this.state!=='paused')return;this.state='playing';this.acc=0;this.last=performance.now();this.ui.show('');}
 /** 等级只积攒领取次数；不改变模拟状态，不弹窗、不重置触摸。 */
 levelUp(){const p=this.p;while(p.xp>=p.nextXP&&Number.isFinite(p.nextXP)){p.xp-=p.nextXP;p.nextXP=Math.ceil(p.nextXP*B.xpGrowth);p.level++;this.lootClock=Math.min(this.lootClock||0,1);}this.persistGrowth();}
 persistGrowth(){if(this.mode.kind==='campaign'){save.data.campaign=captureProgress(this.p,save.data.campaign);save.write();}}
 openUpgrades(){if(this.state!=='playing'||!this.p.pendingUpgrades)return;this.claiming=true;this.offers=this.offers?.length?this.offers:choices(this.p);this.ui.upgrade(this.offers);}
 closeUpgrades(){this.claiming=false;this.ui.overlay.innerHTML='';}
 reroll(){if(this.claiming&&this.state==='playing'&&this.p.rerolls>0&&!this.offers.every(u=>u.group==='专精')){this.p.rerolls--;this.offers=choices(this.p);this.persistGrowth();this.ui.upgrade(this.offers);}}
 applyUpgrade(u){if(!this.p.pendingUpgrades||!canChoose(this.p,u))return false;u.apply(this.p);this.p.hp=Math.min(this.p.hp,this.p.maxHP-(this.p.breachLoss||0));this.p.upgradeHistory.push(u.id);this.p.pendingUpgrades--;this.offers=null;for(const s of SYNERGIES)if(!this.p.synergies.has(s.id)&&s.test(this.p)){this.p.synergies.add(s.id);this.ui.toast(`${s.name} · ${s.desc}`);}return true;}
 choose(u){if(this.state!=='playing'||!this.claiming||!this.offers.includes(u))return;if(!this.applyUpgrade(u))return;this.persistGrowth();if(this.p.pendingUpgrades)this.openUpgrades();else this.closeUpgrades();audio.play('upgrade');}
 /** 批领只从每次真实三选一卡中选取：优先专精进阶，其次低等级；专精由玩家亲选。 */
 claimAll(){if(this.state!=='playing'||!this.claiming)return;let count=0;const names=new Map();while(this.p.pendingUpgrades){const offered=this.offers;if(!offered.length||offered.every(u=>u.group==='专精'))break;const ranked=[...offered].sort((a,b)=>(b.group!=='基础')-(a.group!=='基础')||this.p.upgradeHistory.filter(id=>id===a.id).length-this.p.upgradeHistory.filter(id=>id===b.id).length);const u=ranked[0];if(!this.applyUpgrade(u))break;count++;names.set(u.name,(names.get(u.name)||0)+1);this.offers=choices(this.p);}this.persistGrowth();if(this.p.pendingUpgrades)this.ui.upgrade(this.offers);else this.closeUpgrades();this.ui.toast(count?`已领取 ${count} 项：${[...names].map(([n,k])=>n+'×'+k).join('、')}`:'请先亲自选择专精');}
 finish(win){if(this.state==='ended')return;this.state='ended';this.input.reset();if(win){this.coins+=B.stageCoins*this.mode.stage;}this.claiming=false;this.levelUp();const d=save.data;if(this.mode.kind==='campaign')d.campaign=captureProgress(this.p,d.campaign,win,this.mode.stage);d.coins=Math.min(Number.MAX_SAFE_INTEGER,d.coins+this.coins);if(win&&this.mode.kind==='campaign')d.stage=Math.max(d.stage,Math.min(15,this.mode.stage+1));if(this.mode.kind==='endless'){d.best=Math.max(d.best,this.score);d.top.push(this.score);d.top.sort((a,b)=>b-a);d.top=d.top.slice(0,10);}save.write();this.ui.result(win);if(save.warning)this.ui.toast(save.warning);}
 /** 固定60Hz模拟，累加器最多补6步，避免长帧死亡螺旋；渲染插值上个/当前坐标。 */
 frame(now){if(document.hidden||this.suspended)return;const raw=this.last?(now-this.last)/1000:1/60,dt=clamp(raw,0,.1);this.last=now;this.visualTime+=dt;this.fps=this.fps*.95+(1/Math.max(.001,raw))*.05;
  this.qualityClock+=dt;if(this.qualityClock>2){this.qualityClock=0;if(this.fps<B.qualityLowFPS)this.fx.quality=Math.max(B.qualityMin,this.fx.quality-.15);else if(this.fps>B.qualityHighFPS)this.fx.quality=Math.min(1,this.fx.quality+.05);if(this.detailScale()!==this.renderDetail)this.resize();}
  if(this.state==='playing'){if(this.freeze>0)this.freeze=Math.max(0,this.freeze-dt);else{this.acc+=dt;let steps=0;while(this.acc>=B.step&&steps<B.maxSteps&&this.state==='playing'){this.time+=B.step;this.edgeWarning=Math.max(0,(this.edgeWarning||0)-B.step);this.mode.update(this,B.step);if(this.state==='playing')updateEntities(this,B.step);this.fx.update(B.step);this.shake*=Math.exp(-B.shakeDecay*B.step);this.acc-=B.step;steps++;if(this.freeze>0)break;}if(steps===B.maxSteps)this.acc=0;}}else this.acc=0;
  this.render(this.state==='playing'?clamp(this.acc/B.step,0,1):1);this.hudClock+=dt;if(this.hudClock>.1){this.hudClock=0;this.ui.update();}this.raf=requestAnimationFrame(t=>this.frame(t));}
 render(alpha){const c=this.ctx;c.drawImage(assets.background,0,0);c.save();c.globalAlpha=.25;c.strokeStyle=P.grid;c.lineWidth=1;const offset=(this.visualTime*12)%80;for(let x=0;x<720;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,1280);c.stroke();}for(let y=offset;y<1280;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(720,y);c.stroke();}c.globalAlpha=.08;c.fillStyle=P.ui;const scan=(this.visualTime*45)%1400;c.fillRect(0,scan,720,2);c.restore();
  if(this.p&&this.state!=='menu'){const world=this.sceneCtx;world.fillStyle=P.road;world.fillRect(0,0,720,1280);this.runway.drawRoad(world,this.time);world.save();if(this.shake>.1)world.translate(rand(-this.shake,this.shake),rand(-this.shake,this.shake));drawEntities(this,world,alpha);this.runway.draw(world,alpha,this.p);this.fx.draw(world);world.restore();
   // 64条水平带近似透视，所有对象一起投影，视觉与命中位置一致；无运行时滤镜。
   const bands=this.fx.quality<.5?40:64,h=1280/bands;for(let i=0;i<bands;i++){const y=i*h,scale=.68+.32*(y+h/2)/1280,w=720*scale;c.drawImage(this.scene,0,y,720,h,(720-w)/2,y,w,h+.5);}
  }else{sprite(c,'player',360,1040,-Math.PI/2,2,0);}
  c.globalAlpha=.25;c.drawImage(assets.vignette,0,0);c.globalAlpha=1;if(this.edgeWarning>0){c.globalAlpha=Math.min(.9,this.edgeWarning/B.breachWarning);c.drawImage(assets.warning,0,0);c.globalAlpha=1;}}
}
