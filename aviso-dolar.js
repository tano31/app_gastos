(function(){
  'use strict';
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return;}
  if(sessionStorage.getItem('controlGastos.loggedIn')!=='true'||!user?.perfil_token)return;
  const token=user.perfil_token,key='controlGastos.dollarNotice',api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  let saved;try{saved=JSON.parse(sessionStorage.getItem(key)||'null');}catch(error){}
  const copy={es:['Movimiento del dólar','El dólar subió','El dólar bajó','Ver cotización','Cerrar aviso','por USD','Comparado con'],pt:['Variação do dólar','O dólar subiu','O dólar caiu','Ver cotação','Fechar aviso','por USD','Comparado com'],en:['Dollar movement','The dollar rose','The dollar fell','View exchange rate','Dismiss notice','per USD','Compared with']};
  copy.es[0]='Variación importante del dólar';copy.pt[0]='Variação importante do dólar';copy.en[0]='Significant dollar movement';
  const labels=()=>copy[(document.documentElement.lang||'es').slice(0,2)]||copy.es;
  let notice=null;
  function store(value){saved=value;try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}}
  function render(){
    if(!notice)return;const c=labels(),change=saved.change,locale=window.I18n?.locale||'es-AR';
    notice.querySelector('strong').textContent=c[0];
    const date=value=>new Date(value.slice(0,10)+'T12:00:00Z').toLocaleDateString(locale);
    const percent=new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(Math.abs(change.porcentaje));
    const price=new Intl.NumberFormat(locale,{style:'currency',currency:'BRL',currencyDisplay:'code',minimumFractionDigits:4,maximumFractionDigits:4});
    notice.querySelector('p').textContent=c[change.porcentaje>=0?1:2]+' '+percent+' % · '+date(change.actual.fecha)+'. '+price.format(change.actual.precio)+' '+c[5]+'. '+c[6]+' '+date(change.anterior.fecha)+': '+price.format(change.anterior.precio)+'.';
    const link=notice.querySelector('a');link.textContent=c[3];link.href=window.I18n?I18n.page('inversiones.html'):'inversiones.html';
    notice.querySelector('button').setAttribute('aria-label',c[4]);
  }
  function show(){
    if(saved?.session!==token||saved.dismissed||!saved.change?.avisar)return;
    const change=saved.change,amount=Math.abs(change.porcentaje);
    if(!Number.isFinite(amount)||amount<3-1e-9)return;
    notice=document.createElement('aside');notice.className='dollar-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    for(const tag of ['strong','p','a','button'])notice.appendChild(document.createElement(tag));
    const icon=document.createElement('i');icon.className='fa-solid fa-triangle-exclamation dollar-notice-icon';icon.setAttribute('aria-hidden','true');notice.appendChild(icon);
    const close=notice.querySelector('button');close.type='button';close.textContent='×';close.addEventListener('click',()=>{store({...saved,dismissed:true});notice.remove();notice=null;});
    document.body.appendChild(notice);render();
  }
  window.addEventListener('languagechange',render);
  if(saved?.session===token){show();return;}
  fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'investment_quotes',perfil_token:token,periodo:'1w'})})
    .then(result=>{if(!result.ok)throw Error();return result.json();})
    .then(data=>{
      if(!data.ok||!Object.prototype.hasOwnProperty.call(data,'variacion_diaria'))return;
      let current;try{current=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}
      if(current?.perfil_token!==token||sessionStorage.getItem('controlGastos.loggedIn')!=='true')return;
      store({session:token,change:data.variacion_diaria,dismissed:false});show();
    }).catch(()=>{/* El aviso no bloquea el ingreso si la fuente no responde. */});
})();
