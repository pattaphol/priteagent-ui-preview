/* V1-like human-readable GRP code for PUBLIC SYNTHETIC preview only.
 * The opaque UUID remains the internal immutable IndexedDB primary key.
 * True global cross-account sequential IDs must be issued by Backend/DB.
 */
export function carCodePrefix({year,month,week}){
 if(!Number.isInteger(year)||year<2400||year>2800||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(week)||week<1||week>5)throw Error('INVALID_CAR_PERIOD');
 return 'GRP-'+year+'-'+String(month).padStart(2,'0')+'-'+week;
}
export function carCode(prefix,n){
 if(!/^GRP-\d{4}-\d{2}-[1-5]$/.test(prefix)||!Number.isSafeInteger(n)||n<1)throw Error('INVALID_CAR_NUMBER');
 return prefix+'-'+String(n).padStart(3,'0');
}
export function allocateCarCode(groups,requests,period,onAllocated){
 const prefix=carCodePrefix(period),key='display-code-sequence:'+prefix;
 const previous=requests.get(key);
 previous.onsuccess=()=>{
  const all=groups.getAll();
  all.onsuccess=()=>{
   const maxExisting=all.result.reduce((max,item)=>{
    const val=item.groupId;
    if(typeof val!=='string'||!val.startsWith(prefix+'-'))return max;
    const seq=val.slice(prefix.length+1);
    return /^\d+$/.test(seq)?Math.max(max,Number(seq)):max;
   },0);
   const next=Math.max(Number(previous.result?.last||0),maxExisting)+1;
   requests.put({last:next},key);
   onAllocated(carCode(prefix,next));
  };
 };
}
export function visibleCarCode(car){return car?.groupId||'คันรถเดิม · ยังไม่ออกรหัส GRP';}
