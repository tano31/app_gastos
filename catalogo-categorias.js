(function () {
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const get=id=>document.getElementById(id), form=get('catalogCategoryForm'), input=get('catalogCategoryName'), status=get('catalogCategoryStatus');
  let busy=false, original=null, records=[];
  function message(key, error=false) {status.textContent=I18n.t(key);status.className='configuration-status'+(error?' error':'');}
  async function request(action, extra={}) {
    const user=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
    if(!user || !user.perfil_token) throw Error(I18n.t('movement.session'));
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!response.ok) throw Error('HTTP '+response.status);
    const data=await response.json(); if(!data.ok) throw Error(I18n.translate(data.error)); return data;
  }
  function controls() {
    input.disabled=get('saveCatalogCategory').disabled=get('refreshCatalogCategories').disabled=busy;
    get('cancelCatalogCategory').hidden=original===null;
    get('saveCatalogCategory').textContent=I18n.t(original===null?'catalog.add':'catalog.save');
    get('catalogCategoriesBody').querySelectorAll('button').forEach(button=>{button.disabled=busy;});
  }
  function reset() {original=null;form.reset();controls();}
  function render() {
    const body=get('catalogCategoriesBody');body.replaceChildren();
    records.forEach(item=>{
      const row=document.createElement('tr'), name=document.createElement('td'), actions=document.createElement('td');
      name.textContent=I18n.category?.(item.categoria) ?? item.categoria;
      const edit=document.createElement('button');edit.type='button';edit.textContent=I18n.t('profile.edit');
      edit.addEventListener('click',()=>{if(busy)return;original=item.categoria;input.value=I18n.category?.(original) ?? original;get('catalogCategoryManualPanel').open=true;controls();input.focus();});
      const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.hidden=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null')?.admin!==true;remove.textContent=I18n.t('common.delete');
      remove.addEventListener('click',async()=>{
        if(busy || !window.confirm(I18n.t('catalog.confirmDelete',{name:I18n.category?.(item.categoria) ?? item.categoria})))return;
        await write('delete_catalog_category',{categoria:item.categoria,original:item.categoria});
      });
      actions.className='fixed-row-actions';actions.append(edit,remove);row.append(name,actions);body.appendChild(row);
    });
    if(!records.length) {const row=document.createElement('tr'), cell=document.createElement('td');cell.colSpan=2;cell.textContent=I18n.t('catalog.empty');row.appendChild(cell);body.appendChild(row);}
    controls();
  }
  async function read() {const data=await request('category_catalog');if(!Array.isArray(data.categorias))throw Error(I18n.t('catalog.invalid'));records=data.categorias;render();}
  async function open() {
    if(busy)return;busy=true;controls();message('catalog.loading');
    try {await read();message('catalog.loaded');}catch(error){status.textContent=error.message;status.className='configuration-status error';}
    finally {busy=false;controls();}
  }
  async function write(action, data) {
    busy=true;controls();message('catalog.saving');
    try {
      await request(action,data);reset();
      try {await read();message('catalog.saved');}
      catch(error) {message('catalog.refreshFailed',true);}
    }catch(error){status.textContent=error.message;status.className='configuration-status error';}
    finally{busy=false;controls();}
  }
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const entered=input.value.trim();const categoria=I18n.categoryValue?.(entered,records.map(item=>item.categoria)) ?? entered;if(!categoria)return;await write(original===null?'create_catalog_category':'update_catalog_category',{categoria,original});});
  get('cancelCatalogCategory').addEventListener('click',()=>{if(!busy)reset();});
  get('refreshCatalogCategories').addEventListener('click',open);
  window.addEventListener('languagechange',()=>{input.value=I18n.category?.(input.value) ?? input.value;render();});
  window.CategoryCatalog={open}; controls();
})();
