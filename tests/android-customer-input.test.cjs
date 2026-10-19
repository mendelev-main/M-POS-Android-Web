// Actions-only UI coverage. No real customer records, server requests or local storage.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-customer-input.js'),'utf8');
function element(){const classes=new Set();return {value:'',children:[],attributes:{},classList:{add:label=>classes.add(label)},setAttribute(k,v){this.attributes[k]=v},appendChild(child){this.children.push(child);child.parentNode=this;},insertBefore(child,before){const i=this.children.indexOf(before);if(i<0)this.children.push(child);else this.children.splice(i,0,child);child.parentNode=this;},querySelector(selector){return this.children.find(child=>selector==='.android-customer-prefix'&&child.className==='android-customer-prefix')||null},closest(){return this.parentNode?.className==='customer-phone-field'?this.parentNode:null}};}
function fixture(){
 const elements={},properties={},requests=[],selected=[],messages=[];let fits=0;
 const c={innerHeight:800,visualViewport:{height:800,addEventListener(){}},addEventListener(){},androidLoyaltyFitViewport:()=>fits++,document:{documentElement:{style:{setProperty:(k,v)=>properties[k]=v}},head:{appendChild(){}},createElement:()=>element(),getElementById:id=>elements[id]||null,querySelector:()=>elements['android-new-customer-save']||null},openCustomerPicker:async()=>{const box=element();box.className='customer-phone-field';elements['customer-search']=element();box.appendChild(elements['customer-search']);},openCreateCustomer:()=>{const parent=element(),input=element();elements['new-customer-name']=element();elements['new-customer-phone']=input;elements['android-new-customer-save']=element();parent.appendChild(input);},loyaltyApi:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {customer:{id:'synthetic',name:'Анна',normalized_phone:JSON.parse(options.body).phone}}},selectCustomer:async(...args)=>selected.push(args),flash:message=>messages.push(message)};
 c.window=c;vm.createContext(c);vm.runInContext(code,c);return{c,elements,properties,requests,selected,messages,fits:()=>fits};
}
test('keyboard reduces dialogs but never the underlying POS workspace',()=>{
 const f=fixture();f.c.__mposKeyboardInsets(300);assert.equal(f.properties['--android-workspace-height'],'800px');assert.equal(f.properties['--android-visible-height'],'500px');assert.equal(f.c.__mposVisibleViewportHeight,500);assert.ok(f.fits()>0);
 f.c.__mposKeyboardInsets(0);assert.equal(f.properties['--android-visible-height'],'800px');assert.equal(f.properties['--android-workspace-height'],'800px');
 assert.match(code,/#app\{height:var\(--android-workspace-height/);assert.match(code,/\.modal-overlay\{bottom:auto;height:var\(--android-visible-height/);
});
test('customer lookup has a fixed masked prefix and retains the four-digit source input',async()=>{
 const f=fixture();await f.c.openCustomerPicker();const input=f.elements['customer-search'];assert.equal(input.parentNode.children[0].textContent,'+375 XX XXX');assert.equal(input.placeholder,'1234');assert.equal(input.value,'');assert.equal(f.requests.length,0);
});
test('new customer shows immutable country prefix and sends a normalized full phone',async()=>{
 const f=fixture();f.c.openCreateCustomer();const input=f.elements['new-customer-phone'];assert.equal(input.parentNode.children[0].textContent,'+375');assert.equal(input.maxLength,9);assert.equal(input.value,'');
 input.value='29 123-45-67';input.oninput();assert.equal(input.value,'291234567');f.elements['new-customer-name'].value='Анна';await f.c.createCustomerFromPos();assert.equal(f.requests[0].url,'/api/customers');assert.equal(f.requests[0].body.phone,'+375291234567');assert.equal(f.selected[0][2],'+375291234567');
});
test('paste strips a full Belarus prefix and incomplete input does not create a customer',async()=>{
 const f=fixture();f.c.openCreateCustomer();const input=f.elements['new-customer-phone'];let prevented=false;input.onpaste({clipboardData:{getData:()=>'+375 (29) 123-45-67'},preventDefault:()=>prevented=true});assert.ok(prevented);assert.equal(input.value,'291234567');
 f.elements['new-customer-name'].value='Анна';input.value='2912';await f.c.createCustomerFromPos();assert.equal(f.requests.length,0);assert.match(f.messages[0],/9 цифр/);
});
test('Android uses overlay keyboard hosting and presentation changes do not write POS data',()=>{
 const manifest=fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8');assert.match(manifest,/windowSoftInputMode="adjustNothing"/);
 const activity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');assert.match(activity,/window\.__mposKeyboardInsets/);assert.doesNotMatch(activity,/view.setPadding\(view.paddingLeft, view.paddingTop, view.paddingRight, keyboardBottom\)/);
 assert.doesNotMatch(code,/saveKey\(|localStorage\.|Storage\.set\(/);
});

test('Android keeps cashier loyalty enrollment choice after creating the customer',async()=>{const f=fixture();f.c.openCreateCustomer();f.elements['new-customer-name'].value='Fixture';f.elements['new-customer-phone'].value='290000000';f.elements['new-customer-loyalty']={checked:true};let enrollment=0;f.c.openPosLoyaltyConsent=async()=>enrollment++;await f.c.createCustomerFromPos();assert.equal(f.selected.length,1);assert.equal(enrollment,1)});
