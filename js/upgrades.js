import {BALANCE as B,PALETTE as P} from './config.js';
export const RARITIES=[{name:'标准',color:P.text,width:1},{name:'稀有',color:P.blue,width:2},{name:'史诗',color:P.purple,width:3},{name:'传说',color:P.gold,width:4}];
const add=(key,n=1)=>p=>p[key]=(p[key]||0)+n;
/** 所有词条通过道路补给盒命中解锁，再接触领取。没有追踪、自动索敌、自动炮台。 */
export const UPGRADES=[
 {id:'damage',name:'高压弹药',desc:'直击伤害 +18%',rarity:0,max:10,apply:p=>p.damage*=B.damageUpgrade},
 {id:'rate',name:'快速枪机',desc:'射击间隔 −10%',rarity:0,max:8,apply:p=>p.rate*=B.rateUpgrade},
 {id:'range',name:'宽径弹头',desc:'弹丸命中半径 +2，提升对线容错',rarity:0,max:5,apply:add('bulletRadius',B.arsenal.rangeStep)},
 {id:'magnet',name:'拾取背包',desc:'走近拾取经验的范围 +18',rarity:0,max:6,apply:add('magnet',B.magnetUpgrade)},
 {id:'pierce',name:'贯穿弹芯',desc:'穿透 +1；适合纵向成排敌人',rarity:1,max:5,apply:add('pierce')},
 {id:'multi',name:'侧翼枪口',desc:'增加一条散射弹道，近距离覆盖更宽',rarity:1,max:3,apply:add('shots')},
 {id:'breaker',name:'破盾弹药',desc:'护盾伤害 +35%；不会穿盾伤本体',rarity:1,max:4,apply:add('shieldBonus',.35)},
 {id:'slow',name:'阻滞弹',desc:'直击减速25%，延长清线窗口',rarity:1,max:1,apply:add('slow')},
 {id:'blast',name:'破片弹',desc:'直击产生小范围爆炸，群怪时更有效',rarity:2,max:3,apply:add('explosive')},
 {id:'focus',name:'稳姿射击',desc:'站稳0.7秒后伤害 +40%；移动立即取消',rarity:1,max:1,apply:add('focus')},
 {id:'close',name:'近距离压制',desc:'敌人进入前方260内，直击 +55%',rarity:1,max:1,apply:add('close')},
 {id:'execute',name:'破甲追击',desc:'护盾破裂后的2秒内，直击 +60%',rarity:2,max:1,apply:add('execute')},
 {id:'turret',name:'固定炮台',desc:'获得1次部署：在当前位置固定向前开火10秒，不索敌',rarity:2,max:Infinity,active:true,apply:p=>p.turretCharges=Math.min(B.arsenal.maxCharges,p.turretCharges+1)},
 {id:'grenade',name:'破片手雷',desc:'获得1枚：点击按钮，轰炸当前射线前方；可破盾',rarity:1,max:Infinity,active:true,apply:p=>p.grenadeCharges=Math.min(B.arsenal.maxCharges,p.grenadeCharges+1)},
 {id:'laser',name:'一次性激光炮',desc:'获得1发：点击按钮，贯穿当前射线整列敌人',rarity:3,max:Infinity,active:true,apply:p=>p.laserCharges=Math.min(B.arsenal.maxCharges,p.laserCharges+1)}
].map(u=>({...u,group:u.active?'战术装备':'枪械改装'}));
export const rankOf=(p,id)=>(p.upgradeHistory||[]).filter(v=>v===id).length;
export const specialization=()=>null;
export function canChoose(p,u){return rankOf(p,u.id)<u.max&&(!u.active||p[u.id+'Charges']<B.arsenal.maxCharges);}
export function choices(p){const pool=UPGRADES.filter(u=>canChoose(p,u));const out=[];while(pool.length&&out.length<3){let total=pool.reduce((n,u)=>n+B.rarityWeights[u.rarity],0),r=Math.random()*total,index=pool.length-1;for(let i=0;i<pool.length;i++){r-=B.rarityWeights[pool[i].rarity];if(r<=0){index=i;break;}}out.push(pool.splice(index,1)[0]);}return out;}
export const skillStatus=(p,u)=>`${u.group} · ${rankOf(p,u.id)} / ${Number.isFinite(u.max)?u.max:'消耗品'}`;
export const SYNERGIES=[];
