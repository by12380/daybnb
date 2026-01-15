import Button from "../ui/Button.jsx";

export default function GuestNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide text-ink">
            Daybnb
          </span>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            Day-Use Only
          </span>
        </div>
        <nav className="flex items-center gap-3 text-sm text-muted">
          <button className="rounded-full px-3 py-1.5 hover:text-brand-600">
            Browse
          </button>
          <button className="rounded-full px-3 py-1.5 hover:text-brand-600">
            How it works
          </button>
          <Button variant="outline">Sign in</Button>
          <Button>Get started</Button>
        </nav>
      </div>
    </header>
  );
}
