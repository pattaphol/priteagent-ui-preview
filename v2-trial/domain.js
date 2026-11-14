










export const layouts = ['small', 'medium', 'large', 'table'];
export const validLayout = (value) => layouts.includes(value);
export const deviceFor = (width) => width < 768 ? 'phone' : width < 1200 ? 'tablet' : 'desktop';
export const initialFilters = () => ({query:'', year:'', month:'', week:'', status:'all'});
export function filterCars(cars, f) {
 const q = f.query.trim().toLocaleLowerCase();
 return cars.filter(c => (f.status === 'archived' ? c.archived : !c.archived && (f.status === 'all' || c.closed === (f.status === 'closed')))
  && (!f.year || c.group?.year === Number(f.year)) && (!f.month || c.group?.month === Number(f.month))
  && (!f.week || c.group?.week === Number(f.week))
  && [c.name,c.destination,c.group?.groupId ?? '',...c.members.map(m=>m.name)].join(' ').toLocaleLowerCase().includes(q));
}
export const bodyTarget = (page, carId) => ({carId,screen:page === 'holding-cars' ? 'holding' : 'settings'});

// Phase 1: synthetic CarGroup contract. Persistence and UI are separate ports.



export function validateCarGroup(draft) {
 const errors = {};
 if (!draft.name.trim()) errors.name='กรอกชื่อคันรถ';
 if (!draft.province.trim()) errors.province='เลือกจังหวัด';
 if (!Number.isInteger(draft.year) || draft.year <= 0) errors.year='ระบุปี';
 if (!Number.isInteger(draft.month) || draft.month < 1 || draft.month > 12) errors.month='เลือกเดือน';
 if (!Number.isInteger(draft.week) || draft.week < 1 || draft.week > 5) errors.week='เลือกวีค';
 const validDate=(value) => { const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false; const date=new Date(value+'T00:00:00Z'); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10)===value; };
 if (!validDate(draft.startDate)) errors.startDate='ระบุวันที่เริ่มให้ถูกต้อง';
 if (!validDate(draft.endDate)) errors.endDate='ระบุวันที่สิ้นสุดให้ถูกต้อง';
 else if (draft.startDate && draft.endDate < draft.startDate) errors.endDate='วันที่สิ้นสุดต้องไม่ก่อนวันเริ่ม';
 if (draft.members.length < 1 || draft.members.length > 4) errors.members='เลือกสมาชิก 1–4 คน';
 draft.members.forEach((name,index)=>{if (!name.trim()) errors['member'+(index+1)]='กรอกชื่อสมาชิกคนที่ '+(index+1);});
 if (!Number.isInteger(draft.ownerIndex) || !draft.members[draft.ownerIndex]?.trim()) errors.ownerIndex='เลือกเจ้าของรถจากสมาชิกที่มีชื่อ';
 if (draft.budget !== undefined && !Number.isInteger(draft.budget)) errors.budget='ระบุจำนวนเงินเป็นบาทเต็ม';
 return errors;
}
