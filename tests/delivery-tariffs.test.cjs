const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/delivery-tariffs.js'),'utf8');
function fixture(){
 const state={loaded:true,deliveryRates:[{id:'city',name:'Город',amount:5}],network:{backendUrl:'https://backend.test',deviceKey:'test-key'}};
 const writes=[],calls=[];let fail=false,version=0,publication=null;
 const context={state,storageBroken:false,criticalStorageRecoveryPending:false,storageSnapshot:v=>JSON.parse(JSON.stringify(v)),networkConfigFromState:()=>state.network,uid:(()=>{let n=0;return()=>`publication-${++n}`})(),commitCriticalStorage:async(type,documents)=>{if(fail)throw Error('storage full');writes.push(JSON.parse(JSON.stringify(documents)));},PrilavokCore:{Storage:{set:async(key,value)=>{if(fail)throw Error('storage full');writes.push({[key]:JSON.parse(JSON.stringify(value))});}}},document:{getElementById:()=>null,addEventListener(){}},addEventListener(){},AbortController,setTimeout,clearTimeout,canEditCompanySettings:()=>true,confirm:()=>true,flash(){},fetch:async(url,options)=>{calls.push({url,options});if(options.method==='GET')return {ok:true,json:async()=>({version,published:version>0,tariffs:[]})};const body=JSON.parse(options.body);if(publication===body.publicationId)return {ok:true,json:async()=>({ok:true,version,duplicate:true})};if(body.baseVersion!==version)return {ok:false,json:async()=>({code:'DELIVERY_SYNC_CONFLICT',error:'conflict',version})};publication=body.publicationId;return {ok:true,json:async()=>({ok:true,version:++version})};}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {context,state,calls,writes,setFailure(value){fail=value},setVersion(value){version=value}};
}
test('local list and queue persist together before network; failed storage never publishes',async()=>{
 const f=fixture();f.setFailure(true);
 await assert.rejects(f.context.saveDeliveryTariffList(rates=>[...rates,{id:'free',name:'Бесплатно',amount:0}]));
 assert.equal(f.state.deliveryRates.length,1);assert.equal(f.calls.length,0);
 f.setFailure(false);await f.context.saveDeliveryTariffList(rates=>[...rates,{id:'free',name:'Бесплатно',amount:0}]);
 assert.equal(f.writes[0].deliveryRates.length,2);assert.equal(f.writes[0].network.deliveryTariffSync.pending.tariffs[1].amount,'0.00');
 assert.equal(f.calls.length,0);await f.context.flushDeliveryTariffs();
 assert.equal(f.state.network.deliveryTariffSync.pending,null);assert.equal(f.state.network.deliveryTariffSync.version,1);
});
test('old backup revision stops at conflict and requires explicit republish',async()=>{
 const f=fixture();await f.context.saveDeliveryTariffList(rates=>rates);f.setVersion(2);
 assert.equal(await f.context.flushDeliveryTariffs(),false);assert.equal(f.state.network.deliveryTariffSync.conflict,true);
 const requests=f.calls.length;await f.context.flushDeliveryTariffs();assert.equal(f.calls.length,requests);
 f.context.confirm=()=>false;await f.context.retryDeliveryTariffs();assert.equal(f.state.network.deliveryTariffSync.conflict,true);
 f.context.confirm=()=>true;assert.equal(await f.context.retryDeliveryTariffs(),true);assert.equal(f.state.network.deliveryTariffSync.version,3);
});
test('offline retains the queued publication and retries exactly that ID',async()=>{
 const f=fixture();await f.context.saveDeliveryTariffList(rates=>rates);const id=f.state.network.deliveryTariffSync.pending.publicationId;
 const fetch=f.context.fetch;f.context.fetch=async()=>{throw Error('offline')};await f.context.flushDeliveryTariffs();
 assert.equal(f.state.network.deliveryTariffSync.pending.publicationId,id);
 f.context.fetch=fetch;await f.context.flushDeliveryTariffs();assert.equal(f.state.network.deliveryTariffSync.pending,null);
});
test('restored acknowledged backup is checked against server without overwriting it',async()=>{
 const f=fixture();f.state.network.deliveryTariffSync={target:'https://backend.test|test-key',version:1,status:'Синхронизировано',pending:null};f.setVersion(2);
 await f.context.initializeDeliveryTariffs();
 assert.equal(f.state.network.deliveryTariffSync.conflict,true);
 assert.equal(f.calls.filter(call=>call.options.method==='PUT').length,0);
});
