// Week mapping verified against the approved read-only V1 lib/group.ts.
const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', calendar: 'gregory', year: 'numeric', month: '2-digit', day: '2-digit'
});
const iso = date => date.toISOString().slice(0, 10);

export function weeksForMonth(yearBE, month) {
    const year = yearBE - 543;
    if (!Number.isInteger(yearBE) || year < 100 || year > 9998 ||
        !Number.isInteger(month) || month < 1 || month > 12) return [];
    const monday = new Date(Date.UTC(year, month - 1, 1));
    monday.setUTCDate(1 + (8 - monday.getUTCDay()) % 7);
    const weeks = [];
    while (monday.getUTCMonth() === month - 1) {
        const friday = new Date(monday);
        friday.setUTCDate(friday.getUTCDate() + 4);
        weeks.push({week: weeks.length + 1, start: iso(monday), end: iso(friday)});
        monday.setUTCDate(monday.getUTCDate() + 7);
    }
    return weeks;
}

export function currentCarPeriod(date = new Date()) {
    const parts = Object.fromEntries(bangkokDate.formatToParts(date).map(part => [part.type, part.value]));
    const year = Number(parts.year) + 543;
    const month = Number(parts.month);
    const today = [parts.year, parts.month, parts.day].join('-');
    const weeks = weeksForMonth(year, month);
    const range = weeks.findLast(item => item.start <= today) ?? weeks[0];
    return {year, month, ...range};
}
