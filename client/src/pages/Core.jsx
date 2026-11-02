import { motion } from 'framer-motion';
import { useApi, useTitle } from '../hooks/index.js';
import { Avatar, ErrorNote, Loading, PageBanner, PersonIcon, SmartImage, rise, stagger } from '../components/ui/index.jsx';

function Card({ m, size }) {
  const featured = size === 'featured';
  return (
    <motion.div variants={rise} className={`pyramid-card${featured ? ' featured' : ''}`}>
      <div className="pyramid-img-wrap">
        <SmartImage src={m.photo} alt={m.name} fallback={<div className="pyramid-img-fallback" style={{ display: 'flex' }}><PersonIcon /></div>} />
      </div>
      {featured && <span className="pyramid-badge">{m.position}</span>}
      <h3>{m.name}</h3>
      {!featured && <p className="pyramid-role">{m.position}</p>}
    </motion.div>
  );
}

export default function Core() {
  useTitle('Core Committee');
  const { data, isLoading, error, refetch } = useApi('/core');
  const row = (list, size) => list.length > 0 && (
    <motion.div className="pyramid-row" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      {list.map((m) => <Card key={m.id} m={m} size={size} />)}
    </motion.div>
  );
  return (
    <>
      <PageBanner title="Core Committee" subtitle="The leadership hierarchy of Gazva Students Union" />
      <section className="section section-alt" id="core">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Leadership</p>
            <h2 className="section-title">Core Committee</h2>
            <div className="section-divider" />
          </div>
          {isLoading && <Loading label="Loading core committee…" />}
          {error && <ErrorNote error={error} retry={refetch} />}
          {data && !data.length && <p className="loading-note">Core committee members will appear here once added.</p>}
          {data && data.length > 0 && (
            <div id="core-committee-rows">
              {row(data.slice(0, 1), 'featured')}
              {row(data.slice(1, 4))}
              {row(data.slice(4), 'sm')}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
