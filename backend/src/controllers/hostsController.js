const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/hosts
 * Public listing of owners with host profiles.
 * Supports ?search, ?superhost=true, ?limit, ?offset
 */
exports.listHosts = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { search, superhost, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, avatar_url, cover_photo_url, bio, city, state_region, country, " +
      "languages, specialties, response_time, response_rate, is_superhost, " +
      "identity_verified, years_hosting, host_since, accepts_cohosts, created_at",
      { count: "exact" }
    )
    .eq("user_type", "owner")
    .order("is_superhost", { ascending: false })
    .order("years_hosting", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (superhost === "true") {
    query = query.eq("is_superhost", true);
  }

  if (search?.trim()) {
    query = query.or(
      `full_name.ilike.%${search}%,city.ilike.%${search}%,bio.ilike.%${search}%,specialties.cs.{${search}}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  // For each host, fetch their room count and aggregate review stats
  const hostIds = (data || []).map((h) => h.id);
  let roomCounts = {};
  let reviewStats = {};

  if (hostIds.length > 0) {
    // Room counts per owner
    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("owner_id")
      .in("owner_id", hostIds);

    (rooms || []).forEach((r) => {
      roomCounts[r.owner_id] = (roomCounts[r.owner_id] || 0) + 1;
    });

    // Review stats: get room IDs for these owners, then aggregate reviews
    const { data: ownerRooms } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id")
      .in("owner_id", hostIds);

    const roomIdToOwner = {};
    (ownerRooms || []).forEach((r) => { roomIdToOwner[r.id] = r.owner_id; });

    const allRoomIds = Object.keys(roomIdToOwner);
    if (allRoomIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from("reviews")
        .select("room_id, rating")
        .in("room_id", allRoomIds);

      (reviews || []).forEach((r) => {
        const oid = roomIdToOwner[r.room_id];
        if (!oid) return;
        if (!reviewStats[oid]) reviewStats[oid] = { total: 0, sum: 0 };
        reviewStats[oid].total++;
        reviewStats[oid].sum += r.rating;
      });
    }
  }

  const hosts = (data || []).map((h) => {
    const stats = reviewStats[h.id];
    return {
      ...h,
      listing_count: roomCounts[h.id] || 0,
      review_count: stats?.total || 0,
      rating: stats ? Math.round((stats.sum / stats.total) * 100) / 100 : 0,
      location: [h.city, h.state_region].filter(Boolean).join(", ") || null,
    };
  });

  res.json({ hosts, total: count });
});

/**
 * GET /api/hosts/:hostId
 * Public host profile with listings and reviews.
 */
exports.getHost = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: host, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, avatar_url, cover_photo_url, bio, city, state_region, country, " +
      "languages, specialties, response_time, response_rate, is_superhost, " +
      "identity_verified, years_hosting, host_since, accepts_cohosts, created_at"
    )
    .eq("id", req.params.hostId)
    .eq("user_type", "owner")
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!host) throw ApiError.notFound("Host not found");

  // Fetch host's rooms
  const { data: rooms } = await supabaseAdmin
    .from("rooms")
    .select("id, title, location, image, images, price_per_day, guests, type")
    .eq("owner_id", host.id)
    .order("created_at", { ascending: false });

  // Fetch reviews for host's rooms
  const roomIds = (rooms || []).map((r) => r.id);
  let reviews = [];
  let reviewStats = { total: 0, sum: 0 };

  if (roomIds.length > 0) {
    const { data: reviewData } = await supabaseAdmin
      .from("reviews")
      .select("id, room_id, user_id, rating, comment, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(10);

    reviews = reviewData || [];
    reviewStats.total = reviews.length;
    reviewStats.sum = reviews.reduce((s, r) => s + r.rating, 0);

    // Get reviewer profiles
    const reviewerIds = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))];
    if (reviewerIds.length > 0) {
      const { data: reviewers } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", reviewerIds);

      const reviewerMap = {};
      (reviewers || []).forEach((p) => { reviewerMap[p.id] = p; });

      reviews = reviews.map((r) => ({
        ...r,
        reviewer: reviewerMap[r.user_id] || null,
      }));
    }

    // Get full review count
    const { count: fullCount } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("room_id", roomIds);
    reviewStats.total = fullCount || reviews.length;

    // Get accurate average
    if (reviewStats.total > 0) {
      const { data: allRatings } = await supabaseAdmin
        .from("reviews")
        .select("rating")
        .in("room_id", roomIds);
      reviewStats.sum = (allRatings || []).reduce((s, r) => s + r.rating, 0);
    }
  }

  // Fetch accepted co-hosts
  const { data: coHosts } = await supabaseAdmin
    .from("co_hosts")
    .select("co_host_id")
    .eq("owner_id", host.id)
    .eq("status", "accepted");

  let coHostProfiles = [];
  if (coHosts?.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, is_superhost")
      .in("id", coHosts.map((c) => c.co_host_id));
    coHostProfiles = profiles || [];
  }

  res.json({
    host: {
      ...host,
      location: [host.city, host.state_region].filter(Boolean).join(", ") || null,
      listing_count: (rooms || []).length,
      review_count: reviewStats.total,
      rating: reviewStats.total > 0 ? Math.round((reviewStats.sum / reviewStats.total) * 100) / 100 : 0,
    },
    listings: rooms || [],
    reviews,
    co_hosts: coHostProfiles,
  });
});
