import { freshProgress, validateProgress } from './progression.js';
import {BALANCE as B} from './config.js';
const KEY='obsidian-save-v1';
export const fresh=()=>({version:2,campaign:freshProgress(),coins:0,stage:1,best:0,top:[],unlocked:false,character:0,shop:{rate:0,magnet:0,damage:0,hp:0,speed:0,luck:0,rerolls:0},settings:{sound:true,manual:false}});
function integer(x,min,max){return Number.isSafeInteger(x)&&x>=min&&x<=max;}
/** 导入严格校验已知字段，不将任意JSON合并进运行对象。 */
export function validate(x){
 if(!x||![1,2].includes(x.version)||!integer(x.coins,0,Number.MAX_SAFE_INTEGER)||!integer(x.stage,1,15)||!integer(x.best,0,1e12)||!Array.isArray(x.top)||x.top.length>10||!x.top.every(n=>integer(n,0,1e12)))throw Error('存档格式或数值不合法');
 const s=fresh();for(const k of Object.keys(s.shop)){if(['magnet','rate'].includes(k)&&x.shop?.[k]===undefined)continue;if(!integer(x.shop?.[k],0,Number.MAX_SAFE_INTEGER))throw Error('商店数据不合法');s.shop[k]=x.shop[k];}
 if(typeof x.unlocked!=='boolean'||!integer(x.character,0,1)||typeof x.settings?.sound!=='boolean'||typeof x.settings?.manual!=='boolean')throw Error('设置不合法');
 return {...s,campaign:validateProgress(x.campaign),coins:x.coins,stage:x.stage,best:x.best,top:[...x.top].sort((a,b)=>b-a),unlocked:x.unlocked,character:x.unlocked?x.character:0,settings:{sound:x.settings.sound,manual:x.settings.manual}};
}
export const save={data:fresh(),warning:'',load(){try{const raw=localStorage.getItem(KEY);if(raw)this.data=validate(JSON.parse(raw));}catch{this.warning='无法读取本地存档，当前使用临时档。请导入备份。';}return this.data;},write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));this.warning='';return true;}catch{this.warning='本地存储不可用，请导出存档保管。';return false;}},export(){return JSON.stringify(this.data,null,2);},import(text){if(text.length>30000)throw Error('存档文本过长');this.data=validate(JSON.parse(text));this.write();}};
