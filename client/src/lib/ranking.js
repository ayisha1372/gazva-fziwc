// Mirror of server/src/utils/ranking.js — used by the admin screens to show live ranks.
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
export const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
};
export function assignRanks(items) {
  const sorted = [...items].sort((a, b) => (b.points || 0) - (a.points || 0) || collator.compare(a.name || '', b.name || ''));
  const counts = new Map();
  sorted.forEach((i) => counts.set(i.points || 0, (counts.get(i.points || 0) || 0) + 1));
  let rank = 0; let prev = null;
  return sorted.map((it, idx) => {
    if ((it.points || 0) !== prev) { rank = idx + 1; prev = it.points || 0; }
    const tied = counts.get(it.points || 0) > 1;
    return { ...it, rank, tied, position: `${tied ? 'T-' : ''}${ordinal(rank)}` };
  });
}
