import mongoose from 'mongoose';
import { baseJSON } from './shared.js';

/* ---------------- Core committee ---------------- */
const coreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    position: { type: String, trim: true, maxlength: 80, default: '' },
    photo: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);
baseJSON(coreSchema);
export const CoreMember = mongoose.model('CoreMember', coreSchema);

/* ---------------- Advisory board ---------------- */
const advisorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 80, default: '' },
    department: { type: String, trim: true, maxlength: 120, default: '' },
    photo: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);
baseJSON(advisorSchema);
export const Advisor = mongoose.model('Advisor', advisorSchema);

/* ---------------- "What Students Say" ---------------- */
const testimonialSchema = new mongoose.Schema(
  {
    quote: { type: String, required: true, trim: true, maxlength: 500 },
    author: { type: String, trim: true, maxlength: 120, default: '' },
    photo: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);
baseJSON(testimonialSchema);
export const Testimonial = mongoose.model('Testimonial', testimonialSchema);

/* ---------------- Contact inbox ---------------- */
const messageSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    subject: { type: String, trim: true, maxlength: 60, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
baseJSON(messageSchema);
export const Message = mongoose.model('Message', messageSchema);

/* ---------------- Uploaded images ---------------- */
const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimetype: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
baseJSON(mediaSchema);
export const Media = mongoose.model('Media', mediaSchema);

/* ---------------- Site settings (single document) ---------------- */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'site', unique: true },
    academicYear: { type: String, default: '' },
    hero: {
      badge: { type: String, default: '' },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
    },
    stats: [
      {
        label: String,
        value: { type: Number, default: 0 },
        suffix: { type: String, default: '' },
        // 'manual' uses `value`; the others are counted live from the database.
        source: { type: String, enum: ['manual', 'departments', 'wings', 'clubs', 'events', 'students'], default: 'manual' },
      },
    ],
    blogUrl: { type: String, default: '' },
    vision: { type: String, default: '' },
    mission: { type: String, default: '' },
    footer: {
      sub: { type: String, default: '' },
      description: { type: String, default: '' },
      address: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    contact: {
      address: { type: String, default: '' },
      emails: { type: [String], default: [] },
      phone: { type: String, default: '' },
      hoursWeekday: { type: String, default: '' },
      hoursOther: { type: String, default: '' },
    },
    social: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
  },
  { timestamps: true }
);
baseJSON(settingSchema);
export const Setting = mongoose.model('Setting', settingSchema);
