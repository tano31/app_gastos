(function () {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const defaultImage = 'img/user-default.svg';
  function readUser() {
    try { return JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'); }
    catch (error) { return null; }
  }
  let user = readUser();
  let busy = false;
  let sessionExpired = false;
  let pendingImage = null;
  let editing = false;
  let postalRequest = 0;
  let postalBusy = false;
  const addressFields = {
    codigo_postal: document.getElementById('profilePostalCode'),
    direccion: document.getElementById('profileAddress'),
    barrio: document.getElementById('profileNeighborhood'),
    numero: document.getElementById('profileNumber')
  };
  function changed() {
    return pendingImage !== null || Object.entries(addressFields).some(([name, element]) =>
      element && element.value !== String(user && user[name] || ''));
  }
  const input = document.getElementById('profilePhoto');
  const editButton = document.getElementById('editProfilePhoto');
  const status = document.getElementById('profileStatus');
  const preview = document.getElementById('profileAvatarPreview');
  const picker = document.getElementById('profilePhotoPicker');
  const relogin = document.getElementById('profileRelogin');
  const actions = document.getElementById('profilePhotoActions');
  const saveButton = document.getElementById('saveProfileChanges');
  const cancelButton = document.getElementById('cancelProfileChanges');

  function imageSource(value) {
    return typeof value === 'string' && value.length <= 45000 &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : defaultImage;
  }
  function controls() {
    if (!input) return;
    ['profilePhotoHelp', 'profileDataHelp'].forEach(id => {
      const help = document.getElementById(id);
      if (help) help.hidden = !editing;
    });
    // Elegir y previsualizar una foto no requiere una petición al servidor.
    input.disabled = busy;
    relogin.hidden = !!(user && user.perfil_token) && !sessionExpired;
    editButton.disabled = busy;
    actions.hidden = !editing && !changed();
    saveButton.disabled = busy || postalBusy || !changed();
    Object.values(addressFields).forEach(element => { if (element) { element.readOnly = !editing; element.disabled = busy; } });
    cancelButton.disabled = busy;
    I18n.message(saveButton, busy ? 'Guardando...' : 'Guardar cambios');
    I18n.message(editButton, busy ? 'Guardando...' : 'Editar');
  }
  function render() {
    document.body.classList.toggle('shared-catalog-readonly', !(user && (user.admin === true || user.permisos?.permiso_editar_catalogos === true)));
    const adminBadge = document.getElementById('generalAdminBadge');
    if (adminBadge) adminBadge.hidden = !(user && user.admin === true);
    const avatar = document.getElementById('sidebarAvatar');
    const name = document.getElementById('sidebarUserId');
    if (avatar) avatar.src = imageSource(user && user.usuario_imagen);
    if (name) name.textContent = user ? String(user.usuario_id || '') : '';
    if (input) {
      document.getElementById('profileEmail').value = user ? user.usuario_email || '' : '';
      document.getElementById('profileDocument').value = user ? user.usuario_doc || '' : '';
      document.getElementById('profileUserId').value = user ? user.usuario_id || '' : '';
      if (!editing) Object.entries(addressFields).forEach(([name, element]) => {
        if (element) element.value = String(user && user[name] || '');
      });
      const lastLogin = document.getElementById('profileLastLogin');
      if (lastLogin) {
        const date = new Date(user && user.ultimo_loguin || '');
        lastLogin.value = Number.isNaN(date.getTime()) ? '' : date.toLocaleString(I18n.locale || undefined, {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
        });
      }
      preview.src = imageSource(pendingImage === null ? user && user.usuario_imagen : pendingImage);
    }
    controls();
  }
  function message(text, error = false) {
    I18n.message(status, text);
    status.className = 'configuration-status' + (error ? ' error' : '');
  }
  async function request(action, extra = {}) {
    const result = await fetch(API_URL, {
      method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, perfil_token: user.perfil_token, ...extra})
    });
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) {
      if (data.error === 'Volvé a iniciar sesión para consultar o cambiar tu foto.') sessionExpired = true;
      throw new Error(data.error || 'No se pudo consultar el perfil.');
    }
    if (!data.usuario || String(data.usuario.id) !== String(user.id)) throw new Error('No se pudo consultar el perfil.');
    return data.usuario;
  }
  function updateUser(fields) {
    user = {...user, ...fields};
    sessionStorage.setItem('controlGastos.user', JSON.stringify(user));
    window.dispatchEvent(new Event('profileupdated'));
    render();
  }
  async function open() {
    if (!input || busy) return;
    user = readUser();
    render();
    if (editing || pendingImage !== null) return;
    if (!user || !user.perfil_token) {
      message('Volvé a iniciar sesión para consultar o cambiar tu foto.', true);
      return;
    }
    busy = true;
    controls();
    message('Consultando tus datos...');
    try {
      updateUser(await request('get_profile'));
      message('');
    } catch (error) {
      message('No se pudo consultar el perfil: ' + error.message, true);
    } finally {
      busy = false;
      controls();
    }
  }
  async function encodeImage(file) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Elegí una imagen JPG, PNG o WebP de hasta 5 MB.');
    }
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 240;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 240, 240);
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 240, 240);
      for (const quality of [0.85, 0.7, 0.5, 0.3]) {
        const image = canvas.toDataURL('image/jpeg', quality);
        if (imageSource(image) !== defaultImage) return image;
      }
      throw new Error('La imagen no es válida o supera el tamaño permitido.');
    } finally { bitmap.close(); }
  }
  if (input) {
    editButton.addEventListener('click', () => {
      if (busy) return;
      editing = true;
      picker.hidden = false;
      editButton.setAttribute('aria-expanded', 'true');
      controls();
      if (!user || !user.perfil_token || sessionExpired) {
        message('Volvé a iniciar sesión para consultar o cambiar tu foto.', true);
        return;
      }
      input.focus();
    });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file || busy) return;
      busy = true;
      controls();
      try {
        pendingImage = await encodeImage(file);
        render();
        message('Revisá la foto y presioná Guardar cambios.');
      } catch (error) {
        message(error.message === 'Elegí una imagen JPG, PNG o WebP de hasta 5 MB.' ? error.message : 'No se pudo preparar la imagen. Elegí otra foto.', true);
      } finally {
        busy = false;
        input.value = '';
        controls();
      }
    });
    saveButton.addEventListener('click', async () => {
      if (busy || postalBusy || !changed()) return;
      if (!user || !user.perfil_token || sessionExpired) {
        message('Volvé a iniciar sesión para consultar o cambiar tu foto.', true);
        controls();
        return;
      }
      busy = true;
      controls();
      message('Guardando tus datos...');
      try {
        const changes = {};
        Object.entries(addressFields).forEach(([name, element]) => { changes[name] = element ? element.value : ''; });
        if (pendingImage !== null) changes.usuario_imagen = pendingImage;
        const fields = await request('update_profile', changes);
        pendingImage = null;
        editing = false;
        updateUser(fields);
        picker.hidden = true;
        editButton.setAttribute('aria-expanded', 'false');
        message('Datos guardados correctamente.');
      } catch (error) {
        message('No se pudieron guardar los datos: ' + error.message, true);
      } finally { busy = false; controls(); }
    });
    cancelButton.addEventListener('click', () => {
      if (busy) return;
      pendingImage = null;
      editing = false;
      postalRequest++;
      postalBusy = false;
      input.value = '';
      picker.hidden = true;
      editButton.setAttribute('aria-expanded', 'false');
      render();
      message('');
    });
    Object.values(addressFields).forEach(element => {
      if (element) element.addEventListener('input', controls);
    });
    const postal = addressFields.codigo_postal;
    if (postal) {
      postal.addEventListener('input', () => {
        postalRequest++;
        postalBusy = false;
        controls();
      });
      postal.addEventListener('change', async () => {
        if (!editing || busy) return;
        const cep = postal.value.replace(/[\s-]/g, '');
        const current = ++postalRequest;
        if (!cep) { message(''); return; }
        if (!/^\d{8}$/.test(cep)) { message('El CEP debe tener 8 dígitos.', true); return; }
        postalBusy = true;
        controls();
        message('Buscando dirección por CEP...');
        try {
          const result = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
          if (!result.ok) throw new Error('No se pudo consultar el CEP.');
          const address = await result.json();
          if (current !== postalRequest || !editing) return;
          if (address.erro) throw new Error('No se encontró ese CEP.');
          addressFields.direccion.value = address.logradouro || '';
          addressFields.barrio.value = address.bairro || '';
          postal.value = cep;
          message(address.logradouro && address.bairro ? 'Dirección completada. Cargá el número y guardá los cambios.' : 'Este CEP no indica calle o barrio. Completá los datos manualmente.');
        } catch (error) {
          if (current === postalRequest && editing) message('No se pudo completar la dirección. Revisá el CEP o completá los datos manualmente.', true);
        } finally {
          if (current === postalRequest) { postalBusy = false; controls(); }
        }
      });
    }
  }
  window.addEventListener && window.addEventListener('languagechange', () => { if (!editing) render(); });
  window.Profile = {open};
  render();
})();
