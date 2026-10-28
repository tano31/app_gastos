(function () {
  'use strict';
  const api = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const node = id => document.getElementById(id);
  const form = node('supermarketForm'), body = node('supermarketsBody'), status = node('supermarketStatus');
  const name = node('supermarketName'), url = node('supermarketUrl'), mode = node('supermarketMode'), active = node('supermarketActive');
  const save = node('saveSupermarket'), cancel = node('cancelSupermarket'), refresh = node('refreshSupermarkets');
  let records = [], editingId = null, busy = false, loaded = false;
  function message(text, error = false) {I18n.message(status, text); status.className = 'configuration-status' + (error ? ' error' : '');}
  function controls() {
    [name, url, mode, active, cancel, refresh].forEach(element => {element.disabled = busy;});
    save.disabled = busy || !loaded; cancel.hidden = editingId === null;
    I18n.message(save, busy ? 'Guardando...' : editingId === null ? 'Guardar supermercado' : 'Guardar cambios');
    I18n.message(node('supermarketFormTitle'), editingId === null ? 'Nuevo supermercado' : 'Editar supermercado');
    body.querySelectorAll('button').forEach(button => {button.disabled = busy;});
  }
  function reset() {editingId = null; form.reset(); controls();}
  async function request(action, extra = {}) {
    let user;
    try {user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');} catch (error) {user = null;}
    if (!user || !user.perfil_token) throw new Error('Volvé a iniciar sesión para administrar Mercado.');
    const result = await fetch(api, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({action, perfil_token: user.perfil_token, ...extra})});
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) throw new Error(data.error || 'No se pudieron consultar los supermercados.');
    return data;
  }
  function render() {
    body.replaceChildren();
    for (const item of records) {
      const row = document.createElement('tr');
      const modeKey = {ambas: 'supermarkets.both', presencial: 'supermarkets.physical', online: 'supermarkets.online'}[item.modalidad];
      [item.id, item.nombre, item.url, modeKey ? I18n.t(modeKey) : item.modalidad, I18n.t(item.activo ? 'supermarkets.active' : 'supermarkets.inactive')].forEach(value => {
        const cell = document.createElement('td'); cell.textContent = String(value ?? ''); row.appendChild(cell);
      });
      const cell = document.createElement('td'), actions = document.createElement('div'); actions.className = 'fixed-row-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = I18n.t('profile.edit');
      edit.addEventListener('click', () => {
        if (busy) return;
        editingId = item.id; name.value = item.nombre; url.value = item.url; mode.value = item.modalidad; active.value = String(item.activo);
        message(''); controls(); name.focus();
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.hidden = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null')?.admin !== true; remove.textContent = I18n.t('common.delete');
      remove.addEventListener('click', async () => {
        if (busy || !window.confirm(I18n.t('supermarkets.confirmDelete', {name: item.nombre}))) return;
        busy = true; controls();
        try {
          await request('delete_supermarket', {id: item.id});
          if (editingId === item.id) reset();
          await read(); message('Supermercado eliminado.');
        } catch (error) {message('No se pudo actualizar Supermercados: ' + error.message, true);}
        finally {busy = false; controls();}
      });
      actions.append(edit, remove); cell.appendChild(actions); row.appendChild(cell); body.appendChild(row);
    }
    if (!records.length) {
      const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 6;
      cell.textContent = I18n.t('supermarkets.empty'); row.appendChild(cell); body.appendChild(row);
    }
    controls();
  }
  async function read() {
    const data = await request('supermarkets');
    if (!Array.isArray(data.supermercados)) throw new Error('No se pudieron consultar los supermercados.');
    records = data.supermercados; loaded = true; render();
  }
  async function open() {
    if (busy) return;
    busy = true; controls(); message('Cargando supermercados...');
    try {await read(); message('Supermercados cargados.');}
    catch (error) {message('No se pudo actualizar Supermercados: ' + error.message, true);}
    finally {busy = false; controls();}
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded) return;
    const fields = {nombre: name.value.trim(), url: url.value.trim(), modalidad: mode.value, activo: active.value === 'true'};
    if (editingId !== null) fields.id = editingId;
    busy = true; controls();
    try {
      await request(editingId === null ? 'create_supermarket' : 'update_supermarket', fields);
      reset(); await read(); message('Supermercado guardado.');
    } catch (error) {message('No se pudo actualizar Supermercados: ' + error.message, true);}
    finally {busy = false; controls();}
  });
  cancel.addEventListener('click', () => {if (!busy) {reset(); message('');}});
  refresh.addEventListener('click', open);
  window.addEventListener('languagechange', render);
  window.Supermarkets = {open};
  controls();
})();
