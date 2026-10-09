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
  function reservedItems(current){
    return [...(current||[]),...(state.parked||[]).flatMap(order=>order.items||[])];
  }
  // Validate the proposed cart together with other reserved orders. Return only its own
  // consumption so payment deducts the paid order once, leaving parked reserves intact.
  const checked=global.checkedStockConsumption;
  global.checkedStockConsumption=function(items){
    checked(reservedItems(items));
    return checked(items);
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
      let reserved;
      try{reserved=new Map(stockConsumptionFor(reservedItems(state.cart)).items.map(item=>[item.productId,item.qty]));}
      catch(error){reserved=new Map();} // Existing validation still explains an invalid recipe/cart.
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
