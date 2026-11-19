export const thaiProvinces = ('กรุงเทพมหานคร กระบี่ กาญจนบุรี กาฬสินธุ์ กำแพงเพชร ขอนแก่น จันทบุรี ฉะเชิงเทรา ชลบุรี ชัยนาท ชัยภูมิ ชุมพร เชียงราย เชียงใหม่ ตรัง ตราด ตาก นครนายก นครปฐม นครพนม นครราชสีมา นครศรีธรรมราช นครสวรรค์ นนทบุรี นราธิวาส น่าน บึงกาฬ บุรีรัมย์ ปทุมธานี ประจวบคีรีขันธ์ ปราจีนบุรี ปัตตานี พระนครศรีอยุธยา พะเยา พังงา พัทลุง พิจิตร พิษณุโลก เพชรบุรี เพชรบูรณ์ แพร่ ภูเก็ต มหาสารคาม มุกดาหาร แม่ฮ่องสอน ยะลา ยโสธร ร้อยเอ็ด ระนอง ระยอง ราชบุรี ลพบุรี ลำปาง ลำพูน เลย ศรีสะเกษ สกลนคร สงขลา สตูล สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระแก้ว สระบุรี สิงห์บุรี สุโขทัย สุพรรณบุรี สุราษฎร์ธานี สุรินทร์ หนองคาย หนองบัวลำภู อ่างทอง อำนาจเจริญ อุดรธานี อุตรดิตถ์ อุทัยธานี อุบลราชธานี').split(' ');
const provinceNames = new Set(thaiProvinces);
export const isThaiProvince = value => provinceNames.has(value);

export function connectProvincePicker(root) {
    const field = root.querySelector('input');
    const panel = root.querySelector('.pa-picker-results');
    const choices = root.querySelector('ul');
    const status = root.querySelector('[role=status]');
    const buttons = () => [...choices.querySelectorAll('button')];
    let selected = '';
    function hide() {
        panel.hidden = true;
        field.setAttribute('aria-expanded', 'false');
    }
    function show(query) {
        const matching = thaiProvinces.filter(name => name.includes(query.trim().normalize('NFC')));
        choices.replaceChildren(...matching.map(name => {
            const item = document.createElement('li');
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'pa-button';
            option.textContent = name;
            if (name === selected) option.setAttribute('aria-current', 'true');
            item.append(option);
            return item;
        }));
        status.textContent = matching.length ? matching.length + ' จังหวัด' : 'ไม่พบจังหวัด';
        panel.hidden = false;
        field.setAttribute('aria-expanded', 'true');
    }
    function select(name) {
        selected = name;
        field.value = name;
        field.focus();
        hide();
        field.dispatchEvent(new Event('input', {bubbles: true}));
    }
    field.addEventListener('focus', () => show(field.value === selected ? '' : field.value));
    field.addEventListener('click', () => {
        if (panel.hidden) show(field.value === selected ? '' : field.value);
    });
    field.addEventListener('input', () => {
        if (selected === field.value && panel.hidden) return;
        selected = '';
        show(field.value);
    });
    root.addEventListener('focusout', event => {
        if (!root.contains(event.relatedTarget)) hide();
    });
    // Keep the scrollable list open through a pointer click, including Safari taps.
    choices.addEventListener('mousedown', event => {
        if (event.target.closest('button')) event.preventDefault();
    });
    choices.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button && !field.disabled) select(button.textContent);
    });
    root.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) {
            event.preventDefault();
            event.stopPropagation();
            field.focus();
            hide();
        } else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            if (panel.hidden) show(field.value === selected ? '' : field.value);
            const options = buttons();
            const index = options.indexOf(document.activeElement);
            if (event.key === 'ArrowUp' && index === 0) field.focus();
            else options[index === -1 && event.key === 'ArrowUp' ? options.length - 1 :
                Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))]?.focus();
        } else if (event.key === 'Enter' && event.target === field && !panel.hidden) {
            event.preventDefault();
            if (isThaiProvince(field.value.trim())) select(field.value.trim());
            else buttons()[0]?.focus();
        }
    });
    return {
        set(value) {
            field.value = value;
            selected = isThaiProvince(value) ? value : '';
            hide();
        },
        close: hide
    };
}
