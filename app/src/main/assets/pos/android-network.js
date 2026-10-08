(function(global){
  'use strict';
  const handler=global.webkit?.messageHandlers?.network;
  if(!handler)return;
  const originalFetch=global.fetch.bind(global),OriginalEventSource=global.EventSource;
  const pending=new Map();let sequence=0;
  function send(payload){return handler.postMessage(payload)!==false;}
  function remote(url){const parsed=new URL(url,global.location.href);return parsed.protocol==='https:'&&parsed.origin!==global.location.origin;}
  global.__mposWebNetworkResult=result=>pending.get(result.id)?.receive(result);
  global.fetch=async function(input,options={}){
    const url=typeof input==='string'||input instanceof URL?String(input):input.url;
    if(!remote(url))return originalFetch(input,options);
    const request=new Request(input,options),id='http-'+(++sequence),signal=options.signal||request.signal;
    if(signal?.aborted)throw new DOMException('Запрос отменён','AbortError');
    const body=['GET','HEAD'].includes(request.method)?'':await request.clone().text();
    return new Promise((resolve,reject)=>{
      const abort=()=>{send({action:'cancel',id});finish();reject(new DOMException('Запрос отменён','AbortError'));};
      function finish(){pending.delete(id);signal?.removeEventListener('abort',abort);}
      pending.set(id,{receive(result){
        finish();if(result.type==='error'){reject(new TypeError(result.message));return;}
        try{resolve(new Response([101,204,205,304].includes(result.status)?null:result.body,{status:result.status,statusText:result.statusText,headers:result.headers}));}catch(error){reject(error);}
      }});
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      if(!send({action:'fetch',id,url:request.url,method:request.method,headers:Object.fromEntries(request.headers.entries()),body})){
        finish();reject(new TypeError('Android transport недоступен'));
      }
    });
  };
  class MPosEventSource extends EventTarget {
    static CONNECTING=0;static OPEN=1;static CLOSED=2;
    CONNECTING=0;OPEN=1;CLOSED=2;
    constructor(url,options={}){
      super();if(!remote(url))return new OriginalEventSource(url,options);
      if(options.withCredentials)throw new TypeError('Cookie SSE не поддерживается; используйте ключ устройства');
      this.url=new URL(url,global.location.href).href;this.withCredentials=false;this.readyState=0;this.id='sse-'+(++sequence);
      pending.set(this.id,{receive:result=>{
        if(this.readyState===2)return;
        if(result.type==='open'){this.readyState=1;this.emit(new Event('open'));}
        else if(result.type==='error'){this.readyState=0;this.emit(new Event('error'));}
        else if(result.type==='event')this.emit(new MessageEvent(result.event||'message',{data:result.data,lastEventId:result.lastEventId,origin:new URL(this.url).origin}));
      }});
      if(!send({action:'events',id:this.id,url:this.url}))queueMicrotask(()=>this.emit(new Event('error')));
    }
    emit(event){this.dispatchEvent(event);this['on'+event.type]?.call(this,event);}
    close(){if(this.readyState===2)return;this.readyState=2;pending.delete(this.id);send({action:'cancel',id:this.id});}
  }
  global.EventSource=MPosEventSource;
})(window);
