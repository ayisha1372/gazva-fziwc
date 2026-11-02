import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

// Only raster images. SVG is deliberately excluded (it can carry scripts).
const SIGNATURES = [
  { ext: '.jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: '.gif', mime: 'image/gif', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  { ext: '.webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { ext: '.avif', mime: 'image/avif', test: (b) => b.subarray(4, 8).toString('ascii') === 'ftyp' && /avif|avis/.test(b.subarray(8, 16).toString('ascii')) },
];

export function detectImage(buffer) {
  return SIGNATURES.find((s) => s.test(buffer)) || null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!SIGNATURES.some((s) => s.mime === file.mimetype)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP, GIF and AVIF images are allowed.'));
    }
    cb(null, true);
  },
});

export const singleImage = upload.single('image');

/**
 * Validates the real file signature (the client-declared MIME type can lie), then writes the
 * file under a random name whose extension comes from the detected type, never from the user.
 */
export async function persistImage(file) {
  if (!file) throw ApiError.badRequest('Please choose an image to upload.');
  const type = detectImage(file.buffer);
  if (!type) throw ApiError.badRequest('That file is not a valid image.');
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${type.ext}`;
  await fs.promises.writeFile(path.join(env.uploadDir, filename), file.buffer, { flag: 'wx' });
  return { filename, url: `/uploads/${filename}`, mimetype: type.mime, size: file.size, originalName: path.basename(file.originalname).slice(0, 200) };
}

export async function removeUploadedFile(filename) {
  const safe = path.basename(filename);
  try {
    await fs.promises.unlink(path.join(env.uploadDir, safe));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
