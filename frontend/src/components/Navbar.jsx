export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide">Daybnb</span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
            Dashboard
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-300">
          <button className="rounded-md border border-slate-700 px-3 py-1.5 hover:border-slate-500">
            Sign in
          </button>
        </nav>
      </div>
    </header>
  );
}
