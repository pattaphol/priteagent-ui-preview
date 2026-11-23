import { expenseV1Frame, mountExpenseV1 } from './expense-v1-layout.js?rev=pa-expense-csp-r2';
// Reuse the owner-approved Expense R3.9.5 split engine. Car identity and members come from V2 LocalCarGroupStore (same workspace origin).
// Synthetic-only: saved records are scoped per car in this browser, NOT backend/production ledger or fund balances.
import {enhancePlainDateFields} from '../ui/date-fields.js?rev=pa-calendar-r2';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const expenseKey=carId=>'priteagent-v2:synthetic:expenses:'+carId;
function savedFor(carId) {try{const data=JSON.parse(localStorage.getItem(expenseKey(carId))||'[]');return Array.isArray(data)?data:[]}catch{return[]}}
function historyMarkup(car){const list=savedFor(car.id);return '<section class="pa-expense-history" aria-label="รายการค่าใช้จ่ายที่บันทึกในเครื่อง"><h2>รายการค่าใช้จ่ายของคันรถนี้ ('+list.length+')</h2>'+(list.length?'<ul>'+list.slice().reverse().map(v=>'<li><span><strong>'+esc(v.name)+'</strong><small>'+esc(v.category)+' · '+esc(v.date)+' · บันทึกในเครื่องนี้</small></span><b>'+new Intl.NumberFormat('th-TH').format(v.amount)+' บาท</b></li>').join('')+'</ul>':'<p class="pa-expense-note">ยังไม่มีรายการที่บันทึกในเบราว์เซอร์นี้</p>')+'</section>'}

const APPROVED_MARKUP="<div class=\"wrap\"><section class=\"card\"><div class=\"screen-head\"><div><div class=\"hero\">เพิ่มค่าใช้จ่าย</div><div class=\"quiet\">สมาชิกและเจ้าของรถจากคันรถที่เลือกด้านบน · เก็บข้อมูลในอุปกรณ์นี้</div></div><div class=\"pa-expense-receipt-mark\">🧾</div></div><div id=\"notice\"></div>\n<label class=\"label\" for=\"cat\">หมวดหมู่ *</label><select class=\"field pa-control\" id=\"cat\"></select><label class=\"label\" for=\"name\">ชื่อรายการ *</label><input class=\"field pa-control\" id=\"name\" placeholder=\"เติมน้ำมัน / ค่าอาหารทีม\" value=\"\"><label class=\"label\" for=\"price\">ราคา/หน่วย (บาท) *</label><div class=\"row\"><div><input class=\"field pa-control\" id=\"price\" inputmode=\"numeric\" value=\"\"></div><button class=\"calc-btn\" id=\"calcButton\">▦ เครื่องคิดเลข</button></div><div id=\"calculator\" class=\"callout pa-expense-initial-hidden\"><label class=\"label\">เครื่องคิดเลขราคา/หน่วย</label><input class=\"field pa-control\" id=\"calcExpr\" placeholder=\"100+50×2\"><div class=\"calc-grid\" id=\"calcKeys\"></div><div class=\"line\"><span>ผลลัพธ์</span><strong class=\"value\" id=\"calcResult\">— บาท</strong></div><button class=\"btn primary\" id=\"calcApply\">ใช้ราคานี้</button></div>\n<div class=\"row-grid\"><div><label class=\"label\" for=\"qty\">จำนวน</label><input class=\"field pa-control\" id=\"qty\" inputmode=\"numeric\" value=\"1\"></div><div><label class=\"label\" for=\"unit\">หน่วย</label><input class=\"field pa-control\" id=\"unit\" value=\"งาน\"></div></div><div class=\"total\"><strong>จำนวนเงินทั้งหมด</strong><strong class=\"value\" id=\"grandTotal\">101 บาท</strong></div><div class=\"row-grid\"><div><label class=\"label\" for=\"date\">วันที่</label><input class=\"field pa-control\" id=\"date\" type=\"date\" value=\"\"></div><div><label class=\"label\" for=\"time\">เวลา</label><input class=\"field pa-control\" id=\"time\" type=\"time\" value=\"\"></div></div><label class=\"label\" for=\"paymentMethod\">วิธีชำระเงิน</label><select class=\"field pa-control\" id=\"paymentMethod\"><option>โอนเงิน</option><option>เงินสด</option><option>บัตรเครดิต</option><option>ไม่ระบุ</option></select><label class=\"label\" for=\"note\">หมายเหตุ</label><textarea class=\"field pa-control\" id=\"note\" rows=\"2\" placeholder=\"รายละเอียดเพิ่มเติม\"></textarea><button class=\"btn sm pa-expense-receipt-action\" id=\"receipt\">📷 สแกน / แนบใบเสร็จ (จำลอง)</button>\n<section class=\"group\"><h3>1. ใครเป็นคนจ่าย?</h3><div class=\"pool\"><small>เงินกองกลาง · ยังไม่เชื่อมยอดกองกลาง</small><div class=\"value\">—</div><small>หัวหน้าคัน: สมาชิกอันดับ 1 ของคันรถนี้</small></div><label class=\"check-row\"><input type=\"checkbox\" id=\"multi\">หลายคนร่วมจ่าย</label><div id=\"singleBox\"><label class=\"label\">ผู้จ่ายเงินจริง</label><select class=\"field pa-control\" id=\"payer\"></select></div><div id=\"multiBox\" class=\"pa-expense-initial-hidden\"><div class=\"callout\">กรอกยอดร่วมจ่ายของสมาชิกทุกคนและกองกลางตาม V1 · ข้อมูลทดลองเท่านั้น</div><div id=\"payRows\"></div><div class=\"line\"><strong>ยอดจ่ายร่วม</strong><strong id=\"paidSum\">—</strong></div></div><div class=\"line\"><span class=\"muted\">กองกลางหลังจ่าย (จำลอง)</span><strong id=\"poolAfter\">—</strong></div><div class=\"preview-tag\">คำนวณยอดสมาชิกเฉพาะรายการนี้ (ไม่ใช่ยอดกองกลางจริง)</div><div id=\"balanceRows\"></div></section>\n<section class=\"group\"><div class=\"counts\"><h3>2. ใครรับผิดชอบ?</h3><span class=\"pin\" id=\"memberCount\">4/4 คน</span></div><div class=\"quiet\">เลือกสมาชิกทั้งคันให้อัตโนมัติ · ผู้รับเศษใช้ลำดับสมาชิก 1→4 ไม่จำลำดับคลิก</div><div class=\"member-grid\" id=\"memberGrid\"></div><div class=\"row\"><button class=\"btn sm\" id=\"selectAll\">เลือกทั้งคัน</button><button class=\"btn sm\" id=\"clearAll\">ล้างการเลือก</button></div></section>\n<section class=\"group\"><h3>3. แบ่งอย่างไร?</h3><div class=\"methods\" id=\"methods\"></div><div class=\"hint\" id=\"methodHint\">ค่าใช้จ่ายทั่วไปแบ่งเท่ากัน · เศษให้สมาชิกอันดับน้อยที่สุดที่ยังรับผิดชอบ</div><div id=\"extraRows\"></div><div class=\"summary\"><strong>ยอดแบ่งรายคน</strong><div id=\"fuelRuleReminder\" class=\"fuel-reminder pa-expense-initial-hidden\" role=\"note\" aria-live=\"polite\"></div><div id=\"shareRows\"></div><div class=\"line\"><strong>ยอดรวม</strong><strong id=\"shareTotal\">—</strong></div><div id=\"shareStatus\"></div></div><div id=\"roundWrap\" class=\"pa-expense-initial-hidden\"><button class=\"shy\" id=\"roundToggle\">⚖ จัดการเศษเงิน ▾</button><div id=\"roundBox\" class=\"summary pa-expense-initial-hidden\"><div class=\"test\" id=\"roundModes\"></div><div id=\"roundInputs\"></div></div></div></section>\n<div class=\"foot-actions\"><button class=\"btn red\" id=\"cancel\">ยกเลิก</button><button class=\"btn primary\" id=\"save\">✓ บันทึกจำลอง</button></div><div class=\"hint pa-expense-hint-centered\">ระบบทดลอง · รายการเก็บเฉพาะเบราว์เซอร์เครื่องนี้ · ไม่ใช่ยอดจริง</div></section>\n</div>";

// Visual-only empty-state fixture: not inserted into LocalCarGroupStore or stored as an expense.
// Never use customer names or actual V1 transactions in this public demonstration.
const EXPENSE_VISUAL_DEMO_ID='__pa_v2_expense_ui_demo_readonly__';
const EXPENSE_VISUAL_DEMO_CAR=Object.freeze({
 id:EXPENSE_VISUAL_DEMO_ID, name:'ตัวอย่างคันรถ (ข้อมูลสมมุติ)',
 group:{year:2569,month:11,week:3}, ownerIndex:2,
 members:[{id:'0',name:'สมาชิก 1'},{id:'1',name:'สมาชิก 2'},{id:'2',name:'สมาชิก 3'}]
});
const EXPENSE_VISUAL_DEMO_ROWS=[
 {carId:EXPENSE_VISUAL_DEMO_ID,name:'ค่าน้ำมันตัวอย่าง',category:'ค่าน้ำมัน',amount:302,quantity:1,unit:'งาน',date:'2026-11-21',payer:'สมาชิก 1',memberShares:[{memberIndex:0,amount:127},{memberIndex:1,amount:127},{memberIndex:2,amount:48}]},
 {carId:EXPENSE_VISUAL_DEMO_ID,name:'ค่าอาหารตัวอย่าง',category:'ค่าอาหาร',amount:101,quantity:1,unit:'งาน',date:'2026-11-21',payer:'สมาชิก 2',memberShares:[{memberIndex:0,amount:35},{memberIndex:1,amount:33},{memberIndex:2,amount:33}]},
 {carId:EXPENSE_VISUAL_DEMO_ID,name:'ค่าทางด่วนตัวอย่าง',category:'ค่าทางด่วน',amount:30,quantity:1,unit:'งาน',date:'2026-11-20',payer:'สมาชิก 1',memberShares:[{memberIndex:0,amount:10},{memberIndex:1,amount:10},{memberIndex:2,amount:10}]},
 {carId:EXPENSE_VISUAL_DEMO_ID,name:'ค่าห้องพักตัวอย่าง',category:'ค่าห้องพัก',amount:600,quantity:1,unit:'คืน',date:'2026-11-20',payer:'สมาชิก 3',memberShares:[{memberIndex:0,amount:200},{memberIndex:1,amount:200},{memberIndex:2,amount:200}]}
];
const expenseVisualDemoMode=cars=>cars.length===0||new URL(location.href).searchParams.get('demo')==='1';

/* Preview-only audit-safe drafts. No bank transfers, authenticated fund approvals,
 * net settlement or real account balances are created by these actions. */
const cashDraftKey=carId=>'priteagent-v2:synthetic:expense-cash-drafts:'+carId;
function cashDraftsFor(carId){
 try{
  const value=JSON.parse(localStorage.getItem(cashDraftKey(carId))||'[]');
  return Array.isArray(value)?value.filter(r=>r&&r.carId===carId&&(r.type==='fund'||r.type==='transfer')&&Number.isSafeInteger(r.amount)&&r.amount>0).slice(-500):[];
 }catch{return []}
}
const moneyDraft=n=>new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' บาท';
const memberDraftName=(car,id)=>car.members[Number(id)]?.name||'สมาชิกไม่ระบุ';
function auxPreviewMarkup(car){
 const memberOpts=car.members.map((m,i)=>'<option value="'+i+'">'+esc(m.name||'สมาชิก '+(i+1))+'</option>').join('');
 const day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
 const label='<p class="pa-expense-aux-warning" role="note">บันทึกทดลองเฉพาะเบราว์เซอร์นี้ · ไม่ใช่หลักฐานโอนเงินจริง ไม่ยืนยันสิทธิ์กองกลาง และไม่หักลบยอดเคลียร์อัตโนมัติ</p>';
 return '<div class="expv1-form-back"><button type="button" id="paExpenseAuxBack">← กลับหน้าค่าใช้จ่าย</button><strong>รายการเงินและการโอน · ทดลอง</strong></div>'
 +label
 +'<form id="paExpenseFundForm" data-pa-aux-kind="fund" class="pa-expense-aux-form" hidden>'
 +'<h2>เพิ่มเงินกองกลาง</h2><label>สมาชิกที่นำเงินเข้ากองกลาง<select class="pa-control" name="member" required>'+memberOpts+'</select></label>'
 +'<label>จำนวนเงิน (บาท)<input class="pa-control" type="number" name="amount" min="1" step="1" inputmode="numeric" required></label>'
 +'<label>วันที่<input class="pa-control" type="date" name="date" value="'+day+'" required></label>'
 +'<label>หมายเหตุ<input class="pa-control" name="note" maxlength="200" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"></label>'
 +'<button type="submit" class="expv1-action">บันทึกรายการกองกลางในเครื่อง</button></form>'
 +'<form id="paExpenseTransferForm" data-pa-aux-kind="transfer" class="pa-expense-aux-form" hidden>'
 +'<h2>บันทึกการโอนระหว่างสมาชิก</h2>'
 +(car.members.length<2?'<p class="pa-expense-aux-warning">คันรถนี้ต้องมีสมาชิกอย่างน้อย 2 คนจึงบันทึกการโอนระหว่างสมาชิกได้ <button type="button" data-page="cars">ไปหน้าคันรถ</button></p>':'')
 +'<label>ผู้โอน<select class="pa-control" name="from" required>'+memberOpts+'</select></label>'
 +'<label>ผู้รับ<select class="pa-control" name="to" required>'+car.members.map((m,i)=>'<option value="'+i+'"'+(i===1?' selected':'')+'>'+esc(m.name||'สมาชิก '+(i+1))+'</option>').join('')+'</select></label>'
 +'<label>จำนวนเงิน (บาท)<input class="pa-control" name="amount" type="number" min="1" step="1" inputmode="numeric" required></label>'
 +'<label>วันที่<input class="pa-control" name="date" type="date" value="'+day+'" required></label>'
 +'<label>หมายเหตุ<input class="pa-control" name="note" maxlength="200" placeholder="รายละเอียดการโอน (ถ้ามี)"></label>'
 +'<button type="submit" class="expv1-action"'+(car.members.length<2?' disabled':'')+'>บันทึกรายการโอนในเครื่อง</button></form>'
 +'<p id="paExpenseAuxStatus" role="status" aria-live="polite"></p>';
}
function cashDraftPanel(car,tab,rows){
 if(tab!=='overview'&&tab!=='settlement')return '';
 const funds=rows.filter(r=>r.type==='fund'),transfers=rows.filter(r=>r.type==='transfer');
 const fundTotal=funds.reduce((n,r)=>n+r.amount,0);
 const list=(records,type)=>records.length?'<div class="expv1-notelist">'+records.slice().reverse().map(r=>
  '<div class="expv1-note"><strong>'+esc(type==='fund'?memberDraftName(car,r.member)+' เติมเข้ากองกลาง':memberDraftName(car,r.from)+' → '+memberDraftName(car,r.to))+'</strong><span class="expv1-money">'+moneyDraft(r.amount)+'</span><small>'+esc(r.date)+' · รอยืนยัน · '+esc(r.note||'บันทึกในเครื่อง')+'</small></div>'
 ).join('')+'</div>':'<p class="expv1-muted">ยังไม่มีรายการบันทึกในเครื่อง</p>';
 if(tab==='overview')return '<section class="expv1-block"><h2>เงินกองกลางที่บันทึกในเครื่อง (รอยืนยัน)</h2><p class="expv1-muted">แยกจากเงินกองกลางจริงและยอดเคลียร์: ไม่มีข้อมูลรับรองจากบัญชีผู้ใช้</p><strong class="expv1-money">'+moneyDraft(fundTotal)+'</strong><p class="expv1-muted">'+funds.length+' รายการกองกลาง · '+transfers.length+' รายการโอนทดลอง</p><button type="button" class="expv1-action" data-expv1-cash="fund">+ บันทึกเงินกองกลาง</button></section>';
 return '<section class="expv1-block"><h2>รายการเงินกองกลางในเครื่อง (รอยืนยัน)</h2>'+list(funds,'fund')+'</section><section class="expv1-block"><h2>รายการโอนระหว่างสมาชิกในเครื่อง (รอยืนยัน)</h2>'+list(transfers,'transfer')+'<button type="button" class="expv1-action" data-expv1-cash="transfer">+ บันทึกรายการโอน</button></section>';
}

export function expenseMarkup(cars,selectedCarId){
 const demo=expenseVisualDemoMode(cars);
 const car=demo?EXPENSE_VISUAL_DEMO_CAR:(cars.find(c=>c.id===selectedCarId)||cars[0]);
 const group=car.group,period=group?.year&&group?.month&&group?.week?'พ.ศ. '+group.year+' · เดือน '+group.month+' · วีค '+group.week:'ยังไม่ได้กำหนดปี เดือน และวีค';
 return '<section class="shell-page pa-expense-page">'
 +(demo?'<div class="notice" role="note" id="paExpenseDemoBanner"><strong>ตัวอย่างหน้าค่าใช้จ่าย V2 · ข้อมูลสมมุติเท่านั้น</strong><p>แสดง 3 สมาชิกและ 4 รายการตัวอย่างเพื่อให้ตรวจ UI ได้ทันที ไม่ใช่คันรถหรือยอดเงินจริง และจะไม่บันทึกลงข้อมูลคันรถ</p><button type="button" data-page="cars">ไปหน้าคันรถของฉัน</button>'+(cars.length?'<a href="?view=expenses">ใช้คันรถที่บันทึกไว้</a>':'')+'</div>':'')
 +'<div class="pa-expense-head"><div><h1 tabindex="-1">คันรถ '+esc(car.name)+'</h1><p class="pa-expense-note">'+esc(period)+' · สมาชิก '+car.members.length+' คน</p><p class="pa-expense-note">'+(demo?'โหมดดูตัวอย่าง — ทดลองสลับแท็บและเปิดฟอร์มได้ แต่ไม่บันทึก':'ค่าใช้จ่าย V2 · ใช้คันรถและสมาชิกจากระบบเดียวกัน · ข้อมูลทดลองเฉพาะอุปกรณ์นี้')+'</p></div>'
 +(demo?'<span class="pa-expense-note">ดูตัวอย่าง UI</span>':'<label class="pa-expense-carselect">เลือกคันรถ<select id="paExpenseCar" aria-label="เลือกคันรถสำหรับค่าใช้จ่าย">'+cars.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===car.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>')+'</div>'
 +'<div id="paExpenseV1Frame" class="carGroupForm">'+expenseV1Frame()+'</div>'
 +'<dialog id="paExpenseFormWrap" class="pa-dialog pa-dialog--mobile-full carGroupForm pa-expense-form-dialog" aria-labelledby="paExpenseDialogTitle"><header class="pa-dialog-heading"><div><h2 id="paExpenseDialogTitle" tabindex="-1">เพิ่มค่าใช้จ่าย</h2><small>'+esc(car.name)+' · ข้อมูลทดลองเฉพาะอุปกรณ์นี้</small></div><button type="button" class="pa-button" id="expv1Back" aria-label="ปิดฟอร์มเพิ่มค่าใช้จ่าย">✕</button></header><div class="pa-expense pa-expense-dialog-body" id="paExpenseForm"><div class="pa-dialog-scroll" id="paExpenseFormScroll">'+APPROVED_MARKUP+'</div></div></dialog>'
 +'<section id="paExpenseAuxWrap" class="carGroupForm expv1-block pa-expense-aux-wrap" hidden>'+auxPreviewMarkup(car)+'</section>'
 +'<div id="paExpenseHistory" hidden>'+historyMarkup(car)+'</div></section>';
}
export function mountExpenseView(cars,selectedCarId,onChange){
 const demo=expenseVisualDemoMode(cars);
 const car=demo?EXPENSE_VISUAL_DEMO_CAR:(cars.find(c=>c.id===selectedCarId)||cars[0]);if(!car)return;
 const formRoot=document.querySelector('#paExpenseForm'),frame=document.querySelector('#paExpenseV1Frame');
 const formWrap=document.querySelector('#paExpenseFormWrap'),aux=document.querySelector('#paExpenseAuxWrap');
 const select=document.querySelector('#paExpenseCar');if(!formRoot||!frame||!formWrap||!aux)return;
 if(select)select.onchange=e=>onChange(e.target.value);
 let controller;
 const viewport=window.visualViewport;
 // Reuse original R3.9.5 buttons: dock them outside scrolling content, inside the same form root.
 const actions=formRoot.querySelector('.foot-actions');
 if(actions){actions.classList.add('pa-dialog-actions');formRoot.append(actions);}
 const scroll=formWrap.querySelector('#paExpenseFormScroll');
 const fitExpenseViewport=()=>{
  if(!formWrap.open||!viewport)return;
  formWrap.style.setProperty('--car-viewport-height',Math.floor(viewport.height)+'px');
  formWrap.style.setProperty('--car-viewport-top',Math.floor(viewport.offsetTop)+'px');
  const focused=document.activeElement;
  if(viewport.height<window.innerHeight-100&&scroll.contains(focused)){
   const input=focused.getBoundingClientRect(),area=scroll.getBoundingClientRect();
   if(input.bottom>area.bottom||input.top<area.top)focused.scrollIntoView({block:'nearest',behavior:'auto'});
  }
 };
 formWrap.addEventListener('close',()=>{
  viewport?.removeEventListener('resize',fitExpenseViewport);
  viewport?.removeEventListener('scroll',fitExpenseViewport);
  formWrap.style.removeProperty('--car-viewport-height');
  formWrap.style.removeProperty('--car-viewport-top');
 });
 const showFrame=(tab='expenses')=>{
  if(formWrap.open)formWrap.close();
  aux.hidden=true;frame.hidden=false;controller?.refresh();controller?.activate(tab);
  frame.scrollIntoView({block:'start',behavior:'auto'});
 };
 const openExpense=(type='expense')=>{
  aux.hidden=true;frame.hidden=false;
  if(type==='lodging'){
   const cat=formRoot.querySelector('#cat');
   if(cat){cat.value='ค่าห้องพัก';cat.dispatchEvent(new Event('change',{bubbles:true}));}
   const unit=formRoot.querySelector('#unit');if(unit)unit.value='คืน';
  }
  if(!formWrap.open){
   formWrap.showModal();
   viewport?.addEventListener('resize',fitExpenseViewport);
   viewport?.addEventListener('scroll',fitExpenseViewport);
  }
  fitExpenseViewport();
  scroll.scrollTop=0;
  requestAnimationFrame(()=>formWrap.querySelector('#paExpenseDialogTitle')?.focus({preventScroll:true}));
 };
 const openAux=type=>{
  if(type==='lodging'){openExpense('lodging');return;}
  if(type!=='fund'&&type!=='transfer')return;
  if(formWrap.open)formWrap.close();frame.hidden=true;aux.hidden=false;
  aux.querySelectorAll('[data-pa-aux-kind]').forEach(el=>{el.hidden=el.dataset.paAuxKind!==type;});
  aux.querySelector('#paExpenseAuxStatus').textContent=demo?'ข้อมูลตัวอย่างดูได้ แต่ไม่บันทึกข้อมูลใด ๆ':'รายการนี้เก็บเป็นแบบร่างในเครื่อง ไม่ยืนยันการเงินหรือสิทธิ์สมาชิก';
  aux.scrollIntoView({block:'start',behavior:'auto'});
  requestAnimationFrame(()=>aux.querySelector('[data-pa-aux-kind="'+type+'"] .pa-control')?.focus({preventScroll:true}));
 };
 const renderDrafts=(tab,panel)=>{
  const html=cashDraftPanel(car,tab,demo?[]:cashDraftsFor(car.id));
  if(html)panel.insertAdjacentHTML('beforeend',html);
 };
 controller=mountExpenseV1(frame,car,()=>demo?EXPENSE_VISUAL_DEMO_ROWS:savedFor(car.id),()=>openExpense(),openAux,renderDrafts);
 document.querySelector('#expv1Back').onclick=()=>showFrame('expenses');
 aux.querySelector('#paExpenseAuxBack').onclick=()=>showFrame('expenses');
 bootApprovedExpense(formRoot,car,()=>{if(demo)return;const region=document.querySelector('#paExpenseHistory');if(region)region.innerHTML=historyMarkup(car);showFrame('expenses')});
 formRoot.querySelector('#cancel')?.addEventListener('click',()=>showFrame('expenses'));
 if(demo){
   const save=formRoot.querySelector('#save');
   if(save){save.disabled=true;save.textContent='ตัวอย่างเท่านั้น · ไม่บันทึก';save.setAttribute('aria-label','ไม่สามารถบันทึกได้ในโหมดตัวอย่าง');}
   // A visual fixture never writes local notes or cash drafts.
   frame.addEventListener('submit',event=>{if(event.target?.id==='expv1NoteForm'){event.preventDefault();event.stopImmediatePropagation();const status=event.target.querySelector('#expv1NoteStatus');if(status)status.textContent='โหมดตัวอย่างไม่บันทึกโน้ต';}},true);
 }
 enhancePlainDateFields(formRoot);
 enhancePlainDateFields(aux);
 for(const form of aux.querySelectorAll('[data-pa-aux-kind]')){
  if(demo)form.querySelector('button[type=submit]').disabled=true;
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const status=aux.querySelector('#paExpenseAuxStatus');
   if(demo){status.textContent='โหมดตัวอย่างไม่บันทึกข้อมูล';return;}
   const data=new FormData(form),kind=form.dataset.paAuxKind,raw=String(data.get('amount')||'').trim();
   const amount=/^[1-9]\d*$/.test(raw)?Number(raw):NaN;
   const date=String(data.get('date')||''),note=String(data.get('note')||'').trim().slice(0,200);
   if(!Number.isSafeInteger(amount)||amount<=0||!/^\d{4}-\d\d-\d\d$/.test(date)){status.textContent='กรอกจำนวนเต็มบาทมากกว่า 0 และวันที่ที่ถูกต้อง';return;}
   const record={id:crypto.randomUUID(),carId:car.id,type:kind,amount,date,note,status:'DRAFT_NOT_VERIFIED',synthetic:true,createdAt:new Date().toISOString()};
   if(kind==='fund'){
    const member=Number(data.get('member'));
    if(!Number.isInteger(member)||member<0||member>=car.members.length){status.textContent='เลือกสมาชิกที่บันทึกเงินกองกลาง';return;}
    record.member=member;
   }else if(kind==='transfer'){
    const from=Number(data.get('from')),to=Number(data.get('to'));
    if(car.members.length<2||!Number.isInteger(from)||!Number.isInteger(to)||from===to||from<0||to<0||from>=car.members.length||to>=car.members.length){status.textContent='ผู้โอนและผู้รับต้องเป็นสมาชิกคนละคนในคันรถ';return;}
    record.from=from;record.to=to;
   }else return;
   try{
    const prior=cashDraftsFor(car.id),next=[...prior,record].slice(-500);
    localStorage.setItem(cashDraftKey(car.id),JSON.stringify(next));
    form.reset();
    // Keep the shared Thai text date in sync with the reset native ISO date.
    form.querySelector('[data-pa-date-native]')?.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent='บันทึกแบบร่างในเครื่องแล้ว · ยังไม่ใช่รายการที่ยืนยันทางการเงิน';
    showFrame(kind==='fund'?'overview':'settlement');
   }catch{status.textContent='ไม่สามารถบันทึกในเบราว์เซอร์นี้ได้ · ไม่มีการทำรายการเงินจริง';}
  });
 }
}
export function bootApprovedExpense(root,car,onSaved){const $=id=>root.querySelector('#'+id),ownerId=Number.isInteger(car.ownerIndex)?car.ownerIndex+1:0,names=car.members.map(m=>esc(m.name)),roles=names.map((_,j)=>(j===0?'ผู้นำคัน':'สมาชิก')+(j+1===ownerId?' / เจ้าของรถ':'')),balances=names.map(()=>0),cats=['ค่าห้องพัก','ค่าน้ำมัน','ค่าทางด่วน','ค่าดอกไม้','ค่าลงขัน','ค่าปรับกิจกรรม','ค่าของเยี่ยมลูกค้า','ค่าอาหาร','อื่นๆ'];const suggestions={'ค่าน้ำมัน':'เติมน้ำมัน','ค่าอาหาร':'ค่าอาหารทีม','ค่าห้องพัก':'ค่าห้องพัก','ค่าทางด่วน':'ค่าทางด่วน','ค่าดอกไม้':'ค่าดอกไม้'};const i=v=>/^\d+$/.test(String(v??''))&&Number.isSafeInteger(Number(v))?Number(v):null,m=v=>Number.isFinite(v)?new Intl.NumberFormat('th-TH').format(v):'—';let s={selected:names.map((_,j)=>j+1),cat:'ค่าอาหาร',method:'equal',payer:'pool',multi:false,pays:{},manual:{},percents:{},roundMode:'auto',roundReceiver:'',extra:{},roundOpen:false};const fmtNet=v=>(v>=0?'รับคืน ':'จ่ายเพิ่ม ')+m(Math.abs(v))+' บาท';function raw(){const q=i($('qty').value),p=i($('price').value);return q!==null&&q>0&&p!==null&&Number.isSafeInteger(q*p)?q*p:null}function notify(msg,kind=''){ $('notice').innerHTML=msg?`<div class="status ${kind}">${msg}</div>`:''}function clearSplit(cat=s.cat){s.method=cat==='ค่าน้ำมัน'?'fuel':'equal';s.manual={};s.percents={};s.roundMode='auto';s.roundReceiver='';s.extra={};s.roundOpen=false;notify('')}function lower(){return [...s.selected].sort((a,b)=>a-b)[0]}function compute(){const a=raw(),ids=[...s.selected].sort((a,b)=>a-b),n=ids.length,b={},bonus={},out={};if(a===null||a<1)return{ok:false,msg:'กรอกราคา/หน่วยและจำนวนเป็นจำนวนเต็มบาทมากกว่า 0'};if(a>Number.MAX_SAFE_INTEGER/100)return{ok:false,msg:'ยอดเกินความแม่นยำของตัวอย่าง'};if(!n)return{ok:false,msg:'เลือกผู้รับผิดชอบอย่างน้อย 1 คน'};if(s.method==='manual'){let total=0;for(const id of ids){const v=i(s.manual[id]);if(v===null)return{ok:false,msg:'กรอกจำนวนเต็มบาทของทุกคนให้ครบ'};out[id]=v;total+=v}return{ok:total===a,msg:total===a?'':'ยอดแบ่งไม่ตรง',out,sum:total,rem:0}}if(s.cat==='ค่าน้ำมัน'&&ids.includes(ownerId)&&(s.method==='equal'||s.method==='percent'))return{ok:false,msg:'เลือกปุ่มได้ แต่กฎน้ำมันที่มีเจ้าของรถใช้วิธีค่าน้ำมันหรือระบุยอดเอง'};if(n===1){out[ids[0]]=a;return{ok:true,out,sum:a,rem:0,b:{[ids[0]]:a},bonus:{[ids[0]]:0},rule:'สมาชิกคนเดียว รับผิดชอบทั้งหมด'}}ids.forEach(id=>bonus[id]=0);let rule='';if(s.cat==='ค่าน้ำมัน'&&s.method==='fuel'&&ids.includes(ownerId)){const others=ids.filter(id=>id!==ownerId);if(n===2){const passenger=Math.floor((70*a+50)/100);b[ownerId]=Math.floor(30*a/100);b[others[0]]=Math.floor(70*a/100);bonus[ownerId]=a-passenger-b[ownerId];bonus[others[0]]=passenger-b[others[0]];rule='น้ำมัน 2 คน: เจ้าของรถ 30% / อีกคน 70% (ครึ่งขึ้น)'}else if(n===3){b[ownerId]=Math.floor(16*a/100);others.forEach(id=>b[id]=Math.floor(42*a/100));const r=a-Object.values(b).reduce((x,y)=>x+y,0);if(r===1)bonus[ownerId]=1;else if(r===2)others.forEach(id=>bonus[id]=1);rule='น้ำมัน 3 คน: 16 / 42 / 42 พร้อมข้อยกเว้นเศษ'}else{b[ownerId]=0;others.forEach(id=>b[id]=Math.floor(a/3));bonus[ownerId]=a-Object.values(b).reduce((x,y)=>x+y,0);rule='น้ำมัน 4 คน: เจ้าของรถรับเศษเฉพาะ 0–2 บาท'}}else if(s.method==='percent'){const percentages=ids.map(id=>i(s.percents[id]));if(percentages.some(v=>v===null||v>100)||percentages.reduce((x,y)=>x+y,0)!==100)return{ok:false,msg:'เปอร์เซ็นต์ต้องเป็นจำนวนเต็มรวม 100%'};ids.forEach((id,j)=>b[id]=Math.floor(a*percentages[j]/100));rule='เปอร์เซ็นต์: ปัดลงก่อน แล้วผู้รับเศษเป็นสมาชิกอันดับน้อยที่สุดที่เลือก'}else{ids.forEach(id=>b[id]=Math.floor(a/n));rule='แบ่งเท่ากัน: เศษเข้าผู้นำคัน หรือสมาชิกอันดับน้อยที่สุดที่เลือก'}const rem=a-Object.values(b).reduce((x,y)=>x+y,0);if(!(s.cat==='ค่าน้ำมัน'&&s.method==='fuel'&&ids.includes(ownerId)))bonus[lower()]=rem;const add={...bonus};if(s.roundMode==='choose'&&rem>0){ids.forEach(id=>add[id]=0);if(ids.includes(Number(s.roundReceiver)))add[Number(s.roundReceiver)]=rem}else if(s.roundMode==='custom'&&rem>0)ids.forEach(id=>add[id]=i(s.extra[id])??0);ids.forEach(id=>out[id]=b[id]+(add[id]??0));const sum=Object.values(out).reduce((x,y)=>x+y,0),need=s.roundMode==='choose'&&rem>0&&!ids.includes(Number(s.roundReceiver));return {ok:sum===a&&!need,msg:need?'กรุณาเลือกผู้รับเศษ':sum===a?'':'ยอดเศษยังจัดสรรไม่ครบ',out,sum,rem,b,bonus,rule}}function methodView(){ $('methods').innerHTML=[['equal','เท่ากัน'],['manual','ระบุยอด'],['percent','เปอร์เซ็นต์'],['fuel','ค่าน้ำมัน']].map(([v,l])=>`<button class="method ${s.method===v?'active':''}" data-method="${v}" ${v==='fuel'&&s.cat!=='ค่าน้ำมัน'?'disabled aria-disabled="true" title="เปิดได้เฉพาะหมวดค่าน้ำมัน"':''}>${l}</button>`).join('');$('methodHint').textContent=s.cat!=='ค่าน้ำมัน'?'ปุ่มค่าน้ำมันเปิดได้เฉพาะหมวดค่าน้ำมัน · ค่าใช้จ่ายทั่วไปแบ่งเท่ากัน เศษเข้าผู้นำคันหรือสมาชิกอันดับน้อยสุด':s.selected.includes(3)?'ค่าน้ำมัน Expense Split R1 · มีเจ้าของรถร่วมรับผิดชอบ ใช้สูตรน้ำมันตามจำนวนสมาชิก':'ค่าน้ำมัน Expense Split R1 · ไม่มีเจ้าของรถในผู้รับผิดชอบ จึงแบ่งเท่ากัน และจัดเศษให้ผู้นำคันหรือสมาชิกอันดับน้อยสุด'}function memberView(){ $('memberCount').textContent=s.selected.length+'/'+names.length+' คน';$('memberGrid').innerHTML=names.map((n,j)=>{const id=j+1;return `<label class="member ${s.selected.includes(id)?'selected':''}"><input type="checkbox" data-member="${id}" ${s.selected.includes(id)?'checked':''}><span class="avatar">${String(j+1)}</span><span><strong>${n}</strong><small>${roles[j]}</small></span></label>`}).join('')}function paidRows(){ $('payer').innerHTML='<option value="pool">กองกลาง — ยังไม่เชื่อมยอดจริง</option>'+names.map((n,j)=>`<option value="${j+1}">${n} — ${fmtNet(balances[j])}</option>`).join('');$('payer').value=s.payer;$('singleBox').style.display=s.multi?'none':'block';$('multiBox').style.display=s.multi?'block':'none';$('multi').checked=s.multi;$('payRows').innerHTML=[...names.map((n,j)=>({id:j+1,n,desc:fmtNet(balances[j])})),{id:'pool',n:'กองกลาง',desc:'ยังไม่เชื่อมยอดจริง'}].map(p=>`<div class="line"><div><strong>${p.n}</strong><small>${p.desc}</small></div><input class="field pa-control pa-expense-pay-width" inputmode="numeric" data-pay="${p.id}" value="${s.pays[p.id]??''}" placeholder="0"></div>`).join('');updatePaid()}function updatePaid(){const c=compute(),a=raw(),poolPaid=s.multi?(i(s.pays.pool)??0):s.payer==='pool'?(a??0):0;let paid=0;for(const key of ['pool',...names.map((_,j)=>j+1)])paid+=i(s.pays[key])??0;$('poolAfter').textContent='— (ยังไม่เชื่อมยอดจริง)';$('paidSum').textContent=m(paid)+' / '+m(a)+' บาท';$('balanceRows').innerHTML=names.map((n,j)=>{const id=j+1,net=balances[j]+(s.multi?(i(s.pays[id])??0):s.payer===String(id)?a??0:0)-(c.out?.[id]??0);return `<div class="line"><span><strong>${n}</strong><small>${fmtNet(balances[j])}</small></span><span class="pa-expense-balance-note">หลังรายการ<br>${c.out?fmtNet(net):'รอยอดแบ่ง'}</span></div>`}).join('')}function splitInputs(){if(s.method!=='manual'&&s.method!=='percent'){$('extraRows').innerHTML='';return}const manual=s.method==='manual';$('extraRows').innerHTML='<div class="summary"><strong>'+(manual?'ระบุยอดรายคน':'เปอร์เซ็นต์รายคน')+'</strong>'+[...s.selected].sort((a,b)=>a-b).map(id=>`<div class="line"><span>${names[id-1]}</span><input class="field pa-control pa-expense-alloc-width" inputmode="numeric" data-alloc="${id}" value="${manual?(s.manual[id]??''):(s.percents[id]??'')}" placeholder="${manual?'บาท':'%'}"></div>`).join('')+'</div>'}function roundInputs(c){if(!s.roundOpen)return;$('roundModes').innerHTML=[['auto','ตามกฎ'],['choose','เลือกผู้รับ'],['custom','กระจายเอง']].map(([v,t])=>`<button class="btn sm ${s.roundMode===v?'active':''}" data-round="${v}">${t}</button>`).join('');const ids=[...s.selected].sort((a,b)=>a-b);if(s.roundMode==='choose')$('roundInputs').innerHTML='<label class="label">ผู้รับเศษทั้งหมด</label><select id="recipient" class="field pa-control"><option value="">เลือกผู้รับ</option>'+ids.map(id=>`<option ${s.roundReceiver===String(id)?'selected':''} value="${id}">${names[id-1]}</option>`).join('')+'</select>';else if(s.roundMode==='custom'){const used=ids.reduce((x,id)=>x+(i(s.extra[id])??0),0),remaining=Math.max(0,c.rem-used);$('roundInputs').innerHTML=`<div class="line"><span>เศษที่จัดสรร</span><strong>${used} / ${c.rem} บาท</strong></div>`+ids.map(id=>`<div class="roundrow"><span>${names[id-1]}</span><span class="round-actions"><button class="btn sm" data-minus="${id}" ${(i(s.extra[id])??0)===0?'disabled':''}>−</button><strong>${i(s.extra[id])??0}</strong><button class="btn sm" data-plus="${id}" ${remaining===0?'disabled':''}>+</button></span></div>`).join('')+`<div class="status ${remaining===0?'good':''}">${remaining===0?'จัดสรรครบแล้ว: ปุ่ม + ปิดทุกคน':'เหลือเศษให้จัดสรร '+remaining+' บาท'}</div>`}else $('roundInputs').innerHTML='<div class="hint">ใช้กฎค่าน้ำมันหรือผู้นำคัน / ลำดับสมาชิกที่อนุมัติ</div>'}function renderFuelReminder(c){const box=$('fuelRuleReminder');if(s.cat!=='ค่าน้ำมัน'){box.style.display='none';box.textContent='';return}const ids=[...s.selected].sort((a,b)=>a-b),n=ids.length,hasOwner=ids.includes(ownerId),lead=ids.includes(1)?'ผู้นำคัน ('+names[0]+')':'สมาชิกอันดับน้อยที่สุดที่เลือก ('+(ids.length?names[ids[0]-1]:'—')+')';const baseInfo='<strong>🚙 วิธีแบ่งค่าน้ำมันตามจำนวนคน</strong><div>2 คน: เจ้าของรถ 30% · อีกคน 70%</div><div>3 คน: เจ้าของรถ 16% · อีกสองคนคนละ 42%</div><div>4 คน: เจ้าของรถ 0% · อีกสามคนหารเท่ากัน (เจ้าของรถรับเศษ 0–2 บาท)</div>';let current='';if(!n)current='ยังไม่ได้เลือกผู้รับผิดชอบ';else if(s.method!=='fuel')current='ตอนนี้ใช้วิธี '+({equal:'เท่ากัน',manual:'ระบุยอด',percent:'เปอร์เซ็นต์'}[s.method]||'อื่นๆ')+' ไม่ได้ใช้สูตรค่าน้ำมันอัตโนมัติ';else if(n===1)current='เลือก 1 คน: รับผิดชอบยอดทั้งหมด 100%';else if(!hasOwner)current='เลือก '+n+' คน แต่ไม่ได้เลือกเจ้าของรถของคันนี้: แบ่งเท่ากัน · เศษให้'+lead;else if(n===2)current='เลือก 2 คน มีเจ้าของรถ: 30% / 70% · อีกคนปัดแบบครึ่งขึ้น';else if(n===3)current='เลือก 3 คน มีเจ้าของรถ: 16% / 42% / 42% · เศษ 1 บาทให้เจ้าของรถ, เศษ 2 บาทให้คนอื่นคนละ 1';else current='เลือก 4 คน มีเจ้าของรถ: เจ้าของรถรับเฉพาะเศษ 0–2 บาท · อีกสามคนหารเท่ากัน';box.innerHTML=baseInfo+'<div class="rule-current">'+current+'</div><div class="rule-help">กฎเศษเงินอัตโนมัติยังปรับผู้รับหรือกระจายเองได้ และยอดแบ่งต้องรวมเท่ากับยอดทั้งหมด</div>';box.style.display='block'}function renderSplit(){const c=compute(),a=raw();$('grandTotal').textContent=m(a)+' บาท';methodView();memberView();splitInputs();renderFuelReminder(c);$('shareRows').innerHTML=c.out?[...s.selected].sort((a,b)=>a-b).map(id=>`<div class="line"><span>${names[id-1]}</span><strong class="value">${m(c.out[id])} บาท</strong></div>`).join(''):`<div class="status bad">${c.msg}</div>`;$('shareTotal').textContent=m(c.sum)+' / '+m(a)+' บาท';$('shareStatus').innerHTML=c.out?`<div class="status ${c.ok?'good':'bad'}">${c.ok?'✓ ยอดแบ่งครบ · '+(c.rem?'มีเศษ '+c.rem+' บาท':'ไม่มีเศษ'):c.msg}</div>`:'';$('roundWrap').style.display=c.b&&c.rem>0?'block':'none';$('roundBox').style.display=s.roundOpen?'block':'none';if(c.b&&c.rem>0)roundInputs(c);updatePaid()}function render(){ $('cat').value=s.cat;$('roundToggle').textContent='⚖ จัดการเศษเงิน '+(s.roundOpen?'▴':'▾');paidRows();renderSplit()}function resetOverrides(){s.manual={};s.percents={};s.roundMode='auto';s.roundReceiver='';s.extra={};s.roundOpen=false;notify('เปลี่ยนข้อมูล: คำนวณยอดและจัดการเศษใหม่ (F25)')}
$('cat').innerHTML=cats.map(v=>`<option ${v===s.cat?'selected':''}>${v}</option>`).join('');$('memberGrid').addEventListener('change',e=>{if(e.target.dataset.member){const id=Number(e.target.dataset.member);s.selected=e.target.checked?[...s.selected.filter(v=>v!==id),id]:s.selected.filter(v=>v!==id);resetOverrides();render()}});root.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.method){const mth=t.dataset.method;if(mth==='fuel'&&s.cat!=='ค่าน้ำมัน')return;const c=compute();if(mth==='manual')s.manual=Object.fromEntries(s.selected.map(id=>[id,String(c.out?.[id]??'')]));if(mth==='percent')s.percents={};s.method=mth;s.roundMode='auto';s.extra={};s.roundOpen=false;render()}if(t.dataset.round){s.roundMode=t.dataset.round;s.extra={};s.roundReceiver='';render()}if(t.dataset.plus){const id=Number(t.dataset.plus),c=compute();const used=s.selected.reduce((sum,k)=>sum+(i(s.extra[k])??0),0);if(used<(c.rem??0)){s.extra[id]=(i(s.extra[id])??0)+1;renderSplit()}}if(t.dataset.minus){const id=Number(t.dataset.minus);s.extra[id]=Math.max(0,(i(s.extra[id])??0)-1);renderSplit()}});root.addEventListener('input',e=>{const t=e.target;if(['price','qty'].includes(t.id)){resetOverrides();renderSplit()}if(t.id==='name'){const pairs=[['น้ำมัน','ค่าน้ำมัน'],['อาหาร','ค่าอาหาร'],['ทางด่วน','ค่าทางด่วน'],['ห้องพัก','ค่าห้องพัก']];const found=pairs.find(([k])=>t.value.includes(k));if(found&&s.cat!==found[1]){s.cat=found[1];clearSplit(s.cat);render()}}if(t.id==='calcExpr')updateCalc();if(t.dataset.pay){s.pays[t.dataset.pay]=t.value;updatePaid()}if(t.dataset.alloc){const id=Number(t.dataset.alloc);if(s.method==='manual')s.manual[id]=t.value;else s.percents[id]=t.value;renderSplit()}});root.addEventListener('change',e=>{const t=e.target;if(t.id==='cat'){s.cat=t.value;$('name').value=s.cat==='อื่นๆ'?'':s.cat;s.method=s.cat==='ค่าน้ำมัน'?'fuel':'equal';resetOverrides();render()}if(t.id==='payer'){s.payer=t.value;updatePaid()}if(t.id==='multi'){s.multi=t.checked;render()}if(t.id==='recipient'){s.roundReceiver=t.value;renderSplit()}});$('selectAll').onclick=()=>{s.selected=names.map((_,j)=>j+1);resetOverrides();render()};$('clearAll').onclick=()=>{s.selected=[];resetOverrides();render()};$('roundToggle').onclick=()=>{s.roundOpen=!s.roundOpen;render()};$('cancel').onclick=()=>{s.selected=names.map((_,j)=>j+1);s.cat='';s.method='equal';s.payer='pool';s.multi=false;s.pays={};$('name').value='';$('price').value='';$('qty').value='1';$('unit').value='งาน';$('note').value='';s.cat='ค่าอาหาร';resetOverrides();render();notify('ยกเลิกรายการจำลองและกลับค่าเริ่มต้น','good')};$('save').onclick=()=>{const c=compute(),a=raw();const err=!$('name').value.trim()?'กรุณากรอกชื่อรายการ':!c.ok?c.msg:s.multi?'การจ่ายหลายคนยังอยู่ระหว่างพัฒนา ไม่บันทึกข้อมูลผิด':'',date=$('date').value;if(err){notify('⚠ '+err,'bad');return}if(!date){notify('⚠ กรุณาเลือกวันที่','bad');return}const record={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''),carId:car.id,name:$('name').value.trim(),category:s.cat,amount:a,quantity:Number($('qty').value),unit:$('unit').value,date,time:$('time').value,paymentMethod:$('paymentMethod').value,note:$('note').value,payer:s.payer,memberShares:s.selected.map(id=>({memberIndex:id-1,memberName:car.members[id-1].name,amount:c.out[id]})),splitMethod:s.method,createdAt:new Date().toISOString(),synthetic:true};try{const key=expenseKey(car.id),existing=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(existing))throw Error('INVALID_STORE');localStorage.setItem(key,JSON.stringify([...existing,record]));notify('✓ บันทึกรายการทดลอง '+m(a)+' บาท ในเบราว์เซอร์นี้แล้ว','good');onSaved()}catch{notify('⚠ ไม่สามารถบันทึกในเครื่องนี้ได้','bad')}};$('receipt').onclick=()=>{ $('receipt').textContent='✓ ใบเสร็จจำลอง (ไม่มีไฟล์จริง)'};$('calcButton').onclick=()=>{const calc=$('calculator');calc.style.display=getComputedStyle(calc).display==='none'?'block':'none';$('calcExpr').value=$('price').value;updateCalc()};function calcParse(raw){let x=String(raw||'').replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');if(!/^\d+(?:[+*/-]\d+)*$/.test(x))return null;const t=x.match(/\d+|[+*/-]/g)||[];const vals=[Number(t[0])],ops=[];for(let k=1;k<t.length;k+=2){const op=t[k],v=Number(t[k+1]);if(op==='*'||op==='/'){const last=vals.pop();vals.push(op==='*'?last*v:last/v)}else{ops.push(op);vals.push(v)}}let v=vals[0];for(let k=0;k<ops.length;k++)v+=ops[k]==='+'?vals[k+1]:-vals[k+1];return Number.isSafeInteger(v)&&v>=0?v:null}function updateCalc(){const v=calcParse($('calcExpr').value);$('calcResult').textContent=m(v)+' บาท'}$('calcKeys').innerHTML=['7','8','9','÷','4','5','6','×','1','2','3','−','C','0','⌫','+'].map(k=>`<button class="btn sm" data-key="${k}">${k}</button>`).join('');$('calcKeys').addEventListener('click',e=>{const t=e.target.closest('[data-key]');if(!t)return;const k=t.dataset.key,x=$('calcExpr');x.value=k==='C'?'':k==='⌫'?x.value.slice(0,-1):x.value+k;updateCalc()});$('calcApply').onclick=()=>{const v=calcParse($('calcExpr').value);if(v===null){notify('เครื่องคิดเลขต้องได้จำนวนเต็มบาท','bad');return}$('price').value=String(v);$('calculator').style.display='none';resetOverrides();renderSplit()};const now=new Date(),pad=n=>String(n).padStart(2,'0');$('date').value=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());$('time').value=pad(now.getHours())+':'+pad(now.getMinutes());render();}