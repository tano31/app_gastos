// Caché de lecturas entre páginas. Nunca almacena escrituras ni respuestas del chat.
(function () {
  'use strict';
  if (!window.fetch || window.AppDataCache) return;
  const nativeFetch = window.fetch.bind(window);
  const storageKey = 'controlGastos.dataCache.v1', signalKey = 'controlGastos.dataCache.changed';
  const ttl = 5 * 60 * 1000, maxBytes = 2000000;
  const reads = new Set(['movements','dashboard_users','dashboard_filters','fixed_expenses',
    'market_products','payment_methods','category_names','category_catalog','categories',
    'supermarkets','scanned_market_items','investment_quotes','currency_rates','import_users','holdings','holding_rates']);
  let generation = 0, scope = '', entries = {}, pending = new Map();
  function identity() {
    try {
      if (sessionStorage.getItem('controlGastos.loggedIn') !== 'true') return '';
      const user = JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
      return user?.perfil_token ? JSON.stringify(user) : '';
    } catch (error) { return ''; }
  }
  function clear(broadcast = false) {
    generation++; entries = {}; pending.clear();
    try { sessionStorage.removeItem(storageKey); } catch (error) {}
    if (broadcast) try { localStorage.setItem(signalKey, Date.now() + ':' + Math.random()); } catch (error) {}
  }
  function syncScope() {
    const current = identity();
    if (current === scope) return;
    generation++; scope = current; entries = {}; pending.clear();
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (scope && saved?.scope === scope && saved.entries && typeof saved.entries === 'object') entries = saved.entries;
      else sessionStorage.removeItem(storageKey);
    } catch (error) { clear(); }
  }
  function persist() {
    const now = Date.now();
    Object.keys(entries).forEach(key => { if (now - entries[key].time >= ttl) delete entries[key]; });
    try {
      let serialized = JSON.stringify({scope, entries});
      // Mantener las consultas más recientes sin agotar sessionStorage.
      while (serialized.length > maxBytes && Object.keys(entries).length) {
        const oldest = Object.keys(entries).sort((a,b) => entries[a].time - entries[b].time)[0];
        delete entries[oldest]; serialized = JSON.stringify({scope, entries});
      }
      sessionStorage.setItem(storageKey, serialized);
    } catch (error) { /* Si no hay espacio, conservar la caché de esta página. */ }
  }
  function response(entry) {
    return new Response(entry.text, {status: 200, headers: {'Content-Type':'application/json;charset=utf-8'}});
  }
  window.fetch = async function (url, options) {
    let data;
    const address = typeof url === 'string' ? url : '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#]|$)/.test(address) ||
        String(options?.method).toUpperCase() !== 'POST' || typeof options?.body !== 'string') return nativeFetch(url, options);
    try { data = JSON.parse(options.body); } catch (error) { return nativeFetch(url, options); }
    syncScope();
    if (!scope || !data.perfil_token || data.perfil_token !== JSON.parse(scope).perfil_token) return nativeFetch(url, options);
    if (!reads.has(data.action)) {
      if (/^(?:create|update|delete|save_|import_|record_|pay_expense)/.test(String(data.action))) {
        // Invalidar incluso ante fallos de red: el servidor pudo haber guardado.
        clear(true);
        try { return await nativeFetch(url, options); } finally { clear(true); }
      }
      return nativeFetch(url, options);
    }
    if (options.signal?.aborted) return nativeFetch(url, options);
    const fields = {...data}; delete fields.perfil_token;
    const key = JSON.stringify([address, Object.keys(fields).sort().map(name => [name, fields[name]])]);
    const cached = entries[key], now = Date.now();
    if (cached && now >= cached.time && now - cached.time < ttl) return response(cached);
    // Una petición con cancelación mantiene su propio ciclo de vida.
    if (!options.signal && pending.has(key)) return (await pending.get(key)).clone();
    const version = generation, owner = scope;
    const task = (async () => {
      const result = await nativeFetch(url, options);
      if (!result.ok) return result;
      let text, parsed;
      try { text = await result.clone().text(); parsed = JSON.parse(text); } catch (error) { return result; }
      if (!(Array.isArray(parsed) || parsed?.ok === true)) return result;
      if (version === generation && owner === identity()) {
        entries[key] = {time: Date.now(), text}; persist();
      }
      return result;
    })();
    if (!options.signal) pending.set(key, task);
    try { return (await task).clone(); }
    finally { if (pending.get(key) === task) pending.delete(key); }
  };
  window.AppDataCache = {clear: () => clear(true)};
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (button && /refresh|retry/i.test(button.id)) clear();
  }, true);
  window.addEventListener('storage', event => { if (event.key === signalKey) clear(); });
  // Recargar el documento manualmente también permite solicitar datos nuevos.
  if (window.performance?.getEntriesByType('navigation')[0]?.type === 'reload') clear();
})();
