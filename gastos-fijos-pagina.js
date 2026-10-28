(function () {
  'use strict';
  let user;
  try {user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');} catch (error) {}
  if (!user || sessionStorage.getItem('controlGastos.loggedIn') !== 'true') {
    window.location.href = I18n.page('login.html'); return;
  }
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Auth.logout(); window.location.href = I18n.page('login.html');
  });
  const API = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const body = document.getElementById('fixedPageBody'), status = document.getElementById('fixedPageStatus');
  const form = document.getElementById('recordFixedForm'), date = document.getElementById('recordFixedDate');
  const method = document.getElementById('recordFixedMethod'), submit = document.getElementById('recordFixedSubmit');
  const paymentPeriod=document.getElementById('recordFixedPeriod');
  const refresh = document.getElementById('refreshFixedPage'), all = document.getElementById('selectAllFixed');
  const relogin = document.getElementById('fixedPageRelogin');
  let records = [], busy = false, loaded = false;
  const selected = new Set();
  const today = new Date();
  date.value = [today.getFullYear(), String(today.getMonth() + 1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
  if(paymentPeriod)paymentPeriod.value=date.value.slice(0,7);
  const eligible = item => Number.isFinite(item.monto) && item.monto > 0;
  const money = (value,currency='BRL') => new Intl.NumberFormat(I18n.locale, {style:'currency',currency,currencyDisplay:'code'}).format(value);
  function controls() {
    const available = records.filter(eligible);
    all.disabled = busy || !available.length;
    all.checked = available.length > 0 && selected.size === available.length;
    all.indeterminate = selected.size > 0 && selected.size < available.length;
    submit.disabled = busy || !loaded || !selected.size;
    refresh.disabled = date.disabled = method.disabled = busy;
    if(paymentPeriod)paymentPeriod.disabled=busy;
    body.querySelectorAll('input').forEach(input => {input.disabled = busy || input.dataset.invalid === 'true';});
    const sums=new Map();records.filter(item=>selected.has(item.id)).forEach(item=>{const code=item.moneda||'BRL';sums.set(code,(sums.get(code)||0)+item.monto);});
    document.getElementById('fixedSelectionTotal').textContent = I18n.t('fixedPage.total', {
      count:selected.size, total:sums.size?[...sums].map(([code,value])=>money(value,code)).join(' · '):money(0)
    });
  }
  function render() {
    body.replaceChildren();
    records.forEach(item => {
      const row = document.createElement('tr'), cell = document.createElement('td'), check = document.createElement('input');
      check.type = 'checkbox'; check.className = 'fixed-check'; check.checked = selected.has(item.id);
      check.dataset.invalid = String(!eligible(item)); check.setAttribute('aria-label',I18n.t('fixedPage.select',{id:item.id}));
      if (!eligible(item)) check.title = I18n.t('fixedPage.invalidAmount');
      check.addEventListener('change', () => {
        if (busy || !eligible(item)) return;
        if (check.checked) selected.add(item.id); else selected.delete(item.id); controls();
      });
      cell.appendChild(check); row.appendChild(cell);
      [item.id,item.descripcion,I18n.category?.(item.categoria) ?? item.categoria,eligible(item) ? money(item.monto,item.moneda||'BRL') : '—'].forEach(value => {
        const td = document.createElement('td'); td.textContent = String(value ?? ''); row.appendChild(td);
      }); body.appendChild(row);
    });
    if (!records.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 5; cell.textContent = I18n.t('fixed.empty'); row.appendChild(cell); body.appendChild(row);
    }
    controls();
  }
  async function request(action, extra = {}, progress = () => {}) {
    if (!user.perfil_token) {relogin.hidden = false; throw Error(I18n.t('fixed.session'));}
    const response = await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if (!response.ok) throw Error('HTTP ' + response.status);
    progress(35);
    const data = await response.json();
    if (!data.ok) throw Error(I18n.translate(data.error || 'No se pudo administrar el gasto fijo.'));
    progress(80);
    return data;
  }
  async function load() {
    if (busy) return;
    busy = true; controls(); status.className = 'configuration-status'; I18n.message(status,'');
    const loading=document.getElementById('fixedPageLoading');
    let currentProgress=0,progressTimer;
    function progress(value){currentProgress=Math.max(currentProgress,value);loading.setAttribute('aria-valuenow',String(currentProgress));document.getElementById('fixedPageLoadingPercent').textContent=currentProgress+'%';}
    loading.hidden=false;progress(5);
    function advance(){progress(Math.min(94,currentProgress+Math.max(1,Math.ceil((94-currentProgress)*.035))));progressTimer=setTimeout(advance,400);}
    progressTimer=setTimeout(advance,400);
    try {
      const data = await request('fixed_expenses',{},progress);
      if (!Array.isArray(data.gastos_fijos)) throw Error(I18n.t('fixed.invalidResponse'));
      records = data.gastos_fijos; selected.clear(); loaded = true; relogin.hidden = true;
      render();progress(100);
    } catch (error) {I18n.message(status,'No se pudieron cargar los gastos fijos: ' + error.message); status.classList.add('error');}
    finally {clearTimeout(progressTimer);loading.hidden=true;busy = false; controls();}
  }
  all.addEventListener('change', () => {
    if (busy) return;
    selected.clear(); if (all.checked) records.filter(eligible).forEach(item => selected.add(item.id)); render();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded || !selected.size || !form.reportValidity()) return;
    busy = true; controls(); status.className = 'configuration-status';
    I18n.message(status, I18n.t('fixedPage.saving'));
    try {
      const data = await request('record_fixed_expenses',{ids:Array.from(selected),fecha:date.value,medioPago:method.value,periodo:paymentPeriod?.value || date.value.slice(0,7)});
      if (!Number.isInteger(data.registrados) || !Number.isInteger(data.duplicados)) throw Error(I18n.t('fixed.invalidResponse'));
      selected.clear(); render();
      window.dispatchEvent?.(new CustomEvent('movementspaid'));
      window.dispatchEvent?.(new CustomEvent('fixedexpenseschange'));
      I18n.message(status,I18n.t('fixedPage.done',{count:data.registrados,duplicates:data.duplicados}));
    } catch (error) {I18n.message(status,I18n.t('fixedPage.error',{error:error.message})); status.classList.add('error');}
    finally {busy = false; controls();}
  });
  refresh.addEventListener('click',load);
  window.addEventListener('languagechange',render);
  window.addEventListener('currencychange',render);
  load();
})();
