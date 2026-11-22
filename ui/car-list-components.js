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

/* Shared artwork for the Car/Agent/Customer navigation.
 * Keep all icons in one source, not duplicated across page templates. */
export function uiMenuIcon(name) {
 const shapes={
  home:'<path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8"/>',
  car:'<path d="M5 11 7 6h10l2 5M4 11h16v7H4z"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  expense:'<path d="M5 3h14v18l-4-2-3 2-3-2-4 2zM8 9h8M8 13h8"/>',
  holding:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4M17 2v4M3 10h18"/>',
  performance:'<path d="M4 20V11M10 20V6M16 20v-9M22 20V3"/>',
  award:'<circle cx="12" cy="8" r="5"/><path d="m9 12-2 9 5-3 5 3-2-9"/>',
  admin:'<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6zM9 12l2 2 4-5"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 6a3 3 0 0 1 0 6M19 16c2 .5 3 2 3 5"/>',
  planning:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h5"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  logout:'<path d="M10 3H4v18h6M14 8l5 4-5 4M9 12h10"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v12h14V9M10 14h4"/>',
  lock:'<rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>'
 };
 return '<svg class="pa-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||shapes.home)+'</svg>';
}
