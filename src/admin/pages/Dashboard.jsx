import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient.js";
import { formatPrice } from "../../guest/utils/format.js";

const StatCard = React.memo(({ title, value, subtitle, icon, color = "brand" }) => {
  const colorClasses = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

const RecentBookingRow = React.memo(({ booking }) => {
  const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
  const statusColor = isPast ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700";
  const statusText = isPast ? "Completed" : "Upcoming";

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          {booking.room?.image && (
            <img
              src={booking.room.image}
              alt={booking.room?.title || "Room"}
              className="h-10 w-10 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="font-medium text-ink">{booking.room?.title || "Unknown Room"}</p>
            <p className="text-xs text-muted">{booking.room?.location || "N/A"}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <p className="text-sm text-ink">{booking.user_full_name || "Guest"}</p>
        <p className="text-xs text-muted">{booking.user_email || "N/A"}</p>
      </td>
      <td className="py-3 pr-4">
        <p className="text-sm text-ink">
          {new Date(booking.booking_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {statusText}
        </span>
      </td>
      <td className="py-3 text-right">
        <span className="font-medium text-ink">{formatPrice(booking.total_price || 0)}</span>
      </td>
    </tr>
  );
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalRooms: 0,
    upcomingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    try {
      // Fetch all bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
      }

      const bookings = bookingsData || [];
      console.log("Fetched bookings:", bookings);

      // Fetch all rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*");

      if (roomsError) {
        console.error("Error fetching rooms:", roomsError);
      }

      console.log("Fetched rooms:", roomsData);

      // Create rooms lookup map
      const roomsMap = {};
      (roomsData || []).forEach((room) => {
        roomsMap[room.id] = room;
      });

      console.log("Rooms map keys:", Object.keys(roomsMap));

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      console.log("Fetched profiles:", profilesData);

      // Create profiles lookup map
      const profilesMap = {};
      (profilesData || []).forEach((profile) => {
        profilesMap[profile.id] = profile;
      });

      // Enrich bookings with room and user data
      const enrichedBookings = bookings.map((booking) => {
        const room = roomsMap[booking.room_id] || null;
        const user = profilesMap[booking.user_id] || null;
        console.log(`Booking ${booking.id}: room_id=${booking.room_id}, found room=${!!room}, user_id=${booking.user_id}, found user=${!!user}`);
        return {
          ...booking,
          room,
          user,
        };
      });

      const today = new Date().toISOString().split("T")[0];
      const upcomingCount = bookings.filter(
        (b) => b.booking_date >= today
      ).length;

      const totalRevenue = bookings.reduce(
        (sum, b) => sum + (b.total_price || 0),
        0
      );

      setStats({
        totalBookings: bookings.length,
        totalRevenue,
        totalUsers: (profilesData || []).length,
        totalRooms: (roomsData || []).length,
        upcomingBookings: upcomingCount,
      });

      // Keep a small recent slice for the table
      setRecentBookings(enrichedBookings.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Welcome back! Here's what's happening with your properties.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          subtitle={`${stats.upcomingBookings} upcoming`}
          color="brand"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          subtitle="All time"
          color="green"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered accounts"
          color="purple"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms}
          subtitle="Listed properties"
          color="orange"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/admin/bookings"
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50"
        >
          <div className="rounded-xl bg-brand-100 p-3 text-brand-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink">Manage Bookings</p>
            <p className="text-sm text-muted">View and edit all reservations</p>
          </div>
        </Link>
        <Link
          to="/admin/users"
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50"
        >
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink">Manage Users</p>
            <p className="text-sm text-muted">View user profiles and details</p>
          </div>
        </Link>
        <Link
          to="/admin/rooms"
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50"
        >
          <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink">Manage Rooms</p>
            <p className="text-sm text-muted">Add, edit, or remove listings</p>
          </div>
        </Link>
      </div>

      {/* Recent Bookings Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">Recent Bookings</h2>
          <Link
            to="/admin/bookings"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentBookings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted">No bookings yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="px-6">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {booking.room?.image && (
                          <img
                            src={booking.room.image}
                            alt={booking.room?.title || "Room"}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-ink">{booking.room?.title || "Unknown Room"}</p>
                          <p className="text-xs text-muted">{booking.room?.location || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-ink">
                        {booking.user_full_name || booking.user?.full_name || "Guest"}
                      </p>
                      <p className="text-xs text-muted">
                        {booking.user?.email || booking.user_email || "N/A"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-ink">
                        {new Date(booking.booking_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
                        const statusColor = isPast ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700";
                        const statusText = isPast ? "Completed" : "Upcoming";
                        return (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                            {statusText}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-ink">{formatPrice(booking.total_price || 0)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
