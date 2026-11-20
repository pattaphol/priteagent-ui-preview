// One shared Theme Control: artwork, state, persistence, events and animation.
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

const THEME_KEYS=Object.freeze(['priteagent-v2:shell:theme','priteagent.ui.theme.v1']);
const mounted=new Map();
function readTheme(){
 try{const value=localStorage.getItem(THEME_KEYS[0])||localStorage.getItem(THEME_KEYS[1]);if(value==='light'||value==='dark')return value;}catch{}
 return document.documentElement.dataset.theme==='light'?'light':'dark';
}
let selected=readTheme();
function applyTheme(next,persist=false){
 selected=next==='light'?'light':'dark';
 document.documentElement.dataset.theme=selected;
 for(const button of mounted.keys()){
  renderThemeIcon(button,selected);
  const label=selected==='dark'?'เปลี่ยนเป็นโหมดสว่าง':'เปลี่ยนเป็นโหมดมืด';
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-pressed',String(selected==='light'));
 }
 if(persist){for(const key of THEME_KEYS){try{localStorage.setItem(key,selected);}catch{}}}
}
export function mountThemeControl(button){
 if(mounted.has(button))return mounted.get(button).dispose;
 const click=()=>{applyTheme(selected==='dark'?'light':'dark',true);animateThemeIcon(button);};
 const end=event=>{if(event.target===button&&event.animationName==='paThemeTap')button.classList.remove('themeTap');};
 const dispose=()=>{button.removeEventListener('click',click);button.removeEventListener('animationend',end);mounted.delete(button);};
 mounted.set(button,{dispose});button.addEventListener('click',click);button.addEventListener('animationend',end);
 applyTheme(selected);return dispose;
}
window.addEventListener('storage',event=>{if(event.key===null||THEME_KEYS.includes(event.key))applyTheme(readTheme());});
window.addEventListener('pageshow',()=>applyTheme(readTheme()));
applyTheme(selected);
const loginButton=document.querySelector('[data-theme-toggle]');
if(loginButton)mountThemeControl(loginButton);
