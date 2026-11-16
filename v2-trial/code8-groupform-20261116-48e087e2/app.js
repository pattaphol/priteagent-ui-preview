import { layouts, deviceFor, initialFilters, filterCars, bodyTarget, validateCarGroup } from './domain.js';
import { LocalPreferences, LocalCarGroupStore } from './adapters.js';
const root = document.querySelector('#app');
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
const pendingKey = 'priteagent-preview:code8-groupform-20261116-48e087e2:pending-operation:';
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
let prefError = '', menuOpen = false, selected = null;
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
const names = {
    home: 'หน้าหลัก',
    cars: 'คันรถของฉัน',
    expenses: 'ค่าใช้จ่าย',
    'holding-cars': 'เลือกคันรถเพื่อดูงานที่ถือ',
    performance: 'ผลงาน',
    bonuses: 'โบนัสและคุณวุฒิ',
    customers: 'ลูกค้า',
    planning: 'วางแผนประกัน',
    policies: 'กรมธรรม์',
    coverage: 'สรุปความคุ้มครอง'
};
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
const areas = {
    agent: [
        'home',
        'cars',
        'expenses',
        'holding-cars',
        'performance',
        'bonuses'
    ],
    customer: [
        'home',
        'customers',
        'planning',
        'policies',
        'coverage'
    ]
};
let area = 'agent';
let screen = 'cars';
let detailCarId = null;
let profileOpen = false;
const themeKey = 'priteagent-preview:code8-groupform-20261116-48e087e2:theme';
try {
    const savedTheme = storage.getItem(themeKey);
    if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;
} catch  {}
function navigate(destination) {
    screen = destination;
    detailCarId = null;
    menuOpen = false;
    profileOpen = false;
    render();
    document.querySelector('main h1')?.focus();
}
function menuMarkup(ids) {
    return ids.map((id)=>`<button data-page="${id}" ${screen === id || screen === 'car-detail' && id === 'cars' ? 'aria-current="page"' : ''}>${names[id]}</button>`).join('');
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
    return `<article class="directory-car card-${layout}"><button class="directory-car-open" data-car="${c.id}" data-action="body" aria-label="${page === 'holding-cars' ? 'ถืองาน' : 'ตั้งค่าคันรถ'} ${e(c.name)}"><div class="directory-car-head"><span class="car-icon" aria-hidden="true">▰</span><span class="badge ${c.closed ? 'closed' : ''}">${c.closed ? 'ปิดคันรถแล้ว' : 'กำลังดำเนินการ'}</span></div><h2>${e(c.name)}</h2><div class="car-facts"><span>⌖ ${e(c.destination || 'ยังไม่ระบุจังหวัด')}</span><span>▦ ${period(c)}</span>${layout !== 'small' ? `<span>${date(c.start)} – ${date(c.end)}</span>` : ''}</div>${layout === 'large' ? `<div class="work-members">${c.members.slice(0, 4).map((m)=>`<span><i aria-hidden="true">${e(m.name.slice(-1))}</i>${e(m.name)}</span>`).join('')}${c.members.length > 4 ? `<span>+${c.members.length - 4} คน</span>` : ''}</div>${c.group ? `<small class="directory-code">${e(c.group.groupId)}</small>` : ''}` : ''}${layout !== 'small' ? `<div class="directory-car-total"><span>ค่าใช้จ่าย<strong>${money(c.expenseTHB)}</strong></span>${layout === 'large' ? `<span>เงินกองกลางคงเหลือ<strong>${money(c.poolTHB)}</strong></span>` : ''}</div>` : ''}</button>${actions(c)}</article>`;
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
    el.innerHTML = state === 'loading' ? '<div class="empty" role="status">กำลังโหลดคันรถตัวอย่าง… <button data-retry>แสดงข้อมูลตัวอย่าง</button></div>' : state === 'error' ? '<div class="empty" role="alert">โหลดข้อมูลตัวอย่างไม่สำเร็จ <button data-retry>ลองอีกครั้ง</button></div>' : rows.length ? rowsMarkup(rows) : '<div class="empty" role="status">ไม่พบคันรถตามคำค้นหาหรือตัวกรองนี้ <button data-reset>ล้างตัวกรอง</button></div>';
}
function render() {
    const activeName = screen === 'car-detail' ? 'รายละเอียดคันรถ' : names[screen];
    const areaName = area === 'agent' ? 'งานตัวแทน' : 'งานลูกค้า';
    const detail = cars.find((car)=>car.id === detailCarId);
    const directory = screen === 'cars';
    const profile = `<div class="shell-profile" id="shell-profile" ${profileOpen ? '' : 'hidden'}><strong>บัญชีทดลอง</strong><p>ข้อมูลบันทึกในเบราว์เซอร์นี้</p></div>`;
    root.innerHTML = `<header class="shell-header">
 <button id="menu" aria-expanded="${menuOpen}" aria-controls="sidebar">☰ <span>เมนู</span></button>
 <strong class="brand">prite<span>agent</span> <small>V2</small></strong>
 <div class="shell-current">${activeName}</div>
 <div class="shell-actions">
 <button id="shell-search" ${directory ? '' : 'disabled'} aria-label="ค้นหาในรายการรถ">ค้นหา</button>
 <button id="theme" aria-label="สลับธีม">◐ ธีม</button>
 <button type="button" disabled aria-label="การแจ้งเตือนยังไม่พร้อมใช้งาน">แจ้งเตือน</button>
 <button id="profile" aria-expanded="${profileOpen}" aria-controls="shell-profile">บัญชี</button>
 </div>${profile}</header>
 <aside id="sidebar" class="${menuOpen ? 'open' : ''}"><div class="work-area" role="group" aria-label="เลือกพื้นที่ทำงาน">
 <button data-area="agent" aria-pressed="${area === 'agent'}">งานตัวแทน</button>
 <button data-area="customer" aria-pressed="${area === 'customer'}">งานลูกค้า</button></div>
 <nav aria-label="เมนูพื้นที่ทำงาน">${menuMarkup(areas[area])}</nav></aside>
 <nav class="shell-bottom" aria-label="เมนูมือถือ">${menuMarkup(areas[area].slice(0, 4))}<button id="more-nav" aria-controls="sidebar" aria-expanded="${menuOpen}">เพิ่มเติม</button></nav>
 <main id="main" tabindex="-1">
 <nav class="shell-breadcrumb" aria-label="เส้นทาง"><button data-page="home">${areaName}</button>
 ${screen === 'car-detail' ? '<button data-page="cars">คันรถของฉัน</button>' : ''}<span aria-current="page">${activeName}</span></nav>
 <div id="pending-recovery" role="status"></div>
 ${directory ? `<div class="notice">ข้อมูลเก็บในเบราว์เซอร์นี้ กรุณาใช้ข้อมูลจำลอง</div><div class="heading"><div><h1 tabindex="-1">คันรถของฉัน</h1><p>เลือกคันรถเพื่อดูรายละเอียดหรือแก้ไข</p></div><div class="create"><button data-action="create-group">+ สร้างคันรถ</button><button disabled>เข้าร่วมคันรถ</button></div></div>
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
 <section class="view-controls" aria-label="รูปแบบการแสดงคันรถ"><div role="group" aria-label="เลือกรูปแบบ">${layouts.map((l)=>`<button data-layout="${l}" aria-pressed="${layout === l}">${layoutNames[l]}</button>`).join('')}</div><p>จำรูปแบบแยกตามหน้าและอุปกรณ์ · ${device}<small id="pref-error" role="status">${prefError}</small></p></section>
 <div class="filterbar" role="group" aria-label="สถานะ">${Object.entries({
        all: 'ทั้งหมด',
        open: 'กำลังดำเนินการ',
        closed: 'ปิดแล้ว',
        archived: 'คลังคันรถ'
    }).map(([s, n])=>`<button data-status="${s}" aria-pressed="${filters.status === s}">${n}</button>`).join('')}</div><p id="count" role="status"></p><section id="results" aria-label="รายการคันรถ"></section>
 ` : screen === 'home' ? `<section class="shell-page"><h1 tabindex="-1">หน้าแรก</h1><p>พื้นที่ทดลองส่วนตัว</p>${area === 'agent' ? `<p>คันรถที่บันทึกในเครื่อง ${cars.length} คัน</p><button data-page="cars">เปิดรายการคันรถ</button>` : '<p>งานลูกค้ายังไม่พร้อมใช้งาน</p>'}</section>` : screen === 'car-detail' && detail ? `<section class="shell-page"><h1 tabindex="-1">${e(detail.name)}</h1><p>${e(detail.destination)} · ${period(detail)}</p><p>${date(detail.start)} – ${date(detail.end)}</p><ul>${detail.members.map((m)=>`<li>${e(m.name)}</li>`).join('')}</ul><button data-action="edit-group" data-id="${e(detail.id)}">แก้ไขคันรถ</button><button data-page="cars">กลับรายการ</button></section>` : `<section class="shell-page"><h1 tabindex="-1">${activeName}</h1><p>ยังไม่พร้อมใช้งาน</p><button data-page="home">กลับหน้าแรก</button></section>`}
 <footer>PriteAgent V2 · ทดลองส่วนตัว</footer></main>
 <dialog id="simulation" aria-labelledby="dialog-title"><h2 id="dialog-title"></h2><p id="context"></p><strong>SIMULATED / NOT IMPLEMENTED</strong><p>แสดงปลายทางและบริบทคันรถเท่านั้น ยังไม่มีการบันทึก แก้ไข หรือคำนวณจริง</p><button id="close-dialog" autofocus>ปิด</button></dialog>`;
    if (directory) result();
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
        void recoverPending();
    } else if (b.dataset.action === 'create-group') {
        try {
            if (pendingKeys().length) {
                alert('กรุณาตรวจคำขอบันทึกที่ค้างก่อนสร้างรายการใหม่');
                return;
            }
            void openGroupForm();
        } catch  {
            alert('ไม่สามารถใช้พื้นที่จัดเก็บในเครื่องได้ จึงยังสร้างรายการไม่ได้');
        }
    } else if (b.dataset.action === 'edit-group' && b.dataset.id) {
        void openGroupForm(b.dataset.id);
    } else if (b.dataset.car) {
        const id = b.dataset.car;
        nav.open(b.dataset.action === 'body' ? bodyTarget(page, id) : {
            carId: id,
            screen: b.dataset.action
        });
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
    } else if (b.id === 'shell-search') {
        document.querySelector('#search')?.focus();
    } else if (b.id === 'profile') {
        profileOpen = !profileOpen;
        b.setAttribute('aria-expanded', String(profileOpen));
        document.querySelector('#shell-profile').hidden = !profileOpen;
    } else if (b.dataset.sim) showSimulation(b.dataset.sim);
    else if (b.hasAttribute('data-retry')) void load('ready');
    else if (b.hasAttribute('data-reset')) {
        filters = initialFilters();
        render();
        document.querySelector('#search').focus();
    } else if (b.id === 'menu' || b.id === 'more-nav') {
        menuOpen = !menuOpen;
        document.querySelector('aside').classList.toggle('open', menuOpen);
        for (const id of [
            'menu',
            'more-nav'
        ])document.querySelector('#' + id)?.setAttribute('aria-expanded', String(menuOpen));
    } else if (b.id === 'theme') {
        const dark = document.documentElement.dataset.theme === 'dark' || !document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches;
        const next = dark ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try {
            storage.setItem(themeKey, next);
        } catch  {}
    }
});
document.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Tab' && document.querySelector('#simulation')?.open) {
        ev.preventDefault();
        document.querySelector('#close-dialog').focus();
    }
    if (ev.key === 'Escape' && menuOpen) {
        menuOpen = false;
        document.querySelector('aside').classList.remove('open');
        document.querySelector('#menu').setAttribute('aria-expanded', 'false');
        document.querySelector('#menu').focus();
    }
});
addEventListener('resize', ()=>{
    const next = deviceFor(innerWidth);
    if (next !== device) {
        device = next;
        layout = prefs.read(page, device);
        menuOpen = false;
        render();
    }
});
void load('ready');
async function openGroupForm(id) {
    let current = id ? await groupStore.get(id) : null;
    if (id && !current) {
        alert('ไม่พบคันรถที่ต้องการแก้ไข กรุณากลับไปตรวจสอบรายการ');
        return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'groupform-sheet';
    dialog.setAttribute('aria-label', 'ข้อมูลคันรถตัวอย่าง');
    dialog.innerHTML = `<form class="groupform-page" novalidate>
 <header class="groupform-header"><div class="groupform-kicker">PriteAgent · จัดการคันรถ</div><h2>${current ? 'แก้ไขข้อมูลคันรถ' : 'สร้างคันรถ'}</h2><p>กรอกข้อมูลในฟอร์มเดียว ตรวจทานท้ายหน้าแล้วกดบันทึก</p></header>
 <div class="groupform-body"><section class="groupform-card"><h3>ข้อมูลคันรถ</h3><p class="groupform-id">รหัสคันรถ: <span data-group-id></span></p>
 <label>ปี <input name="year" type="number" required></label><label>เดือน <input name="month" type="number" min="1" max="12" required></label><label>วีค <input name="week" type="number" min="1" max="5" required></label>
 <label>วันเริ่ม <input name="startDate" type="date" required></label><label>วันสิ้นสุด <input name="endDate" type="date" required></label>
 <label>ชื่อคันรถ <input name="name" required></label><label>จังหวัด <input name="province" required></label><label>หมายเหตุพื้นที่/งาน <input name="workNote"></label></section>
 <section class="groupform-card"><h3>สมาชิกและผู้รับผิดชอบ</h3><p class="groupform-hint">สมาชิกคนที่ 1 เป็นหัวหน้าคัน เจ้าของรถและตัวเองเลือกแยกกันได้</p>
 <label>จำนวนสมาชิก <input name="memberCount" type="number" min="1" max="4" required></label>
 ${[
        1,
        2,
        3,
        4
    ].map((i)=>`<label>สมาชิก ${i}${i === 1 ? ' (หัวหน้าคัน)' : ''} <input name="member${i}"></label>`).join('')}
 <label>ใช้รถ (เจ้าของรถ) <select name="ownerIndex" required></select></label>
 <label>ตัวเอง (ตำแหน่ง · ข้อมูลจำลอง) <select name="selfPosition"></select></label><p class="groupform-hint">ตำแหน่งตัวเองไม่ผูกบัญชีหรือสิทธิ์จริง</p></section>
 <section class="groupform-card"><h3>งบประมาณ</h3><label>งบประมาณ (บาทเต็ม) <input name="budget" type="number" step="1"></label><p class="groupform-hint">ค่าน้ำมัน: ยังไม่คำนวณในหน้านี้</p></section>
 <section class="groupform-card groupform-review"><h3>ตรวจทานก่อนบันทึก</h3><p class="groupform-hint">ข้อมูลจะบันทึกลงเบราว์เซอร์นี้เมื่อยืนยันสำเร็จ</p>
 <div data-review hidden></div><p role="alert" data-error></p><div class="groupform-buttons"><button type="button" data-close>ยกเลิก</button><button type="submit">ตรวจทานข้อมูล</button><button type="button" data-save hidden>บันทึกคันรถ</button></div></section></div></form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    const field = (name)=>form.elements.namedItem(name);
    const owner = form.querySelector('[name="ownerIndex"]');
    const self = form.querySelector('[name="selfPosition"]');
    const review = dialog.querySelector('[data-review]');
    const count = field('memberCount');
    const memberInputs = [
        1,
        2,
        3,
        4
    ].map((position)=>field('member' + position));
    const validCount = (value)=>Number.isInteger(value) && value >= 1 && value <= memberInputs.length;
    let memberCount = current && validCount(current.members.length) ? current.members.length : 1;
    count.value = String(memberCount);
    dialog.querySelector('[data-group-id]').textContent = current?.id ?? 'กำหนดหลังบันทึก';
    if (current) {
        for (const key of [
            'year',
            'month',
            'week',
            'startDate',
            'endDate',
            'name',
            'province',
            'workNote'
        ])field(key).value = String(current[key]);
        memberInputs.forEach((input, index)=>{
            input.value = current.members[index] ?? '';
        });
        field('budget').value = current.budget === undefined ? '' : String(current.budget);
    }
    function refreshChoices(ownerValue = owner.value, selfValue = self.value) {
        for (const [index, input] of memberInputs.entries()){
            const visible = index < memberCount;
            input.closest('label').hidden = !visible;
            input.required = visible;
        }
        for (const [select, placeholder, selected] of [
            [
                owner,
                'เลือกสมาชิก',
                ownerValue
            ],
            [
                self,
                'ไม่ระบุ',
                selfValue
            ]
        ]){
            select.replaceChildren(new Option(placeholder, ''));
            for (const [index, input] of memberInputs.slice(0, memberCount).entries()){
                const name = input.value.trim();
                if (name) select.add(new Option('คนที่ ' + (index + 1) + ' · ' + name, String(index + 1)));
            }
            if (Array.from(select.options).some((option)=>option.value === selected)) select.value = selected;
        }
    }
    refreshChoices(current ? String(current.ownerIndex + 1) : '', current?.selfPosition === undefined ? '' : String(current.selfPosition + 1));
    let draft = null;
    let requestId = crypto.randomUUID(), dirty = false, outcomeUnknown = false;
    const beforeUnload = (event)=>{
        if (dirty || count.value !== String(memberCount)) {
            event.preventDefault();
            event.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', beforeUnload);
    const controls = Array.from(form.querySelectorAll('input,select'));
    const fieldErrors = new Map(controls.map((control)=>{
        const message = document.createElement('span');
        message.className = 'groupform-field-error';
        message.id = 'groupform-error-' + control.name;
        message.hidden = true;
        control.after(message);
        control.setAttribute('aria-describedby', message.id);
        return [
            control.name,
            message
        ];
    }));
    const hideReview = ()=>{
        review.hidden = true;
        saveButton.hidden = true;
    };
    const invalidateReview = ()=>{
        dirty = true;
        draft = null;
        requestId = crypto.randomUUID();
        hideReview();
    };
    function applyMemberCount() {
        const next = count.valueAsNumber;
        if (!validCount(next)) return false;
        if (next === memberCount) return true;
        if (next < memberCount) {
            const removed = memberInputs.slice(next, memberCount).flatMap((input, index)=>{
                const name = input.value.trim();
                return name ? [
                    name + ' (คนที่ ' + (next + index + 1) + ')'
                ] : [];
            });
            const ownerAffected = Number(owner.value) > next;
            const selfAffected = Number(self.value) > next;
            if (removed.length || ownerAffected || selfAffected) {
                const message = [
                    'นำสมาชิกออก: ' + removed.join(', ')
                ];
                if (ownerAffected) message.push('เจ้าของรถ ' + (memberInputs[Number(owner.value) - 1]?.value.trim() || owner.value) + ' จะถูกนำออก กรุณาเลือกเจ้าของรถใหม่');
                if (selfAffected) message.push('ตำแหน่งตัวเองจะถูกล้าง');
                if (!confirm(message.join('\n') + '\nยืนยันการลดสมาชิกหรือไม่?')) {
                    count.value = String(memberCount);
                    return false;
                }
            }
        }
        memberCount = next;
        refreshChoices();
        invalidateReview();
        return true;
    }
    count.addEventListener('change', ()=>{
        if (!saving && !outcomeUnknown) applyMemberCount();
    });
    for (const [index, input] of memberInputs.entries()){
        let previousName = input.value;
        input.addEventListener('change', ()=>{
            const position = String(index + 1);
            const ownerAffected = owner.value === position;
            const selfAffected = self.value === position;
            if (previousName.trim() && !input.value.trim() && (ownerAffected || selfAffected)) {
                const impacts = [
                    ownerAffected ? 'เจ้าของรถ' : '',
                    selfAffected ? 'ตัวเอง' : ''
                ].filter(Boolean).join(' และ ');
                if (!confirm('ล้างชื่อ ' + previousName.trim() + ' ซึ่งเป็น ' + impacts + ' หรือไม่?')) {
                    input.value = previousName;
                    return;
                }
            }
            previousName = input.value;
            refreshChoices();
        });
    }
    form.addEventListener('input', (ev)=>{
        if (saving || outcomeUnknown || ev.target === count) return;
        invalidateReview();
    });
    form.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        if (saving || outcomeUnknown) return;
        if (validCount(count.valueAsNumber) && !applyMemberCount()) return;
        const candidate = {
            year: Number(field('year').value),
            month: Number(field('month').value),
            week: Number(field('week').value),
            startDate: field('startDate').value,
            endDate: field('endDate').value,
            name: field('name').value,
            province: field('province').value,
            workNote: field('workNote').value,
            members: memberInputs.slice(0, memberCount).map((input)=>input.value),
            ownerIndex: Number(owner.value) - 1,
            ...self.value ? {
                selfPosition: Number(self.value) - 1
            } : {},
            ...field('budget').value ? {
                budget: Number(field('budget').value)
            } : {}
        };
        const errors = validateCarGroup(candidate);
        if (!validCount(count.valueAsNumber)) errors.memberCount = 'ระบุจำนวนสมาชิกเป็นจำนวนเต็ม 1–4 คน';
        if (field('budget').validity.badInput) errors.budget = 'ระบุจำนวนเงินเป็นบาทเต็ม';
        let firstInvalid;
        for (const control of controls){
            const message = errors[control.name] || (control === count ? errors.members : undefined);
            const hint = fieldErrors.get(control.name);
            hint.textContent = message ?? '';
            hint.hidden = !message;
            if (message) {
                control.setAttribute('aria-invalid', 'true');
                firstInvalid ??= control;
            } else control.removeAttribute('aria-invalid');
        }
        saveError.textContent = '';
        if (firstInvalid) {
            draft = null;
            hideReview();
            firstInvalid.focus({
                preventScroll: true
            });
            firstInvalid.scrollIntoView({
                block: 'center'
            });
            return;
        }
        draft = candidate;
        review.textContent = [
            'ปี / เดือน / วีค: ' + candidate.year + ' / ' + candidate.month + ' / ' + candidate.week,
            'วันที่: ' + candidate.startDate + ' ถึง ' + candidate.endDate,
            'ชื่อคันรถ: ' + candidate.name,
            'จังหวัด: ' + candidate.province,
            'หมายเหตุ: ' + (candidate.workNote || '—'),
            'หัวหน้าคัน: คนที่ 1 · ' + candidate.members[0],
            'สมาชิก: ' + candidate.members.map((name, index)=>'คนที่ ' + (index + 1) + ' · ' + name).join(' | '),
            'เจ้าของรถ: คนที่ ' + (candidate.ownerIndex + 1) + ' · ' + candidate.members[candidate.ownerIndex],
            'ตัวเอง (ข้อมูลจำลอง): ' + (candidate.selfPosition === undefined ? 'ไม่ระบุ' : 'คนที่ ' + (candidate.selfPosition + 1) + ' · ' + candidate.members[candidate.selfPosition]),
            'งบประมาณ: ' + (candidate.budget === undefined ? 'ไม่ระบุ' : candidate.budget.toLocaleString('th-TH') + ' บาท'),
            'ค่าน้ำมัน: ยังไม่คำนวณในหน้านี้'
        ].join('\n');
        review.hidden = false;
        saveButton.hidden = false;
    });
    const saveButton = dialog.querySelector('[data-save]');
    const saveError = dialog.querySelector('[data-error]');
    let saving = false;
    saveButton.onclick = async ()=>{
        if (!draft || saving || !outcomeUnknown && count.valueAsNumber !== memberCount) return;
        const key = pendingKey + requestId;
        const operation = {
            id: current?.id ?? null,
            revision: current?.revision ?? null,
            draft,
            requestId
        };
        saving = true;
        saveButton.disabled = true;
        const inputs = Array.from(form.querySelectorAll('input'));
        const lockFields = (locked)=>{
            inputs.forEach((input)=>input.readOnly = locked);
            owner.disabled = locked;
            self.disabled = locked;
        };
        lockFields(true);
        try {
            if (!outcomeUnknown) {
                try {
                    pendingStorage().setItem(key, JSON.stringify(operation));
                } catch  {
                    lockFields(false);
                    saveError.textContent = 'ยังไม่ได้บันทึก พื้นที่เก็บคำขอไม่พร้อม ข้อมูลที่กรอกยังอยู่';
                    return;
                }
            }
            try {
                if (current) await groupStore.update(current.id, current.revision, operation.draft, operation.requestId);
                else await groupStore.create(operation.draft, operation.requestId);
            } catch (err) {
                if (err instanceof Error && err.message === 'CONFLICT_STALE_REVISION') {
                    outcomeUnknown = false;
                    lockFields(false);
                    saveButton.hidden = true;
                    draft = null;
                    try {
                        pendingStorage().removeItem(key);
                    } catch  {}
                    saveError.textContent = 'ข้อมูลถูกแก้ไขจากอีกที่ ข้อมูลที่กรอกยังอยู่ โปรดตรวจรายการล่าสุดก่อนแก้ไขอีกครั้ง';
                } else {
                    outcomeUnknown = true;
                    saveError.textContent = 'ยังยืนยันผลไม่ได้ กดบันทึกอีกครั้งเพื่อตรวจคำขอเดิม';
                }
                return;
            }
            try {
                pendingStorage().removeItem(key);
            } catch  {}
            dirty = false;
            outcomeUnknown = false;
            dialog.close();
            void load('ready');
        } finally{
            saving = false;
            saveButton.disabled = false;
        }
    };
    dialog.querySelector('[data-close]').onclick = ()=>{
        if (saving) return;
        if (outcomeUnknown && !confirm('ยังยืนยันผลบันทึกไม่ได้ โปรดคัดลอกข้อมูลก่อนออก คุณต้องการออกหรือไม่?')) return;
        if (!dirty && count.value === String(memberCount) || confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?')) dialog.close();
    };
    dialog.addEventListener('cancel', (ev)=>{
        if (saving) {
            ev.preventDefault();
            return;
        }
        if (outcomeUnknown && !confirm('ยังยืนยันผลบันทึกไม่ได้ โปรดคัดลอกข้อมูลก่อนออก คุณต้องการออกหรือไม่?')) {
            ev.preventDefault();
            return;
        }
        if ((dirty || count.value !== String(memberCount)) && !confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?')) ev.preventDefault();
    });
    dialog.addEventListener('close', ()=>{
        window.removeEventListener('beforeunload', beforeUnload);
        dialog.remove();
    });
    dialog.showModal();
}
function showPendingRecovery() {
    const el = document.querySelector('#pending-recovery');
    if (!el) return;
    try {
        if (pendingKeys().length) el.innerHTML = '<p>มีคำขอบันทึกที่ยังไม่ได้ยืนยัน ' + pendingKeys().length + ' รายการ</p><button data-action="recover-pending">ตรวจผลและลองคำขอเดิม</button>';
    } catch  {
        el.textContent = 'ไม่สามารถตรวจข้อมูลค้างในเครื่องได้';
    }
}
async function recoverPending() {
    const el = document.querySelector('#pending-recovery');
    if (!el) return;
    try {
        const key = pendingKeys()[0];
        if (!key) return;
        const raw = pendingStorage().getItem(key);
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending.requestId || !pending.draft) throw new Error('INVALID_PENDING');
        if (pending.id) await groupStore.update(pending.id, pending.revision, pending.draft, pending.requestId);
        else await groupStore.create(pending.draft, pending.requestId);
        pendingStorage().removeItem(key);
        el.textContent = 'ยืนยันการบันทึกแล้ว';
        void load('ready');
    } catch (error) {
        el.textContent = error instanceof Error && error.message === 'CONFLICT_STALE_REVISION' ? 'ข้อมูลถูกแก้ไขจากอีกที่ คำขอค้างยังเก็บอยู่ โปรดตรวจข้อมูลก่อนดำเนินการ' : 'ยังยืนยันผลไม่ได้ คำขอและข้อมูลยังเก็บอยู่ กรุณาลองอีกครั้ง';
    }
}
