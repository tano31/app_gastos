const tableSelector = document.getElementById('tableSelector');
const configurationLayout = document.querySelector('.configuration-content');
function updateTableLayout(showTables = true) {
  configurationLayout.classList.toggle('table-view-expanded', showTables && !!tableSelector.value);
}
const configurationStatus = document.getElementById('configurationStatus');
const logoutBtn = document.getElementById('logoutBtn');
const idleMinutes = document.getElementById('idleMinutes');
idleMinutes.value = String(Auth.getIdleMinutes());
idleMinutes.addEventListener('change', () => {
  const minutes = Auth.setIdleMinutes(idleMinutes.value);
  I18n.message(document.getElementById('idleSettingStatus'), 'Cierre por inactividad configurado: ' + minutes + ' minutos.');
});
window.addEventListener('storage', () => {idleMinutes.value = String(Auth.getIdleMinutes());});
const CATEGORIES_API_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
const categoriesAdmin = document.getElementById('categoriesAdmin');
const fixedExpensesAdmin = document.getElementById('fixedExpensesAdmin');
const marketAdmin = document.getElementById('marketAdmin');
const supermarketsAdmin = document.getElementById('supermarketsAdmin');
const categoryForm = document.getElementById('categoryForm');
const categoryStatus = document.getElementById('categoryStatus');
const saveCategoryBtn = document.getElementById('saveCategoryBtn');
const refreshCategoriesBtn = document.getElementById('refreshCategoriesBtn');
let loadingCategories = false;
let savingCategory = false;
let categoriesLoaded = false;
let currentUser = null;
let categoryRecords = [], categoryCatalog = [];
try {
  currentUser = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
} catch (error) {
  currentUser = null;
}
if (sessionStorage.getItem('controlGastos.loggedIn') !== 'true' || !currentUser || !currentUser.usuario_id) {
  window.location.href = I18n.page('login.html');
}

function categoryMessage(message, kind = '') {
  I18n.message(categoryStatus, message);
  categoryStatus.className = 'configuration-status' + (kind ? ' ' + kind : '');
}

function updateCategoryButtons() {
  saveCategoryBtn.disabled = loadingCategories || savingCategory || !categoriesLoaded || !currentUser;
  refreshCategoriesBtn.disabled = loadingCategories || savingCategory;
  I18n.message(saveCategoryBtn, savingCategory ? 'Guardando...' : 'Guardar asociación');
}

function renderCategories(categories, catalog = []) {
  categoryRecords = categories; categoryCatalog = catalog;
  const body = document.getElementById('categoriesBody');
  body.replaceChildren();
  categories.forEach(item => {
    const row = document.createElement('tr');
    const date = new Date(item.fecha);
    const dateLabel = Number.isFinite(date.getTime()) ? date.toLocaleString('es-AR') : item.fecha;
    [item.id, dateLabel, item.usuario_id, I18n.category?.(item.categoria) ?? item.categoria, item.descripcion].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = String(value ?? '');
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  if (!categories.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    I18n.message(cell, 'Todavía no hay categorías asociadas a descripciones.');
    row.appendChild(cell);
    body.appendChild(row);
  }
  const suggestions = document.getElementById('categorySuggestions');
  suggestions.replaceChildren();
  [...new Set([...catalog,...categories.map(item => item.categoria)])].sort((a, b) => a.localeCompare(b)).forEach(name => {
    const option = document.createElement('option');
    option.value = I18n.category?.(name) ?? name;
    suggestions.appendChild(option);
  });
}

async function loadCategories() {
  if (loadingCategories) return false;
  loadingCategories = true;
  updateCategoryButtons();
  categoryMessage('Cargando categorías...');
  try {
    const result = await fetch(CATEGORIES_API_URL, {method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'categories',perfil_token:currentUser?.perfil_token})});
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok || !Array.isArray(data.categorias)) {
      throw new Error(data.error || 'El servidor no devolvió el diccionario de categorías.');
    }
    renderCategories(data.categorias, data.catalogo || []);
    categoriesLoaded = true;
    categoryMessage(data.categorias.length + ' asociaciones cargadas.');
    return true;
  } catch (error) {
    categoryMessage('No se pudieron cargar las categorías: ' + error.message, 'error');
    return false;
  } finally {
    loadingCategories = false;
    updateCategoryButtons();
  }
}

categoryForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (savingCategory || loadingCategories || !categoriesLoaded || !currentUser) return;
  const enteredCategory = document.getElementById('categoryName').value.trim();
  const categoria = I18n.categoryValue?.(enteredCategory,[...categoryCatalog,...categoryRecords.map(item=>item.categoria)]) ?? enteredCategory;
  const descripcion = document.getElementById('categoryDescription').value.trim();
  if (!categoria || !descripcion) {
    categoryMessage('Completá categoría y descripción.', 'error');
    return;
  }
  savingCategory = true;
  updateCategoryButtons();
  categoryMessage('Guardando asociación...');
  try {
    const result = await fetch(CATEGORIES_API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action: 'create_category', categoria, descripcion, usuario_id: currentUser.usuario_id, perfil_token: currentUser.perfil_token})
    });
    if (!result.ok) throw new Error('Error HTTP ' + result.status);
    const data = await result.json();
    if (!data.ok) throw new Error(data.error || 'El servidor rechazó el alta.');
    categoryForm.reset();
    const refreshed = await loadCategories();
    categoryMessage(refreshed ? 'Asociación guardada correctamente.' :
      'La asociación se guardó, pero no se pudo actualizar la lista. Usá Actualizar lista.', refreshed ? 'success' : 'error');
  } catch (error) {
    categoryMessage('No se pudo confirmar el alta: ' + error.message + ' Actualizá la lista antes de reintentar.', 'error');
  } finally {
    savingCategory = false;
    updateCategoryButtons();
  }
});

refreshCategoriesBtn.addEventListener('click', loadCategories);

const tableNames = {
  etiquetas: 'Etiqueta de movimientos',
  categorias: 'Categoría',
  medios_pago: 'Medios de pago',
  productos_supermercado: 'Productos supermercado',
  gastos_fijos: 'Gastos fijos',
  mercado: 'Mercado',
  supermercados: 'Supermercados',
};

function openSelectedTable() {
  const selected=tableSelector.value;
  updateTableLayout();
  [categoriesAdmin,document.getElementById('categoryCatalogAdmin'),fixedExpensesAdmin,marketAdmin,supermarketsAdmin,document.getElementById('paymentMethodsAdmin'),document.getElementById('scannedProductsAdmin')].forEach(section=>section.classList.add('hidden'));
  if(!selected) {I18n.message(configurationStatus,'Seleccioná una tabla para continuar.');return;}
  I18n.message(configurationStatus,'');
  const routes={
    etiquetas:[categoriesAdmin,loadCategories],
    categorias:[document.getElementById('categoryCatalogAdmin'),()=>CategoryCatalog.open()],
    gastos_fijos:[fixedExpensesAdmin,()=>FixedExpenses.open()],
    mercado:[marketAdmin,()=>Market.open()],
    supermercados:[supermarketsAdmin,()=>Supermarkets.open()],
    medios_pago:[document.getElementById('paymentMethodsAdmin'),()=>PaymentMethods.open()],
    productos_supermercado:[document.getElementById('scannedProductsAdmin'),()=>ScannedProducts.open()]
  };
  if(routes[selected]) {routes[selected][0].classList.remove('hidden');routes[selected][1]();}
  else I18n.message(configurationStatus,`Abriendo administración de ${tableNames[selected]}...`);
}
window.addEventListener('languagechange', () => {
  const input=document.getElementById('categoryName');
  input.value=I18n.category?.(input.value) ?? input.value;
  renderCategories(categoryRecords,categoryCatalog);
});
tableSelector.addEventListener('change',openSelectedTable);

document
  .querySelectorAll('.configuration-menu-item')
  .forEach((button) => {
    button.addEventListener('click', () => {
      document
        .querySelectorAll('.configuration-menu-item')
        .forEach((item) => {
          item.classList.remove('active');
        });

      button.classList.add('active');
      updateTableLayout(button.dataset.section === 'tables');
      ['tables', 'general', 'profile', 'webhooks'].forEach(section => {
        const id = {tables: 'settingsTablesSection', general: 'settingsGeneralSection', profile: 'settingsProfileSection', webhooks: 'settingsWebhooksSection'}[section];
        document.getElementById(id).hidden = section !== button.dataset.section;
      });
      if (button.dataset.section === 'profile') Profile.open();
    });
  });

logoutBtn.addEventListener('click', async () => {
  if (window.Auth) await Auth.logout();
  sessionStorage.clear();
  window.location.href = I18n.page('login.html');
});

// Acceso directo desde el menú lateral.
if (new URL(window.location.href).searchParams.get('section') === 'profile') {
  document.querySelector('.configuration-menu-item[data-section="profile"]').click();
}
if (new URL(window.location.href).searchParams.get('section') === 'general') {
  document.querySelector('.configuration-menu-item[data-section="general"]').click();
  if (new URL(window.location.href).searchParams.get('panel') === 'notifications') {
    document.getElementById('notificationPreferencesSection').open = true;
  }
}
if (new URL(window.location.href).searchParams.get('table') === 'mercado') {
  tableSelector.value = 'mercado';
  updateTableLayout();
  categoriesAdmin.classList.add('hidden');
  fixedExpensesAdmin.classList.add('hidden');
  marketAdmin.classList.remove('hidden');
  Market.open();
}
