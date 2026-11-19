const themeKey = 'priteagent-preview:login-phase1-4b38cf17:priteagent.ui.theme.v1';
const legacyThemeKey = 'priteagent-preview:login-phase1-4b38cf17:priteagent-v2:shell:theme';
const root = document.documentElement;
const isTheme = value => value === 'light' || value === 'dark';

export function mountThemeControl(button) {
    const stylesheet = new URL('./theme-control.css', import.meta.url).href;
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
        button.firstElementChild.textContent = theme === 'dark' ? '☀' : '☾';
        button.setAttribute('aria-pressed', String(theme === 'light'));
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
