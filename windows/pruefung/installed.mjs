// Prüft die mit NSIS installierte Windows-App über die Prüf-Schnittstelle des Prüfbaus (messprobe, Port 9223).
// Phase „erste“: Name, Fassung, Zugriffsschutz, Beispiel pseudonymisieren, Ordner-Brücke, Speichern unter …, „Öffnen mit“ (zweiter
// Programmstart). Phase „neustart“: der Auftrag aus dem ersten Start ist gemerkt, die geschriebene Datei liegt noch im Ordner.
// Nur im Prüfbau; der Auslieferungsbau hat keine Prüf-Schnittstelle. Vorbild BookLedgerPro windows/pruefung/installed.mjs.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawn} from 'node:child_process';
const phase=process.argv[2]||'erste',out=resolve(process.argv[3]||'windows-bericht.json');
const report={phase,quelle:process.env.PD_SOURCE_COMMIT||'',gruen:[],fehler:[]};
const version=JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json',import.meta.url),'utf8')).version;
const ok=(name,value)=>{assert.ok(value,name);report.gruen.push(name);console.log('PASS '+name);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const ORDNER=process.env.PD_WINDOWS_TEST_FOLDER;
let browser,page;
async function verbinden(){for(let i=0;i<120;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9223');return;}catch{await pause(500);}}throw Error('Die installierte App hat die Prüf-Schnittstelle nicht geöffnet');}
const seiten=()=>browser.contexts().flatMap(c=>c.pages());
const call=(plugin,method,args={})=>page.evaluate(async({plugin,method,args})=>{try{return await Capacitor.Plugins[plugin][method](args);}catch(e){return {fehler:e.code||String(e)};}},{plugin,method,args});
try{
  await verbinden();
  for(let i=0;i<120&&!page;i++){page=seiten().find(p=>/^https:\/\/tauri\.localhost\/(index\.html)?(#.*)?$/.test(p.url()));if(!page)await pause(250);}
  assert.ok(page,'Hauptfenster gefunden');
  page.on('pageerror',e=>report.fehler.push(String(e.stack||e.message).slice(0,800)));
  await page.waitForFunction(()=>window.Capacitor&&document.querySelector('[data-app-name]'),null,{timeout:90000});
  ok('Hülle meldet Windows',await page.evaluate(()=>Capacitor.getPlatform()==='windows'&&Capacitor.isNativePlatform()));
  ok('Name „PseudoDoc Pro“ in Kopf und Titel',await page.evaluate(()=>document.querySelector('[data-app-name]').textContent==='PseudoDoc Pro'&&document.title==='PseudoDoc Pro'));
  ok('Fassung der App = tauri.conf.json',(await call('DoDateien','appInfo')).version===version);
  ok('kein Service Worker in der App',await page.evaluate(async()=>!(await navigator.serviceWorker?.getRegistration?.())));
  ok('Aufruf ohne Sitzungsschlüssel wird verweigert',await page.evaluate(async()=>{try{await __TAURI_INTERNALS__.invoke('do_call',{plugin:'DoDateien',method:'appInfo',options:{}});return false;}catch(e){return String(e).includes('NOT_ALLOWED');}}));
  ok('Methode außerhalb der Verträge wird verweigert',(await call('FamilyFolders','loeschen')).fehler==='NOT_ALLOWED');
  // Seit 14.11. ist der öffentliche Schlüssel eingetragen. Vor der ersten Veröffentlichung liegt kein (oder kein unterschriebener) Feed auf dem Server:
  // dann muss die Prüfung mit einem UPDATE_-Fehler enden, nie mit einem Angebot – und „installieren“ ohne geprüftes Angebot wird verweigert.
  // Nach der ersten Veröffentlichung meldet ein Prüfbau derselben Fassung „aktuell“. Der echte Wert steht im Bericht.
  { const u=await call('DoUpdates','pruefen'); report.update=u; console.log('Update-Prüfung meldet: '+JSON.stringify(u));
    ok('Updates: Fehler UPDATE_… oder „aktuell“, nie ein Angebot für einen Prüfbau',(typeof u.fehler==='string'&&/^UPDATE_/.test(u.fehler))||(u.aktuell===true&&!u.neu));
    const i=await call('DoUpdates','installieren'); report.installieren=i; console.log('Installieren meldet: '+JSON.stringify(i));
    ok('Updates: „installieren“ ohne geprüftes Angebot wird verweigert, nie ein Download',typeof i.fehler==='string'&&/^UPDATE_/.test(i.fehler)); }
  ok('Pro: kein Installieren-Knopf, Fassung als Update-Knopf',await page.evaluate((v)=>!document.querySelector('[data-installieren]')&&document.querySelector('[data-fassung-knopf]')?.textContent===v,version));
  if(phase==='erste'){
    // Oberfläche: das erfundene Beispiel pseudonymisieren (Maske, Texterkennung, Abdecken) – alles in der installierten App.
    await page.locator('[data-beispiel]').click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-stueck]').length===4&&!document.querySelector('[data-laeuft]'),null,{timeout:240000});
    ok('Beispiel pseudonymisiert (4 Stücke, Name verdeckt)',!/Testfeld/.test(await page.locator('[data-stueck=D01]').textContent())&&/Stellen verdeckt/.test(await page.locator('[data-stueck=D01]').textContent()));
    // Ordner-Brücke (für den Arbeitsordner): Ordner wählen (Prüfbau antwortet selbst), lesen, eine .json schreiben.
    const w=await call('FamilyFolders','ordnerWaehlen');ok('Ordner über die Brücke gewählt',!!w.token);
    const s=await call('FamilyFolders','dateiBeginn',{token:w.token,pfad:'pseudodoc-probe.json'});
    const text='{"probe":"Windows ä"}';await call('FamilyFolders','dateiAnhaengen',{id:s.id,offset:0,data:Buffer.from(text).toString('base64')});
    const f=await call('FamilyFolders','dateiFertig',{id:s.id,size:Buffer.byteLength(text)});
    ok('.json in den Ordner geschrieben',f.size===Buffer.byteLength(text)&&(await readFile(resolve(ORDNER,'pseudodoc-probe.json'),'utf8'))===text);
    ok('nur .json direkt im Ordner',(await call('FamilyFolders','dateiBeginn',{token:w.token,pfad:'Bank/x.json'})).fehler==='PD_NICHT_ERLAUBT');
    const sp=await call('DoDateien','speichern',{name:'PD-Probe.md',data:Buffer.from('# Probe').toString('base64')});
    ok('Speichern unter … schreibt die Datei',sp.gespeichert===true&&(await readFile(resolve(process.env.PD_WINDOWS_TEST_SAVE_FOLDER,'PD-Probe.md'),'utf8'))==='# Probe');
    const beleg=resolve(process.env.RUNNER_TEMP||'.','Brief-Öffnen-mit.txt');await writeFile(beleg,'Sehr geehrte Frau Mara Testfeld,\nIhre Rechnung 4711.\n');
    const zweiter=spawn(process.env.PD_WINDOWS_TEST_EXE,[beleg],{windowsHide:true,stdio:'ignore'});
    assert.equal(await new Promise((r,j)=>{zweiter.once('error',j);zweiter.once('exit',r);}),0);
    let angekommen=false;
    for(let i=0;i<120&&!angekommen;i++){angekommen=await page.evaluate(()=>document.querySelectorAll('[data-stueck]').length===5);if(!angekommen)await pause(250);}
    ok('„Öffnen mit“ (zweiter Programmstart): Datei kommt pseudonymisiert dazu',angekommen&&!/Testfeld/.test(await page.locator('[data-stueck=D05]').textContent().catch(()=>'Testfeld')));
    ok('Original nach „Öffnen mit“ unverändert',(await readFile(beleg,'utf8')).includes('Mara Testfeld'));
  }else{
    await page.evaluate(()=>{location.hash='zurueck';});
    await page.waitForSelector('[data-auftrag]',{timeout:30000});
    ok('nach Neustart: der Auftrag aus dem ersten Start ist gemerkt (verschlüsselt)',(await page.locator('[data-auftrag]').count())>=1);
    ok('.json aus dem ersten Start liegt noch im Ordner',(await readFile(resolve(ORDNER,'pseudodoc-probe.json'),'utf8')).includes('Windows'));
  }
  ok('keine Skriptfehler in der Seite',report.fehler.length===0);
}catch(error){report.fehler.push(String(error.stack||error.message));process.exitCode=1;console.error(error);}
finally{
  await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close().catch(()=>{});
}
