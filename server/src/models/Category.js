import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { baseJSON } from './shared.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ['event'], default: 'event', required: true, index: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
slugPlugin(categorySchema, { source: 'name', scope: ['type'] });
categorySchema.index({ type: 1, slug: 1 }, { unique: true });
baseJSON(categorySchema);

export const Category = mongoose.model('Category', categorySchema);
