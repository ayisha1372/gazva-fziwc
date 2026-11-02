import { asyncHandler } from '../utils/asyncHandler.js';
import { assignRanks } from '../utils/ranking.js';
import { Student, Wing, Club, ClassUnion } from '../models/index.js';

const clampInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
};

/** PUBLIC. No login needed. */
export const studentRanking = asyncHandler(async (req, res) => {
  const filter = { active: true };
  if (typeof req.query.term === 'string' && req.query.term) filter.term = req.query.term;

  const docs = await Student.find(filter).select('name className department achievements photo points').lean();
  const ranked = assignRanks(docs.map((d) => ({ ...d, id: String(d._id), _id: undefined })));

  const classes = [...new Set(ranked.map((r) => r.className).filter(Boolean))].sort(new Intl.Collator('en', { numeric: true }).compare);
  const top = ranked.slice(0, 3);

  let rows = ranked;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 80) : '';
  if (q) rows = rows.filter((r) => [r.name, r.className, r.department].some((f) => (f || '').toLowerCase().includes(q)));
  if (typeof req.query.className === 'string' && req.query.className) rows = rows.filter((r) => r.className === req.query.className);

  const limit = clampInt(req.query.limit, 25, 1, 100);
  const page = clampInt(req.query.page, 1, 1, 10000);
  res.json({
    items: rows.slice((page - 1) * limit, page * limit),
    total: rows.length,
    page,
    limit,
    pages: Math.max(1, Math.ceil(rows.length / limit)),
    classes,
    top,
    totalStudents: ranked.length,
  });
});

const strip = ({ _id, __v, ...rest }) => ({ id: String(_id), ...rest });

/** PROTECTED (route-level requireAuth). Any signed-in account may read these. */
export const wingRanking = asyncHandler(async (_req, res) => {
  const docs = await Wing.find({ published: true }).select('name slug logo showLogoSlot points').lean();
  // Wings saved before the logo-slot option existed have no value; treat that as "no slot".
  res.json({ items: assignRanks(docs.map((d) => strip({ ...d, showLogoSlot: !!d.showLogoSlot }))) });
});

export const clubRanking = asyncHandler(async (_req, res) => {
  const docs = await Club.find({ published: true }).populate({ path: 'wing', select: 'name' }).select('name slug logo points wing').lean();
  res.json({ items: assignRanks(docs.map((d) => ({ ...strip(d), wing: d.wing?.name || '' }))) });
});

export const classUnionRanking = asyncHandler(async (_req, res) => {
  const docs = await ClassUnion.find().select('name slug logo description points').lean();
  res.json({ items: assignRanks(docs.map(strip)) });
});
