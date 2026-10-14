/** Same windows as the reminder cron: ±1 hour around 24h and 2h ahead. */
export function windowForHoursAhead(now: Date, hoursAhead: number): { startIso: string; endIso: string } {
  const center = now.getTime() + hoursAhead * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  return {
    startIso: new Date(center - oneHour).toISOString(),
    endIso: new Date(center + oneHour).toISOString(),
  };
}

export function inWindow(startIso: string, window: { startIso: string; endIso: string }): boolean {
  const t = new Date(startIso).getTime();
  return t >= new Date(window.startIso).getTime() && t <= new Date(window.endIso).getTime();
}
