"""纯 Python 标准库绘制本地图标；PNG 无需任何第三方依赖。"""
import json, re, struct, zlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
palette = dict(re.findall(r"(\w+):'(#[0-9a-fA-F]{6})'", (ROOT/'js/config.js').read_text(encoding='utf-8')))
def rgb(name): return bytes.fromhex(palette[name][1:])
def inside(x,y,points):
    result=False
    for i,(ax,ay) in enumerate(points):
        bx,by=points[i-1]
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax: result=not result
    return result
def png(size):
    rows=[]
    outer=[(.5,.19),(.73,.63),(.65,.76),(.5,.65),(.35,.76),(.27,.63)]
    inner=[(.5,.32),(.59,.56),(.5,.52),(.41,.56)]
    for y in range(size):
        row=bytearray(b'\0')
        for x in range(size):
            u,v=x/size,y/size
            color='bg'
            if x%(size//12)==0 or y%(size//12)==0: color='panel'
            if abs(((u-.5)**2+(v-.5)**2)**.5-.35)<.006: color='grid'
            if inside(u,v,outer): color='player'
            if inside(u,v,inner): color='bg'
            if .48<u<.52 and .69<v<.82: color='gold'
            row.extend(rgb(color))
        rows.append(row)
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
(ROOT/'icons').mkdir(exist_ok=True)
for size in (192,512): (ROOT/f'icons/icon-{size}.png').write_bytes(png(size))
print('Generated local 192px and 512px PNG icons.')
