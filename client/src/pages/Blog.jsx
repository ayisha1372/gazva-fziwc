import { useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useApi, useDebounced, useTitle } from '../hooks/index.js';
import { EmptyState, ErrorNote, Loading, PageBanner, Pagination, Reveal } from '../components/ui/index.jsx';
import ArticleCard from '../components/ArticleCard.jsx';
import '../styles/events.css';

export default function Blog() {
  useTitle('Blog');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 300);
  const { data: cats } = useApi('/categories', { type: 'article' });
  const { data, isLoading, error, refetch } = useApi('/articles', { category, q, page, limit: 9 }, { placeholderData: keepPreviousData });

  return (
    <>
      <PageBanner title="Blog" subtitle="News, announcements and stories from across Gazva" />
      <div className="filter-bar">
        <div className="filter-inner">
          <div className="filter-tabs">
            <button type="button" className={`filter-tab${category === 'all' ? ' active' : ''}`} onClick={() => { setCategory('all'); setPage(1); }}>All</button>
            {(cats || []).map((c) => <button type="button" key={c.id} className={`filter-tab${category === c.slug ? ' active' : ''}`} onClick={() => { setCategory(c.slug); setPage(1); }}>{c.name}</button>)}
          </div>
          <label className="filter-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search articles…" aria-label="Search articles" />
          </label>
        </div>
      </div>
      <section className="gallery-section">
        {isLoading && <Loading />}
        {error && <ErrorNote error={error} retry={refetch} />}
        {data && !data.items.length && <EmptyState title="No articles yet">New stories will appear here.</EmptyState>}
        {data?.items.length > 0 && <div className="gallery-grid">{data.items.map((a) => <Reveal key={a.id}><ArticleCard article={a} /></Reveal>)}</div>}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </section>
    </>
  );
}
