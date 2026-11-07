export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const rand=(a,b)=>a+Math.random()*(b-a);
export const distance2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
export function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
/** 固定容量对象池：启动时分配；申请只复用空闲实例，释放仅改 active。
 * 不 splice、不每发子弹 new；容量满时明确丢弃特效/弹丸，避免 GC 峰值。 */
export class Pool{
  constructor(capacity,factory=()=>({})){this.items=Array.from({length:capacity},()=>({...factory(),active:false}));this.cursor=0;}
  take(data){for(let i=0;i<this.items.length;i++){const n=(this.cursor+i)%this.items.length,o=this.items[n];if(!o.active){Object.assign(o,data);o.active=true;this.cursor=(n+1)%this.items.length;return o;}}return null;}
  clear(){for(const o of this.items)o.active=false;}
  get count(){let n=0;for(const o of this.items)if(o.active)n++;return n;}
}
/** 预分配均匀网格；弹丸只查询相邻桶，避免400×120全量距离测试。 */
export class Grid{
  constructor(){this.size=96;this.cols=12;this.rows=18;this.cells=Array.from({length:216},()=>[]);}
  rebuild(items){for(const c of this.cells)c.length=0;for(const e of items)if(e.active)this.cells[this.index(e.x,e.y)].push(e);}
  index(x,y){return clamp(Math.floor((y+192)/96),0,17)*12+clamp(Math.floor((x+192)/96),0,11);}
  query(x,y,r,visit){const x0=clamp(Math.floor((x-r+192)/96),0,11),x1=clamp(Math.floor((x+r+192)/96),0,11),y0=clamp(Math.floor((y-r+192)/96),0,17),y1=clamp(Math.floor((y+r+192)/96),0,17);for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)for(const e of this.cells[j*12+i])if(e.active)visit(e);}
}
