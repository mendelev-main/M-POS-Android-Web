/* Android customer input presentation: stable workspace, keyboard-aware dialogs, fixed Belarus prefix. */
(function(global){
  'use strict';
  let keyboardHeight=0,creating=false,workspaceHeight=global.innerHeight;
  const styles=`
    #app{height:var(--android-workspace-height,100dvh)}
    .modal-overlay{bottom:auto;height:var(--android-visible-height,100dvh);max-height:var(--android-visible-height,100dvh)}
    .modal-overlay .modal{max-height:calc(var(--android-visible-height,100dvh) - 28px)}
    .modal.customer-picker-modal{display:flex;flex-direction:column;overflow:hidden}
    .customer-picker-heading,.customer-search-field{flex:none}
    .customer-picker-results{min-height:0;flex:1;overflow-y:auto;touch-action:pan-y}
    .customer-phone-field.android-customer-phone{border-radius:999px}
    .android-customer-phone>span{white-space:nowrap;flex:none;font-size:16px;font-weight:700}
    .android-customer-phone input{width:100%;padding:12px!important;font-variant-numeric:tabular-nums}
    .android-customer-phone.android-customer-suffix{width:max-content;max-width:100%}.android-customer-phone.android-customer-suffix input{max-width:160px;min-width:110px;letter-spacing:2px}
    @media(max-width:480px){.android-customer-phone>span{padding:0 12px;font-size:14px}.android-customer-phone input{font-size:18px!important}}
  `;
  if(document.head){const style=document.createElement('style');style.id='android-customer-input-style';style.textContent=styles;document.head.appendChild(style)}
  function measure(){
    // adjustNothing keeps the Android layout viewport full-sized; only dialogs lose keyboard space.
    if(!keyboardHeight)workspaceHeight=global.innerHeight;
    const visible=Math.max(0,Math.min(workspaceHeight-keyboardHeight,global.visualViewport?.height||workspaceHeight));
    document.documentElement.style.setProperty('--android-workspace-height',workspaceHeight+'px');
    document.documentElement.style.setProperty('--android-visible-height',visible+'px');
    global.__mposVisibleViewportHeight=visible;global.androidLoyaltyFitViewport?.();
  }
  global.__mposKeyboardInsets=function(height){keyboardHeight=Math.max(0,Number(height)||0);measure();};
  global.addEventListener('resize',measure);
  global.visualViewport?.addEventListener('resize',measure);
  global.visualViewport?.addEventListener('scroll',measure);
  measure();
  function prefixField(input,text,suffix=false){
    if(!input)return;
    let box=input.closest('.customer-phone-field');
    if(!box){box=document.createElement('div');box.className='customer-phone-field';input.parentNode.insertBefore(box,input);box.appendChild(input);}
    box.classList.add('android-customer-phone');if(suffix)box.classList.add('android-customer-suffix');
    let prefix=box.querySelector?.('.android-customer-prefix');if(!prefix){prefix=document.createElement('span');prefix.className='android-customer-prefix';box.insertBefore(prefix,input);}prefix.textContent=text;prefix.setAttribute('aria-hidden','true');
  }
  const originalPicker=global.openCustomerPicker;
  global.openCustomerPicker=async function(){
    const result=await originalPicker.apply(this,arguments);const input=document.getElementById('customer-search');
    if(input){prefixField(input,'+375 XX XXX',true);input.placeholder='1234';input.setAttribute('aria-label','Последние четыре цифры телефона после +375 XX XXX');}
    return result;
  };
  function nationalDigits(value){
    const text=String(value||'').trim(),digits=text.replace(/\D/g,'');
    if(text.startsWith('+')&&!text.startsWith('+375'))return '';
    return (text.startsWith('+375')||(digits.length===12&&digits.startsWith('375'))?digits.slice(3):digits).slice(0,9);
  }
  global.androidCustomerPhoneInput=function(input){input.value=nationalDigits(input.value);};
  const originalCreate=global.openCreateCustomer;
  global.openCreateCustomer=function(){
    const result=originalCreate.apply(this,arguments),input=document.getElementById('new-customer-phone');
    if(input){prefixField(input,'+375');input.type='tel';input.inputMode='numeric';input.maxLength=9;input.placeholder='29 123 45 67';input.autocomplete='tel-national';input.setAttribute('aria-label','Номер телефона после +375, девять цифр');input.oninput=()=>global.androidCustomerPhoneInput(input);input.onpaste=event=>{const text=event.clipboardData?.getData('text');if(text){event.preventDefault();input.value=nationalDigits(text);}};}
    const save=document.querySelector('#modal-root [onclick="createCustomerFromPos()"]');if(save)save.id='android-new-customer-save';
    return result;
  };
  global.createCustomerFromPos=async function(){
    if(creating)return;
    const name=String(document.getElementById('new-customer-name')?.value||'').trim(),digits=nationalDigits(document.getElementById('new-customer-phone')?.value);
    if(!name)return flash('Введите имя клиента');
    if(!/^\d{9}$/.test(digits))return flash('Введите 9 цифр телефона после +375');
    const button=document.getElementById('android-new-customer-save');creating=true;if(button)button.disabled=true;
    try{const data=await loyaltyApi('/api/customers',{method:'POST',body:JSON.stringify({name,phone:'+375'+digits})});await selectCustomer(data.customer.id,data.customer.name,data.customer.normalized_phone);}
    catch(error){flash(error.message||'Не удалось создать клиента');}
    finally{creating=false;if(button)button.disabled=false;}
  };
})(window);
