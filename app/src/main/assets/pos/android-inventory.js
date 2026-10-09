/* Android inventory concurrency and cancellation audit. Warehouse authority stays in JS. */
(function(global){
  'use strict';
  const revisionKey='_androidStockRevision',baselineKey='_androidCountBaseline';
  function revision(p){const n=Number(p?.[revisionKey]);return Number.isSafeInteger(n)&&n>=0?n:0}
  function stockIdentity(p){return JSON.stringify([p?.type,stockUnit(p),!!p?.noStockTracking,Number(p?.stock)])}
  function storedProducts(){
    const raw=global.localStorage.getItem(LS_PREFIX+'products');
    if(raw===null)return [];
    const value=JSON.parse(raw);if(!Array.isArray(value))throw new Error('Повреждён каталог товаров');return value;
  }
  // Called by the common write boundary before making the journal snapshot.
  // Replay writes the recorded revision unchanged; it never increments twice.
  global.__androidPrepareStorageWrites=function(type,writes){
    const prepared={...writes};
    if(Object.prototype.hasOwnProperty.call(writes,'products')){
      if(!Array.isArray(writes.products))throw new Error('Некорректный каталог товаров');
      let previousProducts;
      try{previousProducts=storedProducts()}catch(error){if(type!=='backup-import')throw error;previousProducts=[]}
      const old=new Map(previousProducts.map(p=>[p.id,p]));
      prepared.products=writes.products.map(p=>{
        const previous=old.get(p.id),nextRevision=revision(previous)+(previous&&stockIdentity(previous)===stockIdentity(p)?0:1);
        if(!Number.isSafeInteger(nextRevision))throw new Error('Исчерпана версия складского остатка');
        return {...p,[revisionKey]:nextRevision};
      });
    }
    if(type==='backup-import'&&writes.inventoryDraft){
      prepared.inventoryDraft=storageSnapshot(writes.inventoryDraft);
      for(const item of prepared.inventoryDraft.items||[])if(!item.fixedAt)delete item[baselineKey];
    }
    return prepared;
  };
  function countBaseline(p){
    const persisted=storedProducts().find(x=>x.id===p.id);
    return {identity:stockIdentity(p),revision:revision(persisted),runtime:runtimeToken};
  }
  // Require a fresh physical count after restart/import as well as stock changes.
  // A baseline from an old tablet session must never authorize an old count.
  const runtimeToken=uid();
  const start=global.startInventory;
  global.startInventory=function(){if(state.inventoryDraft){global.flash('Сначала завершите или отмените текущую инвентаризацию');return false}return start.apply(this,arguments)};
  const updateActual=global.updateInventoryActual;
  global.updateInventoryActual=function(id,value){
    const item=state.inventoryDraft?.items.find(x=>x.productId===id),p=getProduct(id);
    if(!item||item.fixedAt)return;
    if(!productTracksStock(p)){global.flash('Для товара недоступен учёт остатков');return false}
    const text=String(value??'').trim(),quantity=Number(text.replace(',','.'));
    if(!text||!Number.isFinite(quantity)||quantity<0){item.actual=null;delete item[baselineKey];return global.saveKey('inventoryDraft',state.inventoryDraft)}
    item[baselineKey]=countBaseline(p);
    return updateActual.apply(this,arguments);
  };
  const fix=global.fixInventoryItem;
  global.fixInventoryItem=async function(id){
    const item=state.inventoryDraft?.items.find(x=>x.productId===id),p=getProduct(id);
    if(!item||item.fixedAt)return false;
    let baseline;
    try{baseline=countBaseline(p)}catch(error){global.flash('Остаток не зафиксирован: '+error.message);return false}
    const saved=item[baselineKey];
    if(!saved||saved.runtime!==baseline.runtime||saved.identity!==baseline.identity||saved.revision!==baseline.revision){
      global.flash('Остаток товара «'+(p?.name||item.name||id)+'» изменился или пересчёт устарел. Пересчитайте товар и заново введите количество перед фиксацией');return false;
    }
    return fix.apply(this,arguments);
  };
  global.requestCancelInventory=function(){
    if(!state.inventoryDraft)return;
    if(!currentShiftEmployeeIsAdmin()){global.flash('Отменить инвентаризацию может только администратор');return}
    const fixed=state.inventoryDraft.items.filter(x=>x.fixedAt).length;
    global.showModal('<div class="modal-title">Отменить инвентаризацию?</div><div class="center-note inventory-cancel-note">Незафиксированный пересчёт будет прекращён. Уже зафиксированные остатки ('+fixed+') останутся на складе и в истории. Последующие продажи и приёмки не откатываются.</div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Нет, продолжить</button><button class="btn btn-danger" onclick="confirmCancelInventory()">Да, отменить</button></div>',true);
  };
  global.confirmCancelInventory=async function(){
    if(criticalOperationBusy){global.flash('Сохранение операции ещё не завершено');return false}
    if(!currentShiftEmployeeIsAdmin()){global.flash('Отменить инвентаризацию может только администратор');return false}
    const draft=state.inventoryDraft;if(!draft)return false;
    const cancelledAt=Date.now(),history=storageSnapshot(state.inventoryHistory||[]),fixed=draft.items.filter(x=>x.fixedAt);
    history.unshift({...storageSnapshot(draft),status:'cancelled',cancelledAt,completedAt:cancelledAt,items:storageSnapshot(fixed),unfixedItems:storageSnapshot(draft.items.filter(x=>!x.fixedAt)),estimatedLoss:fixed.reduce((sum,x)=>sum+Math.max(0,-Number(x.difference||0))*(Number(getProduct(x.productId)?.cost)||0),0)});
    criticalOperationBusy=true;
    try{await global.commitCriticalStorage('inventory-cancel',{inventoryHistory:history,inventoryDraft:null})}
    catch(error){global.flash('Инвентаризация не отменена: '+error.message);return false}
    finally{criticalOperationBusy=false}
    state.inventoryHistory=history;state.inventoryDraft=null;state.tab='inventory';
    global.closeModal();global.render();global.flash('Пересчёт отменён. Зафиксированные остатки сохранены в истории');return true;
  };
  const screen=global.renderInventoryScreen;
  global.renderInventoryScreen=function(){
    const history=state.inventoryHistory||[],cancelled=history.filter(x=>x.status==='cancelled').slice(0,50);
    let result;state.inventoryHistory=history.filter(x=>x.status!=='cancelled');
    try{result=screen.apply(this,arguments)}finally{state.inventoryHistory=history}
    if(!cancelled.length)return result;
    const audit='<div class="card inventory-card-spaced"><div class="inventory-card-title">Отменённые пересчёты</div>'+cancelled.map(record=>'<div class="list-row"><div class="inventory-row-main"><div class="list-row-name">'+escapeHtml(fmtDate(record.cancelledAt))+' · Отменена</div><div class="setting-sub">Фиксации сохранены: '+record.items.length+'; не зафиксировано: '+(record.unfixedItems||[]).length+'</div>'+record.items.map(x=>'<div class="setting-sub">'+escapeHtml(x.name)+': '+escapeHtml(stockQtyText(x.expected))+' → '+escapeHtml(stockQtyText(x.actual))+' '+escapeHtml(unitLabel(x.unit))+'</div>').join('')+'</div></div>').join('')+'</div>';
    return result.replace('<div class="card"><div class="inventory-history-head">',audit+'<div class="card"><div class="inventory-history-head">');
  };
})(window);
