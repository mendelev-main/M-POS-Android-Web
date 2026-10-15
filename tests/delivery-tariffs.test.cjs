const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const assetRoot=fs.existsSync(path.join(root,'PrilavokPOS'))?path.join(root,'PrilavokPOS'):path.join(root,'app/src/main/assets/pos');
const source=fs.readFileSync(path.join(assetRoot,'Web/js/features/delivery-tariffs.js'),'utf8');
function fixture(){
 const state={loaded:true,deliveryRates:[{id:'city',name:'Город',amount:5}],network:{backendUrl:'https://backend.test',deviceKey:'test-key'}};
 const writes=[],calls=[],events={};let fail=false,version=0,published=[];
 const context={state,storageBroken:false,criticalStorageRecoveryPending:false,storageSnapshot:v=>JSON.parse(JSON.stringify(v)),networkConfigFromState:()=>state.network,uid:(()=>{let n=0;return()=>`publication-${++n}`})(),commitCriticalStorage:async(type,documents)=>{if(fail)throw Error('storage full');writes.push(JSON.parse(JSON.stringify(documents)));},PrilavokCore:{Storage:{set:async(key,value)=>{if(fail)throw Error('storage full');writes.push({[key]:JSON.parse(JSON.stringify(value))});}}},document:{hidden:false,getElementById:()=>null,addEventListener(name,fn){events[name]=fn}},addEventListener(name,fn){events[name]=fn},AbortController,setTimeout,clearTimeout,canEditCompanySettings:()=>true,flash(){},fetch:async(url,options)=>{calls.push({url,options});if(options.method==='GET')return {ok:true,json:async()=>({version,published:version>0,tariffs:published})};const body=JSON.parse(options.body);if(body.baseVersion!==version)return {ok:false,json:async()=>({code:'DELIVERY_SYNC_CONFLICT',error:'conflict',version})};published=body.tariffs;return {ok:true,json:async()=>({ok:true,version:++version})};}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {context,state,calls,writes,events,getPublished:()=>published,setFailure(value){fail=value},setVersion(value){version=value}};
}
test('saving, startup, network and visibility never publish; explicit synchronization publishes full current list',async()=>{
 const f=fixture();await f.context.initializeDeliveryTariffs();assert.equal(f.calls.length,0);
 await f.context.saveDeliveryTariffList(rates=>[...rates,{id:'free',name:'Бесплатно',amount:0}]);
 assert.equal(f.writes.at(-1).deliveryRates.length,2);assert.equal(f.state.network.deliveryTariffSync.dirty,true);
 f.events.online?.();f.events.visibilitychange?.();assert.equal(f.calls.length,0);
 assert.equal(await f.context.retryDeliveryTariffs(),true);
 assert.equal(f.getPublished().length,2);assert.equal(f.getPublished()[1].amount,'0.00');
 assert.equal(f.state.network.deliveryTariffSync.pending,null);assert.equal(f.state.network.deliveryTariffSync.dirty,false);
 const sent=f.calls.length;await f.context.saveDeliveryTariffList(rates=>rates.filter(r=>r.id==='free'));
 assert.equal(f.calls.length,sent);assert.equal(f.getPublished().length,2);
 await f.context.retryDeliveryTariffs();assert.equal(f.getPublished().length,1);assert.equal(f.getPublished()[0].id,'free');
 await f.context.saveDeliveryTariffList(()=>[]);await f.context.retryDeliveryTariffs();assert.equal(f.getPublished().length,0);
});
test('failed local storage prevents mutation and publication',async()=>{
 const f=fixture();f.setFailure(true);
 await assert.rejects(f.context.saveDeliveryTariffList(()=>[]));assert.equal(f.state.deliveryRates.length,1);
 assert.equal(await f.context.retryDeliveryTariffs(),false);
 assert.equal(f.calls.filter(c=>c.options.method==='PUT').length,0);
});
test('offline failures wait for the next explicit click and send latest settings',async()=>{
 const f=fixture(),fetch=f.context.fetch;f.context.fetch=async()=>{throw Error('offline')};
 assert.equal(await f.context.retryDeliveryTariffs(),false);assert.match(f.state.network.deliveryTariffSync.status,/Ошибка/);
 f.context.fetch=fetch;await f.context.saveDeliveryTariffList(()=>[{id:'outside',name:'За город',amount:10}]);
 f.events.online?.();await f.context.initializeDeliveryTariffs();assert.equal(f.calls.length,0);
 assert.equal(await f.context.retryDeliveryTariffs(),true);assert.equal(f.getPublished()[0].amount,'10.00');
});
test('old automatic queue and restored backup never overwrite server until explicit click',async()=>{
 const f=fixture();f.state.network.deliveryTariffSync={target:'https://backend.test|test-key',version:1,pending:{publicationId:'old',baseVersion:1,tariffs:[]}};f.setVersion(3);
 await f.context.initializeDeliveryTariffs();assert.equal(f.calls.length,0);assert.equal(f.state.network.deliveryTariffSync.pending,null);
 assert.equal(await f.context.retryDeliveryTariffs(),true);assert.equal(f.state.network.deliveryTariffSync.version,4);
});
test('edits during publication remain local until another click and overlapping clicks do not publish twice',async()=>{
 const f=fixture(),fetch=f.context.fetch;let release,started;
 const waiting=new Promise(r=>started=r);
 f.context.fetch=async(url,options)=>{if(options.method==='PUT'){started();await new Promise(r=>release=r)}return fetch(url,options)};
 const sync=f.context.retryDeliveryTariffs();await waiting;
 assert.equal(await f.context.retryDeliveryTariffs(),false);
 await f.context.saveDeliveryTariffList(rates=>rates.map(r=>({...r,amount:8})));
 release();assert.equal(await sync,false);assert.equal(f.getPublished()[0].amount,'5.00');assert.equal(f.state.network.deliveryTariffSync.dirty,true);
 f.context.fetch=fetch;assert.equal(await f.context.retryDeliveryTariffs(),true);assert.equal(f.getPublished()[0].amount,'8.00');
});
test('network synchronization waits for tariff result and exposes partial success',async()=>{
 const html=fs.readFileSync(path.join(assetRoot,'pos.html'),'utf8'),start=html.indexOf('let menuBackendSyncBusy=false;'),end=html.indexOf('function renderNetworkScreen()',start);
 assert.ok(start>0&&end>start);const f=fixture();let tariffs=0;
 Object.assign(f.context,{saveNetworkSettings:()=>true,buildMenuSyncPayload:()=>({}),setNetworkStatus(){},saveKey(){},render(){},publishAvailability:async()=>{},retryDeliveryTariffs:async()=>{tariffs++;return false},deliveryTariffStatus:()=> 'Ошибка синхронизации тарифов',fetch:async()=>({ok:true,json:async()=>({categories:2,products:3})})});
 vm.runInContext(html.slice(start,end),f.context);await f.context.syncMenuToBackend();assert.equal(tariffs,1);assert.match(f.state.network.lastSyncStatus,/Ошибка синхронизации тарифов/);
 f.context.retryDeliveryTariffs=async()=>true;await f.context.syncMenuToBackend();assert.match(f.state.network.lastSyncStatus,/Тарифы доставки синхронизированы/);
});
