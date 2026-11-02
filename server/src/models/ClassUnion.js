import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { baseJSON } from './shared.js';

const classUnionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    logo: { type: String, trim: true, default: '' }, // logo / emblem
    points: { type: Number, default: 0, min: 0, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);
slugPlugin(classUnionSchema, { source: 'name' });
classUnionSchema.index({ slug: 1 }, { unique: true });
baseJSON(classUnionSchema);

export const ClassUnion = mongoose.model('ClassUnion', classUnionSchema);
