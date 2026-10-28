(function(){
  'use strict';
  const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');if(!user?.perfil_token)return;
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const get=id=>document.getElementById(id),form=get('holdingForm');
  const texts={
    es:{title:'Mi patrimonio',intro:'Registrá tus saldos e inversiones.',refresh:'Actualizar',add:'Agregar tenencia',edit:'Editar tenencia',total:'Patrimonio total',name:'Nombre',kind:'Clase',cash:'Dinero disponible',investment:'Inversión',currency:'Moneda',location:'Ubicación / entidad',format:'Formato',physical:'Físico',digital:'Digital',balance:'Saldo / valor actual',capital:'Capital aportado (misma moneda)',capitalShort:'Capital aportado',date:'Fecha del saldo / valoración',help:'Carga manual de saldos. No crea ingresos ni gastos. El capital aportado no se suma otra vez al patrimonio.',cancel:'Cancelar',save:'Guardar tenencia',reais:'Reales invertidos',loading:'Cargando patrimonio…',saving:'Guardando tenencia…',saved:'Tenencia guardada.',error:'No se pudo cargar el patrimonio. Revisá que Tenencias.gs esté publicado y volvé a actualizar.',saveError:'No se pudo confirmar el guardado. Revisá la lista antes de reintentar.',empty:'Todavía no registraste tenencias.',partial:'Total parcial: faltan cotizaciones para',rates:'Cotizaciones de referencia',rateError:'No se pudieron consultar las cotizaciones. Los saldos originales siguen disponibles.',manual:'Los saldos se actualizan manualmente; la conversión no es una cotización de compra o venta de tu banco.'},
    pt:{title:'Meu patrimônio',intro:'Registre saldos e investimentos.',refresh:'Atualizar',add:'Adicionar saldo',edit:'Editar saldo',total:'Patrimônio total',name:'Nome',kind:'Classe',cash:'Dinheiro disponível',investment:'Investimento',currency:'Moeda',location:'Local / instituição',format:'Formato',physical:'Físico',digital:'Digital',balance:'Saldo / valor atual',capital:'Capital aportado (mesma moeda)',capitalShort:'Capital aportado',date:'Data do saldo / avaliação',help:'Saldos manuais. Não cria receitas nem despesas. O capital aportado não é somado novamente ao patrimônio.',cancel:'Cancelar',save:'Salvar saldo',reais:'Reais investidos',loading:'Carregando patrimônio…',saving:'Salvando saldo…',saved:'Saldo salvo.',error:'Não foi possível carregar. Publique Tenencias.gs e atualize.',saveError:'Não foi possível confirmar. Confira a lista antes de tentar novamente.',empty:'Nenhum saldo registrado.',partial:'Total parcial: faltam cotações para',rates:'Cotações de referência',rateError:'Não foi possível consultar as cotações. Os saldos originais continuam disponíveis.',manual:'Saldos atualizados manualmente; a conversão não é uma oferta de câmbio do banco.'},
    en:{title:'My assets',intro:'Record your balances and investments.',refresh:'Refresh',add:'Add holding',edit:'Edit holding',total:'Total assets',name:'Name',kind:'Type',cash:'Available money',investment:'Investment',currency:'Currency',location:'Location / institution',format:'Format',physical:'Physical',digital:'Digital',balance:'Balance / current value',capital:'Contributed capital (same currency)',capitalShort:'Contributed capital',date:'Balance / valuation date',help:'Manual balances. Does not create income or expenses. Contributed capital is not counted twice.',cancel:'Cancel',save:'Save holding',reais:'BRL invested',loading:'Loading assets…',saving:'Saving holding…',saved:'Holding saved.',error:'Could not load assets. Publish Tenencias.gs and refresh.',saveError:'Could not confirm saving. Check the list before retrying.',empty:'No holdings recorded yet.',partial:'Partial total: missing rates for',rates:'Reference rates',rateError:'Could not fetch exchange rates. Original balances remain available.',manual:'Balances are updated manually; conversion is not a bank exchange offer.'}
  };
  const shortHeaders={es:{locationShort:'Ubicación',balanceShort:'Valor actual',dateShort:'Fecha',USD:'Dólares invertidos',EUR:'Euros invertidos',ARS:'Pesos invertidos'},pt:{locationShort:'Local',balanceShort:'Valor atual',dateShort:'Data',USD:'Dólares investidos',EUR:'Euros investidos',ARS:'Pesos investidos'},en:{locationShort:'Location',balanceShort:'Current value',dateShort:'Date',USD:'Dollars invested',EUR:'Euros invested',ARS:'Pesos invested'}};
  const t=()=>{const lang=(document.documentElement.lang||'es').slice(0,2);return {...(texts[lang]||texts.es),...(shortHeaders[lang]||shortHeaders.es)};};
  const holdingDay=value=>{const day=String(value||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)?day:'';};
  const money=(value,currency)=>new Intl.NumberFormat(I18n.locale,{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const today=()=>{const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');};
  const operation=()=>window.crypto?.randomUUID?window.crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2);
  let items=[],rates={},loaded=false,busy=false,editing=null,pending=null,rateFailed=false;
  async function request(action,extra={}){
    const result=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!result.ok)throw Error('HTTP '+result.status);const data=await result.json();if(!data.ok)throw Error(data.error||'Respuesta inválida');return data;
  }
  function status(text){get('holdingsStatus').textContent=text;}
  function controls(){
    get('addHolding').disabled=busy;
    form.querySelectorAll('input,select,button').forEach(node=>node.disabled=busy);
    if(!busy)get('holdingFormat').disabled=get('holdingKind').value==='inversion';
    get('holdingsBody').querySelectorAll('button').forEach(node=>node.disabled=busy);
  }
  function kindFields(){
    const investment=get('holdingKind').value==='inversion';
    get('holdingCapitalLabel').hidden=!investment;
    if(investment)get('holdingFormat').value='digital';
    get('holdingFormat').disabled=investment||busy;
  }
  function render(){
    [['nombre','holdingNameSuggestions'],['ubicacion','holdingLocationSuggestions']].forEach(([field,id])=>{
      const suggestions=get(id),names=new Map();
      items.forEach(item=>{
        const name=String(item[field]||'').trim(),key=name.normalize('NFKC').toLocaleLowerCase();
        if(name&&!names.has(key))names.set(key,name);
      });
      suggestions.replaceChildren();
      [...names.values()].sort((a,b)=>a.localeCompare(b,I18n.locale)).forEach(name=>{
        const option=make('option');option.value=name;suggestions.appendChild(option);
      });
    });
    document.querySelectorAll('[data-hold]').forEach(node=>node.textContent=t()[node.dataset.hold]);
    get('holdingFormTitle').textContent=editing===null?t().add:t().edit;
    const cards=get('holdingsCards');cards.replaceChildren();
    ['BRL','USD','EUR','ARS'].forEach(currency=>{
      const all=items.filter(item=>item.moneda===currency),selected=currency==='BRL'?all.filter(item=>item.clase==='inversion'):all;
      const card=make('article'),label=make('span',currency==='BRL'?t().reais:t()[currency]),value=make('strong',loaded?money(selected.reduce((sum,item)=>sum+item.saldo,0),currency):'—');
      card.className='holding-card-'+currency.toLowerCase();
      card.appendChild(label);card.appendChild(value);
      if(currency==='BRL'){
        card.appendChild(make('small',t().capitalShort+': '+(loaded&&!selected.some(item=>item.capital_aportado===null)?money(selected.reduce((sum,item)=>sum+(item.capital_aportado||0),0),currency):'—')));
        card.appendChild(make('small',t().cash+': '+(loaded?money(all.filter(item=>item.clase==='dinero').reduce((sum,item)=>sum+item.saldo,0),currency):'—')));
      }else ['fisico','digital'].forEach(format=>card.appendChild(make('small',t()[format==='fisico'?'physical':'digital']+': '+(loaded?money(selected.filter(item=>item.formato===format).reduce((sum,item)=>sum+item.saldo,0),currency):'—'))));
      cards.appendChild(card);
    });
    const target=window.PlatformCurrency?.code||'BRL',missing=new Set();let total=0;
    const used=new Set();
    items.forEach(item=>{
      if(item.moneda===target){total+=item.saldo;return;}
      if(item.saldo===0)return;
      const from=rates[item.moneda],to=rates[target];
      if(!from||!to){missing.add(item.moneda+' → '+target);return;}
      total+=item.saldo/from.valor*to.valor;used.add(item.moneda);used.add(target);
    });
    get('holdingsTotal').textContent=loaded?money(total,target)+(missing.size?' *':''):'—';
    const dates=[...used].filter(code=>code!=='BRL').map(code=>code+': '+rates[code].fecha);
    get('holdingsTotal').title=[missing.size?t().partial+' '+[...missing].join(', '):'',dates.length?t().rates+' · '+dates.join(' · '):'',rateFailed?t().rateError:''].filter(Boolean).join(' ');
    get('holdingsTotal').setAttribute('aria-label',t().total+(missing.size?' · '+t().partial+' '+[...missing].join(', '):''));
    const body=get('holdingsBody');body.replaceChildren();
    items.forEach(item=>{
      const row=make('tr');
      [item.nombre,t()[item.clase==='inversion'?'investment':'cash'],item.ubicacion,t()[item.formato==='fisico'?'physical':'digital'],item.moneda,money(item.saldo,item.moneda),item.capital_aportado===null?'—':money(item.capital_aportado,item.moneda),holdingDay(item.fecha_valor).replaceAll('-','/')||'—'].forEach(value=>row.appendChild(make('td',value)));
      const cell=make('td'),edit=make('button',I18n.t('profile.edit'));edit.type='button';edit.disabled=busy;edit.addEventListener('click',()=>open(item));cell.appendChild(edit);row.appendChild(cell);body.appendChild(row);
    });
    if(!items.length){const row=make('tr'),cell=make('td',loaded?t().empty:t().loading);cell.colSpan=9;row.appendChild(cell);body.appendChild(row);}
    controls();
  }
  async function loadRates(){
    try{const data=await request('holding_rates',{euros:items.some(item=>item.moneda==='EUR')});rates=data.tasas||{};rateFailed=false;}
    catch(error){rates={BRL:{valor:1,fecha:today()}};rateFailed=true;}
  }
  async function load(){
    if(busy)return;busy=true;controls();status(t().loading);
    try{const data=await request('holdings');if(!Array.isArray(data.tenencias))throw Error();items=data.tenencias;loaded=true;await loadRates();status('');}
    catch(error){status(t().error);}
    finally{busy=false;render();}
  }
  function open(item){
    if(busy)return;editing=item?.id??null;pending=null;form.reset();
    get('holdingName').value=item?.nombre||'';get('holdingKind').value=item?.clase||'dinero';get('holdingCurrency').value=item?.moneda||'BRL';
    get('holdingLocation').value=item?.ubicacion||'';get('holdingFormat').value=item?.formato||'digital';get('holdingBalance').value=item?.saldo??'';
    get('holdingCapital').value=item?.capital_aportado??'';get('holdingDate').max=today();get('holdingDate').value=holdingDay(item?.fecha_valor)||today();
    kindFields();form.hidden=false;render();get('holdingName').focus();form.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const fields={nombre:get('holdingName').value.trim(),clase:get('holdingKind').value,moneda:get('holdingCurrency').value,ubicacion:get('holdingLocation').value.trim(),formato:get('holdingFormat').value,saldo:Number(get('holdingBalance').value),capital_aportado:get('holdingCapital').value===''?null:Number(get('holdingCapital').value),fecha_valor:get('holdingDate').value,...(editing===null?{}:{id:editing})};
    const signature=JSON.stringify(fields);if(!pending||pending.signature!==signature)pending={signature,id:operation()};
    busy=true;controls();status(t().saving);
    try{
      await request('save_holding',{...fields,operacion_id:pending.id});
      form.hidden=true;editing=null;pending=null;
      const data=await request('holdings');if(!Array.isArray(data.tenencias))throw Error();items=data.tenencias;loaded=true;await loadRates();status(t().saved);
    }catch(error){status(t().saveError);}
    finally{busy=false;render();}
  });
  get('addHolding').addEventListener('click',()=>open());
  get('cancelHolding').addEventListener('click',()=>{form.hidden=true;editing=null;pending=null;});
  get('holdingKind').addEventListener('change',kindFields);
  window.addEventListener('currencychange',render);window.addEventListener('languagechange',render);
  render();load();
})();
