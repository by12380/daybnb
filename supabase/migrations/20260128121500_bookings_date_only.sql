-- Convert bookings to date-only (remove time-slot columns).
-- IMPORTANT:
-- - Apply this only after deploying the code changes that stop reading/writing start_time/end_time.
-- - If you have existing data you want to keep, consider exporting it before dropping columns.

alter table public.bookings
  drop column if exists start_time,
  drop column if exists end_time;

