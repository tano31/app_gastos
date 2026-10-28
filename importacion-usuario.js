(function () {
  'use strict';
  const select = document.getElementById('importUser');
  const status = document.getElementById('importUserStatus');
  const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
  if (!user || !user.usuario_id || !user.perfil_token) return;
  function option(name) {
    const item = document.createElement('option');
    item.value = name;
    item.textContent = name;
    select.appendChild(item);
  }
  option(user.usuario_id);
  select.value = user.usuario_id;
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify({action: 'import_users', perfil_token: user.perfil_token})
  }).then(async response => {
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (!result.ok || !Array.isArray(result.usuarios)) throw new Error();
    const selected = select.value;
    select.replaceChildren();
    Array.from(new Set([user.usuario_id, ...result.usuarios])).sort().forEach(option);
    select.value = selected;
  }).catch(() => {
    I18n.message(status, 'No se pudieron cargar los usuarios. Recargá la página para volver a intentar.');
  });
})();
