import mongoose from 'mongoose';
import { slugPlugin } from '../utils/slug.js';
import { memberSchema, activityList, baseJSON } from './shared.js';

export const DEPARTMENT_MEMBER_LIMIT = 10;

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    tagline: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    logo: { type: String, trim: true, default: '' },
    members: {
      type: [memberSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= DEPARTMENT_MEMBER_LIMIT,
        message: `A department can have at most ${DEPARTMENT_MEMBER_LIMIT} members.`,
      },
    },
    activities: activityList,
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(departmentSchema, { source: 'name' });
departmentSchema.index({ slug: 1 }, { unique: true });
baseJSON(departmentSchema);

export const Department = mongoose.model('Department', departmentSchema);
