// Prüft windows/bridge/capacitor-tauri.js im echten Browser mit gestellter Tauri-Schnittstelle (ohne Windows):
// Capacitor mit Plattform „windows“, Sitzungsschlüssel in jedem Aufruf, Fehlercodes, Ereignisse (stand, neu), nur auf der eigenen Seite.
// Dazu die Verträge: jede Methode, die die Oberfläche aufruft, steht in contracts.json; die Hülle prüft die Liste (main.rs).
//   NODE_PATH=windows/node_modules node windows/tools/test-bruecke.mjs
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const req=createRequire(import.meta.url);
let chromium;try{chromium=req('playwright-core').chromium;}catch{chromium=req('playwright').chromium;}
let gruen=0,rot=0;const soll=(n,b,m='')=>{if(b){gruen++;console.log('  ✓ '+n);}else{rot++;console.log('  ✗ ROT: '+n+(m?' – '+m:''));}};
const bruecke=await readFile(join(root,'windows/bridge/capacitor-tauri.js'),'utf8');
const vertr=JSON.parse(await readFile(join(root,'windows/bridge/contracts.json'),'utf8'));
const main=await readFile(join(root,'windows/src-tauri/src/main.rs'),'utf8');
console.log('Verträge');
soll('main.rs liest contracts.json und prüft jede Methode',main.includes('include_str!("../../bridge/contracts.json")')&&main.includes('Err("NOT_ALLOWED".into())'));
// PseudoDoc ruft DoEingang (src/eingang.ts), DoDateien (src/ordner.ts) und DoUpdates (src/nativ.ts); FamilyFolders ist für den Arbeitsordner vorbereitet.
const quellen=(await readFile(join(root,'src/eingang.ts'),'utf8'))+(await readFile(join(root,'src/ordner.ts'),'utf8')),nativ=await readFile(join(root,'src/nativ.ts'),'utf8');
for(const m of ['ordnerWaehlen','ordnerListe','dateiLesen','dateiBeginn','dateiAnhaengen','dateiFertig','gemerkt','wiederOeffnen','vergessen'])soll(`FamilyFolders.${m} im Vertrag (wie Android)`,vertr.FamilyFolders.includes(m));
for(const [p,ms] of [['DoEingang',['abholen','lesen']],['DoDateien',['speichern']],['DoUpdates',['pruefen','installieren']]])for(const m of ms)soll(`${p}.${m} im Vertrag`,vertr[p]?.includes(m)&&(quellen+nativ).includes(m));
soll('Brücke kennt genau die Plugins des Vertrags',JSON.stringify(Object.keys(vertr).sort())===JSON.stringify([...bruecke.matchAll(/'(FamilyFolders|DoEingang|DoDateien|DoUpdates)'/g)].map(m=>m[1]).sort()));
const host=await readFile(join(root,'windows/src-tauri/src/host.rs'),'utf8');
soll('Prüf-Abkürzungen der Hülle nur im Prüfbau (messprobe)',[...host.matchAll(/PD_WINDOWS_TEST_/g)].length>0&&[...host.matchAll(/#\[cfg\(feature="messprobe"\)\]\s*\n\s*if (let Ok|std::env::var)/g)].length===[...host.matchAll(/std::env::var\("PD_WINDOWS_TEST_/g)].length);
console.log('Brücke im Browser');
const browser=await chromium.launch();
try{
  const ctx=await browser.newContext();
  await ctx.route('https://tauri.localhost/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>x</title>'}));
  await ctx.route('https://fremd.example/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>y</title>'}));
  await ctx.addInitScript(()=>{
    window.__aufrufe=[];
    window.__TAURI_INTERNALS__={invoke:async(cmd,args,opt)=>{
      window.__aufrufe.push({cmd,args,kopf:opt?.headers?.['x-do-session']});
      if(args.method==='kaputt')throw 'PD_NICHT_GEFUNDEN';
      return {ok:true,plugin:args.plugin,method:args.method};
    }};
  });
  await ctx.addInitScript(bruecke.replace('__DO_SESSION_TOKEN__',JSON.stringify('probe-schluessel')));
  const p=await ctx.newPage();await p.goto('https://tauri.localhost/');
  soll('Capacitor mit Plattform „windows“',await p.evaluate(()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='windows'));
  const r=await p.evaluate(()=>Capacitor.Plugins.FamilyFolders.ordnerListe({token:'t',pfad:''}));
  const a=(await p.evaluate(()=>window.__aufrufe))[0];
  soll('Aufruf geht als do_call mit Sitzungsschlüssel im Kopf',r.ok&&a.cmd==='do_call'&&a.kopf==='probe-schluessel'&&a.args.plugin==='FamilyFolders'&&a.args.method==='ordnerListe'&&a.args.options.token==='t');
  soll('Fehler kommen als code an (wie Capacitor)',await p.evaluate(async()=>{try{await Capacitor.Plugins.FamilyFolders.kaputt();return false;}catch(e){return e.code==='PD_NICHT_GEFUNDEN';}}));
  const ev=await p.evaluate(async()=>{const got=[];await Capacitor.Plugins.DoUpdates.addListener('stand',d=>got.push(['stand',d.geladen]));const h=await Capacitor.Plugins.DoEingang.addListener('neu',d=>got.push(['neu',d.neu]));
    for(const [name,data] of [['DoUpdates:stand',{geladen:5}],['DoEingang:neu',{neu:2}],['DoUpdates:anders',{}]])window.dispatchEvent(new CustomEvent('do-native',{detail:{name,data}}));
    await h.remove();window.dispatchEvent(new CustomEvent('do-native',{detail:{name:'DoEingang:neu',data:{neu:9}}}));return got;});
  soll('Ereignisse der Engine erreichen die Hörer (stand, neu), entfernte nicht mehr',JSON.stringify(ev)===JSON.stringify([['stand',5],['neu',2]]));
  soll('Capacitor ist nicht überschreibbar',await p.evaluate(()=>{try{window.Capacitor=null;}catch{} return !!window.Capacitor;}));
  soll('kein „then“ (Plugins sind keine Versprechen)',await p.evaluate(()=>Capacitor.Plugins.DoDateien.then===undefined));
  const f=await ctx.newPage();await f.goto('https://fremd.example/');
  soll('auf fremder Seite keine Brücke',await f.evaluate(()=>!window.Capacitor));
  const u=await ctx.newPage();await u.goto('https://tauri.localhost/landkarte.html');
  soll('auf Nebenseiten (Landkarte) keine Brücke',await u.evaluate(()=>!window.Capacitor));
}finally{await browser.close();}
console.log(`Brücke: ${gruen} grün · ${rot} ROT`);process.exit(rot?1:0);
