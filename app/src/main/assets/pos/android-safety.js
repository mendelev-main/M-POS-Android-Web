/* Android runtime safety: preserve the single upstream journal and source transaction snapshots. */
(function(global){
  'use strict';
  const commit=global.commitCriticalStorage;let committing=false;
  global.commitCriticalStorage=async function(...args){
    if(storageBroken&&args[0]!=='backup-import')throw new Error('Хранилище недоступно или повреждено. Операция заблокирована; перезапустите приложение или восстановите проверенную копию');
    if(committing)throw new Error('Выполняется сохранение другой операции. Дождитесь завершения и повторите действие');
    committing=true;
    try{return await commit.apply(this,args)}finally{committing=false}
  };
  const render=global.render;let ready=false;
  global.render=function(...args){
    const result=render.apply(this,args);
    if(state.loaded&&!ready){
      global.requestAnimationFrame(()=>global.requestAnimationFrame(()=>{
        if(ready)return;
        const handler=global.webkit?.messageHandlers?.startup;
        if(handler&&handler.postMessage({action:'ready'})!==false)ready=true;
      }));
    }
    return result;
  };
})(window);
