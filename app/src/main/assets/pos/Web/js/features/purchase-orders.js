let purchaseOrderEditor=null;
function canEditPurchaseOrder(order){return !!order&&order.status==='pending'&&!order.deletedAt&&!order.receivedAt;}
function openEditPurchaseOrder(orderId){
 if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
 const order=state.purchaseOrders.find(o=>o.id===orderId);
 if(!canEditPurchaseOrder(order)){flash('Изменять можно только заказ, ожидающий приёмку');return false;}
 purchaseOrderEditor={orderId,baseline:JSON.stringify(order),items:storageSnapshot(order.items||[])};renderPurchaseOrderEditor();return true;
}
function renderPurchaseOrderEditor(){
 const draft=purchaseOrderEditor,order=state.purchaseOrders.find(o=>o.id===draft?.orderId);if(!draft||!order)return;
 const supplier=state.suppliers.find(s=>s.id===order.supplierId),ids=new Set(draft.items.map(i=>String(i.productId)));
 const available=state.products.filter(p=>p.type==='simple'&&(supplier?.productIds||[]).map(String).includes(String(p.id))&&!ids.has(String(p.id)));
 showModal(`<div class="modal-title">Изменить заказ поставщику</div><div class="supply-modal-meta"><strong>${escapeHtml(order.supplierName||'Поставщик')}</strong><br>${fmtDate(order.timestamp)}</div><div class="purchase-edit-items">${draft.items.map((i,index)=>{const p=getProduct(i.productId),unit=i.requestedUnit??i.stockUnit??stockUnit(p),pack=['bottle','pack','box'].includes(unit);return `<section class="purchase-edit-item"><div class="purchase-edit-heading"><strong>${escapeHtml(i.productName||p?.name||'Товар')}</strong><button class="icon-btn" aria-label="Убрать товар из заказа: ${escapeAttr(i.productName||p?.name||'Товар')}" onclick="removePurchaseEditItem(${index})"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button></div><div class="purchase-edit-fields"><label>Количество<input type="number" min="0" step="any" inputmode="decimal" value="${escapeAttr(String(i.requestedQty??i.qty??''))}" oninput="updatePurchaseEditItem(${index},'requestedQty',this.value)"></label><label>Единица заказа<select onchange="updatePurchaseEditItem(${index},'requestedUnit',this.value);renderPurchaseOrderEditor()">${p?purchaseUnitOptions(p,unit):`<option>${escapeHtml(unit)}</option>`}</select></label>${pack?`<label>В единице<input type="number" min="0" step="any" inputmode="decimal" value="${escapeAttr(String(i.packSize??''))}" oninput="updatePurchaseEditItem(${index},'packSize',this.value)"></label><label>Единица внутри<select onchange="updatePurchaseEditItem(${index},'contentUnit',this.value)">${productUnitOptions(stockUnit(p),i.contentUnit??stockUnit(p))}</select></label>`:''}</div></section>`}).join('')||'<div class="center-note">Добавьте хотя бы один товар</div>'}</div>${available.length?`<div class="purchase-edit-add"><select id="purchase-edit-add-product" aria-label="Товар для добавления"><option value="">Выберите товар</option>${available.map(p=>`<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>`).join('')}</select><button class="btn btn-secondary" onclick="addPurchaseEditItem()">Добавить товар</button></div>`:''}${order.receivingDraftV2?'<p class="setting-sub">Черновик приёмки сохранится. Фактические количества и суммы в нём не изменятся.</p>':''}<div class="modal-actions"><button class="btn btn-secondary" onclick="cancelPurchaseOrderEdit()">Отмена</button><button class="btn btn-primary" onclick="savePurchaseOrderEdit()">Сохранить изменения</button></div>`,true);
 document.querySelector('#modal-root .modal')?.classList.add('purchase-edit-modal');
}
function updatePurchaseEditItem(index,field,value){if(purchaseOrderEditor&&!criticalOperationBusy&&['requestedQty','requestedUnit','packSize','contentUnit'].includes(field)&&purchaseOrderEditor.items[index])purchaseOrderEditor.items[index][field]=value;}
function removePurchaseEditItem(index){if(!purchaseOrderEditor||criticalOperationBusy)return;purchaseOrderEditor.items.splice(index,1);renderPurchaseOrderEditor();}
function addPurchaseEditItem(){
 if(!purchaseOrderEditor||criticalOperationBusy)return;
 const id=document.getElementById('purchase-edit-add-product')?.value,p=getProduct(id),order=state.purchaseOrders.find(o=>o.id===purchaseOrderEditor.orderId),supplier=state.suppliers.find(s=>s.id===order?.supplierId);
 if(!p||p.type!=='simple'||!(supplier?.productIds||[]).map(String).includes(String(id)))return flash('Выберите товар поставщика');
 if(purchaseOrderEditor.items.some(i=>i.productId===id))return;
 purchaseOrderEditor.items.push({productId:p.id,productName:p.name,requestedQty:1,requestedUnit:p.purchaseUnit??stockUnit(p),packSize:p.purchasePackSize??'',contentUnit:p.purchaseContentUnit??stockUnit(p)});renderPurchaseOrderEditor();
}
function cancelPurchaseOrderEdit(){if(criticalOperationBusy)return;const id=purchaseOrderEditor?.orderId;purchaseOrderEditor=null;if(id)viewPurchaseOrder(id);else closeModal();}
async function savePurchaseOrderEdit(){
 const draft=purchaseOrderEditor;if(!draft||criticalOperationBusy)return false;
 const order=state.purchaseOrders.find(o=>o.id===draft.orderId);
 if(!canEditPurchaseOrder(order)){flash('Заказ уже не ожидает приёмку. Изменения не сохранены');return false;}
 if(JSON.stringify(order)!==draft.baseline){flash('Заказ изменился. Откройте редактирование заново');return false;}
 let next;
 try{
  if(!draft.items.length)throw new Error('Добавьте хотя бы один товар');
  const supplier=state.suppliers.find(s=>s.id===order.supplierId);if(!supplier)throw new Error('Поставщик недоступен');
  const seen=new Set();const items=draft.items.map(i=>{const p=getProduct(i.productId);if(!p||p.type!=='simple')throw new Error('Товар недоступен: '+i.productName);if(seen.has(String(p.id)))throw new Error('Товар повторяется: '+p.name);seen.add(String(p.id));if(!(supplier.productIds||[]).map(String).includes(String(p.id)))throw new Error('Товар больше не закреплён за поставщиком: '+p.name);return makePurchaseLine(p,i.requestedQty??i.qty,i.requestedUnit??i.stockUnit??stockUnit(p),i.packSize??'',i.contentUnit??i.stockUnit??stockUnit(p));});
  next=storageSnapshot(state.purchaseOrders);const updated=next.find(o=>o.id===order.id);updated.items=items;updated.updatedAt=Date.now();updated.requestVersion=(Number(order.requestVersion)||1)+1;
  // Invoice quantities and costs are facts entered independently from requested amounts.
  // Keep them intact; append blank invoice rows only for newly requested products.
  if(updated.receivingDraftV2){const fresh=receivingDraftForOrder({...updated,receivingDraftV2:null},updated.id),present=new Set(updated.receivingDraftV2.lines.map(i=>String(i.productId)));for(const line of fresh.lines)if(!present.has(String(line.productId)))updated.receivingDraftV2.lines.push(line);}
  criticalOperationBusy=true;try{await commitCriticalStorage('edit-purchase-order',{purchaseOrders:next});}finally{criticalOperationBusy=false;}
 }catch(e){flash('Заказ не изменён: '+(e?.message||e));return false;}
 state.purchaseOrders=next;purchaseOrderEditor=null;try{render();viewPurchaseOrder(order.id);flash('Заказ поставщику изменён')}catch(e){console.error('Заказ изменён, но не удалось обновить экран:',e)}return true;
}

function canAdminDeletePurchaseOrder(){return currentShiftEmployeeIsAdmin();}

function openDeletePurchaseOrderModal(orderId){
  if(!canAdminDeletePurchaseOrder()){
    flash('Удалять приёмки может только администратор в активной сессии администрирования');
    return;
  }
  const order=state.purchaseOrders.find(o=>o.id===orderId);
  if(!order||order.deletedAt)return;
  if(order.status==='received'){
    flash('Принятую приёмку удалить нельзя');
    return;
  }
  showModal(`
    <div class="modal-title">Удалить приёмку?</div>
    <div class="center-note supply-delete-note">Заказ от «${escapeHtml(order.supplierName||'Поставщик')}» будет помечен как удалённый администратором и останется в истории.</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" onclick="deletePurchaseOrderAsAdmin(${escapeAttr(JSON.stringify(order.id))})">Удалить приёмку</button>
    </div>`,false);
}

async function deletePurchaseOrderAsAdmin(orderId){
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
  if(!canAdminDeletePurchaseOrder()){
    closeModal();
    flash('Удалять приёмки может только администратор в активной сессии администрирования');
    return false;
  }
  const order=state.purchaseOrders.find(o=>o.id===orderId);
  if(!order||order.deletedAt)return false;
  if(order.status==='received'){
    closeModal();
    flash('Принятую приёмку удалить нельзя');
    return false;
  }
  const employee=state.employees.find(e=>e.role==='admin');
  const nextPurchaseOrders=storageSnapshot(state.purchaseOrders),nextReceivings=storageSnapshot(state.receivings),nextOrder=nextPurchaseOrders.find(o=>o.id===orderId),deletedAt=Date.now();
  nextOrder.deletedAt=deletedAt;
  nextOrder.deletedByEmployeeId=employee?.id||'';
  nextOrder.deletedByEmployeeName=employee?.name||'Администратор';
  nextOrder.status='deleted';
  nextOrder.receivingIncomplete=false;
  delete nextOrder.receivingDraft;
  delete nextOrder.receivingDraftV2;
  const alreadyInHistory=nextReceivings.some(r=>r.purchaseOrderId===nextOrder.id&&r.adminDeleted);
  if(!alreadyInHistory){
    nextReceivings.push({
      id:uid(),
      type:'purchaseOrder',
      purchaseOrderId:nextOrder.id,
      supplierId:nextOrder.supplierId||'',
      supplierName:nextOrder.supplierName||'',
      items:Array.isArray(nextOrder.items)?nextOrder.items.map(i=>({productId:i.productId,productName:i.productName,qty:Number(i.qty)||0,orderedQty:Number(i.qty)||0,unitCost:0,totalCost:0})):[],
      totalCost:0,
      shortage:false,
      adminDeleted:true,
      deletedByEmployeeName:nextOrder.deletedByEmployeeName||'Администратор',
      timestamp:deletedAt
    });
  }
  criticalOperationBusy=true;
  try{await commitCriticalStorage('delete-purchase-order',{purchaseOrders:nextPurchaseOrders,receivings:nextReceivings});}
  catch(e){flash('Приёмка не удалена: '+(e?.message||e));return false;}
  finally{criticalOperationBusy=false;}
  state.purchaseOrders=nextPurchaseOrders;
  state.receivings=nextReceivings;
  try{closeModal();render();flash('Приёмка удалена администратором и перемещена в историю');}
  catch(e){console.error('Не удалось обновить экран после удаления приёмки:',e);}
  return true;
}

function purchaseUnitLabel(unit){return unit==='pack'?'упаковка':unit==='box'?'коробка':unit==='bottle'?'бутылка':unitLabel(unit);}
function requestedQuantityText(item){const unit=item.requestedUnit??item.stockUnit??stockUnit(getProduct(item.productId));const base=`${item.requestedQty??item.qty} ${purchaseUnitLabel(unit)}`;return ['bottle','pack','box'].includes(unit)&&item.packSize?`${base} × ${item.packSize} ${unitLabel(item.contentUnit||item.stockUnit||stockUnit(getProduct(item.productId)))}`:base;}
function purchaseUnitOptions(p,selected){
  const base=stockUnit(p),units=[...Object.keys(PRODUCT_UNITS).filter(u=>base&&PRODUCT_UNITS[u].kind===PRODUCT_UNITS[base]?.kind),'bottle','pack','box'];
  if(!base)units.unshift('');
  return units.map(u=>`<option value="${u}" ${u===selected?'selected':''}>${purchaseUnitLabel(u)}</option>`).join('');
}
function makePurchaseLine(p,qty,unit,packSize,contentUnit){
  qty=Number(qty);if(!Number.isFinite(qty)||qty<=0)throw new Error('Количество заказа должно быть больше нуля');
  const base=stockUnit(p),pack=['bottle','pack','box'].includes(unit),inside=contentUnit||base;
  let expected=null;
  if(pack){
    if(packSize!==''&&packSize!=null){
      const size=Number(packSize);if(!Number.isFinite(size)||size<=0)throw new Error('Количество в единице закупки должно быть больше нуля');
      expected=convertProductQty(qty*size,inside,base);
    }
  }else expected=convertProductQty(qty,unit,base);
  if(expected!==null&&(!Number.isFinite(expected)||expected<=0))throw new Error('Некорректное количество заказа');
  return {productId:p.id,productName:p.name,qty:expected??0,requestedQty:qty,requestedUnit:unit,stockUnit:base,contentUnit:inside,expectedQty:expected,packSize:pack&&packSize!==''&&packSize!=null?Number(packSize):null,timestamp:Date.now()};
}

function updatePurchaseRequest(productId){
  const row=[...document.querySelectorAll('[data-purchase-row]')].find(r=>r.dataset.purchaseRow===productId);if(!row)return;
  const qty=row.querySelector('[data-request-qty]').value,unit=row.querySelector('[data-request-unit]').value,size=row.querySelector('[data-request-size]').value,contentUnit=row.querySelector('[data-content-unit]')?.value||stockUnit(getProduct(productId));
  const idx=state.purchaseOrderCart.findIndex(x=>x.productId===productId);
  const draft={productId,requestedQty:qty,requestedUnit:unit,packSize:size,contentUnit};
  if(qty!==''){if(idx<0)state.purchaseOrderCart.push(draft);else state.purchaseOrderCart[idx]=draft;}else if(idx>=0)state.purchaseOrderCart.splice(idx,1);
  row.querySelectorAll('[data-pack-field]').forEach(el=>el.hidden=!['bottle','pack','box'].includes(unit));
  const note=row.querySelector('[data-request-note]');
  try{const line=makePurchaseLine(getProduct(productId),qty,unit,size,contentUnit);note.textContent=line.expectedQty===null?'Количество внутри уточняется при приёмке':`На склад поступит: ${line.expectedQty} ${unitLabel(line.stockUnit)}`;}catch(e){note.textContent=qty===''?'Укажите количество':e.message;}
  const button=document.getElementById('po-create');if(button)button.disabled=!state.purchaseOrderCart.length;
}

async function finalizePurchaseOrder(){
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
  const supplier=getPurchaseOrderSupplier();if(!supplier){flash('Выберите поставщика');return false;}
  let nextProducts,nextPurchaseOrders,order;
  try{
    nextProducts=storageSnapshot(state.products);
    const items=state.purchaseOrderCart.map(x=>{
      const p=getProduct(x.productId);if(!p||p.type!=='simple')throw new Error('Товар недоступен: '+(p?.name||x.productId));
      const supplierProductIds=(supplier.productIds||[]).map(String);if(supplierProductIds.length&&!supplierProductIds.includes(String(p.id)))throw new Error('Товар «'+p.name+'» больше не привязан к выбранному поставщику');
      const line=makePurchaseLine(p,x.requestedQty??x.qty,x.requestedUnit??stockUnit(p),x.packSize??'',x.contentUnit??p.purchaseContentUnit??stockUnit(p)),nextProduct=nextProducts.find(item=>item.id===p.id);
      if(!nextProduct)throw new Error('Товар недоступен: '+p.name);
      nextProduct.purchaseUnit=line.requestedUnit;nextProduct.purchasePackSize=line.packSize??undefined;nextProduct.purchaseContentUnit=line.contentUnit;return line;
    });
    if(!items.length)throw new Error('Добавьте хотя бы один товар');
    order={id:uid(),requestVersion:1,supplierId:supplier.id,supplierName:supplier.name,items,status:'pending',timestamp:Date.now()};
    nextPurchaseOrders=storageSnapshot(state.purchaseOrders);nextPurchaseOrders.push(order);
    criticalOperationBusy=true;
    try{await commitCriticalStorage('create-purchase-order',{products:nextProducts,purchaseOrders:nextPurchaseOrders});}
    finally{criticalOperationBusy=false;}
  }catch(e){flash('Заказ не сформирован: '+(e?.message||e));return false;}
  state.products=nextProducts;state.purchaseOrders=nextPurchaseOrders;state.purchaseOrderCart=[];
  try{render();viewPurchaseOrder(order.id);}
  catch(e){console.error('Заказ сохранён, но не удалось открыть его карточку:',e);}
  return true;
}

function purchaseHistoryStatus(order){
  if(order.status==='deleted'||order.deletedAt)return {label:'Удалено администратором',style:'deleted'};
  if(order.status==='received')return order.shortage?{label:'Недовоз',style:'shortage'}:{label:'Принят',style:'received'};
  return {label:'Ожидается приёмка',style:'pending'};
}
function purchaseHistoryMarkup(){
  const history=state.purchaseOrders.slice().sort((a,b)=>b.timestamp-a.timestamp);
  return history.map(o=>{const status=purchaseHistoryStatus(o);return `<div class="purchase-history-entry"><button class="purchase-history-row" onclick="viewPurchaseOrder(${escapeAttr(JSON.stringify(o.id))})"><span class="purchase-history-title"><strong>${escapeHtml(o.supplierName||'Поставщик')}</strong><small>${fmtDate(o.timestamp)} · ${(o.items||[]).length} позиций</small></span><span class="purchase-status ${status.style}">${status.label}</span></button>${canEditPurchaseOrder(o)?`<button class="icon-btn purchase-history-edit" aria-label="Изменить заказ поставщику: ${escapeAttr(o.supplierName||'Поставщик')}" onclick="openEditPurchaseOrder(${escapeAttr(JSON.stringify(o.id))})"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button>`:''}</div>`;}).join('')||'<p class="pe-note supply-history-empty">Заказов пока нет.</p>';
}
function togglePurchaseHistory(){
  window._purchaseHistoryExpanded=!window._purchaseHistoryExpanded;
  const panel=document.getElementById('purchase-history-panel');panel.hidden=!window._purchaseHistoryExpanded;
  document.getElementById('purchase-history-button').setAttribute('aria-expanded',String(window._purchaseHistoryExpanded));
}
function openPurchaseQuantity(productId,field='qty'){
  if(!['qty','size'].includes(field))return;
  const row=[...document.querySelectorAll('[data-purchase-row]')].find(r=>r.dataset.purchaseRow===productId);if(!row)return;
  window._purchaseQuantity={productId,field,value:row.querySelector('[data-request-'+field+']').value,replace:true};
  showModal(`<div class="modal-title">${field==='size'?'В упаковке, '+unitLabel(stockUnit(getProduct(productId))):'Заказать'}</div><p class="pe-note">${escapeHtml(getProduct(productId)?.name||'Товар')}</p><output id="purchase-keypad-value" aria-live="polite">${escapeHtml(window._purchaseQuantity.value||'0')}</output><div class="purchase-keypad">${['1','2','3','4','5','6','7','8','9',',','0','⌫'].map(k=>`<button type="button" onclick="purchaseQuantityKey('${k}')" aria-label="${k==='⌫'?'Удалить цифру':k===','?'Десятичная запятая':k}">${k}</button>`).join('')}</div><div class="purchase-keypad-actions"><button class="btn btn-outline" onclick="purchaseQuantityKey('clear')">Очистить</button><button class="btn btn-primary" onclick="applyPurchaseQuantity()">Готово</button></div>`);
  document.querySelector('#modal-root .modal')?.classList.add('purchase-keypad-modal');
}
function purchaseQuantityKey(key){
  const draft=window._purchaseQuantity;if(!draft)return;
  if(key==='clear'){draft.value='';draft.replace=false;}
  else if(key==='⌫'){draft.value=draft.value.slice(0,-1);draft.replace=false;}
  else if(key===','){if(draft.replace)draft.value='';if(!draft.value.includes('.'))draft.value=(draft.value||'0')+'.';draft.replace=false;}
  else if(/^[0-9]$/.test(key)){
    if(draft.replace)draft.value='';draft.replace=false;
    if(draft.value.length<12)draft.value=draft.value==='0'?key:draft.value+key;
  }
  const output=document.getElementById('purchase-keypad-value');if(output)output.textContent=(draft.value||'0').replace('.',',');
}
function applyPurchaseQuantity(){
  const draft=window._purchaseQuantity;if(!draft)return;
  const row=[...document.querySelectorAll('[data-purchase-row]')].find(r=>r.dataset.purchaseRow===draft.productId);if(!row){closeModal();return;}
  row.querySelector(draft.field==='size'?'[data-request-size]':'[data-request-qty]').value=draft.value===''?'':String(Number(draft.value));
  updatePurchaseRequest(draft.productId);window._purchaseQuantity=null;closeModal();
}

function renderPurchaseOrdersScreen(){
  const supplier=getPurchaseOrderSupplier(),products=supplier?state.products.filter(p=>p.type==='simple'&&(supplier.productIds||[]).includes(p.id)).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru')):[];
  return `<div class="screen content-screen ${state.tab==='purchaseOrders'?'active':''}"><div class="supply-stack"><div class="supply-stack-actions"><button class="btn btn-outline supply-history-button" id="purchase-history-button" aria-controls="purchase-history-panel" aria-expanded="${!!window._purchaseHistoryExpanded}" onclick="togglePurchaseHistory()"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>История</button><div id="purchase-history-panel" class="purchase-history-panel" ${window._purchaseHistoryExpanded?'':'hidden'}>${purchaseHistoryMarkup()}</div><button class="btn btn-primary supply-expand-button" aria-expanded="${!!window._purchaseExpanded}" onclick="togglePurchasePanel(this)">Новый заказ</button></div>
  <div id="purchase-expand-panel" class="supply-layout supply-focused" ${window._purchaseExpanded?'':'hidden'}><div class="card"><div class="field"><label for="po-supplier">Поставщик</label><select id="po-supplier" onchange="selectPurchaseOrderSupplier(this.value)"><option value="">Выберите поставщика</option>${state.suppliers.map(s=>`<option value="${escapeAttr(s.id)}" ${s.id===supplier?.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
  ${products.map(p=>{const d=state.purchaseOrderCart.find(x=>x.productId===p.id)||{},u=d.requestedUnit??p.purchaseUnit??stockUnit(p),size=d.packSize??p.purchasePackSize??'',content=d.contentUnit??p.purchaseContentUnit??stockUnit(p);return `<div class="supply-request" data-purchase-row="${escapeAttr(p.id)}" oninput="updatePurchaseRequest(${escapeAttr(JSON.stringify(p.id))})" onchange="updatePurchaseRequest(${escapeAttr(JSON.stringify(p.id))})"><div class="supply-product"><strong>${escapeHtml(p.name)}</strong><small>Остаток: ${stockQtyText(p.stock)} ${unitLabel(stockUnit(p))}${p.minStock!=null?' · Минимум: '+stockQtyText(p.minStock):''}</small></div><div class="supply-request-fields"><div class="field"><label>Количество</label><input data-request-qty type="text" readonly inputmode="none" role="button" onclick="openPurchaseQuantity(${escapeAttr(JSON.stringify(p.id))})" value="${escapeAttr(String(d.requestedQty??d.qty??''))}" placeholder="0"></div><div class="field"><label>Единица заказа</label><select data-request-unit>${purchaseUnitOptions(p,u)}</select></div><div class="field" data-pack-field ${['bottle','pack','box'].includes(u)?'':'hidden'}><label>В единице</label><input data-request-size type="text" readonly inputmode="none" role="button" onclick="openPurchaseQuantity(${escapeAttr(JSON.stringify(p.id))},'size')" value="${escapeAttr(String(size))}" placeholder="0"></div><div class="field" data-pack-field ${['bottle','pack','box'].includes(u)?'':'hidden'}><label>Единица внутри</label><select data-content-unit>${productUnitOptions(stockUnit(p),content)}</select></div></div><small data-request-note class="pe-note"></small></div>`;}).join('')}
  ${supplier&&!products.length?'<p class="pe-note">Закрепите товары за поставщиком во вкладке «Поставщики».</p>':''}
  <div class="supply-order-footer"><button id="po-create" class="btn btn-primary" onclick="finalizePurchaseOrder()" ${state.purchaseOrderCart.length?'':'disabled'}>Сформировать заказ</button></div></div>
</div></div></div>`;
}

function togglePurchasePanel(button){
  window._purchaseExpanded=!window._purchaseExpanded;
  document.getElementById('purchase-expand-panel').hidden=!window._purchaseExpanded;
  button.setAttribute('aria-expanded',String(window._purchaseExpanded));
}

function getPurchaseOrderSupplier(){return state.suppliers.find(s=>s.id===state.purchaseOrderSupplierId)||null;}

function purchaseOrderText(order){
  const lines=[];
  lines.push(`Заказ поставщику: ${order.supplierName}`);
  lines.push(`Дата: ${fmtDate(order.timestamp)}`);
  lines.push('');
  lines.push(...order.items.map((i,idx)=>`${idx+1}. ${i.productName} — ${requestedQuantityText(i)}`));
  lines.push('');
  lines.push('Просьба подтвердить наличие и сроки поставки.');
  return lines.join('\n');
}
function selectPurchaseOrderSupplier(id){
  if(state.purchaseOrderCart.length&&id!==state.purchaseOrderSupplierId){flash('Сначала завершите текущий заказ');render();return;}
  state.purchaseOrderSupplierId=id||'';
  state.purchaseOrderCart=[];
  render();
}
function viewPurchaseOrder(id){
  const order=state.purchaseOrders.find(o=>o.id===id);if(!order)return;
  const deletedLabel=order.status==='deleted'?`<div class="badge deleted-admin supply-deleted-label">Удалено администратором</div>`:'';
  const text=purchaseOrderText(order),safeId=escapeAttr(JSON.stringify(order.id));
  showModal(`
    <div class="purchase-view-heading"><div class="modal-title">Заказ поставщику</div>${canEditPurchaseOrder(order)?`<button class="icon-btn" aria-label="Изменить заказ поставщику" onclick="openEditPurchaseOrder(${safeId})"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button>`:''}</div>${deletedLabel}
    <div class="supply-modal-meta"><strong>${escapeHtml(order.supplierName)}</strong><br>${fmtDate(order.timestamp)}</div>
    <pre id="purchase-order-text" class="purchase-order-copy">${escapeHtml(text)}</pre>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="copyPurchaseOrder(${safeId})">Скопировать текст</button>
      <button class="btn btn-secondary" onclick="sharePurchaseOrder(${safeId})">Поделиться</button>
      <button class="btn btn-primary" onclick="closeModal()">Готово</button>
    </div>`,true);
}
async function copyPurchaseOrder(id){
  const order=state.purchaseOrders.find(o=>o.id===id);if(!order)return;
  const text=purchaseOrderText(order);
  try{await navigator.clipboard.writeText(text);}
  catch(e){const ta=document.createElement('textarea');ta.value=text;ta.className='clipboard-copy-buffer';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
  flash('Текст заказа скопирован');
}
function sharePurchaseOrder(id){
  const order=state.purchaseOrders.find(o=>o.id===id);if(!order)return;
  const payload={
    id:order.id,
    supplierName:order.supplierName||'Поставщик',
    timestamp:order.timestamp||Date.now(),
    items:(order.items||[]).map(i=>({productName:i.productName||'',qty:Number(i.requestedQty??i.qty)||0,quantityText:requestedQuantityText(i)})),
    company:{legalName:state.company?.legalName||'',address:state.company?.address||'',deliveryAddress:state.company?.deliveryAddress||''}
  };
  if(window.webkit?.messageHandlers?.printer){window.webkit.messageHandlers.printer.postMessage({action:'sharePurchaseOrder',order:payload});return;}
  const text=purchaseOrderText(order);
  if(navigator.share)navigator.share({title:`Заказ поставщику — ${order.supplierName}`,text}).catch(()=>{});
  else copyPurchaseOrder(id);
}
