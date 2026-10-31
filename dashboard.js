(function () {
  'use strict';
  if (sessionStorage.getItem('controlGastos.loggedIn') !== 'true') {window.location.href = I18n.page('login.html'); return;}
  let user;
  try {user=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');} catch(error) {}
  if(!user || !user.usuario_id) {window.location.href=I18n.page('login.html'); return;}
  const API = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const get = id => document.getElementById(id);
  const sidebar=get('dashboardSidebar'), sidebarToggle=get('dashboardSidebarToggle');
  let sidebarCollapsed=false;
  try {sidebarCollapsed=window.localStorage.getItem('controlGastos.dashboardSidebarCollapsed')==='true';} catch(error) {}
  function updateSidebar() {
    document.body.classList.toggle('sidebar-collapsed',sidebarCollapsed);
    const hidden=window.matchMedia?.('(max-width:850px)').matches?!document.body.classList.contains('mobile-menu-open'):sidebarCollapsed;
    sidebar.inert=hidden;
    sidebar.setAttribute('aria-hidden',String(hidden));
    sidebarToggle.setAttribute('aria-expanded',String(!sidebarCollapsed));
    const text=I18n.t(sidebarCollapsed?'analytics.showSidebar':'analytics.hideSidebar');
    sidebarToggle.setAttribute('aria-label',text); sidebarToggle.title=text;
  }
  sidebarToggle.addEventListener('click',()=>{
    sidebarCollapsed=!sidebarCollapsed;
    try {window.localStorage.setItem('controlGastos.dashboardSidebarCollapsed',String(sidebarCollapsed));} catch(error) {}
    updateSidebar();
  });
  updateSidebar();
  const period = get('dashboardPeriod'), status = get('dashboardStatus');
  const colors = ['#2563eb','#14b8a6','#f59e0b','#8b5cf6','#ec4899','#64748b'];
  let movements = [], busy = false, loaded = false, selectedPeriod = 1;
  const monthFilter=get('dashboardMonth'),yearFilter=get('dashboardYear');
  let selectedMonth=new Date().getMonth(),selectedYear=new Date().getFullYear();
  let selectedMonths=null;
  function renderDates() {
    monthFilter.replaceChildren(); yearFilter.replaceChildren();
    const allLabel=document.createElement('label'),allCheck=document.createElement('input'),allText=document.createElement('span');
    allCheck.type='checkbox';allCheck.name='dashboardMonth';allCheck.value='__all__';allCheck.checked=selectedMonths?.size===12;
    allCheck.indeterminate=!!selectedMonths&&selectedMonths.size>0&&selectedMonths.size<12;
    allText.textContent=I18n.t('analytics.allMonths');allLabel.appendChild(allCheck);allLabel.appendChild(allText);monthFilter.appendChild(allLabel);
    for(let month=0;month<12;month++) {
      const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');
      check.type='checkbox';check.name='dashboardMonth';check.value=String(month);check.checked=selectedMonths?selectedMonths.has(month):month===selectedMonth;
      text.textContent=new Date(2000,month,1).toLocaleDateString(I18n.locale,{month:'long'});label.appendChild(check);label.appendChild(text);monthFilter.appendChild(label);
    }
    const names=Array.from(selectedMonths||[selectedMonth]).sort((a,b)=>a-b).map(month=>new Date(2000,month,1).toLocaleDateString(I18n.locale,{month:'long'}));
    get('dashboardMonthSelection').textContent=selectedMonths?.size===12?I18n.t('analytics.allMonths'):names.length?names[0]+(names.length>1?' +'+(names.length-1):''):I18n.t('analytics.selectMonths');
    get('dashboardMonthToggle').title=names.join(', ');
    const years=new Set([new Date().getFullYear(),selectedYear]);
    movements.forEach(item=>{const match=String(item?.fecha||'').match(/^(\d{4})-/);if(match)years.add(Number(match[1]));});
    Array.from(years).sort((a,b)=>b-a).forEach(year=>{const option=document.createElement('option');option.value=String(year);option.textContent=String(year);option.selected=year===selectedYear;yearFilter.appendChild(option);});
  }
  let selectedCurrency=window.PlatformCurrency?.code || 'BRL';
  const currencyFilter=window.PlatformCurrency?.select || get('dashboardCurrency'), currencyNotice=get('dashboardCurrencyNotice');
  const userFilter=get('dashboardUsers'), selectedUsers=new Set([String(user.usuario_id).trim()]);
  let availableUsers=[String(user.usuario_id).trim()];
  const userDropdown=get('dashboardUserDropdown'), userToggle=get('dashboardUserToggle');
  function updateUserSelection() {
    const names=Array.from(selectedUsers,value=>value || I18n.t('analytics.noUser'));
    const text=get('dashboardUserSelection');
    text.textContent=names.length?names[0]+(names.length>1?' +'+(names.length-1):''):I18n.t('analytics.selectUsers');
    userToggle.title=names.join(', ') || I18n.t('analytics.selectUsers');
    positionUserMenu();
  }
  function positionUserMenu() {
    if(!userDropdown.open) return;
    const rect=userToggle.getBoundingClientRect(), menu=get('dashboardUserOptions');
    menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';
    menu.style.top=(rect.bottom+6)+'px';
  }
  function renderUsers() {
    const host=get('dashboardUserOptions'); host.replaceChildren();
    availableUsers.forEach(value=>{
      const label=document.createElement('label'), checkbox=document.createElement('input'), text=document.createElement('span');
      checkbox.type='checkbox'; checkbox.name='dashboardUsers'; checkbox.value=value; checkbox.checked=selectedUsers.has(value);
      text.textContent=value || I18n.t('analytics.noUser');
      label.appendChild(checkbox); label.appendChild(text); host.appendChild(label);
    });
    updateUserSelection();
  }
  const money = value => new Intl.NumberFormat(I18n.locale,{style:'currency',currency:selectedCurrency,currencyDisplay:'code'}).format(value);
  const number = value => new Intl.NumberFormat(I18n.locale).format(value);
  const categoryName = name => name ? (I18n.category?.(name) ?? name) : I18n.t('analytics.noCategory');
  const categoryFilter=get('dashboardCategories'), categoryDropdown=get('dashboardCategoryDropdown'), categoryToggle=get('dashboardCategoryToggle');
  let availableCategories=[], selectedCategories=null;
  let filtersRestored=false;
  function restoreDashboardFilters(saved) {
    if(saved&&saved.version===1&&[1,3,6,12].includes(saved.period)&&Number.isInteger(saved.month)&&saved.month>=0&&saved.month<12&&Number.isInteger(saved.year)&&saved.year>=1900&&saved.year<=9999&&
      (saved.months===null||Array.isArray(saved.months)&&saved.months.every(month=>Number.isInteger(month)&&month>=0&&month<12))&&
      Array.isArray(saved.users)&&saved.users.every(name=>typeof name==='string')&&(saved.categories===null||Array.isArray(saved.categories)&&saved.categories.every(name=>typeof name==='string'))) {
      selectedPeriod=saved.period;selectedMonth=saved.month;selectedYear=saved.year;
      selectedMonths=saved.months===null?null:new Set(saved.months);
      selectedCategories=saved.categories===null?null:new Set(saved.categories);
      selectedUsers.clear();saved.users.forEach(name=>selectedUsers.add(name));
      period.querySelectorAll('input[name="dashboardPeriod"]').forEach(input=>{input.checked=(selectedMonths===null||selectedMonths.size===1)&&Number(input.value)===selectedPeriod;});
    }
  }
  const moreOptions=get('dashboardMoreOptions'),moreToggle=get('dashboardMoreToggle'),moreMenu=get('dashboardMoreMenu');
  function positionMoreMenu(){if(!moreOptions.open)return;const rect=moreToggle.getBoundingClientRect();moreMenu.style.left=Math.max(8,Math.min(rect.right-220,window.innerWidth-228))+'px';moreMenu.style.top=(rect.bottom+6)+'px';}
  moreOptions.addEventListener('toggle',positionMoreMenu);
  window.addEventListener('resize',positionMoreMenu);
  window.addEventListener('scroll',positionMoreMenu,{capture:true});
  window.addEventListener('click',event=>{if(!moreOptions.contains(event.target))moreOptions.open=false;});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&moreOptions.open){moreOptions.open=false;moreToggle.focus();}});
  let savingFilters=false;
  let confirmationTimer;
  get('dashboardSaveFilters').addEventListener('click',async()=>{
    if(busy||!loaded||savingFilters)return;
    clearTimeout(confirmationTimer);get('dashboardFiltersConfirmation').hidden=true;
    const snapshot={version:1,period:selectedPeriod,month:selectedMonth,year:selectedYear,months:selectedMonths===null?null:Array.from(selectedMonths),users:Array.from(selectedUsers),categories:selectedCategories===null?null:Array.from(selectedCategories)};
    savingFilters=true;get('dashboardFiltersSaving').hidden=false;
    const savingStarted=Date.now();
    moreToggle.setAttribute('aria-busy','true');moreOptions.open=false;moreToggle.focus();
    status.classList.remove('error');I18n.message(status,'');
    try {
      const result=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'save_dashboard_filters',perfil_token:user.perfil_token,filtros:snapshot})});
      if(!result.ok)throw Error('HTTP '+result.status);
      const saved=await result.json();
      if(!saved.ok)throw Error(saved.error||'No se pudieron guardar los filtros.');
      I18n.message(get('dashboardFiltersConfirmation'),I18n.t('analytics.filtersSaved'));
      get('dashboardFiltersConfirmation').hidden=false;
      confirmationTimer=setTimeout(()=>{get('dashboardFiltersConfirmation').hidden=true;},3500);
    } catch(error) {status.classList.add('error');I18n.message(status,I18n.t('analytics.filtersSaveError'));}
    finally {
      // Mantener el indicador perceptible incluso si el servidor responde inmediatamente.
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,650-(Date.now()-savingStarted))));
      savingFilters=false;get('dashboardFiltersSaving').hidden=true;moreToggle.setAttribute('aria-busy','false');
    }
  });
  function positionCategoryMenu() {
    if(!categoryDropdown.open)return;
    const rect=categoryToggle.getBoundingClientRect(), menu=get('dashboardCategoryOptions');
    menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';
    menu.style.top=(rect.bottom+6)+'px';
  }
  function renderCategoryFilter() {
    const host=get('dashboardCategoryOptions');host.replaceChildren();
    const all=selectedCategories===null;
    function option(value,text,checked) {
      const label=document.createElement('label'), check=document.createElement('input'), span=document.createElement('span');
      check.type='checkbox';check.name='dashboardCategories';check.value=value;check.checked=checked;span.textContent=text;
      label.appendChild(check);label.appendChild(span);host.appendChild(label);
    }
    option('__all__',I18n.t('filters.all'),all);
    availableCategories.forEach((name,index)=>option(String(index),categoryName(name),all||selectedCategories.has(name)));
    const names=all?[]:Array.from(selectedCategories,categoryName);
    get('dashboardCategorySelection').textContent=all?I18n.t('filters.all'):names.length?names[0]+(names.length>1?' +'+(names.length-1):''):I18n.t('analytics.selectCategories');
    categoryToggle.title=all?I18n.t('filters.all'):names.join(', ');
    positionCategoryMenu();
  }
  const merchantName = name => name || I18n.t('analytics.noMerchant');
  const monthDropdown=get('dashboardMonthDropdown'),monthToggle=get('dashboardMonthToggle');
  function positionMonthMenu(){if(!monthDropdown.open)return;const rect=monthToggle.getBoundingClientRect();monthFilter.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-228))+'px';monthFilter.style.top=(rect.bottom+6)+'px';}
  monthDropdown.addEventListener('toggle',positionMonthMenu);
  window.addEventListener('resize',positionMonthMenu);
  window.addEventListener('scroll',positionMonthMenu,{capture:true});
  window.addEventListener('click',event=>{if(!monthDropdown.contains(event.target))monthDropdown.open=false;});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&monthDropdown.open){monthDropdown.open=false;monthToggle.focus();}});
  const monthName = month => new Date(Number(month.slice(0,4)),Number(month.slice(5))-1,1).toLocaleDateString(I18n.locale,{month:'short',year:'2-digit'});
  const shortMoney = value => new Intl.NumberFormat(I18n.locale,{notation:'compact',maximumFractionDigits:1}).format(value);
  function fitLeadingText() {
    [['dashboardLeadingLabel',14],['dashboardLeading',24],['dashboardIncome',24],['dashboardTotal',24],['dashboardAssets',24],['dashboardAverage',24],['dashboardLeadingAmount',12]].forEach(([id,size])=>{
      const element=get(id);
      if (!element || !element.clientWidth) return;
      element.style.fontSize=size+'px';
      if(element.scrollWidth>element.clientWidth) {
        element.style.fontSize=Math.max(1,size*element.clientWidth/element.scrollWidth-0.2).toFixed(2)+'px';
      }
    });
  }
  function svgElement(tag,attrs={},text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function svgChart(id,title,height=300) {
    const host = get('chart-'+id); host.replaceChildren();
    const svg = svgElement('svg',{viewBox:'0 0 660 '+height,role:'img','aria-label':title});
    svg.appendChild(svgElement('title',{},title)); host.appendChild(svg); return svg;
  }
  function label(svg,text,x,y,anchor='start',fontSize=12) {
    svg.appendChild(svgElement('text',{x,y,'text-anchor':anchor,fill:'#687385','font-size':fontSize,'font-family':'Arial, sans-serif'},text));
  }
  function tooltip(node,text) {node.setAttribute('tabindex','0'); node.setAttribute('aria-label',text); node.appendChild(svgElement('title',{},text));}
  function empty(id) {
    const host = get('chart-'+id); host.replaceChildren();
    const note = document.createElement('p'); note.className='dashboard-empty'; note.textContent=I18n.t('analytics.empty'); host.appendChild(note);
  }
  function dataTable(id,headers,rows) {
    const host=get('data-'+id); host.replaceChildren();
    const table=document.createElement('table'), head=document.createElement('thead'), tr=document.createElement('tr'), body=document.createElement('tbody');
    headers.forEach(value=>{const cell=document.createElement('th'); cell.scope='col'; cell.textContent=value; tr.appendChild(cell);});
    head.appendChild(tr); table.appendChild(head);
    rows.forEach(values=>{const row=document.createElement('tr'); values.forEach(value=>{const cell=document.createElement('td'); cell.textContent=String(value); row.appendChild(cell);}); body.appendChild(row);});
    table.appendChild(body); host.appendChild(table);
  }
  function domain(values) {
    const min=Math.min(0,...values), max=Math.max(0,...values);
    return {min,max:max===min?min+1:max};
  }
  function axes(svg,values) {
    const range=domain(values), y=value=>245-(value-range.min)/(range.max-range.min)*210;
    for(let i=0;i<=4;i++) {
      const value=range.min+(range.max-range.min)*i/4;
      svg.appendChild(svgElement('line',{x1:58,x2:640,y1:y(value),y2:y(value),stroke:'#e2e8f0'})); label(svg,shortMoney(value),50,y(value)+4,'end');
    }
    return y;
  }
  function monthlyChart(data) {
    const isDaily=selectedPeriod===1, rows=isDaily?data.daily:data.monthly.filter(month=>month.movementCount>0);
    const titleKey=isDaily?'analytics.daily':'analytics.monthly';
    const heading=get('dashboardEvolutionTitle');
    heading.setAttribute('data-i18n',titleKey); heading.textContent=I18n.t(titleKey);
    const dateName=item=>isDaily?new Date(item.date+'T12:00:00').toLocaleDateString(I18n.locale,{day:'2-digit',month:'2-digit'}):monthName(item.month);
    const headers=[I18n.t(isDaily?'field.date':'field.month'),I18n.t('analytics.fixedExpenses'),I18n.t('analytics.variableExpenses'),I18n.t(isDaily?'analytics.accumulatedExpenses':'cards.expenses'),I18n.t(isDaily?'analytics.accumulatedIncome':'cards.income')];
    if(isDaily) headers.push(I18n.t('analytics.difference'));
    dataTable('monthly',headers,!data.pricedMovements && data.missingConversions?[]:rows.map(item=>{
      const values=[dateName(item),money(item.fixed),money(item.variable),money(item.total),money(item.income)];
      if(isDaily) values.push(money(item.balance)); return values;
    }));
    if(!data.pricedMovements) {empty('monthly'); return;}
    // Los reintegros conservan su signo; apilar valores de signos opuestos desde cero.
    const variableBase=item=>item.fixed*item.variable>=0?item.fixed:0;
    const variableTop=item=>variableBase(item)+item.variable;
    const svg=svgChart('monthly',I18n.t(titleKey)), y=axes(svg,rows.flatMap(item=>[item.fixed,variableTop(item),item.income]));
    const x=i=>rows.length===1?349:58+i*582/(rows.length-1);
    const series=[{key:'fixed',label:I18n.t('analytics.fixedExpenses'),color:'#2563eb',top:item=>item.fixed,base:()=>0},
      {key:'variable',label:I18n.t('analytics.variableExpenses'),color:'#8bb1ff',top:variableTop,base:variableBase},
      {key:'income',label:I18n.t('cards.income'),color:'#16a34a',top:item=>item.income}];
    series.filter(item=>item.base).forEach(series=>{
      const upper=rows.map((item,i)=>(i?'L':'M')+x(i)+','+y(series.top(item))).join(' ');
      const lower=rows.map((item,i)=>({item,i})).reverse().map(({item,i})=>'L'+x(i)+','+y(series.base(item))).join(' ');
      svg.appendChild(svgElement('path',{d:upper+' '+lower+' Z',fill:series.color,'fill-opacity':0.8,stroke:'none','data-expense-area':series.key}));
    });
    series.forEach(series=>{
      const line=rows.map((item,i)=>(i?'L':'M')+x(i)+','+y(series.top(item))).join(' ');
      svg.appendChild(svgElement('path',{d:line,fill:'none',stroke:series.color,'stroke-width':3,'stroke-linejoin':'round'}));
      rows.forEach((item,i)=>{
        const dot=svgElement('circle',{cx:x(i),cy:y(series.top(item)),r:4,fill:series.color,stroke:'#fff','stroke-width':1.5});
        const text=dateName(item)+' · '+series.label+': '+money(item[series.key])+' · '+I18n.t('analytics.fixedExpenses')+': '+money(item.fixed)+' · '+I18n.t('analytics.variableExpenses')+': '+money(item.variable)+' · '+I18n.t(isDaily?'analytics.accumulatedExpenses':'cards.expenses')+': '+money(item.total)+' · '+I18n.t(isDaily?'analytics.accumulatedIncome':'cards.income')+': '+money(item.income)+(isDaily?' · '+I18n.t('analytics.difference')+': '+money(item.balance):'');
        tooltip(dot,text); svg.appendChild(dot);
      });
    });
    rows.forEach((item,i)=>{
      if(!isDaily||i%Math.ceil(rows.length/7)===0||i===rows.length-1) label(svg,dateName(item),x(i),275,'middle',!isDaily&&rows.length>6?10:12);
    });
    const legend=document.createElement('div'); legend.className='dashboard-legend';
    series.forEach(item=>{
      const text=document.createElement('span'), swatch=document.createElement('i'); swatch.style.backgroundColor=item.color;
      text.appendChild(swatch); text.appendChild(document.createTextNode(item.label)); legend.appendChild(text);
    });
    get('chart-monthly').appendChild(legend);
  }
  function horizontalChart(id,items,name,format,title) {
    const isCategory = id === 'categories', total = items.reduce((sum,item)=>sum+item.value,0);
    const share = value => total > 0 ? new Intl.NumberFormat(I18n.locale,{style:'percent',maximumFractionDigits:1}).format(value/total) : '—';
    const headers=[I18n.t(isCategory?'field.category':'analytics.merchant'),I18n.t('field.amount')];
    if(isCategory) headers.push(I18n.t('analytics.share'));
    dataTable(id,headers,items.map(item=>isCategory?[name(item.name),format(item.value),share(item.value)]:[name(item.name),format(item.value)]));
    if(!items.length) {empty(id); return;}
    const visible=items.slice(0,8), height=Math.max(300,visible.length*34+50), svg=svgChart(id,title,height);
    const range=domain(visible.map(item=>item.value)), scale=value=>205+(value-range.min)/(range.max-range.min)*300;
    svg.appendChild(svgElement('line',{x1:scale(0),x2:scale(0),y1:15,y2:height-25,stroke:'#cbd5e1'}));
    visible.forEach((item,i)=>{
      const y=28+i*34, full=name(item.name), text=full.length>25?full.slice(0,24)+'…':full;
      label(svg,text,0,y+15);
      const insideText=isCategory?share(item.value):format(item.value), textWidth=insideText.length*6+12;
      const barWidth=Math.max(textWidth,Math.abs(scale(item.value)-scale(0)));
      const barStart=item.value<0?scale(0)-barWidth:scale(0);
      const bar=svgElement('rect',{x:barStart,y,width:barWidth,height:22,rx:4,fill:colors[i%colors.length]});
      tooltip(bar,full+': '+format(item.value)+(isCategory?' · '+share(item.value):'')); svg.appendChild(bar);
      if(isCategory) label(svg,format(item.value),515,y+15);
      const center=barStart+barWidth/2;
      svg.appendChild(svgElement('text',{x:center,y:y+15,'text-anchor':'middle',fill:'#fff','font-size':11,'font-weight':700,'font-family':'Arial, sans-serif',[isCategory?'data-category-share':'data-merchant-amount']:item.name},insideText));
    });
  }
  function savingsChart(data) {
    let accumulated=0,complete=true;
    const rows=data.monthly.filter(month=>month.movementCount>0).map(month=>{
      const missing=!!month.missingConversions;
      const savings=month.income-month.total;
      if(missing)complete=false;else accumulated+=savings;
      return {...month,savings,missing,accumulated:complete?accumulated:null};
    });
    const percentage=(value,income)=>income>0?new Intl.NumberFormat(I18n.locale,{style:'percent',maximumFractionDigits:1}).format(value/income):'—';
    dataTable('savings',[I18n.t('field.month'),I18n.t('cards.income'),I18n.t('analytics.fixedExpenses'),I18n.t('analytics.variableExpenses'),I18n.t('cards.expenses'),I18n.t('analytics.expensePercent'),I18n.t('analytics.savings'),I18n.t('analytics.savingsPercent'),I18n.t('analytics.accumulatedSavings')],rows.map(row=>[
      monthName(row.month),row.missing?'—':money(row.income),row.missing?'—':money(row.fixed),row.missing?'—':money(row.variable),row.missing?'—':money(row.total),row.missing?'—':percentage(row.total,row.income),row.missing?'—':money(row.savings),row.missing?'—':percentage(row.savings,row.income),row.accumulated===null?'—':money(row.accumulated)
    ]));
    if(!data.pricedMovements){empty('savings');return;}
    const series=[{key:'fixed',label:I18n.t('analytics.fixedExpenses'),color:'#2563eb'}, {key:'variable',label:I18n.t('analytics.variableExpenses'),color:'#8bb1ff'}, {key:'savings',label:I18n.t('analytics.savings'),color:'#16a34a'}];
    const svg=svgChart('savings',I18n.t('analytics.savings')),y=axes(svg,rows.filter(row=>!row.missing).flatMap(row=>[row.fixed,row.total,row.income,Math.min(0,row.savings)]));
    const group=582/rows.length,width=Math.min(70,group*.65);
    const language=String(I18n.locale||'es').slice(0,2);
    const tip=document.createElement('div');tip.className='savings-hover-tooltip';tip.hidden=true;
    get('chart-savings').appendChild(tip);
    const hoverTargets=[];
    function interactiveSegment(node,item,row,value){
      const segmentLabel=item.key==='savings'?(value<0?I18n.t('analytics.negativeSavings'):({es:'Ahorro',pt:'Poupança',en:'Savings'})[language]||'Ahorro'):item.label;
      const text=monthName(row.month)+'\n'+segmentLabel+': '+money(value);
      node.setAttribute('aria-label',text);
      const nativeTitle=node.querySelector('title');if(nativeTitle)nativeTitle.remove();
      hoverTargets.push({node,key:item.key,month:row.month});
      function position(event){
        const bounds=node.getBoundingClientRect(),x=event&&Number.isFinite(event.clientX)?event.clientX:bounds.left+bounds.width/2,y=event&&Number.isFinite(event.clientY)?event.clientY:bounds.top;
        tip.style.left=Math.max(8,Math.min(x+14,window.innerWidth-tip.offsetWidth-8))+'px';
        tip.style.top=Math.max(8,Math.min(y+14,window.innerHeight-tip.offsetHeight-8))+'px';
      }
      function show(event){
        hoverTargets.forEach(target=>{target.node.style.opacity=target.key===item.key?'1':'.3';target.node.classList.toggle('savings-segment-active',target.key===item.key&&target.month===row.month);});
        tip.textContent=text;tip.hidden=false;position(event);
      }
      function hide(){tip.hidden=true;hoverTargets.forEach(target=>{target.node.style.opacity='';target.node.classList.remove('savings-segment-active');});}
      node.addEventListener('pointerenter',show);node.addEventListener('pointermove',position);node.addEventListener('pointerleave',hide);
      node.addEventListener('focus',()=>show());node.addEventListener('blur',hide);
      node.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
    }
    svg.appendChild(svgElement('line',{x1:58,x2:640,y1:y(0),y2:y(0),stroke:'#94a3b8'}));
    rows.forEach((row,i)=>{
      const center=58+group*(i+.5);
      if(row.missing)label(svg,'—',center,y(0)-8,'middle');
      else {
        const percentages=[];
        series.forEach(item=>{
          const value=row[item.key];
          const bottom=item.key==='fixed'?0:item.key==='variable'?row.fixed:value>=0?row.total:value;
          const top=item.key==='fixed'?row.fixed:item.key==='variable'?row.total:value>=0?row.income:0;
          const bar=svgElement('rect',{x:center-width/2,y:Math.min(y(bottom),y(top)),width,height:Math.abs(y(top)-y(bottom)),fill:item.key==='savings'&&value<0?'#dc2626':item.color,'data-savings-series':item.key,'data-savings-month':row.month});
          tooltip(bar,monthName(row.month)+' · '+item.label+': '+money(value)+' · '+I18n.t('cards.income')+': '+money(row.income));svg.appendChild(bar);
          interactiveSegment(bar,item,row,value);
          if(value!==0)percentages.push({item,value,position:(y(bottom)+y(top))/2});
        });
        const fitPercent=node=>{if(node.textContent.length*6.5>width-4){node.setAttribute('textLength',Math.max(12,width-4));node.setAttribute('lengthAdjust','spacingAndGlyphs');}};
        // Mantener visibles incluso los porcentajes de segmentos demasiado pequeños para alojar texto.
        percentages.sort((a,b)=>a.position-b.position);
        percentages.forEach((entry,index)=>{entry.labelY=Math.max(41,entry.position,index?percentages[index-1].labelY+14:41);});
        if(percentages.length&&percentages.at(-1).labelY>239){
          percentages.at(-1).labelY=239;
          for(let index=percentages.length-2;index>=0;index--)percentages[index].labelY=Math.min(percentages[index].labelY,percentages[index+1].labelY-14);
        }
        percentages.forEach(({item,value,position,labelY})=>{
          if(Math.abs(labelY-position)>3)svg.appendChild(svgElement('line',{x1:center+width/2-2,x2:center+width/2-2,y1:position,y2:labelY,stroke:'#475569','stroke-width':1}));
          const pale=item.key==='variable'||Math.abs(labelY-position)>3;
          const attrs={x:center,y:labelY,'dominant-baseline':'middle','text-anchor':'middle',fill:pale?'#17376b':'#fff','paint-order':'stroke',stroke:pale?'#fff':item.key==='fixed'?'#1e40af':value<0?'#b91c1c':'#15803d','stroke-width':2,'font-size':10,'font-weight':700,'data-segment-percent':item.key,'data-percent-month':row.month};
          if(item.key==='savings')attrs['data-savings-percent']=row.month;
          const node=svgElement('text',attrs,percentage(value,row.income));fitPercent(node);
          tooltip(node,monthName(row.month)+' · '+item.label+': '+money(value)+' · '+percentage(value,row.income)+' '+I18n.t('cards.income'));svg.appendChild(node);
          interactiveSegment(node,item,row,value);
        });
        const incomeLabel=svgElement('text',{x:center,y:y(Math.max(0,row.income,row.total))-23,'text-anchor':'middle',fill:'#334155','font-size':10,'font-weight':700,'data-savings-income':row.month});
        const fullAmount=new Intl.NumberFormat(I18n.locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(row.income);
        const incomeAmount=fullAmount.length*6>group-8?shortMoney(row.income):fullAmount;
        incomeLabel.appendChild(svgElement('tspan',{x:center,dy:0,'font-size':8},selectedCurrency));
        const amountLabel=svgElement('tspan',{x:center,dy:12},incomeAmount);
        if(incomeAmount.length*6>group-8){amountLabel.setAttribute('textLength',group-8);amountLabel.setAttribute('lengthAdjust','spacingAndGlyphs');}
        incomeLabel.appendChild(amountLabel);
        tooltip(incomeLabel,I18n.t('cards.income')+': '+money(row.income));svg.appendChild(incomeLabel);
        if(row.savings<0){const marker=svgElement('line',{x1:center-width/2-4,x2:center+width/2+4,y1:y(row.income),y2:y(row.income),stroke:'#15803d','stroke-width':2,'stroke-dasharray':'3 2'});tooltip(marker,I18n.t('cards.income')+': '+money(row.income));svg.appendChild(marker);}
      }
      label(svg,monthName(row.month),center,275,'middle',rows.length>6?10:12);
    });
    const legend=document.createElement('div');legend.className='dashboard-legend';
    [...series,{label:I18n.t('analytics.negativeSavings'),color:'#dc2626'}].forEach(item=>{const text=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=item.color;text.appendChild(swatch);text.appendChild(document.createTextNode(item.label));legend.appendChild(text);});
    get('chart-savings').appendChild(legend);
  }
  function render() {
    if(!loaded) return;
    const filtered=movements.filter(item=>item && selectedUsers.has(String(item.usuario_id || '').trim()) && (selectedCategories===null || selectedCategories.has(String(item.categoria || '').trim())));
    const today=new Date(),lastDay=new Date(selectedYear,selectedMonth+1,0);
    const end=selectedYear===today.getFullYear()&&selectedMonth===today.getMonth()?today:lastDay;
    const data=DashboardData.aggregate(filtered,selectedPeriod,'',end,selectedCurrency,selectedMonths);
    currencyNotice.hidden=!data.missingConversions;
    currencyNotice.textContent=data.missingConversions?I18n.t('analytics.missingCurrency',{count:data.missingConversions,currency:selectedCurrency}):'';
    const unavailable=!data.pricedMovements && data.missingConversions;
    get('dashboardIncome').textContent=unavailable?'—':money(data.monthly.reduce((total,month)=>total+month.income,0));
    get('dashboardTotal').textContent=unavailable?'—':money(data.total);
    get('dashboardTotalLabel').textContent=I18n.t(selectedPeriod===1?'analytics.monthSpend':'analytics.periodSpend');
    get('dashboardAverage').textContent=unavailable?'—':money(data.average);
    get('dashboardLeading').textContent=data.leading?categoryName(data.leading.name):'—';
    get('dashboardLeadingAmount').textContent=data.leading?money(data.leading.value):'';
    fitLeadingText();
    monthlyChart(data); horizontalChart('categories',data.categories,categoryName,money,I18n.t('analytics.categories'));
    horizontalChart('merchants',data.merchants,merchantName,money,I18n.t('analytics.merchants'));
    savingsChart(data);
  }
  async function load() {
    if(busy) return;
    busy=true; period.disabled=userFilter.disabled=yearFilter.disabled=true;
    const loading=get('dashboardLoading');loading.hidden=false;
    function progress(value){loading.setAttribute('aria-valuenow',String(value));get('dashboardLoadingPercent').textContent=value+'%';}
    progress(5);
    userDropdown.open=false;
    categoryDropdown.open=false;categoryFilter.disabled=true;
    status.setAttribute('aria-busy','true');
    I18n.message(status,''); status.className='configuration-status';
    try {
      if(!user.perfil_token) throw Error(I18n.t('movement.session'));
      // Porcentaje por etapas terminadas, no una estimación del tiempo de descarga.
      let completed=0;const requestsCount=filtersRestored?2:3;
      async function read(action){
        const result=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token})});
        if(!result.ok)throw Error('HTTP '+result.status);
        const value=await result.json();progress(5+Math.round(++completed/requestsCount*75));return value;
      }
      const [data, usersData, preferences]=await Promise.all([
        read('movements'),read('dashboard_users'),filtersRestored?Promise.resolve(null):read('dashboard_filters')
      ]);
      if(!usersData.ok || !Array.isArray(usersData.usuarios) || usersData.usuarios.some(value=>typeof value!=='string')) throw Error(I18n.translate(usersData.error || 'No se pudieron cargar los usuarios.'));
      if(!Array.isArray(data)) throw Error(I18n.translate(data.error || 'No se pudieron cargar los movimientos desde Google Sheets.'));
      if(preferences){
        if(!preferences.ok)throw Error(I18n.translate(preferences.error||'No se pudieron cargar los filtros.'));
        restoreDashboardFilters(preferences.filtros);filtersRestored=true;
      }
      movements=data; loaded=true;renderDates();
      progress(90);
      availableCategories=Array.from(new Set(data.filter(Boolean).map(item=>String(item.categoria || '').trim()))).sort((a,b)=>categoryName(a).localeCompare(categoryName(b)));
      if(selectedCategories)selectedCategories.forEach(name=>{if(!availableCategories.includes(name))selectedCategories.delete(name);});
      renderCategoryFilter();
      availableUsers=Array.from(new Set([String(user.usuario_id).trim(),...usersData.usuarios.map(value=>value.trim()),...data.filter(Boolean).map(item=>String(item.usuario_id||'').trim())])).sort();
      // Los registros históricos sin autor se muestran sólo al elegir Sin usuario.
      selectedUsers.forEach(value=>{if(!availableUsers.includes(value)) selectedUsers.delete(value);});
      renderUsers();
      I18n.message(status,''); render();progress(100);
    } catch(error) {I18n.message(status,I18n.t('analytics.error',{error:error.message})); status.classList.add('error');}
    finally {loading.hidden=true;busy=false; status.setAttribute('aria-busy','false'); period.disabled=userFilter.disabled=categoryFilter.disabled=yearFilter.disabled=false;}
  }
  period.addEventListener('change',event=>{
    if(event.target.name==='dashboardMonth')return;
    const value=Number(event.target.value);
    if(busy || ![1,3,6,12].includes(value)) return;
    selectedMonths=null;selectedPeriod=value;
    if(value===1){const today=new Date();selectedMonth=today.getMonth();selectedYear=today.getFullYear();}
    renderDates();render();
  });
  monthFilter.addEventListener('change',event=>{
    if(busy)return;
    const all=event.target.value==='__all__',value=Number(event.target.value);
    if(!all&&(!Number.isInteger(value)||value<0||value>11))return;
    if(all){selectedMonths=event.target.checked?new Set(Array.from({length:12},(_,i)=>i)):new Set();selectedPeriod=12;}
    else {
    if(!selectedMonths)selectedMonths=new Set([selectedMonth]);
    if(event.target.checked)selectedMonths.add(value);else selectedMonths.delete(value);
    selectedPeriod=selectedMonths.size===1?1:12;
    }
    if(selectedMonths.size)selectedMonth=Math.max(...selectedMonths);
    period.querySelectorAll('input[name="dashboardPeriod"]').forEach(input=>{input.checked=selectedMonths.size===1&&input.value==='1';});
    renderDates();render();
  });
  yearFilter.addEventListener('change',event=>{const value=Number(event.target.value);if(busy||!Number.isInteger(value)||value<1900||value>9999)return;selectedYear=value;render();});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  window.addEventListener('movementspaid', load);
  currencyFilter.addEventListener('change',event=>{
    if(busy || !['BRL','ARS','USD'].includes(event.target.value)) return;
    selectedCurrency=event.target.value;
    render();
  });
  window.addEventListener('currencychange',()=>{selectedCurrency=window.PlatformCurrency.code;render();});
  userFilter.addEventListener('change',event=>{
    const value=event.target.value;
    if(busy || !availableUsers.includes(value)) return;
    if(event.target.checked) selectedUsers.add(value); else selectedUsers.delete(value);
    updateUserSelection();
    render();
  });
  userDropdown.addEventListener('toggle',positionUserMenu);
  categoryFilter.addEventListener('change',event=>{
    if(busy || event.target.name!=='dashboardCategories')return;
    if(event.target.value==='__all__')selectedCategories=event.target.checked?null:new Set();
    else {
      const index=Number(event.target.value);if(!Number.isInteger(index)||index<0||index>=availableCategories.length)return;
      if(selectedCategories===null)selectedCategories=new Set(availableCategories);
      if(event.target.checked)selectedCategories.add(availableCategories[index]);else selectedCategories.delete(availableCategories[index]);
      if(selectedCategories.size===availableCategories.length)selectedCategories=null;
    }
    renderCategoryFilter();render();
  });
  categoryDropdown.addEventListener('toggle',()=>{if(categoryDropdown.open)userDropdown.open=false;positionCategoryMenu();});
  categoryToggle.addEventListener('click',event=>{if(busy)event.preventDefault();});
  window.addEventListener('click',event=>{if(!categoryDropdown.contains(event.target))categoryDropdown.open=false;});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&categoryDropdown.open){categoryDropdown.open=false;categoryToggle.focus();}});
  window.addEventListener('resize',positionCategoryMenu);
  window.addEventListener('scroll',positionCategoryMenu,{capture:true});
  userToggle.addEventListener('click',event=>{if(busy) event.preventDefault();});
  window.addEventListener('click',event=>{if(!userDropdown.contains(event.target)) userDropdown.open=false;});
  window.addEventListener('keydown',event=>{if(event.key==='Escape' && userDropdown.open) {userDropdown.open=false; userToggle.focus();}});
  window.addEventListener('resize',positionUserMenu);
  window.addEventListener('scroll',positionUserMenu,{capture:true});
  window.addEventListener('languagechange',()=>{
    updateSidebar();
    renderDates();renderUsers(); renderCategoryFilter(); render();
  });
  get('logoutBtn').addEventListener('click',async()=>{await Auth.logout(); window.location.href=I18n.page('login.html');});
  window.addEventListener('resize',fitLeadingText);
  if(window.ResizeObserver) {
    let previousWidth = -1;
    new window.ResizeObserver(entries=>{
      const width=entries[0].contentRect.width;
      if(width===previousWidth) return;
      previousWidth=width;
      window.requestAnimationFrame(fitLeadingText);
    }).observe(get('dashboardLeading').parentElement);
  }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitLeadingText);
  renderDates();renderUsers(); renderCategoryFilter(); load();
})();
