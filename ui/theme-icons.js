// Shared V2 preview artwork. Visuals only: theme/storage handlers stay with each page.
const artwork = Object.freeze({sun:"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>",moon:"<path d=\"M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7Z\"/>"});
const style=document.createElement('link');
style.rel='stylesheet';style.href=new URL('./theme-icons.css',import.meta.url).href;
document.head.append(style);
export function renderThemeIcon(button,theme){
 button.classList.add('paSharedThemeButton');
 button.innerHTML='<svg data-theme-artwork="'+(theme==='dark'?'sun':'moon')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+artwork[theme==='dark'?'sun':'moon']+'</svg>';
}
export function animateThemeIcon(button){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 button.classList.remove('themeTap');void button.offsetWidth;button.classList.add('themeTap');
}
const loginButton=document.querySelector('[data-theme-toggle]');
if(loginButton){
 const sync=()=>renderThemeIcon(loginButton,document.documentElement.dataset.theme);
 sync();
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
