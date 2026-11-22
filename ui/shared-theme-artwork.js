/* Legacy standalone V2 screens: draw artwork from existing shared
 * theme-icons.js without replacing their own button behavior or sizes.
 * All current screens now obtain sun/moon geometry from ONE source.
 */
import {renderThemeIcon} from './theme-icons.js?rev=shared-control-r2';
const button=document.querySelector('#themeToggle,#themeBtn');
const profile=document.querySelector('#profileTheme');
if(button||profile) {
  function redraw(){
    const theme=document.documentElement.dataset.theme==='light'?'light':'dark';
    if(button){
      renderThemeIcon(button,theme);
      button.classList.remove('paSharedThemeButton');
      button.classList.add('pa-shared-theme-art');
    }
    if(profile){
      const staging=document.createElement('button');
      renderThemeIcon(staging,theme);
      const svg=staging.querySelector('svg');
      const old=profile.querySelector('svg');
      if(svg&&old)old.replaceWith(svg);
      profile.classList.add('pa-shared-theme-art');
    }
  }
  redraw();
  new MutationObserver(redraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
