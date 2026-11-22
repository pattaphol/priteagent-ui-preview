import {enhancePlainDateFields} from './date-fields.js?rev=pa-calendar-r2';
function boot(){ enhancePlainDateFields(document); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
