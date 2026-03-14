import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatPrice } from "../../guest/utils/format.js";
import { useTheme } from "../../theme/ThemeProvider.jsx";
import api from "../../redux/api.js";

const PERIODS = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "6m", label: "6 Months" },
  { key: "all", label: "All Time" },
];

const CHART_COLORS = {
  brand: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  purple: "#8b5cf6",
  red: "#ef4444",
  amber: "#f59e0b",
  gray: "#6b7280",
  cyan: "#06b6d4",
};

const PIE_COLORS_PAYMENT = [CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red, CHART_COLORS.gray, CHART_COLORS.amber];
const PIE_COLORS_METHOD = [CHART_COLORS.brand, CHART_COLORS.amber];

function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return useMemo(() => ({
    isDark,
    gridColor: isDark ? "rgba(148,163,184,0.1)" : "rgba(100,116,139,0.12)",
    textColor: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipText: isDark ? "#e2e8f0" : "#0f172a",
  }), [isDark]);
}

/* ── Stat Card ──────────────────────────────────────── */
const StatCard = React.memo(({ title, value, subtitle, icon, color = "brand", trend }) => {
  const colorClasses = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          <div className="mt-1 flex items-center gap-2">
            {trend != null && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                <svg className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
                {Math.abs(trend)}%
              </span>
            )}
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
});

/* ── Chart Tooltip ──────────────────────────────────── */
function ChartTooltipContent({ active, payload, label, formatter }) {
  const ct = useChartTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-lg" style={{ background: ct.tooltipBg, borderColor: ct.tooltipBorder }}>
      <p className="mb-1 text-xs font-medium" style={{ color: ct.textColor }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ── Revenue Chart ──────────────────────────────────── */
const RevenueChart = React.memo(({ data }) => {
  const ct = useChartTheme();
  if (!data?.length) return <EmptyChart label="No revenue data yet" />;

  const formatted = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-ink">Revenue Over Time</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: ct.textColor }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="revenue" tick={{ fontSize: 12, fill: ct.textColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <YAxis yAxisId="bookings" orientation="right" tick={{ fontSize: 12, fill: ct.textColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent formatter={(v) => typeof v === "number" && v > 100 ? formatPrice(v) : v} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: ct.textColor }} />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.brand} strokeWidth={2.5} fill="url(#revenueGrad)" />
            <Area yAxisId="bookings" type="monotone" dataKey="bookings" name="Bookings" stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#bookingsGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

/* ── Booking Funnel ─────────────────────────────────── */
const BookingFunnel = React.memo(({ funnel }) => {
  if (!funnel) return null;

  const stages = [
    { key: "total", label: "Created", color: CHART_COLORS.brand },
    { key: "approved", label: "Approved", color: CHART_COLORS.cyan },
    { key: "confirmed", label: "Confirmed", color: CHART_COLORS.purple },
    { key: "checked_in", label: "Checked In", color: CHART_COLORS.amber },
    { key: "checked_out", label: "Checked Out", color: CHART_COLORS.green },
  ];

  const dropOffs = [
    { label: "Pending", value: funnel.pending, color: CHART_COLORS.amber },
    { label: "Rejected", value: funnel.rejected, color: CHART_COLORS.red },
    { label: "Cancelled", value: funnel.cancelled, color: CHART_COLORS.orange },
    { label: "No-Show", value: funnel.no_show, color: CHART_COLORS.gray },
  ];

  const maxVal = funnel.total || 1;

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-ink">Booking Funnel</h2>
      <p className="mb-5 text-xs text-muted">How bookings progress through each stage</p>
      <div className="space-y-3">
        {stages.map((stage) => {
          const val = funnel[stage.key] || 0;
          const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
          return (
            <div key={stage.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{stage.label}</span>
                <span className="text-muted">{val} <span className="text-xs">({pct}%)</span></span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
        {dropOffs.map((d) => (
          <div key={d.label} className="text-center">
            <p className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</p>
            <p className="text-xs text-muted">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── Payment Donuts ─────────────────────────────────── */
const PaymentCharts = React.memo(({ payment, revenue }) => {
  const ct = useChartTheme();

  const statusData = payment ? [
    { name: "Paid", value: payment.paid },
    { name: "Pending", value: payment.pending },
    { name: "Failed", value: payment.failed },
    { name: "Expired", value: payment.expired },
    { name: "Pay at Property", value: payment.pay_at_property },
  ].filter((d) => d.value > 0) : [];

  const methodData = revenue ? [
    { name: "Online (Stripe)", value: revenue.online },
    { name: "Cash / At Property", value: revenue.cash },
  ].filter((d) => d.value > 0) : [];

  const renderPieLabel = (labelColor) => ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={labelColor} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontWeight={500}>
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Payment Status</h2>
        {statusData.length === 0 ? <EmptyChart label="No payment data" /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={renderPieLabel(ct.textColor)} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS_PAYMENT[i % PIE_COLORS_PAYMENT.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 8, color: ct.tooltipText }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Revenue by Method</h2>
        {methodData.length === 0 ? <EmptyChart label="No revenue data" /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={renderPieLabel(ct.textColor)} labelLine={false}>
                  {methodData.map((_, i) => <Cell key={i} fill={PIE_COLORS_METHOD[i % PIE_COLORS_METHOD.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 8, color: ct.tooltipText }} formatter={(v) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});

/* ── Owner Performance ──────────────────────────────── */
const OwnerPerformance = React.memo(({ owners }) => {
  if (!owners?.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-panel shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Owner Performance</h2>
          <p className="text-xs text-muted">Top owners ranked by revenue</p>
        </div>
        <Link to="/admin/owners" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3 text-right">Revenue</th>
              <th className="px-6 py-3 text-right">Bookings</th>
              <th className="px-6 py-3 text-right">Completion</th>
              <th className="px-6 py-3 text-right">No-Show</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner, i) => (
              <tr key={owner.owner_id} className="border-b border-border last:border-0 hover:bg-surface/60">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {i + 1}
                    </div>
                    <span className="font-medium text-ink">{owner.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-ink">{formatPrice(owner.revenue)}</td>
                <td className="px-6 py-4 text-right text-sm text-ink">{owner.bookings}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${owner.completion_rate >= 50 ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                    {owner.completion_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${owner.no_show_rate > 10 ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-surface/60 text-muted"}`}>
                    {owner.no_show_rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ── Top Rooms ──────────────────────────────────────── */
const TopRooms = React.memo(({ rooms }) => {
  const ct = useChartTheme();
  if (!rooms?.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Top Performing Rooms</h2>
          <p className="text-xs text-muted">By total revenue</p>
        </div>
        <Link to="/admin/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rooms} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.gridColor} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: ct.textColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <YAxis type="category" dataKey="title" tick={{ fontSize: 11, fill: ct.textColor }} axisLine={false} tickLine={false} width={120} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "..." : v} />
            <Tooltip content={<ChartTooltipContent formatter={(v) => formatPrice(v)} />} />
            <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.brand} radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

/* ── Empty State ────────────────────────────────────── */
function EmptyChart({ label }) {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────── */
function formatMonthLabel(month) {
  if (!month) return "";
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/* ── Icons ──────────────────────────────────────────── */
const RevenueIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const BookingsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const CompletionIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const RoomsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);

/* ── Main Dashboard ─────────────────────────────────── */
export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("6m");

  const fetchAnalytics = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/analytics", { params: { period: p } });
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={() => fetchAnalytics(period)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { revenue, funnel, completion_rate, payment, time_series, top_rooms, top_owners, today, totals } = analytics;

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {today.bookings > 0 ? `${today.bookings} booking${today.bookings > 1 ? "s" : ""} today` : "No bookings today"}
            {today.check_ins > 0 && ` · ${today.check_ins} check-in${today.check_ins > 1 ? "s" : ""}`}
            {today.check_outs > 0 && ` · ${today.check_outs} check-out${today.check_outs > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-surface/60 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${period === p.key ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section A: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatPrice(revenue.this_month)}
          subtitle="this month"
          trend={revenue.growth_percent}
          color="green"
          icon={<RevenueIcon />}
        />
        <StatCard
          title="Total Bookings"
          value={totals.bookings}
          subtitle={today.bookings > 0 ? `${today.bookings} today` : "in selected period"}
          color="brand"
          icon={<BookingsIcon />}
        />
        <StatCard
          title="Completion Rate"
          value={`${completion_rate}%`}
          subtitle="bookings fully checked out"
          color="purple"
          icon={<CompletionIcon />}
        />
        <StatCard
          title="Active Rooms"
          value={totals.active_rooms}
          subtitle={`${totals.rooms} total listed`}
          color="orange"
          icon={<RoomsIcon />}
        />
      </div>

      {/* Section B: Revenue Chart */}
      <RevenueChart data={time_series} />

      {/* Section C: Booking Funnel */}
      <BookingFunnel funnel={funnel} />

      {/* Section D: Payment Charts */}
      <PaymentCharts payment={payment} revenue={revenue} />

      {/* Section E: Owner Performance */}
      <OwnerPerformance owners={top_owners} />

      {/* Section F: Top Rooms */}
      <TopRooms rooms={top_rooms} />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/bookings" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-900/20">
          <div className="rounded-xl bg-brand-100 p-3 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"><BookingsIcon /></div>
          <div><p className="font-semibold text-ink">Manage Bookings</p><p className="text-sm text-muted">View and edit all reservations</p></div>
        </Link>
        <Link to="/admin/check-in-out" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20">
          <div className="rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400"><CompletionIcon /></div>
          <div><p className="font-semibold text-ink">Check-In / Out</p><p className="text-sm text-muted">Manage today's guest arrivals</p></div>
        </Link>
        <Link to="/admin/booking-history" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div><p className="font-semibold text-ink">Booking History</p><p className="text-sm text-muted">No-shows, cancellations, completed</p></div>
        </Link>
      </div>
    </div>
  );
}
