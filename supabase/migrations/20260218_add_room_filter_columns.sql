-- ============================================================
-- Enhanced room filtering columns
-- ============================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'house',
  ADD COLUMN IF NOT EXISTS place_type TEXT DEFAULT 'entire_home',
  ADD COLUMN IF NOT EXISTS bedrooms INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS beds INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bathrooms INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS instant_book BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_checkin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_pets BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_guest_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_luxe BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS safety_features TEXT[] DEFAULT '{}';

-- Constraints
ALTER TABLE public.rooms
  ADD CONSTRAINT chk_property_type CHECK (property_type IN ('house', 'apartment', 'hotel')),
  ADD CONSTRAINT chk_place_type CHECK (place_type IN ('entire_home', 'room'));

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_rooms_property_type ON public.rooms (property_type);
CREATE INDEX IF NOT EXISTS idx_rooms_place_type ON public.rooms (place_type);
CREATE INDEX IF NOT EXISTS idx_rooms_instant_book ON public.rooms (instant_book) WHERE instant_book = true;
CREATE INDEX IF NOT EXISTS idx_rooms_allows_pets ON public.rooms (allows_pets) WHERE allows_pets = true;
CREATE INDEX IF NOT EXISTS idx_rooms_amenities ON public.rooms USING GIN (amenities);
CREATE INDEX IF NOT EXISTS idx_rooms_safety_features ON public.rooms USING GIN (safety_features);
