function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function filterRoomsByBookings({ rooms, bookings, startTime, endTime }) {
  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  if (!Array.isArray(rooms) || !rooms.length) return [];
  if (!Array.isArray(bookings) || !bookings.length) return rooms;

  const bookingsByRoomId = new Map();
  for (const b of bookings) {
    if (!b?.room_id) continue;
    const list = bookingsByRoomId.get(b.room_id) || [];
    list.push(b);
    bookingsByRoomId.set(b.room_id, list);
  }

  return rooms.filter((room) => {
    const list = bookingsByRoomId.get(room.id);
    if (!list?.length) return true;

    for (const b of list) {
      const bStart = parseTimeToMinutes(b.start_time);
      const bEnd = parseTimeToMinutes(b.end_time);
      if (rangesOverlap(startM, endM, bStart, bEnd)) return false;
    }

    return true;
  });
}

