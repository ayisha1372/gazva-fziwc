const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseYMD(s) {
  const [y, m, d] = (s || '').split('-').map(Number);
  return y ? { y, m, d } : null;
}

export function fmtDate(s) {
  const p = parseYMD(s);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "15 Mar 2026", "15 – 17 Mar 2026", or the free-text label used by legacy events ("March 2026"). */
export function eventDateText(ev) {
  if (ev.dateLabel) return ev.dateLabel;
  const a = parseYMD(ev.date);
  if (!a) return '';
  const b = ev.endDate && ev.endDate !== ev.date ? parseYMD(ev.endDate) : null;
  if (!b) return fmtDate(ev.date);
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
  return `${fmtDate(ev.date)} – ${fmtDate(ev.endDate)}`;
}

export function eventTimeText(ev) {
  if (!ev.startTime) return '';
  return ev.endTime ? `${fmtTime(ev.startTime)} – ${fmtTime(ev.endTime)}` : fmtTime(ev.startTime);
}

export const STATUS_LABEL = { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed' };

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const countWord = (n) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));

export const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';

export const fmtLongDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
