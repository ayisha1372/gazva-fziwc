import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApi, useSettings, useTitle } from '../hooks/index.js';
import { AnimatedNumber, Avatar, ArrowRight, Reveal, rise, stagger } from '../components/ui/index.jsx';
import EventCard from '../components/events/EventCard.jsx';

function Testimonials({ items }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (n < 2 || paused || reduce) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused, reduce]);

  if (!n) return null;
  const t = items[i % n];
  return (
    <section className="feedback-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Voices</div>
          <h2 className="section-title">What Students Say</h2>
          <div className="section-divider" />
        </div>
        <div className="slider-wrapper" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <AnimatePresence mode="wait">
            <motion.div key={t.id} className="slide active" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} aria-live="polite">
              <div className="feedback-card">
                <div className="feedback-stars" aria-label={`${t.rating} out of 5 stars`}>{'★'.repeat(t.rating)}</div>
                <p className="feedback-text">"{t.quote}"</p>
                <div className="feedback-author">— {t.author}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          {n > 1 && (
            <div className="slider-controls">
              <button type="button" className="slider-btn" aria-label="Previous" onClick={() => setI((x) => (x - 1 + n) % n)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className="slider-dots">
                {items.map((s, k) => <button type="button" key={s.id} aria-label={`Show testimonial ${k + 1}`} className={`dot${k === i % n ? ' active' : ''}`} onClick={() => setI(k)} />)}
              </div>
              <button type="button" className="slider-btn" aria-label="Next" onClick={() => setI((x) => (x + 1) % n)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const ico = (d) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const STAT_ICONS = [
  ico(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
  ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  ico(<><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></>),
  ico(<><path d="M2 10l10-6 10 6-10 6z" /><path d="M6 12v5c3 2.4 9 2.4 12 0v-5" /></>
)
];
const DISCOVER = [
  ['/departments', 'Departments', 'Meet the academic departments and their teams.', ico(<><path d="M2 10l10-6 10 6-10 6z" /><path d="M6 12v5c3 2.4 9 2.4 12 0v-5" /></>)],
  ['/wings', 'Wings', 'Seven wings and the clubs that make Gazva move.', ico(<><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></>)],
  ['/events', 'Events', 'What is coming up, and the moments we have shared.', ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)],
  ['/rankings', 'Rankings', 'See who is leading across students, wings and more.', ico(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" /></>)],
];

export default function Home() {
  useTitle('');
  const { data: s } = useSettings();
  const { data: advisors } = useApi('/advisors');
  const { data: testimonials } = useApi('/testimonials');
  const { data: events } = useApi('/events', { limit: 3, status: 'upcoming' });
  const hero = s?.hero || {};

  return (
    <>
      <section className="hero">
        <div className="hero-art" aria-hidden="true"><i className="cluster" /><i className="cluster left" /><i className="dia d1" /><i className="dia d2" /><i className="dia d3" /><i className="dia d4" /></div>
        <motion.div className="hero-inner" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={rise} className="hero-badge">{hero.badge}</motion.div>
          <motion.h1 variants={rise}>{hero.title || 'Gazva'}</motion.h1>
          <motion.p variants={rise} className="hero-sub">{hero.subtitle}</motion.p>
          <motion.div variants={rise} className="hero-cta">
            <Link to="/core" className="btn-primary">Meet the Core<ArrowRight /></Link>
            <Link to="/contact" className="btn-outline">Get In Touch</Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          {(s?.stats || []).map((st, i) => (
            <Reveal key={st.label} delay={i * 0.08} className="stat-item">
              <div className="stat-icon">{STAT_ICONS[i % STAT_ICONS.length]}</div>
              <div className="stat-number"><AnimatedNumber value={st.value} suffix={st.suffix} /></div>
              <div className="stat-label">{st.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="section-header">
            <div className="section-tag">Explore</div>
            <h2 className="section-title">Discover Gazva</h2>
            <div className="section-divider" />
          </Reveal>
          <div className="discover-grid">
            {DISCOVER.map(([to, title, text, icon], i) => (
              <Reveal key={to} delay={i * 0.07}>
                <Link to={to} className="discover-tile">
                  <span className="discover-icon">{icon}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="discover-go">Explore <ArrowRight /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {events?.items?.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal className="section-header">
              <div className="section-tag">What's Next</div>
              <h2 className="section-title">Upcoming Events</h2>
              <div className="section-divider" />
            </Reveal>
            <div className="org-cards">{events.items.map((e) => <Reveal key={e.id}><EventCard ev={e} /></Reveal>)}</div>
            <p className="org-more"><Link to="/events">See all events</Link></p>
          </div>
        </section>
      )}

      <section className="section section-alt">
        <div className="container">
          <Reveal className="section-header">
            <div className="section-tag">Who We Are</div>
            <h2 className="section-title">Vision & Mission</h2>
            <div className="section-divider" />
          </Reveal>
          <div className="vm-grid">
            <Reveal className="vm-card-wrap">
              <div className="vm-card">
                <div className="vm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="21.17" y1="8" x2="12" y2="8" /><line x1="3.95" y1="6.06" x2="8.54" y2="14" /><line x1="10.88" y1="21.94" x2="15.46" y2="14" /></svg></div>
                <h3>Our Vision</h3><p>{s?.vision}</p>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="vm-card-wrap">
              <div className="vm-card">
                <div className="vm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                <h3>Our Mission</h3><p>{s?.mission}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {advisors?.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal className="section-header">
              <div className="section-tag">Our Guides</div>
              <h2 className="section-title">Advisory Board</h2>
              <div className="section-divider" />
              <p className="section-desc">Esteemed faculty who guide Gazva with wisdom, experience, and dedication</p>
            </Reveal>
            <motion.div className="faculty-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
              {advisors.map((a) => (
                <motion.div key={a.id} variants={rise} className="profile-card">
                  <Avatar src={a.photo} name={a.name} className="profile-avatar" />
                  <div className="profile-name">{a.name}</div>
                  <div className="profile-role">{a.role}</div>
                  <div className="profile-dept">{a.department}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <Testimonials items={testimonials || []} />

    </>
  );
}
