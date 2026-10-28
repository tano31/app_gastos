(function(){
  'use strict';
  function parseReceiptQr(value){
    if(typeof value!=='string'||value.length>5000)throw Error('invalid');
    const url=new URL(value.trim());
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!url.hostname.endsWith('.gov.br')||!/(sefaz|fazenda|nfce|nfe|dfe|receita)/i.test(url.hostname))throw Error('invalid');
    const key=Array.from(url.searchParams.values()).join(' ').match(/\b\d{44}\b/);
    return {url:url.href,host:url.hostname,key:key?key[0]:''};
  }
  function accessKeyValid(value){
    const key=String(value||'').replace(/\s/g,'');
    if(!/^\d{44}$/.test(key))return false;
    let sum=0,weight=2;
    for(let i=42;i>=0;i--){sum+=Number(key[i])*weight;weight=weight===9?2:weight+1;}
    const remainder=sum%11,digit=remainder<2?0:11-remainder;
    return digit===Number(key[43]);
  }
  function accessKeyUrl(value){
    const key=String(value||'').replace(/\s/g,'');
    if(!/^\d{44}$/.test(key)||key.slice(0,2)!=='35'||key.slice(20,22)!=='65')return null;
    return 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx?chNFe='+key;
  }
  function extractReceiptText(text){
    const normalized=String(text||'').replace(/\s*([./?=&|])\s*/g,'$1');
    let receipt=null;
    for(const candidate of normalized.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)||[]){try{receipt=parseReceiptQr(candidate.startsWith('www.')?'https://'+candidate:candidate);break;}catch(error){}}
    const key=(String(text||'').match(/(?:\d[ \t]*){44}/)||[])[0]?.replace(/\s/g,'')||'';
    const generated=accessKeyUrl(key);
    if(generated&&(!receipt||!receipt.key)&&(!receipt||receipt.host.endsWith('fazenda.sp.gov.br')))receipt=parseReceiptQr(generated);
    return {receipt,key};
  }
  window.ReceiptQr={parse:parseReceiptQr,extractText:extractReceiptText,accessKeyUrl,accessKeyValid};
  if(sessionStorage.getItem('controlGastos.loggedIn')!=='true'){window.location.href=I18n.page('login.html');return;}
  const get=id=>document.getElementById(id);
  const copy={
    es:{subtitle:'Consultá tus notas fiscales de Brasil desde una foto o su QR.',heading:'Digitalizar nota fiscal',intro:'Cargá una foto donde se vea el QR o pegá el enlace de consulta de tu nota.',choose:'Seleccionar foto',formats:'JPG, PNG o WEBP · hasta 10 MB',qrLabel:'Enlace del QR de la nota fiscal',identify:'Identificar QR',identified:'Enlace de consulta identificado',open:'Abrir nota en SEFAZ',pending:'La consulta automática del comprobante en SEFAZ todavía no está conectada. Revisá el texto leído de la foto o abrí la nota en el sitio oficial. Esta pantalla no registra gastos.',privacy:'La foto se procesa en este navegador y no se sube a ningún servicio.',reading:'Buscando el QR en la foto…',unsupported:'Este navegador no permite leer el QR automáticamente. Escanealo con tu celular y pegá aquí el enlace.',notFound:'No se pudo leer un QR fiscal. Probá una foto más nítida o pegá el enlace del QR.',invalid:'Pegá un enlace de consulta fiscal de un dominio oficial de SEFAZ. El contenido del QR debe ser una URL.',fileError:'Elegí una imagen JPG, PNG o WEBP de hasta 10 MB.',found:'QR identificado. Podés abrir la consulta oficial.',key:'Clave de acceso detectada: ',noKey:'Este enlace no incluye una clave de acceso reconocible.',authority:'Sitio oficial: '},
    pt:{subtitle:'Consulte notas fiscais do Brasil por foto ou QR Code.',heading:'Digitalizar nota fiscal',intro:'Envie uma foto com o QR visível ou cole o link de consulta da nota.',choose:'Selecionar foto',formats:'JPG, PNG ou WEBP · até 10 MB',qrLabel:'Link do QR Code da nota fiscal',identify:'Identificar QR',identified:'Link de consulta identificado',open:'Abrir nota na SEFAZ',pending:'A consulta automática da nota na SEFAZ ainda não está conectada. Confira o texto da foto ou abra o site oficial. Esta tela não registra despesas.',privacy:'A foto é processada neste navegador e não é enviada a serviços externos.',reading:'Buscando QR na foto…',unsupported:'Este navegador não permite ler o QR automaticamente. Leia com seu celular e cole o link aqui.',notFound:'Não foi possível ler um QR fiscal. Use uma foto mais nítida ou cole o link.',invalid:'Cole um link fiscal de um domínio oficial da SEFAZ. O QR deve conter uma URL.',fileError:'Escolha uma imagem JPG, PNG ou WEBP de até 10 MB.',found:'QR identificado. Você pode abrir a consulta oficial.',key:'Chave de acesso detectada: ',noKey:'Este link não contém uma chave de acesso reconhecível.',authority:'Site oficial: '},
    en:{subtitle:'Check Brazilian receipts using a photo or QR link.',heading:'Scan a receipt',intro:'Choose a photo with a visible QR code or paste the receipt consultation link.',choose:'Choose photo',formats:'JPG, PNG or WEBP · up to 10 MB',qrLabel:'Receipt QR code link',identify:'Identify QR',identified:'Consultation link identified',open:'Open receipt on SEFAZ',pending:'Automatic SEFAZ consultation is not connected yet. Review the photo text or open the official receipt. This screen does not record expenses.',privacy:'The photo is processed in this browser and is not uploaded to any service.',reading:'Looking for the QR code…',unsupported:'This browser cannot read QR codes automatically. Scan it with your phone and paste the link here.',notFound:'Could not read a fiscal QR code. Try a clearer photo or paste its link.',invalid:'Paste a fiscal consultation link from an official SEFAZ domain. The QR must contain a URL.',fileError:'Choose a JPG, PNG or WEBP image up to 10 MB.',found:'QR identified. You can open the official consultation.',key:'Detected access key: ',noKey:'This link has no recognizable access key.',authority:'Official website: '}
  };
  const extra={
    es:{ocrTitle:'Texto leído de la foto',ocrHelp:'Revisá los datos reconocidos: una foto borrosa puede producir errores.',ocrReading:'Leyendo el texto de la nota…',ocrDone:'Foto analizada. Revisá el texto reconocido y el enlace detectado.',ocrError:'No se pudo leer el texto. Verificá la conexión y probá una foto más nítida. También podés pegar el enlace del QR.',privacy:'La foto se procesa en tu navegador. Para leerla se descargan las herramientas de reconocimiento; la imagen no se envía a un servicio.',qrOnly:'QR identificado. No se pudo leer el texto de la foto; podés abrir la consulta oficial.'},
    pt:{ocrTitle:'Texto lido da foto',ocrHelp:'Confira os dados reconhecidos: fotos desfocadas podem causar erros.',ocrReading:'Lendo o texto da nota…',ocrDone:'Foto analisada. Confira o texto reconhecido e o link detectado.',ocrError:'Não foi possível ler o texto. Verifique a conexão e tente uma foto mais nítida, ou cole o link do QR.',privacy:'A foto é processada no seu navegador. As ferramentas de reconhecimento são baixadas; a imagem não é enviada a um serviço.',qrOnly:'QR identificado. Não foi possível ler o texto; você pode abrir a consulta oficial.'},
    en:{ocrTitle:'Text read from the photo',ocrHelp:'Review recognized data: blurry images can cause errors.',ocrReading:'Reading receipt text…',ocrDone:'Photo analyzed. Review the recognized text and detected link.',ocrError:'Could not read the text. Check your connection and try a clearer photo, or paste the QR link.',privacy:'The photo is processed in your browser. Recognition tools are downloaded; the image is not uploaded to a service.',qrOnly:'QR identified. Could not read the photo text; you can open the official consultation.'}
  };
  Object.keys(copy).forEach(lang=>Object.assign(copy[lang],extra[lang]));
  copy.es.identify='Consultar nota fiscal';copy.pt.identify='Consultar nota fiscal';copy.en.identify='View receipt';
  copy.es.reviewKey='Enlace completado. La clave leída no pasa la validación del dígito verificador: revisá los números de la foto antes de consultar.';
  copy.pt.reviewKey='Link preenchido. A chave lida não passou na validação do dígito verificador: confira os números da foto antes de consultar.';
  copy.en.reviewKey='Link filled in. The recognized key failed its check digit validation: review the photo digits before consulting.';
  copy.es.intro='Agregá las fotos de una misma nota en orden. Leemos el texto y consolidamos un detalle para revisar.';copy.pt.intro='Adicione fotos da mesma nota em ordem. O texto será consolidado para revisão.';copy.en.intro='Add photos of the same receipt in order. Text is consolidated into a draft for review.';
  copy.es.ocrTitle='Texto consolidado de las fotos';copy.pt.ocrTitle='Texto consolidado das fotos';copy.en.ocrTitle='Consolidated photo text';
  let generation=0,statusKey='',statusError=false,result=null;
  const scripts=new Map();
  function library(src){if(scripts.has(src))return scripts.get(src);const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();scripts.delete(src);reject(Error('library'));};document.head.appendChild(script);});scripts.set(src,promise);return promise;}
  async function findQr(image,current){
    if(window.BarcodeDetector){try{const codes=await new BarcodeDetector({formats:['qr_code']}).detect(image);for(const code of codes){try{return parseReceiptQr(code.rawValue).url;}catch(error){}}}catch(error){}}
    await library('jsqr.min.js');if(current!==generation)return null;
    const w=image.naturalWidth,h=image.naturalHeight,regions=[[0,0,w,h],[0,0,w*.65,h*.65],[w*.35,0,w*.65,h*.65],[0,h*.35,w*.65,h*.65],[w*.35,h*.35,w*.65,h*.65]];
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
    for(const [x,y,width,height] of regions){if(current!==generation)return null;const scale=Math.min(1,2000/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);context.drawImage(image,x,y,width,height,0,0,canvas.width,canvas.height);const data=context.getImageData(0,0,canvas.width,canvas.height),code=jsQR(data.data,data.width,data.height,{inversionAttempts:'attemptBoth'});if(code){try{return parseReceiptQr(code.data).url;}catch(error){}}await new Promise(resolve=>setTimeout(resolve,0));}
    return null;
  }
  function words(){return copy[(document.documentElement.lang||'es').slice(0,2)]||copy.es;}
  function message(key,error=false){statusKey=key;statusError=error;get('digitizerStatus').textContent=words()[key]||'';get('digitizerStatus').className=error?'error':'';}
  function renderResult(){if(!result)return;get('receiptAuthority').textContent=words().authority+result.host;get('receiptKey').textContent=result.key?words().key+result.key:words().noKey;get('receiptOfficialLink').href=result.url;get('receiptResult').hidden=false;}
  function identify(value){result=null;get('receiptResult').hidden=true;try{result=parseReceiptQr(value);get('receiptQr').value=result.url;renderResult();message('found');}catch(error){message('invalid',true);}}
  function translate(){document.querySelectorAll('[data-copy]').forEach(node=>node.textContent=words()[node.dataset.copy]);get('receiptOcrText').setAttribute('aria-label',words().ocrTitle);message(statusKey,statusError);renderResult();}
  get('receiptQrForm').addEventListener('submit',event=>{event.preventDefault();generation++;identify(get('receiptQr').value);if(result)window.open(result.url,'_blank','noopener,noreferrer');});
  get('receiptQr').addEventListener('input',()=>{generation++;result=null;get('receiptResult').hidden=true;message('');});
  window.ReceiptPhotoTools={library,readQr:image=>findQr(image,generation),identify};
  get('logoutBtn').addEventListener('click',async()=>{await Auth.logout();window.location.href=I18n.page('login.html');});
  window.addEventListener('languagechange',translate);translate();
})();
