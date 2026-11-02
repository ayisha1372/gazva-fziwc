import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { computeStatus } from '../utils/eventStatus.js';
import { createCrud } from './crud.js';
import { entityByType } from '../utils/entities.js';
import { persistImage, removeUploadedFile } from '../middleware/upload.js';
import {
  Advisor, Category, ClassUnion, Club, CoreMember, Department, Event, Media, Message, Setting,
  Student, Testimonial, User, Wing,
} from '../models/index.js';
import * as S from '../validators/schemas.js';

/** Removes dangling references when a parent record is deleted. */
const unlink = (field) => async (doc) => {
  await Promise.all([
    Event.updateMany({ [field]: doc._id }, { $set: { [field]: null } }),
  ]);
};

/** Deleting a wing / club / class union also removes its ranking login. */
const dropLogin = (entityType) => async (doc) => { await User.deleteMany({ role: 'member', entityType, entityId: doc._id }); };

/**
 * Registry of every admin-managed resource. `points: true` resources also get
 * POST /:id/points so rankings can be adjusted without re-saving the whole record.
 */
export const resources = {
  students: {
    ...createCrud({ Model: Student, schema: S.studentSchema, label: 'Student', searchFields: ['name', 'className', 'department'], filterFields: ['className', 'active', 'term'], ranked: true }),
    Model: Student, schema: S.studentSchema, points: true,
  },
  wings: {
    ...createCrud({
      Model: Wing, schema: S.wingSchema, label: 'Wing', defaultSort: { order: 1, createdAt: 1 }, ranked: false,
      afterDelete: async (doc) => { await Club.updateMany({ wing: doc._id }, { $set: { wing: null } }); await unlink('wing')(doc); await dropLogin('wing')(doc); },
    }),
    Model: Wing, schema: S.wingSchema, points: true,
  },
  clubs: {
    ...createCrud({ Model: Club, schema: S.clubSchema, label: 'Club', populate: { path: 'wing', select: 'name' }, defaultSort: { order: 1, createdAt: 1 }, filterFields: ['wing'], afterDelete: dropLogin('club') }),
    Model: Club, schema: S.clubSchema, points: true,
  },
  'class-unions': {
    ...createCrud({ Model: ClassUnion, schema: S.classUnionSchema, label: 'Class union', defaultSort: { order: 1, createdAt: 1 }, afterDelete: dropLogin('classUnion') }),
    Model: ClassUnion, schema: S.classUnionSchema, points: true,
  },
  departments: {
    ...createCrud({ Model: Department, schema: S.departmentSchema, label: 'Department', defaultSort: { order: 1, createdAt: 1 }, afterDelete: unlink('department') }),
    Model: Department, schema: S.departmentSchema,
  },
  events: {
    ...createCrud({
      Model: Event, schema: S.eventSchema, label: 'Event', searchFields: ['title', 'organizer', 'venue'], defaultSort: { date: -1 }, filterFields: ['category'],
      populate: [{ path: 'category', select: 'name slug' }, { path: 'wing', select: 'name' }, { path: 'department', select: 'name' }],
      serialize: (e) => ({ ...e, effectiveStatus: computeStatus(e) }),
    }),
    Model: Event, schema: S.eventSchema,
  },
  categories: {
    ...createCrud({
      Model: Category, schema: S.categorySchema, label: 'Category', defaultSort: { order: 1, name: 1 },
      afterDelete: unlink('category'),
    }),
    Model: Category, schema: S.categorySchema,
  },
  core: {
    ...createCrud({ Model: CoreMember, schema: S.coreSchema, label: 'Core member', defaultSort: { order: 1, createdAt: 1 } }),
    Model: CoreMember, schema: S.coreSchema,
  },
  advisors: {
    ...createCrud({ Model: Advisor, schema: S.advisorSchema, label: 'Advisor', defaultSort: { order: 1, createdAt: 1 } }),
    Model: Advisor, schema: S.advisorSchema,
  },
  testimonials: {
    ...createCrud({ Model: Testimonial, schema: S.testimonialSchema, label: 'Testimonial', searchFields: ['author', 'quote'], defaultSort: { order: 1, createdAt: 1 } }),
    Model: Testimonial, schema: S.testimonialSchema,
  },
};

/* ---------------- Points (rankings) ---------------- */
export const adjustPoints = (Model, label) =>
  asyncHandler(async (req, res) => {
    const { set, add } = req.body;
    let doc;
    if (set !== undefined) {
      doc = await Model.findByIdAndUpdate(req.params.id, { $set: { points: set } }, { new: true });
    } else {
      // $inc is atomic, so two admins awarding points at once never overwrite each other.
      doc = await Model.findOneAndUpdate({ _id: req.params.id }, { $inc: { points: add } }, { new: true });
      if (doc && doc.points < 0) doc = await Model.findByIdAndUpdate(req.params.id, { $set: { points: 0 } }, { new: true });
    }
    if (!doc) throw ApiError.notFound(`${label} not found.`);
    res.json({ id: doc.id, points: doc.points });
  });

/* ---------------- Users ---------------- */
export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ role: 1, username: 1 });
  const items = await Promise.all(users.map(async (u) => {
    const json = u.toJSON();
    if (u.role === 'member') {
      const cfg = entityByType(u.entityType);
      json.entityName = (cfg && (await cfg.Model.findById(u.entityId).select('name')))?.name || '(deleted)';
      json.entityLabel = cfg?.label;
    }
    return json;
  }));
  res.json({ items });
});

export const createUser = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await User.create({ ...rest, passwordHash: await User.hashPassword(password) });
  res.status(201).json(user.toJSON());
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  const { password, ...rest } = req.body;
  const isSelf = user.id === req.user.id;
  if (user.role === 'member') delete rest.role; // member logins are managed from Rankings, tied to their wing/club/union

  if (isSelf && (rest.active === false || (rest.role && rest.role !== 'admin'))) {
    throw ApiError.badRequest('You cannot deactivate or demote your own account.');
  }
  if (password) {
    if (password.toLowerCase().includes(user.username)) throw ApiError.badRequest('Password must not contain the username.');
    if ((rest.role || user.role) === 'admin' && password.length < 12) throw ApiError.badRequest('Admin passwords need at least 12 characters.');
    user.passwordHash = await User.hashPassword(password);
    user.tokenVersion += 1;
  }
  const losesAccess = (rest.active === false && user.active) || (rest.role && rest.role !== user.role);
  user.set(rest);
  if (losesAccess) user.tokenVersion += 1;
  await user.save();
  res.json(user.toJSON());
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account.');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin', active: true })) <= 1) {
    throw ApiError.badRequest('At least one active admin account must remain.');
  }
  await user.deleteOne();
  res.status(204).end();
});

/* ---------------- Media ---------------- */
export const uploadMedia = asyncHandler(async (req, res) => {
  const saved = await persistImage(req.file);
  const media = await Media.create({ ...saved, uploadedBy: req.user.id });
  res.status(201).json(media.toJSON());
});

export const listMedia = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 48;
  const [items, total] = await Promise.all([
    Media.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Media.countDocuments(),
  ]);
  res.json({ items: items.map((m) => m.toJSON()), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Image not found.');
  await removeUploadedFile(media.filename);
  await media.deleteOne();
  res.status(204).end();
});

/* ---------------- Messages ---------------- */
export const listMessages = asyncHandler(async (req, res) => {
  const filter = req.query.unread === 'true' ? { isRead: false } : {};
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(300);
  res.json({ items: items.map((m) => m.toJSON()), unread: await Message.countDocuments({ isRead: false }) });
});

export const setMessageRead = asyncHandler(async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { $set: { isRead: !!req.body.isRead } }, { new: true });
  if (!msg) throw ApiError.notFound('Message not found.');
  res.json(msg.toJSON());
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findByIdAndDelete(req.params.id);
  if (!msg) throw ApiError.notFound('Message not found.');
  res.status(204).end();
});

/* ---------------- Settings ---------------- */
export const getAdminSettings = asyncHandler(async (_req, res) => {
  const doc = (await Setting.findOne({ key: 'site' })) || (await Setting.create({ key: 'site' }));
  res.json(doc.toJSON());
});

export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await Setting.findOneAndUpdate({ key: 'site' }, { $set: req.body }, { new: true, upsert: true, runValidators: true });
  res.json(doc.toJSON());
});

/* ---------------- Dashboard ---------------- */
export const dashboard = asyncHandler(async (_req, res) => {
  const [students, wings, clubs, classUnions, departments, events, unread, users, recent, allEvents] = await Promise.all([
    Student.countDocuments(), Wing.countDocuments(), Club.countDocuments(), ClassUnion.countDocuments(), Department.countDocuments(),
    Event.countDocuments(),
    Message.countDocuments({ isRead: false }), User.countDocuments(), Message.find().sort({ createdAt: -1 }).limit(5),
    Event.find().select('date endDate startTime endTime statusMode status'),
  ]);
  const statusCounts = allEvents.reduce((a, e) => { const s = computeStatus(e); return { ...a, [s]: (a[s] || 0) + 1 }; }, { upcoming: 0, ongoing: 0, completed: 0 });
  res.json({
    counts: { students, wings, clubs, classUnions, departments, events, unread, users },
    eventStatus: statusCounts,
    recentMessages: recent.map((m) => m.toJSON()),
  });
});
