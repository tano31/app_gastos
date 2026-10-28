(function(){
  'use strict';
  if(sessionStorage.getItem('controlGastos.loggedIn')!=='true')return;
  const fields=['usuario_email','usuario_doc','usuario_id','usuario_imagen','codigo_postal','direccion','barrio','numero'];
  const dismissedKey='controlGastos.profileNoticeDismissed';
  let dismissedToken='';
  try{dismissedToken=sessionStorage.getItem(dismissedKey)||'';}catch(error){}
  const copy={es:['Te falta completar información de tu perfil.','Completar Mis datos'],pt:['Faltam informações no seu perfil.','Completar Meus dados'],en:['Your profile is missing some information.','Complete My details']};
  const notice=document.createElement('aside');notice.id='pendingProfileNotice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const text=document.createElement('span'),link=document.createElement('a'),close=document.createElement('button');
  close.type='button';close.textContent='×';
  close.addEventListener('click',()=>{
    let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}
    dismissedToken=user?.perfil_token||'';
    try{sessionStorage.setItem(dismissedKey,dismissedToken);}catch(error){}
    notice.hidden=true;
  });notice.append(text,link,close);
  const style=document.createElement('style');style.textContent='#pendingProfileNotice{position:fixed;top:142px;right:20px;z-index:100;max-width:calc(100vw - 40px);width:360px;padding:14px 42px 14px 18px;border:1px solid #86efac;border-radius:10px;background:#dcfce7;color:#166534;font:14px/1.5 Arial,sans-serif;box-shadow:0 4px 16px #0f172a20}#pendingProfileNotice[hidden]{display:none}#pendingProfileNotice a{display:block;margin-top:6px;color:#166534;font-weight:700;text-decoration:underline}#pendingProfileNotice button{position:absolute;top:6px;right:6px;width:30px;height:30px;min-height:0;padding:0;margin:0;border:0;border-radius:6px;background:transparent;color:#166534;font:24px/1 Arial,sans-serif;cursor:pointer}#pendingProfileNotice button:hover{background:#bbf7d0}#pendingProfileNotice button:focus-visible{outline:2px solid #166534;outline-offset:2px}';document.head.appendChild(style);document.body.appendChild(notice);
  function render(){
    let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}
    notice.hidden=!user?.perfil_token||dismissedToken===user.perfil_token||sessionStorage.getItem('controlGastos.loggedIn')!=='true'||fields.every(name=>String(user[name]||'').trim());
    const lang=(document.documentElement.lang||'es').slice(0,2),labels=copy[lang]||copy.es;
    text.textContent=labels[0];link.textContent=labels[1];link.href='configuracion.html?section=profile&lang='+encodeURIComponent(lang);
    close.setAttribute('aria-label',({es:'Cerrar notificación',pt:'Fechar notificação',en:'Dismiss notification'})[lang]||'Cerrar notificación');
  }
  window.addEventListener('profileupdated',render);window.addEventListener('languagechange',render);window.addEventListener('pageshow',render);render();
})();
