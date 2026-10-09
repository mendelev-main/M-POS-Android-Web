/* Android runtime safety: preserve the single upstream journal and source transaction snapshots. */
(function(global){
  'use strict';
  const core=global.PrilavokCore,originalStorage=core.Storage;
  // Android uses synchronous localStorage. Keep a whole journal in one JS turn;
  // an awaited source caller still publishes its state only after this completes.
  if(originalStorage.describe().mode!=='localStorage')throw new Error('Android требует локальное хранилище');
  let committing=false,recovering=false,importing=false,importRender=false,stage=null;
  function blocked(message){const error=new Error(message);error.mposWriteBlocked=true;return error}
  function assertWritable(restore=false,financial=false,backupOwner=false){
    if(committing||recovering||(importing&&!backupOwner)||(!financial&&criticalOperationBusy))throw blocked('Выполняется сохранение другой операции. Дождитесь завершения и повторите действие');
    if(criticalStorageRecoveryPending)throw blocked('Незавершённая операция хранения. Перезапустите M POS для восстановления данных');
    if(storageBroken&&!restore)throw blocked('Хранилище недоступно или повреждено. Перезапустите приложение или восстановите проверенную копию');
  }
  const markBroken=global.markStorageBroken;
  global.markStorageBroken=function(reason){if(!reason?.mposWriteBlocked)markBroken(reason)};
  function rawWrite(key,value){
    const serialized=JSON.stringify(value);if(serialized===undefined)throw new Error('Некорректное значение хранилища');
    global.localStorage.setItem(LS_PREFIX+key,serialized);
  }
  function journalWrite(type,writes,restore=false){
    assertWritable(restore,true,type==='backup-import'&&importing);
    if(type==='backup-import'&&criticalOperationBusy)throw blocked('Выполняется сохранение другой операции. Дождитесь завершения и повторите действие');
    const prepared=typeof global.__androidPrepareStorageWrites==='function'?global.__androidPrepareStorageWrites(type,writes):writes;
    const entries=criticalStorageWrites(prepared);
    const journal={version:1,id:uid(),type:String(type||'critical'),createdAt:Date.now(),writes:entries};
    committing=true;
    try{
      try{rawWrite(CRITICAL_STORAGE_JOURNAL_KEY,journal)}
      catch(error){markBroken(error);throw new Error('Не удалось начать безопасное сохранение: '+(error?.message||error))}
      criticalStorageRecoveryPending=true;
      try{
        for(const entry of entries)rawWrite(entry.key,entry.value);
        rawWrite(CRITICAL_STORAGE_JOURNAL_KEY,null);criticalStorageRecoveryPending=false;
      }catch(error){markBroken(error);throw new Error('Операция сохранена для восстановления. Перезапустите M POS: '+(error?.message||error))}
    }finally{committing=false}
  }
  global.commitCriticalStorage=async function(type,writes){journalWrite(type,writes,type==='backup-import')};
  global.recoverCriticalStorageJournal=async function(){
    if(committing||recovering||importing||criticalOperationBusy)return false;
    recovering=true;
    try{
      const raw=global.localStorage.getItem(LS_PREFIX+CRITICAL_STORAGE_JOURNAL_KEY),journal=raw===null?null:JSON.parse(raw);
      if(journal===null){criticalStorageRecoveryPending=false;return true}
      criticalStorageRecoveryPending=true;
      if(journal?.version!==1||!Array.isArray(journal.writes)||!journal.writes.length)throw new Error('Повреждён журнал критической операции');
      const keys=new Set();
      for(const entry of journal.writes){
        if(!entry||!CRITICAL_STORAGE_KEYS.has(entry.key)||keys.has(entry.key)||!Object.prototype.hasOwnProperty.call(entry,'value')||JSON.stringify(entry.value)===undefined)throw new Error('Недопустимый ключ или значение в журнале критической операции');
        keys.add(entry.key);
      }
      for(const entry of journal.writes)rawWrite(entry.key,entry.value);
      rawWrite(CRITICAL_STORAGE_JOURNAL_KEY,null);criticalStorageRecoveryPending=false;return true;
    }catch(error){criticalStorageRecoveryPending=true;markBroken(error);return false}
    finally{recovering=false}
  };
  function write(key,value){
    assertWritable();
    if(typeof key!=='string'||!key)throw new Error('Некорректный ключ хранилища');
    if(key===CRITICAL_STORAGE_JOURNAL_KEY)throw blocked('Журнал изменяется только механизмом восстановления');
    if(stage){
      if(!CRITICAL_STORAGE_KEYS.has(key))throw new Error('Неподдерживаемый ключ связанного сохранения');
      stage.writes[key]=storageSnapshot(value);return;
    }
    try{const prepared=typeof global.__androidPrepareStorageWrites==='function'?global.__androidPrepareStorageWrites('ordinary',{[key]:value}):{[key]:value};rawWrite(key,prepared[key])}catch(error){markBroken(error);throw error}
  }
  core.Storage=Object.freeze({...originalStorage,
    set(key,value){try{write(key,value);return Promise.resolve()}catch(error){return Promise.reject(error)}},
    remove(key){assertWritable();if(key===CRITICAL_STORAGE_JOURNAL_KEY)throw blocked('Нельзя удалить незавершённый журнал');return originalStorage.remove(key)}
  });
  // Unlike the upstream fire-and-forget facade, this acknowledges synchronously
  // or throws. Source synchronous handlers are wrapped below so success UI cannot
  // run before their entire set of related documents is committed.
  global.saveKey=function(key,value){
    // Startup may inspect damaged data, but its compatibility defaults must never
    // overwrite that data. Let it finish in read-only mode with the source warning.
    if(!state.loaded&&(storageBroken||criticalStorageRecoveryPending))return Promise.resolve(false);
    try{write(key,value);return Promise.resolve()}
    catch(error){if(!state.loaded&&!stage)return Promise.resolve(false);throw error}
  };
  global.saveCurrentOrderSession=function(){return global.saveKey('currentOrderSession',currentOrderSessionSnapshot())};
  global.clearCurrentOrderSession=function(){return global.saveKey('currentOrderSession',emptyCurrentOrderSession())};
  const cartKeys=['cart','orderLabel','orderType','deliveryFee','deliveryTariffSelected','customer','loyaltyPrograms','loyaltyRedemptions','loyaltyCustomerId','loyaltyLoadingCustomerId','loyaltyLoadError','orderComment','currentOrderSource','currentWebOrderId','currentWebOrderStatus','_splitPayments','_splitCount','_splitPaymentTotalCents'];
  const catalogueKeys=['products','posNavigation','layoutTiles','categoryOrder','categoryColors','categorySymbols','categoryOnlineOrder','categoryOnlineMenu'];
  const uiKeys=['tab','selectedHallTableId','posFolder','posPath'];
  function snapshot(keys){
    return keys.map(key=>({key,present:Object.prototype.hasOwnProperty.call(state,key),value:state[key]===undefined?undefined:storageSnapshot(state[key])}));
  }
  function restore(before){
    for(const item of before){if(item.present)state[item.key]=item.value;else delete state[item.key]}
    if(before.some(item=>item.key==='categoryOnlineOrder'))state.categoryOnline=state.categoryOnlineOrder;
  }
  // Effects are postponed only while a synchronous source handler builds its
  // candidate state. The scope never spans an await or a browser event turn.
  const effectNames=['render','closeModal','showModal','openOrderSettings','finishProductEditor','publishAvailability','flushOperationalOutbox','startWebOrderEvents'];
  function atomicHandler(name,keys){
    const original=global[name];if(typeof original!=='function')return;
    global[name]=function(...args){
      if(stage)return original.apply(this,args);
      try{assertWritable()}catch(error){global.flash(error.message);return false}
      const before=snapshot([...new Set([...keys,...uiKeys])]);
      const printed={kitchen:global.__currentOrderKitchenPrinted,items:global.__currentOrderPrintedItems};
      const effects=[],saved=new Map();let notice=global.flash;
      stage={writes:{}};
      for(const effect of [...effectNames,'flash']){
        if(typeof global[effect]!=='function')continue;
        const fn=global[effect];saved.set(effect,fn);global[effect]=function(...values){effects.push(()=>fn.apply(this,values));return ['publishAvailability','flushOperationalOutbox'].includes(effect)?Promise.resolve(false):undefined};
      }
      let result,writes,error;
      try{result=original.apply(this,args);writes=stage.writes}
      catch(failure){error=failure}
      finally{stage=null;for(const [effect,fn] of saved)global[effect]=fn}
      if(!error&&Object.keys(writes||{}).length){try{journalWrite('android-'+name,writes)}catch(failure){error=failure}}
      if(error){
        restore(before);global.__currentOrderKitchenPrinted=printed.kitchen;global.__currentOrderPrintedItems=printed.items;
        if(keys.includes('theme'))global.applyTheme?.();
        notice('Изменения не подтверждены: '+(error?.message||error));return false;
      }
      let effectFailed=false;
      for(const effect of effects){try{effect()}catch(failure){effectFailed=true}}
      if(effectFailed)notice('Изменения сохранены. Не удалось обновить экран или отправить данные; перезапустите приложение');
      return result;
    };
  }
  for(const name of ['addConfiguredCartItem','changeQty','removeFromCart','saveCartItemOptions','setOrderType','selectDeliveryFee','saveOrderSettings','setLoyaltyRedemption','removeOrderCustomer'])atomicHandler(name,cartKeys);
  for(const name of ['saveCategory','toggleCategoryChannel','confirmDelete','toggleProductOnline','addLayoutTile','removeLayoutTile','onLayoutPointerUp','syncCategoryOrder'])atomicHandler(name,catalogueKeys);
  for(const name of ['saveInventorySettings','startInventory','updateInventoryActual','pauseInventory'])atomicHandler(name,['inventoryConfig','inventoryDraft']);
  for(const name of ['createHallTable','confirmDeleteHallTable','rotateHallTable','saveHallTableEdits','saveNewBooking','cancelBooking','saveEditedBooking','hallPointerEnd'])atomicHandler(name,['hallTables','bookings']);
  for(const [name,keys] of [['setTheme',['theme']],['setDemandOverload',['demandOverload','operationalOutbox','operationalRevision']],['saveNetworkSettings',['network']],['saveCompanySettings',['company']],['savePrinterSettings',['printer']],['saveDeliveryRate',['deliveryRates']],['deleteDeliveryRate',['deliveryRates']],['saveDiscount',['discounts']],['deleteDiscount',['discounts']]])atomicHandler(name,keys);
  // Async editors already publish their snapshots after await Storage.set. Deny
  // entry before they alter UI/drafts; the Storage facade also rechecks after await.
  for(const name of ['saveProduct','confirmProductImport','saveEmployee','confirmDeleteEmployee','confirmDeleteSupplier','saveSupplier','updatePosNavigation','openReceivingDocument','saveReceivingDraft','acceptWebOrder','saveLegacyWebReadyEstimate','markCurrentWebOrderReady','saveTelegramSettings']){
    const original=global[name];if(typeof original!=='function')continue;
    global[name]=async function(...args){try{assertWritable()}catch(error){global.flash(error.message);return false}return original.apply(this,args)};
  }
  const applyBackup=global.applyBackupData;
  global.applyBackupData=async function(...args){
    assertWritable(true);importing=true;let success=false;
    try{const result=await applyBackup.apply(this,args);success=true;return result}
    finally{importing=false;const requested=importRender;importRender=false;if(success&&requested)global.render()}
  };
  const render=global.render;let ready=false;
  global.render=function(...args){
    if(importing){importRender=true;return;}
    const result=render.apply(this,args);
    if(state.loaded&&!ready){
      global.requestAnimationFrame(()=>global.requestAnimationFrame(()=>{
        if(ready)return;
        const handler=global.webkit?.messageHandlers?.startup;
        if(handler&&handler.postMessage({action:'ready'})!==false)ready=true;
      }));
    }
    return result;
  };
})(window);
