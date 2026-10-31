(function(){
  'use strict';
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar)return;
  const media=window.matchMedia('(max-width:850px)'),main=document.querySelector('.main-content,.app-content');
  const allowedPages=['dashboard.html','digitalizador.html'];
  sidebar.querySelectorAll('nav a').forEach(link=>{
    const page=new URL(link.href,window.location.href).pathname.split('/').pop();
    link.classList.toggle('mobile-page-available',allowedPages.includes(page));
  });
  function limitMobilePages(){
    if(!media.matches)return false;
    const current=window.location.pathname.split('/').pop();
    if(allowedPages.includes(current))return false;
    const target=new URL('dashboard.html',window.location.href);target.search=window.location.search;
    window.location.replace(target.href);return true;
  }
  if(limitMobilePages())return;
  const bottomNav=document.createElement('nav');bottomNav.className='mobile-bottom-nav';
  allowedPages.forEach(page=>{
    const original=Array.from(sidebar.querySelectorAll('nav a')).find(link=>new URL(link.href,window.location.href).pathname.endsWith('/'+page));
    if(!original)return;
    const link=original.cloneNode(true);link.classList.toggle('active',window.location.pathname.endsWith('/'+page));
    if(link.classList.contains('active'))link.setAttribute('aria-current','page');
    bottomNav.appendChild(link);
  });
  document.body.appendChild(bottomNav);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-menu-toggle';
  toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  if(!sidebar.id)sidebar.id='mobileSidebar';
  toggle.setAttribute('aria-controls',sidebar.id);toggle.setAttribute('aria-expanded','false');
  const backdrop=document.createElement('div');backdrop.className='mobile-menu-backdrop';backdrop.hidden=true;
  document.body.append(toggle,backdrop);
  let open=false;
  function translate(){
    const lang=(document.documentElement.lang||'es').slice(0,2);
    const labels=({es:['Abrir menú','Cerrar menú'],pt:['Abrir menu','Fechar menu'],en:['Open menu','Close menu']})[lang]||['Abrir menú','Cerrar menú'];
    toggle.setAttribute('aria-label',labels[open?1:0]);
  }
  function setOpen(value,focus=true){
    open=media.matches&&value;
    document.body.classList.toggle('mobile-menu-open',open);toggle.setAttribute('aria-expanded',String(open));backdrop.hidden=!open;
    if(main)main.inert=open;
    if(media.matches){sidebar.inert=!open;sidebar.setAttribute('aria-hidden',String(!open));}
    else {const collapsed=document.body.classList.contains('sidebar-collapsed');sidebar.inert=collapsed;sidebar.setAttribute('aria-hidden',String(collapsed));}
    translate();
    if(focus){if(open)sidebar.querySelector('a,button')?.focus();else toggle.focus();}
  }
  toggle.addEventListener('click',()=>setOpen(!open));
  backdrop.addEventListener('click',()=>setOpen(false));
  sidebar.addEventListener('click',event=>{if(open&&event.target.closest('a, .logout-btn, .sidebar-logout'))setOpen(false,false);});
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(event.key==='Tab'){
      const items=Array.from(sidebar.querySelectorAll('a[href],button:not(:disabled),[tabindex="0"]')).filter(node=>node.getClientRects().length);
      if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  const resize=()=>{if(!limitMobilePages())setOpen(false,false);};
  if(media.addEventListener)media.addEventListener('change',resize);else media.addListener(resize);
  document.addEventListener('languagechange',translate);
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  setOpen(false,false);
})();
