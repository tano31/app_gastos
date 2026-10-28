(function () {
  'use strict';
  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null'); } catch (error) { /* Sesión inválida. */ }
  if (sessionStorage.getItem('controlGastos.loggedIn') !== 'true' || !user || !user.usuario_id) {
    window.location.href = I18n.page('login.html');
    return;
  }
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (window.Auth) await Auth.logout();
    sessionStorage.removeItem('controlGastos.loggedIn');
    sessionStorage.removeItem('controlGastos.user');
    window.location.href = I18n.page('login.html');
  });
  const API_URL = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const body = document.getElementById('marketBody');
  const status = document.getElementById('marketStatus');
  const refresh = document.getElementById('refreshMarket');
  const relogin = document.getElementById('marketRelogin');
  const optimize = document.getElementById('optimizeMarket');
  const optimizationStatus = document.getElementById('marketOptimizationStatus');
  const sources = document.getElementById('marketSources');
  let products = [], loading = false, optimizing = false, optimization = null, loaded = false;
  const quotes = new Map();
  const quoteKeys = {falta_presentacion: 'market.missingPresentation', falta_medida: 'market.missingMeasure',
    falta_marca: 'market.missingBrand', sin_coincidencias: 'market.noMatchingOffers',
    fuente_no_disponible: 'market.sourceUnavailable', fuente_pendiente: 'market.pendingSource', error: 'market.sourceUnavailable'};

  function controls() {
    refresh.disabled = loading || optimizing;
    optimize.disabled = loading || optimizing || !loaded || !products.length;
    I18n.message(document.getElementById('optimizeMarketLabel'), optimizing ? 'Consultando fuentes...' : 'Optimizar mercado');
  }

  function render() {
    body.replaceChildren();
    for (const item of products) {
      const row = document.createElement('tr');
      const quote = quotes.get(item.id);
      const offer = quote && quote.oferta;
      [item.id, item.nombre, item.marca_primaria, item.marca_secundaria, item.presentacion, item.ctd_mensual,
        offer ? offer.supermercado : quote ? I18n.t(quoteKeys[quote.estado] || 'market.pendingSource') : '—', offer ? offer.marca : '—'].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = String(value ?? '');
        row.appendChild(cell);
      });
      const price = document.createElement('td');
      if (offer) {
        const link = document.createElement('a');
        if (/^https:\/\/www\.carrefour\.com\.br\/produto\//i.test(offer.url)) {
          link.href = offer.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        }
        link.textContent = window.PlatformCurrency?PlatformCurrency.format(offer.precio):new Intl.NumberFormat(I18n.locale, {style: 'currency', currency: 'BRL'}).format(offer.precio);
        price.appendChild(link);
        const details = document.createElement('small'); details.className = 'market-price-details';
        details.textContent = I18n.t(offer.condicion === 'pix' ? 'market.pricePix' : 'market.pricePublished') + ' · ' + offer.descripcion;
        price.appendChild(details);
      } else price.textContent = '—';
      row.appendChild(price);
      body.appendChild(row);
    }
    if (!products.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 9; cell.textContent = I18n.t('market.empty');
      row.appendChild(cell); body.appendChild(row);
    }
    controls();
  }

  function renderOptimization() {
    sources.replaceChildren();
    sources.hidden = !optimization;
    if (!optimization) return;
    I18n.message(optimizationStatus, optimization.mensaje);
    for (const item of optimization.mercados || []) {
      const line = document.createElement('p');
      const link = document.createElement('a');
      if (/^https:\/\//.test(item.url)) {
        link.href = item.url;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
      }
      link.textContent = item.nombre;
      const state = document.createElement('span');
      state.textContent = ' — ' + I18n.t(item.estado === 'precios_publicados' ? 'market.pricePublished' : 'market.pendingSource');
      line.appendChild(link); line.appendChild(state); sources.appendChild(line);
    }
    if (optimization.ubicacion && optimization.ubicacion.codigo_postal) {
      const place = document.createElement('p');
      place.textContent = I18n.t('market.referenceCep', {cep: optimization.ubicacion.codigo_postal});
      sources.appendChild(place);
    }
  }

  async function optimizeList() {
    if (loading || optimizing || !loaded || !products.length) return;
    optimizing = true; controls(); optimizationStatus.hidden = false;
    I18n.message(optimizationStatus, 'Consultando fuentes...');
    optimizationStatus.className = 'configuration-status';
    try {
      const result = await fetch(API_URL, {
        method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({action: 'optimize_market', perfil_token: user.perfil_token})
      });
      if (!result.ok) throw new Error('Error HTTP ' + result.status);
      const data = await result.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo consultar la optimización de Mercado.');
      if (typeof data.habilitado !== 'boolean' || !Array.isArray(data.mercados)) throw new Error('No se pudo consultar la optimización de Mercado.');
      quotes.clear();
      optimization = data; renderOptimization(); render();
      if (data.habilitado) {
        if (!Array.isArray(data.productos)) throw new Error('El servidor no devolvió los productos de Mercado.');
        products = data.productos;
        for (let i = 0; i < products.length; i++) {
          I18n.message(optimizationStatus, 'Buscando precios: ' + (i + 1) + ' de ' + products.length + '.');
          try {
            const response = await fetch(API_URL, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
              body: JSON.stringify({action: 'optimize_market', perfil_token: user.perfil_token, producto_id: products[i].id})});
            if (!response.ok) throw new Error('Error HTTP ' + response.status);
            const result = await response.json();
            if (!result.ok || !result.resultado || result.resultado.producto_id !== products[i].id) throw new Error('Respuesta de precios inválida.');
            quotes.set(products[i].id, result.resultado);
          } catch (error) {quotes.set(products[i].id, {estado: 'error'});}
          render();
        }
        renderOptimization();
      }
    } catch (error) {
      I18n.message(optimizationStatus, 'No se pudo consultar la optimización de Mercado: ' + error.message);
      optimizationStatus.className = 'configuration-status error';
    } finally { optimizing = false; controls(); }
  }

  async function loadList() {
    if (loading) return;
    loading = true; controls();
    I18n.message(status, '');
    const indicator=document.getElementById('marketPageLoading');
    let currentProgress=0,progressTimer;
    function progress(value){currentProgress=Math.max(currentProgress,value);indicator.setAttribute('aria-valuenow',String(currentProgress));document.getElementById('marketPageLoadingPercent').textContent=currentProgress+'%';}
    indicator.hidden=false;progress(5);
    function advance(){progress(Math.min(94,currentProgress+Math.max(1,Math.ceil((94-currentProgress)*.035))));progressTimer=setTimeout(advance,400);}
    progressTimer=setTimeout(advance,400);
    status.className = 'configuration-status';
    try {
      if (!user.perfil_token) throw new Error('Volvé a iniciar sesión para administrar Mercado.');
      const result = await fetch(API_URL, {
        method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({action: 'market_products', perfil_token: user.perfil_token})
      });
      if (!result.ok) throw new Error('Error HTTP ' + result.status);
      progress(35);
      const data = await result.json();
      if (!data.ok) throw new Error(data.error || 'El servidor no devolvió los productos de Mercado.');
      if (!Array.isArray(data.productos)) throw new Error('El servidor no devolvió los productos de Mercado.');
      progress(80);
      products = data.productos; loaded = true; optimization = null; quotes.clear();
      optimizationStatus.hidden = true; sources.hidden = true;
      render(); relogin.hidden = true;
      progress(100);
    } catch (error) {
      relogin.hidden = error.message !== 'Volvé a iniciar sesión para administrar Mercado.';
      I18n.message(status, 'No se pudieron cargar los productos de Mercado: ' + error.message);
      status.className = 'configuration-status error';
    } finally { clearTimeout(progressTimer);indicator.hidden=true;loading = false; controls(); }
  }
  refresh.addEventListener('click', loadList);
  optimize.addEventListener('click', optimizeList);
  window.addEventListener('currencychange',render);
  window.addEventListener('languagechange', () => { render(); renderOptimization(); });
  loadList();
})();
