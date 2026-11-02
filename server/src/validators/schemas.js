import { z } from 'zod';
import { DEPARTMENT_MEMBER_LIMIT } from '../models/Department.js';

/* ---------- building blocks ---------- */
const text = (max, min = 0) => z.string().trim().min(min).max(max);
const optText = (max) => z.string().trim().max(max).default('');
const bool = z.boolean();
const order = z.coerce.number().int().min(0).max(100000).default(0);
const points = z.coerce.number().int().min(0).max(10_000_000);

// Image fields accept '' (none), a file we uploaded ("/uploads/..."), or an absolute http(s) URL.
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^\/uploads\/[\w.-]+$/.test(v) || /^https?:\/\/\S+$/.test(v), 'Must be an uploaded image or a full http(s) URL')
  .default('');

const objectId = z
  .union([z.literal(''), z.null(), z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')])
  .transform((v) => v || null)
  .optional();

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timeStr = z
  .union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm')])
  .transform((v) => v || undefined)
  .optional();

/* ---------- shared sub-documents ---------- */
export const memberInput = z.object({
  name: text(120).default(''),
  position: text(80, 1),
  photo: imageUrl,
  order: z.coerce.number().int().min(0).default(0),
});
const members = (max = 60) => z.array(memberInput).max(max).default([]);
const activities = z.array(text(200, 1)).max(30).default([]);

/* ---------- resources ---------- */
export const categorySchema = z.object({
  name: text(60, 1),
  type: z.enum(['event']).default('event'),
  description: optText(300),
  order,
});

export const departmentSchema = z.object({
  name: text(120, 1),
  tagline: optText(240),
  description: optText(2000),
  logo: imageUrl,
  members: members(DEPARTMENT_MEMBER_LIMIT),
  activities,
  order,
  published: bool.default(true),
});

export const wingSchema = z.object({
  name: text(120, 1),
  purpose: optText(2000),
  logo: imageUrl,
  showLogoSlot: bool.default(false),
  members: members(),
  activities,
  points: points.default(0),
  order,
  published: bool.default(true),
});

export const clubSchema = z.object({
  name: text(120, 1),
  wing: objectId,
  description: optText(1000),
  logo: imageUrl,
  members: members(),
  points: points.default(0),
  order,
  published: bool.default(true),
});

export const classUnionSchema = z.object({
  name: text(120, 1),
  description: optText(600),
  logo: imageUrl,
  points: points.default(0),
  order,
});

export const studentSchema = z.object({
  name: text(120, 1),
  className: optText(60),
  department: optText(120),
  achievements: optText(400),
  photo: imageUrl,
  term: optText(20),
  points: points.default(0),
  active: bool.default(true),
});

export const eventSchema = z
  .object({
    title: text(160, 1),
    description: optText(5000),
    poster: imageUrl,
    category: objectId,
    date: dateStr,
    endDate: z.union([z.literal(''), dateStr]).transform((v) => v || undefined).optional(),
    startTime: timeStr,
    endTime: timeStr,
    dateLabel: optText(60),
    venue: optText(160),
    statusMode: z.enum(['auto', 'manual']).default('auto'),
    status: z.enum(['upcoming', 'ongoing', 'completed']).default('upcoming'),
    organizer: optText(160),
    wing: objectId,
    department: objectId,
    participants: optText(80),
    featured: bool.default(false),
    published: bool.default(true),
  })
  .refine((v) => !v.endDate || v.endDate >= v.date, { path: ['endDate'], message: 'End date cannot be before the start date' });

export const coreSchema = z.object({
  name: text(120, 1),
  position: optText(80),
  photo: imageUrl,
  order,
});

export const advisorSchema = z.object({
  name: text(120, 1),
  role: optText(80),
  department: optText(120),
  photo: imageUrl,
  order,
});

export const testimonialSchema = z.object({
  quote: text(500, 1),
  author: optText(120),
  photo: imageUrl,
  rating: z.coerce.number().int().min(1).max(5).default(5),
  order,
});

export const contactSchema = z.object({
  firstName: text(80, 1),
  lastName: optText(80),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: optText(30),
  subject: optText(60),
  message: text(4000, 5),
  website: z.string().max(300).optional(), // honeypot - real users never fill this in; any value means a bot
});

export const settingsSchema = z.object({
  academicYear: optText(20),
  hero: z.object({ badge: optText(160), title: optText(120), subtitle: optText(400) }),
  stats: z
    .array(
      z.object({
        label: text(40, 1),
        value: z.coerce.number().int().min(0).max(1_000_000).default(0),
        suffix: optText(4),
        source: z.enum(['manual', 'departments', 'wings', 'clubs', 'events', 'students']).default('manual'),
      })
    )
    .max(6),
  // Link for the "Blog" button in the navbar/footer (your separate blog website). Empty hides the button.
  blogUrl: z.union([z.literal(''), z.string().trim().max(300).regex(/^https?:\/\/\S+$/, 'Must start with http:// or https://')]).default(''),
  vision: optText(1200),
  mission: optText(1200),
  footer: z.object({ sub: optText(200), description: optText(400), address: optText(400), email: optText(160) }),
  contact: z.object({
    address: optText(400),
    emails: z.array(z.string().trim().email().max(160)).max(4).default([]),
    phone: optText(40),
    hoursWeekday: optText(120),
    hoursOther: optText(160),
  }),
  social: z.object({
    instagram: optText(300),
    facebook: optText(300),
    whatsapp: optText(300),
    youtube: optText(300),
  }),
});

/* ---------- auth & users ---------- */
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(200),
});

const password = z.string().min(8, 'Use at least 8 characters').max(128);

export const userCreateSchema = z
  .object({
    username: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/, 'Letters, numbers, dot, dash and underscore only'),
    displayName: optText(80),
    role: z.enum(['admin', 'viewer']).default('viewer'),
    password,
    active: bool.default(true),
  })
  .superRefine((v, ctx) => {
    if (v.password.toLowerCase().includes(v.username)) ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password must not contain the username' });
    if (v.role === 'admin' && v.password.length < 12) ctx.addIssue({ code: 'custom', path: ['password'], message: 'Admin passwords need at least 12 characters' });
  });

export const userUpdateSchema = z.object({
  displayName: optText(80).optional(),
  role: z.enum(['admin', 'viewer']).optional(),
  active: bool.optional(),
  password: z.union([z.literal(''), password]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});

export const credentialSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/, 'Letters, numbers, dot, dash and underscore only').optional(),
  password: z.union([z.literal(''), password]).optional(),
  active: bool.optional(),
});

export const generateSchema = z.object({ onlyMissing: bool.default(true) });

export const pointsSchema = z
  .object({ set: points.optional(), add: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional() })
  .refine((v) => (v.set === undefined) !== (v.add === undefined), 'Send either "set" or "add"');
