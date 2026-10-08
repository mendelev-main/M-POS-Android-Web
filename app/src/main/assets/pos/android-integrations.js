/* Android integration adapters. Original POS remains the storage/outbox and order authority. */
(function(global){
  'use strict';
  const busy=new Map(),telegramTests=new Map();let sequence=0,retryTimer=null,lastOperationalError=null,lastDemandNotice=null;
  function status(channel,message,kind=''){
    const id=channel==='telegram'?'telegram-status':'network-sync-status';
    setNetworkStatus(id,message,kind);
    const relevant=document.getElementById(channel==='telegram'?'telegram-token':'network-backend-url');
    const modal=relevant?.closest?.('.modal');
    if(modal){
      const modalId='android-'+channel+'-status';let node=document.getElementById(modalId);
      if(!node){node=document.createElement('div');node.id=modalId;node.className='network-status';node.setAttribute('role','status');modal.appendChild(node);}
      setNetworkStatus(modalId,message,kind);
    }
  }
  function failure(error){return error?.name==='AbortError'?'Сервер не ответил вовремя. Проверьте интернет на планшете':error?.safeMessage||'Не удалось связаться с сервером. Проверьте настройки и интернет';}
  function fail(message){const e=new Error('Integration request failed');e.safeMessage=message;return e;}
  function network(useDraft=true){
    const config=networkConfigFromState(),draft=useDraft?document.getElementById('network-backend-url'):null;
    const backendUrl=String(draft?.value??config.backendUrl??'').trim().replace(/\/+$/,'');
    let url;try{url=new URL(backendUrl)}catch(_){throw fail('Укажите корректный HTTPS адрес backend')}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw fail('Укажите HTTPS адрес backend без параметров и пароля');
    if(!config.deviceKey)throw fail('Не задан ключ устройства. Сохраните настройки backend');
    return {...config,backendUrl};
  }
  async function jsonRequest(config,path,options={},operational=false){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    if(operational)operationalController=controller;
    try{
      const response=await global.fetch(config.backendUrl+path,{...options,headers:{'X-Device-Key':config.deviceKey,...options.headers},cache:'no-store',signal:controller.signal});
      if(!response.ok){
        const message=response.status===401||response.status===403?'Backend отклонил ключ устройства. Проверьте сохранённый ключ':response.status===404?'Маршрут проверки отсутствует на сервере':`Backend вернул HTTP ${response.status}`;
        throw fail(message);
      }
      const data=await response.json();if(!data||typeof data!=='object')throw fail('Backend вернул некорректный ответ');return data;
    }finally{clearTimeout(timer);if(operational&&operationalController===controller)operationalController=null}
  }
  function test(channel,task){
    if(!currentShiftEmployeeIsAdmin()){flash('Сетевые конфигурации доступны только администратору');return Promise.resolve(false)}
    if(busy.has(channel))return busy.get(channel);
    status(channel,'Проверяем подключение…');
    const promise=Promise.resolve().then(task).then(message=>{status(channel,message,'ok');flash(message);return true},error=>{const message=failure(error);status(channel,message,'error');flash(message);return false}).finally(()=>busy.delete(channel));
    busy.set(channel,promise);return promise;
  }
  global.testBackendConnection=()=>test('backend',async()=>{
    if(document.getElementById('network-backend-url')&&!saveNetworkSettings())throw fail('Не удалось сохранить настройки backend');
    const config=network();await global.PrilavokCore.Storage.set('network',state.network);const health=await jsonRequest(config,'/health');if(health.ok!==true)throw fail('Backend не подтвердил готовность');
    await jsonRequest(config,'/api/operational/state');
    startWebOrderEvents();operationalReconnect();return 'Backend подключён, ключ устройства принят';
  });
  global.testWebOrder=()=>test('backend',async()=>{
    const config=network();await jsonRequest(config,'/api/operational/state');
    // Probe the real SSE route without accepting/persisting its order data.
    const source=new global.EventSource(config.backendUrl+'/api/orders/events?deviceKey='+encodeURIComponent(config.deviceKey));
    await new Promise((resolve,reject)=>{
      let settled=false;const timeout=setTimeout(()=>finish(fail('Канал заказов не ответил вовремя')),10000);
      function finish(error){if(settled)return;settled=true;clearTimeout(timeout);source.close();error?reject(error):resolve()}
      source.onopen=()=>finish();source.onerror=()=>finish(fail('Не удалось открыть канал заказов. Проверьте ключ устройства'));
    });return 'Канал заказов с сайта работает. Проверка без создания заказа';
  });
  const openBackend=global.openBackendSettings;
  global.openBackendSettings=function(...args){const result=openBackend.apply(this,args);const button=document.querySelector('[onclick="testWebOrder()"]');if(button)button.textContent='Проверить канал заказов';return result};
  global.__mposTelegramTestProgress=result=>{if(telegramTests.has(result?.requestId))status('telegram',result.message||'Подключаемся к Telegram API…')};
  global.__mposTelegramTestResult=result=>telegramTests.get(result?.requestId)?.(result);
  global.testTelegramConnection=()=>test('telegram',async()=>{
    const config=telegramConfigFromState();
    const field=(id,key)=>String(document.getElementById(id)?.value??config[key]??'').trim();
    const botToken=field('telegram-token','botToken'),chatId=field('telegram-chat-id','chatId'),threadId=field('telegram-thread-id','threadId');
    if(!botToken)throw fail('Введите токен бота');if(!chatId)throw fail('Введите ID рабочей группы');
    if(threadId&&!/^[1-9]\d*$/.test(threadId))throw fail('Укажите положительный ID темы или оставьте его пустым');
    const requestId='telegram-test-'+(++sequence);
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>finish({ok:false,message:'Telegram не ответил вовремя. Проверьте доступ с планшета'}),35000);
      function finish(result){telegramTests.delete(requestId);clearTimeout(timeout);result.ok?resolve(result.message||'Telegram подключён'):reject(fail(result.message||'Telegram отклонил проверку'))}
      telegramTests.set(requestId,finish);
      try{const handler=global.webkit?.messageHandlers?.telegram;if(!handler||handler.postMessage({action:'test',requestId,botToken,chatId,threadId})===false)finish({ok:false,message:'Android Telegram transport недоступен'})}
      catch(_){finish({ok:false,message:'Не удалось запустить проверку Telegram'})}
    });
  });
  const queueSnapshot=global.queueOperationalSnapshot;
  global.queueOperationalSnapshot=function(now=Date.now()){
    // Shared/imported device keys may already have a higher server revision than a fresh APK.
    state.operationalRevision=Math.max(Number(state.operationalRevision)||0,Math.floor(now)-1);
    return queueSnapshot(now);
  };
  global.sendOperationalItem=async function(item){
    try{
    const config=network(false);
    // Upgrade persisted pre-adapter counters too; retain the queued demand payload.
    if(Number(item.payload?.revision)<1000000000000){state.operationalRevision=Math.max(Number(state.operationalRevision)||0,Date.now());item.payload.revision=state.operationalRevision;}
    // Complete local outbox persistence before the external effect.
    await global.PrilavokCore.Storage.set('operationalRevision',state.operationalRevision);
    await global.PrilavokCore.Storage.set('operationalOutbox',state.operationalOutbox);
    const reply=await jsonRequest(config,'/api/operational/snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.payload)},true);
    if(reply.ok!==true||reply.applied!==true||reply.ignoredAsStale===true)throw fail('Сервер не принял состояние загрузки: устаревшая ревизия. Проверьте дату планшета и повторите переключение');
    lastOperationalError=null;return true;
    }catch(error){lastOperationalError=failure(error);throw error}
  };
  const flush=global.flushOperationalOutbox;
  global.flushOperationalOutbox=async function(...args){
    const hadPending=(state.operationalOutbox||[]).some(x=>x.type==='snapshot'),alreadyBusy=operationalBusy;const ok=await flush.apply(this,args);if(alreadyBusy)return ok;
    clearTimeout(retryTimer);retryTimer=null;
    if(!state.loaded||document.hidden||global._availabilityAppActive===false||storageBroken)return ok;
    const pending=(state.operationalOutbox||[]).find(x=>x.type==='snapshot');
    if(pending){
      const message=lastOperationalError||'Загрузка сохранена на планшете; отправка на сайт ожидает повтора';
      status('backend',message,'error');
      if(hadPending&&lastDemandNotice!==message){flash(message);lastDemandNotice=message;}
      const delay=Math.max(1000,(Number(pending.nextAttemptAt)||Date.now())-Date.now());
      retryTimer=setTimeout(()=>{retryTimer=null;void global.flushOperationalOutbox()},Math.min(60000,delay));
    }else if(ok&&hadPending){const message='Состояние загрузки передано на сайт';status('backend',message,'ok');flash(message);lastDemandNotice=null;}
    return ok;
  };
})(window);
