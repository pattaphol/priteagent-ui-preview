import {validLayout} from './domain.js';

// Deliberately fictional identities and whole-THB display values; no financial calculation.
export const fixtures = [
 {id:'demo-1',name:'คันรถตัวอย่าง เชียงใหม่',destination:'เชียงใหม่',start:'2026-11-02',end:'2026-11-08',closed:false,archived:false,group:{groupId:'DEMO-CNX-01',year:2569,month:11,week:1},members:['สมาชิกตัวอย่าง ก','สมาชิกตัวอย่าง ข','สมาชิกตัวอย่าง ค','สมาชิกตัวอย่าง ง'].map((name,i)=>({id:`m-${i}`,name})),expenseTHB:2400,poolTHB:3600},
 {id:'demo-2',name:'คันรถตัวอย่าง ระยอง',destination:'ระยอง',start:'2026-11-09',end:'2026-11-15',closed:true,archived:false,group:{groupId:'DEMO-RYG-02',year:2569,month:11,week:2},members:[{id:'m-6',name:'สมาชิกตัวอย่าง ฉ'}],expenseTHB:1800,poolTHB:1200},
 {id:'demo-3',name:'คันรถตัวอย่าง ภูเก็ต',destination:'ภูเก็ต',start:'2025-12-22',end:'2025-12-28',closed:true,archived:true,group:{groupId:'DEMO-HKT-03',year:2568,month:12,week:4},members:[{id:'m-7',name:'สมาชิกตัวอย่าง ช'},{id:'m-8',name:'สมาชิกตัวอย่าง ซ'}],expenseTHB:3200,poolTHB:800},
 {id:'demo-4',name:'คันรถตัวอย่าง ยังไม่จัดกลุ่ม',destination:'',start:'',end:'',closed:false,archived:false,members:[],expenseTHB:0,poolTHB:0},
 {id:'demo-5',name:'คันรถตัวอย่าง ขอนแก่น',destination:'ขอนแก่น',start:'2026-10-26',end:'2026-10-31',closed:false,archived:false,group:{groupId:'DEMO-KKN-05',year:2569,month:10,week:5},members:[{id:'m-9',name:'สมาชิกตัวอย่าง ฌ'},{id:'m-10',name:'สมาชิกตัวอย่าง ญ'},{id:'m-11',name:'สมาชิกตัวอย่าง ฎ'}],expenseTHB:2100,poolTHB:1900}
];
export class SyntheticData  {
 async list(state) {
  if(state==='error') throw new Error('Synthetic fixture error');
  return state==='empty' ? [] : structuredClone(fixtures);
 }
}
export class LocalPreferences  {

 constructor(storage) {this.storage=storage;}
 key(page,device) {return `priteagent-v2:sprint1:${page}:${device}`;}
 read(page,device) {
  try {const v=this.storage.getItem(this.key(page,device));return validLayout(v)?v:'medium';} catch {return 'medium';}
 }
 write(page,device,layout) {
  try {this.storage.setItem(this.key(page,device),layout);return true;} catch {return false;}
 }
}

// Local synthetic store: IndexedDB transactions serialize writers across tabs.
import {validateCarGroup} from './domain.js';

export class LocalCarGroupStore  {
 db() {return new Promise((resolve,reject)=>{
  const request=indexedDB.open('priteagent-v2-synthetic-phase1',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('groups',{keyPath:'id'});request.result.createObjectStore('requests');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });}
 check(draft) {const errors=validateCarGroup(draft);if(Object.keys(errors).length) throw Object.assign(new Error('VALIDATION_ERROR'),{errors});}
 async list() {const db=await this.db();try{return await new Promise((resolve,reject)=>{const req=db.transaction('groups').objectStore('groups').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
 async get(id) {const db=await this.db();try{return await new Promise((resolve,reject)=>{const req=db.transaction('groups').objectStore('groups').get(id);req.onsuccess=()=>resolve(req.result ?? null);req.onerror=()=>reject(req.error);});}finally{db.close();}}
 async create(draft, requestId) {
  if(!requestId.trim()) throw new Error('REQUEST_ID_REQUIRED');this.check(draft);
  const db=await this.db();try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(['groups','requests'],'readwrite'), groups=tx.objectStore('groups'), requests=tx.objectStore('requests');let result;
   const fingerprint=JSON.stringify(draft);const prior=requests.get(requestId);prior.onsuccess=()=>{if(prior.result){if(prior.result.fingerprint!==fingerprint){tx.abort();return;}result=prior.result.result;}else{result={...structuredClone(draft),id:crypto.randomUUID(),revision:1};groups.add(result);requests.add({fingerprint,result},requestId);}};
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error ?? new Error('TRANSACTION_ABORTED'));
  });}finally{db.close();}
 }
 async update(id, expectedRevision, draft, requestId) {
  if(!requestId.trim()) throw new Error('REQUEST_ID_REQUIRED');
  this.check(draft);const db=await this.db();try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(['groups','requests'],'readwrite'),groups=tx.objectStore('groups'),requests=tx.objectStore('requests');let result;let reason='TRANSACTION_ABORTED';
   const fingerprint=JSON.stringify({id,expectedRevision,draft});const lookup=requests.get('update:'+requestId);lookup.onsuccess=()=>{if(lookup.result){if(lookup.result.fingerprint!==fingerprint){reason='REQUEST_ID_MISMATCH';tx.abort();return;}result=lookup.result.result;return;}const get=groups.get(id);get.onsuccess=()=>{const current=get.result;if(!current){reason='NOT_FOUND';tx.abort();return;}if(current.revision!==expectedRevision){reason='CONFLICT_STALE_REVISION';tx.abort();return;}result={...structuredClone(draft),id,revision:expectedRevision+1};groups.put(result);requests.add({fingerprint,result},'update:'+requestId);};};
   tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(new Error(reason));
  });}finally{db.close();}
 }
}
