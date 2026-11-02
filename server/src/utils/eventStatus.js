import { env } from '../config/env.js';

const at = (date, time, fallback) => new Date(`${date}T${time || fallback}:00${env.eventTzOffset}`);

export function eventWindow(ev) {
  const start = at(ev.date, ev.startTime, '00:00');
  const end = at(ev.endDate || ev.date, ev.endTime, '23:59');
  return { start, end };
}

/** Upcoming / Ongoing / Completed. Honours a manual override when statusMode === 'manual'. */
export function computeStatus(ev, now = new Date()) {
  if (ev.statusMode === 'manual' && ev.status) return ev.status;
  const { start, end } = eventWindow(ev);
  if (now < start) return 'upcoming';
  if (now <= end) return 'ongoing';
  return 'completed';
}
