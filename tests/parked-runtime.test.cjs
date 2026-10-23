const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=path.join(__dirname,'../app/src/main/assets/pos');
function fixture(){let html='',deleted=0;const c={state:{cart:[],parked:[{id:'p',orderLabel:'Стол 4',orderType:'На месте',total:10,createdAt:1,items:[]},{id:'w',orderLabel:'Онлайн',orderType:'Доставка',total:20,createdAt:2,webOrderId:'web',items:[]}]},document:{readyState:'loading',addEventListener(){},querySelector(){return null}},escapeHtml:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),fullMoney:n=>String(n),fmtDate:()=> '19.10.2026',showModal:s=>{html=s},closeModal(){},console};c.escapeAttr=c.escapeHtml;c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(runtime,'Web/js/features/parked-orders.js'),'utf8'),c);c.deleteParked=()=>{deleted++};const renderer=c.openParkedModal;vm.runInContext(fs.readFileSync(path.join(runtime,'notification-native.js'),'utf8'),c);return{c,renderer,html:()=>html,deleted:()=>deleted};}
test('notification addon preserves compact renderer and WEB actions',()=>{const f=fixture();assert.strictEqual(f.c.openParkedModal,f.renderer);f.c.openParkedModal();assert.match(f.html(),/parked-orders-list/);assert.match(f.html(),/parked-order-tile/);assert.match(f.html(),/parked-modal-close/);assert.match(f.html(),/parked-web-ready-button/);assert.doesNotMatch(f.html(),/list-row-sub|>Закрыть<|>Открыть</);});
test('tile deletion retains native confirmation before removing order',()=>{const f=fixture();f.c.requestDeleteParkedOrder('p');assert.equal(f.deleted(),0);assert.match(f.html(),/Удаление заказа/);assert.match(f.html(),/deleteParked\('p'\)/);f.c.deleteParked('p');assert.equal(f.deleted(),1);});

test('parked receipts sort by Russian name with natural numbers, unnamed last, newest first for equal names',()=>{
 const f=fixture();f.c.state.parked=[
 {id:'ten',orderLabel:'Стол 10',createdAt:10},{id:'blank',orderLabel:'',createdAt:90},
 {id:'two-old',orderLabel:'стол 2',createdAt:1},{id:'two-new',orderLabel:' Стол 2 ',createdAt:2},
 {id:'a',orderLabel:'Александр',createdAt:3},{id:'spaces',orderLabel:'   ',createdAt:80}
 ];
 const before=JSON.stringify(f.c.state.parked);f.c.openParkedModal();
 const ids=[...f.html().matchAll(/onclick="resumeParked\('([^']+)'\)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['a','two-new','two-old','ten','blank','spaces']);
 assert.equal(JSON.stringify(f.c.state.parked),before);assert.doesNotMatch(f.html(),/parked-order-search|Поиск по названию/);
});
