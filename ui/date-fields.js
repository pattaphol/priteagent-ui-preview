import { attachThaiCalendar } from './calendar-picker.js?rev=pa-calendar-r1';
// Shared accessible Thai date text + V1-style calendar for all active V2 forms.
// Data contract remains ISO YYYY-MM-DD in the existing named <input type="date">.
const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
const pad = number => String(number).padStart(2, '0');

export function parseDateEntry(text) {
  const clean = String(text ?? '').replace(/[๐-๙]/g, digit => String(thaiDigits.indexOf(digit))).trim();
  let day, month, year;
  const dmy = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(clean);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(clean);
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else return '';
  if (year >= 2400) year -= 543;
  if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const valid = new Date(Date.UTC(year, month - 1, day));
  if (valid.getUTCFullYear() !== year || valid.getUTCMonth() + 1 !== month || valid.getUTCDate() !== day) return '';
  return String(year).padStart(4,'0') + '-' + pad(month) + '-' + pad(day);
}

export function displayThaiDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) return '';
  const valid = parseDateEntry(iso);
  if (valid !== iso) return '';
  return match[3] + '/' + match[2] + '/' + String(Number(match[1]) + 543);
}

export function connectDateFields(form) {
  const fields = Array.from(form.querySelectorAll('[data-pa-date-field]')).map(group => ({
    text: group.querySelector('[data-pa-date-text]'),
    native: group.querySelector('[data-pa-date-native]')
  }));
  for (const field of fields) {
    if (!field.text || !field.native) throw new Error('Date field markup mismatch');
    field.calendar = attachThaiCalendar(field.text.closest('[data-pa-date-field]'),field.native,field.text,iso => {
      field.native.value = iso;
      field.native.dispatchEvent(new Event('change', {bubbles:true}));
    });
    field.text.addEventListener('input', () => {
      const candidate = parseDateEntry(field.text.value);
      field.text.setAttribute('aria-invalid', String(Boolean(field.text.value.trim()) && !candidate));
      if (field.native.value !== candidate) {
        field.native.value = candidate;
        field.native.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    field.text.addEventListener('blur', () => {
      const valid = parseDateEntry(field.text.value);
      if (valid) field.text.value = displayThaiDate(valid);
    });
    field.native.addEventListener('change', () => {
      field.text.value = displayThaiDate(field.native.value);
      field.text.setAttribute('aria-invalid', 'false');
      field.native.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  return {
    sync() {
      for (const field of fields) {
        field.text.value = displayThaiDate(field.native.value);
        field.text.setAttribute('aria-invalid', 'false');
      }
    },
    setDisabled(value) {
      for (const field of fields) { field.text.disabled = Boolean(value); field.calendar?.close(); }
    },
    invalidEntryNames() {
      return fields.filter(field => field.text.value.trim() && !parseDateEntry(field.text.value))
        .map(field => field.native.name);
    }
  };
}


/* Upgrade standalone V2 prototype native dates in-place. Their existing id,
 * name, ISO value, change/input listeners and form data contract are preserved.
 * The date picker is still a single shared component, not a new form engine.
 */
export function enhancePlainDateFields(root=document) {
  const wrappers=[];
  for(const native of root.querySelectorAll('input[type="date"]:not([data-pa-date-native])')) {
    const oldId=native.id;
    const wrap=document.createElement('span');
    wrap.className='pa-date-field';
    wrap.setAttribute('data-pa-date-field','');
    const visible=document.createElement('input');
    visible.type='text';
    visible.id=oldId ? oldId+'-thai' : 'pa-date-display-'+(wrappers.length+1);
    visible.className='pa-date-text';
    visible.setAttribute('data-pa-date-text','');
    visible.setAttribute('inputmode','numeric');
    visible.setAttribute('autocomplete','off');
    visible.setAttribute('maxlength','10');
    visible.setAttribute('placeholder','วว/ดด/ปปปป');
    visible.setAttribute('aria-label','พิมพ์วัน เดือน ปี พ.ศ.');
    const icon=document.createElement('span');
    icon.className='pa-date-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M13 14h3"/></svg>';
    native.before(wrap);
    native.classList.add('pa-date-native');
    native.setAttribute('data-pa-date-native','');
    native.setAttribute('aria-hidden','true');
    native.tabIndex=-1;
    wrap.append(visible,icon,native);
    if(oldId) {
      const labels=Array.from(root.querySelectorAll('label[for]'));
      labels.filter(label=>label.htmlFor===oldId).forEach(label=>label.htmlFor=visible.id);
    }
    wrappers.push(wrap);
  }
  if(!wrappers.length)return null;
  const holder={querySelectorAll:()=>wrappers};
  const adapter=connectDateFields(holder);
  adapter.sync();
  // Legacy prototype toggles create/settings by directly changing native
  // value in draw(). Re-sync after these existing actions without intercepting.
  for(const id of ['createTab','settingsTab','resetBtn']){
    root.getElementById?.(id)?.addEventListener('click',()=>queueMicrotask(()=>adapter.sync()));
  }
  return adapter;
}
