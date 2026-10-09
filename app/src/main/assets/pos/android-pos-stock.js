/* Android stock precision and POS reservations, using source recipe and transaction rules. */
(function(global){
  'use strict';
  // Quantities are data, not display values. Never round each warehouse movement
  // to 0.001: repeated sub-gram deductions/receipts otherwise disappear entirely.
  // Preserve the existing Number/JSON schema and non-finite validation behavior.
  global.roundStockQty=function(value){
    const quantity=Number(value);
    return Object.is(quantity,-0)?0:quantity;
  };
  // Formatting alone hides ordinary floating-point noise. This string is never
  // written back to the warehouse or used as a recipe/payment authority.
  global.stockQtyText=function(value){
    const quantity=global.roundStockQty(value);
    return Number.isFinite(quantity)?String(Number(quantity.toPrecision(12))):'0';
  };
  const warehouseAvailability=global.availableStock;
  function reservationSnapshot(orders){
    const quantities=new Map(),blocked=new Set(),issues=[];
    function add(id,quantity){const total=(quantities.get(id)||0)+quantity;if(Number.isFinite(total))quantities.set(id,total);else blocked.add(id)}
    function blockKnown(id,seen=new Set()){
      if(seen.has(id))return;seen.add(id);const p=getProduct(id);if(!p)return;
      if(productTracksStock(p)){blocked.add(id);return}
      if(p.type==='composite')for(const component of (Array.isArray(p.components)?p.components:[]))if(component)blockKnown(component.productId,seen);
    }
    function reserveKnown(id,quantity,path=new Set()){
      const p=getProduct(id);if(!p)return;
      if(!Number.isFinite(quantity)||quantity<=0||path.has(id)){blockKnown(id);return}
      if(p.type==='simple'){if(productTracksStock(p))add(id,quantity);return}
      if(p.type!=='composite'||!Array.isArray(p.components))return;
      const next=new Set(path);next.add(id);
      for(const component of p.components)if(component)reserveKnown(component.productId,quantity*Number(component.qty),next);
    }
    for(const order of orders||[]){
      if(!Array.isArray(order?.items)){issues.push({orderId:order?.id,label:order?.orderLabel||'Без подписи',line:'Состав заказа',message:'Некорректный список товаров'});continue}
      for(const item of order.items){
        try{for(const row of stockConsumptionFor([item]).items)add(row.productId,row.qty)}
        catch(error){
          issues.push({orderId:order.id,label:order.orderLabel||'Без подписи',line:item?.name||getProduct(item?.productId)?.name||String(item?.productId||'Товар'),message:String(error?.message||error)});
          // A bad branch must not release valid siblings/modifiers. Unknown
          // quantities/cycles block only the tracked ingredients reachable here.
          if(item){reserveKnown(item.productId,Number(item.qty));if(Array.isArray(item.selectedModifiers))for(const modifier of item.selectedModifiers)if(modifier)reserveKnown(modifier.productId,Number(item.qty)*Number(modifier.qty));}
        }
      }
    }
    for(const id of blocked)quantities.set(id,Infinity);
    return {quantities,blocked,issues};
  }
  global.__androidParkedStockIssues=function(){return reservationSnapshot(state.parked).issues};
  // Validate the payable order strictly. Other orders reserve every known
  // resource, but a missing reference cannot poison unrelated stock checks.
  const checked=global.checkedStockConsumption;
  global.checkedStockConsumption=function(items){
    const own=checked(items),reserved=reservationSnapshot(state.parked);
    for(const item of own.items){
      const p=getProduct(item.productId);
      if(reserved.blocked.has(item.productId))throw new Error('Не определён резерв товара «'+p.name+'» в повреждённом отложенном заказе. Исправьте или удалите этот заказ');
      const stock=Number(p.stock)||0,required=item.qty+(reserved.quantities.get(item.productId)||0),tolerance=Number.EPSILON*8*Math.max(Math.abs(stock),required);
      if(!Number.isFinite(required)||stock+tolerance<required)throw new Error('Недостаточно остатка с учётом отложенных заказов: '+p.name);
    }
    return own;
  };
  function dependsOn(id,target,seen=new Set()){
    if(id===target)return true;if(seen.has(id))return false;seen.add(id);
    const p=getProduct(id);return p?.type==='composite'&&(Array.isArray(p.components)?p.components:[]).some(component=>component&&dependsOn(component.productId,target,seen));
  }
  function openReference(id){
    for(const order of [{orderLabel:'Текущий заказ',items:state.cart},...(state.parked||[])])for(const item of (Array.isArray(order?.items)?order.items:[])){
      if(item&&(dependsOn(item.productId,id)||(Array.isArray(item.selectedModifiers)?item.selectedModifiers:[]).some(modifier=>modifier&&dependsOn(modifier.productId,id))))return order.orderLabel||'Отложенный заказ';
    }
    const owner=state.products.find(p=>(Array.isArray(p.modifierGroups)?p.modifierGroups:[]).some(group=>(Array.isArray(group?.options)?group.options:[]).some(option=>option?.productId===id)));
    return owner?'Модификаторы товара «'+owner.name+'»':'';
  }
  const confirmDelete=global.confirmDelete;
  global.confirmDelete=function(type,id){
    if(type==='product'){const reference=openReference(id);if(reference){global.flash('Нельзя удалить товар: он используется — '+reference);return false}}
    return confirmDelete.apply(this,arguments);
  };
  const saveProduct=global.saveProduct;
  global.saveProduct=async function(id){
    const p=getProduct(id),reference=p&&p.type!==global._pmType?openReference(id):'';
    if(reference){global.flash('Нельзя изменить тип товара: он используется — '+reference);return false}
    return saveProduct.apply(this,arguments);
  };
  const parkedModal=global.openParkedModal;
  global.openParkedModal=function(){
    const issues=global.__androidParkedStockIssues();if(!issues.length)return parkedModal.apply(this,arguments);
    const show=global.showModal,title='<div class="modal-title">Отложенные чеки</div>';
    const warning='<div class="settings-note"><strong>Некоторые заказы требуют исправления</strong><div>Откройте заказ и исправьте проблемную строку или удалите заказ. Определимые резервы продолжают учитываться.</div>'+issues.map(issue=>'<div>'+escapeHtml(issue.label)+' · '+escapeHtml(issue.line)+': '+escapeHtml(issue.message)+'</div>').join('')+'</div>';
    global.showModal=function(html,...args){return show.call(this,String(html).replace(title,title+warning),...args)};
    try{return parkedModal.apply(this,arguments)}finally{global.showModal=show}
  };
  const deleteParked=global.deleteParked;
  global.deleteParked=async function(...args){
    const result=await deleteParked.apply(this,args);
    if(result)global.render();
    return result;
  };
  function withReservedOrders(renderer){
    return function(...args){
      // Calculate once per render. Never persist a reservation or change warehouse products.
      const reserved=reservationSnapshot([{orderLabel:'Текущий заказ',items:state.cart},...(state.parked||[])]).quantities;
      const products=new Map();
      function projectedProduct(id){
        if(products.has(id))return products.get(id);
        const product=getProduct(id);
        const projected=product&&productTracksStock(product)
          ? {...product,stock:Math.max(0,(Number(product.stock)||0)-(reserved.get(id)||0))}
          : product;
        products.set(id,projected);return projected;
      }
      const previous=global.availableStock;
      global.availableStock=function(product,resolve){
        if(resolve)return warehouseAvailability(product,resolve);
        return warehouseAvailability(product&&projectedProduct(product.id),projectedProduct);
      };
      try{return renderer.apply(this,args);}
      finally{global.availableStock=previous;}
    };
  }
  // Scoped synchronous rendering only: payment, stock checks, exports and server availability
  // use warehouse availability outside these renderers; checkout separately enforces reservations.
  global.renderPosScreen=withReservedOrders(global.renderPosScreen);
  global.renderPosFolderModal=withReservedOrders(global.renderPosFolderModal);
})(window);
