// Central export for all Mongoose models + shared role constants.
import { Schema, model, Types } from 'mongoose';

export const ROLES = ['MEMBER', 'TRAINER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const WORKOUT_TYPES = ['CARDIO', 'STRENGTH', 'MIXED'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

// ---- User ----
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  mobile?: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'MEMBER' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const User = model<IUser>('User', userSchema);

// ---- RefreshToken ----
const refreshTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// TTL index: Mongo auto-deletes expired tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);

// ---- GymConfig (single-gym MVP) ----
const gymConfigSchema = new Schema({
  name: { type: String, default: 'FitSphere Gym' },
  capacity: { type: Number, default: 50, min: 1 },
});

export const GymConfig = model('GymConfig', gymConfigSchema);

// ---- Attendance ----
const attendanceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkInAt: { type: Date, default: Date.now, index: true },
  checkOutAt: { type: Date, default: null },
});

export const Attendance = model('Attendance', attendanceSchema);

// ---- WorkoutLog ----
const workoutLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: WORKOUT_TYPES, required: true },
  durationMin: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now },
});

export const WorkoutLog = model('WorkoutLog', workoutLogSchema);

// ---- Slot + embedded bookings ----
const slotSchema = new Schema({
  date: { type: Date, required: true, index: true },
  startTime: { type: String, required: true }, // "06:00"
  endTime: { type: String, required: true }, // "07:00"
  capacity: { type: Number, required: true, min: 1 },
  bookings: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export const Slot = model('Slot', slotSchema);

// ---- Feedback (trainer -> member) ----
const feedbackSchema = new Schema(
  {
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, required: true },
    weekOf: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Feedback = model('Feedback', feedbackSchema);
