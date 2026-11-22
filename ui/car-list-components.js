/* PriteAgent V2 reusable car-list components, single icon and tab source. */
const shapes={
 small:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
 medium:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 large:'<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M13 9v12"/>',
 table:'<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M10 3v18"/>',
 pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M13 14h3M7 18h3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>'
};
const modes=[['small','กะทัดรัด'],['medium','มาตรฐาน'],['large','รายละเอียด'],['table','ตาราง']];
const statuses=[['all','ทั้งหมด'],['open','กำลังดำเนินการ'],['closed','ปิดแล้ว'],['archived','คลังคันรถ']];
export function carIcon(key){return '<svg class="pa-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[key]||shapes.medium)+'</svg>';}
export function carModeMarkup(current){
 return modes.map(([v,label])=>'<button type="button" data-layout="'+v+'" class="pa-view-option'+(current===v?' active':'')+'" aria-label="'+label+'" title="'+label+'" aria-pressed="'+(current===v)+'">'+carIcon(v)+'</button>').join('');
}
export function carStatusMarkup(current,attribute='state'){
 if(!['state','status'].includes(attribute))throw Error('bad attribute');
 return statuses.map(([v,label])=>'<button type="button" role="tab" data-'+attribute+'="'+v+'" class="pa-status-option'+(v===current?' active':'')+'" aria-selected="'+(v===current)+'" tabindex="'+(v===current?'0':'-1')+'">'+label+'</button>').join('');
}
export function syncCarControlState(root,mode,status){
 root.querySelectorAll('[data-layout]').forEach(b=>{const yes=b.dataset.layout===mode;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
 root.querySelectorAll('.pa-status-tabs [role=tab]').forEach(b=>{const yes=(b.dataset.state??b.dataset.status)===status;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});
}
const listeners=new WeakSet();
export function enableCarTabKeyboard(root=document){
 if(listeners.has(root))return;listeners.add(root);
 root.addEventListener('keydown',event=>{
  const b=event.target.closest?.('.pa-status-tabs [role=tab]');
  if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const siblings=[...b.parentElement.querySelectorAll('[role=tab]')];const i=siblings.indexOf(b);
  if(i<0)return;
  const j=event.key==='Home'?0:event.key==='End'?siblings.length-1:(i+(event.key==='ArrowRight'?1:-1)+siblings.length)%siblings.length;
  event.preventDefault();siblings[j].focus();siblings[j].click();
 });
}
