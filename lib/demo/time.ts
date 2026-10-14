const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

export function weekdayIndex(name: string): number | null {
  const index = WEEKDAYS.indexOf(name.trim().toLowerCase() as WeekdayName);
  return index >= 0 ? index : null;
}

export function weekdayName(index: number): WeekdayName {
  return WEEKDAYS[index] ?? "sunday";
}

/** "5" and "5pm" are 17:00. "11" stays 11:00. */
export function parseClock(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (minute > 59 || hour > 23) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour <= 7) hour += 12;
  if (hour > 23) return null;
  return hour * 60 + minute;
}

export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time.format(start)}–${time.format(end)}`;
}

export function formatSlot(startIso: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startIso));
}

export function formatMoney(price: number): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}
