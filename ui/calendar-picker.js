/* Shared Thai Buddhist-era calendar for PriteAgent V2 active UI.
 * Display only; persisted date remains ISO on the original native date input.
 */
const TH_MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DAYS=['อา','จ','อ','พ','พฤ','ศ','ส'];
const fill=n=>String(n).padStart(2,'0');
const isoOf=(year,month,day)=>year+'-'+fill(month)+'-'+fill(day);
const todayThai=()=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return isoOf(Number(parts.year),Number(parts.month),Number(parts.day));
};
const parseIso=value=>{
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!m)return null;
  const y=Number(m[1]),mo=Number(m[2]),day=Number(m[3]);
  if(y<1900||y>2199||mo<1||mo>12||day<1||day>31)return null;
  const date=new Date(Date.UTC(y,mo-1,day));
  return date.getUTCFullYear()===y&&date.getUTCMonth()+1===mo&&date.getUTCDate()===day?{year:y,month:mo,day}:null;
};
let activeClose=null;
export function attachThaiCalendar(group,native,text,onSelect) {
  const icon=group?.querySelector('.pa-date-icon');
  if(!group||!native||!text||!icon)return {close(){}};
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='pa-calendar-launch';
  trigger.setAttribute('aria-label','เปิดปฏิทินเลือก'+(native.name?.toLowerCase().includes('end')?'วันที่สิ้นสุด':'วันที่เริ่ม'));
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  trigger.append(...icon.childNodes);icon.replaceWith(trigger);
  const popup=document.createElement('div');
  popup.className='pa-calendar-popover';
  popup.setAttribute('role','dialog');popup.setAttribute('aria-label','ปฏิทินเลือกวัน เดือน ปี พ.ศ.');
  popup.setAttribute('popover','manual');popup.hidden=true;
  popup.innerHTML=[
    '<div class="pa-calendar-top">',
      '<label>ค้นหาปี พ.ศ.<input data-cal-year type="number" inputmode="numeric" min="2443" max="2742" aria-label="ระบุปี พ.ศ."></label>',
      '<label>เลือกเดือน<select data-cal-month aria-label="เลือกเดือน"></select></label>',
    '</div>',
    '<div class="pa-calendar-monthline">',
      '<button type="button" class="pa-calendar-nav" data-cal-prev aria-label="เดือนก่อนหน้า">‹</button>',
      '<strong data-cal-title aria-live="polite"></strong>',
      '<button type="button" class="pa-calendar-nav" data-cal-next aria-label="เดือนถัดไป">›</button>',
    '</div>',
    '<div class="pa-calendar-grid" role="grid" aria-label="วันในเดือน"></div>',
    '<div class="pa-calendar-footer"><button type="button" data-cal-today>วันนี้</button>',
    '<span class="pa-calendar-help">วว/ดด/ปี พ.ศ.</span>',
    '<button type="button" data-cal-close>ปิด</button></div>'
  ].join('');
  const yearInput=popup.querySelector('[data-cal-year]');
  const monthInput=popup.querySelector('[data-cal-month]');
  const grid=popup.querySelector('.pa-calendar-grid');
  TH_MONTHS.forEach((name,i)=>monthInput.add(new Option(name,String(i+1))));
  const host=group.closest('dialog')||document.body;
  host.append(popup);
  let year=2026,month=1,isOpen=false;
  const canPopover=typeof popup.showPopover==='function';
  const render=()=>{
    yearInput.value=String(year+543);monthInput.value=String(month);
    popup.querySelector('[data-cal-title]').textContent=TH_MONTHS[month-1]+' '+(year+543);
    const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
    const weekday=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const nodes=[];
    for(const label of DAYS){const span=document.createElement('span');span.className='pa-calendar-weekday';span.textContent=label;span.setAttribute('aria-hidden','true');nodes.push(span);}
    for(let i=0;i<weekday;i++){const span=document.createElement('span');span.className='pa-calendar-spacer';nodes.push(span);}
    for(let day=1;day<=daysInMonth;day++){
      const b=document.createElement('button'),value=isoOf(year,month,day);
      b.type='button';b.className='pa-calendar-day';b.textContent=String(day);b.dataset.calendarDate=value;
      b.setAttribute('aria-label',day+' '+TH_MONTHS[month-1]+' '+(year+543));
      b.setAttribute('aria-selected',String(native.value===value));nodes.push(b);
    }
    grid.replaceChildren(...nodes);
  };
  function position(){
    const rect=trigger.getBoundingClientRect();
    const viewportHeight=window.visualViewport?.height||window.innerHeight;
    const width=Math.min(340,window.innerWidth-24);
    const left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
    // Prefer below on desktop, above on constrained phones. Popover can scroll.
    const height=Math.min(400,Math.max(235,viewportHeight-24));
    const top=rect.bottom+8+height<=viewportHeight
      ? rect.bottom+8 : Math.max(10,Math.min(rect.top-height-8,viewportHeight-height-10));
    popup.style.left=left+'px';popup.style.top=top+'px';
    popup.style.maxHeight=Math.max(210,viewportHeight-20)+'px';popup.style.overflowY='auto';
  }
  function outside(event){if(!popup.contains(event.target)&&!trigger.contains(event.target))close({returnFocus:false});}
  function keydown(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}
  function close(options={}) {
    if(!isOpen)return;
    isOpen=false;trigger.setAttribute('aria-expanded','false');
    if(canPopover&&popup.matches(':popover-open'))popup.hidePopover();
    popup.hidden=true;
    window.removeEventListener('resize',position);
    window.visualViewport?.removeEventListener('resize',position);
    document.removeEventListener('pointerdown',outside,true);
    document.removeEventListener('keydown',keydown,true);
    if(activeClose===close)activeClose=null;
    if(options.returnFocus!==false && trigger.isConnected)trigger.focus({preventScroll:true});
  }
  function open(){
    if(native.disabled||text.disabled)return;
    if(activeClose)activeClose();
    const date=parseIso(native.value)||parseIso(todayThai());
    year=date.year;month=date.month;render();
    popup.hidden=false;
    if(canPopover)popup.showPopover();
    isOpen=true;activeClose=close;trigger.setAttribute('aria-expanded','true');position();
    window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
    queueMicrotask(()=>{if(isOpen){document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keydown,true);}});
    // Do not open the iPhone virtual keyboard when simply opening the calendar.
    (popup.querySelector('.pa-calendar-day[aria-selected=true]') || popup.querySelector('[data-cal-prev]')).focus({preventScroll:true});
  }
  trigger.addEventListener('click',e=>{e.preventDefault();isOpen?close():open()});
  popup.querySelector('[data-cal-prev]').addEventListener('click',()=>{
    month--;if(month<1){month=12;year=Math.max(1900,year-1);}render();
  });
  popup.querySelector('[data-cal-next]').addEventListener('click',()=>{
    month++;if(month>12){month=1;year=Math.min(2199,year+1);}render();
  });
  yearInput.addEventListener('change',()=>{
    const next=Number(yearInput.value)-543;if(Number.isInteger(next)&&next>=1900&&next<=2199)year=next;render();
  });
  monthInput.addEventListener('change',()=>{const next=Number(monthInput.value);if(next>=1&&next<=12)month=next;render()});
  grid.addEventListener('click',event=>{
    const button=event.target.closest('[data-calendar-date]');if(!button)return;
    onSelect(button.dataset.calendarDate);close();
  });
  popup.querySelector('[data-cal-today]').addEventListener('click',()=>{onSelect(todayThai());close()});
  popup.querySelector('[data-cal-close]').addEventListener('click',()=>close());
  return {close,destroy(){close({returnFocus:false});popup.remove()}};
}
