/* ---- Park (save receipt for later) ---- */
function receiptLabelKey(value){return String(value||'').trim().normalize('NFC').toLocaleLowerCase('ru').replace(/\s+/g,' ');}
function normalizeReceiptLabelTemplates(value){
  if(!Array.isArray(value))return [];
  const ids=new Set(),names=new Set();
  return value.filter(row=>{
    if(!row||typeof row.id!=='string'||!row.id||typeof row.name!=='string'||!row.name.trim()||row.name.trim().length>80)return false;
    const key=receiptLabelKey(row.name);if(ids.has(row.id)||names.has(key))return false;
    ids.add(row.id);names.add(key);return true;
  }).map(row=>({id:row.id,name:row.name.trim()}));
}
function uniqueParkedOrderLabel(value,parked=state.parked){
  const name=String(value||'').trim();if(!name)return '';
  const used=new Set((parked||[]).map(order=>receiptLabelKey(order.orderLabel)));
  if(!used.has(receiptLabelKey(name)))return name;
  const suffix=name.match(/^(.*) \(([2-9]|[1-9]\d+)\)$/);
  const base=suffix?suffix[1]:name;
  let number=2;while(used.has(receiptLabelKey(base+' ('+number+')')))number++;
  return base+' ('+number+')';
}
function receiptLabelTemplateButtons(){
  const templates=normalizeReceiptLabelTemplates(state.receiptLabelTemplates);
  return templates.length?`<div class="receipt-label-templates" aria-label="Шаблоны названий чеков">${templates.map(t=>`<button type="button" class="btn btn-secondary" onclick="chooseReceiptLabelTemplate(${escapeAttr(JSON.stringify(t.id))})">${escapeHtml(t.name)}</button>`).join('')}</div>`:'';
}
function chooseReceiptLabelTemplate(id){
  const template=normalizeReceiptLabelTemplates(state.receiptLabelTemplates).find(t=>t.id===id);
  const input=document.getElementById('park-order-label');if(!template||!input)return;
  input.value=uniqueParkedOrderLabel(template.name);input.focus();
}
function renderReceiptLabelTemplateSettings(){
 const editable=canEditCompanySettings(),templates=normalizeReceiptLabelTemplates(state.receiptLabelTemplates);
 return `<div class="settings-card"><div class="settings-section-head"><div class="settings-section-title">Шаблоны названий чеков</div>${editable?'<button class="settings-plus-btn" aria-label="Добавить шаблон названия чека" onclick="openReceiptLabelTemplateModal()"><span class="ui-icon ui-icon-add" aria-hidden="true"></span></button>':''}</div><div class="setting-sub">Быстрые кнопки в окне «Отложить». Название можно изменить перед сохранением чека.</div><div class="settings-list">${templates.length?templates.map(t=>`<div class="list-row"><div class="settings-list-main"><div class="list-row-name">${escapeHtml(t.name)}</div></div>${editable?`<button class="btn btn-secondary settings-inline-button" onclick="openReceiptLabelTemplateModal(${escapeAttr(JSON.stringify(t.id))})">Изменить</button><button class="icon-btn danger settings-row-action" aria-label="Удалить шаблон названия чека" onclick="deleteReceiptLabelTemplate(${escapeAttr(JSON.stringify(t.id))})"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button>`:''}</div>`).join(''):'<div class="center-note">Шаблоны пока не добавлены.</div>'}</div></div>`;
}
function openReceiptLabelTemplateModal(id=''){
 if(!requireAdministration())return false;
 const template=normalizeReceiptLabelTemplates(state.receiptLabelTemplates).find(t=>t.id===id);
 if(id&&!template)return false;
 showModal(`<div class="modal-title">${id?'Изменить шаблон':'Новый шаблон названия чека'}</div><div class="field"><label for="receipt-template-name">Название</label><input id="receipt-template-name" type="text" maxlength="80" autocomplete="off" placeholder="Например: Стол 1" value="${escapeAttr(template?.name||'')}"></div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="saveReceiptLabelTemplate(${escapeAttr(JSON.stringify(id))})">Сохранить</button></div>`);
}
async function saveReceiptLabelTemplate(id=''){
 if(!requireAdministration()||criticalOperationBusy)return false;
 const name=String(document.getElementById('receipt-template-name')?.value||'').trim();
 if(!name||name.length>80){flash('Введите название до 80 символов');return false;}
 const next=normalizeReceiptLabelTemplates(state.receiptLabelTemplates);
 if(next.some(t=>t.id!==id&&receiptLabelKey(t.name)===receiptLabelKey(name))){flash('Такой шаблон уже есть');return false;}
 if(id){const template=next.find(t=>t.id===id);if(!template){flash('Шаблон больше не существует');return false;}template.name=name;}
 else next.push({id:uid(),name});
 criticalOperationBusy=true;
 try{await commitCriticalStorage('receipt-label-template-save',{receiptLabelTemplates:next});state.receiptLabelTemplates=next;criticalOperationBusy=false;closeModal();render();return true;}
 catch(error){flash('Не удалось сохранить шаблон: '+(error?.message||error));return false;}
 finally{criticalOperationBusy=false;}
}
async function deleteReceiptLabelTemplate(id){
 if(!requireAdministration()||criticalOperationBusy)return false;
 const next=normalizeReceiptLabelTemplates(state.receiptLabelTemplates).filter(t=>t.id!==id);
 criticalOperationBusy=true;
 try{await commitCriticalStorage('receipt-label-template-delete',{receiptLabelTemplates:next});state.receiptLabelTemplates=next;criticalOperationBusy=false;render();return true;}
 catch(error){flash('Не удалось удалить шаблон: '+(error?.message||error));return false;}
 finally{criticalOperationBusy=false;}
}
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
      ${receiptLabelTemplateButtons()}
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
    orderLabel:uniqueParkedOrderLabel(state.orderLabel), orderType:state.orderType, customer:JSON.parse(JSON.stringify(state.customer)),
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
  const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
  const label=order=>String(order.orderLabel||'').trim();
  const list=state.parked.slice().sort((a,b)=>{
    const left=label(a),right=label(b);
    if(!left!==!right)return left?-1:1;
    return collator.compare(left,right)||(Number(b.createdAt||b.timestamp)||0)-(Number(a.createdAt||a.timestamp)||0);
  });
  showModal(`<div class="parked-modal-header"><div class="modal-title">Отложенные чеки</div><button class="parked-modal-close" aria-label="Закрыть отложенные чеки" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    <!-- parked-order-warnings -->
    <div class="parked-orders-list">${list.length?list.map(o=>`
    <article class="parked-order-card ${o.webOrderId?'parked-web-order':''}">
      <button class="parked-order-tile" onclick="resumeParked('${escapeAttr(o.id)}')" aria-label="Открыть чек ${escapeAttr(o.orderLabel||'Без подписи')}">
        <div class="parked-order-heading"><span class="parked-order-name">${escapeHtml(o.orderLabel||'Без подписи')}</span><span class="parked-order-date">${fmtDate(o.createdAt||o.timestamp)}</span></div>
        ${parkedOrderTypeBadge(o.orderType)}
        <div class="parked-order-total">${fullMoney(o.total)}</div>
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

/* Move the current cart into one parked receipt and open it atomically. */
let parkedOrderTransfer=null;
function currentOrderTransferSnapshot(){
 const snapshot=currentOrderSessionSnapshot();delete snapshot.updatedAt;snapshot.createdAt=Number(state.currentOrderCreatedAt)||0;return snapshot;
}
function currentOrderTransferError(){
 if(!state.cart.length)return 'В текущем заказе нет товаров';
 if(state.currentWebOrderId)return 'Заказ с сайта нужно завершить отдельно, чтобы сохранить его связь с сайтом';
 if(hasPaidSplitPayment())return 'Сначала завершите начатую разделённую оплату';
 return '';
}
function openMoveCurrentOrderModal(){
 if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
 const error=currentOrderTransferError();if(error){flash(error);return false;}
 parkedOrderTransfer=null;
 const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
 const list=state.parked.slice().sort((a,b)=>collator.compare(String(a.orderLabel||'').trim(),String(b.orderLabel||'').trim()));
 showModal(`<div class="parked-modal-header"><div class="modal-title">Объединить чеки</div><button class="parked-modal-close" aria-label="Закрыть выбор чека" onclick="closeModal()"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button></div><p class="settings-note">Выберите отложенный чек. Текущие товары добавятся к нему, и объединённый чек откроется в рабочей зоне.</p><div class="parked-orders-list">${list.length?list.map(o=>`<article class="parked-order-card transfer-order-card"><button class="parked-order-tile" onclick="confirmMoveCurrentOrderChoice(${escapeAttr(JSON.stringify(o.id))})" aria-label="Переместить в чек ${escapeAttr(o.orderLabel||'Без подписи')}"><div class="parked-order-heading"><span class="parked-order-name">${escapeHtml(o.orderLabel||'Без подписи')}</span><span class="parked-order-date">${fmtDate(o.createdAt||o.timestamp)}</span></div>${parkedOrderTypeBadge(o.orderType)}<div class="parked-order-total">${fullMoney(o.total)}</div></button></article>`).join(''):'<div class="parked-empty"><div class="parked-empty-title">Нет отложенных чеков</div><div>Сначала создайте чек, в который нужно перенести товары.</div></div>'}</div>`,true);
 document.querySelector?.('#modal-root .modal')?.classList?.add('parked-orders-modal');return true;
}
function confirmMoveCurrentOrderChoice(id){
 if(criticalOperationBusy)return false;
 const error=currentOrderTransferError(),target=state.parked.find(o=>o.id===id);
 if(error||!target){flash(error||'Отложенный чек больше не существует');return false;}
 if(Array.isArray(target.paymentDraft?.parts)&&target.paymentDraft.parts.some(p=>p.paid)){flash('В выбранном чеке уже начата оплата');return false;}
 parkedOrderTransfer={id,source:JSON.stringify(currentOrderTransferSnapshot()),target:JSON.stringify(target)};
 showModal(`<div class="modal-title">Переместить и открыть чек?</div><div class="settings-note">Товары текущего заказа будут добавлены в <b>${escapeHtml(target.orderLabel||'Без подписи')}</b>. Чек откроется в рабочей зоне.</div><p class="setting-sub">Клиент, название, способ получения и доставка сохранятся от выбранного чека. Скидки программы лояльности пересчитаются для его клиента.</p><div class="modal-actions"><button class="btn btn-secondary" onclick="openMoveCurrentOrderModal()">Назад</button><button class="btn btn-primary" onclick="moveCurrentOrderIntoParked()">Переместить и открыть</button></div>`);return true;
}
function remapTransferredKitchenLines(items,printedItems,kitchenPrinted){
 const source=storageSnapshot(items||[]),ledger=new Map((Array.isArray(printedItems)&&(printedItems.length||!kitchenPrinted)?printedItems:(kitchenPrinted?kitchenPrintedSnapshot(source):[])).map(p=>[String(p.key||''),Number(p.qty)||0]));
 const printed=[];
 for(const item of source){
  const oldKey=kitchenPrintLineKey(item),qty=Number(item.qty),price=Number(item.price);
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0)throw new Error('Некорректные товары в чеке');
  item.cartLineId=uid();
  if(ledger.has(oldKey)){const done=ledger.get(oldKey);if(!Number.isFinite(done)||done<0)throw new Error('Некорректная отметка кухонной печати');printed.push({key:item.cartLineId,qty:done});ledger.delete(oldKey);}
 }
 return {items:source,printed};
}
async function moveCurrentOrderIntoParked(){
 if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
 const draft=parkedOrderTransfer;if(!draft)return false;
 const error=currentOrderTransferError(),target=state.parked.find(o=>o.id===draft.id);
 if(error||!target){flash(error||'Отложенный чек больше не существует');return false;}
 if(JSON.stringify(target)!==draft.target||JSON.stringify(currentOrderTransferSnapshot())!==draft.source){flash('Один из чеков изменился. Выберите чек заново');return false;}
 let nextParked,session;
 try{
  const left=remapTransferredKitchenLines(target.items,target.printedItems,target.kitchenPrinted),right=remapTransferredKitchenLines(state.cart,window.__currentOrderPrintedItems,window.__currentOrderKitchenPrinted);
  const items=[...left.items,...right.items],subtotal=items.reduce((sum,item)=>sum+itemTotal(item),0),fee=target.orderType==='Доставка'?Number(target.deliveryFee||0):0;
  if(!Number.isFinite(subtotal)||!Number.isFinite(fee)||fee<0)throw new Error('Некорректная сумма чека');
  const targetComment=String(target.comment||''),sourceComment=String(state.orderComment||'');
  session={items,createdAt:Number(target.createdAt||target.timestamp)||Date.now(),orderLabel:target.orderLabel||'',orderType:target.orderType||'На месте',customer:Object.assign({name:'',phone:'',address:''},storageSnapshot(target.customer||{})),deliveryFee:fee,deliveryTariffSelected:target.deliveryTariffSelected===true,deliveryTariff:storageSnapshot(target.deliveryTariff||null),orderComment:targetComment+(sourceComment&&sourceComment!==targetComment?(targetComment?'\n':'')+sourceComment:''),source:target.source||'',webOrderId:target.webOrderId||'',webOrderStatus:target.webOrderStatus||'',kitchenPrinted:!!(target.kitchenPrinted||window.__currentOrderKitchenPrinted),printedItems:[...left.printed,...right.printed],loyaltyPrograms:[],loyaltyRedemptions:{},loyaltyCustomerId:'',updatedAt:Date.now()};
  nextParked=state.parked.filter(o=>o.id!==target.id).map(storageSnapshot);
  criticalOperationBusy=true;
  await commitCriticalStorage('move-current-order-into-parked',{parked:nextParked,currentOrderSession:session});
 }catch(e){flash('Товары не перемещены: '+(e?.message||e));return false;}
 finally{criticalOperationBusy=false;}
 resetCurrentOrderState();state.cart=session.items;state.parked=nextParked;
 state.currentOrderCreatedAt=session.createdAt;state.orderLabel=session.orderLabel;state.orderType=session.orderType;state.customer=session.customer;
 state.deliveryFee=session.deliveryFee;state.deliveryTariffSelected=session.deliveryTariffSelected;state.deliveryTariff=session.deliveryTariff;
 state.orderComment=session.orderComment;state.currentOrderSource=session.source;state.currentWebOrderId=session.webOrderId;state.currentWebOrderStatus=session.webOrderStatus;
 window.__currentOrderKitchenPrinted=session.kitchenPrinted;window.__currentOrderPrintedItems=session.printedItems;parkedOrderTransfer=null;
 try{closeModal();render();flash('Товары перемещены, чек открыт');}catch(e){console.error('Товары перемещены, но экран не обновлён');}
 if(state.customer?.id){const customer=state.customer;void loadCustomerLoyalty(customer.id).catch(()=>{if(state.customer===customer)flash('Чек открыт. Программа лояльности временно недоступна');});}
 return true;
}
