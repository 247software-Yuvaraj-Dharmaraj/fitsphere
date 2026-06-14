import { Types } from 'mongoose';
import { Slot } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import { emitSlotsChanged } from '../../lib/realtime.js';
import type { CreateSlotInput, UpdateSlotInput } from './slots.schema.js';

function dayRange(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d));
  const to = new Date(Date.UTC(y, m - 1, d + 1));
  return { from, to };
}

// Slots are gym-wide and date-only, so "today"/"past" are judged in the gym's
// timezone (GYM_TZ_OFFSET, minutes east of UTC) — not UTC, which would make an
// early-morning gym day look like the previous day. Returned as UTC midnight of
// the gym's current date, so it compares correctly against stored slot dates.
const GYM_OFFSET = Number(process.env.GYM_TZ_OFFSET) || 0;
function gymTodayKey() {
  return new Date(Date.now() + GYM_OFFSET * 60_000).toISOString().slice(0, 10);
}
function gymToday() {
  const [y, m, d] = gymTodayKey().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
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
  waitlist?: Types.ObjectId[];
}

function toDto(slot: SlotDoc, userId: string) {
  const bookedCount = slot.bookings.length;
  const waitlist = slot.waitlist ?? [];
  const waitlistIndex = waitlist.findIndex((w) => String(w) === userId);
  return {
    id: String(slot._id),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    bookedCount,
    available: Math.max(0, slot.capacity - bookedCount),
    bookedByMe: slot.bookings.some((b) => String(b) === userId),
    isFull: bookedCount >= slot.capacity,
    waitlistCount: waitlist.length,
    waitlistedByMe: waitlistIndex !== -1,
    // 1-based position in the queue (null when not waitlisted).
    waitlistPosition: waitlistIndex === -1 ? null : waitlistIndex + 1,
  };
}

// Defaults to today (UTC) when no date is given.
export async function listByDate(userId: string, date?: string) {
  const target = date ?? gymTodayKey();
  const { from, to } = dayRange(target);
  const slots = await Slot.find({ date: { $gte: from, $lt: to } })
    .sort({ startTime: 1 })
    .lean<SlotDoc[]>();
  return { date: target, slots: slots.map((s) => toDto(s, userId)) };
}

// A member's own upcoming slots (today onward), across all days — both confirmed
// bookings and waitlist entries (the DTO flags which is which).
export async function myBookings(userId: string) {
  const today = gymToday();
  const uid = new Types.ObjectId(userId);
  const slots = await Slot.find({
    date: { $gte: today },
    $or: [{ bookings: uid }, { waitlist: uid }],
  })
    .sort({ date: 1, startTime: 1 })
    .lean<SlotDoc[]>();
  return slots.map((s) => toDto(s, userId));
}

export async function book(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  // Can't book a slot on a day that's already past (in the gym's timezone).
  if (slot.date < gymToday()) {
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
    { $push: { bookings: uid }, $pull: { waitlist: uid } },
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
  emitSlotsChanged();
  return toDto(updated.toObject() as SlotDoc, userId);
}

// Promotes waitlisted members into freed seats (FIFO), mutating the doc in
// place. Returns true if anyone was promoted.
function promoteFromWaitlist(slot: { bookings: Types.ObjectId[]; waitlist: Types.ObjectId[]; capacity: number }) {
  let promoted = false;
  while (slot.bookings.length < slot.capacity && slot.waitlist.length > 0) {
    const next = slot.waitlist.shift();
    if (next) {
      slot.bookings.push(next);
      promoted = true;
    }
  }
  return promoted;
}

export async function cancel(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  const before = slot.bookings.length;
  slot.bookings = slot.bookings.filter((b) => String(b) !== userId);
  const wasBooked = slot.bookings.length !== before;

  // Leaving the waitlist is also a valid "cancel" for a member who hadn't been
  // confirmed yet.
  const waitBefore = slot.waitlist.length;
  slot.waitlist = slot.waitlist.filter((w) => String(w) !== userId);
  const wasWaitlisted = slot.waitlist.length !== waitBefore;

  if (!wasBooked && !wasWaitlisted) {
    throw new HttpError(400, 'You have not booked this slot');
  }

  // A confirmed seat opened up — pull the next person off the waitlist.
  if (wasBooked) promoteFromWaitlist(slot);

  await slot.save();
  emitSlotsChanged();
  return toDto(slot.toObject() as SlotDoc, userId);
}

// Join the waitlist for a full slot. Rejects if the slot has free capacity
// (the member should just book), or they're already booked / waitlisted.
export async function joinWaitlist(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  if (slot.date < gymToday()) throw new HttpError(409, 'This slot has already passed');

  if (slot.bookings.some((b) => String(b) === userId)) {
    throw new HttpError(409, 'You have already booked this slot');
  }
  if (slot.bookings.length < slot.capacity) {
    throw new HttpError(409, 'This slot still has space — book it directly');
  }
  if (slot.waitlist.some((w) => String(w) === userId)) {
    throw new HttpError(409, 'You are already on the waitlist');
  }

  slot.waitlist.push(new Types.ObjectId(userId));
  await slot.save();
  emitSlotsChanged();
  return toDto(slot.toObject() as SlotDoc, userId);
}

export async function leaveWaitlist(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  const before = slot.waitlist.length;
  slot.waitlist = slot.waitlist.filter((w) => String(w) !== userId);
  if (slot.waitlist.length === before) {
    throw new HttpError(400, 'You are not on the waitlist');
  }
  await slot.save();
  emitSlotsChanged();
  return toDto(slot.toObject() as SlotDoc, userId);
}

// Admin / Trainer only.
export async function create(input: CreateSlotInput) {
  const range = dayRange(input.date);
  if (range.from < gymToday()) {
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
  // Raising capacity opens seats — fill them from the waitlist (FIFO).
  promoteFromWaitlist(slot);
  await slot.save();
  emitSlotsChanged();
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
