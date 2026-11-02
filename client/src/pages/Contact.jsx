import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useSettings, useTitle } from '../hooks/index.js';
import { Reveal } from '../components/ui/index.jsx';
import '../styles/contact.css';

const svg = (children) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const SUBJECTS = [['general', 'General Enquiry'], ['events', 'Events & Programmes'], ['wings', 'Wings & Clubs'], ['media', 'Media & Press'], ['collaboration', 'Collaboration'], ['feedback', 'Feedback'], ['other', 'Other']];
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', subject: '', message: '', website: '' };

function ContactForm() {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [serverError, setServerError] = useState('');
  const set = (k) => (e) => { setV((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!v.firstName.trim()) err.firstName = 'Please enter your first name';
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) err.email = 'Please enter a valid email address';
    if (v.message.trim().length < 5) err.message = 'Please write a short message';
    setErrors(err);
    if (Object.keys(err).length) return;
    setState('sending'); setServerError('');
    try {
      await api.post('/contact', v);
      setState('sent'); setV(EMPTY);
    } catch (ex) {
      setState('idle'); setServerError(ex.message);
    }
  }

  const bad = (k) => (errors[k] ? { borderColor: '#c0392b' } : undefined);
  return (
    <AnimatePresence mode="wait">
      {state === 'sent' ? (
        <motion.div key="ok" className="form-success show" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="success-icon">{svg(<polyline points="20 6 9 17 4 12" />)}</div>
          <p className="success-title">Message Sent!</p>
          <p className="success-text">Jazakallahu Khairan for reaching out.<br />We'll get back to you within 24 hours, in sha Allah.</p>
          <button type="button" className="ghost-btn" style={{ marginTop: '1.5rem' }} onClick={() => setState('idle')}>Send Another Message</button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 8 }}>
          <p className="form-title">Send a Message</p>
          <p className="form-sub">Fill in the form below and we'll get back to you within 24 hours.</p>
          <form onSubmit={submit} noValidate>
            <div className="form-row">
              <div className="form-group"><label htmlFor="firstName">First Name</label><input id="firstName" style={bad('firstName')} value={v.firstName} onChange={set('firstName')} placeholder="Your first name" autoComplete="given-name" maxLength={80} />{errors.firstName && <small className="field-error">{errors.firstName}</small>}</div>
              <div className="form-group"><label htmlFor="lastName">Last Name</label><input id="lastName" value={v.lastName} onChange={set('lastName')} placeholder="Your last name" autoComplete="family-name" maxLength={80} /></div>
            </div>
            <div className="form-group"><label htmlFor="email">Email Address</label><input id="email" type="email" style={bad('email')} value={v.email} onChange={set('email')} placeholder="your@email.com" autoComplete="email" />{errors.email && <small className="field-error">{errors.email}</small>}</div>
            <div className="form-group"><label htmlFor="phone">Phone Number</label><input id="phone" type="tel" value={v.phone} onChange={set('phone')} placeholder="+91 00000 00000" autoComplete="tel" maxLength={30} /></div>
            <div className="form-group"><label htmlFor="subject">Subject</label>
              <select id="subject" value={v.subject} onChange={set('subject')}><option value="">Select a subject</option>{SUBJECTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            <div className="form-group"><label htmlFor="message">Message</label><textarea id="message" style={bad('message')} value={v.message} onChange={set('message')} placeholder="Write your message here…" maxLength={4000} />{errors.message && <small className="field-error">{errors.message}</small>}</div>
            {/* honeypot: hidden from people, irresistible to bots */}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={v.website} onChange={set('website')} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            {serverError && <p className="field-error" role="alert">{serverError}</p>}
            <button type="submit" className="submit-btn" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send Message'}
              {svg(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>)}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Card = ({ icon, title, children }) => (
  <div className="contact-card"><div className="contact-card-icon">{icon}</div><div className="contact-card-text"><h4>{title}</h4>{children}</div></div>
);

export default function Contact() {
  useTitle('Contact');
  const { data: s } = useSettings();
  const c = s?.contact || {};
  const so = s?.social || {};
  const socials = [
    ['Instagram', so.instagram, svg(<><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>)],
    ['Facebook', so.facebook, svg(<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />)],
    ['YouTube', so.youtube, svg(<><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 0 0 1.46 6.42C1 8.15 1 12 1 12s0 3.85.46 5.58a2.78 2.78 0 0 0 1.94 1.95C5.12 20 12 20 12 20s6.88 0 8.6-.47a2.78 2.78 0 0 0 1.94-1.95C23 15.85 23 12 23 12s0-3.85-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></>)],
    ['WhatsApp', so.whatsapp, svg(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />)],
  ].filter(([, u]) => u);

  return (
    <div className="contact-page">
      <div className="page-wrap">
        <div className="page-hero">
          <div className="breadcrumb"><Link to="/">Home</Link><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg><span>Contact</span></div>
          <span className="section-label">Get in Touch</span>
          <h1 className="section-title" style={{ marginTop: '0.75rem' }}>Contact Us</h1>
          <div className="divider divider-center" />
          <p className="section-sub" style={{ margin: '0 auto' }}>We'd love to hear from you. Reach out for queries, collaborations, or just to say salaam.</p>
        </div>

        <section className="contact-section">
          <div className="contact-grid">
            <Reveal className="contact-info">
              <div>
                <h2 className="contact-info-title">Let's Connect</h2>
                <p className="contact-info-sub">Whether you're a student, alumni, or well-wisher — our doors are always open. Find us on campus or drop us a message anytime.</p>
              </div>
              {c.address && <Card title="Visit Us" icon={svg(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>)}><p style={{ whiteSpace: 'pre-line' }}>{c.address}</p></Card>}
              {c.emails?.length > 0 && <Card title="Email Us" icon={svg(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>)}>
                {c.emails.map((m, i) => <div key={m}><a href={`mailto:${m}`} style={i ? { fontSize: '0.85rem', color: 'var(--text-light)' } : undefined}>{m}</a></div>)}</Card>}
              {c.phone && <Card title="Call Us" icon={svg(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />)}><a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></Card>}
              {(c.hoursWeekday || c.hoursOther) && <Card title="Office Hours" icon={svg(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>)}><p>{c.hoursWeekday}<br /><span style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>{c.hoursOther}</span></p></Card>}
              {socials.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-500)', marginBottom: '0.75rem' }}>Follow Us</p>
                  <div className="contact-social-row">{socials.map(([l, u, i]) => <a key={l} href={u} className="contact-social-btn" target="_blank" rel="noopener noreferrer">{i}{l}</a>)}</div>
                </div>
              )}
            </Reveal>
            <Reveal delay={0.1} className="contact-form-wrap"><ContactForm /></Reveal>
          </div>
        </section>

        <section className="visit-section">
          <div className="visit-inner">
            <Reveal className="section-head-center" style={{ marginBottom: '2.5rem' }}>
              <span className="section-label">Find Us</span>
              <h2 className="section-title">Visit Our Campus</h2>
              <div className="divider divider-center" />
            </Reveal>
            <div className="visit-grid">
              <div className="map-embed">
                <iframe src="https://www.google.com/maps?q=Fathima+Zahra+Islamic+Women's+College&output=embed" width="100%" height="450" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Fathima Zahra Islamic Women's College location" />
              </div>
              <div className="visit-info">
                <div>
                  <span className="section-label">How to Reach Us</span>
                  <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', color: 'var(--blue-800)', marginTop: '0.6rem', marginBottom: '0.5rem' }}>Getting Here</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: 1.8, marginBottom: '1.5rem' }}>We are located in the heart of Tirur, easily accessible by road, rail, and bus.</p>
                </div>
                {[
                  ['Address', <>Fathima Zahra Islamic Women's College<br />Tirur, Malappuram District<br />Kerala — 676 101</>, <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>],
                  ['By Road', 'Accessible via NH-66. Tirur town is well-connected by KSRTC and private buses from Calicut, Malappuram, and Thrissur.', <><rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>],
                  ['Nearest Railway Station', 'Tirur Railway Station — approx. 2 km from campus. Auto-rickshaws and cabs readily available.', <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></>],
                  ['Nearest Airport', 'Calicut International Airport (CCJ) — approx. 35 km. Cab services available to campus.', <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />],
                ].map(([t, body, icon]) => (
                  <Reveal key={t} className="visit-detail"><div className="visit-detail-icon">{svg(icon)}</div><div><h4>{t}</h4><p>{body}</p></div></Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
