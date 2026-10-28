(function () {
  'use strict';
  const headers = ['id', 'fecha', 'usuario_id', 'descripcion', 'categoria', 'monto'];
  function amount(value) {
    if (typeof value === 'number') return value;
    let text = String(value || '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
    if (!/^(?:\d+|\d+[.,]\d{1,2}|\d{1,3}(?:\.\d{3})+,\d{1,2}|\d{1,3}(?:,\d{3})+\.\d{1,2})$/.test(text)) return NaN;
    if (text.includes(',') && text.includes('.')) {
      text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g,'').replace(',','.') : text.replace(/,/g,'');
    } else text = text.replace(',','.');
    return Number(text);
  }
  function date(value, book) {
    if (value === '' || value == null) return '';
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) throw new Error('Fecha inválida en Excel.');
      return value.toISOString();
    }
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value, {date1904: !!(book.Workbook && book.Workbook.WBProps && book.Workbook.WBProps.date1904)});
      if (!parsed || (parsed.y === 1900 && parsed.m === 2 && parsed.d === 29)) throw new Error('Fecha inválida en Excel.');
      return new Date(parsed.y, parsed.m-1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S)).toISOString();
    }
    const text = String(value).trim();
    const local = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (local) {
      const result = new Date(Number(local[3]),Number(local[2])-1,Number(local[1]),Number(local[4]||0),Number(local[5]||0),Number(local[6]||0));
      if (result.getFullYear() !== Number(local[3]) || result.getMonth()+1 !== Number(local[2]) || result.getDate() !== Number(local[1]) || result.getHours() !== Number(local[4]||0) || result.getMinutes() !== Number(local[5]||0)) throw new Error('Fecha inválida en Excel.');
      return result.toISOString();
    }
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(text)) throw new Error('Fecha inválida en Excel.');
    const result = new Date(text);
    const calendar = new Date(text.slice(0,10));
    if (!Number.isFinite(result.getTime()) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0,10) !== text.slice(0,10)) throw new Error('Fecha inválida en Excel.');
    return result.toISOString();
  }
  async function read(file) {
    if (!file || !/\.(xlsx|xls)$/i.test(file.name) || file.size > 5*1024*1024) throw new Error('Seleccioná un Excel .xlsx o .xls de hasta 5 MB.');
    if (typeof XLSX === 'undefined') throw new Error('No se pudo cargar el lector de Excel. Recargá la página.');
    try {
      const book = XLSX.read(await file.arrayBuffer(), {type:'array',cellDates:true,cellFormula:true,sheetRows:2002});
      if (!book.SheetNames.length) throw new Error();
      return book;
    } catch (error) {throw new Error('No se pudo leer el Excel. Revisá que no esté protegido o dañado.');}
  }
  function rows(book, name, userId) {
    const sheet = book.Sheets[name];
    if (!sheet || !sheet['!ref']) throw new Error('La hoja seleccionada está vacía.');
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    if (range.e.r > 2001 || range.e.c > 49) throw new Error('El archivo admite hasta 2000 gastos y 50 columnas.');
    const table = XLSX.utils.sheet_to_json(sheet, {header:1,raw:true,defval:'',blankrows:true});
    const origin = XLSX.utils.decode_range(sheet['!ref']).s;
    const sourceHeaders = (table[0] || []).map(value=>String(value).trim().toLowerCase());
    if (headers.some(header=>sourceHeaders.filter(value=>value===header).length!==1)) throw new Error('El Excel debe tener: id, fecha, usuario_id, descripcion, categoria, monto.');
    const columns = Object.fromEntries(headers.map(header=>[header,sourceHeaders.indexOf(header)]));
    const output = [];
    table.slice(1).forEach((row,index)=>{
      if (row.every(value=>value==='' || value==null)) return;
      const number = origin.r+index+2;
      if (headers.some(header=>{const cell=sheet[XLSX.utils.encode_cell({r:origin.r+index+1,c:origin.c+columns[header]})];return cell && cell.f;})) throw new Error('El Excel contiene fórmulas. Pegá los datos como valores antes de importar.');
      const description=String(row[columns.descripcion] || '').trim(), category=String(row[columns.categoria] || '').trim();
      if (!description || !category || description.length>500 || category.length>100) throw new Error('Descripción o categoría inválida en fila '+number+'.');
      const author=String(row[columns.usuario_id] || '').trim();
      if (author && author.toLowerCase()!==userId.toLowerCase()) throw new Error('El archivo contiene gastos de otro usuario.');
      const value=Math.round(amount(row[columns.monto])*100)/100;
      if (!Number.isFinite(value) || value<=0) throw new Error('Monto inválido en fila '+number+'.');
      const currencyIndex=sourceHeaders.indexOf('moneda'),currency=currencyIndex<0?'BRL':String(row[currencyIndex]||'BRL').trim().toUpperCase();
      if(!['BRL','ARS','USD'].includes(currency))throw new Error('Moneda inválida en fila '+number+'.');
      output.push({descripcion:description,categoria:category,monto:value,fecha:date(row[columns.fecha],book),usuario_id:userId,...(currencyIndex<0?{}:{moneda:currency})});
    });
    if (!output.length || output.length>2000) throw new Error('El archivo debe contener entre 1 y 2000 gastos fijos.');
    return output;
  }
  function template(userId) {
    const book=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet([headers,['','',userId,'Alquiler','Vivienda',1500]]);
    sheet['!cols']=[{wch:8},{wch:22},{wch:20},{wch:35},{wch:25},{wch:15}];
    XLSX.utils.book_append_sheet(book,sheet,'Gastos_fijos');
    XLSX.writeFile(book,'plantilla_gastos_fijos.xlsx');
  }
  window.ExcelFixedImport = {read,rows,template};
})();
