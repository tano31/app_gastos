(function(){
  'use strict';
  const headers=['fecha','descripcion','tipo','categoria','moneda','monto','medioPago','periodo'];
  const types={'Gasto variable':'gasto_variable','Gasto fijo':'gasto_fijo','Ingreso':'ingreso','Ahorro':'ahorro'};
  const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const encoder=new TextEncoder();
  // ZIP sin compresión: genera un XLSX con validaciones de lista nativas de Excel.
  function zip(files){
    const chunks=[],central=[];let offset=0;
    const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
    Object.entries(files).forEach(([name,content])=>{
      const n=encoder.encode(name),data=encoder.encode(content),sum=crc(data),local=new Uint8Array(30+n.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(10,0,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);local.set(n,30);
      const directory=new Uint8Array(46+n.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(14,33,true);d.setUint32(16,sum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);directory.set(n,46);
      chunks.push(local,data);central.push(directory);offset+=local.length+data.length;
    });
    const size=central.reduce((sum,c)=>sum+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
    return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function sheet(rows,extra=''){
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="8" width="24" customWidth="1"/></cols><sheetData>'+rows.map((row,r)=>'<row r="'+(r+1)+'">'+row.map((value,c)=>'<c r="'+String.fromCharCode(65+c)+(r+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData>'+extra+'</worksheet>';
  }
  function template(catalog){
    const lists=[Object.keys(types),catalog.categories,['BRL','ARS','USD'],catalog.methods];
    if(lists.some(list=>!list.length))throw Error('No hay opciones disponibles para crear la plantilla.');
    const names=['Tipos','Categorias','Monedas','Medios'],cols=['C','D','E','G'];
    const validation='<autoFilter ref="A1:H201"/><dataValidations count="5">'+names.map((name,i)=>'<dataValidation type="list" allowBlank="0" showErrorMessage="1" errorStyle="stop" errorTitle="Seleccioná una opción" error="Usá una opción de la lista." sqref="'+cols[i]+'2:'+cols[i]+'201"><formula1>'+name+'</formula1></dataValidation>').join('')+'<dataValidation type="decimal" operator="greaterThan" allowBlank="0" showErrorMessage="1" sqref="F2:F201"><formula1>0</formula1></dataValidation></dataValidations>';
    const listRows=Array.from({length:Math.max(...lists.map(list=>list.length))},(_,r)=>lists.map(list=>list[r]||''));
    const files={
      '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+[1,2,3].map(n=>'<Override PartName="/xl/worksheets/sheet'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>',
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Movimientos" sheetId="1" r:id="rId1"/><sheet name="Listas" sheetId="2" state="hidden" r:id="rId2"/><sheet name="Instrucciones" sheetId="3" r:id="rId3"/></sheets><definedNames>'+names.map((name,i)=>'<definedName name="'+name+'">Listas!$'+String.fromCharCode(65+i)+'$1:$'+String.fromCharCode(65+i)+'$'+lists[i].length+'</definedName>').join('')+'</definedNames></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+[1,2,3].map(n=>'<Relationship Id="rId'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+n+'.xml"/>').join('')+'</Relationships>',
      'xl/worksheets/sheet1.xml':sheet([headers],validation),
      'xl/worksheets/sheet2.xml':sheet(listRows),
      'xl/worksheets/sheet3.xml':sheet([['Carga masiva de movimientos'],['Completá la hoja Movimientos, filas 2 a 201. No modifiques los encabezados.'],['Fecha: yyyy-mm-dd o dd/mm/yyyy. Descripción: texto libre.'],['Tipo, categoría, moneda y medioPago: seleccioná una opción de la lista.'],['Monto: número positivo en la moneda elegida, sin símbolos.'],['Periodo: opcional, yyyy-mm para gastos fijos. Vacío utiliza el mes de la fecha.'],['No uses fórmulas. No agregues usuarios ni IDs: se carga en tu cuenta.'],['Guardá el archivo como .xlsx y revisalo antes de confirmar la carga.'],['El mismo archivo no se vuelve a guardar al reintentar. Un archivo modificado se considera otra carga.']])
    };return zip(files);
  }
  function date(value,book){
    let text=String(value||'').trim();
    if(typeof value==='number'){
      const parsed=XLSX.SSF.parse_date_code(value,{date1904:!!book.Workbook?.WBProps?.date1904});
      if(!parsed)throw Error('Fecha inválida.');text=parsed.y+'-'+String(parsed.m).padStart(2,'0')+'-'+String(parsed.d).padStart(2,'0');
    }
    const local=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(local)text=local[3]+'-'+local[2]+'-'+local[1];
    const checked=new Date(text+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(checked.getTime())||checked.toISOString().slice(0,10)!==text)throw Error('Fecha inválida.');return text;
  }
  function parse(book,catalog){
    const sheet=book.Sheets.Movimientos;if(!sheet?.['!ref'])throw Error('No se encontró la hoja Movimientos.');
    const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']);if(range.e.r>200||range.e.c>7)throw Error('La plantilla admite hasta 200 movimientos y 8 columnas.');
    const table=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true});
    if(headers.some((header,index)=>String(table[0]?.[index]||'').trim()!==header))throw Error('Usá los encabezados de la plantilla sin modificarlos.');
    const output=[];
    table.slice(1).forEach((row,index)=>{
      if(row.every(value=>value===''||value==null))return;
      const number=index+2;
      try{
        if(headers.some((_,c)=>sheet[XLSX.utils.encode_cell({r:index+1,c})]?.f))throw Error('No se permiten fórmulas.');
        const values=row.map(value=>String(value??'').trim()),[rawDate,descripcion,rawType,categoria,moneda,rawAmount,medioPago,periodo]=values;
        const tipo=types[rawType]||(Object.values(types).includes(rawType)?rawType:null);
        if(!descripcion||descripcion.length>500)throw Error('Descripción obligatoria de hasta 500 caracteres.');
        if(!tipo||!catalog.categories.includes(categoria)||!catalog.methods.includes(medioPago)||!['BRL','ARS','USD'].includes(moneda))throw Error('Revisá tipo, categoría, moneda y medio de pago.');
        const amount=typeof row[5]==='number'?row[5]:/^\d+(?:[.,]\d{1,2})?$/.test(rawAmount)?Number(rawAmount.replace(',','.')):NaN;
        if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.00001)throw Error('Monto positivo con hasta dos decimales.');
        if(periodo&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))throw Error('Período inválido: usá yyyy-mm.');
        const fecha=date(row[0],book);output.push({fila:number,fecha,descripcion,tipo,categoria,moneda,monto:amount,medioPago,...(tipo==='gasto_fijo'?{periodo:periodo||fecha.slice(0,7)}:{})});
      }catch(error){throw Error('Fila '+number+': '+error.message);}
    });
    if(!output.length)throw Error('El archivo no contiene movimientos.');return output;
  }
  window.ExcelMovements={template,parse};
})();
