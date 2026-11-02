import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { entityByType } from '../utils/entities.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAME, cookieOptions, issueToken } from '../middleware/auth.js';

// A real bcrypt hash of a random string. Used so a login for an unknown username takes about
// as long as one for a real username (prevents username enumeration through timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

async function publicUser(u) {
  const out = { id: u.id, username: u.username, displayName: u.displayName || u.username, role: u.role };
  if (u.role === 'member') {
    const cfg = entityByType(u.entityType);
    const entity = cfg && (await cfg.Model.findById(u.entityId).select('name'));
    out.scope = { type: u.entityType, id: String(u.entityId), name: entity?.name || u.displayName };
  }
  return out;
}

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select('+passwordHash');
  const ok = user ? await user.verifyPassword(password) : await bcrypt.compare(password, DUMMY_HASH).then(() => false);
  if (!user || !ok || !user.active) {
    throw new ApiError(401, 'Incorrect username or password.');
  }
  user.lastLoginAt = new Date();
  await user.save();
  res.cookie(COOKIE_NAME, issueToken(user), cookieOptions());
  res.json({ user: await publicUser(user) });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

// Always 200: anonymous visitors simply get { user: null } so public pages never log a failed request.
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user ? await publicUser(req.user) : null });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!(await user.verifyPassword(req.body.currentPassword))) throw ApiError.badRequest('Your current password is incorrect.');
  if (req.body.newPassword.toLowerCase().includes(user.username)) throw ApiError.badRequest('Password must not contain your username.');
  if (user.role === 'admin' && req.body.newPassword.length < 12) throw ApiError.badRequest('Admin passwords need at least 12 characters.');
  user.passwordHash = await User.hashPassword(req.body.newPassword);
  user.tokenVersion += 1; // signs out every other session
  await user.save();
  res.cookie(COOKIE_NAME, issueToken(user), cookieOptions());
  res.json({ ok: true });
});
