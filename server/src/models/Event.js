import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { baseJSON } from './shared.js';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    poster: { type: String, trim: true, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },

    // Dates are plain strings (YYYY-MM-DD / HH:mm) so there is no timezone drift.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    endDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, default: undefined },
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: undefined },
    endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: undefined },
    // Free-text date shown instead of the formatted date (used for legacy entries such as "March 2026").
    dateLabel: { type: String, trim: true, maxlength: 60, default: '' },
    venue: { type: String, trim: true, maxlength: 160, default: '' },

    // 'auto' derives the status from the date/time; 'manual' keeps whatever `status` is set to.
    statusMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },

    organizer: { type: String, trim: true, maxlength: 160, default: '' },
    wing: { type: mongoose.Schema.Types.ObjectId, ref: 'Wing', default: null, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    participants: { type: String, trim: true, maxlength: 80, default: '' },

    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(eventSchema, { source: 'title' });
eventSchema.index({ slug: 1 }, { unique: true });
baseJSON(eventSchema);

export const Event = mongoose.model('Event', eventSchema);
