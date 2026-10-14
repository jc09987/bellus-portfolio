/** Studio grid from the booking calendar: 09:00–19:00, every 30 minutes. */
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 19;
export const SLOT_MINUTES = 30;

export function getSlotsForDay(date: Date, durationMinutes: number): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = [];
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), OPEN_HOUR, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), CLOSE_HOUR, 0, 0, 0);
  const slotEnd = new Date(start.getTime() + durationMinutes * 60 * 1000);
  while (slotEnd <= end) {
    slots.push({ start: new Date(start), end: new Date(slotEnd) });
    start.setMinutes(start.getMinutes() + SLOT_MINUTES);
    slotEnd.setTime(start.getTime() + durationMinutes * 60 * 1000);
  }
  return slots;
}
