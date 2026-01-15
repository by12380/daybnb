export function formatTimeRange(start, end) {
  if (!start || !end) return "";
  return `${start} - ${end}`;
}
