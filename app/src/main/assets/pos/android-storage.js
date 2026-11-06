/* Native durable string persistence. All prilavok_ JSON and the source journal stay unchanged. */
(function(global){
 'use strict';
 const prefix='prilavok_';let legacy=null;try{legacy=global.localStorage}catch(e){}
 function owns(key){return key.startsWith(prefix)||key==='printers'||key==='posNotificationSettings';}
 let ready=false,keys=[],failure='InvalidStateError';
 function invoke(request){
  if(typeof global.__mposStorageCall!=='function')throw new Error('Native storage bridge unavailable');
  const result=JSON.parse(global.__mposStorageCall(JSON.stringify(request)));
  if(!result||result.ok!==true){const e=new Error('Локальная база не подтвердила операцию');e.name=result?.name==='QuotaExceededError'?'QuotaExceededError':'InvalidStateError';throw e;}
  return result;
 }
 try{
  let response=invoke({action:'status'});
  if(response.ready!==true){
   if(!legacy)throw new Error('Legacy storage inaccessible');
   const entries=Object.create(null);
   // Read-only snapshot: a full WebView quota must not prevent migration.
   for(let i=0;i<legacy.length;i++){const key=legacy.key(i);if(key&&owns(key)){const value=legacy.getItem(key);if(value!==null)entries[key]=value;}}
   response=invoke({action:'initialize',entries});
  }
  if(!Array.isArray(response.keys)||response.keys.some(k=>typeof k!=='string'||!owns(k)))throw new Error('Invalid native storage index');
  keys=response.keys;ready=true;
 }catch(e){failure=e?.name==='QuotaExceededError'?'QuotaExceededError':'InvalidStateError';}
 function checked(){if(!ready){const e=new Error('Не удалось открыть локальную базу. Исходные данные не удалены');e.name=failure;throw e;}}
 const facade={
  getItem(key){checked();key=String(key);return owns(key)?invoke({action:'get',key}).value:legacy.getItem(key);},
  setItem(key,value){checked();key=String(key);value=String(value);if(!owns(key))return legacy.setItem(key,value);invoke({action:'set',key,value});if(!keys.includes(key))keys.push(key);},
  removeItem(key){checked();key=String(key);if(!owns(key))return legacy.removeItem(key);invoke({action:'remove',key});keys=keys.filter(x=>x!==key);},
  key(index){checked();return allKeys()[Number(index)]??null;},
  get length(){checked();return allKeys().length;}
 };
 function allKeys(){const result=keys.slice();for(let i=0;legacy&&i<legacy.length;i++){const key=legacy.key(i);if(key&&!owns(key))result.push(key);}return result;}
 // No clear(): clearing the history is never an implicit recovery strategy.
 try{Object.defineProperty(global,'localStorage',{value:Object.freeze(facade),configurable:false});}
 catch(e){ready=false;}
 global.__mposStorageReady=ready;
 global.__mposStorageBackend=ready?'sqlite':'unavailable';
})(window);
