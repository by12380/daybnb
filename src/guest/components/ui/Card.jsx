export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-border bg-white p-6 shadow-xl shadow-slate-200/60 ${className}`}
    >
      {children}
    </div>
  );
}
