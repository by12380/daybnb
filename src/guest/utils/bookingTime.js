function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return clamp(h, 0, 23) * 60 + clamp(m, 0, 59);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function minutesToTimeValue(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function minutesToLabel(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  const mm = pad2(m);
  return `${h12}:${mm} ${suffix}`;
}

export function buildTimeOptions({ start, end, stepMinutes }) {
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);
  const step = Math.max(5, Number(stepMinutes) || 30);
  const out = [];
  for (let m = startM; m <= endM; m += step) {
    out.push({ value: minutesToTimeValue(m), label: minutesToLabel(m), minutes: m });
  }
  return out;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  // Treat ranges as [start, end) so touching edges do not overlap.
  return aStart < bEnd && bStart < aEnd;
}

export function bookingRowToInterval(row) {
  if (!row) return null;
  const start = parseTimeToMinutes(row.start_time);
  const end = parseTimeToMinutes(row.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (end <= start) return null;
  return { start, end, id: row.id };
}

export function bookingsToIntervals(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(bookingRowToInterval)
    .filter(Boolean);
}

export function rangeOverlapsAny(start, end, intervals) {
  return (Array.isArray(intervals) ? intervals : []).some((it) =>
    rangesOverlap(start, end, it.start, it.end)
  );
}

export function startHasAnyValidEnd({
  start,
  minEnd,
  maxEnd,
  stepMinutes,
  intervals,
}) {
  const step = Math.max(5, Number(stepMinutes) || 30);
  const firstEnd = Math.max(minEnd, start + step);
  for (let end = firstEnd; end <= maxEnd; end += step) {
    if (!rangeOverlapsAny(start, end, intervals)) return true;
  }
  return false;
}

