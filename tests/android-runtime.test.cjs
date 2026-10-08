const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const assets=path.join(root,'app/src/main/assets/pos');
const html=fs.readFileSync(path.join(assets,'pos.html'),'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

test('all bundled JavaScript parses',()=>{
 const files=[];const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).forEach(entry=>{const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.js'))files.push(file)});walk(assets);
 files.forEach(file=>assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}),path.relative(root,file)));
});

test('every local script referenced by POS is bundled',()=>{
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
 assert.ok(scripts.includes('android-pos-stock.js'));assert.ok(scripts.includes('android-bridge.js'));assert.ok(scripts.includes('notification-native.js'));
 scripts.forEach(script=>assert.ok(fs.existsSync(path.join(assets,script)),script));
});

test('Android bridge preserves all native iPad channels',()=>{
 const bridge=fs.readFileSync(path.join(assets,'android-bridge.js'),'utf8');
 for(const channel of ['printer','telegram','photoPicker','backup'])assert.match(bridge,new RegExp(`${channel}:handler\\('${channel}'\\)`));
 assert.match(bridge,/window\.__MPOS_PLATFORM__|global\.__MPOS_PLATFORM__/);
});

test('Android POS differs from source HTML only by platform scripts',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'web-source-manifest.json')));
 const restored=html.replace('<script src="android-safety.js"></script>\n','').replace('<script src="android-admin.js"></script>\n','').replace('<script src="android-integrations.js"></script>\n','').replace('<script src="android-pos-stock.js"></script>\n','').replace('<script src="android-bridge.js"></script>\n','').replace('<script src="android-network.js"></script>\n','').replace('\n<script src="notification-native.js"></script>','');
 assert.equal(sha(restored),manifest.files['pos.html']);
 for(const [file,expected] of Object.entries(manifest.files)){
   if(file==='pos.html')continue;
   assert.equal(sha(fs.readFileSync(path.join(assets,file))),expected,file);
 }
});

test('shell uses trusted local origin and blocks file and cleartext WebView access',()=>{
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');
 assert.match(activity,/appassets\.androidplatform\.net/);assert.match(activity,/allowFileAccess = false/);assert.match(activity,/MIXED_CONTENT_NEVER_ALLOW/);assert.match(activity,/WEB_MESSAGE_LISTENER/);
 const manifest=fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8');assert.match(manifest,/usesCleartextTraffic="false"/);
});

test('native report routes preserve shift printing and monthly Telegram delivery',()=>{
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');
 const reports=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/share/ReportShareManager.kt'),'utf8');
 const telegram=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/telegram/TelegramClient.kt'),'utf8');
 assert.match(activity,/"printShiftReport"[\s\S]{0,120}shares::printShiftReport/);
 assert.match(reports,/PrintManager/);
 assert.match(telegram,/"sendMonthlyWarehouseReport"/);
 assert.match(telegram,/sendDocument/);
 assert.match(activity,/onTelegramMonthlyWarehouseResult/);
});

// Regression: iPad uses onTelegramResult; a differently named callback silently drops the test response.
test('Android Telegram completion reaches the original network-settings callback',()=>{
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');
 assert.match(html,/window\.onTelegramResult=function/);assert.match(activity,/window\.onTelegramResult&&window\.onTelegramResult/);
});

test('restored iPad photos use the Android HTTPS origin and update when editor DOM changes',()=>{
 const bridge=fs.readFileSync(path.join(assets,'android-bridge.js'),'utf8'),listeners={},images=[],observers=[];
 const id='12345678-1234-1234-1234-123456789abc';
 const image=src=>({src,getAttribute(){return this.src},setAttribute(name,value){assert.equal(name,'src');this.src=value}});
 const local=image('mpos-image://'+id.toUpperCase()),remote=image('https://photos.test/photo.jpg'),inline=image('data:image/png;base64,AA'),invalid=image('mpos-image://../../secret');images.push(local,remote,inline,invalid);
 const c={document:{body:{},querySelector:()=>null,querySelectorAll:()=>images.filter(x=>x.src.startsWith('mpos-image://')),addEventListener:(name,fn)=>listeners[name]=fn},MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(node,options){this.options=options}}};c.window=c;vm.createContext(c);vm.runInContext(bridge,c);
 listeners.DOMContentLoaded();assert.equal(local.src,'https://appassets.androidplatform.net/product-images/'+id);assert.equal(remote.src,'https://photos.test/photo.jpg');assert.equal(inline.src,'data:image/png;base64,AA');assert.equal(invalid.src,'mpos-image://../../secret');
 const added=image('mpos-image://'+id);images.push(added);observers[0].fn();assert.equal(added.src,local.src);
 added.src='mpos-image://'+id;observers[0].fn();assert.equal(added.src,local.src);assert.equal(observers[0].options.attributes,true);assert.deepEqual(Array.from(observers[0].options.attributeFilter),['src']);
});

test('Telegram native progress is correlated and activity closes its transport',()=>{
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');
 assert.match(activity,/onTestProgress\s*=.*__mposTelegramTestProgress/);
 assert.match(activity,/telegram\.close\(\)/);
 const script=fs.readFileSync(path.join(assets,'android-integrations.js'),'utf8');
 assert.match(script,/__mposTelegramTestProgress=result=>\{if\(telegramTests.has\(result\?\.requestId\)\)/);
});
