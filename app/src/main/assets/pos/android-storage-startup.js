/* Do not load fallback empty records when the durable store could not be opened. */
(function(global){
 const load=global.loadAll;
 global.loadAll=function(){
  if(global.__mposStorageReady===true)return load.apply(this,arguments);
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="center-note" role="alert">Не удалось открыть локальную базу M POS. Исходные данные не удалены. Полностью закройте приложение и повторите запуск. Не очищайте данные приложения. Если ошибка остаётся, обратитесь за поддержкой.</div>';
  global.webkit?.messageHandlers?.startup?.postMessage({action:'ready'});
  return Promise.resolve(false);
 };
})(window);
