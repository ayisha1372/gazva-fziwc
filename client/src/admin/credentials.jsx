import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { fmtLongDate } from '../lib/format.js';
import { Confirm, Modal, Pill, useToast } from './ui.jsx';

const PREFIX = { wings: 'wing', clubs: 'club', 'class-unions': 'cu' };
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomPassword(len = 10) {
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
const copy = async (text, toast, msg = 'Copied') => { try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.error('Copy failed — select and copy manually'); } };

/* ---------- one entity's login ---------- */
export function LoginCell({ row, kind, cred, singular }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="adm-logincell">
        {cred ? <><Pill tone={cred.active ? 'green' : 'grey'}>{cred.active ? 'Login on' : 'Login off'}</Pill><code>{cred.username}</code></> : <span className="adm-hint">No login yet</span>}
        <button type="button" className="adm-btn ghost sm" onClick={() => setOpen(true)}>{cred ? 'Manage' : 'Set password'}</button>
      </span>
      {open && <CredentialModal row={row} kind={kind} cred={cred} singular={singular} onClose={() => setOpen(false)} />}
    </>
  );
}

function CredentialModal({ row, kind, cred, singular, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [username, setUsername] = useState(cred?.username || `${PREFIX[kind]}.${row.slug || ''}`.slice(0, 32));
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(cred ? cred.active : true);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['adm-cred', kind] });

  const save = useMutation({
    mutationFn: () => api.put(`/admin/credentials/${kind}/${row.id}`, { username, password, active }),
    onSuccess: () => { refresh(); toast.success('Login saved'); setSaved({ username, password }); },
    onError: (e) => setErr(e.details?.map((d) => d.message).join('. ') || e.message),
  });
  const remove = useMutation({ mutationFn: () => api.del(`/admin/credentials/${kind}/${row.id}`), onSuccess: () => { refresh(); toast.success('Login removed'); onClose(); } });

  if (confirmDel) return <Confirm title="Remove this login?" confirmLabel="Remove login" busy={remove.isPending} onClose={() => setConfirmDel(false)} onConfirm={() => remove.mutate()}><p>{row.name} will no longer be able to sign in. The {singular.toLowerCase()} itself is not deleted.</p></Confirm>;

  return (
    <Modal title={`${row.name} — ranking login`} onClose={onClose} footer={saved
      ? <button type="button" className="adm-btn primary" onClick={onClose}>Done</button>
      : <>{cred && <button type="button" className="adm-btn link danger" onClick={() => setConfirmDel(true)}>Remove login</button>}<span style={{ flex: 1 }} />
        <button type="button" className="adm-btn ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="adm-btn primary" disabled={save.isPending || (!cred && password.length < 8)} onClick={() => { setErr(''); save.mutate(); }}>{save.isPending ? 'Saving…' : 'Save login'}</button></>}>
      {saved ? (
        <div className="adm-saved">
          <p>Share these with {row.name}. The password is stored hashed and <b>cannot be shown again</b> later{saved.password ? '' : ' (you kept the existing one)'}.</p>
          <div className="adm-cred-box"><span>Username</span><code>{saved.username}</code><span>Password</span><code>{saved.password || '(unchanged)'}</code></div>
          {saved.password && <button type="button" className="adm-btn ghost sm" onClick={() => copy(`Username: ${saved.username}\nPassword: ${saved.password}`, toast, 'Login details copied')}>Copy login details</button>}
        </div>
      ) : (
        <div className="adm-form">
          <p className="adm-hint adm-wide">This login opens <b>only the {singular.toLowerCase()} ranking</b> — nothing else on the site, and never the admin panel.</p>
          {err && <div className="adm-banner">{err}</div>}
          <div className="adm-field wide"><label htmlFor="c-user">Username</label><input id="c-user" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" /></div>
          <div className="adm-field wide"><label htmlFor="c-pass">{cred ? 'New password (leave blank to keep the current one)' : 'Password'}</label>
            <div className="adm-passrow">
              <input id="c-pass" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="adm-btn ghost sm" onClick={() => { setPassword(randomPassword()); setShow(true); }}>Generate</button>
              <button type="button" className="adm-btn ghost sm" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
            </div><small className="adm-hint">At least 8 characters.</small></div>
          {cred && <div className="adm-field wide"><label className="adm-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Login is active</label>
            {cred.lastLoginAt && <small className="adm-hint">Last sign-in: {fmtLongDate(cred.lastLoginAt)}</small>}</div>}
        </div>
      )}
    </Modal>
  );
}

/* ---------- bulk generate ---------- */
export function GenerateLogins({ kind, title, missing }) {
  const [open, setOpen] = useState(false);
  const [resetAll, setResetAll] = useState(false);
  const [result, setResult] = useState(null);
  const qc = useQueryClient();
  const toast = useToast();
  const run = useMutation({
    mutationFn: () => api.post(`/admin/credentials/${kind}/generate`, { onlyMissing: !resetAll }),
    onSuccess: (r) => { setResult(r.items); qc.invalidateQueries({ queryKey: ['adm-cred', kind] }); },
    onError: (e) => toast.error(e.message),
  });
  const close = () => { setOpen(false); setResult(null); setResetAll(false); };
  const tsv = (rows) => ['Name\tUsername\tPassword', ...rows.map((r) => `${r.name}\t${r.username}\t${r.password}`)].join('\n');
  const download = (rows) => {
    const csv = ['Name,Username,Password', ...rows.map((r) => [r.name, r.username, r.password].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${kind}-logins.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <button type="button" className="adm-btn ghost" onClick={() => setOpen(true)}>Generate logins{missing > 0 ? ` (${missing} missing)` : ''}</button>
      {open && (
        <Modal wide={!!result} title={`Generate ${title.toLowerCase()} logins`} onClose={close} footer={result
          ? <button className="adm-btn primary" onClick={close}>I've saved them</button>
          : <><button className="adm-btn ghost" onClick={close}>Cancel</button><button className="adm-btn primary" disabled={run.isPending} onClick={() => run.mutate()}>{run.isPending ? 'Creating…' : 'Create logins'}</button></>}>
          {!result ? (
            <div className="adm-saved">
              <p>Creates a separate username and random password for every {title.toLowerCase().replace(/s$/, '')} that does not have a login yet — {missing > 0 ? <b>{missing} right now</b> : 'none are missing right now'}.</p>
              <label className="adm-check"><input type="checkbox" checked={resetAll} onChange={(e) => setResetAll(e.target.checked)} /> Also reset the passwords of existing logins</label>
              <p className="adm-hint">The passwords are shown once on the next screen, then stored hashed.</p>
            </div>
          ) : result.length === 0 ? <p className="adm-empty">Nothing to create — every entry already has a login.</p> : (
            <>
              <div className="adm-banner warn">Copy or download these now. Passwords cannot be shown again (you can always set a new one).</div>
              <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Name</th><th>Username</th><th>Password</th></tr></thead>
                <tbody>{result.map((r) => <tr key={r.entityId}><td><b>{r.name}</b></td><td><code>{r.username}</code></td><td><code>{r.password}</code></td></tr>)}</tbody></table></div>
              <div className="adm-saved-actions">
                <button type="button" className="adm-btn ghost sm" onClick={() => copy(tsv(result), toast, 'Copied — paste into a sheet')}>Copy all</button>
                <button type="button" className="adm-btn ghost sm" onClick={() => download(result)}>Download CSV</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
