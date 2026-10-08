const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const messages=[],browserCalls=[];
 const window={location:{href:'https://appassets.androidplatform.net/assets/pos/pos.html',origin:'https://appassets.androidplatform.net'},fetch:async(...args)=>{browserCalls.push(args);return new Response('local')},EventSource:class {},webkit:{messageHandlers:{network:{postMessage:p=>{messages.push(p);return true}}}}};
 const context={window,URL,Request,Response,EventTarget,Event,MessageEvent,DOMException,queueMicrotask};vm.createContext(context);vm.runInContext(fs.readFileSync('app/src/main/assets/pos/android-network.js','utf8'),context);
 return {window,messages,browserCalls};
}
test('backend JSON POST crosses Android transport and retains HTTP failures for source handlers',async()=>{
 const {window,messages}=setup();const promise=window.fetch('https://backend.example/api/orders/test',{method:'POST',headers:{'X-Device-Key':'fixture'},body:'{}'});
 await new Promise(resolve=>setImmediate(resolve));const sent=messages[0];assert.equal(sent.action,'fetch');assert.equal(sent.method,'POST');assert.equal(sent.headers['x-device-key'],'fixture');assert.equal(sent.body,'{}');
 window.__mposWebNetworkResult({id:sent.id,type:'response',status:401,statusText:'Unauthorized',headers:{'content-type':'application/json'},body:'{"error":"unauthorized"}'});
 const response=await promise;assert.equal(response.ok,false);assert.equal(response.status,401);assert.equal((await response.json()).error,'unauthorized');
});
test('abort cancels transport and late completion cannot revive request',async()=>{
 const {window,messages}=setup(),controller=new AbortController();const promise=window.fetch('https://backend.example/health',{signal:controller.signal});const checked=assert.rejects(promise,{name:'AbortError'});
 await new Promise(resolve=>setImmediate(resolve));const id=messages[0].id;controller.abort();await checked;assert.equal(messages[1].action,'cancel');window.__mposWebNetworkResult({id,type:'response',status:200,body:'{}'});
});
test('SSE reconnection keeps original listener and close rejects stale orders',()=>{
 const {window,messages}=setup();const stream=new window.EventSource('https://backend.example/api/orders/events?deviceKey=fixture');const received=[];stream.onmessage=e=>received.push(e.data);
 const id=messages[0].id;window.__mposWebNetworkResult({id,type:'open'});assert.equal(stream.readyState,1);
 window.__mposWebNetworkResult({id,type:'event',event:'message',data:'{"type":"orders"}',lastEventId:'1'});
 window.__mposWebNetworkResult({id,type:'error'});assert.equal(stream.readyState,0);window.__mposWebNetworkResult({id,type:'open'});assert.equal(stream.readyState,1);
 stream.close();window.__mposWebNetworkResult({id,type:'event',data:'stale'});assert.equal(received.length,1);assert.equal(stream.readyState,2);assert.equal(messages[1].action,'cancel');
});
test('local assets still use the WebView fetch implementation',async()=>{
 const {window,browserCalls,messages}=setup();await window.fetch('/assets/pos/Web/js/core/storage.js');assert.equal(browserCalls.length,1);assert.equal(messages.length,0);
});
