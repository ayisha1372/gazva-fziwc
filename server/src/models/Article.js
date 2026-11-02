import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { baseJSON } from './shared.js';

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    excerpt: { type: String, trim: true, maxlength: 400, default: '' },
    // Markdown. Rendered and sanitised on the client.
    content: { type: String, default: '', maxlength: 60000 },
    coverImage: { type: String, trim: true, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    tags: { type: [{ type: String, trim: true, maxlength: 30 }], default: [] },
    author: { type: String, trim: true, maxlength: 80, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null, index: true },
    wing: { type: mongoose.Schema.Types.ObjectId, ref: 'Wing', default: null, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
  },
  { timestamps: true }
);
slugPlugin(articleSchema, { source: 'title' });
articleSchema.index({ slug: 1 }, { unique: true });
articleSchema.pre('save', function setPublishedAt(next) {
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.status === 'draft') this.publishedAt = null;
  next();
});
baseJSON(articleSchema);

export const Article = mongoose.model('Article', articleSchema);
