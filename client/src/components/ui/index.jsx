import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { assetUrl } from '../../lib/api.js';
import { initials } from '../../lib/format.js';

/* ---------- motion helpers ---------- */
/** Scroll-reveal wrapper. Cards inside keep their own CSS hover transforms (the wrapper owns the entrance). */
export function Reveal({ children, delay = 0, y = 24, as = 'div', className, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] }} {...rest}>
      {children}
    </Tag>
  );
}

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
export const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } } };

/** Counts up to `value` the first time it scrolls into view, and re-animates smoothly when the value changes. */
export function AnimatedNumber({ value = 0, suffix = '', duration = 1.1, immediate = false }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  const inView = immediate || seen;
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) { setShown(value); prev.current = value; return undefined; }
    const c = animate(prev.current, value, { duration, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [inView, value, duration, reduce]);

  return <span ref={ref}>{shown.toLocaleString()}{suffix}</span>;
}

/* ---------- avatars & logos ---------- */
export const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

/** Image that fades in once loaded and falls back to `fallback` if it is missing or broken. */
export function SmartImage({ src, alt = '', fallback = null, className, ...rest }) {
  const [state, setState] = useState(src ? 'loading' : 'error');
  useEffect(() => setState(src ? 'loading' : 'error'), [src]);
  if (state === 'error') return fallback;
  return (
    <img src={assetUrl(src)} alt={alt} loading="lazy" decoding="async" className={className}
      style={{ opacity: state === 'ready' ? 1 : 0, transition: 'opacity .4s ease' }}
      onLoad={() => setState('ready')} onError={() => setState('error')} {...rest} />
  );
}

/** Round person photo with the original placeholder icon. */
export function Avatar({ src, name, className = '' }) {
  return (
    <div className={className}>
      <SmartImage src={src} alt={name || ''} fallback={<PersonIcon />} />
    </div>
  );
}

/** Logo / emblem. Without an uploaded logo it shows a monogram in the site's plum gradient. */
export function LogoBadge({ src, name, size = 56, className = '' }) {
  const mono = <span className="logo-mono" style={{ fontSize: size * 0.36 }}>{initials(name)}</span>;
  return (
    <span className={`logo-badge ${className}`} style={{ width: size, height: size }} aria-hidden={!src}>
      <SmartImage src={src} alt={src ? `${name} logo` : ''} fallback={mono} />
    </span>
  );
}

/* ---------- page furniture ---------- */
export function PageBanner({ title, subtitle, crumb }) {
  return (
    <div className="page-banner">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </motion.div>
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <p className="loading-note" role="status"><span className="spinner" aria-hidden="true" /> {label}</p>;
}

export function ErrorNote({ error, retry }) {
  return (
    <div className="loading-note" role="alert">
      {error?.message || 'Something went wrong.'}
      {retry && <div><button type="button" className="ghost-btn" onClick={retry}>Try again</button></div>}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="ghost-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="ghost-btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}

export const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
export const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
export const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
);
