(function(){
  'use strict';
  const get=id=>document.getElementById(id),section=get('auditLogSettings');if(!section)return;
  let busy=false,cursor=null,loaded=false,filters={};
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function user(){try{return JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return null;}}
  function access(){section.hidden=user()?.admin!==true;}
  async function load(older=false){
    if(busy||section.hidden)return;busy=true;get('auditRefresh').disabled=true;get('auditOlder').disabled=true;get('auditStatus').textContent='Consultando actividad…';
    if(!older)filters={desde:get('auditFrom').value,hasta:get('auditUntil').value,filtro_usuario:get('auditActor').value.trim(),filtro_accion:get('auditAction').value.trim(),filtro_resultado:get('auditOutcome').value};
    try{
      const result=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'audit_log',perfil_token:user()?.perfil_token,...filters,...(older&&cursor?{cursor}: {})})});
      const data=await result.json();if(!data.ok||!Array.isArray(data.eventos))throw Error(data.error||'Respuesta inválida.');
      if(!older)get('auditBody').replaceChildren();
      data.eventos.forEach(event=>{
        const tr=make('tr'),date=new Date(event.fecha_utc);
        [Number.isFinite(date.getTime())?date.toLocaleString(window.I18n?.locale):event.fecha_utc,event.actor_usuario||event.actor_id||'No identificado',event.accion,event.entidad+(event.registro_id?' / '+event.registro_id:''),({exito:'Éxito',fallo:'Fallo',sin_cambio:'Sin cambio'})[event.resultado]||event.resultado].forEach(value=>tr.appendChild(make('td',String(value))));
        const td=make('td'),details=make('details'),pre=make('pre');details.appendChild(make('summary','Ver detalle'));
        const parse=value=>{try{return JSON.parse(value||'null');}catch(error){return null;}};
        pre.textContent=JSON.stringify({evento:event.evento_id,codigo:event.codigo||undefined,antes:parse(event.antes),despues:parse(event.despues),detalle:parse(event.detalle),duracion_ms:event.duracion_ms,origen:event.origen},null,2);details.appendChild(pre);td.appendChild(details);tr.appendChild(td);get('auditBody').appendChild(tr);
      });
      cursor=data.siguiente;get('auditOlder').hidden=!cursor;loaded=true;
      get('auditStatus').textContent=(data.eventos.length?'Registros consultados.':'No hay registros para estos filtros.')+(data.pendientes?' Hay '+data.pendientes+' eventos pendientes de recuperar.':'');
    }catch(error){get('auditStatus').textContent='No se pudo consultar el registro. '+error.message;}
    finally{busy=false;get('auditRefresh').disabled=false;get('auditOlder').disabled=false;}
  }
  section.addEventListener('toggle',()=>{if(section.open&&!loaded)load();});get('auditFilterForm').addEventListener('submit',event=>{event.preventDefault();load();});get('auditOlder').addEventListener('click',()=>load(true));window.addEventListener('profileupdated',access);access();
})();
