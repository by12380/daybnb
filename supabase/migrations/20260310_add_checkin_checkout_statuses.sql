-- Add new booking statuses: checked_in, checked_out, cancelled, no_show
-- Status flow: pending → approved → confirmed → checked_in → checked_out
-- Additional terminal statuses: rejected, cancelled, no_show

-- Add checked_in_at and checked_out_at timestamp columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

-- Drop the existing CHECK constraint on status and replace with an expanded one.
-- The constraint name may vary; drop by name if known, otherwise use this approach.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'approved', 'confirmed', 'checked_in', 'checked_out', 'rejected', 'cancelled', 'no_show'));
