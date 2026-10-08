const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'app/src/main/assets/pos/network-printer.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

function fixture(printers){
  const data=new Map([['printers',JSON.stringify(printers||[])]]),posts=[],messages=[];
  const c={console:{error:()=>{}},state:{},document:{documentElement:{},getElementById:()=>null},MutationObserver:class{observe(){}},queueMicrotask:()=>{},localStorage:{getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)},webkit:{messageHandlers:{printer:{postMessage:value=>posts.push(plain(value))}}},flash:value=>messages.push(value)};
  c.window=c;vm.createContext(c);vm.runInContext(script,c);return{c,data,posts,messages};
}

const receipt=(id,extra={})=>({id,name:id,ip:'192.168.1.10',printReceipts:true,printOrders:false,copies:1,...extra});
const kitchen=(id,extra={})=>({id,name:id,ip:'192.168.1.20',printReceipts:false,printOrders:true,copies:1,...extra});
const order={id:'sale-1',currency:'BYN',kitchenPrinted:false,items:[{productId:'pizza',name:'Пицца',category:'Пицца',qty:1,price:20,comment:'Без лука'},{productId:'cola',name:'Кола',category:'Напитки',qty:2,price:4}],total:28};

test('completed order routes category-filtered kitchen copies and automatic receipt copies',()=>{
  const f=fixture([kitchen('k',{copies:2,orderCategories:['Пицца']}),receipt('r1',{copies:2}),receipt('r2',{autoPrintReceipt:false}),receipt('off',{enabled:false})]);f.c.printCompletedOrder(order);
  assert.equal(f.posts.length,4);const kitchenJobs=f.posts.filter(x=>x.order.__printDocumentType==='kitchen'),receiptJobs=f.posts.filter(x=>x.order.__printDocumentType==='receipt');assert.equal(kitchenJobs.length,2);assert.equal(receiptJobs.length,2);assert.deepEqual(kitchenJobs[0].order.items.map(x=>x.productId),['pizza']);assert.ok(receiptJobs.every(x=>x.order.items.length===2));
});

test('manual receipt print includes non-automatic receipt printers and preserves native config',async()=>{
  const f=fixture([receipt('r1',{copies:2,printPaymentComments:false,paymentReceiptTitle:'Кафе',registerLabel:'Касса 2'}),receipt('r2',{autoPrintReceipt:false})]);await f.c.sendOrderToPrint(order);
  assert.equal(f.posts.length,3);assert.ok(f.posts.every(x=>x.action==='print'&&x.order.__printDocumentType==='receipt'));assert.equal(f.posts[0].order.__networkPrinterPort,9100);assert.equal(f.posts[0].order.__printerConfig.printPaymentComments,false);assert.equal(f.posts[0].order.items[0].comment,'Без лука');
});

test('kitchen routing skips empty category result and an already printed completed order',()=>{
  const f=fixture([kitchen('bar',{orderCategories:['Бар'],copies:3})]);f.c.sendKitchenOrderToPrint(order);f.c.printCompletedOrder({...order,kitchenPrinted:true});assert.equal(f.posts.length,0);
});

test('shift close payload uses receipt printers, copies and shift document type',()=>{
  const f=fixture([receipt('r',{copies:2,autoPrintReceipt:false})]);assert.equal(f.c.printShiftCloseReceipt({closedAt:123,total:40}),true);assert.equal(f.posts.length,2);assert.ok(f.posts.every(x=>x.order.__printDocumentType==='shift-close'&&x.order.timestamp===123));
});

test('missing native printer bridge reports failure without throwing',async()=>{
  const f=fixture([receipt('r')]);delete f.c.webkit;await assert.doesNotReject(f.c.sendOrderToPrint(order));assert.equal(f.posts.length,0);assert.match(f.messages.at(-1),/только в приложении/);
});

test('printer module does not rewrite the network settings DOM',()=>{
  assert.doesNotMatch(script,/decorateSettings|MutationObserver/);
  assert.match(script,/window\.openPrintersManager/);
  assert.match(script,/window\.openNotificationSettings/);
});
