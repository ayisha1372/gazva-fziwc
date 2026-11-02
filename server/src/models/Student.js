import mongoose from 'mongoose';
import { baseJSON } from './shared.js';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    className: { type: String, trim: true, maxlength: 60, default: '' },
    department: { type: String, trim: true, maxlength: 120, default: '' },
    achievements: { type: String, trim: true, maxlength: 400, default: '' },
    photo: { type: String, trim: true, default: '' },
    term: { type: String, trim: true, maxlength: 20, default: '' }, // e.g. "2025-26"
    points: { type: Number, default: 0, min: 0, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
studentSchema.index({ name: 1 });
baseJSON(studentSchema);

export const Student = mongoose.model('Student', studentSchema);
