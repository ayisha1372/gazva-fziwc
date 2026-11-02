import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { memberSchema, activityList, baseJSON } from './shared.js';

const wingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    purpose: { type: String, trim: true, maxlength: 2000, default: '' },
    logo: { type: String, trim: true, default: '' },
    // Wings only show a logo (or the logo placeholder) when they have one uploaded or this is switched on.
    showLogoSlot: { type: Boolean, default: false },
    members: { type: [memberSchema], default: [] }, // wing leadership: Chairperson, Conveners...
    activities: activityList,
    points: { type: Number, default: 0, min: 0, index: true }, // never exposed on public endpoints
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(wingSchema, { source: 'name' });
wingSchema.index({ slug: 1 }, { unique: true });
baseJSON(wingSchema);

export const Wing = mongoose.model('Wing', wingSchema);
