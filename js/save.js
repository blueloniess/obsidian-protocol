import { freshProgress, validateProgress } from './progression.js';
import {BALANCE as B} from './config.js';
const KEY='obsidian-save-v1';
export const fresh=()=>({version:2,campaign:freshProgress(),endless:null,coins:0,stage:1,best:0,top:[],unlocked:false,character:0,shop:{rate:0,magnet:0,damage:0,hp:0,speed:0,luck:0,rerolls:0},settings:{sound:true,manual:false}});
function integer(x,min,max){return Number.isSafeInteger(x)&&x>=min&&x<=max;}
/** 导入严格校验已知字段，不将任意JSON合并进运行对象。 */
export function validate(x){
 if(!x||![1,2].includes(x.version)||!integer(x.coins,0,Number.MAX_SAFE_INTEGER)||!integer(x.stage,1,15)||!integer(x.best,0,1e12)||!Array.isArray(x.top)||x.top.length>10||!x.top.every(n=>integer(n,0,1e12)))throw Error('存档格式或数值不合法');
 const s=fresh();for(const k of Object.keys(s.shop)){if(['magnet','rate'].includes(k)&&x.shop?.[k]===undefined)continue;if(!integer(x.shop?.[k],0,Number.MAX_SAFE_INTEGER))throw Error('商店数据不合法');s.shop[k]=x.shop[k];}
 if(typeof x.unlocked!=='boolean'||!integer(x.character,0,1)||typeof x.settings?.sound!=='boolean'||typeof x.settings?.manual!=='boolean')throw Error('设置不合法');
 return {...s,campaign:validateProgress(x.campaign),endless:validateEndless(x.endless),coins:x.coins,stage:Math.min(B.stages,x.stage),best:x.best,top:[...x.top].sort((a,b)=>b-a),unlocked:x.unlocked,character:x.unlocked?x.character:0,settings:{sound:x.settings.sound,manual:x.settings.manual}};
}
export const save={data:fresh(),warning:'',load(){try{const raw=localStorage.getItem(KEY);if(raw)this.data=validate(JSON.parse(raw));}catch{this.warning='无法读取本地存档，当前使用临时档。请导入备份。';}return this.data;},write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));this.warning='';return true;}catch{this.warning='本地存储不可用，请导出存档保管。';return false;}},export(){return JSON.stringify(this.data,null,2);},import(text){if(text.length>1000000)throw Error('存档文本过长');this.data=validate(JSON.parse(text));this.write();}};

/** 续玩档只包含有限实体与明确状态，不保存DOM或可执行内容。 */
function validateEndless(e){if(e==null)return null;if(!e||!Number.isSafeInteger(e.wave)||e.wave<1||!Number.isFinite(e.hp)||e.hp<0||e.hp>120||!Array.isArray(e.enemies)||e.enemies.length>B.enemies)throw Error('无限进度不合法');for(const enemy of e.enemies){if(!Number.isInteger(enemy.type)||enemy.type<0||enemy.type>4||!['x','y','hp','maxHP'].every(k=>Number.isFinite(enemy[k]))||enemy.hp<0||enemy.maxHP<=0)throw Error('无限敌人数据不合法');}for(const k of ['remaining','budget','elapsed','time','score','breachLoss'])if(!Number.isFinite(e[k])||e[k]<0)throw Error('无限计时数据不合法');for(const [key,limit] of [['loot',4],['turrets',100],['rows',2],['drums',4],['hazards',B.challenge.hazards]])if(e[key]!==undefined&&(!Array.isArray(e[key])||e[key].length>limit))throw Error('无限场景不合法');
for(const row of e.rows||[]){if(!Number.isFinite(row.y)||!Array.isArray(row.gates)||row.gates.length!==1||!row.gates.every(t=>/^-?[0-9]+$/.test(t.value)&&Number.isFinite(t.x)))throw Error('无限门数据不合法');}
return {...e,progress:validateProgress(e.progress)};}
