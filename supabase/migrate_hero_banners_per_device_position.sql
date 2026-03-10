-- Migration: Replace single box_x/box_y with per-device position columns
-- Run this in the Supabase SQL editor if hero_banners table already exists.

-- Add new per-device columns, defaulting from the old shared values
ALTER TABLE public.hero_banners
  ADD COLUMN IF NOT EXISTS box_x_desktop numeric(5,2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS box_y_desktop numeric(5,2) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS box_x_tablet  numeric(5,2) NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS box_y_tablet  numeric(5,2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS box_x_mobile  numeric(5,2) NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS box_y_mobile  numeric(5,2) NOT NULL DEFAULT 8;

-- Copy existing box_x/box_y into the desktop columns for all rows
UPDATE public.hero_banners
SET box_x_desktop = box_x,
    box_y_desktop = box_y,
    box_x_tablet  = box_x,
    box_y_tablet  = box_y,
    box_x_mobile  = LEAST(box_x, 52),
    box_y_mobile  = box_y
WHERE box_x IS NOT NULL;

-- Drop old columns
ALTER TABLE public.hero_banners DROP COLUMN IF EXISTS box_x;
ALTER TABLE public.hero_banners DROP COLUMN IF EXISTS box_y;

-- Drop old constraints if they exist
ALTER TABLE public.hero_banners DROP CONSTRAINT IF EXISTS hero_banners_box_x_check;
ALTER TABLE public.hero_banners DROP CONSTRAINT IF EXISTS hero_banners_box_y_check;

-- Add new constraints
ALTER TABLE public.hero_banners
  ADD CONSTRAINT hero_banners_box_x_desktop_check CHECK (box_x_desktop >= 0 AND box_x_desktop <= 92),
  ADD CONSTRAINT hero_banners_box_y_desktop_check CHECK (box_y_desktop >= 0 AND box_y_desktop <= 76),
  ADD CONSTRAINT hero_banners_box_x_tablet_check  CHECK (box_x_tablet  >= 0 AND box_x_tablet  <= 92),
  ADD CONSTRAINT hero_banners_box_y_tablet_check  CHECK (box_y_tablet  >= 0 AND box_y_tablet  <= 76),
  ADD CONSTRAINT hero_banners_box_x_mobile_check  CHECK (box_x_mobile  >= 0 AND box_x_mobile  <= 92),
  ADD CONSTRAINT hero_banners_box_y_mobile_check  CHECK (box_y_mobile  >= 0 AND box_y_mobile  <= 76);
