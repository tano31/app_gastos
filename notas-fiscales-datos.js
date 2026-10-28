(function(){
  'use strict';
  const normalize=line=>String(line).trim().toLowerCase().replace(/\s+/g,' ');
  function amount(value){
    const text=String(value??'').trim().replace(/R\$/gi,'').replace(/\s/g,'');
    if(!text)return null;
    const clean=text.includes(',')?text.replace(/\./g,'').replace(',','.'):text;
    if(!/^-?\d+(?:\.\d+)?$/.test(clean))return null;
    const number=Number(clean);return Number.isFinite(number)?number:null;
  }
  // Solo eliminar el sufijo/prefijo coincidente de fotos contiguas: compras repetidas son válidas.
  function consolidate(pages){
    const lines=[],removed=[];
    pages.forEach((page,index)=>{
      const next=String(page.text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      let overlap=0;
      if(index){for(let size=Math.min(lines.length,next.length,120);size>=2;size--){if(next.slice(0,size).every((line,i)=>normalize(line)===normalize(lines[lines.length-size+i].text))){overlap=size;break;}}}
      removed.push(overlap);
      next.slice(overlap).forEach(line=>lines.push({text:line,photo:page.id}));
    });
    return {text:lines.map(line=>line.text).join('\n'),lines,removed};
  }
  function parse(text){
    const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean),items=[];
    const dateMatch=String(text||'').match(/\b(\d{2})[\/-](\d{2})[\/-](\d{4})\b/);
    let date='';if(dateMatch){const candidate=dateMatch[3]+'-'+dateMatch[2]+'-'+dateMatch[1],check=new Date(candidate+'T12:00:00Z');if(Number.isFinite(check.getTime())&&check.toISOString().slice(0,10)===candidate)date=candidate;}
    let total=null,priority=-1;
    lines.forEach((line,index)=>{
      if(/total.*itens|tribut|troco|desconto/i.test(line))return;
      const rank=/valor\s*(?:a\s*)?pagar|total\s*a\s*pagar/i.test(line)?3:/valor\s*total|total\s*(?:r\$|:)/i.test(line)?2:/^total\b/i.test(line)?1:0;
      const match=line.match(/(-?[\d.]+,\d{2})\s*$/)||(/^[\d.]+,\d{2}$/.test(lines[index+1]||'')?lines[index+1].match(/([\d.]+,\d{2})/):null);if(rank&&rank>=priority&&match){total=amount(match[1]);priority=rank;}
    });
    const merchantWithCnpj=lines.slice(0,10).map(line=>line.match(/\bCNPJ\s*:\s*[\d./\-\s]+([A-ZÀ-ÿ].*)/i)).find(Boolean);
    const merchant=merchantWithCnpj&&!/^I[EF]\s*[:\d]/i.test(merchantWithCnpj[1])?merchantWithCnpj[1].trim():lines.slice(0,10).find(line=>/[a-zÀ-ÿ]{3}/i.test(line)&&!/(cnpj|cpf|documento|danfe|consumidor|nota fiscal|chave|http|inscri|endere|emiss|\bcep\b)/i.test(line)&&!/^[\d\s.,:/-]+$/.test(line))||'';
    // Algunos comercios (DIA) imprimen la situación tributaria F/T03 entre precio y total.
    const detailPattern=/^(?:(.+?)\s+)?(?:[—–]\s*)?(\d+(?:[.,]\d+)?)?\s*(UN|UM|KG|KA|G|LT|L|ML|PC|PCT|CX)[0-9]?\s*(?:[xX*×]\s*)?(?:R\$\s*)?([\d.]+,\d{2,4})\s*(?:\(\s*(?:R\$\s*)?([\d.]+,\d{2,4})\s*\)\s*)?(?:(?:F|[TI1]\s*[O0-9]{1,3})[.:]?\s+)?(?:R\$\s*)?([\d.]+,\d{2})\s*$/i;
    for(let i=0;i<lines.length;i++){
      // Formato habitual: 001 123456 ARROZ 2 UN X 5,00 10,00 (también en dos líneas).
      const header=lines[i].match(/^(\d{1,3})\s+(\d{3,14})\s+(.+)$/);
      if(!header)continue;
      const parts=header[3].match(detailPattern);
      let description=header[3],detail=parts,rawLine=lines[i];
      if(!detail){
        let combined=header[3];
        for(let offset=1;offset<=3&&lines[i+offset];offset++){
          const next=lines[i+offset];
          if(/^(?:\d{1,3}\s+\d{3,14}\s|QTD|QTDE|VALOR\s+TOTAL|TOTAL|CNPJ|CPF)/i.test(next))break;
          combined+=' '+next;
          const joined=combined.match(detailPattern);
          if(joined&&joined[1]){detail=joined;rawLine=lines.slice(i,i+offset+1).join('\n');i+=offset;break;}
        }
      }
      if(detail)description=detail[1];
      if(!detail)continue;
      const rawUnit=detail[3].toUpperCase(),unit=rawUnit==='UM'?'UN':rawUnit==='KA'?'KG':rawUnit;
      const issues=unit!==rawUnit?['unit_ocr_corrected']:[];
      let quantity=amount(detail[2]);
      const unitPrice=amount(detail[4]),itemTotal=amount(detail[6]);
      // Recuperar unidades enteras solo si los importes justifican exactamente la cantidad.
      if(quantity===null&&['UN','PC','PCT','CX'].includes(unit)&&unitPrice>0&&itemTotal>0){
        const candidate=Math.round(itemTotal/unitPrice);
        if(candidate>0&&Number.isSafeInteger(candidate)&&Math.abs(itemTotal/unitPrice-candidate)<0.000001&&Math.round(candidate*unitPrice*100)===Math.round(itemTotal*100)){
          quantity=candidate;issues.push('quantity_inferred');
        }
      }
      if(quantity===null)issues.push('quantity_missing');
      items.push({code:header[2],description,quantity,unit,unitPrice,parentheticalAmount:amount(detail[5]),total:itemTotal,rawLine,issues});
    }
    return {merchant,date,total,items};
  }
  function compareTotals(totalValue,items){
    const total=amount(totalValue),values=items.map(item=>amount(item.total));
    const complete=total!==null&&total>=0&&values.length>0&&values.every(value=>value!==null&&value>=0);
    const cents=value=>Math.round((value+Number.EPSILON)*100);
    const sumCents=values.reduce((sum,value)=>sum+(value!==null&&value>=0?cents(value):0),0);
    const difference=complete?sumCents-cents(total):null;
    return {complete,sum:sumCents/100,difference:difference===null?null:difference/100,matches:complete&&difference===0};
  }
  window.ReceiptData={amount,consolidate,parse,compareTotals};
})();
