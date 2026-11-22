// Public synthetic UI demonstration ONLY. No identity, API, ACL, storage, or private data.
const roleLabels = Object.freeze({admin:'Admin',agent:'ตัวแทน',unit_manager:'ผู้จัดการหน่วย',director:'ผู้อำนวยการ',secretary:'เลขา'});
// Owner-approved display guidance only; not an authorization engine or an actual RBAC grant.
const rolePolicy = Object.freeze([
  {role:'admin',scope:'จัดการผู้ใช้และกำหนดบทบาท',boundary:'ต้องยืนยันตัวตน Owner และ MFA ก่อนเปิดสิทธิ์จริง'},
  {role:'agent',scope:'ดูและจัดการข้อมูลงานของตนเอง',boundary:'บทบาทเริ่มต้นสำหรับผู้สมัคร; ไม่เปิดข้อมูลคนอื่น'},
  {role:'unit_manager',scope:'ดูภาพรวมผลงานตัวแทนในหน่วยที่รับผิดชอบ',boundary:'ไม่ได้รับสิทธิ์แก้ไขข้อมูลลูกค้าหรือกรมธรรม์ของสมาชิก'},
  {role:'director',scope:'ดูผลงานหลายหน่วยที่ได้รับมอบหมายให้กำกับ',boundary:'ดูข้อมูลเฉพาะหน่วยที่กำกับ; ไม่แก้ข้อมูลผู้อื่น'},
  {role:'secretary',scope:'ดูข้อมูลของตนเองเท่านั้น',boundary:'สิทธิ์ดูข้อมูลผู้อื่นยังไม่อนุมัติ'}
]);
const baseUsers = Object.freeze([
  {id:'synthetic-user-000',name:'เจ้าของระบบ (ตัวอย่าง)',role:'admin',unit:'ส่วนกลาง'},
  {id:'synthetic-user-001',name:'ผู้ใช้ตัวอย่าง A',role:'agent',unit:'หน่วย 01'},
  {id:'synthetic-user-002',name:'ผู้ใช้ตัวอย่าง B',role:'unit_manager',unit:'หน่วย 01'},
  {id:'synthetic-user-003',name:'ผู้ใช้ตัวอย่าง C',role:'director',unit:'หน่วย 01–02 (กำกับ)'},
  {id:'synthetic-user-004',name:'ผู้ใช้ตัวอย่าง D',role:'secretary',unit:'หน่วย 02'}
]);
const baseEvents = Object.freeze([
  {time:'21/11/69 09:15',actor:'Admin (จำลอง)',event:'user.role_changed',target:'synthetic-user-002',result:'ตัวอย่าง'},
  {time:'21/11/69 09:12',actor:'ผู้ใช้ตัวอย่าง A',event:'auth.login_success',target:'Session',result:'ตัวอย่าง'},
  {time:'21/11/69 09:11',actor:'ไม่ทราบตัวตน',event:'auth.login_failure',target:'Session',result:'ตัวอย่าง'},
  {time:'21/11/69 08:40',actor:'ผู้ใช้ตัวอย่าง D',event:'access.denied',target:'หน่วยอื่น',result:'ตัวอย่าง'}
]);
const baseSessions = Object.freeze([
  {time:'21/11/69 09:12',actor:'ผู้ใช้ตัวอย่าง A',action:'เข้าสู่ระบบ',device:'มือถือ · iOS Safari (สมมติ)',result:'ตัวอย่าง'},
  {time:'21/11/69 09:11',actor:'ไม่ทราบตัวตน',action:'เข้าสู่ระบบไม่สำเร็จ',device:'Desktop · Chrome (สมมติ)',result:'ตัวอย่าง'}
]);
const situations = Object.freeze({
  ready:['ROSTER_READY','รายการผู้ใช้ตัวอย่างพร้อมทดลอง','ไม่มีบัญชีหรือสิทธิ์จริง'],
  identity_loading:['IDENTITY_LOADING','กำลังตรวจสอบตัวตน (จำลอง)','ยังไม่เปิดเผยรายชื่อ'],
  unauthenticated:['UNAUTHENTICATED','Session ไม่พร้อมใช้งาน (จำลอง)','รายการถูกซ่อน; การเข้าสู่ระบบจริงยังไม่มี'],
  forbidden:['FORBIDDEN','ไม่มีสิทธิ์เปิดรายชื่อ (จำลอง 403)','ซ่อนรายการและปุ่มเปลี่ยนบทบาท'],
  roster_loading:['ROSTER_LOADING','กำลังโหลดข้อมูล (จำลอง)','ยังไม่เปิดเผยรายชื่อ'],
  empty:['ROSTER_EMPTY','ไม่พบผู้ใช้ในระบบจำลอง','แสดงสถานะข้อมูลว่าง'],
  label_pending:['IDENTITY_LABEL_PENDING','รอยืนยันชื่อแสดง','ปิดปุ่มเปลี่ยนบทบาทจนระบุตัวตนได้'],
  network_error:['NETWORK_ERROR','เครือข่ายขัดข้อง (จำลอง)','ไม่ส่ง HTTP ไปภายนอก'],
  server_error:['SERVER_ERROR','Server ขัดข้อง (จำลอง)','ไม่มี Backend จริง'],
  invalid_cursor:['INVALID_CURSOR','Cursor หน้าถัดไปผิดพลาด (จำลอง)','ไม่วนโหลดซ้ำอัตโนมัติ'],
  conflict:['ROSTER_READY','ทดลองข้อมูลเปลี่ยนระหว่างบันทึก','การแก้บทบาทจะจำลอง 409 Conflict'],
  save_failure:['ROSTER_READY','ทดลองบันทึกไม่สำเร็จ','การแก้บทบาทจะจำลอง Server error']
});
const situationLabels = Object.freeze({
  ready:'รายการพร้อมใช้งาน (Admin)', identity_loading:'กำลังตรวจสอบตัวตน',
  unauthenticated:'Session หมดอายุ / ยังไม่ Login', forbidden:'ไม่ใช่ Admin (403)',
  roster_loading:'กำลังโหลดรายการ', empty:'ไม่มีผู้ใช้งาน',
  label_pending:'รอยืนยันชื่อแสดง', network_error:'เครือข่ายขัดข้อง',
  server_error:'Server ขัดข้อง', invalid_cursor:'หน้าถัดไปไม่ถูกต้อง',
  conflict:'ข้อมูลเปลี่ยนระหว่างบันทึก', save_failure:'บันทึกไม่สำเร็จ'
});
const tabs = Object.freeze({users:'ผู้ใช้และบทบาท',permissions:'สิทธิ์ตามบทบาท',sessions:'ประวัติ Login',audit:'Audit Log'});
const html = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {users:baseUsers.map(x=>({...x})),events:baseEvents.map(x=>({...x})),tab:'users',scenario:'ready',search:'',more:3,busy:false,detail:null,token:0};
const visible = () => ['ready','empty','label_pending','conflict','save_failure','invalid_cursor'].includes(state.scenario);
const warning = () => state.detail || situations[state.scenario];
const headRow = values => `<tr>${values.map(x=>`<th scope="col">${html(x)}</th>`).join('')}</tr>`;
const cells = (values,labels) => `<tr>${values.map((v,i)=>`<td data-label="${html(labels[i])}">${html(v)}</td>`).join('')}</tr>`;
function usersMarkup() {
  if(!visible()) return '<p class="pa-admin-hidden" role="status">ข้อมูลตัวอย่างถูกซ่อนในสถานะนี้</p>';
  if(state.scenario==='empty') return '<p class="pa-admin-empty" role="status">ยังไม่มีผู้ใช้งานตัวอย่าง</p>';
  const q = state.search.trim().toLocaleLowerCase('th');
  const list = state.users.filter(u=>[u.id,u.name,roleLabels[u.role],u.unit].join(' ').toLocaleLowerCase('th').includes(q));
  const shown = q?list:list.slice(0,state.more);
  const labels=['รหัสผู้ใช้','ชื่อแสดง','บทบาท','หน่วยงาน','เปลี่ยนบทบาท','ดำเนินการ'];
  const rows = shown.map(u=>{
    const blocked = u.role==='admin'||state.busy||state.scenario==='label_pending';
    const options=Object.keys(roleLabels).filter(r=>r!=='admin').map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${roleLabels[r]}</option>`).join('');
    const edit = u.role==='admin' ? '<span class="pa-admin-locked">บัญชี Admin · อ่านอย่างเดียว</span>' : `<select data-admin-pick="${html(u.id)}" aria-label="บทบาท ${html(u.id)}" ${blocked?'disabled':''}>${options}</select>`;
    const save = u.role==='admin' ? '—' : `<button type="button" data-admin-save="${html(u.id)}" ${blocked?'disabled':''}>บันทึก (จำลอง)</button>`;
    return `<tr><td data-label="รหัสผู้ใช้" class="pa-admin-id">${html(u.id)}</td><td data-label="ชื่อแสดง">${state.scenario==='label_pending'?'รอยืนยันชื่อแสดง':html(u.name)}</td><td data-label="บทบาท"><strong>${html(roleLabels[u.role])}</strong></td><td data-label="หน่วยงาน">${html(u.unit)}</td><td data-label="เปลี่ยนบทบาท">${edit}</td><td data-label="ดำเนินการ">${save}</td></tr>`;
  }).join('');
  return `<label class="pa-admin-search">ค้นหาจากข้อมูลสมมติ<input id="pa-admin-search" type="search" value="${html(state.search)}" placeholder="รหัส ชื่อ บทบาท หรือหน่วยงาน" autocomplete="off" ${state.busy?'disabled':''}></label>
  <div class="pa-admin-tablewrap"><table><thead>${headRow(labels)}</thead><tbody>${rows||'<tr><td colspan="6">ไม่พบรายการที่ค้นหา</td></tr>'}</tbody></table></div>
  <div class="pa-admin-pagination"><span>${shown.length} จาก ${list.length} รายการ</span><button type="button" data-admin-action="more" ${state.busy||!!q||shown.length>=list.length?'disabled':''}>โหลดเพิ่ม (จำลอง)</button></div>`;
}
function permissionsMarkup() {
  const labels=['บทบาท','สิทธิ์ตามแบบที่อนุมัติ','ขอบเขต / เงื่อนไข'];
  const rows=rolePolicy.map(p=>cells([roleLabels[p.role],p.scope,p.boundary],labels)).join('');
  return `<div class="pa-admin-tablewrap"><table><thead>${headRow(labels)}</thead><tbody>${rows}</tbody></table></div>
    <p class="pa-admin-locked">แสดงกติกาของหน้าจอทดลองเท่านั้น · ไม่มีการให้สิทธิ์จริง · การควบคุมสิทธิ์ต้องตรวจที่ Backend ทุกคำขอ</p>`;
}
function sessionsMarkup() { const labels=['เวลา','ผู้ใช้','เหตุการณ์','อุปกรณ์/เบราว์เซอร์','ผลลัพธ์']; return `<div class="pa-admin-tablewrap"><table><thead>${headRow(labels)}</thead><tbody>${baseSessions.map(x=>cells(Object.values(x),labels)).join('')}</tbody></table></div><p>ข้อมูลอุปกรณ์เป็นตัวอย่าง ไม่ใช่ Hardware ID จริง</p>`; }
function auditMarkup() { const labels=['เวลา','ผู้ดำเนินการ','เหตุการณ์','เป้าหมาย','ผลลัพธ์']; return `<div class="pa-admin-tablewrap"><table><thead>${headRow(labels)}</thead><tbody>${state.events.map(x=>cells(Object.values(x),labels)).join('')}</tbody></table></div><p>ไม่มี Password, Token หรือข้อมูลลูกค้าใน Log ตัวอย่าง</p>`; }
function viewMarkup() {
  const note=warning(); const status=note[0];
  const safeTab=visible()?state.tab:'users';
  return `<div class="pa-admin-head"><div><p class="pa-admin-kicker">ระบบจัดการ · DEMO ONLY</p><h1 tabindex="-1">Admin (ทดลองใน Dashboard เดิม)</h1><p>ไม่มีบัญชี Admin จริง · ไม่เชื่อม HTTP / Real Auth / Database</p></div><span class="pa-admin-tag">SYNTHETIC ONLY</span></div>
  <div class="pa-admin-notice" role="status" aria-live="polite"><strong>${html(status)}</strong><span>${html(note[1])} · ${html(note[2])}</span></div>
  <div class="pa-admin-controls"><label>ทดลองสถานะ UI<select id="pa-admin-scenario">${Object.entries(situationLabels).map(([k,v])=>`<option value="${k}" ${k===state.scenario?'selected':''}>${html(v)}</option>`).join('')}</select></label><button type="button" data-admin-action="reset">รีเซ็ตข้อมูลตัวอย่าง</button></div>
  ${visible()?`<div class="pa-admin-metrics"><div><b>${state.users.length}</b><span>บัญชีตัวอย่าง</span></div><div><b>5</b><span>บทบาท</span></div><div><b>${state.events.length}</b><span>เหตุการณ์ตัวอย่าง</span></div></div>`:''}
  <div class="pa-admin-tabs" role="tablist" aria-label="ข้อมูลจัดการ (จำลอง)">${Object.entries(tabs).map(([key,label])=>`<button type="button" role="tab" data-admin-tab="${key}" aria-selected="${safeTab===key}" ${!visible()?'disabled':''}>${label}</button>`).join('')}</div>
  <div class="pa-admin-section" role="tabpanel" aria-label="${html(tabs[safeTab])}">${!visible()?'<p class="pa-admin-hidden">ข้อมูลถูกซ่อน กรุณากลับสถานะ Admin ทดลอง</p>':safeTab==='users'?usersMarkup():safeTab==='permissions'?permissionsMarkup():safeTab==='sessions'?sessionsMarkup():auditMarkup()}</div>
  <p class="pa-admin-footer">เมนูและ Theme ใช้ร่วมกับ Dashboard เดิม · ข้อมูลทั้งหมดเป็นตัวอย่างและรีเซ็ตเมื่อโหลดหน้าใหม่ · สิทธิ์จริงต้องตรวจบน Server</p>`;
}
export function adminDemoMarkup() { return `<section id="pa-admin-demo" class="shell-page pa-admin" aria-label="Admin ทดลอง">${viewMarkup()}</section>`; }
export function mountAdminDemo() {
  const host=document.querySelector('#pa-admin-demo');
  if(!host) return;
  const draw=(restoreFocus=false)=>{host.innerHTML=viewMarkup();if(restoreFocus)host.querySelector('#pa-admin-search')?.focus();};
  host.addEventListener('change',ev=>{
    if(ev.target.id!=='pa-admin-scenario')return;
    state.token++;state.busy=false;state.scenario=ev.target.value;state.detail=null;state.tab='users';state.search='';state.more=3;draw();
  });
  host.addEventListener('input',ev=>{
    if(ev.target.id!=='pa-admin-search')return;
    state.search=ev.target.value;state.more=3;
    const caret=ev.target.selectionStart;draw(true);
    const input=host.querySelector('#pa-admin-search');if(input && caret!==null)input.setSelectionRange(caret,caret);
  });
  host.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b || !host.contains(b))return;
    if(b.dataset.adminTab){state.tab=b.dataset.adminTab;state.detail=null;draw();return;}
    if(b.dataset.adminAction==='reset'){state.token++;state.users=baseUsers.map(x=>({...x}));state.events=baseEvents.map(x=>({...x}));state.tab='users';state.scenario='ready';state.search='';state.more=3;state.busy=false;state.detail=['ROSTER_READY','รีเซ็ตข้อมูลตัวอย่างแล้ว','ไม่มีการเปลี่ยนสิทธิ์จริง'];draw();return;}
    if(b.dataset.adminAction==='more'){
      if(state.busy||!visible())return; const token=++state.token;state.busy=true;state.detail=['PAGE_LOADING','กำลังโหลดหน้าถัดไป (จำลอง)','รายการเดิมยังแสดงอยู่'];draw();
      setTimeout(()=>{if(!host.isConnected||token!==state.token)return;state.busy=false;if(state.scenario==='invalid_cursor')state.detail=['INVALID_CURSOR','ไม่สามารถโหลดหน้าถัดไป','ไม่มีการวนส่งคำขอ'];else{state.more+=3;state.detail=null;}draw();},300);return;
    }
    if(b.dataset.adminSave){
      if(!visible()||state.busy||state.scenario==='label_pending')return;
      const u=state.users.find(x=>x.id===b.dataset.adminSave); const pick=host.querySelector(`[data-admin-pick="${b.dataset.adminSave}"]`);
      if(!u||!pick||u.role==='admin'||!Object.hasOwn(roleLabels,pick.value)||pick.value==='admin'||pick.value===u.role)return;
      const nextRole=pick.value,token=++state.token;state.busy=true;state.detail=['ROLE_SAVING','กำลังบันทึกบทบาท (จำลอง)','ยังไม่แสดงผลสำเร็จ'];draw();
      setTimeout(()=>{if(!host.isConnected||token!==state.token)return;state.busy=false;
        if(state.scenario==='conflict')state.detail=['STALE_OR_CONFLICT','ข้อมูลเปลี่ยนขณะบันทึก','สิทธิ์เดิมไม่เปลี่ยน'];
        else if(state.scenario==='save_failure')state.detail=['SERVER_ERROR','บันทึกไม่สำเร็จ (จำลอง)','สิทธิ์เดิมไม่เปลี่ยน'];
        else {const old=u.role;u.role=nextRole;state.events.unshift({time:'21/11/69 18:39',actor:'Admin (จำลอง)',event:'user.role_changed',target:`${u.id}: ${roleLabels[old]} → ${roleLabels[nextRole]}`,result:'ตัวอย่าง'});state.detail=['ROLE_SAVED','บันทึกข้อมูลสมมติสำเร็จ','ยังไม่ได้แก้สิทธิ์ผู้ใช้จริง'];}
        draw();
      },450);
    }
  });
}
