-- Create the banners table for the hero slider
CREATE TABLE IF NOT EXISTS banners (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT,
  subtitle    TEXT,
  cta_text    TEXT,
  cta_link    TEXT,
  bg_type     TEXT NOT NULL DEFAULT 'color' CHECK (bg_type IN ('image','color','gradient')),
  bg_image_url TEXT,
  bg_color    TEXT DEFAULT '#4f46e5',
  bg_gradient TEXT DEFAULT 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  bg_opacity  REAL NOT NULL DEFAULT 1.0,
  text_box_x  REAL NOT NULL DEFAULT 5,
  text_box_y  REAL NOT NULL DEFAULT 25,
  text_box_width REAL NOT NULL DEFAULT 45,
  text_color  TEXT NOT NULL DEFAULT '#ffffff',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast public fetch of active banners
CREATE INDEX IF NOT EXISTS idx_banners_active_order ON banners (is_active, sort_order);

-- Allow public read for active banners
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active banners"
  ON banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins full access to banners"
  ON banners FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create a storage bucket for banner images (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
