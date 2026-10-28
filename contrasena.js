(function(){
  'use strict';
  const form=document.getElementById('changePasswordForm');if(!form)return;
  const get=id=>document.getElementById(id),button=get('changePasswordButton'),status=get('changePasswordStatus');
  const copy={
    es:['Contraseña','Contraseña actual','Nueva contraseña','Repetir nueva contraseña','Usá al menos 8 caracteres con mayúscula, minúscula, número y carácter especial. Te enviaremos un correo de validación y volverás al inicio de sesión.','Actualizar contraseña','Actualizando...','Las contraseñas nuevas no coinciden.','No se pudo conectar con el servidor. Si el cambio se procesó, validá el correo e ingresá con la nueva contraseña.','Contraseña actualizada. Validá el correo que te enviamos antes de iniciar sesión.'],
    pt:['Senha','Senha atual','Nova senha','Repetir nova senha','Use pelo menos 8 caracteres com maiúscula, minúscula, número e caractere especial. Enviaremos um email de validação e você voltará ao login.','Atualizar senha','Atualizando...','As novas senhas não coincidem.','Não foi possível conectar. Se a alteração foi processada, valide o email e entre com a nova senha.','Senha atualizada. Valide o email enviado antes de entrar.'],
    en:['Password','Current password','New password','Repeat new password','Use at least 8 characters including uppercase, lowercase, a number and a special character. We will send a verification email and return you to sign in.','Update password','Updating...','The new passwords do not match.','Could not connect. If the change was processed, verify your email and sign in with the new password.','Password updated. Verify the email we sent before signing in.']};
  let busy=false;
  const validationCopy={es:['Al menos 8 caracteres','Una mayúscula','Una minúscula','Un número','Un carácter especial','Las contraseñas coinciden','Mostrar contraseña','Ocultar contraseña'],pt:['Pelo menos 8 caracteres','Uma maiúscula','Uma minúscula','Um número','Um caractere especial','As senhas coincidem','Mostrar senha','Ocultar senha'],en:['At least 8 characters','An uppercase letter','A lowercase letter','A number','A special character','Passwords match','Show password','Hide password']};
  const checks=[v=>v.length>=8,v=>/[A-Z]/.test(v),v=>/[a-z]/.test(v),v=>/[0-9]/.test(v),v=>/[^A-Za-z0-9]/.test(v)];
  const rules=document.createElement('ul');rules.className='change-password-rules';rules.id='changePasswordRules';
  const ruleItems=Array.from({length:6},()=>{const item=document.createElement('li');rules.appendChild(item);return item;});
  get('passwordSettingsHelp').before(rules);
  get('newPassword').setAttribute('aria-describedby',rules.id);get('repeatNewPassword').setAttribute('aria-describedby',rules.id);
  const toggles=['currentPassword','newPassword','repeatNewPassword'].map(id=>{
    const input=get(id),wrapper=document.createElement('div'),toggle=document.createElement('button'),icon=document.createElement('i');
    wrapper.className='change-password-field';input.before(wrapper);wrapper.appendChild(input);
    toggle.type='button';toggle.className='change-password-eye';toggle.setAttribute('aria-controls',id);icon.setAttribute('aria-hidden','true');toggle.appendChild(icon);wrapper.appendChild(toggle);
    toggle.addEventListener('click',event=>{event.preventDefault();input.type=input.type==='password'?'text':'password';renderValidation();});
    input.addEventListener('input',renderValidation);return {input,toggle,icon};
  });
  function renderValidation(){
    const c=validationCopy[(document.documentElement.lang||'es').slice(0,2)]||validationCopy.es,value=get('newPassword').value,repeat=get('repeatNewPassword').value;
    const valid=checks.map(check=>check(value));valid.push(!!value&&!!repeat&&value===repeat);
    ruleItems.forEach((item,i)=>{item.textContent=(valid[i]?'✓ ':'○ ')+c[i];item.className=valid[i]?'valid':i===5&&repeat?'invalid':'';});
    get('repeatNewPassword').setCustomValidity(repeat&&value!==repeat?labels()[7]:'');
    toggles.forEach(({input,toggle,icon})=>{const visible=input.type==='text';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',c[visible?7:6]);toggle.title=c[visible?7:6];icon.className='fa-regular '+(visible?'fa-eye-slash':'fa-eye');});
  }
  function labels(){return copy[(document.documentElement.lang||'es').slice(0,2)]||copy.es;}
  function translate(){const c=labels();['passwordSettingsTitle','currentPasswordLabel','newPasswordLabel','repeatNewPasswordLabel','passwordSettingsHelp'].forEach((id,i)=>get(id).textContent=c[i]);button.textContent=c[busy?6:5];renderValidation();}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    status.textContent='';status.classList.remove('error');
    if(get('newPassword').value!==get('repeatNewPassword').value){status.textContent=labels()[7];status.classList.add('error');return;}
    if(!checks.every(check=>check(get('newPassword').value))){get('newPassword').focus();return;}
    let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){}
    busy=true;button.disabled=true;translate();
    try{
      const result=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'change_password',perfil_token:user?.perfil_token,password_actual:get('currentPassword').value,password_nueva:get('newPassword').value,password_repetida:get('repeatNewPassword').value})});
      const data=await result.json();if(!data.ok)throw new Error(data.error||labels()[8]);
      form.reset();
      toggles.forEach(({input})=>input.type='password');renderValidation();
      // Limpiar la sesión local de inmediato; no depender de otra petición al servidor.
      window.AppDataCache?.clear();
      ['controlGastos.user','controlGastos.loggedIn','controlGastos.userEmail','controlGastos.lastActivity'].forEach(key=>sessionStorage.removeItem(key));
      try{localStorage.removeItem('controlGastos.rememberedSession');}catch(error){}
      sessionStorage.setItem('controlGastos.passwordChanged','true');
      try{await window.Credentials?.clear();}catch(error){}
      window.location.href=window.I18n?I18n.page('login.html'):'login.html';
    }catch(error){status.textContent=error instanceof TypeError?labels()[8]:error.message;status.classList.add('error');}
    finally{busy=false;button.disabled=false;translate();}
  });
  window.addEventListener('languagechange',translate);translate();
})();
