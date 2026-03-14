-- ============================================================
-- Add per-device banner layout columns to the offers table
-- so admins can configure responsive banner position/style.
-- ============================================================

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS banner_background_type   TEXT        NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS banner_background_color  TEXT,
  ADD COLUMN IF NOT EXISTS banner_gradient_from     TEXT,
  ADD COLUMN IF NOT EXISTS banner_gradient_to       TEXT,
  ADD COLUMN IF NOT EXISTS banner_gradient_direction TEXT       NOT NULL DEFAULT 'to-r',
  ADD COLUMN IF NOT EXISTS banner_background_opacity NUMERIC(3,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS banner_text_alignment    TEXT        NOT NULL DEFAULT 'left',
  ADD COLUMN IF NOT EXISTS banner_box_x_desktop     NUMERIC(5,2) NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS banner_box_y_desktop     NUMERIC(5,2) NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS banner_box_x_tablet      NUMERIC(5,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS banner_box_y_tablet      NUMERIC(5,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS banner_box_x_mobile      NUMERIC(5,2) NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS banner_box_y_mobile      NUMERIC(5,2) NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS banner_box_width_desktop  NUMERIC(5,2) NOT NULL DEFAULT 44,
  ADD COLUMN IF NOT EXISTS banner_box_width_tablet   NUMERIC(5,2) NOT NULL DEFAULT 58,
  ADD COLUMN IF NOT EXISTS banner_box_width_mobile   NUMERIC(5,2) NOT NULL DEFAULT 90;

-- Constraints
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_background_type_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_background_type_check
  CHECK (banner_background_type IN ('image', 'solid', 'gradient'));

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_gradient_direction_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_gradient_direction_check
  CHECK (banner_gradient_direction IN ('to-r', 'to-l', 'to-b', 'to-t', 'to-tr', 'to-tl', 'to-br', 'to-bl'));

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_text_alignment_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_text_alignment_check
  CHECK (banner_text_alignment IN ('left', 'center', 'right'));

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_background_opacity_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_background_opacity_check
  CHECK (banner_background_opacity >= 0 AND banner_background_opacity <= 1);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_x_desktop_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_x_desktop_check
  CHECK (banner_box_x_desktop >= 0 AND banner_box_x_desktop <= 92);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_y_desktop_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_y_desktop_check
  CHECK (banner_box_y_desktop >= 0 AND banner_box_y_desktop <= 76);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_x_tablet_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_x_tablet_check
  CHECK (banner_box_x_tablet >= 0 AND banner_box_x_tablet <= 92);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_y_tablet_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_y_tablet_check
  CHECK (banner_box_y_tablet >= 0 AND banner_box_y_tablet <= 76);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_x_mobile_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_x_mobile_check
  CHECK (banner_box_x_mobile >= 0 AND banner_box_x_mobile <= 92);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_y_mobile_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_y_mobile_check
  CHECK (banner_box_y_mobile >= 0 AND banner_box_y_mobile <= 76);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_width_desktop_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_width_desktop_check
  CHECK (banner_box_width_desktop >= 24 AND banner_box_width_desktop <= 90);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_width_tablet_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_width_tablet_check
  CHECK (banner_box_width_tablet >= 30 AND banner_box_width_tablet <= 94);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_banner_box_width_mobile_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_banner_box_width_mobile_check
  CHECK (banner_box_width_mobile >= 40 AND banner_box_width_mobile <= 98);
