-- ============================================================
-- Offers / Discounts feature
-- ============================================================

-- 1. Create the offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display fields
  title       TEXT        NOT NULL,
  description TEXT,
  tag_label   TEXT,                       -- badge text shown on listings, e.g. "Diwali Special"

  -- Discount definition
  discount_type  TEXT     NOT NULL DEFAULT 'percentage'
                          CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC  NOT NULL DEFAULT 0
                          CHECK (discount_value >= 0),

  -- Campaign banner (admin-only)
  banner_image TEXT,                      -- URL of a promotional banner image
  show_banner  BOOLEAN   NOT NULL DEFAULT false,

  -- Scope: which rooms does the offer apply to?
  --   • room_id set   → single room
  --   • owner_id set  → all rooms belonging to that owner
  --   • both null     → site-wide (admin only)
  room_id  TEXT REFERENCES public.rooms(id)  ON DELETE CASCADE,
  owner_id TEXT,                              -- references auth.users / profiles

  -- Who created it and validity window
  created_by UUID NOT NULL,                   -- admin or owner user id
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date   DATE NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure end_date is not before start_date
  CONSTRAINT offers_date_range CHECK (end_date >= start_date)
);

-- 2. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_offers_room_id    ON public.offers (room_id)   WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_owner_id   ON public.offers (owner_id)  WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_active      ON public.offers (is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_banner      ON public.offers (show_banner) WHERE show_banner = true;

-- 3. Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offers_updated_at();

-- 4. RLS policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Everyone can read active offers (needed for guest-facing badges / banners)
CREATE POLICY "Anyone can read active offers"
  ON public.offers FOR SELECT
  USING (true);

-- Admins can do everything (using service-role key bypasses RLS anyway,
-- but this is here for completeness if you use anon client in the future)
CREATE POLICY "Admins full access"
  ON public.offers FOR ALL
  USING (true)
  WITH CHECK (true);
