import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../hooks/index.js';
import '../../styles/footer.css';


// ─────────────────────────────────────────────────────────────────────────────
//  BLOG BUTTON
//  The blog lives on a separate website. The "Blog" button in the navbar and footer is ALWAYS shown.
//  It opens, in a new tab:
//     1. the address saved in  Admin → Settings → "Blog website link"   (takes priority), otherwise
//     2. the address below.
//  👉 Replace the address below with your real blog (WordPress, Blogger, Medium, Substack …).
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_BLOG_URL = 'https://gazva-blog.example.com';

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

const PinIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const MailIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
);

function Footer() {
  const { data: s } = useSettings();
  const f = s?.footer || {};
  const so = s?.social || {};
  const blogUrl = s?.blogUrl || DEFAULT_BLOG_URL;
  const socials = [['Instagram', so.instagram, <InstagramIcon key="i" />], ['Facebook', so.facebook, <FacebookIcon key="f" />]].filter(([, url]) => url);

  return (
    <footer className="ft">
      <div className="ft-frame">
        <div className="ft-top">
          <div className="ft-brand">
            <Link to="/" className="ft-logo" aria-label="Gazva home">
              <span className="ft-mark"><img src="/gazvalogo.png" alt="" width="56" height="56" /></span>
              <span className="ft-name">Gazva</span>
            </Link>
            <p className="ft-line1">{f.sub}</p>
            <p className="ft-line2">{f.description}</p>
          </div>

          <div className="ft-cols">
            <div className="ft-col ft-address">
              <h4>Address</h4>
              <p><PinIcon /><span style={{ whiteSpace: 'pre-line' }}>{f.address}</span></p>
              {f.email && <p><MailIcon /><a href={`mailto:${f.email}`}>{f.email}</a></p>}
            </div>
            <div className="ft-col">
              <h4>Links</h4>
              <ul>
                <li><Link to="/contact">Contact us</Link></li>
                <li><a href={blogUrl} target="_blank" rel="noopener noreferrer">Blog <span aria-hidden="true">↗</span></a></li>
              </ul>
            </div>
            <div className="ft-col">
              <h4>Follow us</h4>
              <div className="ft-social">
                {socials.map(([label, url, icon]) => (
                  <a key={label} href={url} className="ft-social-btn" target="_blank" rel="noopener noreferrer" aria-label={`Gazva on ${label}`}>{icon}<span>{label}</span></a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="ft-mega" aria-hidden="true">Gazva</div>
      </div>
      <div className="ft-bottom">
        <span>© {new Date().getFullYear()} Gazva. All rights reserved.</span>
        <span>Made with <strong>Gazva Media</strong></span>
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
