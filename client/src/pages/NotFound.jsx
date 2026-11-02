import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/index.js';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <section className="section" style={{ textAlign: 'center', minHeight: '55vh' }}>
      <p className="section-tag">404</p>
      <h1 className="section-title">We can't find that page</h1>
      <div className="section-divider" />
      <p className="section-desc">The link may be old, or the page may have moved.</p>
      <p style={{ marginTop: '2rem' }}><Link to="/" className="btn-solid">Back to home</Link></p>
    </section>
  );
}
