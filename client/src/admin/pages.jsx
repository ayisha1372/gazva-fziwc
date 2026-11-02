import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, api, assetUrl } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtLongDate } from '../lib/format.js';
import { useTitle } from '../hooks/index.js';
import ResourceManager from './ResourceManager.jsx';
import { defs } from './resources.jsx';
import { Confirm, Field, Modal, Pill, ToastProvider, useToast } from './ui.jsx';
import { GenerateLogins, LoginCell } from './credentials.jsx';

/* ================= login & guard ================= */
export function AdminLogin() {
  useTitle('Admin sign in');
  const { login, user, logout, ready } = useAuth();
  const navigate = useNavigate();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (ready && user?.role === 'admin') return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const me = await login(u.trim(), p);
      if (me.role !== 'admin') setErr('This account can view rankings but cannot open the admin panel.');
      else navigate('/admin');
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <div className="adm adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <img src="/gazvalogo.png" alt="Gazva" width="56" height="56" />
        <h1>Gazva Admin</h1>
        <p>Sign in to manage departments, wings, events and rankings.</p>
        <div className="adm-field"><label htmlFor="u">Username</label><input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" required /></div>
        <div className="adm-field"><label htmlFor="p">Password</label><input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></div>
        {err && <div className="adm-banner" role="alert">{err}</div>}
        <button className="adm-btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {user && user.role !== 'admin' && <button type="button" className="adm-btn link" onClick={logout}>Sign out of {user.username}</button>}
        <Link to="/" className="adm-back">← Back to website</Link>
      </form>
    </div>
  );
}

export function RequireAdmin({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="adm adm-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

/* ================= layout ================= */
const NAV = [
  ['Overview', [['/admin', 'Dashboard', true]]],
  ['Content', [['/admin/events', 'Events'], ['/admin/categories', 'Categories'], ['/admin/media', 'Images']]],
  ['Organisation', [['/admin/departments', 'Departments'], ['/admin/wings', 'Wings'], ['/admin/clubs', 'Clubs'], ['/admin/core', 'Core Committee'], ['/admin/advisors', 'Advisory Board']]],
  ['Rankings', [['/admin/rankings', 'Points & rankings']]],
  ['Site', [['/admin/testimonials', 'Testimonials'], ['/admin/messages', 'Messages'], ['/admin/settings', 'Settings']]],
  ['Access', [['/admin/users', 'Users']]],
];

function ChangePassword({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => api.post('/auth/change-password', f), onSuccess: () => { toast.success('Password changed'); onClose(); }, onError: (e) => setErr(e.details?.[0]?.message || e.message) });
  return (
    <Modal title="Change password" onClose={onClose} footer={<><button className="adm-btn ghost" onClick={onClose}>Cancel</button><button className="adm-btn primary" disabled={m.isPending} onClick={() => m.mutate()}>Save</button></>}>
      <div className="adm-form">
        {err && <div className="adm-banner">{err}</div>}
        <div className="adm-field wide"><label>Current password</label><input type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></div>
        <div className="adm-field wide"><label>New password</label><input type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /><small className="adm-hint">At least 12 characters for admin accounts.</small></div>
      </div>
    </Modal>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [pw, setPw] = useState(false);
  const { data: dash } = useQuery({ queryKey: ['adm-dash'], queryFn: () => api.get('/admin/dashboard'), refetchInterval: 60_000 });
  const unread = dash?.counts.unread || 0;
  return (
    <ToastProvider>
      <div className="adm adm-shell">
        <header className="adm-topbar">
          <button className="adm-burger" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>☰</button>
          <img src="/gazvalogo.png" alt="" width="28" height="28" /><b>Gazva Admin</b>
        </header>
        <aside className={`adm-side${menu ? ' open' : ''}`} onClick={() => setMenu(false)}>
          <div className="adm-brand"><img src="/gazvalogo.png" alt="" width="30" height="30" /><span>Gazva Admin</span></div>
          <nav aria-label="Admin">
            {NAV.map(([group, links]) => (
              <div key={group} className="adm-group"><p>{group}</p>
                {links.map(([to, label, end]) => (
                  <NavLink key={to} to={to} end={end} className="adm-link">{label}{to.endsWith('messages') && unread > 0 && <span className="adm-badge">{unread}</span>}</NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="adm-side-foot">
            <p>{user.displayName} <small>({user.username})</small></p>
            <Link to="/" className="adm-btn ghost sm block">View website</Link>
            <button className="adm-btn ghost sm block" onClick={(e) => { e.stopPropagation(); setPw(true); }}>Change password</button>
            <button className="adm-btn ghost sm block" onClick={logout}>Sign out</button>
          </div>
        </aside>
        <main className="adm-main"><Outlet /></main>
        {pw && <ChangePassword onClose={() => setPw(false)} />}
      </div>
    </ToastProvider>
  );
}

/* ================= dashboard ================= */
export function Dashboard() {
  useTitle('Dashboard');
  const { data } = useQuery({ queryKey: ['adm-dash'], queryFn: () => api.get('/admin/dashboard') });
  if (!data) return <p className="adm-empty">Loading…</p>;
  const c = data.counts;
  const cards = [
    ['Students', c.students, '/admin/rankings'], ['Wings', c.wings, '/admin/wings'], ['Clubs', c.clubs, '/admin/clubs'], ['Class unions', c.classUnions, '/admin/rankings'],
    ['Departments', c.departments, '/admin/departments'], ['Events', c.events, '/admin/events'],
  ];
  return (
    <section className="adm-page">
      <header className="adm-head"><div><h2>Dashboard</h2><p>A quick look at the website content.</p></div></header>
      <div className="adm-cards">{cards.map(([l, n, to]) => <Link key={l} to={to} className="adm-card"><strong>{n}</strong><span>{l}</span></Link>)}</div>
      <div className="adm-two">
        <div className="adm-panel"><h3>Events by status</h3>
          <ul className="adm-plain">{Object.entries(data.eventStatus).map(([k, v]) => <li key={k}><Pill tone={{ upcoming: 'rose', ongoing: 'green', completed: 'grey' }[k]}>{k}</Pill> <b>{v}</b></li>)}</ul></div>
        <div className="adm-panel"><h3>Latest messages {c.unread > 0 && <Pill tone="rose">{c.unread} unread</Pill>}</h3>
          {data.recentMessages.length === 0 ? <p className="adm-hint">No messages yet.</p> : (
            <ul className="adm-plain">{data.recentMessages.map((m) => <li key={m.id}><b>{m.firstName} {m.lastName}</b> <small>{fmtLongDate(m.createdAt)}</small><br /><span className="adm-clip">{m.message}</span></li>)}</ul>)}
          <Link to="/admin/messages" className="adm-btn link">Open inbox</Link></div>
      </div>
    </section>
  );
}

/* ================= generic wrapper pages ================= */
export const ResourcePage = ({ name }) => { useTitle(`Admin · ${defs[name].title}`); return <ResourceManager def={defs[name]} />; };

export function RankingsAdmin() {
  useTitle('Admin · Rankings');
  const [tab, setTab] = useState('students');
  const tabs = [['students', 'Students'], ['wings', 'Wings'], ['clubs', 'Clubs'], ['class-unions', 'Class Unions']];
  const base = defs[tab];
  // Rankings view = rank + name + inline points editor. Full edit form is still one click away.
  const def = { ...base, title: `${base.title} ranking`, columns: base.columns.filter((c) => c.label === 'Rank' || c.label === 'Student' || c.label === 'Wing' || c.label === 'Club' || c.label === 'Class union' || (tab === 'students' && c.label === 'Class')) };
  const isProtected = tab !== 'students';
  const { data: credData } = useQuery({ queryKey: ['adm-cred', tab], queryFn: () => api.get(`/admin/credentials/${tab}`), enabled: isProtected });
  const credMap = Object.fromEntries((credData?.items || []).map((c) => [c.entityId, c]));
  const { data: allRows } = useQuery({ queryKey: ['adm', tab, { page: 1, limit: 500, q: '' }], queryFn: () => adminApi(tab).list({ page: 1, limit: 500, q: '' }), enabled: isProtected });
  const missing = isProtected && allRows ? allRows.items.filter((r) => !credMap[r.id]).length : 0;
  const loginCol = isProtected ? [{ label: 'Login', render: (r) => <LoginCell row={r} kind={tab} cred={credMap[r.id]} singular={base.singular} /> }] : [];
  const hasRank = def.columns.some((c) => c.label === 'Rank');
  const columns = hasRank ? def.columns : [{ label: 'Rank', className: 'narrow', render: (r) => <span className="adm-rank" title={r.position}>{r.rank}{r.tied ? <sup>T</sup> : null}</span> }, ...def.columns];
  return (
    <>
      <div className="adm-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <ResourceManager key={tab} def={{ ...def, columns, subtitle: `${tab === 'students' ? 'Public ranking.' : 'Protected ranking — each entry has its own login (the “Login” column) and sees only its own ranking.'} Change points here and the order updates automatically; equal points share a rank.` }}
        extraColumns={[...base.rankings, ...loginCol]} clientRank={isProtected} pageSize={25}
        headerRight={isProtected ? <GenerateLogins kind={tab} title={base.title} missing={missing} /> : null} />
    </>
  );
}

/* ================= messages ================= */
export function Messages() {
  useTitle('Admin · Messages');
  const qc = useQueryClient();
  const toast = useToast();
  const [del, setDel] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['adm-messages'], queryFn: () => api.get('/admin/messages') });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['adm-messages'] }); qc.invalidateQueries({ queryKey: ['adm-dash'] }); };
  const toggle = useMutation({ mutationFn: (m) => api.patch(`/admin/messages/${m.id}`, { isRead: !m.isRead }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (m) => api.del(`/admin/messages/${m.id}`), onSuccess: () => { toast.success('Message deleted'); setDel(null); refresh(); } });
  return (
    <section className="adm-page">
      <header className="adm-head"><div><h2>Messages</h2><p>Submissions from the Contact page.</p></div></header>
      {isLoading && <p className="adm-empty">Loading…</p>}
      {data?.items.length === 0 && <p className="adm-empty">No messages yet.</p>}
      <div className="adm-msgs">
        {data?.items.map((m) => (
          <article key={m.id} className={`adm-msg${m.isRead ? '' : ' unread'}`}>
            <div className="adm-msg-top"><div><b>{m.firstName} {m.lastName}</b> <a href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · {m.phone}</>}</div><small>{fmtLongDate(m.createdAt)}</small></div>
            {m.subject && <Pill tone="rose">{m.subject}</Pill>}
            <p>{m.message}</p>
            <div className="adm-msg-actions">
              <button className="adm-btn ghost sm" onClick={() => toggle.mutate(m)}>{m.isRead ? 'Mark unread' : 'Mark read'}</button>
              <a className="adm-btn ghost sm" href={`mailto:${m.email}?subject=Re: your message to Gazva`}>Reply</a>
              <button className="adm-btn link danger sm" onClick={() => setDel(m)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      {del && <Confirm title="Delete message?" onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} busy={remove.isPending}><p>This message from {del.firstName} will be permanently removed.</p></Confirm>}
    </section>
  );
}

/* ================= media ================= */
export function MediaLibrary() {
  useTitle('Admin · Images');
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const { data } = useQuery({ queryKey: ['adm-media', page], queryFn: () => api.get('/admin/media', { page }) });
  const upload = useMutation({
    mutationFn: async (files) => { for (const f of files) { const fd = new FormData(); fd.append('image', f); await api.post('/admin/media', fd); } },
    onSuccess: () => { toast.success('Uploaded'); qc.invalidateQueries({ queryKey: ['adm-media'] }); }, onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({ mutationFn: (m) => api.del(`/admin/media/${m.id}`), onSuccess: () => { toast.success('Image deleted'); setDel(null); qc.invalidateQueries({ queryKey: ['adm-media'] }); } });
  return (
    <section className="adm-page">
      <header className="adm-head"><div><h2>Images</h2><p>Everything uploaded through the admin panel. Deleting an image here removes the file — anything still using it will show a placeholder.</p></div>
        <label className="adm-btn primary">{upload.isPending ? 'Uploading…' : '+ Upload images'}<input type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={(e) => { if (e.target.files.length) upload.mutate([...e.target.files]); e.target.value = ''; }} /></label></header>
      {data?.items.length === 0 && <p className="adm-empty">No images yet.</p>}
      <div className="adm-media">
        {data?.items.map((m) => (
          <figure key={m.id}><img src={assetUrl(m.url)} alt="" loading="lazy" />
            <figcaption><small title={m.originalName}>{m.originalName || m.filename}</small>
              <span><button className="adm-btn link sm" onClick={() => { navigator.clipboard?.writeText(m.url); toast.success('URL copied'); }}>Copy URL</button><button className="adm-btn link danger sm" onClick={() => setDel(m)}>Delete</button></span></figcaption></figure>
        ))}
      </div>
      {data && data.pages > 1 && <div className="adm-pager"><button className="adm-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {data.page} of {data.pages}</span><button className="adm-btn ghost sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
      {del && <Confirm title="Delete image?" onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} busy={remove.isPending}><p>The file will be removed from the server.</p></Confirm>}
    </section>
  );
}

/* ================= users ================= */
export function Users() {
  useTitle('Admin · Users');
  const qc = useQueryClient();
  const toast = useToast();
  const { user: me } = useAuth();
  const { data } = useQuery({ queryKey: ['adm-users'], queryFn: () => api.get('/admin/users') });
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['adm-users'] });
  const save = useMutation({
    mutationFn: ({ id, f }) => (id ? api.put(`/admin/users/${id}`, { displayName: f.displayName, role: f.role, active: f.active, password: f.password || undefined }) : api.post('/admin/users', f)),
    onSuccess: () => { toast.success('User saved'); setEdit(null); refresh(); },
    onError: (e) => setErr(e.details?.map((d) => d.message).join('. ') || e.message),
  });
  const remove = useMutation({ mutationFn: (u) => api.del(`/admin/users/${u.id}`), onSuccess: () => { toast.success('User deleted'); setDel(null); refresh(); }, onError: (e) => { toast.error(e.message); setDel(null); } });
  const open = (u) => { setErr(''); setEdit(u ? { id: u.id, f: { username: u.username, displayName: u.displayName, role: u.role, active: u.active, password: '' } } : { f: { username: '', displayName: '', role: 'viewer', active: true, password: '' } }); };
  const set = (k, v) => setEdit((e) => ({ ...e, f: { ...e.f, [k]: v } }));
  return (
    <section className="adm-page">
      <header className="adm-head"><div><h2>Users</h2><p><b>Viewers</b> can open all protected rankings. <b>Admins</b> can also manage the website. Logins for individual wings, clubs and class unions are created from <b>Points &amp; rankings</b>.</p></div>
        <button className="adm-btn primary" onClick={() => open(null)}>+ Add user</button></header>
      <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th className="actions">Actions</th></tr></thead>
        <tbody>{data?.items.map((u) => (
          <tr key={u.id}><td><b>{u.username}</b></td><td>{u.displayName}</td><td><Pill tone={u.role === 'admin' ? 'rose' : 'grey'}>{u.role === 'member' ? `${u.entityLabel}: ${u.entityName}` : u.role}</Pill></td><td><Pill tone={u.active ? 'green' : 'grey'}>{u.active ? 'Active' : 'Disabled'}</Pill></td><td>{u.lastLoginAt ? fmtLongDate(u.lastLoginAt) : '—'}</td>
            <td className="actions"><button className="adm-btn link" onClick={() => open(u)}>Edit</button>{u.id !== me.id && <button className="adm-btn link danger" onClick={() => setDel(u)}>Delete</button>}</td></tr>
        ))}</tbody></table></div>
      {edit && (
        <Modal title={edit.id ? 'Edit user' : 'New user'} onClose={() => setEdit(null)} footer={<><button className="adm-btn ghost" onClick={() => setEdit(null)}>Cancel</button><button className="adm-btn primary" disabled={save.isPending} onClick={() => { setErr(''); save.mutate(edit); }}>Save</button></>}>
          <div className="adm-form">
            {err && <div className="adm-banner">{err}</div>}
            <Field def={{ key: 'username', label: 'Username', required: true }} value={edit.f.username} onChange={(v) => !edit.id && set('username', v)} />
            <Field def={{ key: 'displayName', label: 'Display name' }} value={edit.f.displayName} onChange={(v) => set('displayName', v)} />
            {edit.f.role === 'member'
              ? <p className="adm-hint adm-wide">This login belongs to a wing / club / class union. Create or reset it from <b>Points &amp; rankings</b>.</p>
              : <Field def={{ key: 'role', label: 'Role', type: 'select', options: [['viewer', 'Viewer — all protected rankings'], ['admin', 'Admin — full access']] }} value={edit.f.role} onChange={(v) => set('role', v)} />}
            <Field def={{ key: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Account is active' }} value={edit.f.active} onChange={(v) => set('active', v)} />
            <Field def={{ key: 'password', label: edit.id ? 'New password (leave blank to keep)' : 'Password', type: 'password', wide: true, help: 'Viewers: 8+ characters. Admins: 12+ characters.' }} value={edit.f.password} onChange={(v) => set('password', v)} />
          </div>
        </Modal>
      )}
      {del && <Confirm title="Delete user?" onClose={() => setDel(null)} onConfirm={() => remove.mutate(del)} busy={remove.isPending}><p>“{del.username}” will no longer be able to sign in.</p></Confirm>}
    </section>
  );
}

/* ================= settings ================= */
export function Settings() {
  useTitle('Admin · Settings');
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useQuery({ queryKey: ['adm-settings'], queryFn: () => api.get('/admin/settings') });
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (data && !f) setF(JSON.parse(JSON.stringify(data))); }, [data, f]);
  const save = useMutation({
    mutationFn: () => api.put('/admin/settings', {
      academicYear: f.academicYear, blogUrl: (f.blogUrl || '').trim(), hero: f.hero, vision: f.vision, mission: f.mission, footer: f.footer, social: f.social,
      contact: { ...f.contact, emails: (f.contact.emails || []).filter(Boolean) },
      stats: f.stats.map((s) => ({ label: s.label, value: Number(s.value) || 0, suffix: s.suffix || '', source: s.source || 'manual' })),
    }),
    onSuccess: () => { toast.success('Settings saved'); setErr(''); qc.invalidateQueries({ queryKey: ['/settings'] }); },
    onError: (e) => setErr(e.details?.map((d) => `${d.field}: ${d.message}`).join(' · ') || e.message),
  });
  if (!f) return <p className="adm-empty">Loading…</p>;
  const set = (path, v) => setF((x) => { const n = JSON.parse(JSON.stringify(x)); const keys = path.split('.'); let o = n; keys.slice(0, -1).forEach((k) => { o = o[k]; }); o[keys.at(-1)] = v; return n; });
  const T = (path, label, extra = {}) => <Field def={{ key: path, label, wide: true, ...extra }} value={path.split('.').reduce((o, k) => o?.[k], f)} onChange={(v) => set(path, v)} />;
  return (
    <section className="adm-page">
      <header className="adm-head"><div><h2>Site settings</h2><p>Home page text, statistics, contact details and social links.</p></div><button className="adm-btn primary" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save settings'}</button></header>
      {err && <div className="adm-banner">{err}</div>}
      <div className="adm-panel"><h3>Blog button</h3><p className="adm-hint">The “Blog” button in the top menu and footer opens your separate blog website in a new tab. Paste its full address here (for example <code>https://blog.yourcollege.in</code>). Leave it empty to hide the button.</p><div className="adm-form">
        {T('blogUrl', 'Blog website link', { placeholder: 'https://gazva-insight.vercel.app/' })}</div></div>
      <div className="adm-panel"><h3>Home page</h3><div className="adm-form">
        {T('hero.badge', 'Hero badge')}{T('hero.title', 'Hero title')}{T('hero.subtitle', 'Hero subtitle', { type: 'textarea', rows: 2 })}
        {T('vision', 'Vision', { type: 'textarea' })}{T('mission', 'Mission', { type: 'textarea' })}{T('academicYear', 'Academic year', { wide: false })}</div></div>
      <div className="adm-panel"><h3>Statistics</h3><p className="adm-hint">“Live” counts come straight from the database; “Manual” shows the number you type.</p>
        {f.stats.map((s, i) => (
          <div className="adm-stat-row" key={i}>
            <input value={s.label} onChange={(e) => set(`stats.${i}.label`, e.target.value)} aria-label="Label" />
            <select value={s.source} onChange={(e) => set(`stats.${i}.source`, e.target.value)} aria-label="Source"><option value="manual">Manual</option>{['departments', 'wings', 'clubs', 'events', 'students'].map((k) => <option key={k} value={k}>Live: {k}</option>)}</select>
            <input type="number" min="0" disabled={s.source !== 'manual'} value={s.value} onChange={(e) => set(`stats.${i}.value`, e.target.value)} aria-label="Value" />
            <input value={s.suffix} maxLength={4} onChange={(e) => set(`stats.${i}.suffix`, e.target.value)} aria-label="Suffix" placeholder="+" />
            <button className="adm-btn link danger sm" onClick={() => set('stats', f.stats.filter((_, k) => k !== i))}>Remove</button>
          </div>))}
        {f.stats.length < 6 && <button className="adm-btn ghost sm" onClick={() => set('stats', [...f.stats, { label: '', value: 0, suffix: '', source: 'manual' }])}>+ Add statistic</button>}</div>
      <div className="adm-panel"><h3>Contact page</h3><div className="adm-form">
        {T('contact.address', 'Address', { type: 'textarea', rows: 2 })}
        <Field def={{ key: 'emails', label: 'Email addresses', type: 'strings', addLabel: 'Add email', wide: true }} value={f.contact.emails} onChange={(v) => set('contact.emails', v)} />
        {T('contact.phone', 'Phone', { wide: false })}{T('contact.hoursWeekday', 'Office hours (weekdays)', { wide: false })}{T('contact.hoursOther', 'Office hours (other days)')}</div></div>
      <div className="adm-panel"><h3>Footer</h3><div className="adm-form">
        {T('footer.sub', 'Tagline under the logo')}{T('footer.description', 'Short description', { type: 'textarea', rows: 2 })}{T('footer.address', 'Address', { type: 'textarea', rows: 2 })}{T('footer.email', 'Email')}</div></div>
      <div className="adm-panel"><h3>Social links</h3><div className="adm-form">
        {['instagram', 'facebook', 'whatsapp', 'youtube'].map((k) => T(`social.${k}`, k[0].toUpperCase() + k.slice(1), { help: 'Full URL, or leave empty to hide the icon.' }))}</div></div>
    </section>
  );
}
