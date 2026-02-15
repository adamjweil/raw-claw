/**
 * Converts a 5-part cron expression into a human-readable description.
 *
 * Handles:
 *  - Interval patterns:  `* /15 * * * *`  → "Every 15 minutes"
 *  - Single times:       `0 9 * * *`      → "Every day at 9:00 AM"
 *  - Multiple hours:     `0 9,13,17,21 * * *` → "Every day at 9:00 AM, 1:00 PM, 5:00 PM & 9:00 PM"
 *  - Day-of-week:        `0 9 * * 1`      → "Every Monday at 9:00 AM"
 *  - Day-of-month:       `0 9 15 * *`     → "On the 15th of every month at 9:00 AM"
 */

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Format a 24-h value + minutes into "9:00 AM" style. */
function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** Join a list with commas and "&" before the last item. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;
}

/** Ordinal suffix: 1→"1st", 2→"2nd", 15→"15th" */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [min, hour, dom, , dow] = parts;

  // ── Interval patterns ────────────────────────────────────────────
  if (min.startsWith('*/')) {
    const interval = parseInt(min.slice(2), 10);
    if (interval === 1) return 'Every minute';
    return `Every ${interval} minutes`;
  }
  if (hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2), 10);
    if (interval === 1) return 'Every hour';
    return `Every ${interval} hours`;
  }
  if (min === '*' && hour === '*') {
    return 'Every minute';
  }

  // ── Build time description ───────────────────────────────────────
  const minutes = min === '*' ? 0 : parseInt(min, 10);
  let timeDesc = '';

  if (hour !== '*') {
    const hours = hour.split(',').map((h) => parseInt(h, 10)).filter((h) => !isNaN(h));
    if (hours.length === 1) {
      timeDesc = `at ${formatTime(hours[0], minutes)}`;
    } else {
      const times = hours.map((h) => formatTime(h, minutes));
      timeDesc = `at ${joinList(times)}`;
    }
  } else if (min !== '*') {
    // e.g. "30 * * * *" → every hour at minute 30
    timeDesc = `every hour at minute ${minutes}`;
  }

  // ── Build day description ────────────────────────────────────────
  let dayDesc = '';

  if (dow !== '*') {
    const dayIndices = dow.split(',').map((d) => parseInt(d, 10));
    const dayNames = dayIndices
      .filter((d) => d >= 0 && d <= 6)
      .map((d) => WEEKDAYS[d]);

    if (dayNames.length > 0) {
      dayDesc = `Every ${joinList(dayNames)}`;
    }
  } else if (dom !== '*') {
    const days = dom.split(',').map((d) => parseInt(d, 10)).filter((d) => !isNaN(d));
    if (days.length === 1) {
      dayDesc = `On the ${ordinal(days[0])} of every month`;
    } else {
      dayDesc = `On the ${joinList(days.map(ordinal))} of every month`;
    }
  } else {
    dayDesc = 'Every day';
  }

  // ── Combine ──────────────────────────────────────────────────────
  if (timeDesc && dayDesc) {
    return `${dayDesc} ${timeDesc}`;
  }
  return dayDesc || timeDesc || cron;
}

