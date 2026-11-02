import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { memberSchema, baseJSON } from './shared.js';

// Clubs are the sub-units that sit under a Wing (e.g. "English Club" under SRDP).
const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    wing: { type: mongoose.Schema.Types.ObjectId, ref: 'Wing', default: null, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    logo: { type: String, trim: true, default: '' },
    members: { type: [memberSchema], default: [] }, // General Secretary, Joint Secretary...
    points: { type: Number, default: 0, min: 0, index: true },
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(clubSchema, { source: 'name' });
clubSchema.index({ slug: 1 }, { unique: true });
baseJSON(clubSchema);

export const Club = mongoose.model('Club', clubSchema);
