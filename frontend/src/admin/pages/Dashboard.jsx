import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "../../guest/utils/format.js";
import api from "../../redux/api.js";
import { useTheme } from "../../theme/ThemeProvider.jsx";

const PERIOD_OPTIONS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "6m", label: "Last 6 months" },
  { key: "all", label: "All time" },
];

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  rejected: "Rejected",
  no_show: "No-Show",
  paid: "Paid",
  pay_at_property: "Pay at property",
};

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatShortDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getGrowthTone(value) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted";
}

function getStatusBadgeClass(status) {
  const classes = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    confirmed: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    checked_in: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    checked_out: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    rejected: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    no_show: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };
  return classes[status] || "bg-surface/70 text-muted";
}

const StatCard = React.memo(function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accent = "brand",
}) {
  const accentClasses = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          {trend && <p className={`mt-3 text-xs font-medium ${trend.tone}`}>{trend.label}</p>}
        </div>
        <div className={`rounded-xl p-3 ${accentClasses[accent]}`}>{icon}</div>
      </div>
    </div>
  );
});

const ChartCard = React.memo(function ChartCard({ title, subtitle, action, children }) {
  return (
    <div className="rounded-2xl border border-border bg-panel shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
});

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-panel px-3 py-2 shadow-lg">
      {label ? <p className="text-sm font-medium text-ink">{label}</p> : null}
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted">{entry.name}</span>
            <span className="font-medium text-ink">
              {formatter ? formatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChartState({ message }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState("30d");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/admin/analytics", { params: { period } });
        if (!ignore) {
          setAnalytics(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load analytics.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      ignore = true;
    };
  }, [period]);

  const chartTheme = useMemo(() => {
    if (theme === "dark") {
      return {
        text: "#e2e8f0",
        muted: "#94a3b8",
        grid: "rgba(148, 163, 184, 0.18)",
        revenue: "#60a5fa",
        bookings: "#a78bfa",
        funnel: "#34d399",
        pie: ["#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#f97316"],
      };
    }

    return {
      text: "#0f172a",
      muted: "#64748b",
      grid: "rgba(148, 163, 184, 0.22)",
      revenue: "#2563eb",
      bookings: "#7c3aed",
      funnel: "#10b981",
      pie: ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316"],
    };
  }, [theme]);

  const overview = analytics?.overview || {};
  const revenueData = analytics?.revenue_by_period || [];
  const funnelData = analytics?.funnel || [];
  const recentBookings = analytics?.recent_bookings || [];
  const topOwners = analytics?.top_owners || [];
  const topRooms = analytics?.top_rooms || [];
  const periodLabel = analytics?.period?.label || "Selected period";

  const paymentStatusData = useMemo(
    () =>
      (analytics?.payment_status_breakdown || []).map((item) => ({
        ...item,
        label: STATUS_LABELS[item.name] || item.name,
      })),
    [analytics]
  );

  const paymentMethodData = useMemo(
    () =>
      (analytics?.payment_method_breakdown || []).map((item) => ({
        ...item,
        label: STATUS_LABELS[item.name] || item.name,
      })),
    [analytics]
  );

  const revenueTrend = {
    label:
      overview.revenue_growth_pct === 0
        ? "Flat vs last month"
        : `${overview.revenue_growth_pct > 0 ? "+" : ""}${overview.revenue_growth_pct || 0}% vs last month`,
    tone: getGrowthTone(overview.revenue_growth_pct || 0),
  };

  if (loading && !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Track revenue, booking quality, and owner performance from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => {
            const active = option.key === period;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "border border-border bg-panel text-muted hover:border-brand-200 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatPrice(overview.total_revenue || 0)}
          subtitle={periodLabel}
          trend={revenueTrend}
          accent="green"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Bookings"
          value={overview.total_bookings || 0}
          subtitle={`${overview.bookings_today || 0} scheduled for today`}
          accent="brand"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Completion Rate"
          value={formatPercent(overview.completion_rate)}
          subtitle={`${formatPercent(overview.no_show_rate)} no-show rate`}
          accent="purple"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Active Rooms"
          value={overview.active_rooms || 0}
          subtitle={`${overview.total_rooms || 0} total listed rooms`}
          accent="orange"
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Pending approvals</p>
          <p className="mt-2 text-2xl font-bold text-ink">{overview.pending_bookings || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Check-ins today</p>
          <p className="mt-2 text-2xl font-bold text-ink">{overview.check_ins_today || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Check-outs today</p>
          <p className="mt-2 text-2xl font-bold text-ink">{overview.check_outs_today || 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Paid no-shows</p>
          <p className="mt-2 text-2xl font-bold text-ink">{overview.paid_no_show_count || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Revenue Trend"
          subtitle={`Revenue and booking volume for ${periodLabel.toLowerCase()}.`}
          action={<Link to="/admin/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">View bookings</Link>}
        >
          {revenueData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: chartTheme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: chartTheme.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: chartTheme.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip formatter={(value, name) => (name === "Revenue" ? formatPrice(value) : value)} />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke={chartTheme.revenue} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="bookings" name="Bookings" stroke={chartTheme.bookings} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message="No booking activity in the selected period." />
          )}
        </ChartCard>

        <ChartCard title="Booking Funnel" subtitle="See where bookings succeed, drop, or fail.">
          {funnelData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: chartTheme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: chartTheme.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={86} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} fill={chartTheme.funnel} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartState message="No funnel data yet." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Payment Method Revenue" subtitle="Recognized revenue split by payment method.">
          {paymentMethodData.some((item) => Number(item.revenue) > 0) ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="revenue"
                      nameKey="label"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartTheme.pie[index % chartTheme.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={(value) => formatPrice(value)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {paymentMethodData.map((item, index) => (
                  <div key={item.name} className="rounded-xl border border-border bg-surface/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartTheme.pie[index % chartTheme.pie.length] }} />
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-ink">{formatPrice(item.revenue || 0)}</p>
                    <p className="text-xs text-muted">{item.bookings || 0} bookings</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState message="No recognized revenue yet in the selected period." />
          )}
        </ChartCard>

        <ChartCard title="Payment Status Mix" subtitle="How bookings are distributed by payment state.">
          {paymentStatusData.some((item) => Number(item.value) > 0) ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartTheme.pie[index % chartTheme.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {paymentStatusData.map((item, index) => (
                  <div key={item.name} className="rounded-xl border border-border bg-surface/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartTheme.pie[index % chartTheme.pie.length] }} />
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-ink">{item.value || 0}</p>
                    <p className="text-xs text-muted">bookings in {periodLabel.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChartState message="No payment-status data yet." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ChartCard
          title="Top Owners"
          subtitle="Ranked by revenue with booking quality metrics."
          action={<Link to="/admin/owners" className="text-sm font-medium text-brand-600 hover:text-brand-700">Manage owners</Link>}
        >
          {topOwners.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-3 pr-4">Owner</th>
                    <th className="pb-3 pr-4 text-right">Revenue</th>
                    <th className="pb-3 pr-4 text-right">Bookings</th>
                    <th className="pb-3 pr-4 text-right">Completion</th>
                    <th className="pb-3 text-right">No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {topOwners.map((owner) => (
                    <tr key={owner.owner_id} className="border-b border-border last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-medium text-ink">{owner.owner_name}</p>
                        <p className="text-xs text-muted">{owner.owner_email || "No email"}</p>
                        <p className="text-xs text-muted">{owner.active_rooms || 0} active rooms</p>
                      </td>
                      <td className="py-4 pr-4 text-right font-medium text-ink">{formatPrice(owner.revenue || 0)}</td>
                      <td className="py-4 pr-4 text-right text-ink">{owner.bookings || 0}</td>
                      <td className="py-4 pr-4 text-right text-ink">{formatPercent(owner.completion_rate)}</td>
                      <td className="py-4 text-right text-ink">{formatPercent(owner.no_show_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChartState message="No owner performance data in the selected period." />
          )}
        </ChartCard>

        <ChartCard
          title="Top Rooms"
          subtitle="Rooms bringing in the most revenue."
          action={<Link to="/admin/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">Manage rooms</Link>}
        >
          {topRooms.length ? (
            <div className="space-y-4">
              {topRooms.map((room, index) => (
                <div key={room.room_id} className="rounded-xl border border-border bg-surface/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">#{index + 1}</p>
                      <p className="mt-1 font-semibold text-ink">{room.room_title}</p>
                      <p className="text-xs text-muted">{room.location || "No location"}</p>
                    </div>
                    <p className="text-right text-sm font-semibold text-ink">{formatPrice(room.revenue || 0)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted">
                    <div>
                      <p className="font-medium text-ink">{room.bookings || 0}</p>
                      <p>Bookings</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">{formatPercent(room.completion_rate)}</p>
                      <p>Completion</p>
                    </div>
                    <div>
                      <p className="font-medium text-ink">{formatPercent(room.cancellation_rate)}</p>
                      <p>Cancellation</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChartState message="No room performance data in the selected period." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/bookings" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-900/20">
          <div className="rounded-xl bg-brand-100 p-3 text-brand-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
          <div>
            <p className="font-semibold text-ink">Manage Bookings</p>
            <p className="text-sm text-muted">Work the pending queue and booking exceptions.</p>
          </div>
        </Link>
        <Link to="/admin/owners" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
          <div>
            <p className="font-semibold text-ink">Owner Performance</p>
            <p className="text-sm text-muted">Drill into owners with weak completion or no-show trends.</p>
          </div>
        </Link>
        <Link to="/admin/rooms" className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/15">
          <div className="rounded-xl bg-orange-100 p-3 text-orange-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
          <div>
            <p className="font-semibold text-ink">Room Performance</p>
            <p className="text-sm text-muted">Check underperforming listings and act on problem properties.</p>
          </div>
        </Link>
      </div>

      <ChartCard
        title="Recent Bookings"
        subtitle="Latest booking activity in the selected period."
        action={<Link to="/admin/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}
      >
        {recentBookings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {booking.room?.image ? (
                          <img
                            src={booking.room.image}
                            alt={booking.room?.title || "Room"}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-muted">
                            RM
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-ink">{booking.room?.title || "Unknown room"}</p>
                          <p className="text-xs text-muted">{booking.room?.location || "No location"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-ink">{booking.guest_name}</p>
                      <p className="text-xs text-muted">{booking.guest_email || "No email"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-ink">{booking.owner?.name || "Admin managed"}</p>
                      <p className="text-xs text-muted">{booking.owner?.email || "No owner email"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-ink">{formatShortDate(booking.booking_date)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-ink">
                      {formatPrice(booking.total_price || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChartState message="No recent bookings in the selected period." />
        )}
      </ChartCard>
    </div>
  );
}
