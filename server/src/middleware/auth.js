import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const COOKIE_NAME = 'gazva_token';

function parseDuration(str) {
  const m = /^(\d+)\s*([smhd])$/.exec(str);
  if (!m) return 8 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
}

export function cookieOptions() {
  return {
    httpOnly: true, // not readable from JavaScript -> not stealable through XSS
    secure: env.isProd, // HTTPS only in production
    sameSite: 'lax', // not sent on cross-site POST/PUT/DELETE -> CSRF protection
    path: '/',
    maxAge: parseDuration(env.jwtExpiresIn),
  };
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, tv: user.tokenVersion, role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function resolveUser(req) {
  const token = readToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  // Role + activity are re-checked against the database on every request, so a
  // demoted / deactivated account loses access immediately, not when the token expires.
  if (!user || !user.active || user.tokenVersion !== payload.tv) return null;
  return user;
}

/** Requires a valid session (any role). */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw ApiError.unauthorized();
  req.user = user;
  next();
});

/** Requires a valid session AND one of the given roles. */
export const requireRole = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    const user = req.user || (await resolveUser(req));
    if (!user) throw ApiError.unauthorized();
    if (!roles.includes(user.role)) throw ApiError.forbidden();
    req.user = user;
    next();
  });

export const requireAdmin = requireRole('admin');

/**
 * Protected rankings. Allowed: admins, general "viewer" accounts, and a "member" account
 * whose own wing / club / class union matches the ranking being opened.
 */
export const requireRankingAccess = (entityType) =>
  asyncHandler(async (req, _res, next) => {
    const user = req.user || (await resolveUser(req));
    if (!user) throw ApiError.unauthorized();
    const ok = user.role === 'admin' || user.role === 'viewer' || (user.role === 'member' && user.entityType === entityType);
    if (!ok) throw ApiError.forbidden('Your login does not include this ranking.');
    req.user = user;
    next();
  });

/** Attaches req.user when a valid session exists, but never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = (await resolveUser(req)) || null;
  next();
});
