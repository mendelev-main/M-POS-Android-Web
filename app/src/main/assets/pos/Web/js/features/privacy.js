// Durable server instructions survive retries and are reapplied before backup restore.
let privacyBusy=false,privacyTimer=null;
function privacyEmptyRules(){return {version:1,cursor:'0',ackCursor:'0',tasks:[]}}
function privacyApplyRules(value,rules){
 const copy=storageSnapshot(value),tasks=Array.isArray(rules?.tasks)?rules.tasks:[];
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){node.forEach(walk);return}
  for(const task of tasks){
   const customerMatch=task.customer_id&&(String(node.customer?.id||node.customer_id||'')===String(task.customer_id));
   const orderMatch=task.task_type==='redact_order'&&((task.order_id&&String(node.webOrderId||node.id||'')===String(task.order_id))||(task.order_external_id&&String(node.external_id||'')===String(task.order_external_id)));
   if(customerMatch&&task.task_type==='stop_loyalty'){
    const currentVersion=Number(node.customer?.membership?.version||0);
    if(currentVersion<=Number(task.membership_version||0)){
     if(node.customer)node.customer.membership={active:false,version:task.membership_version||null};
     if('loyaltyPrograms' in node)node.loyaltyPrograms=[];
     if('loyaltyRedemptions' in node)node.loyaltyRedemptions={};
    }
   }
   if(orderMatch||(customerMatch&&task.task_type==='redact_customer')){
    if(node.customer){const id=node.customer.id;node.customer={...(id?{id}:{}),name:'',phone:'',address:'',membership:{active:false,version:null}};}
    for(const key of ['customer_name','phone','address','comment','orderComment','orderLabel','telegram_user_id','telegram_username','tracking_token'])if(key in node)node[key]='';
    for(const key of ['items','order_items','printedItems'])for(const item of node[key]||[])if(item&&typeof item==='object'&&'comment' in item)item.comment='';
    if('loyaltyPrograms' in node)node.loyaltyPrograms=[];
    if('loyaltyRedemptions' in node)node.loyaltyRedemptions={};
    node.privacyRedactedAt=task.id;
   }
  }
  Object.values(node).forEach(walk);
 }
 walk(copy);return copy;
}
async function privacyFetchPage(after,network){
 if(!network)return loyaltyApi('/api/device/privacy/tasks?after='+encodeURIComponent(after));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{const response=await fetch(String(network.backendUrl||'').replace(/\/+$/,'')+'/api/device/privacy/tasks?after='+encodeURIComponent(after),{headers:{'X-Device-Key':network.deviceKey},cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Сервер недоступен');return await response.json();}finally{clearTimeout(timer)}
}
async function privacyLoadRules({replay=false,network}={}){
 const prior=await loadKey('privacyRules',privacyEmptyRules());
 let rules=replay?privacyEmptyRules():storageSnapshot(prior);
 for(let page=0;page<1000;page++){
  const result=await privacyFetchPage(rules.cursor,network);
  if(!Array.isArray(result.tasks))throw Error('Некорректные задания очистки');
  const known=new Set(rules.tasks.map(t=>String(t.id)));
  for(const task of result.tasks){if(!['stop_loyalty','redact_order','redact_customer'].includes(task.task_type)||!/^\d+$/.test(String(task.id)))throw Error('Некорректное задание очистки');if(!known.has(String(task.id)))rules.tasks.push(task);}
  const next=String(result.nextCursor??rules.cursor);
  if(result.hasMore&&BigInt(next)<=BigInt(rules.cursor))throw Error('Некорректная страница очистки');
  rules.cursor=next;
  if(!result.hasMore)return rules;
 }
 throw Error('Не удалось завершить проверку очистки');
}
async function privacySanitizeBackup(next){
 const draft=next.currentOrderSession;
 if(draft?.paymentDraft?.parts?.some(p=>p?.paid===true)&&Object.values(draft.loyaltyRedemptions||{}).some(n=>Number(n)>0))throw Error('В копии есть незавершённая раздельная оплата с подарком. Требуется отдельное восстановление оплаты: автоматический сброс подарка изменит уже принятую сумму');
 // A backup can outlive the device's local task cursor: replay from the server.
 const network=next.network||networkConfigFromState();
 if(!network.backendUrl||!network.deviceKey)throw Error('Для восстановления нужна связь с настроенным бэкендом: необходимо проверить отозванные согласия и удалённые контакты');
 let rules;try{rules=await privacyLoadRules({replay:true,network})}catch{throw Error('Не удалось проверить удалённые данные на бэкенде. Подключитесь к сети и повторите восстановление');}
 await window.PrilavokCore.Storage.set('privacyRules',rules);
 const clean=privacyApplyRules(next,rules);
 // Cached consent is never sufficient for a gift; refresh after restore.
 for(const session of [clean.currentOrderSession,...(clean.parked||[])])if(session){session.loyaltyPrograms=[];session.loyaltyRedemptions={};if(session.customer)delete session.customer.membership;}
 return clean;
}
async function syncPrivacyCompletions(){
 for(const order of state.orders||[]){
  if(!order.webOrderId||order.privacyCompletion?.status!=='pending')continue;
  try{await loyaltyApi('/api/device/privacy/orders/'+encodeURIComponent(order.webOrderId)+'/closed',{method:'POST',body:'{}'});order.privacyCompletion={status:'synced',at:Date.now()};await window.PrilavokCore.Storage.set('orders',state.orders);}catch{return false}
 }
 return true;
}
async function synchronizePrivacy(){
 if((typeof criticalStorageRecoveryPending!=='undefined'&&criticalStorageRecoveryPending)||privacyBusy||!state.loaded||document.hidden||!networkConfigFromState().deviceKey)return false;
 privacyBusy=true;
 try{
  if(typeof hasPaidSplitPayment==='function'&&hasPaidSplitPayment())return false;
  const prior=await loadKey('privacyRules',privacyEmptyRules()),rules=await privacyLoadRules();
  if(rules.cursor!==prior.cursor){
   const snapshot={orders:state.orders,parked:state.parked,webEvents:state.webEvents,currentOrderSession:currentOrderSessionSnapshot(),webOrderAcceptances:await loadKey('webOrderAcceptances',{})};
   const clean=privacyApplyRules(snapshot,rules);
   await commitCriticalStorage('privacy-instructions',{...clean,privacyRules:rules});
   state.orders=clean.orders;state.parked=clean.parked;state.webEvents=clean.webEvents;
   state.customer=clean.currentOrderSession.customer;state.loyaltyPrograms=clean.currentOrderSession.loyaltyPrograms||[];state.loyaltyRedemptions=clean.currentOrderSession.loyaltyRedemptions||{};
   state.cart=clean.currentOrderSession.items||state.cart;state.orderLabel=clean.currentOrderSession.orderLabel||'';state.orderComment=clean.currentOrderSession.orderComment||'';window.__currentOrderPrintedItems=clean.currentOrderSession.printedItems||[];
   render();
  }
  // Failed acknowledgements retry even when the download cursor has advanced.
  for(const task of rules.tasks.filter(t=>BigInt(t.id)>BigInt(rules.ackCursor||'0'))){await loyaltyApi('/api/device/privacy/tasks/'+task.id+'/ack',{method:'POST',body:'{}'});rules.ackCursor=String(task.id);await window.PrilavokCore.Storage.set('privacyRules',rules);}
  await syncPrivacyCompletions();await loyaltyApi('/api/device/privacy/ready',{method:'POST',body:'{}'});return true;
 }catch{return false}finally{privacyBusy=false}
}
async function initializePrivacy(){
 await synchronizePrivacy();
 clearInterval(privacyTimer);privacyTimer=setInterval(()=>{void synchronizePrivacy()},30000);
}
