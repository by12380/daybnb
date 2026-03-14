const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");

const PERIOD_PRESETS = {
  "7d": { label: "Last 7 days", bucket: "day", days: 6 },
  "30d": { label: "Last 30 days", bucket: "day", days: 29 },
  "6m": { label: "Last 6 months", bucket: "month", months: 5 },
  all: { label: "All time", bucket: "month" },
};

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getPeriodConfig(period, earliestBookingDate) {
  const key = PERIOD_PRESETS[period] ? period : "30d";
  const preset = PERIOD_PRESETS[key];
  const today = new Date();

  if (key === "all") {
    const start = earliestBookingDate
      ? startOfMonth(new Date(earliestBookingDate))
      : startOfMonth(today);
    return {
      key,
      label: preset.label,
      bucket: preset.bucket,
      startDate: start,
      endDate: today,
    };
  }

  if (preset.bucket === "month") {
    const start = startOfMonth(addMonths(today, -preset.months));
    return {
      key,
      label: preset.label,
      bucket: preset.bucket,
      startDate: start,
      endDate: today,
    };
  }

  return {
    key,
    label: preset.label,
    bucket: preset.bucket,
    startDate: addDays(today, -preset.days),
    endDate: today,
  };
}

function buildSeries(config) {
  const items = [];
  const cursor = new Date(config.startDate);
  const end = new Date(config.endDate);

  if (config.bucket === "day") {
    while (cursor <= end) {
      const key = toIsoDate(cursor);
      items.push({
        key,
        label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        bookings: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return items;
  }

  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    items.push({
      key,
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      revenue: 0,
      bookings: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return items;
}

function getSeriesKey(dateLike, bucket) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  if (bucket === "day") return toIsoDate(date);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function deriveBookingStatus(booking, todayKey) {
  if (!booking) return "pending";
  if (booking.checked_out_at || booking.status === "checked_out") return "checked_out";
  if (booking.checked_in_at || booking.status === "checked_in") return "checked_in";
  if (booking.status === "no_show") return "no_show";
  if (
    booking.booking_date &&
    booking.booking_date < todayKey &&
    !booking.checked_in_at &&
    !booking.checked_out_at &&
    ["approved", "confirmed"].includes(booking.status)
  ) {
    return "no_show";
  }
  return booking.status || "pending";
}

function getRecognizedRevenue(booking, derivedStatus) {
  const amount = toAmount(booking.total_price);
  if (amount <= 0) return 0;
  if (["pending", "approved", "cancelled", "rejected"].includes(derivedStatus)) return 0;

  if (booking.payment_method === "pay_at_property") {
    return ["checked_in", "checked_out"].includes(derivedStatus) ? amount : 0;
  }

  if (booking.payment_status === "paid") return amount;
  return ["confirmed", "checked_in", "checked_out", "no_show"].includes(derivedStatus) ? amount : 0;
}

function roundPercent(value) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

/**
 * POST /api/admin/impersonate/:ownerId
 * Start impersonating an owner. Returns the owner's profile so the
 * client can store the owner context and send the `x-impersonate-owner`
 * header on subsequent requests.
 *
 * Only admins can call this.
 */
exports.startImpersonation = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { ownerId } = req.params;

  if (!ownerId) {
    throw ApiError.badRequest("Owner ID is required");
  }

  // Verify the target is a valid owner
  const { data: ownerProfile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", ownerId)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!ownerProfile) throw ApiError.notFound("Owner not found");

  if (ownerProfile.user_type !== ROLES.OWNER) {
    throw ApiError.badRequest(
      "Can only impersonate users with the owner role"
    );
  }

  res.json({
    message: `Now impersonating owner: ${ownerProfile.full_name || ownerProfile.email || ownerId}`,
    owner: ownerProfile,
    impersonation_header: "x-impersonate-owner",
    impersonation_value: ownerId,
  });
});

/**
 * POST /api/admin/stop-impersonate
 * Stop impersonating. This is a convenience endpoint – the client
 * can also just stop sending the `x-impersonate-owner` header.
 *
 * Returns the admin's own profile.
 */
exports.stopImpersonation = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .maybeSingle();

  res.json({
    message: "Impersonation stopped. You are now back as admin.",
    admin: adminProfile || { id: req.user.id, email: req.user.email },
  });
});

/**
 * GET /api/admin/owners
 * List all owner accounts. Admin only.
 * Supports: ?search=name&limit=50&offset=0
 */
exports.listOwners = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { search, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("user_type", ROLES.OWNER)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ owners: data, total: count });
});

/**
 * GET /api/admin/owners/:ownerId
 * Get a single owner's full profile. Admin only.
 */
exports.getOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.params.ownerId)
    .eq("user_type", ROLES.OWNER)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Owner not found");

  res.json({ owner: data });
});

/**
 * PUT /api/admin/owners/:ownerId
 * Update an owner's profile. Admin only.
 */
exports.updateOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { full_name, phone, email } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (email !== undefined) updates.email = email?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.params.ownerId)
    .eq("user_type", ROLES.OWNER)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Owner not found");

  res.json({ owner: data });
});

/**
 * DELETE /api/admin/owners/:ownerId
 * Delete an owner account. Admin only.
 */
exports.deleteOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Verify the target is an owner before deleting
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, user_type")
    .eq("id", req.params.ownerId)
    .maybeSingle();

  if (!profile) throw ApiError.notFound("Owner not found");
  if (profile.user_type !== ROLES.OWNER) {
    throw ApiError.badRequest("Target user is not an owner");
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", req.params.ownerId);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Owner account deleted successfully" });
});

/**
 * PUT /api/admin/users/:userId/role
 * Change a user's role. Admin only.
 * Body: { role: "owner" | "customer" | "admin" }
 */
exports.changeUserRole = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { role } = req.body;
  const validRoles = [ROLES.ADMIN, ROLES.OWNER, ROLES.CUSTOMER];

  if (!role || !validRoles.includes(role)) {
    throw ApiError.badRequest(
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    );
  }

  // Prevent admin from demoting themselves
  if (req.params.userId === req.user.id && role !== ROLES.ADMIN) {
    throw ApiError.badRequest("Cannot change your own admin role");
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ user_type: role, updated_at: new Date().toISOString() })
    .eq("id", req.params.userId)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("User not found");

  res.json({
    message: `User role updated to ${role}`,
    user: data,
  });
});

/**
 * GET /api/admin/analytics
 * Rich analytics payload for the admin dashboard.
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, user_type");

  if (profilesError) throw ApiError.internal(profilesError.message);

  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from("rooms")
    .select("id, title, location, image, owner_id");

  if (roomsError) throw ApiError.internal(roomsError.message);

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id, room_id, user_id, user_email, user_full_name, booking_date, total_price, status, payment_method, payment_status, checked_in_at, checked_out_at, created_at")
    .order("created_at", { ascending: false });

  if (bookingsError) throw ApiError.internal(bookingsError.message);

  const todayKey = toIsoDate(new Date());
  const earliestBookingDate = (bookings || []).reduce((earliest, booking) => {
    if (!booking.booking_date) return earliest;
    if (!earliest || booking.booking_date < earliest) return booking.booking_date;
    return earliest;
  }, null);

  const period = getPeriodConfig(req.query.period, earliestBookingDate);
  const periodStartKey = toIsoDate(period.startDate);

  const profilesMap = {};
  (profiles || []).forEach((profile) => {
    profilesMap[profile.id] = profile;
  });

  const roomsMap = {};
  (rooms || []).forEach((room) => {
    roomsMap[room.id] = room;
  });

  const filteredBookings = (bookings || [])
    .map((booking) => {
      const derivedStatus = deriveBookingStatus(booking, todayKey);
      return {
        ...booking,
        derived_status: derivedStatus,
        recognized_revenue: getRecognizedRevenue(booking, derivedStatus),
      };
    })
    .filter((booking) => {
      if (!periodStartKey) return true;
      const comparisonDate = booking.booking_date || toIsoDate(booking.created_at);
      return !comparisonDate || comparisonDate >= periodStartKey;
    });

  const seriesMap = {};
  const revenueSeries = buildSeries(period);
  revenueSeries.forEach((item) => {
    seriesMap[item.key] = item;
  });

  const funnelCounts = {
    pending: 0,
    approved: 0,
    confirmed: 0,
    checked_in: 0,
    checked_out: 0,
    cancelled: 0,
    rejected: 0,
    no_show: 0,
  };

  const paymentStatusCounts = {};
  const paymentMethodStats = {};
  const ownerStats = {};
  const roomStats = {};

  filteredBookings.forEach((booking) => {
    const status = booking.derived_status;
    const room = roomsMap[booking.room_id] || null;
    const ownerId = room?.owner_id || null;
    const amount = booking.recognized_revenue;

    if (Object.prototype.hasOwnProperty.call(funnelCounts, status)) {
      funnelCounts[status] += 1;
    }

    const seriesKey = getSeriesKey(booking.booking_date || booking.created_at, period.bucket);
    if (seriesKey && seriesMap[seriesKey]) {
      seriesMap[seriesKey].bookings += 1;
      seriesMap[seriesKey].revenue += amount;
    }

    const paymentStatus = booking.payment_status || "unknown";
    paymentStatusCounts[paymentStatus] = (paymentStatusCounts[paymentStatus] || 0) + 1;

    const paymentMethod = booking.payment_method || "unknown";
    if (!paymentMethodStats[paymentMethod]) {
      paymentMethodStats[paymentMethod] = { bookings: 0, revenue: 0 };
    }
    paymentMethodStats[paymentMethod].bookings += 1;
    paymentMethodStats[paymentMethod].revenue += amount;

    if (!room) return;

    if (!roomStats[room.id]) {
      roomStats[room.id] = {
        room_id: room.id,
        room_title: room.title || "Untitled Room",
        location: room.location || null,
        image: room.image || null,
        bookings: 0,
        revenue: 0,
        checked_out: 0,
        cancelled: 0,
      };
    }

    roomStats[room.id].bookings += 1;
    roomStats[room.id].revenue += amount;
    if (status === "checked_out") roomStats[room.id].checked_out += 1;
    if (status === "cancelled") roomStats[room.id].cancelled += 1;

    if (!ownerId) return;

    if (!ownerStats[ownerId]) {
      const ownerProfile = profilesMap[ownerId] || {};
      ownerStats[ownerId] = {
        owner_id: ownerId,
        owner_name: ownerProfile.full_name || ownerProfile.email || "Owner",
        owner_email: ownerProfile.email || null,
        bookings: 0,
        revenue: 0,
        checked_out: 0,
        no_show: 0,
        cancelled: 0,
        active_rooms: new Set(),
      };
    }

    ownerStats[ownerId].bookings += 1;
    ownerStats[ownerId].revenue += amount;
    ownerStats[ownerId].active_rooms.add(room.id);
    if (status === "checked_out") ownerStats[ownerId].checked_out += 1;
    if (status === "no_show") ownerStats[ownerId].no_show += 1;
    if (status === "cancelled") ownerStats[ownerId].cancelled += 1;
  });

  const totalRevenue = filteredBookings.reduce(
    (sum, booking) => sum + booking.recognized_revenue,
    0
  );
  const actionableBookings = filteredBookings.filter((booking) =>
    ["approved", "confirmed", "checked_in", "checked_out", "no_show"].includes(booking.derived_status)
  );
  const completedBookings = actionableBookings.filter(
    (booking) => booking.derived_status === "checked_out"
  ).length;
  const cancelledBookings = filteredBookings.filter(
    (booking) => booking.derived_status === "cancelled"
  ).length;
  const noShowBookings = filteredBookings.filter(
    (booking) => booking.derived_status === "no_show"
  ).length;
  const paidNoShowBookings = filteredBookings.filter(
    (booking) => booking.derived_status === "no_show" && booking.payment_status === "paid"
  ).length;

  const activeRooms = new Set(
    filteredBookings
      .filter((booking) => !["cancelled", "rejected"].includes(booking.derived_status))
      .map((booking) => booking.room_id)
      .filter(Boolean)
  ).size;

  const now = new Date();
  const thisMonthKey = getSeriesKey(now, "month");
  const lastMonthKey = getSeriesKey(addMonths(now, -1), "month");
  const monthlyRevenue = {};

  (bookings || []).forEach((booking) => {
    const status = deriveBookingStatus(booking, todayKey);
    const key = getSeriesKey(booking.booking_date || booking.created_at, "month");
    if (!key) return;
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + getRecognizedRevenue(booking, status);
  });

  const revenueThisMonth = monthlyRevenue[thisMonthKey] || 0;
  const revenueLastMonth = monthlyRevenue[lastMonthKey] || 0;
  const revenueGrowthPct = revenueLastMonth
    ? roundPercent(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : revenueThisMonth > 0
      ? 100
      : 0;

  const totalOwners = (profiles || []).filter((profile) => profile.user_type === ROLES.OWNER).length;
  const totalCustomers = (profiles || []).filter((profile) => profile.user_type === ROLES.CUSTOMER).length;
  const totalUsers = (profiles || []).length;
  const totalRooms = (rooms || []).length;

  const bookingsToday = (bookings || []).filter((booking) => booking.booking_date === todayKey).length;
  const checkInsToday = (bookings || []).filter(
    (booking) => toIsoDate(booking.checked_in_at) === todayKey
  ).length;
  const checkOutsToday = (bookings || []).filter(
    (booking) => toIsoDate(booking.checked_out_at) === todayKey
  ).length;
  const pendingBookings = filteredBookings.filter(
    (booking) => booking.derived_status === "pending"
  ).length;

  const topOwners = Object.values(ownerStats)
    .map((owner) => {
      const actionable = owner.bookings - owner.cancelled;
      return {
        owner_id: owner.owner_id,
        owner_name: owner.owner_name,
        owner_email: owner.owner_email,
        bookings: owner.bookings,
        revenue: owner.revenue,
        active_rooms: owner.active_rooms.size,
        completion_rate: actionable ? roundPercent((owner.checked_out / actionable) * 100) : 0,
        no_show_rate: actionable ? roundPercent((owner.no_show / actionable) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, 5);

  const topRooms = Object.values(roomStats)
    .map((room) => ({
      ...room,
      completion_rate: room.bookings ? roundPercent((room.checked_out / room.bookings) * 100) : 0,
      cancellation_rate: room.bookings ? roundPercent((room.cancelled / room.bookings) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, 5);

  const recentBookings = filteredBookings
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.created_at || a.booking_date || 0).getTime();
      const bTime = new Date(b.created_at || b.booking_date || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((booking) => {
      const room = roomsMap[booking.room_id] || null;
      const owner = room?.owner_id ? profilesMap[room.owner_id] : null;
      return {
        id: booking.id,
        booking_date: booking.booking_date,
        created_at: booking.created_at,
        total_price: toAmount(booking.total_price),
        status: booking.derived_status,
        payment_status: booking.payment_status || "unknown",
        guest_name: booking.user_full_name || booking.user_email || "Guest",
        guest_email: booking.user_email || null,
        room: room
          ? {
              id: room.id,
              title: room.title || "Untitled Room",
              location: room.location || null,
              image: room.image || null,
            }
          : null,
        owner: owner
          ? {
              id: owner.id,
              name: owner.full_name || owner.email || "Owner",
              email: owner.email || null,
            }
          : null,
      };
    });

  res.json({
    period: {
      key: period.key,
      label: period.label,
      bucket: period.bucket,
      start_date: periodStartKey,
      end_date: todayKey,
    },
    overview: {
      total_users: totalUsers,
      total_customers: totalCustomers,
      total_owners: totalOwners,
      total_rooms: totalRooms,
      active_rooms: activeRooms,
      total_bookings: filteredBookings.length,
      pending_bookings: pendingBookings,
      total_revenue: totalRevenue,
      revenue_this_month: revenueThisMonth,
      revenue_last_month: revenueLastMonth,
      revenue_growth_pct: revenueGrowthPct,
      completion_rate: actionableBookings.length
        ? roundPercent((completedBookings / actionableBookings.length) * 100)
        : 0,
      cancellation_rate: filteredBookings.length
        ? roundPercent((cancelledBookings / filteredBookings.length) * 100)
        : 0,
      no_show_rate: actionableBookings.length
        ? roundPercent((noShowBookings / actionableBookings.length) * 100)
        : 0,
      paid_no_show_count: paidNoShowBookings,
      bookings_today: bookingsToday,
      check_ins_today: checkInsToday,
      check_outs_today: checkOutsToday,
    },
    funnel: [
      { key: "pending", label: "Pending", count: funnelCounts.pending },
      { key: "approved", label: "Approved", count: funnelCounts.approved },
      { key: "confirmed", label: "Confirmed", count: funnelCounts.confirmed },
      { key: "checked_in", label: "Checked In", count: funnelCounts.checked_in },
      { key: "checked_out", label: "Checked Out", count: funnelCounts.checked_out },
      { key: "cancelled", label: "Cancelled", count: funnelCounts.cancelled },
      { key: "rejected", label: "Rejected", count: funnelCounts.rejected },
      { key: "no_show", label: "No-Show", count: funnelCounts.no_show },
    ],
    revenue_by_period: revenueSeries,
    payment_status_breakdown: Object.entries(paymentStatusCounts).map(([name, value]) => ({
      name,
      value,
    })),
    payment_method_breakdown: Object.entries(paymentMethodStats).map(([name, value]) => ({
      name,
      bookings: value.bookings,
      revenue: value.revenue,
    })),
    top_owners: topOwners,
    top_rooms: topRooms,
    recent_bookings: recentBookings,
  });
});

/**
 * GET /api/admin/dashboard-stats
 * Aggregate stats for admin dashboard.
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Count by role
  const { count: totalOwners } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_type", ROLES.OWNER);

  const { count: totalCustomers } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_type", ROLES.CUSTOMER);

  const { count: totalRooms } = await supabaseAdmin
    .from("rooms")
    .select("id", { count: "exact", head: true });

  const { count: totalBookings } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true });

  res.json({
    stats: {
      total_owners: totalOwners || 0,
      total_customers: totalCustomers || 0,
      total_rooms: totalRooms || 0,
      total_bookings: totalBookings || 0,
    },
  });
});
