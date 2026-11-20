// Shared V2 preview artwork. Visuals only: theme/storage handlers stay with each page.
const artwork = Object.freeze({sun:"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>",moon:"<path d=\"M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7Z\"/>"});
const style=document.createElement('style');
style.textContent=`
html body button.paSharedThemeButton{display:inline-grid!important;place-items:center!important;box-sizing:border-box!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;border:1px solid #2b5777!important;border-radius:13px!important;background:#10283b!important;color:#edf5fb!important;box-shadow:none!important;cursor:pointer;flex-shrink:0;transition:background-color .28s,color .28s,border-color .28s}
html[data-theme="light"] body button.paSharedThemeButton{border-color:#afcada!important;background:#f0f6fc!important;color:#1c3347!important}
html body button.paSharedThemeButton:hover{border-color:#42a4ff!important}
html body button.paSharedThemeButton:focus-visible{outline:3px solid #42a4ff!important;outline-offset:3px!important}
html body button.paSharedThemeButton svg{display:block;width:19px!important;height:19px!important;transform:none!important;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@keyframes paThemeTap{0%,100%{transform:scale(1) rotate(0)}40%{transform:scale(.85) rotate(-15deg)}70%{transform:scale(1.1) rotate(8deg)}}
html body button.paSharedThemeButton.themeTap{animation:paThemeTap .66s ease both}
@media(prefers-reduced-motion:reduce){html body button.paSharedThemeButton{animation:none!important;transition:none!important}}
`;
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
