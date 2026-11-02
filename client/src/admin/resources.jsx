import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api.js';
import { eventDateText } from '../lib/format.js';
import { Pill, Thumb, useToast } from './ui.jsx';

const DEPT_POSITIONS = ['Department Head', 'Deputy Head', 'Secretary', 'Joint Secretary', 'Treasurer', 'Media Coordinator', 'Programme Coordinator', 'Documentation Coordinator', 'Executive Member', 'Executive Member'];

const nameCol = (photoKey, round) => ({ label: 'Name', render: (r) => <span className="adm-namecell"><Thumb src={r[photoKey]} round={round} name={r.name || r.title} /><b>{r.name || r.title}</b></span> });
const orderField = { key: 'order', label: 'Display order', type: 'number', help: 'Lower numbers appear first.' };
const publishedField = { key: 'published', label: 'Visible', type: 'checkbox', checkLabel: 'Show on the website', default: true };

/* Inline points editor used on the Rankings screen */
export function PointsCell({ row, resource }) {
  const [val, setVal] = useState(String(row.points));
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const api = adminApi(resource);
  const run = async (body) => {
    setBusy(true);
    try { const r = await api.points(row.id, body); setVal(String(r.points)); qc.invalidateQueries({ queryKey: ['adm', resource] }); toast.success(`Points updated to ${r.points}`); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const commit = () => { const n = Number(val); if (Number.isInteger(n) && n >= 0 && n !== row.points) run({ set: n }); else setVal(String(row.points)); };
  return (
    <span className="adm-points">
      <input type="number" min="0" value={val} disabled={busy} aria-label={`Points for ${row.name}`}
        onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      <button type="button" className="adm-btn ghost sm" disabled={busy} onClick={() => run({ add: 5 })}>+5</button>
      <button type="button" className="adm-btn ghost sm" disabled={busy} onClick={() => run({ add: 10 })}>+10</button>
      <button type="button" className="adm-btn ghost sm" disabled={busy} onClick={() => run({ add: -5 })}>−5</button>
    </span>
  );
}

const rankCol = { label: 'Rank', className: 'narrow', render: (r) => <span className="adm-rank" title={r.position}>{r.rank}{r.tied ? <sup>T</sup> : null}</span> };
const pointsCol = (resource) => ({ label: 'Points', render: (r) => <PointsCell key={`${r.id}-${r.points}`} row={r} resource={resource} /> });

export const defs = {
  students: {
    resource: 'students', title: 'Students', singular: 'Student', subtitle: 'Student ranking is public. Ranks are worked out automatically from points.',
    filters: [],
    fields: [
      { key: 'name', label: 'Full name', required: true, max: 120 },
      { key: 'className', label: 'Class', max: 60, help: 'e.g. Year 2' },
      { key: 'department', label: 'Department', max: 120 },
      { key: 'term', label: 'Academic year', max: 20, help: 'e.g. 2025-26' },
      { key: 'points', label: 'Points', type: 'number' },
      { key: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Include in the public ranking', default: true },
      { key: 'achievements', label: 'Achievements', type: 'textarea', rows: 2, max: 400, wide: true },
      { key: 'photo', label: 'Photo', type: 'image', wide: true },
    ],
    columns: [rankCol, { label: 'Student', render: (r) => <span className="adm-namecell"><Thumb src={r.photo} round name={r.name} /><span><b>{r.name}</b><small>{r.achievements}</small></span></span> }, { key: 'className', label: 'Class' }],
    rankings: [pointsCol('students')],
  },
  wings: {
    resource: 'wings', title: 'Wings', singular: 'Wing', subtitle: 'The seven wings, their leadership and logos.',
    fields: [
      { key: 'name', label: 'Wing name', required: true, max: 120 }, orderField,
      { key: 'purpose', label: 'Description / purpose', type: 'textarea', max: 2000, wide: true },
      { key: 'logo', label: 'Logo', type: 'image', wide: true },
      { key: 'showLogoSlot', label: 'Logo slot', type: 'checkbox', checkLabel: 'Show a logo slot on the website even when no logo is uploaded', wide: true, help: 'Off for most wings, so no empty placeholder appears. A wing that has a logo uploaded always shows it.' },
      { key: 'members', label: 'Leadership', type: 'members', suggestions: ['Chairperson', 'Convener', 'Convener'], wide: true },
      { key: 'activities', label: 'Activities', type: 'strings', addLabel: 'Add activity', wide: true },
      { key: 'points', label: 'Points', type: 'number', help: 'Used for the protected Wing ranking.' },
      publishedField,
    ],
    columns: [{ label: 'Wing', render: (r) => <span className="adm-namecell"><Thumb src={r.logo} name={r.name} /><b>{r.name}</b></span> }, { label: 'Leaders', render: (r) => `${r.members.filter((m) => m.name).length}/${r.members.length} filled` }, { label: 'Order', key: 'order' }, { label: 'Visible', render: (r) => <Pill tone={r.published ? 'green' : 'grey'}>{r.published ? 'Visible' : 'Hidden'}</Pill> }],
    rankings: [pointsCol('wings')],
  },
  clubs: {
    resource: 'clubs', title: 'Clubs', singular: 'Club', subtitle: 'Clubs are the sub-units that sit under a wing.',
    fields: [
      { key: 'name', label: 'Club name', required: true, max: 120 },
      { key: 'wing', label: 'Belongs to wing', type: 'relation', resource: 'wings' }, orderField,
      { key: 'description', label: 'Description', type: 'textarea', rows: 2, max: 1000, wide: true },
      { key: 'logo', label: 'Logo', type: 'image', wide: true },
      { key: 'members', label: 'Leadership', type: 'members', suggestions: ['General Secretary', 'Joint Secretary'], wide: true },
      { key: 'points', label: 'Points', type: 'number', help: 'Used for the protected Club ranking.' },
      publishedField,
    ],
    columns: [{ label: 'Club', render: (r) => <span className="adm-namecell"><Thumb src={r.logo} name={r.name} /><b>{r.name}</b></span> }, { label: 'Wing', render: (r) => r.wing?.name || '—' }, { label: 'Visible', render: (r) => <Pill tone={r.published ? 'green' : 'grey'}>{r.published ? 'Visible' : 'Hidden'}</Pill> }],
    rankings: [pointsCol('clubs')],
    filters: [],
  },
  'class-unions': {
    resource: 'class-unions', title: 'Class Unions', singular: 'Class union', subtitle: 'The eight class unions and their emblems.', noDelete: false,
    fields: [
      { key: 'name', label: 'Class union name', required: true, max: 120 }, orderField,
      { key: 'description', label: 'Description', type: 'textarea', rows: 2, max: 600, wide: true },
      { key: 'logo', label: 'Logo / emblem', type: 'image', wide: true },
      { key: 'points', label: 'Points', type: 'number' },
    ],
    columns: [{ label: 'Class union', render: (r) => <span className="adm-namecell"><Thumb src={r.logo} name={r.name} /><b>{r.name}</b></span> }],
    rankings: [pointsCol('class-unions')],
  },
  departments: {
    resource: 'departments', title: 'Departments', singular: 'Department', subtitle: 'Each department has a logo, a description and up to 10 members with editable positions.',
    fields: [
      { key: 'name', label: 'Department name', required: true, max: 120 }, orderField,
      { key: 'tagline', label: 'Short tagline', max: 240, wide: true },
      { key: 'description', label: 'Description / purpose', type: 'textarea', max: 2000, wide: true },
      { key: 'logo', label: 'Department logo', type: 'image', wide: true },
      { key: 'members', label: 'Members', type: 'members', max: 10, suggestions: DEPT_POSITIONS, wide: true },
      { key: 'activities', label: 'Activities', type: 'strings', addLabel: 'Add activity', wide: true },
      publishedField,
    ],
    columns: [{ label: 'Department', render: (r) => <span className="adm-namecell"><Thumb src={r.logo} name={r.name} /><b>{r.name}</b></span> }, { label: 'Members', render: (r) => `${r.members.filter((m) => m.name).length}/${r.members.length} filled` }, { label: 'Visible', render: (r) => <Pill tone={r.published ? 'green' : 'grey'}>{r.published ? 'Visible' : 'Hidden'}</Pill> }],
    blank: () => ({ name: '', order: 0, tagline: '', description: '', logo: '', members: DEPT_POSITIONS.map((position) => ({ name: '', position, photo: '' })), activities: [], published: true }),
  },
  events: {
    resource: 'events', title: 'Events', singular: 'Event', nameKey: 'title', subtitle: 'Posters, dates, venues and status. Status can follow the date automatically.',
    fields: [
      { key: 'title', label: 'Title', required: true, max: 160, wide: true },
      { key: 'category', label: 'Category', type: 'relation', resource: 'categories', params: { type: 'event' } },
      { key: 'date', label: 'Start date', type: 'date', required: true },
      { key: 'endDate', label: 'End date (optional)', type: 'date' },
      { key: 'startTime', label: 'Start time', type: 'time' },
      { key: 'endTime', label: 'End time', type: 'time' },
      { key: 'venue', label: 'Venue', max: 160, wide: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 5, max: 5000, wide: true },
      { key: 'poster', label: 'Poster / image', type: 'image', wide: true },
      { key: 'statusMode', label: 'Status', type: 'select', options: [['auto', 'Automatic — follows the date and time'], ['manual', 'Set manually']] },
      { key: 'status', label: 'Manual status', type: 'select', options: [['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['completed', 'Completed']], showIf: (f) => f.statusMode === 'manual' },
      { key: 'organizer', label: 'Organised by', max: 160 },
      { key: 'wing', label: 'Related wing', type: 'relation', resource: 'wings' },
      { key: 'department', label: 'Related department', type: 'relation', resource: 'departments' },
      { key: 'participants', label: 'Participants', max: 80, help: 'e.g. 60+ participants' },
      { key: 'dateLabel', label: 'Date text override', max: 60, help: 'Optional. Shown instead of the date, e.g. “March 2026”.' },
      { key: 'featured', label: 'Featured', type: 'checkbox', checkLabel: 'Feature this event at the top of the Events page', default: false },
      publishedField,
    ],
    columns: [
      { label: 'Event', render: (r) => <span className="adm-namecell"><Thumb src={r.poster} name={r.title} /><span><b>{r.title}</b><small>{r.venue}</small></span></span> },
      { label: 'Date', render: (r) => eventDateText(r) },
      { label: 'Category', render: (r) => r.category?.name || '—' },
      { label: 'Status', render: (r) => <Pill tone={{ upcoming: 'rose', ongoing: 'green', completed: 'grey' }[r.effectiveStatus]}>{r.effectiveStatus}{r.statusMode === 'manual' ? ' · manual' : ''}</Pill> },
      { label: 'Visible', render: (r) => <Pill tone={r.published ? 'green' : 'grey'}>{r.published ? 'Visible' : 'Hidden'}</Pill> },
    ],
    filters: [],
    blank: () => ({ title: '', category: '', date: '', endDate: '', startTime: '', endTime: '', venue: '', description: '', poster: '', statusMode: 'auto', status: 'upcoming', organizer: '', wing: '', department: '', participants: '', dateLabel: '', featured: false, published: true }),
  },
  categories: {
    resource: 'categories', title: 'Categories', singular: 'Category', subtitle: 'Used to group and filter events.',
    fields: [
      { key: 'name', label: 'Name', required: true, max: 60 }, orderField,
      { key: 'description', label: 'Description', max: 300, wide: true },
    ],
    columns: [{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }],
  },
  core: {
    resource: 'core', title: 'Core Committee', singular: 'Member',
    subtitle: 'The first person is shown as the featured President card, the next three on the second row, the rest below.',
    fields: [{ key: 'name', label: 'Name', required: true, max: 120 }, { key: 'position', label: 'Position', max: 80 }, orderField, { key: 'photo', label: 'Photo', type: 'image', wide: true }],
    columns: [{ label: 'Order', key: 'order', className: 'narrow' }, nameCol('photo', true), { key: 'position', label: 'Position' }],
  },
  advisors: {
    resource: 'advisors', title: 'Advisory Board', singular: 'Advisor', subtitle: 'Faculty shown on the home page.',
    fields: [{ key: 'name', label: 'Name', required: true, max: 120 }, { key: 'role', label: 'Role', max: 80 }, { key: 'department', label: 'Department', max: 120 }, orderField, { key: 'photo', label: 'Photo', type: 'image', wide: true }],
    columns: [{ label: 'Order', key: 'order', className: 'narrow' }, nameCol('photo', true), { key: 'role', label: 'Role' }, { key: 'department', label: 'Department' }],
  },
  testimonials: {
    resource: 'testimonials', title: 'Testimonials', singular: 'Testimonial', nameKey: 'author', subtitle: '“What Students Say” slider on the home page.',
    fields: [{ key: 'quote', label: 'Quote', type: 'textarea', rows: 3, max: 500, required: true, wide: true }, { key: 'author', label: 'Name, role', max: 120, help: 'Write it as “Name, Role” — e.g. Aisha K, Fiqh Department. The part before the first comma is the name; the rest is the role.' }, { key: 'rating', label: 'Stars (1–5)', type: 'number', min: 1, default: 5 }, orderField, { key: 'photo', label: 'Photo (shown in the round avatar)', type: 'image', wide: true }],
    columns: [{ label: 'Order', key: 'order', className: 'narrow' }, { label: 'Student', render: (r) => <span className="adm-namecell"><Thumb src={r.photo} round name={r.author} /><b>{(r.author || '').split(',')[0]}</b></span> }, { label: 'Quote', render: (r) => <span className="adm-clip">{r.quote}</span> }],
  },
};
