import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, api, assetUrl } from '../lib/api.js';

/* ---------------- toasts ---------------- */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);
  const api_ = { success: (t) => push('success', t), error: (t) => push('error', t) };
  return (
    <ToastCtx.Provider value={api_}>
      {children}
      <div className="adm-toasts" aria-live="polite">{items.map((i) => <div key={i.id} className={`adm-toast ${i.kind}`}>{i.text}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------------- modal ---------------- */
export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="adm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`adm-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="adm-modal-head"><h3>{title}</h3><button type="button" className="adm-x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, children, confirmLabel = 'Delete', busy, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button type="button" className="adm-btn ghost" onClick={onClose}>Cancel</button>
      <button type="button" className="adm-btn danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>{children}</Modal>
  );
}

/* ---------------- image upload ---------------- */
export function ImageField({ value, onChange, compact }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const media = await api.post('/admin/media', fd);
      onChange(media.url);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }
  return (
    <div className={`adm-image${compact ? ' compact' : ''}`}>
      <div className="adm-image-preview">{value ? <img src={assetUrl(value)} alt="" /> : <span>No image</span>}</div>
      <div className="adm-image-actions">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={pick} />
        <button type="button" className="adm-btn ghost sm" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}</button>
        {value && <button type="button" className="adm-btn link sm" onClick={() => onChange('')}>Remove</button>}
      </div>
      {err && <small className="adm-err">{err}</small>}
    </div>
  );
}

/* ---------------- list editors ---------------- */
export function StringList({ value = [], onChange, placeholder = 'Add an item' }) {
  const set = (i, v) => onChange(value.map((x, k) => (k === i ? v : x)));
  return (
    <div className="adm-list">
      {value.map((s, i) => (
        <div className="adm-list-row" key={i}>
          <input value={s} onChange={(e) => set(i, e.target.value)} maxLength={200} aria-label={`Item ${i + 1}`} />
          <button type="button" className="adm-btn link sm" onClick={() => onChange(value.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="adm-btn ghost sm" onClick={() => onChange([...value, ''])}>+ {placeholder}</button>
    </div>
  );
}

export function MembersField({ value = [], onChange, max, suggestions = [] }) {
  const set = (i, patch) => onChange(value.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const copy = [...value]; [copy[i], copy[j]] = [copy[j], copy[i]]; onChange(copy);
  };
  const full = max && value.length >= max;
  return (
    <div className="adm-members">
      {max && <p className="adm-hint">{value.length} of {max} members. Leave a name empty to show “Position open”.</p>}
      {value.map((m, i) => (
        <div className="adm-member" key={m.id || i}>
          <ImageField compact value={m.photo} onChange={(v) => set(i, { photo: v })} />
          <div className="adm-member-fields">
            <input placeholder="Member name" value={m.name} onChange={(e) => set(i, { name: e.target.value })} maxLength={120} aria-label="Member name" />
            <input placeholder="Position / designation" list="adm-positions" value={m.position} onChange={(e) => set(i, { position: e.target.value })} maxLength={80} aria-label="Position" />
          </div>
          <div className="adm-member-ctl">
            <button type="button" className="adm-btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button type="button" className="adm-btn ghost sm" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down">↓</button>
            <button type="button" className="adm-btn link sm" onClick={() => onChange(value.filter((_, k) => k !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <datalist id="adm-positions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <button type="button" className="adm-btn ghost sm" disabled={full} onClick={() => onChange([...value, { name: '', position: suggestions[value.length] || '', photo: '' }])}>+ Add member</button>
    </div>
  );
}

/* ---------------- relation select ---------------- */
function RelationSelect({ def, value, onChange, id }) {
  const { data } = useQuery({
    queryKey: ['adm-rel', def.resource, def.params || null],
    queryFn: () => adminApi(def.resource).list({ limit: 200, ...(def.params || {}) }),
    staleTime: 60_000,
  });
  return (
    <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— None —</option>
      {(data?.items || []).map((o) => <option key={o.id} value={o.id}>{o[def.labelKey || 'name']}</option>)}
    </select>
  );
}

/* ---------------- generic field ---------------- */
export function Field({ def, value, onChange, error, form }) {
  const id = `f-${def.key}`;
  if (def.showIf && !def.showIf(form)) return null;
  let control;
  switch (def.type) {
    case 'textarea': case 'markdown':
      control = <textarea id={id} value={value ?? ''} rows={def.rows || (def.type === 'markdown' ? 14 : 4)} maxLength={def.max} onChange={(e) => onChange(e.target.value)} className={def.type === 'markdown' ? 'mono' : ''} />; break;
    case 'number':
      control = <input id={id} type="number" min={def.min ?? 0} step="1" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />; break;
    case 'date': control = <input id={id} type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />; break;
    case 'time': control = <input id={id} type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} />; break;
    case 'select':
      control = <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{def.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; break;
    case 'checkbox':
      control = <label className="adm-check"><input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {def.checkLabel || def.label}</label>; break;
    case 'image': control = <ImageField value={value} onChange={onChange} />; break;
    case 'relation': control = <RelationSelect id={id} def={def} value={value} onChange={onChange} />; break;
    case 'members': control = <MembersField value={value} onChange={onChange} max={def.max} suggestions={def.suggestions} />; break;
    case 'strings': control = <StringList value={value} onChange={onChange} placeholder={def.addLabel} />; break;
    case 'tags':
      control = <input id={id} value={(value || []).join(', ')} onChange={(e) => onChange(e.target.value.split(',').map((t) => t.trimStart()))} onBlur={(e) => onChange(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} placeholder="comma, separated" />; break;
    case 'password':
      control = <input id={id} type="password" autoComplete="new-password" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />; break;
    default:
      control = <input id={id} type="text" value={value ?? ''} maxLength={def.max} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} required={def.required} />;
  }
  return (
    <div className={`adm-field${def.wide ? ' wide' : ''}`}>
      {def.type !== 'checkbox' && <label htmlFor={id}>{def.label}{def.required && <b aria-hidden="true"> *</b>}</label>}
      {control}
      {def.help && <small className="adm-hint">{def.help}</small>}
      {error && <small className="adm-err">{error}</small>}
    </div>
  );
}

export const Pill = ({ tone = 'grey', children }) => <span className={`adm-pill ${tone}`}>{children}</span>;
export const Thumb = ({ src, round, name }) => (
  <span className={`adm-thumb${round ? ' round' : ''}`}>{src ? <img src={assetUrl(src)} alt="" /> : <i>{(name || '?').slice(0, 1)}</i>}</span>
);
