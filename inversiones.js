(function () {
  'use strict';
  let user;
  try {user=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');} catch(error) {}
  if(!user || sessionStorage.getItem('controlGastos.loggedIn')!=='true') {window.location.href=I18n.page('login.html');return;}
  const API='https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const get=id=>document.getElementById(id), filter=get('investmentPeriod'), status=get('investmentStatus');
  let period='6m', busy=false, result=null;
  const money=value=>new Intl.NumberFormat(I18n.locale,{style:'currency',currency:'BRL',minimumFractionDigits:4,maximumFractionDigits:4}).format(value);
  const dateLabel=(value,options)=>new Intl.DateTimeFormat(I18n.locale,{timeZone:'America/Sao_Paulo',...options}).format(new Date(value));
  function svgNode(tag,attrs={},text) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    if(text!==undefined) node.textContent=String(text); return node;
  }
  function render() {
    if(!result) return;
    get('investmentPrice').textContent=money(result.ultimo.precio);
    get('investmentUpdated').textContent=I18n.t('invest.updated',{date:dateLabel(result.ultimo.fecha,{dateStyle:'short',timeStyle:'short'})});
    const points=result.puntos, change=get('investmentChange');
    change.className='';
    if(points.length>1) {
      const value=(points.at(-1).precio/points[0].precio-1);
      change.textContent=new Intl.NumberFormat(I18n.locale,{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'}).format(value);
      change.className=value>0?'positive':value<0?'negative':'';
    } else change.textContent='—';
    const host=get('investmentPlot'); host.replaceChildren();
    if(!points.length) {const note=document.createElement('p');note.textContent=I18n.t('invest.empty');host.appendChild(note);return;}
    const width=host.clientWidth||480;
    const svg=svgNode('svg',{viewBox:'0 0 '+width+' 130',role:'img','aria-label':I18n.t('invest.evolution')});host.appendChild(svg);
    const values=points.map(point=>point.precio), low=Math.min(...values), high=Math.max(...values);
    const padding=Math.max((high-low)*0.1,0.001), min=low-padding, max=high+padding;
    const first=new Date(points[0].fecha).getTime(), last=new Date(points.at(-1).fecha).getTime();
    const xTime=time=>first===last?width/2:12+(time-first)/(last-first)*(width-24);
    const x=point=>xTime(new Date(point.fecha).getTime());
    const y=value=>55-(value-min)/(max-min)*30;
    for(let i=0;i<=2;i++) {
      const value=min+(max-min)*i/2;
      svg.appendChild(svgNode('line',{x1:12,x2:width-12,y1:y(value),y2:y(value),stroke:'#e2e8f0'}));
    }
    svg.appendChild(svgNode('path',{d:points.map((point,i)=>(i?'L':'M')+x(point)+','+y(point.precio)).join(' '),fill:'none',stroke:'#2563eb','stroke-width':2.5}));
    const marker=svgNode('g',{visibility:'hidden','pointer-events':'none'});
    const guide=svgNode('line',{y1:4,y2:65,stroke:'#94a3b8','stroke-dasharray':'3 3'});
    const active=svgNode('circle',{r:4,fill:'#2563eb',stroke:'#fff','stroke-width':2});
    const tip=svgNode('g'),tipWidth=Math.min(190,width-24);
    tip.appendChild(svgNode('rect',{width:tipWidth,height:43,rx:7,fill:'#18202f'}));
    const tipDate=svgNode('text',{x:9,y:16,fill:'#cbd5e1','font-size':11});
    const tipValue=svgNode('text',{x:9,y:33,fill:'#fff','font-size':13,'font-weight':600});
    tip.appendChild(tipDate);tip.appendChild(tipValue);
    marker.appendChild(guide);marker.appendChild(active);marker.appendChild(tip);
    function showQuote(point) {
      const px=x(point);
      guide.setAttribute('x1',px);guide.setAttribute('x2',px);
      active.setAttribute('cx',px);active.setAttribute('cy',y(point.precio));
      tipDate.textContent=dateLabel(point.fecha,{dateStyle:'short'});
      tipValue.textContent=money(point.precio);
      const left=px+14+tipWidth<=width?px+14:Math.max(0,px-tipWidth-14);
      tip.setAttribute('transform','translate('+left+',2)');
      marker.setAttribute('visibility','visible');
    }
    const hideQuote=()=>marker.setAttribute('visibility','hidden');
    points.forEach(point=>{
      const dot=svgNode('circle',{cx:x(point),cy:y(point.precio),r:points.length>100?1.5:2.5,fill:'#2563eb',tabindex:0});
      const text=dateLabel(point.fecha,{dateStyle:'short',timeStyle:'short'})+' · '+money(point.precio);
      dot.setAttribute('aria-label',text);svg.appendChild(dot);
      dot.addEventListener('focus',()=>showQuote(point));dot.addEventListener('blur',hideQuote);
    });
    const peak=points.find(point=>point.precio===high),bottom=points.find(point=>point.precio===low);
    function extremeLabel(point,kind,top) {
      const value=new Intl.NumberFormat(I18n.locale,{minimumFractionDigits:4,maximumFractionDigits:4}).format(point.precio);
      const text=value+' · '+dateLabel(point.fecha,{dateStyle:'short'});
      const boxWidth=Math.min(width-8,Math.max(70,Array.from(text).length*5.2+12));
      const left=Math.max(4,Math.min(width-boxWidth-4,x(point)-boxWidth/2));
      const color=top?'#4ade80':'#a855f7',fill=top?'#f0fdf4':'#faf5ff',textColor=top?'#15803d':'#7e22ce';
      const group=svgNode('g',{'data-extreme':top?'max':'min','pointer-events':'none','aria-label':text});
      group.appendChild(svgNode('circle',{cx:x(point),cy:y(point.precio),r:3.5,fill:color,stroke:'#fff','stroke-width':1.5}));
      const boxY=top?0:59;
      group.appendChild(svgNode('line',{x1:x(point),x2:x(point),y1:y(point.precio),y2:top?boxY+18:boxY,stroke:color,'stroke-width':1,'stroke-dasharray':'2 2'}));
      group.appendChild(svgNode('rect',{x:left,y:boxY,width:boxWidth,height:18,rx:5,fill,stroke:color,'stroke-opacity':.2}));
      group.appendChild(svgNode('text',{x:left+boxWidth/2,y:boxY+12,'text-anchor':'middle',fill:textColor,'font-size':10,'font-weight':600},text));
      svg.appendChild(group);
    }
    extremeLabel(peak,high===low?'invest.extremeEqual':'invest.extremeMax',true);
    if(high!==low)extremeLabel(bottom,'invest.extremeMin',false);
    const ticks=[];
    if(period==='1d') {
      points.forEach(point=>ticks.push({time:new Date(point.fecha).getTime(),label:dateLabel(point.fecha,{hour:'2-digit',minute:'2-digit'})}));
    } else if(period==='1w') {
      for(let time=first;time<=last;time+=86400000)ticks.push({time,label:dateLabel(time,{day:'2-digit',month:'short'})});
    } else if(period==='1m') {
      for(let time=first;time<=last;time+=7*86400000)ticks.push({time,label:dateLabel(time,{day:'2-digit',month:'short'})});
    } else {
      ticks.push({time:first,label:dateLabel(first,{month:'short'})});
      const date=new Date(first);
      let time=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1,15);
      while(time<=last){
        ticks.push({time,label:dateLabel(time,{month:'short'})});
        const next=new Date(time);time=Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,1,15);
      }
    }
    const labelGap=6,edge=8;
    const characterUnits=ticks.reduce((sum,tick)=>sum+Array.from(tick.label).length*.65,0);
    const labelFont=Math.min(11,(width-edge*2-labelGap*Math.max(0,ticks.length-1))/Math.max(1,characterUnits));
    const labelWidths=ticks.map(tick=>Array.from(tick.label).length*labelFont*.65);
    let previousEnd=edge-labelGap;
    ticks.forEach((tick,index)=>{
      const labelWidth=labelWidths[index];
      const remaining=labelWidths.slice(index+1).reduce((sum,value)=>sum+value+labelGap,0);
      // Reservar lugar para todas las fechas en una sola línea, incluso el primer mes parcial.
      const rightLimit=width-edge-remaining-labelWidth;
      const left=Math.max(previousEnd+labelGap,Math.min(rightLimit,xTime(tick.time)-labelWidth/2));
      previousEnd=left+labelWidth;
      svg.appendChild(svgNode('text',{x:left+labelWidth/2,y:100,'text-anchor':'middle',fill:'#687385','font-size':labelFont},tick.label));
    });
    svg.appendChild(marker);
    svg.addEventListener('pointermove',event=>{
      const rect=svg.getBoundingClientRect();
      if(!rect.width)return;
      const px=(event.clientX-rect.left)*width/rect.width;
      const nearest=points.reduce((best,point)=>Math.abs(x(point)-px)<Math.abs(x(best)-px)?point:best,points[0]);
      showQuote(nearest);
    });
    svg.addEventListener('pointerleave',hideQuote);
    svg.addEventListener('pointercancel',hideQuote);
  }
  async function load(force=false) {
    if(busy) return; busy=true;filter.disabled=true;
    I18n.message(status,I18n.t('invest.loading'));status.className='configuration-status';
    try {
      if(!user.perfil_token) throw Error(I18n.t('movement.session'));
      const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'investment_quotes',perfil_token:user.perfil_token,periodo:period,version:3,...(force===true?{actualizar:true}:{})})});
      if(!response.ok) throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!data.ok) throw Error(I18n.translate(data.error || 'No se pudo consultar la cotización del dólar.'));
      const valid=point=>point && typeof point.precio==='number' && Number.isFinite(point.precio) && point.precio>0 && Number.isFinite(new Date(point.fecha).getTime());
      if(data.par!=='USD/BRL' || data.periodo!==period || !valid(data.ultimo) || !Array.isArray(data.puntos) || !data.puntos.every(valid)) throw Error(I18n.t('invest.invalid'));
      result=data;render();I18n.message(status,'');
    } catch(error) {
      result=null;get('investmentPrice').textContent=get('investmentChange').textContent='—'; get('investmentUpdated').textContent='';
      get('investmentPlot').replaceChildren();
      I18n.message(status,I18n.t('invest.error',{error:error.message}));status.classList.add('error');
    } finally {busy=false;filter.disabled=false;}
  }
  filter.addEventListener('change',event=>{if(busy || !['1d','1w','1m','6m','1y'].includes(event.target.value))return;period=event.target.value;load();});
  get('logoutBtn').addEventListener('click',async()=>{await Auth.logout();window.location.href=I18n.page('login.html');});
  window.addEventListener('currencychange',render);
  window.addEventListener('languagechange',render);
  window.addEventListener('resize',render);
  load();
})();
