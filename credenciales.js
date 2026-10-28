// Contraseña cifrada en este navegador; la clave no se exporta ni se envía al servidor.
(function () {
  'use strict';
  const supported = () => !!(window.crypto && window.crypto.subtle && window.indexedDB);
  function open() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('controlGastos.credentials', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('credentials');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Almacenamiento ocupado.'));
    });
  }
  async function storage(operation, value) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('credentials', operation === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('credentials');
        const request = operation === 'get' ? store.get('current') : operation === 'put' ? store.put(value, 'current') : store.delete('current');
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = tx.onerror = () => reject(tx.error || request.error);
      });
    } finally { db.close(); }
  }
  async function clear() {
    if (supported()) await storage('delete');
  }
  async function save(username, password, expiresAt) {
    if (!supported()) return false;
    if (!username || !password || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await clear(); return false;
    }
    const crypto = window.crypto;
    const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, new TextEncoder().encode(password));
    await storage('put', {username, expiresAt, key, iv, cipher});
    return true;
  }
  async function load(username) {
    if (!supported()) return null;
    const value = await storage('get');
    if (!value) return null;
    if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) { await clear(); return null; }
    if (value.username !== username) return null;
    try {
      const plain = await window.crypto.subtle.decrypt({name: 'AES-GCM', iv: value.iv}, value.key, value.cipher);
      return new TextDecoder().decode(plain);
    } catch (error) { await clear(); return null; }
  }
  window.Credentials = {save, load, clear};
})();
