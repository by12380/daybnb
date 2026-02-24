-- ============================================================
-- Room detail page columns
-- ============================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS check_in_time TEXT DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS check_out_time TEXT DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS house_rules TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS neighborhood TEXT DEFAULT '';

ALTER TABLE public.rooms
  ADD CONSTRAINT chk_cancellation_policy
    CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));
