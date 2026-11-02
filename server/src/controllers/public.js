import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { computeStatus, eventWindow } from '../utils/eventStatus.js';
import {
  Category, Club, CoreMember, Advisor, Department, Event, Setting, Student, Testimonial, Wing, Message,
} from '../models/index.js';

const clampInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
};
const json = (d) => (d?.toJSON ? d.toJSON() : d);
const byOrder = { order: 1, createdAt: 1 };

/* ================= Settings (+ live counts for auto stats) ================= */
const COUNTERS = {
  departments: () => Department.countDocuments({ published: true }),
  wings: () => Wing.countDocuments({ published: true }),
  clubs: () => Club.countDocuments({ published: true }),
  events: () => Event.countDocuments({ published: true }),
  students: () => Student.countDocuments({ active: true }),
};

export const getSettings = asyncHandler(async (_req, res) => {
  const doc = (await Setting.findOne({ key: 'site' })) || new Setting({ key: 'site' });
  const settings = json(doc);
  settings.stats = await Promise.all(
    (settings.stats || []).map(async (s) => ({
      label: s.label,
      suffix: s.suffix || '',
      value: s.source && s.source !== 'manual' ? await COUNTERS[s.source]() : s.value,
    }))
  );
  res.set('Cache-Control', 'no-cache'); // settings are tiny; always revalidate so admin changes show immediately
  res.json(settings);
});

/* ================= Simple lists ================= */
export const listCore = asyncHandler(async (_req, res) => res.json((await CoreMember.find().sort(byOrder)).map(json)));
export const listAdvisors = asyncHandler(async (_req, res) => res.json((await Advisor.find().sort(byOrder)).map(json)));
export const listTestimonials = asyncHandler(async (_req, res) => res.json((await Testimonial.find().sort(byOrder)).map(json)));

export const listCategories = asyncHandler(async (req, res) => {
  res.json((await Category.find({ type: 'event' }).sort(byOrder)).map(json));
});

/* ================= Events ================= */
const STATUS_RANK = { ongoing: 0, upcoming: 1, completed: 2 };

function serializeEvent(doc) {
  const ev = json(doc);
  const status = computeStatus(ev);
  const { start, end } = eventWindow(ev);
  return { ...ev, status, startsAt: start.toISOString(), endsAt: end.toISOString() };
}

function sortEvents(list) {
  return list.sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return a.status === 'completed'
      ? b.startsAt.localeCompare(a.startsAt) // newest finished first
      : a.startsAt.localeCompare(b.startsAt); // soonest first
  });
}

const eventPopulate = [
  { path: 'category', select: 'name slug' },
  { path: 'wing', select: 'name slug' },
  { path: 'department', select: 'name slug' },
];

export const listEvents = asyncHandler(async (req, res) => {
  const all = sortEvents((await Event.find({ published: true }).populate(eventPopulate)).map(serializeEvent));
  const counts = all.reduce((a, e) => ({ ...a, [e.status]: (a[e.status] || 0) + 1 }), { upcoming: 0, ongoing: 0, completed: 0 });

  const { status, category, q } = req.query;
  let rows = all;
  if (['upcoming', 'ongoing', 'completed'].includes(status)) rows = rows.filter((e) => e.status === status);
  if (typeof category === 'string' && category && category !== 'all') rows = rows.filter((e) => e.category?.slug === category);
  if (typeof q === 'string' && q.trim()) {
    const n = q.trim().toLowerCase().slice(0, 80);
    rows = rows.filter((e) => [e.title, e.description, e.organizer, e.venue].some((f) => (f || '').toLowerCase().includes(n)));
  }

  // Spotlight: a live event first, otherwise a featured upcoming one, otherwise the next upcoming.
  const live = all.filter((e) => e.status === 'ongoing');
  const upcoming = all.filter((e) => e.status === 'upcoming');
  const spotlight = live[0] || upcoming.find((e) => e.featured) || upcoming[0] || null;

  const limit = clampInt(req.query.limit, 60, 1, 100);
  const page = clampInt(req.query.page, 1, 1, 1000);
  res.json({
    items: rows.slice((page - 1) * limit, page * limit),
    total: rows.length,
    page,
    pages: Math.max(1, Math.ceil(rows.length / limit)),
    counts: { ...counts, all: all.length },
    spotlight,
  });
});

export const getEvent = asyncHandler(async (req, res) => {
  const doc = await Event.findOne({ slug: req.params.slug, published: true }).populate(eventPopulate);
  if (!doc) throw ApiError.notFound('Event not found.');
  const event = serializeEvent(doc);
  const related = (
    await Event.find({ published: true, _id: { $ne: doc._id }, ...(doc.category ? { category: doc.category._id } : {}) })
      .populate(eventPopulate)
      .limit(12)
  ).map(serializeEvent);
  res.json({ ...event, related: sortEvents(related).slice(0, 3) });
});

/* ================= Departments & Wings (no points here - they are ranking data) ================= */
async function relatedFor(field, id) {
  const events = await Event.find({ published: true, [field]: id }).populate(eventPopulate).limit(30);
  return { events: sortEvents(events.map(serializeEvent)).slice(0, 6) };
}

const sortedMembers = (doc) => ({ ...doc, members: [...(doc.members || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });

export const listDepartments = asyncHandler(async (_req, res) => {
  const docs = await Department.find({ published: true }).sort(byOrder);
  res.json(docs.map((d) => sortedMembers(json(d))));
});

export const getDepartment = asyncHandler(async (req, res) => {
  const doc = await Department.findOne({ slug: req.params.slug, published: true });
  if (!doc) throw ApiError.notFound('Department not found.');
  res.json({ ...sortedMembers(json(doc)), related: await relatedFor('department', doc._id) });
});

async function wingsWithClubs(filter) {
  const wings = await Wing.find({ published: true, ...filter }).select('-points').sort(byOrder);
  const clubs = await Club.find({ published: true, wing: { $in: wings.map((w) => w._id) } }).select('-points').sort(byOrder);
  return wings.map((w) => ({
    ...sortedMembers(json(w)),
    clubs: clubs.filter((c) => String(c.wing) === String(w._id)).map((c) => sortedMembers(json(c))),
  }));
}

export const listWings = asyncHandler(async (_req, res) => res.json(await wingsWithClubs({})));

export const getWing = asyncHandler(async (req, res) => {
  const [wing] = await wingsWithClubs({ slug: req.params.slug });
  if (!wing) throw ApiError.notFound('Wing not found.');
  res.json({ ...wing, related: await relatedFor('wing', wing.id) });
});

/* ================= Contact form ================= */
export const submitContact = asyncHandler(async (req, res) => {
  const { website, ...data } = req.body;
  if (website) return res.status(201).json({ ok: true }); // honeypot tripped: pretend success, store nothing
  await Message.create(data);
  res.status(201).json({ ok: true });
});
