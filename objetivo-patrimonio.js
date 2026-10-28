(function(){
  'use strict';
  const get=id=>document.getElementById(id),form=get('holdingsGoalForm');if(!form)return;
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}if(!user?.perfil_token)return;
  const copy={es:['Patrimonio total','Mi objetivo','Cargar monto','Editar','Moneda','Monto objetivo','Guardar','Cancelar','Cargando objetivo…','Objetivo guardado.','No se pudo consultar el objetivo. Recargá para reintentar.','No se pudo guardar el objetivo.'],pt:['Patrimônio total','Meu objetivo','Definir valor','Editar','Moeda','Valor desejado','Salvar','Cancelar','Carregando objetivo…','Objetivo salvo.','Não foi possível consultar o objetivo. Recarregue para tentar novamente.','Não foi possível salvar o objetivo.'],en:['Total assets','My goal','Set amount','Edit','Currency','Target amount','Save','Cancel','Loading goal…','Goal saved.','Could not load your goal. Reload to try again.','Could not save your goal.']};
  let goal=null,loaded=false,busy=false,rates={BRL:{valor:1}};
  const labels=()=>copy[(document.documentElement.lang||'es').slice(0,2)]||copy.es;
  function render(){
    const c=labels();['holdingsTotalLabel','holdingsGoalLabel'].forEach((id,i)=>get(id).textContent=c[i]);
    const target=window.PlatformCurrency?.code||'BRL',from=goal&&rates[goal.moneda]?.valor,to=rates[target]?.valor;
    const amount=goal?(goal.moneda===target?goal.monto:Number.isFinite(from)&&from>0&&Number.isFinite(to)&&to>0?goal.monto/from*to:null):null;
    get('holdingsGoalValue').textContent=loaded&&amount!==null?new Intl.NumberFormat(window.I18n?.locale||'es-AR',{style:'currency',currency:target,currencyDisplay:'code'}).format(amount):'—';
    const missing={es:'Falta cotización para convertir el objetivo.',pt:'Falta cotação para converter o objetivo.',en:'Missing exchange rate to convert the goal.'};
    get('holdingsGoalValue').title=goal&&amount===null?(missing[(document.documentElement.lang||'es').slice(0,2)]||missing.es):'';
    get('editHoldingsGoal').textContent=c[goal?3:2];get('editHoldingsGoal').disabled=!loaded||busy;
    ['holdingsGoalCurrencyLabel','holdingsGoalAmountLabel','saveHoldingsGoal','cancelHoldingsGoal'].forEach((id,i)=>get(id).textContent=c[4+i]);
    form.querySelectorAll('input,select,button').forEach(node=>node.disabled=busy);
  }
  function status(text,error=false){get('holdingsGoalStatus').textContent=text;get('holdingsGoalStatus').classList.toggle('error',error);}
  async function request(action,extra={}){
    const result=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!result.ok)throw Error();const data=await result.json();if(!data.ok)throw Error();return data;
  }
  async function loadRates(){
    try{const data=await request('holding_rates',{euros:goal?.moneda==='EUR'});rates={BRL:{valor:1},...(data.tasas||{})};}
    catch(error){rates={BRL:{valor:1}};}
    render();
  }
  get('editHoldingsGoal').addEventListener('click',()=>{
    if(!loaded||busy)return;
    get('holdingsGoalCurrency').value=goal?.moneda||window.PlatformCurrency?.code||'BRL';get('holdingsGoalAmount').value=goal?.monto||'';form.hidden=false;status('');get('holdingsGoalAmount').focus();
  });
  get('cancelHoldingsGoal').addEventListener('click',()=>{if(!busy){form.hidden=true;status('');}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;render();status('');
    try{const data=await request('save_holding_goal',{moneda:get('holdingsGoalCurrency').value,monto:Number(get('holdingsGoalAmount').value)});goal=data.objetivo;loaded=true;form.hidden=true;status('');await loadRates();}
    catch(error){status(labels()[11],true);}finally{busy=false;render();}
  });
  window.addEventListener('languagechange',render);window.addEventListener('currencychange',render);render();status(labels()[8]);
  request('holding_goal').then(async data=>{goal=data.objetivo;loaded=true;status('');if(goal)await loadRates();}).catch(()=>status(labels()[10],true)).finally(render);
})();
