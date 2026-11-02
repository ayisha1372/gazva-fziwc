import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApi, useTitle } from '../../hooks/index.js';
import { ArrowLeft, ArrowRight, Avatar, ErrorNote, Loading, LogoBadge, rise, stagger } from '../ui/index.jsx';
import { countWord } from '../../lib/format.js';
import EventCard from '../events/EventCard.jsx';
import Events from '../../pages/Events.jsx';

/**
 * One component, two pages. Wings and Departments are separate data sets with separate routes and
 * API endpoints, but they share the original Wings design: hero -> card grid -> in-place detail view.
 */
export const KINDS = {
  wing: {
    base: '/wings', endpoint: '/wings', noun: 'wing', eyebrow: 'Wings of Gazva',
    heading: (n) => `${countWord(n)} ${n === 1 ? 'wing' : 'wings'}. One union. One vision.`,
    tagline: "Explore how Gazva is organized — from each wing's leadership down to every club and forum beneath it.",
    peopleLabel: 'Wing Leadership', aria: 'Main wings of Gazva', layout: 'leaders',
  },
  department: {
    base: '/departments', endpoint: '/departments', noun: 'department', eyebrow: 'Departments of Gazva',
    heading: (n) => `${countWord(n)} ${n === 1 ? 'department' : 'departments'}. One union. One vision.`,
    tagline: "Explore Gazva's academic departments — each department's team, the programmes it runs, and the events around it.",
    peopleLabel: 'Department Team', aria: 'Departments of Gazva', layout: 'roster',
  },
};

const pad = (n) => String(n).padStart(2, '0');

/** Wings show a logo (or the logo placeholder) only if one is uploaded or the wing keeps its logo slot, e.g. Gazva Debate.
 *  Departments always show theirs. */
const showLogo = (item, kind) => kind === 'department' || !!item.logo || !!item.showLogoSlot;

function Profile({ person, delay = 0 }) {
  const vacant = !person.name;
  return (
    <motion.div className="org-profile" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay }}>
      <Avatar src={person.photo} name={person.name} className={`org-profile-photo${vacant ? ' empty-slot' : ''}`} />
      <div className={`org-profile-name${vacant ? ' placeholder' : ''}`}>{vacant ? 'Position open' : person.name}</div>
      <div className="org-profile-role">{person.position}</div>
    </motion.div>
  );
}

function People({ members, layout }) {
  if (!members?.length) return <p className="loading-note">No team members added yet.</p>;
  if (layout === 'roster') {
    return <div className="org-roster">{members.map((m, i) => <Profile key={m.id || i} person={m} delay={i * 0.04} />)}</div>;
  }
  return <div className={`wing-leaders-row count-${members.length}`}>{members.map((m, i) => <Profile key={m.id || i} person={m} delay={i * 0.1} />)}</div>;
}

function Grid({ items, cfg, kind }) {
  return (
    <motion.div className={`wings-org-grid${items.length === 1 ? ' single' : ''}`} role="list" aria-label={cfg.aria}
      variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }}>
      {items.map((it, i) => (
        <motion.div key={it.id} variants={rise} role="listitem">
          <Link to={`${cfg.base}/${it.slug}`} className="wing-org-card" aria-label={`Explore ${it.name}`}>
            <div className="org-card-top">
              <span className="wing-org-number">{pad(i + 1)}</span>
              {showLogo(it, kind) && <LogoBadge src={it.logo} name={it.name} size={64} />}
            </div>
            <h2 className="wing-org-name">{it.name.toUpperCase()}</h2>
            <p className="wing-org-purpose">{it.purpose ?? it.description ?? it.tagline}</p>
            <span className="wing-org-explore">Explore <ArrowRight /></span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Related({ related }) {
  if (!related) return null;
  const { events = [] } = related;
  return (
    <>
      {events.length > 0 && (
        <section className="org-section">
          <p className="wing-section-label">Related events</p>
          <div className="org-cards">{events.slice(0, 3).map((e) => <EventCard key={e.id} ev={e} />)}</div>
          {events.length > 3 && <p className="org-more"><Link to="/events">See all events</Link></p>}
        </section>
      )}
    </>
  );
}

function Detail({ item, index, total, cfg, kind }) {
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const { data: full } = useApi(`${cfg.endpoint}/${item.slug}`, null);
  const clubs = item.clubs || [];
  useTitle(item.name);

  useEffect(() => setClub(null), [item.slug]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') navigate(cfg.base); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, cfg.base]);

  return (
    <motion.div className="wing-detail" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="wing-detail-top">
        <Link to={cfg.base} className="wing-back"><ArrowLeft /> Back</Link>
        <span className="wing-detail-count">{pad(index + 1)} / {pad(total)}</span>
      </div>

      <div className="wing-detail-heading">
        {showLogo(item, kind) && <LogoBadge src={item.logo} name={item.name} size={96} className="org-detail-logo" />}
        <h2>{item.name.toUpperCase()}</h2>
        {(item.tagline) && <p className="org-tagline">{item.tagline}</p>}
        <p>{item.purpose ?? item.description}</p>
      </div>

      <p className="wing-section-label">{cfg.peopleLabel}</p>
      <People members={item.members} layout={cfg.layout} />

      {clubs.length > 0 && (
        <div className="wing-subunits-wrap">
          <div className="wing-subunits-divider" />
          <AnimatePresence mode="wait" initial={false}>
            {!club ? (
              <motion.div key="clubs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="wing-section-label">Under {item.name}</p>
                <div className="wing-subunits-grid">
                  {clubs.map((c) => (
                    <button type="button" key={c.id} className="subunit-card" onClick={() => setClub(c)} aria-label={`View ${c.name} leadership`}>
                      <div className="subunit-card-name">{c.name.toUpperCase()}</div>
                      <span className="subunit-card-view">View team <ArrowRight /></span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key={club.id} className="subunit-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <button type="button" className="subunit-detail-back" onClick={() => setClub(null)} autoFocus><ArrowLeft /> Back to {item.name}</button>
                <div className="subunit-detail-heading">
                  {(club.logo || showLogo(item, kind)) && <LogoBadge src={club.logo} name={club.name} size={64} />}
                  <h3>{club.name.toUpperCase()}</h3>
                  <p>A sub-unit under {item.name.toUpperCase()}</p>
                </div>
                <People members={club.members} layout="leaders" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {item.activities?.length > 0 && (
        <section className="org-section">
          <p className="wing-section-label">Activities</p>
          <ul className="org-activities">{item.activities.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>
      )}

      <Related related={full?.related} />
    </motion.div>
  );
}

export default function OrgExplorer({ kind }) {
  const cfg = KINDS[kind];
  const { slug } = useParams();
  const { data, isLoading, error, refetch } = useApi(cfg.endpoint, null);
  useTitle(slug ? undefined : cfg.eyebrow);

  const index = useMemo(() => (data && slug ? data.findIndex((d) => d.slug === slug) : -1), [data, slug]);
  const n = data?.length || 0;

  return (
    <>
      <div className="wings-org-hero">
        <p className="wings-eyebrow">{cfg.eyebrow}</p>
        <h1>{n ? cfg.heading(n) : cfg.eyebrow}</h1>
        <p className="wings-tagline">{cfg.tagline}</p>
      </div>
      <div className="wings-org-section">
        <div className="wings-stage">
          {isLoading && <Loading label={`Loading ${cfg.noun}s…`} />}
          {error && <ErrorNote error={error} retry={refetch} />}
          {data && !data.length && <p className="loading-note">No {cfg.noun}s have been added yet.</p>}
          {data && data.length > 0 && (
            <AnimatePresence mode="wait" initial={false}>
              {slug && index >= 0 ? (
                <Detail key={slug} item={data[index]} index={index} total={n} cfg={cfg} kind={kind} />
              ) : slug ? (
                <div key="missing" className="wing-detail"><p className="loading-note">We couldn't find that {cfg.noun}.</p><Link to={cfg.base} className="wing-back"><ArrowLeft /> Back</Link></div>
              ) : (
                <Grid key="grid" items={data} cfg={cfg} kind={kind} />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}
