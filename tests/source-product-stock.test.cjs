// Run from any directory: node --test tests/product-stock.test.cjs
// Executes the actual POS functions with synthetic storage; no device data or network.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/pos/pos.html'),'utf8');
const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const adapter=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/core/storage.js'),'utf8');
const shiftsScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/shifts.js'),'utf8');
const employeesScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/employees.js'),'utf8');
const loyaltyScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/loyalty.js'),'utf8');
const productConfigurationScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-configuration.js'),'utf8');
const productPhotoScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-photo.js'),'utf8');
const productPersistenceScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-persistence.js'),'utf8');
const productEditorScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-editor.js'),'utf8');
const availabilityScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/availability.js'),'utf8');
const suppliersScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/suppliers.js'),'utf8');
const purchaseOrdersScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/purchase-orders.js'),'utf8');
const receivingUiScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/receiving-ui.js'),'utf8');
const receivingDraftsScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/receiving-drafts.js'),'utf8');
const receivingScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/receiving.js'),'utf8');
const webOrdersScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/web-orders.js'),'utf8');
const inventoryScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/inventory.js'),'utf8');
const warehouseReportingScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/warehouse-reporting.js'),'utf8');
const analyticsScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/analytics.js'),'utf8');
const productCatalogScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-catalog.js'),'utf8');
const productCategoriesScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/product-categories.js'),'utf8');
const posNavigationScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/pos-navigation.js'),'utf8');
const cartPresentationScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/cart-presentation.js'),'utf8');
const cartCompositionScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/cart-composition.js'),'utf8');
const parkedOrdersScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/parked-orders.js'),'utf8');
const paymentScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/payment.js'),'utf8');
const receiptsScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/receipts.js'),'utf8');
const hallBookingsScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/hall-bookings.js'),'utf8');
const backupScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/Web/js/features/backup.js'),'utf8');
const printerScript=fs.readFileSync(path.join(root,'app/src/main/assets/pos/network-printer.js'),'utf8');
const androidActivity=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/MainActivity.kt'),'utf8');
const androidBackup=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/backup/BackupManager.kt'),'utf8');
const androidRouter=fs.readFileSync(path.join(root,'app/src/main/java/com/mendelev/mpos/bridge/NativeBridgeRouter.kt'),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
function fixture(){
 const data=new Map(),messages=[],writes=[],fields={'pf-prep-station':{value:'kitchen'},'pf-prep-difficulty':{value:'1'},'pf-base-prep-minutes':{value:'5'}},events=[];
 const document={getElementById:id=>fields[id]||null,querySelector:()=>null,addEventListener:()=>{}};
 // Isolate automatic startup recovery; tests call recovery entry points explicitly.
 const c={queueMicrotask:()=>{},console:{error:()=>{}},document,crypto:{randomUUID:()=> 'device-test'},setTimeout:()=>0,clearTimeout:()=>{},addEventListener:()=>{},removeEventListener:()=>{},AbortController,localStorage:{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{data.set(k,String(v));writes.push(k);},removeItem:k=>data.delete(k)},fetch:()=>{throw Error('Network is prohibited in this test');},setInterval:()=>{throw Error('Timer is prohibited in this test');}};
 c.window=c;vm.createContext(c);vm.runInContext(adapter,c);vm.runInContext(inline.replace(/loadAll\(\);\s*$/,''),c);vm.runInContext(shiftsScript,c);vm.runInContext(employeesScript,c);vm.runInContext(loyaltyScript,c);vm.runInContext(productConfigurationScript,c);vm.runInContext(productPhotoScript,c);vm.runInContext(productPersistenceScript,c);vm.runInContext(productEditorScript,c);vm.runInContext(availabilityScript,c);vm.runInContext(suppliersScript,c);vm.runInContext(purchaseOrdersScript,c);vm.runInContext(receivingUiScript,c);vm.runInContext(receivingDraftsScript,c);vm.runInContext(receivingScript,c);vm.runInContext(webOrdersScript,c);vm.runInContext(inventoryScript,c);vm.runInContext(warehouseReportingScript,c);vm.runInContext(analyticsScript,c);vm.runInContext(productCatalogScript,c);vm.runInContext(productCategoriesScript,c);vm.runInContext(posNavigationScript,c);vm.runInContext(cartPresentationScript,c);vm.runInContext(cartCompositionScript,c);vm.runInContext(parkedOrdersScript,c);vm.runInContext(paymentScript,c);vm.runInContext(receiptsScript,c);vm.runInContext(hallBookingsScript,c);vm.runInContext(backupScript,c);
 c.flash=m=>messages.push(m);c.render=()=>{};c.showReceipt=()=>{};c.showPaymentReceipt=()=>{};c.closeModal=()=>{};c.applyTheme=()=>{};
 const state=vm.runInContext('state',c);
 c.__printerSettingsSnapshot=()=>({printers:[],posNotifications:{soundEnabled:true,sound:'default'}});c.__restorePrinterSettings=()=>true;
 state.products=[{id:'flour',name:'Мука',type:'simple',stock:10,cost:2,price:2,category:'Сырьё',sortOrder:0,availableOnline:false,imageUrl:''},{id:'water',name:'Вода',type:'simple',stock:10,cost:1,price:1},{id:'dough',name:'Тесто',type:'composite',components:[{productId:'flour',qty:0.2},{productId:'water',qty:0.1}]},{id:'pizza',name:'Пицца',type:'composite',price:10,components:[{productId:'dough',qty:1}]}];
 state.shifts=[{id:'shift',status:'open',openingCash:100}];state.orders=[];state.cart=[];state.printer={autoPrint:false};state.discounts=[];
 function cart(id='pizza',qty=1){state.cart=[{productId:id,name:c.getProduct(id)?.name||id,price:10,qty}];}
 async function sale(payments){cart();await c.finalizePayment(payments||[{method:'cash',amount:10}]);return state.orders[0];}
 return {c,state,data,messages,writes,fields,events,cart,sale};
}
test('all production JavaScript modules parse',()=>{new vm.Script(inline);new vm.Script(adapter);new vm.Script(shiftsScript);new vm.Script(employeesScript);new vm.Script(loyaltyScript);new vm.Script(productConfigurationScript);new vm.Script(productPhotoScript);new vm.Script(productPersistenceScript);new vm.Script(productEditorScript);new vm.Script(availabilityScript);new vm.Script(suppliersScript);new vm.Script(purchaseOrdersScript);new vm.Script(receivingUiScript);new vm.Script(receivingDraftsScript);new vm.Script(receivingScript);new vm.Script(webOrdersScript);new vm.Script(inventoryScript);new vm.Script(warehouseReportingScript);new vm.Script(analyticsScript);new vm.Script(productCatalogScript);new vm.Script(productCategoriesScript);new vm.Script(posNavigationScript);new vm.Script(cartPresentationScript);new vm.Script(cartCompositionScript);new vm.Script(parkedOrdersScript);new vm.Script(paymentScript);new vm.Script(receiptsScript);new vm.Script(hallBookingsScript);new vm.Script(backupScript);new vm.Script(printerScript);});
test('shifts module loads before dependent features and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/shifts.js"></script>',paymentTag='<script src="Web/js/features/payment.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(paymentTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function submitCloseShift\s*\(/);
 const f=fixture();for(const name of ['currentShift','currentShiftEmployeeIsAdmin','shiftOrders','shiftTotals','cashDrawerBalance','buildShiftReportPayload','renderShiftScreen','openShiftModal','submitOpenShift','submitCashMovement','submitCloseShift','viewShiftModal','printShiftReport'])assert.equal(typeof f.c[name],'function',name);
});
test('employees module loads after shifts and before startup with its public API',()=>{
 const shiftsTag='<script src="Web/js/features/shifts.js"></script>',moduleTag='<script src="Web/js/features/employees.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(shiftsTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function saveEmployee\s*\(/);
 const f=fixture();for(const name of ['employeeShortName','employeeDisplayName','openEmployeeModal','toggleEmployeeAdminPassword','saveEmployee','showEmployeeAdminInfo','employeeDeletionAllowed','deleteEmployee','confirmDeleteEmployee'])assert.equal(typeof f.c[name],'function',name);
});
test('loyalty module loads after employees and before suppliers with its public API',()=>{
 const employeesTag='<script src="Web/js/features/employees.js"></script>',moduleTag='<script src="Web/js/features/loyalty.js"></script>',suppliersTag='<script src="Web/js/features/suppliers.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(employeesTag));assert.ok(html.indexOf(suppliersTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function loyaltyApi\s*\(/);
 const f=fixture();for(const name of ['loyaltyInlineArg','loyaltyApi','searchCustomers','loadCustomerLoyalty','openOrderCustomer','loyaltySummaryHtml','openCustomerPicker','customerPhoneDigits','customerSearchChanged','removeOrderCustomer','selectCustomer','openCreateCustomer','createCustomerFromPos','publishPaidOrderLoyalty','reverseOrderLoyalty','settleReturnedOrderLoyalty','retryPendingLoyalty','loyaltyRewardAllocation','loyaltyRewardDiscount','openCustomersAdmin','customerAdminRows','adminCustomerSearch','openCustomerAdminCard','openLoyaltyAdjustment','saveLoyaltyAdjustment','openLoyaltyAdmin','loyaltyProgramForm','filterLoyaltyProducts','updateLoyaltyProductCount','openLoyaltyProgramCreate','openLoyaltyProgramEdit','saveLoyaltyProgram','confirmDeleteLoyaltyProgram','deleteLoyaltyProgram','toggleLoyaltyProgram','openLoyaltyAdminScreen','closeLoyaltyAdminScreen','loadLoyaltyAdminScreen','setLoyaltyAdminSection','renderLoyaltyAdminScreen','loyaltyAdminCustomerSearch'])assert.equal(typeof f.c[name],'function',name);
 for(const retired of ['openLoyaltyAdminModalLegacy','createLoyaltyProgram'])assert.equal(typeof f.c[retired],'undefined',retired);
});
test('loyalty inline actions preserve backend IDs and names as inert arguments',()=>{
 const f=fixture(),decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const customerId="customer');injected();//",programId='program";injected();//',programName="Гость');injected();//";let injected=0,opened,deleted;
 f.c.injected=()=>injected++;
 f.c.openCustomerAdminCard=id=>{opened=id};
 const customerMarkup=f.c.customerAdminRows([{id:customerId,name:'Имя',normalized_phone:'+375'}]);
 const customerAction=decode(customerMarkup.match(/onclick="([^"]+)"/)[1]);vm.runInContext(customerAction,f.c);
 assert.equal(opened,customerId);assert.equal(injected,0);
 f.state.loyaltyAdminSection='programs';f.c.__loyaltyAdminPrograms=[{id:programId,name:programName,is_active:true,required_quantity:5,reward_quantity:1}];
 f.c.confirmDeleteLoyaltyProgram=(id,name)=>{deleted=[id,name]};
 const programMarkup=f.c.renderLoyaltyAdminScreen();
 const deleteAction=decode(programMarkup.match(/onclick="([^"]*confirmDeleteLoyaltyProgram[^"]*)"/)[1]);vm.runInContext(deleteAction,f.c);
 assert.deepEqual(deleted,[programId,programName]);assert.equal(injected,0);
});
test('product configuration module loads before supplier and cart consumers with its public API',()=>{
 const loyaltyTag='<script src="Web/js/features/loyalty.js"></script>',moduleTag='<script src="Web/js/features/product-configuration.js"></script>',suppliersTag='<script src="Web/js/features/suppliers.js"></script>',cartTag='<script src="Web/js/features/cart-composition.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(loyaltyTag));assert.ok(html.indexOf(suppliersTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(cartTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function convertProductQty\s*\(/);assert.doesNotMatch(inline,/function renderModifierGroups\s*\(/);
 const f=fixture();for(const name of ['productInlineArg','stockUnit','compositeRecipeYield','inferredCompositeYield','syncInferredCompositeYield','componentBaseQty','unitLabel','convertProductQty','productUnitOptions','changeProductDisplayUnit','captureSimpleProductDraft','componentDisplayUnit','componentDisplayQty','changeComponentDisplayUnit','saveProductConfiguration','switchProductType','renderTypeFields','addComponent','changeComponentQty','refreshCompositeEditorCalculations','setComponentQtyLive','setComponentQty','removeComponent','setComponentCategory','clearComponentSearch','renderComponentOptions','normalizeModifierGroup','validateModifierGroups','modifierOptionUnitText','renderModifierGroups','openModifierProductPicker','renderModifierProductPickerList','chooseModifierProduct','refreshModifierEditor','addModifierGroup','removeModifierGroup','setModifierGroupField','addModifierOption','removeModifierOption','setModifierOptionProduct','setModifierOptionField','setModifierOptionTextField','setModifierOptionDefault','toggleNoStockFields','requestNoStockUnlock','confirmNoStockUnlock','requestStockUnlock','confirmStockUnlock'])assert.equal(typeof f.c[name],'function',name);
});
test('product configuration actions preserve compatible product IDs as inert arguments',()=>{
 const f=fixture(),decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const id="ingredient');injected();//";let injected=0,added,chosen,cartChoice;
 f.c.injected=()=>injected++;f.state.products.push({id,name:'Особый товар',category:'Сырьё',type:'simple',stock:1,cost:1,price:1,modifierGroups:[{id:'group',name:'Добавка',min:0,max:1,options:[{id:'option',productId:'flour',qty:1,priceDelta:0}]}]});
 const componentBox={innerHTML:''};f.c.document.getElementById=value=>value==='component-options'?componentBox:null;f.c._pmEditingId='pizza';f.c._pmComponents=[];f.c._pmComponentCategory='Все';f.c.addComponent=value=>{added=value};f.c.renderComponentOptions();
 const componentActions=[...componentBox.innerHTML.matchAll(/onclick="([^"]+)"/g)].map(match=>decode(match[1]));const componentAction=componentActions.find(action=>action.includes('ingredient'));vm.runInContext(componentAction,f.c);assert.equal(added,id);
 const modifierBox={innerHTML:''};f.c.document.getElementById=value=>value==='modifier-product-list'?modifierBox:null;f.c._modifierPicker={groupIndex:0,optionIndex:0};f.c.chooseModifierProduct=value=>{chosen=value};f.c.renderModifierProductPickerList('');
 const modifierActions=[...modifierBox.innerHTML.matchAll(/onclick="([^"]+)"/g)].map(match=>decode(match[1]));const modifierAction=modifierActions.find(action=>action.includes('ingredient'));vm.runInContext(modifierAction,f.c);assert.equal(chosen,id);
 let cartMarkup='';f.c.document.querySelectorAll=()=>[];f.c.showModal=value=>{cartMarkup=value};f.c.confirmModifierSelection=value=>{cartChoice=value};f.c.openModifierSelection(id);
 const cartAction=decode(cartMarkup.match(/onclick="([^"]*confirmModifierSelection[^"]*)"/)[1]);vm.runInContext(cartAction,f.c);assert.equal(cartChoice,id);assert.equal(injected,0);
});
test('product photo module loads before persistence and editor with its public API',()=>{
 const configurationTag='<script src="Web/js/features/product-configuration.js"></script>',moduleTag='<script src="Web/js/features/product-photo.js"></script>',persistenceTag='<script src="Web/js/features/product-persistence.js"></script>',editorTag='<script src="Web/js/features/product-editor.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(configurationTag));assert.ok(html.indexOf(persistenceTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(editorTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 assert.doesNotMatch(inline,/function pickProductImage\s*\(/);assert.doesNotMatch(inline,/function handleNativeProductImage\s*\(/);
 const f=fixture();for(const name of ['pickProductImage','handleNativeProductImage','readNativeProductImage','handleNativeProductImageRead','handleProductImage','removeProductImage'])assert.equal(typeof f.c[name],'function',name);
});
test('native product photo accepts only the current editor session and removes stale files',()=>{
 const f=fixture(),messages=[];f.c.webkit={messageHandlers:{photoPicker:{postMessage:value=>messages.push(plain(value))}}};f.fields['pe-save']={};f.fields['pf-image-preview']={innerHTML:''};f.c._pmSession=4;
 f.c.pickProductImage();assert.deepEqual(messages.shift(),{action:'pick'});assert.equal(f.c._pmPhotoRequestSession,4);
 f.c._pmSession=5;f.c.handleNativeProductImage('data:image/jpeg;base64,OLD','old-file');assert.deepEqual(messages.shift(),{action:'remove',id:'old-file'});assert.equal(f.c._pmImageData,undefined);
 f.c.pickProductImage();f.c.handleNativeProductImage('data:image/jpeg;base64,NEW','new-file');assert.equal(f.c._pmImageData,'data:image/jpeg;base64,NEW');assert.equal(f.c._pmLocalImageId,'new-file');assert.equal(f.c._pmRemoveImage,false);assert.match(f.fields['pf-image-preview'].innerHTML,/base64,NEW/);
 f.c.removeProductImage();assert.deepEqual(messages.at(-1),{action:'remove',id:'new-file'});assert.equal(f.c._pmImageData,null);assert.equal(f.c._pmLocalImageId,null);assert.equal(f.c._pmRemoveImage,true);
});
test('native product photo read resolves only its correlated request',async()=>{
 const f=fixture(),messages=[];f.c.webkit={messageHandlers:{photoPicker:{postMessage:value=>messages.push(plain(value))}}};
 const pending=f.c.readNativeProductImage('local-file'),request=messages.at(-1);assert.equal(request.action,'read');assert.equal(request.id,'local-file');assert.ok(request.requestId);
 f.c.handleNativeProductImageRead('other-request','wrong');f.c.handleNativeProductImageRead(request.requestId,'data:image/jpeg;base64,RIGHT');assert.equal(await pending,'data:image/jpeg;base64,RIGHT');assert.equal(await f.c.readNativeProductImage(''),null);
});
test('product persistence module loads after configuration and before editor with its public API',()=>{
 const configurationTag='<script src="Web/js/features/product-configuration.js"></script>',moduleTag='<script src="Web/js/features/product-persistence.js"></script>',editorTag='<script src="Web/js/features/product-editor.js"></script>',catalogTag='<script src="Web/js/features/product-catalog.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(configurationTag));assert.ok(html.indexOf(editorTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(catalogTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 assert.doesNotMatch(inline,/function saveProduct\s*\(/);assert.doesNotMatch(inline,/function toggleProductOnline\s*\(/);
 const f=fixture();for(const name of ['productDependsOn','saveProduct','canEditProductWebSetting','toggleProductOnline','toggleProductModalOnline'])assert.equal(typeof f.c[name],'function',name);
});
test('product editor module loads after configuration and before catalog with its public API',()=>{
 const configurationTag='<script src="Web/js/features/product-configuration.js"></script>',moduleTag='<script src="Web/js/features/product-editor.js"></script>',catalogTag='<script src="Web/js/features/product-catalog.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(configurationTag));assert.ok(html.indexOf(catalogTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function openProductModal\s*\(/);assert.doesNotMatch(inline,/function renderProductModal\s*\(/);
 const f=fixture();for(const name of ['openProductModal','productEditorSnapshot','productEditorDirty','finishProductEditor','requestCloseProductEditor','saveProductEditor','selectProductEditorSection','renderProductUsage','updateProductEditorSummary','renderProductModal'])assert.equal(typeof f.c[name],'function',name);
});
test('availability module loads before stock mutation features and owns its public API',()=>{
 const editorTag='<script src="Web/js/features/product-editor.js"></script>',moduleTag='<script src="Web/js/features/availability.js"></script>',receivingTag='<script src="Web/js/features/receiving.js"></script>',paymentTag='<script src="Web/js/features/payment.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(editorTag));assert.ok(html.indexOf(receivingTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(paymentTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 assert.doesNotMatch(inline,/function publishAvailability\s*\(/);assert.doesNotMatch(inline,/startAvailabilitySchedule|AVAILABILITY_INTERVAL/);
 const f=fixture();for(const name of ['buildAvailabilityItems','publishAvailability','onAvailabilityAppState'])assert.equal(typeof f.c[name],'function',name);assert.equal(typeof f.c.startAvailabilitySchedule,'undefined');
});
test('catalog row actions preserve compatible product IDs as inert arguments',()=>{
 const f=fixture(),decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'),id="catalog\"');injected();//";let injected=0,opened,toggled,stopped=0,prevented=0;
 f.state.products=[{id,name:'Особый товар',category:'Сырьё',type:'simple',stock:1,cost:1,price:1,availableOnline:true}];f.state.categoryOrder=['Сырьё'];f.c.injected=()=>injected++;f.c.openProductModal=value=>{opened=value};f.c.toggleProductOnline=value=>{toggled=value};f.c.event={key:'Enter',stopPropagation:()=>stopped++,preventDefault:()=>prevented++};
 const markup=f.c.renderProductsScreen(),clicks=[...markup.matchAll(/onclick="([^"]*)"/g)].map(match=>decode(match[1])).filter(action=>action.includes('catalog')),keys=[...markup.matchAll(/onkeydown="([^"]*)"/g)].map(match=>decode(match[1])).filter(action=>action.includes('catalog'));
 assert.equal(clicks.length,2);for(const action of clicks)vm.runInContext(action,f.c);assert.equal(opened,id);assert.equal(toggled,id);assert.equal(stopped,1);
 assert.equal(keys.length,1);vm.runInContext(keys[0],f.c);assert.equal(opened,id);assert.equal(prevented,1);assert.equal(injected,0);
});
test('suppliers module loads after access helpers and before startup with its public API',()=>{
 const employeesTag='<script src="Web/js/features/employees.js"></script>',moduleTag='<script src="Web/js/features/suppliers.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(employeesTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function saveSupplier\s*\(/);
 const f=fixture();for(const name of ['openSupplierModal','filterSupplierProducts','deleteSupplier','confirmDeleteSupplier','saveSupplier'])assert.equal(typeof f.c[name],'function',name);
});
test('purchase orders module loads after suppliers and before receiving with its public API',()=>{
 const suppliersTag='<script src="Web/js/features/suppliers.js"></script>',moduleTag='<script src="Web/js/features/purchase-orders.js"></script>',receivingTag='<script src="Web/js/features/receiving-drafts.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(suppliersTag));assert.ok(html.indexOf(receivingTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/async function finalizePurchaseOrder\s*\(/);
 const f=fixture();for(const name of ['canAdminDeletePurchaseOrder','openDeletePurchaseOrderModal','deletePurchaseOrderAsAdmin','purchaseUnitLabel','requestedQuantityText','purchaseUnitOptions','makePurchaseLine','updatePurchaseRequest','finalizePurchaseOrder','purchaseHistoryStatus','purchaseHistoryMarkup','togglePurchaseHistory','openPurchaseQuantity','purchaseQuantityKey','applyPurchaseQuantity','renderPurchaseOrdersScreen','togglePurchasePanel','getPurchaseOrderSupplier','purchaseOrderText','selectPurchaseOrderSupplier','viewPurchaseOrder','copyPurchaseOrder','sharePurchaseOrder'])assert.equal(typeof f.c[name],'function',name);
 for(const retired of ['productConsumptionSince','consumedSimpleProductQty','updatePurchaseQty','openSupplyHistory'])assert.equal(typeof f.c[retired],'undefined',retired);
});
test('receiving UI module loads between purchase orders and receiving drafts with its public API',()=>{
 const purchaseTag='<script src="Web/js/features/purchase-orders.js"></script>',moduleTag='<script src="Web/js/features/receiving-ui.js"></script>',draftsTag='<script src="Web/js/features/receiving-drafts.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(purchaseTag));assert.ok(html.indexOf(draftsTag)>html.indexOf(moduleTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function renderReceivingScreen\s*\(/);
 const f=fixture();for(const name of ['viewReceivingModal','receivingHistoryMarkup','toggleReceivingHistory','renderReceivingScreen','receivingDocumentInput','updateInvoiceLine','addInvoiceProduct','removeInvoiceLine','receivingDocumentMarkup','toggleReceivingPanel','finishReceivingPage','renderReceivingDocument'])assert.equal(typeof f.c[name],'function',name);
 for(const retired of ['addReceivingLine','removeReceivingLine'])assert.equal(typeof f.c[retired],'undefined',retired);
});
test('receiving drafts module loads before startup with its public API',()=>{
 const suppliersTag='<script src="Web/js/features/suppliers.js"></script>',moduleTag='<script src="Web/js/features/receiving-drafts.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(suppliersTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/async function openReceivingDocument\s*\(/);assert.doesNotMatch(inline,/async function saveReceivingDraft\s*\(/);
 const f=fixture();for(const name of ['receivingDraftForOrder','openReceivingDocument','saveReceivingDraft'])assert.equal(typeof f.c[name],'function',name);
});
test('receiving completion module loads after drafts and before startup with its public API',()=>{
 const draftsTag='<script src="Web/js/features/receiving-drafts.js"></script>',moduleTag='<script src="Web/js/features/receiving.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(draftsTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/async function applyReceivingDocument\s*\(/);
 const f=fixture();for(const name of ['invoiceReceivingItems','receivingStockUpdates','receivingDiscrepancy','confirmReceivingDocument','applyReceivingDocument','openPurchaseOrderReceivingModal','finalizePurchaseOrderReceiving','finalizeReceiving'])assert.equal(typeof f.c[name],'function',name);
});
test('WEB orders module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/web-orders.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['startWebOrderEvents','openWebEventsModal','openWebOrder','acceptWebOrder','recoverWebAcceptanceJournal','markCurrentWebOrderReady','testWebOrder'])assert.equal(typeof f.c[name],'function',name);
});
test('inventory module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/inventory.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['inventoryWindow','renderInventoryTopbarReminder','startInventory','fixInventoryItem','confirmCompleteInventory','renderInventoryScreen','renderInventoryWorkScreen'])assert.equal(typeof f.c[name],'function',name);
});
test('warehouse reporting module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/warehouse-reporting.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['warehouseRange','warehouseReport','warehouseExportPayload','openWarehousePage','renderWarehousePage','warehouseSelectedPayload','generateWarehouseReport'])assert.equal(typeof f.c[name],'function',name);
});
test('analytics module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/analytics.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['analyticsRange','setAnalyticsDate','setAnalyticsPreset','analyticsOrders','analyticsData','renderAnalyticsBars','inventoryCostValue','loadLoyaltyAnalytics','renderAnalyticsScreen'])assert.equal(typeof f.c[name],'function',name);
});
test('product catalog module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/product-catalog.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['parseProductCSV','planProductImport','confirmProductImport','productMatchesSearch','sortProductsBy','sortedProductRows','renderProductsScreen','filterProductsScreen','clearProductsSearch'])assert.equal(typeof f.c[name],'function',name);
});
test('product categories module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/product-categories.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['openCategoriesModal','openCategoryModal','selectCategoryColor','limitTileSymbol','saveCategory','toggleCategoryOnline','toggleCategoryModalOnline','deleteCategory'])assert.equal(typeof f.c[name],'function',name);
});
test('POS navigation module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/pos-navigation.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['normalizePosNavigation','posCategoryItems','posVisibleCategoryItems','updatePosNavigation','openPosFolder','savePosFolder','removePosFolder','movePosProduct','reorderPosCategoryTile','ensureLayoutPositions','renderPosScreen','toggleEditMode','openPosCategory','closePosCategory','handlePosGridClick','openLayoutEditor','addLayoutTile','removeLayoutTile','setupLayoutGridDrag','onLayoutPointerDown','onLayoutPointerMove','onLayoutPointerUp','onSearch'])assert.equal(typeof f.c[name],'function',name);
});
test('cart presentation module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/cart-presentation.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['renderCartPanel','discountValue','itemTotal','cartSubtotal','openCartItemModal','changeCartItemModalQty','selectCartDiscount','saveCartItemOptions','openOrderSettings','setOrderType','selectDeliveryFee','saveOrderSettings'])assert.equal(typeof f.c[name],'function',name);
});
test('cart presentation keeps legacy discount totals and escapes line content',()=>{
 const f=fixture();f.state.discounts=[{id:'ten',name:'10%',type:'percent',value:10},{id:'fixed',name:'Скидка',type:'fixed',value:20}];f.state.cart=[{cartLineId:'a',productId:'flour',name:'Мука <мешок>',price:10,qty:2,discountId:'ten',comment:'без <соли>'},{cartLineId:'b',productId:'water',name:'Вода',price:5,qty:2,discountId:'fixed'}];
 assert.equal(f.c.itemTotal(f.state.cart[0]),18);assert.equal(f.c.itemTotal(f.state.cart[1]),0);assert.equal(f.c.cartSubtotal(),18);
 const html=f.c.renderCartPanel(f.c.currentShift());assert.match(html,/Мука &lt;мешок&gt;/);assert.match(html,/без &lt;соли&gt;/);assert.match(html,/10%/);assert.match(html,/Итого/);assert.doesNotMatch(html,/Мука <мешок>/);
});
test('cart composition module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/cart-composition.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['modifierSelectionSignature','cartItemKey','productNeedsManualPrice','addToCart','openManualPriceModal','confirmManualPrice','addConfiguredCartItem','openModifierSelection','toggleModifierChoice','readModifierSelection','updateModifierSelectionTotal','confirmModifierSelection','changeQty','handleCartRowClick','cartRowTouchStart','cartRowTouchMove','cartRowTouchEnd','cartRowTouchCancel','resetCurrentOrderState','removeFromCart'])assert.equal(typeof f.c[name],'function',name);
});
test('cart row click is safe before any touch gesture',()=>{
 const f=fixture();let opened='';f.c.openCartItemModal=id=>{opened=id};assert.doesNotThrow(()=>f.c.handleCartRowClick({target:{closest:()=>null},preventDefault:()=>{}},'line-1'));assert.equal(opened,'line-1');
});
test('manual cart price accepts comma, rounds cents and persists the legacy line',()=>{
 const f=fixture();f.fields['manual-sale-price']={value:'12,345',focus:()=>{}};f.c._manualPriceContext={productId:'flour',mods:[]};f.c.confirmManualPrice();
 assert.equal(f.state.cart.length,1);assert.equal(f.state.cart[0].basePrice,12.35);assert.equal(f.state.cart[0].price,12.35);assert.equal(f.state.cart[0].manualPrice,true);assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).items[0].basePrice,12.35);
});
test('parked orders module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/parked-orders.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['kitchenPrintLineKey','kitchenPrintedSnapshot','kitchenPrintDelta','parkOrder','confirmParkOrderLabel','parkOrderNow','openParkedModal','resumeParked','deleteParked'])assert.equal(typeof f.c[name],'function',name);
});
test('payment module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/payment.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function finalizePayment\s*\(/);
 const f=fixture();for(const name of ['paymentCartLines','openPaymentModal','renderPaymentScreen','closePaymentPage','openSplitPayment','buildSplitPayments','validateSplitPaymentDraft','completeSplitPayment','beginPaymentWithLoyaltyGuard','confirmPaymentScreen','finalizePayment','receiptBodyHtml','sendOrderToPrint','showPaymentReceipt'])assert.equal(typeof f.c[name],'function',name);
});
test('receipts module loads after payment and before startup with its public API',()=>{
 const paymentTag='<script src="Web/js/features/payment.js"></script>',moduleTag='<script src="Web/js/features/receipts.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(paymentTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function processFullReturn\s*\(/);
 const f=fixture();for(const name of ['showReceipt','viewReceiptModal','restoreOrderStock','openReturnConfirm','processFullReturn','printReceipt','selectReceipt','renderReceiptsScreen'])assert.equal(typeof f.c[name],'function',name);
});
test('category create and rename preserve separate channels, legacy layout, product and navigation references',()=>{
 const f=fixture();Object.assign(f.state,{categoryOrder:[],categoryColors:{},categorySymbols:{},categoryOnline:{},categoryOnlineOrder:{},categoryOnlineMenu:{},layoutTiles:[]});Object.assign(f.fields,{'cf-name':{value:'Напитки'},'cf-color':{value:'#DDEBFF'},'cf-symbol':{value:'НП'}});f.c._cmOnlineOrder=false;f.c._cmOnlineMenu=true;f.c.saveCategory(null);
 let layout=JSON.parse(f.data.get('prilavok_layout'));assert.deepEqual(layout.categoryOrder,['Напитки']);assert.equal(layout.categoryColors['Напитки'],'#DDEBFF');assert.equal(layout.categorySymbols['Напитки'],'НП');assert.equal(layout.categoryOnline['Напитки'],false);assert.equal(layout.categoryOnlineOrder['Напитки'],false);assert.equal(layout.categoryOnlineMenu['Напитки'],true);assert.equal(f.data.has('prilavok_products'),false);
 const g=fixture();Object.assign(g.state,{categoryOrder:['Сырьё'],categoryColors:{'Сырьё':'#OLD'},categorySymbols:{'Сырьё':'С'},categoryOnline:{'Сырьё':false},categoryOnlineOrder:{'Сырьё':false},categoryOnlineMenu:{'Сырьё':true},layoutTiles:[{type:'category',id:'Сырьё'}],posNavigation:{version:1,categories:[{category:'Сырьё',items:[]}]}});Object.assign(g.fields,{'cf-name':{value:'Ингредиенты'},'cf-color':{value:'#DFF5E8'},'cf-symbol':{value:'ИНГ'}});g.c._cmOnlineOrder=false;g.c._cmOnlineMenu=true;g.c.saveCategory('Сырьё');
 assert.equal(g.c.getProduct('flour').category,'Ингредиенты');assert.equal(g.state.layoutTiles[0].id,'Ингредиенты');assert.equal(g.state.posNavigation.categories[0].category,'Ингредиенты');assert.deepEqual(plain(g.state.categoryOrder),['Ингредиенты']);assert.equal(g.state.categoryColors['Сырьё'],undefined);assert.equal(g.state.categoryOnlineOrder['Ингредиенты'],false);assert.equal(g.state.categoryOnlineMenu['Ингредиенты'],true);assert.deepEqual(new Set(g.writes),new Set(['prilavok_posNavigation','prilavok_products','prilavok_layout']));assert.equal(JSON.parse(g.data.get('prilavok_products')).find(p=>p.id==='flour').category,'Ингредиенты');assert.equal(JSON.parse(g.data.get('prilavok_layout')).tiles[0].id,'Ингредиенты');
});
test('category tile symbol truncation keeps complete Unicode graphemes',()=>{
 const f=fixture();assert.equal(f.c.limitTileSymbol('👨‍🍳❤️🇧🇾К'), '👨‍🍳❤️🇧🇾');assert.equal(f.c.limitTileSymbol('  КФ  '),'КФ');assert.equal(f.c.limitTileSymbol(''), '');
});
test('category deletion is blocked before confirmation while products still use it',()=>{
 const f=fixture();f.state.categoryOrder=['Сырьё','Пустая'];let requested=null;f.c.requestDelete=(...args)=>{requested=args};f.c.deleteCategory('Сырьё');assert.equal(requested,null);assert.match(f.messages.at(-1),/есть товары/);assert.equal(f.writes.length,0);f.c.deleteCategory('Пустая');assert.deepEqual(requested,['category','Пустая']);
});
test('analytics keeps local payment, cost and grouping rules within the selected period',()=>{
 const f=fixture(),inside=new Date(2026,9,1,12).getTime(),outside=new Date(2026,8,30,12).getTime();
 f.state.analyticsFrom='2026-10-01';f.state.analyticsTo='2026-10-01';f.state.shifts=[{id:'s1',employeeName:'Анна',status:'closed'}];
 f.state.orders=[
  {id:'paid',timestamp:inside,shiftId:'s1',total:30,payments:[{method:'cash',amount:10},{method:'card',amount:20}],items:[{productId:'flour',name:'Мука',price:15,qty:2,cost:2}]},
  {id:'returned',timestamp:inside,shiftId:'s1',total:99,method:'cash',returnedAt:inside+1,items:[{productId:'water',name:'Вода',price:99,qty:1,cost:1}]},
  {id:'outside',timestamp:outside,shiftId:'s1',total:50,method:'card',items:[]}
 ];
 const writes=f.writes.length,d=f.c.analyticsData();assert.deepEqual(plain(d.orders.map(x=>x.id)),['paid']);assert.equal(d.revenue,30);assert.equal(d.cash,10);assert.equal(d.card,20);assert.equal(d.cost,4);assert.equal(d.profit,26);assert.equal(d.avg,30);assert.deepEqual(plain(d.employees),[{name:'Анна',value:30}]);assert.deepEqual(plain(d.categories),[{name:'Сырьё',revenue:30,qty:2}]);assert.deepEqual(plain(d.products),[{name:'Мука',revenue:30,qty:2}]);assert.equal(f.c.inventoryCostValue(),30);assert.equal(f.writes.length,writes);
});
test('loyalty analytics failure stays isolated from local receipt analytics',async()=>{
 const f=fixture(),inside=new Date(2026,9,1,12).getTime();f.state.analyticsFrom='2026-10-01';f.state.analyticsTo='2026-10-01';f.state.orders=[{id:'paid',timestamp:inside,total:12,method:'cash',items:[]}];
 await assert.doesNotReject(f.c.loadLoyaltyAnalytics('2026-10-01','2026-10-01'));assert.equal(f.state.loyaltyAnalytics.error,true);assert.equal(f.c.analyticsData().revenue,12);assert.equal(f.state.orders.length,1);
});
test('hall bookings module loads before startup and preserves its public API',()=>{
 const moduleTag='<script src="Web/js/features/hall-bookings.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>=0);assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));
 const f=fixture();for(const name of ['bookingWindow','tableBookings','tableBusyAt','createHallTable','confirmDeleteHallTable','saveNewBooking','hallPointerStart','renderBookingsScreen'])assert.equal(typeof f.c[name],'function',name);
});
test('backup module loads after feature dependencies and before startup with its public API',()=>{
 const hallTag='<script src="Web/js/features/hall-bookings.js"></script>',moduleTag='<script src="Web/js/features/backup.js"></script>',startupTag='<script>loadAll();</script>';
 assert.ok(html.indexOf(moduleTag)>html.indexOf(hallTag));assert.ok(html.indexOf(startupTag)>html.indexOf(moduleTag));assert.doesNotMatch(inline,/function applyBackupData\s*\(/);
 const f=fixture();for(const name of ['exportBackup','backupArray','validateBackupData','applyBackupData','importBackup'])assert.equal(typeof f.c[name],'function',name);
});
test('booking intervals reject overlap, allow adjacent times and sort active rows',()=>{
 const f=fixture(),a={id:'a',tableId:'t1',date:'2026-10-02',startAt:'2026-10-02T18:00:00',endAt:'2026-10-02T19:00:00',status:'confirmed'},b={id:'b',tableId:'t1',date:'2026-10-02',startAt:'2026-10-02T17:00:00',endAt:'2026-10-02T17:30:00',status:'confirmed'},cancelled={id:'c',tableId:'t1',date:'2026-10-02',startAt:'2026-10-02T18:30:00',endAt:'2026-10-02T20:00:00',status:'cancelled'};
 f.state.bookings=[a,cancelled,b];assert.equal(f.c.tableBusyAt('t1',new Date('2026-10-02T18:30:00'),new Date('2026-10-02T19:30:00')),true);assert.equal(f.c.tableBusyAt('t1',new Date('2026-10-02T19:00:00'),new Date('2026-10-02T20:00:00')),false);assert.deepEqual(plain(f.c.tableBookings('t1','2026-10-02').map(x=>x.id)),['b','a']);
});
test('hall table persistence keeps legacy keys and deletion removes linked bookings',async()=>{
 const f=fixture();f.fields['new-hall-table-name']={value:'Терраса'};f.c.createHallTable('rectangle');await Promise.resolve();
 const table=f.state.hallTables[0];assert.equal(table.name,'Терраса');assert.equal(table.shape,'rectangle');assert.equal(JSON.parse(f.data.get('prilavok_hallTables'))[0].name,'Терраса');
 f.state.bookings=[{id:'linked',tableId:table.id,date:'2026-10-02',status:'confirmed'},{id:'other',tableId:'other',date:'2026-10-02',status:'confirmed'}];f.c.saveBookings();await Promise.resolve();f.c.confirmDeleteHallTable(table.id);await Promise.resolve();
 assert.equal(f.state.hallTables.length,0);assert.deepEqual(plain(f.state.bookings.map(x=>x.id)),['other']);assert.deepEqual(JSON.parse(f.data.get('prilavok_hallTables')),[]);assert.deepEqual(JSON.parse(f.data.get('prilavok_bookings')).map(x=>x.id),['other']);
});
test('Android activity owns the local POS WebView lifecycle',()=>{
 assert.match(androidActivity,/root\.addView\(webView\)/);
 assert.match(androidActivity,/root\.addView\(startupView\)/);
 assert.match(androidActivity,/setContentView\(root\)/);
 assert.match(androidActivity,/webView\.loadUrl\(START_URL\)/);
 assert.match(androidActivity,/override fun onDestroy/);
 assert.match(androidActivity,/webView\.destroy\(\)/);
});
test('startup first paint does not wait for WEB acceptance recovery',async()=>{
 const f=fixture();let rendered=false,recoveryStarted=false,release;
 const gate=new Promise(resolve=>{release=resolve;});
 f.c.render=()=>{rendered=true;};
 f.c.recoverWebAcceptanceJournal=async()=>{recoveryStarted=true;await gate;return true;};
 await f.c.loadAll();
 assert.equal(rendered,true);assert.equal(recoveryStarted,true);
 release();
});
test('startup survives valid JSON with invalid root storage shapes without overwriting it',async()=>{
 const f=fixture(),raw={products:'{}',shifts:'{}',orders:'"broken"',receivings:'7',layout:'[]',network:'[]',hallTables:'{}',inventoryDraft:'[]',currentOrderSession:'[]'};
 for(const [key,value] of Object.entries(raw))f.data.set('prilavok_'+key,value);
 await assert.doesNotReject(f.c.loadAll());assert.equal(f.state.loaded,true);assert.deepEqual(plain(f.state.products),[]);assert.deepEqual(plain(f.state.shifts),[]);assert.deepEqual(plain(f.state.orders),[]);assert.deepEqual(plain(f.state.receivings),[]);assert.equal(f.state.inventoryDraft,null);
 for(const [key,value] of Object.entries(raw))assert.equal(f.data.get('prilavok_'+key),value,'invalid '+key+' must remain available for recovery');
 assert.equal(vm.runInContext('storageBroken',f.c),true);
});
test('startup filters invalid product rows but preserves original catalogue bytes',async()=>{
 const f=fixture(),raw=JSON.stringify([null,{id:'safe',name:'Безопасный',type:'simple',stock:1,cost:1,price:2}]);f.data.set('prilavok_products',raw);
 await assert.doesNotReject(f.c.loadAll());assert.equal(f.state.products.length,1);assert.equal(f.state.products[0].id,'safe');assert.equal(f.data.get('prilavok_products'),raw);assert.equal(vm.runInContext('storageBroken',f.c),true);
});
test('legacy products remain visible in online menu without changing online order setting',async()=>{
 const f=fixture(),legacy={id:'legacy',name:'Старый товар',type:'simple',stock:1,cost:1,price:2,availableOnline:false};f.data.set('prilavok_products',JSON.stringify([legacy]));
 await f.c.loadAll();const product=f.state.products[0];assert.equal(product.availableOnline,false);assert.equal(product.availableInOnlineMenu,true);
 const saved=JSON.parse(f.data.get('prilavok_products'))[0];assert.equal(saved.availableOnline,false);assert.equal(saved.availableInOnlineMenu,true);
});
test('legacy category publication initializes both category channels and syncs them independently',async()=>{
 const f=fixture();f.data.set('prilavok_products',JSON.stringify([{id:'legacy',name:'Старый товар',category:'Скрытая',type:'simple',stock:1,cost:1,price:2,availableOnline:true,availableInOnlineMenu:true}]));f.data.set('prilavok_layout',JSON.stringify({categoryOrder:['Скрытая'],categoryColors:{},categorySymbols:{},categoryOnline:{'Скрытая':false},tiles:[]}));
 await f.c.loadAll();assert.equal(f.state.categoryOnlineOrder['Скрытая'],false);assert.equal(f.state.categoryOnlineMenu['Скрытая'],false);
 f.state.categoryOnlineMenu['Скрытая']=true;const payload=f.c.buildMenuSyncPayload(),category=payload.categories[0],product=payload.products[0];
 assert.equal(category.availableOnline,false);assert.equal(category.visibleInOnlineMenu,true);assert.equal(product.availableOnline,false);assert.equal(product.visibleInOnlineMenu,true);
});
test('nested recipe multiplies quantities and aggregates repeated ingredients',()=>{
 const f=fixture();f.c.getProduct('pizza').components=[{productId:'dough',qty:2},{productId:'flour',qty:0.1}];
 const quantities=f.c.productIngredients(f.c.getProduct('pizza'),3);
 near(quantities.get('flour'),1.5);near(quantities.get('water'),0.6);
 near(f.c.compositeCost(f.c.getProduct('pizza')),1.2);
 f.c.getProduct('flour').stock=1;assert.equal(f.c.availableStock(f.c.getProduct('pizza')),2);
});
test('sale writes nested stock snapshot through real adapter; same receipt survives restart',async()=>{
 const f=fixture(),order=await f.sale();near(f.c.getProduct('flour').stock,9.8);near(f.c.getProduct('water').stock,9.9);
 assert.deepEqual(plain(order.stockConsumption),{version:1,items:[{productId:'flour',qty:0.2},{productId:'water',qty:0.1}]});
 const saved=JSON.parse(f.data.get('prilavok_orders'));assert.deepEqual(saved[0].stockConsumption,plain(order.stockConsumption));
 const next=fixture();for(const [k,v] of f.data)next.data.set(k,v);await next.c.loadAll();
 assert.deepEqual(plain(next.state.orders[0].stockConsumption),saved[0].stockConsumption);
 assert.ok(f.writes.every(k=>k.startsWith('prilavok_')));
});
test('payment publishes availability only after local commit and never waits for its network request',async()=>{
 const f=fixture();f.cart();f.state.currentOrderSource='web';f.state.currentWebOrderId='web-order-1';f.state.currentWebOrderStatus='accepted';let releaseCommit,availabilityCalls=0,settledIds;const gate=new Promise(resolve=>{releaseCommit=resolve}),realCommit=f.c.commitCriticalStorage;
 f.c.commitCriticalStorage=async(...args)=>{await gate;return realCommit(...args)};
 f.c.publishAvailability=ids=>{availabilityCalls++;settledIds=ids;return new Promise(()=>{})};
 const payment=f.c.finalizePayment([{method:'cash',amount:10}]);await Promise.resolve();assert.equal(availabilityCalls,0);assert.equal(f.state.orders.length,0);
 releaseCommit();await payment;assert.equal(availabilityCalls,1);assert.deepEqual(plain(settledIds),['web-order-1']);assert.equal(f.state.orders.length,1);const stored=JSON.parse(f.data.get('prilavok_orders'))[0];assert.equal(stored.webOrderId,'web-order-1');assert.equal(stored.source,'web');
});
test('cash, card and split payments create one receipt and retain payment data',async()=>{
 for(const payments of [[{method:'cash',amount:10,cashGiven:20,change:10}],[{method:'card',amount:10}],[{method:'cash',amount:4,cashGiven:5,change:1},{method:'card',amount:6}]]){
  const f=fixture(),order=await f.sale(payments);assert.equal(f.state.orders.length,1);assert.equal(order.total,10);
  assert.equal(order.payments.length,payments.length);near(f.c.getProduct('flour').stock,9.8);
  await f.c.finalizePayment(payments);assert.equal(f.state.orders.length,1,'empty cart cannot create duplicate receipt');
 }
});

test('accepted split part is journaled before it becomes paid in memory',async()=>{
 const f=fixture();f.cart();f.c.renderSplitPayment=()=>{};f.state._splitPayments=f.c.buildSplitPayments(2,10);f.state._splitPaymentTotalCents=1000;
 let storedBeforeLive=false;const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_currentOrderSession')storedBeforeLive=f.state._splitPayments[0].paid===false;originalSet(key,value)};
 assert.equal(await f.c.completeSplitPayment(0),true);assert.equal(storedBeforeLive,true);assert.equal(f.state._splitPayments[0].paid,true);
 const session=JSON.parse(f.data.get('prilavok_currentOrderSession'));assert.equal(session.paymentDraft.version,1);assert.equal(session.paymentDraft.totalCents,1000);assert.equal(session.paymentDraft.parts[0].paid,true);assert.equal(session.paymentDraft.parts[1].paid,false);
});

test('split progress storage failure leaves the part unpaid',async()=>{
 const f=fixture();f.cart();f.c.renderSplitPayment=()=>{};f.state._splitPayments=f.c.buildSplitPayments(2,10);f.state._splitPaymentTotalCents=1000;const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.completeSplitPayment(0),false);assert.equal(f.state._splitPayments[0].paid,false);assert.equal(f.data.has('prilavok_currentOrderSession'),false);assert.match(f.messages.at(-1),/Часть оплаты не сохранена/);
});

test('interrupted split progress recovers the paid part on restart',async()=>{
 const f=fixture();f.cart();f.c.renderSplitPayment=()=>{};f.state._splitPayments=f.c.buildSplitPayments(2,10);f.state._splitPaymentTotalCents=1000;const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_currentOrderSession'&&!failed){failed=true;throw Error('injected session failure')}originalSet(key,value)};
 assert.equal(await f.c.completeSplitPayment(0),false);assert.equal(f.state._splitPayments[0].paid,false);assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal')));
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state._splitPayments[0].paid,true);assert.equal(JSON.parse(restarted.data.get('prilavok_criticalStorageJournal')),null);
});

test('restart restores a compatible paid split draft from current session',async()=>{
 const f=fixture();f.cart();f.c.renderSplitPayment=()=>{};f.state._splitPayments=f.c.buildSplitPayments(2,10);f.state._splitPaymentTotalCents=1000;await f.c.completeSplitPayment(0);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.equal(restarted.state.cart.length,1);assert.equal(restarted.state._splitPayments.length,2);assert.equal(restarted.state._splitPayments[0].paid,true);assert.equal(restarted.state._splitPaymentTotalCents,1000);
});

test('split draft restores loyalty inputs that define the paid receipt total',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.loyaltyPrograms=[{id:'reward',loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};assert.equal(f.c.cartTotal(),10);f.c.renderSplitPayment=()=>{};f.state._splitPayments=f.c.buildSplitPayments(2,10);f.state._splitPaymentTotalCents=1000;await f.c.completeSplitPayment(0);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.c.cartTotal(),10);assert.equal(restarted.state.loyaltyRedemptions.reward,1);assert.equal(restarted.state._splitPayments[0].paid,true);
});
test('selected customer loyalty survives a normal unfinished order restart',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer',name:'Клиент',phone:'+375290000000'};f.state.loyaltyPrograms=[{id:'reward',name:'Каждый второй',rewards:1,loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};f.state.loyaltyCustomerId='customer';f.c.saveCurrentOrderSession();
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state.customer.id,'customer');assert.equal(restarted.state.loyaltyCustomerId,'customer');assert.equal(restarted.state.loyaltyPrograms[0].name,'Каждый второй');assert.equal(restarted.state.loyaltyRedemptions.reward,1);assert.equal(restarted.c.cartTotal(),10);
});

test('paid split draft cannot be silently discarded and clears with final receipt',async()=>{
 const f=fixture();f.cart();f.c.renderSplitPayment=()=>{};f.state._splitPayments=[{method:'cash',amount:4,paid:true,cashGiven:5,change:1},{method:'card',amount:6,paid:false,cashGiven:null,change:null}];f.state._splitPaymentTotalCents=1000;
 assert.equal(f.c.closePaymentPage(),false);assert.equal(f.c.returnFromSplitPayment(),false);assert.equal(f.state._splitPayments.length,2);
 await f.c.completeSplitPayment(1);await f.c.finalizePayment(f.state._splitPayments);assert.equal(f.state.orders.length,1);assert.equal(f.state.orders[0].payments.length,2);assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).paymentDraft,undefined);
});

test('payment finalization rejects malformed methods and negative offsets',async()=>{
 for(const payments of [[{method:'voucher',amount:10}],[{method:'cash',amount:-5},{method:'card',amount:15}]]){
  const f=fixture();f.cart();await f.c.finalizePayment(payments);assert.equal(f.state.orders.length,0);assert.equal(f.state.cart.length,1);assert.match(f.messages.at(-1),/Оплата не завершена/);
 }
});

test('critical payment journal recovers every related key after an interrupted write',async()=>{
 const f=fixture();f.cart();const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_orders'&&!failed){failed=true;throw Error('injected write failure')}originalSet(key,value)};
 await f.c.finalizePayment([{method:'cash',amount:10}]);
 assert.equal(f.state.orders.length,0);assert.equal(f.state.cart.length,1);assert.match(f.messages.at(-1),/Оплата не завершена/);
 assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal'))?.writes?.length);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.equal(restarted.state.orders.length,1);near(restarted.c.getProduct('flour').stock,9.8);near(restarted.c.getProduct('water').stock,9.9);
 assert.equal(JSON.parse(restarted.data.get('prilavok_criticalStorageJournal')),null);
 assert.deepEqual(JSON.parse(restarted.data.get('prilavok_currentOrderSession')).items,[]);
});

test('failed journal creation leaves payment, stock and cart unchanged',async()=>{
 const f=fixture();f.cart();const before=JSON.stringify(f.state);const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 await f.c.finalizePayment([{method:'cash',amount:10}]);
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.data.has('prilavok_orders'),false);assert.match(f.messages.at(-1),/Оплата не завершена/);
});

test('parking moves current order and session together',async()=>{
 const f=fixture();f.cart();f.state.orderLabel='Стол 4';f.c.saveCurrentOrderSession();
 const parked=await f.c.parkOrderNow();
 assert.equal(parked,true);assert.equal(f.state.cart.length,0);assert.equal(f.state.parked.length,1);
 assert.equal(JSON.parse(f.data.get('prilavok_parked'))[0].orderLabel,'Стол 4');
 assert.deepEqual(JSON.parse(f.data.get('prilavok_currentOrderSession')).items,[]);
 assert.equal(JSON.parse(f.data.get('prilavok_criticalStorageJournal')),null);
});

test('parking journal failure retains current order and does not print',async()=>{
 const f=fixture();f.cart();f.state.orderLabel='Стол 5';f.c.saveCurrentOrderSession();let prints=0;f.c.printKitchenOrderNow=()=>prints++;
 const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 const parked=await f.c.parkOrderNow();
 assert.equal(parked,false);assert.equal(f.state.cart.length,1);assert.equal(f.state.parked.length,0);assert.equal(prints,0);
 assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).items.length,1);assert.match(f.messages.at(-1),/Чек не отложен/);
});

test('parking sends kitchen print only after durable order move',async()=>{
 const f=fixture();f.cart();f.state.orderLabel='Стол 5А';let atPrint;
 f.c.printKitchenOrderNow=()=>{atPrint={parked:JSON.parse(f.data.get('prilavok_parked')).length,session:JSON.parse(f.data.get('prilavok_currentOrderSession')).items.length}};
 assert.equal(await f.c.parkOrderNow(),true);assert.deepEqual(atPrint,{parked:1,session:0});
 assert.equal(f.state.parked[0].kitchenPrinted,true);assert.equal(JSON.parse(f.data.get('prilavok_parked'))[0].kitchenPrinted,true);
});

test('interrupted parking recovers parked order and cleared session on restart',async()=>{
 const f=fixture();f.cart();f.state.orderLabel='Стол 6';f.c.saveCurrentOrderSession();const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_parked'&&!failed){failed=true;throw Error('injected parked failure')}originalSet(key,value)};
 const parked=await f.c.parkOrderNow();
 assert.equal(parked,false);assert.equal(f.state.cart.length,1);assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal')));
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.equal(restarted.state.parked.length,1);assert.equal(restarted.state.parked[0].orderLabel,'Стол 6');assert.equal(restarted.state.cart.length,0);
 assert.equal(JSON.parse(restarted.data.get('prilavok_criticalStorageJournal')),null);
});

test('resume failure retains parked order and empty current cart',async()=>{
 const f=fixture();f.state.parked=[{id:'p',items:[{productId:'pizza',name:'Пицца',price:10,qty:1}],orderLabel:'Стол 7',orderType:'На месте',customer:{}}];
 f.data.set('prilavok_parked',JSON.stringify(plain(f.state.parked)));const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 const resumed=await f.c.resumeParked('p');
 assert.equal(resumed,false);assert.equal(f.state.cart.length,0);assert.equal(f.state.parked.length,1);assert.match(f.messages.at(-1),/Чек не открыт/);
});

test('interrupted resume recovers current session and removes parked copy',async()=>{
 const f=fixture();f.state.parked=[{id:'p',items:[{productId:'pizza',name:'Пицца',price:10,qty:1}],orderLabel:'Стол 8',orderType:'Доставка',deliveryFee:5,deliveryTariffSelected:true,customer:{id:'c',name:'Анна',phone:'+375291234567'},comment:'Без лука',source:'web',webOrderId:'web-8',webOrderStatus:'accepted'}];
 f.data.set('prilavok_parked',JSON.stringify(plain(f.state.parked)));const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_parked'&&!failed){failed=true;throw Error('injected parked failure')}originalSet(key,value)};
 const resumed=await f.c.resumeParked('p');
 assert.equal(resumed,false);assert.equal(f.state.cart.length,0);assert.equal(f.state.parked.length,1);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.equal(restarted.state.parked.length,0);assert.equal(restarted.state.cart.length,1);assert.equal(restarted.state.orderLabel,'Стол 8');
 assert.equal(restarted.state.orderComment,'Без лука');assert.equal(restarted.state.currentWebOrderId,'web-8');assert.equal(restarted.state.deliveryTariffSelected,true);
});

test('double parking action commits once',async()=>{
 const f=fixture();f.cart();f.state.orderLabel='Стол 9';let release,calls=0;const gate=new Promise(resolve=>{release=resolve}),commit=f.c.commitCriticalStorage;
 f.c.commitCriticalStorage=async(...args)=>{calls++;await gate;return commit(...args)};
 const first=f.c.parkOrderNow(),second=await f.c.parkOrderNow();
 assert.equal(second,false);assert.equal(calls,1);release();assert.equal(await first,true);assert.equal(f.state.parked.length,1);
});

test('parked deletion persists before removing the row from memory',async()=>{
 const f=fixture();f.state.parked=[{id:'keep',items:[]},{id:'remove',items:[]}];f.data.set('prilavok_parked',JSON.stringify(plain(f.state.parked)));f.c.openParkedModal=()=>{};
 assert.equal(await f.c.deleteParked('remove'),true);assert.deepEqual(plain(f.state.parked.map(x=>x.id)),['keep']);assert.deepEqual(JSON.parse(f.data.get('prilavok_parked')).map(x=>x.id),['keep']);assert.equal(JSON.parse(f.data.get('prilavok_criticalStorageJournal')),null);
});

test('parked deletion storage failure retains memory and persisted order',async()=>{
 const f=fixture();f.state.parked=[{id:'keep',items:[]},{id:'remove',items:[]}];f.data.set('prilavok_parked',JSON.stringify(plain(f.state.parked)));const before=JSON.stringify(f.state.parked),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.deleteParked('remove'),false);assert.equal(JSON.stringify(f.state.parked),before);assert.deepEqual(JSON.parse(f.data.get('prilavok_parked')).map(x=>x.id),['keep','remove']);assert.match(f.messages.at(-1),/Чек не удалён/);
});

test('opening shift failure keeps state closed and sends no report',async()=>{
 const f=fixture();f.state.shifts=[];f.state.employees=[{id:'employee',name:'Иванов Иван',role:'employee'}];f.fields['sf-employee']={value:'employee'};let telegram=0,monthly=0;
 f.c.sendTelegramShiftOpened=()=>telegram++;f.c.maybeSendMonthlyWarehouseReport=()=>monthly++;const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.submitOpenShift(),false);assert.equal(f.state.shifts.length,0);assert.equal(telegram,0);assert.equal(monthly,0);assert.match(f.messages.at(-1),/Смена не открыта/);
});

test('opening shift persists before Telegram and applies state once',async()=>{
 const f=fixture();f.state.shifts=[];f.state.employees=[{id:'employee',name:'Иванов Иван',phone:'+375290000000',role:'employee'}];f.fields['sf-employee']={value:'employee'};let storedAtTelegram;
 f.c.sendTelegramShiftOpened=()=>{storedAtTelegram=JSON.parse(f.data.get('prilavok_shifts'))[0].status};f.c.maybeSendMonthlyWarehouseReport=()=>{};
 assert.equal(await f.c.submitOpenShift(),true);assert.equal(f.state.shifts.length,1);assert.equal(storedAtTelegram,'open');assert.equal(JSON.parse(f.data.get('prilavok_shifts')).length,1);
 assert.equal(await f.c.submitOpenShift(),false);assert.equal(f.state.shifts.length,1);
});

test('cash movement failure leaves shift and stored cash unchanged',async()=>{
 const f=fixture();f.data.set('prilavok_shifts',JSON.stringify(plain(f.state.shifts)));f.fields['cash-movement-amount']={value:'25,50'};f.fields['cash-movement-note']={value:'Размен'};const before=JSON.stringify(f.state.shifts),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.submitCashMovement('deposit'),false);assert.equal(JSON.stringify(f.state.shifts),before);assert.equal(JSON.parse(f.data.get('prilavok_shifts'))[0].cashMovements,undefined);assert.match(f.messages.at(-1),/не сохранена/);
});

test('cash movement validates numbers and persists exact amount',async()=>{
 const f=fixture();f.fields['cash-movement-note']={value:'Размен'};
 for(const value of ['', '-1', 'Infinity', 'abc']){f.fields['cash-movement-amount']={value};assert.equal(await f.c.submitCashMovement('deposit'),false)}
 f.fields['cash-movement-amount']={value:'25,50'};assert.equal(await f.c.submitCashMovement('deposit'),true);
 assert.equal(f.state.shifts[0].cashMovements[0].amount,25.5);assert.equal(JSON.parse(f.data.get('prilavok_shifts'))[0].cashMovements[0].note,'Размен');
});

test('closing shift rejects negative and non-finite counted cash',async()=>{
 const f=fixture();for(const value of ['', '-1', 'Infinity', 'abc']){f.fields['sf-counted']={value};assert.equal(await f.c.submitCloseShift(),false);assert.equal(f.state.shifts[0].status,'open')}
 assert.equal(f.data.has('prilavok_shifts'),false);
});

test('closing shift failure keeps shift open and sends no external report',async()=>{
 const f=fixture();f.data.set('prilavok_shifts',JSON.stringify(plain(f.state.shifts)));f.fields['sf-counted']={value:'100'};let telegram=0,prints=0;f.c.sendTelegramShiftClosed=()=>telegram++;f.c.printShiftCloseReceipt=()=>prints++;const originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.submitCloseShift(),false);assert.equal(f.state.shifts[0].status,'open');assert.equal(JSON.parse(f.data.get('prilavok_shifts'))[0].status,'open');assert.equal(telegram,0);assert.equal(prints,0);
});

test('closing shift persists before Telegram and printing',async()=>{
 const f=fixture();f.fields['sf-counted']={value:'100,25'};const observed=[];
 const status=()=>JSON.parse(f.data.get('prilavok_shifts'))[0].status;f.c.sendTelegramShiftClosed=()=>observed.push(['telegram',status()]);f.c.printShiftCloseReceipt=()=>observed.push(['print',status()]);
 assert.equal(await f.c.submitCloseShift(),true);assert.equal(f.state.shifts[0].status,'closed');assert.equal(f.state.shifts[0].countedCash,100.25);assert.deepEqual(observed,[['telegram','closed'],['print','closed']]);
});

test('interrupted shift close recovers durable closed state after restart',async()=>{
 const f=fixture();f.data.set('prilavok_shifts',JSON.stringify(plain(f.state.shifts)));f.fields['sf-counted']={value:'100'};const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_shifts'&&!failed){failed=true;throw Error('injected shift failure')}originalSet(key,value)};
 assert.equal(await f.c.submitCloseShift(),false);assert.equal(f.state.shifts[0].status,'open');assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal')));
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state.shifts[0].status,'closed');assert.equal(restarted.state.shifts[0].countedCash,100);
});

test('mixed shift keeps cash, card, return, movements and close report consistent',async()=>{
 const f=fixture();await f.sale([{method:'cash',amount:10}]);const cashOrder=f.state.orders.at(-1);
 await f.sale([{method:'card',amount:10}]);await f.sale([{method:'cash',amount:4},{method:'card',amount:6}]);
 await f.c.processFullReturn(cashOrder.id);
 f.fields['cash-movement-amount']={value:'20'};f.fields['cash-movement-note']={value:'Размен'};assert.equal(await f.c.submitCashMovement('deposit'),true);
 f.fields['cash-movement-amount']={value:'5'};f.fields['cash-movement-note']={value:'Инкассация'};assert.equal(await f.c.submitCashMovement('withdrawal'),true);
 const totals=f.c.shiftTotals('shift');assert.equal(totals.count,2);assert.equal(totals.cash,4);assert.equal(totals.card,16);assert.equal(totals.total,20);assert.equal(totals.refunds,10);assert.equal(totals.deposits,20);assert.equal(totals.withdrawals,15);assert.equal(f.c.cashDrawerBalance(f.state.shifts[0],totals),119);
 f.fields['sf-counted']={value:'119'};f.c.sendTelegramShiftClosed=()=>{};f.c.printShiftCloseReceipt=()=>true;assert.equal(await f.c.submitCloseShift(),true);
 const report=f.c.buildShiftReportPayload(f.state.shifts[0]);assert.equal(report.expectedCash,119);assert.equal(report.countedCash,119);assert.equal(report.difference,0);assert.equal(report.orders.length,3);
});

test('corrupt drawer values block shift mutations and cash return before storage writes',async()=>{
 const f=fixture(),order=await f.sale();f.state.shifts[0].cashMovements=[{id:'broken',type:'deposit',amount:Infinity}];
 f.fields['cash-movement-amount']={value:'1'};f.fields['cash-movement-note']={value:''};f.fields['sf-counted']={value:'100'};
 const before=JSON.stringify(f.state),writes=f.writes.length;
 assert.equal(await f.c.submitCashMovement('deposit'),false);assert.equal(await f.c.submitCloseShift(),false);await f.c.processFullReturn(order.id);
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,writes);assert.match(f.messages.at(-1),/Некорректные данные кассовой смены/);
 const g=fixture();g.state.shifts=[{id:'old',status:'closed',closedAt:1,countedCash:Infinity}];g.state.employees=[{id:'employee',name:'Иванов Иван',role:'employee'}];g.fields['sf-employee']={value:'employee'};
 assert.equal(await g.c.submitOpenShift(),false);assert.equal(g.state.shifts.length,1);assert.equal(g.writes.length,0);assert.match(g.messages.at(-1),/Некорректный остаток/);
 const h=fixture();h.cart();h.state.orderType='Доставка';h.state.deliveryRates=[{name:'Город',amount:5}];h.state.deliveryFee=5;h.state.deliveryTariffSelected=true;h.state.shifts[0].cashMovements=[{id:'broken',type:'deposit',amount:Infinity}];const hWrites=h.writes.length;
 await h.c.finalizePayment([{method:'cash',amount:15}]);assert.equal(h.state.orders.length,0);assert.equal(h.writes.length,hWrites);assert.match(h.messages.at(-1),/Некорректные данные кассовой смены/);
});

test('inventory fix failure leaves product and draft unchanged',async()=>{
 const f=fixture();f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3}]};const before=JSON.stringify({products:f.state.products,draft:f.state.inventoryDraft}),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.fixInventoryItem('flour'),false);assert.equal(JSON.stringify({products:f.state.products,draft:f.state.inventoryDraft}),before);assert.match(f.messages.at(-1),/не зафиксирован/);
});

test('inventory fix persists product and draft together',async()=>{
 const f=fixture();let availability=0;f.c.publishAvailability=()=>{availability++;return Promise.resolve(true)};f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3}]};
 assert.equal(await f.c.fixInventoryItem('flour'),true);assert.equal(f.c.getProduct('flour').stock,3);assert.equal(f.state.inventoryDraft.items[0].difference,-7);assert.ok(f.state.inventoryDraft.items[0].fixedAt);
 assert.equal(JSON.parse(f.data.get('prilavok_products')).find(x=>x.id==='flour').stock,3);assert.equal(JSON.parse(f.data.get('prilavok_inventoryDraft')).items[0].difference,-7);assert.equal(availability,1);
});

test('interrupted inventory fix recovers stock and fixed draft together',async()=>{
 const f=fixture();f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3}]};f.data.set('prilavok_products',JSON.stringify(plain(f.state.products)));f.data.set('prilavok_inventoryDraft',JSON.stringify(plain(f.state.inventoryDraft)));const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_inventoryDraft'&&!failed){failed=true;throw Error('injected draft failure')}originalSet(key,value)};
 assert.equal(await f.c.fixInventoryItem('flour'),false);assert.equal(f.c.getProduct('flour').stock,10);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.c.getProduct('flour').stock,3);assert.equal(restarted.state.inventoryDraft.items[0].difference,-7);assert.ok(restarted.state.inventoryDraft.items[0].fixedAt);
});

test('inventory completion failure keeps history, config and draft unchanged',async()=>{
 const f=fixture();f.c.getProduct('flour').stock=3;f.state.inventoryHistory=[];f.state.inventoryConfig={enabled:true,frequency:'monthly',productIds:['flour'],lastCompletedAt:null};f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3,difference:-7,fixedAt:1}]};const before=JSON.stringify({history:f.state.inventoryHistory,config:f.state.inventoryConfig,draft:f.state.inventoryDraft,tab:f.state.tab}),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.confirmCompleteInventory(),false);assert.equal(JSON.stringify({history:f.state.inventoryHistory,config:f.state.inventoryConfig,draft:f.state.inventoryDraft,tab:f.state.tab}),before);assert.match(f.messages.at(-1),/не завершена/);
});

test('inventory completion commits stock, history, config and draft together',async()=>{
 const f=fixture();let availability=0;f.c.publishAvailability=()=>{availability++;return Promise.resolve(true)};f.c.getProduct('flour').stock=3;f.state.inventoryHistory=[];f.state.inventoryConfig={enabled:true,frequency:'monthly',productIds:['flour'],lastCompletedAt:null};f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3,difference:-7,fixedAt:1}]};
 assert.equal(await f.c.confirmCompleteInventory(),true);assert.equal(f.state.inventoryDraft,null);assert.equal(f.state.inventoryHistory.length,1);assert.ok(f.state.inventoryConfig.lastCompletedAt);assert.equal(f.state.tab,'pos');
 assert.equal(JSON.parse(f.data.get('prilavok_inventoryHistory')).length,1);assert.equal(JSON.parse(f.data.get('prilavok_inventoryDraft')),null);assert.equal(JSON.parse(f.data.get('prilavok_products')).find(x=>x.id==='flour').stock,3);assert.equal(availability,1);
});

test('interrupted inventory completion recovers every related key',async()=>{
 const f=fixture();f.c.getProduct('flour').stock=3;f.state.inventoryHistory=[];f.state.inventoryConfig={enabled:true,frequency:'monthly',productIds:['flour'],lastCompletedAt:null};f.state.inventoryDraft={id:'inventory',type:'scheduled',items:[{productId:'flour',name:'Мука',unit:'kg',expected:10,actual:3,difference:-7,fixedAt:1}]};
 for(const [key,value] of [['prilavok_products',f.state.products],['prilavok_inventoryHistory',[]],['prilavok_inventoryConfig',f.state.inventoryConfig],['prilavok_inventoryDraft',f.state.inventoryDraft]])f.data.set(key,JSON.stringify(plain(value)));
 const originalSet=f.c.localStorage.setItem;let failed=false;f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_inventoryHistory'&&!failed){failed=true;throw Error('injected history failure')}originalSet(key,value)};
 assert.equal(await f.c.confirmCompleteInventory(),false);assert.notEqual(f.state.inventoryDraft,null);assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal')));
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.c.getProduct('flour').stock,3);assert.equal(restarted.state.inventoryHistory.length,1);assert.ok(restarted.state.inventoryConfig.lastCompletedAt);assert.equal(restarted.state.inventoryDraft,null);
});

test('loyalty job is durable, and overlapping programs cannot reuse one item',async()=>{
 const f=fixture();f.cart();f.state.customer={id:'customer',name:'Клиент',phone:'+375290000000'};
 f.state.loyaltyPrograms=['a','b'].map(id=>({id,name:'Программа '+id,loyalty_reward_products:[{product_id:'pizza'}]}));f.state.loyaltyRedemptions={a:1,b:1};
 assert.equal(f.c.loyaltyRewardDiscount(),10);assert.equal(f.c.cartTotal(),0);
 await f.c.finalizePayment([{method:'cash',amount:0}]);assert.equal(f.state.orders.length,0);assert.match(f.messages.at(-1),/Недостаточно/);
 f.state.loyaltyRedemptions={a:1};
 const persisted=[];const originalWrite=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{originalWrite(key,value);if(key==='prilavok_orders')persisted.push(JSON.parse(value));};
 let release;f.c.loyaltyApi=()=>{
   assert.equal(persisted.find(rows=>rows.length===1)[0].loyaltySync.status,'pending');
   assert.equal(JSON.parse(f.data.get('prilavok_orders'))[0].loyaltySync.status,'sending');
   return new Promise(resolve=>{release=resolve});
 };
 await f.c.finalizePayment([{method:'cash',amount:0}]);
 const stored=persisted.find(rows=>rows.length===1)[0];assert.equal(stored.loyaltySync.status,'pending');
 assert.equal(typeof release,'function');
 assert.deepEqual(stored.loyaltyRewardAllocations,{a:[{productId:'pizza',quantity:1}]});
 assert.equal(stored.loyaltyDiscount,10);assert.equal(stored.loyaltyProgramsApplied[0].name,'Программа a');assert.equal(stored.loyaltyProgramsApplied[0].discount,10);
 release({events:[]});
});

test('loyalty API aborts a stalled request and payment can continue without a gift',async()=>{
 const f=fixture();let expire,modal='',paid=false,cleared=false;
 f.c.setTimeout=fn=>{expire=fn;return 17};f.c.clearTimeout=id=>{if(id===17)cleared=true};
 f.c.fetch=(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error)},{once:true}));
 f.c.showModal=html=>{modal=html};f.state.customer={id:'customer',name:'Клиент',phone:'+375290000000'};f.state.loyaltyRedemptions={program:1};
 const payment=f.c.beginPaymentWithLoyaltyGuard(()=>{paid=true});assert.equal(typeof expire,'function');expire();await payment;
 assert.equal(paid,false);assert.equal(cleared,true);assert.match(modal,/Продолжить без подарка/);assert.match(modal,/без интернета/);
});

test('split payment validates a selected loyalty gift before creating parts',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer'};f.state.loyaltyPrograms=[{id:'reward',loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};let calls=0,renders=0;
 f.c.loyaltyApi=async()=>{calls++;return {programs:[{id:'reward',rewards:1,loyalty_reward_products:[{product_id:'pizza'}]}]}};f.c.renderPaymentScreen=()=>{};f.c.renderSplitPayment=()=>renders++;
 assert.equal(await f.c.openSplitPayment(),true);assert.equal(calls,1);assert.equal(renders,1);assert.equal(f.state._splitPayments.reduce((sum,p)=>sum+p.amount,0),10);assert.equal(f.state._splitPaymentTotalCents,1000);
});

test('unavailable loyalty gift blocks split creation before money acceptance',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer'};f.state.loyaltyPrograms=[{id:'reward',loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};f.c.loyaltyApi=async()=>({programs:[{id:'reward',rewards:0}]});f.c.renderPaymentScreen=()=>{throw Error('must not refresh')};f.c.renderSplitPayment=()=>{throw Error('must not render')};
 await f.c.openSplitPayment();assert.equal(f.state._splitPayments.length,0);assert.match(f.messages.at(-1),/Подарок уже недоступен/);
});

test('offline split continuation removes gift before calculating payment parts',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer'};f.state.loyaltyPrograms=[{id:'reward',loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};let modal='',renders=0,refreshes=0;f.c.loyaltyApi=async()=>{throw Error('offline')};f.c.showModal=html=>{modal=html};f.c.renderPaymentScreen=()=>refreshes++;f.c.renderSplitPayment=()=>renders++;
 assert.equal(await f.c.openSplitPayment(),false);assert.match(modal,/Продолжить без подарка/);assert.equal(f.state._splitPayments.length,0);
 assert.equal(f.c.continuePaymentWithoutLoyalty(),true);assert.deepEqual(plain(f.state.loyaltyRedemptions),{});assert.equal(refreshes,1);assert.equal(renders,1);assert.equal(f.state._splitPayments.reduce((sum,p)=>sum+p.amount,0),20);assert.equal(f.state._splitPaymentTotalCents,2000);
});

test('cancelling offline loyalty choice clears deferred payment action',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer'};f.state.loyaltyRedemptions={reward:1};f.c.loyaltyApi=async()=>{throw Error('offline')};f.c.showModal=()=>{};
 await f.c.openSplitPayment();assert.equal(typeof f.c.__offlinePaymentAction,'function');f.c.cancelOfflinePayment();assert.equal(f.c.__offlinePaymentAction,null);assert.equal(f.state._splitPayments.length,0);assert.equal(f.state.loyaltyRedemptions.reward,1);
});

test('duplicate split taps share one in-flight loyalty validation',async()=>{
 const f=fixture();f.cart('pizza',2);f.state.customer={id:'customer'};f.state.loyaltyPrograms=[{id:'reward',loyalty_reward_products:[{product_id:'pizza'}]}];f.state.loyaltyRedemptions={reward:1};let calls=0,release,renders=0;const gate=new Promise(resolve=>{release=resolve});f.c.loyaltyApi=async()=>{calls++;await gate;return {programs:[{id:'reward',rewards:1,loyalty_reward_products:[{product_id:'pizza'}]}]}};f.c.renderPaymentScreen=()=>{};f.c.renderSplitPayment=()=>renders++;
 const first=f.c.openSplitPayment(),second=f.c.openSplitPayment();assert.equal(await second,false);assert.equal(calls,1);release();assert.equal(await first,true);assert.equal(renders,1);
});

test('returned loyalty sale is always posted before its reversal',async()=>{
 const f=fixture(),calls=[];const order={id:'paid',customer:{id:'customer'},items:[{productId:'pizza',qty:1}],loyaltySync:{status:'pending'},loyaltyReversal:{status:'pending'},returnedAt:Date.now()};f.state.orders=[order];
 f.c.loyaltyApi=async path=>{calls.push(path);return path.endsWith('/sales')?{events:[]}:{};};
 await f.c.settleReturnedOrderLoyalty(order);
 assert.deepEqual(calls,['/api/loyalty/sales','/api/loyalty/reversal']);assert.equal(order.loyaltySync.status,'synced');assert.equal(order.loyaltyReversal.status,'synced');
});

test('return during an in-flight loyalty sale waits and then reverses it',async()=>{
 const f=fixture(),calls=[];let releaseSale;const gate=new Promise(resolve=>{releaseSale=resolve});
 const order={id:'paid',customer:{id:'customer'},items:[{productId:'pizza',qty:1}],loyaltySync:{status:'pending'}};f.state.orders=[order];
 f.c.loyaltyApi=async path=>{calls.push(path);if(path.endsWith('/sales'))await gate;return path.endsWith('/sales')?{events:[]}:{};};
 const publishing=f.c.publishPaidOrderLoyalty(order);order.returnedAt=Date.now();order.loyaltyReversal={status:'pending'};releaseSale();await publishing;
 assert.deepEqual(calls,['/api/loyalty/sales','/api/loyalty/reversal']);assert.equal(order.loyaltyReversal.status,'synced');
});

test('WEB ready action has no retired production gate',()=>{
 const source=inline;
 assert.doesNotMatch(source,/currentProductionOrderId/);
 assert.doesNotMatch(source,/productionOrderById/);
 assert.doesNotMatch(source,/Сначала завершите приготовление на всех участвующих станциях/);
});
test('web order context is cleared after payment and after removing the last cart item',async()=>{
 const paid=fixture();paid.state.orderComment='Комментарий с WEB';paid.state.currentOrderSource='web';paid.state.currentWebOrderId='web-1';paid.state.currentWebOrderStatus='accepted';
 await paid.sale();assert.equal(paid.state.orderComment,'');assert.equal(paid.state.currentOrderSource,'');assert.equal(paid.state.currentWebOrderId,'');assert.equal(paid.state.currentWebOrderStatus,'');
 const removed=fixture();removed.cart();removed.state.orderComment='Не оставлять';removed.state.currentOrderSource='web';removed.state.currentWebOrderId='web-2';removed.state.currentWebOrderStatus='accepted';
 removed.c.removeFromCart('pizza');assert.equal(removed.state.cart.length,0);assert.equal(removed.state.orderComment,'');assert.equal(removed.state.currentOrderSource,'');assert.equal(removed.state.currentWebOrderId,'');assert.equal(removed.state.currentWebOrderStatus,'');
 const saved=JSON.parse(removed.data.get('prilavok_currentOrderSession'));assert.equal(saved.orderComment,'');assert.equal(saved.webOrderId,'');
});

test('stock arithmetic is normalized to at most three decimal places',async()=>{
 const sale=fixture();sale.c.getProduct('pizza').components=[{productId:'flour',qty:0.1}];sale.c.getProduct('flour').stock=15.1;await sale.sale();
 assert.equal(sale.c.getProduct('flour').stock,15);assert.equal(sale.c.stockQtyText(15.0000000000002),'15');assert.equal(sale.c.stockQtyText(1.2345),'1.235');
 await sale.c.processFullReturn(sale.state.orders[0].id);assert.equal(sale.c.getProduct('flour').stock,15.1);
});

test('modifier stock is aggregated with base recipe and survives exact return',async()=>{
 const f=fixture();
 f.state.products.push({id:'bacon',name:'Бекон',type:'simple',stock:1,cost:10,price:10});
 const pizza=f.c.getProduct('pizza');pizza.modifierGroups=[{id:'filling',name:'Начинка',min:1,max:1,options:[{id:'bacon-opt',productId:'bacon',qty:.05,priceDelta:1.5}]}];
 f.state.cart=[{cartLineId:'line-1',productId:'pizza',name:'Пицца',price:11.5,qty:2,selectedModifiers:[{groupId:'filling',groupName:'Начинка',optionId:'bacon-opt',productId:'bacon',name:'Бекон',qty:.05,priceDelta:1.5}]}];
 const plan=f.c.checkedStockConsumption(f.state.cart);
 near(plan.items.find(i=>i.productId==='flour').qty,.4);near(plan.items.find(i=>i.productId==='water').qty,.2);near(plan.items.find(i=>i.productId==='bacon').qty,.1);
 await f.c.finalizePayment([{method:'cash',amount:23}]);near(f.c.getProduct('bacon').stock,.9);
 const order=f.state.orders[0];assert.equal(order.items[0].selectedModifiers[0].name,'Бекон');near(order.total,23);
 await f.c.processFullReturn(order.id);near(f.c.getProduct('bacon').stock,1);
});
test('modifier can be composite and expands recursively into simple stock',()=>{
 const f=fixture();
 f.state.products.push({id:'sauce',name:'Соус',type:'composite',components:[{productId:'water',qty:.2},{productId:'flour',qty:.1}]});
 const items=[{productId:'pizza',qty:1,selectedModifiers:[{productId:'sauce',qty:.5,priceDelta:0}]}];
 const plan=f.c.checkedStockConsumption(items);
 near(plan.items.find(i=>i.productId==='flour').qty,.25);near(plan.items.find(i=>i.productId==='water').qty,.2);
});
test('modifier shortage rejects cart without stock mutation',()=>{
 const f=fixture();f.state.products.push({id:'bacon',name:'Бекон',type:'simple',stock:.04,cost:10,price:10});
 const before=JSON.stringify(f.state.products);
 f.c.addConfiguredCartItem(f.c.getProduct('pizza'),[{groupId:'filling',productId:'bacon',name:'Бекон',qty:.05,priceDelta:1.5}]);
 assert.equal(f.state.cart.length,0);assert.equal(JSON.stringify(f.state.products),before);assert.match(f.messages.at(-1),/Недостаточно остатка: Бекон/);
});
test('same modifier selection merges, different selection stays separate and legacy cart remains compatible',()=>{
 const f=fixture();f.state.products.push({id:'bacon',name:'Бекон',type:'simple',stock:10},{id:'ham',name:'Ветчина',type:'simple',stock:10});
 const p=f.c.getProduct('pizza'),b=[{groupId:'f',productId:'bacon',name:'Бекон',qty:.05,priceDelta:1}],h=[{groupId:'f',productId:'ham',name:'Ветчина',qty:.05,priceDelta:0}];
 f.c.addConfiguredCartItem(p,b);f.c.addConfiguredCartItem(p,b);f.c.addConfiguredCartItem(p,h);
 assert.equal(f.state.cart.length,2);assert.equal(f.state.cart[0].qty,2);assert.equal(f.state.cart[0].price,11);assert.equal(f.state.cart[1].price,10);
 f.state.cart=[{productId:'pizza',name:'Пицца',price:10,qty:1}];assert.doesNotThrow(()=>f.c.checkedStockConsumption(f.state.cart));assert.equal(f.c.cartItemKey(f.state.cart[0]),'pizza');
});
test('shared ingredients across different cart products reject overselling without mutation',()=>{
 const f=fixture();f.c.getProduct('flour').stock=0.3;f.state.products.push({id:'second',name:'Вторая пицца',type:'composite',price:10,components:[{productId:'flour',qty:0.2}]});
 f.c.addToCart('pizza');f.c.addToCart('second');assert.equal(f.state.cart.length,1);assert.match(f.messages.at(-1),/Недостаточно остатка/);
 f.state.cart.push({productId:'second',name:'Вторая',qty:1,price:10});
 const before=JSON.stringify(f.state);f.c.finalizePayment([{method:'cash',amount:20}]);assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.filter(k=>k==='prilavok_orders').length,0);
});
test('same ingredient sold directly and in recipe counts once in aggregate',()=>{
 const f=fixture();f.cart();f.state.cart.push({productId:'flour',qty:2,price:2});
 const plan=f.c.checkedStockConsumption(f.state.cart);near(plan.items.find(i=>i.productId==='flour').qty,2.2);
});
test('cart quantity increase checks other products, decrease remains possible',()=>{
 const f=fixture();f.c.getProduct('flour').stock=0.5;f.cart();f.state.cart.push({productId:'flour',qty:0.2,price:2});
 f.c.changeQty('pizza',1);assert.equal(f.state.cart[0].qty,1);f.c.changeQty('pizza',-1);assert.equal(f.state.cart.length,1);
});
test('fractional consumption permits exact stock, never consumes a material shortage',async()=>{
 const f=fixture();f.c.getProduct('pizza').components=[{productId:'flour',qty:0.1}];f.c.getProduct('flour').stock=0.3;
 assert.equal(f.c.availableStock(f.c.getProduct('pizza')),3);f.cart('pizza',3);await f.c.finalizePayment([{method:'cash',amount:30}]);near(f.c.getProduct('flour').stock,0);
 const missing=fixture();missing.c.getProduct('flour').stock=0.199;assert.throws(()=>missing.c.checkedStockConsumption([{productId:'pizza',qty:1}]),/Недостаточно/);
 missing.c.getProduct('flour').stock=0;assert.throws(()=>missing.c.checkedStockConsumption([{productId:'flour',qty:1e-20}]),/Недостаточно/);
});
test('return uses sold recipe after edit and ignores current tracking flag',async()=>{
 const f=fixture();let availability=0;f.c.publishAvailability=()=>{availability++;return Promise.resolve(true)};const order=await f.sale();availability=0;f.c.getProduct('dough').components[0].qty=0.8;f.c.getProduct('flour').noStockTracking=true;
 await f.c.processFullReturn(order.id);near(f.c.getProduct('flour').stock,10);near(f.c.getProduct('water').stock,10);assert.ok(f.state.orders[0].returnedAt);
 assert.equal(availability,1);const first=JSON.stringify(f.state);await f.c.processFullReturn(order.id);assert.equal(JSON.stringify(f.state),first,'second return cannot add stock or cash twice');assert.equal(availability,1);
});
test('return journal recovers stock, receipt and cash movement together',async()=>{
 const f=fixture(),order=await f.sale();const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_shifts'&&!failed){failed=true;throw Error('injected return failure')}originalSet(key,value)};
 await f.c.processFullReturn(order.id);assert.equal(f.state.orders[0].returnedAt,undefined);assert.match(f.messages.at(-1),/Не удалось выполнить возврат/);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.ok(restarted.state.orders[0].returnedAt);near(restarted.c.getProduct('flour').stock,10);near(restarted.c.getProduct('water').stock,10);
 assert.equal(restarted.state.shifts[0].cashMovements.filter(x=>x.subtype==='refund').length,1);
});
test('cash, card and split returns keep exact drawer balance and shift report',async()=>{
 for(const [payments,before,refundCash] of [[[{method:'cash',amount:10}],110,10],[[{method:'card',amount:10}],100,0],[[{method:'cash',amount:4},{method:'card',amount:6}],104,4]]){
  const f=fixture(),order=await f.sale(payments);assert.equal(f.c.cashDrawerBalance(f.state.shifts[0]),before);
  await f.c.processFullReturn(order.id);
  const totals=f.c.shiftTotals('shift');assert.equal(totals.cash,0);assert.equal(totals.netMovements,refundCash?-refundCash:0);assert.equal(totals.refundCashMovements,refundCash);
  assert.equal(f.c.cashDrawerBalance(f.state.shifts[0],totals),100);assert.equal(f.c.buildShiftReportPayload(f.state.shifts[0]).expectedCash,100);
 }
});
test('deleted sold composite does not affect return of recorded ingredients',async()=>{
 const f=fixture(),order=await f.sale();f.state.products=f.state.products.filter(p=>p.id!=='pizza'&&p.id!=='dough');f.c.restoreOrderStock(order);near(f.c.getProduct('flour').stock,10);
});
test('untracked ingredients are not deducted or restored, even if flag later changes',async()=>{
 const f=fixture();f.c.getProduct('flour').noStockTracking=true;const order=await f.sale();assert.equal(order.stockConsumption.items.length,1);f.c.getProduct('flour').noStockTracking=false;f.c.restoreOrderStock(order);near(f.c.getProduct('flour').stock,10);
 const all=fixture();all.c.getProduct('flour').noStockTracking=true;all.c.getProduct('water').noStockTracking=true;assert.equal(all.c.availableStock(all.c.getProduct('pizza')),Infinity);const o=await all.sale();assert.deepEqual(plain(o.stockConsumption.items),[]);all.c.restoreOrderStock(o);
});
test('legacy receipt has no fabricated snapshot and retains legacy one-level return',()=>{
 const f=fixture();const order={id:'old',items:[{productId:'pizza',qty:1}]};f.c.restoreOrderStock(order);near(f.c.getProduct('flour').stock,10);assert.equal('stockConsumption' in order,false);
 f.c.getProduct('pizza').components=[{productId:'flour',qty:0.2}];f.c.restoreOrderStock(order);near(f.c.getProduct('flour').stock,10.2);
});
test('invalid snapshot or missing target cannot partially change stock, cash or receipt',async()=>{
 for(const snapshot of [null,{version:2,items:[]},{version:1,items:[{productId:'flour',qty:0.2},{productId:'missing',qty:0.1}]},{version:1,items:[{productId:'flour',qty:-1}]},{version:1,items:[{productId:'flour',qty:1},{productId:'flour',qty:1}]}]){
  const f=fixture(),order=await f.sale();order.stockConsumption=snapshot;const before=JSON.stringify(f.state);await f.c.processFullReturn(order.id);assert.equal(JSON.stringify(f.state),before);assert.match(f.messages.at(-1),/Не удалось выполнить возврат/);
 }
});
test('invalid return totals or cash parts cannot mutate stock, receipt or shift',async()=>{
 for(const corrupt of [
  order=>{order.total=Infinity},
  order=>{order.payments=[{method:'cash',amount:NaN}]},
  order=>{order.payments=[{method:'cash',amount:11},{method:'card',amount:-1}]}
 ]){
  const f=fixture(),order=await f.sale();corrupt(order);const before=JSON.stringify(f.state),writeCount=f.writes.length;
  await f.c.processFullReturn(order.id);
  assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,writeCount);assert.match(f.messages.at(-1),/Некорректн/);
 }
});
test('cycles, absent ingredients, empty recipe and invalid quantity fail safely',()=>{
 for(const components of [[{productId:'pizza',qty:1}],[{productId:'absent',qty:1}],[],[{productId:'flour',qty:0}],[{productId:'flour',qty:-1}],[{productId:'flour',qty:Infinity}]]){
  const f=fixture();f.c.getProduct('pizza').components=components;
  assert.equal(f.c.availableStock(f.c.getProduct('pizza')),0);assert.equal(f.c.compositeCost(f.c.getProduct('pizza')),0);
  assert.throws(()=>f.c.productIngredients(f.c.getProduct('pizza')));const before=JSON.stringify(f.state.products);f.sale();assert.equal(f.state.orders.length,0);assert.equal(JSON.stringify(f.state.products),before);
 }
});
test('cannot add indirect cycle into editor draft',()=>{
 const f=fixture();f.c._pmEditingId='dough';f.c._pmComponents=plain(f.c.getProduct('dough').components);const before=JSON.stringify(f.c._pmComponents);
 f.c.addComponent('pizza',1);assert.equal(JSON.stringify(f.c._pmComponents),before);assert.match(f.messages.at(-1),/Циклический состав/);
});
test('save validation rejects cycle before product mutation or any write',async()=>{
 const f=fixture();Object.assign(f.fields,{'pf-name':{value:'Тесто'},'pf-category':{value:'Сырьё'},'pf-price':{value:'5'}});
 f.c._pmType='composite';f.c._pmComponents=[{productId:'pizza',qty:1}];const before=JSON.stringify(f.state.products);
 await f.c.saveProduct('dough');assert.equal(JSON.stringify(f.state.products),before);assert.equal(f.writes.length,0);assert.match(f.messages.at(-1),/Циклический состав/);
});
test('cannot delete or change type of a tracked product needed by an unreturned new receipt',async()=>{
 const f=fixture();await f.sale();Object.assign(f.fields,{'pf-name':{value:'Мука'},'pf-category':{value:'Сырьё'},'pf-price':{value:'2'}});
 f.c._pmType='composite';f.c._pmComponents=[{productId:'water',qty:1}];const before=JSON.stringify(f.state.products);await f.c.saveProduct('flour');assert.equal(JSON.stringify(f.state.products),before);assert.match(f.messages.at(-1),/Нельзя изменить тип/);
 f.state.products=f.state.products.filter(p=>p.type==='simple');
 f.fields['delete-password']={value:html.match(/function confirmDelete[\s\S]*?pass!=='([^']+)'/)[1]};
 f.c.confirmDelete('product','flour');assert.ok(f.c.getProduct('flour'));assert.match(f.messages.at(-1),/Товар нужен для возврата/);
 assert.equal(f.c.hasUnreturnedStockConsumption('flour'),true);f.state.orders[0].returnedAt=1;assert.equal(f.c.hasUnreturnedStockConsumption('flour'),false);
});
test('insufficient stock blocks payment screen before card-terminal instruction',()=>{
 const f=fixture();f.cart();f.c.getProduct('flour').stock=0;let shown=false;f.c.renderPaymentScreen=()=>{shown=true;};f.c.openCardPartConfirmation=()=>{shown=true;};f.c.openPaymentModal();f.c.confirmPaymentScreen('card');assert.equal(shown,false);
});
test('print bridge still receives original receipt fields plus ignored stock snapshot',async()=>{
 const f=fixture(),order=await f.sale();let sent;f.c.sendOrderToPrint=o=>{sent=o;};f.c.printReceipt(order.id);
 assert.equal(sent.total,10);assert.equal(sent.items[0].productId,'pizza');assert.equal(sent.stockConsumption.version,1);
 assert.match(f.c.receiptBodyHtml(order),/Пицца/);
});

test('existing backup export/import retains new snapshot and old receipt without adding fields',async()=>{
 const f=fixture(),order=await f.sale();const legacy={id:'old',items:[],total:0};f.state.orders.push(legacy);let backup;
 f.c.Blob=class{constructor(parts){this.parts=parts;}};
 f.c.URL={createObjectURL:b=>{backup=JSON.parse(b.parts.join(''));return 'blob:test';},revokeObjectURL:()=>{}};
 f.c.document.createElement=()=>({click(){}});await f.c.exportBackup();
 assert.deepEqual(backup.orders[0].stockConsumption,plain(order.stockConsumption));assert.equal('stockConsumption' in backup.orders[1],false);
 const restored=fixture();restored.c.FileReader=class{readAsText(file){this.result=file.text;this.onload();}};
 await restored.c.applyBackupData(backup);assert.deepEqual(plain(restored.state.orders),backup.orders);
 restored.c.restoreOrderStock(restored.state.orders[0]);near(restored.c.getProduct('flour').stock,10);
});
test('backup rejects incomplete core data before changing local state',async()=>{
 const f=fixture();await f.sale();const before=JSON.stringify(f.state);
 await assert.rejects(f.c.applyBackupData({version:11,products:[]}),/employees/);
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.messages.includes('Данные восстановлены'),false);
});
test('backup rejects a malformed present optional collection before any write',async()=>{
 const f=fixture(),before=JSON.stringify(f.state),writesBefore=f.writes.length;
 const backup={version:11,products:plain(f.state.products),employees:[],shifts:plain(f.state.shifts),orders:[],parked:{invalid:true}};
 await assert.rejects(f.c.applyBackupData(backup),/parked/);
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,writesBefore);assert.equal(f.messages.includes('Данные восстановлены'),false);
});
test('backup import is journaled and recovers all promised data after a write failure',async()=>{
 const f=fixture();await f.sale();const backup={version:11,products:plain(f.state.products),employees:[],shifts:plain(f.state.shifts),orders:[],parked:[],receivings:[],suppliers:[],purchaseOrders:[],discounts:[],layout:{categoryOrder:[],categoryColors:{},categorySymbols:{},categoryOnline:{},tiles:[]}};
 const originalSet=f.c.localStorage.setItem;let failed=false;f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_orders'&&!failed){failed=true;throw Error('injected backup failure')}originalSet(key,value)};
 await assert.rejects(f.c.applyBackupData(backup));assert.equal(f.state.orders.length,1);assert.ok(JSON.parse(f.data.get('prilavok_criticalStorageJournal')));
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state.orders.length,0);assert.equal(JSON.parse(restarted.data.get('prilavok_criticalStorageJournal')),null);
});
test('backup version 13 includes inventory and unfinished current order',async()=>{
 const f=fixture();f.cart();f.state.inventoryHistory=[{id:'inventory'}];f.state.inventoryDraft={id:'draft'};let backup;
 f.c.Blob=class{constructor(parts){this.parts=parts}};f.c.URL={createObjectURL:value=>{backup=JSON.parse(value.parts[0]);return 'blob:test'},revokeObjectURL:()=>{}};f.c.document.createElement=()=>({click(){}});await f.c.exportBackup();
 assert.equal(backup.version,13);assert.equal(backup.inventoryHistory[0].id,'inventory');assert.equal(backup.inventoryDraft.id,'draft');assert.equal(backup.currentOrderSession.items[0].productId,'pizza');
});
test('backup version 13 round-trips legacy printer and notification settings',async()=>{
 const f=fixture(),settings={printers:[{id:'printer-1',name:'Кухня',ip:'192.168.1.10',printOrders:true}],posNotifications:{soundEnabled:false,sound:'bell'}};let backup,restoredSettings;
 f.c.__printerSettingsSnapshot=()=>plain(settings);f.c.Blob=class{constructor(parts){this.parts=parts}};f.c.URL={createObjectURL:value=>{backup=JSON.parse(value.parts[0]);return 'blob:test'},revokeObjectURL:()=>{}};f.c.document.createElement=()=>({click(){}});await f.c.exportBackup();assert.deepEqual(backup.printerSettings,settings);
 const restored=fixture();restored.c.__restorePrinterSettings=value=>{restoredSettings=plain(value);return true};await restored.c.applyBackupData(backup);assert.deepEqual(restoredSettings,settings);
});
test('backup version 13 round-trips network Telegram and local runtime settings',async()=>{
 const f=fixture();Object.assign(f.state,{network:{backendUrl:'https://backend.test',deviceKey:'secret-device-key',deviceName:'Main iPad'},telegram:{enabled:true,botToken:'secret-bot-token',chatId:'-1001',ownerChatId:'745965268'},printer:{enabled:true,ip:'192.168.1.20',port:9100},theme:'dark',demandOverload:true,operationalOutbox:[{id:'outbox'}],operationalRevision:42,webEvents:[{id:'event'}]});f.data.set('prilavok_receivingDraft',JSON.stringify({id:'receiving-draft'}));f.data.set('prilavok_webOrderAcceptances',JSON.stringify({web1:{stage:'local'}}));let backup;
 f.c.Blob=class{constructor(parts){this.parts=parts}};f.c.URL={createObjectURL:value=>{backup=JSON.parse(value.parts[0]);return 'blob:test'},revokeObjectURL:()=>{}};f.c.document.createElement=()=>({click(){}});await f.c.exportBackup();
 assert.equal(backup.version,13);assert.equal(backup.network.deviceKey,'secret-device-key');assert.equal(backup.telegram.botToken,'secret-bot-token');
 assert.equal(backup.receivingDraft.id,'receiving-draft');assert.equal(backup.webOrderAcceptances.web1.stage,'local');
 const restored=fixture();await restored.c.applyBackupData(backup);assert.deepEqual(plain(restored.state.network),backup.network);assert.deepEqual(plain(restored.state.telegram),backup.telegram);assert.equal(restored.state.theme,'dark');assert.equal(restored.state.operationalRevision,42);assert.equal(restored.state.webEvents[0].id,'event');assert.equal(JSON.parse(restored.data.get('prilavok_receivingDraft')).id,'receiving-draft');assert.equal(JSON.parse(restored.data.get('prilavok_webOrderAcceptances')).web1.stage,'local');
});
test('backup version 13 rejects a missing full-data section before any write',async()=>{
 const f=fixture(),backup=await f.c.completeBackupData(),writesBefore=f.writes.length;delete backup.webOrderAcceptances;
 await assert.rejects(f.c.applyBackupData(backup),/webOrderAcceptances/);assert.equal(f.writes.length,writesBefore);
});
test('native backup bridge packages product images and uses system export and import',()=>{
 assert.match(androidRouter,/"backup" -> backup\.handle/);assert.match(androidBackup,/document\.put\("productImages", productImages\)/);assert.match(androidActivity,/ActivityResultContracts\.CreateDocument/);assert.match(androidActivity,/ActivityResultContracts\.OpenDocument/);assert.match(androidBackup,/images\.prune/);assert.match(backupScript,/handleNativeBackupImport/);
});
test('printer backup adapter preserves exact legacy keys and rolls back a partial restore',()=>{
 const data=new Map([['printers','[{"id":"old"}]'],['posNotificationSettings','{"sound":"soft"}']]),errors=[],messages=[];let failNotify=false;
 const c={console:{error:()=>{}},state:{},document:{documentElement:{},getElementById:()=>null},MutationObserver:class{observe(){}},queueMicrotask:()=>{},localStorage:{getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>{if(key==='posNotificationSettings'&&failNotify){failNotify=false;throw Error('quota')}data.set(key,String(value))},removeItem:key=>data.delete(key)},markStorageBroken:error=>errors.push(error),flash:message=>messages.push(message)};c.window=c;vm.createContext(c);vm.runInContext(printerScript,c);
 assert.equal(c.__printerSettingsSnapshot().printers[0].id,'old');assert.deepEqual([...data.keys()],['printers','posNotificationSettings']);
 failNotify=true;assert.throws(()=>c.__restorePrinterSettings({printers:[{id:'new'}],posNotifications:{soundEnabled:false,sound:'bell'}}),/Не удалось восстановить/);assert.equal(data.get('printers'),'[{"id":"old"}]');assert.equal(data.get('posNotificationSettings'),'{"sound":"soft"}');assert.equal(errors.length,1);assert.match(messages.at(-1),/Не удалось восстановить/);
});
test('backup rejects invalid printer settings and old backups preserve current printer setup',async()=>{
 const f=fixture(),backup={version:12,products:plain(f.state.products),employees:[],shifts:plain(f.state.shifts),orders:[],printerSettings:{printers:{},posNotifications:{}}},before=JSON.stringify(f.state);f.data.set('prilavok_receivingDraft',JSON.stringify({id:'keep-draft'}));f.data.set('prilavok_webOrderAcceptances',JSON.stringify({keep:{stage:'local'}}));
 await assert.rejects(f.c.applyBackupData(backup),/printerSettings/);assert.equal(JSON.stringify(f.state),before);
 let restored=false;backup.version=11;delete backup.printerSettings;f.c.__restorePrinterSettings=()=>{restored=true;return true};await f.c.applyBackupData(backup);assert.equal(restored,false);assert.equal(JSON.parse(f.data.get('prilavok_receivingDraft')).id,'keep-draft');assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances')).keep.stage,'local');
});
test('valid nested recipe edit retains product ID and existing component shape',async()=>{
 const f=fixture();Object.assign(f.fields,{'pf-name':{value:'Пицца обновлённая'},'pf-category':{value:'Пицца'},'pf-price':{value:'10'}});
 f.c._pmType='composite';f.c._pmComponents=[{productId:'dough',qty:2},{productId:'flour',qty:0.1}];
 await f.c.saveProduct('pizza');assert.equal(f.c.getProduct('pizza').id,'pizza');assert.deepEqual(plain(f.c.getProduct('pizza').components),f.c._pmComponents);
 assert.ok(f.data.has('prilavok_products'));assert.equal(f.state.products.length,4);assert.match(f.messages.at(-1),/Товар сохранён/);
});


// v130.19 editor draft/save regression checks.
function editorFixture(){
 const f=fixture();Object.assign(f.fields,{'pf-name':{value:'Мука новая'},'pf-category':{value:'Сырьё'},'pf-price':{value:'3'},'pf-cost':{value:'2'},'pf-stock':{value:'10'},'pf-symbol':{value:''},'pf-no-stock':{checked:false},'pf-description':{value:''}});
 f.c._pmType='simple';f.c._pmComponents=[];f.c._pmOnline=false;f.c._pmOnlineMenu=false;f.c._pmRemoveImage=false;f.c._pmImageData=null;
 return f;
}
test('editor draft snapshot notices changes without mutating saved product',()=>{
 const f=editorFixture(),before=JSON.stringify(f.state.products);f.c._pmInitial=f.c.productEditorSnapshot();
 assert.equal(f.c.productEditorDirty(),false);f.fields['pf-name'].value='Черновик';assert.equal(f.c.productEditorDirty(),true);
 f.fields['pf-name'].value='Мука новая';assert.equal(f.c.productEditorDirty(),false);f.c._pmOnline=true;assert.equal(f.c.productEditorDirty(),true);
 assert.equal(JSON.stringify(f.state.products),before);assert.equal(f.writes.length,0);
});
test('photo failure saves the product locally and retains its local image for retry',async()=>{
 for(const id of ['flour','']){
  const f=editorFixture(),beforeCount=f.state.products.length;f.c._pmImageData='data:image/jpeg;base64,AA';f.c._pmLocalImageId='11111111-1111-1111-1111-111111111111';
  f.c.networkConfigFromState=()=>({backendUrl:'https://test.invalid',deviceKey:'test'});f.c.fetch=async()=>{throw Error('offline');};
  assert.equal(await f.c.saveProduct(id),true);assert.equal(f.state.products.length,beforeCount+(id?0:1));const saved=id?f.c.getProduct(id):f.state.products.at(-1);assert.equal(saved.name,'Мука новая');assert.equal(saved.localImageId,'11111111-1111-1111-1111-111111111111');assert.equal(saved.imageUploadPending,true);const web=f.c.buildMenuSyncPayload().products.find(x=>x.externalId===saved.id);assert.equal(web.localImageId,undefined);assert.equal(web.imageUploadPending,undefined);assert.ok(f.data.has('prilavok_products'));assert.match(f.messages.at(-1),/сохранён локально.*offline/);
 }
});
test('photo upload cannot overwrite a stock change occurring while save awaits network',async()=>{
 const f=editorFixture();f.c._pmImageData='data:image/jpeg;base64,AA';f.c._pmLocalImageId='11111111-1111-1111-1111-111111111111';f.c.networkConfigFromState=()=>({backendUrl:'https://test.invalid',deviceKey:'test'});
 f.c.fetch=async()=>{f.c.getProduct('flour').stock=9;return {ok:true,json:async()=>({url:'test-image'})};};
 assert.equal(await f.c.saveProduct('flour'),true);assert.equal(f.c.getProduct('flour').stock,9);assert.equal(f.c.getProduct('flour').name,'Мука новая');assert.equal(f.c.getProduct('flour').imageUrl,'test-image');assert.equal(f.c.getProduct('flour').imageUploadPending,undefined);
});
test('pending native photo retries from local sandbox on the next product save',async()=>{
 const f=editorFixture(),p=f.c.getProduct('flour');p.localImageId='11111111-1111-1111-1111-111111111111';p.imageUploadPending=true;f.c.readNativeProductImage=async id=>{assert.equal(id,p.localImageId);return 'data:image/jpeg;base64,AA'};f.c.networkConfigFromState=()=>({backendUrl:'https://test.invalid',deviceKey:'test'});f.c.fetch=async()=>({ok:true,json:async()=>({url:'uploaded-image'})});
 assert.equal(await f.c.saveProduct('flour'),true);assert.equal(f.c.getProduct('flour').imageUrl,'uploaded-image');assert.equal(f.c.getProduct('flour').imageUploadPending,undefined);
});
test('product storage failure prevents photo upload and leaves state unchanged',async()=>{
 const f=editorFixture(),before=JSON.stringify(f.state.products),originalSet=f.c.localStorage.setItem;let uploads=0;f.c._pmImageData='data:image/jpeg;base64,AA';f.c._pmLocalImageId='11111111-1111-1111-1111-111111111111';f.c.fetch=async()=>{uploads++;return {ok:true,json:async()=>({url:'uploaded-image'})}};f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_products')throw Error('storage full');originalSet(key,value)};
 assert.equal(await f.c.saveProduct('flour'),undefined);assert.equal(JSON.stringify(f.state.products),before);assert.equal(uploads,0);assert.match(f.messages.at(-1),/storage full/);
});
test('ordinary product save uses original local key and preserves extra fields',async()=>{
 const f=editorFixture();let availability=0;f.c.publishAvailability=()=>{availability++;return Promise.resolve(true)};f.c.getProduct('flour').futureField={keep:true};
 assert.equal(await f.c.saveProduct('flour'),true);assert.equal(f.c.getProduct('flour').id,'flour');assert.deepEqual(plain(f.c.getProduct('flour').futureField),{keep:true});
 assert.equal(JSON.parse(f.data.get('prilavok_products')).find(p=>p.id==='flour').name,'Мука новая');
 assert.equal(f.state.products.length,4);assert.equal(availability,1);
});
test('usage shows direct and nested recipe links and escapes product names',()=>{
 const f=editorFixture();f.c.getProduct('dough').name='<Тесто>';const result=f.c.renderProductUsage('flour');
 assert.match(result,/&lt;Тесто&gt;/);assert.match(result,/Прямой состав/);assert.match(result,/Через другие составные товары/);
 assert.match(result,/Пицца/);assert.doesNotMatch(result,/<Тесто>/);
});
test('dirty back navigation waits for explicit save/discard decision',()=>{
 const f=editorFixture();f.c._pmInitial=f.c.productEditorSnapshot();f.fields['pf-name'].value='Черновик';let dialog='',finished=false;
 f.c.showModal=html=>{dialog=html;};f.c.finishProductEditor=()=>{finished=true;};f.c.requestCloseProductEditor('pizza');
 assert.equal(finished,false);assert.match(dialog,/Сохранить и продолжить/);assert.match(dialog,/Не сохранять/);f.c._pmExitAction();assert.equal(finished,true);
});

test('unit conversions accept mass/volume pairs and reject cross dimension conversions',()=>{
 const f=fixture();near(f.c.convertProductQty(250,'g','kg'),0.25);near(f.c.convertProductQty(1.5,'l','ml'),1500);
 near(f.c.convertProductQty(7,'',''),7);assert.throws(()=>f.c.convertProductQty(1,'kg','l'));assert.throws(()=>f.c.convertProductQty(1,'piece','g'));
});
test('recipe input grams normalizes to original kg; sale and return preserve snapshot',async()=>{
 const f=fixture();f.c.getProduct('flour').stockUnit='kg';f.c._pmComponents=[{productId:'flour',qty:0.2,displayUnit:'g'}];f.c.renderTypeFields=()=>{};
 f.c.setComponentQty(0,'250');near(f.c._pmComponents[0].qty,0.25);near(f.c.componentDisplayQty(f.c._pmComponents[0]),250);
 f.c.getProduct('pizza').components=plain(f.c._pmComponents);const order=await f.sale();near(f.c.getProduct('flour').stock,9.75);near(order.stockConsumption.items[0].qty,0.25);
 f.c.getProduct('flour').stockDisplayUnit='g';f.c.restoreOrderStock(order);near(f.c.getProduct('flour').stock,10);
});
test('unit selector changes presentation without changing recipe consumption',()=>{
 const f=fixture();f.c.getProduct('water').stockUnit='l';f.c._pmComponents=[{productId:'water',qty:0.15}];f.c.renderTypeFields=()=>{};
 f.c.changeComponentDisplayUnit(0,'ml');near(f.c._pmComponents[0].qty,0.15);near(f.c.componentDisplayQty(f.c._pmComponents[0]),150);
 f.c.changeComponentDisplayUnit(0,'kg');assert.equal(f.c._pmComponents[0].displayUnit,'ml');
});
test('stock display conversion saves stock/cost/minimum in unchanged base units',async()=>{
 const f=editorFixture();Object.assign(f.c.getProduct('flour'),{stockUnit:'kg',stockDisplayUnit:'kg'});
 f.c._pmBaseUnit='kg';f.c._pmUnit='g';f.fields['pf-stock'].value='10000';f.fields['pf-cost'].value='0.002';f.fields['pf-min-stock']={value:'500'};
 assert.equal(await f.c.saveProduct('flour'),true);const p=f.c.getProduct('flour');near(p.stock,10);near(p.cost,2);near(p.minStock,0.5);assert.equal(p.stockUnit,'kg');assert.equal(p.stockDisplayUnit,'g');
});
test('first explicit unit assignment retains legacy stock/cost/recipe quantities',async()=>{
 const f=editorFixture(),recipe=JSON.stringify(f.c.getProduct('dough').components);f.c._pmBaseUnit='kg';f.c._pmUnit='kg';
 await f.c.saveProduct('flour');near(f.c.getProduct('flour').stock,10);near(f.c.getProduct('flour').cost,2);assert.equal(JSON.stringify(f.c.getProduct('dough').components),recipe);
});
test('legacy ordinary save does not add unit fields',async()=>{
 const f=editorFixture();await f.c.saveProduct('flour');assert.equal('stockUnit' in f.c.getProduct('flour'),false);assert.equal('stockDisplayUnit' in f.c.getProduct('flour'),false);
});
test('configuration persists locally and internal note never enters menu payload',async()=>{
 const f=editorFixture();f.fields['pf-sku']={value:' RAW-001 '};f.fields['pf-note']={value:' Секрет рецептуры '};f.fields['pf-min-stock']={value:'2'};
 await f.c.saveProduct('flour');const saved=JSON.parse(f.data.get('prilavok_products')).find(p=>p.id==='flour');assert.equal(saved.sku,'RAW-001');assert.equal(saved.internalNote,'Секрет рецептуры');near(saved.minStock,2);
 assert.doesNotMatch(JSON.stringify(f.c.buildMenuSyncPayload()),/Секрет рецептуры|internalNote/);
});
test('online order, online menu and public description persist and sync independently',async()=>{
 const f=editorFixture();f.c.currentShiftEmployeeIsAdmin=()=>true;f.c._pmOnline=false;f.c._pmOnlineMenu=true;f.fields['pf-description'].value='Тонкое тесто и томатный соус';
 await f.c.saveProduct('flour');const saved=f.c.getProduct('flour'),web=f.c.buildMenuSyncPayload().products.find(p=>p.externalId==='flour');
 assert.equal(saved.availableOnline,false);assert.equal(saved.availableInOnlineMenu,true);assert.equal(saved.description,'Тонкое тесто и томатный соус');
 assert.equal(web.availableOnline,false);assert.equal(web.visibleInOnlineMenu,true);assert.equal(web.description,'Тонкое тесто и томатный соус');
 assert.match(productEditorScript,/Онлайн заказ/);assert.match(productEditorScript,/Онлайн меню/);assert.match(productEditorScript,/id="pf-description"/);
});
test('negative minimum is rejected before local mutation',async()=>{
 const f=editorFixture();f.fields['pf-min-stock']={value:'-1'};const before=JSON.stringify(f.state.products);await f.c.saveProduct('flour');assert.equal(JSON.stringify(f.state.products),before);assert.equal(f.writes.length,0);
});
test('configured base unit cannot be replaced with another unit',async()=>{
 const f=editorFixture();f.c.getProduct('flour').stockUnit='kg';f.c._pmBaseUnit='g';f.c._pmUnit='g';const before=JSON.stringify(f.state.products);await f.c.saveProduct('flour');assert.equal(JSON.stringify(f.state.products),before);
});


test('card unit switch converts cost, stock and minimum while preserving base',()=>{
 const f=editorFixture();f.c._pmBaseUnit='kg';f.c._pmUnit='kg';f.fields['pf-min-stock']={value:'0.5'};f.c.renderTypeFields=()=>{};
 f.c.changeProductDisplayUnit('g');near(f.fields['pf-stock'].value,10000);near(f.fields['pf-cost'].value,0.002);near(f.fields['pf-min-stock'].value,500);assert.equal(f.c._pmBaseUnit,'kg');
 f.c.changeProductDisplayUnit('kg');near(f.fields['pf-stock'].value,10);near(f.fields['pf-cost'].value,2);
});
test('new configuration and recipe display unit survive loadAll restart',async()=>{
 const f=editorFixture();f.c._pmUnit='kg';f.c._pmBaseUnit='kg';f.fields['pf-sku']={value:'F1'};f.fields['pf-note']={value:'test'};f.fields['pf-min-stock']={value:'1'};
 await f.c.saveProduct('flour');f.c.getProduct('dough').components[0].displayUnit='g';await f.c.saveKey('products',f.state.products);
 const next=fixture();for(const [k,v] of f.data)next.data.set(k,v);await next.c.loadAll();assert.deepEqual(plain(next.c.getProduct('flour')),plain(f.c.getProduct('flour')));assert.deepEqual(plain(next.c.getProduct('dough').components),plain(f.c.getProduct('dough').components));near(next.c.componentDisplayQty(next.c.getProduct('dough').components[0]),200);
});

// Supplier order / TTN workflow uses synthetic local state only.
function supplierFixture(){
 const f=fixture();f.state.employees=[{id:'admin',name:'Администратор',role:'admin'}];f.state.shifts=[{id:'shift',status:'open',openingCash:100,employeeId:'admin'}];f.state.suppliers=[];f.state.purchaseOrders=[{id:'history',supplierId:'supplier',supplierName:'Старое имя',status:'received'}];f.state.receivings=[{id:'receipt',supplierId:'supplier',supplierName:'Старое имя'}];
 Object.assign(f.fields,{'sf-name':{value:'Поставщик'},'supplier-save-confirm':{disabled:false},'supplier-delete-confirm':{disabled:false}});f.c.document.querySelectorAll=selector=>selector==='.supplier-product-check:checked'?[{value:'flour'},{value:'water'}]:[];return f;
}
test('supplier product search toggles rows and empty state through hidden',()=>{
 const f=fixture(),rows=[{dataset:{search:'мука сырьё'},hidden:false},{dataset:{search:'эспрессо напитки'},hidden:false}],empty={hidden:true};
 f.c.document.querySelectorAll=selector=>selector==='#supplier-product-list .supplier-product-option'?rows:[];f.fields['supplier-product-search-empty']=empty;
 f.c.filterSupplierProducts('напитки');assert.equal(rows[0].hidden,true);assert.equal(rows[1].hidden,false);assert.equal(empty.hidden,true);
 f.c.filterSupplierProducts('десерт');assert.equal(rows[0].hidden,true);assert.equal(rows[1].hidden,true);assert.equal(empty.hidden,false);
 f.c.filterSupplierProducts('');assert.equal(rows[0].hidden,false);assert.equal(rows[1].hidden,false);assert.equal(empty.hidden,true);
});
test('supplier create and edit persist before publishing while retaining legacy fields',async()=>{
 const f=supplierFixture();let closed=0,rendered=0;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;
 assert.equal(await f.c.saveSupplier(),true);assert.equal(f.state.suppliers.length,1);assert.deepEqual(plain(f.state.suppliers[0].productIds),['flour','water']);assert.deepEqual(f.writes,['prilavok_suppliers']);assert.equal(closed,1);assert.equal(rendered,1);
 const id=f.state.suppliers[0].id;f.state.suppliers[0].legacyNote='keep';f.fields['sf-name'].value='Новое имя';f.c.document.querySelectorAll=()=>[{value:'flour'}];
 assert.equal(await f.c.saveSupplier(id),true);assert.equal(f.state.suppliers[0].legacyNote,'keep');assert.equal(JSON.parse(f.data.get('prilavok_suppliers'))[0].legacyNote,'keep');assert.equal(f.state.suppliers[0].name,'Новое имя');
});
test('supplier save failure keeps state and modal available for retry',async()=>{
 for(const mode of ['create','edit']){
  const f=supplierFixture();f.state.suppliers=[{id:'supplier',name:'Старое имя',productIds:['flour'],legacyNote:'keep'}];const before=JSON.stringify(f.state.suppliers);let closed=0,rendered=0;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;f.fields['sf-name'].value='Новое имя';f.c.localStorage.setItem=()=>{throw Error('quota')};
  assert.equal(await f.c.saveSupplier(mode==='edit'?'supplier':''),false);assert.equal(JSON.stringify(f.state.suppliers),before);assert.equal(closed,0);assert.equal(rendered,0);assert.equal(f.fields['supplier-save-confirm'].disabled,false);assert.match(f.messages.at(-1),/Не удалось сохранить поставщика/);
 }
});
test('repeated supplier save cannot create duplicate rows',async()=>{
 const f=supplierFixture(),first=f.c.saveSupplier(),second=f.c.saveSupplier();assert.equal(f.fields['supplier-save-confirm'].disabled,true);assert.equal(f.state.suppliers.length,0);assert.equal(await second,false);assert.equal(await first,true);assert.equal(f.state.suppliers.length,1);assert.deepEqual(f.writes,['prilavok_suppliers']);
});
test('supplier delete persists first and preserves historical order snapshots',async()=>{
 const f=supplierFixture();f.state.suppliers=[{id:'supplier',name:'Поставщик',productIds:['flour']}];const orders=JSON.stringify(f.state.purchaseOrders),receivings=JSON.stringify(f.state.receivings);
 assert.equal(await f.c.confirmDeleteSupplier('supplier'),true);assert.equal(f.state.suppliers.length,0);assert.equal(JSON.stringify(f.state.purchaseOrders),orders);assert.equal(JSON.stringify(f.state.receivings),receivings);assert.deepEqual(f.writes,['prilavok_suppliers']);
});
test('supplier delete failure and access recheck never remove the local row',async()=>{
 const f=supplierFixture();f.state.suppliers=[{id:'supplier',name:'Поставщик',productIds:[]}];const before=JSON.stringify(f.state.suppliers);f.c.localStorage.setItem=()=>{throw Error('quota')};assert.equal(await f.c.confirmDeleteSupplier('supplier'),false);assert.equal(JSON.stringify(f.state.suppliers),before);assert.equal(f.fields['supplier-delete-confirm'].disabled,false);assert.match(f.messages.at(-1),/Не удалось удалить поставщика/);
 const g=supplierFixture();g.state.suppliers=[{id:'supplier',name:'Поставщик',productIds:[]}];g.state.employees[0].role='employee';assert.equal(await g.c.confirmDeleteSupplier('supplier'),false);assert.equal(g.state.suppliers.length,1);assert.equal(g.writes.length,0);
});

test('supplier requests preserve packages independently from expected warehouse quantity',()=>{
 const f=fixture(),p=f.c.getProduct('flour');p.stockUnit='kg';
 const unknown=f.c.makePurchaseLine(p,4,'pack','');assert.equal(unknown.qty,0);assert.equal(unknown.expectedQty,null);assert.equal(f.c.requestedQuantityText(unknown),'4 упаковка');
 const known=f.c.makePurchaseLine(p,4,'pack',2.5);near(known.expectedQty,10);near(known.requestedQty,4);
 near(f.c.makePurchaseLine(p,20000,'g','').expectedQty,20);assert.throws(()=>f.c.makePurchaseLine(p,2,'l',''));assert.throws(()=>f.c.makePurchaseLine(p,2,'box',-1));
});
function purchaseOrderFixture(){
 const f=fixture();f.c.getProduct('flour').stockUnit='kg';f.state.suppliers=[{id:'supplier',name:'Поставщик',productIds:['flour']}];f.state.purchaseOrderSupplierId='supplier';f.state.purchaseOrderCart=[{productId:'flour',requestedQty:4,requestedUnit:'pack',packSize:2,contentUnit:'kg'}];f.c.render=()=>{};f.c.viewPurchaseOrder=()=>{};return f;
}
test('purchase order journal failure leaves products, orders and draft unchanged',async()=>{
 const f=purchaseOrderFixture(),before=JSON.stringify({products:f.state.products,orders:f.state.purchaseOrders,cart:f.state.purchaseOrderCart}),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.finalizePurchaseOrder(),false);assert.equal(JSON.stringify({products:f.state.products,orders:f.state.purchaseOrders,cart:f.state.purchaseOrderCart}),before);assert.match(f.messages.at(-1),/Заказ не сформирован/);
});
test('purchase order publishes saved products and order then clears its draft',async()=>{
 const f=purchaseOrderFixture();assert.equal(await f.c.finalizePurchaseOrder(),true);assert.equal(f.state.purchaseOrders.length,1);assert.equal(f.state.purchaseOrderCart.length,0);assert.equal(f.c.getProduct('flour').purchaseUnit,'pack');assert.equal(JSON.parse(f.data.get('prilavok_purchaseOrders')).length,1);
});
test('purchase order keeps runtime unchanged until one pending commit finishes',async()=>{
 const f=purchaseOrderFixture(),before=JSON.stringify({products:f.state.products,orders:f.state.purchaseOrders,cart:f.state.purchaseOrderCart});let release,commits=0;f.c.commitCriticalStorage=()=>{commits++;return new Promise(resolve=>{release=resolve})};
 const first=f.c.finalizePurchaseOrder();assert.equal(vm.runInContext('criticalOperationBusy',f.c),true);assert.equal(JSON.stringify({products:f.state.products,orders:f.state.purchaseOrders,cart:f.state.purchaseOrderCart}),before);assert.equal(await f.c.finalizePurchaseOrder(),false);assert.equal(commits,1);release();assert.equal(await first,true);assert.equal(vm.runInContext('criticalOperationBusy',f.c),false);assert.equal(f.state.purchaseOrders.length,1);
});
test('purchase order remains successful when presentation fails after durable commit',async()=>{
 const f=purchaseOrderFixture();f.c.render=()=>{throw Error('presentation failure')};assert.equal(await f.c.finalizePurchaseOrder(),true);assert.equal(f.state.purchaseOrders.length,1);assert.equal(JSON.parse(f.data.get('prilavok_purchaseOrders')).length,1);assert.doesNotMatch(f.messages.at(-1)||'',/Заказ не сформирован/);
});
test('purchase order creation preserves unknown product and historical order fields',async()=>{
 const f=purchaseOrderFixture();f.c.getProduct('flour').legacyProductField={keep:true};f.state.purchaseOrders=[{id:'old',supplierName:'Старый',items:[],status:'received',legacyOrderField:'keep'}];assert.equal(await f.c.finalizePurchaseOrder(),true);assert.deepEqual(plain(f.c.getProduct('flour').legacyProductField),{keep:true});assert.equal(f.state.purchaseOrders[0].legacyOrderField,'keep');
});
test('purchase order modal escapes compatible legacy IDs in inline actions',()=>{
 const f=fixture(),id=`legacy'\"><script>bad()</script>`;f.state.purchaseOrders=[{id,supplierName:'Поставщик',timestamp:1,items:[],status:'pending'}];let markup='';f.c.showModal=value=>{markup=value};f.c.viewPurchaseOrder(id);assert.doesNotMatch(markup,/<script>bad\(\)<\/script>/);assert.doesNotMatch(markup,/copyPurchaseOrder\('/);assert.match(markup,/copyPurchaseOrder\(&quot;/);assert.match(markup,/sharePurchaseOrder\(&quot;/);
 f.state.employees=[{id:'admin',role:'admin'}];f.state.shifts=[{id:'shift',status:'open',employeeId:'admin'}];f.c.openDeletePurchaseOrderModal(id);assert.doesNotMatch(markup,/<script>bad\(\)<\/script>/);assert.doesNotMatch(markup,/deletePurchaseOrderAsAdmin\('/);assert.match(markup,/deletePurchaseOrderAsAdmin\(&quot;/);
});
test('interrupted purchase order creation recovers product settings and order together',async()=>{
 const f=purchaseOrderFixture(),originalSet=f.c.localStorage.setItem;let failed=false;f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_purchaseOrders'&&!failed){failed=true;throw Error('injected order failure')}originalSet(key,value)};
 assert.equal(await f.c.finalizePurchaseOrder(),false);assert.equal(f.state.purchaseOrders.length,0);assert.equal(f.c.getProduct('flour').purchaseUnit,undefined);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state.purchaseOrders.length,1);assert.equal(restarted.c.getProduct('flour').purchaseUnit,'pack');assert.equal(restarted.c.getProduct('flour').purchasePackSize,2);
});
function deletablePurchaseOrderFixture(){
 const f=fixture();f.state.employees=[{id:'admin',name:'Администратор',role:'admin'}];f.state.shifts=[{id:'shift',status:'open',openingCash:100,employeeId:'admin',employeeName:'Администратор'}];f.state.purchaseOrders=[{id:'purchase',supplierId:'supplier',supplierName:'Поставщик',items:[{productId:'flour',productName:'Мука',qty:4}],status:'pending',timestamp:1}];f.state.receivings=[];f.c.render=()=>{};f.c.closeModal=()=>{};return f;
}
test('purchase order deletion failure leaves order and receiving history unchanged',async()=>{
 const f=deletablePurchaseOrderFixture(),before=JSON.stringify({orders:f.state.purchaseOrders,receivings:f.state.receivings}),originalSet=f.c.localStorage.setItem;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_criticalStorageJournal')throw Error('injected journal failure');originalSet(key,value)};
 assert.equal(await f.c.deletePurchaseOrderAsAdmin('purchase'),false);assert.equal(JSON.stringify({orders:f.state.purchaseOrders,receivings:f.state.receivings}),before);assert.match(f.messages.at(-1),/не удалена/);
});
test('purchase order deletion publishes deleted status and one audit row',async()=>{
 const f=deletablePurchaseOrderFixture();assert.equal(await f.c.deletePurchaseOrderAsAdmin('purchase'),true);assert.equal(f.state.purchaseOrders[0].status,'deleted');assert.equal(f.state.receivings.length,1);assert.equal(JSON.parse(f.data.get('prilavok_receivings')).length,1);
});
test('interrupted purchase order deletion recovers deleted status and audit row together',async()=>{
 const f=deletablePurchaseOrderFixture(),originalSet=f.c.localStorage.setItem;let failed=false;f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_receivings'&&!failed){failed=true;throw Error('injected receiving failure')}originalSet(key,value)};
 assert.equal(await f.c.deletePurchaseOrderAsAdmin('purchase'),false);assert.equal(f.state.purchaseOrders[0].status,'pending');assert.equal(f.state.receivings.length,0);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();assert.equal(restarted.state.purchaseOrders[0].status,'deleted');assert.equal(restarted.state.receivings.length,1);assert.equal(restarted.state.receivings[0].adminDeleted,true);
});
test('invoice normalizes grams and uses invoice total as acquisition cost',()=>{
 const f=fixture();f.c.getProduct('flour').stockUnit='kg';
 const [item]=f.c.invoiceReceivingItems({lines:[{productId:'flour',qtyInput:'1500',unit:'g',totalInput:'30'}]});near(item.qty,1.5);near(item.unitCost,20);near(item.invoiceUnitPrice,0.02);
});
test('weighted cost is 16 for 2 kg at 10 plus 3 kg at 20',()=>{
 const f=fixture();Object.assign(f.c.getProduct('flour'),{stock:2,cost:10});
 const [u]=f.c.receivingStockUpdates([{productId:'flour',qty:3,totalCost:60}]);near(u.stock,5);near(u.cost,16);near(f.c.getProduct('flour').stock,2);
});
test('small unit costs retain precision and duplicate invoice lines accumulate',()=>{
 const f=fixture();Object.assign(f.c.getProduct('flour'),{stock:2000,cost:0.002});
 const [u]=f.c.receivingStockUpdates([{productId:'flour',qty:1000,totalCost:3},{productId:'flour',qty:2000,totalCost:5}]);near(u.stock,5000);near(u.cost,0.0024);
});
test('incomplete or invalid invoice never generates stock updates',()=>{
 const f=fixture();for(const line of [{productId:'flour',qtyInput:'',totalInput:'3',unit:''},{productId:'flour',qtyInput:'-1',totalInput:'3',unit:''},{productId:'flour',qtyInput:'0',totalInput:'3',unit:''},{productId:'missing',qtyInput:'2',totalInput:'3',unit:''}])assert.throws(()=>f.c.invoiceReceivingItems({lines:[line]}));
 const zero=f.c.invoiceReceivingItems({lines:[{productId:'flour',qtyInput:'0',totalInput:'0',unit:''}]});assert.equal(f.c.receivingStockUpdates(zero).length,0);
});
test('quantity/price/total editing recalculates invoice fields',()=>{
 const f=fixture();f.c._receivingDraft={lines:[{qtyInput:'2',unit:'kg',priceInput:'10',totalInput:'20',priceMode:'price'}]};
 f.c.updateInvoiceLine(0,'qtyInput','3');near(f.c._receivingDraft.lines[0].totalInput,30);
 f.c.updateInvoiceLine(0,'totalInput','60');near(f.c._receivingDraft.lines[0].priceInput,20);
 f.c.updateInvoiceLine(0,'unit','g');near(f.c._receivingDraft.lines[0].qtyInput,3000);near(f.c._receivingDraft.lines[0].priceInput,0.02);near(f.c._receivingDraft.lines[0].totalInput,60);
});
test('unknown package weight is not falsely compared to warehouse units',()=>{
 const f=fixture();const order={items:[{productId:'flour',qty:0,expectedQty:null,requestedQty:4,requestedUnit:'pack'}]};
 assert.equal(f.c.receivingDiscrepancy(order,[{productId:'flour',qty:7.7}]),false);assert.equal(f.c.receivingDiscrepancy(order,[{productId:'flour',qty:0}]),true);
 assert.equal(f.c.receivingDiscrepancy({items:[{productId:'flour',qty:10}]},[{productId:'flour',qty:8}]),true);
});
function invoiceFixture(){
 const f=fixture();f.state.suppliers=[{id:'supplier',name:'Поставщик',productIds:['flour']}];f.state.purchaseOrders=[{id:'purchase',supplierId:'supplier',supplierName:'Поставщик',items:[{productId:'flour',qty:3}],status:'pending'}];f.state.receivings=[];
 f.c._receivingPending={orderId:'purchase',draft:{invoiceNumber:'ТТН-001',invoiceDate:'2026-09-14',supplierId:'supplier',lines:[{productId:'flour',qtyInput:'3',unit:'',totalInput:'60'}]}};return f;
}
test('confirmation applies current weighted cost once and persists TTN history',async()=>{
 const f=invoiceFixture();let availability=0;f.c.publishAvailability=()=>{availability++;return Promise.resolve(true)};Object.assign(f.c.getProduct('flour'),{stock:2,cost:10});
 await f.c.applyReceivingDocument();near(f.c.getProduct('flour').stock,5);near(f.c.getProduct('flour').cost,16);assert.equal(f.state.receivings.length,1);assert.equal(f.state.receivings[0].invoiceNumber,'ТТН-001');assert.equal(f.state.purchaseOrders[0].status,'received');
 assert.equal(availability,1);await f.c.applyReceivingDocument();assert.equal(f.state.receivings.length,1);near(f.c.getProduct('flour').stock,5);assert.ok(f.data.has('prilavok_receivings'));assert.equal(availability,1);
});
test('receiving refuses to start while another critical operation is saving',async()=>{
 const f=invoiceFixture(),before=JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings});vm.runInContext('criticalOperationBusy=true',f.c);
 assert.equal(await f.c.applyReceivingDocument(),false);assert.equal(JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings}),before);assert.equal(f.data.has('prilavok_criticalStorageJournal'),false);assert.match(f.messages.at(-1),/Сохранение операции ещё не завершено/);
});
test('receiving owns the global critical guard until storage commit completes',async()=>{
 const f=invoiceFixture();Object.assign(f.c.getProduct('flour'),{stock:2,cost:10});let release,writes;f.c.commitCriticalStorage=(_type,nextWrites)=>new Promise(resolve=>{writes=plain(nextWrites);release=resolve});
 const before=JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings}),first=f.c.applyReceivingDocument();assert.equal(vm.runInContext('criticalOperationBusy',f.c),true);assert.equal(JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings}),before);assert.equal(await f.c.applyReceivingDocument(),false);assert.equal(writes.receivings.length,1);
 release();assert.equal(await first,true);assert.equal(vm.runInContext('criticalOperationBusy',f.c),false);assert.equal(f.state.receivings.length,1);near(f.c.getProduct('flour').cost,16);
});
test('receiving releases the global guard and keeps runtime unchanged when journal cannot start',async()=>{
 const f=invoiceFixture(),before=JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings});f.c.localStorage.setItem=(key)=>{if(key==='prilavok_criticalStorageJournal')throw Error('journal unavailable')};
 assert.equal(await f.c.applyReceivingDocument(),false);assert.equal(vm.runInContext('criticalOperationBusy',f.c),false);assert.equal(JSON.stringify({products:f.state.products,purchaseOrders:f.state.purchaseOrders,receivings:f.state.receivings}),before);assert.match(f.messages.at(-1),/Приёмка не выполнена/);
});
test('receiving completion preserves unknown product and purchase order fields',async()=>{
 const f=invoiceFixture();f.c.getProduct('flour').legacyProductField={keep:true};f.state.purchaseOrders[0].legacyOrderField='keep';assert.equal(await f.c.applyReceivingDocument(),true);assert.deepEqual(plain(f.c.getProduct('flour').legacyProductField),{keep:true});assert.equal(f.state.purchaseOrders[0].legacyOrderField,'keep');
});
test('receiving journal recovers document, order status and stock together',async()=>{
 const f=invoiceFixture();Object.assign(f.c.getProduct('flour'),{stock:2,cost:10});const originalSet=f.c.localStorage.setItem;let failed=false;
 f.c.localStorage.setItem=(key,value)=>{if(key==='prilavok_receivings'&&!failed){failed=true;throw Error('injected receiving failure')}originalSet(key,value)};
 await f.c.applyReceivingDocument();assert.equal(f.state.receivings.length,0);assert.match(f.messages.at(-1),/Приёмка не выполнена/);
 const restarted=fixture();for(const [key,value] of f.data)restarted.data.set(key,value);await restarted.c.loadAll();
 assert.equal(restarted.state.receivings.length,1);assert.equal(restarted.state.purchaseOrders[0].status,'received');near(restarted.c.getProduct('flour').stock,5);near(restarted.c.getProduct('flour').cost,16);
});
test('deleted order cannot be received and missing product cannot partially apply TTN',()=>{
 const f=invoiceFixture();f.state.purchaseOrders[0].status='deleted';const before=JSON.stringify(f.state);f.c.applyReceivingDocument();assert.equal(JSON.stringify(f.state),before);
 const g=invoiceFixture();g.c._receivingPending.draft.lines.push({productId:'missing',qtyInput:'2',unit:'',totalInput:'3'});const original=JSON.stringify(g.state);g.c.applyReceivingDocument();assert.equal(JSON.stringify(g.state),original);
});
test('cost cannot be manually changed in an existing product save',async()=>{
 const f=editorFixture();f.fields['pf-cost'].value='999';await f.c.saveProduct('flour');near(f.c.getProduct('flour').cost,2);
});
test('text and native share payload preserve fractional package request',()=>{
 const f=fixture();const order={id:'p',supplierName:'Supplier',items:[{productId:'flour',productName:'Мука',qty:0,requestedQty:1.5,requestedUnit:'box'}],timestamp:1};f.state.purchaseOrders=[order];
 assert.match(f.c.purchaseOrderText(order),/1.5 коробка/);let payload;f.c.webkit={messageHandlers:{printer:{postMessage:p=>payload=p}}};f.c.sharePurchaseOrder('p');assert.equal(payload.order.items[0].qty,1.5);assert.equal(payload.order.items[0].quantityText,'1.5 коробка');
});
test('standalone invoice has same cost calculation and no purchase order requirement',async()=>{
 const f=invoiceFixture();f.c._receivingPending.orderId=null;await f.c.applyReceivingDocument();near(f.c.getProduct('flour').stock,13);near(f.c.getProduct('flour').cost,80/13);assert.equal(f.state.receivings[0].type,'purchase');assert.equal(f.state.purchaseOrders[0].status,'pending');
});

test('standalone TTN draft is local and can be reopened without applying stock',async()=>{
 const f=invoiceFixture(),before=JSON.stringify(f.state.products);f.c._receivingDraft={version:1,orderId:null,supplierId:'supplier',invoiceNumber:'DRAFT',invoiceDate:'',lines:[{productId:'flour',qtyInput:'2',unit:'',priceInput:'3',totalInput:'6',priceMode:'total'}]};
 f.c.receivingDocumentInput=()=>{};f.c.renderReceivingDocument=()=>{};await f.c.saveReceivingDraft();assert.equal(JSON.stringify(f.state.products),before);assert.ok(f.data.has('prilavok_receivingDraft'));
 f.c._receivingDraft=null;await f.c.openReceivingDocument();assert.equal(f.c._receivingDraft.invoiceNumber,'DRAFT');assert.equal(f.c._receivingDraft.lines[0].qtyInput,'2');
});
test('legacy receiving draft opens with unchanged amounts and no stock mutation',async()=>{
 const f=invoiceFixture(),before=JSON.stringify(f.state.products);f.state.purchaseOrders[0].receivingDraft={flour:{qty:2,totalCost:'14'}};f.c.renderReceivingDocument=()=>{};
 await f.c.openReceivingDocument('purchase');assert.equal(f.c._receivingDraft.lines[0].qtyInput,2);assert.equal(f.c._receivingDraft.lines[0].totalInput,'14');assert.equal(JSON.stringify(f.state.products),before);
});
test('backup export preserves TTN invoice and original normalized amounts',async()=>{
 const f=invoiceFixture();await f.c.applyReceivingDocument();let backup;f.c.Blob=class{constructor(parts){this.parts=parts;}};f.c.URL={createObjectURL:b=>{backup=JSON.parse(b.parts.join(''));return 'blob:test';},revokeObjectURL:()=>{}};f.c.document.createElement=()=>({click(){}});await f.c.exportBackup();
 assert.equal(backup.receivings[0].invoiceNumber,'ТТН-001');near(backup.receivings[0].items[0].qty,3);near(backup.receivings[0].items[0].totalCost,60);
});
test('receiving history treats imported quantity as text',()=>{
 const f=fixture(),quantity='<img src=x onerror=bad()>';f.state.receivings=[{id:'legacy',type:'purchaseOrder',supplierName:'Поставщик',timestamp:1,items:[{productId:'flour',productName:'Мука',invoiceQty:quantity,invoiceUnit:'kg',totalCost:0}],totalCost:0}];let markup='';f.c.showModal=value=>{markup=value};f.c.viewReceivingModal('legacy');assert.doesNotMatch(markup,/<img src=x onerror=bad\(\)>/);assert.match(markup,/&lt;img src=x onerror=bad\(\)&gt;/);
});


test('supply sections have matching vertical controls and render inline invoice',()=>{
 const f=invoiceFixture();f.state.purchaseOrderCart=[];f.state.purchaseOrderSupplierId='supplier';
 const orders=f.c.renderPurchaseOrdersScreen(),receiving=f.c.renderReceivingScreen();
 assert.match(orders,/supply-stack-actions/);assert.match(receiving,/supply-stack-actions/);assert.doesNotMatch(orders,/content-title/);assert.doesNotMatch(receiving,/content-title/);
 assert.match(orders,/purchase-expand-panel/);assert.match(receiving,/receiving-inline-panel/);
 f.c._receivingDraft={supplierId:'supplier',invoiceNumber:'',invoiceDate:'',lines:[]};assert.match(f.c.receivingDocumentMarkup(),/ttn-number/);
});
test('inline receiving renders without a modal and can collapse without losing draft',()=>{
 const f=fixture();let expanded;f.c._receivingDraft={supplierId:'',invoiceNumber:'DRAFT',invoiceDate:'',lines:[]};
 f.fields['receiving-inline-panel']={innerHTML:'',hidden:true,scrollIntoView(){}};f.fields['receiving-expand-button']={setAttribute(k,v){expanded=v;}};
 f.c.renderReceivingDocument();assert.equal(expanded,'true');assert.match(f.fields['receiving-inline-panel'].innerHTML,/DRAFT/);assert.equal(f.fields['receiving-inline-panel'].hidden,false);
 f.c.toggleReceivingPanel();assert.equal(f.fields['receiving-inline-panel'].hidden,true);assert.equal(f.c._receivingDraft.invoiceNumber,'DRAFT');
});


test('purchase history includes older entries and all requested status labels',()=>{
 const f=fixture();f.state.purchaseOrders=Array.from({length:60},(_,i)=>({id:String(i),timestamp:i,supplierName:'Supplier',items:[],status:i===0?'deleted':i<3?'received':'pending',shortage:i===1}));
 const markup=f.c.purchaseHistoryMarkup();assert.equal((markup.match(/purchase-history-row/g)||[]).length,60);
 for(const label of ['Удалено администратором','Ожидается приёмка','Принят','Недовоз'])assert.ok(markup.includes(label));
});
test('quantity keypad supports replacement, decimal, backspace and clear without changing order',()=>{
 const f=fixture();f.state.purchaseOrderCart=[];f.c._purchaseQuantity={productId:'flour',value:'8',replace:true};
 f.c.purchaseQuantityKey('1');f.c.purchaseQuantityKey(',');f.c.purchaseQuantityKey('5');assert.equal(f.c._purchaseQuantity.value,'1.5');f.c.purchaseQuantityKey(',');assert.equal(f.c._purchaseQuantity.value,'1.5');
 f.c.purchaseQuantityKey('⌫');assert.equal(f.c._purchaseQuantity.value,'1.');f.c.purchaseQuantityKey('clear');assert.equal(f.c._purchaseQuantity.value,'');assert.equal(f.state.purchaseOrderCart.length,0);
});
test('quantity keypad commits to existing order input only on Done',()=>{
 const f=fixture(),input={value:'8'};let updated;f.c.document.querySelectorAll=()=>[{dataset:{purchaseRow:'flour'},querySelector:()=>input}];f.c.updatePurchaseRequest=id=>{updated=id;};
 f.c._purchaseQuantity={productId:'flour',value:'1.5',replace:false};assert.equal(input.value,'8');f.c.applyPurchaseQuantity();assert.equal(input.value,'1.5');assert.equal(updated,'flour');assert.equal(f.c._purchaseQuantity,null);
});


test('package keypad shares numeric input without changing requested order quantity',()=>{
 const f=fixture(),qty={value:'4'},size={value:'2'};let html='';f.c.showModal=value=>{html=value;};f.c.document.querySelectorAll=()=>[{dataset:{purchaseRow:'flour'},querySelector:s=>s==='[data-request-size]'?size:qty}];f.c.updatePurchaseRequest=()=>{};
 f.c.openPurchaseQuantity('flour','size');assert.match(html,/В упаковке/);assert.doesNotMatch(html,/>Отмена</);
 f.c.purchaseQuantityKey('1');f.c.purchaseQuantityKey(',');f.c.purchaseQuantityKey('5');f.c.applyPurchaseQuantity();assert.equal(size.value,'1.5');assert.equal(qty.value,'4');
});

test('starting order receiving publishes draft only after local persistence',async()=>{
 const f=invoiceFixture(),before=JSON.stringify(f.state.purchaseOrders);f.c._receivingDraft=null;let rendered=0;f.c.renderReceivingDocument=()=>rendered++;f.c.localStorage.setItem=()=>{throw Error('quota')};
 assert.equal(await f.c.openReceivingDocument('purchase'),false);assert.equal(JSON.stringify(f.state.purchaseOrders),before);assert.equal(f.c._receivingDraft,null);assert.equal(rendered,0);assert.match(f.messages.at(-1),/Не удалось сохранить начало приёмки/);
});
test('already persisted order draft reopens without a redundant storage write',async()=>{
 const f=invoiceFixture();f.state.purchaseOrders[0].receivingIncomplete=true;f.state.purchaseOrders[0].receivingDraftV2={version:1,orderId:'purchase',supplierId:'supplier',invoiceNumber:'SAVED',invoiceDate:'',lines:[]};let rendered=0;f.c.renderReceivingDocument=()=>rendered++;f.c.localStorage.setItem=()=>{throw Error('must not write')};
 assert.equal(await f.c.openReceivingDocument('purchase'),true);assert.equal(f.c._receivingDraft.invoiceNumber,'SAVED');assert.equal(rendered,1);assert.equal(f.writes.length,0);
});
test('order draft save failure keeps order, editor and page intact',async()=>{
 const f=invoiceFixture();f.c._receivingDraft={version:1,orderId:'purchase',supplierId:'supplier',invoiceNumber:'EDITED',invoiceDate:'',lines:[]};f.c.receivingDocumentInput=()=>{};const before=JSON.stringify(f.state.purchaseOrders),buttons=[{disabled:false},{disabled:false}];f.c.document.querySelectorAll=selector=>selector==='[data-receiving-draft-save]'?buttons:[];let finished=0,closed=0,rendered=0;f.c.finishReceivingPage=()=>finished++;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;f.c.localStorage.setItem=()=>{throw Error('quota')};
 assert.equal(await f.c.saveReceivingDraft(),false);assert.equal(JSON.stringify(f.state.purchaseOrders),before);assert.equal(f.c._receivingDraft.invoiceNumber,'EDITED');assert.equal(finished+closed+rendered,0);assert.ok(buttons.every(button=>button.disabled===false));assert.match(f.messages.at(-1),/Не удалось сохранить черновик/);
});
test('order draft save persists a full snapshot before closing and preserves order fields',async()=>{
 const f=invoiceFixture();f.state.purchaseOrders[0].legacyNote='keep';f.c._receivingDraft={version:1,orderId:'purchase',supplierId:'supplier',invoiceNumber:'EDITED',invoiceDate:'2026-10-02',lines:[]};f.c.receivingDocumentInput=()=>{};const before=JSON.stringify(f.state.purchaseOrders);let finished=0,closed=0,rendered=0;f.c.finishReceivingPage=()=>finished++;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;
 const pending=f.c.saveReceivingDraft();assert.equal(JSON.stringify(f.state.purchaseOrders),before);assert.equal(await pending,true);assert.equal(f.state.purchaseOrders[0].receivingDraftV2.invoiceNumber,'EDITED');assert.equal(f.state.purchaseOrders[0].legacyNote,'keep');assert.equal(f.c._receivingDraft,null);assert.equal(finished,1);assert.equal(closed,1);assert.equal(rendered,1);assert.deepEqual(f.writes,['prilavok_purchaseOrders']);
});
test('standalone draft failure remains editable and repeated save writes once',async()=>{
 const failed=invoiceFixture();failed.c._receivingDraft={version:1,orderId:null,supplierId:'supplier',invoiceNumber:'LOCAL',invoiceDate:'',lines:[]};failed.c.receivingDocumentInput=()=>{};let closed=0;failed.c.closeModal=()=>closed++;failed.c.localStorage.setItem=()=>{throw Error('quota')};assert.equal(await failed.c.saveReceivingDraft(),false);assert.equal(failed.c._receivingDraft.invoiceNumber,'LOCAL');assert.equal(closed,0);
 const f=invoiceFixture();f.c._receivingDraft={version:1,orderId:null,supplierId:'supplier',invoiceNumber:'LOCAL',invoiceDate:'',lines:[]};f.c.receivingDocumentInput=()=>{};const first=f.c.saveReceivingDraft(),second=f.c.saveReceivingDraft();assert.equal(await second,false);assert.equal(await first,true);assert.deepEqual(f.writes,['prilavok_receivingDraft']);assert.equal(JSON.parse(f.data.get('prilavok_receivingDraft')).invoiceNumber,'LOCAL');
});

test('opening supply pre-fills ordered base quantity and persists started draft without stock change',async()=>{
 const f=invoiceFixture(),before=JSON.stringify(f.state.products);f.c.renderReceivingDocument=()=>{};
 await f.c.openReceivingDocument('purchase');assert.equal(f.c._receivingDraft.lines[0].qtyInput,3);assert.equal(f.state.purchaseOrders[0].receivingIncomplete,true);assert.equal(JSON.stringify(f.state.products),before);assert.ok(JSON.parse(f.data.get('prilavok_purchaseOrders'))[0].receivingDraftV2);
 assert.doesNotMatch(f.c.receivingDocumentMarkup(),/ttn-add-product/);assert.match(f.c.receivingDocumentMarkup(),/Завершить приёмку позже/);
});
test('unknown pack weight stays blank and saved zero quantity is retained',async()=>{
 const f=invoiceFixture();f.state.purchaseOrders[0].items[0].expectedQty=null;f.c.renderReceivingDocument=()=>{};
 await f.c.openReceivingDocument('purchase');assert.equal(f.c._receivingDraft.lines[0].qtyInput,'');f.state.purchaseOrders[0].receivingDraftV2.lines[0].qtyInput=0;
 await f.c.openReceivingDocument('purchase');assert.equal(f.c._receivingDraft.lines[0].qtyInput,0);
});
test('supply opens independent page and excludes duplicate inline fields',()=>{
 const f=invoiceFixture();f.c._receivingDraft={...f.c._receivingPending.draft,orderId:'purchase'};
 f.fields['receiving-page-root']={innerHTML:''};f.fields.app={inert:false};f.fields['receiving-inline-panel']={innerHTML:'old',hidden:false};
 f.c.renderReceivingDocument();assert.equal(f.fields.app.inert,true);assert.match(f.fields['receiving-page-root'].innerHTML,/Приёмка поставки/);assert.equal(f.fields['receiving-inline-panel'].innerHTML,'');assert.equal(f.fields['receiving-inline-panel'].hidden,true);
 f.c.finishReceivingPage();assert.equal(f.fields.app.inert,false);assert.equal(f.fields['receiving-page-root'].innerHTML,'');
});

function warehouseFixture(){
 const f=fixture();f.state.products=[{id:'flour',name:'Мука',type:'simple',stockUnit:'kg',stock:10,cost:2,minStock:3}];f.state.receivings=[];f.state.orders=[];
 const ts=day=>new Date(2026,8,day,12).getTime();return {...f,ts};
}
test('warehouse report filters movement dates and reconstructs boundaries from current balance',()=>{
 const f=warehouseFixture();f.state.receivings=[{id:'r1',timestamp:f.ts(3),items:[{productId:'flour',qty:4,totalCost:20,stockUnit:'kg'}]},{id:'r2',timestamp:f.ts(10),items:[{productId:'flour',qty:3,totalCost:12,stockUnit:'kg'}]}];
 f.state.orders=[{timestamp:f.ts(5),items:[{productId:'pizza',qty:1,cost:9}],stockConsumption:{version:1,items:[{productId:'flour',qty:1}]}},{timestamp:f.ts(11),stockConsumption:{version:1,items:[{productId:'flour',qty:1}]}}];
 const before=JSON.stringify(f.state),report=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14)),row=report.rows[0];near(row.incoming,4);near(row.outgoing,1);near(row.start,5);near(row.end,8);near(report.incomingValue,20);near(report.outgoingValue,2);near(report.recordedSalesCost,9);assert.equal(report.documents.length,1);assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,0);
});
test('warehouse return is counted by return date even for a sale before the period',()=>{
 const f=warehouseFixture();f.state.orders=[{timestamp:new Date(2026,7,20).getTime(),returnedAt:f.ts(4),stockConsumption:{version:1,items:[{productId:'flour',qty:2}]}}];
 const r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14));near(r.rows[0].returned,2);near(r.rows[0].outgoing,0);
});
test('warehouse legacy receipts are flagged and never reconstructed using current recipe',()=>{
 const f=warehouseFixture();f.state.orders=[{timestamp:f.ts(3),items:[{productId:'flour',qty:9}]}];const r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14));assert.equal(r.warnings.legacySales,1);near(r.rows[0].outgoing,0);assert.ok(f.c.warehouseNotes(r).join(' ').includes('не восстановлены'));
});
test('deleted receiving audit records do not become inventory arrivals',()=>{
 const f=warehouseFixture();f.state.receivings=[{id:'x',timestamp:f.ts(3),adminDeleted:true,items:[{productId:'flour',qty:100,totalCost:1000}]}];const r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14));near(r.incomingValue,0);assert.equal(r.documents.length,0);
});
test('removed product is retained in report without inventing current balance or cost',()=>{
 const f=warehouseFixture();f.state.orders=[{timestamp:f.ts(3),stockConsumption:{version:1,items:[{productId:'deleted',qty:2}]}}];const r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14));const row=r.rows.find(x=>x.id==='deleted');assert.equal(row.current,null);assert.equal(row.outgoingValue,null);assert.equal(r.warnings.unknownCosts,1);
});
test('warehouse units are grouped compatibly, never kg plus litres',()=>{
 const f=fixture();const text=f.c.warehouseQuantityTotals({rows:[{unit:'kg',incoming:1},{unit:'g',incoming:500},{unit:'l',incoming:2}]},'incoming');assert.match(text,/1,5 кг/);assert.match(text,/2 л/);
});
test('warehouse export includes limitations, period and receipt registry with no new storage writes',()=>{
 const f=warehouseFixture();const r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14)),all=f.c.warehouseExportPayload(r),docs=f.c.warehouseExportPayload(r,true);
 assert.equal(all.period,'2026-09-01 — 2026-09-07');assert.equal(docs.sections.length,1);assert.match(all.notes.join(' '),/Ручные изменения/);assert.equal(f.writes.length,0);
});
test('warehouse rejects invalid dates and export cannot bypass admin access',()=>{
 const f=fixture();assert.throws(()=>f.c.warehouseRange('2026-02-30','2026-03-01'));assert.throws(()=>f.c.warehouseRange('2026-09-07','2026-09-01'));let sent=false;f.c.currentShiftEmployeeIsAdmin=()=>false;f.c.webkit={messageHandlers:{printer:{postMessage:()=>{sent=true;}}}};f.c.exportWarehousePDF();assert.equal(sent,false);
});

test('warehouse selected export keeps only requested sections and numeric Excel cells',()=>{
 const f=warehouseFixture();f.state.receivings=[{id:'r',timestamp:f.ts(3),supplierName:'=SUM(1,2)',invoiceNumber:'001',items:[{productId:'flour',qty:1.25,totalCost:7.5,stockUnit:'kg'}]}];
 const before=JSON.stringify(f.state),r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14));
 for(let i=0;i<5;i++){const p=f.c.warehouseSelectedPayload(r,[i]);assert.equal(p.sections.length,1);assert.ok(p.notes.length>0);assert.ok(p.sections[0].excelRows);}
 const p=f.c.warehouseSelectedPayload(r,[2,4]);assert.equal(p.sections[0].excelRows[0][2],1.25);assert.equal(p.sections[1].excelRows[0][1],'001');assert.equal(p.sections[1].excelRows[0][4],7.5);assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,0);
 assert.throws(()=>f.c.warehouseSelectedPayload(r,[]),/Выберите/);
});
test('warehouse generation routes selected format and blocks invalid or unauthorized export',()=>{
 const f=warehouseFixture();let sent=[];const fields={'warehouse-from':{value:'2026-09-01'},'warehouse-to':{value:'2026-09-07'},'warehouse-report-format':{value:'xlsx'}};
 f.c.currentShiftEmployeeIsAdmin=()=>true;f.c.document.getElementById=id=>fields[id];f.c.document.querySelectorAll=()=>[{value:'3'}];f.c.webkit={messageHandlers:{printer:{postMessage:p=>sent.push(p)}}};f.c.renderWarehousePage=()=>{};f.c.closeModal=()=>{};
 f.c.generateWarehouseReport();assert.equal(sent[0].action,'shareWarehouseExcel');assert.equal(sent[0].report.sections.length,1);
 fields['warehouse-report-format'].value='pdf';f.c.generateWarehouseReport();assert.equal(sent[1].action,'shareWarehouseReport');
 fields['warehouse-report-format'].value='bad';f.c.generateWarehouseReport();assert.equal(sent.length,2);
 f.c.currentShiftEmployeeIsAdmin=()=>false;f.c.generateWarehouseReport();assert.equal(sent.length,2);assert.equal(f.writes.length,0);
});

test('simplified warehouse combines suppliers without duplicating movement or balance',()=>{
 const f=warehouseFixture();f.state.receivings=[
 {timestamp:f.ts(3),supplierName:'Б',items:[{productId:'flour',qty:2,totalCost:4}]},
 {timestamp:f.ts(4),supplierName:'А',items:[{productId:'flour',qty:3,totalCost:6}]},
 {timestamp:f.ts(5),supplierName:'А',items:[{productId:'flour',qty:1,totalCost:2}]},
 {timestamp:f.ts(10),supplierName:'Вне периода',items:[{productId:'flour',qty:4,totalCost:8}]},
 {timestamp:f.ts(5),supplierName:'Удалён',adminDeleted:true,items:[{productId:'flour',qty:5,totalCost:10}]}];
 f.state.orders=[{timestamp:f.ts(6),stockConsumption:{version:1,items:[{productId:'flour',qty:2}]}}];
 const before=JSON.stringify(f.state),r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14)),p=f.c.warehouseSelectedPayload(r,[0,1,2,3,4]);
 assert.equal(p.sections[0].title,'Упрощённый учёт');const rows=p.sections[0].excelRows;assert.equal(rows.length,1);assert.equal(rows[0][0],'А, Б');assert.equal(rows[0][3],6);assert.equal(rows[0][4],2);assert.equal(rows[0][5],6);
 assert.equal(JSON.stringify(f.state),before);assert.equal(f.writes.length,0);
});
test('simplified warehouse keeps old stock without attributing it to a current supplier',()=>{
 const f=warehouseFixture(),r=f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14)),s=f.c.warehouseSimpleSection(r);
 assert.equal(s.excelRows[0][0],'—');assert.equal(s.excelRows[0][3],0);assert.equal(s.excelRows[0][5],10);
 assert.equal(f.c.warehouseSelectedPayload(r,[0]).sections.length,1);
 f.state.products=[];assert.equal(f.c.warehouseSimpleSection(f.c.warehouseReport('2026-09-01','2026-09-07',f.ts(14))).rows.length,0);
});

test('CSV import parses BOM, quoted commas, escaped quotes, multiline fields and semicolons',()=>{
 const f=fixture();const r=f.c.parseProductCSV('\uFEFFНазвание,Категория,Описание\r\n"*Виски [Wild West 0,5]",Алкоголь,"текст\nстрока ""два"""\r\n');assert.equal(r.length,1);assert.equal(r[0].name,'*Виски [Wild West 0,5]');assert.equal(f.c.parseProductCSV('Название;Категория\nЧай;Напитки')[0].name,'Чай');
 assert.throws(()=>f.c.parseProductCSV('Название,Категория\n"Чай,Напитки'));assert.throws(()=>f.c.parseProductCSV('Название,Категория\nЧай'));assert.throws(()=>f.c.parseProductCSV('Цена\n20'));
});
test('import normalizes names, matches existing categories only and separates raw ingredients',()=>{
 const f=fixture();f.state.categoryOrder=['Пицца','Коктейли'];
 const p=f.c.planProductImport([{name:'#Айс [350]❄️',category:'Коктейли'},{name:'Фри',category:'Закуски'},{name:'Фри',category:'Сырье'},{name:'Мука',category:'Другое'}]);
 assert.equal(p.add.length,3);assert.equal(p.add[0].name,'Айс 350');assert.equal(p.add[0].category,'Коктейли');assert.equal(p.add[1].category,'');assert.equal(p.add[2].name,'Фри (сырьё)');assert.equal(p.skipped[0],'Мука');assert.equal(f.writes.length,0);
});
function importFixture(){const f=fixture();f.fields.app={inert:false};f.fields['product-import-confirm']={disabled:false};f.c._productImportEntries=[{name:'Новый товар',category:'Нет категории'}];f.c._productImportPreview=JSON.stringify(f.c.planProductImport(f.c._productImportEntries).add);return f;}
test('import adds only name/category defaults and persists before publishing state',async()=>{
 const f=importFixture(),old=JSON.stringify(f.state.products),orders=JSON.stringify(f.state.orders);await f.c.confirmProductImport();
 assert.equal(JSON.stringify(f.state.products.slice(0,-1)),old);assert.equal(JSON.stringify(f.state.orders),orders);
 const p=f.state.products.at(-1);assert.equal(p.name,'Новый товар');assert.equal(p.category,'');assert.equal(p.price,0);assert.equal(p.stock,0);assert.equal(p.availableOnline,false);assert.equal(p.availableInOnlineMenu,false);assert.equal(p.stockUnit,undefined);assert.equal(p.components,undefined);assert.deepEqual(f.writes,['prilavok_products']);assert.equal(f.fields.app.inert,false);
 const plan=f.c.planProductImport([{name:'Новый товар',category:''}]);assert.equal(plan.add.length,0);
});
test('failed import storage write leaves existing products intact and permits retry',async()=>{
 const f=importFixture(),before=JSON.stringify(f.state.products);f.c.localStorage.setItem=()=>{throw Error('quota');};await f.c.confirmProductImport();assert.equal(JSON.stringify(f.state.products),before);assert.equal(f.c._productImportBusy,false);assert.equal(f.fields.app.inert,false);assert.match(f.messages.at(-1),/не сохранён/);assert.equal(f.fields['product-import-confirm'].disabled,false);
});
test('import rechecks changed products before saving and double click cannot duplicate writes',async()=>{
 const f=importFixture();f.state.products.push({id:'added',name:'Новый товар'});let preview=false;f.c.previewProductImport=()=>{preview=true;};await f.c.confirmProductImport();assert.ok(preview);assert.equal(f.writes.length,0);
 const g=importFixture();await Promise.all([g.c.confirmProductImport(),g.c.confirmProductImport()]);assert.equal(g.writes.length,1);assert.equal(g.state.products.filter(p=>p.name==='Новый товар').length,1);
});

test('CSV prices support decimals and old exports, reject invalid amounts',()=>{
 const f=fixture();const rows=f.c.parseProductCSV('Название,Цена [PROJECT]\nТовар,14.31\nДругой,изменяемая');assert.equal(rows[0].price,14.31);assert.equal(rows[1].price,null);
 assert.equal(f.c.importedProductPrice('3,50'),3.5);assert.equal(f.c.importedProductPrice('0.01'),0.01);assert.equal(f.c.importedProductPrice(''),null);
 for(const v of ['-1','NaN','Infinity','1e3','12abc','1.234'])assert.throws(()=>f.c.importedProductPrice(v));
});
test('CSV imported selling price persists without importing costs or overwriting existing products',async()=>{
 const f=importFixture();f.c._productImportEntries=[{name:'Новый товар',price:14.31,category:''}];f.c._productImportPreview=JSON.stringify(f.c.planProductImport(f.c._productImportEntries).add);
 await f.c.confirmProductImport();const p=f.state.products.at(-1);assert.equal(p.price,14.31);assert.equal(p.cost,0);assert.equal(p.stock,0);assert.equal(JSON.parse(f.data.get('prilavok_products')).at(-1).price,14.31);
 assert.equal(f.c.planProductImport([{name:'Новый товар',price:100}]).add.length,0);assert.equal(p.price,14.31);
});

test('product search matches names and categories with Unicode and case normalization',()=>{
 const f=fixture();assert.ok(f.c.productMatchesSearch({name:'Айс-латте',category:'Горячие напитки'},f.c.productSearchText('АЙС')));assert.ok(f.c.productMatchesSearch({name:'Вода',category:'Сырьё'},f.c.productSearchText('  сырье  ')));assert.equal(f.c.productMatchesSearch({name:'Вода',category:'Напитки',price:123,sku:'secret'},'secret'),false);
});
test('live product search updates rows, counts and empty state then restores all rows without rerender',()=>{
 const f=fixture();const rows=[{dataset:{productSearch:'маргарита пицца'},style:{}},{dataset:{productSearch:'чай горячие напитки'},style:{}}],badge={},clear={style:{}},table={style:{}},empty={style:{}};
 const card={querySelectorAll:selector=>{assert.equal(selector,'.products-table-row');return rows;},querySelector:selector=>selector.includes('badge')?badge:clear};
 f.fields['products-search']={value:'пицца',closest:()=>card,focus:()=>{}};f.fields['products-search-table']=table;f.fields['products-search-empty']=empty;f.c.render=()=>{throw Error('must preserve input focus');};
 f.c.filterProductsScreen();assert.equal(rows[0].hidden,false);assert.equal(rows[1].hidden,true);assert.equal(badge.textContent,'1 / 4');
 f.fields['products-search'].value='ничего';f.c.filterProductsScreen();assert.equal(empty.hidden,false);assert.equal(table.hidden,true);
 f.c.clearProductsSearch();assert.ok(rows.every(r=>r.hidden===false));assert.equal(empty.hidden,true);assert.equal(table.hidden,false);assert.equal(clear.hidden,true);
});
test('rendered filtered product screen retains hidden rows for subsequent broader searches',()=>{
 const f=fixture();f.state.productsSearch='мука';const html=f.c.renderProductsScreen();assert.equal((html.match(/data-product-search=/g)||[]).length,4);assert.match(html,/id="products-search-empty"/);assert.match(html,/Название или категория/);
});

test('product sorting uses numbers, toggles direction and never changes stored product order',()=>{
 const f=fixture();f.state.products=[{id:'a',name:'А',type:'simple',price:100,stock:3},{id:'b',name:'Б',type:'simple',price:9,stock:1},{id:'c',name:'В',type:'simple',price:20,stock:0,noStockTracking:true}];const before=JSON.stringify(f.state.products);f.state.productsSearch='категория';
 f.c.sortProductsBy('price');assert.deepEqual(plain(f.c.sortedProductRows().map(p=>p.id)),['b','c','a']);f.c.sortProductsBy('price');assert.deepEqual(plain(f.c.sortedProductRows().map(p=>p.id)),['a','c','b']);
 f.c.sortProductsBy('stock');assert.deepEqual(plain(f.c.sortedProductRows().map(p=>p.id)),['b','a','c']);f.c.sortProductsBy('stock');assert.deepEqual(plain(f.c.sortedProductRows().map(p=>p.id)),['a','b','c']);assert.equal(JSON.stringify(f.state.products),before);assert.equal(f.state.productsSearch,'категория');assert.equal(f.writes.length,0);
});
test('product sorting supports category, type and WEB and renders all header buttons',()=>{
 const f=fixture();f.state.products=[{id:'a',name:'А',type:'composite',category:'Я',availableOnline:true,components:[]},{id:'b',name:'Б',type:'simple',category:'Б',availableOnline:false,stock:0}];
 for(const key of ['category','type','web']){f.c.sortProductsBy(key);assert.deepEqual(plain(f.c.sortedProductRows().map(p=>p.id)),['b','a']);}
 const h=f.c.renderProductsScreen();assert.equal((h.match(/class="products-sort-header/g)||[]).length,7);assert.match(h,/sortProductsBy\('stock'\)/);
});

function adminDeletionFixture(){const f=fixture();f.state.employees=[{id:'admin',name:'Админ',role:'admin'},{id:'other',name:'Другой',role:'employee'}];f.state.shifts[0].employeeId='admin';return f;}
test('administrator product delete omits password but preserves recipe protection',()=>{
 const f=adminDeletionFixture();let modal='';f.c.showModal=h=>modal=h;f.c.requestDelete('product','flour');assert.ok(!modal.includes('id="delete-password"'));f.c.confirmDelete('product','flour');assert.ok(f.c.getProduct('flour'));assert.match(f.messages.at(-1),/составном/);
 f.state.products.push({id:'unused',name:'Не используется',type:'simple'});f.c.confirmDelete('product','unused');assert.equal(f.c.getProduct('unused'),undefined);
 f.c.requestDelete('category','Категория');assert.ok(modal.includes('id="delete-password"'));
});
test('non-administrator cannot bypass product password and rights are rechecked',()=>{
 const f=adminDeletionFixture();f.state.products.push({id:'unused',name:'Товар',type:'simple'});f.c.showModal=()=>{};f.c.requestDelete('product','unused');f.state.employees[0].role='employee';f.c.confirmDelete('product','unused');assert.ok(f.c.getProduct('unused'));assert.match(f.messages.at(-1),/пароль/);
});
test('employees including administrators cannot delete themselves, including direct confirmation',async()=>{
 const f=adminDeletionFixture(),before=JSON.stringify(f.state.employees);await f.c.confirmDeleteEmployee('admin');assert.equal(JSON.stringify(f.state.employees),before);assert.equal(f.writes.length,0);
 f.state.employees[0].role='employee';await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,2);assert.equal(f.writes.length,0);
});
test('employee deletion uses POS confirmation and preserves shifts and receipts',async()=>{
 const f=adminDeletionFixture();let modal='';f.c.showModal=h=>modal=h;f.c.deleteEmployee('other');assert.match(modal,/confirmDeleteEmployee/);assert.equal(f.state.employees.length,2);
 f.fields['employee-delete-password']={value:html.match(/function confirmDelete[\s\S]*?pass!=='([^']+)'/)[1]};const shifts=JSON.stringify(f.state.shifts),orders=JSON.stringify(f.state.orders);await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,1);assert.deepEqual(f.writes,['prilavok_employees']);assert.equal(JSON.stringify(f.state.shifts),shifts);assert.equal(JSON.stringify(f.state.orders),orders);
});
test('employee deletion failure leaves local state intact',async()=>{
 const f=adminDeletionFixture();f.fields['employee-delete-password']={value:html.match(/function confirmDelete[\s\S]*?pass!=='([^']+)'/)[1]};f.c.localStorage.setItem=()=>{throw Error('quota');};await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,2);assert.match(f.messages.at(-1),/Не удалось/);
});


test('employee create and edit publish state only after durable local storage',async()=>{
 const f=fixture();f.state.employees=[];Object.assign(f.fields,{'ef-name':{value:' Иванов Иван '},'ef-phone':{value:'+375291112233'},'ef-admin':{checked:false},'ef-admin-password':{value:''},'employee-save-confirm':{disabled:false}});
 let closed=0,rendered=0;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;
 assert.equal(await f.c.saveEmployee(),true);assert.equal(f.state.employees.length,1);assert.deepEqual(f.writes,['prilavok_employees']);assert.equal(closed,1);assert.equal(rendered,1);
 const id=f.state.employees[0].id;f.state.employees[0].legacyNote='keep';f.fields['ef-name'].value='Иванов Иван Иванович';f.fields['ef-phone'].value='+375292223344';
 assert.equal(await f.c.saveEmployee(id),true);assert.equal(f.state.employees[0].legacyNote,'keep');assert.equal(JSON.parse(f.data.get('prilavok_employees'))[0].legacyNote,'keep');assert.equal(f.state.employees[0].name,'Иванов Иван Иванович');
});
test('employee storage failure preserves prior state and does not report success',async()=>{
 for(const mode of ['create','edit']){
  const f=fixture();f.state.employees=[{id:'one',name:'Старое имя',phone:'1',role:'employee',legacyNote:'keep'}];const before=JSON.stringify(f.state.employees);
  Object.assign(f.fields,{'ef-name':{value:'Новое имя'},'ef-phone':{value:'2'},'ef-admin':{checked:false},'ef-admin-password':{value:''},'employee-save-confirm':{disabled:false}});
  let closed=0,rendered=0;f.c.closeModal=()=>closed++;f.c.render=()=>rendered++;f.c.localStorage.setItem=()=>{throw Error('quota')};
  assert.equal(await f.c.saveEmployee(mode==='edit'?'one':''),false);assert.equal(JSON.stringify(f.state.employees),before);assert.equal(closed,0);assert.equal(rendered,0);assert.equal(f.fields['employee-save-confirm'].disabled,false);assert.match(f.messages.at(-1),/Не удалось сохранить сотрудника/);
 }
});
test('administrator role changes still require the existing password',async()=>{
 const f=fixture();f.state.employees=[{id:'one',name:'Сотрудник',phone:'',role:'employee'}];Object.assign(f.fields,{'ef-name':{value:'Сотрудник'},'ef-phone':{value:''},'ef-admin':{checked:true},'ef-admin-password':{value:'wrong'},'employee-save-confirm':{disabled:false}});
 assert.equal(await f.c.saveEmployee('one'),false);assert.equal(f.state.employees[0].role,'employee');assert.equal(f.writes.length,0);assert.match(f.messages.at(-1),/верный пароль/);
 f.fields['ef-admin-password'].value='Rom23061998';assert.equal(await f.c.saveEmployee('one'),true);assert.equal(f.state.employees[0].role,'admin');assert.deepEqual(f.writes,['prilavok_employees']);
});
test('repeated employee save while storage is pending cannot create duplicates',async()=>{
 const f=fixture();f.state.employees=[];Object.assign(f.fields,{'ef-name':{value:'Новый сотрудник'},'ef-phone':{value:''},'ef-admin':{checked:false},'ef-admin-password':{value:''},'employee-save-confirm':{disabled:false}});
 const first=f.c.saveEmployee(),second=f.c.saveEmployee();assert.equal(f.fields['employee-save-confirm'].disabled,true);assert.equal(f.state.employees.length,0);assert.equal(await second,false);assert.equal(await first,true);assert.equal(f.state.employees.length,1);assert.deepEqual(f.writes,['prilavok_employees']);
});

function navigationFixture(){const f=fixture();f.state.products=[{id:'a',name:'А',category:'Пицца',type:'simple',stock:10,price:5,sortOrder:0},{id:'b',name:'Б',category:'Пицца',type:'simple',stock:10,price:6,sortOrder:1},{id:'c',name:'В',category:'Пицца',type:'simple',stock:10,sortOrder:2}];f.fields['modal-root']={innerHTML:''};f.fields['pos-folder-grid']={dataset:{},addEventListener:()=>{}};f.c.closeModal=()=>{f.c._posFolderModal=null;f.fields['modal-root'].innerHTML='';};f.state.posPath='Пицца';f.state.posFolder='';f.state.editMode=true;f.fields['pos-folder-name']={value:'Популярное'};return f;}
test('navigation folders persist without changing products and restore after restart',async()=>{
 const f=navigationFixture(),before=JSON.stringify(f.state.products);await f.c.savePosFolder();const folder=f.state.posNavigation.categories[0].items.find(i=>i.type==='folder');assert.ok(folder);await f.c.movePosProduct('a',folder.id);assert.equal(JSON.stringify(f.state.products),before);assert.ok(f.writes.every(k=>k==='prilavok_posNavigation'));assert.equal(f.c.posVisibleCategoryItems().filter(i=>i.type==='product').length,2);
 f.c.openPosFolder(folder.id);assert.equal(f.c.posVisibleCategoryItems()[0].id,'a');f.c.closePosCategory();assert.equal(f.state.posPath,'Пицца');assert.equal(f.state.posFolder,'');
 const g=navigationFixture();g.data.set('prilavok_products',JSON.stringify(f.state.products));g.data.set('prilavok_posNavigation',f.data.get('prilavok_posNavigation'));await g.c.loadAll();assert.equal(g.c.posCategoryItems('Пицца').find(i=>i.id==='a').parentId,folder.id);
});
test('category tile ordering is scoped and folder deletion returns products to root',async()=>{
 const f=navigationFixture();await f.c.reorderPosCategoryTile('product','c',0);assert.deepEqual(plain(f.c.posVisibleCategoryItems().map(i=>i.id)),['c','a','b']);await f.c.savePosFolder();const folder=f.state.posNavigation.categories[0].items.find(i=>i.type==='folder');await f.c.movePosProduct('a',folder.id);await f.c.movePosProduct('b',folder.id);f.c.openPosFolder(folder.id);await f.c.reorderPosCategoryTile('product','b',0);assert.deepEqual(plain(f.c.posVisibleCategoryItems().map(i=>i.id)),['b','a']);await f.c.removePosFolder(folder.id);assert.equal(f.c.posCategoryItems('Пицца').length,3);assert.ok(f.c.posCategoryItems('Пицца').every(i=>i.parentId===''));assert.equal(f.state.products.length,3);
});
test('navigation handles old or invalid state, missing products and orphaned folders',()=>{
 const f=navigationFixture();assert.deepEqual(plain(f.c.normalizePosNavigation(null)),{version:1,categories:[]});f.state.posNavigation={version:1,categories:[{category:'Пицца',items:[{type:'product',id:'a',parentId:'gone'},{type:'product',id:'deleted',parentId:''},{type:'product',id:'a',parentId:''}]}]};const items=f.c.posCategoryItems('Пицца');assert.equal(items.length,3);assert.equal(items[0].parentId,'');assert.equal(new Set(items.map(i=>i.id)).size,3);
 f.state.products[0].category='Напитки';assert.ok(!f.c.posCategoryItems('Пицца').some(i=>i.id==='a'));assert.equal(f.c.posCategoryItems('Напитки')[0].parentId,'');
});
test('failed folder persistence leaves navigation and inventory unchanged',async()=>{
 const f=navigationFixture(),before=JSON.stringify(f.state);f.c.localStorage.setItem=()=>{throw Error('quota');};await f.c.savePosFolder();assert.equal(JSON.stringify(f.state),before);assert.match(f.messages.at(-1),/Не удалось сохранить/);
});
test('folder navigation is non-selling in edit mode and normal products still add to cart',async()=>{
 const f=navigationFixture();await f.c.savePosFolder();const id=f.state.posNavigation.categories[0].items.find(i=>i.type==='folder').id;await f.c.movePosProduct('a',id);f.state.editMode=false;
 const event=(type,id)=>({target:{closest:selector=>selector==='.layout-tile'?{dataset:{tileType:type,id}}:null}});
 f.c.handlePosGridClick(event('folder',id));assert.equal(f.state.posFolder,'');assert.equal(f.c._posFolderModal.id,id);assert.equal(f.state.cart.length,0);f.c.handlePosGridClick(event('product','a'));assert.equal(f.state.cart[0].productId,'a');
 f.state.editMode=true;let moved=false;f.c.openPosTileMove=()=>{moved=true;};f.c.handlePosGridClick(event('product','a'));assert.ok(moved);assert.equal(f.state.cart[0].qty,1);
});
test('category UI exposes layout controls and folder contents without root tile removal',async()=>{
 const f=navigationFixture();await f.c.savePosFolder();const html=f.c.renderPosScreen(f.c.currentShift());assert.match(html,/Создать папку/);assert.match(html,/data-tile-type="folder"/);assert.match(html,/category-edit-grid/);assert.ok(!html.includes('removeLayoutTile(undefined)'));
});

test('workspace search uses hidden state and restores every tile',()=>{
 const f=fixture(),tiles=[
  {dataset:{tileType:'product',id:'flour'},hidden:false},
  {dataset:{tileType:'product',id:'water'},hidden:false},
  {dataset:{tileType:'category',id:'Сырьё'},hidden:false}
 ],grid={querySelectorAll:()=>tiles};
 f.c.document.getElementById=id=>id==='sections-wrap'?grid:null;
 f.c.onSearch('му');assert.deepEqual(tiles.map(tile=>tile.hidden),[false,true,true]);
 f.c.onSearch('');assert.deepEqual(tiles.map(tile=>tile.hidden),[false,false,false]);
});

test('category drag drop delegates correct target and cancelled drag does not save',()=>{
 const f=navigationFixture();let call=null;f.c.reorderPosCategoryTile=(...args)=>{call=args;};f.c.gridMetrics=()=>({cols:4});const tile={dataset:{tileType:'product',id:'a'},releasePointerCapture:()=>{}},grid={querySelectorAll:()=>[]};
 const make=()=>({category:'Пицца',folder:'',tile,index:0,pointerId:1,dragging:true,target:{row:1,col:2},grid});f.c.dragTest=make();vm.runInContext('layoutDragState=dragTest',f.c);f.c.onLayoutPointerUp({pointerId:1,type:'pointerup',preventDefault:()=>{}});assert.deepEqual(call,['product','a',6]);
 call=null;f.c.dragTest=make();vm.runInContext('layoutDragState=dragTest',f.c);f.c.onLayoutPointerUp({pointerId:1,type:'pointercancel',preventDefault:()=>{}});assert.equal(call,null);assert.equal(f.writes.length,0);
});
test('backup export includes versioned navigation and legacy backups normalize to empty folders',async()=>{
 const f=navigationFixture();await f.c.savePosFolder();let saved;f.c.Blob=class{constructor(parts){saved=JSON.parse(parts[0]);}};f.c.URL={createObjectURL:()=>'',revokeObjectURL:()=>{}};f.c.document.createElement=()=>({click:()=>{}});await f.c.exportBackup();assert.equal(saved.version,13);assert.equal(saved.posNavigation.version,1);assert.ok(saved.posNavigation.categories[0].items.some(i=>i.type==='folder'));assert.equal(f.c.normalizePosNavigation(undefined).categories.length,0);
});

test('folder modal leaves category visible and renders six products without folder icon or counter',async()=>{
 const f=navigationFixture();for(let n=3;n<6;n++)f.state.products.push({id:'p'+n,name:'Товар '+n,type:'simple',category:'Пицца',stock:3,price:1});await f.c.savePosFolder();const id=f.state.posNavigation.categories[0].items.find(i=>i.type==='folder').id;for(const p of f.state.products)await f.c.movePosProduct(p.id,id);
 f.state.editMode=false;const before=f.c.renderPosScreen(f.c.currentShift());const folderTile=before.slice(before.indexOf('data-tile-type="folder"'),before.indexOf('</div></div></div>',before.indexOf('data-tile-type="folder"'))+18);assert.ok(!folderTile.includes('<svg'));assert.ok(!folderTile.includes('Папка ·'));
 f.c.openPosFolder(id);assert.equal(f.state.posPath,'Пицца');assert.equal(f.state.posFolder,'');const html=f.fields['modal-root'].innerHTML;assert.match(html,/pos-folder-modal/);assert.equal((html.match(/data-tile-type="product"/g)||[]).length,6);assert.match(html,/Закрыть/);f.c.closeModal();assert.equal(f.c._posFolderModal,null);assert.equal(f.state.posPath,'Пицца');
});

test('employee deletion requires password for both administrator and ordinary operator',async()=>{
 for(const role of ['admin','employee']){const f=adminDeletionFixture();f.state.employees[0].role=role;await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,2);f.fields['employee-delete-password']={value:'wrong'};await f.c.confirmDeleteEmployee('other');assert.equal(f.writes.length,0);f.fields['employee-delete-password'].value=html.match(/function confirmDelete[\s\S]*?pass!=='([^']+)'/)[1];await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,1);}
});
test('administrator target is protected even with valid password; settings show aligned controls',async()=>{
 const f=adminDeletionFixture();f.state.employees[1].role='admin';f.fields['employee-delete-password']={value:html.match(/function confirmDelete[\s\S]*?pass!=='([^']+)'/)[1]};await f.c.confirmDeleteEmployee('other');assert.equal(f.state.employees.length,2);assert.equal(f.writes.length,0);const view=f.c.renderSettingsScreen();assert.match(view,/employee-settings-row/);assert.equal((view.match(/employee-settings-edit/g)||[]).length,2);assert.equal((view.match(/Информация об администраторе/g)||[]).length,2);
});

test('employee list abbreviation preserves full names and handles missing patronymic',()=>{
 const f=fixture();assert.equal(f.c.employeeDisplayName('  Иванов   Иван Иванович  '),'Иванов И. И.');assert.equal(f.c.employeeDisplayName('Петров Пётр'),'Петров П.');assert.equal(f.c.employeeDisplayName('Анна'),'Анна');assert.equal(f.c.employeeDisplayName(''),'');
 f.state.employees=[{id:'one',name:'Иванов Иван Иванович',role:'employee'}];const html=f.c.renderSettingsScreen();assert.match(html,/Иванов И\. И\./);assert.equal(f.state.employees[0].name,'Иванов Иван Иванович');
});
test('folder products render same escaped sticker as main workspace',async()=>{
 const f=navigationFixture();f.state.products[0].tileSymbol='<&';await f.c.savePosFolder();const id=f.state.posNavigation.categories[0].items.find(i=>i.type==='folder').id;await f.c.movePosProduct('a',id);f.state.editMode=false;f.c.openPosFolder(id);
 const sticker=f.c.renderProductTileSymbol(f.state.products[0]);assert.equal(sticker,'<div class="tile-symbol">&lt;&amp;</div>');assert.ok(f.fields['modal-root'].innerHTML.includes(sticker));assert.equal(f.c.renderProductTileSymbol({}), '');
});

test('availability uses persisted products and nested recipes, sends no catalogue or prices',async()=>{
 const f=fixture();f.state.loaded=true;
 await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://backend.test',deviceKey:'test'});
 f.c.getProduct('flour').stock=0; // unsaved edit must not be sent
 let body;f.c.fetch=async(url,options)=>{assert.match(url,/availability\/snapshot$/);body=JSON.parse(options.body);assert.ok(f.data.has('prilavok_webAvailabilityRevision'));return {ok:true};};
 assert.equal(await f.c.publishAvailability(),true);assert.equal(body.items.find(i=>i.externalId==='pizza').quantity,50);assert.deepEqual(Object.keys(body.items[0]).sort(),['externalId','quantity']);assert.equal(f.c.getProduct('flour').stock,0);
});
test('availability never sends on storage failure, while hidden or before load',async()=>{
 for(const mode of ['hidden','unloaded','storage']){
  const f=fixture();f.state.loaded=mode!=='unloaded';f.c.document.hidden=mode==='hidden';await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});
  if(mode==='storage')f.c.localStorage.setItem=()=>{throw Error('full')};
  let calls=0;f.c.fetch=async()=>{calls++;return {ok:true}};assert.equal(await f.c.publishAvailability(),false);assert.equal(calls,0);
 }
});
test('availability timeout or network failure leaves POS state and products untouched',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});
 const before=JSON.stringify(f.state);f.c.fetch=async()=>{throw Error('offline')};assert.equal(await f.c.publishAvailability(),false);assert.equal(JSON.stringify(f.state),before);assert.equal(JSON.parse(f.data.get('prilavok_products'))[0].stock,10);
});
test('availability revision increases across restart and backwards clock',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});await f.c.saveKey('webAvailabilityRevision',Date.now()+100000);
 const revisions=[];f.c.fetch=async(_,o)=>{revisions.push(JSON.parse(o.body).revision);return {ok:true}};await f.c.publishAvailability();await f.c.publishAvailability();assert.equal(revisions.length,2);assert.equal(revisions[1],revisions[0]+1);
});
test('availability distinguishes untracked, zero and broken recipes',()=>{
 const f=fixture();f.state.products.push({id:'untracked',type:'simple',noStockTracking:true},{id:'broken',type:'composite',components:[{productId:'missing',qty:1}]});f.c.getProduct('flour').stock=-1;
 const items=f.c.buildAvailabilityItems(f.state.products);assert.equal(items.find(i=>i.externalId==='untracked').quantity,null);assert.equal(items.find(i=>i.externalId==='flour').quantity,0);assert.equal(items.find(i=>i.externalId==='broken').quantity,0);
});
test('reviewed availability refreshes after foreground using persisted stock without catalogue sync',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});
 const urls=[];f.c.fetch=async url=>{urls.push(url);return {ok:true}};
 f.c.onAvailabilityAppState(false);assert.equal(urls.length,0);
 f.c.onAvailabilityAppState(true);await f.c.publishAvailability();
 assert.ok(urls.length>0);assert.ok(urls.every(url=>url==='https://test/api/availability/snapshot'));
 assert.match(availabilityScript,/addEventListener\('online'/);assert.match(availabilityScript,/addEventListener\('visibilitychange'/);
 assert.doesNotMatch(inline,/startAvailabilitySchedule|AVAILABILITY_INTERVAL/);
});
test('availability coalesces an overlapping mutation and sends the newest persisted stock',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});
 const bodies=[];let releaseFirst;const firstGate=new Promise(resolve=>{releaseFirst=resolve});f.c.fetch=async(_url,options)=>{bodies.push(JSON.parse(options.body));if(bodies.length===1)await firstGate;return {ok:true}};
 const first=f.c.publishAvailability();for(let i=0;i<12&&bodies.length===0;i++)await Promise.resolve();assert.equal(bodies.length,1);
 const next=plain(f.state.products);next.find(p=>p.id==='flour').stock=4;await f.c.saveKey('products',next);const second=f.c.publishAvailability();releaseFirst();assert.equal(await first,true);assert.equal(await second,true);
 assert.equal(bodies.length,2);assert.equal(bodies[1].items.find(item=>item.externalId==='flour').quantity,4);assert.ok(bodies[1].revision>bodies[0].revision);
});
test('availability retains WEB settlement through failure and clears it only after success',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});const bodies=[];let fail=true;
 f.c.fetch=async(_url,options)=>{bodies.push(JSON.parse(options.body));if(fail)throw Error('offline');return {ok:true}};
 assert.equal(await f.c.publishAvailability(['web-order-1']),false);fail=false;assert.equal(await f.c.publishAvailability(),true);assert.deepEqual(bodies.map(body=>body.settledWebOrderIds),[['web-order-1'],['web-order-1']]);
 await f.c.publishAvailability();assert.deepEqual(bodies.at(-1).settledWebOrderIds,[]);
});
test('availability restores WEB settlements from durable paid receipts after restart',async()=>{
 const f=fixture();f.state.loaded=true;await f.c.saveKey('products',f.state.products);await f.c.saveKey('network',{backendUrl:'https://test',deviceKey:'test'});await f.c.saveKey('orders',[{id:'receipt-1',webOrderId:'web-order-1',timestamp:10},{id:'receipt-2',webOrderId:'web-order-2',timestamp:20},{id:'local',timestamp:30}]);let body;
 f.c.fetch=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true}};
 assert.equal(await f.c.publishAvailability(),true);assert.deepEqual(plain(body.settledWebOrderIds),['web-order-2','web-order-1']);
});
function webAcceptFixture(){const f=fixture();f.state.network={backendUrl:'https://test',deviceKey:'test'};f.state.webEvents=[{id:'web-1',external_id:'WEB-1',total:10,order_items:[{external_product_id:'pizza',product_name:'Пицца',quantity:1,price:10}]}];return f;}
test('incoming WEB EventSource persists orders without invoking catalog or availability upload',async()=>{
 const f=fixture(),sources=[];f.state.network={backendUrl:'https://test/',deviceKey:'secret key'};let fetches=0;f.c.fetch=async()=>{fetches++;throw Error('outgoing request is forbidden')};f.c.EventSource=class{constructor(url){this.url=url;sources.push(this)}close(){this.closed=true}};
 f.c.startWebOrderEvents();assert.equal(sources[0].url,'https://test/api/orders/events?deviceKey=secret%20key');await sources[0].onmessage({data:JSON.stringify({type:'orders',orders:[{id:'web-2',external_id:'WEB-2',status:'new',total:12,order_items:[]}]})});assert.equal(fetches,0);assert.equal(f.state.webEvents[0].id,'web-2');assert.equal(JSON.parse(f.data.get('prilavok_webEvents'))[0].id,'web-2');
 f.c.startWebOrderEvents();assert.equal(sources[0].closed,true);assert.equal(sources.length,2);
});
test('owner live report is calculated from the open shift and returned through the existing event stream',async()=>{
 const f=fixture(),sources=[];f.state.network={backendUrl:'https://backend.test',deviceKey:'device-key'};f.state.shifts=[{id:'shift-1',status:'open',openedAt:100,employeeName:'Анна'}];f.state.products=[{id:'pizza',name:'Маргарита',category:'Пицца'}];f.state.orders=[{id:'order-1',shiftId:'shift-1',total:30,payments:[{method:'cash',amount:10},{method:'card',amount:20}],items:[{productId:'pizza',name:'Маргарита',category:'Пицца',qty:2,price:15}]}];let request;f.c.fetch=async(url,options)=>{request={url,options};return{ok:true}};f.c.EventSource=class{constructor(){sources.push(this)}close(){}};f.c.startWebOrderEvents();
 await sources[0].onmessage({data:JSON.stringify({type:'owner_live_report_request',requestId:'request_12345678901234567890'})});const report=JSON.parse(request.options.body).report;
 assert.equal(request.url,'https://backend.test/api/device/live-report/request_12345678901234567890');assert.equal(request.options.headers['X-Device-Key'],'device-key');assert.equal(report.shiftOpen,true);assert.equal(report.revenue,30);assert.equal(report.cash,10);assert.equal(report.card,20);assert.equal(report.orders,1);assert.deepEqual(plain(report.categories),[{name:'Пицца',quantity:2,revenue:30}]);assert.deepEqual(plain(report.products),[{name:'Маргарита',quantity:2,revenue:30}]);
});
test('Telegram settings persist locally before registering the backend work-device alert',async()=>{
 const f=fixture();f.c.currentShiftEmployeeIsAdmin=()=>true;f.state.network={backendUrl:'https://backend.test/',deviceKey:'device-key'};let request;f.c.fetch=async(url,options)=>{const stored=JSON.parse(f.data.get('prilavok_telegram'));assert.equal(stored.deviceChatId,'900000001');request={url,options};return{ok:true}};Object.assign(f.fields,{
  'telegram-enabled':{checked:true},'telegram-token':{value:'token'},'telegram-chat-id':{value:'-1001'},'telegram-thread-id':{value:'12'},'telegram-device-chat-id':{value:'900000001'},'telegram-owner-chat-id':{value:'700000001'},'telegram-online-orders':{checked:true},'telegram-shift-opened':{checked:true},'telegram-shift-closed':{checked:true},'telegram-monthly-warehouse':{checked:false}
 });
 assert.equal(await f.c.saveTelegramSettings(false),true);const stored=JSON.parse(f.data.get('prilavok_telegram'));
 assert.equal(stored.chatId,'-1001');assert.equal(stored.threadId,'12');assert.equal(stored.deviceChatId,'900000001');assert.equal(stored.ownerChatId,'700000001');assert.equal(stored.notifyOnlineOrders,true);
 assert.equal(request.url,'https://backend.test/api/device/telegram-settings');assert.equal(request.options.headers['X-Device-Key'],'device-key');assert.deepEqual(JSON.parse(request.options.body),{chatId:'900000001',ownerChatId:'700000001',enabled:true});
});
test('Telegram settings reject an invalid work-device ID before local or backend persistence',async()=>{
 const f=fixture();f.c.currentShiftEmployeeIsAdmin=()=>true;f.state.network={backendUrl:'https://backend.test',deviceKey:'device-key'};let fetches=0;f.c.fetch=async()=>{fetches++;return{ok:true}};const before=f.data.get('prilavok_telegram');Object.assign(f.fields,{
  'telegram-enabled':{checked:true},'telegram-token':{value:'token'},'telegram-chat-id':{value:''},'telegram-thread-id':{value:''},'telegram-device-chat-id':{value:'owner'},'telegram-online-orders':{checked:true},'telegram-shift-opened':{checked:true},'telegram-shift-closed':{checked:true},'telegram-monthly-warehouse':{checked:false}
 });
 assert.equal(await f.c.saveTelegramSettings(false),false);assert.equal(f.data.get('prilavok_telegram'),before);assert.equal(fetches,0);assert.match(f.messages.at(-1),/ID рабочего устройства/);
});
test('Telegram settings reject an invalid owner ID before local or backend persistence',async()=>{
 const f=fixture();f.c.currentShiftEmployeeIsAdmin=()=>true;let fetches=0;f.c.fetch=async()=>{fetches++;return{ok:true}};Object.assign(f.fields,{
  'telegram-enabled':{checked:false},'telegram-token':{value:''},'telegram-chat-id':{value:''},'telegram-thread-id':{value:''},'telegram-device-chat-id':{value:''},'telegram-owner-chat-id':{value:'owner'},'telegram-online-orders':{checked:false},'telegram-shift-opened':{checked:false},'telegram-shift-closed':{checked:false},'telegram-monthly-warehouse':{checked:false}
 });
 assert.equal(await f.c.saveTelegramSettings(false),false);assert.equal(fetches,0);assert.match(f.messages.at(-1),/ID владельца/);
});
test('Telegram backend registration failure keeps the local opt-in available for retry',async()=>{
 const f=fixture();f.c.currentShiftEmployeeIsAdmin=()=>true;f.state.network={backendUrl:'https://backend.test',deviceKey:'device-key'};f.c.fetch=async()=>{throw Error('offline')};Object.assign(f.fields,{
  'telegram-enabled':{checked:true},'telegram-token':{value:'token'},'telegram-chat-id':{value:''},'telegram-thread-id':{value:''},'telegram-device-chat-id':{value:'900000001'},'telegram-online-orders':{checked:true},'telegram-shift-opened':{checked:true},'telegram-shift-closed':{checked:true},'telegram-monthly-warehouse':{checked:false}
 });
 assert.equal(await f.c.saveTelegramSettings(false),false);assert.equal(JSON.parse(f.data.get('prilavok_telegram')).notifyOnlineOrders,true);assert.match(f.messages.at(-1),/серверные настройки Telegram не обновлены/);
});
test('WEB order storage failure keeps prior runtime state',async()=>{
 const f=fixture(),sources=[];f.state.network={backendUrl:'https://test',deviceKey:'key'};f.state.webEvents=[{id:'old',status:'new'}];f.c.EventSource=class{constructor(){sources.push(this)}close(){}};f.c.localStorage.setItem=()=>{throw Error('disk full')};f.c.startWebOrderEvents();await sources[0].onmessage({data:JSON.stringify({type:'orders',orders:[{id:'web-2',status:'new',order_items:[]}]})});
 assert.deepEqual(plain(f.state.webEvents),[{id:'old',status:'new'}]);
});
test('catalog endpoint is called only by explicit manual menu synchronization',async()=>{
 const f=fixture();Object.assign(f.fields,{'network-backend-url':{value:'https://backend.test/'},'network-device-name':{value:'Касса'}});f.c.currentShiftEmployeeIsAdmin=()=>true;let request,availability=0;f.c.publishAvailability=async()=>{availability++;return true};f.c.fetch=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({categories:2,products:4})}};
 assert.equal((html.match(/\/api\/menu\/sync/g)||[]).length,1);f.c.buildMenuSyncPayload();assert.equal(request,undefined);await f.c.syncMenuToBackend();assert.equal(request.url,'https://backend.test/api/menu/sync');assert.equal(request.options.method,'POST');assert.equal(JSON.parse(request.options.body).products.length,f.state.products.length);assert.equal(availability,1);assert.match(f.c.renderNetworkScreen(),/onclick="syncMenuToBackend\(\)"/);
});
test('WEB acceptance checks aggregate ingredient availability before any network request',async()=>{
 const f=webAcceptFixture();f.c.getProduct('flour').stock=.3;f.state.webEvents[0].order_items.push({external_product_id:'flour',product_name:'Мука',quantity:.2,price:2});await f.c.acceptWebOrder('web-1','15m');assert.equal(f.state.parked.length,0);assert.match(f.messages.join(' '),/Недостаточно остатка/);
});
test('WEB acceptance rejects missing IDs instead of silently dropping lines or matching a renamed product',async()=>{
 const f=webAcceptFixture();f.state.webEvents[0].order_items[0].external_product_id='deleted';await f.c.acceptWebOrder('web-1','15m');assert.equal(f.state.parked.length,0);assert.match(f.messages.join(' '),/не найден/);
});
test('WEB acceptance persists locally before network and retries without duplicating even after consumption',async()=>{
 const f=webAcceptFixture();let attempts=0;f.c.fetch=async()=>{attempts++;assert.equal(JSON.parse(f.data.get('prilavok_parked')).length,1);assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances'))['web-1'].stage,'local');if(attempts===1)throw Error('offline');return {ok:true,json:async()=>({ok:true})}};
 await f.c.acceptWebOrder('web-1','15m');assert.equal(f.state.parked.length,1);f.state.parked=[];await f.c.saveKey('parked',[]);f.c.fetch=async()=>({ok:true,json:async()=>({ok:true})});await f.c.acceptWebOrder('web-1','15m');assert.equal(f.state.parked.length,0);assert.equal(f.state.webEvents.length,0);assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances'))['web-1'].stage,'confirmed');
});
test('WEB local write failure never sends confirmation',async()=>{
 const f=webAcceptFixture();f.c.localStorage.setItem=()=>{throw Error('disk full')};let calls=0;f.c.fetch=async()=>{calls++};await f.c.acceptWebOrder('web-1','15m');assert.equal(calls,0);assert.equal(f.state.parked.length,0);
});
test('prepared WEB acceptance recovers persisted parked row on restart without another copy',async()=>{
 const f=webAcceptFixture();const parked={id:'p',webOrderId:'web-1',items:[]};f.state.parked=[parked];await f.c.saveKey('webOrderAcceptances',{'web-1':{stage:'prepared',readyEstimate:'15m',parked}});await f.c.recoverWebAcceptanceJournal();assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances'))['web-1'].stage,'local');assert.equal(f.state.parked.length,1);
});
test('recovered WEB ACK clears stale event without duplicating parked order',async()=>{
 const f=webAcceptFixture();const parked={id:'p',webOrderId:'web-1',items:[]};f.state.parked=[parked];await f.c.saveKey('parked',f.state.parked);await f.c.saveKey('webOrderAcceptances',{'web-1':{stage:'local',readyEstimate:'15m',parked}});
 f.c.fetch=async()=>({ok:true,json:async()=>({ok:true})});await f.c.recoverWebAcceptanceJournal();
 assert.equal(f.state.parked.length,1);assert.equal(f.state.webEvents.length,0);assert.deepEqual(JSON.parse(f.data.get('prilavok_webEvents')),[]);
 assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances'))['web-1'].stage,'confirmed');
});
test('legacy WEB acceptance waits for a persisted ready time and never duplicates its parked order',async()=>{
 const f=webAcceptFixture(),parked={id:'p',webOrderId:'web-1',receiptDisplayNumber:'#WEB-1',items:[]};f.state.parked=[parked];f.fields['modal-root']={innerHTML:''};await f.c.saveKey('parked',f.state.parked);await f.c.saveKey('webOrderAcceptances',{'web-1':{stage:'local',parked}});
 let calls=0;f.c.fetch=async()=>{calls++;return {ok:true,json:async()=>({ok:true})}};await f.c.recoverWebAcceptanceJournal();assert.equal(calls,0);assert.match(f.fields['modal-root'].innerHTML,/Укажите время готовности/);assert.equal(f.state.parked.length,1);
 f.fields['modal-root'].innerHTML='';await f.c.recoverWebAcceptanceJournal();assert.equal(f.fields['modal-root'].innerHTML,'');assert.equal(calls,0);
 assert.equal(await f.c.saveLegacyWebReadyEstimate('web-1','15m'),true);const journal=JSON.parse(f.data.get('prilavok_webOrderAcceptances'));assert.equal(journal['web-1'].readyEstimate,'15m');assert.equal(journal['web-1'].stage,'confirmed');assert.equal(calls,1);assert.equal(f.state.parked.length,1);assert.equal(f.state.webEvents.length,0);
});
test('legacy WEB acceptance persists ready time before its network retry',async()=>{
 const f=webAcceptFixture(),parked={id:'p',webOrderId:'web-1',items:[]};f.state.parked=[parked];await f.c.saveKey('webOrderAcceptances',{'web-1':{stage:'local',parked}});
 f.c.fetch=async()=>{const journal=JSON.parse(f.data.get('prilavok_webOrderAcceptances'));assert.equal(journal['web-1'].readyEstimate,'at:18:45');throw Error('offline')};assert.equal(await f.c.saveLegacyWebReadyEstimate('web-1','at:18:45'),false);assert.equal(JSON.parse(f.data.get('prilavok_webOrderAcceptances'))['web-1'].readyEstimate,'at:18:45');assert.equal(f.state.parked.length,1);
});
test('WEB recovery removes a stale event whose acceptance was already confirmed',async()=>{
 const f=webAcceptFixture(),parked={id:'p',webOrderId:'web-1',items:[]};f.state.parked=[parked];await f.c.saveKey('webOrderAcceptances',{'web-1':{stage:'confirmed',readyEstimate:'15m',parked}});let calls=0;f.c.fetch=async()=>{calls++};await f.c.recoverWebAcceptanceJournal();assert.equal(calls,0);assert.equal(f.state.webEvents.length,0);assert.deepEqual(JSON.parse(f.data.get('prilavok_webEvents')),[]);
});

test('manual demand status is persisted and included in operational snapshot',async()=>{
 const f=fixture();
 f.c.setDemandOverload(true);
 assert.equal(f.state.demandOverload,true);
 assert.equal(JSON.parse(f.data.get('prilavok_demandOverload')),true);
 const snapshot=f.c.buildOperationalSnapshot(Date.UTC(2026,0,1,12,0,0));
 assert.deepEqual(plain(snapshot.demand),{overload:true});
 assert.equal('production' in snapshot,false);
 assert.equal('engineVersion' in snapshot,false);
 f.c.setDemandOverload(false);
 assert.equal(f.state.demandOverload,false);
 assert.deepEqual(plain(f.c.buildOperationalSnapshot().demand),{overload:false});
});

test('operational deterministic suite restores outbox and revision',()=>{
 const f=fixture();f.state.operationalRevision=41;f.state.operationalOutbox=[{id:'existing',type:'snapshot',payload:{revision:41},attempts:2,nextAttemptAt:9999}];
 const before=plain({revision:f.state.operationalRevision,outbox:f.state.operationalOutbox});
 const result=f.c.__runOperationalChannelTests();
 assert.ok(Array.isArray(result)&&result.length>0,'operational checks must be a non-empty array');
 assert.deepEqual(plain(result.filter(x=>!x.ok)),[],'all operational checks must pass');
 assert.deepEqual(plain({revision:f.state.operationalRevision,outbox:f.state.operationalOutbox}),before);
});
test('verified WEB customer survives local acceptance and resumes with loyalty identity',async()=>{
 const f=webAcceptFixture();f.state.webEvents[0].customer_id='verified-customer';f.state.webEvents[0].customer_name='Анна';f.state.webEvents[0].phone='+375291234567';f.c.fetch=async()=>({ok:true,json:async()=>({ok:true})});
 await f.c.acceptWebOrder('web-1','15m');assert.equal(f.state.parked[0].customer.id,'verified-customer');assert.equal(JSON.parse(f.data.get('prilavok_parked'))[0].customer.id,'verified-customer');
 let loaded;f.c.loadCustomerLoyalty=async id=>{loaded=id};f.state.cart=[];await f.c.resumeParked(f.state.parked[0].id);assert.equal(f.state.customer.id,'verified-customer');assert.equal(loaded,'verified-customer');assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).customer.id,'verified-customer');
 let sent;f.c.loyaltyApi=async(url,options)=>{sent={url,body:JSON.parse(options.body)};return {events:[]}};const order={id:'paid-1',customer:f.state.customer,items:f.state.cart};await f.c.publishPaidOrderLoyalty(order);assert.equal(sent.body.customerId,'verified-customer');assert.equal(sent.url,'/api/loyalty/sales');assert.equal(order.loyaltySync.status,'synced');
});
test('SSE normalization persists verified identity through acceptance, resume and paid loyalty',async()=>{
 const f=webAcceptFixture();const raw={...f.state.webEvents[0],status:'new',customer_id:'verified-customer',customer_name:'Анна',phone:'+375291234567',created_at:'2026-10-01T08:00:00Z'};
 // Reproduce a previously cached version of the same order without identity.
 f.state.webEvents=[{...raw,customer_id:''}];let stream;
 f.c.EventSource=function(){stream=this;this.close=()=>{}};
 f.c.startWebOrderEvents();await stream.onmessage({data:JSON.stringify({type:'orders',orders:[raw]})});
 assert.equal(f.state.webEvents[0].customer_id,'verified-customer');
 assert.equal(JSON.parse(f.data.get('prilavok_webEvents'))[0].customer_id,'verified-customer');
 // Reload the persisted event, then use real acceptance and resume functions.
 f.state.webEvents=JSON.parse(f.data.get('prilavok_webEvents'));f.c.fetch=async()=>({ok:true,json:async()=>({ok:true})});await f.c.acceptWebOrder('web-1','15m');
 assert.equal(f.state.parked[0].customer.id,'verified-customer');
 f.c.loadCustomerLoyalty=async()=>{};await f.c.resumeParked(f.state.parked[0].id);
 assert.equal(f.state.customer.id,'verified-customer');
 let payload;f.c.loyaltyApi=async(url,options)=>{payload=JSON.parse(options.body);return {events:[]}};
 await f.c.publishPaidOrderLoyalty({id:'paid',customer:f.state.customer,items:f.state.cart});assert.equal(payload.customerId,'verified-customer');
});
test('legacy WEB normalization remains compatible without a customer identity',()=>{const f=fixture();assert.equal(f.c.normalizeWebOrder({id:'old',order_items:[]}).customer_id,'')});
test('custom ready time is validated and retained for acceptance retry',async()=>{
 const f=webAcceptFixture();assert.equal(f.c.validWebReadyEstimate('at:18:45'),true);for(const v of ['custom','at:24:00','at:18:60',''])assert.equal(f.c.validWebReadyEstimate(v),false);
 let sent;f.c.fetch=async(url,options)=>{sent=JSON.parse(options.body);throw Error('offline')};await f.c.acceptWebOrder('web-1','at:18:45');assert.equal(sent.readyEstimate,'at:18:45');const journal=JSON.parse(f.data.get('prilavok_webOrderAcceptances'));assert.equal(journal['web-1'].readyEstimate,'at:18:45');f.c.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({ok:true})}};await f.c.confirmWebAcceptance('web-1',journal['web-1'],journal);assert.equal(sent.readyEstimate,'at:18:45');assert.equal(f.state.parked.length,1);
});
test('delivery payment requires explicit tariff, including configured free delivery',async()=>{
 const f=fixture();f.cart();f.state.orderType='Доставка';f.state.deliveryRates=[{name:'Бесплатно',amount:0},{name:'Город',amount:5}];f.state.deliveryFee=0;let prompted=0;f.c.openOrderSettings=()=>prompted++;
 f.c.openPaymentModal();assert.equal(prompted,1);await f.c.finalizePayment([{method:'cash',amount:10}]);assert.equal(f.state.orders.length,0);
 f.c.selectDeliveryFee(0);assert.equal(f.c.hasDeliveryTariff(),true);assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).deliveryTariffSelected,true);await f.c.finalizePayment([{method:'cash',amount:10}]);assert.equal(f.state.orders.length,1);
});
test('delivery selection is cleared on type switch and cannot use a deleted rate',()=>{
 const f=fixture();f.state.deliveryRates=[{amount:5}];f.state.orderType='Доставка';f.c.openOrderSettings=()=>{};f.c.selectDeliveryFee(5);assert.equal(f.c.hasDeliveryTariff(),true);f.state.deliveryRates=[];assert.equal(f.c.hasDeliveryTariff(),false);f.c.setOrderType('На месте');assert.equal(f.state.deliveryTariffSelected,false);assert.equal(f.c.hasDeliveryTariff(),true);f.c.setOrderType('Доставка');assert.equal(f.c.hasDeliveryTariff(),false);
});
test('parked delivery restores explicit tariff choice',async()=>{
 const f=fixture();f.state.deliveryRates=[{amount:5}];f.state.parked=[{id:'p',items:[{productId:'pizza',qty:1,price:10}],orderType:'Доставка',deliveryFee:5,deliveryTariffSelected:true,customer:{}}];await f.c.resumeParked('p');assert.equal(f.c.hasDeliveryTariff(),true);assert.equal(JSON.parse(f.data.get('prilavok_currentOrderSession')).deliveryTariffSelected,true);
});
test('editing readiness time saves without remounting the picker and rejects incomplete values',()=>{
 const f=webAcceptFixture();f.fields['web-order-accept']={disabled:true};let opened=0;f.c.openWebOrder=()=>opened++;
 for(const value of ['18:30','19:30','19:45']){f.c.editWebReadyTime(value);assert.equal(opened,0);assert.equal(f.fields['web-order-accept'].disabled,false);assert.equal(vm.runInContext('selectedWebReadyEstimate',f.c),'at:'+value)}
 for(const value of ['','19:','24:00']){f.c.editWebReadyTime(value);assert.equal(opened,0);assert.equal(f.fields['web-order-accept'].disabled,true);assert.equal(vm.runInContext('selectedWebReadyEstimate',f.c),'custom')}
});

function liveStockFixture(){const f=fixture();for(const p of f.state.products)if(p.type==='simple')p.stockUnit='piece';return f;}
function installLivePosStock(f){vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-pos-stock.js'),'utf8'),f.c);}
function liveStockWorkspace(f,ids){f.state.layoutTiles=ids.map((id,col)=>({type:'product',id,col,row:0}));f.c.syncCategoryOrder=()=>{};f.state.posPath='';f.state.search='';f.state.editMode=false;f.c.renderCartPanel=()=>'';}
test('POS cards immediately project current cart stock and restore it on quantity decrease or removal',()=>{
 const f=liveStockFixture();liveStockWorkspace(f,['flour']);installLivePosStock(f);
 const warehouse=f.c.availableStock,products=JSON.stringify(f.state.products);
 assert.match(f.c.renderPosScreen(null),/Остаток: 10 шт/);
 f.cart('flour',2);assert.match(f.c.renderPosScreen(null),/Остаток: 8 шт/);
 f.cart('flour',1);assert.match(f.c.renderPosScreen(null),/Остаток: 9 шт/);
 f.state.cart=[];assert.match(f.c.renderPosScreen(null),/Остаток: 10 шт/);
 assert.strictEqual(f.c.availableStock,warehouse);assert.equal(f.c.availableStock(f.c.getProduct('flour')),10);
 assert.equal(JSON.stringify(f.state.products),products);assert.equal(f.writes.length,0);
});
test('POS projection consumes shared nested recipes and modifiers without changing warehouse validation',()=>{
 const f=liveStockFixture();liveStockWorkspace(f,['pizza','flour']);installLivePosStock(f);
 f.cart('pizza',2);f.state.cart[0].selectedModifiers=[{productId:'flour',qty:.5,name:'Дополнительная мука'}];
 const html=f.c.renderPosScreen(null);
 // 10 - (2 * .2 nested recipe + 2 * .5 modifier) = 8.6; floor(8.6/.2)=43 pizzas.
 assert.match(html,/Остаток: 8\.6 шт/);assert.match(html,/Доступно: 43/);
 near(f.c.getProduct('flour').stock,10);assert.equal(f.c.availableStock(f.c.getProduct('pizza')),50);
 assert.equal(f.c.canFulfillCart(),true);assert.equal(f.writes.length,0);
});
test('POS unlimited products and exhausted cards retain expected behavior',()=>{
 const f=liveStockFixture();f.state.products[0].noStockTracking=true;liveStockWorkspace(f,['flour','water']);installLivePosStock(f);
 f.cart('water',10);const html=f.c.renderPosScreen(null);
 assert.match(html,/Остаток: ∞/);assert.match(html,/pcard disabled/);assert.match(html,/Остаток: 0 шт/);
 assert.equal(f.c.getProduct('water').stock,10);
});
test('folder stock projection matches workspace and always restores warehouse availability',()=>{
 const f=navigationFixture();for(const p of f.state.products)p.stockUnit='piece';f.state.editMode=false;f.state.cart=[{productId:'a',qty:3}];
 f.state.posNavigation={version:1,categories:[{category:'Пицца',items:[{type:'folder',id:'folder',name:'Популярное',parentId:''},{type:'product',id:'a',parentId:'folder'}]}]};
 f.c._posFolderModal={category:'Пицца',id:'folder'};installLivePosStock(f);
 const warehouse=f.c.availableStock;f.c.renderPosFolderModal();assert.match(f.fields['modal-root'].innerHTML,/Остаток: 7 шт/);
 assert.strictEqual(f.c.availableStock,warehouse);assert.equal(f.c.availableStock(f.c.getProduct('a')),10);
 f.c.renderCartPanel=()=>{throw Error('render failed')};f.state.posPath='';assert.throws(()=>f.c.renderPosScreen(null),/render failed/);assert.strictEqual(f.c.availableStock,warehouse);
});
test('paid cart is deducted once and parked baskets retain reservations',async()=>{
 const f=liveStockFixture();liveStockWorkspace(f,['flour']);installLivePosStock(f);
 f.cart('flour',1);assert.match(f.c.renderPosScreen(null),/Остаток: 9 шт/);
 await f.c.finalizePayment([{method:'cash',amount:10}]);assert.equal(f.state.cart.length,0);assert.equal(f.c.getProduct('flour').stock,9);
 assert.match(f.c.renderPosScreen(null),/Остаток: 9 шт/);
 f.state.parked=[{items:[{productId:'flour',qty:3}]}];assert.match(f.c.renderPosScreen(null),/Остаток: 6 шт/);
});

// Android integration regressions: actual upstream storage/outbox, synthetic network only.
function integrationFixture(){
 const f=fixture(),timers=new Map(),statuses=[],requests=[];let timerId=0;
 f.state.loaded=true;f.state.network={backendUrl:'https://backend.test',deviceKey:'fixture-device'};
 f.c.URL=URL;f.c.currentShiftEmployeeIsAdmin=()=>true;
 f.c.setNetworkStatus=(id,message,kind)=>statuses.push({id,message,kind});
 f.c.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id};f.c.clearTimeout=id=>timers.delete(id);
 f.c.fetch=async(url,options)=>{requests.push({url,options});return{ok:true,status:200,json:async()=>({ok:true,applied:true,ignoredAsStale:false})}};
 vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-integrations.js'),'utf8'),f.c);
 return Object.assign(f,{timers,statuses,requests});
}
test('Android backend check validates the device key and displays rejection safely',async()=>{
 const f=integrationFixture();let restarted=0;f.c.startWebOrderEvents=()=>restarted++;f.c.operationalReconnect=()=>{};
 f.c.fetch=async(url)=>({ok:!url.endsWith('/state'),status:url.endsWith('/state')?401:200,json:async()=>({ok:true})});
 assert.equal(await f.c.testBackendConnection(),false);assert.equal(restarted,0);assert.match(f.messages.at(-1),/ключ устройства/);
 assert.ok(f.statuses.some(x=>x.kind==='error'));assert.doesNotMatch(f.messages.join(' '),/fixture-device/);
 f.c.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true})});
 assert.equal(await f.c.testBackendConnection(),true);assert.equal(restarted,1);assert.equal(f.timers.size,0);
});
test('Android order-channel check opens real SSE without creating orders or replacing live stream',async()=>{
 const f=integrationFixture(),sources=[],live={close(){throw Error('live stream must remain open')}};
 f.state.webEventsSource=live;const before=plain(f.state.webEvents);
 f.c.EventSource=class{constructor(url){this.url=url;sources.push(this)}close(){this.closed=true}};
 const pending=f.c.testWebOrder();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sources.length,1);assert.equal(sources[0].url,'https://backend.test/api/orders/events?deviceKey=fixture-device');
 sources[0].onopen();assert.equal(await pending,true);assert.equal(sources[0].closed,true);assert.equal(f.state.webEventsSource,live);
 assert.deepEqual(plain(f.state.webEvents),before);assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'https://backend.test/api/operational/state');assert.equal(f.requests[0].options.method,undefined);assert.equal(f.timers.size,0);
});
test('Android Telegram test uses saved settings outside modal and correlates native callback',async()=>{
 const f=integrationFixture(),sent=[];f.state.telegram={botToken:'fixture-token',chatId:'-123',threadId:'7'};
 f.c.webkit={messageHandlers:{telegram:{postMessage:payload=>sent.push(plain(payload))}}};
 const pending=f.c.testTelegramConnection();assert.equal(f.c.testTelegramConnection(),pending);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.length,1);assert.equal(sent[0].botToken,'fixture-token');assert.equal(sent[0].threadId,'7');
 f.c.__mposTelegramTestResult({requestId:'wrong',ok:true});assert.equal(f.timers.size,1);
 f.c.__mposTelegramTestResult({requestId:sent[0].requestId,ok:true,message:'Telegram подключён'});
 assert.equal(await pending,true);assert.equal(f.timers.size,0);assert.doesNotMatch(f.messages.join(' '),/fixture-token/);
});
test('Android Telegram empty draft is validated and timeout ignores late native response',async()=>{
 const f=integrationFixture(),sent=[];f.state.telegram={botToken:'fixture-token',chatId:'-123'};
 f.c.webkit={messageHandlers:{telegram:{postMessage:payload=>sent.push(plain(payload))}}};
 f.fields['telegram-token']={value:''};assert.equal(await f.c.testTelegramConnection(),false);assert.equal(sent.length,0);
 delete f.fields['telegram-token'];const pending=f.c.testTelegramConnection();await new Promise(resolve=>setImmediate(resolve));
 const timeout=[...f.timers.values()].find(x=>x.ms===35000);assert.ok(timeout);timeout.fn();assert.equal(await pending,false);assert.match(f.messages.at(-1),/не ответил вовремя/);
 const count=f.messages.length;f.c.__mposTelegramTestResult({requestId:sent[0].requestId,ok:true});assert.equal(f.messages.length,count);
});
test('Android demand upgrades revision and requires an applied acknowledgement',async()=>{
 const f=integrationFixture();f.state.operationalRevision=42;f.state.demandOverload=true;
 const item=f.c.queueOperationalSnapshot(1700000000000);assert.equal(item.payload.revision,1700000000000);
 f.fields['network-backend-url']={value:'https://unsaved.test'};
 f.c.fetch=async(url,options)=>{f.requests.push({url,options});assert.ok(f.data.has('prilavok_operationalOutbox'));return{ok:true,status:200,json:async()=>({ok:true,applied:false,ignoredAsStale:true})}};
 assert.equal(await f.c.flushOperationalOutbox(),false);assert.equal(f.state.operationalOutbox.length,1);assert.equal(f.state.operationalOutbox[0].attempts,1);
 assert.equal(f.requests[0].url,'https://backend.test/api/operational/snapshot');assert.match(f.messages.at(-1),/устаревшая ревизия/);assert.ok([...f.timers.values()].some(x=>x.ms>=1000&&x.ms<=60000));
 f.state.operationalOutbox[0].nextAttemptAt=0;f.c.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,applied:true,ignoredAsStale:false})});
 assert.equal(await f.c.flushOperationalOutbox(),true);assert.equal(f.state.operationalOutbox.length,0);assert.equal(f.timers.size,0);assert.match(f.messages.at(-1),/передано на сайт/);
});
test('Android persisted old demand outbox is upgraded before sending without changing demand',async()=>{
 const f=integrationFixture();const item={id:'old',type:'snapshot',payload:{schemaVersion:1,revision:4,demand:{overload:false}},attempts:0,nextAttemptAt:0};f.state.operationalOutbox=[item];
 assert.equal(await f.c.sendOperationalItem(item),true);const payload=JSON.parse(f.requests[0].options.body);
 assert.ok(payload.revision>=1000000000000);assert.equal(payload.demand.overload,false);assert.equal(JSON.parse(f.data.get('prilavok_operationalOutbox'))[0].payload.revision,payload.revision);
});
test('Android empty or background demand flush does not report a sync or start polling',async()=>{
 const f=integrationFixture();await f.c.flushOperationalOutbox();assert.equal(f.statuses.length,0);assert.equal(f.timers.size,0);
 f.c.queueOperationalSnapshot();f.c.document.hidden=true;assert.equal(await f.c.flushOperationalOutbox(),false);assert.equal(f.requests.length,0);assert.equal(f.timers.size,0);
});

function installAndroidAdmin(f){vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-admin.js'),'utf8'),f.c);}
test('Android hides admin entry for cashier shift and clears stale administrator screens',()=>{
 const f=fixture();f.state.employees=[{id:'cashier',name:'Кассир',role:'employee'}];f.state.shifts[0].employeeId='cashier';f.state.settingsAdminPanel=true;f.state.loyaltyAdminScreen=true;installAndroidAdmin(f);
 const markup=f.c.renderSettingsScreen();assert.doesNotMatch(markup,/onclick="openAdminPanel\(\)"/);assert.match(markup,/Резервная копия/);assert.match(markup,/onclick="setTab\('products'\)"/);assert.equal(f.state.settingsAdminPanel,false);assert.equal(f.state.loyaltyAdminScreen,false);assert.equal(f.c.renderAdminPanel(),'');assert.equal(f.writes.length,0);
});
test('Android administrator sees all five original actions with monochrome vector icons',()=>{
 const f=fixture();f.state.employees=[{id:'admin',name:'Администратор',role:'admin'}];f.state.shifts[0].employeeId='admin';installAndroidAdmin(f);
 assert.match(f.c.renderSettingsScreen(),/onclick="openAdminPanel\(\)"/);const panel=f.c.renderAdminPanel();
 for(const action of ['openLoyaltyAdminScreen()',"setTab('network')",'openCompanyDetailsModal()',"setTab('inventory')",'openWarehousePage()'])assert.ok(panel.includes(`onclick="${action}"`));
 assert.equal((panel.match(/class="android-admin-action"/g)||[]).length,5);assert.equal((panel.match(/class="android-admin-icon"/g)||[]).length,5);assert.match(panel,/stroke="currentColor"/);assert.doesNotMatch(panel,/\p{Extended_Pictographic}/u);assert.match(panel,/aria-hidden="true"/);assert.equal(f.writes.length,0);
});
test('Android hides admin entry after administrator shift closes',()=>{
 const f=fixture();f.state.employees=[{id:'admin',name:'Администратор',role:'admin'}];f.state.shifts[0].employeeId='admin';installAndroidAdmin(f);assert.match(f.c.renderSettingsScreen(),/openAdminPanel\(\)/);
 f.state.shifts[0].status='closed';assert.doesNotMatch(f.c.renderSettingsScreen(),/onclick="openAdminPanel\(\)"/);assert.equal(f.c.renderAdminPanel(),'');
});


test('park, restart, resume and delete preserve or release reservations without warehouse writes',async()=>{
 const f=liveStockFixture();liveStockWorkspace(f,['flour']);installLivePosStock(f);
 await f.c.PrilavokCore.Storage.set('products',f.state.products);await f.c.PrilavokCore.Storage.set('shifts',f.state.shifts);
 f.cart('flour',3);f.state.orderLabel='Стол 1';assert.equal(await f.c.parkOrderNow(),true);
 assert.match(f.c.renderPosScreen(null),/Остаток: 7 шт/);near(f.c.getProduct('flour').stock,10);
 const next=liveStockFixture();for(const [key,value] of f.data)next.data.set(key,value);await next.c.loadAll();liveStockWorkspace(next,['flour']);installLivePosStock(next);
 assert.match(next.c.renderPosScreen(null),/Остаток: 7 шт/);
 assert.equal(await next.c.resumeParked(next.state.parked[0].id),true);assert.match(next.c.renderPosScreen(null),/Остаток: 7 шт/);
 next.state.cart[0].qty=2;assert.match(next.c.renderPosScreen(null),/Остаток: 8 шт/);
 assert.equal(await next.c.parkOrderNow(),true);next.c.openParkedModal=()=>{};
 assert.equal(await next.c.deleteParked(next.state.parked[0].id),true);assert.match(next.c.renderPosScreen(null),/Остаток: 10 шт/);
 near(next.c.getProduct('flour').stock,10);
});
test('other parked orders block overselling and payment consumes only the current cart',async()=>{
 const f=liveStockFixture();installLivePosStock(f);f.state.parked=[{id:'parked',items:[{productId:'flour',qty:8}]}];
 f.cart('flour',3);assert.equal(f.c.canFulfillCart(),false);await f.c.finalizePayment([{method:'cash',amount:30}]);assert.equal(f.state.orders.length,0);near(f.c.getProduct('flour').stock,10);
 f.cart('flour',2);assert.equal(f.c.canFulfillCart(),true);await f.c.finalizePayment([{method:'cash',amount:20}]);assert.equal(f.state.orders.length,1);near(f.c.getProduct('flour').stock,8);assert.equal(f.state.parked.length,1);
 liveStockWorkspace(f,['flour']);assert.match(f.c.renderPosScreen(null),/Остаток: 0 шт/);
});
test('parked recipes and modifiers share ingredient reservations with the current cart',()=>{
 const f=liveStockFixture();installLivePosStock(f);liveStockWorkspace(f,['flour']);
 f.state.parked=[{items:[{productId:'pizza',qty:2,selectedModifiers:[{productId:'flour',qty:.5}]}]}];f.cart('flour',1);
 assert.match(f.c.renderPosScreen(null),/Остаток: 7\.6 шт/);near(f.c.getProduct('flour').stock,10);
});

function installRuntimeSafety(f){f.c.requestAnimationFrame=()=>0;vm.runInContext(fs.readFileSync(path.join(root,'app/src/main/assets/pos/android-safety.js'),'utf8'),f.c);}
test('critical journal rejects concurrent writers before either snapshot is overwritten',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve),set=f.c.PrilavokCore.Storage.set;
 f.c.PrilavokCore.Storage.set=async function(key,value){if(key==='criticalStorageJournal')await gate;return set.call(this,key,value)};
 installRuntimeSafety(f);const first=f.c.commitCriticalStorage('first',{parked:[{id:'first'}]});
 await assert.rejects(f.c.commitCriticalStorage('second',{parked:[{id:'second'}]}),/другой операции/);
 release();await first;assert.equal(JSON.parse(f.data.get('prilavok_parked'))[0].id,'first');
 await f.c.commitCriticalStorage('third',{parked:[]});assert.deepEqual(JSON.parse(f.data.get('prilavok_parked')),[]);
});
test('broken storage blocks financial commits but allows validated backup recovery path',async()=>{
 const f=fixture();installRuntimeSafety(f);vm.runInContext('storageBroken=true',f.c);
 await assert.rejects(f.c.commitCriticalStorage('payment',{orders:[]}),/Хранилище/);assert.equal(f.writes.length,0);
 await f.c.commitCriticalStorage('backup-import',{parked:[]});assert.deepEqual(JSON.parse(f.data.get('prilavok_parked')),[]);
});
