import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useTitle } from '../hooks/index.js';
import { ArrowLeft, ErrorNote, Loading, SmartImage } from '../components/ui/index.jsx';
import EventCard, { EventPlaceholder } from '../components/events/EventCard.jsx';
import { eventDateText, eventTimeText, STATUS_LABEL } from '../lib/format.js';
import '../styles/events.css';

export default function EventDetail() {
  const { slug } = useParams();
  const { data: ev, isLoading, error } = useApi(`/events/${slug}`);
  useTitle(ev?.title);

  if (isLoading) return <div className="detail-page"><Loading /></div>;
  if (error) return (
    <div className="detail-page"><ErrorNote error={error.status === 404 ? { message: "We couldn't find that event." } : error} />
      <p style={{ textAlign: 'center' }}><Link to="/events" className="wing-back"><ArrowLeft /> All events</Link></p></div>
  );

  const rows = [
    ['Date', eventDateText(ev)], ['Time', eventTimeText(ev)], ['Venue', ev.venue], ['Category', ev.category?.name],
    ['Organised by', ev.organizer || ev.wing?.name || ev.department?.name], ['Participants', ev.participants],
  ].filter(([, v]) => v);

  return (
    <>
      <div className="gallery-banner compact">
        <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/events">Events</Link><span>/</span><span>{ev.title}</span></div>
      </div>
      <motion.article className="detail-page" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Link to="/events" className="wing-back"><ArrowLeft /> All events</Link>
        <div className="detail-grid">
          <div className="detail-poster"><SmartImage src={ev.poster} alt={`Poster for ${ev.title}`} fallback={<EventPlaceholder />} /></div>
          <div className="detail-info">
            <div className="detail-chips">
              {ev.category && <span className={`lb-badge`}>{ev.category.name}</span>}
              <span className={`event-status inline status-${ev.status}`}>{STATUS_LABEL[ev.status]}</span>
            </div>
            <h1 className="lb-title">{ev.title}</h1>
            <p className="lb-desc" style={{ whiteSpace: 'pre-line' }}>{ev.description || 'More details will be shared soon.'}</p>
            <div className="lb-meta-grid">
              {rows.map(([k, v]) => <div className="lb-meta-item" key={k}><label>{k}</label><span>{v}</span></div>)}
            </div>
          </div>
        </div>
        {ev.related?.length > 0 && (
          <section className="org-section">
            <p className="wing-section-label">More events</p>
            <div className="org-cards">{ev.related.map((r) => <EventCard key={r.id} ev={r} />)}</div>
          </section>
        )}
      </motion.article>
    </>
  );
}
