/* Android settings presentation; upstream actions and role checks remain authoritative. */
(function(global){
  'use strict';
  const icons={
    loyalty:'<path d="M20 8v12H4V8M2 8h20M12 8v12M12 8H7a3 3 0 1 1 3-3l2 3Zm0 0h5a3 3 0 1 0-3-3l-2 3Z"/>',
    network:'<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="8" height="6" rx="1"/><rect x="14" y="16" width="8" height="6" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    company:'<path d="M4 22V4l8-2v20M12 8h8v14M2 22h20M7 7h2M7 11h2M7 15h2M16 12h1M16 16h1M8 22v-3"/>',
    inventory:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m8 12 2 2 5-5M8 18h8"/>',
    warehouse:'<path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 21v-9h10v9M7 16h10M7 19h10"/>',
    back:'<path d="m14 6-6 6 6 6M8 12h12"/>',
    next:'<path d="m9 6 6 6-6 6"/>'
  };
  function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name]}</svg>`}
  const settings=global.renderSettingsScreen;
  global.renderSettingsScreen=function(...args){
    const admin=currentShiftEmployeeIsAdmin();
    if(!admin){state.settingsAdminPanel=false;state.loyaltyAdminScreen=false;}
    const markup=settings.apply(this,args);
    return admin?markup:markup.replace(/<button\b[^>]*onclick="openAdminPanel\(\)"[^>]*>[\s\S]*?<\/button>/g,'');
  };
  global.renderAdminPanel=function(){
    if(!currentShiftEmployeeIsAdmin())return '';
    const actions=[
      ['loyalty','Программа лояльности','Программы, правила начисления, подарки и база клиентов.','openLoyaltyAdminScreen()'],
      ['network','Сетевые настройки','Синхронизация, подключение принтера и сетевые конфигурации.',"setTab('network')"],
      ['company','Реквизиты организации','Название заведения, юридическое лицо, адрес и адрес доставки.','openCompanyDetailsModal()'],
      ['inventory','Инвентаризация','График пересчёта, список товаров, проведение и история.',"setTab('inventory')"],
      ['warehouse','Складской учёт','Остатки, движение товаров, поставщики и складские отчёты.','openWarehousePage()']
    ];
    return `<div class="android-admin-panel"><div class="content-head settings-content-head"><div class="settings-head-main"><button class="btn btn-secondary settings-back-button android-admin-back" onclick="closeAdminPanel()">${icon('back')}<span>Назад</span></button><div class="content-title">Панель администратора</div></div></div><div class="android-admin-actions">${actions.map(([name,title,description,action])=>`<button class="android-admin-action" onclick="${action}"><span class="android-admin-icon">${icon(name)}</span><span class="android-admin-copy"><span class="android-admin-title">${title}</span><span class="android-admin-description">${description}</span></span><span class="android-admin-next">${icon('next')}</span></button>`).join('')}</div></div>`;
  };
  if(document.head){
    const style=document.createElement('style');style.id='android-admin-style';
    style.textContent=`
      .android-admin-panel{max-width:1080px}
      .android-admin-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .android-admin-action{display:flex;align-items:center;gap:16px;min-height:116px;width:100%;padding:20px;text-align:left;border:1px solid var(--border);border-radius:var(--radius-m);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;box-shadow:none}
      .android-admin-action:active{background:var(--bg)}
      .android-admin-action:focus-visible,.android-admin-back:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      .android-admin-icon{width:46px;height:46px;display:grid;place-items:center;flex-shrink:0;border:1px solid var(--border);border-radius:12px}
      .android-admin-icon svg{width:25px;height:25px}
      .android-admin-copy{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}
      .android-admin-title{font-size:16px;font-weight:750;line-height:1.3}
      .android-admin-description{font-size:13px;line-height:1.5;color:var(--muted);font-weight:400}
      .android-admin-next{display:flex;flex-shrink:0;color:var(--muted)}
      .android-admin-next svg,.android-admin-back svg{width:18px;height:18px}
      .android-admin-back{display:inline-flex;align-items:center;gap:7px}
      @media(max-width:760px){.android-admin-actions{grid-template-columns:1fr}.android-admin-action{min-height:100px;padding:16px;gap:13px}}
    `;document.head.appendChild(style);
  }
})(window);
