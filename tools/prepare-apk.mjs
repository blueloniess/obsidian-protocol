import {mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'www');
async function copy(from,to){await mkdir(to,{recursive:true});for(const e of await readdir(from,{withFileTypes:true})){if(e.isDirectory())await copy(path.join(from,e.name),path.join(to,e.name));else await copyFile(path.join(from,e.name),path.join(to,e.name));}}
await mkdir(out,{recursive:true});
for(const dir of ['css','js','icons'])await copy(path.join(root,dir),path.join(out,dir));
for(const file of ['index.html','manifest.json','sw.js'])await copyFile(path.join(root,file),path.join(out,file));
await writeFile(path.join(root,'capacitor.config.json'),JSON.stringify({appId:'com.obsidian.protocol',appName:'黑曜防线',webDir:'www',backgroundColor:'#080916',android:{backgroundColor:'#080916',allowMixedContent:false}},null,2));
console.log('Prepared www and capacitor.config.json. No bundler required.');
