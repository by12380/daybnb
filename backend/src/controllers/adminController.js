const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");

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

/**
 * GET /api/admin/analytics?period=6m
 * Comprehensive analytics for the admin dashboard.
 * period: "7d" | "30d" | "6m" | "all" (default "6m")
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const period = req.query.period || "6m";
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  let periodStart = null;
  if (period === "7d") {
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
  } else if (period === "30d") {
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);
  } else if (period === "6m") {
    periodStart = new Date(now);
    periodStart.setMonth(periodStart.getMonth() - 6);
  }
  const periodFilter = periodStart ? periodStart.toISOString().split("T")[0] : null;

  // Fetch all bookings (within period if set) — we aggregate in JS for flexibility
  let bookingsQuery = supabaseAdmin
    .from("bookings")
    .select("id, room_id, user_id, booking_date, total_price, status, payment_status, payment_method, checked_in_at, checked_out_at, created_at");
  if (periodFilter) {
    bookingsQuery = bookingsQuery.gte("created_at", periodFilter);
  }
  const { data: bookings, error: bErr } = await bookingsQuery;
  if (bErr) throw ApiError.internal(bErr.message);

  // Fetch rooms with owner info
  const { data: rooms, error: rErr } = await supabaseAdmin
    .from("rooms")
    .select("id, title, owner_id, image");
  if (rErr) throw ApiError.internal(rErr.message);

  // Fetch owner profiles
  const { data: owners, error: oErr } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("user_type", ROLES.OWNER);
  if (oErr) throw ApiError.internal(oErr.message);

  const roomsMap = {};
  (rooms || []).forEach((r) => { roomsMap[r.id] = r; });
  const ownersMap = {};
  (owners || []).forEach((o) => { ownersMap[o.id] = o; });

  const all = bookings || [];

  // ── Revenue metrics ──────────────────────────────
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const totalRevenue = all.reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueThisMonth = all
    .filter((b) => b.created_at >= thisMonthStart)
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueLastMonth = all
    .filter((b) => b.created_at >= lastMonthStart && b.created_at < lastMonthEnd)
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueGrowth = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : revenueThisMonth > 0 ? 100 : 0;

  let revenueOnline = 0;
  let revenueCash = 0;
  all.forEach((b) => {
    if (b.payment_method === "cash" || b.payment_method === "pay_at_property") {
      revenueCash += b.total_price || 0;
    } else {
      revenueOnline += b.total_price || 0;
    }
  });

  // ── Booking funnel ───────────────────────────────
  const funnel = { total: all.length, approved: 0, confirmed: 0, checked_in: 0, checked_out: 0, rejected: 0, cancelled: 0, no_show: 0, pending: 0 };
  all.forEach((b) => {
    const s = b.status;
    if (s === "pending") funnel.pending++;
    if (s === "approved" || s === "confirmed" || s === "checked_in" || s === "checked_out") funnel.approved++;
    if (s === "confirmed" || s === "checked_in" || s === "checked_out") funnel.confirmed++;
    if (s === "checked_in" || s === "checked_out") funnel.checked_in++;
    if (s === "checked_out") funnel.checked_out++;
    if (s === "rejected") funnel.rejected++;
    if (s === "cancelled") funnel.cancelled++;
    if (s === "no_show") funnel.no_show++;
    // Auto-detect no-show: past approved/confirmed bookings with no check-in
    if ((s === "approved" || s === "confirmed") && b.booking_date < today && !b.checked_in_at) {
      funnel.no_show++;
    }
  });

  const nonCancelled = all.filter((b) => b.status !== "cancelled" && b.status !== "rejected").length;
  const completionRate = nonCancelled > 0 ? Math.round((funnel.checked_out / nonCancelled) * 100) : 0;

  // ── Payment breakdown ────────────────────────────
  const payment = { paid: 0, pending: 0, failed: 0, expired: 0, pay_at_property: 0 };
  all.forEach((b) => {
    const ps = b.payment_status || "pending";
    const pm = b.payment_method || "online";
    if (ps === "paid") payment.paid++;
    else if (ps === "failed") payment.failed++;
    else if (ps === "expired") payment.expired++;
    else if (pm === "cash" || pm === "pay_at_property" || ps === "pay_at_property") payment.pay_at_property++;
    else payment.pending++;
  });

  // ── Time-series (monthly) ────────────────────────
  const monthlyMap = {};
  all.forEach((b) => {
    const month = (b.created_at || b.booking_date || "").slice(0, 7); // "YYYY-MM"
    if (!month) return;
    if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, bookings: 0 };
    monthlyMap[month].revenue += b.total_price || 0;
    monthlyMap[month].bookings++;
  });
  const timeSeries = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // ── Top rooms by revenue ─────────────────────────
  const roomRevMap = {};
  all.forEach((b) => {
    if (!roomRevMap[b.room_id]) roomRevMap[b.room_id] = { revenue: 0, bookings: 0 };
    roomRevMap[b.room_id].revenue += b.total_price || 0;
    roomRevMap[b.room_id].bookings++;
  });
  const topRooms = Object.entries(roomRevMap)
    .map(([roomId, data]) => ({
      room_id: roomId,
      title: roomsMap[roomId]?.title || "Unknown Room",
      image: roomsMap[roomId]?.image || null,
      revenue: data.revenue,
      bookings: data.bookings,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Top owners by revenue ────────────────────────
  const ownerRevMap = {};
  all.forEach((b) => {
    const room = roomsMap[b.room_id];
    const ownerId = room?.owner_id;
    if (!ownerId) return;
    if (!ownerRevMap[ownerId]) ownerRevMap[ownerId] = { revenue: 0, bookings: 0, checked_out: 0, no_show: 0, total_valid: 0 };
    ownerRevMap[ownerId].revenue += b.total_price || 0;
    ownerRevMap[ownerId].bookings++;
    if (b.status !== "cancelled" && b.status !== "rejected") {
      ownerRevMap[ownerId].total_valid++;
      if (b.status === "checked_out") ownerRevMap[ownerId].checked_out++;
      if (b.status === "no_show" || ((b.status === "approved" || b.status === "confirmed") && b.booking_date < today && !b.checked_in_at)) {
        ownerRevMap[ownerId].no_show++;
      }
    }
  });
  const topOwners = Object.entries(ownerRevMap)
    .map(([ownerId, data]) => ({
      owner_id: ownerId,
      name: ownersMap[ownerId]?.full_name || ownersMap[ownerId]?.email || "Unknown",
      revenue: data.revenue,
      bookings: data.bookings,
      completion_rate: data.total_valid > 0 ? Math.round((data.checked_out / data.total_valid) * 100) : 0,
      no_show_rate: data.total_valid > 0 ? Math.round((data.no_show / data.total_valid) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Today's snapshot ─────────────────────────────
  const todayBookings = all.filter((b) => b.booking_date === today).length;
  const todayCheckIns = all.filter((b) => b.checked_in_at && b.checked_in_at.startsWith(today)).length;
  const todayCheckOuts = all.filter((b) => b.checked_out_at && b.checked_out_at.startsWith(today)).length;

  // ── Active rooms this month ──────────────────────
  const activeRoomIds = new Set(
    all.filter((b) => b.created_at >= thisMonthStart).map((b) => b.room_id)
  );

  res.json({
    revenue: {
      total: totalRevenue,
      this_month: revenueThisMonth,
      last_month: revenueLastMonth,
      growth_percent: revenueGrowth,
      online: revenueOnline,
      cash: revenueCash,
    },
    funnel,
    completion_rate: completionRate,
    payment,
    time_series: timeSeries,
    top_rooms: topRooms,
    top_owners: topOwners,
    today: {
      bookings: todayBookings,
      check_ins: todayCheckIns,
      check_outs: todayCheckOuts,
    },
    totals: {
      bookings: all.length,
      rooms: (rooms || []).length,
      active_rooms: activeRoomIds.size,
      owners: (owners || []).length,
    },
  });
});
