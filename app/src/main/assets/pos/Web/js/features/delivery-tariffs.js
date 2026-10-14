/* Durable tariff publication lives in the existing network document. */
let deliveryTariffFlushBusy=false,deliveryTariffLocalChain=Promise.resolve();
function serializeDeliveryTariffWrite(task){
  const next=deliveryTariffLocalChain.then(task,task);deliveryTariffLocalChain=next.catch(()=>{});return next;
}
function deliveryTariffTarget(){const n=networkConfigFromState();return String(n.backendUrl||'').replace(/\/+$/,'')+'|'+String(n.deviceKey||'')}
function deliveryTariffList(rates=state.deliveryRates){return rates.map(r=>({id:String(r.id),name:String(r.name).trim(),amount:Number(r.amount).toFixed(2)}))}
function deliveryTariffStatus(){return state.network?.deliveryTariffSync?.status||'Тарифы ещё не отправлены'}
function refreshDeliveryTariffStatus(){const element=document.getElementById('delivery-tariff-sync-status');if(element)element.textContent=deliveryTariffStatus()}
async function persistDeliveryTariffNetwork(next){
  await window.PrilavokCore.Storage.set('network',next);state.network=next;refreshDeliveryTariffStatus();
}
async function saveDeliveryTariffList(makeRates){
  return serializeDeliveryTariffWrite(async()=>{
    if(storageBroken||criticalStorageRecoveryPending)throw new Error('Хранилище недоступно; изменения тарифов не сохранены');
    const rates=makeRates(storageSnapshot(state.deliveryRates)),network=storageSnapshot(state.network),previous=network.deliveryTariffSync;
    const target=deliveryTariffTarget(),version=previous?.target===target?Number(previous.version||0):0;
    network.deliveryTariffSync={target,version,status:'Ожидает отправки',pending:{publicationId:uid(),baseVersion:version,tariffs:deliveryTariffList(rates)}};
    await commitCriticalStorage('delivery-tariffs',{deliveryRates:rates,network});
    state.deliveryRates=rates;state.network=network;
    refreshDeliveryTariffStatus();return true;
  });
}
async function deliveryTariffRequest(method,payload){
  const n=networkConfigFromState(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(String(n.backendUrl||'').replace(/\/+$/,'')+'/api/device/delivery-tariffs',{method,headers:{'Content-Type':'application/json','X-Device-Key':n.deviceKey},...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store',signal:controller.signal});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(body.error||'Ошибка синхронизации тарифов');error.code=body.code;throw error}
    return body;
  }finally{clearTimeout(timeout)}
}
async function flushDeliveryTariffs(){
  if(deliveryTariffFlushBusy||!state.loaded||storageBroken||criticalStorageRecoveryPending)return false;
  const sync=state.network?.deliveryTariffSync;if(!sync?.pending||sync.conflict)return false;
  if(sync.target!==deliveryTariffTarget()){sync.status='Адрес или ключ устройства изменился. Подтвердите публикацию тарифов';refreshDeliveryTariffStatus();return false}
  deliveryTariffFlushBusy=true;const job=storageSnapshot(sync.pending),target=sync.target;
  try{
    const result=await deliveryTariffRequest('PUT',job);
    if(result.ok!==true||!Number.isSafeInteger(result.version))throw new Error('Сервер не подтвердил публикацию тарифов');
    await serializeDeliveryTariffWrite(async()=>{
      if(state.network?.deliveryTariffSync?.target!==target)return;
      const next=storageSnapshot(state.network),current=next.deliveryTariffSync;
      current.version=result.version;
      if(current.pending?.publicationId===job.publicationId){current.pending=null;current.status='Синхронизировано';current.conflict=false}
      else if(current.pending?.baseVersion===job.baseVersion){current.pending.baseVersion=result.version;current.status='Ожидает отправки'}
      await persistDeliveryTariffNetwork(next);
    });
    return true;
  }catch(error){
    await serializeDeliveryTariffWrite(async()=>{
      if(state.network?.deliveryTariffSync?.target!==target)return;
      const next=storageSnapshot(state.network);next.deliveryTariffSync.status='Ошибка синхронизации: '+(error.message||'нет связи');
      if(error.code==='DELIVERY_SYNC_CONFLICT')next.deliveryTariffSync.conflict=true;
      await persistDeliveryTariffNetwork(next);
    }).catch(()=>{});return false;
  }finally{
    deliveryTariffFlushBusy=false;
    if(state.network?.deliveryTariffSync?.pending?.publicationId!==job.publicationId&&!state.network?.deliveryTariffSync?.conflict)void flushDeliveryTariffs();
  }
}
async function retryDeliveryTariffs(){
  if(!canEditCompanySettings()){flash('Только администратор может публиковать тарифы');return false}
  if(deliveryTariffFlushBusy){flash('Дождитесь завершения отправки');return false}
  try{
    const sync=state.network?.deliveryTariffSync;
    if(!sync||sync.conflict||sync.target!==deliveryTariffTarget()){
      const server=await deliveryTariffRequest('GET');
      if(server.published&&!confirm('На сервере опубликованы тарифы. Заменить их текущим списком этого планшета?'))return false;
      await serializeDeliveryTariffWrite(async()=>{
        const next=storageSnapshot(state.network);next.deliveryTariffSync={target:deliveryTariffTarget(),version:server.version,status:'Ожидает отправки',pending:{publicationId:uid(),baseVersion:server.version,tariffs:deliveryTariffList()}};
        await persistDeliveryTariffNetwork(next);
      });
    }else if(!sync.pending){
      await saveDeliveryTariffList(rates=>rates);
    }
    return await flushDeliveryTariffs();
  }catch(error){flash(error.message||'Не удалось отправить тарифы');return false}
}
async function initializeDeliveryTariffs(){
  if(!state.network?.deliveryTariffSync){try{await saveDeliveryTariffList(rates=>rates)}catch{return}}
  const initial=state.network?.deliveryTariffSync;
  if(initial&&!initial.pending&&initial.target===deliveryTariffTarget()){
    // An acknowledged version in a restored backup is not proof of current sync.
    try{
      const server=await deliveryTariffRequest('GET');
      await serializeDeliveryTariffWrite(async()=>{
        const next=storageSnapshot(state.network),current=next.deliveryTariffSync;
        if(current.pending||current.version!==initial.version||current.target!==initial.target)return;
        if(server.version!==current.version||!Array.isArray(server.tariffs)||server.tariffs.length!==state.deliveryRates.length||server.tariffs.some((rate,index)=>{const local=deliveryTariffList()[index];return rate.id!==local.id||rate.name!==local.name||Number(rate.amount)!==Number(local.amount)})){
          current.pending={publicationId:uid(),baseVersion:current.version,tariffs:deliveryTariffList()};current.conflict=true;current.status='Версия на сервере отличается. Проверьте тарифы и подтвердите публикацию';
        }else current.status='Синхронизировано';
        await persistDeliveryTariffNetwork(next);
      });
    }catch{
      await serializeDeliveryTariffWrite(async()=>{
        const next=storageSnapshot(state.network);if(!next.deliveryTariffSync.pending){next.deliveryTariffSync.status='Проверка синхронизации недоступна. Повторите после восстановления связи';await persistDeliveryTariffNetwork(next)}
      }).catch(()=>{});
    }
  }
  // A restored backup may contain an older revision. Never rebase it silently.
  void flushDeliveryTariffs();
}
window.addEventListener('online',()=>{void flushDeliveryTariffs()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flushDeliveryTariffs()});

function deliveryTariffSnapshotValid(snapshot,fee){
  return snapshot&&typeof snapshot.id==='string'&&snapshot.id.length>0&&typeof snapshot.name==='string'&&snapshot.name.length>0&&Number.isFinite(Number(snapshot.amount))&&Number(snapshot.amount)>=0&&Number(snapshot.amount)===Number(fee);
}
