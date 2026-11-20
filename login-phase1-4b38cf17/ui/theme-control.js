const themeKey = 'priteagent-preview:login-phase1-4b38cf17:priteagent.ui.theme.v1';
const legacyThemeKey = 'priteagent-preview:login-phase1-4b38cf17:priteagent-v2:shell:theme';
const root = document.documentElement;
const isTheme = value => value === 'light' || value === 'dark';

export function mountThemeControl(button) {
    const stylesheet = new URL('./theme-control.css?v=fidelity-r3', import.meta.url).href;
    if (!document.querySelector('[data-pa-theme-styles]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = stylesheet;
        link.dataset.paThemeStyles = '';
        document.head.append(link);
    }
    button.classList.add('pa-theme-control');
    button.setAttribute('aria-label', 'โหมดสว่าง');
    button.innerHTML = '<span class="pa-theme-icon" aria-hidden="true">☀</span>';

    function render(theme) {
        root.dataset.theme = theme;
        button.firstElementChild.innerHTML = theme === 'dark' ? '<svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5\"/></svg>' : '<svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" aria-hidden=\"true\"><path d=\"M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z\"/></svg>';
        button.setAttribute('aria-pressed', String(theme === 'light'));
        button.setAttribute('aria-label', theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด');
        button.title = theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด';
    }

    function sync() {
        let selected = root.dataset.theme === 'light' ? 'light' : 'dark';
        try {
            const current = localStorage.getItem(themeKey);
            const previous = localStorage.getItem(legacyThemeKey);
            selected = isTheme(current) ? current : isTheme(previous) ? previous : selected;
        } catch {
            // The current page theme still works when storage is unavailable.
        }
        render(selected);
    }

    function toggle() {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        render(next);
        try {
            localStorage.setItem(themeKey, next);
        } catch {
            // Storage may be unavailable in a restricted browser context.
        }
    }

    function onStorage(event) {
        if (event.key === null || event.key === themeKey || event.key === legacyThemeKey) sync();
    }

    sync();
    button.addEventListener('click', toggle);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', sync);
    return () => {
        button.removeEventListener('click', toggle);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('pageshow', sync);
    };
}
