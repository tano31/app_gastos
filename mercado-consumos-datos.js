(function(root){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const days=(start,end)=>Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);
  function analyze(rows,associations,options){
    const aliases=new Map(associations.map(item=>[normalize(item.original),item.producto]));
    let ignored=0,approximate=false;
    const clean=rows.map(item=>{
      const date=String(item.fecha_compra||'').slice(0,10),quantity=Number(item.cantidad),price=Number(item.precio_unitario);
      if(!validDate(date)||date>options.today||!String(item.producto||'').trim()||!String(item.comercio||'').trim()||item.cantidad===''||item.precio_unitario===''||item.precio_unitario===null||item.precio_unitario===undefined||!Number.isFinite(quantity*price)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(price)||price<0||String(item.moneda||'BRL')!=='BRL'){ignored++;return null;}
      let unit=normalize(item.unidad).toUpperCase(),q=quantity,p=price;
      if(unit==='G'){unit='KG';q/=1000;p*=1000;}if(unit==='ML'){unit='L';q/=1000;p*=1000;}
      if(['UM','UND','UNID'].includes(unit))unit='UN';if(unit==='LT')unit='L';
      if(!unit){ignored++;return null;}
      const name=aliases.get(normalize(item.producto))||String(item.producto).trim();
      const store=String(item.comercio).trim(),batch=String(item.lote_id||'');
      return {id:Number(item.id_items_mercado)||0,name,original:item.producto,unit,q,p,total:quantity*price,date,store,storeKey:normalize(store),key:JSON.stringify([normalize(name),unit]),batch:batch||normalize(store)+'|'+date,approximate:!batch};
    }).filter(Boolean).filter(item=>item.date>=options.start&&item.date<=options.end).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
    const selected=clean.filter(item=>!options.store||item.storeKey===options.store),groups=new Map(),purchases=new Set();
    selected.forEach(item=>{
      purchases.add(item.batch);approximate=approximate||item.approximate;
      if(!groups.has(item.key))groups.set(item.key,{key:item.key,name:item.name,unit:item.unit,quantity:0,spent:0,purchases:new Set(),originals:new Set(),monthly:new Map()});
      const group=groups.get(item.key);group.quantity+=item.q;group.spent+=item.total;group.purchases.add(item.batch);group.originals.add(item.original);group.latest=item;
      const month=item.date.slice(0,7);group.monthly.set(month,(group.monthly.get(month)||0)+item.total);
    });
    const length=Math.max(1,days(options.start,options.end)+1);
    const products=Array.from(groups.values()).map(group=>{
      const byStore=new Map();clean.filter(item=>item.key===group.key&&item.p>0).forEach(item=>byStore.set(item.storeKey,item));
      const offers=Array.from(byStore.values()).map(item=>({...item,stale:days(item.date,options.today)>30})).sort((a,b)=>a.p-b.p);
      const recent=offers.filter(item=>!item.stale),best=recent[0]||null;
      const baseline=group.latest.p>0&&days(group.latest.date,options.today)<=30?group.latest:null;
      const monthly=group.quantity/length*30,quantity=['KG','L'].includes(group.unit)?Math.round(monthly*1000)/1000:Math.ceil(monthly);
      return {...group,purchases:group.purchases.size,originals:Array.from(group.originals),monthly:Array.from(group.monthly,([month,total])=>({month,total})),offers,best,baseline,suggestedQuantity:quantity,savingPerUnit:baseline&&best&&recent.length>=2?Math.max(0,baseline.p-best.p):null};
    }).sort((a,b)=>b.spent-a.spent);
    return {products,spent:selected.reduce((sum,item)=>sum+item.total,0),purchases:purchases.size,ignored,approximate,length,stores:Array.from(new Map(clean.map(item=>[item.storeKey,item.store])).entries()),raw:selected};
  }
  root.MarketConsumption={analyze,normalize,validDate};
})(globalThis);
