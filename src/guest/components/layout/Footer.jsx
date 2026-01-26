export default function GuestFooter() {
  return (
    <footer className="border-t border-border bg-panel/80 backdrop-blur transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-gradient dark:text-gradient-dark">Daybnb</p>
          <p className="text-muted">
            Daytime bookings only. Overnight stays are not allowed.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="hover:text-brand-600 dark:hover:text-brand-400">Support</button>
          <button className="hover:text-brand-600 dark:hover:text-brand-400">Safety</button>
          <button className="hover:text-brand-600 dark:hover:text-brand-400">Terms</button>
        </div>
      </div>
    </footer>
  );
}
