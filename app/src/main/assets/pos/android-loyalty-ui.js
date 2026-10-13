/* Android-only loyalty presentation. The reviewed source remains authoritative for data and actions. */
(function(global){
  'use strict';
  let searchSequence=0,searchText='';
  const styles=`
    .loyalty-page{padding-bottom:18px;overflow:hidden;min-height:0}
    .loyalty-page-inner{max-width:none;height:100%;min-height:0;display:flex;flex-direction:column}
    .loyalty-page-header{justify-content:space-between;gap:16px;margin-bottom:18px;flex:none}
    .loyalty-page-header h1{font-size:21px;line-height:1.3}
    .loyalty-page .btn,.loyalty-sections button{border-radius:999px;min-height:48px}
    .loyalty-page-header .btn{flex:0 0 auto;width:auto;padding:12px 20px;border:1.5px solid var(--border);background:var(--surface)}
    .loyalty-sections{display:flex;gap:8px;border:0;padding:0;background:transparent;flex:none;margin-bottom:18px}
    .loyalty-sections button{flex:0 1 auto;min-width:160px;padding:12px 24px;border:1.5px solid var(--border);background:var(--surface);color:var(--ink)}
    .loyalty-sections button.selected{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
    .android-loyalty-programs{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 2px 14px;scrollbar-gutter:stable}
    .loyalty-section-toolbar{min-height:48px;margin-bottom:16px}.loyalty-section-toolbar .btn{flex:0 0 auto;width:auto;padding:12px 20px}
    .loyalty-program-grid{align-items:start;gap:16px}.loyalty-program-grid>.android-loyalty-empty{grid-column:1/-1}
    .loyalty-program-card{border-radius:var(--radius-l);box-shadow:var(--shadow);padding:22px;border:0}
    .loyalty-program-heading h2{font-size:18px}.loyalty-status{border-radius:999px;padding:7px 11px;font-size:12px}
    .loyalty-status.is-active{background:var(--accent-soft);color:var(--accent);border-color:transparent}
    .loyalty-rule{border-radius:var(--radius-m);padding:18px;margin-top:18px}.loyalty-rule strong{font-size:30px;font-variant-numeric:tabular-nums}.loyalty-rule span{font-size:13px}
    .android-loyalty-product-groups{display:grid;gap:12px;margin:18px 0;color:var(--muted);font-size:12px}
    .android-loyalty-product-groups strong{display:block;color:var(--ink);font-size:13px;margin-bottom:5px}.android-loyalty-product-groups span{line-height:1.5;overflow-wrap:anywhere}
    .loyalty-card-actions{gap:10px}.loyalty-card-actions .btn{padding:12px 14px}.loyalty-card-actions .loyalty-delete{color:var(--danger);min-height:44px;padding:10px}
    .loyalty-clients-panel{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:20px;border:0;border-radius:var(--radius-l);box-shadow:var(--shadow)}
    .loyalty-client-search{flex:none;display:flex;align-items:center;gap:10px;margin-bottom:16px}
    .loyalty-client-search .products-search-wrap{flex:1;min-width:0;margin:0;position:relative}
    .loyalty-client-search input.products-search-input{border-radius:999px;background:var(--bg);min-height:48px;padding:12px 48px 12px 44px}
    .loyalty-client-search .products-search-icon{color:var(--muted)}
    .loyalty-client-search .products-search-clear{right:5px;width:38px;height:38px}
    .loyalty-clients-panel #loyalty-admin-customers{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:0 4px 20px;scroll-padding-bottom:20px}
    .android-loyalty-results-note{flex:none;color:var(--muted);font-size:12px;margin:0 4px 10px}
    .loyalty-clients-panel .loyalty-customer-row{width:100%;min-height:78px;padding:14px 10px;gap:14px;border-radius:var(--radius-s);text-align:left}
    .loyalty-clients-panel .loyalty-customer-row:after{content:none}.loyalty-customer-row .customer-avatar{width:44px;height:44px;flex:0 0 44px;font-size:16px;background:var(--accent-soft);color:var(--accent)}
    .android-loyalty-client-main{flex:1;min-width:0}.loyalty-customer-row .ui-icon-chevron{flex:none;color:var(--muted)}
    .loyalty-clients-panel .loyalty-customer-row:active{background:var(--bg)}
    .android-loyalty-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:150px;padding:24px;text-align:center;color:var(--muted);font-size:14px;line-height:1.5}.android-loyalty-empty strong{color:var(--ink);font-size:16px}
    .loyalty-page button:focus-visible,.loyalty-page input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .modal-overlay.android-customer-overlay{padding:16px;background:rgba(0,0,0,.35)}.modal.android-customer-window,.android-customer-module{border-radius:var(--radius-l)}.android-customer-header .btn,.android-customer-tabs button,.android-customer-program .btn{border-radius:999px}
    .modal.loyalty-editor{border-radius:var(--radius-l)}.modal.loyalty-editor .btn{border-radius:999px;min-height:48px}.modal.loyalty-editor .lp-product-row{border-radius:var(--radius-s)}
    @media(max-width:760px){.loyalty-page{padding:12px}.loyalty-page-header{margin-bottom:12px;gap:10px}.loyalty-page-header h1{font-size:19px}.loyalty-page-header .btn{flex:0 0 auto;width:auto;padding:10px 16px;min-height:44px}.loyalty-sections{margin-bottom:12px}.loyalty-sections button{flex:1;min-width:0;padding:10px 14px;min-height:44px}.loyalty-clients-panel,.loyalty-program-card{padding:16px}.loyalty-client-search{margin-bottom:10px}.loyalty-rule{padding:14px;gap:12px}.loyalty-program-grid{grid-template-columns:1fr}}
    @media(max-height:480px){.loyalty-page{padding-top:8px;padding-bottom:8px}.loyalty-page-header{margin-bottom:8px}.loyalty-sections{margin-bottom:8px}.loyalty-clients-panel{padding:12px}.loyalty-client-search{margin-bottom:8px}.android-loyalty-results-note{margin-bottom:6px}}
  `;
  if(document.head){const style=document.createElement('style');style.id='android-loyalty-ui-style';style.textContent=styles;document.head.appendChild(style)}

  function empty(title,note){return `<div class="android-loyalty-empty"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>`}
  function rows(customers){
    return (customers||[]).map(customer=>{
      const initial=Array.from(String(customer.name||'К').trim())[0]||'К';
      return `<button type="button" class="list-row loyalty-customer-row" onclick="openCustomerAdminCard(${loyaltyInlineArg(customer.id)})" aria-label="Открыть клиента ${escapeAttr(customer.name||'Клиент')}"><span class="customer-avatar" aria-hidden="true">${escapeHtml(initial.toUpperCase())}</span><div class="android-loyalty-client-main"><div class="list-row-name">${escapeHtml(customer.name||'Клиент')}</div><div class="list-row-sub">${escapeHtml(customer.normalized_phone||'Телефон не указан')}${customer.telegram_user_id?' · Telegram':''}</div></div><span class="ui-icon ui-icon-chevron" aria-hidden="true"></span></button>`;
    }).join('')||empty('Клиенты не найдены','Попробуйте другое имя или номер телефона.');
  }
  function productNames(items){
    const names=(items||[]).map(item=>{
      const product=(state.products||[]).find(p=>String(p.id)===String(item.product_id));
      return product?.name||'Товар из программы';
    });
    return names.slice(0,3).map(escapeHtml).join(', ')+(names.length>3?' и ещё '+(names.length-3):'');
  }
  function programCard(program){
    return `<article class="loyalty-program-card"><div class="loyalty-program-heading"><h2>${escapeHtml(program.name)}</h2><span class="loyalty-status ${program.is_active?'is-active':''}">${program.is_active?'Активна':'Выключена'}</span></div><div class="loyalty-rule"><div><strong>${Number(program.required_quantity)||0}</strong><span>товаров для накопления</span></div><span class="loyalty-rule-arrow" aria-hidden="true">→</span><div><strong>1</strong><span>товар в подарок</span></div></div><div class="android-loyalty-product-groups"><div><strong>Товары для накопления · ${(program.loyalty_earning_products||[]).length}</strong><span>${productNames(program.loyalty_earning_products)||'Товары не выбраны'}</span></div><div><strong>На выбор в подарок · ${(program.loyalty_reward_products||[]).length}</strong><span>${productNames(program.loyalty_reward_products)||'Товары не выбраны'}</span></div></div><div class="loyalty-card-actions"><button class="btn btn-primary" onclick="openLoyaltyProgramEdit(${loyaltyInlineArg(program.id)})">Изменить</button><button class="btn btn-secondary" onclick="toggleLoyaltyProgram(${loyaltyInlineArg(program.id)},${!program.is_active})">${program.is_active?'Выключить':'Включить'}</button><button class="btn btn-secondary loyalty-delete" onclick="confirmDeleteLoyaltyProgram(${loyaltyInlineArg(program.id)},${loyaltyInlineArg(program.name)})">Удалить программу</button></div></article>`;
  }
  global.renderLoyaltyAdminScreen=function(){
    const section=state.loyaltyAdminSection||'programs',programs=global.__loyaltyAdminPrograms||[],clients=global.__loyaltyAdminCustomers||[];
    const body=section==='programs'?`<div class="android-loyalty-programs"><div class="loyalty-section-toolbar"><span>Программ: ${programs.length}</span><button class="btn btn-primary" onclick="openLoyaltyProgramCreate()">Новая программа</button></div><div class="loyalty-program-grid">${programs.map(programCard).join('')||empty('Пока нет программ','Создайте первую программу для ваших гостей.')}</div></div>`:`<section class="loyalty-clients-panel" aria-label="Клиенты"><div class="loyalty-client-search"><div class="products-search-wrap products-search-inline"><span class="ui-icon ui-icon-search products-search-icon" aria-hidden="true"></span><input id="loyalty-client-query" class="products-search-input" type="search" value="${escapeAttr(searchText)}" placeholder="Имя или телефон" aria-label="Поиск клиента по имени или телефону" enterkeyhint="search" autocomplete="off" oninput="loyaltyAdminCustomerSearch(this.value)" onsearch="loyaltyAdminCustomerSearch(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"><button type="button" class="icon-btn products-search-clear" onclick="androidLoyaltyClearSearch()" aria-label="Очистить поиск клиентов"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button></div></div><p class="android-loyalty-results-note" id="android-loyalty-results-note" role="status">Клиентов в списке: ${clients.length}</p><div id="loyalty-admin-customers" role="region" tabindex="0" aria-label="Список найденных клиентов">${rows(clients)}</div></section>`;
    return `<div class="screen content-screen loyalty-page ${state.tab==='settings'?'active':''}"><div class="loyalty-page-inner"><header class="content-head loyalty-page-header"><h1>Программа лояльности</h1><button type="button" class="btn btn-secondary" onclick="closeLoyaltyAdminScreen()">Назад</button></header><nav class="loyalty-sections" aria-label="Разделы лояльности"><button type="button" class="${section==='programs'?'selected':''}" aria-pressed="${section==='programs'}" onclick="setLoyaltyAdminSection('programs')">Программы</button><button type="button" class="${section==='clients'?'selected':''}" aria-pressed="${section==='clients'}" onclick="setLoyaltyAdminSection('clients')">Клиенты</button></nav>${body}</div></div>`;
  };
  global.loyaltyAdminCustomerSearch=async function(value){
    searchText=String(value||'');const sequence=++searchSequence,list=document.getElementById('loyalty-admin-customers');if(!list)return;
    const note=document.getElementById('android-loyalty-results-note');list.setAttribute('aria-busy','true');if(note)note.textContent='Ищем клиентов…';
    try{
      const customers=await searchCustomers(searchText.trim()||'375');
      if(sequence!==searchSequence||document.getElementById('loyalty-admin-customers')!==list)return;
      global.__loyaltyAdminCustomers=customers;list.innerHTML=rows(customers);list.scrollTop=0;if(note)note.textContent='Клиентов в списке: '+customers.length;
    }catch(error){if(sequence===searchSequence&&document.getElementById('loyalty-admin-customers')===list){list.innerHTML=empty('Не удалось загрузить клиентов','Проверьте соединение и повторите поиск.');if(note)note.textContent='Поиск недоступен';}}
    finally{if(sequence===searchSequence)list.removeAttribute('aria-busy');}
  };
  global.androidLoyaltyClearSearch=function(){const input=document.getElementById('loyalty-client-query');if(!input)return;input.value='';void global.loyaltyAdminCustomerSearch('');input.focus();};
  global.loadLoyaltyAdminScreen=async function(){
    if(state.loyaltyAdminSection==='clients')return global.loyaltyAdminCustomerSearch(searchText);
    const sequence=++searchSequence;
    try{
      const data=await loyaltyApi('/api/loyalty/programs');
      if(sequence!==searchSequence||!state.loyaltyAdminScreen||state.loyaltyAdminSection==='clients')return;
      global.__loyaltyAdminPrograms=data.programs||[];global.render();
    }catch(error){if(sequence===searchSequence&&state.loyaltyAdminScreen)flash('Не удалось загрузить программы лояльности');}
  };
  global.setLoyaltyAdminSection=function(section){
    if(!['programs','clients'].includes(section))return;
    searchSequence++;searchText='';state.loyaltyAdminSection=section;global.render();return global.loadLoyaltyAdminScreen();
  };
  const originalClose=global.closeLoyaltyAdminScreen;
  if(typeof originalClose==='function')global.closeLoyaltyAdminScreen=function(){searchSequence++;searchText='';return originalClose.apply(this,arguments)};
  function fitViewport(){
    const page=document.querySelector('.loyalty-page.active');if(!page)return;
    const viewport=global.visualViewport,bottom=(global.__mposVisibleViewportHeight??viewport?.height??global.innerHeight)+(viewport?.offsetTop||0);
    const available=Math.max(0,Math.floor(bottom-page.getBoundingClientRect().top));page.style.height=available+'px';
  }
  global.androidLoyaltyFitViewport=fitViewport;
  const originalRender=global.render;
  if(typeof originalRender==='function')global.render=function(){const result=originalRender.apply(this,arguments);fitViewport();return result};
  global.addEventListener('resize',fitViewport);
  global.visualViewport?.addEventListener('resize',fitViewport);
  global.visualViewport?.addEventListener('scroll',fitViewport);
})(window);
