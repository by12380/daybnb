-- ============================================================
-- Seed: remove existing auto-generated rooms and insert
-- comprehensive test data covering all filter scenarios.
-- Run FULL_SYNC to Algolia after executing this.
-- ============================================================

DELETE FROM public.rooms WHERE id LIKE 'auto-room-%' OR id LIKE 'seed-%';

INSERT INTO public.rooms (
  id, title, location, guests, type, image, tags,
  latitude, longitude, price_per_day,
  property_type, place_type, bedrooms, beds, bathrooms,
  instant_book, self_checkin, allows_pets,
  is_guest_favorite, is_luxe, amenities, safety_features
) VALUES

-- 1: Budget apartment, room only, pets ok, wifi+tv
('seed-001', 'Cozy Downtown Apartment', 'New York', 2, 'room',
 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', ARRAY['City','Budget','Cozy'],
 40.7128, -74.0060, 85.00,
 'apartment', 'room', 1, 1, 1,
 false, true, true,
 false, false,
 ARRAY['wifi','tv','heating','iron'],
 ARRAY['smoke_alarm']),

-- 2: Mid-range house, entire home, instant book, pool+kitchen
('seed-002', 'Sunny Poolside House', 'Los Angeles', 6, 'villa',
 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6', ARRAY['Pool','Family','Sunny'],
 34.0522, -118.2437, 220.00,
 'house', 'entire_home', 3, 4, 2,
 true, true, true,
 true, false,
 ARRAY['wifi','kitchen','pool','free_parking','air_conditioning','washer','dryer','bbq_grill','tv'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 3: Luxury hotel, guest favorite + luxe
('seed-003', 'The Grand Luxe Suite', 'Miami', 2, 'suite',
 'https://images.unsplash.com/photo-1611892440504-42a792e24d32', ARRAY['Luxury','Ocean view','Spa'],
 25.7617, -80.1918, 450.00,
 'hotel', 'room', 1, 1, 1,
 true, false, false,
 true, true,
 ARRAY['wifi','air_conditioning','king_bed','gym','breakfast','tv','hair_dryer','iron'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 4: Mountain cabin, entire home, fireplace, no pets
('seed-004', 'Mountain Retreat Cabin', 'Denver', 4, 'villa',
 'https://images.unsplash.com/photo-1518780664697-55e3ad937233', ARRAY['Mountain','Nature','Quiet'],
 39.7392, -104.9903, 175.00,
 'house', 'entire_home', 2, 3, 1,
 false, true, false,
 false, false,
 ARRAY['wifi','kitchen','indoor_fireplace','heating','free_parking','washer','dedicated_workspace'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 5: Cheap studio, self-checkin, EV charger, workspace
('seed-005', 'Modern Tech Studio', 'San Francisco', 2, 'studio',
 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', ARRAY['Tech','Workspace','Modern'],
 37.7749, -122.4194, 120.00,
 'apartment', 'entire_home', 1, 1, 1,
 true, true, false,
 false, false,
 ARRAY['wifi','ev_charger','dedicated_workspace','air_conditioning','tv','kitchen','washer'],
 ARRAY['smoke_alarm']),

-- 6: Family hotel with crib, breakfast, pets
('seed-006', 'Family-Friendly Resort Hotel', 'Orlando', 5, 'resort',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945', ARRAY['Family','Resort','Fun'],
 28.5383, -81.3792, 195.00,
 'hotel', 'room', 2, 3, 2,
 true, false, true,
 true, false,
 ARRAY['wifi','pool','crib','breakfast','tv','air_conditioning','gym','hair_dryer'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 7: Beachfront luxe villa, hot tub, bbq
('seed-007', 'Beachfront Luxe Villa', 'Malibu', 8, 'villa',
 'https://images.unsplash.com/photo-1613490493576-7fde63acd811', ARRAY['Beach','Luxury','Views'],
 34.0259, -118.7798, 680.00,
 'house', 'entire_home', 4, 5, 3,
 false, true, true,
 true, true,
 ARRAY['wifi','kitchen','pool','hot_tub','bbq_grill','free_parking','air_conditioning','washer','dryer','king_bed','tv'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 8: Budget hotel, no amenities except basics
('seed-008', 'Simple Stay Inn', 'Chicago', 2, 'room',
 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304', ARRAY['Budget','Simple','Central'],
 41.8781, -87.6298, 55.00,
 'hotel', 'room', 1, 1, 1,
 true, true, false,
 false, false,
 ARRAY['wifi','heating','tv'],
 ARRAY['smoke_alarm']),

-- 9: Apartment with gym and workspace, mid-price
('seed-009', 'Urban Fitness Loft', 'Austin', 3, 'studio',
 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', ARRAY['Fitness','Urban','Modern'],
 30.2672, -97.7431, 145.00,
 'apartment', 'entire_home', 1, 2, 1,
 true, true, false,
 false, false,
 ARRAY['wifi','gym','dedicated_workspace','air_conditioning','kitchen','washer','dryer','tv','ev_charger'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 10: Pet-friendly house with everything, smoking allowed
('seed-010', 'Laid-Back Garden House', 'Portland', 4, 'villa',
 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', ARRAY['Garden','Pets','Relaxed'],
 45.5051, -122.6750, 165.00,
 'house', 'entire_home', 2, 2, 2,
 false, true, true,
 false, false,
 ARRAY['wifi','kitchen','free_parking','washer','dryer','smoking_allowed','bbq_grill','heating','tv'],
 ARRAY['smoke_alarm']),

-- 11: Luxury apartment, high-rise, no pets, king bed
('seed-011', 'Skyline Penthouse', 'Seattle', 2, 'suite',
 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', ARRAY['Penthouse','Views','Luxury'],
 47.6062, -122.3321, 380.00,
 'apartment', 'entire_home', 2, 2, 2,
 true, true, false,
 true, true,
 ARRAY['wifi','air_conditioning','king_bed','gym','dedicated_workspace','tv','hair_dryer','iron','ev_charger'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 12: Cheap room share, minimal
('seed-012', 'Shared Room in Brownstone', 'Boston', 1, 'room',
 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5', ARRAY['Budget','Shared','Central'],
 42.3601, -71.0589, 40.00,
 'apartment', 'room', 1, 1, 1,
 true, true, false,
 false, false,
 ARRAY['wifi','heating'],
 ARRAY[]::TEXT[]),

-- 13: Resort with hot tub, breakfast, pool, luxe
('seed-013', 'Desert Oasis Resort', 'Scottsdale', 6, 'resort',
 'https://images.unsplash.com/photo-1582719508461-905c673771fd', ARRAY['Desert','Spa','Luxury'],
 33.4942, -111.9261, 520.00,
 'hotel', 'entire_home', 3, 4, 3,
 true, false, false,
 true, true,
 ARRAY['wifi','pool','hot_tub','gym','breakfast','king_bed','air_conditioning','free_parking','tv','hair_dryer'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']),

-- 14: Mid-range house, self-checkin, washer/dryer, indoor fireplace
('seed-014', 'Charming Cottage Retreat', 'Nashville', 4, 'villa',
 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000', ARRAY['Cottage','Charming','Music City'],
 36.1627, -86.7816, 155.00,
 'house', 'entire_home', 2, 2, 1,
 false, true, true,
 false, false,
 ARRAY['wifi','kitchen','washer','dryer','indoor_fireplace','free_parking','heating','tv'],
 ARRAY['smoke_alarm']),

-- 15: Hotel room, instant book, breakfast, iron, hair dryer
('seed-015', 'Business Class Hotel', 'Washington', 2, 'suite',
 'https://images.unsplash.com/photo-1618773928121-c32242e63f39', ARRAY['Business','Central','Clean'],
 38.9072, -77.0369, 210.00,
 'hotel', 'room', 1, 1, 1,
 true, false, false,
 false, false,
 ARRAY['wifi','air_conditioning','breakfast','iron','hair_dryer','dedicated_workspace','gym','tv'],
 ARRAY['smoke_alarm','carbon_monoxide_alarm']);
