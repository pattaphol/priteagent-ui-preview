import {layouts,deviceFor,initialFilters,filterCars,bodyTarget} from './domain.js';

import {LocalPreferences,LocalCarGroupStore} from './adapters.js';

const root=document.querySelector('#app');
// Storage access itself can throw in private/restricted browsing.
let storage;
try {storage=window.localStorage;} catch {storage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};}
const prefs=new LocalPreferences(storage);
const groupStore=new LocalCarGroupStore();
const pendingKey='priteagent-v2:phase1:pending-operation:';
const pendingStorage=()=>{try {return window.localStorage;} catch {throw new Error('STORAGE_UNAVAILABLE');}};
const pendingKeys=()=>Object.keys(pendingStorage()).filter(key=>key===pendingKey.slice(0,-1)||key.startsWith(pendingKey));
let page='cars', device=deviceFor(innerWidth), layout=prefs.read(page,device);
let filters=initialFilters(), cars=[], state='ready', revision=0;
let prefError='', menuOpen=false, selected=null;
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const names={home:'หน้าหลัก',cars:'คันรถของฉัน',expenses:'ค่าใช้จ่าย','holding-cars':'เลือกคันรถเพื่อดูงานที่ถือ',performance:'ผลงาน',bonuses:'โบนัสและคุณวุฒิ',customers:'ลูกค้า',planning:'วางแผนประกัน',policies:'กรมธรรม์',coverage:'สรุปความคุ้มครอง'};
const layoutNames={small:'กะทัดรัด',medium:'มาตรฐาน',large:'รายละเอียด',table:'ตาราง'};
const e=(s)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n)=>new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' ฿';
const date=(s)=>s?new Date(s+'T12:00:00').toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}):'ยังไม่ระบุ';
const period=(c)=>c.group?`วีค ${c.group.week} · ${months[c.group.month-1]} ${c.group.year}`:'ยังไม่ระบุปี เดือน และวีค';
const nav={open(target) {
 if(!cars.some(c=>c.id===target.carId)){showSimulation('ไม่พบคันรถตัวอย่าง');return;}
 if(target.screen==='settings' && !target.carId.startsWith('demo-')){void openGroupForm(target.carId);return;}
 selected=target;const c=cars.find(c=>c.id===target.carId);
 const titles={settings:'ตั้งค่าคันรถ',entries:'Expense Entries · ค่าใช้จ่าย',holding:'Holding · ถืองาน'};
 showSimulation(titles[target.screen],`${c.name} · ${c.id}`,target.screen);
}};
function showSimulation(title,context='',screen='module') {
 const dialog=document.querySelector('#simulation');
 dialog.querySelector('#dialog-title').textContent=title;
 dialog.querySelector('#context').textContent=context;
 dialog.dataset.screen=screen;
 dialog.showModal();
}
function actions(c) {
 return `<div class="directory-car-actions"><button data-car="${c.id}" data-action="entries">▤ ค่าใช้จ่าย</button><button data-car="${c.id}" data-action="holding">▦ ถืองาน</button></div>`;
}
function card(c) {
 return `<article class="directory-car card-${layout}"><button class="directory-car-open" data-car="${c.id}" data-action="body" aria-label="${page==='holding-cars'?'ถืองาน':'ตั้งค่าคันรถ'} ${e(c.name)}"><div class="directory-car-head"><span class="car-icon" aria-hidden="true">▰</span><span class="badge ${c.closed?'closed':''}">${c.closed?'ปิดคันรถแล้ว':'กำลังดำเนินการ'}</span></div><h2>${e(c.name)}</h2><div class="car-facts"><span>⌖ ${e(c.destination||'ยังไม่ระบุจังหวัด')}</span><span>▦ ${period(c)}</span>${layout!=='small'?`<span>${date(c.start)} – ${date(c.end)}</span>`:''}</div>${layout==='large'?`<div class="work-members">${c.members.slice(0,4).map(m=>`<span><i aria-hidden="true">${e(m.name.slice(-1))}</i>${e(m.name)}</span>`).join('')}${c.members.length>4?`<span>+${c.members.length-4} คน</span>`:''}</div>${c.group?`<small class="directory-code">${e(c.group.groupId)}</small>`:''}`:''}${layout!=='small'?`<div class="directory-car-total"><span>ค่าใช้จ่าย<strong>${money(c.expenseTHB)}</strong></span>${layout==='large'?`<span>เงินกองกลางคงเหลือ<strong>${money(c.poolTHB)}</strong></span>`:''}</div>`:''}</button>${actions(c)}</article>`;
}
function rowsMarkup(rows) {
 if(layout!=='table')return `<div class="car-directory-grid directory-${layout}">${rows.map(card).join('')}</div>`;
 return `<div class="directory-table-wrap" tabindex="0" role="region" aria-label="ตารางคันรถ เลื่อนซ้ายขวาได้"><table><thead><tr>${['คันรถ','จังหวัด / วีค','ช่วงวันที่','ค่าใช้จ่าย','ไปยัง'].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(c=>`<tr data-row="${c.id}"><td><button data-car="${c.id}" data-action="body">${e(c.name)}</button><small>${c.closed?'ปิดคันรถแล้ว':'กำลังดำเนินการ'}</small></td><td>${e(c.destination||'ยังไม่ระบุจังหวัด')}<small>${period(c)}</small></td><td>${date(c.start)} – ${date(c.end)}</td><td>${money(c.expenseTHB)}</td><td>${actions(c)}</td></tr>`).join('')}</tbody></table></div>`;
}
function result() {
 const rows=filterCars(cars,filters), el=document.querySelector('#results');
 document.querySelector('#count').textContent=`${rows.length} คันรถ · ${layoutNames[layout]}`;
 el.setAttribute('aria-busy',String(state==='loading'));
 el.innerHTML=state==='loading'?'<div class="empty" role="status">กำลังโหลดคันรถตัวอย่าง… <button data-retry>แสดงข้อมูลตัวอย่าง</button></div>':state==='error'?'<div class="empty" role="alert">โหลดข้อมูลตัวอย่างไม่สำเร็จ <button data-retry>ลองอีกครั้ง</button></div>':rows.length?rowsMarkup(rows):'<div class="empty" role="status">ไม่พบคันรถตามคำค้นหาหรือตัวกรองนี้ <button data-reset>ล้างตัวกรอง</button></div>';
}
function render() {
 root.innerHTML=`<header><button id="menu" aria-expanded="${menuOpen}" aria-controls="sidebar">☰ <span>เมนู</span></button><strong class="brand">prite<span>agent</span> <small>V2</small></strong><span class="local">ทดลองส่วนตัว · เครื่องนี้</span><button id="theme" aria-label="สลับ light dark">◐ ธีม</button></header>
 <aside id="sidebar" class="${menuOpen?'open':''}"><p>พื้นที่ทำงาน</p><nav aria-label="เมนูพื้นที่ทำงาน">${Object.entries(names).map(([id,label],i)=>`<button data-page="${id}" title="${label}" ${id===page?'aria-current="page"':''}><b aria-hidden="true">${['⌂','▰','▤','▦','▥','☆','♙','▧','▣','▱'][i]}</b><span>${label}</span></button>`).join('')}</nav><button data-sim="โปรไฟล์และตั้งค่า">⚙ <span>โปรไฟล์และตั้งค่า</span></button><p class="aside-note">Sprint 1 · ข้อมูลสมมติ<br>SIMULATED / NOT IMPLEMENTED<br>สำหรับระบบนอกขอบเขต</p></aside>
 <main id="main" tabindex="-1"><div id="pending-recovery" role="status"></div><div class="notice">ข้อมูลเก็บในเบราว์เซอร์นี้ กรุณาใช้ข้อมูลการเดินทางที่ไม่มีข้อมูลระบุตัวลูกค้า</div><div class="heading"><div><small>งานตัวแทน</small><h1>${names[page]}</h1><p>${page==='holding-cars'?'เลือกคันรถเพื่อเปิด Holding โดยตรง':'กดตัวการ์ดเพื่อตั้งค่าคันรถ หรือเลือกค่าใช้จ่ายและถืองานด้านล่าง'}</p></div><div class="create"><button data-action="create-group">+ สร้างคันรถ</button><button data-sim="เข้าร่วมคันรถ">เข้าร่วม</button></div></div>
 <div class="tools"><label class="search">ค้นหา<input id="search" type="search" placeholder="คันรถ จังหวัด รหัสกลุ่ม หรือสมาชิก" value="${e(filters.query)}"></label><div class="periods">${select('year','ปี',['',...[...new Set(cars.flatMap(c=>c.group?[c.group.year]:[]))].sort((a,b)=>b-a).map(String)],filters.year)}${select('month','เดือน',['',...months.map((_,i)=>String(i+1))],filters.month,months)}${select('week','วีค',['','1','2','3','4','5'],filters.week)}</div></div>
 <section class="view-controls" aria-label="รูปแบบการแสดงคันรถ"><div role="group" aria-label="เลือกรูปแบบ">${layouts.map(l=>`<button data-layout="${l}" aria-pressed="${layout===l}">${layoutNames[l]}</button>`).join('')}</div><p>จำรูปแบบแยกตามหน้าและอุปกรณ์ · ${device}<small id="pref-error" role="status">${prefError}</small></p></section>
 <div class="filterbar" role="group" aria-label="สถานะ">${Object.entries({all:'ทั้งหมด',open:'กำลังดำเนินการ',closed:'ปิดแล้ว',archived:'คลังคันรถ'}).map(([s,n])=>`<button data-status="${s}" aria-pressed="${filters.status===s}">${n}</button>`).join('')}</div><p id="count" role="status"></p><section id="results" aria-label="รายการคันรถ"></section>
 <footer>PriteAgent V2 · ทดลองส่วนตัว</footer></main>
 <dialog id="simulation" aria-labelledby="dialog-title"><h2 id="dialog-title"></h2><p id="context"></p><strong>SIMULATED / NOT IMPLEMENTED</strong><p>แสดงปลายทางและบริบทคันรถเท่านั้น ยังไม่มีการบันทึก แก้ไข หรือคำนวณจริง</p><button id="close-dialog" autofocus>ปิด</button></dialog>`;
 result();
 showPendingRecovery();
 document.querySelector('#search').addEventListener('input',ev=>{filters.query=(ev.target).value;result();});
 for(const k of ['year','month','week'])document.querySelector('#'+k).addEventListener('change',ev=>{filters[k]=(ev.target).value;result();});
 document.querySelector('#close-dialog').addEventListener('click',()=>document.querySelector('dialog').close());
}
function select(id,title,values,current,labels) {
 return `<label>${title}<select id="${id}" aria-label="กรอง${title}">${values.map(v=>`<option value="${v}" ${v===current?'selected':''}>${v?(labels?labels[Number(v)-1]:v):'ทุก'+title}</option>`).join('')}</select></label>`;
}
async function load(next) {
 const token=++revision;state=next;selected=null;
 if(next==='loading'){render();return;}
 try {const saved=await groupStore.list();if(token!==revision)return;cars=[...saved.map(g=>({id:g.id,name:g.name,destination:g.province,start:g.startDate,end:g.endDate,closed:false,archived:false,group:{groupId:g.id,year:g.year,month:g.month,week:g.week},members:g.members.map((name,i)=>({id:String(i),name})),expenseTHB:0,poolTHB:0}))];}catch{if(token!==revision)return;cars=[];state='error';}
 render();
}
root.addEventListener('click',ev=>{
 const b=(ev.target).closest('button');if(!b)return;
 if(b.dataset.action==='recover-pending'){void recoverPending();}
 else if(b.dataset.action==='create-group'){try{if(pendingKeys().length){alert('กรุณาตรวจคำขอบันทึกที่ค้างก่อนสร้างรายการใหม่');return;}void openGroupForm();}catch{alert('ไม่สามารถใช้พื้นที่จัดเก็บในเครื่องได้ จึงยังสร้างรายการไม่ได้');}}
 else if(b.dataset.action==='edit-group' && b.dataset.id){void openGroupForm(b.dataset.id);}
 else if(b.dataset.car){const id=b.dataset.car;nav.open(b.dataset.action==='body'?bodyTarget(page,id):{carId:id,screen:b.dataset.action});}
 else if(b.dataset.layout){layout=b.dataset.layout;prefError=prefs.write(page,device,layout)?'':'บันทึกรูปแบบไม่ได้ · ใช้เฉพาะครั้งนี้';render();document.querySelector(`[data-layout="${layout}"]`).focus();}
 else if(b.dataset.status){filters.status=b.dataset.status;render();document.querySelector(`[data-status="${filters.status}"]`).focus();}
 else if(b.dataset.page){const p=b.dataset.page;if(['cars','expenses','holding-cars'].includes(p)){page=p;layout=prefs.read(page,device);prefError='';menuOpen=false;selected=null;render();document.querySelector('h1').setAttribute('tabindex','-1');document.querySelector('h1').focus();}else showSimulation(names[p]);}
 else if(b.dataset.sim)showSimulation(b.dataset.sim);
 else if(b.hasAttribute('data-retry'))void load('ready');
 else if(b.hasAttribute('data-reset')){filters=initialFilters();render();document.querySelector('#search').focus();}
 else if(b.id==='menu'){menuOpen=!menuOpen;document.querySelector('aside').classList.toggle('open',menuOpen);b.setAttribute('aria-expanded',String(menuOpen));}
 else if(b.id==='theme'){const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'light':'dark';}
});
document.addEventListener('keydown',ev=>{
 // A single-action simulation dialog keeps keyboard focus on its close action.
 if(ev.key==='Tab'&&document.querySelector('#simulation')?.open){ev.preventDefault();document.querySelector('#close-dialog').focus();}
 if(ev.key==='Escape'&&menuOpen){menuOpen=false;document.querySelector('aside').classList.remove('open');document.querySelector('#menu').setAttribute('aria-expanded','false');document.querySelector('#menu').focus();}
});
addEventListener('resize',()=>{const next=deviceFor(innerWidth);if(next!==device){device=next;layout=prefs.read(page,device);menuOpen=false;render();}});
void load('ready');

// Local synthetic draft form; never uses real account information.
async function openGroupForm(id) {
 let current = id ? await groupStore.get(id) : null;
 if(id && !current){alert('ไม่พบคันรถที่ต้องการแก้ไข กรุณากลับไปตรวจสอบรายการ');return;}
 const dialog=document.createElement('dialog');
 dialog.setAttribute('aria-label','ข้อมูลคันรถตัวอย่าง');
 dialog.innerHTML=`<form><h2>${current?'แก้ไขข้อมูลคันรถ':'สร้างคันรถ'}</h2><p>บันทึกในเบราว์เซอร์นี้</p>
 <label>ปี <input name="year" type="number" required></label><label>เดือน <input name="month" type="number" min="1" max="12" required></label><label>วีค <input name="week" type="number" min="1" max="5" required></label>
 <label>วันเริ่ม <input name="startDate" type="date" required></label><label>วันสิ้นสุด <input name="endDate" type="date" required></label>
 <label>ชื่อคันรถ <input name="name" required></label><label>จังหวัด <input name="province" required></label><label>หมายเหตุ <input name="workNote"></label>
 <label>จำนวนสมาชิก <input name="memberCount" type="number" min="1" max="4" required></label>
 ${[1,2,3,4].map(i=>`<label>สมาชิก ${i}${i===1?' (หัวหน้าคัน)':''} <input name="member${i}"></label>`).join('')}
 <label>เจ้าของรถ (ลำดับสมาชิก) <input name="ownerIndex" type="number" min="1" max="4" required></label><label>งบประมาณ (บาทเต็ม) <input name="budget" type="number" step="1"></label>
 <p role="alert" data-error></p><pre data-review hidden></pre><button type="submit">ตรวจทาน</button><button type="button" data-save hidden>บันทึก</button><button type="button" data-close>ปิด</button></form>`;
 document.body.append(dialog);const form=dialog.querySelector('form'); const field=(name)=>form.elements.namedItem(name);
 if(current){for(const key of ['year','month','week','startDate','endDate','name','province','workNote']) field(key).value=String(current[key]);field('memberCount').value=String(current.members.length);current.members.forEach((name,i)=>field('member'+(i+1)).value=name);field('ownerIndex').value=String(current.ownerIndex+1);field('budget').value=current.budget===undefined?'':String(current.budget);}
 else {field('memberCount').value='1';field('ownerIndex').value='1';}
 let draft=null;let requestId=crypto.randomUUID();let dirty=false;let outcomeUnknown=false;let previousCount=Number(field('memberCount').value);
 const beforeUnload=(event)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
 field('memberCount').addEventListener('change',()=>{const next=Number(field('memberCount').value);if(next<previousCount && [1,2,3,4].slice(next,previousCount).some(i=>field('member'+i).value.trim()) && !confirm('การลดจำนวนสมาชิกจะไม่นำข้อมูลสมาชิกที่ซ่อนมาบันทึก ต้องการดำเนินการหรือไม่?')){field('memberCount').value=String(previousCount);return;}previousCount=next;});
 form.addEventListener('input',()=>{dirty=true;draft=null;requestId=crypto.randomUUID();dialog.querySelector('[data-save]').hidden=true;});
 form.addEventListener('submit',async ev=>{ev.preventDefault();const count=Number(field('memberCount').value);const candidate={year:Number(field('year').value),month:Number(field('month').value),week:Number(field('week').value),startDate:field('startDate').value,endDate:field('endDate').value,name:field('name').value,province:field('province').value,workNote:field('workNote').value,members:[1,2,3,4].slice(0,count).map(i=>field('member'+i).value),ownerIndex:Number(field('ownerIndex').value)-1,...(field('budget').value?{budget:Number(field('budget').value)}:{})};
 const {validateCarGroup}=await import('./domain.js');const errors=validateCarGroup(candidate);dialog.querySelector('[data-error]').textContent=Object.values(errors).join(' · ');if(Object.keys(errors).length)return;draft=candidate;const review=dialog.querySelector('[data-review]');review.textContent=JSON.stringify(candidate,null,2);review.hidden=false;dialog.querySelector('[data-save]').hidden=false;});
 const saveButton=dialog.querySelector('[data-save]');
 const saveError=dialog.querySelector('[data-error]');
 let saving=false;
 saveButton.onclick=async()=>{
  if (!draft || saving) return;
  const key=pendingKey+requestId;
  const operation={id:current?.id ?? null,revision:current?.revision ?? null,draft,requestId};
  saving=true;
  saveButton.disabled=true;
  const inputs=Array.from(form.querySelectorAll('input'));
  inputs.forEach(input=>input.readOnly=true);
  try {
   if (!outcomeUnknown) {
    try {pendingStorage().setItem(key,JSON.stringify(operation));}
    catch {
     inputs.forEach(input=>input.readOnly=false);
     saveError.textContent='ยังไม่ได้บันทึก พื้นที่เก็บคำขอไม่พร้อม ข้อมูลที่กรอกยังอยู่';
     return;
    }
   }
   try {
    if (current) await groupStore.update(current.id,current.revision,operation.draft,operation.requestId);
    else await groupStore.create(operation.draft,operation.requestId);
   } catch(err) {
    if (err instanceof Error && err.message==='CONFLICT_STALE_REVISION') {
     outcomeUnknown=false;
     inputs.forEach(input=>input.readOnly=false);
     saveButton.hidden=true;
     draft=null;
     try {pendingStorage().removeItem(key);} catch {}
     saveError.textContent='ข้อมูลถูกแก้ไขจากอีกที่ ข้อมูลที่กรอกยังอยู่ โปรดตรวจรายการล่าสุดก่อนแก้ไขอีกครั้ง';
    } else {
     outcomeUnknown=true;
     saveError.textContent='ยังยืนยันผลไม่ได้ กดบันทึกอีกครั้งเพื่อตรวจคำขอเดิม';
    }
    return;
   }
   // The IndexedDB commit is confirmed even if journal cleanup is denied.
   try {pendingStorage().removeItem(key);} catch {}
   dirty=false;
   outcomeUnknown=false;
   dialog.close();
   void load('ready');
  } finally {
   saving=false;
   saveButton.disabled=false;
  }
 };
 dialog.querySelector('[data-close]').onclick=()=>{if(saving)return;if(outcomeUnknown && !confirm('ยังยืนยันผลบันทึกไม่ได้ โปรดคัดลอกข้อมูลก่อนออก คุณต้องการออกหรือไม่?'))return;if(!dirty||confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?'))dialog.close();};dialog.addEventListener('cancel',ev=>{if(saving){ev.preventDefault();return;}if(outcomeUnknown && !confirm('ยังยืนยันผลบันทึกไม่ได้ โปรดคัดลอกข้อมูลก่อนออก คุณต้องการออกหรือไม่?')){ev.preventDefault();return;}if(dirty&&!confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?'))ev.preventDefault();});dialog.addEventListener('close',()=>{window.removeEventListener('beforeunload',beforeUnload);dialog.remove();});dialog.showModal();
}

// Keep the exact synthetic operation until an IndexedDB transaction confirms it.
function showPendingRecovery() {
 const el=document.querySelector('#pending-recovery');if(!el)return;
 try {if(pendingKeys().length)el.innerHTML='<p>มีคำขอบันทึกที่ยังไม่ได้ยืนยัน '+pendingKeys().length+' รายการ</p><button data-action="recover-pending">ตรวจผลและลองคำขอเดิม</button>'; } catch {el.textContent='ไม่สามารถตรวจข้อมูลค้างในเครื่องได้';}
}
async function recoverPending() {
 const el=document.querySelector('#pending-recovery');if(!el)return;
 try {const key=pendingKeys()[0];if(!key)return;const raw=pendingStorage().getItem(key);if(!raw)return;const pending=JSON.parse(raw);
 if(!pending.requestId || !pending.draft)throw new Error('INVALID_PENDING');
 if(pending.id) await groupStore.update(pending.id,pending.revision,pending.draft,pending.requestId);
 else await groupStore.create(pending.draft,pending.requestId);
 pendingStorage().removeItem(key);el.textContent='ยืนยันการบันทึกแล้ว';void load('ready');
 } catch(error) {el.textContent=error instanceof Error && error.message==='CONFLICT_STALE_REVISION'?'ข้อมูลถูกแก้ไขจากอีกที่ คำขอค้างยังเก็บอยู่ โปรดตรวจข้อมูลก่อนดำเนินการ':'ยังยืนยันผลไม่ได้ คำขอและข้อมูลยังเก็บอยู่ กรุณาลองอีกครั้ง';}
}
