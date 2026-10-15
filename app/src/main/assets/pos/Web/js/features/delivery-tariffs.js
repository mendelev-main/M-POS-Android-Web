/* Delivery settings stay local until the network synchronization button is pressed. */
let deliveryTariffFlushBusy=false,deliveryTariffLocalChain=Promise.resolve();
function serializeDeliveryTariffWrite(task){
  const next=deliveryTariffLocalChain.then(task,task);deliveryTariffLocalChain=next.catch(()=>{});return next;
}
function deliveryTariffTarget(){const n=networkConfigFromState();return String(n.backendUrl||'').replace(/\/+$/,'')+'|'+String(n.deviceKey||'')}
function deliveryTariffList(rates=state.deliveryRates){return rates.map(r=>({id:String(r.id),name:String(r.name).trim(),amount:Number(r.amount).toFixed(2)}))}
function deliveryTariffStatus(){return state.network?.deliveryTariffSync?.status||'Тарифы ещё не отправлены. Нажмите «Синхронизация с бэкендом» в сетевых настройках'}
function refreshDeliveryTariffStatus(){const element=document.getElementById('delivery-tariff-sync-status');if(element)element.textContent=deliveryTariffStatus()}
async function persistDeliveryTariffNetwork(next){
  await window.PrilavokCore.Storage.set('network',next);state.network=next;refreshDeliveryTariffStatus();
}
async function saveDeliveryTariffList(makeRates){
  return serializeDeliveryTariffWrite(async()=>{
    if(storageBroken||criticalStorageRecoveryPending)throw new Error('Хранилище недоступно; изменения тарифов не сохранены');
    const rates=makeRates(storageSnapshot(state.deliveryRates)),network=storageSnapshot(state.network),previous=network.deliveryTariffSync;
    const target=deliveryTariffTarget(),version=previous?.target===target?Number(previous.version||0):0;
    network.deliveryTariffSync={target,version,status:'Есть изменения. Нажмите «Синхронизация с бэкендом» в сетевых настройках',pending:null,dirty:true};
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
async function retryDeliveryTariffs(){
  if(!canEditCompanySettings()){flash('Только администратор может публиковать тарифы');return false}
  if(deliveryTariffFlushBusy){flash('Дождитесь завершения отправки тарифов');return false}
  if(!state.loaded||storageBroken||criticalStorageRecoveryPending)return false;
  deliveryTariffFlushBusy=true;const target=deliveryTariffTarget();
  try{
    // Read the current version only after the user's explicit synchronization action.
    const server=await deliveryTariffRequest('GET');
    if(!Number.isSafeInteger(server.version)||server.version<0)throw new Error('Сервер вернул некорректную версию тарифов');
    let job;
    await serializeDeliveryTariffWrite(async()=>{
      if(target!==deliveryTariffTarget())throw new Error('Настройки подключения изменились. Повторите синхронизацию');
      job={publicationId:uid(),baseVersion:server.version,tariffs:deliveryTariffList()};
      const next=storageSnapshot(state.network);next.deliveryTariffSync={target,version:server.version,status:'Отправка тарифов…',pending:job,dirty:true};
      await persistDeliveryTariffNetwork(next);
    });
    const result=await deliveryTariffRequest('PUT',job);
    if(result.ok!==true||!Number.isSafeInteger(result.version))throw new Error('Сервер не подтвердил публикацию тарифов');
    await serializeDeliveryTariffWrite(async()=>{
      if(target!==deliveryTariffTarget())throw new Error('Настройки подключения изменились. Повторите синхронизацию');
      const next=storageSnapshot(state.network),dirty=JSON.stringify(deliveryTariffList())!==JSON.stringify(job.tariffs);
      next.deliveryTariffSync={target,version:result.version,pending:null,dirty,status:dirty?'Есть изменения. Повторите синхронизацию с бэкендом':'Синхронизировано'};
      await persistDeliveryTariffNetwork(next);
    });
    return !state.network.deliveryTariffSync.dirty;
  }catch(error){
    await serializeDeliveryTariffWrite(async()=>{
      if(target!==deliveryTariffTarget())return;
      const next=storageSnapshot(state.network),previous=next.deliveryTariffSync;
      next.deliveryTariffSync={target,version:previous?.version||0,pending:null,dirty:true,status:'Ошибка синхронизации тарифов: '+(error.message||'нет связи')+'. Повторите синхронизацию с бэкендом'};
      await persistDeliveryTariffNetwork(next);
    }).catch(()=>{});return false;
  }finally{deliveryTariffFlushBusy=false}
}
async function initializeDeliveryTariffs(){
  // Older app versions queued automatic publications. Never send those on upgrade/restore.
  return serializeDeliveryTariffWrite(async()=>{
    const sync=state.network?.deliveryTariffSync;
    if(sync&&!sync.pending&&!sync.conflict&&sync.target===deliveryTariffTarget())return;
    const next=storageSnapshot(state.network);
    next.deliveryTariffSync={target:deliveryTariffTarget(),version:sync?.target===deliveryTariffTarget()?Number(sync.version||0):0,pending:null,dirty:true,status:'Нажмите «Синхронизация с бэкендом» в сетевых настройках для отправки тарифов'};
    await persistDeliveryTariffNetwork(next);
  }).catch(()=>{});
}

function deliveryTariffSnapshotValid(snapshot,fee){
  return snapshot&&typeof snapshot.id==='string'&&snapshot.id.length>0&&typeof snapshot.name==='string'&&snapshot.name.length>0&&Number.isFinite(Number(snapshot.amount))&&Number(snapshot.amount)>=0&&Number(snapshot.amount)===Number(fee);
}
