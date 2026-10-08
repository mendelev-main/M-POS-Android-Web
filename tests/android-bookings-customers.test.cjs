// Regression suite for Actions only. Synthetic hall/customer records; no network.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=path.join(__dirname,'../app/src/main/assets/pos');
const code=fs.readFileSync(path.join(assets,'android-bookings-customers.js'),'utf8');
const hall=fs.readFileSync(path.join(assets,'Web/js/features/hall-bookings.js'),'utf8');
function fixture(){
 let mount=null;const shown=[],writes=[],messages=[],requests=[],classes=new Set();
 const el={dataset:{id:'table'},offsetWidth:128,offsetHeight:72,style:{left:'94%',top:'88%'},setPointerCapture:()=>{}};
 const map={clientWidth:500,clientHeight:360,querySelectorAll:()=>[el]};
 const c={state:{hallTables:[{id:'table',number:1,name:'Стол 1',shape:'rectangle',rotation:0,x:94,y:88}],bookings:[],tab:'bookings',hallEditMode:true,bookingDate:'2026-10-08'},document:{getElementById:id=>id==='bookingsMap'?map:id==='android-customer-workspace'?mount:null,querySelector:()=>({classList:{add:x=>classes.add(x)},parentElement:{classList:{add:x=>classes.add(x)}}})},render:()=>{},saveKey:(key,value)=>writes.push({key,value:JSON.parse(JSON.stringify(value))}),currentShiftEmployeeIsAdmin:()=>true,flash:message=>messages.push(message),escapeHtml:value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),localDateString:()=> '2026-10-08',hallTableLabel:t=>t.name,openCustomersAdmin:()=>{},showModal:(html,wide)=>{shown.push({html,wide});mount={};},loyaltyApi:async url=>{requests.push(url);return url.endsWith('/loyalty')?{customer:{name:'Тестовый клиент',normalized_phone:'Телефон не указан'},programs:[{id:'program',name:'Кофе',progress:2,required_quantity:5,rewards:0}]}:url.endsWith('/orders')?{orders:[{id:'order',total:12,status:'paid',order_items:[{product_name:'Кофе',quantity:2}]}]}:{ledger:[{operation_type:'EARN',progress_delta:2,reward_delta:0}]};}};
 c.loyaltyInlineArg=value=>c.escapeHtml(JSON.stringify(String(value??'')));c.window=c;vm.createContext(c);vm.runInContext(hall,c);vm.runInContext(code,c);
 return{c,el,map,shown,writes,messages,requests,classes,close:()=>{mount=null}};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('existing edge tables render entirely inside the hall without saving on view',()=>{
 const f=fixture();f.c.render();near(parseFloat(f.el.style.left),(500-16-128)/500*100);near(parseFloat(f.el.style.top),(360-16-72)/360*100);
 assert.equal(f.c.state.hallTables[0].x,94);assert.equal(f.writes.length,0);
 const markup=f.c.renderBookingsScreen();assert.match(markup,/План зала/);assert.doesNotMatch(markup,/scale\(1\.015\)/);
});
test('rotated bounds constrain dragging and saved positions, including narrow resized maps',()=>{
 const f=fixture(),t=f.c.state.hallTables[0];t.rotation=90;f.c.render();
 // A 128x72 table rotates around its centre into a 72x128 rectangle.
 near(parseFloat(f.el.style.top),(360-16-72-28)/360*100);
 const e={clientX:0,clientY:0,pointerId:1,preventDefault:()=>{},stopPropagation:()=>{}};
 f.c.hallPointerStart(e,f.el);near(f.c.state._hallDrag.origX,parseFloat(f.el.style.left));
 f.c.hallPointerMove({...e,clientX:1000,clientY:1000},f.el);f.c.hallPointerEnd(e);
 near(t.y,(360-16-72-28)/360*100);assert.equal(f.writes[0].key,'hallTables');near(f.writes[0].value[0].y,t.y);
 f.map.clientWidth=240;f.c.render();const x=parseFloat(f.el.style.left)*240/100;assert.ok(x+128-28<=240-16+1e-8);assert.ok(x-(-28)>=16);
});
test('customer card fills the window and preserves sections, escaped server values and adjustment action',async()=>{
 const f=fixture();await f.c.openCustomerAdminCard('customer');const html=f.shown.at(-1).html;
 assert.equal(f.requests.length,3);for(const name of ['Данные клиента','Программы лояльности','Покупки','История начислений','Корректировка','Начисление за покупку'])assert.ok(html.includes(name),name);
 assert.ok(f.classes.has('android-customer-window'));assert.ok(f.classes.has('android-customer-overlay'));assert.match(html,/max="5" value="2"/);assert.match(html,/12\.00 BYN/);
 f.c.loyaltyApi=async url=>url.endsWith('/loyalty')?{customer:{name:'<script>bad()</script>'},programs:[]}:{};await f.c.openCustomerAdminCard('a/b');assert.match(f.shown.at(-1).html,/&lt;script&gt;/);assert.doesNotMatch(f.shown.at(-1).html,/<script>/);
});
test('a failed customer section does not hide successful sections or produce a false empty state',async()=>{
 const f=fixture(),api=f.c.loyaltyApi;f.c.loyaltyApi=url=>url.endsWith('/ledger')?Promise.reject(Error('synthetic failure')):api(url);
 await f.c.openCustomerAdminCard('customer');const html=f.shown.at(-1).html;assert.match(html,/Повторить загрузку/);assert.match(html,/Заказ order/);assert.match(html,/Тестовый клиент/);assert.doesNotMatch(html,/Начислений и корректировок пока нет/);
});
test('closed or replaced customer cards cannot be reopened by a stale response',async()=>{
 const f=fixture(),api=f.c.loyaltyApi;let releases=[];f.c.loyaltyApi=url=>new Promise(resolve=>releases.push(()=>resolve({customer:{name:'Устаревший'},programs:[]})));
 const first=f.c.openCustomerAdminCard('first');f.close();releases.forEach(x=>x());await first;assert.equal(f.shown.length,1);
 releases=[];const old=f.c.openCustomerAdminCard('old');f.c.loyaltyApi=api;await f.c.openCustomerAdminCard('new');const count=f.shown.length;releases.forEach(x=>x());await old;assert.equal(f.shown.length,count);assert.match(f.shown.at(-1).html,/Тестовый клиент/);
});
test('customer card refuses non-admin requests',async()=>{
 const f=fixture();f.c.currentShiftEmployeeIsAdmin=()=>false;await f.c.openCustomerAdminCard('customer');assert.equal(f.requests.length,0);assert.equal(f.shown.length,0);assert.match(f.messages[0],/администратора/);
});
