(function(){
  'use strict';
  let user;try{user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');}catch(error){return;}
  const nav=document.querySelector('.sidebar nav');
  if(!user?.perfil_token||sessionStorage.getItem('controlGastos.loggedIn')!=='true'||!nav)return;
  const key='controlGastos.tour.v1:'+String(user.id??user.usuario_id);
  const visibilityKey='controlGastos.tour.visible:'+String(user.id??user.usuario_id);
  let tourVisible=true;
  try{tourVisible=localStorage.getItem(visibilityKey)!=='false';}catch(error){}
  const copy={
    es:{launch:'Recorrido guiado',brand:'Conocé tu plataforma',skip:'Omitir',back:'Anterior',next:'Siguiente',finish:'Empezar a usar la plataforma',step:'Paso',example:'Ejemplo visual',steps:[
      ['Bienvenida','fa-compass','Tu dinero, en un solo lugar','Registrá tus gastos, organizá tus compras y entendé cómo evoluciona tu dinero. Este recorrido te muestra dónde encontrar cada herramienta.',['Organizá','Registrá','Analizá'],'Podés omitir el recorrido y volver a abrirlo desde el menú lateral.'],
      ['Dashboard','fa-chart-pie','Entendé cómo va tu mes','Compará ingresos, gastos fijos, variables y ahorro. Usá los filtros de meses, año, categorías y usuarios para explorar tus datos.',['Ingresos','Gastos','Ahorro'],'En los tres puntos podés guardar tus filtros para recuperarlos al volver a ingresar.'],
      ['Control de gastos','fa-wallet','Registrá y revisá tus movimientos','Cargá un ingreso o gasto y consultá el detalle de tus movimientos. Si no identificás una compra, podés usar Desconocido y corregirla después.',['Cargá el gasto','Elegí categoría','Revisá el detalle'],'Podés editar la descripción y categoría de tus movimientos desde la lista.'],
      ['Gastos fijos','fa-calendar-check','Organizá los pagos que se repiten','Seleccioná tus gastos habituales, indicá la fecha y el período a pagar y registralos en Movimientos. La campana te ayuda a revisar vencimientos.',['Elegí el gasto','Indicá el período','Registrá el pago'],'Primero configurá tus gastos fijos en Configuración → Bases → Gastos fijos.'],
      ['Mercado','fa-basket-shopping','Prepará tu compra habitual','Consultá tus productos frecuentes, marcas, presentación y cantidad mensual. El optimizador reúne las opciones disponibles según las fuentes conectadas.',['Tus productos','Opciones disponibles','Tu lista'],'La comparación de precios depende de los supermercados y fuentes habilitados.'],
      ['Nubank','fa-file-csv','Importá tus compras de Nubank','Seleccioná el archivo CSV, revisá los movimientos y completá las categorías pendientes antes de confirmar la importación.',['Archivo CSV','Revisá etiquetas','Confirmá'],'Las coincidencias similares son sugerencias: revisalas antes de guardar.'],
      ['C6','fa-file-import','Importá tus movimientos de C6','Cargá tu archivo y revisá el resumen: movimientos nuevos, posibles duplicados, etiquetas pendientes y registros sin cotización.',['Cargá el archivo','Revisá el resumen','Importá'],'Si no reconocés una compra, elegí Desconocido y completá su categoría después.'],
      ['Inversiones','fa-chart-line','Seguí el dólar y tu patrimonio','Arriba ves la cotización USD/BRL y su fecha de publicación. El gráfico inicia en 6 meses: podés elegir 1 semana, 1 mes, 6 meses o 1 año. Al pasar el cursor muestra fecha y valor; las etiquetas señalan el máximo en verde y el mínimo en morado. En Mi patrimonio registrás reales, dólares, euros y pesos, con sus saldos físicos y digitales. El total equivalente usa la moneda de la barra superior; la cotización del dólar permanece en reales.',['Dólar y evolución','Máximos y mínimos','Mi patrimonio'],'Usá Agregar tenencia o Editar: Nombre y Ubicación sugieren datos ya cargados. Los saldos y el capital aportado se cargan manualmente; el patrimonio suma el valor actual sin duplicar el capital. Si faltan cotizaciones, la conversión se indica como incompleta.'],
      ['Configuración','fa-gear','Dejá la plataforma a tu medida','Administrá tus datos, notificaciones y preferencias. En Bases encontrás las categorías, etiquetas, gastos fijos y productos de Mercado.',['Mis datos','Preferencias','Bases'],'Algunas acciones sobre bases compartidas requieren permisos del administrador.']
    ]},
    pt:{launch:'Tour guiado',brand:'Conheça sua plataforma',skip:'Pular',back:'Anterior',next:'Próximo',finish:'Começar a usar',step:'Etapa',example:'Exemplo visual',steps:[
      ['Boas-vindas','fa-compass','Seu dinheiro em um só lugar','Registre despesas, organize suas compras e acompanhe seu dinheiro. Veja onde encontrar cada ferramenta.',['Organize','Registre','Analise'],'Você pode reabrir este tour pelo menu lateral.'],
      ['Painel','fa-chart-pie','Entenda seu mês','Compare receitas, despesas fixas, variáveis e economia. Explore os filtros de meses, ano, categorias e usuários.',['Receitas','Despesas','Economia'],'Nos três pontos você pode salvar seus filtros na sua conta.'],
      ['Controle de gastos','fa-wallet','Registre seus lançamentos','Adicione receitas e despesas e consulte seus detalhes. Use Desconhecido quando não reconhecer uma compra.',['Registre','Categorize','Confira'],'Você pode editar a descrição e a categoria dos seus lançamentos na lista.'],
      ['Despesas fixas','fa-calendar-check','Organize os pagamentos recorrentes','Selecione suas despesas, informe a data e o período de pagamento e registre os lançamentos. Consulte os vencimentos no sino.',['Selecione','Informe o período','Registre'],'Cadastre suas despesas em Configuração → Bases → Despesas fixas.'],
      ['Mercado','fa-basket-shopping','Prepare suas compras','Consulte produtos frequentes, marcas, apresentação e quantidade mensal. O otimizador reúne as opções das fontes conectadas.',['Produtos','Opções disponíveis','Sua lista'],'Os preços dependem dos supermercados e fontes habilitados.'],
      ['Nubank','fa-file-csv','Importe suas compras do Nubank','Selecione o CSV, revise os lançamentos e complete as categorias antes de confirmar.',['Arquivo CSV','Revise categorias','Confirme'],'As correspondências semelhantes são sugestões; confira antes de salvar.'],
      ['C6','fa-file-import','Importe seus lançamentos do C6','Carregue o arquivo e confira o resumo: novos lançamentos, possíveis duplicatas, categorias pendentes e cotações ausentes.',['Arquivo','Resumo','Importação'],'Use Desconhecido para compras que você ainda não identificou.'],
      ['Investimentos','fa-chart-line','Acompanhe o dólar e seu patrimônio','Veja a cotação USD/BRL e sua data de publicação. O gráfico começa em 6 meses; escolha 1 semana, 1 mês, 6 meses ou 1 ano. Ao passar o cursor, consulte data e valor. As etiquetas mostram a máxima em verde e a mínima em roxo. Em Meu patrimônio, registre reais, dólares, euros e pesos, com saldos físicos e digitais. O total equivalente acompanha a moeda da barra superior; a cotação do dólar continua em reais.',['Dólar e evolução','Máximas e mínimas','Meu patrimônio'],'Use Adicionar saldo ou Editar. Nome e Local sugerem dados já registrados. Saldos e capital aportado são manuais; o patrimônio soma o valor atual sem duplicar o capital. Conversões incompletas são sinalizadas quando faltam cotações.'],
      ['Configuração','fa-gear','Personalize a plataforma','Gerencie seus dados, notificações e preferências. Em Bases estão categorias, etiquetas, despesas fixas e produtos.',['Meus dados','Preferências','Bases'],'Algumas ações em bases compartilhadas exigem permissão do administrador.']
    ]},
    en:{launch:'Guided tour',brand:'Meet your platform',skip:'Skip',back:'Back',next:'Next',finish:'Start using the platform',step:'Step',example:'Visual example',steps:[
      ['Welcome','fa-compass','Your money in one place','Record expenses, plan shopping and understand your money. This tour shows you where to find each tool.',['Organize','Record','Explore'],'You can reopen this tour from the sidebar.'],
      ['Dashboard','fa-chart-pie','Understand your month','Compare income, fixed expenses, variable expenses and savings. Explore months, years, categories and users.',['Income','Expenses','Savings'],'Use the three dots to save your filters to your account.'],
      ['Expense control','fa-wallet','Record and review transactions','Add income and expenses and review the details. Choose Unknown for purchases you do not recognize yet.',['Record','Categorize','Review'],'Edit your transactions’ descriptions and categories from the list.'],
      ['Fixed expenses','fa-calendar-check','Organize recurring payments','Select your expenses, choose a payment date and period, and record the payments. Review due dates using the bell.',['Select','Choose period','Record payment'],'Set up expenses in Settings → Bases → Fixed expenses first.'],
      ['Groceries','fa-basket-shopping','Plan regular shopping','Review your frequent products, brands, package sizes and monthly quantities. The optimizer uses the connected sources.',['Products','Available options','Shopping list'],'Price comparisons depend on enabled supermarkets and sources.'],
      ['Nubank','fa-file-csv','Import Nubank purchases','Choose your CSV, review transactions and complete pending categories before importing.',['CSV file','Review labels','Confirm'],'Similar matches are suggestions. Review them before saving.'],
      ['C6','fa-file-import','Import C6 transactions','Upload your file and review new transactions, possible duplicates, pending categories and missing exchange rates.',['File','Summary','Import'],'Choose Unknown for purchases you want to identify later.'],
      ['Investments','fa-chart-line','Track the dollar and your assets','Check the USD/BRL quote and publication date. The chart starts at 6 months; choose 1 week, 1 month, 6 months or 1 year. Hover to see each quote and date. Labels show the high in green and the low in purple. My assets records BRL, USD, EUR and ARS holdings, separating physical and digital balances. The equivalent total follows the top currency selector; the dollar quote stays in BRL.',['Dollar chart','Highs and lows','My assets'],'Use Add holding or Edit. Name and Location suggest existing entries. Balances and contributed capital are entered manually; the total uses current value without counting capital twice. Missing exchange rates are flagged as incomplete conversions.'],
      ['Settings','fa-gear','Make the platform yours','Manage your profile, notifications and preferences. Bases contains categories, labels, fixed expenses and grocery products.',['Your profile','Preferences','Bases'],'Some changes to shared catalogs require administrator permission.']
    ]}
  };
  const extra={
    es:[
      ['Idioma','fa-language','Usá la plataforma en tu idioma','Desde el selector de la esquina superior podés elegir español, portugués o inglés. Los textos y las categorías reconocidas se muestran en el idioma elegido.',['Español','Português','English'],'Cambiar el idioma no modifica las descripciones que escribiste ni los importes de tus movimientos.'],
      ['Moneda','fa-coins','Mirá tus importes en otra moneda','El selector BRL, USD o ARS cambia la visualización en las secciones compatibles. Los movimientos usan sus equivalentes guardados y los valores actuales dependen de las cotizaciones disponibles.',['BRL','USD','ARS'],'Cambiar la moneda de visualización no cambia la moneda original del gasto. Sin cotización, el sistema indica que falta la conversión.'],
      ['Notificaciones','fa-bell','Tené presentes tus próximos vencimientos','La campana muestra avisos de gastos fijos próximos a vencer. Abrila para revisar los vencimientos y registrar un pago. Al pagarlo, se crea el movimiento y se oculta ese aviso.',['Revisá la campana','Consultá vencimientos','Registrá el pago'],'En Configuración → General → Notificaciones podés activar los avisos y elegir de 0 a 30 días de anticipación. Son avisos dentro de la plataforma.']
    ],
    pt:[
      ['Idioma','fa-language','Use seu idioma','No seletor do canto superior você pode escolher espanhol, português ou inglês. Os textos e as categorias reconhecidas acompanham sua escolha.',['Español','Português','English'],'O idioma não altera as descrições que você escreveu nem os valores dos lançamentos.'],
      ['Moeda','fa-coins','Veja valores em outra moeda','O seletor BRL, USD ou ARS muda a visualização nas seções compatíveis. Lançamentos usam os equivalentes salvos; valores atuais dependem das cotações disponíveis.',['BRL','USD','ARS'],'A moeda de visualização não altera a moeda original. Conversões ausentes são sinalizadas.'],
      ['Notificações','fa-bell','Acompanhe os vencimentos','O sino mostra despesas fixas próximas do vencimento. Abra para consultar e registrar pagamentos. O pagamento cria um lançamento e remove o aviso correspondente.',['Abra o sino','Veja vencimentos','Registre o pagamento'],'Em Configuração → Geral → Notificações, ative os avisos e escolha de 0 a 30 dias de antecedência. São avisos dentro da plataforma.']
    ],
    en:[
      ['Language','fa-language','Choose your language','Use the selector in the top corner to choose Spanish, Portuguese or English. Interface text and recognized categories follow your choice.',['Español','Português','English'],'Changing language does not change your written descriptions or transaction amounts.'],
      ['Currency','fa-coins','View amounts in another currency','The BRL, USD or ARS selector changes display amounts in supported sections. Transactions use stored equivalents; current values depend on available exchange rates.',['BRL','USD','ARS'],'Display currency does not change the original transaction currency. Missing conversions are indicated.'],
      ['Notifications','fa-bell','Keep track of upcoming payments','The bell shows fixed expenses approaching their due date. Open it to review due dates and record a payment. Paying creates a transaction and clears that reminder.',['Check the bell','Review due dates','Record payment'],'In Settings → General → Notifications, enable reminders and choose 0 to 30 days in advance. These are in-app reminders.']
    ]
  };
  const digitizer={
    es:['Digitalizador','fa-receipt','Pasá tus notas fiscales a productos','Adjuntá una o varias fotos de la misma nota fiscal. El lector consolida el texto y extrae comercio, fecha, total y detalle de productos para que los revises.',['Agregá las fotos','Revisá los productos','Guardá el detalle'],'Corregí los datos leídos y comprobá el total antes de guardar. Encontrás los productos en Configuración → Bases → Productos supermercado.'],
    pt:['Digitalizador','fa-receipt','Transforme notas fiscais em produtos','Adicione uma ou várias fotos da mesma nota fiscal. O leitor consolida o texto e extrai loja, data, total e produtos para revisão.',['Adicione fotos','Confira os produtos','Salve os detalhes'],'Corrija os dados e confira o total antes de salvar. Consulte os produtos em Configuração → Bases → Produtos de supermercado.'],
    en:['Digitizer','fa-receipt','Turn receipts into product details','Add one or more photos of the same receipt. The reader consolidates the text and extracts the merchant, date, total and products for review.',['Add photos','Review products','Save details'],'Correct the recognized data and check the total before saving. Find saved products in Settings → Bases → Supermarket products.']
  };
  const modulePages=['dashboard.html','index.html','gastos-fijos.html','mercado.html','nubank.html','c6.html','inversiones.html','configuracion.html','digitalizador.html'];
  const navPages=Array.from(nav.querySelectorAll('a')).map(link=>(link.getAttribute('href')||'').split(/[?#]/)[0].split('/').pop());
  const allModulePages=[...modulePages,'wishlist.html'];
  const orderedPages=allModulePages.slice().sort((a,b)=>{
    const position=page=>{const index=navPages.indexOf(page);return index<0?navPages.length+allModulePages.indexOf(page):index;};
    return position(a)-position(b);
  });
  const bankImport={
    es:['Nubank y C6','fa-file-import','Importá tus movimientos de Nubank o C6','Entrá al importador de tu banco, seleccioná el archivo y revisá los movimientos, posibles duplicados y categorías pendientes antes de confirmar.',['Elegí el banco y archivo','Revisá movimientos y etiquetas','Confirmá la importación'],'Si no identificás una compra, elegí Desconocido y corregila después desde Control de gastos.'],
    pt:['Nubank e C6','fa-file-import','Importe lançamentos do Nubank ou C6','Abra o importador do seu banco, selecione o arquivo e confira os lançamentos, possíveis duplicatas e categorias pendentes antes de confirmar.',['Escolha banco e arquivo','Confira lançamentos e categorias','Confirme a importação'],'Se não reconhecer uma compra, escolha Desconhecido e corrija depois no Controle de gastos.'],
    en:['Nubank and C6','fa-file-import','Import Nubank or C6 transactions','Open your bank’s importer, select the file and review transactions, possible duplicates and pending categories before confirming.',['Choose bank and file','Review transactions and labels','Confirm the import'],'Choose Unknown for purchases you do not recognize and edit them later in Expense control.']
  };
  const tourPages=orderedPages.filter(page=>page!=='c6.html');
  const chat={
    es:['Fino, tu asistente','fa-comments','Consultale a Fino sobre tus gastos','Abrí el chat desde el icono de la esquina inferior derecha. Podés consultar cómo viene tu mes, en qué gastás más, qué pagos faltan y cómo mejorar tu ahorro. Antes de responder, elegí el mes actual o un período.',['Elegí tu consulta','Indicá el período','Revisá la explicación'],'Fino usa tus movimientos propios y explica los resultados con ejemplos simples. Revisá sus respuestas antes de tomar decisiones.'],
    pt:['Fino, seu assistente','fa-comments','Converse com Fino sobre seus gastos','Abra o chat pelo ícone no canto inferior direito. Consulte seu mês, principais despesas, pagamentos pendentes e como economizar. Escolha o mês atual ou um período antes da resposta.',['Escolha a pergunta','Escolha o período','Confira a explicação'],'Fino usa seus próprios lançamentos e explica os resultados com exemplos simples. Confira as respostas antes de tomar decisões.'],
    en:['Fino, your assistant','fa-comments','Ask Fino about your expenses','Open the chat using the icon in the bottom right corner. Ask about your month, biggest expenses, pending payments or ways to save. Choose the current month or a period before receiving an answer.',['Choose a question','Choose a period','Review the explanation'],'Fino uses your own transactions and explains results with simple examples. Review answers before making decisions.']
  };
  const preferences={
    es:{hide:'No mostrar el recorrido en el menú izquierdo',enabled:'Mostrar Recorrido guiado en el menú izquierdo',help:'Se guarda para tu usuario en este navegador. Podés volver a activarlo desde aquí.',error:'No se pudo guardar la preferencia en este navegador.'},
    pt:{hide:'Não mostrar o tour no menu esquerdo',enabled:'Mostrar Tour guiado no menu esquerdo',help:'Salvo para seu usuário neste navegador. Você pode reativar aqui.',error:'Não foi possível salvar a preferência neste navegador.'},
    en:{hide:'Hide the guided tour from the left menu',enabled:'Show Guided tour in the left menu',help:'Saved for your user in this browser. You can enable it again here.',error:'Could not save the preference in this browser.'}
  };
  Object.keys(copy).forEach(lang=>{
    const original=copy[lang].steps,modules=Object.fromEntries(modulePages.slice(0,-1).map((page,index)=>[page,original[index+1]]));
    modules['digitalizador.html']=digitizer[lang];
    modules['wishlist.html']=({
      es:['Wishlist','fa-lightbulb','Compartí tus ideas para mejorar la plataforma','Enviá las mejoras que te gustaría sumar, con un máximo de 250 palabras por propuesta. El contador te ayuda a revisar el límite antes de enviar.',['Escribí tu propuesta','Enviala','Seguí su estado'],'Tus propuestas comienzan como Enviado. El administrador puede pasarlas a En análisis, Rechazado o Aprobado. Cada usuario ve sus propuestas; el administrador puede revisar todas.'],
      pt:['Wishlist','fa-lightbulb','Compartilhe ideias para melhorar a plataforma','Envie as melhorias que gostaria de ver, com até 250 palavras por proposta. Confira o limite no contador antes de enviar.',['Escreva sua proposta','Envie','Acompanhe o status'],'As propostas começam como Enviado. O administrador pode mudar para Em análise, Rejeitado ou Aprovado. Cada usuário vê suas propostas; o administrador pode revisar todas.'],
      en:['Wishlist','fa-lightbulb','Share ideas to improve the platform','Send improvements you would like to see, with up to 250 words per suggestion. Check the word counter before sending.',['Write a suggestion','Send it','Track its status'],'Suggestions start as Sent. An administrator can change the status to Under review, Rejected or Approved. Users see their own suggestions; administrators can review all of them.']
    })[lang];
    modules['nubank.html']=bankImport[lang];
    copy[lang].steps=[original[0],...tourPages.map(page=>modules[page]),...extra[lang],chat[lang]];
  });
  const targets=[null,...tourPages.map(page=>({pages:page==='nubank.html'?['nubank.html','c6.html']:[page]})),...['.language-toggle','#platformCurrency','.notification-bell','.expense-assistant-launch'].map(selector=>({selector}))];
  let step=0,previousFocus,restoreSidebar=false,drawVersion=0;
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const launch=make('button','tour-launch');launch.type='button';nav.insertAdjacentElement('afterend',launch);
  const visibilitySwitch=document.getElementById('guidedTourEnabled');
  function preferenceCopy(){return preferences[(document.documentElement.lang||'es').slice(0,2)]||preferences.es;}
  function applyVisibility(){launch.hidden=!tourVisible;if(visibilitySwitch)visibilitySwitch.checked=tourVisible;}
  function saveVisibility(value){
    try{localStorage.setItem(visibilityKey,String(value));tourVisible=value;applyVisibility();return true;}
    catch(error){const status=document.getElementById('guidedTourStatus');if(status)status.textContent=preferenceCopy().error;applyVisibility();return false;}
  }
  visibilitySwitch?.addEventListener('change',()=>saveVisibility(visibilitySwitch.checked));
  window.addEventListener('storage',event=>{if(event.key===visibilityKey){tourVisible=event.newValue!=='false';applyVisibility();}});
  applyVisibility();
  const dialog=make('dialog','platform-tour');dialog.setAttribute('aria-labelledby','platformTourTitle');document.body.appendChild(dialog);
  function language(){const code=(document.documentElement.lang||'es').slice(0,2);return copy[code]||copy.es;}
  function icon(name){const el=make('i','fa-solid '+name);el.setAttribute('aria-hidden','true');return el;}
  function remember(){try{localStorage.setItem(key,'seen');}catch(error){/* El recorrido también funciona sin almacenamiento. */}}
  let highlightedChat=null,chatVisibility='';
  function restoreChat(){if(highlightedChat){highlightedChat.style.visibility=chatVisibility;highlightedChat=null;}}
  function close(){remember();restoreChat();dialog.close();if(restoreSidebar){document.getElementById('dashboardSidebarToggle')?.click();restoreSidebar=false;}previousFocus?.focus();}
  function stepTargets(){
    const target=targets[step];
    if(!target)return [nav.querySelector('a.active')].filter(Boolean);
    return target.pages?Array.from(nav.querySelectorAll('a')).filter(link=>target.pages.some(page=>(link.getAttribute('href')||'').split(/[?#]/)[0].endsWith(page))):[document.querySelector(target.selector)].filter(Boolean);
  }
  function spotlight(){
    restoreChat();
    dialog.querySelectorAll('.tour-spotlight').forEach(frame=>frame.remove());
    if(!dialog.open)return;
    stepTargets().forEach(target=>{
    const rect=target.getBoundingClientRect();if(!rect.width||!rect.height)return;
    // La copia visual queda en la capa del diálogo para verse nítida sobre el fondo atenuado.
    // El control real no se modifica ni se puede activar durante el recorrido.
    const frame=make('div','tour-spotlight'),clone=target.cloneNode(true),style=window.getComputedStyle(target);
    frame.setAttribute('aria-hidden','true');frame.inert=true;
    Object.assign(frame.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    [clone,...clone.querySelectorAll('[id]')].forEach(node=>node.removeAttribute('id'));
    Object.assign(clone.style,{display:'flex',alignItems:'center',gap:'10px',width:'100%',height:'100%',margin:'0',boxSizing:'border-box',color:style.color,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,padding:style.padding,borderRadius:style.borderRadius,background:style.backgroundColor});
    if(targets[step]?.selector==='.expense-assistant-launch'){
      const source=target.querySelector('img'),canvas=make('canvas');
      canvas.width=canvas.height=76;
      Object.assign(canvas.style,{width:'38px',height:'38px',display:'block'});
      clone.replaceChildren(canvas);
      const freeze=()=>{if(source?.naturalWidth){const context=canvas.getContext('2d');context.clearRect(0,0,76,76);context.drawImage(source,0,0,76,76);}};
      if(source?.complete)freeze();else source?.addEventListener('load',freeze,{once:true});
      Object.assign(clone.style,{position:'static',inset:'auto',transform:'none',animation:'none',visibility:'visible',justifyContent:'center',padding:'0',background:'transparent',boxShadow:'none'});
      Object.assign(frame.style,{background:'transparent',borderRadius:'50%'});
      highlightedChat=target;chatVisibility=target.style.visibility;target.style.visibility='hidden';
    }
    frame.appendChild(clone);dialog.appendChild(frame);
    });
  }
  function draw(){
    const version=++drawVersion,c=language(),s=c.steps[step];dialog.replaceChildren();
    const top=make('div','tour-top'),brand=make('div','tour-brand',c.brand),skip=make('button','tour-skip',c.skip);brand.prepend(icon('fa-compass'));skip.type='button';skip.onclick=close;top.append(brand,skip);
    const layout=make('div','tour-layout'),map=make('nav','tour-map');map.setAttribute('aria-label',c.launch);
    let currentMapButton;
    c.steps.forEach((item,i)=>{const button=make('button');button.type='button';button.append(icon(item[1]),make('span','',item[0]));if(i===step){button.setAttribute('aria-current','step');currentMapButton=button;}button.onclick=()=>{if(version!==drawVersion)return;step=i;draw();};map.appendChild(button);});
    const content=make('div','tour-content'),heading=make('h2','',s[2]);heading.id='platformTourTitle';heading.tabIndex=-1;
    content.append(make('p','tour-eyebrow',c.step+' '+(step+1)+' / '+c.steps.length),heading,make('p','tour-description',s[3]));
    const preview=make('div','tour-preview');preview.setAttribute('aria-label',c.example);
    if(step===0){
      preview.className+=' tour-welcome-art';
      const illustration=make('img');illustration.src='bienvenida-recorrido.svg';illustration.alt='';illustration.width=960;illustration.height=360;
      preview.appendChild(illustration);
    }else s[4].forEach((text,i)=>{const card=make('div','tour-preview-card');card.append(icon([s[1],'fa-list-check','fa-check-circle'][i]),make('span','',text));preview.appendChild(card);});
    content.append(preview,make('p','tour-tip',s[5]));layout.append(map,content);
    const bottom=make('div','tour-bottom'),back=make('button','tour-back',c.back),next=make('button','tour-next',step===c.steps.length-1?c.finish:c.next);
    back.type=next.type='button';back.disabled=step===0;back.onclick=()=>{if(version!==drawVersion||step===0)return;step--;draw();};next.onclick=()=>{if(version!==drawVersion)return;if(step===c.steps.length-1)close();else{step++;draw();}};
    bottom.append(make('span','tour-count',(step+1)+' / '+c.steps.length),back,next);
    if(step===c.steps.length-1){
      const label=make('label','tour-hide-option'),checkbox=make('input');checkbox.type='checkbox';checkbox.checked=!tourVisible;
      checkbox.addEventListener('change',()=>{if(!saveVisibility(!checkbox.checked))checkbox.checked=!tourVisible;});
      label.append(checkbox,make('span','',preferenceCopy().hide));bottom.appendChild(label);
    }
    dialog.append(top,layout,bottom);if(dialog.open){heading.focus();currentMapButton?.scrollIntoView?.({block:'nearest',inline:'nearest'});stepTargets().forEach(target=>target.scrollIntoView?.({block:'nearest',inline:'nearest'}));spotlight();}
  }
  function open(){previousFocus=document.activeElement;step=0;const toggle=document.getElementById('dashboardSidebarToggle');restoreSidebar=!!toggle&&document.body.classList.contains('sidebar-collapsed');if(restoreSidebar)toggle.click();draw();dialog.showModal();dialog.querySelector('h2').focus();spotlight();}
  function translate(){launch.replaceChildren(icon('fa-compass'),make('span','',language().launch));[['guidedTourSettingTitle',language().launch],['guidedTourSettingLabel',preferenceCopy().enabled],['guidedTourSettingHelp',preferenceCopy().help]].forEach(([id,text])=>{const node=document.getElementById(id);if(node)node.textContent=text;});if(dialog.open)draw();}
  launch.onclick=open;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});window.addEventListener('languagechange',translate);translate();
  window.addEventListener('resize',spotlight);window.addEventListener('scroll',spotlight,{capture:true});
  let seen=false;try{seen=localStorage.getItem(key)==='seen';}catch(error){}
  if(!seen&&tourVisible)open();
})();
