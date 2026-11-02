import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(__dirname, '..', '..');

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}
if (isProd && /change-me|changeme|secret/i.test(jwtSecret)) {
  throw new Error('JWT_SECRET looks like a placeholder. Set a real random value before running in production.');
}

const uploadDirRaw = process.env.UPLOAD_DIR || 'uploads';

export const env = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  mongoUri: required('MONGODB_URI'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigins: (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  eventTzOffset: process.env.EVENT_TZ_OFFSET || '+05:30',
  uploadDir: path.isAbsolute(uploadDirRaw) ? uploadDirRaw : path.resolve(serverRoot, uploadDirRaw),
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024,
  clientDist: path.resolve(serverRoot, '..', 'client', 'dist'),
  seed: {
    adminUsername: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD,
    viewerUsername: (process.env.VIEWER_USERNAME || 'rankings').toLowerCase(),
    viewerPassword: process.env.VIEWER_PASSWORD,
  },
};
