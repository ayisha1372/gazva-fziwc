import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApi, useSettings, useTitle } from '../hooks/index.js';
import { AnimatedNumber, Avatar, ArrowRight, PersonIcon, Reveal, SmartImage, rise, stagger } from '../components/ui/index.jsx';
import EventCard from '../components/events/EventCard.jsx';

function splitAuthor(a = '') {
  const i = a.indexOf(',');
  return i < 0 ? [a.trim(), ''] : [a.slice(0, i).trim(), a.slice(i + 1).trim()];
}

const QuoteMark = () => (
  <svg className="testi-qmark" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M7.2 6C4.9 6 3 7.9 3 10.2c0 2.2 1.6 3.9 3.7 4.1-.2 1.3-1.1 2.4-2.6 3.1l.7 1.6c3.1-1 5.2-3.4 5.2-7.3V10C10 7.8 8.8 6 7.2 6zm9.2 0C14.1 6 12.2 7.9 12.2 10.2c0 2.2 1.6 3.9 3.7 4.1-.2 1.3-1.1 2.4-2.6 3.1l.7 1.6c3.1-1 5.2-3.4 5.2-7.3V10C19.2 7.8 18 6 16.4 6z" /></svg>
);

function TestiCard({ t, pos }) {
  const [name, role] = splitAuthor(t.author);
  return (
    <figure className={`testi-card ${pos}`}>
      <span className="testi-offset" aria-hidden="true" />
      <span className="testi-blob" aria-hidden="true" />
      <div className="testi-avatar"><SmartImage src={t.photo} alt={name ? `Photo of ${name}` : ''} fallback={<PersonIcon />} /></div>
      <div className="testi-body">
        <figcaption><strong>{name || 'Gazva student'}</strong>{role && <span>{role}</span>}</figcaption>
        <QuoteMark />
        <blockquote>{t.quote}</blockquote>
        {pos === 'center' && t.rating > 0 && <div className="testi-stars" aria-label={`${t.rating} out of 5 stars`}>{'★'.repeat(t.rating)}</div>}
      </div>
    </figure>
  );
}

const trioVariants = {
  enter: (d) => ({ opacity: 0, x: d * 70 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d * -70 }),
};

function Testimonials({ items }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const go = (d) => { setDir(d); setI((x) => (x + d + n) % n); };
  const jump = (k) => { setDir(k > i ? 1 : -1); setI(k); };

  useEffect(() => {
    if (n < 2 || paused || reduce) return undefined;
    const t = setInterval(() => { setDir(1); setI((x) => (x + 1) % n); }, 6500);
    return () => clearInterval(t);
  }, [n, paused, reduce]);

  if (!n) return null;
  const at = (k) => items[(k + n) % n];
  const trio = n >= 3 ? [[at(i - 1), 'left'], [at(i), 'center'], [at(i + 1), 'right']] : n === 2 ? [[at(i), 'center'], [at(i + 1), 'right']] : [[at(i), 'center']];

  return (
    <section className="testi-section" aria-roledescription="carousel" aria-label="What students say"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="testi-inner">
        <div className="testi-head">
          {n > 1 && <button type="button" className="testi-arrow" aria-label="Previous testimonial" onClick={() => go(-1)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></button>}
          <div className="testi-title"><span className="testi-tag">Voices</span><h2>What Students Say</h2></div>
          {n > 1 && <button type="button" className="testi-arrow" aria-label="Next testimonial" onClick={() => go(1)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></button>}
        </div>
        {n > 1 && (
          <div className="testi-dots">
            {items.map((s, k) => <button type="button" key={s.id} aria-label={`Show testimonial ${k + 1}`} aria-current={k === i} className={k === i ? 'active' : ''} onClick={() => jump(k)} />)}
          </div>
        )}
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={i} className={`testi-trio n${Math.min(n, 3)}`} custom={dir} variants={trioVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            drag={n > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={(_e, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }} aria-live="polite">
            {trio.map(([t, pos]) => <TestiCard key={`${t.id}-${pos}`} t={t} pos={pos} />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

const ico = (d) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const STAT_ICONS = [
  ico(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
  ico(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  ico(<><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></>),
  ico(<><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></>),
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
            <Link to="/wings" className="btn-outline">Explore Wings</Link>
          </motion.div>
        </motion.div>
        <span className="hero-cue" aria-hidden="true" />
        <svg className="hero-wave" viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 60L1440 60L1440 20C1200 60 900 0 720 20C540 40 240 0 0 20L0 60Z" fill="#ffffff" />
        </svg>
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
