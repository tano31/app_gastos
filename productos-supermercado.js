(function(){
  'use strict';
  const get=id=>document.getElementById(id),form=get('scannedProductForm');if(!form)return;
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const copies={
    es:{help:'Consultá y corregí los productos guardados desde el Digitalizador. También podés cargar productos manualmente.',new:'Cargar nuevo producto',edit:'Editar producto',product:'Producto',code:'Código',quantity:'Cantidad',unit:'Unidad',price:'Precio unitario (BRL)',merchant:'Supermercado / comercio',date:'Fecha de compra',search:'Buscar por producto, código o comercio',save:'Guardar producto',loading:'Cargando productos...',saving:'Guardando...',ready:'Productos cargados.',saved:'Producto guardado.',deleted:'Producto eliminado.',error:'No se pudo completar la operación: ',empty:'No hay productos para mostrar.',confirm:'¿Eliminar este producto?',refreshError:'El cambio se guardó, pero no se pudo actualizar la lista. Usá Actualizar lista.',invalid:'Completá producto, cantidad positiva, unidad, precio, comercio y fecha.'},
    pt:{help:'Consulte e corrija os produtos salvos pelo Digitalizador. Você também pode cadastrar produtos manualmente.',new:'Cadastrar novo produto',edit:'Editar produto',product:'Produto',code:'Código',quantity:'Quantidade',unit:'Unidade',price:'Preço unitário (BRL)',merchant:'Supermercado / loja',date:'Data da compra',search:'Buscar por produto, código ou loja',save:'Salvar produto',loading:'Carregando produtos...',saving:'Salvando...',ready:'Produtos carregados.',saved:'Produto salvo.',deleted:'Produto excluído.',error:'Não foi possível concluir a operação: ',empty:'Nenhum produto encontrado.',confirm:'Excluir este produto?',refreshError:'A alteração foi salva, mas a lista não foi atualizada. Use Atualizar lista.',invalid:'Preencha produto, quantidade positiva, unidade, preço, loja e data.'},
    en:{help:'Review and correct products saved from the Digitizer. You can also add products manually.',new:'Add product',edit:'Edit product',product:'Product',code:'Code',quantity:'Quantity',unit:'Unit',price:'Unit price (BRL)',merchant:'Supermarket / merchant',date:'Purchase date',search:'Search by product, code or merchant',save:'Save product',loading:'Loading products...',saving:'Saving...',ready:'Products loaded.',saved:'Product saved.',deleted:'Product deleted.',error:'Could not complete the operation: ',empty:'No products to display.',confirm:'Delete this product?',refreshError:'Changes were saved, but the list could not be refreshed. Select Refresh list.',invalid:'Complete product, positive quantity, unit, price, merchant and date.'}
  };
  const t=()=>copies[(document.documentElement.lang||'es').slice(0,2)]||copies.es;
  const fields={producto:'scannedProductName',codigo:'scannedProductCode',cantidad:'scannedProductQuantity',unidad:'scannedProductUnit',precio_unitario:'scannedProductPrice',comercio:'scannedProductMerchant',fecha_compra:'scannedProductDate'};
  const newBatch=()=>window.crypto?.randomUUID?.()||'manual-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
  let records=[],loaded=false,busy=false,editing=null,canDelete=false,batch=newBatch();
  function message(text,error=false){get('scannedProductStatus').textContent=text;get('scannedProductStatus').className='configuration-status '+(error?'error':'success');}
  function controls(){
    Object.values(fields).forEach(id=>get(id).disabled=busy);
    get('saveScannedProduct').disabled=busy||!loaded;get('refreshScannedProducts').disabled=busy;get('cancelScannedProduct').disabled=busy;get('cancelScannedProduct').hidden=editing===null;
    document.querySelectorAll('[data-product-copy]').forEach(node=>{node.textContent=t()[node.dataset.productCopy];});
    get('saveScannedProduct').textContent=busy?t().saving:t().save;
    get('scannedProductPanel').querySelector('summary').textContent=editing===null?t().new:t().edit;
  }
  function reset(){editing=null;batch=newBatch();form.reset();get('scannedProductPanel').open=false;const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());get('scannedProductDate').value=now.toISOString().slice(0,10);controls();}
  async function request(action,extra={}){
    const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');if(!user?.perfil_token)throw Error(I18n.t('movement.session'));
    const result=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!result.ok)throw Error('HTTP '+result.status);const data=await result.json();if(!data.ok)throw Error(data.error||t().error);return data;
  }
  async function read(){const data=await request('scanned_market_items');if(!Array.isArray(data.items))throw Error(t().error);records=data.items;canDelete=data.puede_eliminar===true;loaded=true;}
  function render(){
    const body=get('scannedProductsBody');body.replaceChildren();const term=get('scannedProductSearch').value.trim().toLocaleLowerCase();
    const selected=records.filter(item=>[item.producto,item.codigo,item.comercio].some(value=>String(value||'').toLocaleLowerCase().includes(term))).sort((a,b)=>Number(b.id_items_mercado)-Number(a.id_items_mercado));
    selected.forEach(item=>{
      const row=document.createElement('tr'),day=String(item.fecha_compra||'').slice(0,10),date=new Date(day+'T12:00:00');
      const price=Number(item.precio_unitario),quantity=Number(item.cantidad);
      [item.id_items_mercado,Number.isFinite(date.getTime())?date.toLocaleDateString(I18n.locale):day,item.comercio,item.codigo,item.producto,Number.isFinite(quantity)?new Intl.NumberFormat(I18n.locale,{maximumFractionDigits:6}).format(quantity):item.cantidad,item.unidad,Number.isFinite(price)?new Intl.NumberFormat(I18n.locale,{style:'currency',currency:item.moneda||'BRL',maximumFractionDigits:4}).format(price):item.precio_unitario,item.usuario_id].forEach(value=>{const cell=document.createElement('td');cell.textContent=String(value??'');row.appendChild(cell);});
      const cell=document.createElement('td'),actions=document.createElement('div');actions.className='fixed-row-actions';
      if(item.puede_editar){const edit=document.createElement('button');edit.type='button';edit.textContent=I18n.t('profile.edit');edit.disabled=busy;edit.onclick=()=>{if(busy)return;editing=item.id_items_mercado;Object.keys(fields).forEach(name=>get(fields[name]).value=name==='fecha_compra'?day:item[name]??'');get('scannedProductPanel').open=true;controls();get('scannedProductName').focus();};actions.appendChild(edit);}
      if(canDelete){const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent=I18n.t('common.delete');remove.disabled=busy;remove.onclick=async()=>{
        if(busy||!window.confirm(t().confirm+' '+item.producto))return;busy=true;render();
        try{await request('delete_scanned_market_item',{id_items_mercado:item.id_items_mercado});if(editing===item.id_items_mercado)reset();await refreshAfterSave(t().deleted);}catch(error){message(t().error+error.message,true);}finally{busy=false;render();}
      };actions.appendChild(remove);}
      cell.appendChild(actions);row.appendChild(cell);body.appendChild(row);
    });
    if(!selected.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=10;cell.textContent=t().empty;row.appendChild(cell);body.appendChild(row);}controls();
  }
  async function refreshAfterSave(text){try{await read();message(text);}catch(error){loaded=false;message(t().refreshError,true);}}
  async function open(){if(busy)return;busy=true;controls();message(t().loading);try{await read();message(t().ready);}catch(error){loaded=false;message(t().error+error.message,true);}finally{busy=false;render();}}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!loaded)return;const data={};Object.keys(fields).forEach(name=>data[name]=get(fields[name]).value.trim());
    if(!data.producto||!data.cantidad||!(Number(data.cantidad)>0)||!Number.isFinite(Number(data.cantidad))||!data.unidad||data.precio_unitario===''||Number(data.precio_unitario)<0||!Number.isFinite(Number(data.precio_unitario))||!data.comercio||!data.fecha_compra){message(t().invalid,true);return;}
    data.cantidad=Number(data.cantidad);data.precio_unitario=Number(data.precio_unitario);data.id_items_mercado=editing;data.lote_id=batch;
    busy=true;render();try{await request(editing===null?'create_scanned_market_item':'update_scanned_market_item',data);reset();await refreshAfterSave(t().saved);}catch(error){message(t().error+error.message,true);}finally{busy=false;render();}
  });
  // Los reintentos sin cambios mantienen lote_id; editar una nueva alta inicia otro lote.
  form.addEventListener('input',()=>{if(editing===null)batch=newBatch();});
  get('scannedProductSearch').addEventListener('input',render);get('refreshScannedProducts').onclick=open;get('cancelScannedProduct').onclick=()=>{if(!busy){reset();message('');}};
  window.addEventListener('languagechange',render);window.ScannedProducts={open};reset();
})();
