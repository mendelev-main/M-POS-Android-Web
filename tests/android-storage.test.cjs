const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),script=fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-storage.js'),'utf8');
function legacyStorage(data){return {get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem(){throw Object.assign(Error('legacy quota full'),{name:'QuotaExceededError'})},removeItem(){throw Error('legacy must remain untouched')}}}
function nativeBridge(data,control={ready:false}){return raw=>{const r=JSON.parse(raw);if(control.fail===r.action)return JSON.stringify({ok:false,name:'InvalidStateError'});switch(r.action){case 'status':return JSON.stringify({ok:true,ready:control.ready,keys:[...data.keys()]});case 'initialize':for(const [k,v] of Object.entries(r.entries))data.set(k,v);control.ready=true;return JSON.stringify({ok:true,keys:[...data.keys()]});case 'get':return JSON.stringify({ok:true,value:data.get(r.key)??null});case 'set':data.set(r.key,r.value);break;case 'remove':data.delete(r.key);break;}return '{"ok":true}';}}
function fixture(legacy=new Map(),native=new Map(),control={ready:false}){const c={localStorage:legacyStorage(legacy),__mposStorageCall:nativeBridge(native,control)};c.window=c;vm.createContext(c);vm.runInContext(script,c);return {c,legacy,native,control};}
test('read-only migration works with full legacy quota and preserves exact JSON and old copy',()=>{
 const history=JSON.stringify([{label:'Тест 🧾',payload:'a'.repeat(6*1024*1024)}]),legacy=new Map([['prilavok_orders',history],['prilavok_criticalStorageJournal','null']]);
 const f=fixture(legacy);assert.equal(f.c.__mposStorageReady,true);assert.equal(f.c.__mposStorageBackend,'sqlite');assert.equal(f.c.localStorage.getItem('prilavok_orders'),history);
 f.c.localStorage.setItem('prilavok_criticalStorageJournal',history);f.c.localStorage.setItem('prilavok_orders',history+' ');assert.equal(f.native.get('prilavok_orders'),history+' ');assert.equal(legacy.get('prilavok_orders'),history);
 f.c.localStorage.removeItem('prilavok_criticalStorageJournal');assert.equal(f.c.localStorage.getItem('prilavok_criticalStorageJournal'),null);assert.equal(f.c.localStorage.length,1);
});
test('restarts use committed SQLite even when old WebView copy is unreadable or stale',()=>{
 const native=new Map([['prilavok_orders','new-history']]);const c={__mposStorageCall:nativeBridge(native,{ready:true})};Object.defineProperty(c,'localStorage',{get(){throw Error('unreadable legacy')},configurable:true});c.window=c;vm.createContext(c);vm.runInContext(script,c);assert.equal(c.__mposStorageReady,true);assert.equal(c.localStorage.getItem('prilavok_orders'),'new-history');
});
test('migration or native write failure never silently falls back to WebView',()=>{
 const old=new Map([['prilavok_orders','history']]),failed=fixture(old,new Map(),{ready:false,fail:'initialize'});assert.equal(failed.c.__mposStorageReady,false);assert.throws(()=>failed.c.localStorage.getItem('prilavok_orders'));assert.equal(old.get('prilavok_orders'),'history');
 const f=fixture(old);f.control.fail='set';assert.throws(()=>f.c.localStorage.setItem('prilavok_orders','replacement'));assert.equal(f.c.localStorage.getItem('prilavok_orders'),'history');
});
test('failed durable initialization prevents loading fallback empty POS records',async()=>{
 let loaded=0,ready=0;const app={innerHTML:''},c={__mposStorageReady:false,loadAll:()=>loaded++,document:{getElementById:()=>app},webkit:{messageHandlers:{startup:{postMessage(){ready++}}}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-storage-startup.js'),'utf8'),c);assert.equal(await c.loadAll(),false);assert.equal(loaded,0);assert.equal(ready,1);assert.match(app.innerHTML,/Исходные данные не удалены/);
});
test('native storage bridge is scoped by a per-instance secret injected only into trusted main document',()=>{
 const host=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');assert.match(host,/UUID.randomUUID/);assert.match(host,/window===window.top/);assert.match(host,/setOf\(APP_ORIGIN\)/);assert.match(host,/DOCUMENT_START_SCRIPT/);
 const bridge=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/storage/PosStorageBridge.kt'),'utf8');assert.match(bridge,/MessageDigest.isEqual/);
 const html=fs.readFileSync(path.join(root,'app/src/main/assets/pos/pos.html'),'utf8');assert.ok(html.indexOf('android-storage.js')<html.indexOf('Web/js/core/storage.js'));assert.ok(html.indexOf('android-storage-startup.js')<html.indexOf('<script>loadAll();</script>'));
});

test('printer and notification settings migrate with POS data and can be saved despite the full old quota',()=>{
 const legacy=new Map([['printers','[{"name":"Kitchen"}]'],['posNotificationSettings','{"soundEnabled":true}']]);const f=fixture(legacy);assert.equal(f.c.localStorage.getItem('printers'),'[{"name":"Kitchen"}]');f.c.localStorage.setItem('printers','[]');assert.equal(f.native.get('printers'),'[]');assert.equal(legacy.get('printers'),'[{"name":"Kitchen"}]');
});
