import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { generatePassword } from '../utils/password.js';
import { ENTITIES } from '../utils/entities.js';
import { User } from '../models/index.js';

function entityConfig(req) {
  const cfg = ENTITIES[req.params.kind];
  if (!cfg) throw ApiError.notFound('Unknown ranking type.');
  return cfg;
}

async function usernameFor(cfg, entity) {
  const base = `${cfg.prefix}.${entity.slug || entity.name}`.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 28);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username: candidate })) { n += 1; candidate = `${base.slice(0, 26)}-${n}`; }
  return candidate;
}

const view = (u) => ({ entityId: String(u.entityId), username: u.username, active: u.active, lastLoginAt: u.lastLoginAt || null });

/** GET /admin/credentials/:kind  -> which entities already have a login */
export const listCredentials = asyncHandler(async (req, res) => {
  const cfg = entityConfig(req);
  const users = await User.find({ role: 'member', entityType: cfg.type });
  res.json({ items: users.map(view) });
});

/** PUT /admin/credentials/:kind/:id  -> create or update the login that belongs to one entity */
export const saveCredential = asyncHandler(async (req, res) => {
  const cfg = entityConfig(req);
  const entity = await cfg.Model.findById(req.params.id);
  if (!entity) throw ApiError.notFound(`${cfg.label} not found.`);
  const { username, password, active } = req.body;

  let user = await User.findOne({ role: 'member', entityType: cfg.type, entityId: entity._id }).select('+passwordHash');
  if (!user) {
    if (!password) throw ApiError.badRequest('Set a password to create this login.');
    user = new User({
      username: username || (await usernameFor(cfg, entity)), displayName: entity.name, role: 'member',
      entityType: cfg.type, entityId: entity._id, passwordHash: await User.hashPassword(password),
    });
  } else {
    if (username) user.username = username;
    if (password) { user.passwordHash = await User.hashPassword(password); user.tokenVersion += 1; }
    if (active !== undefined) { if (!active && user.active) user.tokenVersion += 1; user.active = active; }
    user.displayName = entity.name;
  }
  if (password && password.toLowerCase().includes(user.username)) throw ApiError.badRequest('Password must not contain the username.');
  await user.save();
  res.json(view(user));
});

/** DELETE /admin/credentials/:kind/:id  -> remove the login (the wing/club/union itself stays) */
export const removeCredential = asyncHandler(async (req, res) => {
  const cfg = entityConfig(req);
  await User.deleteMany({ role: 'member', entityType: cfg.type, entityId: req.params.id });
  res.status(204).end();
});

/**
 * POST /admin/credentials/:kind/generate
 * Creates a login (random username + password) for every entity that does not have one yet.
 * The plain passwords are returned ONCE in this response - they are stored hashed and cannot be shown again.
 */
export const generateCredentials = asyncHandler(async (req, res) => {
  const cfg = entityConfig(req);
  const entities = await cfg.Model.find().sort({ order: 1, name: 1 });
  const existing = new Set((await User.find({ role: 'member', entityType: cfg.type })).map((u) => String(u.entityId)));
  const created = [];
  for (const e of entities) {
    const has = existing.has(String(e._id));
    if (has && req.body.onlyMissing) continue;
    const password = generatePassword();
    if (has) {
      // eslint-disable-next-line no-await-in-loop
      const u = await User.findOne({ role: 'member', entityType: cfg.type, entityId: e._id }).select('+passwordHash');
      u.passwordHash = await User.hashPassword(password); u.tokenVersion += 1; u.active = true;
      // eslint-disable-next-line no-await-in-loop
      await u.save();
      created.push({ entityId: String(e._id), name: e.name, username: u.username, password });
    } else {
      // eslint-disable-next-line no-await-in-loop
      const username = await usernameFor(cfg, e);
      // eslint-disable-next-line no-await-in-loop
      await User.create({ username, displayName: e.name, role: 'member', entityType: cfg.type, entityId: e._id, passwordHash: await User.hashPassword(password) });
      created.push({ entityId: String(e._id), name: e.name, username, password });
    }
  }
  res.json({ items: created });
});
