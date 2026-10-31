(function(){
  'use strict';
  if(!window.ReceiptPhotoTools||sessionStorage.getItem('controlGastos.loggedIn')!=='true')return;
  const get=id=>document.getElementById(id),tools=ReceiptPhotoTools;
  const copy={
    es:{choose:'Agregar fotos de la misma nota',limits:'Hasta 10 fotos, 10 MB por foto y 50 MB en total. Agregalas en el orden de lectura.',retry:'Reintentar lectura',consolidate:'Consolidar y revisar',clear:'Nueva nota',draft:'Detalle consolidado · Revisar',review:'Los datos son sugerencias de lectura. Revisá las fotos y corregí los campos antes de guardar o descargar. No se crea un movimiento.',merchant:'Supermercado / comercio',date:'Fecha',total:'Total de la nota (BRL)',product:'Producto',quantity:'Cantidad',unit:'Unidad',price:'Precio unitario',lineTotal:'Total',add:'Agregar producto',download:'Descargar detalle revisado',reparse:'Actualizar campos desde este texto',remove:'Quitar',up:'Subir',down:'Bajar',waiting:'Pendiente',reading:'Leyendo',done:'Leída',error:'No se pudo leer',limitError:'Usá hasta 10 fotos JPG, PNG o WEBP de 10 MB cada una y 50 MB en total.',duplicates:'Las fotos repetidas no se agregaron.',ready:'Lectura terminada. Ordená las fotos y presioná Consolidar y revisar.',failed:'Hay fotos que no se pudieron leer. Reintentá o quitalas antes de consolidar.',mixed:'Se detectaron claves de notas diferentes. Separá las fotos de cada nota antes de consolidar.',overlap:'Líneas de solapamiento eliminadas: ',itemSum:'Suma de productos: ',missing:'No se reconocieron todos los campos o productos. Completalos revisando el texto y las fotos.',difference:'La suma de productos no coincide con el total. Revisá artículos, descuentos y redondeos.',replace:'Ya editaste el borrador. Esta acción lo vuelve a generar desde el texto y reemplaza esas correcciones. ¿Continuar?',reset:'¿Quitar las fotos y el borrador para comenzar otra nota?',downloadError:'Completá comercio, fecha, total y los productos con importes válidos antes de descargar.',sourceChanged:'Las fotos cambiaron. Volvé a consolidar para actualizar el borrador.',working:'Foto',empty:'No se reconoció texto'},
    pt:{choose:'Adicionar fotos da mesma nota',limits:'Até 10 fotos, 10 MB por foto e 50 MB no total. Adicione na ordem de leitura.',retry:'Tentar leitura novamente',consolidate:'Consolidar e revisar',clear:'Nova nota',draft:'Detalhes consolidados · Revisar',review:'Os dados são sugestões de leitura. Confira as fotos antes de salvar ou baixar. Nenhum lançamento é criado.',merchant:'Supermercado / loja',date:'Data',total:'Total da nota (BRL)',product:'Produto',quantity:'Quantidade',unit:'Unidade',price:'Preço unitário',lineTotal:'Total',add:'Adicionar produto',download:'Baixar detalhes revisados',reparse:'Atualizar campos a partir do texto',remove:'Remover',up:'Subir',down:'Descer',waiting:'Pendente',reading:'Lendo',done:'Lida',error:'Falha na leitura',limitError:'Use até 10 fotos JPG, PNG ou WEBP de 10 MB cada e 50 MB no total.',duplicates:'Fotos repetidas não foram adicionadas.',ready:'Leitura concluída. Ordene as fotos e clique em Consolidar e revisar.',failed:'Algumas fotos falharam. Tente novamente ou remova antes de consolidar.',mixed:'Foram identificadas chaves de notas diferentes. Separe as fotos por nota.',overlap:'Linhas sobrepostas removidas: ',itemSum:'Soma dos produtos: ',missing:'Alguns campos ou produtos não foram reconhecidos. Complete conferindo texto e fotos.',difference:'A soma não corresponde ao total. Confira produtos, descontos e arredondamentos.',replace:'O rascunho foi editado. Gerar novamente substituirá suas correções. Continuar?',reset:'Remover fotos e rascunho para começar outra nota?',downloadError:'Preencha loja, data, total e produtos com valores válidos antes de baixar.',sourceChanged:'As fotos mudaram. Consolide novamente para atualizar.',working:'Foto',empty:'Nenhum texto reconhecido'},
    en:{choose:'Add photos of the same receipt',limits:'Up to 10 photos, 10 MB each and 50 MB total. Add in reading order.',retry:'Retry reading',consolidate:'Consolidate and review',clear:'New receipt',draft:'Consolidated details · Review',review:'These are recognition suggestions. Review photos before saving or downloading. No transaction is created.',merchant:'Supermarket / merchant',date:'Date',total:'Receipt total (BRL)',product:'Product',quantity:'Quantity',unit:'Unit',price:'Unit price',lineTotal:'Total',add:'Add product',download:'Download reviewed details',reparse:'Update fields from this text',remove:'Remove',up:'Move up',down:'Move down',waiting:'Pending',reading:'Reading',done:'Read',error:'Reading failed',limitError:'Use up to 10 JPG, PNG or WEBP photos, 10 MB each and 50 MB total.',duplicates:'Repeated photos were not added.',ready:'Reading finished. Order photos and select Consolidate and review.',failed:'Some photos failed. Retry or remove them before consolidating.',mixed:'Different receipt keys were detected. Separate photos by receipt.',overlap:'Overlapping lines removed: ',itemSum:'Product sum: ',missing:'Some fields or products were not recognized. Review the text and photos to complete them.',difference:'Items do not match the receipt total. Check products, discounts and rounding.',replace:'The draft was edited. Regenerating it replaces your corrections. Continue?',reset:'Remove photos and draft to start a new receipt?',downloadError:'Complete merchant, date, total and valid product amounts before downloading.',sourceChanged:'Photos changed. Consolidate again to update the draft.',working:'Photo',empty:'No text recognized'}
  };
  Object.assign(copy.es,{code:'Código',extraValue:'Valor',extraHelp:'El valor entre paréntesis se conserva separado del precio y del total del producto.',lineWarning:'Hay productos cuya cantidad × precio no coincide con su total. Revisá la lectura contra la foto.'});
  Object.assign(copy.pt,{code:'Código',extraValue:'Valor',extraHelp:'O valor entre parênteses é mantido separado do preço e do total do produto.',lineWarning:'Há produtos cuja quantidade × preço difere do total. Confira a foto.'});
  Object.assign(copy.en,{code:'Code',extraValue:'Value',extraHelp:'The parenthetical amount is kept separate from the product price and total.',lineWarning:'Some quantities × unit prices do not match their line totals. Check the photo.'});
  Object.assign(copy.es,{validated:'Validado correctamente: la suma de los productos coincide con el total de la nota.',notMatching:'No coincide con el total de la nota.',delta:'Diferencia (productos − nota): ',incomplete:'Completá el total de la nota y todos los totales de productos para validar.'});
  Object.assign(copy.pt,{validated:'Validado corretamente: a soma dos produtos corresponde ao total da nota.',notMatching:'Não corresponde ao total da nota.',delta:'Diferença (produtos − nota): ',incomplete:'Preencha o total da nota e todos os totais dos produtos para validar.'});
  Object.assign(copy.en,{validated:'Validated successfully: product totals match the receipt total.',notMatching:'Does not match the receipt total.',delta:'Difference (products − receipt): ',incomplete:'Complete the receipt total and every product total to validate.'});
  Object.assign(copy.es,{saveItems:'Guardar productos en Google Sheets',savingItems:'Guardando productos…',itemsSaved:'Productos guardados en items_mercado.',itemsSaveError:'No se pudo confirmar el guardado. Podés reintentar sin duplicar el lote.',saveInvalid:'Completá comercio, fecha, producto, cantidad, unidad y precio unitario antes de guardar.'});
  Object.assign(copy.pt,{saveItems:'Salvar produtos no Google Sheets',savingItems:'Salvando produtos…',itemsSaved:'Produtos salvos em items_mercado.',itemsSaveError:'Não foi possível confirmar. Tente novamente sem duplicar o lote.',saveInvalid:'Preencha loja, data, produto, quantidade, unidade e preço unitário.'});
  Object.assign(copy.en,{saveItems:'Save products to Google Sheets',savingItems:'Saving products…',itemsSaved:'Products saved to items_mercado.',itemsSaveError:'Could not confirm saving. Retrying will not duplicate this batch.',saveInvalid:'Complete merchant, date, product, quantity, unit and unit price.'});
  const newBatch=()=>window.crypto?.randomUUID?.()||'receipt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
  Object.assign(copy.es,{takePhoto:'Tomar foto con la cámara',cameraHelp:'Fotografiá toda la nota, incluidos los productos y el total. Apoyala plana, con buena luz y sin sombras. Para notas largas, agregá varias fotos con unas líneas en común.'});
  Object.assign(copy.pt,{takePhoto:'Tirar foto com a câmera',cameraHelp:'Fotografe a nota inteira, incluindo produtos e total. Apoie em uma superfície plana, com boa luz e sem sombras. Para notas longas, adicione fotos com algumas linhas em comum.'});
  Object.assign(copy.en,{takePhoto:'Take a photo with the camera',cameraHelp:'Photograph the entire receipt, including items and total. Keep it flat with good lighting and no shadows. For long receipts, add photos with a few overlapping lines.'});
  let batchId=newBatch(),saved=false;
  let photos=[],busy=false,sequence=0,items=[],dirty=false,revision=0,draftRevision=-1,sourceVersion=0,textSourceVersion=-1,notice='',isError=false;
  const t=()=>copy[(document.documentElement.lang||'es').slice(0,2)]||copy.es;
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function ocrSummary(text){
    const parsed=ReceiptData.parse(text),comparison=ReceiptData.compareTotals(parsed.total,parsed.items);
    return {parsed,comparison,complete:comparison.matches&&!!parsed.date&&!!parsed.merchant};
  }
  function preferOcr(current,candidate){
    if(!candidate.trim())return current;
    const a=ocrSummary(current),b=ocrSummary(candidate);
    // Elegir una lectura completa: no mezclar importes o productos de intentos distintos.
    const score=result=>[Number(result.comparison.matches),result.parsed.items.length,Number(!!result.parsed.date)+Number(!!result.parsed.merchant)+Number(result.parsed.total!==null)];
    const left=score(a),right=score(b);
    for(let i=0;i<left.length;i++){if(left[i]!==right[i])return right[i]>left[i]?candidate:current;}
    return current||candidate;
  }
  async function readPhoto(worker,image,camera){
    const canvas=make('canvas');
    function draw(left,top,width,height,scale,contrast=false){
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      const context=canvas.getContext('2d');
      context.filter=contrast?'grayscale(1) contrast(1.25)':'none';
      context.drawImage(image,left,top,width,height,0,0,canvas.width,canvas.height);
    }
    let best='';
    try{
      const width=image.naturalWidth,height=image.naturalHeight,scale=Math.min(1,2600/Math.max(width,height));
      draw(0,0,width,height,scale);
      best=String((await worker.recognize(canvas,{rotateAuto:true})).data.text||'').trim();
      if(!worker.setParameters||(!camera&&ocrSummary(best).complete))return best;
      try{
        await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
        draw(0,0,width,height,scale,true);
        best=preferOcr(best,String((await worker.recognize(canvas,{rotateAuto:true})).data.text||'').trim());
        // Leer tiras con solapamiento conserva letras pequeñas de tickets largos sin
        // mantener un canvas gigante en la memoria del teléfono.
        if(!ocrSummary(best).complete){
          const detailScale=Math.min(1,2600/width),tileHeight=Math.min(height,Math.floor(1800/detailScale));
          const overlap=Math.min(Math.floor(tileHeight*.2),Math.floor(300/detailScale));
          const step=Math.max(1,tileHeight-overlap),count=Math.ceil(Math.max(0,height-tileHeight)/step)+1;
          if(count<=10){
            const strips=[];
            for(let top=0;top<height;top+=step){
              const cropHeight=Math.min(tileHeight,height-top);draw(0,top,width,cropHeight,detailScale,true);
              strips.push({id:strips.length,text:String((await worker.recognize(canvas,{rotateAuto:true})).data.text||'').trim()});
              if(top+cropHeight>=height)break;
            }
            // Una fila completa con número de ítem y código identifica el mismo
            // producto en el borde de dos tiras de esta foto; no deduplicar sólo precios.
            const clean=line=>line.trim().replace(/\s+/g,' ').toLowerCase();
            for(let i=1;i<strips.length;i++){
              const previous=strips[i-1].text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
              const next=strips[i].text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
              if(/^\d{1,3}\s+\d{3,14}\s/.test(next[0]||'')&&clean(previous.at(-1)||'')===clean(next[0])){
                next.shift();strips[i].text=next.join('\n');
              }
            }
            best=preferOcr(best,ReceiptData.consolidate(strips).text);
          }
        }
      }catch(error){/* Un reintento fallido no descarta una lectura previa útil. */}
      finally{await worker.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'0'}).catch(()=>{});}
      return best;
    }finally{canvas.width=canvas.height=1;}
  }
  function message(key,error=false){notice=key;isError=error;get('receiptBatchStatus').textContent=t()[key]||key;get('receiptBatchStatus').className=error?'error':'';}
  function controls(){['receiptCamera','receiptTakePhoto'].forEach(id=>{if(get(id))get(id).disabled=busy||saved;});get('receiptPhoto').disabled=busy||saved;get('receiptConsolidate').disabled=busy||saved||!photos.length||photos.some(photo=>photo.state!=='done');get('receiptAnalyze').hidden=!photos.some(photo=>photo.state==='error'||photo.incomplete);get('receiptAnalyze').disabled=busy||saved;get('receiptClear').hidden=!photos.length;get('receiptClear').disabled=busy;get('receiptDownload').disabled=busy||draftRevision!==revision;get('receiptSaveItems').disabled=busy||saved||draftRevision!==revision;get('receiptAddItem').disabled=get('receiptReparse').disabled=get('receiptOcrText').disabled=busy||saved;get('receiptDraft').querySelectorAll?.('input').forEach(input=>{input.disabled=busy||saved;});get('receiptItems').querySelectorAll?.('button').forEach(button=>{button.disabled=busy||saved;});}
  function gallery(){get('receiptPhotos').replaceChildren();photos.forEach((photo,index)=>{
    const card=make('article');card.className='receipt-photo-card';const image=make('img');image.src=photo.url;image.alt=photo.file.name;
    const view=make('a');view.href=photo.url;view.target='_blank';view.rel='noopener noreferrer';view.appendChild(image);
    const name=make('strong',(index+1)+'. '+photo.file.name),state=make('span',t()[photo.state==='done'?'done':photo.state==='error'?'error':photo.state==='reading'?'reading':'waiting']);card.append(view,name,state);
    const actions=make('div');actions.className='receipt-actions';
    [['up',-1],['down',1],['remove',0]].forEach(([label,offset])=>{const button=make('button',t()[label]);button.type='button';button.setAttribute('aria-label',t()[label]+' '+t().working+' '+(index+1));button.disabled=busy||saved||offset!==0&&(index+offset<0||index+offset>=photos.length);button.onclick=()=>{
      if(busy)return;if(!offset){URL.revokeObjectURL(photo.url);photos.splice(index,1);}else [photos[index],photos[index+offset]]=[photos[index+offset],photos[index]];
      revision++;sourceVersion++;get('receiptResult').hidden=true;get('receiptQr').value='';gallery();message('sourceChanged');controls();};actions.appendChild(button);});card.appendChild(actions);get('receiptPhotos').appendChild(card);
  });controls();}
  async function analyze(force=false){
    if(busy)return;busy=true;gallery();let worker;
    try{
      await tools.library('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js');
      worker=await Tesseract.createWorker('por',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:info=>{if(info.status==='recognizing text')get('receiptBatchStatus').textContent=t().working+' '+(photos.findIndex(photo=>photo.state==='reading')+1)+' / '+photos.length+' · '+Math.round(info.progress*100)+'%';}});
      for(const photo of photos){if(photo.state==='done'&&!force)continue;photo.state='reading';gallery();
        try{const image=new Image();image.src=photo.url;await image.decode();
          try{photo.qr=await tools.readQr(image);}catch(error){photo.qr=null;}
          photo.text=await readPhoto(worker,image,photo.camera);
          photo.incomplete=!ocrSummary(photo.text).complete;
          if(!photo.text)throw Error('empty');photo.state='done';
        }catch(error){photo.state='error';}gallery();
      }
    }catch(error){photos.filter(photo=>photo.state!=='done').forEach(photo=>photo.state='error');}
    finally{if(worker)await worker.terminate().catch(()=>{});busy=false;gallery();message(photos.some(photo=>photo.state==='error')?'failed':'ready',photos.some(photo=>photo.state==='error'));}
  }
  function addPhotos(event){
    if(busy||saved)return;const incoming=Array.from(event.target.files||[]);event.target.value='';
    const fresh=incoming.filter(file=>!photos.some(photo=>photo.file.name===file.name&&photo.file.size===file.size&&photo.file.lastModified===file.lastModified));
    if(!fresh.length){if(incoming.length)message('duplicates');return;}
    if(photos.length+fresh.length>10||fresh.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)||photos.reduce((sum,photo)=>sum+photo.file.size,0)+fresh.reduce((sum,file)=>sum+file.size,0)>50*1024*1024){message('limitError',true);return;}
    fresh.forEach(file=>photos.push({id:++sequence,file,url:URL.createObjectURL(file),text:'',qr:null,state:'pending',camera:event.target.id==='receiptCamera'}));revision++;sourceVersion++;get('receiptResult').hidden=true;get('receiptQr').value='';analyze();
  }
  get('receiptPhoto').addEventListener('change',addPhotos);
  get('receiptCamera')?.addEventListener('change',addPhotos);
  if(get('receiptTakePhoto'))get('receiptTakePhoto').onclick=()=>{if(!busy&&!saved)get('receiptCamera').click();};
  function reconcile(){
    const comparison=ReceiptData.compareTotals(get('receiptTotal').value,items),locale=document.documentElement.lang||'es';
    const missingQuantity=items.some(item=>!(ReceiptData.amount(item.quantity)>0));
    const quantityMessage={es:'Completá la cantidad de todos los productos para validar.',pt:'Preencha a quantidade de todos os produtos para validar.',en:'Complete every product quantity to validate.'}[(locale||'es').slice(0,2)]||'Complete every product quantity to validate.';
    const money=value=>new Intl.NumberFormat(locale,{style:'currency',currency:'BRL',currencyDisplay:'code'}).format(value);
    const outcome=missingQuantity?quantityMessage:comparison.complete?comparison.matches?t().validated:t().notMatching+' '+t().delta+money(comparison.difference):t().incomplete;
    const node=get('receiptReconciliation');node.textContent=t().itemSum+money(comparison.sum)+' · '+outcome;
    node.className=missingQuantity?'pending':comparison.complete?comparison.matches?'valid':'invalid':'pending';
  }
  function table(){get('receiptItems').replaceChildren();items.forEach((item,index)=>{const row=make('tr');row.title=item.rawLine||'';['code','description','quantity','unit','unitPrice','parentheticalAmount','total'].forEach(field=>{
    const cell=make('td'),input=make('input');input.type=['quantity','unitPrice','parentheticalAmount','total'].includes(field)?'number':'text';if(input.type==='number'){input.min='0';input.step='0.0001';}input.value=item[field]??'';cell.setAttribute('data-label',t()[{description:'product',unitPrice:'price',parentheticalAmount:'extraValue',total:'lineTotal'}[field]||field]);input.setAttribute('aria-label',t()[{description:'product',unitPrice:'price',parentheticalAmount:'extraValue',total:'lineTotal'}[field]||field]+' '+(index+1));input.oninput=()=>{item[field]=input.value;dirty=true;reconcile();};cell.appendChild(input);row.appendChild(cell);
  });const cell=make('td'),remove=make('button',t().remove);remove.type='button';remove.onclick=()=>{items.splice(index,1);dirty=true;table();};cell.appendChild(remove);row.appendChild(cell);get('receiptItems').appendChild(row);});reconcile();}
  function draft(text){const data=ReceiptData.parse(text);get('receiptMerchant').value=data.merchant;get('receiptDate').value=data.date;get('receiptTotal').value=data.total??'';items=data.items;get('receiptDraft').hidden=false;dirty=false;draftRevision=revision;table();controls();}
  function canReplace(){return !dirty||window.confirm(t().replace);}
  get('receiptConsolidate').onclick=()=>{
    if(busy||!photos.length||photos.some(photo=>photo.state!=='done')||!canReplace())return;
    const keys=new Set();photos.forEach(photo=>{const key=photo.qr?ReceiptQr.parse(photo.qr).key:ReceiptQr.extractText(photo.text).key;if(key&&ReceiptQr.accessKeyValid(key))keys.add(key);});
    if(keys.size>1){message('mixed',true);return;}
    const consolidated=ReceiptData.consolidate(photos);get('receiptOcrText').value=consolidated.text;get('receiptOcrResult').hidden=false;textSourceVersion=sourceVersion;draft(consolidated.text);
    const extracted=ReceiptQr.extractText(consolidated.text),qr=photos.find(photo=>photo.qr)?.qr||extracted.receipt?.url;
    if(qr)tools.identify(qr);get('receiptPhotoKey').textContent=extracted.key||'';
    message(t().overlap+consolidated.removed.reduce((sum,n)=>sum+n,0)+' · '+t().missing);
  };
  get('receiptReparse').onclick=()=>{if(busy)return;if(textSourceVersion!==sourceVersion){message('sourceChanged',true);return;}if(canReplace())draft(get('receiptOcrText').value);};
  get('receiptOcrText').addEventListener('input',()=>{revision++;controls();});
  get('receiptAnalyze').onclick=()=>{if(busy||saved)return;revision++;sourceVersion++;analyze(true);};
  get('receiptAddItem').onclick=()=>{items.push({description:'',quantity:1,unit:'UN',unitPrice:'',total:''});dirty=true;table();};
  ['receiptMerchant','receiptDate','receiptTotal'].forEach(id=>get(id).addEventListener('input',()=>{dirty=true;reconcile();}));
  get('receiptClear').onclick=()=>{if(busy||!window.confirm(t().reset))return;photos.forEach(photo=>URL.revokeObjectURL(photo.url));photos=[];items=[];dirty=false;saved=false;batchId=newBatch();get('receiptSaveStatus').textContent='';revision++;draftRevision=-1;['receiptDraft','receiptOcrResult','receiptResult'].forEach(id=>get(id).hidden=true);get('receiptOcrText').value='';get('receiptQr').value='';get('digitizerStatus').textContent='';gallery();message('');};
  get('receiptDownload').onclick=()=>{
    if(busy||draftRevision!==revision)return;
    const total=ReceiptData.amount(get('receiptTotal').value),merchant=get('receiptMerchant').value.trim(),date=get('receiptDate').value;
    const normalized=items.map(item=>({...item,description:item.description.trim(),quantity:ReceiptData.amount(item.quantity),unitPrice:ReceiptData.amount(item.unitPrice),parentheticalAmount:ReceiptData.amount(item.parentheticalAmount),total:ReceiptData.amount(item.total)}));
    if(!merchant||!date||total===null||total<0||!normalized.length||normalized.some(item=>!item.description||item.quantity===null||item.quantity<=0||item.total===null||item.total<0||item.unitPrice===null||item.unitPrice<0)){message('downloadError',true);return;}
    const data={version:1,source:'photo_ocr_reviewed',currency:'BRL',merchant,date,total,items:normalized,photos:photos.map(photo=>({name:photo.file.name,text:photo.text})),text:get('receiptOcrText').value};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=make('a');link.href=url;link.download='nota-'+date+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  get('receiptSaveItems').onclick=async()=>{
    if(busy||saved||draftRevision!==revision)return;
    const commerce=get('receiptMerchant').value.trim(),date=get('receiptDate').value;
    const payload=items.map(item=>({description:item.description.trim(),code:String(item.code||'').trim(),quantity:ReceiptData.amount(item.quantity),unit:String(item.unit||'').trim(),unitPrice:ReceiptData.amount(item.unitPrice)}));
    const status=get('receiptSaveStatus');
    if(!commerce||!date||!payload.length||payload.some(item=>!item.description||!item.unit||item.quantity===null||item.quantity<=0||item.unitPrice===null||item.unitPrice<0)){status.textContent=t().saveInvalid;status.className='error';return;}
    busy=true;gallery();controls();status.textContent=t().savingItems;status.className='';
    try{
      const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');if(!user?.perfil_token)throw Error(I18n.t('movement.session'));
      const response=await fetch('https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec',{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'save_scanned_market_items',perfil_token:user.perfil_token,lote_id:batchId,comercio:commerce,fecha:date,items:payload})});
      if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!data.ok)throw Error(data.error||t().itemsSaveError);
      if(!Number.isInteger(data.guardados)||data.guardados!==payload.length)throw Error(t().itemsSaveError);
      saved=true;status.textContent=t().itemsSaved;status.className='success';
    }catch(error){status.textContent=t().itemsSaveError+' '+error.message;status.className='error';}
    finally{busy=false;gallery();controls();}
  };
  function translate(){document.querySelectorAll('[data-scan]').forEach(node=>node.textContent=t()[node.dataset.scan]);gallery();if(!get('receiptDraft').hidden)table();controls();if(saved)get('receiptSaveStatus').textContent=t().itemsSaved;if(notice)message(notice,isError);}
  window.addEventListener('languagechange',translate);translate();
})();
