(function(){
  'use strict';
  const get=id=>document.getElementById(id),modal=get('editMovementModal'),editForm=get('editMovementForm');
  let editing=null,saving=false,trigger=null;
  function close(){if(saving)return;modal.classList.add('hidden');trigger?.focus();editing=null;}
  get('movementTable').addEventListener('click',event=>{
    const button=event.target.closest('.edit-row');if(!button||saving)return;
    const item=movements.find(item=>item.id===Number(button.dataset.id));if(!item)return;
    editing=item.id;trigger=button;
    get('editMovementDescription').value=item.descripcion;
    const select=get('editMovementCategory');select.replaceChildren();
    const names=new Set([...Array.from(get('categoria').options,option=>option.value),'Desconocido',item.categoria]);
    names.forEach(name=>{if(!name)return;const option=document.createElement('option');option.value=name;option.textContent=I18n.category?.(name)??name;select.appendChild(option);});select.value=item.categoria;
    I18n.message(get('editMovementStatus'),'');modal.classList.remove('hidden');get('editMovementDescription').focus();
  });
  get('cancelEditMovement').addEventListener('click',close);
  modal.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  editForm.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||editing===null||!editForm.reportValidity())return;
    saving=true;get('saveEditMovement').disabled=get('cancelEditMovement').disabled=true;
    try {
      const user=JSON.parse(sessionStorage.getItem('controlGastos.user')||'null');
      const description=get('editMovementDescription').value.trim(),category=get('editMovementCategory').value;
      const result=await fetch(GOOGLE_SHEETS_WEB_APP_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'update_movement_details',perfil_token:user?.perfil_token,id:editing,descripcion:description,categoria:category})});
      if(!result.ok)throw Error('HTTP '+result.status);const data=await result.json();if(!data.ok)throw Error(data.error||I18n.t('movement.editError'));
      const item=movements.find(item=>item.id===editing);if(item){item.descripcion=description;item.categoria=category;}render();
      saving=false;close();I18n.message(statusMessage,I18n.t('movement.edited'));
    }catch(error){I18n.message(get('editMovementStatus'),I18n.translate(error.message));}
    finally{saving=false;get('saveEditMovement').disabled=get('cancelEditMovement').disabled=false;}
  });
})();
