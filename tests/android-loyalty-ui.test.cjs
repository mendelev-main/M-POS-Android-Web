// Actions-only regression coverage for Android presentation; synthetic customers and no network.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),assets=path.join(root,'app/src/main/assets/pos');
const code=fs.readFileSync(path.join(assets,'android-loyalty-ui.js'),'utf8');
function fixture(){
 let list=null,note=null,html='',renderCount=0;const listeners={};
 const page={style:{},getBoundingClientRect:()=>({top:72})};
 const makeList=()=>({innerHTML:'',scrollTop:80,attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}});
 const c={state:{tab:'settings',loyaltyAdminScreen:true,loyaltyAdminSection:'programs',products:[{id:'p',name:'Кофе'}]},__loyaltyAdminPrograms:[{id:'program',name:'Кофейная программа',required_quantity:5,is_active:true,loyalty_earning_products:[{product_id:'p'}],loyalty_reward_products:[{product_id:'p'}]}],__loyaltyAdminCustomers:[],innerHeight:800,visualViewport:{height:800,offsetTop:0,addEventListener(k,fn){listeners[k]=fn}},addEventListener(){},document:{head:{appendChild(){}},createElement:()=>({}),querySelector:()=>c.state.loyaltyAdminScreen?page:null,getElementById:id=>id==='loyalty-admin-customers'?list:id==='android-loyalty-results-note'?note:null},escapeHtml:v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),searchCustomers:async()=>[{id:'customer',name:'Анна',normalized_phone:'Тестовый номер'}],loyaltyApi:async()=>({programs:[]}),flash(){},closeLoyaltyAdminScreen(){c.state.loyaltyAdminScreen=false;c.render()},render(){renderCount++;html=c.renderLoyaltyAdminScreen();list=c.state.loyaltyAdminSection==='clients'?makeList():null;note=list?{textContent:''}:null;}};
 c.escapeAttr=c.escapeHtml;c.loyaltyInlineArg=v=>c.escapeAttr(JSON.stringify(String(v??'')));c.window=c;vm.createContext(c);vm.runInContext(code,c);
 return {c,page,list:()=>list,note:()=>note,html:()=>html,count:()=>renderCount,listeners};
}
test('loyalty header follows Products geometry and keeps all existing program actions',()=>{
 const f=fixture();f.c.render();const html=f.html();assert.ok(html.indexOf('<h1>')<html.indexOf('closeLoyaltyAdminScreen()'));
 for(const action of ['openLoyaltyProgramCreate','openLoyaltyProgramEdit','toggleLoyaltyProgram','confirmDeleteLoyaltyProgram'])assert.ok(html.includes(action));
 assert.match(html,/Кофе/);assert.match(html,/Товары для накопления/);assert.match(code,/border-radius:var\(--radius-l\)/);assert.match(code,/border-radius:999px/);
});
test('clients stay in an independent scroll region sized to the visible viewport',async()=>{
 const f=fixture();await f.c.setLoyaltyAdminSection('clients');assert.match(f.html(),/role="region" tabindex="0" aria-label="Список найденных клиентов"/);assert.match(code,/touch-action:pan-y/);assert.match(code,/min-height:0;overflow-y:auto/);
 assert.equal(f.page.style.height,'728px');f.c.visualViewport.height=420;f.listeners.resize();assert.equal(f.page.style.height,'348px');f.c.visualViewport.height=800;f.listeners.resize();assert.equal(f.page.style.height,'728px');
 const before=f.count();await f.c.loyaltyAdminCustomerSearch('Анна');assert.equal(f.count(),before);assert.match(f.list().innerHTML,/Анна/);assert.equal(f.list().scrollTop,0);
});
test('late search results cannot replace a newer search, another section or a closed screen',async()=>{
 const f=fixture();await f.c.setLoyaltyAdminSection('clients');const pending=[];f.c.searchCustomers=()=>new Promise(resolve=>pending.push(resolve));
 const first=f.c.loyaltyAdminCustomerSearch('Ан'),second=f.c.loyaltyAdminCustomerSearch('Ив');pending[1]([{id:'new',name:'Иван'}]);await second;pending[0]([{id:'old',name:'Анна'}]);await first;assert.match(f.list().innerHTML,/Иван/);assert.doesNotMatch(f.list().innerHTML,/Анна/);
 const oldList=f.list(),third=f.c.loyaltyAdminCustomerSearch('Ма');await f.c.setLoyaltyAdminSection('programs');pending[2]([{id:'stale',name:'Мария'}]);await third;assert.doesNotMatch(oldList.innerHTML,/Мария/);
});
test('server text is escaped and failed search remains retryable',async()=>{
 const f=fixture();await f.c.setLoyaltyAdminSection('clients');f.c.searchCustomers=async()=>[{id:'x',name:'<script>bad()</script>',normalized_phone:'<b>123</b>'}];await f.c.loyaltyAdminCustomerSearch('x');assert.match(f.list().innerHTML,/&lt;script&gt;/);assert.doesNotMatch(f.list().innerHTML,/<script>/);
 f.c.searchCustomers=async()=>{throw Error('offline')};await f.c.loyaltyAdminCustomerSearch('Анна');assert.match(f.list().innerHTML,/Не удалось загрузить клиентов/);assert.equal(f.list().attributes['aria-busy'],undefined);
});
test('Android hosting reserves the keyboard area without changing the reviewed source',()=>{
 const manifest=fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8');assert.match(manifest,/windowSoftInputMode="adjustNothing"/);
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');assert.match(activity,/WindowInsetsCompat.Type.ime\(\)/);assert.match(activity,/window\.__mposKeyboardInsets/);assert.doesNotMatch(activity,/view.setPadding\(view.paddingLeft, view.paddingTop, view.paddingRight, keyboardBottom\)/);
 const sync=fs.readFileSync(path.join(root,'scripts/sync-pos-assets.py'),'utf8');assert.match(sync,/android-loyalty-ui.js/);assert.doesNotMatch(code,/saveKey\(|localStorage\.|Storage\.set\(/);
});
