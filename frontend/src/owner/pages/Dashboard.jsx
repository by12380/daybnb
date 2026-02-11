import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchOwnerStats } from "../../redux/slices/ownerSlice.js";

const StatCard = React.memo(({ title, value, subtitle, icon, color = "emerald" }) => {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
});

export default function OwnerDashboard() {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((state) => state.owner);

  useEffect(() => {
    dispatch(fetchOwnerStats());
  }, [dispatch]);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Welcome back! Here's an overview of your properties.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Rooms"
          value={stats?.total_rooms ?? 0}
          subtitle="Listed properties"
          color="emerald"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          title="Total Bookings"
          value={stats?.total_bookings ?? 0}
          subtitle="On your properties"
          color="blue"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Pending"
          value={stats?.pending_bookings ?? 0}
          subtitle="Awaiting approval"
          color="orange"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Customers"
          value={stats?.total_customers ?? 0}
          subtitle="Unique guests"
          color="purple"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/owner/rooms" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
          <div><p className="font-semibold text-ink">Manage Rooms</p><p className="text-sm text-muted">Add and edit your listings</p></div>
        </Link>
        <Link to="/owner/bookings" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
          <div><p className="font-semibold text-ink">Manage Bookings</p><p className="text-sm text-muted">Approve or reject reservations</p></div>
        </Link>
        <Link to="/owner/customers" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
          <div><p className="font-semibold text-ink">View Customers</p><p className="text-sm text-muted">See who's booked your rooms</p></div>
        </Link>
      </div>
    </div>
  );
}
