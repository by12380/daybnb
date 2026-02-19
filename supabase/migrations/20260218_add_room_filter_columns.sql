-- Adds structured filter fields used by guest filters and owner/admin room forms.

alter table if exists rooms
  add column if not exists property_type text,
  add column if not exists place_type text,
  add column if not exists bedrooms integer default 0,
  add column if not exists beds integer default 0,
  add column if not exists bathrooms numeric default 0,
  add column if not exists instant_book boolean default false,
  add column if not exists self_checkin boolean default false,
  add column if not exists allows_pets boolean default false,
  add column if not exists is_guest_favorite boolean default false,
  add column if not exists is_luxe boolean default false,
  add column if not exists amenities text[] default '{}'::text[],
  add column if not exists safety_features text[] default '{}'::text[];

update rooms
set
  property_type = coalesce(nullif(property_type, ''), 'apartment'),
  place_type = coalesce(nullif(place_type, ''), 'room'),
  bedrooms = coalesce(bedrooms, 0),
  beds = coalesce(beds, 0),
  bathrooms = coalesce(bathrooms, 0),
  instant_book = coalesce(instant_book, false),
  self_checkin = coalesce(self_checkin, false),
  allows_pets = coalesce(allows_pets, false),
  is_guest_favorite = coalesce(is_guest_favorite, false),
  is_luxe = coalesce(is_luxe, false),
  amenities = coalesce(amenities, '{}'::text[]),
  safety_features = coalesce(safety_features, '{}'::text[]);
