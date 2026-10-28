(function(){
  'use strict';
  const get=id=>document.getElementById(id),panel=get('bulkMovementPanel');if(!panel)return;
  const status=get('bulkMovementStatus'),fileInput=get('bulkMovementFile'),save=get('saveBulkMovements'),menu=get('bulkMovementMenu');
  const api='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  let rows=[],fileHash='',saved=0,duplicates=0,missingRates=0,busy=false;
  function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
  function controls(){save.disabled=busy||saved>=rows.length;fileInput.disabled=busy;get('closeBulkMovements').disabled=busy;get('downloadMovementTemplate').disabled=busy;}
  async function request(action,data={}){
    const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
    const result=await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user?.perfil_token,...data})});
    if(!result.ok)throw Error('No se pudo consultar el servidor.');const json=await result.json();if(!json.ok)throw Error(json.error||'No se pudo completar la operación.');return json;
  }
  async function catalog(){
    const [categories,methods]=await Promise.all([request('category_names'),request('payment_methods')]);
    if(!Array.isArray(categories.categorias)||!Array.isArray(methods.medios_pago))throw Error('No se pudieron consultar las listas.');
    return {categories:[...new Set(categories.categorias)],methods:[...new Set(methods.medios_pago.filter(item=>item.activo).map(item=>item.valor))]};
  }
  get('openBulkMovements').addEventListener('click',()=>{panel.hidden=false;menu.open=false;panel.scrollIntoView({block:'nearest',behavior:'smooth'});});
  get('closeBulkMovements').addEventListener('click',()=>{if(!busy)panel.hidden=true;});
  get('downloadMovementTemplate').addEventListener('click',async()=>{
    if(busy)return;busy=true;controls();panel.hidden=false;menu.open=false;message('Preparando plantilla con tus categorías y medios de pago...');
    try{
      const blob=ExcelMovements.template(await catalog()),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='plantilla_movimientos.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      message('Plantilla descargada. Completá la hoja Movimientos y cargá el archivo aquí.');
    }catch(error){message(error.message,true);}finally{busy=false;controls();}
  });
  fileInput.addEventListener('change',async()=>{
    if(busy)return;rows=[];saved=0;duplicates=0;missingRates=0;fileHash='';get('bulkMovementPreview').replaceChildren();
    const file=fileInput.files[0];if(!file){controls();return;}
    busy=true;controls();message('Revisando archivo...');
    try{
      if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Seleccioná un archivo .xlsx de hasta 5 MB.');
      const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);fileHash=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
      const book=XLSX.read(bytes,{type:'array',cellFormula:true,sheetRows:202});
      rows=ExcelMovements.parse(book,await catalog());
      rows.forEach(row=>{const tr=document.createElement('tr');[row.fila,row.fecha,row.descripcion,row.tipo,row.categoria,row.moneda,row.monto,row.medioPago].forEach(value=>{const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);});get('bulkMovementPreview').appendChild(tr);});
      message(rows.length+' movimientos listos para revisar. Se guardarán en tu cuenta y en su moneda original.');
    }catch(error){rows=[];message(error.message,true);}finally{busy=false;controls();}
  });
  save.addEventListener('click',async()=>{
    if(busy||!rows.length||saved>=rows.length)return;busy=true;controls();
    try{
      for(;saved<rows.length;saved++){
        const row=rows[saved];message('Guardando '+(saved+1)+' de '+rows.length+'...');
        const result=await request('create',{...row,carga_masiva_id:'bulk:'+fileHash+':'+row.fila});
        if(result.duplicado)duplicates++;
        if(result.sinCotizacion)missingRates++;
      }
      message('Carga completada: '+rows.length+' filas procesadas'+(duplicates?' ('+duplicates+' ya estaban guardadas).':'.')+(missingRates?' Hay movimientos BRL sin cotización histórica; ARS y USD quedan pendientes.':''));
    }catch(error){message('Carga detenida en la fila '+rows[saved].fila+'. '+saved+' filas procesadas. '+error.message+' Podés volver a Guardar para continuar sin duplicarlas.',true);}
    finally{
      busy=false;controls();
      // También refrescar ante una respuesta perdida: el servidor pudo haber guardado esa fila.
      window.dispatchEvent(new CustomEvent('movementspaid'));window.dispatchEvent(new CustomEvent('fixedexpenseschange'));
    }
  });
})();
