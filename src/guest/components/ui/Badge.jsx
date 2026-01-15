export default function Badge({ children, tone = "brand" }) {
  const tones = {
    brand: "border border-brand-200 bg-brand-50 text-brand-700",
    accent: "border border-accent-500/40 bg-accent-100 text-accent-500",
    neutral: "border border-border bg-white text-muted",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
