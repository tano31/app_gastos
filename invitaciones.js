(function(){
  'use strict';
  const get=id=>document.getElementById(id),section=get('platformInvitations');if(!section)return;
  const form=get('platformInvitationForm'),input=get('invitationEmail'),button=get('sendPlatformInvitation'),status=get('invitationStatus');
  const copies={
    es:{title:'Invitar a probar la plataforma',help:'Enviá un correo de bienvenida con el logo y el enlace para crear una cuenta. La invitación no otorga permisos de administrador. El correo se envía en español.',label:'Correo electrónico',send:'Enviar invitación',sending:'Enviando invitación…',sent:'Invitación enviada a ',duplicate:'La invitación ya se había enviado a ',error:'No se pudo enviar la invitación. ',session:'Volvé a iniciar sesión como administrador.'},
    pt:{title:'Convidar para testar a plataforma',help:'Envie uma mensagem de boas-vindas com o logo e o link para criar uma conta. O convite não concede permissões de administrador. O e-mail é enviado em espanhol.',label:'E-mail',send:'Enviar convite',sending:'Enviando convite…',sent:'Convite enviado para ',duplicate:'O convite já havia sido enviado para ',error:'Não foi possível enviar o convite. ',session:'Entre novamente como administrador.'},
    en:{title:'Invite someone to try the platform',help:'Send a welcome email with the logo and an account creation link. Invitations do not grant administrator permissions. The email is sent in Spanish.',label:'Email address',send:'Send invitation',sending:'Sending invitation…',sent:'Invitation sent to ',duplicate:'The invitation had already been sent to ',error:'Could not send the invitation. ',session:'Sign in again as an administrator.'}
  };
  const t=()=>copies[(document.documentElement.lang||'es').slice(0,2)]||copies.es;
  const user=()=>{try{return JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return null;}};
  let busy=false,requestId='',requestEmail='',requestOwner='';
  function access(){section.hidden=user()?.admin!==true;button.disabled=input.disabled=busy||section.hidden;}
  function translate(){get('invitationHeading').textContent=t().title;get('invitationHelp').textContent=t().help;get('invitationEmailLabel').textContent=t().label;button.textContent=busy?t().sending:t().send;}
  function identifier(){return Array.from(crypto.getRandomValues(new Uint8Array(20)),value=>value.toString(16).padStart(2,'0')).join('');}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||section.hidden||!form.reportValidity())return;
    const account=user();if(account?.admin!==true||!account.perfil_token||sessionStorage.getItem('controlGastos.loggedIn')!=='true'){status.textContent=t().session;return;}
    const email=input.value.trim().toLowerCase();
    if(!requestId||requestEmail!==email||requestOwner!==account.perfil_token){requestId=identifier();requestEmail=email;requestOwner=account.perfil_token;}
    busy=true;access();translate();status.textContent=t().sending;status.className='configuration-status';
    try{
      const result=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{
        method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'send_platform_invitation',perfil_token:account.perfil_token,email,solicitud_id:requestId})
      });
      if(!result.ok)throw Error('HTTP '+result.status);const data=await result.json();if(!data.ok)throw Error(data.error||'Respuesta inválida.');
      status.textContent=(data.duplicado?t().duplicate:t().sent)+email+'.';input.value='';requestId='';
    }catch(error){status.textContent=t().error+error.message;status.className='configuration-status error';}
    finally{busy=false;access();translate();}
  });
  window.addEventListener('profileupdated',access);window.addEventListener('languagechange',translate);access();translate();
})();
