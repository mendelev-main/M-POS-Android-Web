const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const assetRoot=fs.existsSync(path.join(root,'PrilavokPOS'))?path.join(root,'PrilavokPOS'):path.join(root,'app/src/main/assets/pos');
const source=fs.readFileSync(path.join(assetRoot,'network-printer.js'),'utf8');
function fixture(printers,admin=true){
 const posts=[],messages=[],data=new Map([['printers',JSON.stringify(printers)]]),fields={};
 const c={__MPOS_PLATFORM__:'android',currentShiftEmployeeIsAdmin:()=>admin,console:{error(){}},state:{},document:{getElementById:id=>fields[id]||null,querySelectorAll:()=>[],body:{insertAdjacentHTML(){}},documentElement:{}},localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)},webkit:{messageHandlers:{printer:{postMessage:p=>posts.push(JSON.parse(JSON.stringify(p)))}}},flash:m=>messages.push(m)};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);return {c,posts,messages,fields,data};
}
const receipt=(id,extra={})=>({id,ip:'192.168.1.10',printReceipts:true,copies:2,...extra});
const cash={id:'sale-1',items:[],method:'split',total:10,payments:[{method:'card',amount:6},{method:'cash',amount:4}]};
const drawerJobs=f=>f.posts.filter(p=>p.action==='openDrawer');
test('cash and split cash open one drawer independently of receipt copies and auto-print',()=>{
 const f=fixture([receipt('a'),receipt('b',{ip:'192.168.1.11',copies:3})]);
 f.c.printCompletedOrder(cash);assert.equal(drawerJobs(f).length,1);assert.equal(drawerJobs(f)[0].order.__networkPrinterIp,'192.168.1.10');assert.equal(drawerJobs(f)[0].order.__printerConfig.drawerCommand,'1B,70,00,19,FA');
 assert.equal(f.posts.filter(p=>p.action==='print').length,5);
 f.c.printCompletedOrder(cash);assert.equal(drawerJobs(f).length,1);
 const noPrint=fixture([receipt('a',{autoPrintReceipt:false})]);noPrint.c.printCompletedOrder(cash);assert.equal(drawerJobs(noPrint).length,1);assert.equal(noPrint.posts.length,1);
});
test('card, zero-cash parts, manual receipt reprints and kitchen jobs never open the drawer',async()=>{
 const f=fixture([receipt('a',{printOrders:true})]);
 f.c.printCompletedOrder({...cash,id:'card',payments:[{method:'card',amount:10}]});
 f.c.printCompletedOrder({...cash,id:'zero',payments:[{method:'cash',amount:0},{method:'card',amount:10}]});
 await f.c.sendOrderToPrint(cash);f.c.sendKitchenOrderToPrint(cash);f.c.printShiftCloseReceipt({id:'shift'});
 assert.equal(drawerJobs(f).length,0);
});
test('explicit selected printer wins; disabled drawers and kitchen-only printers do not pulse',()=>{
 const f=fixture([receipt('old'),receipt('selected',{cashDrawerEnabled:true,ip:'192.168.1.12'})]);f.c.printCompletedOrder(cash);assert.equal(drawerJobs(f)[0].order.__networkPrinterIp,'192.168.1.12');
 for(const printers of [[receipt('off',{cashDrawerEnabled:false})],[receipt('off',{enabled:false})],[receipt('kitchen',{printReceipts:false,printOrders:true})]]){const g=fixture(printers);g.c.printCompletedOrder(cash);assert.equal(drawerJobs(g).length,0)}
});
test('manual opening requires admin, but committed cash events remain available to cashier',()=>{
 const f=fixture([receipt('a')],false);assert.equal(f.c.openCashDrawer(),false);assert.equal(f.c.requestCashDrawer('manual','bypass'),false);assert.equal(drawerJobs(f).length,0);
 assert.equal(f.c.requestCashDrawer('refund','r1'),true);assert.equal(f.c.requestCashDrawer('refund','r1'),false);assert.equal(drawerJobs(f).length,1);
 const g=fixture([receipt('a')],true);assert.equal(g.c.openCashDrawer(),true);assert.equal(drawerJobs(g)[0].order.__drawerReason,'manual');
});
test('invalid pulse and unsupported platform cannot dispatch; malformed events are ignored',()=>{
 for(const command of ['1B,40','1B,70,00,00,FA','1B,70,02,19,FA','1B,70,00,FA,19','1B,70,00,19,FA,1B,40']){const f=fixture([receipt('a',{drawerCommand:command})]);f.c.printCompletedOrder(cash);assert.equal(drawerJobs(f).length,0);assert.ok(f.posts.some(p=>p.action==='print'))}
 const f=fixture([receipt('a')]);delete f.c.__MPOS_PLATFORM__;assert.equal(f.c.requestCashDrawer('sale','one'),false);f.c.__MPOS_PLATFORM__='android';assert.equal(f.c.requestCashDrawer('unknown','one'),false);assert.equal(f.c.requestCashDrawer('sale',''),false);
});
test('failed bridge retains no automatic replay and a fresh manual request remains possible',()=>{
 const f=fixture([receipt('a')]);f.c.webkit.messageHandlers.printer.postMessage=()=>false;assert.equal(f.c.requestCashDrawer('sale','one'),false);assert.equal(drawerJobs(f).length,0);
 f.c.webkit.messageHandlers.printer.postMessage=p=>f.posts.push(p);assert.equal(f.c.openCashDrawer(),true);assert.equal(drawerJobs(f).length,1);
});
test('printer test prints once and sends one pulse to the selected drawer printer',()=>{
 const f=fixture([receipt('a',{cashDrawerEnabled:true})]);
 const values={'mp-id':'a','mp-name':'Касса','mp-ip':'192.168.1.10','mp-paper':'80','mp-copies':'2','mp-mode':'graphic','mp-dpi':'203','mp-drawer-command':'1B,70,00,19,FA'};
 for(const [key,value] of Object.entries(values))f.fields[key]={value};
 for(const key of ['mp-print-receipts','mp-auto','mp-drawer-enabled'])f.fields[key]={checked:true};
 f.c.testPrinterFromPage();assert.equal(f.posts.filter(p=>p.action==='print'&&p.order.__networkTest).length,1);assert.equal(drawerJobs(f).length,1);assert.equal(drawerJobs(f)[0].order.__drawerReason,'test');
});

test('loyalty receipt waits for confirmed progress while cash drawer and kitchen stay immediate',async()=>{
 const f=fixture([receipt('a',{printOrders:true})]);let release;f.c.awaitReceiptLoyalty=()=>new Promise(resolve=>{release=resolve});
 const order={...cash,customer:{id:'customer'}};const printing=f.c.printCompletedOrder(order);
 assert.equal(drawerJobs(f).length,1);assert.equal(f.posts.filter(p=>p.action==='print'&&p.order.__printDocumentType==='receipt').length,0);
 order.loyaltyReceiptProgress=[{name:'Пицца',goal:6,filled:4}];release();await printing;
 const receipts=f.posts.filter(p=>p.action==='print'&&p.order.__printDocumentType==='receipt');assert.equal(receipts.length,2);assert.equal(receipts[0].order.loyaltyReceiptProgress[0].filled,4);
});
