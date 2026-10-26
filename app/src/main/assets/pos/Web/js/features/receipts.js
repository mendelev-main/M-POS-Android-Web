// Correct the recorded tender, without repeating a sale, refund or device action.
let receiptPaymentCorrection=null;
function receiptPaymentName(method){return method==='cash'?'Наличные':method==='card'?'Карта':'Наличные + карта';}
function receiptPaymentCorrectionError(order){
 if(!order)return 'Чек не найден';
 if(order.returnedAt)return 'Способ оплаты возвращённого чека изменить нельзя';
 if(!['cash','card'].includes(order.method))return 'Изменение разделённой оплаты пока недоступно';
 const total=Number(order.total);
 if(!Number.isFinite(total)||total<0||!Number.isSafeInteger(Math.round(total*100)))return 'Некорректная сумма чека';
 if(order.payments!=null&&(!Array.isArray(order.payments)||order.payments.length!==1||order.payments[0]?.method!==order.method||!Number.isFinite(Number(order.payments[0]?.amount))||Math.round(Number(order.payments[0].amount)*100)!==Math.round(total*100)))return 'Некорректные данные оплаты чека';
 const shift=state.shifts.find(s=>s.id===order.shiftId);
 if(!shift||!['open','closed'].includes(shift.status))return 'Не найдена кассовая смена чека';
 if(currentShiftEmployeeIsAdmin())return '';
 if(shift.status!=='open'||currentShift()?.id!==shift.id)return 'После закрытия смены изменить оплату может только администратор';
 return '';
}
function receiptPaymentCorrectionButton(order){
 if(!order||order.returnedAt||!['cash','card'].includes(order.method))return '';
 return `<button type="button" class="btn receipt-action receipt-action-payment" onclick="openReceiptPaymentCorrection(${escapeAttr(JSON.stringify(order.id))})">Изменить оплату</button>`;
}
function receiptPaymentCorrectionHistory(order){
 const rows=Array.isArray(order?.paymentCorrections)?order.paymentCorrections:[];
 if(!rows.length)return '';
 return `<section class="receipt-payment-history"><strong>Исправления оплаты</strong>${rows.slice().reverse().map(h=>`<div><span>${escapeHtml(receiptPaymentName(h.from))} → ${escapeHtml(receiptPaymentName(h.to))}</span><small>${escapeHtml(fmtDate(h.at))} · ${escapeHtml(h.employeeName||'Сотрудник')}${h.administration?' · Администратор':''}</small></div>`).join('')}</section>`;
}
function openReceiptPaymentCorrection(orderId){
 if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
 const order=state.orders.find(o=>o.id===orderId),error=receiptPaymentCorrectionError(order);
 if(error){flash(error);return false;}
 const to=order.method==='cash'?'card':'cash';
 receiptPaymentCorrection={orderId,to,baseline:JSON.stringify(order)};
 showModal(`<div class="modal-title">Изменить способ оплаты</div><div class="receipt-payment-change"><span>${receiptPaymentName(order.method)}</span><span aria-hidden="true">→</span><strong>${receiptPaymentName(to)}</strong></div><p class="settings-note">Чек ${escapeHtml(order.receiptDisplayNumber||'')} на ${fullMoney(order.total)}. Изменятся способ оплаты и итоги исходной смены. Сумма и товары останутся прежними.</p><p class="setting-sub">Исправляется запись в приложении. Операция по банковскому терминалу не выполняется.</p><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="confirmReceiptPaymentCorrection()">${to==='card'?'Изменить на карту':'Изменить на наличные'}</button></div>`);
 return true;
}
async function confirmReceiptPaymentCorrection(){
 if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return false;}
 const draft=receiptPaymentCorrection;if(!draft)return false;
 const order=state.orders.find(o=>o.id===draft.orderId),error=receiptPaymentCorrectionError(order);
 if(error){flash(error);return false;}
 if(JSON.stringify(order)!==draft.baseline){flash('Чек изменился. Откройте изменение оплаты заново');return false;}
 if(!['cash','card'].includes(draft.to)||draft.to===order.method)return false;
 const nextOrders=storageSnapshot(state.orders),next=nextOrders.find(o=>o.id===order.id),admin=currentShiftEmployeeIsAdmin();
 const employee=admin?state.employees.find(e=>e.role==='admin'):state.employees.find(e=>e.id===currentShift()?.employeeId);
 const actorShift=currentShift();
 const history={id:uid(),at:Date.now(),from:order.method,to:draft.to,administration:admin,employeeId:employee?.id||(admin?'':actorShift?.employeeId||''),employeeName:employee?.name||employee?.fullName||(admin?'Администратор':actorShift?.employeeName||'Сотрудник'),previousPayments:storageSnapshot(order.payments??null),previousCashGiven:order.cashGiven??null,previousChange:order.change??null};
 next.paymentCorrections=[...(Array.isArray(next.paymentCorrections)?next.paymentCorrections:[]),history];
 next.method=draft.to;next.payments=[{method:draft.to,amount:Math.round(Number(next.total)*100)/100,cashGiven:null,change:null}];
 // The actual banknote amount is unknown after a correction. Do not invent change.
 next.cashGiven=null;next.change=null;
 criticalOperationBusy=true;
 try{await commitCriticalStorage('correct-receipt-payment',{orders:nextOrders});}
 catch(e){flash('Оплата не изменена: '+(e?.message||e));return false;}
 finally{criticalOperationBusy=false;}
 state.orders=nextOrders;receiptPaymentCorrection=null;
 try{closeModal();state.selectedReceiptId=next.id;render();flash('Способ оплаты изменён');}catch(e){console.error('Оплата сохранена, но экран не обновлён');}
 return true;
}

function showReceipt(order){
  showPaymentReceipt(order);
}
function viewReceiptModal(orderId){
  const order = state.orders.find(o=>o.id===orderId);
  if(!order) return;
  showModal(`
    <div class="modal-title">Чек</div>
    <div id="receipt-body">${receiptBodyHtml(order)}</div>${receiptPaymentCorrectionHistory(order)}
    <div class="receipt-modal-actions">
      <button class="btn receipt-action receipt-action-print" onclick="printReceipt('${order.id}')">Печать</button>
      ${receiptPaymentCorrectionButton(order)}
      ${order.returnedAt ? `<div class="receipt-action receipt-return-sticker">Возврат</div>` : `<button type="button" class="btn receipt-action receipt-action-return" onclick="window.openReturnConfirm('${escapeAttr(order.id)}')">Вернуть</button>`}
      <button class="btn receipt-action receipt-action-close" onclick="closeModal()">Закрыть</button>
    </div>
  `);
}
function restoreOrderStock(order,products=state.products){
  const resolveProduct=id=>products.find(p=>p.id===id);
  if(Object.prototype.hasOwnProperty.call(order,'stockConsumption')){
    const saved=order.stockConsumption;
    if(!saved || saved.version!==1 || !Array.isArray(saved.items)) throw new Error('Некорректные данные списания чека');
    const seen=new Set();
    // Validate every target before changing any stock or return/cash state.
    const updates=saved.items.map(item=>{
      if(!item || seen.has(item.productId) || !Number.isFinite(item.qty) || item.qty<=0) throw new Error('Некорректные данные списания чека');
      seen.add(item.productId);
      const p=resolveProduct(item.productId);
      if(!p || p.type!=='simple') throw new Error('Не найден исходный складской товар для возврата');
      const stock=Number(p.stock);
      if(!Number.isFinite(stock) || !Number.isFinite(stock+item.qty)) throw new Error('Некорректный остаток для возврата');
      return {p,stock:stock+item.qty};
    });
    for(const update of updates) update.p.stock=roundStockQty(update.stock);
    return;
  }
  // Old receipts have no historical recipe. Preserve their legacy return path.

  for(const item of (order.items||[])){
    const p=resolveProduct(item.productId);
    if(!p) continue;
    if(p.type==='simple'){
      p.stock = roundStockQty(Number(p.stock||0) + Number(item.qty||0));
    }else{
      for(const c of (p.components||[])){
        const comp=resolveProduct(c.productId);
        if(productTracksStock(comp)) comp.stock = roundStockQty(Number(comp.stock||0) + Number(c.qty||0)*Number(item.qty||0));
      }
    }
  }
}
function openReturnConfirm(orderId){
  const order=state.orders.find(o=>o.id===orderId);
  if(!order) return;
  if(order.returnedAt){ flash('Этот чек уже возвращён'); return; }
  const shift=currentShift();
  if(!shift){ flash('Для возврата откройте кассовую смену'); return; }
  const total=Number(order.total||0);
  showModal(`
    <div class="modal-title">Возврат товара</div>
    <div class="settings-note receipt-return-note">Будет выполнен полный возврат чека. Все товары вернутся на склад, а покупателю будет возвращена сумма <b>${fullMoney(total)}</b>.</div>
    <div class="field"><label>Чек</label><div class="receipt-return-meta">${fmtDate(order.timestamp)} · ${order.method==='cash'?'Наличные':order.method==='card'?'Карта':'Наличные + карта'}</div></div>
    <div class="field"><label>К возврату</label><div class="receipt-return-amount">${fullMoney(total)}</div></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
      <button class="btn btn-danger" onclick="window.processFullReturn('${escapeAttr(order.id)}')">Вернуть ${fullMoney(total)}</button>
    </div>`);
}
async function processFullReturn(orderId){
  if(criticalOperationBusy){flash('Сохранение операции ещё не завершено');return;}
  try{
    const order=state.orders.find(o=>String(o.id)===String(orderId));
    const shift=currentShift();
    if(!order){flash('Чек не найден');return;}
    if(order.returnedAt){flash('Этот чек уже возвращён');return;}
    if(!shift){flash('Для возврата откройте кассовую смену');return;}
    const total=Math.round(Number(order.total||0)*100)/100;
    if(!Number.isFinite(total)||total<0){flash('Некорректная сумма возврата');return;}
    const cashPayments=Array.isArray(order.payments)?order.payments.filter(p=>p.method==='cash'):null;
    if(cashPayments?.some(p=>!Number.isFinite(Number(p.amount))||Number(p.amount)<0)){flash('Некорректные данные оплаты чека');return;}
    const refundCash=cashPayments?cashPayments.reduce((s,p)=>s+Number(p.amount),0):(order.method==='cash'?total:0);
    if(!Number.isFinite(refundCash)||refundCash<0||refundCash>total+0.0001){flash('Некорректные данные оплаты чека');return;}
    if(refundCash>0){
      const t=shiftTotals(shift.id);
      const available=cashDrawerBalance(shift,t);
      if(!Number.isFinite(available)||available<0){flash('Некорректные данные кассовой смены');return;}
      if(refundCash>available+0.0001){flash('Недостаточно наличных в кассе для возврата');return;}
    }
    const nextProducts=storageSnapshot(state.products),nextOrders=storageSnapshot(state.orders),nextShifts=storageSnapshot(state.shifts);
    const nextOrder=nextOrders.find(o=>String(o.id)===String(orderId));
    const nextShift=nextShifts.find(s=>s.id===shift.id);
    restoreOrderStock(nextOrder,nextProducts);
    const now=Date.now();
    nextOrder.returnedAt=now;
    nextOrder.returnedShiftId=shift.id;
    nextOrder.returnAmount=total;
    if(nextOrder.customer?.id)nextOrder.loyaltyReversal={status:'pending',at:now};
    if(!Array.isArray(nextShift.cashMovements)) nextShift.cashMovements=[];
    if(refundCash>0){
      nextShift.cashMovements.push({id:uid(),type:'withdrawal',subtype:'refund',amount:refundCash,timestamp:now,note:'Возврат чека'});
    }
    criticalOperationBusy=true;
    try{await commitCriticalStorage('return',{products:nextProducts,orders:nextOrders,shifts:nextShifts})}
    finally{criticalOperationBusy=false}
    state.products=nextProducts;state.orders=nextOrders;state.shifts=nextShifts;
    if(refundCash>0)window.requestCashDrawer?.('refund',String(orderId)+':'+now);
    void publishAvailability();
    const committedOrder=state.orders.find(o=>String(o.id)===String(orderId));
    if(committedOrder.customer?.id)void settleReturnedOrderLoyalty(committedOrder);
    closeModal();
    render();
    setTimeout(()=>showModal(`
      <div class="modal-title">Возврат выполнен</div>
      <div class="settings-note">Товары возвращены на остатки. ${refundCash>0?'Наличная часть списана из текущей кассовой смены как «Возврат чека».':''}${(order.method==='card'||order.method==='split')?' Карточная часть возвращается через банковский терминал.':''}</div>
      <div class="field"><label>Сумма возврата</label><div class="receipt-return-amount">${fullMoney(total)}</div></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="viewReceiptModal('${escapeAttr(committedOrder.id)}')">Открыть чек</button><button type="button" class="btn btn-primary" onclick="closeModal()">Готово</button></div>`),50);
  }catch(e){
    console.error('processFullReturn error',e);
    flash('Не удалось выполнить возврат: '+(e.message||'неизвестная ошибка'));
  }
}
window.processFullReturn = processFullReturn;
window.openReturnConfirm = openReturnConfirm;

function printReceipt(orderId){
  const order = state.orders.find(o=>o.id===orderId);
  if(!order) return;
  if(typeof window.sendOrderToPrint==='function'){
    window.sendOrderToPrint(order);
    return;
  }
  flash('Модуль сетевой печати не загружен');
}

/* ============================= RECEIPTS SCREEN (история чеков) ============================= */
function selectReceipt(orderId){
  const list=document.getElementById('receipts-list');
  const scrollTop=list?.scrollTop||0;
  state.selectedReceiptId=orderId;
  render();
  requestAnimationFrame(()=>{
    const nextList=document.getElementById('receipts-list');
    if(nextList) nextList.scrollTop=scrollTop;
  });
}
function renderReceiptsScreen(){
  const list = state.orders.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,300);
  const selected = list.find(o=>o.id===state.selectedReceiptId) || list[0] || null;
  if(selected && state.selectedReceiptId!==selected.id) state.selectedReceiptId=selected.id;
  return `
  <div class="screen content-screen ${state.tab==='receipts'?'active':''}">
    <div class="content-head"><div class="content-title">Чеки</div></div>
    <div class="receipts-layout">
      <aside class="card receipts-list-panel">
        <div class="receipts-list-header">
          <div class="receipts-list-heading">История чеков</div>
          <div class="receipts-list-count">Показано: ${list.length}</div>
        </div>
        <div class="receipts-list" id="receipts-list">
          ${list.length ? list.map(o=>`
            <button type="button" class="receipts-list-row ${o.id===selected?.id?'selected':''} ${o.returnedAt?'returned':''}" aria-pressed="${o.id===selected?.id?'true':'false'}" onclick="selectReceipt('${escapeAttr(o.id)}')">
              <span class="receipts-list-topline">
                <span class="receipts-list-number">Чек ${escapeHtml(o.receiptDisplayNumber||'')}</span>
                <span class="receipts-list-amount">${fullMoney(o.total)}</span>
              </span>
              <span class="receipts-list-meta">${fmtDate(o.timestamp)} · ${o.method==='cash'?'Наличные':o.method==='card'?'Карта':'Наличные + карта'}</span>
              <span class="receipts-list-statusline">
                <span class="receipts-order-type">${escapeHtml(o.orderType||'На месте')}</span>
                ${o.returnedAt ? '<span class="receipt-return-sticker">Возврат</span>' : ''}
              </span>
            </button>
          `).join('') : `<div class="center-note receipts-list-empty">Чеков пока нет — они появятся здесь после первой оплаты.</div>`}
        </div>
      </aside>
      <div class="card receipt-detail-card">
        ${selected ? `
          <div class="receipt-detail-title">Чек ${escapeHtml(selected.receiptDisplayNumber||'')}</div>
          <div id="receipt-body" class="receipt-detail-body">${receiptBodyHtml(selected)}</div>${receiptPaymentCorrectionHistory(selected)}
          <div class="receipt-modal-actions receipt-detail-actions">
            <button class="btn receipt-action receipt-action-print receipt-detail-action" onclick="printReceipt('${escapeAttr(selected.id)}')">Печать</button>
            ${receiptPaymentCorrectionButton(selected)}
            ${selected.returnedAt ? `<div class="receipt-action receipt-return-sticker receipt-detail-action">Возврат</div>` : `<button type="button" class="btn receipt-action receipt-action-return receipt-detail-action" onclick="window.openReturnConfirm('${escapeAttr(selected.id)}')">Вернуть</button>`}
          </div>
        ` : `<div class="center-note">Выберите чек слева.</div>`}
      </div>
    </div>
  </div>`;
}
