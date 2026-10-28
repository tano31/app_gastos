(function () {
  'use strict';
  const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
  if(!user?.perfil_token)return;
  const codes=['BRL','USD','ARS'], key='controlGastos.currency.'+user.usuario_id;
  let selected='BRL', rates=[], loading=false, failed=false;
  try {selected=localStorage.getItem(key)||'BRL';} catch(error) {}
  const requested=new URL(window.location.href).searchParams.get('currency');
  if(codes.includes(requested))selected=requested;
  if(!codes.includes(selected))selected='BRL';
  const select=document.createElement('select');select.id='platformCurrency';select.className='platform-currency';
  codes.forEach(code=>{const option=document.createElement('option');option.value=option.textContent=code;select.appendChild(option);});
  select.value=selected;
  const selector=document.querySelector('.language-selector'), tools=document.createElement('div');tools.className='platform-tools';
  selector.parentNode.insertBefore(tools,selector);tools.append(select,selector);
  function today() {const date=new Date();return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
  function convert(value,date=today()) {
    if(value===null||value===undefined||String(value).trim()===''||!Number.isFinite(Number(value)))return null;
    if(selected==='BRL')return Number(value);
    const day=String(date||today()).slice(0,10), rate=rates.filter(rate=>rate.fecha<=day).at(-1);
    return rate?Number(value)*rate[selected==='USD'?'usd':'ars']:null;
  }
  function formatNumber(value,options={}) {return value===null||value===undefined||!Number.isFinite(Number(value))?'—':new Intl.NumberFormat(I18n.locale,{style:'currency',currency:selected,currencyDisplay:'code',...options}).format(value);}
  function format(value,date,options) {return formatNumber(convert(value,date),options);}
  function movementValue(item) {
    const value=item[{BRL:'monto',USD:'monto_usd',ARS:'monto_ars'}[selected]];
    return value===null||value===undefined||String(value).trim()===''||!Number.isFinite(Number(value))?null:Number(value);
  }
  function labels() {
    select.setAttribute('aria-label',I18n.t('analytics.currency'));
    select.title=I18n.t(failed?'currency.error':'currency.help');
    document.querySelectorAll('[data-display-currency]').forEach(node=>{node.textContent=selected;});
  }
  function links() {document.querySelectorAll('a[href]').forEach(link=>{const href=link.getAttribute('href');if(/\.html(?:[?#]|$)/i.test(href)&&!/^https?:/i.test(href))link.href=I18n.page(href);else {try{const url=new URL(href,window.location.href);if(url.origin===new URL(window.location.href).origin&&/\.html$/i.test(url.pathname))link.href=I18n.page(href);}catch(error){}}});}
  function notify() {labels();window.dispatchEvent(new CustomEvent('currencychange',{detail:{currency:selected}}));}
  async function loadRates() {
    if(selected==='BRL'||loading||rates.length)return;
    loading=true;
    try {
      const response=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{
        method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'currency_rates',perfil_token:user.perfil_token})});
      if(!response.ok)throw Error();const data=await response.json();
      if(!data.ok||!Array.isArray(data.cotizaciones))throw Error();
      rates=data.cotizaciones.filter(rate=>/^\d{4}-\d{2}-\d{2}$/.test(rate.fecha)&&Number.isFinite(rate.usd)&&rate.usd>0&&Number.isFinite(rate.ars)&&rate.ars>0).sort((a,b)=>a.fecha.localeCompare(b.fecha));
      failed=!rates.length;
    } catch(error) {failed=true;}
    finally {loading=false;notify();}
  }
  function set(code) {if(!codes.includes(code))return;selected=code;select.value=code;try{localStorage.setItem(key,code);}catch(error){}links();notify();void loadRates();}
  window.PlatformCurrency={select,set,convert,format,formatNumber,movementValue,get code(){return selected;}};
  select.addEventListener('change',()=>set(select.value));
  window.addEventListener('languagechange',labels);
  window.addEventListener('storage',event=>{if(event.key===key&&codes.includes(event.newValue)){selected=event.newValue;select.value=selected;links();notify();void loadRates();}});
  window.addEventListener('focus',()=>{if(failed)void loadRates();});
  try{localStorage.setItem(key,selected);}catch(error){}
  labels();links();void loadRates();
})();
