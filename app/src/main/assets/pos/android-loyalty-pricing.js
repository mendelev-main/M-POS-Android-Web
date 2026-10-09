/* Android loyalty pricing: redeem net item value, preserve non-gift charges. */
(function(global){
  'use strict';
  const cents=value=>Math.round((Number(value)||0)*100);
  global.loyaltyRewardAllocation=function(){
    // Track capacity by cart line instead of expanding every unit into an array.
    // Gross-price ordering preserves the source's cheapest-eligible-item policy.
    const lines=(state.cart||[]).map((item,index)=>({index,productId:String(item.productId),gross:Math.max(0,Number(item.price)||0),remaining:Math.max(0,Math.trunc(Number(item.qty)||0)),net:Number(item.qty)>0?Math.max(0,itemTotal(item))/Number(item.qty):0}));
    const allocations=Object.create(null),rawDiscounts=Object.create(null);let rawDiscount=0;
    for(const program of state.loyaltyPrograms||[]){
      if(!(Number(state.loyaltyRedemptions?.[program.id])>0))continue;
      const allowed=new Set((program.loyalty_reward_products||[]).map(x=>String(x.product_id)));
      const line=lines.filter(x=>x.remaining>0&&Number.isFinite(x.net)&&x.net>0&&allowed.has(x.productId)).sort((a,b)=>a.gross-b.gross||a.index-b.index)[0];
      if(!line)continue;
      line.remaining--;allocations[program.id]=[{productId:line.productId,quantity:1}];rawDiscounts[program.id]=line.net;rawDiscount+=line.net;
    }
    const subtotal=cartSubtotal(),subtotalCents=cents(subtotal);
    // Price what remains payable first. A rounded gift must never swallow the
    // rounded value of another product. Delivery is added separately below.
    const discountCents=Math.max(0,Math.min(subtotalCents,subtotalCents-cents(Math.max(0,subtotal-rawDiscount))));
    const programDiscounts=Object.create(null);let cumulative=0,assigned=0;
    const ids=Object.keys(rawDiscounts);
    ids.forEach((id,index)=>{
      cumulative+=rawDiscounts[id];
      const target=index===ids.length-1?discountCents:Math.round(discountCents*cumulative/rawDiscount);
      programDiscounts[id]=(target-assigned)/100;assigned=target;
    });
    return {discount:discountCents/100,allocations,programDiscounts};
  };
  global.cartTotal=function(){
    const subtotal=cents(cartSubtotal()),delivery=state.orderType==='Доставка'?cents(state.deliveryFee):0;
    return Math.max(0,subtotal+delivery-cents(loyaltyRewardDiscount()))/100;
  };
  const cartPanel=global.renderCartPanel;
  global.renderCartPanel=function(){
    // The source panel duplicates the old raw total arithmetic. Replace only its
    // final amount; keep all layout, names, buttons and source item rendering.
    return cartPanel.apply(this,arguments).replace(/(<div class="total-row"><span class="label">Итого<\/span><span class="value">)[^<]*(<\/span><\/div>)/,()=>'<div class="total-row"><span class="label">Итого</span><span class="value">'+fullMoney(global.cartTotal())+'</span></div>');
  };
  global.loyaltyReceiptSnapshot=function(allocation=global.loyaltyRewardAllocation()){
    const programs=[];
    for(const program of state.loyaltyPrograms||[]){
      const rewards=(allocation.allocations?.[program.id]||[]).reduce((sum,row)=>sum+Number(row.quantity||0),0);
      if(rewards>0)programs.push({id:String(program.id),name:String(program.name||'Программа лояльности'),rewards,discount:cents(allocation.programDiscounts?.[program.id])/100});
    }
    return {discount:cents(allocation.discount)/100,programs};
  };
})(window);
