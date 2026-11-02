import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      minlength: 3, maxlength: 32, match: /^[a-z0-9._-]+$/,
    },
    displayName: { type: String, trim: true, maxlength: 80, default: '' },
    passwordHash: { type: String, required: true, select: false },
    // admin  -> full CMS + all rankings
    // viewer -> may open the protected Wing / Club / Class Union rankings, nothing else
    // member -> a login that belongs to ONE wing / club / class union and opens only that ranking
    role: { type: String, enum: ['admin', 'viewer', 'member'], default: 'viewer', index: true },
    entityType: { type: String, enum: ['wing', 'club', 'classUnion'], default: undefined },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: undefined, index: true },
    active: { type: Boolean, default: true },
    // Bump to invalidate every token that was issued before (password change, deactivation...)
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

const COST = 12;
userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, COST);
userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
