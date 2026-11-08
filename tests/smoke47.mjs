import {writeFile} from 'node:fs/promises';
const tab=await(await fetch('http://127.0.0.1:9229/json/new?about:blank',{method:'PUT'})).json();const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const jobs=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){jobs.get(m.id)(m.result);jobs.delete(m.id);}};const send=(method,params={})=>new Promise(r=>{jobs.set(++id,r);ws.send(JSON.stringify({id,method,params}));});await send('Page.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:true});await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.navigate',{url:'http://127.0.0.1:8766/?qa47='+Date.now()});await new Promise(r=>setTimeout(r,2000));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
console.log(await evaluate(`(async()=>({particle:(await import('./js/particles.js')).Particles.prototype.number.toString(),sprite:(await import('./js/assets.js')).sprite.toString().slice(-250),served:(await (await fetch('./js/particles.js?qa='+Date.now())).text()).includes("value:value>=1e6")}))()`));
await evaluate(`(async()=>{const {game:g}=await import('./js/main.js');const {save,fresh}=await import('./js/save.js');const h=await import('./tests/playthrough47.mjs');cancelAnimationFrame(g.raf);g.suspended=true;save.data=fresh();let seed=902;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;window.qa={g,h,tick:0,results:[]};h.control(g);return true;})()`);
for(let stage=1;stage<=10;stage++){
 await evaluate(`qa.g.start('campaign',${stage});qa.tick=0;true`);
 let peak=-1,status;
 do{
 status=await evaluate(`(()=>{const {g,h}=qa;for(let i=0;i<600&&g.state==='playing';i++)h.step(g,qa.tick++);g.visualTime=g.time;g.shake=0;g.ui.update();g.render(1);return {stage:g.mode.stage,time:g.time,hp:g.p.hp,state:g.state,enemies:g.enemies.count};})()`);
 if([5,10].includes(stage)&&status.enemies>peak&&status.state==='playing'){
 await writeFile('screenshots/v47-stage'+stage+'.png',Buffer.from((await send('Page.captureScreenshot')).data,'base64'));peak=status.enemies;
 }
 }while(status.state==='playing'&&status.time<600);
 console.log(status);if(status.hp<=0||status.state==='playing')throw Error('Playthrough failed');
}
await writeFile('screenshots/v47-browser-report.json',JSON.stringify(await evaluate('({stages:10,state:qa.g.state,hp:qa.g.p.hp})'),null,2));
await send('Page.close');ws.close();
