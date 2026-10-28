(function(){
  'use strict';
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}
  if(sessionStorage.getItem('controlGastos.loggedIn')!=='true'||!user?.perfil_token){window.location.href=I18n.page('login.html');return;}
  const get=id=>document.getElementById(id),form=get('wishForm'),input=get('wishText'),send=get('sendWish'),list=get('wishList'),status=get('wishStatus');
  const copies={
    es:{title:'Wishlist',intro:'Compartí las mejoras que te gustaría sumar a la plataforma.',new:'Enviar una propuesta',label:'¿Qué te gustaría mejorar?',send:'Enviar',list:'Propuestas',words:'palabras',empty:'Todavía no hay propuestas.',loading:'Cargando propuestas…',sent:'Propuesta enviada.',failed:'No se pudo completar la operación. Reintentá.',limit:'La propuesta debe contener entre 1 y 250 palabras.',save:'Guardar estado',saved:'Estado actualizado.',refresh:'Actualizar lista',states:{enviado:'Enviado',en_analisis:'En análisis',rechazado:'Rechazado',aprobado:'Aprobado'}},
    pt:{title:'Wishlist',intro:'Compartilhe as melhorias que você gostaria de ver na plataforma.',new:'Enviar uma proposta',label:'O que você gostaria de melhorar?',send:'Enviar',list:'Propostas',words:'palavras',empty:'Nenhuma proposta ainda.',loading:'Carregando propostas…',sent:'Proposta enviada.',failed:'Não foi possível concluir. Tente novamente.',limit:'A proposta deve ter entre 1 e 250 palavras.',save:'Salvar status',saved:'Status atualizado.',refresh:'Atualizar lista',states:{enviado:'Enviado',en_analisis:'Em análise',rechazado:'Rejeitado',aprobado:'Aprovado'}},
    en:{title:'Wishlist',intro:'Share the improvements you would like to see on the platform.',new:'Send a suggestion',label:'What would you like to improve?',send:'Send',list:'Suggestions',words:'words',empty:'No suggestions yet.',loading:'Loading suggestions…',sent:'Suggestion sent.',failed:'Could not complete the operation. Please retry.',limit:'Suggestions must contain between 1 and 250 words.',save:'Save status',saved:'Status updated.',refresh:'Refresh list',states:{enviado:'Sent',en_analisis:'Under review',rechazado:'Rejected',aprobado:'Approved'}}};
  const t=()=>copies[(document.documentElement.lang||'es').slice(0,2)]||copies.es;
  const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  let wishes=[],admin=false,busy=false,pending=null;
  const count=()=>input.value.trim()?input.value.trim().split(/\s+/u).length:0;
  function controls(){const words=count();get('wishCount').textContent=words+' / 250 '+t().words;get('wishCount').classList.toggle('error',words>250);send.disabled=busy||words<1||words>250;input.disabled=busy;get('refreshWishlist').disabled=busy;}
  function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
  async function request(action,extra={}){const result=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});if(!result.ok)throw Error();const data=await result.json();if(!data.ok)throw Error(data.error||t().failed);return data;}
  function render(){
    const c=t();[['wishlistTitle','title'],['wishlistIntro','intro'],['wishNewTitle','new'],['wishLabel','label'],['sendWish','send'],['wishListTitle','list'],['refreshWishlist','refresh']].forEach(([id,key])=>get(id).textContent=c[key]);
    list.replaceChildren();if(!wishes.length)list.appendChild(make('p',c.empty));
    wishes.forEach(wish=>{
      const card=make('article',undefined,'wishlist-item'),head=make('div',undefined,'wishlist-item-header'),date=new Date(wish.creado_en);
      head.append(make('small',(admin?wish.usuario+' · ':'')+(Number.isFinite(date.getTime())?date.toLocaleDateString(window.I18n?.locale):'')),make('span',c.states[wish.estado]||wish.estado,'wish-state '+wish.estado));
      card.append(head,make('p',wish.propuesta));
      if(admin){
        const actions=make('div',undefined,'wish-admin'),select=make('select'),save=make('button',c.save),label=make('label',c.save);select.id='wish-state-'+wish.id;label.htmlFor=select.id;
        Object.entries(c.states).forEach(([value,text])=>{const option=make('option',text);option.value=value;select.appendChild(option);});select.value=wish.estado;save.type='button';save.disabled=busy;select.disabled=busy;
        save.addEventListener('click',async()=>{if(busy||select.value===wish.estado)return;busy=true;controls();save.disabled=true;select.disabled=true;try{const data=await request('update_wish_status',{id:wish.id,estado:select.value});wishes=wishes.map(item=>item.id===wish.id?data.deseo:item);message(t().saved);}catch(error){message(error.message||t().failed,true);}finally{busy=false;render();}});
        actions.append(label,select,save);card.appendChild(actions);
      }
      list.appendChild(card);
    });controls();
  }
  async function load(){if(busy)return;busy=true;controls();message(t().loading);try{const data=await request('wishlist');if(!Array.isArray(data.deseos))throw Error();wishes=data.deseos;admin=data.admin===true;message('');}catch(error){message(error.message||t().failed,true);}finally{busy=false;render();}}
  input.addEventListener('input',controls);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;if(count()<1||count()>250){message(t().limit,true);return;}
    const text=input.value.trim();if(!pending||pending.text!==text)pending={text,id:crypto.randomUUID()};busy=true;render();
    try{const data=await request('create_wish',{propuesta:text,operacion_id:pending.id});if(!wishes.some(item=>item.id===data.deseo.id))wishes.unshift(data.deseo);input.value='';pending=null;message(t().sent);}
    catch(error){message(error.message||t().failed,true);}finally{busy=false;render();}
  });
  get('refreshWishlist').addEventListener('click',load);get('logoutBtn').addEventListener('click',async()=>{await Auth.logout();window.location.href=I18n.page('login.html');});
  window.addEventListener('languagechange',render);render();load();
})();
