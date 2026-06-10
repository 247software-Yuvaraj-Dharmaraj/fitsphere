import { Types } from 'mongoose';
import { Slot } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import type { CreateSlotInput, UpdateSlotInput } from './slots.schema.js';

function dayRange(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d));
  const to = new Date(Date.UTC(y, m - 1, d + 1));
  return { from, to };
}

function dayRangeOf(date: Date) {
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return { from, to };
}

// Two HH:MM ranges overlap if each starts before the other ends.
// (String compare == chronological for same-day 24h "HH:MM".)
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

// Rejects a slot whose time range overlaps an existing slot on the same day
// (covers exact duplicates too). `excludeId` skips the slot being edited.
async function assertNoOverlap(
  range: { from: Date; to: Date },
  startTime: string,
  endTime: string,
  excludeId?: Types.ObjectId,
) {
  const filter: Record<string, unknown> = { date: { $gte: range.from, $lt: range.to } };
  if (excludeId) filter._id = { $ne: excludeId };
  const sameDay = await Slot.find(filter).select('startTime endTime').lean<SlotDoc[]>();
  if (sameDay.some((s) => overlaps(startTime, endTime, s.startTime, s.endTime))) {
    throw new HttpError(409, 'This slot overlaps an existing slot on that day');
  }
}

interface SlotDoc {
  _id: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  bookings: Types.ObjectId[];
}

function toDto(slot: SlotDoc, userId: string) {
  const bookedCount = slot.bookings.length;
  return {
    id: String(slot._id),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    bookedCount,
    available: Math.max(0, slot.capacity - bookedCount),
    bookedByMe: slot.bookings.some((b) => String(b) === userId),
  };
}

// Defaults to today (UTC) when no date is given.
export async function listByDate(userId: string, date?: string) {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const { from, to } = dayRange(target);
  const slots = await Slot.find({ date: { $gte: from, $lt: to } })
    .sort({ startTime: 1 })
    .lean<SlotDoc[]>();
  return { date: target, slots: slots.map((s) => toDto(s, userId)) };
}

// A member's own upcoming booked slots (today onward), across all days.
export async function myBookings(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const uid = new Types.ObjectId(userId);
  const slots = await Slot.find({ bookings: uid, date: { $gte: today } })
    .sort({ date: 1, startTime: 1 })
    .lean<SlotDoc[]>();
  return slots.map((s) => toDto(s, userId));
}

export async function book(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  // Can't book a slot on a day that's already past.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (slot.date < today) {
    throw new HttpError(409, 'This slot has already passed');
  }

  if (slot.bookings.some((b) => String(b) === userId)) {
    throw new HttpError(409, 'You have already booked this slot');
  }

  // Atomic guarded push: only adds the booking if the user isn't already in it
  // AND there's free capacity — prevents two concurrent requests from both
  // grabbing the last seat (overbooking race).
  const uid = new Types.ObjectId(userId);
  const updated = await Slot.findOneAndUpdate(
    { _id: slot._id, bookings: { $ne: uid }, $expr: { $lt: [{ $size: '$bookings' }, '$capacity'] } },
    { $push: { bookings: uid } },
    { new: true },
  );
  if (!updated) {
    // Lost the race or filled up between the read and the update.
    const fresh = await Slot.findById(slotId);
    if (fresh?.bookings.some((b) => String(b) === userId)) {
      throw new HttpError(409, 'You have already booked this slot');
    }
    throw new HttpError(409, 'This slot is fully booked');
  }
  return toDto(updated.toObject() as SlotDoc, userId);
}

export async function cancel(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  const before = slot.bookings.length;
  slot.bookings = slot.bookings.filter((b) => String(b) !== userId);
  if (slot.bookings.length === before) {
    throw new HttpError(400, 'You have not booked this slot');
  }
  await slot.save();
  return toDto(slot.toObject() as SlotDoc, userId);
}

// Admin / Trainer only.
export async function create(input: CreateSlotInput) {
  const range = dayRange(input.date);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (range.from < today) {
    throw new HttpError(409, 'Cannot create a slot in the past');
  }
  await assertNoOverlap(range, input.startTime, input.endTime);
  return Slot.create({
    date: range.from,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    bookings: [],
  });
}

export async function update(slotId: string, input: UpdateSlotInput) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  // Capacity can't drop below seats already booked.
  if (input.capacity < slot.bookings.length) {
    throw new HttpError(409, `Capacity can't be below the ${slot.bookings.length} existing booking(s)`);
  }
  // No overlap with other slots that day.
  await assertNoOverlap(dayRangeOf(slot.date), input.startTime, input.endTime, slot._id);

  slot.startTime = input.startTime;
  slot.endTime = input.endTime;
  slot.capacity = input.capacity;
  await slot.save();
  return toDto(slot.toObject() as SlotDoc, '');
}

export async function remove(slotId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const deleted = await Slot.findByIdAndDelete(slotId);
  if (!deleted) throw new HttpError(404, 'Slot not found');
}

export async function bulkRemove(ids: string[]) {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  const res = await Slot.deleteMany({ _id: { $in: valid } });
  return { deleted: res.deletedCount ?? 0 };
}
