(function(){
  'use strict';
  const host=document.getElementById('importSummary');if(!host)return;
  const API='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  let movements=[],bank='',result=null,version=0,error=false,loading=false;
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function render(){
    host.replaceChildren();if(!movements.length)return;
    host.appendChild(make('h3',I18n.t('importReview.title')));
    const message=make('p',I18n.t(loading?'importReview.loading':error?'importReview.error':'importReview.help'));message.setAttribute('role','status');host.appendChild(message);
    if(result){const grid=make('div');grid.className='import-summary-grid';
      [['nuevos','importReview.new'],['duplicados','importReview.duplicates'],['etiquetas_pendientes','importReview.labels'],['sinCotizacion','importReview.rates']].forEach(([key,title])=>{const card=make('div');card.appendChild(make('strong',String(result[key])));card.appendChild(make('span',I18n.t(title)));grid.appendChild(card);});host.appendChild(grid);}
    const refresh=make('button',I18n.t('categories.refresh'));refresh.type='button';refresh.disabled=loading;refresh.addEventListener('click',()=>{void update().catch(()=>{});});host.appendChild(refresh);
  }
  async function update(){
    const current=++version,target=document.getElementById('importUser').value;
    loading=true;error=false;result=null;render();
    try{
      const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
      if(!user?.perfil_token||!target)throw Error();
      const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'preview_bank_import',banco:bank,movimientos:movements,import_usuario_id:target,perfil_token:user.perfil_token})});
      if(!response.ok)throw Error();const data=await response.json();if(!data.ok)throw Error(data.error);
      if(current!==version)return null;
      result={nuevos:data.nuevos??0,duplicados:data.duplicados??0,etiquetas_pendientes:data.etiquetas_pendientes??0,sinCotizacion:data.sinCotizacion??0};return result;
    }catch(failure){if(current===version){error=true;result=null;}throw failure;}
    finally{if(current===version){loading=false;render();}}
  }
  window.ImportSummary={set(items,action){movements=items;bank=action;void update().catch(()=>{});},reset(){++version;movements=[];result=null;host.replaceChildren();},async confirm(){
    const data=await update();if(!data)throw Error(I18n.t('importReview.error'));
    if(data.etiquetas_pendientes)throw Error(I18n.t('importReview.pending'));
    return window.confirm(I18n.t('importReview.confirm',{user:document.getElementById('importUser').value,...data}));
  }};
  document.getElementById('importUser').addEventListener('change',()=>{if(movements.length)void update().catch(()=>{});});
  window.addEventListener('languagechange',render);
})();
