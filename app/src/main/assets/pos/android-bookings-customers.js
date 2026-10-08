/* Android presentation: bounded hall geometry and a full-window customer workspace. */
(function(global){
  'use strict';
  const styles=`
    .bookings-map-toolbar{justify-content:space-between;gap:12px;padding:12px 16px}
    .android-hall-heading strong{display:block;font-size:17px}.android-hall-heading span{display:block;color:var(--muted);font-size:12px;margin-top:3px}
    .bookings-map-wrap{border-style:solid;border-radius:14px;margin:12px;background-size:32px 32px}
    .hall-table.square{width:clamp(68px,12%,86px);height:76px;min-width:0;min-height:0}
    .hall-table.rectangle{width:clamp(96px,18%,128px);height:72px;min-width:0;min-height:0}
    .hall-table{max-width:calc(100% - 32px);max-height:calc(100% - 32px);padding:8px;border-radius:12px;border-width:1.5px;box-shadow:none}
    .hall-table.selected{box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--accent);z-index:5}
    .hall-table-name{font-size:13px;line-height:1.2;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .hall-table-meta{font-size:10px;line-height:1.2;font-weight:600}
    .android-hall-legend{display:flex;gap:14px;color:var(--muted);font-size:12px}
    .android-hall-legend span{display:inline-flex;align-items:center;gap:6px}.android-hall-legend i{width:8px;height:8px;border-radius:50%;background:var(--success)}.android-hall-legend .reserved i{background:var(--warning)}
    .modal-overlay.android-customer-overlay{padding:0;background:var(--surface)}
    .modal.android-customer-window{width:100%;max-width:none;height:100%;max-height:none;padding:0;border-radius:0;overflow:hidden;display:flex;flex-direction:column}
    .android-customer-workspace{display:flex;flex-direction:column;flex:1;min-height:0;color:var(--ink)}
    .android-customer-header{display:flex;align-items:center;gap:16px;padding:20px 28px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}
    .android-customer-header h1{font-size:23px;line-height:1.3;margin:0;overflow-wrap:anywhere}.android-customer-header small{display:block;font-size:13px;color:var(--muted);margin-top:4px}.android-customer-heading{flex:1;min-width:0}
    .android-customer-header .btn{flex:none;width:auto;min-height:44px}.android-customer-header .icon-btn{width:44px;height:44px;border:1px solid var(--border);flex-shrink:0}
    .android-customer-header svg{width:20px;height:20px}
    .android-customer-body{flex:1;min-height:0;overflow:auto;padding:24px 28px;background:var(--bg);overscroll-behavior:contain}
    .android-customer-modules{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1.7fr);gap:20px;max-width:1440px;margin:auto;align-items:start}
    .android-customer-module{min-width:0;border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:20px}
    .android-customer-module h2{font-size:17px;margin:0 0 14px}.android-customer-module .settings-note{margin:0}
    .android-customer-contacts dl{margin:0;display:grid;gap:14px}.android-customer-contacts dt{color:var(--muted);font-size:12px;margin-bottom:4px}.android-customer-contacts dd{margin:0;font-size:15px;overflow-wrap:anywhere}
    .android-customer-activity{grid-column:1/-1}.android-customer-tabs{display:flex;gap:8px;border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:4px}
    .android-customer-tabs button{min-height:44px;border:1px solid transparent;border-radius:10px;padding:10px 16px;background:transparent;color:var(--muted);font:inherit;font-weight:700;cursor:pointer}.android-customer-tabs button[aria-selected=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
    .android-customer-pane[hidden]{display:none}.android-customer-pane .list-row{padding:16px 0;align-items:start;gap:12px}.android-customer-pane .list-row>div{min-width:0}.android-customer-pane .list-row-name,.android-customer-pane .list-row-sub{overflow-wrap:anywhere;line-height:1.5}
    .android-customer-program{padding:16px 0;border-top:1px solid var(--border);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}.android-customer-program:first-child{border-top:0;padding-top:0}.android-customer-program strong{display:block;font-size:15px;overflow-wrap:anywhere}.android-customer-program p{font-size:13px;color:var(--muted);line-height:1.5;margin:6px 0}.android-customer-program progress{width:100%;max-width:320px;height:8px;accent-color:var(--accent)}.android-customer-program .btn{width:auto;min-height:44px}
    .android-customer-empty{padding:20px 0;color:var(--muted);font-size:14px;line-height:1.6}.android-customer-empty .btn{display:block;margin-top:12px;width:auto}
    .android-customer-meta{font-size:12px;color:var(--muted);line-height:1.5;margin-top:4px}.android-customer-amount{font-size:16px;white-space:nowrap;font-weight:800;margin-left:auto}
    .android-customer-footer{padding:12px 28px;border-top:1px solid var(--border);font-size:12px;line-height:1.5;color:var(--muted);background:var(--surface);flex-shrink:0}
    .android-customer-header button:focus-visible,.android-customer-tabs button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    @media(max-width:700px){.android-customer-tabs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)}.android-customer-tabs button{padding:10px;font-size:13px}.android-customer-header{padding:16px;gap:10px}.android-customer-header h1{font-size:19px}.android-customer-header .customer-avatar{display:none}.android-customer-body{padding:16px}.android-customer-modules{grid-template-columns:1fr;gap:14px}.android-customer-footer{padding:12px 16px}.android-customer-module{padding:16px}.android-customer-program{grid-template-columns:1fr}.android-hall-legend{display:none}.android-customer-header .btn{padding:10px}}
  `;
  if(document.head){const style=document.createElement('style');style.id='android-bookings-customers-style';style.textContent=styles;document.head.appendChild(style)}

  // x/y remain compatible percentages; constrain the full rotated rectangle, not its anchor.
  function clampTable(table,width,height,mapWidth,mapHeight){
    const angle=(Number.isFinite(Number(table.rotation))?Number(table.rotation):0)*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
    const extentX=(width*cos+height*sin-width)/2,extentY=(width*sin+height*cos-height)/2;
    const clamp=(value,low,high)=>Math.max(low,Math.min(Math.max(low,high),value));
    const x=Number.isFinite(Number(table.x))?Number(table.x):7,y=Number.isFinite(Number(table.y))?Number(table.y):8;
    return {x:clamp(x*mapWidth/100,16+extentX,mapWidth-16-width-extentX)/mapWidth*100,y:clamp(y*mapHeight/100,16+extentY,mapHeight-16-height-extentY)/mapHeight*100};
  }
  function fitHall(persist=false){
    const map=document.getElementById('bookingsMap');if(!map||!map.clientWidth||!map.clientHeight)return;
    map.querySelectorAll('.hall-table').forEach(el=>{
      const t=state.hallTables.find(t=>String(t.id)===el.dataset.id);if(!t)return;
      const pos=clampTable(t,el.offsetWidth,el.offsetHeight,map.clientWidth,map.clientHeight);
      el.style.left=pos.x+'%';el.style.top=pos.y+'%';
      if(el.firstElementChild){el.firstElementChild.style.transform=`rotate(${-Number(t.rotation||0)}deg)`;el.firstElementChild.style.maxWidth=Math.max(32,Math.min(el.offsetWidth,el.offsetWidth*Math.abs(Math.cos(Number(t.rotation||0)*Math.PI/180))+el.offsetHeight*Math.abs(Math.sin(Number(t.rotation||0)*Math.PI/180)))-16)+'px';}
      if(persist){t.x=pos.x;t.y=pos.y;}
    });
  }
  let observer,observedMap;
  function observeHall(){
    fitHall();const map=document.getElementById('bookingsMap');if(map===observedMap)return;
    observer?.disconnect();observedMap=map;
    if(map&&global.ResizeObserver){observer=new global.ResizeObserver(()=>fitHall());observer.observe(map)}
  }
  const bookings=global.renderBookingsScreen;
  global.renderBookingsScreen=function(...args){
    return bookings.apply(this,args).replace(/ scale\(1\.015\)/g,'')
      .replace('<div class="bookings-map-toolbar">','<div class="bookings-map-toolbar"><div class="android-hall-heading"><strong>План зала</strong><span>Выберите стол для просмотра бронирований</span></div><div class="android-hall-legend"><span><i></i>Свободен</span><span class="reserved"><i></i>Есть брони</span></div>')
      .replace(/Существуют брони/g,'Есть брони');
  };
  const render=global.render;
  global.render=function(...args){const result=render.apply(this,args);observeHall();return result};
  const saveHall=global.saveHall;
  global.saveHall=function(...args){fitHall(true);return saveHall.apply(this,args)};
  const start=global.hallPointerStart,move=global.hallPointerMove;
  global.hallPointerStart=function(e,el){
    start.call(this,e,el);const d=state._hallDrag;
    if(d&&d.id===el.dataset.id){d.origX=parseFloat(el.style.left)||0;d.origY=parseFloat(el.style.top)||0;}
  };
  global.hallPointerMove=function(e,el){move.call(this,e,el);if(state._hallDrag&&state.hallEditMode)fitHall(true)};

  const icon=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const closeIcon=icon('<path d="m6 6 12 12M18 6 6 18"/>');
  let cardSequence=0;
  function windowMarkup(name,body,phone=''){
    return `<div id="android-customer-workspace" class="android-customer-workspace"><header class="android-customer-header"><button class="btn btn-secondary" onclick="androidCustomerBack()">Назад</button><div class="customer-avatar" aria-hidden="true">${escapeHtml(String(name||'К').trim().charAt(0)||'К')}</div><div class="android-customer-heading"><h1 tabindex="-1">${escapeHtml(name)}</h1><small>${escapeHtml(phone||'Карточка клиента')}</small></div><button class="icon-btn" aria-label="Закрыть карточку клиента" onclick="closeModal()">${closeIcon}</button></header><div class="android-customer-body">${body}</div><footer class="android-customer-footer">Данные клиента и история загружаются с сервера. Корректировки требуют подтверждения администратора.</footer></div>`;
  }
  function showCustomer(markup){
    global.showModal(markup,true);
    const modal=document.querySelector('#modal-root .modal');modal?.classList.add('android-customer-window');modal?.parentElement?.classList.add('android-customer-overlay');
    modal?.setAttribute?.('role','dialog');modal?.setAttribute?.('aria-modal','true');modal?.setAttribute?.('aria-label','Карточка клиента');modal?.querySelector?.('h1')?.focus({preventScroll:true});
    return document.getElementById('android-customer-workspace');
  }
  global.androidCustomerBack=function(){++cardSequence;global.openCustomersAdmin()};
  global.androidCustomerTab=function(name){
    const root=document.getElementById('android-customer-workspace');if(!root||!['orders','ledger'].includes(name))return;
    root.querySelectorAll('[data-customer-tab]').forEach(button=>{const selected=button.dataset.customerTab===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-customer-pane]').forEach(pane=>pane.hidden=pane.dataset.customerPane!==name);
  };
  global.addEventListener?.('keydown',event=>{
    const modal=document.querySelector('#modal-root .android-customer-window');if(!modal)return;
    if(event.key==='Escape'){event.preventDefault();global.closeModal();return;}
    if(event.key!=='Tab')return;
    const controls=[...modal.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')].filter(el=>el.offsetParent!==null);
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  global.androidCustomerTabKey=function(event,name){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?'orders':event.key==='End'?'ledger':name==='orders'?'ledger':'orders';global.androidCustomerTab(next);
    document.querySelector(`[data-customer-tab="${next}"]`)?.focus();
  };
  const n=value=>Number.isFinite(Number(value))?Number(value):0;
  const date=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?escapeHtml(d.toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})):''};
  const signed=value=>(n(value)>0?'+':'')+n(value);
  const operations={EARN:'Начисление за покупку',REWARD_GRANTED:'Подарок начислен',REWARD_REDEEMED:'Подарок использован',ADJUSTMENT:'Корректировка',REVERSAL:'Возврат начислений'};
  const statuses={paid:'Оплачен',completed:'Завершён',returned:'Возврат',cancelled:'Отменён',canceled:'Отменён',accepted:'Принят',pending:'Ожидает обработки',new:'Новый'};
  function failed(id){return `<div class="android-customer-empty">Раздел не удалось загрузить. Проверьте связь и повторите.<button class="btn btn-secondary" onclick="openCustomerAdminCard(${loyaltyInlineArg(id)})">Повторить загрузку</button></div>`}
  global.openCustomerAdminCard=async function(id){
    if(!currentShiftEmployeeIsAdmin()){flash('Требуются права администратора');return;}
    const seq=++cardSequence,mount=showCustomer(windowMarkup('Карточка клиента','<div class="android-customer-empty" role="status">Загрузка данных клиента…</div>'));
    const base='/api/customers/'+encodeURIComponent(id);
    const results=await Promise.allSettled(['/loyalty','/ledger','/orders'].map(path=>global.loyaltyApi(base+path)));
    if(seq!==cardSequence||document.getElementById('android-customer-workspace')!==mount||!currentShiftEmployeeIsAdmin())return;
    const value=i=>results[i].status==='fulfilled'&&results[i].value&&typeof results[i].value==='object'?results[i].value:null;
    const d=value(0),h=value(1),o=value(2),customer=d?.customer||{},programs=Array.isArray(d?.programs)?d.programs:[],orders=Array.isArray(o?.orders)?o.orders:[],ledger=Array.isArray(h?.ledger)?h.ledger:[];
    const contacts=d?`<dl><div><dt>Имя</dt><dd>${escapeHtml(customer.name||'Не указано')}</dd></div><div><dt>Телефон</dt><dd>${escapeHtml(customer.normalized_phone||'Не указан')}</dd></div><div><dt>Telegram</dt><dd>${customer.telegram_user_id?'Привязан':'Не привязан'}</dd></div></dl>`:failed(id);
    const programsHtml=d?(programs.map(p=>`<article class="android-customer-program"><div><strong>${escapeHtml(p.name||'Программа')}</strong><p>${n(p.rewards)>0?`Подарков доступно: ${n(p.rewards)}. Накопление продолжится после использования.`:`Накоплено ${n(p.progress)} из ${n(p.required_quantity)}`}</p><progress aria-label="Прогресс накопления" max="${Math.max(1,n(p.required_quantity))}" value="${Math.max(0,Math.min(n(p.progress),Math.max(1,n(p.required_quantity))))}"></progress></div><button class="btn btn-secondary" onclick="openLoyaltyAdjustment(${loyaltyInlineArg(id)},${loyaltyInlineArg(p.id)},${loyaltyInlineArg(p.name)})">Корректировка</button></article>`).join('')||'<div class="android-customer-empty">У клиента нет активных программ лояльности.</div>'):failed(id);
    const ordersHtml=o?(orders.map(x=>`<article class="list-row"><div><div class="list-row-name">Заказ ${escapeHtml(x.external_id||x.id||'')}</div><div class="android-customer-meta">${date(x.created_at)}${x.status?' · '+escapeHtml(statuses[x.status]||x.status):''}</div><div class="list-row-sub">${(Array.isArray(x.order_items)?x.order_items:[]).map(i=>escapeHtml(i.product_name||'Товар')+' × '+n(i.quantity)).join(', ')||'Состав заказа не указан'}</div></div><strong class="android-customer-amount">${n(x.total).toFixed(2)} BYN</strong></article>`).join('')||'<div class="android-customer-empty">Покупок пока нет.</div>'):failed(id);
    const ledgerHtml=h?(ledger.map(x=>`<article class="list-row"><div><div class="list-row-name">${escapeHtml(operations[x.operation_type]||x.operation_type||'Операция')}</div><div class="android-customer-meta">${escapeHtml(x.loyalty_programs?.name||'')}${x.created_at?' · '+date(x.created_at):''}</div><div class="list-row-sub">Прогресс: ${signed(x.progress_delta)} · Подарки: ${signed(x.reward_delta)}</div>${x.metadata?.reason?'<div class="list-row-sub">Причина: '+escapeHtml(x.metadata.reason)+'</div>':''}</div></article>`).join('')||'<div class="android-customer-empty">Начислений и корректировок пока нет.</div>'):failed(id);
    const body=`<div class="android-customer-modules"><section class="android-customer-module android-customer-contacts"><h2>Данные клиента</h2>${contacts}</section><section class="android-customer-module"><h2>Программы лояльности</h2>${programsHtml}</section><section class="android-customer-module android-customer-activity"><div class="android-customer-tabs" role="tablist" aria-label="История клиента"><button id="customer-tab-orders" data-customer-tab="orders" role="tab" aria-controls="customer-pane-orders" aria-selected="true" onclick="androidCustomerTab('orders')" onkeydown="androidCustomerTabKey(event,'orders')">Покупки${o?' ('+orders.length+')':''}</button><button id="customer-tab-ledger" data-customer-tab="ledger" role="tab" aria-controls="customer-pane-ledger" aria-selected="false" tabindex="-1" onclick="androidCustomerTab('ledger')" onkeydown="androidCustomerTabKey(event,'ledger')">История начислений${h?' ('+ledger.length+')':''}</button></div><div id="customer-pane-orders" class="android-customer-pane" data-customer-pane="orders" role="tabpanel" tabindex="0" aria-labelledby="customer-tab-orders">${ordersHtml}</div><div id="customer-pane-ledger" class="android-customer-pane" data-customer-pane="ledger" role="tabpanel" tabindex="0" aria-labelledby="customer-tab-ledger" hidden>${ledgerHtml}</div></section></div>`;
    showCustomer(windowMarkup(customer.name||'Карточка клиента',body,customer.normalized_phone));
  };
})(window);
