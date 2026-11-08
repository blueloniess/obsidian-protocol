"""Emit a double-click, offline HTML demo with the same production ES modules."""
from pathlib import Path
import json,re,base64
root=Path(__file__).resolve().parents[1]
modules={}
for p in (root/'js').glob('*.js'):
 code=p.read_text(encoding='utf-8')
 code=re.sub(r"from\s*(['\"])\./([^'\"]+)\.js\1",lambda m:"from 'obsidian/"+m[2]+"'",code)
 if p.stem=='main':
  start=code.index("if(location.hostname===")
  code=code[:start]+"status.textContent='离线试玩 · 鼠标拖动 / A D / 左右方向键';\n"
 modules['obsidian/'+p.stem]=code
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="manifest" href="./manifest.json">','').replace('<link rel="stylesheet" href="./css/style.css">','<style>'+(root/'css/style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('./icons/icon-192.png','data:image/png;base64,'+base64.b64encode((root/'icons/icon-192.png').read_bytes()).decode())
data=json.dumps(modules,ensure_ascii=False).replace('</','<\\/')
boot='<script>const modules='+data+';const imports={};for(const [name,code]of Object.entries(modules))imports[name]=URL.createObjectURL(new Blob([code],{type:"text/javascript"}));const map=document.createElement("script");map.type="importmap";map.textContent=JSON.stringify({imports});document.head.appendChild(map);import("obsidian/main");</script>'
html=html.replace('<script type="module" src="./js/main.js"></script>',boot)
out=root/'dist'/'Obsidian-Protocol-3.8.0-Web.html';out.write_text(html,encoding='utf-8');print(out)
