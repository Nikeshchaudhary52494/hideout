// Date and time labels for the chat. Pure.

export const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const dayKey = (ts: number) => new Date(ts).toDateString();

/** "Today", "Yesterday", or "Tuesday, 12 December". */
export function dayLabel(ts: number) {
  const d = dayKey(ts);
  if (d === dayKey(Date.now())) return 'Today';
  if (d === dayKey(Date.now() - 864e5)) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Time for today, short date otherwise (chat list). */
export const shortTime = (ts: number) =>
  dayKey(ts) === dayKey(Date.now()) ? fmtTime(ts) : new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
