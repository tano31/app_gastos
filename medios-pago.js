(function(){
  'use strict';
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return;}
  if(!user?.perfil_token)return;
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const get=id=>document.getElementById(id),form=get('paymentMethodForm');
  const copies={
    es:{help:'Administrá los medios disponibles al registrar pagos. Desactivarlos conserva los movimientos anteriores.',new:'Cargar nuevo medio de pago',edit:'Editar medio de pago',save:'Guardar medio de pago',saved:'Medio de pago guardado.',loading:'Cargando medios de pago...',error:'No se pudieron cargar los medios de pago.',empty:'No hay medios de pago.',failed:'No se pudo guardar: ',saving:'Guardando...',ready:'Medios de pago cargados.'},
    pt:{help:'Gerencie os meios disponíveis ao registrar pagamentos. Desativar preserva os lançamentos anteriores.',new:'Cadastrar novo meio de pagamento',edit:'Editar meio de pagamento',save:'Salvar meio de pagamento',saved:'Meio de pagamento salvo.',loading:'Carregando meios de pagamento...',error:'Não foi possível carregar os meios de pagamento.',empty:'Nenhum meio de pagamento.',failed:'Não foi possível salvar: ',saving:'Salvando...',ready:'Meios de pagamento carregados.'},
    en:{help:'Manage available payment methods. Deactivating preserves previous transactions.',new:'Add payment method',edit:'Edit payment method',save:'Save payment method',saved:'Payment method saved.',loading:'Loading payment methods...',error:'Could not load payment methods.',empty:'No payment methods.',failed:'Could not save: ',saving:'Saving...',ready:'Payment methods loaded.'}
  };
  const copy=()=>copies[(document.documentElement.lang||'es').slice(0,2)]||copies.es;
  let records=[],loaded=false,pending=null,busy=false,editing=null;
  const canEdit=()=>user.admin===true||user.permisos?.permiso_editar_catalogos===true;
  function label(item){return ['Efectivo','Débito','Crédito','Pix','Otro'].includes(item.nombre)?I18n.translate(item.nombre):item.nombre;}
  async function request(action,fields={}){
    const response=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...fields})});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();if(!data.ok)throw Error(data.error||copy().error);return data;
  }
  function fill(select,preferred){
    const previous=preferred||select.value;select.replaceChildren();
    const active=records.filter(item=>item.activo);
    active.forEach(item=>{const option=document.createElement('option');option.value=item.valor;option.textContent=label(item);select.appendChild(option);});
    if(active.some(item=>item.valor===previous))select.value=previous;
    if(!active.length){const option=document.createElement('option');option.value='';option.textContent=copy().empty;select.appendChild(option);}
    select.required=true;
  }
  function updateSelects(){['medioPago','recordFixedMethod'].forEach(id=>{const select=get(id);if(select)fill(select);});}
  function load(force=false){
    if(pending)return pending;if(loaded&&!force)return Promise.resolve(records);
    pending=request('payment_methods').then(data=>{if(!Array.isArray(data.medios_pago))throw Error(copy().error);records=data.medios_pago;loaded=true;updateSelects();window.dispatchEvent(new CustomEvent('paymentmethodschange'));return records;}).finally(()=>{pending=null;});
    return pending;
  }
  function status(text,error=false){if(form){get('paymentMethodStatus').textContent=text;get('paymentMethodStatus').className='configuration-status '+(error?'error':'success');}}
  function controls(){if(!form)return;
    get('paymentMethodName').disabled=get('paymentMethodActive').disabled=busy||!canEdit();
    get('savePaymentMethod').disabled=busy||!loaded||!canEdit();get('refreshPaymentMethods').disabled=busy;get('cancelPaymentMethod').disabled=busy;get('cancelPaymentMethod').hidden=editing===null;
    document.querySelectorAll('[data-payment-copy]').forEach(node=>{node.textContent=copy()[node.dataset.paymentCopy];});
    get('savePaymentMethod').textContent=busy?copy().saving:copy().save;
    get('paymentMethodPanel').querySelector('summary').textContent=editing===null?copy().new:copy().edit;
  }
  function render(){if(!form)return;const body=get('paymentMethodsBody');body.replaceChildren();
    records.forEach(item=>{
      const row=document.createElement('tr'),date=new Date(item.fecha);
      [item.id,Number.isFinite(date.getTime())?date.toLocaleDateString(I18n.locale):item.fecha,item.usuario_id,label(item),I18n.t(item.activo?'supermarkets.active':'supermarkets.inactive')].forEach(value=>{const cell=document.createElement('td');cell.textContent=String(value??'');row.appendChild(cell);});
      const cell=document.createElement('td'),actions=document.createElement('div');actions.className='fixed-row-actions';
      if(canEdit()){const edit=document.createElement('button');edit.type='button';edit.textContent=I18n.t('profile.edit');edit.disabled=busy;edit.onclick=()=>{if(busy)return;editing=item.id;get('paymentMethodName').value=item.nombre;get('paymentMethodActive').value=String(item.activo);get('paymentMethodPanel').open=true;controls();get('paymentMethodName').focus();};actions.appendChild(edit);}
      cell.appendChild(actions);row.appendChild(cell);body.appendChild(row);
    });controls();
  }
  async function open(){if(!form||busy)return;busy=true;controls();status(copy().loading);
    try{await load(true);status(copy().ready);}catch(error){status(copy().error+' '+error.message,true);}finally{busy=false;render();}
  }
  function reset(){editing=null;form.reset();get('paymentMethodPanel').open=false;controls();}
  if(form){
    form.onsubmit=async event=>{event.preventDefault();if(busy||!loaded||!canEdit())return;busy=true;render();
      try{await request(editing===null?'create_payment_method':'update_payment_method',{id:editing,nombre:get('paymentMethodName').value.trim(),activo:get('paymentMethodActive').value==='true'});reset();
        try{await load(true);status(copy().saved);}catch(error){loaded=false;status(copy().saved+' '+copy().error,true);}
      }catch(error){status(copy().failed+error.message,true);}finally{busy=false;render();}
    };
    get('cancelPaymentMethod').onclick=()=>{if(!busy){reset();status('');}};get('refreshPaymentMethods').onclick=open;controls();
  }
  window.PaymentMethods={open,load,fill,get records(){return records;}};
  window.addEventListener('languagechange',()=>{if(loaded)updateSelects();render();});
  if(get('medioPago')||get('recordFixedMethod'))load().catch(error=>{
    ['medioPago','recordFixedMethod'].forEach(id=>{const select=get(id);if(!select)return;select.replaceChildren();const option=document.createElement('option');option.value='';option.textContent=copy().error;select.appendChild(option);select.required=true;});
  });
})();
