(function () {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const form = document.getElementById('fixedExpenseForm');
  const manualPanel = document.getElementById('fixedExpenseManualPanel');
  const description = document.getElementById('fixedExpenseDescription');
  const category = document.getElementById('fixedExpenseCategory');
  const amount = document.getElementById('fixedExpenseAmount');
  const currency = document.getElementById('fixedExpenseCurrency');
  const dueDate = document.getElementById('fixedExpenseDueDate');
  const monthly = document.getElementById('fixedExpenseMonthly');
  const money = {format:(value,code='BRL')=>new Intl.NumberFormat(I18n.locale,{style:'currency',currency:code,currencyDisplay:'code'}).format(value)};
  const save = document.getElementById('saveFixedExpense');
  const cancel = document.getElementById('cancelFixedExpense');
  const refresh = document.getElementById('refreshFixedExpenses');
  const status = document.getElementById('fixedExpenseStatus');
  const relogin = document.getElementById('fixedExpenseRelogin');
  const title = document.getElementById('fixedExpenseFormTitle');
  const body = document.getElementById('fixedExpensesBody');
  let records = [], editingId = null, busy = false, loaded = false;
  let availableCategories = [];
  const categoryLabel = name => I18n.category?.(name) ?? name;
  const categoryOriginal = name => I18n.categoryValue?.(name, availableCategories) ?? name;
  function renderCategorySuggestions() {
    const suggestions = document.getElementById('fixedExpenseCategories'); suggestions.replaceChildren();
    availableCategories.forEach(name => {const option=document.createElement('option'); option.value=categoryLabel(name); suggestions.appendChild(option);});
  }
  const importFile = document.getElementById('fixedExpenseImportFile');
  const importSheet = document.getElementById('fixedExpenseImportSheet');
  const importSheetLabel = document.getElementById('fixedExpenseImportSheetLabel');
  const importStatus = document.getElementById('fixedExpenseImportStatus');
  const importPreview = document.getElementById('fixedExpenseImportPreview');
  const importBody = document.getElementById('fixedExpenseImportBody');
  const importConfirm = document.getElementById('confirmFixedExpenseImport');
  const importCancel = document.getElementById('cancelFixedExpenseImport');
  const importTemplate = document.getElementById('downloadFixedExpenseTemplate');
  let importBook = null, importRows = [];

  function message(text, error = false) {
    I18n.message(status, text);
    status.className = 'configuration-status' + (error ? ' error' : '');
  }
  function controls() {
    save.disabled = busy || !loaded;
    if (dueDate) dueDate.disabled = busy;
    if (monthly) monthly.disabled = busy;
    if (currency) currency.disabled = busy;
    cancel.disabled = refresh.disabled = description.disabled = category.disabled = amount.disabled = busy;
    cancel.hidden = editingId === null;
    I18n.message(save, busy ? 'Guardando...' : editingId === null ? 'Guardar gasto fijo' : 'Guardar cambios');
    I18n.message(title, editingId === null ? 'Nuevo gasto fijo' : 'Editar gasto fijo');
    body.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    const blocked = busy || !loaded || editingId !== null;
    [importFile, importSheet, importTemplate, importCancel].forEach(element => {element.disabled = blocked;});
    importConfirm.disabled = blocked || !importRows.length;
  }
  function resetForm() {
    editingId = null;
    form.reset();
    controls();
  }
  async function request(action, extra = {}) {
    let user;
    try { user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'); } catch (error) { user = null; }
    if (!user || !user.perfil_token) {
      relogin.hidden = false;
      throw new Error('Volvé a iniciar sesión para administrar tus gastos fijos.');
    }
    const result = await fetch(API_URL, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, perfil_token: user.perfil_token, ...extra})});
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) {
      if (data.error === 'Volvé a iniciar sesión para administrar tus gastos fijos.') relogin.hidden = false;
      throw new Error(data.error || 'No se pudo administrar el gasto fijo.');
    }
    relogin.hidden = true;
    return data;
  }
  function renderTable() {
    body.replaceChildren();
    for (const item of records) {
      const row = document.createElement('tr');
      const date = new Date(item.fecha);
      [item.id, Number.isFinite(date.getTime()) ? date.toLocaleDateString(I18n.locale) : item.fecha,
        item.usuario_id, item.descripcion, categoryLabel(item.categoria), item.monto === null || item.monto === undefined ? '—' : money.format(item.monto,item.moneda||'BRL'),
        item.vencimiento ? new Date(item.vencimiento + 'T12:00:00').toLocaleDateString(I18n.locale) + (item.repetir_mensual ? ' · ' + I18n.t('notifications.monthly') : '') : '—'].forEach(value => {
        const cell = document.createElement('td'); cell.textContent = String(value ?? ''); row.appendChild(cell);
      });
      const cell = document.createElement('td');
      const actions = document.createElement('div'); actions.className = 'fixed-row-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = I18n.t('profile.edit');
      edit.addEventListener('click', () => {
        if (busy) return;
        editingId = item.id; description.value = item.descripcion; category.value = categoryLabel(item.categoria);
        amount.value = item.monto ?? '';
        if(currency)currency.value=item.moneda||'BRL';
        if (dueDate) dueDate.value = item.vencimiento || '';
        if (monthly) monthly.checked = item.repetir_mensual === true;
        manualPanel.open = true;
        message(''); controls(); description.focus();
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.hidden = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null')?.admin !== true; remove.textContent = I18n.t('common.delete');
      remove.addEventListener('click', () => deleteExpense(item));
      actions.append(edit, remove); cell.appendChild(actions); row.appendChild(cell); body.appendChild(row);
    }
    if (!records.length) {
      const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 8;
      cell.textContent = I18n.t('fixed.empty'); row.appendChild(cell); body.appendChild(row);
    }
    controls();
  }
  async function readList() {
    const data = await request('fixed_expenses');
    if (!Array.isArray(data.gastos_fijos) || !Array.isArray(data.categorias)) throw new Error('El servidor no devolvió los gastos fijos.');
    records = data.gastos_fijos;
    availableCategories = data.categorias;
    renderCategorySuggestions();
    loaded = true; renderTable();
  }
  async function open() {
    if (busy) return;
    busy = true; controls(); message('Cargando gastos fijos...');
    try { await readList(); message('Gastos fijos cargados.'); }
    catch (error) { message('No se pudieron cargar los gastos fijos: ' + error.message, true); }
    finally { busy = false; controls(); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded) return;
    const data = {descripcion: description.value.trim(), categoria: categoryOriginal(category.value.trim()), monto: Number(amount.value),moneda:currency?.value||'BRL'};
    if (dueDate) {data.vencimiento = dueDate.value; data.repetir_mensual = !!dueDate.value && monthly.checked;}
    if (!data.descripcion || !data.categoria) { message('Completá descripción y categoría.', true); return; }
    if (!Number.isFinite(data.monto) || data.monto <= 0) { message('El monto debe ser un número positivo.', true); return; }
    const action = editingId === null ? 'create_fixed_expense' : 'update_fixed_expense';
    if (editingId !== null) data.id = editingId;
    busy = true; controls(); message('Guardando gasto fijo...');
    try {
      await request(action, data); resetForm();
      window.dispatchEvent(new CustomEvent('fixedexpenseschange'));
      try { await readList(); message('Gasto fijo guardado.'); }
      catch (error) { message('El gasto fijo se guardó, pero no se pudo actualizar la lista. Usá Actualizar lista.', true); }
    } catch (error) { message('No se pudo confirmar el cambio: ' + error.message + ' Actualizá la lista antes de reintentar.', true); }
    finally { busy = false; controls(); }
  });
  async function deleteExpense(item) {
    if (busy || !window.confirm(I18n.t('fixed.confirmDelete', {id: item.id}))) return;
    busy = true; controls(); message('Eliminando gasto fijo...');
    try {
      await request('delete_fixed_expense', {id: item.id});
      window.dispatchEvent(new CustomEvent('fixedexpenseschange'));
      if (editingId === item.id) resetForm();
      try { await readList(); message('Gasto fijo eliminado.'); }
      catch (error) { message('El gasto fijo se eliminó, pero no se pudo actualizar la lista. Usá Actualizar lista.', true); }
    } catch (error) { message('No se pudo confirmar el cambio: ' + error.message + ' Actualizá la lista antes de reintentar.', true); }
    finally { busy = false; controls(); }
  }
  cancel.addEventListener('click', () => { if (!busy) { resetForm(); message(''); } });
  refresh.addEventListener('click', open);
  function currentUser() {
    const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
    if (!user || !user.perfil_token) throw new Error('Volvé a iniciar sesión para administrar tus gastos fijos.');
    return user;
  }
  function importMessage(text, error = false) {
    I18n.message(importStatus, text); importStatus.className = 'configuration-status' + (error ? ' error' : '');
  }
  function clearImport(resetFile = true) {
    importBook = null; importRows = []; if (resetFile) importFile.value = ''; importSheet.replaceChildren();
    importSheetLabel.hidden = true; importPreview.hidden = true; importBody.replaceChildren(); controls();
  }
  function previewImport() {
    importRows = []; importPreview.hidden = true; importBody.replaceChildren();
    try {
      importRows = ExcelFixedImport.rows(importBook, importSheet.value, String(currentUser().usuario_id));
      importRows.slice(0,100).forEach(item => {
        const row = document.createElement('tr');
        [item.descripcion,categoryLabel(item.categoria),money.format(item.monto,item.moneda||'BRL'),item.fecha ? new Date(item.fecha).toLocaleDateString(I18n.locale) : I18n.t('fixedImport.dateNow')].forEach(value => {
          const cell = document.createElement('td'); cell.textContent = String(value); row.appendChild(cell);
        }); importBody.appendChild(row);
      });
      importPreview.hidden = false;
      importMessage('Gastos listos para importar: ' + importRows.length + '.');
    } catch (error) {importMessage(error.message, true);}
    controls();
  }
  importFile.addEventListener('change', async () => {
    if (busy || editingId !== null || !loaded) return;
    const file = importFile.files[0];
    clearImport(false); if (!file) return;
    busy = true; controls(); importMessage('Leyendo Excel...');
    try {
      importBook = await ExcelFixedImport.read(file);
      importBook.SheetNames.forEach(name => {const option = document.createElement('option'); option.value = name; option.textContent = name; importSheet.appendChild(option);});
      importSheet.value = importBook.SheetNames.includes('Gastos_fijos') ? 'Gastos_fijos' : importBook.SheetNames[0];
      importSheetLabel.hidden = false; previewImport();
    } catch (error) {importMessage(error.message, true);}
    finally {busy = false; controls();}
  });
  importSheet.addEventListener('change', () => {if (!busy && importBook) previewImport();});
  importCancel.addEventListener('click', () => {if (!busy) {clearImport(); importMessage('');}});
  importTemplate.addEventListener('click', () => {
    if (busy || !loaded || editingId !== null) return;
    try {ExcelFixedImport.template(String(currentUser().usuario_id));}
    catch (error) {importMessage(error.message, true);}
  });
  importConfirm.addEventListener('click', async () => {
    if (busy || !loaded || editingId !== null || !importRows.length) return;
    busy = true; controls(); importMessage('Importando gastos fijos...');
    try {
      const result = await request('import_fixed_expenses', {gastos_fijos: importRows});
      clearImport();
      importMessage('Importación finalizada: ' + result.importados + ' importados y ' + result.duplicados + ' duplicados omitidos.');
      try {await readList();}
      catch (error) {message('La importación se guardó, pero no se pudo actualizar la lista. Usá Actualizar lista.',true);}
    } catch (error) {importMessage('No se pudo confirmar la importación: ' + error.message + ' Actualizá la lista antes de reintentar.',true);}
    finally {busy = false; controls();}
  });
  window.addEventListener('languagechange', () => {category.value=categoryLabel(categoryOriginal(category.value));renderCategorySuggestions();renderTable();if(importRows.length)previewImport();});
  window.FixedExpenses = {open};
  window.addEventListener('currencychange',()=>{renderTable();if(importRows.length)previewImport();});
  controls();
})();
