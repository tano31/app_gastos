// El catálogo alimenta el formulario de movimientos; si no hay conexión se conservan las opciones disponibles.
(function () {
  'use strict';
  const select=document.getElementById('categoria');
  if(!select)return;
  const API='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  let busy=false;
  async function load() {
    if(busy)return;busy=true;
    try {
      const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
      const response=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'category_names',perfil_token:user?.perfil_token})});
      if(!response.ok)return;
      const data=await response.json();
      if(!data.ok || !Array.isArray(data.categorias) || !data.categorias.length || data.categorias.some(name=>typeof name!=='string'))return;
      const value=select.value;select.replaceChildren();
      data.categorias.forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=I18n.category?.(name) ?? name;select.appendChild(option);});
      if(data.categorias.includes(value))select.value=value;
    }catch(error){/* Permitir registrar con las opciones actuales aunque falle la consulta. */}
    finally{busy=false;}
  }
  window.addEventListener('focus',load);
  function translateOptions() {Array.from(select.options).forEach(option=>{option.textContent=I18n.category?.(option.value) ?? option.value;});}
  window.addEventListener('languagechange',translateOptions);
  translateOptions();
  load();
})();
