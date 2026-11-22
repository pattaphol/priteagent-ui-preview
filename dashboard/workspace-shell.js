import {uiMenuIcon} from '../ui/car-list-components.js?rev=pa-car-icons-r1';
import {mountThemeControl} from '../ui/theme-icons.js?rev=shared-control-r2';
const home = new URL('../dashboard/', import.meta.url);
const directory = new URL('../car-directory/', import.meta.url);
const login = new URL('../', import.meta.url);
const compact = matchMedia('(max-width: 767px)');
const features = Object.freeze({ mobileBottomNavigation: false });
const itemIcons={home:'home',cars:'car',expenses:'expense','holding-cars':'holding',performance:'performance',bonuses:'award','admin-demo':'admin',customers:'users',planning:'planning',policies:'planning',coverage:'admin'};

export const workspaceMenus = {
    agent: {
        home: 'หน้าหลัก', cars: 'คันรถของฉัน', expenses: 'ค่าใช้จ่าย',
        'holding-cars': 'เลือกคันรถเพื่อดูงานที่ถือ', performance: 'ผลงาน', bonuses: 'โบนัสและคุณวุฒิ',
        'admin-demo': 'Admin (ทดลอง)'
    },
    customer: {
        home: 'หน้าหลัก', customers: 'ลูกค้า', planning: 'วางแผนประกัน',
        policies: 'กรมธรรม์', coverage: 'สรุปความคุ้มครอง'
    }
};

function menuUrl(area, screen) {
    if (screen === 'cars') return directory.href;
    const link = new URL(home);
    if (area === 'customer') link.searchParams.set('area', area);
    if (screen !== 'home') link.searchParams.set('view', screen);
    return link.href;
}

export function mountWorkspaceShell({header, sidebar, area, screen, onNavigate, onSearch}) {
    const title = workspaceMenus[area][screen] || workspaceMenus.agent.cars;
    header.className = 'pa-header';
    sidebar.className = 'pa-sidebar';
    header.innerHTML = `<button type="button" class="pa-menu" aria-label="เปิดเมนูนำทาง" aria-expanded="false" aria-controls="${sidebar.id}"><span aria-hidden="true">☰</span></button>
        <a class="pa-brand" href="${home.href}"><span aria-hidden="true">P</span>PriteAgent</a>
        <strong class="pa-title">${title}</strong>
        <div class="pa-actions">${onSearch ? '<button type="button" data-pa-search aria-label="ค้นหาคันรถ"><span aria-hidden="true">⌕</span></button>' : ''}
        <button type="button" data-pa-theme></button></div>`;
    sidebar.innerHTML = `<div class="pa-work-areas" aria-label="เลือกพื้นที่ทำงาน">
        <a href="${menuUrl('agent','home')}" data-pa-area="agent" ${area === 'agent' ? 'aria-current="true"' : ''}>${uiMenuIcon("expense")}<span>งานตัวแทน</span></a>
        <a href="${menuUrl('customer','home')}" data-pa-area="customer" ${area === 'customer' ? 'aria-current="true"' : ''}>${uiMenuIcon("users")}<span>งานลูกค้า</span></a>
        </div><nav class="pa-links" aria-label="เมนูพื้นที่ทำงาน">${Object.entries(workspaceMenus[area]).map(([id,label]) =>
            `<a href="${menuUrl(area,id)}" data-pa-view="${id}" ${screen === id ? 'aria-current="page"' : ''}><span class="pa-nav-icon">${uiMenuIcon(itemIcons[id]||"home")}</span><span class="pa-nav-label">${label}</span></a>`).join('')}</nav>
        <div class="pa-account"><details><summary>${uiMenuIcon("account")}<span>บัญชี</span></summary><p>เว็บทดลอง V2 · ใช้ข้อมูลจำลองเท่านั้น ข้อมูลเก็บในเบราว์เซอร์นี้</p></details>
        <a href="${login.href}">${uiMenuIcon("logout")}<span>ออกจากระบบ</span></a></div>`;
    const backdrop = document.createElement('button');
    backdrop.className = 'pa-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label','ปิดเมนูนำทาง');
    backdrop.hidden = true;
    header.after(backdrop);
    const trigger = header.querySelector('.pa-menu');
    const theme = header.querySelector('[data-pa-theme]');
    const disposeTheme = mountThemeControl(theme);
    if (onSearch) header.querySelector('[data-pa-search]').onclick = onSearch;

    function showDrawer(show, returnFocus = false) {
        trigger.setAttribute('aria-expanded',String(show));
        trigger.setAttribute('aria-label',show ? 'ปิดเมนูนำทาง' : 'เปิดเมนูนำทาง');
        sidebar.classList.toggle('pa-open',show);
        sidebar.inert = compact.matches && !show;
        backdrop.hidden = !show;
        if (show) sidebar.querySelector('nav [aria-current=page], nav a').focus();
        else if (returnFocus) trigger.focus();
    }
    showDrawer(false);
    trigger.onclick = () => showDrawer(trigger.getAttribute('aria-expanded') !== 'true',true);
    backdrop.onclick = () => showDrawer(false,true);
    sidebar.onclick = event => {
        const link = event.target.closest('[data-pa-view], [data-pa-area]');
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const nextArea = link.dataset.paArea || area;
        const nextView = link.dataset.paView || 'home';
        showDrawer(false);
        if (onNavigate && nextView !== 'cars') {
            event.preventDefault();
            onNavigate(nextArea,nextView);
        }
    };
    const syncViewport = () => showDrawer(false);
    const onKey = event => {
        if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !backdrop.hidden) {
            event.preventDefault();
            showDrawer(false,true);
        }
    };
    compact.addEventListener('change',syncViewport);
    document.addEventListener('keydown',onKey);
    let bottom;
    if (features.mobileBottomNavigation) {
        bottom = document.createElement('nav');
        bottom.className = 'pa-bottom';
        bottom.setAttribute('aria-label','เมนูหลักมือถือ');
        bottom.innerHTML = `<a href="${home.href}">หน้าแรก</a><a href="${directory.href}">คันรถ</a>
            <a href="${menuUrl('agent','expenses')}">ค่าใช้จ่าย</a><a href="${menuUrl('agent','holding-cars')}">ถืองาน</a>
            <button type="button">เมนู</button>`;
        bottom.querySelector('button').onclick = () => showDrawer(true);
        header.parentElement.append(bottom);
    }
    return () => {
        compact.removeEventListener('change',syncViewport);
        disposeTheme();
        document.removeEventListener('keydown',onKey);
        bottom?.remove();
    };
}
