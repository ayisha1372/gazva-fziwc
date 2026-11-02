import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi, useTitle } from '../hooks/index.js';
import { ArrowLeft, ErrorNote, Loading, SmartImage } from '../components/ui/index.jsx';
import ArticleCard from '../components/ArticleCard.jsx';
import { renderMarkdown } from '../lib/markdown.js';
import { fmtLongDate } from '../lib/format.js';
import '../styles/events.css';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: a, isLoading, error } = useApi(`/articles/${slug}`);
  useTitle(a?.title);
  const html = useMemo(() => renderMarkdown(a?.content || ''), [a?.content]);

  if (isLoading) return <div className="detail-page"><Loading /></div>;
  if (error) return <div className="detail-page"><ErrorNote error={error.status === 404 ? { message: "We couldn't find that article." } : error} /><p style={{ textAlign: 'center' }}><Link to="/blog" className="wing-back"><ArrowLeft /> All articles</Link></p></div>;

  return (
    <motion.article className="detail-page narrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Link to="/blog" className="wing-back"><ArrowLeft /> All articles</Link>
      {a.category && <span className="lb-badge" style={{ marginTop: '1rem' }}>{a.category.name}</span>}
      <h1 className="lb-title article-title">{a.title}</h1>
      <p className="article-meta">{a.author || 'Gazva'} · {fmtLongDate(a.publishedAt)}</p>
      {a.coverImage && <div className="article-cover"><SmartImage src={a.coverImage} alt="" fallback={null} /></div>}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      {a.tags?.length > 0 && <p className="article-tags">{a.tags.map((t) => <span key={t}>#{t}</span>)}</p>}
      {a.more?.length > 0 && (
        <section className="org-section"><p className="wing-section-label">More stories</p>
          <div className="org-cards">{a.more.map((m) => <ArticleCard key={m.id} article={m} />)}</div></section>
      )}
    </motion.article>
  );
}
