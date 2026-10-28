(function () {
  'use strict';
  const key = 'controlGastos.rememberedSession';
  const idleOptions = [5, 10, 20, 30, 60];
  const idleReasonKey = 'controlGastos.idleLogout';
  function idleSettingKey() {
    let user;
    try {user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');} catch (error) {}
    return 'controlGastos.idleMinutes.' + String(user && (user.id || user.usuario_id) || 'default');
  }
  function getIdleMinutes() {
    const setting = idleSettingKey();
    let value;
    try {value = localStorage.getItem(setting);} catch (error) {}
    if (value == null) value = sessionStorage.getItem(setting);
    const minutes = Number(value);
    return idleOptions.includes(minutes) ? minutes : 30;
  }
  function setIdleMinutes(value) {
    const minutes = Number(value);
    if (!idleOptions.includes(minutes)) throw new Error('Tiempo de inactividad inválido.');
    const setting = idleSettingKey();
    sessionStorage.setItem(setting, String(minutes));
    try {localStorage.setItem(setting, String(minutes));} catch (error) { /* Conservar durante la sesión actual. */ }
    checkIdle();
    return minutes;
  }
  let idleTimer = null, activityKey = null, lastActivity = 0, closingForIdle = false;
  function stopIdleMonitor() {
    if (idleTimer !== null && window.clearTimeout) window.clearTimeout(idleTimer);
    idleTimer = null;
    activityKey = null;
  }
  function storedActivity() {
    try {
      const value = Number(localStorage.getItem(activityKey));
      return Number.isFinite(value) && value > 0 && value <= Date.now() ? value : 0;
    } catch (error) {return 0;}
  }
  function saveActivity() {
    sessionStorage.setItem('controlGastos.lastActivity', String(lastActivity));
    try {localStorage.setItem(activityKey, String(lastActivity));} catch (error) { /* Usar actividad de esta pestaña. */ }
  }
  function closeForIdle() {
    if (closingForIdle) return;
    closingForIdle = true;
    sessionStorage.setItem(idleReasonKey, 'true');
    sessionStorage.setItem('controlGastos.idleLogoutMinutes', String(getIdleMinutes()));
    // logout limpia la sesión local antes de esperar la respuesta del servidor.
    void logout();
    window.location.href = window.I18n ? window.I18n.page('login.html') : 'login.html';
  }
  function checkIdle() {
    if (!activityKey || sessionStorage.getItem('controlGastos.loggedIn') !== 'true') return;
    lastActivity = Math.max(lastActivity, storedActivity());
    const remaining = getIdleMinutes() * 60 * 1000 - (Date.now() - lastActivity);
    if (remaining <= 0) {closeForIdle(); return;}
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(checkIdle, remaining);
  }
  function recordActivity(event) {
    if (!activityKey || closingForIdle) return;
    // Verificar primero: despertar una pestaña suspendida no revive una sesión vencida.
    checkIdle();
    if (closingForIdle) {
      if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
      if (event && event.cancelable && event.preventDefault) event.preventDefault();
      return;
    }
    lastActivity = Date.now(); saveActivity(); checkIdle();
  }
  function startIdleMonitor(user, fresh = false) {
    if (!window.addEventListener || !window.setTimeout || !user) return;
    stopIdleMonitor(); closingForIdle = false;
    activityKey = 'controlGastos.activity.' + String(user.id || user.usuario_id);
    const stored = Number(sessionStorage.getItem('controlGastos.lastActivity'));
    const previous = stored > 0 && stored <= Date.now() ? stored : 0;
    lastActivity = fresh ? Date.now() : previous > 0 ? previous : storedActivity() || Date.now();
    if (fresh) {sessionStorage.removeItem(idleReasonKey); sessionStorage.removeItem('controlGastos.idleLogoutMinutes'); saveActivity();}
    else if (!previous && !storedActivity()) saveActivity();
    checkIdle();
  }
  const api = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  function forget() { try { localStorage.removeItem(key); } catch (error) { /* Almacenamiento no disponible. */ } }
  function remembered() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (!value || typeof value.token !== 'string' || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
        forget(); return null;
      }
      return value;
    } catch (error) { forget(); return null; }
  }
  function remember(value, username = '') {
    forget();
    if (!value) return;
    try { localStorage.setItem(key, JSON.stringify({token: value.token, expiresAt: value.expiresAt,
      username: username || value.username || '', signedOut: value.signedOut === true})); }
    catch (error) { /* El ingreso actual sigue disponible sin persistencia. */ }
  }
  async function request(data, keepalive = false) {
    const response = await fetch(api, {method: 'POST', keepalive, headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(data)});
    if (!response.ok) throw new Error('No se pudo conectar con el servidor.');
    return response.json();
  }
  function enter(user) {
    const fields = {...user};
    delete fields.sesion_recordada;
    sessionStorage.setItem('controlGastos.user', JSON.stringify(fields));
    sessionStorage.setItem('controlGastos.loggedIn', 'true');
    sessionStorage.removeItem(idleReasonKey);
    startIdleMonitor(fields, true);
  }
  async function resume() {
    const value = remembered();
    if (!value) return false;
    const result = await request({action: 'resume_session', token: value.token});
    if (!result.ok || !result.usuario || !result.usuario.perfil_token) {
      forget(); return false;
    }
    enter(result.usuario);
    remember({...value, signedOut: false}, result.usuario.usuario_id);
    return true;
  }
  let logoutTask=null;
  function beginLogoutTransition(){
    const doc=window.document;if(!doc?.body||!window.setTimeout)return Promise.resolve();
    doc.body.classList.add('session-leaving');doc.body.setAttribute('aria-busy','true');
    Array.from(doc.body.children||[]).forEach(node=>{if(!['SCRIPT','STYLE','LINK'].includes(node.tagName)&&node.id!=='logoutTransition')node.inert=true;});
    if(!doc.getElementById('logoutTransition')){
      const overlay=doc.createElement('div');overlay.id='logoutTransition';overlay.className='logout-transition';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
      const lang=(doc.documentElement.lang||'es').slice(0,2);
      const text=doc.createElement('span');
      text.textContent=({es:'Cerrando sesión…',pt:'Encerrando sessão…',en:'Signing out…'})[lang]||'Cerrando sesión…';
      overlay.appendChild(text);doc.body.appendChild(overlay);
    }
    return new Promise(resolve=>window.setTimeout(resolve,4000));
  }
  async function logout(forgetAccount = false) {
    if(logoutTask)return logoutTask;
    logoutTask=performLogout(forgetAccount);
    try{return await logoutTask;}finally{logoutTask=null;}
  }
  async function performLogout(forgetAccount) {
    const transition=beginLogoutTransition();
    window.AppDataCache?.clear();
    stopIdleMonitor();
    const value = remembered();
    let user;
    try { user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'); } catch (error) { user = null; }
    if (forgetAccount || !value) forget();
    else remember({...value, signedOut: true}, user && user.usuario_id);
    ['controlGastos.loggedIn', 'controlGastos.user', 'controlGastos.userEmail', 'controlGastos.lastActivity'].forEach(name => sessionStorage.removeItem(name));
    const revoke=request({action:'logout_session',token:forgetAccount&&value?value.token:null,perfil_token:user&&user.perfil_token},true).catch(()=>{});
    let timer;
    // Revocar en segundo plano sin dejar al usuario esperando indefinidamente por la red.
    const remote=window.setTimeout?Promise.race([revoke,new Promise(resolve=>{timer=window.setTimeout(resolve,2500);})]):revoke;
    try{await Promise.all([transition,remote]);}finally{if(timer!==undefined)window.clearTimeout(timer);}
  }
  window.Auth = {remember, remembered, resume, enter, logout, getIdleMinutes, setIdleMinutes};
  if (window.addEventListener) {
    ['pointerdown', 'pointermove', 'keydown', 'input', 'wheel', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, recordActivity, {capture: true});
    });
    window.addEventListener('focus', checkIdle);
    window.addEventListener('pageshow', checkIdle);
    window.addEventListener('storage', event => {if (event.key === activityKey || event.key === idleSettingKey()) checkIdle();});
    if (window.document) window.document.addEventListener('visibilitychange', checkIdle);
    if (sessionStorage.getItem('controlGastos.loggedIn') === 'true') {
      try {startIdleMonitor(JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'));} catch (error) { /* Sesión inválida. */ }
    }
  }
})();
