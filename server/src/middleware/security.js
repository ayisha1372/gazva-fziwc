import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'frame-src': ['https://www.google.com', 'https://maps.google.com'],
      'script-src': ["'self'"],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin / curl / server-to-server
    if (env.clientOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

export const sanitizeInput = mongoSanitize({ replaceWith: '_' });

/** Generic API limiter */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

/** Brute-force protection for logins. Only failed attempts count. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many failed sign-in attempts. Try again in 15 minutes.' },
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You have sent several messages already. Please try again later.' },
});

/**
 * Cookie-based sessions need a CSRF answer. SameSite=Lax already blocks cross-site writes in
 * modern browsers; this adds a second layer for state-changing requests. A request is allowed when ANY of:
 *   1. the browser itself says it is same-origin (Sec-Fetch-Site - set by the browser, scripts cannot fake it),
 *   2. the Origin's host equals the Host the request reached, or the host forwarded by a reverse proxy,
 *   3. the Origin is listed in CLIENT_URL,
 *   4. (development only) the Origin is localhost / 127.0.0.1 on any port.
 * Everything else with an Origin header - e.g. another website's form or script - is rejected.
 */
export function originGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite === 'same-origin' || fetchSite === 'none') return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  try {
    const o = new URL(origin);
    const hosts = [req.headers.host, req.headers['x-forwarded-host']]
      .filter(Boolean)
      .flatMap((h) => String(h).split(',').map((x) => x.trim()));
    if (hosts.includes(o.host)) return next();
    if (env.clientOrigins.includes(origin.replace(/\/$/, ''))) return next();
    if (!env.isProd && ['localhost', '127.0.0.1', '[::1]'].includes(o.hostname)) return next();
    return next(ApiError.forbidden(
      `Cross-site request blocked (the site was opened at ${o.origin}). If this is your own site, add that address to CLIENT_URL in server/.env and restart the server.`
    ));
  } catch {
    return next(ApiError.forbidden('Cross-site request blocked.'));
  }
}
