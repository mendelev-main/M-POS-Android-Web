(function(global){
  'use strict';
  function send(channel,payload){
    try{global.MPosNative.postMessage(JSON.stringify({channel,payload:payload||{}}));return true}
    catch(error){global.flash?.('Нативная функция Android временно недоступна');return false}
  }
  const handler=channel=>Object.freeze({postMessage:payload=>send(channel,payload)});
  global.webkit=global.webkit||{};
  global.webkit.messageHandlers=Object.freeze({
    printer:handler('printer'),
    telegram:handler('telegram'),
    photoPicker:handler('photoPicker'),
    backup:handler('backup'),
    network:handler('network')
  });
  global.__MPOS_PLATFORM__='android';
  global.__MPOS_VERSION__='1.0';
  function stampVersion(){const node=document.querySelector('.settings-version');if(node&&node.textContent.includes('__MPOS_VERSION__'))node.textContent=node.textContent.replace('__MPOS_VERSION__',global.__MPOS_VERSION__)}
  function localPhotoSources(){
    document.querySelectorAll('img[src^="mpos-image://"]').forEach(image=>{
      const match=/^mpos-image:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(image.getAttribute('src')||'');
      if(match)image.setAttribute('src','https://appassets.androidplatform.net/product-images/'+match[1].toLowerCase());
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    stampVersion();localPhotoSources();
    new MutationObserver(()=>{stampVersion();localPhotoSources()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  });
})(window);
