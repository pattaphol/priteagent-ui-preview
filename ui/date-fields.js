// Shared accessible date text + native calendar control for synthetic V2 forms.
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
    if (!field.text || !field.native || !field.native.name) throw new Error('Date field markup mismatch');
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
      for (const field of fields) field.text.disabled = Boolean(value);
    },
    invalidEntryNames() {
      return fields.filter(field => field.text.value.trim() && !parseDateEntry(field.text.value))
        .map(field => field.native.name);
    }
  };
}
