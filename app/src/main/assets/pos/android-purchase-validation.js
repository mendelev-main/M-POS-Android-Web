/* Android purchase diagnostics. Source quantity conversion and journal remain authoritative. */
(function(global){
  'use strict';
  const makeLine=global.makePurchaseLine;
  function label(unit){return PRODUCT_UNITS[unit]?.label||(['pack','box','bottle'].includes(unit)?purchaseUnitLabel(unit):unit?String(unit)+' (неизвестная единица)':'не задана')}
  global.makePurchaseLine=function(product,qty,unit,size,content){
    try{return makeLine.apply(this,arguments)}catch(error){
      const pack=['pack','box','bottle'].includes(unit),base=stockUnit(product),from=pack?(content||base):unit;
      let reason=String(error?.message||error),field='[data-request-qty]';
      if(/Несовместимые единицы измерения/i.test(reason)){
        field=pack?'[data-content-unit]':'[data-request-unit]';
        reason=`${pack?'Единица внутри '+({pack:'упаковки',box:'коробки',bottle:'бутылки'})[unit]:'Единица заказа'}: «${label(from)}». Складской учёт: «${label(base)}». `;
        const compatible=Object.keys(PRODUCT_UNITS).filter(u=>PRODUCT_UNITS[u].kind===PRODUCT_UNITS[base]?.kind).map(label);
        reason+=compatible.length?`Выберите совместимую единицу: ${compatible.join(' или ')}.`:'Укажите складскую единицу в карточке товара; автоматический пересчёт невозможен.';
      }else if(/в единице закупки/i.test(reason))field='[data-request-size]';
      const detailed=new Error(`Товар «${product?.name||product?.id||'не найден'}»: ${reason}`);
      detailed.purchaseField=field;detailed.purchaseProductId=product?.id;throw detailed;
    }
  };
  function failures(){
    const result=[];
    for(const item of state.purchaseOrderCart||[]){
      const product=getProduct(item.productId);if(!product||product.type!=='simple')continue;
      try{global.makePurchaseLine(product,item.requestedQty??item.qty,item.requestedUnit??stockUnit(product),item.packSize??'',item.contentUnit??product.purchaseContentUnit??stockUnit(product))}
      catch(error){result.push({id:item.productId,message:error.message,field:error.purchaseField,product})}
    }
    return result;
  }
  function rows(){return [...(document.querySelectorAll?.('[data-purchase-row]')||[])]}
  function paint(){
    const invalid=new Map(failures().map(error=>[error.id,error]));
    for(const row of rows()){
      const error=invalid.get(row.dataset.purchaseRow);row.classList.toggle('android-purchase-invalid',!!error);
      row.querySelectorAll('[aria-invalid]').forEach(field=>field.removeAttribute('aria-invalid'));
      if(error){
        const field=row.querySelector(error.field);field?.setAttribute('aria-invalid','true');
        const note=row.querySelector('[data-request-note]');if(note)note.textContent=error.message;
        // A stale draft can hold an incompatible unit hidden by the source option filter.
        // Show it explicitly instead of suggesting a different unit was already selected.
        const draft=state.purchaseOrderCart.find(item=>item.productId===error.id);
        const value=error.field==='[data-content-unit]'?(draft?.contentUnit??error.product.purchaseContentUnit??stockUnit(error.product)): error.field==='[data-request-unit]'?(draft?.requestedUnit??stockUnit(error.product)):undefined;
        if(field&&value!==undefined&&field.tagName==='SELECT'&&![...field.options].some(option=>option.value===value)){
          const option=document.createElement('option');option.value=value;option.textContent=label(value)+' — несовместима';option.selected=true;field.appendChild(option);
        }
      }
    }
  }
  let shownErrors=[];
  global.androidFocusPurchaseError=function(index){
    const error=shownErrors[Number(index)];if(!error)return;
    global.closeModal();const panel=document.getElementById('purchase-expand-panel');if(panel)panel.hidden=false;
    global._purchaseExpanded=true;document.querySelector('.supply-expand-button')?.setAttribute('aria-expanded','true');
    const row=rows().find(row=>row.dataset.purchaseRow===error.id);row?.scrollIntoView({block:'center'});row?.querySelector(error.field)?.focus();
  };
  const finalize=global.finalizePurchaseOrder;
  global.finalizePurchaseOrder=async function(...args){
    if(criticalOperationBusy||!getPurchaseOrderSupplier())return finalize.apply(this,args);
    const errors=failures();if(!errors.length)return finalize.apply(this,args);
    shownErrors=errors;paint();
    global.showModal(`<div class="modal-title">Заказ не сформирован</div><p class="settings-note">Исправьте указанные позиции. Введённые количества сохранены.</p><div class="android-purchase-errors">${errors.map((error,index)=>`<section><strong>${escapeHtml(String(error.product.name||error.id))}</strong><p>${escapeHtml(error.message)}</p><button class="btn btn-secondary" onclick="androidFocusPurchaseError(${index})">Перейти к товару</button></section>`).join('')}</div><div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Вернуться к заказу</button></div>`,true);
    return false;
  };
  const update=global.updatePurchaseRequest;
  global.updatePurchaseRequest=function(...args){const result=update.apply(this,args);paint();return result};
  const render=global.render;
  global.render=function(...args){const result=render.apply(this,args);paint();return result};
  if(document.head){const style=document.createElement('style');style.id='android-purchase-validation-style';style.textContent=`.supply-request.android-purchase-invalid{border:1.5px solid var(--danger);border-radius:12px;padding:12px}.android-purchase-invalid [data-request-note]{color:var(--danger);line-height:1.5;white-space:normal}.android-purchase-invalid [aria-invalid=true]{border-color:var(--danger)}.android-purchase-errors{display:grid;gap:12px;margin-top:18px}.android-purchase-errors section{padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--bg)}.android-purchase-errors strong{font-size:16px;overflow-wrap:anywhere}.android-purchase-errors p{font-size:14px;line-height:1.6;overflow-wrap:anywhere;margin:8px 0 12px}.android-purchase-errors .btn{width:auto;min-height:44px}`;document.head.appendChild(style)}
})(window);
