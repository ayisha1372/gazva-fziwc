import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useApi, useDebounced, useSettings, useTitle } from '../hooks/index.js';
import { EmptyState, ErrorNote, Loading, Pagination, SmartImage, ArrowRight, rise, stagger } from '../components/ui/index.jsx';
import EventCard, { EventPlaceholder } from '../components/events/EventCard.jsx';
import { eventDateText, eventTimeText, STATUS_LABEL } from '../lib/format.js';
import '../styles/events.css';

const STATUSES = [['all', 'Any status'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['completed', 'Completed']];

function Spotlight({ ev }) {
  const time = eventTimeText(ev);
  return (
    <motion.section className="spotlight-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} aria-label="Featured event">
      <div className="event-spotlight">
        <div className="spotlight-img">
          <SmartImage src={ev.poster} alt={`Poster for ${ev.title}`} fallback={<EventPlaceholder />} />
        </div>
        <div className="spotlight-body">
          <span className={`event-status inline status-${ev.status}`}>{ev.status === 'ongoing' ? 'Happening now' : ev.featured ? 'Featured · Upcoming' : 'Next up'}</span>
          <h2>{ev.title}</h2>
          <p className="spotlight-desc">{ev.description}</p>
          <dl className="spotlight-meta">
            <div><dt>Date</dt><dd>{eventDateText(ev)}</dd></div>
            {time && <div><dt>Time</dt><dd>{time}</dd></div>}
            {ev.venue && <div><dt>Venue</dt><dd>{ev.venue}</dd></div>}
          </dl>
          <Link to={`/events/${ev.slug}`} className="btn-solid">View details <ArrowRight /></Link>
        </div>
      </div>
    </motion.section>
  );
}

export default function Events() {
  useTitle('Events');
  const { data: settings } = useSettings();
  const { data: cats } = useApi('/categories', { type: 'event' });
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState('grid3');
  const q = useDebounced(search, 300);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isFetching } = useApi('/events', { category, status, q, page, limit: 12 }, { placeholderData: keepPreviousData });
  // Counts + spotlight always describe the whole calendar, regardless of the current filter.
  const { data: all } = useApi('/events', { limit: 1 });
  const pick = (setter) => (v) => { setter(v); setPage(1); };
  const gridClass = `gallery-grid${layout === 'grid2' ? ' layout-2' : layout === 'list' ? ' layout-list' : ''}`;
  const filtering = category !== 'all' || status !== 'all' || q;

  return (
    <>
      <div className="gallery-banner">
        <h1>Events</h1>
        <p>Moments, memories, and milestones from Gazva's journey across every year.</p>
      </div>

      {all?.spotlight && <Spotlight ev={all.spotlight} />}

      <div className="filter-bar">
        <div className="filter-inner">
          <div className="filter-groups">
          </div>
          <div className="filter-right">
            <label className="filter-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="search" value={search} onChange={(e) => pick(setSearch)(e.target.value)} placeholder="Search events…" aria-label="Search events" />
            </label>
            <div className="layout-toggle">
              {[['grid3', '3-column grid', <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>],
                ['grid2', '2-column grid', <><rect x="3" y="3" width="8" height="18" /><rect x="13" y="3" width="8" height="18" /></>],
                ['list', 'List view', <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>]].map(([k, t, ic]) => (
                <button type="button" key={k} className={`layout-btn${layout === k ? ' active' : ''}`} title={t} aria-label={t} aria-pressed={layout === k} onClick={() => setLayout(k)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{ic}</svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="gallery-section">
        {data && <p className="results-info" aria-live="polite">Showing <span>{data.items.length}</span> of <span>{data.total}</span> events{isFetching ? ' …' : ''}</p>}
        {isLoading && <Loading label="Loading events…" />}
        {error && <ErrorNote error={error} retry={refetch} />}
        {data && data.items.length === 0 && (
          <EmptyState title="No events found">{filtering ? 'Try a different filter or search term.' : 'Events will appear here once they are added.'}</EmptyState>
        )}
        {data && data.items.length > 0 && (
          <motion.div className={gridClass} variants={stagger} initial="hidden" animate="show" key={`${category}-${status}-${q}-${page}`}>
            {data.items.map((ev) => <motion.div key={ev.id} variants={rise} className="event-cell"><EventCard ev={ev} /></motion.div>)}
          </motion.div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </section>
    </>
  );
}
