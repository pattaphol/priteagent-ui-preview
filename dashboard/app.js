import { carModeMarkup,carStatusMarkup,carIcon,enableCarTabKeyboard } from '../ui/car-list-components.js?rev=pa-ui-unified-r1';
import { mountWorkspaceShell, workspaceMenus } from './workspace-shell.js?rev=pa-admin-integrated-r23';
import { adminDemoMarkup, mountAdminDemo } from './admin-demo.js?rev=pa-admin-policy-r24';
import { layouts, deviceFor, initialFilters, filterCars, bodyTarget } from './domain.js?rev=pm34-groupform-20261116';
import { LocalPreferences, LocalCarGroupStore } from './adapters.js';
const root = document.querySelector('#app');
enableCarTabKeyboard();
let storage;
try {
    storage = window.localStorage;
} catch  {
    storage = {
        getItem: ()=>null,
        setItem: ()=>{
            throw new Error('Storage unavailable');
        }
    };
}
const prefs = new LocalPreferences(storage);
const groupStore = new LocalCarGroupStore();
const pendingKey = 'priteagent-v2:phase1:pending-operation:';
const pendingStorage = ()=>{
    try {
        return window.localStorage;
    } catch  {
        throw new Error('STORAGE_UNAVAILABLE');
    }
};
const pendingKeys = ()=>Object.keys(pendingStorage()).filter((key)=>key === pendingKey.slice(0, -1) || key.startsWith(pendingKey));
let page = 'cars', device = deviceFor(innerWidth), layout = prefs.read(page, device);
let filters = initialFilters(), cars = [], state = 'ready', revision = 0;
let prefError = '', selected = null;
const months = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
];
const names = {...workspaceMenus.agent, ...workspaceMenus.customer};
const layoutNames = {
    small: 'กะทัดรัด',
    medium: 'มาตรฐาน',
    large: 'รายละเอียด',
    table: 'ตาราง'
};
const e = (s)=>s.replace(/[&<>"']/g, (c)=>({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[c]);
const money = (n)=>new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n) + ' ฿';
const date = (s)=>s ? new Date(s + 'T12:00:00').toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) : 'ยังไม่ระบุ';
const period = (c)=>c.group ? `วีค ${c.group.week} · ${months[c.group.month - 1]} ${c.group.year}` : 'ยังไม่ระบุปี เดือน และวีค';
const route = new URL(location.href);
let area = route.searchParams.get('area') === 'customer' ? 'customer' : 'agent';
const requestedView = route.searchParams.get('view');
let screen = Object.hasOwn(workspaceMenus[area],requestedView) && requestedView !== 'cars' ? requestedView : 'home';
let detailCarId = null;
let unmountShell;
function openCarDirectory(params = {}) {
    const target = new URL('../car-directory/', window.location.href);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    window.location.assign(target);
}
function navigate(destination) {
    if (destination === 'cars') {
        openCarDirectory();
        return;
    }
    screen = destination;
    detailCarId = null;
    if (screen === 'admin-demo' || new URL(location.href).searchParams.get('view') === 'admin-demo') {
        const url = new URL(location.href);
        if (screen === 'admin-demo') { url.searchParams.set('view', 'admin-demo'); url.searchParams.delete('area'); }
        else url.searchParams.delete('view');
        history.replaceState(null, '', url);
    }
    render();
    document.querySelector('main h1')?.focus();
}
const nav = {
    open (target) {
        if (!cars.some((c)=>c.id === target.carId)) {
            showSimulation('ไม่พบคันรถ');
            return;
        }
        if (target.screen === 'settings') {
            screen = 'car-detail';
            detailCarId = target.carId;
            render();
            document.querySelector('main h1')?.focus();
            return;
        }
        navigate(target.screen === 'entries' ? 'expenses' : 'holding-cars');
    }
};
function showSimulation(title, context = '', screen = 'module') {
    const dialog = document.querySelector('#simulation');
    dialog.querySelector('#dialog-title').textContent = title;
    dialog.querySelector('#context').textContent = context;
    dialog.dataset.screen = screen;
    dialog.showModal();
}
function actions(c) {
    return `<div class="directory-car-actions"><button data-car="${c.id}" data-action="entries">▤ ค่าใช้จ่าย</button><button data-car="${c.id}" data-action="holding">▦ ถืองาน</button></div>`;
}
function card(c) {
    return `<article class="directory-car card-${layout}"><button class="directory-car-open" data-car="${c.id}" data-action="body" aria-label="${page === 'holding-cars' ? 'ถืองาน' : 'ตั้งค่าคันรถ'} ${e(c.name)}"><div class="directory-car-head"><span class="car-icon" aria-hidden="true">▰</span><span class="badge ${c.closed ? 'closed' : ''}">${c.closed ? 'ปิดคันรถแล้ว' : 'กำลังดำเนินการ'}</span></div><h2>${e(c.name)}</h2><div class="car-facts"><span class="pa-fact">${carIcon('pin')} ${e(c.destination || 'ยังไม่ระบุจังหวัด')}</span><span class="pa-fact">${carIcon('calendar')} ${period(c)}</span>${layout !== 'small' ? `<span>${date(c.start)} – ${date(c.end)}</span>` : ''}</div>${layout === 'large' ? `<div class="work-members">${c.members.slice(0, 4).map((m)=>`<span><i aria-hidden="true">${e(m.name.slice(-1))}</i>${e(m.name)}</span>`).join('')}${c.members.length > 4 ? `<span>+${c.members.length - 4} คน</span>` : ''}</div>${c.group ? `<small class="directory-code">${e(c.group.groupId)}</small>` : ''}` : ''}${layout !== 'small' ? `<div class="directory-car-total"><span>ค่าใช้จ่าย<strong>${money(c.expenseTHB)}</strong></span>${layout === 'large' ? `<span>เงินกองกลางคงเหลือ<strong>${money(c.poolTHB)}</strong></span>` : ''}</div>` : ''}</button>${actions(c)}</article>`;
}
function rowsMarkup(rows) {
    if (layout !== 'table') return `<div class="car-directory-grid directory-${layout}">${rows.map(card).join('')}</div>`;
    return `<div class="directory-table-wrap" tabindex="0" role="region" aria-label="ตารางคันรถ เลื่อนซ้ายขวาได้"><table><thead><tr>${[
        'คันรถ',
        'จังหวัด / วีค',
        'ช่วงวันที่',
        'ค่าใช้จ่าย',
        'ไปยัง'
    ].map((h)=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((c)=>`<tr data-row="${c.id}"><td><button data-car="${c.id}" data-action="body">${e(c.name)}</button><small>${c.closed ? 'ปิดคันรถแล้ว' : 'กำลังดำเนินการ'}</small></td><td>${e(c.destination || 'ยังไม่ระบุจังหวัด')}<small>${period(c)}</small></td><td>${date(c.start)} – ${date(c.end)}</td><td>${money(c.expenseTHB)}</td><td>${actions(c)}</td></tr>`).join('')}</tbody></table></div>`;
}
function result() {
    const rows = filterCars(cars, filters), el = document.querySelector('#results');
    document.querySelector('#count').textContent = `${rows.length} คันรถ · ${layoutNames[layout]}`;
    el.setAttribute('aria-busy', String(state === 'loading'));
    el.innerHTML = state === 'loading' ? '<div class="empty" role="status">กำลังโหลดข้อมูลคันรถ… <button data-retry>โหลดรายการใหม่</button></div>' : state === 'error' ? '<div class="empty" role="alert">โหลดข้อมูลคันรถไม่สำเร็จ <button data-retry>ลองอีกครั้ง</button></div>' : rows.length ? rowsMarkup(rows) : '<div class="empty" role="status">ไม่พบคันรถตามคำค้นหาหรือตัวกรองนี้ <button data-reset>ล้างตัวกรอง</button></div>';
}
function render() {
    const activeName = screen === 'car-detail' ? 'รายละเอียดคันรถ' : names[screen];
    const areaName = area === 'agent' ? 'งานตัวแทน' : 'งานลูกค้า';
    const detail = cars.find((car)=>car.id === detailCarId);
    const directory = screen === 'cars';
    unmountShell?.();
    root.innerHTML = `<header id="workspace-header"></header><aside id="workspace-menu" aria-label="เมนูนำทาง"></aside>

 <main id="main" tabindex="-1">
 <nav class="shell-breadcrumb" aria-label="เส้นทาง"><button data-page="home">${areaName}</button>
 ${screen === 'car-detail' ? '<button data-page="cars">คันรถของฉัน</button>' : ''}<span aria-current="page">${activeName}</span></nav>
 <div id="pending-recovery" role="status"></div>
 ${directory ? `<div class="notice">ข้อมูลคันรถเก็บเฉพาะอุปกรณ์นี้ ยังไม่เชื่อมบัญชีผู้ใช้</div><div class="heading"><div><h1 tabindex="-1">คันรถของฉัน</h1><p>เลือกคันรถเพื่อดูรายละเอียดหรือแก้ไข</p></div><div class="create"><button data-action="create-group">+ สร้างคันรถ</button><button disabled>เข้าร่วมคันรถ</button></div></div>
 <div class="tools"><label class="search">ค้นหา<input id="search" type="search" placeholder="คันรถ จังหวัด รหัสกลุ่ม หรือสมาชิก" value="${e(filters.query)}"></label><div class="periods">${select('year', 'ปี', [
        '',
        ...[
            ...new Set(cars.flatMap((c)=>c.group ? [
                    c.group.year
                ] : []))
        ].sort((a, b)=>b - a).map(String)
    ], filters.year)}${select('month', 'เดือน', [
        '',
        ...months.map((_, i)=>String(i + 1))
    ], filters.month, months)}${select('week', 'วีค', [
        '',
        '1',
        '2',
        '3',
        '4',
        '5'
    ], filters.week)}</div></div>
 <section class="view-controls" aria-label="รูปแบบการแสดงคันรถ"><div class="pa-view-icons" role="group" aria-label="เลือกรูปแบบ">${carModeMarkup(layout)}</div><p>จำรูปแบบแยกตามหน้าและอุปกรณ์ · ${device}<small id="pref-error" role="status">${prefError}</small></p></section>
 <div class="filterbar pa-status-tabs" role="tablist" aria-label="สถานะคันรถ">${carStatusMarkup(filters.status,'status')}</div><p id="count" role="status"></p><section id="results" aria-label="รายการคันรถ"></section>
 ` : screen==='home' ? `<section class="shell-page dashboard-page" aria-labelledby="dashboard-title">
 <div class="dashboard-intro"><div><span class="dashboard-kicker">${areaName}</span><h1 id="dashboard-title" tabindex="-1">หน้าแรก</h1><p>ภาพรวมงานของคุณใน PriteAgent V2</p></div><span class="dashboard-status">ข้อมูลบนอุปกรณ์นี้</span></div>
 ${area==='agent'?`
 <div class="dashboard-stats" aria-label="สรุปข้อมูลคันรถ"><article class="dashboard-stat"><span>คันรถที่บันทึกไว้</span><strong>${cars.length}</strong><small>ข้อมูลในเบราว์เซอร์เครื่องนี้</small></article><article class="dashboard-stat"><span>คันรถที่กำลังดำเนินการ</span><strong>${cars.filter(c=>!c.closed&&!c.archived).length}</strong><small>ไม่นับคันรถที่ปิดหรือจัดเก็บ</small></article></div>
 <div class="dashboard-work"><h2>เริ่มทำงาน</h2><div class="dashboard-actions"><button data-page="cars" class="dashboard-primary">ดูคันรถของฉัน</button><button data-action="create-group">+ สร้างคันรถ</button></div>
 <h2>รายการคันรถของฉัน</h2>${cars.length?`<div class="dashboard-car-list">${cars.slice(0,3).map(c=>`<button data-car="${e(c.id)}" data-action="body" aria-label="เปิดรายละเอียดคันรถ ${e(c.name)}"><span><strong>${e(c.name)}</strong><small>${e(c.destination||'ยังไม่ระบุจังหวัด')} · ${period(c)}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`:'<p class="dashboard-empty">ยังไม่มีคันรถที่บันทึกไว้ เริ่มจากปุ่มสร้างคันรถ</p>'}</div>
 <p class="dashboard-footnote">ค่าใช้จ่าย ถืองาน และงานลูกค้ายังไม่เปิดใช้งานจริง ข้อมูลคันรถที่สร้างในขั้นนี้ไม่ใช่ข้อมูลกลางข้ามอุปกรณ์</p>
 `:'<div class="dashboard-work"><h2>งานลูกค้า</h2><p>ยังไม่พร้อมใช้งาน ขณะนี้ยังไม่มีข้อมูลลูกค้าหรือสิทธิ์บัญชีจริง</p><button data-area="agent">กลับงานตัวแทน</button></div>'}
 </section>` : screen === 'admin-demo' ? adminDemoMarkup() : screen === 'car-detail' && detail ? `<section class="shell-page"><h1 tabindex="-1">${e(detail.name)}</h1><p>${e(detail.destination)} · ${period(detail)}</p><p>${date(detail.start)} – ${date(detail.end)}</p><ul>${detail.members.map((m)=>`<li>${e(m.name)}</li>`).join('')}</ul><button data-action="edit-group" data-id="${e(detail.id)}">แก้ไขคันรถ</button><button data-page="cars">กลับรายการ</button></section>` : `<section class="shell-page"><h1 tabindex="-1">${activeName}</h1><p>ยังไม่พร้อมใช้งาน</p><button data-page="home">กลับหน้าแรก</button></section>`}
 <footer>PriteAgent V2 · พื้นที่ทำงาน</footer></main>
 <dialog id="simulation" aria-labelledby="dialog-title"><h2 id="dialog-title"></h2><p id="context"></p><strong>ยังไม่เปิดใช้งาน</strong><p>ฟีเจอร์นี้อยู่ระหว่างพัฒนา ยังไม่สามารถบันทึกหรือจัดการข้อมูลในส่วนนี้ได้</p><button id="close-dialog" autofocus>ปิด</button></dialog>`;
    if (directory) result();
    unmountShell = mountWorkspaceShell({
        header: document.querySelector('#workspace-header'),
        sidebar: document.querySelector('#workspace-menu'),
        area, screen,
        onNavigate(nextArea, nextScreen) {
            area = nextArea;
            navigate(nextScreen);
        }
    });
    if (screen === 'admin-demo') mountAdminDemo();
    showPendingRecovery();
    document.querySelector('#search')?.addEventListener('input', (ev)=>{
        filters.query = ev.target.value;
        result();
    });
    for (const k of [
        'year',
        'month',
        'week'
    ])document.querySelector('#' + k)?.addEventListener('change', (ev)=>{
        filters[k] = ev.target.value;
        result();
    });
    document.querySelector('#close-dialog').addEventListener('click', ()=>document.querySelector('dialog').close());
}
function select(id, title, values, current, labels) {
    return `<label>${title}<select id="${id}" aria-label="กรอง${title}">${values.map((v)=>`<option value="${v}" ${v === current ? 'selected' : ''}>${v ? labels ? labels[Number(v) - 1] : v : 'ทุก' + title}</option>`).join('')}</select></label>`;
}
async function load(next) {
    const token = ++revision;
    state = next;
    selected = null;
    if (next === 'loading') {
        render();
        return;
    }
    try {
        const saved = await groupStore.list();
        if (token !== revision) return;
        cars = [
            ...saved.map((g)=>({
                    id: g.id,
                    name: g.name,
                    destination: g.province,
                    start: g.startDate,
                    end: g.endDate,
                    closed: false,
                    archived: false,
                    group: {
                        groupId: g.id,
                        year: g.year,
                        month: g.month,
                        week: g.week
                    },
                    members: g.members.map((name, i)=>({
                            id: String(i),
                            name
                        })),
                    expenseTHB: 0,
                    poolTHB: 0
                }))
        ];
    } catch  {
        if (token !== revision) return;
        cars = [];
        state = 'error';
    }
    render();
}
root.addEventListener('click', (ev)=>{
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'recover-pending') {
        openCarDirectory();
    } else if (b.dataset.action === 'create-group') {
        openCarDirectory({create:'1'});
    } else if (b.dataset.action === 'edit-group' && b.dataset.id) {
        openCarDirectory({car:b.dataset.id});
    } else if (b.dataset.car) {
        if (b.dataset.action === 'body') openCarDirectory({car:b.dataset.car});
        else nav.open({carId:b.dataset.car,screen:b.dataset.action});
    } else if (b.dataset.layout) {
        layout = b.dataset.layout;
        prefError = prefs.write(page, device, layout) ? '' : 'บันทึกรูปแบบไม่ได้ · ใช้เฉพาะครั้งนี้';
        render();
        document.querySelector(`[data-layout="${layout}"]`).focus();
    } else if (b.dataset.status) {
        filters.status = b.dataset.status;
        render();
        document.querySelector(`[data-status="${filters.status}"]`).focus();
    } else if (b.dataset.page) {
        navigate(b.dataset.page);
    } else if (b.dataset.area) {
        area = b.dataset.area;
        navigate('home');
    } else if (b.dataset.sim) showSimulation(b.dataset.sim);
    else if (b.hasAttribute('data-retry')) void load('ready');
    else if (b.hasAttribute('data-reset')) {
        filters = initialFilters();
        render();
        document.querySelector('#search').focus();
    }
});
document.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Tab' && document.querySelector('#simulation')?.open) {
        ev.preventDefault();
        document.querySelector('#close-dialog').focus();
    }
});
addEventListener('resize', ()=>{
    const next = deviceFor(innerWidth);
    if (next !== device) {
        device = next;
        layout = prefs.read(page, device);
        render();
    }
});
void load('ready');
function showPendingRecovery() {
    const region = document.querySelector('#pending-recovery');
    try {
        if (pendingKeys().length) {
            region.innerHTML = '<p>มีคำขอบันทึกคันรถที่ยังไม่ได้ยืนยัน</p><button type="button" data-action="recover-pending">ไปตรวจผลที่รายการคันรถ</button>';
        }
    } catch {
        region.textContent = 'ไม่สามารถตรวจคำขอที่ค้างในเครื่องได้';
    }
}
