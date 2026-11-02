import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api.js';
import { useDebounced } from '../hooks/index.js';
import { assignRanks } from '../lib/ranking.js';
import { Confirm, Field, Modal, useToast } from './ui.jsx';

const emptyValue = (f) => {
  if (f.default !== undefined) return typeof f.default === 'function' ? f.default() : f.default;
  switch (f.type) {
    case 'members': case 'strings': case 'tags': return [];
    case 'checkbox': return false;
    case 'number': return 0;
    default: return '';
  }
};

const blankFor = (fields) => Object.fromEntries(fields.map((f) => [f.key, emptyValue(f)]));

function toForm(fields, rec) {
  const out = {};
  fields.forEach((f) => {
    let v = rec[f.key];
    if (f.type === 'relation') v = v?.id || v || '';
    else if (f.type === 'members') v = (v || []).map((m) => ({ id: m.id, name: m.name || '', position: m.position || '', photo: m.photo || '' }));
    else if (f.type === 'strings' || f.type === 'tags') v = [...(v || [])];
    else if (v === undefined || v === null) v = emptyValue(f);
    out[f.key] = v;
  });
  return out;
}

function toPayload(fields, form) {
  const out = {};
  fields.forEach((f) => {
    if (f.showIf && !f.showIf(form) && f.type !== 'checkbox') { if (f.key in form) out[f.key] = form[f.key]; return; }
    let v = form[f.key];
    if (f.type === 'number') v = v === '' || v == null ? 0 : Number(v);
    else if (f.type === 'members') v = v.map((m, i) => ({ name: m.name.trim(), position: m.position.trim(), photo: m.photo || '', order: i + 1 }));
    else if (f.type === 'strings') v = v.map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'tags') v = v.map((s) => s.trim()).filter(Boolean);
    else if (typeof v === 'string') v = v.trim();
    out[f.key] = v;
  });
  return out;
}

/** Maps API validation details onto form fields: "members.2.position" -> field "members". */
function fieldErrors(err) {
  const map = {};
  (err?.details || []).forEach((d) => { const k = String(d.field).split('.')[0]; map[k] = map[k] ? `${map[k]}; ${d.message}` : d.message; });
  return map;
}

export default function ResourceManager({
  def, extraColumns = [], headerRight = null, pageSize = 20, clientRank = false, hideCreate = false,
}) {
  const { resource, title, subtitle, singular, fields, columns, searchable = true, filters = [] } = def;
  const api = useMemo(() => adminApi(resource), [resource]);
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const q = useDebounced(search, 300);
  const [editor, setEditor] = useState(null); // { id?, form }
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const params = { page: clientRank ? 1 : page, limit: clientRank ? 500 : pageSize, q, ...filterVals };
  const { data, isLoading, error } = useQuery({ queryKey: ['adm', resource, params], queryFn: () => api.list(params), placeholderData: keepPreviousData });

  const rows = useMemo(() => (data ? (clientRank ? assignRanks(data.items) : data.items) : []), [data, clientRank]);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['adm', resource] });

  const save = useMutation({
    mutationFn: ({ id, form }) => (id ? api.update(id, toPayload(fields, form)) : api.create(toPayload(fields, form))),
    onSuccess: (_d, v) => { toast.success(v.id ? `${singular} saved` : `${singular} created`); setEditor(null); invalidate(); qc.invalidateQueries({ queryKey: ['adm-rel'] }); },
    onError: (e) => { setErrors(fieldErrors(e)); setFormError(e.message); },
  });
  const remove = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => { toast.success(`${singular} deleted`); setDeleting(null); invalidate(); qc.invalidateQueries({ queryKey: ['adm-rel'] }); },
    onError: (e) => { toast.error(e.message); setDeleting(null); },
  });

  const openNew = () => { setErrors({}); setFormError(''); setEditor({ form: def.blank ? def.blank() : blankFor(fields) }); };
  const openEdit = (rec) => { setErrors({}); setFormError(''); setEditor({ id: rec.id, form: toForm(fields, rec) }); };
  const setField = (k, v) => setEditor((e) => ({ ...e, form: { ...e.form, [k]: v } }));

  const cols = [...columns, ...extraColumns];
  return (
    <section className="adm-page">
      <header className="adm-head">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <div className="adm-head-actions">{headerRight}{!hideCreate && <button type="button" className="adm-btn primary" onClick={openNew}>+ Add {singular.toLowerCase()}</button>}</div>
      </header>

      {(searchable || filters.length > 0) && (
        <div className="adm-toolbar">
          {searchable && <input type="search" className="adm-search" placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search" />}
          {filters.map((f) => (
            <select key={f.key} value={filterVals[f.key] || ''} onChange={(e) => { setFilterVals((v) => ({ ...v, [f.key]: e.target.value })); setPage(1); }} aria-label={f.label}>
              <option value="">{f.label}</option>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {data && <span className="adm-count">{data.total} total</span>}
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr>{cols.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}<th className="actions">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={cols.length + 1} className="adm-empty">Loading…</td></tr>}
            {error && <tr><td colSpan={cols.length + 1} className="adm-empty err">{error.message}</td></tr>}
            {data && rows.length === 0 && <tr><td colSpan={cols.length + 1} className="adm-empty">{q ? 'Nothing matches that search.' : `No ${title.toLowerCase()} yet. Use “Add ${singular.toLowerCase()}” to create the first one.`}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                {cols.map((c) => <td key={c.label} className={c.className}>{c.render ? c.render(r, { invalidate }) : r[c.key]}</td>)}
                <td className="actions">
                  <button type="button" className="adm-btn link" onClick={() => openEdit(r)}>Edit</button>
                  {!def.noDelete && <button type="button" className="adm-btn link danger" onClick={() => setDeleting(r)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!clientRank && data && data.pages > 1 && (
        <div className="adm-pager">
          <button type="button" className="adm-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button type="button" className="adm-btn ghost sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {editor && (
        <Modal wide title={editor.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`} onClose={() => setEditor(null)}
          footer={<>
            <button type="button" className="adm-btn ghost" onClick={() => setEditor(null)}>Cancel</button>
            <button type="submit" form="adm-form" className="adm-btn primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
          </>}>
          <form id="adm-form" className="adm-form" onSubmit={(e) => { e.preventDefault(); setErrors({}); setFormError(''); save.mutate({ id: editor.id, form: editor.form }); }}>
            {formError && <div className="adm-banner" role="alert">{formError}</div>}
            {fields.map((f) => <Field key={f.key} def={f} form={editor.form} value={editor.form[f.key]} onChange={(v) => setField(f.key, v)} error={errors[f.key]} />)}
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm title={`Delete ${singular.toLowerCase()}?`} busy={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting.id)}>
          <p>“{deleting[def.nameKey || 'name'] || deleting.title || 'This item'}” will be permanently removed. This cannot be undone.</p>
        </Confirm>
      )}
    </section>
  );
}
