const stats = [
  { label: "Active listings", value: "12" },
  { label: "Next check-in", value: "Today, 3:00 PM" },
  { label: "Monthly revenue", value: "$4,820" },
];

export default function Dashboard() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
          Overview
        </p>
        <h1 className="text-3xl font-semibold">Welcome back, host.</h1>
        <p className="text-slate-300">
          Manage listings, bookings, and payouts from one dashboard.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold">Upcoming reservations</h2>
        <p className="mt-2 text-sm text-slate-300">
          Connect Supabase to load real booking data and notifications.
        </p>
      </div>
    </section>
  );
}
