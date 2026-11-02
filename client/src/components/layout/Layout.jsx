import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../hooks/index.js';


// ─────────────────────────────────────────────────────────────────────────────
//  BLOG BUTTON
//  The blog lives on a separate website. The "Blog" button in the navbar and footer is ALWAYS shown.
//  It opens, in a new tab:
//     1. the address saved in  Admin → Settings → "Blog website link"   (takes priority), otherwise
//     2. the address below.
//  👉 Replace the address below with your real blog (WordPress, Blogger, Medium, Substack …).
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_BLOG_URL = 'https://gazva-insight.vercel.app/';

const LINKS = [
  ['/', 'Home', true], ['/core', 'Core'], ['/wings', 'Wings'], ['/departments', 'Departments'],
  ['/events', 'Events'], ['/rankings', 'Rankings'], ['/contact', 'Contact'],
];

function Navbar() {
  const { data: settings } = useSettings();
  const blogUrl = settings?.blogUrl || DEFAULT_BLOG_URL;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <motion.nav className={`navbar${scrolled ? ' scrolled' : ''}`} initial={{ y: -72 }} animate={{ y: 0 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }} aria-label="Main">
      <Link to="/" className="nav-brand" aria-label="Gazva home">
        <div className="nav-logo"><img src="/gazvalogo.png" alt="Gazva logo" width="46" height="46" /></div>
        <span className="nav-name">Gazva</span>
      </Link>
      <ul className={`nav-links${open ? ' open' : ''}`}>
        {LINKS.map(([to, label, end]) => (
          <li key={to}><NavLink to={to} end={end}>{label}</NavLink></li>
        ))}
        <li><a href={blogUrl} className="nav-blog-btn" target="_blank" rel="noopener noreferrer" aria-label="Blog (opens our blog website in a new tab)" style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2zM22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z" /></svg>
          Blog<svg className="ext" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg></a></li>
        {isAdmin && <li><Link to="/admin">Dashboard</Link></li>}
        {user && <li><button type="button" className="nav-linkbtn" onClick={logout}>Sign out</button></li>}
      </ul>
      <button type="button" className={`nav-toggle${open ? ' active' : ''}`} aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
    </motion.nav>
  );
}

const Icon = ({ d, d2 }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d={d} />{d2 && <path d={d2} />}</svg>
);

function Footer() {
  const { data: s } = useSettings();
  const f = s?.footer || {};
  const so = s?.social || {};
  const social = [
    ['Instagram', so.instagram, <svg key="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>],
    ['Facebook', so.facebook, <svg key="f" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>],
    ['WhatsApp', so.whatsapp, <svg key="w" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>],
    ['YouTube', so.youtube, <svg key="y" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95 29 29 0 00.46-5.25 29 29 0 00-.46-5.48z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>],
  ].filter(([, url]) => url);

  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-wrap">
            <div className="footer-logo-img"><img src="/gazvalogo.png" alt="Gazva" /></div>
            <div><div className="footer-union-name">Gazva</div></div>
          </div>
          <div className="footer-sub">{f.sub}</div>
          <p className="footer-desc">{f.description}</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            {LINKS.map(([to, label, end]) => <li key={to}><NavLink to={to} end={end}>{label === 'Core' ? 'Core Committee' : label}</NavLink></li>)}
            <li><a href={s?.blogUrl || DEFAULT_BLOG_URL} target="_blank" rel="noopener noreferrer">Blog ↗</a></li>
          </ul>
        </div>
        <div className="footer-col" />
        <div className="footer-col footer-contact">
          <h4>Contact Us</h4>
          <p>
            <Icon d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" d2="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            <span style={{ whiteSpace: 'pre-line' }}>{f.address}</span>
          </p>
          {f.email && (
            <p>
              <Icon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <a href={`mailto:${f.email}`}>{f.email}</a>
            </p>
          )}
          <div className="social-icons">
            {social.map(([label, url, svg]) => (
              <a key={label} href={url} className="social-icon" aria-label={label} target="_blank" rel="noopener noreferrer">{svg}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Gazva. All rights reserved.</span>
        <span>Made with <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Gazva Media</strong></span>
      </div>
    </footer>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

export default function Layout() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname.split('/')[1]]);
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollProgress />
      <Navbar />
      <main id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname.split('/').slice(0, 2).join('/')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}