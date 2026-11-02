import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import api from './routes/index.js';
import { securityHeaders, corsMiddleware, sanitizeInput, apiLimiter, originGuard } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Render / Railway / Nginx so rate limiting sees the real client IP

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compression());
  if (process.env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);

  // Uploaded images (long cache: filenames are unique and never reused)
  app.use('/uploads', express.static(env.uploadDir, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

  // A missing upload must be a real 404, never the SPA's index.html.
  app.use('/uploads', (_req, res) => res.status(404).type('text/plain').send('Not found'));

  app.use('/api', apiLimiter, originGuard, api);
  app.use('/api', notFound);

  // Serve the built React app (single deployable). Skipped in dev where Vite serves it.
  const indexHtml = path.join(env.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(env.clientDist, { index: false, maxAge: '1h' }));
    app.use('/assets', express.static(path.join(env.clientDist, 'assets'), { maxAge: '1y', immutable: true }));
    app.use('/assets', (_req, res) => res.status(404).type('text/plain').send('Not found'));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
  }

  app.use(errorHandler);
  return app;
}
