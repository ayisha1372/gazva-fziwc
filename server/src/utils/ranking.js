/**
 * Ranking rules (shared by Students, Wings, Clubs and Class Unions)
 * ---------------------------------------------------------------
 *  - Higher points rank higher.
 *  - Standard competition ranking ("1224"): entries with equal points share a rank,
 *    and the next rank is skipped (two entries on rank 2 -> the next is rank 4).
 *  - Display order inside a tie is alphabetical by name, so the list never reshuffles.
 *  - `position` is the human label for the rank: 1st, 2nd, 3rd ... and "T-2nd" for ties.
 */
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function assignRanks(items, { pointsKey = 'points', nameKey = 'name' } = {}) {
  const sorted = [...items].sort((a, b) => {
    const diff = (b[pointsKey] || 0) - (a[pointsKey] || 0);
    return diff !== 0 ? diff : collator.compare(a[nameKey] || '', b[nameKey] || '');
  });

  const counts = new Map();
  sorted.forEach((it) => counts.set(it[pointsKey] || 0, (counts.get(it[pointsKey] || 0) || 0) + 1));

  let rank = 0;
  let prevPoints = null;
  return sorted.map((it, index) => {
    const pts = it[pointsKey] || 0;
    if (pts !== prevPoints) {
      rank = index + 1;
      prevPoints = pts;
    }
    const tied = counts.get(pts) > 1;
    return { ...it, rank, tied, position: `${tied ? 'T-' : ''}${ordinal(rank)}` };
  });
}
