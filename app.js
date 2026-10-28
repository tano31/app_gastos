
const loggedIn =
  sessionStorage.getItem(
    'controlGastos.loggedIn'
  );

if (loggedIn !== 'true') {
  window.location.href = I18n.page('login.html');
}

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';

const form = document.getElementById('movementForm');
const table = document.getElementById('movementTable');
const statusMessage = document.getElementById('statusMessage');
const selectAllMovements = document.getElementById('selectAllMovements');
const selectedMovements = new Set();
const currentMovementMonth = (() => { const now = new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); })();
const selectedMovementMonths = new Set([currentMovementMonth]);
function visibleMovements() {
  return movements.filter(item => selectedMovementMonths.has(String(item.fecha).slice(0, 7)));
}
function renderMovementMonths() {
  const months = [...new Set([currentMovementMonth, ...selectedMovementMonths, ...movements.map(item => String(item.fecha).slice(0, 7))])]
    .filter(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)).sort().reverse();
  const names = month => month === currentMovementMonth ? I18n.t('analytics.current') : new Intl.DateTimeFormat(document.documentElement.lang || 'es', {month: 'long', year: 'numeric'}).format(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
  document.getElementById('movementMonthsSummary').textContent = months.length > 1 && selectedMovementMonths.size === months.length ? I18n.t('filters.all') : [...selectedMovementMonths].sort().reverse().map(names).join(' · ') || I18n.t('field.month');
  const options = document.getElementById('movementMonthOptions');
  options.innerHTML = '';
  const allLabel = document.createElement('label'), allInput = document.createElement('input'), allText = document.createElement('span');
  allInput.type = 'checkbox'; allInput.className = 'fixed-check'; allInput.id = 'selectAllMovementMonths';
  allInput.checked = months.every(month => selectedMovementMonths.has(month));
  allInput.indeterminate = selectedMovementMonths.size > 0 && !allInput.checked;
  allInput.disabled = deletingMovements;
  allText.textContent = I18n.t('filters.all');
  allLabel.appendChild(allInput); allLabel.appendChild(allText);
  allInput.addEventListener('change', () => {
    if (deletingMovements) return;
    selectedMovementMonths.clear();
    if (allInput.checked) months.forEach(month => selectedMovementMonths.add(month));
    selectedMovements.clear();
    document.getElementById('movementDeleteStatus').textContent = '';
    render();
  });
  [currentMovementMonth, ...months.filter(month => month !== currentMovementMonth)].forEach(month => {
    const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
    input.type = 'checkbox'; input.className = 'fixed-check'; input.value = month; input.checked = selectedMovementMonths.has(month);
    input.disabled = deletingMovements;
    input.addEventListener('change', () => {
      if (deletingMovements) return;
      if (input.checked) selectedMovementMonths.add(month);
      else selectedMovementMonths.delete(month);
      selectedMovements.clear();
      document.getElementById('movementDeleteStatus').textContent = '';
      render();
    });
    text.textContent = names(month); label.appendChild(input); label.appendChild(text); options.appendChild(label);
    if (month === currentMovementMonth) options.appendChild(allLabel);
  });
}
let deletingMovements = false;
const deleteSelectedMovements = document.getElementById('deleteSelectedMovements');
function updateMovementSelection() {
  const visible = visibleMovements();
  const selected = visible.filter(item => selectedMovements.has(item.id));
  deleteSelectedMovements.hidden = !selected.length || JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null')?.admin !== true;
  deleteSelectedMovements.disabled = deletingMovements;
  selectAllMovements.disabled = deletingMovements || visible.length === 0;
  selectAllMovements.checked = visible.length > 0 && selected.length === visible.length;
  selectAllMovements.indeterminate = selected.length > 0 && selected.length < visible.length;
}
selectAllMovements.addEventListener('change', () => {
  if (deletingMovements) return;
  selectedMovements.clear();
  if (selectAllMovements.checked) visibleMovements().forEach(item => selectedMovements.add(item.id));
  render();
});
table.addEventListener('change', event => {
  if (deletingMovements) { render(); return; }
  if (!event.target.matches('.movement-check')) return;
  const id = Number(event.target.dataset.id);
  if (!visibleMovements().some(item => item.id === id)) return;
  if (event.target.checked) selectedMovements.add(id); else selectedMovements.delete(id);
  updateMovementSelection();
});
deleteSelectedMovements.addEventListener('click', async () => {
  const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
  if (deletingMovements || user?.admin !== true || !selectedMovements.size) return;
  const ids = visibleMovements().filter(item => selectedMovements.has(item.id)).map(item => item.id);
  if (!ids.length || !window.confirm(I18n.t('movement.deleteSelectedConfirm', {count: ids.length}))) return;
  deletingMovements = true;
  renderMovementMonths();
  updateMovementSelection();
  let deleted = 0, failure = false;
  try {
    for (const id of ids) {
      const result = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({action: 'delete', id, perfil_token: user.perfil_token})
      });
      if (!result.ok) throw new Error('HTTP ' + result.status);
      const body = await result.json();
      if (!body.ok) throw new Error('Delete rejected');
      selectedMovements.delete(id);
      movements = movements.filter(item => item.id !== id);
      deleted++;
    }
  } catch (error) { failure = true; }
  finally {
    deletingMovements = false;
    render();
    const refreshed = await cargarDesdeGoogleSheets();
    I18n.message(document.getElementById('movementDeleteStatus'), I18n.t(failure || !refreshed ? 'movement.deleteSelectedPartial' : 'movement.deleteSelectedDone', {count: deleted}));
    if (deleted) window.dispatchEvent?.(new CustomEvent('fixedexpenseschange'));
  }
});

const totals = {
  ingresos: document.getElementById('totalIngresos'),
  gastos: document.getElementById('totalGastos'),
  ahorro: document.getElementById('totalAhorro'),
  saldo: document.getElementById('saldoDisponible'),
};

let movements = [];

function init() {
  const today = new Date();
  document.getElementById('fecha').valueAsDate = today;
  renderMovementMonths();
  cargarDesdeGoogleSheets();
}

// Aca se detalla el tipo de moneda
function formatMoney(value) {
  if(window.PlatformCurrency)return PlatformCurrency.formatNumber(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function labelTipo(tipo) {
  const labels = {
    gasto_variable: 'Gasto variable',
    gasto_fijo: 'Gasto fijo',
    ingreso: 'Ingreso',
    ahorro: 'Ahorro',
  };

  return labels[tipo] || tipo;
}

function calculateTotals(list) {
  const totalIngresos = list
    .filter((m) => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + (window.PlatformCurrency?PlatformCurrency.movementValue(m) ?? 0:Number(m.monto)), 0);

  const totalGastos = list
    .filter((m) => m.tipo === 'gasto_fijo' || m.tipo === 'gasto_variable')
    .reduce((sum, m) => sum + (window.PlatformCurrency?PlatformCurrency.movementValue(m) ?? 0:Number(m.monto)), 0);

  const totalAhorro = list
    .filter((m) => m.tipo === 'ahorro')
    .reduce((sum, m) => sum + (window.PlatformCurrency?PlatformCurrency.movementValue(m) ?? 0:Number(m.monto)), 0);

  return {
    totalIngresos,
    totalGastos,
    totalAhorro,
    saldoDisponible: totalIngresos - totalGastos - totalAhorro,
  };
}

function renderTotals(list) {
  const result = calculateTotals(list);

  totals.ingresos.textContent = formatMoney(result.totalIngresos);
  totals.gastos.textContent = formatMoney(result.totalGastos);
  totals.ahorro.textContent = formatMoney(result.totalAhorro);
  totals.saldo.textContent = formatMoney(result.saldoDisponible);
  if(window.PlatformCurrency) {
    const missing=items=>items.some(item=>PlatformCurrency.movementValue(item)===null);
    if(missing(list.filter(item=>item.tipo==='ingreso')))totals.ingresos.textContent='—';
    if(missing(list.filter(item=>['gasto_fijo','gasto_variable'].includes(item.tipo))))totals.gastos.textContent='—';
    if(missing(list.filter(item=>item.tipo==='ahorro')))totals.ahorro.textContent='—';
    if(missing(list))totals.saldo.textContent='—';
  }
}

function renderTable(list) {
  const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  table.innerHTML = '';

  if (list.length === 0) {
    table.innerHTML = '<tr><td colspan="8">' + I18n.t('movement.empty') + '</td></tr>';
    return;
  }

  [...list]
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .forEach((movement) => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td><input type="checkbox" class="fixed-check movement-check" data-id="${movement.id}" ${selectedMovements.has(movement.id) ? 'checked' : ''} aria-label="${safe(I18n.t('fixedPage.select', {id: movement.id}))}"></td>
        <td>${String(movement.fecha).substring(0,10)}</td>
        <td>${safe(movement.descripcion)}</td>
        <td><span class="badge${movement.tipo === 'ingreso' ? ' badge-income' : movement.tipo === 'ahorro' ? ' badge-savings' : ''}">${labelTipo(movement.tipo)}</span></td>
        <td>${safe(I18n.category?.(movement.categoria) ?? movement.categoria)}</td>
        <td>${safe(movement.medioPago)}</td>
        <td>${window.PlatformCurrency?PlatformCurrency.formatNumber(PlatformCurrency.movementValue(movement)):formatMoney(Number(movement.monto))}</td>
        <td><div class="fixed-row-actions">${(()=>{const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');return user?.admin===true||String(movement.usuario_id)===String(user?.usuario_id)?`<button class="edit-row" data-id="${movement.id}">${I18n.t('profile.edit')}</button>`:'';})()}</div></td>
      `;

      table.appendChild(row);
    });
}

function render() {
  const visible = visibleMovements();
  const ids = new Set(visible.map(item => item.id));
  selectedMovements.forEach(id => { if (!ids.has(id)) selectedMovements.delete(id); });
  renderTotals(visible);
  renderTable(visible);
  renderMovementMonths();
  updateMovementSelection();
}

async function cargarDesdeGoogleSheets() {
  I18n.message(statusMessage, '');
  const loading=document.getElementById('movementsLoading');
  let currentProgress=0,progressTimer;
  function progress(value){currentProgress=Math.max(currentProgress,value);loading.setAttribute('aria-valuenow',String(currentProgress));document.getElementById('movementsLoadingPercent').textContent=currentProgress+'%';}
  loading.hidden=false;progress(5);
  function advance(){progress(Math.min(94,currentProgress+Math.max(1,Math.ceil((94-currentProgress)*.035))));progressTimer=setTimeout(advance,400);}
  progressTimer=setTimeout(advance,400);

  try {
    const viewer=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'movements',perfil_token:viewer?.perfil_token})});
    if (!response.ok) throw new Error('Error HTTP ' + response.status);
    progress(35);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.error || 'Respuesta de movimientos inválida.');
    progress(80);

    movements = data.map((item) => ({
      id: Number(item.id),
      fecha: String(item.fecha),
      descripcion: item.descripcion,
      tipo: item.tipo,
      categoria: item.categoria,
      medioPago: item.medioPago,
      monto: Number(item.monto),
      monto_ars: item.monto_ars,
      monto_usd: item.monto_usd,
      moneda_original: item.moneda_original || 'BRL',
      monto_original: item.monto_original ?? item.monto,
      creadoEn: item.creadoEn,
      usuario_id: item.usuario_id,
    }));

    render();
    progress(100);
    return true;
  } catch (error) {
    console.error(error);
    I18n.message(statusMessage, 'No se pudieron cargar los movimientos desde Google Sheets.');
    return false;
  } finally {clearTimeout(progressTimer);loading.hidden=true;}
}

async function crearMovimiento(movement) {
  const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
  if (!user || !user.perfil_token) throw new Error('Volvé a iniciar sesión para registrar movimientos.');
  const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({...movement, perfil_token: user.perfil_token}),
  });
  if (!response.ok) throw new Error('Error HTTP ' + response.status);
  const result = await response.json();
  if (!result.ok || !Number.isSafeInteger(result.id) || result.id <= 0) throw new Error(result.error || 'El servidor no confirmó el guardado.');
  return result;
}

window.addEventListener('movementspaid', cargarDesdeGoogleSheets);

let savingMovement = false;
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (savingMovement) return;

  const movement = {
    action: 'create',
    fecha: document.getElementById('fecha').value,
    descripcion: document.getElementById('descripcion').value.trim(),
    tipo: document.getElementById('tipo').value,
    categoria: document.getElementById('categoria').value,
    medioPago: document.getElementById('medioPago').value,
    monto: Number(document.getElementById('monto').value),
    moneda: document.getElementById('movementCurrency').value || 'BRL',
  };
  if(movement.tipo==='gasto_fijo')movement.periodo=document.getElementById('manualFixedPeriod')?.value || movement.fecha.slice(0,7);

  if (!movement.descripcion || !movement.fecha || !movement.monto) {
    I18n.message(statusMessage, 'Completá fecha, descripción y monto.');
    return;
  }

  try {
    savingMovement = true;
    form.querySelector('button[type="submit"]').disabled = true;
    I18n.message(statusMessage, 'Guardando movimiento...');

    const result = await crearMovimiento(movement);
    window.dispatchEvent?.(new CustomEvent('fixedexpenseschange'));
    const refreshed = await cargarDesdeGoogleSheets();

    form.reset();
    updateManualFixedPeriod();
    document.getElementById('fecha').valueAsDate = new Date();

    I18n.message(statusMessage, result.duplicado ? I18n.t('fixedPage.alreadyPaid') : !refreshed ? 'El movimiento se guardó, pero no se pudo actualizar la lista. Recargá la página.' :
      result.sinCotizacion ? 'Movimiento guardado en BRL. No hay cotización histórica: ARS y USD quedan pendientes.' : 'Movimiento agregado en Google Sheets.');
  } catch (error) {
    console.error(error);
    I18n.message(statusMessage, 'No se pudo confirmar el guardado: ' + error.message + '. Revisá la hoja antes de reintentar.');
  } finally {
    savingMovement = false;
    form.querySelector('button[type="submit"]').disabled = false;
  }
});

document.getElementById('exportCsv').addEventListener('click', () => {
  const rows = [
    ['id', 'fecha', 'descripcion', 'tipo', 'categoria', 'medioPago', 'monto', 'creadoEn'],
    ...visibleMovements().filter(m => selectedMovements.size === 0 || selectedMovements.has(m.id)).map((m) => [
      m.id,
      m.fecha,
      m.descripcion,
      labelTipo(m.tipo),
      m.categoria,
      m.medioPago,
      m.monto,
      m.creadoEn,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'movimientos_gastos.csv';
  link.click();

  URL.revokeObjectURL(url);
});

init();

const logoutBtn = document.getElementById("logoutBtn");

const GOOGLE_SHEETS_URL =
    'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';

document
    .getElementById("googleSheetsBtn")?.addEventListener("click", (e) => {

        e.preventDefault();

        window.open(
            GOOGLE_SHEETS_URL,
            "_blank"
        );

    });

    logoutBtn.addEventListener('click', async () => {
  if (!confirm(I18n.t('session.confirm'))) return;
  if (window.Auth) await Auth.logout();
  sessionStorage.removeItem(
    'controlGastos.loggedIn'
  );

  sessionStorage.removeItem(
    'controlGastos.userEmail'
  );
  sessionStorage.removeItem('controlGastos.user');

  window.location.href = I18n.page('login.html');
});

window.addEventListener('languagechange', render);
window.addEventListener('currencychange', render);
function updateManualFixedPeriod() {
  const label=document.getElementById('manualFixedPeriodLabel'),input=document.getElementById('manualFixedPeriod');
  if(!label||!input)return;
  label.hidden=document.getElementById('tipo').value!=='gasto_fijo';input.required=!label.hidden;
  if(!input.value){const now=new Date();input.value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');}
}
document.getElementById('tipo').addEventListener('change',updateManualFixedPeriod);
updateManualFixedPeriod();
