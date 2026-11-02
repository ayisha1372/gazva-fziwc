import { Link } from 'react-router-dom';
import { fmtLongDate } from '../lib/format.js';
import { SmartImage } from './ui/index.jsx';
import { EventPlaceholder } from './events/EventCard.jsx';

export default function ArticleCard({ article: a }) {
  return (
    <Link to={`/blog/${a.slug}`} className="event-card article-card">
      <div className="event-img-wrap">
        <SmartImage src={a.coverImage} alt="" fallback={<EventPlaceholder />} />
        {a.category && <span className="event-badge badge-social">{a.category.name}</span>}
      </div>
      <div className="event-body">
        <div className="event-meta"><span className="event-wing">{a.author || 'Gazva'}</span></div>
        <h3 className="event-title">{a.title}</h3>
        <p className="event-desc">{a.excerpt}</p>
        <div className="event-footer">
          <span className="event-date">{fmtLongDate(a.publishedAt)}</span>
          <span className="event-view-btn">Read <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></span>
        </div>
      </div>
    </Link>
  );
}
