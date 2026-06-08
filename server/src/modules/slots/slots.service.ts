import { Types } from 'mongoose';
import { Slot } from '../../models/index.js';
import { HttpError } from '../../middleware/error.js';
import type { CreateSlotInput } from './slots.schema.js';

function dayRange(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d));
  const to = new Date(Date.UTC(y, m - 1, d + 1));
  return { from, to };
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

export async function book(slotId: string, userId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const slot = await Slot.findById(slotId);
  if (!slot) throw new HttpError(404, 'Slot not found');

  if (slot.bookings.some((b) => String(b) === userId)) {
    throw new HttpError(409, 'You have already booked this slot');
  }
  if (slot.bookings.length >= slot.capacity) {
    throw new HttpError(409, 'This slot is fully booked');
  }
  slot.bookings.push(new Types.ObjectId(userId));
  await slot.save();
  return toDto(slot.toObject() as SlotDoc, userId);
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
  const { from } = dayRange(input.date);
  return Slot.create({
    date: from,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    bookings: [],
  });
}

export async function remove(slotId: string) {
  if (!Types.ObjectId.isValid(slotId)) throw new HttpError(404, 'Slot not found');
  const deleted = await Slot.findByIdAndDelete(slotId);
  if (!deleted) throw new HttpError(404, 'Slot not found');
}
