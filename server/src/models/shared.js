import mongoose from 'mongoose';

/** A person holding a position (department member, wing leader, club secretary...). */
export const memberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: '' }, // empty => "Position open"
    position: { type: String, trim: true, required: true, maxlength: 80 },
    photo: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

export const activityList = { type: [{ type: String, trim: true, maxlength: 200 }], default: [] };

export function baseJSON(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}
