(function(){
  'use strict';
  const value=document.getElementById('dashboardAssets'),label=document.getElementById('dashboardAssetsLabel');
  const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');if(!value||!user?.perfil_token)return;
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  let items=null,rates={},failed=false;
  function render(){
    const language=(document.documentElement.lang||'es').slice(0,2);
    const copy={es:['Patrimonio','Tus tenencias actuales. No depende de los filtros de gastos.','Faltan cotizaciones: ','No se pudo consultar tu patrimonio.'],pt:['Patrimônio','Seus saldos atuais. Não depende dos filtros de despesas.','Faltam cotações: ','Não foi possível consultar seu patrimônio.'],en:['Assets','Your current holdings. Independent of expense filters.','Missing rates: ','Could not load your assets.']}[language]||['Patrimonio','','',''];
    label.textContent=copy[0];value.title=failed?copy[3]:copy[1];
    const currency=window.PlatformCurrency?.code||'BRL',missing=new Set();let total=0;
    if(items===null){value.textContent='—';return;}
    items.forEach(item=>{
      if(item.moneda===currency){total+=Number(item.saldo);return;}
      if(Number(item.saldo)===0)return;
      if(!rates[item.moneda]||!rates[currency]){missing.add(item.moneda+' → '+currency);return;}
      total+=Number(item.saldo)/rates[item.moneda].valor*rates[currency].valor;
    });
    value.textContent=missing.size?'—':new Intl.NumberFormat(I18n.locale,{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(total);
    if(missing.size)value.title=copy[2]+[...missing].join(', ');
    value.style.fontSize='24px';
    if(value.clientWidth&&value.scrollWidth>value.clientWidth)value.style.fontSize=Math.max(12,24*value.clientWidth/value.scrollWidth-.2)+'px';
  }
  async function request(action,extra={}){
    const result=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!result.ok)throw Error();const data=await result.json();if(!data.ok)throw Error();return data;
  }
  async function load(){
    try{
      const data=await request('holdings');if(!Array.isArray(data.tenencias))throw Error();items=data.tenencias;
      rates={BRL:{valor:1}};
      try{rates=(await request('holding_rates',{euros:items.some(item=>item.moneda==='EUR')})).tasas||rates;}catch(error){}
    }catch(error){items=null;failed=true;}
    render();
  }
  window.addEventListener('currencychange',render);window.addEventListener('languagechange',render);window.addEventListener('resize',render);
  render();load();
})();
