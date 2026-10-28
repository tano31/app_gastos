(function () {
  'use strict';
  const API = 'https://script.google.com/macros/s/AKfycbycLE2I62VXXmjRq05Hm0Rpm3eNxHBVv34so0Kv1SP1zdzgIxgdtje_YSxsOJhQJ1LU/exec';
  const normalize = value => String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = value => new Set(normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(word => word.length > 2 && !/^\d+$/.test(word)));
  function suggest(description, labels) {
    const words = tokens(description), scores = new Map();
    labels.forEach(item => {
      const other = tokens(item.descripcion), shared = [...words].filter(word => other.has(word)).length;
      const score = shared / Math.max(words.size, other.size, 1);
      if (shared && score >= 0.5 && score > (scores.get(item.categoria)?.score || 0)) scores.set(item.categoria, {score, description:item.descripcion});
    });
    const sorted = [...scores].sort((a,b) => b[1].score-a[1].score);
    if (!sorted.length || sorted.length > 1 && sorted[0][1].score-sorted[1][1].score < 0.15) return null;
    return {category: sorted[0][0], description:sorted[0][1].description};
  }
  const host = document.getElementById('importLabels');
  if (!host) return;
  let labels = [], categories = [], entries = [], busy = false, valid = false, generation = 0, changed = () => {}, state = '';
  function canEdit() {const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');return user?.admin===true || user?.permisos?.permiso_editar_catalogos===true;}
  const label = value => I18n.category?.(value) ?? value;
  const make = (tag, text) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  async function request(action, extra = {}) {
    const user=JSON.parse(sessionStorage.getItem('controlGastos.user') || 'null');
    if (!user?.perfil_token) throw Error(I18n.t('movement.session'));
    const result=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,perfil_token:user.perfil_token,...extra})});
    if(!result.ok) throw Error('HTTP '+result.status);
    const data=await result.json();if(!data.ok)throw Error(data.error || I18n.t('labelReview.error'));return data;
  }
  function category(description) {return /\bestorno\b/i.test(description)?'Devolucion':labels.find(item=>normalize(item.descripcion)===normalize(description))?.categoria || '';}
  function render() {
    host.replaceChildren(); if (!entries.length && !state) return;
    let feedback=null;
    function updateFeedback(){if(!feedback)return;const count=entries.filter(item=>!item.existing&&!item.choice).length;feedback.hidden=count===0;feedback.textContent=I18n.t('labelReview.missingCount',{count});}
    host.appendChild(make('h3',I18n.t('labelReview.title')));
    const status=make('p',I18n.t(state || (valid?'labelReview.ready':canEdit()?'labelReview.help':'permissions.catalogReadonly')));status.setAttribute('role','status');host.appendChild(status);
    if(entries.length) {
      const list=make('div');list.className='label-review-list';
      entries.forEach(item=>{
        const row=make('div');row.className='label-review-row';
        row.appendChild(make('strong',item.description));
        if(item.existing) row.appendChild(make('span',label(item.existing)+' · '+I18n.t('labelReview.existing')));
        else {
          const select=make('select');select.setAttribute('aria-label',I18n.t('field.category')+': '+item.description);select.disabled=busy||!canEdit();
          const empty=make('option',I18n.t('labelReview.choose'));empty.value='';select.appendChild(empty);
          categories.forEach(name=>{const option=make('option',label(name));option.value=name;select.appendChild(option);});select.value=item.choice;
          const updateColor=()=>{select.className=item.choice?'label-category-selected':'label-category-missing';};
          updateColor();
          select.addEventListener('change',()=>{item.choice=select.value;item.touched=true;updateColor();updateFeedback();});row.appendChild(select);
        }
        list.appendChild(row);
      });host.appendChild(list);
    }
    const actions=make('div');actions.className='label-review-actions';
    if(entries.some(item=>!item.existing)) {
      const save=make('button',I18n.t(busy?'labelReview.saving':'labelReview.save'));save.type='button';save.disabled=busy||!canEdit();save.addEventListener('click',saveLabels);actions.appendChild(save);
    }
    const retry=make('button',I18n.t('categories.refresh'));retry.type='button';retry.disabled=busy;retry.addEventListener('click',()=>review(entries.map(item=>({title:item.description})),changed));actions.appendChild(retry);host.appendChild(actions);
    if(state==='labelReview.missing') {
      feedback=make('p');feedback.className='label-review-validation';feedback.setAttribute('role','alert');feedback.setAttribute('tabindex','-1');
      updateFeedback();host.appendChild(feedback);feedback.focus?.();feedback.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    }
  }
  async function review(movements, callback) {
    const drafts=new Map(entries.map(item=>[normalize(item.description),{choice:item.choice,touched:item.touched}]));
    const current=++generation;changed=callback;valid=false;busy=true;state='labelReview.loading';
    entries=[...new Set(movements.map(item=>item.title))].filter(name=>!/\bestorno\b/i.test(name)).map(description=>({description,choice:drafts.get(normalize(description))?.choice || '',touched:drafts.get(normalize(description))?.touched}));render();changed();
    try {
      const data=await request('import_labels');if(current!==generation)return;
      if(!Array.isArray(data.categorias)||!Array.isArray(data.catalogo))throw Error();
      labels=data.categorias;categories=data.catalogo;
      entries.forEach(item=>{item.existing=category(item.description);item.suggestion=item.existing?null:suggest(item.description,labels);item.choice=item.existing || (categories.includes(item.choice)?item.choice:item.touched?'':item.suggestion?.category || '');});
      valid=entries.every(item=>item.existing);state='';
    } catch(error) {if(current!==generation)return;state='labelReview.error';}
    if(current!==generation)return;busy=false;render();changed();
  }
  async function saveLabels() {
    if(busy||!canEdit())return;
    const pending=entries.filter(item=>!item.existing);
    if(pending.some(item=>!item.choice)){state='labelReview.missing';render();return;}
    const current=generation;busy=true;state='labelReview.saving';render();
    try {
      await request('save_import_labels',{etiquetas:pending.map(item=>({descripcion:item.description,categoria:item.choice}))});
      if(current!==generation)return;
      await review(entries.map(item=>({title:item.description})),changed);
    } catch(error) {if(current!==generation)return;busy=false;state='labelReview.error';render();}
  }
  window.ImportLabels={review,category,suggest,ready:()=>valid&&!busy,reset(){++generation;entries=[];labels=[];valid=false;busy=false;state='';host.replaceChildren();}};
  window.addEventListener('languagechange',render);
})();
