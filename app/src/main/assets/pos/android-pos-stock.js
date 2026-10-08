/* Android POS presentation: available stock after the current basket, using source recipe rules. */
(function(global){
  'use strict';
  const warehouseAvailability=global.availableStock;
  function withCurrentCart(renderer){
    return function(...args){
      // Calculate once per render. Never persist a reservation or change warehouse products.
      let reserved;
      try{reserved=new Map(stockConsumptionFor(state.cart).items.map(item=>[item.productId,item.qty]));}
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
  // continue to call the original warehouse function outside these two renderers.
  global.renderPosScreen=withCurrentCart(global.renderPosScreen);
  global.renderPosFolderModal=withCurrentCart(global.renderPosFolderModal);
})(window);
