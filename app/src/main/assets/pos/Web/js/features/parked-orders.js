/* ---- Park (save receipt for later) ---- */
function kitchenPrintLineKey(item){
  return item?.cartLineId || [item?.productId||'', modifierSelectionSignature(item?.selectedModifiers||[]), item?.comment||''].join('|');
}
function kitchenPrintedSnapshot(items){
  return (items||[]).map(i=>({key:kitchenPrintLineKey(i),qty:Number(i.qty)||0}));
}
function kitchenPrintDelta(items,printedItems){
  const printed=new Map((printedItems||[]).map(x=>[String(x.key||''),Number(x.qty)||0]));
  return (items||[]).map(i=>{
    const qty=Number(i.qty)||0, previous=printed.get(kitchenPrintLineKey(i))||0, delta=qty-previous;
    return delta>0.0001 ? {...JSON.parse(JSON.stringify(i)),qty:delta} : null;
  }).filter(Boolean);
}
function parkOrder(){
  if(!state.cart.length) return;
  if(!String(state.orderLabel||'').trim()){
    showModal(`
      <div class="modal-title">Подпись чека</div>
      <div class="settings-note park-order-note">Добавьте подпись, чтобы потом было проще найти этот чек в отложенных.</div>
      <div class="field">
        <label>Подпись</label>
        <input id="park-order-label" type="text" placeholder="Например: Стол 4 или Александр" autocomplete="off" onkeydown="if(event.key==='Enter')confirmParkOrderLabel()">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="confirmParkOrderLabel()">Отложить</button>
      </div>`);
    setTimeout(()=>document.getElementById('park-order-label')?.focus(),50);
    return;
  }
  parkOrderNow();
}
async function confirmParkOrderLabel(){
  const input=document.getElementById('park-order-label');
  const label=String(input?.value||'').trim();
  if(!label){flash('Введите подпись чека');input?.focus();return;}
  state.orderLabel=label;
  if(await parkOrderNow())closeModal();
}
async function parkOrderNow(){
  if(!state.cart.length)return false;
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
  const shift=currentShift(), employee=state.employees.find(e=>e.id===shift?.employeeId);
  const parked = {
    id:uid(), receiptDisplayNumber:'#'+(state.parked.length+1),
    items: state.cart.map(i=>{const product=getProduct(i.productId);return {...JSON.parse(JSON.stringify(i)),category:product?.category||i.category||''}}),
    total:cartTotal(), subtotal:cartSubtotal(), deliveryTariffSelected:!!state.deliveryTariffSelected,deliveryTariff:storageSnapshot(state.deliveryTariff||null), deliveryFee:state.orderType==='Доставка'?Number(state.deliveryFee||0):0,
    orderLabel:state.orderLabel, orderType:state.orderType, customer:JSON.parse(JSON.stringify(state.customer)),
    comment:state.orderComment||'', source:state.currentOrderSource||'', webOrderId:state.currentWebOrderId||'', webOrderStatus:state.currentWebOrderStatus||'',
    employeeName:employee?.name||employee?.fullName||'Сотрудник',registerName:'POS 1',timestamp:Date.now(),createdAt:Number(state.currentOrderCreatedAt)||Date.now(),kitchenPrinted:!!window.__currentOrderKitchenPrinted,
    printedItems:JSON.parse(JSON.stringify(window.__currentOrderPrintedItems||[]))
  };
  const deltaItems=kitchenPrintDelta(parked.items,parked.printedItems);
  const shouldPrint=deltaItems.length && typeof window.printKitchenOrderNow==='function';
  const nextParked=storageSnapshot(state.parked);nextParked.push(parked);
  criticalOperationBusy=true;
  try{await commitCriticalStorage('park-order',{parked:nextParked,currentOrderSession:emptyCurrentOrderSession()})}
  catch(e){criticalOperationBusy=false;flash('Чек не отложен: '+(e?.message||e));return false}
  state.parked=nextParked;
  resetCurrentOrderState();
  let printWarning='';
  if(shouldPrint){
    try{
      window.printKitchenOrderNow({...parked,items:deltaItems});
      const printedParked=storageSnapshot(state.parked),printed=printedParked.find(x=>x.id===parked.id);
      printed.kitchenPrinted=true;printed.printedItems=kitchenPrintedSnapshot(printed.items);
      await commitCriticalStorage('park-order-print-state',{parked:printedParked});
      state.parked=printedParked;
    }catch(e){printWarning='Чек отложен, но статус печати кухни не сохранён: '+(e?.message||e)}
  }
  criticalOperationBusy=false;
  render();flash(printWarning||'Чек отложен');
  return true;
}
function parkedOrderTypeBadge(orderType){
  const type=orderType||'На месте';
  const variant=type==='С собой'?'takeaway':type==='Доставка'?'delivery':'dinein';
  const paths=variant==='takeaway'?'<path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>':variant==='delivery'?'<path d="M3 6h11v12H3zM14 10h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>':'<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 2-5 7-1 9h1"/>';
  return `<span class="parked-type-badge parked-type-${variant}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>${escapeHtml(type)}</span>`;
}
function openParkedModal(){
  const list=state.parked.slice().sort((a,b)=>b.createdAt-a.createdAt);
  showModal(`<div class="parked-modal-header"><div class="modal-title">Отложенные чеки</div><button class="parked-modal-close" aria-label="Закрыть отложенные чеки" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    <!-- parked-order-warnings -->
    <div class="parked-orders-list">${list.length?list.map(o=>`
    <article class="parked-order-card ${o.webOrderId?'parked-web-order':''}">
      <button class="parked-order-tile" onclick="resumeParked('${escapeAttr(o.id)}')" aria-label="Открыть чек ${escapeAttr(o.orderLabel||'Без подписи')}">
        <div class="parked-order-heading"><span class="parked-order-name">${escapeHtml(o.orderLabel||'Без подписи')}</span>${parkedOrderTypeBadge(o.orderType)}</div>
        <div class="parked-order-total">${fullMoney(o.total)}</div>
        <div class="parked-order-date">${fmtDate(o.createdAt||o.timestamp)}</div>
      </button>
      ${typeof window.parkedWebReadyMarkup==='function'?window.parkedWebReadyMarkup(o):''}
      <button class="parked-order-delete" aria-label="Удалить отложенный заказ" title="Удалить отложенный заказ" onclick="requestDeleteParkedOrder('${escapeAttr(o.id)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg></button>
    </article>`).join(''):'<div class="parked-empty"><div class="parked-empty-title">Нет отложенных чеков</div><div>Нажмите «Отложить» в текущем заказе, чтобы сохранить чек и вернуться к нему позже.</div></div>'}</div>`,true);
  document.querySelector?.('#modal-root .modal')?.classList?.add('parked-orders-modal');
}

async function resumeParked(id){
  if(state.cart.length){flash('Сначала завершите текущий заказ');return false;}
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
  const o=state.parked.find(x=>x.id===id);if(!o)return false;
  const items=storageSnapshot(o.items||[]),customer=Object.assign({name:'',phone:'',address:''},storageSnapshot(o.customer||{}));
  const printedItems=Array.isArray(o.printedItems)?storageSnapshot(o.printedItems):(o.kitchenPrinted?kitchenPrintedSnapshot(o.items):[]);
  const session={items,createdAt:Number(o.createdAt||o.timestamp)||Date.now(),orderLabel:o.orderLabel||'',orderType:o.orderType||'На месте',customer,deliveryFee:Number(o.deliveryFee||0),deliveryTariffSelected:o.deliveryTariffSelected===true,deliveryTariff:storageSnapshot(o.deliveryTariff||null),orderComment:o.comment||'',source:o.source||'',webOrderId:o.webOrderId||'',webOrderStatus:o.webOrderStatus||'',kitchenPrinted:!!o.kitchenPrinted,printedItems,updatedAt:Date.now()};
  const nextParked=state.parked.filter(x=>x.id!==id).map(storageSnapshot);
  criticalOperationBusy=true;
  try{await commitCriticalStorage('resume-parked',{currentOrderSession:session,parked:nextParked})}
  catch(e){flash('Чек не открыт: '+(e?.message||e));return false}
  finally{criticalOperationBusy=false}
  state.cart=items;state.currentOrderCreatedAt=session.createdAt;state.orderLabel=session.orderLabel;state.orderType=session.orderType;
  state.loyaltyPrograms=[];state.loyaltyRedemptions={};state.customer=customer;
  state.deliveryFee=session.deliveryFee;state.deliveryTariffSelected=session.deliveryTariffSelected;state.deliveryTariff=session.deliveryTariff||null;
  state.orderComment=session.orderComment;state.currentOrderSource=session.source;state.currentWebOrderId=session.webOrderId;state.currentWebOrderStatus=session.webOrderStatus;
  window.__currentOrderKitchenPrinted=session.kitchenPrinted;window.__currentOrderPrintedItems=printedItems;
  state.parked=nextParked;
  closeModal(); render();
  if(state.customer?.id){
    const selectedCustomer=state.customer;
    void loadCustomerLoyalty(selectedCustomer.id).catch(()=>{
      if(state.customer===selectedCustomer)flash('Клиент привязан. Программа лояльности временно недоступна');
    });
  }
  return true;
}

async function deleteParked(id){
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
  if(!state.parked.some(x=>x.id===id))return false;
  const nextParked=state.parked.filter(x=>x.id!==id).map(storageSnapshot);
  criticalOperationBusy=true;
  try{await commitCriticalStorage('delete-parked',{parked:nextParked})}
  catch(e){flash('Чек не удалён: '+(e?.message||e));return false}
  finally{criticalOperationBusy=false}
  state.parked=nextParked;
  openParkedModal();
  return true;
}

function requestDeleteParkedOrder(id){
  return typeof window.confirmDeleteParkedOrder==='function'?window.confirmDeleteParkedOrder(id):deleteParked(id);
}
