import { Link } from 'react-router-dom';
import { eventDateText, eventTimeText, STATUS_LABEL } from '../../lib/format.js';
import { SmartImage } from '../ui/index.jsx';

const PhotoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
);

export function EventPlaceholder() {
  return <div className="event-img-placeholder"><PhotoIcon /><p>No poster yet</p></div>;
}

/** Same card as the original Events page, extended with status, time and venue. */
export default function EventCard({ ev }) {
  const cat = ev.category;
  const date = eventDateText(ev);
  const time = eventTimeText(ev);
  return (
    <Link to={`/events/${ev.slug}`} className="event-card" aria-label={`${ev.title} — ${STATUS_LABEL[ev.status]}`}>
      <div className="event-img-wrap">
        <SmartImage src={ev.poster} alt={`Poster for ${ev.title}`} fallback={<EventPlaceholder />} />
        {cat && <span className={`event-badge badge-${cat.slug}`}>{cat.name}</span>}
        <span className={`event-status status-${ev.status}`}>{STATUS_LABEL[ev.status]}</span>
      </div>
      <div className="event-body">
        <div className="event-meta"><span className="event-wing">{ev.organizer || ev.wing?.name || ev.department?.name || ''}</span></div>
        <h3 className="event-title">{ev.title}</h3>
        <p className="event-desc">{ev.description}</p>
        <div className="event-footer">
          <span className="event-participants">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {ev.venue || ev.participants || 'Venue to be announced'}
          </span>
          <span className="event-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {date}{time && ` · ${time}`}
          </span>
          <span className="event-view-btn">View <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></span>
        </div>
      </div>
    </Link>
  );
}
