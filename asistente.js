(function(){
  'use strict';
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return;}
  if(!user?.perfil_token||sessionStorage.getItem('controlGastos.loggedIn')!=='true')return;
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const copies={
    es:{title:'Hola, soy Fino tu asistente de gastos',open:'Abrir asistente de gastos',close:'Cerrar chat',intro:'¿En qué puedo ayudarte?',month:'Mes',placeholder:'¿Cómo viene mi mes?',send:'Enviar',checking:'Conectando con el asistente...',thinking:'Analizando tus datos...',ready:'Respuestas basadas en tus movimientos propios.',notConfigured:'El asistente todavía no está activado. Falta configurar la conexión con OpenAI.',offline:'No se pudo conectar. Revisá tu conexión o intentá nuevamente.',retry:'Reintentar conexión',privacy:'Tu consulta y un resumen de tus datos se envían a OpenAI. Revisá los datos antes de tomar decisiones.',remaining:'Consultas disponibles hoy: ',quick:['Cómo viene mi mes','En qué estoy gastando más','Qué pagos me faltan','Cómo mejorar mi ahorro'],changed:'Cambiaste el período o la moneda. Empezamos una conversación nueva.',limit:'Alcanzaste el límite diario de consultas.',keyError:'La conexión con OpenAI necesita revisión del administrador.',apiLimit:'OpenAI no pudo procesar la consulta por un límite de uso o saldo. Intentá más tarde.',serviceError:'No se pudo completar la respuesta. Intentá nuevamente.',session:'Tu sesión cambió. Volvé a ingresar para continuar.',retryMessage:'No se envió tu consulta correctamente. Podés volver a intentarlo.'},
    pt:{title:'Olá, sou Fino, seu assistente de gastos',open:'Abrir assistente de gastos',close:'Fechar chat',intro:'Como posso ajudar?',month:'Mês',placeholder:'Como está meu mês?',send:'Enviar',checking:'Conectando ao assistente...',thinking:'Analisando seus dados...',ready:'Respostas baseadas nos seus próprios lançamentos.',notConfigured:'O assistente ainda não foi ativado. Falta configurar a conexão com a OpenAI.',offline:'Não foi possível conectar. Confira sua conexão ou tente novamente.',retry:'Tentar conexão novamente',privacy:'Sua consulta e um resumo dos seus dados são enviados à OpenAI. Confira os dados antes de decidir.',remaining:'Consultas disponíveis hoje: ',quick:['Como está meu mês','Onde estou gastando mais','Quais pagamentos faltam','Como melhorar minha economia'],changed:'O período ou a moeda mudou. Iniciamos uma nova conversa.',limit:'Você atingiu o limite diário de consultas.',keyError:'A conexão com a OpenAI precisa ser revisada pelo administrador.',apiLimit:'A OpenAI não processou a consulta por um limite de uso ou saldo. Tente mais tarde.',serviceError:'Não foi possível concluir a resposta. Tente novamente.',session:'Sua sessão mudou. Entre novamente para continuar.',retryMessage:'Sua consulta não foi enviada corretamente. Você pode tentar novamente.'},
    en:{title:'Hi, I am Fino, your expense assistant',open:'Open expense assistant',close:'Close chat',intro:'How can I help you?',month:'Month',placeholder:'How is my month going?',send:'Send',checking:'Connecting to the assistant...',thinking:'Analyzing your data...',ready:'Answers based on your own recorded transactions.',notConfigured:'The assistant is not activated yet. Its OpenAI connection needs to be configured.',offline:'Could not connect. Check your connection or try again.',retry:'Retry connection',privacy:'Your question and a summary of your data are sent to OpenAI. Review the data before making decisions.',remaining:'Queries available today: ',quick:['How is my month going','Where am I spending most','Which payments are pending','How can I save more'],changed:'The period or currency changed. Starting a new conversation.',limit:'You reached your daily query limit.',keyError:'The OpenAI connection needs an administrator’s attention.',apiLimit:'OpenAI could not process the query because of a usage or credit limit. Try later.',serviceError:'Could not complete the answer. Try again.',session:'Your session changed. Sign in again to continue.',retryMessage:'Your query was not sent successfully. You can try again.'}
  };
  Object.assign(copies.es,{permissionError:'La clave no tiene permiso para esta operación. Revisá el proyecto y los permisos de la API.',modelError:'No hay acceso al modelo configurado. Revisá OPENAI_MODEL en Apps Script.',regionError:'OpenAI rechazó el origen de la conexión. Revisá las restricciones de región del servicio.',requestError:'OpenAI rechazó un parámetro de la consulta. Revisá la configuración del modelo y la API.'});
  Object.assign(copies.pt,{permissionError:'A chave não tem permissão para esta operação. Confira o projeto e as permissões da API.',modelError:'O modelo configurado não está disponível. Confira OPENAI_MODEL no Apps Script.',regionError:'A OpenAI rejeitou a origem da conexão. Confira as restrições de região.',requestError:'A OpenAI rejeitou um parâmetro. Confira a configuração do modelo e da API.'});
  Object.assign(copies.en,{permissionError:'The key does not have permission for this operation. Check the project and API permissions.',modelError:'The configured model is unavailable. Check OPENAI_MODEL in Apps Script.',regionError:'OpenAI rejected the connection origin. Check service region restrictions.',requestError:'OpenAI rejected a parameter. Check the model and API configuration.'});
  Object.assign(copies.es,{tokens:'Tokens de la última respuesta',inputTokens:'Entrada',outputTokens:'Salida'});
  Object.assign(copies.pt,{tokens:'Tokens da última resposta',inputTokens:'Entrada',outputTokens:'Saída'});
  Object.assign(copies.en,{tokens:'Last response tokens',inputTokens:'Input',outputTokens:'Output'});
  Object.assign(copies.es,{choosePeriod:'¿Querés consultar el mes actual o indicar un período?',currentMonth:'Mes actual',customPeriod:'Indicar período',from:'Desde',to:'Hasta',analyze:'Consultar período',cancel:'Cancelar',invalidPeriod:'Elegí fechas válidas, ordenadas y no futuras. Máximo 366 días.'});
  Object.assign(copies.pt,{choosePeriod:'Consultar o mês atual ou escolher um período?',currentMonth:'Mês atual',customPeriod:'Escolher período',from:'De',to:'Até',analyze:'Consultar período',cancel:'Cancelar',invalidPeriod:'Escolha datas válidas, em ordem e não futuras. Máximo de 366 dias.'});
  Object.assign(copies.en,{choosePeriod:'Would you like the current month or a custom period?',currentMonth:'Current month',customPeriod:'Choose period',from:'From',to:'To',analyze:'Analyze period',cancel:'Cancel',invalidPeriod:'Choose valid dates in order, not in the future. Maximum 366 days.'});
  copies.es.quick.push('Cuánto falta para mi objetivo');copies.pt.quick.push('Quanto falta para meu objetivo');copies.en.quick.push('How long until I reach my goal');
  const lang=()=>(document.documentElement.lang||'es').slice(0,2),t=()=>copies[lang()]||copies.es;
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const launch=make('button','expense-assistant-launch');launch.type='button';launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls','expenseAssistant');
  launch.innerHTML='<picture aria-hidden="true"><source srcset="img/aquarius-chat-animado.webp?v=slow1" type="image/webp"><img src="img/aquarius-chat-animado.gif?v=slow1" alt="" width="38" height="38" draggable="false"></picture>';
  const panel=make('section','expense-assistant');panel.id='expenseAssistant';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','expenseAssistantTitle');
  const header=make('header','expense-assistant-header'),title=make('h2'),close=make('button','expense-assistant-close','×');title.id='expenseAssistantTitle';close.type='button';header.append(title,close);
  const period=make('div','expense-assistant-period'),monthLabel=make('label'),monthText=make('span'),month=make('input'),currency=make('span','expense-assistant-currency');month.type='month';
  const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());month.max=month.value=now.toISOString().slice(0,7);month.min='1900-01';monthLabel.append(monthText,month);period.append(monthLabel,currency);
  period.hidden=true;
  const log=make('div','expense-assistant-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions text');
  const quick=make('div','expense-assistant-quick'),state=make('p','expense-assistant-state'),retry=make('button','expense-assistant-retry');state.setAttribute('role','status');retry.type='button';retry.hidden=true;
  const form=make('form','expense-assistant-form'),input=make('textarea'),send=make('button'),privacy=make('p','expense-assistant-privacy');input.rows=2;input.maxLength=1500;input.required=true;send.type='submit';form.append(input,send);
  const credits=make('p','expense-assistant-credit'),author=make('a','','Aquarius: Google Noto Emoji'),license=make('a','','CC BY 4.0');
  author.href='https://googlefonts.github.io/noto-emoji-animation/';license.href='https://creativecommons.org/licenses/by/4.0/';
  [author,license].forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});credits.append(author,make('span','',' · '),license);
  panel.append(header,period,log,quick,state,retry,form,privacy,credits);document.body.append(launch,panel);
  let ready=false,checking=false,busy=false,history=[],messages=[],remaining=null,statusKey='ready',errorState=false,resetAfterReply=false,diagnosticSuffix='',lastTokens=null,choosing=null,conversationPeriod='';
  privacy.setAttribute('role','status');
  function renderTokens(){
    if(!lastTokens){privacy.textContent=t().tokens+': —';return;}
    const number=value=>new Intl.NumberFormat(lang()).format(value);
    privacy.textContent=t().tokens+': '+number(lastTokens.total)+' · '+t().inputTokens+': '+number(lastTokens.entrada)+' · '+t().outputTokens+': '+number(lastTokens.salida);
  }
  const activeCurrency=()=>window.PlatformCurrency?.code||'BRL';let conversationCurrency=activeCurrency();
  function controls(){input.disabled=send.disabled=busy||!!choosing||!ready||remaining===0;month.disabled=busy;quick.querySelectorAll('button').forEach(button=>button.disabled=busy||!!choosing||!ready||remaining===0);retry.disabled=checking||busy;}
  function status(key,error=false,detail=''){statusKey=key;errorState=error;diagnosticSuffix=detail;state.textContent=(t()[key]||key)+(detail?' '+detail:'');state.className='expense-assistant-state'+(error?' error':'');if(key==='ready'&&remaining!==null)state.textContent=t().remaining+remaining;}
  function append(role,text){const node=make('p','expense-assistant-message '+role,text);log.appendChild(node);log.scrollTop=log.scrollHeight;return node;}
  function renderMessages(){log.replaceChildren();append('assistant',t().intro);messages.forEach(message=>append(message.role,message.text));if(choosing)renderPeriodChoice();}
  function localToday(){const date=new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,10);}
  function chooseQuestion(question){
    if(busy||choosing||!ready||remaining===0)return;
    const text=String(question||'').trim();if(!text||text.length>1500)return;
    choosing={text,custom:false,from:localToday().slice(0,7)+'-01',to:localToday()};status('ready');renderMessages();controls();
    if(text===t().quick[4]){
      const today=localToday(),year=Number(today.slice(0,4)),monthIndex=Number(today.slice(5,7))-1;
      choosing.custom=true;choosing.from=new Date(Date.UTC(year,monthIndex-3,1)).toISOString().slice(0,10);choosing.to=new Date(Date.UTC(year,monthIndex,0)).toISOString().slice(0,10);
      renderMessages();controls();
    }
  }
  function renderPeriodChoice(){
    const choice=choosing;if(!choice)return;
    const box=make('section','expense-assistant-period-choice');box.appendChild(make('p','',t().choosePeriod));
    const actions=make('div','expense-assistant-period-actions'),current=make('button','',t().currentMonth),custom=make('button','',t().customPeriod),cancel=make('button','',t().cancel);
    [current,custom,cancel].forEach(button=>button.type='button');
    const apply=range=>{if(busy||choosing!==choice)return;choosing=null;renderMessages();controls();return submit(choice.text,range);};
    current.onclick=()=>apply({});custom.onclick=()=>{if(choosing!==choice)return;choice.custom=true;renderMessages();};
    cancel.onclick=()=>{if(choosing!==choice)return;choosing=null;renderMessages();controls();input.focus();};actions.append(current,custom,cancel);box.appendChild(actions);
    if(choice.custom){
      const dates=make('form','expense-assistant-dates'),fromLabel=make('label','',t().from),toLabel=make('label','',t().to),from=make('input'),to=make('input'),confirm=make('button','',t().analyze);
      [from,to].forEach(node=>{node.type='date';node.required=true;node.min='1900-01-01';node.max=localToday();});from.value=choice.from;to.value=choice.to;confirm.type='submit';
      from.addEventListener('input',()=>choice.from=from.value);to.addEventListener('input',()=>choice.to=to.value);
      dates.addEventListener('submit',event=>{event.preventDefault();
        const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
        if(!valid(from.value)||!valid(to.value)||from.value>to.value||to.value>localToday()||from.value<'1900-01-01'||(Date.parse(to.value)-Date.parse(from.value))/86400000>=366){status('invalidPeriod',true);return;}
        return apply({desde:from.value,hasta:to.value});
      });fromLabel.appendChild(from);toLabel.appendChild(to);dates.append(fromLabel,toLabel,confirm);box.appendChild(dates);
    }
    log.appendChild(box);log.scrollTop=log.scrollHeight;
  }
  async function request(action,extra={}){
    const current=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
    if(sessionStorage.getItem('controlGastos.loggedIn')!=='true'||current?.perfil_token!==user.perfil_token)throw Object.assign(Error(t().session),{code:'assistant_session'});
    const response=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!data.ok)throw Object.assign(Error(data.error||t().serviceError),{code:data.codigo,diagnostic:data.diagnostico});return data;
  }
  function diagnostic(error){const data=error.diagnostic;if(!data)return '';const clean=value=>String(value||'').replace(/[^a-zA-Z0-9_.:\/-]/g,'').slice(0,100);return [Number.isInteger(data.http_status)?'HTTP '+data.http_status:'',clean(data.modelo),clean(data.codigo_openai)].filter(Boolean).join(' · ');}
  const errorKeys={assistant_not_configured:'notConfigured',assistant_daily_limit:'limit',assistant_api_key_error:'keyError',assistant_permission_error:'permissionError',assistant_model_error:'modelError',assistant_region_error:'regionError',assistant_request_error:'requestError',assistant_api_limit:'apiLimit',assistant_service_error:'serviceError',assistant_connection_error:'offline',assistant_session:'session'};
  async function connect(){if(checking||busy)return;checking=true;ready=false;status('checking');controls();
    try{const data=await request('assistant_status');ready=data.configurado===true;status(ready?'ready':'notConfigured',!ready);retry.hidden=ready;}
    catch(error){status(errorKeys[error.code]||'offline',true);retry.hidden=false;}finally{checking=false;controls();}
  }
  function reset(){history=[];messages=[];lastTokens=null;choosing=null;conversationPeriod='';renderTokens();conversationCurrency=activeCurrency();renderMessages();status('changed');}
  async function submit(question,range){
    if(busy||!ready||remaining===0)return;const text=String(question||'').trim();if(!text||text.length>1500)return;
    const periodKey=range.desde?range.desde+'/'+range.hasta:'current:'+localToday().slice(0,7);
    if(activeCurrency()!==conversationCurrency||conversationPeriod&&conversationPeriod!==periodKey)reset();conversationPeriod=periodKey;busy=true;controls();retry.hidden=true;status('thinking');
    messages.push({role:'user',text});append('user',text);input.value='';const pending=append('pending',t().thinking);
    try{const data=await request('assistant_chat',{mensaje:text,historial:history.slice(-6),...range,moneda:activeCurrency(),idioma:lang()});
      if(typeof data.respuesta!=='string'||!data.respuesta.trim())throw Error('Empty answer');
      pending.remove();messages.push({role:'assistant',text:data.respuesta});append('assistant',data.respuesta);
      lastTokens=data.tokens&&[data.tokens.entrada,data.tokens.salida,data.tokens.total].every(value=>Number.isSafeInteger(value)&&value>=0)?data.tokens:null;renderTokens();
      history.push({role:'user',content:text},{role:'assistant',content:data.respuesta.slice(0,4000)});history=history.slice(-6);remaining=Number.isInteger(data.consultas_restantes)?data.consultas_restantes:null;status(remaining===0?'limit':'ready',remaining===0);
    }catch(error){pending.remove();messages.pop();const last=log.lastElementChild;if(last?.classList.contains('user'))last.remove();input.value=text;status(errorKeys[error.code]||'serviceError',true,diagnostic(error));if(error.code==='assistant_daily_limit')remaining=0;if(['assistant_not_configured','assistant_api_key_error','assistant_permission_error','assistant_model_error','assistant_region_error','assistant_request_error'].includes(error.code))ready=false;retry.hidden=false;}
    finally{busy=false;if(resetAfterReply){resetAfterReply=false;reset();translate();}controls();if(!panel.hidden&&!input.disabled)input.focus();}
  }
  function translate(){launch.title=launch.getAttribute('aria-expanded')==='true'?t().close:t().open;launch.setAttribute('aria-label',launch.title);title.textContent=t().title;close.setAttribute('aria-label',t().close);monthText.textContent=t().month;currency.textContent=activeCurrency();input.placeholder=t().placeholder;input.setAttribute('aria-label',t().placeholder);send.textContent=t().send;renderTokens();retry.textContent=t().retry;
    quick.replaceChildren();t().quick.forEach(text=>{const button=make('button','',text);button.type='button';button.onclick=()=>chooseQuestion(text);quick.appendChild(button);});if(!busy)renderMessages();status(statusKey,errorState,diagnosticSuffix);controls();
  }
  function hide(){panel.hidden=true;launch.setAttribute('aria-expanded','false');translate();launch.focus();}
  launch.onclick=()=>{if(!panel.hidden){hide();return;}panel.hidden=false;launch.setAttribute('aria-expanded','true');translate();if(!ready)connect();else input.focus();};close.onclick=hide;retry.onclick=connect;
  form.addEventListener('submit',event=>{event.preventDefault();chooseQuestion(input.value);});input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();chooseQuestion(input.value);}});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}});
  month.addEventListener('change',()=>{if(!busy&&month.checkValidity())reset();});
  window.addEventListener('languagechange',translate);window.addEventListener('currencychange',()=>{if(busy)resetAfterReply=true;else{reset();translate();}});
  translate();
})();
