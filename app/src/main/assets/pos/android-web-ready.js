/* Android compatibility for the two independent WEB-order ready actions. */
(function(global){
  'use strict';

  const sendCurrentReady=global.__mposWebReadyTransport;
  const confirmParkedReady=global.confirmWebOrderReady;
  try{delete global.__mposWebReadyTransport}catch(_error){}
  if(typeof sendCurrentReady!=='function'||typeof confirmParkedReady!=='function'){
    console.error('[M POS] WEB ready compatibility was not initialized');
    return;
  }

  global.confirmParkedWebOrderReady=confirmParkedReady;
  global.confirmWebOrderReady=function(id,journal){
    if(journal&&typeof journal==='object'&&!Array.isArray(journal))return sendCurrentReady.call(this,id,journal);
    return confirmParkedReady.call(this,id);
  };

  const markCurrentReady=global.markCurrentWebOrderReady;
  if(typeof markCurrentReady!=='function')return;
  let currentReadyBusy=false;
  global.markCurrentWebOrderReady=async function(...args){
    if(currentReadyBusy)return false;
    currentReadyBusy=true;
    try{return await markCurrentReady.apply(this,args)}
    finally{currentReadyBusy=false}
  };
})(window);
