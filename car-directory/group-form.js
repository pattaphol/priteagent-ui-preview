import { LocalCarGroupStore } from '../dashboard/adapters.js';
import { validateCarGroup } from '../dashboard/domain.js';

export const carStore = new LocalCarGroupStore();
const pendingPrefix = 'priteagent-v2:phase1:pending-operation:';
const pendingKeys = () => Object.keys(localStorage).filter(key =>
    key === pendingPrefix.slice(0, -1) || key.startsWith(pendingPrefix));
const commit = operation => operation.id
    ? carStore.update(operation.id, operation.revision, operation.draft, operation.requestId)
    : carStore.create(operation.draft, operation.requestId);

const thaiMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' });
const thaiDay = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'UTC' });
const periodClock = new Intl.DateTimeFormat('en-GB-u-ca-buddhist', { year: 'numeric', month: 'numeric', timeZone: 'Asia/Bangkok' });
const provinces = ('กรุงเทพมหานคร กระบี่ กาญจนบุรี กาฬสินธุ์ กำแพงเพชร ขอนแก่น จันทบุรี ฉะเชิงเทรา ชลบุรี ชัยนาท ชัยภูมิ ชุมพร เชียงราย เชียงใหม่ ตรัง ตราด ตาก นครนายก นครปฐม นครพนม นครราชสีมา นครศรีธรรมราช นครสวรรค์ นนทบุรี นราธิวาส น่าน บึงกาฬ บุรีรัมย์ ปทุมธานี ประจวบคีรีขันธ์ ปราจีนบุรี ปัตตานี พระนครศรีอยุธยา พะเยา พังงา พัทลุง พิจิตร พิษณุโลก เพชรบุรี เพชรบูรณ์ แพร่ ภูเก็ต มหาสารคาม มุกดาหาร แม่ฮ่องสอน ยะลา ยโสธร ร้อยเอ็ด ระนอง ระยอง ราชบุรี ลพบุรี ลำปาง ลำพูน เลย ศรีสะเกษ สกลนคร สงขลา สตูล สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระแก้ว สระบุรี สิงห์บุรี สุโขทัย สุพรรณบุรี สุราษฎร์ธานี สุรินทร์ หนองคาย หนองบัวลำภู อ่างทอง อำนาจเจริญ อุดรธานี อุตรดิตถ์ อุทัยธานี อุบลราชธานี').split(' ');
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
    dialog.querySelector('#carGroupProvinces').replaceChildren(...provinces.map(province => new Option(province,province)));
    const members = [1, 2, 3, 4].map(n => input('member' + n));
    const review = dialog.querySelector('#carGroupReview');
    const reviewText = review.querySelector('p');
    const saveButton = dialog.querySelector('#carGroupSave');
    const reviewButton = dialog.querySelector('#carGroupReviewButton');
    const error = dialog.querySelector('#carGroupError');
    const pendingNotice = document.querySelector('#carPending');
    const pendingButton = pendingNotice.querySelector('button');
    const counts = dialog.querySelector('#carGroupMemberCount');
    const controls = Array.from(form.querySelectorAll('input,select,textarea'));
    const feedback = new Map();
    for (const control of controls) {
        const message = document.createElement('small');
        message.className = 'carGroupFieldError';
        message.id = 'car-group-error-' + control.name;
        message.hidden = true;
        control.after(message);
        control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), message.id].filter(Boolean).join(' '));
        feedback.set(control.name, message);
    }

    let current = null;
    let reviewed = null;
    let operation = null;
    let dirty = false;
    let busy = false;
    let initialFocus = null;

    function setPeriodOptions() {
        const now = Object.fromEntries(periodClock.formatToParts().map(part => [part.type, part.value]));
        const year = Number(now.year);
        const options = [...new Set([current?.year, ...Array.from({length:23},(_,i) => year + 2 - i)].filter(Number.isInteger))]
            .sort((a,b) => b-a);
        input('year').replaceChildren(...options.map(value => new Option(String(value),String(value))));
        input('year').value = String(current?.year ?? year);
        input('month').value = String(current?.month ?? Number(now.month));
    }
    function updateDateHint() {
        const start = thaiDate(input('startDate').value);
        const end = thaiDate(input('endDate').value);
        const week = input('week').value;
        dateHint.textContent = start && end
            ? (week ? 'วีค ' + week + ' · ' : '') + start + ' – ' + end : defaultDateHint;
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
                first ??= control;
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
        reviewButton.disabled = value;
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
        if (['startDate','endDate','week'].includes(field.name)) updateDateHint();
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
            setPeriodOptions();
            lock(false);
            clearReview();
            markErrors({});
            error.textContent = '';
            dirty = false;
            operation = null;
            dialog.querySelector('#carGroupTitle').textContent = current ? 'ตั้งค่าคันรถ / คันรถ Group' : 'สร้างคันรถ / คันรถ Group';
            input('groupId').value = current?.id ?? '';
            if (current) {
                for (const key of ['year', 'month', 'week', 'startDate', 'endDate', 'name', 'province', 'workNote', 'budget']) {
                    input(key).value = current[key] ?? '';
                }
            }
            members.forEach((el, index) => {
                el.value = current?.members[index] ?? '';
                el.dataset.previous = el.value;
            });
            refreshChoices();
            input('owner').value = current?.ownerIndex === undefined ? '' : String(current.ownerIndex);
            input('self').value = current?.selfPosition === undefined ? '' : String(current.selfPosition);
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
