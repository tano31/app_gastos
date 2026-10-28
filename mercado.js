(function () {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const form = document.getElementById('marketForm');
  const productName = document.getElementById('marketProductName');
  const primaryBrand = document.getElementById('marketPrimaryBrand');
  const secondaryBrand = document.getElementById('marketSecondaryBrand');
  const quantity = document.getElementById('marketQuantity');
  const presentation = document.getElementById('marketPresentation');
  const save = document.getElementById('saveMarketProduct');
  const cancel = document.getElementById('cancelMarketProduct');
  const refresh = document.getElementById('refreshMarket');
  const status = document.getElementById('marketStatus');
  const relogin = document.getElementById('marketRelogin');
  const title = document.getElementById('marketFormTitle');
  const manualPanel = document.getElementById('marketManualPanel');
  const body = document.getElementById('marketBody');
  let records = [], editingId = null, busy = false, loaded = false;

  function message(text, error = false) {
    I18n.message(status, text);
    status.className = 'configuration-status' + (error ? ' error' : '');
  }
  function controls() {
    save.disabled = busy || !loaded;
    cancel.disabled = refresh.disabled = productName.disabled = primaryBrand.disabled = secondaryBrand.disabled = quantity.disabled = busy;
    presentation.disabled = busy;
    cancel.hidden = editingId === null;
    I18n.message(save, busy ? 'Guardando...' : editingId === null ? 'Guardar producto' : 'Guardar cambios');
    I18n.message(title, I18n.t(editingId === null ? 'market.loadNew' : 'market.edit'));
    body.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  }
  function resetForm() {
    editingId = null;
    form.reset();
    manualPanel.open = false;
    controls();
  }
  async function request(action, extra = {}) {
    let user;
    try { user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'); } catch (error) { user = null; }
    if (!user || !user.perfil_token) {
      relogin.hidden = false;
      throw new Error('Volvé a iniciar sesión para administrar Mercado.');
    }
    const result = await fetch(API_URL, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, perfil_token: user.perfil_token, ...extra})});
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) {
      if (data.error === 'Volvé a iniciar sesión para administrar Mercado.') relogin.hidden = false;
      throw new Error(data.error || 'No se pudo administrar el producto.');
    }
    relogin.hidden = true;
    return data;
  }
  function renderTable() {
    body.replaceChildren();
    for (const item of records) {
      const row = document.createElement('tr');
      [item.id, item.nombre, item.marca_primaria, item.marca_secundaria, item.ctd_mensual, item.presentacion].forEach(value => {
        const cell = document.createElement('td'); cell.textContent = String(value ?? ''); row.appendChild(cell);
      });
      const cell = document.createElement('td');
      const actions = document.createElement('div'); actions.className = 'fixed-row-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = I18n.t('profile.edit');
      edit.addEventListener('click', () => {
        if (busy) return;
        editingId = item.id; productName.value = item.nombre; primaryBrand.value = item.marca_primaria; secondaryBrand.value = item.marca_secundaria;
        quantity.value = item.ctd_mensual ?? '';
        presentation.value = item.presentacion || '';
        manualPanel.open = true;
        message(''); controls(); productName.focus();
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.hidden = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null')?.admin !== true; remove.textContent = I18n.t('common.delete');
      remove.addEventListener('click', () => deleteProduct(item));
      actions.append(edit, remove); cell.appendChild(actions); row.appendChild(cell); body.appendChild(row);
    }
    if (!records.length) {
      const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 7;
      cell.textContent = I18n.t('market.empty'); row.appendChild(cell); body.appendChild(row);
    }
    controls();
  }
  async function readList() {
    const data = await request('market_products');
    if (!Array.isArray(data.productos)) throw new Error('El servidor no devolvió los productos de Mercado.');
    records = data.productos;
    loaded = true; renderTable();
  }
  async function open() {
    if (busy) return;
    busy = true; controls(); message('Cargando productos de Mercado...');
    try { await readList(); message('Productos de Mercado cargados.'); }
    catch (error) { message('No se pudieron cargar los productos de Mercado: ' + error.message, true); }
    finally { busy = false; controls(); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded) return;
    const data = {nombre: productName.value.trim(), marca_primaria: primaryBrand.value.trim(), marca_secundaria: secondaryBrand.value.trim(), ctd_mensual: Number(quantity.value), presentacion: presentation.value.trim()};
    if (!data.nombre) { message('Ingresá el nombre del producto.', true); return; }
    if (!Number.isFinite(data.ctd_mensual) || data.ctd_mensual <= 0) { message('La cantidad mensual debe ser un número positivo.', true); return; }
    const action = editingId === null ? 'create_market_product' : 'update_market_product';
    if (editingId !== null) data.id = editingId;
    busy = true; controls(); message('Guardando producto...');
    try {
      await request(action, data); resetForm();
      try { await readList(); message('Producto guardado.'); }
      catch (error) { message('El producto se guardó, pero no se pudo actualizar la lista. Usá Actualizar lista.', true); }
    } catch (error) { message('No se pudo confirmar el cambio: ' + error.message + ' Actualizá la lista antes de reintentar.', true); }
    finally { busy = false; controls(); }
  });
  async function deleteProduct(item) {
    if (busy || !window.confirm(I18n.t('market.confirmDelete', {id: item.id}))) return;
    busy = true; controls(); message('Eliminando producto...');
    try {
      await request('delete_market_product', {id: item.id});
      if (editingId === item.id) resetForm();
      try { await readList(); message('Producto eliminado.'); }
      catch (error) { message('El producto se eliminó, pero no se pudo actualizar la lista. Usá Actualizar lista.', true); }
    } catch (error) { message('No se pudo confirmar el cambio: ' + error.message + ' Actualizá la lista antes de reintentar.', true); }
    finally { busy = false; controls(); }
  }
  cancel.addEventListener('click', () => { if (!busy) { resetForm(); message(''); } });
  refresh.addEventListener('click', open);
  window.addEventListener('languagechange', renderTable);
  window.Market = {open};
  controls();
})();
