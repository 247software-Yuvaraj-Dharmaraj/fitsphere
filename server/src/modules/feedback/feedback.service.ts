import { Types } from 'mongoose';
import { Feedback, User } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import type { CreateFeedbackInput } from './feedback.schema.js';

function startOfWeek(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function create(trainerId: string, input: CreateFeedbackInput) {
  if (!Types.ObjectId.isValid(input.memberId)) throw new HttpError(404, 'Member not found');
  const member = await User.findOne({ _id: input.memberId, role: 'MEMBER' });
  if (!member) throw new HttpError(404, 'Member not found');

  const fb = await Feedback.create({
    trainer: trainerId,
    member: input.memberId,
    note: input.note,
    weekOf: input.weekOf ? new Date(input.weekOf) : startOfWeek(),
  });
  return fb;
}

// Timeline of feedback for a member (newest first), with trainer name.
export async function forMember(memberId: string) {
  const items = await Feedback.find({ member: memberId })
    .populate<{ trainer: { name: string } }>('trainer', 'name')
    .sort({ weekOf: -1, createdAt: -1 })
    .lean();

  return items.map((f) => ({
    id: String(f._id),
    note: f.note,
    weekOf: f.weekOf,
    createdAt: f.createdAt,
    trainerName: f.trainer?.name ?? 'Trainer',
  }));
}

// Member picker for trainers/admins.
export async function listMembers() {
  const members = await User.find({ role: 'MEMBER' }).select('name email').sort({ name: 1 }).lean();
  return members.map((m) => ({ id: String(m._id), name: m.name, email: m.email }));
}
