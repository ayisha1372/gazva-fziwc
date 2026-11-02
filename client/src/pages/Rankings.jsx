import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { keepPreviousData } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi, useDebounced, useTitle } from '../hooks/index.js';
import { AnimatedNumber, Avatar, EmptyState, ErrorNote, Loading, LockIcon, LogoBadge, PageBanner, Pagination, rise, stagger } from '../components/ui/index.jsx';
import '../styles/rankings-original.css';

const TABS = [
  { key: 'students', label: 'Students', protected: false },
  { key: 'wings', label: 'Wings', protected: true, type: 'wing', who: 'wing' },
  { key: 'clubs', label: 'Clubs', protected: true, type: 'club', who: 'club' },
  { key: 'class-unions', label: 'Class Unions', protected: true, type: 'classUnion', who: 'class union' },
];
const TAB_FOR_TYPE = { wing: 'wings', club: 'clubs', classUnion: 'class-unions' };

/* ---------- small pieces ---------- */
// Wings only show a logo when one is uploaded or the wing is flagged to keep its logo slot (e.g. Gazva Debate).
const hasLogo = (r) => !!r.logo || r.showLogoSlot !== false;
const medal = (rank) => (rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '');

function RankBadge({ rank }) {
  return <span className={`rank-badge ${medal(rank)}`} aria-label={`Rank ${rank}`}>{rank}</span>;
}

function Podium({ items, visual, mineId }) {
  if (!items?.length) return null;
  // Visual order 2 · 1 · 3 puts the leader in the middle on wide screens.
  const order = items.length >= 3 ? [items[1], items[0], items[2]] : items;
  return (
    <motion.div className="podium" variants={stagger} initial="hidden" animate="show" aria-label="Top ranked">
      {order.map((it) => (
        <motion.div key={it.id} variants={rise} className={`podium-card pos-${Math.min(it.rank, 3)} ${medal(it.rank)}${it.id === mineId ? ' is-mine' : ''}`}>
          <span className="podium-rank">{it.position}</span>
          {visual === 'person' ? <Avatar src={it.photo} name={it.name} className="podium-avatar" /> : hasLogo(it) ? <LogoBadge src={it.logo} name={it.name} size={72} /> : <span className="podium-crest" aria-hidden="true">{it.rank}</span>}
          <h3>{it.name}</h3>
          {it.className && <p className="podium-sub">{it.className}</p>}
          {it.wing && <p className="podium-sub">{it.wing}</p>}
          {it.id === mineId && <span className="mine-tag">You</span>}
          <div className="podium-points"><AnimatedNumber value={it.points} /><small>pts</small></div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function SignInGate({ label, who }) {
  const { login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await login(u.trim(), p); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <motion.form className="rank-gate" onSubmit={submit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} aria-labelledby="gate-title">
      <div className="gate-icon"><LockIcon /></div>
      <h2 id="gate-title">{label} are private</h2>
      <p>Sign in with your own {who ? `${who} ` : ''}username and password to see this ranking. Student rankings stay open to everyone.</p>
      <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required autoCapitalize="none" /></label>
      <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
      {err && <p className="field-error" role="alert">{err}</p>}
      <button type="submit" className="btn-solid" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </motion.form>
  );
}

/* ---------- Students (public) ---------- */
function Students() {
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('all');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 300);
  const { data, isLoading, error, refetch, isFetching } = useApi('/rankings/students', { q, className: cls, page, limit: 20 }, { placeholderData: keepPreviousData });
  const searching = q || cls !== 'all';

  return (
    <>
      {!searching && page === 1 && <Podium items={data?.top} visual="person" />}
      <div className="rank-tools">
        <label className="filter-search rank-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or class…" aria-label="Search students" />
        </label>
        {data?.classes?.length > 0 && (
          <select className="rank-select" value={cls} onChange={(e) => { setCls(e.target.value); setPage(1); }} aria-label="Filter by class">
            <option value="all">All classes</option>
            {data.classes.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
        {data && <span className="rank-count" aria-live="polite">{data.total} of {data.totalStudents} students{isFetching ? ' …' : ''}</span>}
      </div>

      {isLoading && <Loading label="Loading rankings…" />}
      {error && <ErrorNote error={error} retry={refetch} />}
      {data && data.total === 0 && <EmptyState title={searching ? 'No students match your search' : 'No students ranked yet'}>{searching ? 'Check the spelling or clear the filters.' : 'Rankings will appear here once points are added.'}</EmptyState>}
      {data && data.total > 0 && (
        <div className="rank-table-wrap">
          <table className="rankings-table">
            <thead><tr><th>Rank</th><th>Student</th><th className="col-class">Class</th><th>Points</th><th className="col-pos">Position</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className={r.rank <= 3 ? `row-top ${medal(r.rank)}` : ''}>
                  <td><RankBadge rank={r.rank} /></td>
                  <td>
                    <div className="rank-person">
                      <Avatar src={r.photo} name={r.name} className="rank-avatar" />
                      <div><strong>{r.name}</strong>{r.achievements && <div className="rank-achievements">{r.achievements}</div>}</div>
                    </div>
                  </td>
                  <td className="col-class rank-dept">{r.className || '—'}</td>
                  <td className="rank-points"><AnimatedNumber value={r.points} duration={0.8} immediate /> pts</td>
                  <td className="col-pos rank-posname">{r.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}

/* ---------- Wings / Clubs / Class Unions (protected) ---------- */
function Protected({ tab }) {
  const { isSignedIn, canViewRanking, user, logout } = useAuth();
  const allowed = canViewRanking(tab.type);
  const { data, isLoading, error, refetch } = useApi(`/rankings/${tab.key}`, null, { enabled: allowed, retry: false });

  if (!isSignedIn) return <SignInGate label={`${tab.label} rankings`} who={tab.who} />;
  if (!allowed) {
    const own = user.scope && TAB_FOR_TYPE[user.scope.type];
    return (
      <motion.div className="rank-gate" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="gate-icon"><LockIcon /></div>
        <h2>This login doesn't include {tab.label.toLowerCase()}</h2>
        <p>You're signed in as <strong>{user.displayName}</strong>, which opens {own ? <>only the <strong>{TABS.find((t) => t.key === own).label.toLowerCase()}</strong> ranking</> : 'a different ranking'}. Use your own {tab.who} login for this one.</p>
        {own && <Link to={`/rankings/${own}`} className="btn-solid" style={{ width: '100%' }}>Open my ranking</Link>}
        <button type="button" className="ghost-btn" style={{ width: '100%', marginTop: '.6rem' }} onClick={logout}>Sign in with a different login</button>
      </motion.div>
    );
  }
  const mineId = user.scope?.type === tab.type ? user.scope.id : null;
  const mine = data?.items.find((r) => r.id === mineId);
  return (
    <>
      <div className="signed-strip">Signed in as <strong>{user.displayName}</strong> · <button type="button" onClick={logout}>Sign out</button></div>
      {mine && (
        <motion.div className="mine-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span>Your {tab.who} is currently</span><strong>{mine.position}</strong><span>with</span><strong><AnimatedNumber value={mine.points} /> pts</strong>
        </motion.div>
      )}
      {isLoading && <Loading label="Loading rankings…" />}
      {error && <ErrorNote error={error} retry={refetch} />}
      {data && data.items.length === 0 && <EmptyState title="Nothing to rank yet">Entries appear here once an admin adds them.</EmptyState>}
      {data && data.items.length > 0 && (
        <>
          <Podium items={data.items.slice(0, 3)} visual="logo" mineId={mineId} />
          <div className="rank-table-wrap">
            <table className="rankings-table">
              <thead><tr><th>Rank</th><th>{tab.label.replace(/s$/, '')}</th><th>Points</th><th className="col-pos">Position</th></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className={`${r.rank <= 3 ? `row-top ${medal(r.rank)}` : ''}${r.id === mineId ? ' row-mine' : ''}`}>
                    <td><RankBadge rank={r.rank} /></td>
                    <td><div className="rank-person">{hasLogo(r) && <LogoBadge src={r.logo} name={r.name} size={42} />}<div><strong>{r.name}</strong>{r.id === mineId && <span className="mine-tag">You</span>}{r.wing && <div className="rank-dept">{r.wing}</div>}</div></div></td>
                    <td className="rank-points"><AnimatedNumber value={r.points} duration={0.8} immediate /> pts</td>
                    <td className="col-pos rank-posname">{r.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function Rankings() {
  const { tab: param } = useParams();
  const tab = TABS.find((t) => t.key === (param || 'students'));
  const { canViewRanking } = useAuth();
  useTitle(tab ? `${tab.label} Ranking` : 'Rankings');
  if (!tab) return <Navigate to="/rankings" replace />;

  return (
    <>
      <PageBanner title="Rankings" subtitle="Recognising outstanding contribution and performance across Gazva" />
      <div className="rankings-page">
        <div className="rankings-wrap wide">
          <div className="rank-tabs" role="tablist" aria-label="Ranking categories">
            {TABS.map((t) => (
              <Link key={t.key} to={t.key === 'students' ? '/rankings' : `/rankings/${t.key}`} role="tab" aria-selected={t.key === tab.key} className={`rank-tab${t.key === tab.key ? ' active' : ''}`}>
                {t.label}{t.protected && !canViewRanking(t.type) && <LockIcon />}
              </Link>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {tab.protected ? <Protected tab={tab} /> : <Students />}
            </motion.div>
          </AnimatePresence>
          <p className="rankings-note">Rankings are updated by the Gazva team based on participation, leadership, and achievement across events and departments. Equal points share a rank.</p>
        </div>
      </div>
    </>
  );
}
