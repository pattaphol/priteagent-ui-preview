import {uiMenuIcon} from '../ui/car-list-components.js?rev=pa-car-icons-r1';
import { LocalCarGroupStore } from '../dashboard/adapters.js?rev=pa-car-code-r1';
import { validateCarGroup } from '../dashboard/domain.js';
import { currentCarPeriod, weeksForMonth } from './car-period.js';
import { connectProvincePicker, isThaiProvince } from '../ui/province-picker.js';
import { connectDateFields } from '../ui/date-fields.js?rev=pa-calendar-r2';

export const carStore = new LocalCarGroupStore();
const pendingPrefix = 'priteagent-v2:phase1:pending-operation:';
const pendingKeys = () => Object.keys(localStorage).filter(key =>
    key === pendingPrefix.slice(0, -1) || key.startsWith(pendingPrefix));
const commit = operation => operation.id
    ? carStore.update(operation.id, operation.revision, operation.draft, operation.requestId)
    : carStore.create(operation.draft, operation.requestId);

const thaiMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' });
const thaiDay = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'UTC' });
function thaiDate(value) {
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) ? thaiDay.format(date) : '';
}

export function connectGroupForm(onSaved, report) {
    const dialog = document.querySelector('#carGroupDialog');
    const form = dialog.querySelector('form');
    const input = name => form.elements.namedItem(name);
    const scroll = dialog.querySelector('.carGroupScroll');
    const dateHint = dialog.querySelector('#carGroupDatesHint');
    const defaultDateHint = dateHint.textContent;
    const monthChoices = Array.from({length:12}, (_, i) =>
        new Option(thaiMonth.format(new Date(Date.UTC(2026,i,15))), String(i+1)));
    input('month').replaceChildren(new Option('เลือกเดือน',''), ...monthChoices);
    input('week').replaceChildren(new Option('เลือกวีค',''), ...Array.from({length:5}, (_, i) =>
        new Option('วีค ' + (i+1),String(i+1))));
    const province = connectProvincePicker(dialog.querySelector('#carProvincePicker'));
    const applyWeekButton = dialog.querySelector('#carApplyWeekDates');
    const fuelContext = dialog.querySelector('#carFuelContext');
    const manager = dialog.querySelector('#carGroupManage');
    const legacyPanel = dialog.querySelector('#carLegacyCode');
    for(const b of manager.querySelectorAll('[data-car-manage]'))b.insertAdjacentHTML('afterbegin',uiMenuIcon({archive:'archive',close:'lock',clone:'copy',export:'download',delete:'trash'}[b.dataset.carManage]));
    const dateFields = connectDateFields(form);
    const members = [1, 2, 3, 4].map(n => input('member' + n));
    const review = dialog.querySelector('#carGroupReview');
    const reviewText = review.querySelector('p');
    const saveButton = dialog.querySelector('#carGroupSave');
    const reviewButton = dialog.querySelector('#carGroupReviewButton');
    const error = dialog.querySelector('#carGroupError');
    const pendingNotice = document.querySelector('#carPending');
    const pendingButton = pendingNotice.querySelector('button');
    const counts = dialog.querySelector('#carGroupMemberCount');
    const controls = Array.from(form.querySelectorAll('input,select,textarea')).filter(control => Boolean(control.name));
    const feedback = new Map();
    for (const control of controls) {
        const message = document.createElement('small');
        message.className = 'carGroupFieldError';
        message.id = 'car-group-error-' + control.name;
        message.hidden = true;
        const errorAnchor = control.closest('[data-pa-date-field]') ?? control;
        errorAnchor.after(message);
        control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), message.id].filter(Boolean).join(' '));
        feedback.set(control.name, message);
    }

    let current = null;
    let reviewed = null;
    let operation = null;
    let dirty = false;
    let busy = false;
    let initialFocus = null;
    let periodChanged = false;

    function setPeriodOptions() {
        const now = currentCarPeriod();
        const year = now.year;
        const options = [...new Set([current?.year, ...Array.from({length:23},(_,i) => year + 2 - i)].filter(Number.isInteger))]
            .sort((a,b) => b-a);
        input('year').replaceChildren(...options.map(value => new Option(String(value),String(value))));
        input('year').value = String(current?.year ?? year);
        input('month').value = String(current?.month ?? now.month);
        input('week').value = String(current?.week ?? now.week);
        if (!current) {
            input('startDate').value = now.start;
            input('endDate').value = now.end;
        }
        dateFields.sync();
    }
    function updateDateHint() {
        const start = thaiDate(input('startDate').value);
        const end = thaiDate(input('endDate').value);
        const week = input('week').value;
        dateHint.textContent = start && end
            ? (week ? 'วีค ' + week + ' · ' : '') + start + ' – ' + end + ' · ' + defaultDateHint : defaultDateHint;
    }

    function selectedWeek() {
        return weeksForMonth(Number(input('year').value), Number(input('month').value))
            .find(range => range.week === Number(input('week').value));
    }
    function applyWeekDates() {
        if (busy || operation) return;
        dirty = true;
        periodChanged = true;
        clearReview();
        const range = selectedWeek();
        if (!range) {
            dateHint.textContent = 'เลือกปี เดือน และวีคที่มีในเดือนนั้น ระบบจะเก็บวันที่เดิมไว้';
            return;
        }
        input('startDate').value = range.start;
        input('endDate').value = range.end;
        dateFields.sync();
        for (const name of ['startDate','endDate','week']) {
            feedback.get(name).hidden = true;
            input(name).removeAttribute('aria-invalid');
        }
        updateDateHint();
    }
    for (const name of ['year','month','week']) input(name).addEventListener('change', applyWeekDates);
    applyWeekButton.addEventListener('click', applyWeekDates);

    function updateFuelContext() {
        const count = members.filter(member => member.value.trim()).length;
        const ownerIndex = input('owner').value === '' ? -1 : Number(input('owner').value);
        const ownerName = ownerIndex >= 0 ? members[ownerIndex]?.value.trim() : '';
        const leaderName = members[0]?.value.trim();
        const share = {2:30, 3:16, 4:0}[count];
        fuelContext.querySelector('[data-fuel-leader]').textContent = leaderName || 'ยังไม่ระบุ';
        fuelContext.querySelector('[data-fuel-owner]').textContent = ownerName || 'ยังไม่เลือก';
        fuelContext.querySelector('[data-fuel-owner-share]').textContent = ownerName && share !== undefined ? share + '%' : '—';
        // Four members: three other shares depend on the approved whole-percent remainder policy.
        // Do NOT invent a fixed 33.33% allocation or change the Expense Split R1 rules.
        const others = count === 4 ? 'รวม 100% แบ่งตามกฎเศษ'
            : share === undefined ? '—' : ((100-share)/(count-1)) + '%';
        fuelContext.querySelector('[data-fuel-other-share]').textContent = ownerName ? others : '—';
    }

    const viewport = window.visualViewport;
    function fitViewport() {
        if (!dialog.open || !viewport) return;
        dialog.style.setProperty('--car-viewport-height', Math.floor(viewport.height) + 'px');
        dialog.style.setProperty('--car-viewport-top', Math.floor(viewport.offsetTop) + 'px');
        const focused = document.activeElement;
        if (viewport.height < window.innerHeight - 100 && scroll.contains(focused)) {
            const field = focused.getBoundingClientRect();
            const region = scroll.getBoundingClientRect();
            if (field.bottom > region.bottom || field.top < region.top) focused.scrollIntoView({block:'nearest'});
        }
    }
    viewport?.addEventListener('resize',fitViewport);
    viewport?.addEventListener('scroll',fitViewport);

    function refreshChoices() {
        const named = members.filter(el => el.value.trim() !== '');
        counts.textContent = 'สรุป ' + named.length + ' คน · ต้องมีอย่างน้อย 1 คน';
        for (const [key, placeholder] of [['owner', 'เลือกเจ้าของรถ'], ['self', 'ไม่ระบุ']]) {
            const select = input(key);
            const previous = select.value;
            select.replaceChildren(new Option(placeholder, ''));
            members.forEach((el, index) => {
                if (el.value.trim()) select.add(new Option('คนที่ ' + (index + 1) + ' — ' + el.value.trim(), String(index)));
            });
            if (Array.from(select.options).some(option => option.value === previous)) select.value = previous;
        }
        updateFuelContext();
    }
    function markErrors(errors) {
        let first = null;
        for (const control of controls) {
            const text = errors[control.name] ?? '';
            const message = feedback.get(control.name);
            message.textContent = text;
            message.hidden = !text;
            if (text) {
                control.setAttribute('aria-invalid', 'true');
                first ??= control.closest('[data-pa-date-field]')?.querySelector('[data-pa-date-text]') ?? control;
            } else control.removeAttribute('aria-invalid');
        }
        if (first) {
            first.focus({preventScroll:true});
            first.scrollIntoView({block:'center'});
        }
    }
    function clearReview() {
        reviewed = null;
        review.hidden = true;
        saveButton.hidden = true;
        saveButton.textContent = 'บันทึกคันรถ';
    }
    function lock(value) {
        for (const el of controls) el.disabled = value;
        dateFields.setDisabled(value);
        reviewButton.disabled = value;
        applyWeekButton.disabled = value;
        if (value) province.close();
    }
    function syncPending() {
        try {
            pendingNotice.hidden = pendingKeys().length === 0;
        } catch {
            pendingNotice.hidden = true;
        }
    }
    function askClose() {
        if (busy) return false;
        if (operation) return confirm('ยังยืนยันผลบันทึกไม่ได้ คำขอยังอยู่ในเครื่อง ต้องการปิดหน้าต่างหรือไม่?');
        return !dirty || confirm('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?');
    }
    function close() {
        if (askClose()) dialog.close();
    }
    dialog.addEventListener('cancel', event => { if (!askClose()) event.preventDefault(); });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) {
            const r = dialog.getBoundingClientRect();
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
        }
    });
    dialog.addEventListener('close', () => {
        if (initialFocus?.isConnected) initialFocus.focus();
        else document.querySelector('#createCar').focus();
        province.close();
        syncPending();
    });
    for (const button of dialog.querySelectorAll('[data-close-group]')) button.addEventListener('click', close);
    window.addEventListener('beforeunload', event => {
        if (dialog.open && (dirty || operation)) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    form.addEventListener('input', event => {
        if (busy || operation) return;
        dirty = true;
        clearReview();
        const field = event.target;
        if (members.includes(field) && field.value.trim()) refreshChoices();
        if (field.name === 'owner') updateFuelContext();
        if (['startDate','endDate'].includes(field.name) && (!periodChanged || selectedWeek())) updateDateHint();
        const message = feedback.get(field.name);
        if (message) {
            message.hidden = true;
            field.removeAttribute('aria-invalid');
        }
    });
    members.forEach((el, index) => {
        el.addEventListener('focus', () => { el.dataset.previous = el.value; });
        el.addEventListener('change', () => {
            if (el.dataset.previous?.trim() && !el.value.trim()) {
                const roles = [
                    index === 0 && 'หัวหน้าคัน',
                    input('owner').value === String(index) && 'เจ้าของรถ',
                    input('self').value === String(index) && 'ตัวเอง'
                ].filter(Boolean);
                const impact = roles.length ? ' (' + roles.join(' และ ') + ')' : '';
                if (!confirm('นำ “' + el.dataset.previous.trim() + '”' + impact + ' ออกจากรายชื่อหรือไม่?')) {
                    el.value = el.dataset.previous;
                }
            }
            el.dataset.previous = el.value;
            refreshChoices();
        });
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (busy || operation) return;
        clearReview();
        refreshChoices();
        const names = members.map(el => el.value.trim());
        const positions = names.flatMap((name, index) => name ? [index] : []);
        const ownerPosition = input('owner').value;
        const selfPosition = input('self').value;
        const budget = input('budget');
        const draft = {
            year: Number(input('year').value),
            month: Number(input('month').value),
            week: Number(input('week').value),
            startDate: input('startDate').value,
            endDate: input('endDate').value,
            name: input('name').value.trim(),
            province: input('province').value.trim(),
            workNote: input('workNote').value.trim(),
            members: positions.map(index => names[index]),
            ownerIndex: ownerPosition === '' ? -1 : positions.indexOf(Number(ownerPosition)),
            ...(selfPosition === '' ? {} : {selfPosition: positions.indexOf(Number(selfPosition))}),
            ...(budget.value === '' ? {} : {budget: budget.valueAsNumber})
        };
        const errors = validateCarGroup(draft);
        for (const name of dateFields.invalidEntryNames()) errors[name] = 'วันที่ไม่ถูกต้อง ใช้วัน/เดือน/ปี พ.ศ.';
        if (!isThaiProvince(draft.province)) errors.province = 'เลือกจังหวัดที่อยู่ในรายการ';
        if (periodChanged && !selectedWeek()) errors.week = 'เลือกวีคที่มีในเดือนนี้';
        if (!names[0]) errors.member1 = 'กรอกชื่อสมาชิกคนที่ 1 ซึ่งเป็นหัวหน้าคัน';
        if (errors.ownerIndex) errors.owner = errors.ownerIndex;
        if (errors.selfPosition) errors.self = errors.selfPosition;
        if (budget.validity.badInput) errors.budget = 'ระบุจำนวนเงินเป็นบาทเต็ม';
        markErrors(errors);
        if (Object.keys(errors).length) {
            error.textContent = 'กรุณาตรวจสอบช่องที่ทำเครื่องหมาย';
            return;
        }
        error.textContent = '';
        reviewed = draft;
        reviewText.textContent = [
            'ชื่อคันรถ: ' + draft.name + ' · ' + draft.province,
            'พ.ศ. ' + draft.year + ' / เดือน ' + draft.month + ' / วีค ' + draft.week,
            'วันที่ ' + draft.startDate + ' ถึง ' + draft.endDate,
            'สมาชิก: ' + draft.members.join(', '),
            'หัวหน้าคัน: ' + draft.members[0],
            'เจ้าของรถ: ' + draft.members[draft.ownerIndex],
            'ตัวเอง: ' + (draft.members[draft.selfPosition] ?? 'ไม่ระบุ') + ' (ข้อมูลจำลอง)',
            'งบประมาณ: ' + (draft.budget === undefined ? 'ไม่ระบุ' : draft.budget.toLocaleString('th-TH') + ' บาท')
        ].join('\n');
        review.hidden = false;
        saveButton.hidden = false;
        review.focus();
    });

    async function save() {
        if (busy || (!reviewed && !operation)) return;
        if (!operation) {
            const candidate = {
                id: current?.id ?? null,
                revision: current?.revision ?? null,
                draft: reviewed,
                requestId: crypto.randomUUID()
            };
            try {
                localStorage.setItem(pendingPrefix + candidate.requestId, JSON.stringify(candidate));
            } catch {
                error.textContent = 'ยังไม่ได้บันทึก พื้นที่เก็บคำขอไม่พร้อม ข้อมูลที่กรอกยังอยู่';
                return;
            }
            operation = candidate;
        }
        busy = true;
        lock(true);
        saveButton.disabled = true;
        error.textContent = '';
        try {
            await commit(operation);
        } catch (failure) {
            if (['CONFLICT_STALE_REVISION', 'NOT_FOUND'].includes(failure?.message)) {
                try { localStorage.removeItem(pendingPrefix + operation.requestId); } catch {}
                operation = null;
                clearReview();
                lock(false);
                error.textContent = 'รายการเปลี่ยนไปแล้ว ข้อมูลที่กรอกยังอยู่ โปรดเปิดรายการล่าสุดก่อนบันทึกอีกครั้ง';
            } else {
                saveButton.textContent = 'ลองบันทึกคำขอเดิม';
                error.textContent = 'ยังยืนยันผลไม่ได้ โปรดลองคำขอเดิมเพื่อป้องกันรายการซ้ำ';
            }
            return;
        } finally {
            busy = false;
            saveButton.disabled = false;
        }
        let cleaned = true;
        try { localStorage.removeItem(pendingPrefix + operation.requestId); } catch { cleaned = false; }
        operation = null;
        dirty = false;
        dialog.close();
        await onSaved(cleaned ? 'บันทึกคันรถแล้ว' : 'บันทึกคันรถแล้ว แต่ยังล้างคำขอค้างไม่ได้');
    }
    saveButton.addEventListener('click', () => void save());

    pendingButton.addEventListener('click', async () => {
        pendingButton.disabled = true;
        let saved = false;
        try {
            const key = pendingKeys()[0];
            if (!key) return;
            const queued = JSON.parse(localStorage.getItem(key));
            if (!queued?.requestId || !queued.draft) throw new Error('INVALID_PENDING');
            await commit(queued);
            saved = true;
            localStorage.removeItem(key);
            await onSaved('ยืนยันคำขอบันทึกเดิมแล้ว');
        } catch (failure) {
            report(saved ? 'บันทึกคันรถแล้ว แต่ยังล้างคำขอค้างไม่ได้'
                : failure?.message === 'CONFLICT_STALE_REVISION'
                    ? 'คำขอค้างชนกับรายการล่าสุด ข้อมูลคำขอเดิมยังอยู่'
                    : 'ยังยืนยันคำขอเดิมไม่ได้');
        } finally {
            pendingButton.disabled = false;
            syncPending();
        }
    });
    syncPending();

    function refreshManagement() {
        manager.hidden = !current;
        legacyPanel.hidden = !current || Boolean(current.groupId);
        const archive=manager.querySelector('[data-car-manage=archive] span');
        const close=manager.querySelector('[data-car-manage=close] span');
        archive.textContent=current?.archived?'นำคันรถออกจากคลัง':'เก็บคันรถเข้าคลัง';
        close.textContent=current?.closed?'เปิดคันรถอีกครั้ง':'ปิดคันรถและล็อกรายการ';
        lock(Boolean(current?.closed));
    }
    function exportCurrent() {
        if (!current) return;
        const content=JSON.stringify({format:'priteagent-v2-synthetic-car-backup-v1',exportedAt:new Date().toISOString(),car:current},null,2);
        const blob=new Blob([content],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;a.download=(current.groupId||'car-legacy')+'.json';
        a.style.display='none';document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        report('ส่งไฟล์สำรอง JSON ให้เบราว์เซอร์แล้ว กรุณาตรวจไฟล์ในเครื่อง');
    }

    let cancelPendingConfirmation=null;
    function askInline(message,requiredName=''){
        if(cancelPendingConfirmation)cancelPendingConfirmation();
        return new Promise(resolve=>{
            const section=manager.querySelector('#carManageConfirm');
            const title=section.querySelector('[data-confirm-message]');
            const nameLabel=section.querySelector('[data-confirm-name-label]');
            const nameInput=section.querySelector('[data-confirm-name]');
            const yes=section.querySelector('[data-confirm-yes]');
            const no=section.querySelector('[data-confirm-cancel]');
            section.hidden=false;title.textContent=message;
            nameLabel.hidden=!requiredName;
            nameInput.value='';
            yes.disabled=Boolean(requiredName);
            const onInput=()=>{yes.disabled=Boolean(requiredName)&&nameInput.value!==requiredName;};
            const finish=answer=>{
                section.hidden=true;
                yes.removeEventListener('click',accept);
                no.removeEventListener('click',cancel);
                nameInput.removeEventListener('input',onInput);
                if(cancelPendingConfirmation===cancel)cancelPendingConfirmation=null;
                resolve(answer);
            };
            const accept=()=>finish(!requiredName||nameInput.value===requiredName);
            const cancel=()=>finish(false);
            cancelPendingConfirmation=cancel;
            nameInput.addEventListener('input',onInput);
            yes.addEventListener('click',accept);
            no.addEventListener('click',cancel);
            section.scrollIntoView({block:'nearest',behavior:'instant'});
            (requiredName?nameInput:yes).focus({preventScroll:true});
        });
    }
    dialog.addEventListener('close',()=>cancelPendingConfirmation?.());

    legacyPanel.querySelector('button').addEventListener('click',async()=>{
        if(!current||busy||dirty||operation)return;
        if(!await askInline('ออกรหัส GRP แบบ V1 ให้คันรถเดิม โดยคง UUID ภายในเหมือนเดิม?'))return;
        try{
            current=await carStore.assignLegacyCode(current.id,current.revision);
            input('groupId').value=current.groupId||'';
            refreshManagement();
            await onSaved('ออกรหัสคันรถ GRP แล้ว');
        }catch{error.textContent='ออกรหัส GRP ไม่สำเร็จ กรุณาเปิดคันรถล่าสุด';}
    });
    manager.addEventListener('click',async event=>{
        const button=event.target.closest('[data-car-manage]');
        if(!button||!current||busy||operation)return;
        const action=button.dataset.carManage;
        if(action==='export'){exportCurrent();return;}
        if(dirty){error.textContent='โปรดบันทึกหรือยกเลิกการแก้ไขก่อนจัดการคันรถ';return;}
        if(action==='clone'){
            if(!await askInline('สร้างแบบฟอร์มคันรถใหม่จากเฉพาะสมาชิกและตำแหน่งของคันนี้?'))return;
            const source=current;
            current=null;
            form.reset();setPeriodOptions();province.set('');
            members.forEach((el,i)=>{el.value=source.members[i]||'';el.dataset.previous=el.value;});
            refreshChoices();
            input('owner').value=String(source.ownerIndex);
            input('self').value=source.selfPosition===undefined?'':String(source.selfPosition);
            input('name').value=source.name||'';input('workNote').value='';input('budget').value='';
            input('groupId').value='';
            dateFields.sync();updateFuelContext();updateDateHint();
            dirty=true;clearReview();error.textContent='';
            refreshManagement();
            dialog.querySelector('#carGroupTitle').textContent='สร้างกลุ่มใหม่จากรายชื่อเดิม';
            input('name').focus();
            return;
        }
        if(action==='archive'||action==='close'){
            const flag=action==='archive'?'archived':'closed';
            const next=!Boolean(current[flag]);
            if(!await askInline('ยืนยันเปลี่ยนสถานะคันรถ '+(current.groupId||current.name)+'?'))return;
            button.disabled=true;
            try{
                current=await carStore.setFlags(current.id,current.revision,{[flag]:next});
                refreshManagement();
                await onSaved('อัปเดตสถานะคันรถแล้ว (ข้อมูลจำลอง)');
            }catch{error.textContent='เปลี่ยนสถานะไม่สำเร็จ กรุณาเปิดรายการล่าสุด';}
            finally{button.disabled=false;}
            return;
        }
        if(action==='delete'){
            if(!await askInline('ลบคันรถนี้จากข้อมูลจำลองในเบราว์เซอร์? โปรดสำรอง JSON ก่อน และพิมพ์ชื่อให้ตรง',current.name))return;
            button.disabled=true;
            try{
                await carStore.deleteLocal(current.id,current.revision);
                dirty=false;current=null;dialog.close();
                await onSaved('ลบคันรถจำลองในเบราว์เซอร์แล้ว');
            }catch{error.textContent='ลบไม่สำเร็จ กรุณาเปิดรายการล่าสุด';}
            finally{button.disabled=false;}
        }
    });

    let opening = false;
    return async function open(id) {
        if (dialog.open || opening) return;
        opening = true;
        initialFocus = document.activeElement;
        try {
            if (!id && pendingKeys().length) {
                report('กรุณาตรวจคำขอบันทึกที่ค้างก่อนสร้างคันรถ');
                pendingButton.focus();
                return;
            }
            current = id ? await carStore.get(id) : null;
            if (id && !current) {
                report('ไม่พบคันรถในเครื่องนี้');
                return;
            }
            form.reset();
            periodChanged = false;
            setPeriodOptions();
            lock(false);
            clearReview();
            markErrors({});
            error.textContent = '';
            dirty = false;
            operation = null;
            dialog.querySelector('#carGroupTitle').textContent = current ? 'ตั้งค่าคันรถ / คันรถ Group' : 'สร้างคันรถ / คันรถ Group';
            input('groupId').value = current?.groupId ?? '';
            refreshManagement();
            if (current) {
                for (const key of ['year', 'month', 'week', 'startDate', 'endDate', 'name', 'workNote', 'budget']) {
                    input(key).value = current[key] ?? '';
                }
            }
            province.set(current?.province ?? '');
            members.forEach((el, index) => {
                el.value = current?.members[index] ?? '';
                el.dataset.previous = el.value;
            });
            refreshChoices();
            input('owner').value = current?.ownerIndex === undefined ? '' : String(current.ownerIndex);
            input('self').value = current?.selfPosition === undefined ? '' : String(current.selfPosition);
            dateFields.sync();
            updateFuelContext();
            dialog.showModal();
            scroll.scrollTop = 0;
            updateDateHint();
            fitViewport();
            dialog.querySelector('#carGroupTitle').focus({preventScroll:true});
        } catch {
            report('เปิดแบบฟอร์มไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์แล้วลองอีกครั้ง');
        } finally {
            opening = false;
        }
    };
}
