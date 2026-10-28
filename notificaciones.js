(function () {
  'use strict';
  const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
  const selector = document.querySelector('.language-selector');
  if (!user || !user.perfil_token || !selector) return;
  const API = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const make = (tag, className) => {const element = document.createElement(tag); if (className) element.className = className; return element;};
  const tools = selector.parentNode.className==='platform-tools'?selector.parentNode:make('div', 'platform-tools'), bell = make('button', 'notification-bell');
  bell.type = 'button';
  bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
  const count = make('span', 'notification-count'); count.hidden = true; bell.appendChild(count);
  const panel = make('section', 'notification-panel'); panel.id = 'expenseNotifications'; panel.hidden = true;
  const heading = make('h3'); heading.id = 'expenseNotificationsTitle';
  panel.setAttribute('aria-labelledby', heading.id);
  const message = make('p'); message.setAttribute('role', 'status');
  const list = make('ul', 'notification-list'), settings = make('a');
  settings.href = I18n.page('configuracion.html?section=general&panel=notifications');
  panel.append(heading, message, list, settings);
  bell.setAttribute('aria-controls', panel.id); bell.setAttribute('aria-expanded', 'false');
  if(!tools.parentNode)selector.parentNode.insertBefore(tools, selector); tools.append(bell, selector, panel);
  const form = document.getElementById('notificationSettingsForm');
  const enabled = document.getElementById('notificationsEnabled'), days = document.getElementById('notificationDays');
  const save = document.getElementById('saveNotificationSettings'), status = document.getElementById('notificationSettingsStatus');
  let preferences = null, records = [], state = 'loading', saving = false, dirty = false, serial = 0;
  let paying = false, paymentNotice = '', paymentError = '';
  let settingsError=false;
  const preferencesFailure=()=>({es:'No se pudieron consultar las preferencias.',pt:'Não foi possível consultar as preferências.',en:'Could not load notification preferences.'})[(document.documentElement?.lang||'es').slice(0,2)]||'No se pudieron consultar las preferencias.';
  const noticesFailure=()=>({es:'Podés guardar las preferencias, pero no se pudieron cargar los vencimientos.',pt:'Você pode salvar as preferências, mas não foi possível carregar os vencimentos.',en:'You can save preferences, but upcoming payments could not be loaded.'})[(document.documentElement?.lang||'es').slice(0,2)]||'Podés guardar las preferencias, pero no se pudieron cargar los vencimientos.';
  async function request(action, extra = {}) {
    const result = await fetch(API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, perfil_token: user.perfil_token, ...extra})});
    if (!result.ok) throw Error('HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) throw Error(data.error || I18n.t('notifications.error'));
    return data;
  }
  function controls() {
    if (!form) return;
    enabled.disabled = days.disabled = save.disabled = !preferences || saving || paying;
    const retry=document.getElementById('notificationSettingsRetry');if(retry)retry.disabled=saving||paying;
  }
  function render() {
    const retry=document.getElementById('notificationSettingsRetry');if(retry)retry.textContent=({es:'Reintentar',pt:'Tentar novamente',en:'Retry'})[(document.documentElement?.lang||'es').slice(0,2)]||'Reintentar';
    heading.textContent = I18n.t('notifications.upcoming');
    settings.textContent = I18n.t('notifications.preferences');
    bell.title = I18n.t('notifications.title');
    bell.setAttribute('aria-label', I18n.t('notifications.bell', {count: records.length}));
    count.textContent = records.length > 99 ? '99+' : String(records.length);
    count.hidden = state !== 'ready' || !records.length;
    message.textContent = state === 'loading' ? I18n.t('notifications.loading') : state === 'error' ? I18n.t('notifications.error') :
      paymentNotice ? I18n.t(paymentNotice) : !preferences.activo ? I18n.t('notifications.disabled') : !records.length ? I18n.t('notifications.empty') : '';
    if (paymentError && state === 'ready') message.textContent += ' ' + I18n.translate(paymentError);
    list.replaceChildren();
    if (state !== 'ready') return;
    records.forEach(item => {
      const row = make('li', 'notification-item'), title = make('strong'), amount = make('span');
      title.textContent = item.descripcion;
      amount.textContent = item.monto == null ? '—' : new Intl.NumberFormat(I18n.locale, {style: 'currency', currency: item.moneda||'BRL',currencyDisplay:'code'}).format(item.monto);
      const due = make('span', item.dias === 0 ? 'notification-today' : 'notification-due');
      due.textContent = (item.dias === 0 ? I18n.t('notifications.today') : I18n.t('notifications.inDays', {days: item.dias})) + ' · ' +
        new Date(item.vencimiento + 'T12:00:00').toLocaleDateString(I18n.locale);
      const actions = make('div', 'notification-pay-actions');
      const method = make('select', 'notification-payment-method');
      method.setAttribute('aria-label', I18n.t('field.method'));
      if(window.PaymentMethods)window.PaymentMethods.fill(method,'Transferencia');
      else ['Transferencia', 'Efectivo', 'Débito', 'Crédito', 'Otro'].forEach(value => {
        const option = make('option'); option.value = value; option.textContent = I18n.translate(value); method.appendChild(option);
      });
      const pay = make('button', 'notification-pay'); pay.type = 'button';
      pay.textContent = I18n.t('notifications.pay');
      pay.setAttribute('aria-label', I18n.t('notifications.payFor', {name: item.descripcion}));
      pay.disabled = method.disabled = paying||!method.value;
      pay.addEventListener('click', () => markPaid(item, method.value));
      actions.append(method, pay);
      row.append(title, amount, due, actions); list.appendChild(row);
    });
  }
  async function refresh() {
    if (saving || paying) return;
    const current = ++serial;
    state = 'loading'; render();
    try {
      // Los medios de pago sólo se necesitan al pagar; su error no bloquea preferencias ni avisos.
      if(window.PaymentMethods)void window.PaymentMethods.load().then(()=>{if(current===serial&&state==='ready')render();}).catch(()=>{});
      const results=await Promise.allSettled([request('notifications'),form?request('notification_settings'):Promise.resolve(null)]);
      if (current !== serial) return;
      const data=results[0].status==='fulfilled'?results[0].value:null;
      const saved=results[1].status==='fulfilled'?results[1].value?.preferencias:null;
      const candidate=saved||data?.preferencias;
      if(candidate&&typeof candidate.activo==='boolean'&&Number.isInteger(candidate.dias)&&candidate.dias>=0&&candidate.dias<=30)preferences=candidate;
      if (form && !dirty && preferences) {enabled.checked = preferences.activo; days.value = preferences.dias;}
      if(!data||!Array.isArray(data.notificaciones)||!preferences){
        records=[];state='error';settingsError=true;
        const error=results[0].status==='rejected'?results[0].reason:results[1].status==='rejected'?results[1].reason:null;
        if(status)status.textContent=(preferences?noticesFailure():preferencesFailure())+(error?.message?' '+I18n.translate(error.message):'');
      }else{records=data.notificaciones;state='ready';if(settingsError&&status)status.textContent='';settingsError=false;}
    } catch (error) {
      if (current !== serial) return;
      records = []; state = 'error';
      settingsError=true;
      if (status) status.textContent = (preferences?noticesFailure():preferencesFailure())+' '+I18n.translate(error.message||'');
    }
    controls(); render();
  }
  async function markPaid(item, method) {
    if (paying || saving) return;
    paying = true; ++serial; paymentError = ''; paymentNotice = 'notifications.paying'; controls(); render();
    try {
      await request('pay_expense_notification', {id: item.id, vencimiento: item.vencimiento, medioPago: method});
      paymentNotice = 'notifications.paid';
      records = records.filter(record => record.id !== item.id || record.vencimiento !== item.vencimiento);
      window.dispatchEvent(new CustomEvent('movementspaid'));
    } catch (error) {paymentNotice = 'notifications.payError'; paymentError = error.message;}
    finally {paying = false; controls(); await refresh();}
  }
  function close(focus = false) {panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); if (focus) bell.focus();}
  bell.addEventListener('click', () => {
    if (!panel.hidden) {close(); return;}
    paymentNotice = '';
    paymentError = '';
    panel.hidden = false; bell.setAttribute('aria-expanded', 'true'); void refresh();
  });
  document.addEventListener('click', event => {if (!tools.contains(event.target)) close();});
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && !panel.hidden) {close(true);}});
  if (form) {
    form.addEventListener('input', () => {dirty = true;});
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = Number(days.value);
      if (saving || paying || !preferences || !form.reportValidity() || !Number.isInteger(value) || value < 0 || value > 30) return;
      saving = true; ++serial; controls(); status.textContent = I18n.t('notifications.saving');
      try {
        const data = await request('save_notification_settings', {activo: enabled.checked, dias: value});
        preferences = data.preferencias; dirty = false; status.textContent = I18n.t('notifications.saved');
      } catch (error) {status.textContent = I18n.t('notifications.saveError')+' '+I18n.translate(error.message||'');}
      finally {saving = false; controls(); await refresh();}
    });
    document.getElementById('notificationSettingsRetry')?.addEventListener('click',refresh);
  }
  window.addEventListener('languagechange', render);
  window.addEventListener('currencychange', render);
  window.addEventListener('fixedexpenseschange', refresh);
  window.addEventListener('focus', refresh);
  window.setInterval(() => {if (!document.hidden) void refresh();}, 300000);
  void refresh();
})();
