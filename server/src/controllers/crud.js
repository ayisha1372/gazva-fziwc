import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assignRanks } from '../utils/ranking.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toObj = (doc) => (doc?.toJSON ? doc.toJSON() : doc);

function clampInt(v, def, min, max) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, min), max);
}

/**
 * Generic admin CRUD. One definition per resource keeps the API uniform:
 *   GET    /           ?q=&page=&limit=&<filterField>=   -> { items, total, page, pages, limit }
 *   GET    /:id
 *   POST   /
 *   PUT    /:id        (full replace of the editable fields)
 *   DELETE /:id
 */
export function createCrud({
  Model,
  schema,
  label = 'Item',
  populate = '',
  defaultSort = { createdAt: -1 },
  searchFields = ['name'],
  filterFields = [],
  ranked = false,
  serialize = (d) => d,
  afterDelete,
}) {
  const find = (filter) => {
    let q = Model.find(filter);
    if (populate) q = q.populate(populate);
    return q;
  };

  const list = asyncHandler(async (req, res) => {
    const page = clampInt(req.query.page, 1, 1, 100000);
    const limit = clampInt(req.query.limit, 25, 1, 500);
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';

    const filter = {};
    for (const f of filterFields) {
      const v = req.query[f];
      if (typeof v !== 'string' || v === '') continue;
      if (v === 'true' || v === 'false') filter[f] = v === 'true';
      else if (['wing', 'category', 'department'].includes(f)) {
        if (!mongoose.isValidObjectId(v)) continue;
        filter[f] = v;
      } else filter[f] = v;
    }

    if (ranked) {
      // Ranks are calculated over the whole table first, then searched / paginated,
      // so a student keeps her real rank even when a search narrows the list.
      const all = (await find(filter).lean()).map((d) => ({ ...d, id: String(d._id) }));
      let rows = assignRanks(all).map(serialize);
      if (search) {
        const needle = search.toLowerCase();
        rows = rows.filter((r) => searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(needle)));
      }
      const total = rows.length;
      return res.json({ items: rows.slice((page - 1) * limit, page * limit), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    const [docs, total] = await Promise.all([
      find(filter).sort(defaultSort).skip((page - 1) * limit).limit(limit),
      Model.countDocuments(filter),
    ]);
    res.json({ items: docs.map((d) => serialize(toObj(d))), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  });

  const get = asyncHandler(async (req, res) => {
    const doc = await find({ _id: req.params.id });
    if (!doc.length) throw ApiError.notFound(`${label} not found.`);
    res.json(serialize(toObj(doc[0])));
  });

  const create = asyncHandler(async (req, res) => {
    const doc = await Model.create(req.body);
    const full = populate ? await Model.findById(doc._id).populate(populate) : doc;
    res.status(201).json(serialize(toObj(full)));
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found.`);
    doc.set(req.body);
    await doc.save();
    const full = populate ? await Model.findById(doc._id).populate(populate) : doc;
    res.json(serialize(toObj(full)));
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found.`);
    if (afterDelete) await afterDelete(doc);
    res.status(204).end();
  });

  return { list, get, create, update, remove };
}
